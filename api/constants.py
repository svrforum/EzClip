"""Shared constants for the EzClip API."""

# Video quality presets (CRF values - lower is better quality)
QUALITY_CRF_MAP = {
    "low": 28,
    "medium": 23,
    "high": 18,
}

# GIF quality settings
GIF_QUALITY_SETTINGS = {
    "low": {"max_colors": 64, "dither": "none"},
    "medium": {"max_colors": 128, "dither": "bayer:bayer_scale=3"},
    "high": {"max_colors": 256, "dither": "sierra2_4a"},
}

# GIF auto-width based on quality (when no width specified)
GIF_AUTO_WIDTH = {
    "low": 320,
    "medium": 480,
    "high": None,  # Use original width
}

# Video resolution presets (width:height)
RESOLUTION_MAP = {
    "2160p": "3840:2160",
    "1080p": "1920:1080",
    "720p": "1280:720",
    "480p": "854:480",
    "360p": "640:360",
}

# Audio codec mapping
AUDIO_CODEC_MAP = {
    "mp3": "libmp3lame",
    "aac": "aac",
    "wav": "pcm_s16le",
    "flac": "flac",
}

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

# File extension lists
IMAGE_EXTENSIONS = [".png", ".jpg", ".jpeg", ".gif", ".webp", ".avif", ".bmp"]
VIDEO_EXTENSIONS = [".mp4", ".webm", ".avi", ".mov", ".mkv"]
