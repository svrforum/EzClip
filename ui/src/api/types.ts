// Job types
export type JobStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled'

export type JobType =
  | 'image_convert'
  | 'image_resize'
  | 'image_crop'
  | 'image_filter'
  | 'image_rotate'
  | 'image_remove_bg'
  | 'video_convert'
  | 'video_to_gif'
  | 'gif_to_video'
  | 'video_trim'
  | 'video_crop'
  | 'video_resize'
  | 'video_compress'
  | 'video_thumbnail'
  | 'video_audio'

export interface JobResponse {
  job_id: string
  status: JobStatus
  progress: number
  message?: string
}

export interface JobDetail {
  job_id: string
  job_type: JobType
  status: JobStatus
  progress: number
  message?: string
  input_file?: string
  output_file?: string
  file_size?: number
  created_at: string
  updated_at: string
  error?: string
  metadata?: Record<string, unknown>
}

export interface JobListResponse {
  jobs: JobDetail[]
  total: number
  page: number
  page_size: number
}

// Upload types
export interface UploadResponse {
  file_id: string
  filename: string
  size: number
  content_type: string
}

// Image types
export type ImageFormat = 'png' | 'jpg' | 'jpeg' | 'webp' | 'avif'

export type ImageFilter =
  | 'grayscale'
  | 'sepia'
  | 'blur'
  | 'sharpen'
  | 'brightness'
  | 'contrast'
  | 'invert'

export type RotateDirection = 'cw_90' | 'cw_180' | 'cw_270' | 'flip_h' | 'flip_v'

export interface ImageConvertRequest {
  file_id: string
  target_format: ImageFormat
  quality?: number
}

export interface ImageResizeRequest {
  file_id: string
  width?: number
  height?: number
  maintain_aspect?: boolean
}

export interface ImageCropRequest {
  file_id: string
  x: number
  y: number
  width: number
  height: number
}

export interface ImageFilterRequest {
  file_id: string
  filter_type: ImageFilter
  intensity?: number
}

export interface ImageRotateRequest {
  file_id: string
  direction: RotateDirection
}

export interface ImageRemoveBgRequest {
  file_id: string
  alpha_matting?: boolean
  alpha_matting_foreground_threshold?: number
  alpha_matting_background_threshold?: number
}

// Video types
export type VideoFormat = 'mp4' | 'webm' | 'avi' | 'mov' | 'mkv'

export type VideoResolution = '2160p' | '1080p' | '720p' | '480p' | '360p'

export type AudioAction = 'extract' | 'remove'

export interface VideoConvertRequest {
  file_id: string
  target_format: VideoFormat
  quality?: 'low' | 'medium' | 'high'
}

export interface VideoToGifRequest {
  file_id: string
  start_time?: number
  duration?: number
  fps?: number
  width?: number
  optimize?: boolean
  quality?: 'low' | 'medium' | 'high'
}

export interface GifToVideoRequest {
  file_id: string
  target_format?: VideoFormat
  loop?: number
}

export interface VideoTrimRequest {
  file_id: string
  start_time: number
  end_time: number
}

export interface VideoCropRequest {
  file_id: string
  x: number
  y: number
  width: number
  height: number
}

export interface VideoResizeRequest {
  file_id: string
  resolution: VideoResolution
}

export interface VideoCompressRequest {
  file_id: string
  target_size_mb?: number
  crf?: number
}

export interface VideoThumbnailRequest {
  file_id: string
  timestamp?: number
  width?: number
  height?: number
}

export interface VideoAudioRequest {
  file_id: string
  action: AudioAction
  audio_format?: 'mp3' | 'aac' | 'wav' | 'flac'
}
