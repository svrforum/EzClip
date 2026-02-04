import { getPreviewUrl } from '../../api/upload'
import styles from './VideoPreview.module.css'

interface VideoPreviewProps {
  fileId: string | null
  filename?: string
}

export default function VideoPreview({ fileId, filename }: VideoPreviewProps) {
  if (!fileId) {
    return (
      <div className={styles.placeholder}>
        <VideoIcon />
        <p>No video selected</p>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <video
        src={getPreviewUrl(fileId)}
        controls
        className={styles.video}
      />
      {filename && <p className={styles.filename}>{filename}</p>}
    </div>
  )
}

function VideoIcon() {
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
      <polygon points="23 7 16 12 23 17 23 7" />
      <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
    </svg>
  )
}
