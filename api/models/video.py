from pydantic import BaseModel, Field
from enum import Enum
from typing import Optional


class VideoFormat(str, Enum):
    MP4 = "mp4"
    WEBM = "webm"
    AVI = "avi"
    MOV = "mov"
    MKV = "mkv"


class VideoResolution(str, Enum):
    RES_4K = "2160p"
    RES_1080P = "1080p"
    RES_720P = "720p"
    RES_480P = "480p"
    RES_360P = "360p"


class AudioAction(str, Enum):
    EXTRACT = "extract"
    REMOVE = "remove"


class VideoConvertRequest(BaseModel):
    file_id: str
    target_format: VideoFormat
    quality: str = Field(default="medium", pattern="^(low|medium|high)$")


class VideoToGifRequest(BaseModel):
    file_id: str
    start_time: Optional[float] = Field(default=None, ge=0)
    duration: Optional[float] = Field(default=None, ge=0.1, le=60)
    fps: int = Field(default=10, ge=1, le=60)
    width: Optional[int] = Field(default=None, ge=50, le=1920)
    optimize: bool = True
    quality: str = Field(default="medium", pattern="^(low|medium|high)$")


class GifToVideoRequest(BaseModel):
    file_id: str
    target_format: VideoFormat = VideoFormat.MP4
    loop: int = Field(default=1, ge=1, le=10)


class VideoTrimRequest(BaseModel):
    file_id: str
    start_time: float = Field(ge=0)
    end_time: float = Field(ge=0)


class VideoResizeRequest(BaseModel):
    file_id: str
    resolution: VideoResolution


class VideoCompressRequest(BaseModel):
    file_id: str
    target_size_mb: Optional[float] = Field(default=None, ge=1)
    crf: int = Field(default=28, ge=18, le=51)


class VideoThumbnailRequest(BaseModel):
    file_id: str
    timestamp: float = Field(default=0, ge=0)
    width: Optional[int] = Field(default=None, ge=50, le=3840)
    height: Optional[int] = Field(default=None, ge=50, le=2160)


class VideoAudioRequest(BaseModel):
    file_id: str
    action: AudioAction
    audio_format: str = Field(default="mp3", pattern="^(mp3|aac|wav|flac)$")


class VideoCropRequest(BaseModel):
    file_id: str
    x: int = Field(ge=0, description="X coordinate of crop area")
    y: int = Field(ge=0, description="Y coordinate of crop area")
    width: int = Field(ge=10, description="Width of crop area")
    height: int = Field(ge=10, description="Height of crop area")
