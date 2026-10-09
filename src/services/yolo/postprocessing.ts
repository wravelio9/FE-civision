// Postprocessing: turn the raw model output into detections in ORIGINAL-image
// coordinates.
//
// Output tensor is [1, 5, 8400] = [1, 4+nc, N], nc = 1, laid out channel-major:
//   data = [ x(0..N-1), y(0..N-1), w(0..N-1), h(0..N-1), conf(0..N-1) ]
// Boxes are xywh (centre) in the 640x640 letterboxed space, no objectness, no NMS.
//
// Steps: read xywh+conf -> filter by confidence -> xywh->xyxy -> NMS (IoU 0.45)
//        -> reverse letterbox (subtract pad, divide by scale) -> clip to image.
import { YOLO_CONFIG, classNameFor } from './config'
import type { LetterboxMeta } from './preprocessing'

// Axis-aligned box as [x1,y1,x2,y2].
interface Box {
  x1: number
  y1: number
  x2: number
  y2: number
}

// A candidate box in 640 space, before NMS.
interface Candidate extends Box {
  classId: number
  confidence: number
}

// Final detection, coordinates in ORIGINAL-image pixels.
export interface Detection {
  classId: number
  className: string
  confidence: number
  bbox: Box
}

export interface PostprocessOptions {
  confidenceThreshold?: number
  nmsIoUThreshold?: number
}

// Intersection-over-Union of two [x1,y1,x2,y2] boxes.
function iou(a: Box, b: Box): number {
  const interX1 = Math.max(a.x1, b.x1)
  const interY1 = Math.max(a.y1, b.y1)
  const interX2 = Math.min(a.x2, b.x2)
  const interY2 = Math.min(a.y2, b.y2)

  const interW = Math.max(0, interX2 - interX1)
  const interH = Math.max(0, interY2 - interY1)
  const interArea = interW * interH
  if (interArea === 0) return 0

  const areaA = (a.x2 - a.x1) * (a.y2 - a.y1)
  const areaB = (b.x2 - b.x1) * (b.y2 - b.y1)
  return interArea / (areaA + areaB - interArea)
}

// Greedy non-maximum suppression: keep the highest-confidence box, drop boxes
// that overlap it more than the IoU threshold, repeat.
function nonMaxSuppression<T extends Candidate>(boxes: T[], iouThreshold: number): T[] {
  const sorted = [...boxes].sort((a, b) => b.confidence - a.confidence)
  const kept: T[] = []

  while (sorted.length > 0) {
    const best = sorted.shift()!
    kept.push(best)
    for (let i = sorted.length - 1; i >= 0; i--) {
      // Only suppress boxes of the same class.
      if (sorted[i].classId === best.classId && iou(best, sorted[i]) > iouThreshold) {
        sorted.splice(i, 1)
      }
    }
  }
  return kept
}

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max)

// output: Float32Array of length 5*8400. meta: letterbox metadata from preprocess().
export function postprocess(
  output: ArrayLike<number>,
  meta: LetterboxMeta,
  options: PostprocessOptions = {},
): Detection[] {
  const confidenceThreshold = options.confidenceThreshold ?? YOLO_CONFIG.confidenceThreshold
  const iouThreshold = options.nmsIoUThreshold ?? YOLO_CONFIG.nmsIoUThreshold

  const numChannels = 4 + Object.keys(YOLO_CONFIG.classNames).length // 4 box + nc
  const numBoxes = output.length / numChannels // 8400

  // Channel-major offsets into the flat array.
  const xOff = 0 * numBoxes
  const yOff = 1 * numBoxes
  const wOff = 2 * numBoxes
  const hOff = 3 * numBoxes
  const confOff = 4 * numBoxes // first (and only) class channel

  const candidates: Candidate[] = []
  for (let i = 0; i < numBoxes; i++) {
    const confidence = output[confOff + i]
    if (confidence < confidenceThreshold) continue

    // xywh centre in 640 space.
    const cx = output[xOff + i]
    const cy = output[yOff + i]
    const w = output[wOff + i]
    const h = output[hOff + i]

    candidates.push({
      classId: 0,
      confidence,
      // xywh -> xyxy, still in 640 space
      x1: cx - w / 2,
      y1: cy - h / 2,
      x2: cx + w / 2,
      y2: cy + h / 2,
    })
  }

  const kept = nonMaxSuppression(candidates, iouThreshold)

  // Reverse the letterbox: undo the centring pad, then undo the scale, then clip
  // to the original image. meta.scale maps original -> 640, so we divide to go back.
  const { scale, padX, padY, srcW, srcH } = meta
  return kept.map((box) => {
    const x1 = clamp((box.x1 - padX) / scale, 0, srcW)
    const y1 = clamp((box.y1 - padY) / scale, 0, srcH)
    const x2 = clamp((box.x2 - padX) / scale, 0, srcW)
    const y2 = clamp((box.y2 - padY) / scale, 0, srcH)

    return {
      classId: box.classId,
      className: classNameFor(box.classId),
      confidence: box.confidence,
      bbox: {
        x1: Math.round(x1),
        y1: Math.round(y1),
        x2: Math.round(x2),
        y2: Math.round(y2),
      },
    }
  })
}

// Exported for unit tests.
export { iou, nonMaxSuppression }
