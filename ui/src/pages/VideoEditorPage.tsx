import { useCallback, useState, useRef, useEffect } from 'react'
import { FileDropzone, Button, MetadataPanel } from '../components/common'
import { useUploadStore, useJobStore, useToastStore } from '../stores'
import { useUpload, useJobProgressCallback, useCropSelection } from '../hooks'
import {
  convertVideo,
  videoToGif,
  gifToVideo,
  trimVideo,
  cropVideo,
  resizeVideo,
  compressVideo,
  extractThumbnail,
  handleVideoAudio,
} from '../api/video'
import { getDownloadUrl, useResultAsInput } from '../api/jobs'
import { formatTime, formatFileSize } from '../utils'
import type { JobDetail, VideoFormat, VideoResolution, AudioAction } from '../api/types'
import styles from './VideoEditorPage.module.css'

const ACCEPTED_FORMATS = '.mp4,.webm,.avi,.mov,.mkv,.gif'

type ToolTab = 'trim' | 'crop' | 'convert' | 'resize' | 'audio'

export default function VideoEditorPage() {
  const { currentFile, setCurrentFile } = useUploadStore()
  const { showSuccess, showError } = useToastStore()
  const { addJob } = useJobStore()
  const { upload } = useUpload()
  const subscribeToProgress = useJobProgressCallback()
  const videoRef = useRef<HTMLVideoElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const [activeTab, setActiveTab] = useState<ToolTab>('trim')
  const [loading, setLoading] = useState(false)
  const [resultFile, setResultFile] = useState<{ jobId: string; url: string } | null>(null)

  // Video state
  const [duration, setDuration] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)

  // Video dimensions
  const [videoWidth, setVideoWidth] = useState(0)
  const [videoHeight, setVideoHeight] = useState(0)

  // Trim state
  const [trimStart, setTrimStart] = useState(0)
  const [trimEnd, setTrimEnd] = useState(0)

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
    mediaRef: videoRef,
    containerRef,
    mediaWidth: videoWidth,
    mediaHeight: videoHeight,
    isEnabled: activeTab === 'crop' && !resultFile,
  })

  const { cropX, cropY, cropW, cropH } = cropState

  // Initialize crop when video dimensions change
  useEffect(() => {
    if (videoWidth > 0 && videoHeight > 0) {
      setCropW(videoWidth)
      setCropH(videoHeight)
      setCropX(0)
      setCropY(0)
    }
  }, [videoWidth, videoHeight, setCropW, setCropH, setCropX, setCropY])

  // Convert state
  const [convertFormat, setConvertFormat] = useState<VideoFormat>('mp4')
  const [convertQuality, setConvertQuality] = useState<'low' | 'medium' | 'high'>('medium')

  // GIF state
  const [gifFps, setGifFps] = useState(10)
  const [gifWidth, setGifWidth] = useState('')
  const [gifQuality, setGifQuality] = useState<'low' | 'medium' | 'high'>('medium')

  // Result file size
  const [resultFileSize, setResultFileSize] = useState<number | null>(null)

  // Resize state
  const [resolution, setResolution] = useState<VideoResolution>('720p')

  // Compress state
  const [compressCrf, setCompressCrf] = useState(28)

  // Audio state
  const [audioAction, setAudioAction] = useState<AudioAction>('extract')

  // Thumbnail state
  const [thumbnailTime, setThumbnailTime] = useState(0)

  const isGif = currentFile?.content_type === 'image/gif'

  const handleFilesSelected = useCallback(
    async (files: File[]) => {
      if (files.length > 0) {
        setResultFile(null)
        setTrimStart(0)
        setTrimEnd(0)
        try {
          await upload(files[0])
        } catch {
          // Error handled in useUpload
        }
      }
    },
    [upload]
  )

  // Video event handlers
  function handleLoadedMetadata() {
    if (videoRef.current) {
      const dur = videoRef.current.duration
      setDuration(dur)
      setTrimEnd(dur)
      setVideoWidth(videoRef.current.videoWidth)
      setVideoHeight(videoRef.current.videoHeight)
    }
  }

  function handleTimeUpdate() {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime)
    }
  }

  function togglePlay() {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause()
      } else {
        videoRef.current.play()
      }
      setIsPlaying(!isPlaying)
    }
  }

  function seekTo(time: number) {
    if (videoRef.current) {
      videoRef.current.currentTime = time
      setCurrentTime(time)
    }
  }

  function handleProgressClick(e: React.MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect()
    const percent = (e.clientX - rect.left) / rect.width
    seekTo(percent * duration)
  }

  // Preview trim section
  function previewTrim() {
    if (videoRef.current) {
      videoRef.current.currentTime = trimStart
      videoRef.current.play()
      setIsPlaying(true)

      const checkEnd = () => {
        if (videoRef.current && videoRef.current.currentTime >= trimEnd) {
          videoRef.current.pause()
          videoRef.current.currentTime = trimStart
          setIsPlaying(false)
        } else if (isPlaying) {
          requestAnimationFrame(checkEnd)
        }
      }
      requestAnimationFrame(checkEnd)
    }
  }

  // Estimate GIF file size (rough approximation)
  function estimateGifSize(): { min: string; max: string } {
    const gifDuration = trimEnd - trimStart
    const effectiveWidth = gifWidth ? Number(gifWidth) : (gifQuality === 'low' ? 320 : gifQuality === 'medium' ? 480 : videoWidth)
    const effectiveHeight = videoHeight > 0 ? videoHeight * (effectiveWidth / videoWidth) : effectiveWidth * 0.5625

    // More realistic bytes per pixel estimates for GIF (accounting for LZW compression)
    const bytesPerPixelRange = {
      low: { min: 0.15, max: 0.4 },
      medium: { min: 0.25, max: 0.6 },
      high: { min: 0.4, max: 1.0 },
    }
    const range = bytesPerPixelRange[gifQuality]

    const totalFrames = gifDuration * gifFps
    const pixelsPerFrame = effectiveWidth * effectiveHeight

    const minBytes = pixelsPerFrame * range.min * totalFrames
    const maxBytes = pixelsPerFrame * range.max * totalFrames

    return {
      min: formatFileSize(minBytes),
      max: formatFileSize(maxBytes),
    }
  }

  // Server processing
  async function handleServerProcess(
    action: string,
    processor: () => Promise<{ job_id: string }>
  ) {
    if (!currentFile) return

    setLoading(true)
    setResultFileSize(null)
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
            if (data.file_size) {
              setResultFileSize(data.file_size)
            }
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
      setResultFileSize(null)
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
    setResultFileSize(null)
    setTrimStart(0)
    setTrimEnd(0)
    setDuration(0)
  }

  const tabs: { id: ToolTab; label: string }[] = isGif
    ? [{ id: 'convert', label: 'GIF→비디오' }]
    : [
        { id: 'trim', label: '구간' },
        { id: 'crop', label: '영역' },
        { id: 'convert', label: '변환' },
        { id: 'resize', label: '화질' },
        { id: 'audio', label: '오디오' },
      ]

  const previewUrl = resultFile
    ? resultFile.url
    : currentFile
      ? `/api/upload/preview/${encodeURIComponent(currentFile.file_id)}`
      : null

  return (
    <div className={styles.page}>
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
                isGif || resultFile ? (
                  <img src={previewUrl} alt="Preview" className={styles.previewMedia} />
                ) : (
                  <video
                    ref={videoRef}
                    src={previewUrl}
                    className={styles.previewMedia}
                    onLoadedMetadata={handleLoadedMetadata}
                    onTimeUpdate={handleTimeUpdate}
                    onPlay={() => setIsPlaying(true)}
                    onPause={() => setIsPlaying(false)}
                    onEnded={() => setIsPlaying(false)}
                  />
                )
              )}
              {activeTab === 'crop' && !isGif && !resultFile && cropW > 0 && cropH > 0 && (
                <div className={styles.cropOverlay} style={getCropOverlayStyle()} />
              )}
              {loading && (
                <div className={styles.loadingOverlay}>
                  <div className={styles.spinner} />
                  <span>처리 중...</span>
                </div>
              )}
            </div>

            {/* Video Controls */}
            {!isGif && !resultFile && duration > 0 && (
              <div className={styles.videoControls}>
                <button className={styles.playBtn} onClick={togglePlay}>
                  {isPlaying ? '⏸' : '▶'}
                </button>
                <div className={styles.progressContainer} onClick={handleProgressClick}>
                  <div className={styles.progressBar}>
                    <div
                      className={styles.progressFill}
                      style={{ width: `${(currentTime / duration) * 100}%` }}
                    />
                    {activeTab === 'trim' && (
                      <div
                        className={styles.trimRange}
                        style={{
                          left: `${(trimStart / duration) * 100}%`,
                          width: `${((trimEnd - trimStart) / duration) * 100}%`,
                        }}
                      />
                    )}
                  </div>
                </div>
                <span className={styles.timeDisplay}>
                  {formatTime(currentTime)} / {formatTime(duration)}
                </span>
              </div>
            )}

            <div className={styles.previewActions}>
              {resultFile ? (
                <>
                  {resultFileSize && (
                    <span className={styles.fileSize}>{formatFileSize(resultFileSize)}</span>
                  )}
                  <Button size="sm" onClick={handleApplyResult}>
                    결과 적용
                  </Button>
                  <a href={resultFile.url} download className={styles.downloadBtn}>
                    다운로드
                  </a>
                </>
              ) : null}
              <button className={styles.resetBtn} onClick={handleReset}>
                새 파일
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
          {/* Trim Tab */}
          {activeTab === 'trim' && !isGif && (
            <div className={styles.toolContent}>
              <div className={styles.section}>
                <div className={styles.sectionTitle}>구간 선택</div>
                <div className={styles.trimInputs}>
                  <label className={styles.label}>
                    시작
                    <div className={styles.timeInput}>
                      <input
                        type="number"
                        value={trimStart.toFixed(1)}
                        onChange={(e) => setTrimStart(Math.max(0, Math.min(Number(e.target.value), trimEnd - 0.1)))}
                        step="0.1"
                        min="0"
                        max={trimEnd - 0.1}
                        className={styles.input}
                      />
                      <span className={styles.timeUnit}>초</span>
                    </div>
                  </label>
                  <label className={styles.label}>
                    종료
                    <div className={styles.timeInput}>
                      <input
                        type="number"
                        value={trimEnd.toFixed(1)}
                        onChange={(e) => setTrimEnd(Math.max(trimStart + 0.1, Math.min(Number(e.target.value), duration)))}
                        step="0.1"
                        min={trimStart + 0.1}
                        max={duration}
                        className={styles.input}
                      />
                      <span className={styles.timeUnit}>초</span>
                    </div>
                  </label>
                </div>
                <div className={styles.trimInfo}>
                  선택 구간: {formatTime(trimEnd - trimStart)}
                </div>
                <div className={styles.buttonRow}>
                  <button className={styles.secondaryBtn} onClick={() => seekTo(trimStart)}>
                    시작점으로
                  </button>
                  <button className={styles.secondaryBtn} onClick={previewTrim}>
                    미리보기
                  </button>
                </div>
              </div>

              <Button
                onClick={() =>
                  handleServerProcess('video_trim', () =>
                    trimVideo({
                      file_id: currentFile!.file_id,
                      start_time: trimStart,
                      end_time: trimEnd,
                    })
                  )
                }
                disabled={!currentFile || loading || trimStart >= trimEnd}
                loading={loading}
                fullWidth
              >
                구간 자르기
              </Button>

              <div className={styles.divider} />

              <div className={styles.section}>
                <div className={styles.sectionTitle}>GIF 변환</div>
                <label className={styles.label}>
                  품질
                  <select
                    value={gifQuality}
                    onChange={(e) => setGifQuality(e.target.value as 'low' | 'medium' | 'high')}
                    className={styles.select}
                  >
                    <option value="low">낮음 (작은 용량)</option>
                    <option value="medium">보통</option>
                    <option value="high">높음 (큰 용량)</option>
                  </select>
                </label>
                <div className={styles.row}>
                  <label className={styles.label}>
                    FPS
                    <input
                      type="number"
                      value={gifFps}
                      onChange={(e) => setGifFps(Number(e.target.value))}
                      min={1}
                      max={60}
                      className={styles.input}
                    />
                  </label>
                  <label className={styles.label}>
                    너비(px)
                    <input
                      type="number"
                      value={gifWidth}
                      onChange={(e) => setGifWidth(e.target.value)}
                      placeholder="자동"
                      className={styles.input}
                    />
                  </label>
                </div>
                {videoWidth > 0 && trimEnd > trimStart && (() => {
                  const estimate = estimateGifSize()
                  return (
                    <div className={styles.estimateInfo}>
                      예상 용량: {estimate.min} ~ {estimate.max}
                    </div>
                  )
                })()}
                <Button
                  onClick={() =>
                    handleServerProcess('video_to_gif', () =>
                      videoToGif({
                        file_id: currentFile!.file_id,
                        start_time: trimStart,
                        duration: trimEnd - trimStart,
                        fps: gifFps,
                        width: gifWidth ? Number(gifWidth) : undefined,
                        quality: gifQuality,
                        optimize: true,
                      })
                    )
                  }
                  disabled={!currentFile || loading}
                  loading={loading}
                  fullWidth
                  variant="secondary"
                >
                  GIF로 변환
                </Button>
              </div>

              <div className={styles.divider} />

              <div className={styles.section}>
                <div className={styles.sectionTitle}>썸네일 추출</div>
                <div className={styles.sliderHeader}>
                  <span>추출 시점</span>
                  <span className={styles.sliderValue}>{formatTime(thumbnailTime)}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max={duration}
                  step="0.1"
                  value={thumbnailTime}
                  onChange={(e) => {
                    setThumbnailTime(Number(e.target.value))
                    seekTo(Number(e.target.value))
                  }}
                  className={styles.slider}
                />
                <Button
                  onClick={() =>
                    handleServerProcess('video_thumbnail', () =>
                      extractThumbnail({
                        file_id: currentFile!.file_id,
                        timestamp: thumbnailTime,
                      })
                    )
                  }
                  disabled={!currentFile || loading}
                  loading={loading}
                  fullWidth
                  variant="secondary"
                >
                  썸네일 추출
                </Button>
              </div>
            </div>
          )}

          {/* Crop Tab */}
          {activeTab === 'crop' && !isGif && (
            <div className={styles.toolContent}>
              <div className={styles.section}>
                <div className={styles.sectionTitle}>영역 선택</div>
                <p className={styles.description}>
                  비디오에서 드래그하여 자르고 싶은 영역을 선택하세요.
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
                      onChange={(e) => setCropX(Math.max(0, Math.min(Number(e.target.value), videoWidth - cropW)))}
                      min={0}
                      max={videoWidth - cropW}
                      className={styles.input}
                    />
                  </label>
                  <label className={styles.label}>
                    Y
                    <input
                      type="number"
                      value={cropY}
                      onChange={(e) => setCropY(Math.max(0, Math.min(Number(e.target.value), videoHeight - cropH)))}
                      min={0}
                      max={videoHeight - cropH}
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
                      onChange={(e) => setCropW(Math.max(10, Math.min(Number(e.target.value), videoWidth - cropX)))}
                      min={10}
                      max={videoWidth - cropX}
                      className={styles.input}
                    />
                  </label>
                  <label className={styles.label}>
                    높이
                    <input
                      type="number"
                      value={cropH}
                      onChange={(e) => setCropH(Math.max(10, Math.min(Number(e.target.value), videoHeight - cropY)))}
                      min={10}
                      max={videoHeight - cropY}
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
                  handleServerProcess('video_crop', () =>
                    cropVideo({
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

              <div className={styles.divider} />

              <div className={styles.section}>
                <div className={styles.sectionTitle}>영역 + GIF 변환</div>
                <p className={styles.hint}>선택한 영역과 시간 구간을 GIF로 변환합니다</p>
                <div className={styles.row}>
                  <label className={styles.label}>
                    FPS
                    <input
                      type="number"
                      value={gifFps}
                      onChange={(e) => setGifFps(Number(e.target.value))}
                      min={1}
                      max={60}
                      className={styles.input}
                    />
                  </label>
                  <label className={styles.label}>
                    구간(초)
                    <input
                      type="number"
                      value={(trimEnd - trimStart).toFixed(1)}
                      disabled
                      className={styles.input}
                    />
                  </label>
                </div>
                <Button
                  onClick={() =>
                    handleServerProcess('video_to_gif', () =>
                      videoToGif({
                        file_id: currentFile!.file_id,
                        start_time: trimStart,
                        duration: trimEnd - trimStart,
                        fps: gifFps,
                        width: cropW > 0 ? cropW : undefined,
                        optimize: true,
                      })
                    )
                  }
                  disabled={!currentFile || loading}
                  loading={loading}
                  fullWidth
                  variant="secondary"
                >
                  GIF로 변환
                </Button>
              </div>
            </div>
          )}

          {/* Convert Tab */}
          {activeTab === 'convert' && (
            <div className={styles.toolContent}>
              {isGif ? (
                <div className={styles.section}>
                  <p className={styles.description}>
                    GIF 파일을 비디오로 변환합니다.
                  </p>
                  <label className={styles.label}>
                    출력 포맷
                    <select
                      value={convertFormat}
                      onChange={(e) => setConvertFormat(e.target.value as VideoFormat)}
                      className={styles.select}
                    >
                      <option value="mp4">MP4</option>
                      <option value="webm">WebM</option>
                    </select>
                  </label>
                  <Button
                    onClick={() =>
                      handleServerProcess('gif_to_video', () =>
                        gifToVideo({
                          file_id: currentFile!.file_id,
                          target_format: convertFormat,
                        })
                      )
                    }
                    disabled={!currentFile || loading}
                    loading={loading}
                    fullWidth
                  >
                    비디오로 변환
                  </Button>
                </div>
              ) : (
                <>
                  <div className={styles.section}>
                    <div className={styles.sectionTitle}>포맷 변환</div>
                    <label className={styles.label}>
                      출력 포맷
                      <select
                        value={convertFormat}
                        onChange={(e) => setConvertFormat(e.target.value as VideoFormat)}
                        className={styles.select}
                      >
                        <option value="mp4">MP4</option>
                        <option value="webm">WebM</option>
                        <option value="avi">AVI</option>
                        <option value="mov">MOV</option>
                      </select>
                    </label>
                    <label className={styles.label}>
                      품질
                      <select
                        value={convertQuality}
                        onChange={(e) => setConvertQuality(e.target.value as 'low' | 'medium' | 'high')}
                        className={styles.select}
                      >
                        <option value="low">낮음 (작은 용량)</option>
                        <option value="medium">보통</option>
                        <option value="high">높음 (큰 용량)</option>
                      </select>
                    </label>
                    <Button
                      onClick={() =>
                        handleServerProcess('video_convert', () =>
                          convertVideo({
                            file_id: currentFile!.file_id,
                            target_format: convertFormat,
                            quality: convertQuality,
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
                </>
              )}
            </div>
          )}

          {/* Resize Tab */}
          {activeTab === 'resize' && !isGif && (
            <div className={styles.toolContent}>
              <div className={styles.section}>
                <div className={styles.sectionTitle}>해상도 변경</div>
                <div className={styles.resolutionGrid}>
                  {[
                    { value: '2160p', label: '4K' },
                    { value: '1080p', label: 'FHD' },
                    { value: '720p', label: 'HD' },
                    { value: '480p', label: 'SD' },
                    { value: '360p', label: '360p' },
                  ].map((res) => (
                    <button
                      key={res.value}
                      className={`${styles.resolutionBtn} ${resolution === res.value ? styles.active : ''}`}
                      onClick={() => setResolution(res.value as VideoResolution)}
                    >
                      {res.label}
                    </button>
                  ))}
                </div>
                <Button
                  onClick={() =>
                    handleServerProcess('video_resize', () =>
                      resizeVideo({
                        file_id: currentFile!.file_id,
                        resolution,
                      })
                    )
                  }
                  disabled={!currentFile || loading}
                  loading={loading}
                  fullWidth
                >
                  해상도 변경
                </Button>
              </div>

              <div className={styles.divider} />

              <div className={styles.section}>
                <div className={styles.sectionTitle}>압축</div>
                <div className={styles.sliderHeader}>
                  <span>품질 (CRF)</span>
                  <span className={styles.sliderValue}>{compressCrf}</span>
                </div>
                <input
                  type="range"
                  min="18"
                  max="51"
                  value={compressCrf}
                  onChange={(e) => setCompressCrf(Number(e.target.value))}
                  className={styles.slider}
                />
                <p className={styles.hint}>값이 높을수록 파일이 작아지고 화질이 낮아집니다</p>
                <Button
                  onClick={() =>
                    handleServerProcess('video_compress', () =>
                      compressVideo({
                        file_id: currentFile!.file_id,
                        crf: compressCrf,
                      })
                    )
                  }
                  disabled={!currentFile || loading}
                  loading={loading}
                  fullWidth
                  variant="secondary"
                >
                  압축
                </Button>
              </div>
            </div>
          )}

          {/* Audio Tab */}
          {activeTab === 'audio' && !isGif && (
            <div className={styles.toolContent}>
              <div className={styles.section}>
                <div className={styles.sectionTitle}>오디오 처리</div>
                <div className={styles.audioOptions}>
                  <button
                    className={`${styles.audioBtn} ${audioAction === 'extract' ? styles.active : ''}`}
                    onClick={() => setAudioAction('extract')}
                  >
                    <span className={styles.audioIcon}>🎵</span>
                    <span>오디오 추출</span>
                    <span className={styles.audioDesc}>MP3로 저장</span>
                  </button>
                  <button
                    className={`${styles.audioBtn} ${audioAction === 'remove' ? styles.active : ''}`}
                    onClick={() => setAudioAction('remove')}
                  >
                    <span className={styles.audioIcon}>🔇</span>
                    <span>오디오 제거</span>
                    <span className={styles.audioDesc}>무음 비디오</span>
                  </button>
                </div>
                <Button
                  onClick={() =>
                    handleServerProcess('video_audio', () =>
                      handleVideoAudio({
                        file_id: currentFile!.file_id,
                        action: audioAction,
                      })
                    )
                  }
                  disabled={!currentFile || loading}
                  loading={loading}
                  fullWidth
                >
                  {audioAction === 'extract' ? '오디오 추출' : '오디오 제거'}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
