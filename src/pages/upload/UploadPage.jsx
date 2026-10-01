import { useRef, useState } from 'react'
import { AppLayout } from '../../components/AppLayout'
import { Icon } from '../../components/Icons'
// Placeholder officer. Save the officer from the Upload Media design as
// src/assets/officer-upload.png, then change this line to import that file instead.
import officerImg from '../../assets/officer-login.png'
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

export default function UploadPage() {
  const inputRef = useRef(null)
  const [files, setFiles] = useState([])
  const [errors, setErrors] = useState([])
  const [isDragging, setIsDragging] = useState(false)

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
        </div>

        <div className="upload-officer" aria-hidden="true">
          <img src={officerImg} alt="" />
        </div>
      </section>
    </AppLayout>
  )
}
