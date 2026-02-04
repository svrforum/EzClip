import { useState, useEffect } from 'react'
import { getFileMetadata, type MediaMetadata } from '../../api/upload'
import styles from './MetadataPanel.module.css'

interface MetadataPanelProps {
  fileId: string | null
  className?: string
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)

  if (h > 0) {
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }
  return `${m}:${s.toString().padStart(2, '0')}`
}

function formatBitrate(bps: number): string {
  if (bps < 1000) return `${bps} bps`
  if (bps < 1000000) return `${(bps / 1000).toFixed(0)} Kbps`
  return `${(bps / 1000000).toFixed(1)} Mbps`
}

export default function MetadataPanel({ fileId, className }: MetadataPanelProps) {
  const [metadata, setMetadata] = useState<MediaMetadata | null>(null)
  const [loading, setLoading] = useState(false)
  const [isOpen, setIsOpen] = useState(true)

  useEffect(() => {
    if (!fileId) {
      setMetadata(null)
      return
    }

    setLoading(true)
    getFileMetadata(fileId)
      .then(setMetadata)
      .catch(() => setMetadata(null))
      .finally(() => setLoading(false))
  }, [fileId])

  if (!fileId || (!metadata && !loading)) {
    return null
  }

  return (
    <div className={`${styles.panel} ${className || ''}`}>
      <div className={styles.header} onClick={() => setIsOpen(!isOpen)}>
        <span className={styles.title}>
          {metadata?.type === 'image' ? '이미지 정보' : metadata?.type === 'video' ? '영상 정보' : '파일 정보'}
        </span>
        <span className={`${styles.toggle} ${isOpen ? styles.open : ''}`}>
          ▼
        </span>
      </div>

      {loading ? (
        <div className={styles.loading}>불러오는 중...</div>
      ) : metadata && isOpen && (
        <div className={styles.content}>
          {/* Basic Info */}
          <div className={styles.row}>
            <span className={styles.label}>파일명</span>
            <span className={styles.value} title={metadata.filename}>{metadata.filename}</span>
          </div>
          <div className={styles.row}>
            <span className={styles.label}>용량</span>
            <span className={styles.value}>{formatFileSize(metadata.size)}</span>
          </div>
          <div className={styles.row}>
            <span className={styles.label}>형식</span>
            <span className={styles.value}>{metadata.format || metadata.content_type}</span>
          </div>

          {/* Dimensions */}
          {metadata.width && metadata.height && (
            <div className={styles.row}>
              <span className={styles.label}>해상도</span>
              <span className={styles.value}>{metadata.width} x {metadata.height}</span>
            </div>
          )}

          {/* Image specific */}
          {metadata.type === 'image' && (
            <>
              {metadata.mode && (
                <div className={styles.row}>
                  <span className={styles.label}>색상 모드</span>
                  <span className={styles.value}>{metadata.mode}</span>
                </div>
              )}
              {metadata.animated !== undefined && (
                <div className={styles.row}>
                  <span className={styles.label}>애니메이션</span>
                  <span className={styles.value}>
                    {metadata.animated ? `예 (${metadata.frames}프레임)` : '아니오'}
                  </span>
                </div>
              )}
            </>
          )}

          {/* Video specific */}
          {metadata.type === 'video' && (
            <>
              {metadata.duration !== undefined && (
                <div className={styles.row}>
                  <span className={styles.label}>길이</span>
                  <span className={styles.value}>{formatDuration(metadata.duration)}</span>
                </div>
              )}
              {metadata.fps !== undefined && (
                <div className={styles.row}>
                  <span className={styles.label}>프레임레이트</span>
                  <span className={styles.value}>{metadata.fps} fps</span>
                </div>
              )}
              {metadata.video_codec && (
                <div className={styles.row}>
                  <span className={styles.label}>비디오 코덱</span>
                  <span className={styles.value}>{metadata.video_codec.toUpperCase()}</span>
                </div>
              )}
              {metadata.bitrate !== undefined && (
                <div className={styles.row}>
                  <span className={styles.label}>비트레이트</span>
                  <span className={styles.value}>{formatBitrate(metadata.bitrate)}</span>
                </div>
              )}

              {/* Audio Info */}
              {metadata.has_audio && (
                <>
                  <div className={styles.divider} />
                  <div className={styles.sectionTitle}>오디오</div>
                  {metadata.audio_codec && (
                    <div className={styles.row}>
                      <span className={styles.label}>코덱</span>
                      <span className={styles.value}>{metadata.audio_codec.toUpperCase()}</span>
                    </div>
                  )}
                  {metadata.audio_sample_rate && (
                    <div className={styles.row}>
                      <span className={styles.label}>샘플레이트</span>
                      <span className={styles.value}>{metadata.audio_sample_rate} Hz</span>
                    </div>
                  )}
                  {metadata.audio_channels && (
                    <div className={styles.row}>
                      <span className={styles.label}>채널</span>
                      <span className={styles.value}>
                        {metadata.audio_channels === 1 ? '모노' : metadata.audio_channels === 2 ? '스테레오' : `${metadata.audio_channels}ch`}
                      </span>
                    </div>
                  )}
                </>
              )}
            </>
          )}

          {/* EXIF Data */}
          {metadata.exif && Object.keys(metadata.exif).length > 0 && (
            <>
              <div className={styles.divider} />
              <div className={styles.sectionTitle}>EXIF 정보</div>
              {metadata.camera_make && (
                <div className={styles.row}>
                  <span className={styles.label}>카메라 제조사</span>
                  <span className={styles.value}>{metadata.camera_make}</span>
                </div>
              )}
              {metadata.camera_model && (
                <div className={styles.row}>
                  <span className={styles.label}>카메라 모델</span>
                  <span className={styles.value}>{metadata.camera_model}</span>
                </div>
              )}
              {metadata.date_taken && (
                <div className={styles.row}>
                  <span className={styles.label}>촬영 일시</span>
                  <span className={styles.value}>{metadata.date_taken}</span>
                </div>
              )}
              {metadata.exposure_time && (
                <div className={styles.row}>
                  <span className={styles.label}>노출 시간</span>
                  <span className={styles.value}>{metadata.exposure_time}s</span>
                </div>
              )}
              {metadata.f_number && (
                <div className={styles.row}>
                  <span className={styles.label}>조리개</span>
                  <span className={styles.value}>f/{metadata.f_number}</span>
                </div>
              )}
              {metadata.iso && (
                <div className={styles.row}>
                  <span className={styles.label}>ISO</span>
                  <span className={styles.value}>{metadata.iso}</span>
                </div>
              )}
              {metadata.focal_length && (
                <div className={styles.row}>
                  <span className={styles.label}>초점 거리</span>
                  <span className={styles.value}>{metadata.focal_length}</span>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}
