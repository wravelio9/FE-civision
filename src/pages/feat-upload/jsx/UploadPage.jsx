import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { AppLayout } from '../../../components/AppLayout'
import { Icon } from '../../../components/Icons'
import { UploadResult } from './UploadResult'
import { uploadPhoto } from '../../../services/upload/uploadPhotos'
// Placeholder officer. Save the officer from the Upload Media design as
// src/assets/officer-upload.png, then change this line to import that file instead.
import officerImg from '../../../assets/officer-upload.png'
import '../css/UploadPage.css'

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

// Turns a thrown error into a short, user-friendly message (no stack traces).
function friendlyError(err) {
  return err?.message || 'Terjadi kesalahan saat mengupload foto.'
}

export default function UploadPage() {
  const navigate = useNavigate()
  const inputRef = useRef(null)
  const dashboardBtnRef = useRef(null)
  const [files, setFiles] = useState([])
  const [errors, setErrors] = useState([])
  const [isDragging, setIsDragging] = useState(false)
  // 'idle' -> 'uploading' (dark blur + spinner) -> 'success' (popup)
  const [status, setStatus] = useState('idle')
  const [analysisResults, setAnalysisResults] = useState([]) // UploadResult items
  const [progress, setProgress] = useState(null) // { done, total }

  // Move keyboard focus into the popup when it opens
  useEffect(() => {
    if (status === 'success') dashboardBtnRef.current?.focus()
  }, [status])

  // Free the preview URLs when the results are replaced or the page closes.
  useEffect(() => {
    return () => {
      analysisResults.forEach((r) => URL.revokeObjectURL(r.previewUrl))
    }
  }, [analysisResults])

  // Submit: send each photo to the backend (POST /upload). The backend runs the
  // gerobak detection and returns the result for that photo.
  const handleSubmit = async () => {
    setErrors([])
    setAnalysisResults([])
    setStatus('uploading')
    setProgress({ done: 0, total: files.length })

    const results = []
    const newErrors = []

    // One photo at a time: shows progress, and one failed photo doesn't fail the rest.
    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      try {
        const result = await uploadPhoto(file)
        results.push({ ...result, previewUrl: URL.createObjectURL(file) })
      } catch (err) {
        newErrors.push(friendlyError(err))
      }
      setProgress({ done: i + 1, total: files.length })
    }

    setProgress(null)
    setAnalysisResults(results)
    setErrors(newErrors)

    if (results.length === 0) {
      // Nothing got through (server down, every photo rejected, ...):
      // back to the form so the user can read the errors and try again.
      setStatus('idle')
      return
    }

    // Uploaded successfully: clear the selection so the same photos aren't sent twice.
    setFiles([])
    setStatus('success')
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

  const totalDetections = analysisResults.reduce((sum, r) => sum + r.detections.length, 0)
  const failedCount = errors.length

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
              disabled={status === 'uploading'}
            >
              Submit
            </button>
          )}

          {/* <div className="upload-officer" aria-hidden="true">
            <img src={officerImg} alt="" />
          </div> */}
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
                <UploadResult key={item.previewUrl} item={item} />
              ))}
            </div>
          </div>
        )}

        {/* <div className="upload-officer" aria-hidden="true">
          <img src={officerImg} alt="" />
        </div> */}
      </section>

      {/* Rendered straight into <body> so it covers the sidebar and topbar too */}
      {status !== 'idle' &&
        createPortal(
          <div className="upload-overlay">
            {status === 'uploading' && (
              <div className="upload-loading" role="status" aria-live="polite">
                <span className="upload-spinner" aria-hidden="true" />
                <p>
                  {progress && progress.total > 1
                    ? `Mengupload foto ${Math.min(progress.done + 1, progress.total)}/${progress.total}...`
                    : 'Mengupload foto...'}
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
                  Upload berhasil
                </h2>
                <p className="upload-success__subtitle">
                  {totalDetections > 0
                    ? `${totalDetections} gerobak terdeteksi pada ${analysisResults.length} foto.`
                    : `${analysisResults.length} foto terkirim. Tidak ada gerobak terdeteksi.`}
                  {failedCount > 0 && ` ${failedCount} foto gagal, lihat detail di halaman.`}
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
