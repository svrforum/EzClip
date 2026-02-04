import type { UploadResponse } from './types'

const API_BASE = '/api'

export async function uploadFile(file: File): Promise<UploadResponse> {
  const formData = new FormData()
  formData.append('file', file)

  const res = await fetch(`${API_BASE}/upload`, {
    method: 'POST',
    body: formData,
  })

  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: 'Upload failed' }))
    throw new Error(error.detail || 'Upload failed')
  }

  return res.json()
}

export async function getUploadedFile(fileId: string): Promise<UploadResponse> {
  const res = await fetch(`${API_BASE}/upload/file/${fileId}`)

  if (!res.ok) {
    throw new Error('File not found')
  }

  return res.json()
}

export function getPreviewUrl(fileId: string): string {
  return `${API_BASE}/upload/preview/${fileId}`
}

export interface MediaMetadata {
  file_id: string
  filename: string
  size: number
  content_type: string
  type: 'image' | 'video' | 'unknown'
  // Image fields
  width?: number
  height?: number
  format?: string
  mode?: string
  animated?: boolean
  frames?: number
  // EXIF fields
  exif?: Record<string, string>
  camera_make?: string
  camera_model?: string
  date_taken?: string
  exposure_time?: string
  f_number?: string
  iso?: string
  focal_length?: string
  // Video fields
  duration?: number
  bitrate?: number
  format_name?: string
  video_codec?: string
  video_codec_long?: string
  fps?: number
  pixel_format?: string
  has_audio?: boolean
  audio_codec?: string
  audio_codec_long?: string
  audio_sample_rate?: number
  audio_channels?: number
  audio_bitrate?: number
  // Error
  error?: string
}

export async function getFileMetadata(fileId: string): Promise<MediaMetadata> {
  const res = await fetch(`${API_BASE}/upload/metadata/${encodeURIComponent(fileId)}`)

  if (!res.ok) {
    throw new Error('Failed to get metadata')
  }

  return res.json()
}
