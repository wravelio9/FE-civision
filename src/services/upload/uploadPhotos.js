// Upload flow (agreed with the team):
//   FE receives photo -> runs best.onnx in the browser -> sends photo + detections
//   to the backend -> backend stores it (coordinate, zone check, violation) in the DB.
//
// Backend contract (BE-civision, src/controller/upload.controller.ts):
//   POST {VITE_API_BASE_URL}/api/upload   multipart/form-data, no auth
//     files   : the photo
//     payload : JSON string { detections: [{ label, confidence, bbox:{x1,y1,x2,y2} }],
//                             manualLatLon?: { lat, lon } }
//   201 -> { success: true, data: [{ mediaId, filename, coordinateSource, coordinate,
//                                    detectionCount,
//                                    result: { analysisId, totalDetections,
//                                              totalViolations, unknownLocation } }] }
//   4xx/5xx -> { success: false, error: "<message>" }
//
// We send ONE request per photo. Vercel limits a request body to ~4.5 MB, so a
// single request with several photos would easily be rejected. One-by-one also
// lets the UI show progress and keeps one failed photo from failing the rest.
import { detectObjects } from '../yolo/yoloInference.js'

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
// Smaller photos are sent untouched (keeps original quality and EXIF GPS).
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

// Runs best.onnx on the photo. Boxes come back in ORIGINAL-image pixels.
async function runDetection(file) {
  let bitmap
  try {
    bitmap = await createImageBitmap(file)
  } catch (err) {
    throw new UploadError(`${file.name}: foto tidak bisa dibaca browser.`, { cause: err })
  }

  try {
    const imageSize = { width: bitmap.width, height: bitmap.height }
    const { detections } = await detectObjects(bitmap)
    return { detections, imageSize }
  } catch (err) {
    console.error('[onnx] deteksi gagal:', err, err?.cause)
    const detail = err?.cause?.message || err?.message || 'unknown error'
    throw new UploadError(`${file.name}: model AI (best.onnx) gagal dijalankan. ${detail}`, {
      cause: err,
    })
  } finally {
    bitmap.close?.()
  }
}

// Detects gerobak with ONNX, then uploads photo + detections.
// Resolves to { fileName, imageSize, detections, result, server }.
export async function uploadPhoto(file) {
  if (!BASE_URL) {
    throw new UploadError('Alamat backend belum diatur (VITE_API_BASE_URL di .env).')
  }

  // 1) ONNX in the browser.
  const { detections, imageSize } = await runDetection(file)

  // 2) Photo + detections to the backend (field names must match the backend).
  const toSend = await shrinkIfTooLarge(file)
  const body = new FormData()
  body.append('files', toSend, toSend.name)
  body.append(
    'payload',
    JSON.stringify({
      detections: detections.map((d) => ({
        label: d.className,
        confidence: d.confidence,
        bbox: d.bbox,
      })),
    }),
  )

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
  if (!res.ok || !json.success) {
    throw new UploadError(`${file.name}: ${json.error || `upload gagal (HTTP ${res.status}).`}`, {
      status: res.status,
    })
  }

  const server = Array.isArray(json.data) ? json.data[0] : null
  if (!server) {
    throw new UploadError(`${file.name}: server tidak mengembalikan hasil.`, { status: res.status })
  }

  return {
    fileName: file.name,
    imageSize,
    detections,
    // Shape expected by <DetectionResult />.
    result: { detections, violationCount: server.result?.totalViolations ?? 0 },
    server,
  }
}