// High-level YOLO API used by the UI.
//
//   ensureModelReady()   -> loads the model once (returns the active backend)
//   detectObjects(image) -> runs the full pipeline and returns detections
//
// Detection shape (coordinates are in ORIGINAL-image pixels):
//   { classId, className, confidence, bbox: { x1, y1, x2, y2 } }
import { loadModel, getActiveBackend, isModelLoaded, ModelLoadError } from './session'
import { YOLO_CONFIG } from './config'
import { preprocess, type ImageSource } from './preprocessing'
import { postprocess, type PostprocessOptions } from './postprocessing'

export type { Detection } from './postprocessing'

// Loads the model if needed. Safe to call repeatedly; the session is cached.
export async function ensureModelReady() {
  await loadModel()
  return getActiveBackend()
}

// Runs detection on an image/canvas/video-frame element.
// Returns { detections, backend, inferenceMs }.
export async function detectObjects(source: ImageSource, options: PostprocessOptions = {}) {
  const session = await loadModel()

  const { tensor, meta } = preprocess(source)

  let output: Float32Array
  const started = performance.now()
  try {
    const feeds = { [YOLO_CONFIG.inputName]: tensor }
    const results = await session.run(feeds)
    // Single output; take the first regardless of its name.
    const outputTensor = results[session.outputNames[0]]
    output = outputTensor.data as Float32Array
  } finally {
    // Free the input tensor's GPU/CPU buffer promptly.
    tensor.dispose?.()
  }
  const inferenceMs = Math.round(performance.now() - started)

  const detections = postprocess(output, meta, options)
  return { detections, backend: getActiveBackend(), inferenceMs }
}

export { isModelLoaded, getActiveBackend, ModelLoadError, YOLO_CONFIG }
