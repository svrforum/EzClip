from fastapi import APIRouter

from models.image import (
    ImageConvertRequest,
    ImageResizeRequest,
    ImageCropRequest,
    ImageFilterRequest,
    ImageRotateRequest,
    ImageRemoveBgRequest,
    ImageRemoveBgInteractiveRequest,
)
from models.job import JobResponse, JobStatus, JobType
from services.queue_service import job_queue
from services.image_service import image_service
from services.rembg_service import rembg_service

router = APIRouter()


# Register handlers
job_queue.register_handler(JobType.IMAGE_CONVERT.value, image_service.convert)
job_queue.register_handler(JobType.IMAGE_RESIZE.value, image_service.resize)
job_queue.register_handler(JobType.IMAGE_CROP.value, image_service.crop)
job_queue.register_handler(JobType.IMAGE_FILTER.value, image_service.apply_filter)
job_queue.register_handler(JobType.IMAGE_ROTATE.value, image_service.rotate)
job_queue.register_handler(JobType.IMAGE_REMOVE_BG.value, rembg_service.remove_background)
job_queue.register_handler(JobType.IMAGE_REMOVE_BG_INTERACTIVE.value, rembg_service.remove_background_interactive)


@router.post("/convert", response_model=JobResponse)
async def convert_image(request: ImageConvertRequest):
    """Convert image to different format."""
    job_id = await job_queue.enqueue(JobType.IMAGE_CONVERT.value, request.model_dump())
    return JobResponse(job_id=job_id, status=JobStatus.PENDING, progress=0)


@router.post("/resize", response_model=JobResponse)
async def resize_image(request: ImageResizeRequest):
    """Resize image."""
    job_id = await job_queue.enqueue(JobType.IMAGE_RESIZE.value, request.model_dump())
    return JobResponse(job_id=job_id, status=JobStatus.PENDING, progress=0)


@router.post("/crop", response_model=JobResponse)
async def crop_image(request: ImageCropRequest):
    """Crop image."""
    job_id = await job_queue.enqueue(JobType.IMAGE_CROP.value, request.model_dump())
    return JobResponse(job_id=job_id, status=JobStatus.PENDING, progress=0)


@router.post("/filter", response_model=JobResponse)
async def apply_filter(request: ImageFilterRequest):
    """Apply filter to image."""
    job_id = await job_queue.enqueue(JobType.IMAGE_FILTER.value, request.model_dump())
    return JobResponse(job_id=job_id, status=JobStatus.PENDING, progress=0)


@router.post("/rotate", response_model=JobResponse)
async def rotate_image(request: ImageRotateRequest):
    """Rotate or flip image."""
    job_id = await job_queue.enqueue(JobType.IMAGE_ROTATE.value, request.model_dump())
    return JobResponse(job_id=job_id, status=JobStatus.PENDING, progress=0)


@router.post("/remove-bg", response_model=JobResponse)
async def remove_background(request: ImageRemoveBgRequest):
    """Remove image background using AI."""
    job_id = await job_queue.enqueue(JobType.IMAGE_REMOVE_BG.value, request.model_dump())
    return JobResponse(job_id=job_id, status=JobStatus.PENDING, progress=0)


@router.post("/remove-bg-interactive", response_model=JobResponse)
async def remove_background_interactive(request: ImageRemoveBgInteractiveRequest):
    """Remove image background using user-specified region."""
    # Convert Point objects to lists for JSON serialization
    data = request.model_dump()
    data["fg_points"] = [[p["x"], p["y"]] for p in data["fg_points"]]
    data["bg_points"] = [[p["x"], p["y"]] for p in data["bg_points"]]
    job_id = await job_queue.enqueue(JobType.IMAGE_REMOVE_BG_INTERACTIVE.value, data)
    return JobResponse(job_id=job_id, status=JobStatus.PENDING, progress=0)
