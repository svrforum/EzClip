from fastapi import APIRouter

from models.video import (
    VideoConvertRequest,
    VideoToGifRequest,
    GifToVideoRequest,
    VideoTrimRequest,
    VideoCropRequest,
    VideoResizeRequest,
    VideoCompressRequest,
    VideoThumbnailRequest,
    VideoAudioRequest,
)
from models.job import JobResponse, JobStatus, JobType
from services.queue_service import job_queue
from services.video_service import video_service

router = APIRouter()


# Register handlers
job_queue.register_handler(JobType.VIDEO_CONVERT.value, video_service.convert)
job_queue.register_handler(JobType.VIDEO_TO_GIF.value, video_service.to_gif)
job_queue.register_handler(JobType.GIF_TO_VIDEO.value, video_service.from_gif)
job_queue.register_handler(JobType.VIDEO_TRIM.value, video_service.trim)
job_queue.register_handler(JobType.VIDEO_CROP.value, video_service.crop)
job_queue.register_handler(JobType.VIDEO_RESIZE.value, video_service.resize)
job_queue.register_handler(JobType.VIDEO_COMPRESS.value, video_service.compress)
job_queue.register_handler(JobType.VIDEO_THUMBNAIL.value, video_service.thumbnail)
job_queue.register_handler(JobType.VIDEO_AUDIO.value, video_service.handle_audio)


@router.post("/convert", response_model=JobResponse)
async def convert_video(request: VideoConvertRequest):
    """Convert video to different format."""
    job_id = await job_queue.enqueue(JobType.VIDEO_CONVERT.value, request.model_dump())
    return JobResponse(job_id=job_id, status=JobStatus.PENDING, progress=0)


@router.post("/to-gif", response_model=JobResponse)
async def video_to_gif(request: VideoToGifRequest):
    """Convert video to GIF."""
    job_id = await job_queue.enqueue(JobType.VIDEO_TO_GIF.value, request.model_dump())
    return JobResponse(job_id=job_id, status=JobStatus.PENDING, progress=0)


@router.post("/from-gif", response_model=JobResponse)
async def gif_to_video(request: GifToVideoRequest):
    """Convert GIF to video."""
    job_id = await job_queue.enqueue(JobType.GIF_TO_VIDEO.value, request.model_dump())
    return JobResponse(job_id=job_id, status=JobStatus.PENDING, progress=0)


@router.post("/trim", response_model=JobResponse)
async def trim_video(request: VideoTrimRequest):
    """Trim video to specified duration."""
    job_id = await job_queue.enqueue(JobType.VIDEO_TRIM.value, request.model_dump())
    return JobResponse(job_id=job_id, status=JobStatus.PENDING, progress=0)


@router.post("/crop", response_model=JobResponse)
async def crop_video(request: VideoCropRequest):
    """Crop video to specified region."""
    job_id = await job_queue.enqueue(JobType.VIDEO_CROP.value, request.model_dump())
    return JobResponse(job_id=job_id, status=JobStatus.PENDING, progress=0)


@router.post("/resize", response_model=JobResponse)
async def resize_video(request: VideoResizeRequest):
    """Change video resolution."""
    job_id = await job_queue.enqueue(JobType.VIDEO_RESIZE.value, request.model_dump())
    return JobResponse(job_id=job_id, status=JobStatus.PENDING, progress=0)


@router.post("/compress", response_model=JobResponse)
async def compress_video(request: VideoCompressRequest):
    """Compress video file."""
    job_id = await job_queue.enqueue(JobType.VIDEO_COMPRESS.value, request.model_dump())
    return JobResponse(job_id=job_id, status=JobStatus.PENDING, progress=0)


@router.post("/thumbnail", response_model=JobResponse)
async def extract_thumbnail(request: VideoThumbnailRequest):
    """Extract thumbnail from video."""
    job_id = await job_queue.enqueue(JobType.VIDEO_THUMBNAIL.value, request.model_dump())
    return JobResponse(job_id=job_id, status=JobStatus.PENDING, progress=0)


@router.post("/audio", response_model=JobResponse)
async def handle_audio(request: VideoAudioRequest):
    """Extract or remove audio from video."""
    job_id = await job_queue.enqueue(JobType.VIDEO_AUDIO.value, request.model_dump())
    return JobResponse(job_id=job_id, status=JobStatus.PENDING, progress=0)
