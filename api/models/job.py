from pydantic import BaseModel, Field
from enum import Enum
from typing import Optional, Any
from datetime import datetime


class JobStatus(str, Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class JobType(str, Enum):
    # Image
    IMAGE_CONVERT = "image_convert"
    IMAGE_RESIZE = "image_resize"
    IMAGE_CROP = "image_crop"
    IMAGE_FILTER = "image_filter"
    IMAGE_ROTATE = "image_rotate"
    IMAGE_REMOVE_BG = "image_remove_bg"
    IMAGE_REMOVE_BG_INTERACTIVE = "image_remove_bg_interactive"
    # Video
    VIDEO_CONVERT = "video_convert"
    VIDEO_TO_GIF = "video_to_gif"
    GIF_TO_VIDEO = "gif_to_video"
    VIDEO_TRIM = "video_trim"
    VIDEO_CROP = "video_crop"
    VIDEO_RESIZE = "video_resize"
    VIDEO_COMPRESS = "video_compress"
    VIDEO_THUMBNAIL = "video_thumbnail"
    VIDEO_AUDIO = "video_audio"
    # Batch
    BATCH = "batch"


class JobResponse(BaseModel):
    job_id: str
    status: JobStatus
    progress: int = Field(ge=0, le=100)
    message: Optional[str] = None


class JobDetailResponse(BaseModel):
    job_id: str
    job_type: JobType
    status: JobStatus
    progress: int = Field(ge=0, le=100)
    message: Optional[str] = None
    input_file: Optional[str] = None
    output_file: Optional[str] = None
    file_size: Optional[int] = None
    created_at: datetime
    updated_at: datetime
    error: Optional[str] = None
    metadata: Optional[dict[str, Any]] = None


class JobListResponse(BaseModel):
    jobs: list[JobDetailResponse]
    total: int
    page: int
    page_size: int
