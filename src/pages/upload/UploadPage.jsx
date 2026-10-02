import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { AppLayout } from '../../components/AppLayout'
import { Icon } from '../../components/Icons'
import { DetectionResult } from './DetectionResult'
import {
  ensureModelReady,
  detectObjects,
  getActiveBackend,
  ModelLoadError,
} from '../../services/yolo/yoloInference'
import { calculateViolation } from '../../services/violation/violationRule'
import { buildViolationPayload, submitViolation } from '../../services/violation/submitViolation'
// Placeholder officer. Save the officer from the Upload Media design as
// src/assets/officer-upload.png, then change this line to import that file instead.
import officerImg from '../../assets/officer-upload.png'
import './UploadPage.css'

const ACCEPTED_TYPES = ['image/jpeg', 'image/png']
const ACCEPTED_EXTENSIONS = /\.(jpe?g|png)$/i
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

function formatSize(bytes) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

// Splits the picked/dropped files into accepted files and error messages for the rest.
function checkFiles(fileList) {
  const accepted = []
  const errors = []

  for (const file of fileList) {
    const isJpgOrPng = ACCEPTED_TYPES.includes(file.type) || ACCEPTED_EXTENSIONS.test(file.name)

    if (!isJpgOrPng) {
      errors.push(`${file.name}: only JPG and PNG files are allowed.`)
    } else if (file.size > MAX_FILE_SIZE) {
      errors.push(`${file.name}: file is larger than 10MB.`)
    } else {
      accepted.push(file)
    }
  }

  return { accepted, errors }
}

const isSameFile = (a, b) =>
  a.name === b.name && a.size === b.size && a.lastModified === b.lastModified

// Loads a File into an <img> element we can run inference on.
function loadImageElement(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => resolve({ img, url })
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error(`${file.name}: could not be read as an image.`))
    }
    img.src = url
  })
}

// Turns a thrown error into a short, user-friendly message (no stack traces).
function friendlyError(err) {
  if (err instanceof ModelLoadError) {
    if (err.kind === 'not-found') {
      return 'AI model not found. Copy best.onnx into public/models/ and reload.'
    }
    return 'The AI model could not be loaded in this browser.'
  }
  return err?.message || 'Something went wrong during analysis.'
}

