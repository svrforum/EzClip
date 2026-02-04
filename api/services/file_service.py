"""File handling service with utilities for file validation, sanitization, and metadata extraction."""

import os
import re
import json
import asyncio
from typing import Optional

from PIL import Image
from PIL.ExifTags import TAGS, GPSTAGS

from config import get_settings


# MIME type mapping
MIME_TYPES = {
    # Images
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".gif": "image/gif",
    ".webp": "image/webp",
    ".avif": "image/avif",
    ".bmp": "image/bmp",
    # Videos
    ".mp4": "video/mp4",
    ".webm": "video/webm",
    ".avi": "video/x-msvideo",
    ".mov": "video/quicktime",
    ".mkv": "video/x-matroska",
}

IMAGE_EXTENSIONS = [".png", ".jpg", ".jpeg", ".gif", ".webp", ".avif", ".bmp"]
VIDEO_EXTENSIONS = [".mp4", ".webm", ".avi", ".mov", ".mkv"]


def sanitize_filename(filename: str) -> str:
    """Remove dangerous characters from filename."""
    # Remove path traversal
    filename = os.path.basename(filename)
    # Remove dangerous characters
    filename = re.sub(r'[<>:"/\\|?*]', '', filename)
    # Limit length
    if len(filename) > 200:
        name, ext = os.path.splitext(filename)
        filename = name[:200-len(ext)] + ext
    return filename


def get_mime_type(filename: str) -> str:
    """Get MIME type from filename extension."""
    ext = os.path.splitext(filename)[1].lower()
    return MIME_TYPES.get(ext, "application/octet-stream")


def validate_file(filename: str, content_type: str, size: int) -> None:
    """Validate uploaded file.

    Raises:
        HTTPException: If file type is not allowed or size exceeds limit.
    """
    from fastapi import HTTPException

    settings = get_settings()

    # Check extension
    ext = os.path.splitext(filename)[1].lower().lstrip(".")
    allowed = settings.allowed_image_formats + settings.allowed_video_formats

    if ext not in allowed:
        raise HTTPException(
            status_code=400,
            detail=f"File type '{ext}' is not allowed. Allowed types: {', '.join(allowed)}"
        )

    # Check size
    max_size_bytes = settings.max_upload_size * 1024 * 1024
    if size > max_size_bytes:
        raise HTTPException(
            status_code=400,
            detail=f"File size exceeds maximum allowed size of {settings.max_upload_size}MB"
        )


def extract_exif_data(image: Image.Image) -> dict:
    """Extract EXIF data from an image."""
    exif_data = {}
    try:
        exif = image._getexif()
        if exif:
            for tag_id, value in exif.items():
                tag = TAGS.get(tag_id, tag_id)
                # Handle GPS info specially
                if tag == "GPSInfo":
                    gps_data = {}
                    for gps_tag_id, gps_value in value.items():
                        gps_tag = GPSTAGS.get(gps_tag_id, gps_tag_id)
                        gps_data[gps_tag] = str(gps_value)
                    exif_data["GPSInfo"] = gps_data
                elif isinstance(value, bytes):
                    # Skip binary data
                    continue
                else:
                    # Convert to string for JSON serialization
                    try:
                        exif_data[tag] = str(value)
                    except Exception:
                        continue
    except Exception:
        pass
    return exif_data


async def get_video_metadata(file_path: str) -> dict:
    """Extract video metadata using ffprobe."""
    try:
        cmd = [
            "ffprobe",
            "-v", "quiet",
            "-print_format", "json",
            "-show_format",
            "-show_streams",
            file_path
        ]
        process = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE
        )
        stdout, _ = await process.communicate()

        if process.returncode == 0:
            return json.loads(stdout.decode())
        return {}
    except Exception:
        return {}


def is_image_file(filename: str) -> bool:
    """Check if file is an image based on extension."""
    ext = os.path.splitext(filename)[1].lower()
    return ext in IMAGE_EXTENSIONS


def is_video_file(filename: str) -> bool:
    """Check if file is a video based on extension."""
    ext = os.path.splitext(filename)[1].lower()
    return ext in VIDEO_EXTENSIONS


def get_file_type(filename: str) -> str:
    """Get file type category (image, video, or unknown)."""
    if is_image_file(filename):
        return "image"
    elif is_video_file(filename):
        return "video"
    return "unknown"
