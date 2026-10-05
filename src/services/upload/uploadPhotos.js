// Sends photos to the backend's POST /upload endpoint.
//
// Backend contract (BE - civision, src/routes/main.route.ts):
//   POST {VITE_API_BASE_URL}/upload
//   multipart/form-data, field name "files" (up to 20), no auth.
//   200/502 -> { success, data: { total, succeeded, failed,
//                                  results: [{ filename, mimetype, result }],
//                                  errors:  [{ filename, error, detail? }] } }
//   400/500 -> { success: false, error: "<message>" }
//   `result` is the raw Roboflow workflow output:
//     result.outputs[0].annotated_image.value     -> base64 JPEG with the masks drawn
//     result.outputs[0].predictions.predictions   -> array of detections
//
// We send ONE request per photo. Vercel limits a request body to ~4.5 MB, so a
// single request with several photos would easily be rejected. One-by-one also
// lets the UI show progress and keeps one failed photo from failing the rest.

const BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/+$/, '')
const ENDPOINT = `${BASE_URL}/api/upload`

// Stay safely under Vercel's ~4.5 MB request limit (multipart adds a little overhead).
const MAX_UPLOAD_BYTES = 4 * 1024 * 1024
const MAX_SIDE = 2560 // longest side after shrinking an oversized photo

export class UploadError extends Error {
  constructor(message, { status, cause } = {}) {
    super(message)
    this.name = 'UploadError'
    this.status = status
    if (cause) this.cause = cause
  }
}

// Photos larger than the request limit are re-encoded as a smaller JPEG.
// Smaller photos are sent untouched (keeps original quality and metadata).
async function shrinkIfTooLarge(file) {
  if (file.size <= MAX_UPLOAD_BYTES) return file

  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close?.()

  for (const quality of [0.85, 0.7, 0.55]) {
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality))
    if (blob && blob.size <= MAX_UPLOAD_BYTES) {
      const name = file.name.replace(/\.[^.]+$/, '') + '.jpg'
      return new File([blob], name, { type: 'image/jpeg' })
    }
  }
  throw new UploadError(`${file.name}: foto terlalu besar untuk dikirim.`)
}

// Reads the body as JSON when possible. Some backend errors (e.g. multer errors)
// come back as an HTML page, so never assume JSON.
async function readBody(res) {
  const text = await res.text()
  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}

// Pulls the parts the UI needs out of one Roboflow workflow result.
function parseRoboflowResult(result) {
  const output = Array.isArray(result?.outputs) ? result.outputs[0] : null
  const annotated = output?.annotated_image
  const rawPredictions = output?.predictions?.predictions

  const annotatedImageUrl =
    annotated?.type === 'base64' && typeof annotated.value === 'string'
      ? `data:image/jpeg;base64,${annotated.value}`
      : null

  const detections = Array.isArray(rawPredictions)
    ? rawPredictions.map((p) => ({
        className: p.class ?? p.class_name ?? 'gerobak',
        confidence: typeof p.confidence === 'number' ? p.confidence : null,
      }))
    : []

  return { annotatedImageUrl, detections }
}

// Uploads one photo. Resolves to { fileName, annotatedImageUrl, detections }.
export async function uploadPhoto(file) {
  if (!BASE_URL) {
    throw new UploadError('Alamat backend belum diatur (VITE_API_BASE_URL di .env).')
  }

  const toSend = await shrinkIfTooLarge(file)
  const body = new FormData()
  body.append('files', toSend, toSend.name) // field name must be "files"

  let res
  try {
    // Don't set Content-Type: the browser adds the multipart boundary itself.
    res = await fetch(ENDPOINT, { method: 'POST', body })
  } catch (err) {
    throw new UploadError('Tidak bisa terhubung ke server. Cek koneksi atau alamat backend.', {
      cause: err,
    })
  }

  const json = await readBody(res)

  if (res.status === 413) {
    throw new UploadError(`${file.name}: foto terlalu besar untuk diterima server.`, { status: 413 })
  }
  if (!json) {
    throw new UploadError(`Server membalas dengan format yang tidak dikenal (HTTP ${res.status}).`, {
      status: res.status,
    })
  }
  if (!res.ok && !json.data) {
    // 400 / 500: { success: false, error }
    throw new UploadError(json.error || `Upload gagal (HTTP ${res.status}).`, { status: res.status })
  }

  const item = json.data?.results?.[0]
  if (!item) {
    // The photo reached the server but the AI step failed (HTTP 502 + errors[]).
    const reason = json.data?.errors?.[0]?.error
    throw new UploadError(`${file.name}: ${reason || 'gagal diproses di server.'}`, {
      status: res.status,
    })
  }

  return { fileName: file.name, ...parseRoboflowResult(item.result) }
}