export default function UploadPage() {
  const navigate = useNavigate()
  const inputRef = useRef(null)
  const dashboardBtnRef = useRef(null)
  const [files, setFiles] = useState([])
  const [errors, setErrors] = useState([])
  const [isDragging, setIsDragging] = useState(false)
  // 'idle' -> 'analyzing' (dark blur + spinner) -> 'success' (popup)
  const [status, setStatus] = useState('idle')
  // Model loading UX: 'unloaded' | 'loading' | 'ready' | 'error'
  const [modelState, setModelState] = useState('unloaded')
  const [backend, setBackend] = useState(null)
  const [analysisResults, setAnalysisResults] = useState([]) // DetectionResult items
  const [progress, setProgress] = useState(null) // { done, total }

  // Load the model once when the page opens, so the first Submit is fast.
  // The UI stays usable while this runs in the background.
  useEffect(() => {
    let active = true
    setModelState('loading')
    ensureModelReady()
      .then((activeBackend) => {
        if (!active) return
        setBackend(activeBackend)
        setModelState('ready')
      })
      .catch(() => {
        if (!active) return
        // Don't surface a hard error yet; the user may not even submit. We retry
        // on Submit and show the message there.
        setModelState('error')
      })
    return () => {
      active = false
    }
  }, [])

  // Move keyboard focus into the popup when it opens
  useEffect(() => {
    if (status === 'success') dashboardBtnRef.current?.focus()
  }, [status])

  // Clean up object URLs created for the result images.
  useEffect(() => {
    return () => {
      analysisResults.forEach((r) => URL.revokeObjectURL(r.url))
    }
  }, [analysisResults])

  const handleSubmit = async () => {
    setErrors([])
    setAnalysisResults([])
    setStatus('analyzing')
    setProgress({ done: 0, total: files.length })

    try {
      // Make sure the model is ready (retry if the background load failed).
      await ensureModelReady()
      setBackend(getActiveBackend())
      setModelState('ready')

      const results = []
      const newErrors = []

      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        try {
          const { img, url } = await loadImageElement(file)
          const { detections, backend: usedBackend, inferenceMs } = await detectObjects(img)

          // Detection -> violation (default: detection-only, flags nothing).
          const result = calculateViolation(detections, { mode: 'detection-only' })

          const imageSize = { width: img.naturalWidth, height: img.naturalHeight }

          // Build the backend payload (adapter is dry-run until the endpoint is confirmed).
          const payload = buildViolationPayload({
            fileName: file.name,
            imageSize,
            result,
            backend: usedBackend,
            inferenceMs,
          })
          await submitViolation(payload) // dry-run by default; never blocks detection

          results.push({ fileName: file.name, url, imageSize, result })
        } catch (err) {
          newErrors.push(friendlyError(err))
        }
        setProgress({ done: i + 1, total: files.length })
      }

      setAnalysisResults(results)
      setErrors(newErrors)
      setStatus('success')
    } catch (err) {
      // Model-level failure (couldn't load at all): back to the form with a message.
      setStatus('idle')
      setModelState('error')
      setErrors([friendlyError(err)])
    } finally {
      setProgress(null)
    }
  }

  const addFiles = (fileList) => {
    const { accepted, errors: newErrors } = checkFiles(fileList)
    setErrors(newErrors)
    // Skip files that are already in the list
    setFiles((current) => [
      ...current,
      ...accepted.filter((file) => !current.some((f) => isSameFile(f, file))),
    ])
  }

  const removeFile = (fileToRemove) => {
    setFiles((current) => current.filter((file) => file !== fileToRemove))
  }

  const handleDragOver = (e) => {
    e.preventDefault() // required, otherwise the browser doesn't allow dropping here
    setIsDragging(true)
  }

  const handleDragLeave = (e) => {
    // Moving between elements inside the drop zone also fires dragleave, so ignore those
    if (!e.currentTarget.contains(e.relatedTarget)) setIsDragging(false)
  }

  const handleDrop = (e) => {
    e.preventDefault() // stops the browser from opening the photo in the tab
    setIsDragging(false)
    addFiles(e.dataTransfer.files)
  }

  const handleInputChange = (e) => {
    addFiles(e.target.files)
    e.target.value = '' // lets the same file be picked again after it's removed
  }

  // Short status line under the dropzone title for the model.
  const modelStatusText =
    modelState === 'loading'
      ? 'Loading AI model...'
      : modelState === 'ready'
        ? `AI model ready${backend ? ` (${backend.toUpperCase()})` : ''}`
        : modelState === 'error'
          ? 'AI model unavailable — see message below'
          : ''

  const totalDetections = analysisResults.reduce((sum, r) => sum + r.result.detections.length, 0)

  return (
    <AppLayout title="Upload Media">
      <section className="upload-page">
        <div
          className={`upload-dropzone${isDragging ? ' upload-dropzone--dragging' : ''}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <Icon.Folder />
          <h2 className="upload-dropzone__title">Drop Your Photos!</h2>
          <p className="upload-dropzone__hint">*Accepted formats: JPG, PNG (Max 10MB per file)</p>

          {modelStatusText && (
            <p
              className={`upload-model-status upload-model-status--${modelState}`}
              role="status"
              aria-live="polite"
            >
              {modelState === 'loading' && <span className="upload-model-status__dot" />}
              {modelStatusText}
            </p>
          )}

          <button
            type="button"
            className="upload-dropzone__btn"
            onClick={() => inputRef.current.click()}
          >
            <Icon.Plus />
            Add Files
          </button>
          {/* Hidden file picker, opened by the Add Files button */}
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png"
            multiple
            hidden
            onChange={handleInputChange}
          />

          {errors.length > 0 && (
            <ul className="upload-errors" role="alert">
              {errors.map((message, i) => (
                <li key={i}>{message}</li>
              ))}
            </ul>
          )}

          {files.length > 0 && (
            <ul className="upload-files" aria-label="Selected files">
              {files.map((file) => (
                <li key={`${file.name}-${file.size}-${file.lastModified}`} className="upload-file">
                  <span className="upload-file__name">{file.name}</span>
                  <span className="upload-file__size">{formatSize(file.size)}</span>
                  <button
                    type="button"
                    className="upload-file__remove"
                    aria-label={`Remove ${file.name}`}
                    onClick={() => removeFile(file)}
                  >
                    <Icon.Close />
                  </button>
                </li>
              ))}
            </ul>
          )}

          {/* Only shown once at least one photo has been added */}
          {files.length > 0 && (
            <button
              type="button"
              className="upload-submit"
              onClick={handleSubmit}
              disabled={status === 'analyzing'}
            >
              Submit
            </button>
          )}
        </div>

        {/* Detection results appear below the dropzone after analysis */}
        {analysisResults.length > 0 && (
          <div className="upload-results">
            <div className="upload-results__head">
              <h3 className="upload-results__title">Detection Results</h3>
              <span className="upload-results__count">
                {totalDetections} total detection{totalDetections === 1 ? '' : 's'}
              </span>
            </div>
            <div className="upload-results__grid">
              {analysisResults.map((item) => (
                <DetectionResult key={`${item.fileName}-${item.url}`} item={item} />
              ))}
            </div>
          </div>
        )}

        <div className="upload-officer" aria-hidden="true">
          <img src={officerImg} alt="" />
        </div>
      </section>

      {/* Rendered straight into <body> so it covers the sidebar and topbar too */}
      {status !== 'idle' &&
        createPortal(
          <div className="upload-overlay">
            {status === 'analyzing' && (
              <div className="upload-loading" role="status" aria-live="polite">
                <span className="upload-spinner" aria-hidden="true" />
                <p>
                  {modelState !== 'ready'
                    ? 'Loading AI model...'
                    : progress
                      ? `Analyzing ${progress.done}/${progress.total}...`
                      : 'Analyzing...'}
                </p>
              </div>
            )}

            {status === 'success' && (
              <div
                className="upload-success"
                role="dialog"
                aria-modal="true"
                aria-labelledby="upload-success-title"
              >
                <div className="upload-success__check" aria-hidden="true">
                  <Icon.Check />
                </div>
                <h2 id="upload-success-title" className="upload-success__title">
                  {totalDetections > 0 ? 'Analisis selesai' : 'Tidak ada PKL terdeteksi'}
                </h2>
                <p className="upload-success__subtitle">
                  {totalDetections > 0
                    ? `${totalDetections} deteksi pada ${analysisResults.length} gambar.`
                    : 'Model berjalan, tapi tidak menemukan gerobak.'}
                </p>
                <div className="upload-success__actions">
                  <button
                    ref={dashboardBtnRef}
                    type="button"
                    className="upload-success__btn upload-success__btn--secondary"
                    onClick={() => setStatus('idle')}
                  >
                    Lihat Hasil
                  </button>
                  <button
                    type="button"
                    className="upload-success__btn upload-success__btn--primary"
                    onClick={() => navigate('/report')}
                  >
                    Lihat Report
                  </button>
                </div>
              </div>
            )}
          </div>,
          document.body,
        )}
    </AppLayout>
  )
}
