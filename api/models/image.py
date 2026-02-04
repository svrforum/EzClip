from pydantic import BaseModel, Field
from enum import Enum
from typing import Optional


class ImageFormat(str, Enum):
    PNG = "png"
    JPG = "jpg"
    JPEG = "jpeg"
    WEBP = "webp"
    AVIF = "avif"


class ImageFilter(str, Enum):
    GRAYSCALE = "grayscale"
    SEPIA = "sepia"
    BLUR = "blur"
    SHARPEN = "sharpen"
    BRIGHTNESS = "brightness"
    CONTRAST = "contrast"
    INVERT = "invert"


class RotateDirection(str, Enum):
    CW_90 = "cw_90"
    CW_180 = "cw_180"
    CW_270 = "cw_270"
    FLIP_H = "flip_h"
    FLIP_V = "flip_v"


class ImageConvertRequest(BaseModel):
    file_id: str
    target_format: ImageFormat
    quality: int = Field(default=85, ge=1, le=100)


class ImageResizeRequest(BaseModel):
    file_id: str
    width: Optional[int] = Field(default=None, ge=1, le=10000)
    height: Optional[int] = Field(default=None, ge=1, le=10000)
    maintain_aspect: bool = True


class ImageCropRequest(BaseModel):
    file_id: str
    x: int = Field(ge=0)
    y: int = Field(ge=0)
    width: int = Field(ge=1)
    height: int = Field(ge=1)


class ImageFilterRequest(BaseModel):
    file_id: str
    filter_type: ImageFilter
    intensity: float = Field(default=1.0, ge=0.0, le=2.0)


class ImageRotateRequest(BaseModel):
    file_id: str
    direction: RotateDirection


class ImageRemoveBgRequest(BaseModel):
    file_id: str
    alpha_matting: bool = False
    alpha_matting_foreground_threshold: int = Field(default=240, ge=0, le=255)
    alpha_matting_background_threshold: int = Field(default=10, ge=0, le=255)


class Point(BaseModel):
    x: float
    y: float


class ImageRemoveBgInteractiveRequest(BaseModel):
    """Interactive background removal with user selection."""
    file_id: str
    rect: Optional[list[int]] = Field(default=None, description="Bounding box [x, y, width, height]")
    fg_points: list[Point] = Field(default_factory=list, description="Foreground points (keep)")
    bg_points: list[Point] = Field(default_factory=list, description="Background points (remove)")
