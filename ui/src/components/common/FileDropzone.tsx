import { useCallback, useState, DragEvent, ChangeEvent, ReactNode } from 'react'
import styles from './FileDropzone.module.css'

interface FileDropzoneProps {
  onFilesSelected: (files: File[]) => void
  accept?: string
  multiple?: boolean
  maxSize?: number
  children?: ReactNode
  disabled?: boolean
}

export default function FileDropzone({
  onFilesSelected,
  accept,
  multiple = false,
  maxSize,
  children,
  disabled = false,
}: FileDropzoneProps) {
  const [isDragging, setIsDragging] = useState(false)

  const handleDragEnter = useCallback((e: DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!disabled) setIsDragging(true)
  }, [disabled])

  const handleDragLeave = useCallback((e: DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }, [])

  const handleDragOver = useCallback((e: DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const handleDrop = useCallback(
    (e: DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setIsDragging(false)

      if (disabled) return

      const files = Array.from(e.dataTransfer.files)
      const validFiles = files.filter((file) => {
        if (maxSize && file.size > maxSize) return false
        if (accept) {
          const acceptedTypes = accept.split(',').map((t) => t.trim())
          const fileExt = `.${file.name.split('.').pop()?.toLowerCase()}`
          const fileType = file.type

          return acceptedTypes.some(
            (t) =>
              t === fileType ||
              t === fileExt ||
              (t.endsWith('/*') && fileType.startsWith(t.replace('/*', '/')))
          )
        }
        return true
      })

      if (validFiles.length > 0) {
        onFilesSelected(multiple ? validFiles : [validFiles[0]])
      }
    },
    [accept, disabled, maxSize, multiple, onFilesSelected]
  )

  const handleFileSelect = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || [])
      if (files.length > 0) {
        onFilesSelected(multiple ? files : [files[0]])
      }
      e.target.value = ''
    },
    [multiple, onFilesSelected]
  )

  return (
    <div
      className={`${styles.dropzone} ${isDragging ? styles.dragging : ''} ${disabled ? styles.disabled : ''}`}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <input
        type="file"
        accept={accept}
        multiple={multiple}
        onChange={handleFileSelect}
        className={styles.input}
        disabled={disabled}
      />
      {children || (
        <div className={styles.content}>
          <UploadIcon />
          <p className={styles.text}>
            {isDragging
              ? '파일을 여기에 놓으세요'
              : '파일을 드래그하거나 클릭하여 선택하세요'}
          </p>
          {accept && (
            <p className={styles.hint}>
              지원 형식: {accept.replace(/\./g, '').replace(/,/g, ', ')}
            </p>
          )}
        </div>
      )}
    </div>
  )
}

function UploadIcon() {
  return (
    <svg
      width="48"
      height="48"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      className={styles.icon}
    >
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  )
}
