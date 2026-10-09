// ONNX Runtime Web session management.
//
// The model is loaded ONCE and the session is reused for every image.
// We use the WebGPU build, which also provides the WASM backend (the "jsep"
// wasm). That build loads its .wasm/.mjs at runtime rather than inlining them,
// so we import those files through Vite (?url) and tell ORT where they are.
// Without this, the dev server answers the wasm request with index.html and ORT
// fails with "expected magic word 00 61 73 6d, found 3c 21 ..." (that's "<!").
import * as ort from 'onnxruntime-web/webgpu'
// Let Vite resolve + serve ORT's runtime assets (correct MIME in dev, hashed in
// build). We map every variant ORT might ask for to the URL Vite produced, so it
// never falls back to fetching the dev server's index.html (which caused
// "expected magic word 00 61 73 6d, found 3c 21", i.e. ORT got HTML not wasm).
import mjsSimd from 'onnxruntime-web/ort-wasm-simd-threaded.mjs?url'
import wasmJsep from 'onnxruntime-web/ort-wasm-simd-threaded.jsep.wasm?url'
import mjsJsep from 'onnxruntime-web/ort-wasm-simd-threaded.jsep.mjs?url'
import wasmAsync from 'onnxruntime-web/ort-wasm-simd-threaded.asyncify.wasm?url'
import mjsAsync from 'onnxruntime-web/ort-wasm-simd-threaded.asyncify.mjs?url'
import { YOLO_CONFIG } from './config'

// ORT's typings only list { wasm, mjs } keys, but at runtime it looks files up by
// their real names, so the object is cast to the declared type.
ort.env.wasm.wasmPaths = {
  'ort-wasm-simd-threaded.mjs': mjsSimd,
  'ort-wasm-simd-threaded.jsep.wasm': wasmJsep,
  'ort-wasm-simd-threaded.jsep.mjs': mjsJsep,
  'ort-wasm-simd-threaded.asyncify.wasm': wasmAsync,
  'ort-wasm-simd-threaded.asyncify.mjs': mjsAsync,
} as unknown as typeof ort.env.wasm.wasmPaths

export type Backend = 'webgpu' | 'wasm'
type GpuNavigator = Navigator & { gpu?: { requestAdapter(): Promise<unknown> } }
export type ModelLoadErrorKind = 'not-found' | 'load-failed'

// Module-level cache. These persist for the life of the page.
let sessionPromise: Promise<ort.InferenceSession> | null = null // in-flight or resolved load, so we never load twice
let activeBackend: Backend | null = null // 'webgpu' | 'wasm', set once the session is created

// A loading error we want callers to be able to recognise and show nicely.
export class ModelLoadError extends Error {
  declare kind: ModelLoadErrorKind | undefined

  constructor(message: string, { cause, kind }: { cause?: unknown; kind?: ModelLoadErrorKind } = {}) {
    super(message)
    this.name = 'ModelLoadError'
    this.kind = kind // 'not-found' | 'load-failed'
    if (cause) this.cause = cause
  }
}

export function getActiveBackend(): Backend | null {
  return activeBackend
}

async function isWebGpuAvailable(): Promise<boolean> {
  // navigator.gpu exists in supporting browsers; requestAdapter() confirms a real adapter.
  // (navigator.gpu isn't in TypeScript's DOM lib, hence the GpuNavigator cast.)
  if (typeof navigator === 'undefined' || !(navigator as GpuNavigator).gpu) return false
  try {
    const adapter = await (navigator as GpuNavigator).gpu!.requestAdapter()
    return Boolean(adapter)
  } catch {
    return false
  }
}

// Make sure best.onnx exists before ORT tries to parse it. Without this, a missing
// file turns into a confusing protobuf parse error instead of a clear 404.
async function fetchModelBytes(url: string): Promise<Uint8Array> {
  let res: Response
  try {
    res = await fetch(url)
  } catch (err) {
    throw new ModelLoadError('Could not reach the model file.', { cause: err, kind: 'load-failed' })
  }
  if (!res.ok) {
    throw new ModelLoadError(
      `Model file not found at ${url} (HTTP ${res.status}). Copy best.onnx into public/models/.`,
      { kind: 'not-found' },
    )
  }

  // A dev server (and some static hosts) answer a missing file with an HTML
  // fallback page and HTTP 200 instead of a 404. Catch that so the user still
  // gets the clear "copy best.onnx" message instead of a confusing parse error.
  const contentType = res.headers.get('content-type') || ''
  if (contentType.includes('text/html')) {
    throw new ModelLoadError(
      `Model file missing at ${url} (server returned a web page, not a model). Copy best.onnx into public/models/.`,
      { kind: 'not-found' },
    )
  }

  const bytes = new Uint8Array(await res.arrayBuffer())
  // ONNX files are protobuf; the HTML fallback starts with "<". Guard against it.
  if (bytes.length < 16 || bytes[0] === 0x3c /* '<' */) {
    throw new ModelLoadError(
      `Model file at ${url} is not a valid .onnx. Copy the exported best.onnx into public/models/.`,
      { kind: 'not-found' },
    )
  }
  return bytes
}

async function createSession(): Promise<ort.InferenceSession> {
  const modelBytes = await fetchModelBytes(YOLO_CONFIG.modelPath)

  // Try WebGPU first, fall back to WASM. The app must still work without WebGPU.
  const preferWebGpu = await isWebGpuAvailable()
  const backendsToTry: Backend[] = preferWebGpu ? ['webgpu', 'wasm'] : ['wasm']

  let lastError: unknown = null
  for (const backend of backendsToTry) {
    try {
      const session = await ort.InferenceSession.create(modelBytes, {
        executionProviders: [backend],
        graphOptimizationLevel: 'all',
      })
      activeBackend = backend
      return session
    } catch (err) {
      lastError = err
      // Fall through and try the next backend (e.g. WebGPU failed -> WASM).
    }
  }

  throw new ModelLoadError('Failed to initialise the inference session.', {
    cause: lastError,
    kind: 'load-failed',
  })
}

// Returns the shared session, creating it on first call. Concurrent callers all
// await the same promise, so the model is only ever loaded once.
export function loadModel(): Promise<ort.InferenceSession> {
  if (!sessionPromise) {
    sessionPromise = createSession().catch((err) => {
      sessionPromise = null // allow a retry after a failure
      throw err
    })
  }
  return sessionPromise
}

export function isModelLoaded(): boolean {
  return activeBackend !== null
}

// Exposed mainly for tests.
export { ort }
