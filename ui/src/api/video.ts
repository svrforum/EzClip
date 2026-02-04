import type {
  JobResponse,
  VideoConvertRequest,
  VideoToGifRequest,
  GifToVideoRequest,
  VideoTrimRequest,
  VideoCropRequest,
  VideoResizeRequest,
  VideoCompressRequest,
  VideoThumbnailRequest,
  VideoAudioRequest,
} from './types'
import { post, apiUrl } from './client'

export async function convertVideo(request: VideoConvertRequest): Promise<JobResponse> {
  return post(apiUrl('/video/convert'), request)
}

export async function videoToGif(request: VideoToGifRequest): Promise<JobResponse> {
  return post(apiUrl('/video/to-gif'), request)
}

export async function gifToVideo(request: GifToVideoRequest): Promise<JobResponse> {
  return post(apiUrl('/video/from-gif'), request)
}

export async function trimVideo(request: VideoTrimRequest): Promise<JobResponse> {
  return post(apiUrl('/video/trim'), request)
}

export async function cropVideo(request: VideoCropRequest): Promise<JobResponse> {
  return post(apiUrl('/video/crop'), request)
}

export async function resizeVideo(request: VideoResizeRequest): Promise<JobResponse> {
  return post(apiUrl('/video/resize'), request)
}

export async function compressVideo(request: VideoCompressRequest): Promise<JobResponse> {
  return post(apiUrl('/video/compress'), request)
}

export async function extractThumbnail(request: VideoThumbnailRequest): Promise<JobResponse> {
  return post(apiUrl('/video/thumbnail'), request)
}

export async function handleVideoAudio(request: VideoAudioRequest): Promise<JobResponse> {
  return post(apiUrl('/video/audio'), request)
}
