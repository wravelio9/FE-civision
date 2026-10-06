// Sends one photo (plus its ONNX detections) to the backend.
//
// Backend contract (BE - civision), two steps per photo:
//
// 1. POST {VITE_API_BASE_URL}/api/upload
//      multipart/form-data, field "files". Stores the photo, no AI/OCR.
//      201 -> { success: true,  data: { media: [{ id, ... }], errors: [] } }
//      400 -> { success: false, error } or { success: false, data: { errors: [{ filename, error }] } }
//
// 2. POST {VITE_API_BASE_URL}/api/analysis
//      multipart/form-data: "photo" (the image, used for EXIF + OCR) and
//      "payload" = JSON string { mediaId, detections: [{ label, confidence, bbox }] }.
//      The backend reads the coordinates (EXIF GPS first, then OCR of the
//      coordinate overlay), matches them to zones and saves the analysis.
//      201 -> { ok: true, message, detectionCount, coordinateSource,
//               coordinate: { lat, lon } | null, ocrRawText,
//               result: { analysisId, totalDetections, totalViolations, unknownLocation } }
//      400 -> { ok: false, message }
//
// Vercel limits a request body to ~4.5 MB, so photos are sent one at a time and
// oversized photos are shrunk first.

const BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/+$/, '')
const UPLOAD_ENDPOINT = `${BASE_URL}/api/upload`
const ANALYSIS_ENDPOINT = `${BASE_URL}/api/analysis`

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
// Smaller photos are sent untouched (keeps original quality and EXIF GPS).
// Returns { file, scale } where scale maps original pixels -> sent pixels.
async function shrinkIfTooLarge(file) {
  if (file.size <= MAX_UPLOAD_BYTES) return { file, scale: 1 }

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
      return { file: new File([blob], name, { type: 'image/jpeg' }), scale }
    }
  }
  throw new UploadError('foto terlalu besar untuk dikirim.')
}

// POSTs a FormData body. Returns { res, json } where json is null if the body
// isn't JSON (some backend errors come back as an HTML page).
async function postForm(url, body) {
  let res
  try {
    // Don't set Content-Type: the browser adds the multipart boundary itself.
    res = await fetch(url, { method: 'POST', body })
  } catch (err) {
    throw new UploadError(`tidak bisa terhubung ke server (${BASE_URL}). Cek koneksi atau alamat backend.`, {
      cause: err,
    })
  }

  if (res.status === 413) {
    throw new UploadError('foto terlalu besar untuk diterima server.', { status: 413 })
  }

  const text = await res.text()
  let json = null
  try {
    json = JSON.parse(text)
  } catch {
    // leave json as null
  }
  return { res, json }
}

// Step 1: store the photo. Resolves to the mediaId the backend created.
async function uploadMedia(file) {
  const body = new FormData()
  body.append('files', file, file.name) // field name must be "files"

  const { res, json } = await postForm(UPLOAD_ENDPOINT, body)
  if (!json) {
    throw new UploadError(`server membalas dengan format yang tidak dikenal (HTTP ${res.status}).`, {
      status: res.status,
    })
  }

  const mediaId = json.data?.media?.[0]?.id
  if (!res.ok || !mediaId) {
    const reason = json.error || json.data?.errors?.[0]?.error
    throw new UploadError(reason || `upload gagal (HTTP ${res.status}).`, { status: res.status })
  }
  return mediaId
}

// Step 2: OCR/EXIF coordinates + zone check + save, using our ONNX detections.
async function analyzePhoto({ mediaId, file, detections }) {
  const body = new FormData()
  body.append('photo', file, file.name)
  body.append('payload', JSON.stringify({ mediaId, detections }))

  const { res, json } = await postForm(ANALYSIS_ENDPOINT, body)
  if (!json) {
    throw new UploadError(`server gagal memproses analisis (HTTP ${res.status}).`, { status: res.status })
  }
  if (!res.ok || !json.ok) {
    throw new UploadError(json.message || `analisis gagal (HTTP ${res.status}).`, { status: res.status })
  }

  return {
    mediaId,
    message: json.message ?? null,
    coordinate: json.coordinate ?? null, // { lat, lon } | null
    coordinateSource: json.coordinateSource ?? null, // 'gps_exif' | 'ocr' | 'manual' | null
    ocrRawText: json.ocrRawText ?? null,
    analysisId: json.result?.analysisId ?? null,
    totalDetections: json.result?.totalDetections ?? 0,
    totalViolations: json.result?.totalViolations ?? 0,
    unknownLocation: json.result?.unknownLocation ?? 0,
  }
}

// Sends one photo and its ONNX detections to the backend.
// detections: output of detectObjects() (bbox in original-image pixels).
// Resolves to the backend's analysis result (see analyzePhoto above).
export async function sendPhotoToBackend(file, detections) {
  if (!BASE_URL) {
    throw new UploadError('alamat backend belum diatur (VITE_API_BASE_URL di .env).')
  }

  const { file: toSend, scale } = await shrinkIfTooLarge(file)

  // Backend format: { label, confidence, bbox }. If the photo was shrunk, scale
  // the boxes so they still match the image the backend receives.
  const payloadDetections = detections.map((d) => ({
    label: d.className,
    confidence: Number(d.confidence.toFixed(4)),
    bbox: {
      x1: Math.round(d.bbox.x1 * scale),
      y1: Math.round(d.bbox.y1 * scale),
      x2: Math.round(d.bbox.x2 * scale),
      y2: Math.round(d.bbox.y2 * scale),
    },
  }))

  const mediaId = await uploadMedia(toSend)
  return analyzePhoto({ mediaId, file: toSend, detections: payloadDetections })
}
