"""Common Pydantic models shared across the API."""

from pydantic import BaseModel, Field
from typing import Optional, Any


class Point(BaseModel):
    """A 2D coordinate point."""
    x: float
    y: float


class Rectangle(BaseModel):
    """A rectangle defined by position and dimensions."""
    x: int = Field(ge=0, description="X coordinate of top-left corner")
    y: int = Field(ge=0, description="Y coordinate of top-left corner")
    width: int = Field(gt=0, description="Width of the rectangle")
    height: int = Field(gt=0, description="Height of the rectangle")


class PaginationRequest(BaseModel):
    """Pagination parameters for list endpoints."""
    page: int = Field(default=1, ge=1, description="Page number (1-indexed)")
    page_size: int = Field(default=20, ge=1, le=100, description="Items per page")


class FileMetadataResponse(BaseModel):
    """Response containing file metadata."""
    file_id: str
    filename: str
    size: int
    content_type: str
    type: str = Field(description="File type category: 'image', 'video', or 'unknown'")

    # Common media properties
    width: Optional[int] = None
    height: Optional[int] = None

    # Image-specific
    format: Optional[str] = None
    mode: Optional[str] = None
    animated: Optional[bool] = None
    frames: Optional[int] = None
    exif: Optional[dict[str, Any]] = None
    camera_make: Optional[str] = None
    camera_model: Optional[str] = None
    date_taken: Optional[str] = None
    exposure_time: Optional[str] = None
    f_number: Optional[str] = None
    iso: Optional[str] = None
    focal_length: Optional[str] = None

    # Video-specific
    duration: Optional[float] = None
    bitrate: Optional[int] = None
    format_name: Optional[str] = None
    video_codec: Optional[str] = None
    video_codec_long: Optional[str] = None
    fps: Optional[float] = None
    pixel_format: Optional[str] = None
    has_audio: Optional[bool] = None
    audio_codec: Optional[str] = None
    audio_codec_long: Optional[str] = None
    audio_sample_rate: Optional[int] = None
    audio_channels: Optional[int] = None
    audio_bitrate: Optional[int] = None

    # Error field
    error: Optional[str] = None
