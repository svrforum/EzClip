import { useState, useCallback, RefObject } from 'react'

export interface CropState {
  cropX: number
  cropY: number
  cropW: number
  cropH: number
}

export interface CropScale {
  scaleX: number
  scaleY: number
  offsetX: number
  offsetY: number
  renderedWidth: number
  renderedHeight: number
}

interface UseCropSelectionOptions {
  mediaRef: RefObject<HTMLImageElement | HTMLVideoElement | null>
  containerRef: RefObject<HTMLDivElement | null>
  mediaWidth: number
  mediaHeight: number
  isEnabled: boolean
}

interface UseCropSelectionReturn {
  cropState: CropState
  setCropX: (x: number) => void
  setCropY: (y: number) => void
  setCropW: (w: number) => void
  setCropH: (h: number) => void
  isCropping: boolean
  getMediaScale: () => CropScale
  getCropOverlayStyle: () => React.CSSProperties
  handleCropMouseDown: (e: React.MouseEvent) => void
  handleCropMouseMove: (e: React.MouseEvent) => void
  handleCropMouseUp: () => void
  resetCrop: () => void
}

/**
 * Hook for managing crop selection on images and videos.
 * Provides mouse event handlers and style calculations for crop overlay.
 */
export function useCropSelection({
  mediaRef,
  containerRef,
  mediaWidth,
  mediaHeight,
  isEnabled,
}: UseCropSelectionOptions): UseCropSelectionReturn {
  const [cropX, setCropX] = useState(0)
  const [cropY, setCropY] = useState(0)
  const [cropW, setCropW] = useState(0)
  const [cropH, setCropH] = useState(0)
  const [isCropping, setIsCropping] = useState(false)
  const [cropStart, setCropStart] = useState<{ x: number; y: number } | null>(null)

  const getMediaScale = useCallback((): CropScale => {
    if (!mediaRef.current || !containerRef.current || !mediaWidth || !mediaHeight) {
      return { scaleX: 1, scaleY: 1, offsetX: 0, offsetY: 0, renderedWidth: 0, renderedHeight: 0 }
    }

    const containerRect = containerRef.current.getBoundingClientRect()

    // Get the actual rendered size of the media
    const mediaAspect = mediaWidth / mediaHeight
    const containerAspect = containerRect.width / containerRect.height

    let renderedWidth: number
    let renderedHeight: number

    if (mediaAspect > containerAspect) {
      renderedWidth = containerRect.width
      renderedHeight = containerRect.width / mediaAspect
    } else {
      renderedHeight = containerRect.height
      renderedWidth = containerRect.height * mediaAspect
    }

    const offsetX = (containerRect.width - renderedWidth) / 2
    const offsetY = (containerRect.height - renderedHeight) / 2

    return {
      scaleX: mediaWidth / renderedWidth,
      scaleY: mediaHeight / renderedHeight,
      offsetX,
      offsetY,
      renderedWidth,
      renderedHeight,
    }
  }, [mediaRef, containerRef, mediaWidth, mediaHeight])

  const handleCropMouseDown = useCallback((e: React.MouseEvent) => {
    if (!isEnabled || !containerRef.current) return

    const rect = containerRef.current.getBoundingClientRect()
    const { offsetX, offsetY, renderedWidth, renderedHeight, scaleX, scaleY } = getMediaScale()

    const x = e.clientX - rect.left - offsetX
    const y = e.clientY - rect.top - offsetY

    // Check if click is within media bounds
    if (x < 0 || x > renderedWidth || y < 0 || y > renderedHeight) return

    setIsCropping(true)
    setCropStart({ x: e.clientX, y: e.clientY })

    // Convert to media coordinates
    const mediaX = Math.round(x * scaleX)
    const mediaY = Math.round(y * scaleY)

    setCropX(mediaX)
    setCropY(mediaY)
    setCropW(0)
    setCropH(0)
  }, [isEnabled, containerRef, getMediaScale])

  const handleCropMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isCropping || !cropStart || !containerRef.current) return

    const rect = containerRef.current.getBoundingClientRect()
    const { offsetX, offsetY, renderedWidth, renderedHeight, scaleX, scaleY } = getMediaScale()

    const startX = cropStart.x - rect.left - offsetX
    const startY = cropStart.y - rect.top - offsetY
    const currentX = Math.max(0, Math.min(e.clientX - rect.left - offsetX, renderedWidth))
    const currentY = Math.max(0, Math.min(e.clientY - rect.top - offsetY, renderedHeight))

    const x1 = Math.min(startX, currentX)
    const y1 = Math.min(startY, currentY)
    const x2 = Math.max(startX, currentX)
    const y2 = Math.max(startY, currentY)

    setCropX(Math.round(Math.max(0, x1) * scaleX))
    setCropY(Math.round(Math.max(0, y1) * scaleY))
    setCropW(Math.round((x2 - Math.max(0, x1)) * scaleX))
    setCropH(Math.round((y2 - Math.max(0, y1)) * scaleY))
  }, [isCropping, cropStart, containerRef, getMediaScale])

  const handleCropMouseUp = useCallback(() => {
    setIsCropping(false)
    setCropStart(null)
  }, [])

  const resetCrop = useCallback(() => {
    setCropX(0)
    setCropY(0)
    setCropW(mediaWidth)
    setCropH(mediaHeight)
  }, [mediaWidth, mediaHeight])

  const getCropOverlayStyle = useCallback((): React.CSSProperties => {
    if (!mediaWidth || !mediaHeight) return {}

    const { scaleX, scaleY, offsetX, offsetY } = getMediaScale()

    return {
      left: `${offsetX + cropX / scaleX}px`,
      top: `${offsetY + cropY / scaleY}px`,
      width: `${cropW / scaleX}px`,
      height: `${cropH / scaleY}px`,
    }
  }, [mediaWidth, mediaHeight, cropX, cropY, cropW, cropH, getMediaScale])

  return {
    cropState: { cropX, cropY, cropW, cropH },
    setCropX,
    setCropY,
    setCropW,
    setCropH,
    isCropping,
    getMediaScale,
    getCropOverlayStyle,
    handleCropMouseDown,
    handleCropMouseMove,
    handleCropMouseUp,
    resetCrop,
  }
}
