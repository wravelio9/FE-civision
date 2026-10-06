import { useEffect, useRef, useState } from 'react'

// How the backend found the coordinates (coordinateSource).
const SOURCE_LABELS = {
  gps_exif: 'GPS foto',
  ocr: 'OCR',
  manual: 'manual',
}

// Draws one analysed image with its bounding boxes, plus a small summary.
// `item` = { fileName, url, imageSize:{width,height}, result } where result comes
// from calculateViolation(). Coordinates in result.detections[].bbox are in
// ORIGINAL-image pixels; we scale them to the displayed <img> size.
export function DetectionResult({ item }) {
  const imgRef = useRef(null)
  const canvasRef = useRef(null)
  // Re-draw whenever the image finishes layout / the window resizes.
  const [, setTick] = useState(0)

  const { url, imageSize, result } = item
  const detections = result.detections

  useEffect(() => {
    const draw = () => {
      const img = imgRef.current
      const canvas = canvasRef.current
      if (!img || !canvas) return

      // Match the canvas to the image's displayed (CSS) size.
      const rect = img.getBoundingClientRect()
      if (!rect.width || !rect.height) return
      canvas.width = rect.width
      canvas.height = rect.height

      // Scale from original-image pixels to the displayed size.
      const sx = rect.width / imageSize.width
      const sy = rect.height / imageSize.height

      const ctx = canvas.getContext('2d')
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      for (const d of detections) {
        const x = d.bbox.x1 * sx
        const y = d.bbox.y1 * sy
        const w = (d.bbox.x2 - d.bbox.x1) * sx
        const h = (d.bbox.y2 - d.bbox.y1) * sy

        // Red for a flagged violation, purple for a plain detection.
        const color = d.isViolation ? '#e0485a' : '#5a50c3'

        ctx.lineWidth = 2
        ctx.strokeStyle = color
        ctx.strokeRect(x, y, w, h)

        // Label: "gerobak 94%"
        const label = `${d.className} ${Math.round(d.confidence * 100)}%`
        ctx.font = '600 12px Poppins, system-ui, sans-serif'
        const padX = 6
        const textW = ctx.measureText(label).width + padX * 2
        const labelH = 18
        const labelY = y - labelH < 0 ? y : y - labelH // keep inside the image

        ctx.fillStyle = color
        ctx.fillRect(x, labelY, textW, labelH)
        ctx.fillStyle = '#fff'
        ctx.fillText(label, x + padX, labelY + 13)
      }
    }

    draw()
    const onResize = () => {
      draw()
      setTick((t) => t + 1)
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [detections, imageSize])

  return (
    <div className="detect-result">
      <div className="detect-result__canvas-wrap">
        <img
          ref={imgRef}
          className="detect-result__img"
          src={url}
          alt={item.fileName}
          onLoad={() => setTick((t) => t + 1)}
        />
        <canvas ref={canvasRef} className="detect-result__canvas" aria-hidden="true" />
      </div>

      <div className="detect-result__summary">
        <span className="detect-result__name" title={item.fileName}>
          {item.fileName}
        </span>
        {detections.length === 0 ? (
          <span className="detect-result__count detect-result__count--empty">No PKL detected</span>
        ) : (
          <span className="detect-result__count">
            {detections.length} det<span>{detections.length === 1 ? 'ection' : 'ections'}</span>
            {result.violationCount > 0 && (
              <span className="detect-result__violations">
                {' '}
                · {result.violationCount} violation{result.violationCount === 1 ? '' : 's'}
              </span>
            )}
          </span>
        )}
      </div>

      {/* What the backend sent back for this photo (coordinates from EXIF/OCR) */}
      {(item.backend || item.backendError) && (
        <div className="detect-result__backend">
          {item.backendError ? (
            <span className="detect-result__backend--error">Gagal disimpan: {item.backendError}</span>
          ) : item.backend.coordinate ? (
            <span>
              Lokasi: {item.backend.coordinate.lat.toFixed(5)}, {item.backend.coordinate.lon.toFixed(5)}{' '}
              <span className="detect-result__source">({SOURCE_LABELS[item.backend.coordinateSource] ?? item.backend.coordinateSource})</span>
            </span>
          ) : (
            <span className="detect-result__backend--muted">Tersimpan, koordinat tidak ditemukan.</span>
          )}
        </div>
      )}
    </div>
  )
}
