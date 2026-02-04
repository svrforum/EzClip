import { useState } from 'react'
import { Button, Card, Select, Input } from '../common'
import {
  convertVideo,
  videoToGif,
  gifToVideo,
  trimVideo,
  resizeVideo,
  compressVideo,
  extractThumbnail,
  handleVideoAudio,
} from '../../api/video'
import { useJobStore, useToastStore } from '../../stores'
import { useJobProgressCallback } from '../../hooks'
import type {
  UploadResponse,
  JobDetail,
  VideoFormat,
  VideoResolution,
  AudioAction,
} from '../../api/types'
import styles from './VideoTools.module.css'

interface VideoToolsProps {
  file: UploadResponse | null
}

export default function VideoTools({ file }: VideoToolsProps) {
  const { addJob } = useJobStore()
  const { showSuccess, showError } = useToastStore()
  const subscribeToProgress = useJobProgressCallback()
  const [loading, setLoading] = useState<string | null>(null)

  // Convert state
  const [convertFormat, setConvertFormat] = useState<VideoFormat>('mp4')
  const [convertQuality, setConvertQuality] = useState<'low' | 'medium' | 'high'>('medium')

  // GIF state
  const [gifStartTime, setGifStartTime] = useState('')
  const [gifDuration, setGifDuration] = useState('5')
  const [gifFps, setGifFps] = useState('10')
  const [gifWidth, setGifWidth] = useState('')

  // Trim state
  const [trimStart, setTrimStart] = useState('')
  const [trimEnd, setTrimEnd] = useState('')

  // Resize state
  const [resolution, setResolution] = useState<VideoResolution>('720p')

  // Compress state
  const [compressCrf, setCompressCrf] = useState(28)

  // Thumbnail state
  const [thumbnailTime, setThumbnailTime] = useState('0')

  // Audio state
  const [audioAction, setAudioAction] = useState<AudioAction>('extract')

  async function handleProcess(
    action: string,
    processor: () => Promise<{ job_id: string }>
  ) {
    if (!file) return

    setLoading(action)
    try {
      const response = await processor()
      addJob({
        job_id: response.job_id,
        job_type: action as JobDetail['job_type'],
        status: 'pending',
        progress: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      subscribeToProgress(response.job_id, () => {
        showSuccess('처리가 완료되었습니다!')
      })
    } catch (error) {
      showError(error instanceof Error ? error.message : '처리 중 오류가 발생했습니다')
    } finally {
      setLoading(null)
    }
  }

  const formatOptions = [
    { value: 'mp4', label: 'MP4' },
    { value: 'webm', label: 'WebM' },
    { value: 'avi', label: 'AVI' },
    { value: 'mov', label: 'MOV' },
  ]

  const qualityOptions = [
    { value: 'low', label: '낮음 (용량 작음)' },
    { value: 'medium', label: '보통' },
    { value: 'high', label: '높음 (용량 큼)' },
  ]

  const resolutionOptions = [
    { value: '2160p', label: '4K (2160p)' },
    { value: '1080p', label: 'Full HD (1080p)' },
    { value: '720p', label: 'HD (720p)' },
    { value: '480p', label: 'SD (480p)' },
    { value: '360p', label: '360p' },
  ]

  const audioOptions = [
    { value: 'extract', label: '오디오 추출' },
    { value: 'remove', label: '오디오 제거' },
  ]

  const isGif = file?.content_type === 'image/gif'

  return (
    <div className={styles.tools}>
      {/* Convert */}
      <Card className={styles.toolCard}>
        <h3 className={styles.toolTitle}>포맷 변환</h3>
        <div className={styles.toolContent}>
          <Select
            label="변환할 포맷"
            options={formatOptions}
            value={convertFormat}
            onChange={(e) => setConvertFormat(e.target.value as VideoFormat)}
          />
          <Select
            label="품질"
            options={qualityOptions}
            value={convertQuality}
            onChange={(e) => setConvertQuality(e.target.value as 'low' | 'medium' | 'high')}
          />
          <Button
            onClick={() =>
              handleProcess('video_convert', () =>
                convertVideo({
                  file_id: file!.file_id,
                  target_format: convertFormat,
                  quality: convertQuality,
                })
              )
            }
            disabled={!file || isGif}
            loading={loading === 'video_convert'}
          >
            변환하기
          </Button>
        </div>
      </Card>

      {/* GIF Conversion */}
      <Card className={styles.toolCard}>
        <h3 className={styles.toolTitle}>
          {isGif ? 'GIF → 비디오' : 'GIF 만들기'}
        </h3>
        <div className={styles.toolContent}>
          {isGif ? (
            <>
              <Select
                label="출력 포맷"
                options={formatOptions}
                value={convertFormat}
                onChange={(e) => setConvertFormat(e.target.value as VideoFormat)}
              />
              <Button
                onClick={() =>
                  handleProcess('gif_to_video', () =>
                    gifToVideo({
                      file_id: file!.file_id,
                      target_format: convertFormat,
                    })
                  )
                }
                disabled={!file}
                loading={loading === 'gif_to_video'}
              >
                비디오로 변환
              </Button>
            </>
          ) : (
            <>
              <div className={styles.row}>
                <Input
                  type="number"
                  label="시작 (초)"
                  value={gifStartTime}
                  onChange={(e) => setGifStartTime(e.target.value)}
                  placeholder="0"
                />
                <Input
                  type="number"
                  label="길이 (초)"
                  value={gifDuration}
                  onChange={(e) => setGifDuration(e.target.value)}
                  min={0.1}
                  max={30}
                />
              </div>
              <div className={styles.row}>
                <Input
                  type="number"
                  label="FPS"
                  value={gifFps}
                  onChange={(e) => setGifFps(e.target.value)}
                  min={1}
                  max={30}
                />
                <Input
                  type="number"
                  label="너비 (px)"
                  value={gifWidth}
                  onChange={(e) => setGifWidth(e.target.value)}
                  placeholder="자동"
                />
              </div>
              <Button
                onClick={() =>
                  handleProcess('video_to_gif', () =>
                    videoToGif({
                      file_id: file!.file_id,
                      start_time: gifStartTime ? Number(gifStartTime) : undefined,
                      duration: gifDuration ? Number(gifDuration) : undefined,
                      fps: gifFps ? Number(gifFps) : 10,
                      width: gifWidth ? Number(gifWidth) : undefined,
                      optimize: true,
                    })
                  )
                }
                disabled={!file}
                loading={loading === 'video_to_gif'}
              >
                GIF 만들기
              </Button>
            </>
          )}
        </div>
      </Card>

      {/* Trim */}
      {!isGif && (
        <Card className={styles.toolCard}>
          <h3 className={styles.toolTitle}>구간 자르기</h3>
          <div className={styles.toolContent}>
            <div className={styles.row}>
              <Input
                type="number"
                label="시작 시간 (초)"
                value={trimStart}
                onChange={(e) => setTrimStart(e.target.value)}
                min={0}
                step={0.1}
              />
              <Input
                type="number"
                label="종료 시간 (초)"
                value={trimEnd}
                onChange={(e) => setTrimEnd(e.target.value)}
                min={0}
                step={0.1}
              />
            </div>
            <Button
              onClick={() =>
                handleProcess('video_trim', () =>
                  trimVideo({
                    file_id: file!.file_id,
                    start_time: Number(trimStart),
                    end_time: Number(trimEnd),
                  })
                )
              }
              disabled={!file || !trimStart || !trimEnd}
              loading={loading === 'video_trim'}
            >
              자르기
            </Button>
          </div>
        </Card>
      )}

      {/* Resize */}
      {!isGif && (
        <Card className={styles.toolCard}>
          <h3 className={styles.toolTitle}>해상도 변경</h3>
          <div className={styles.toolContent}>
            <Select
              label="해상도"
              options={resolutionOptions}
              value={resolution}
              onChange={(e) => setResolution(e.target.value as VideoResolution)}
            />
            <Button
              onClick={() =>
                handleProcess('video_resize', () =>
                  resizeVideo({
                    file_id: file!.file_id,
                    resolution,
                  })
                )
              }
              disabled={!file}
              loading={loading === 'video_resize'}
            >
              해상도 변경
            </Button>
          </div>
        </Card>
      )}

      {/* Compress */}
      {!isGif && (
        <Card className={styles.toolCard}>
          <h3 className={styles.toolTitle}>비디오 압축</h3>
          <p className={styles.toolDescription}>
            CRF 값이 낮을수록 화질이 좋고 파일이 커집니다
          </p>
          <div className={styles.toolContent}>
            <Input
              type="number"
              label={`품질 (CRF: ${compressCrf})`}
              value={compressCrf}
              onChange={(e) => setCompressCrf(Number(e.target.value))}
              min={18}
              max={51}
            />
            <Button
              onClick={() =>
                handleProcess('video_compress', () =>
                  compressVideo({
                    file_id: file!.file_id,
                    crf: compressCrf,
                  })
                )
              }
              disabled={!file}
              loading={loading === 'video_compress'}
            >
              압축하기
            </Button>
          </div>
        </Card>
      )}

      {/* Thumbnail */}
      {!isGif && (
        <Card className={styles.toolCard}>
          <h3 className={styles.toolTitle}>썸네일 추출</h3>
          <div className={styles.toolContent}>
            <Input
              type="number"
              label="추출 시점 (초)"
              value={thumbnailTime}
              onChange={(e) => setThumbnailTime(e.target.value)}
              min={0}
              step={0.1}
            />
            <Button
              onClick={() =>
                handleProcess('video_thumbnail', () =>
                  extractThumbnail({
                    file_id: file!.file_id,
                    timestamp: Number(thumbnailTime),
                  })
                )
              }
              disabled={!file}
              loading={loading === 'video_thumbnail'}
            >
              썸네일 추출
            </Button>
          </div>
        </Card>
      )}

      {/* Audio */}
      {!isGif && (
        <Card className={styles.toolCard}>
          <h3 className={styles.toolTitle}>오디오</h3>
          <div className={styles.toolContent}>
            <Select
              label="작업"
              options={audioOptions}
              value={audioAction}
              onChange={(e) => setAudioAction(e.target.value as AudioAction)}
            />
            <Button
              onClick={() =>
                handleProcess('video_audio', () =>
                  handleVideoAudio({
                    file_id: file!.file_id,
                    action: audioAction,
                  })
                )
              }
              disabled={!file}
              loading={loading === 'video_audio'}
            >
              {audioAction === 'extract' ? '오디오 추출' : '오디오 제거'}
            </Button>
          </div>
        </Card>
      )}
    </div>
  )
}
