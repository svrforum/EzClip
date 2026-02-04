import { useState } from 'react'
import { Button, Card, Select, Input } from '../common'
import {
  convertImage,
  resizeImage,
  applyImageFilter,
  rotateImage,
  removeBackground,
} from '../../api/image'
import { useJobStore, useToastStore } from '../../stores'
import { useJobProgressCallback } from '../../hooks'
import type { UploadResponse, JobDetail, ImageFormat, ImageFilter, RotateDirection } from '../../api/types'
import styles from './ImageTools.module.css'

interface ImageToolsProps {
  file: UploadResponse | null
}

export default function ImageTools({ file }: ImageToolsProps) {
  const { addJob } = useJobStore()
  const { showSuccess, showError } = useToastStore()
  const subscribeToProgress = useJobProgressCallback()
  const [loading, setLoading] = useState<string | null>(null)

  // Convert state
  const [convertFormat, setConvertFormat] = useState<ImageFormat>('png')
  const [convertQuality, setConvertQuality] = useState(85)

  // Resize state
  const [resizeWidth, setResizeWidth] = useState('')
  const [resizeHeight, setResizeHeight] = useState('')

  // Filter state
  const [filterType, setFilterType] = useState<ImageFilter>('grayscale')
  const [filterIntensity, setFilterIntensity] = useState(1.0)

  // Rotate state
  const [rotateDirection, setRotateDirection] = useState<RotateDirection>('cw_90')

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
    { value: 'png', label: 'PNG' },
    { value: 'jpg', label: 'JPEG' },
    { value: 'webp', label: 'WebP' },
    { value: 'avif', label: 'AVIF' },
  ]

  const filterOptions = [
    { value: 'grayscale', label: '흑백' },
    { value: 'sepia', label: '세피아' },
    { value: 'blur', label: '블러' },
    { value: 'sharpen', label: '선명화' },
    { value: 'brightness', label: '밝기' },
    { value: 'contrast', label: '대비' },
    { value: 'invert', label: '반전' },
  ]

  const rotateOptions = [
    { value: 'cw_90', label: '시계방향 90°' },
    { value: 'cw_180', label: '180° 회전' },
    { value: 'cw_270', label: '반시계방향 90°' },
    { value: 'flip_h', label: '좌우 반전' },
    { value: 'flip_v', label: '상하 반전' },
  ]

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
            onChange={(e) => setConvertFormat(e.target.value as ImageFormat)}
          />
          <Input
            type="number"
            label="품질"
            value={convertQuality}
            onChange={(e) => setConvertQuality(Number(e.target.value))}
            min={1}
            max={100}
          />
          <Button
            onClick={() =>
              handleProcess('image_convert', () =>
                convertImage({
                  file_id: file!.file_id,
                  target_format: convertFormat,
                  quality: convertQuality,
                })
              )
            }
            disabled={!file}
            loading={loading === 'image_convert'}
          >
            변환하기
          </Button>
        </div>
      </Card>

      {/* Resize */}
      <Card className={styles.toolCard}>
        <h3 className={styles.toolTitle}>크기 조절</h3>
        <div className={styles.toolContent}>
          <div className={styles.row}>
            <Input
              type="number"
              label="너비 (px)"
              value={resizeWidth}
              onChange={(e) => setResizeWidth(e.target.value)}
              placeholder="자동"
            />
            <Input
              type="number"
              label="높이 (px)"
              value={resizeHeight}
              onChange={(e) => setResizeHeight(e.target.value)}
              placeholder="자동"
            />
          </div>
          <Button
            onClick={() =>
              handleProcess('image_resize', () =>
                resizeImage({
                  file_id: file!.file_id,
                  width: resizeWidth ? Number(resizeWidth) : undefined,
                  height: resizeHeight ? Number(resizeHeight) : undefined,
                  maintain_aspect: true,
                })
              )
            }
            disabled={!file || (!resizeWidth && !resizeHeight)}
            loading={loading === 'image_resize'}
          >
            크기 조절
          </Button>
        </div>
      </Card>

      {/* Filter */}
      <Card className={styles.toolCard}>
        <h3 className={styles.toolTitle}>필터 적용</h3>
        <div className={styles.toolContent}>
          <Select
            label="필터 종류"
            options={filterOptions}
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as ImageFilter)}
          />
          <Input
            type="number"
            label="강도"
            value={filterIntensity}
            onChange={(e) => setFilterIntensity(Number(e.target.value))}
            min={0}
            max={2}
            step={0.1}
          />
          <Button
            onClick={() =>
              handleProcess('image_filter', () =>
                applyImageFilter({
                  file_id: file!.file_id,
                  filter_type: filterType,
                  intensity: filterIntensity,
                })
              )
            }
            disabled={!file}
            loading={loading === 'image_filter'}
          >
            필터 적용
          </Button>
        </div>
      </Card>

      {/* Rotate */}
      <Card className={styles.toolCard}>
        <h3 className={styles.toolTitle}>회전 / 반전</h3>
        <div className={styles.toolContent}>
          <Select
            label="방향"
            options={rotateOptions}
            value={rotateDirection}
            onChange={(e) => setRotateDirection(e.target.value as RotateDirection)}
          />
          <Button
            onClick={() =>
              handleProcess('image_rotate', () =>
                rotateImage({
                  file_id: file!.file_id,
                  direction: rotateDirection,
                })
              )
            }
            disabled={!file}
            loading={loading === 'image_rotate'}
          >
            적용
          </Button>
        </div>
      </Card>

      {/* Remove Background */}
      <Card className={styles.toolCard}>
        <h3 className={styles.toolTitle}>배경 제거 (누끼)</h3>
        <p className={styles.toolDescription}>
          AI 기반 U2-Net 모델로 배경을 자동 제거합니다
        </p>
        <div className={styles.toolContent}>
          <Button
            onClick={() =>
              handleProcess('image_remove_bg', () =>
                removeBackground({
                  file_id: file!.file_id,
                })
              )
            }
            disabled={!file}
            loading={loading === 'image_remove_bg'}
          >
            배경 제거
          </Button>
        </div>
      </Card>
    </div>
  )
}
