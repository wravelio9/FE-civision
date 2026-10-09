// Violation logic, kept separate from object detection.
//
//   Detection  = YOLO found a gerobak (PKL)
//   Violation  = a detection that satisfies a violation rule
//
// A detected PKL is NOT automatically a violation. The rule is configurable.
//
// Modes:
//   'detection-only' (default) -> report detections, mark none as violations.
//   'polygon'                  -> a detection is a violation if its box centre
//                                 falls inside a forbidden polygon (provided by
//                                 the caller). No polygon is invented here.
import type { Detection } from '../yolo/postprocessing'

export interface Point {
  x: number
  y: number
}

export type ViolationMode = 'detection-only' | 'polygon'

export interface ViolationOptions {
  mode?: ViolationMode
  polygon?: Point[]
}

export type EvaluatedDetection<T extends Detection = Detection> = T & { isViolation: boolean }

export interface ViolationResult<T extends Detection = Detection> {
  mode: ViolationMode
  detections: EvaluatedDetection<T>[]
  violations: EvaluatedDetection<T>[]
  violationCount: number
  isViolation: boolean
}

// Ray-casting point-in-polygon test. polygon = [{x, y}, ...] in image pixels.
function pointInPolygon(point: Point, polygon: Point[]): boolean {
  let inside = false
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x
    const yi = polygon[i].y
    const xj = polygon[j].x
    const yj = polygon[j].y

    const intersects =
      yi > point.y !== yj > point.y &&
      point.x < ((xj - xi) * (point.y - yi)) / (yj - yi) + xi
    if (intersects) inside = !inside
  }
  return inside
}

function boxCentre(bbox: Detection['bbox']): Point {
  return { x: (bbox.x1 + bbox.x2) / 2, y: (bbox.y1 + bbox.y2) / 2 }
}

// detections: array from detectObjects(). options: { mode, polygon }.
// Returns { mode, detections, violations, violationCount, isViolation }.
// Each item carries an `isViolation` flag; `violations` is the subset flagged true.
export function calculateViolation<T extends Detection>(
  detections: T[],
  options: ViolationOptions = {},
): ViolationResult<T> {
  const mode = options.mode ?? 'detection-only'

  let evaluated: EvaluatedDetection<T>[]
  if (mode === 'polygon') {
    const polygon = options.polygon
    if (!Array.isArray(polygon) || polygon.length < 3) {
      throw new Error('polygon mode requires an options.polygon with at least 3 points.')
    }
    evaluated = detections.map((d) => ({
      ...d,
      isViolation: pointInPolygon(boxCentre(d.bbox), polygon),
    }))
  } else {
    // detection-only: never falsely flag a detection as a violation.
    evaluated = detections.map((d) => ({ ...d, isViolation: false }))
  }

  const violations = evaluated.filter((d) => d.isViolation)
  return {
    mode,
    detections: evaluated,
    violations,
    violationCount: violations.length,
    isViolation: violations.length > 0,
  }
}

export { pointInPolygon }
