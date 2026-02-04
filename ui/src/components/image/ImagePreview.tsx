import { getPreviewUrl } from '../../api/upload'
import styles from './ImagePreview.module.css'

interface ImagePreviewProps {
  fileId: string | null
  filename?: string
}

export default function ImagePreview({ fileId, filename }: ImagePreviewProps) {
  if (!fileId) {
    return (
      <div className={styles.placeholder}>
        <ImageIcon />
        <p>No image selected</p>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <img
        src={getPreviewUrl(fileId)}
        alt={filename || 'Preview'}
        className={styles.image}
      />
      {filename && <p className={styles.filename}>{filename}</p>}
    </div>
  )
}

function ImageIcon() {
  return (
    <svg
      width="64"
      height="64"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1"
      className={styles.icon}
    >
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <polyline points="21 15 16 10 5 21" />
    </svg>
  )
}
