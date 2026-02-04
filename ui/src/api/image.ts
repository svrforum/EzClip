import type {
  JobResponse,
  ImageConvertRequest,
  ImageResizeRequest,
  ImageCropRequest,
  ImageFilterRequest,
  ImageRotateRequest,
  ImageRemoveBgRequest,
} from './types'
import { post, apiUrl } from './client'

export async function convertImage(request: ImageConvertRequest): Promise<JobResponse> {
  return post(apiUrl('/image/convert'), request)
}

export async function resizeImage(request: ImageResizeRequest): Promise<JobResponse> {
  return post(apiUrl('/image/resize'), request)
}

export async function cropImage(request: ImageCropRequest): Promise<JobResponse> {
  return post(apiUrl('/image/crop'), request)
}

export async function applyImageFilter(request: ImageFilterRequest): Promise<JobResponse> {
  return post(apiUrl('/image/filter'), request)
}

export async function rotateImage(request: ImageRotateRequest): Promise<JobResponse> {
  return post(apiUrl('/image/rotate'), request)
}

export async function removeBackground(request: ImageRemoveBgRequest): Promise<JobResponse> {
  return post(apiUrl('/image/remove-bg'), request)
}

export interface RemoveBgInteractiveRequest {
  file_id: string
  rect?: [number, number, number, number]  // [x, y, width, height]
  fg_points?: { x: number; y: number }[]    // Foreground points (keep)
  bg_points?: { x: number; y: number }[]    // Background points (remove)
}

export async function removeBackgroundInteractive(request: RemoveBgInteractiveRequest): Promise<JobResponse> {
  return post(apiUrl('/image/remove-bg-interactive'), request)
}
