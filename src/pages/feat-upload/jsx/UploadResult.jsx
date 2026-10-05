// One analysed photo returned by the backend's POST /upload.
// item = { fileName, previewUrl, annotatedImageUrl, detections: [{ className, confidence }] }
// The backend (Roboflow) already draws the masks on annotatedImageUrl, so we
// just show that image. If it's missing, we fall back to the original photo.
export function UploadResult({ item }) {
  const { fileName, previewUrl, annotatedImageUrl, detections } = item
  const count = detections.length

  return (
    <div className="detect-result">
      <div className="detect-result__canvas-wrap">
        <img
          className="detect-result__img"
          src={annotatedImageUrl || previewUrl}
          alt={
            count > 0
              ? `${fileName}: ${count} gerobak terdeteksi`
              : `${fileName}: tidak ada gerobak terdeteksi`
          }
        />
      </div>

      <div className="detect-result__summary">
        <span className="detect-result__name" title={fileName}>
          {fileName}
        </span>
        {count === 0 ? (
          <span className="detect-result__count detect-result__count--empty">No PKL detected</span>
        ) : (
          <span className="detect-result__count">
            {count} detection{count === 1 ? '' : 's'}
          </span>
        )}
      </div>

      {count > 0 && (
        <ul className="detect-result__list">
          {detections.map((d, i) => (
            <li key={i}>
              {d.className}
              {d.confidence !== null && ` ${Math.round(d.confidence * 100)}%`}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
