import { useJobProgress } from '../../hooks'
import { ProgressBar } from '../common'
import type { JobDetail } from '../../api/types'
import styles from './JobItem.module.css'

interface JobItemProps {
  job: JobDetail
  onCancel?: () => void
  onDownload?: () => void
}

const jobTypeLabels: Record<string, string> = {
  image_convert: '이미지 변환',
  image_resize: '이미지 크기 조절',
  image_crop: '이미지 자르기',
  image_filter: '필터 적용',
  image_rotate: '이미지 회전',
  image_remove_bg: '배경 제거',
  video_convert: '비디오 변환',
  video_to_gif: 'GIF 변환',
  gif_to_video: 'GIF → 비디오',
  video_trim: '비디오 자르기',
  video_resize: '해상도 변경',
  video_compress: '비디오 압축',
  video_thumbnail: '썸네일 추출',
  video_audio: '오디오 처리',
}

const statusLabels: Record<string, string> = {
  pending: '대기 중',
  processing: '처리 중',
  completed: '완료',
  failed: '실패',
  cancelled: '취소됨',
}

export default function JobItem({ job, onCancel, onDownload }: JobItemProps) {
  const isActive = job.status === 'pending' || job.status === 'processing'

  useJobProgress(isActive ? job.job_id : null)

  return (
    <div className={`${styles.item} ${styles[job.status]}`}>
      <div className={styles.header}>
        <span className={styles.type}>
          {jobTypeLabels[job.job_type] || job.job_type}
        </span>
        <span className={`${styles.status} ${styles[`status-${job.status}`]}`}>
          {statusLabels[job.status] || job.status}
        </span>
      </div>

      {isActive && (
        <div className={styles.progress}>
          <ProgressBar progress={job.progress} size="sm" />
          <span className={styles.progressText}>{job.progress}%</span>
        </div>
      )}

      {job.message && (
        <p className={styles.message}>{job.message}</p>
      )}

      {job.error && (
        <p className={styles.error}>{job.error}</p>
      )}

      <div className={styles.actions}>
        {isActive && onCancel && (
          <button className={styles.cancelBtn} onClick={onCancel}>
            취소
          </button>
        )}
        {job.status === 'completed' && onDownload && (
          <button className={styles.downloadBtn} onClick={onDownload}>
            <DownloadIcon />
            다운로드
          </button>
        )}
      </div>
    </div>
  )
}

function DownloadIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  )
}
