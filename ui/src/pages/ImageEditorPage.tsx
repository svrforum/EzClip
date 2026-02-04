import { useCallback, useState, useRef, useEffect } from 'react'
import { FileDropzone, Button, MetadataPanel } from '../components/common'
import { useUploadStore, useJobStore, useToastStore } from '../stores'
import { useUpload, useJobProgressCallback, useCropSelection } from '../hooks'
import {
  convertImage,
  resizeImage,
  cropImage,
  removeBackground,
} from '../api/image'
import { getDownloadUrl, useResultAsInput } from '../api/jobs'
import type { JobDetail, ImageFormat } from '../api/types'
import styles from './ImageEditorPage.module.css'

const ACCEPTED_FORMATS = '.png,.jpg,.jpeg,.webp,.avif,.gif,.bmp'

type ToolTab = 'adjust' | 'crop' | 'filter' | 'resize' | 'removebg'

interface ImageState {
  rotation: number
  flipH: boolean
  flipV: boolean
  brightness: number
  contrast: number
  saturate: number
  blur: number
  grayscale: number
  sepia: number
}

const defaultImageState: ImageState = {
  rotation: 0,
  flipH: false,
  flipV: false,
  brightness: 100,
  contrast: 100,
  saturate: 100,
  blur: 0,
  grayscale: 0,
  sepia: 0,
}

