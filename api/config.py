from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # Redis
    redis_host: str = "redis"
    redis_port: int = 6379

    # File paths
    upload_dir: str = "/data/uploads"
    processed_dir: str = "/data/processed"
    temp_dir: str = "/data/temp"

    # Limits
    max_upload_size: int = 500  # MB
    max_image_size: int = 50  # MB
    max_video_size: int = 500  # MB

    # Processing
    ffmpeg_threads: int = 4
    rembg_model: str = "u2net"

    # Allowed formats
    allowed_image_formats: list[str] = ["png", "jpg", "jpeg", "webp", "avif", "gif", "bmp"]
    allowed_video_formats: list[str] = ["mp4", "webm", "avi", "mov", "mkv", "gif"]

    class Config:
        env_file = ".env"


@lru_cache()
def get_settings() -> Settings:
    return Settings()
