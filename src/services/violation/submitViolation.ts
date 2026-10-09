// Backend adapter for sending detection/violation results.
//
// The backend contract is NOT finalised yet, so this does not auto-post to a
// guessed endpoint. It builds a well-defined payload and exposes a single
// submit function. When the real endpoint + body shape are confirmed, update
// ENDPOINT_PATH and (if needed) the payload mapping below — nothing else needs
// to change in the app.
//
// Base URL comes from the environment: VITE_API_BASE_URL (see .env).
import type { ViolationResult } from './violationRule'

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? ''

// TODO(backend): set the real path + method once the contract is confirmed.
const ENDPOINT_PATH = '/reports'

export interface ViolationPayloadInput {
  fileName?: string | null
  imageSize?: { width: number; height: number } | null
  result: ViolationResult
  backend?: string | null
  inferenceMs?: number | null
}

export type ViolationPayload = ReturnType<typeof buildViolationPayload>

// Builds the JSON body we intend to send. Documented and stable so the UI can
// show "payload ready" even before the endpoint exists.
export function buildViolationPayload({ fileName, imageSize, result, backend, inferenceMs }: ViolationPayloadInput) {
  return {
    source: fileName ?? null,
    image: imageSize ? { width: imageSize.width, height: imageSize.height } : null,
    model: { backend: backend ?? null, inferenceMs: inferenceMs ?? null },
    mode: result.mode,
    detectionCount: result.detections.length,
    violationCount: result.violationCount,
    isViolation: result.isViolation,
    detections: result.detections.map((d) => ({
      classId: d.classId,
      className: d.className,
      confidence: Number(d.confidence.toFixed(4)),
      bbox: d.bbox,
      isViolation: d.isViolation,
    })),
    capturedAt: new Date().toISOString(),
  }
}

export class BackendError extends Error {
  declare status: number | undefined

  constructor(message: string, { status, cause }: { status?: number; cause?: unknown } = {}) {
    super(message)
    this.name = 'BackendError'
    this.status = status
    if (cause) this.cause = cause
  }
}

export interface SubmitResult {
  ok: true
  dryRun: boolean
  endpoint: string
  payload: ViolationPayload
  response?: unknown
}

// Sends the payload to the backend.
//   options.dryRun (default true): build + return the payload WITHOUT a network
//     call. This keeps the detection pipeline fully usable before the endpoint
//     is confirmed, so a missing/undefined backend never breaks detection.
// Returns { ok, dryRun, endpoint, payload, response? }.
export async function submitViolation(
  payload: ViolationPayload,
  options: { dryRun?: boolean } = {},
): Promise<SubmitResult> {
  const dryRun = options.dryRun ?? true
  const endpoint = `${BASE_URL}${ENDPOINT_PATH}`

  if (dryRun || !BASE_URL) {
    // Not configured / intentionally not posting yet.
    return { ok: true, dryRun: true, endpoint, payload }
  }

  let res: Response
  try {
    res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
  } catch (err) {
    throw new BackendError('Could not reach the backend.', { cause: err })
  }

  if (!res.ok) {
    throw new BackendError(`Backend rejected the report (HTTP ${res.status}).`, {
      status: res.status,
    })
  }

  let response: unknown = null
  try {
    response = await res.json()
  } catch {
    // A non-JSON success body is tolerated; the submit still counts as ok.
  }

  return { ok: true, dryRun: false, endpoint, payload, response }
}