export default function ImageEditorPage() {
  const { currentFile, setCurrentFile } = useUploadStore()
  const { showSuccess, showError } = useToastStore()
  const { addJob } = useJobStore()
  const { upload } = useUpload()
  const subscribeToProgress = useJobProgressCallback()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const imageRef = useRef<HTMLImageElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const [activeTab, setActiveTab] = useState<ToolTab>('adjust')
  const [loading, setLoading] = useState(false)
  const [resultFile, setResultFile] = useState<{ jobId: string; url: string } | null>(null)
  const [imageState, setImageState] = useState<ImageState>(defaultImageState)

  // Resize state
  const [resizeWidth, setResizeWidth] = useState('')
  const [resizeHeight, setResizeHeight] = useState('')
  const [convertFormat, setConvertFormat] = useState<ImageFormat>('png')

  // Image dimensions
  const [imageWidth, setImageWidth] = useState(0)
  const [imageHeight, setImageHeight] = useState(0)

  // Crop hook
  const {
    cropState,
    setCropX,
    setCropY,
    setCropW,
    setCropH,
    getCropOverlayStyle,
    handleCropMouseDown,
    handleCropMouseMove,
    handleCropMouseUp,
    resetCrop,
  } = useCropSelection({
    mediaRef: imageRef,
    containerRef,
    mediaWidth: imageWidth,
    mediaHeight: imageHeight,
    isEnabled: activeTab === 'crop' && !resultFile,
  })

  const { cropX, cropY, cropW, cropH } = cropState

  // Initialize crop when image dimensions change
  useEffect(() => {
    if (imageWidth > 0 && imageHeight > 0) {
      setCropW(imageWidth)
      setCropH(imageHeight)
      setCropX(0)
      setCropY(0)
    }
  }, [imageWidth, imageHeight, setCropW, setCropH, setCropX, setCropY])

  const handleFilesSelected = useCallback(
    async (files: File[]) => {
      if (files.length > 0) {
        setResultFile(null)
        setImageState(defaultImageState)
        try {
          await upload(files[0])
        } catch {
          // Error handled in useUpload
        }
      }
    },
    [upload]
  )

  // Update image state
  function updateImageState(updates: Partial<ImageState>) {
    setImageState(prev => ({ ...prev, ...updates }))
  }

  // Reset all adjustments
  function resetAdjustments() {
    setImageState(defaultImageState)
  }

  // Rotate functions
  function rotateLeft() {
    setImageState(prev => ({ ...prev, rotation: (prev.rotation - 90) % 360 }))
  }

  function rotateRight() {
    setImageState(prev => ({ ...prev, rotation: (prev.rotation + 90) % 360 }))
  }

  function flipHorizontal() {
    setImageState(prev => ({ ...prev, flipH: !prev.flipH }))
  }

  function flipVertical() {
    setImageState(prev => ({ ...prev, flipV: !prev.flipV }))
  }

  // Generate CSS transform and filter strings
  function getImageStyle() {
    const transforms: string[] = []
    const filters: string[] = []

    if (imageState.rotation !== 0) {
      transforms.push(`rotate(${imageState.rotation}deg)`)
    }
    if (imageState.flipH) {
      transforms.push('scaleX(-1)')
    }
    if (imageState.flipV) {
      transforms.push('scaleY(-1)')
    }

    if (imageState.brightness !== 100) {
      filters.push(`brightness(${imageState.brightness}%)`)
    }
    if (imageState.contrast !== 100) {
      filters.push(`contrast(${imageState.contrast}%)`)
    }
    if (imageState.saturate !== 100) {
      filters.push(`saturate(${imageState.saturate}%)`)
    }
    if (imageState.blur > 0) {
      filters.push(`blur(${imageState.blur}px)`)
    }
    if (imageState.grayscale > 0) {
      filters.push(`grayscale(${imageState.grayscale}%)`)
    }
    if (imageState.sepia > 0) {
      filters.push(`sepia(${imageState.sepia}%)`)
    }

    return {
      transform: transforms.length > 0 ? transforms.join(' ') : undefined,
      filter: filters.length > 0 ? filters.join(' ') : undefined,
    }
  }

  // Handle image load to get dimensions
  function handleImageLoad(e: React.SyntheticEvent<HTMLImageElement>) {
    const img = e.currentTarget
    setImageWidth(img.naturalWidth)
    setImageHeight(img.naturalHeight)
  }

  // Apply edits and download
  async function applyAndDownload() {
    if (!imageRef.current || !canvasRef.current) return

    const img = imageRef.current
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    setLoading(true)

    try {
      // Wait for image to load
      await new Promise((resolve) => {
        if (img.complete) resolve(true)
        else img.onload = () => resolve(true)
      })

      // Calculate canvas size based on rotation
      const isRotated90or270 = Math.abs(imageState.rotation) === 90 || Math.abs(imageState.rotation) === 270
      const width = isRotated90or270 ? img.naturalHeight : img.naturalWidth
      const height = isRotated90or270 ? img.naturalWidth : img.naturalHeight

      canvas.width = width
      canvas.height = height

      // Apply transforms
      ctx.save()
      ctx.translate(width / 2, height / 2)
      ctx.rotate((imageState.rotation * Math.PI) / 180)
      ctx.scale(imageState.flipH ? -1 : 1, imageState.flipV ? -1 : 1)

      // Apply filters
      ctx.filter = getImageStyle().filter || 'none'

      // Draw image
      ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2)
      ctx.restore()

      // Download
      const link = document.createElement('a')
      link.download = `edited_${currentFile?.filename || 'image'}.png`
      link.href = canvas.toDataURL('image/png')
      link.click()

      showSuccess('다운로드 완료!')
    } catch (error) {
      showError('다운로드 실패')
    } finally {
      setLoading(false)
    }
  }

  // Server-side processing for heavy operations
  async function handleServerProcess(
    action: string,
    processor: () => Promise<{ job_id: string }>
  ) {
    if (!currentFile) return

    setLoading(true)
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
      subscribeToProgress(
        response.job_id,
        (data) => {
          if (data.status === 'completed') {
            setResultFile({
              jobId: response.job_id,
              url: getDownloadUrl(response.job_id),
            })
            showSuccess('처리 완료!')
          } else if (data.status === 'failed') {
            showError(data.error || '처리 실패')
          }
          setLoading(false)
        },
        () => {
          // SSE error - stop loading
          setLoading(false)
          showError('연결 오류')
        }
      )
    } catch (error) {
      showError(error instanceof Error ? error.message : '처리 실패')
      setLoading(false)
    }
  }

  async function handleApplyResult() {
    if (!resultFile) return

    setLoading(true)
    try {
      const newFile = await useResultAsInput(resultFile.jobId)
      setCurrentFile(newFile)
      setResultFile(null)
      setImageState(defaultImageState)
      showSuccess('결과가 적용되었습니다')
    } catch {
      showError('결과 적용 실패')
    } finally {
      setLoading(false)
    }
  }

  function handleReset() {
    setCurrentFile(null)
    setResultFile(null)
    setImageState(defaultImageState)
  }

  const tabs: { id: ToolTab; label: string }[] = [
    { id: 'adjust', label: '조정' },
    { id: 'crop', label: '자르기' },
    { id: 'filter', label: '필터' },
    { id: 'resize', label: '크기' },
    { id: 'removebg', label: '배경' },
  ]

  const previewUrl = resultFile
    ? resultFile.url
    : currentFile
      ? `/api/upload/preview/${encodeURIComponent(currentFile.file_id)}`
      : null

  const imageStyle = getImageStyle()
  const hasChanges = JSON.stringify(imageState) !== JSON.stringify(defaultImageState)

  return (
    <div className={styles.page}>
      {/* Hidden canvas for export */}
      <canvas ref={canvasRef} style={{ display: 'none' }} />

      {/* Preview */}
      <div className={styles.previewSection}>
        {currentFile || resultFile ? (
          <>
            <div
              ref={containerRef}
              className={styles.previewContainer}
              onMouseDown={handleCropMouseDown}
              onMouseMove={handleCropMouseMove}
              onMouseUp={handleCropMouseUp}
              onMouseLeave={handleCropMouseUp}
              style={{ cursor: activeTab === 'crop' && !resultFile ? 'crosshair' : 'default' }}
            >
              {previewUrl && (
                <img
                  ref={imageRef}
                  src={previewUrl}
                  alt="Preview"
                  className={styles.previewImage}
                  style={activeTab === 'crop' ? undefined : imageStyle}
                  crossOrigin="anonymous"
                  onLoad={handleImageLoad}
                />
              )}
              {activeTab === 'crop' && !resultFile && cropW > 0 && cropH > 0 && (
                <div className={styles.cropOverlay} style={getCropOverlayStyle()} />
              )}
              {loading && (
                <div className={styles.loadingOverlay}>
                  <div className={styles.spinner} />
                  <span>처리 중...</span>
                </div>
              )}
            </div>
            <div className={styles.previewActions}>
              {resultFile ? (
                <>
                  <Button size="sm" onClick={handleApplyResult}>
                    결과 적용
                  </Button>
                  <a href={resultFile.url} download className={styles.downloadBtn}>
                    다운로드
                  </a>
                </>
              ) : (
                <>
                  {hasChanges && (
                    <>
                      <Button size="sm" onClick={applyAndDownload} loading={loading}>
                        다운로드
                      </Button>
                      <button className={styles.resetBtn} onClick={resetAdjustments}>
                        되돌리기
                      </button>
                    </>
                  )}
                </>
              )}
              <button className={styles.resetBtn} onClick={handleReset}>
                새 이미지
              </button>
            </div>
            <MetadataPanel fileId={currentFile?.file_id || null} />
          </>
        ) : (
          <FileDropzone
            onFilesSelected={handleFilesSelected}
            accept={ACCEPTED_FORMATS}
          />
        )}
      </div>

      {/* Tools */}
      <div className={styles.toolsSection}>
        <div className={styles.tabs}>
          {tabs.map((tab) => (
            <button
              key={tab.id}
              className={`${styles.tab} ${activeTab === tab.id ? styles.active : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className={styles.toolPanel}>
          {activeTab === 'adjust' && (
            <div className={styles.toolContent}>
              {/* Rotation & Flip */}
              <div className={styles.section}>
                <div className={styles.sectionTitle}>회전 / 반전</div>
                <div className={styles.buttonRow}>
                  <button className={styles.iconBtn} onClick={rotateLeft} title="왼쪽 회전">
                    ↺
                  </button>
                  <button className={styles.iconBtn} onClick={rotateRight} title="오른쪽 회전">
                    ↻
                  </button>
                  <button
                    className={`${styles.iconBtn} ${imageState.flipH ? styles.active : ''}`}
                    onClick={flipHorizontal}
                    title="좌우 반전"
                  >
                    ↔
                  </button>
                  <button
                    className={`${styles.iconBtn} ${imageState.flipV ? styles.active : ''}`}
                    onClick={flipVertical}
                    title="상하 반전"
                  >
                    ↕
                  </button>
                </div>
                {imageState.rotation !== 0 && (
                  <div className={styles.valueLabel}>{imageState.rotation}°</div>
                )}
              </div>

              {/* Brightness */}
              <div className={styles.section}>
                <div className={styles.sliderHeader}>
                  <span>밝기</span>
                  <span className={styles.sliderValue}>{imageState.brightness}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="200"
                  value={imageState.brightness}
                  onChange={(e) => updateImageState({ brightness: Number(e.target.value) })}
                  className={styles.slider}
                />
              </div>

              {/* Contrast */}
              <div className={styles.section}>
                <div className={styles.sliderHeader}>
                  <span>대비</span>
                  <span className={styles.sliderValue}>{imageState.contrast}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="200"
                  value={imageState.contrast}
                  onChange={(e) => updateImageState({ contrast: Number(e.target.value) })}
                  className={styles.slider}
                />
              </div>

              {/* Saturation */}
              <div className={styles.section}>
                <div className={styles.sliderHeader}>
                  <span>채도</span>
                  <span className={styles.sliderValue}>{imageState.saturate}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="200"
                  value={imageState.saturate}
                  onChange={(e) => updateImageState({ saturate: Number(e.target.value) })}
                  className={styles.slider}
                />
              </div>
            </div>
          )}

          {activeTab === 'crop' && (
            <div className={styles.toolContent}>
              <div className={styles.section}>
                <div className={styles.sectionTitle}>영역 선택</div>
                <p className={styles.description}>
                  이미지에서 드래그하여 자르고 싶은 영역을 선택하세요.
                </p>
                <div className={styles.cropInfo}>
                  {cropW > 0 && cropH > 0 ? (
                    `${cropW} × ${cropH} (${cropX}, ${cropY})`
                  ) : (
                    '영역을 선택하세요'
                  )}
                </div>
                <div className={styles.row}>
                  <label className={styles.label}>
                    X
                    <input
                      type="number"
                      value={cropX}
                      onChange={(e) => setCropX(Math.max(0, Math.min(Number(e.target.value), imageWidth - cropW)))}
                      min={0}
                      max={imageWidth - cropW}
                      className={styles.input}
                    />
                  </label>
                  <label className={styles.label}>
                    Y
                    <input
                      type="number"
                      value={cropY}
                      onChange={(e) => setCropY(Math.max(0, Math.min(Number(e.target.value), imageHeight - cropH)))}
                      min={0}
                      max={imageHeight - cropH}
                      className={styles.input}
                    />
                  </label>
                </div>
                <div className={styles.row}>
                  <label className={styles.label}>
                    너비
                    <input
                      type="number"
                      value={cropW}
                      onChange={(e) => setCropW(Math.max(10, Math.min(Number(e.target.value), imageWidth - cropX)))}
                      min={10}
                      max={imageWidth - cropX}
                      className={styles.input}
                    />
                  </label>
                  <label className={styles.label}>
                    높이
                    <input
                      type="number"
                      value={cropH}
                      onChange={(e) => setCropH(Math.max(10, Math.min(Number(e.target.value), imageHeight - cropY)))}
                      min={10}
                      max={imageHeight - cropY}
                      className={styles.input}
                    />
                  </label>
                </div>
                <div className={styles.buttonRow}>
                  <button className={styles.secondaryBtn} onClick={resetCrop}>
                    전체 선택
                  </button>
                </div>
              </div>

              <Button
                onClick={() =>
                  handleServerProcess('image_crop', () =>
                    cropImage({
                      file_id: currentFile!.file_id,
                      x: cropX,
                      y: cropY,
                      width: cropW,
                      height: cropH,
                    })
                  )
                }
                disabled={!currentFile || loading || cropW < 10 || cropH < 10}
                loading={loading}
                fullWidth
              >
                영역 자르기
              </Button>
            </div>
          )}

          {activeTab === 'filter' && (
            <div className={styles.toolContent}>
              {/* Blur */}
              <div className={styles.section}>
                <div className={styles.sliderHeader}>
                  <span>블러</span>
                  <span className={styles.sliderValue}>{imageState.blur}px</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="20"
                  value={imageState.blur}
                  onChange={(e) => updateImageState({ blur: Number(e.target.value) })}
                  className={styles.slider}
                />
              </div>

              {/* Grayscale */}
              <div className={styles.section}>
                <div className={styles.sliderHeader}>
                  <span>흑백</span>
                  <span className={styles.sliderValue}>{imageState.grayscale}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={imageState.grayscale}
                  onChange={(e) => updateImageState({ grayscale: Number(e.target.value) })}
                  className={styles.slider}
                />
              </div>

              {/* Sepia */}
              <div className={styles.section}>
                <div className={styles.sliderHeader}>
                  <span>세피아</span>
                  <span className={styles.sliderValue}>{imageState.sepia}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={imageState.sepia}
                  onChange={(e) => updateImageState({ sepia: Number(e.target.value) })}
                  className={styles.slider}
                />
              </div>

              {/* Quick Presets */}
              <div className={styles.section}>
                <div className={styles.sectionTitle}>프리셋</div>
                <div className={styles.presetGrid}>
                  <button
                    className={styles.presetBtn}
                    onClick={() => setImageState({ ...defaultImageState })}
                  >
                    원본
                  </button>
                  <button
                    className={styles.presetBtn}
                    onClick={() => setImageState({ ...defaultImageState, grayscale: 100 })}
                  >
                    흑백
                  </button>
                  <button
                    className={styles.presetBtn}
                    onClick={() => setImageState({ ...defaultImageState, sepia: 80 })}
                  >
                    빈티지
                  </button>
                  <button
                    className={styles.presetBtn}
                    onClick={() => setImageState({ ...defaultImageState, contrast: 120, saturate: 130 })}
                  >
                    선명
                  </button>
                  <button
                    className={styles.presetBtn}
                    onClick={() => setImageState({ ...defaultImageState, brightness: 110, contrast: 90 })}
                  >
                    소프트
                  </button>
                  <button
                    className={styles.presetBtn}
                    onClick={() => setImageState({ ...defaultImageState, contrast: 150, brightness: 90 })}
                  >
                    드라마
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'resize' && (
            <div className={styles.toolContent}>
              <div className={styles.section}>
                <div className={styles.sectionTitle}>크기 조절</div>
                <div className={styles.row}>
                  <label className={styles.label}>
                    너비
                    <input
                      type="number"
                      value={resizeWidth}
                      onChange={(e) => setResizeWidth(e.target.value)}
                      placeholder="자동"
                      className={styles.input}
                    />
                  </label>
                  <label className={styles.label}>
                    높이
                    <input
                      type="number"
                      value={resizeHeight}
                      onChange={(e) => setResizeHeight(e.target.value)}
                      placeholder="자동"
                      className={styles.input}
                    />
                  </label>
                </div>
                <Button
                  onClick={() =>
                    handleServerProcess('image_resize', () =>
                      resizeImage({
                        file_id: currentFile!.file_id,
                        width: resizeWidth ? Number(resizeWidth) : undefined,
                        height: resizeHeight ? Number(resizeHeight) : undefined,
                        maintain_aspect: true,
                      })
                    )
                  }
                  disabled={!currentFile || loading || (!resizeWidth && !resizeHeight)}
                  loading={loading}
                  fullWidth
                >
                  크기 조절
                </Button>
              </div>

              <div className={styles.section}>
                <div className={styles.sectionTitle}>포맷 변환</div>
                <label className={styles.label}>
                  출력 포맷
                  <select
                    value={convertFormat}
                    onChange={(e) => setConvertFormat(e.target.value as ImageFormat)}
                    className={styles.select}
                  >
                    <option value="png">PNG</option>
                    <option value="jpg">JPEG</option>
                    <option value="webp">WebP</option>
                  </select>
                </label>
                <Button
                  onClick={() =>
                    handleServerProcess('image_convert', () =>
                      convertImage({
                        file_id: currentFile!.file_id,
                        target_format: convertFormat,
                        quality: 90,
                      })
                    )
                  }
                  disabled={!currentFile || loading}
                  loading={loading}
                  fullWidth
                >
                  변환
                </Button>
              </div>
            </div>
          )}

          {activeTab === 'removebg' && (
            <div className={styles.toolContent}>
              <div className={styles.section}>
                <p className={styles.description}>
                  AI가 자동으로 피사체를 인식하여 배경을 제거합니다.
                  인물, 제품 사진에서 가장 잘 작동합니다.
                </p>
                <Button
                  onClick={() =>
                    handleServerProcess('image_remove_bg', () =>
                      removeBackground({
                        file_id: currentFile!.file_id,
                      })
                    )
                  }
                  disabled={!currentFile || loading}
                  loading={loading}
                  fullWidth
                >
                  배경 제거
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
