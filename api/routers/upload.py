import os
import uuid
import re
import aiofiles
from urllib.parse import unquote
from fastapi import APIRouter, UploadFile, File, HTTPException, Form
from fastapi.responses import FileResponse
from PIL import Image

from config import get_settings
from services.file_service import (
    sanitize_filename,
    get_mime_type,
    validate_file,
    extract_exif_data,
    get_video_metadata,
    IMAGE_EXTENSIONS,
    VIDEO_EXTENSIONS,
)

router = APIRouter()


@router.post("")
async def upload_file(
    file: UploadFile = File(...),
):
    """Upload a single file."""
    settings = get_settings()

    # Sanitize filename
    original_filename = sanitize_filename(file.filename or "unnamed")

    # Read file to get size
    content = await file.read()
    file_size = len(content)

    # Validate
    validate_file(original_filename, file.content_type or "", file_size)

    # Generate unique file ID
    file_id = f"{uuid.uuid4()}_{original_filename}"
    file_path = os.path.join(settings.upload_dir, file_id)

    # Save file
    async with aiofiles.open(file_path, "wb") as f:
        await f.write(content)

    return {
        "file_id": file_id,
        "filename": original_filename,
        "size": file_size,
        "content_type": get_mime_type(original_filename),
    }


@router.post("/chunk")
async def upload_chunk(
    file: UploadFile = File(...),
    upload_id: str = Form(...),
    chunk_index: int = Form(...),
    total_chunks: int = Form(...),
    filename: str = Form(...),
):
    """Upload a file chunk for large files."""
    settings = get_settings()

    # Sanitize
    original_filename = sanitize_filename(filename)
    safe_upload_id = re.sub(r'[^a-zA-Z0-9-]', '', upload_id)

    # Create temp directory for chunks
    chunk_dir = os.path.join(settings.temp_dir, safe_upload_id)
    os.makedirs(chunk_dir, exist_ok=True)

    # Save chunk
    chunk_path = os.path.join(chunk_dir, f"chunk_{chunk_index:05d}")
    content = await file.read()

    async with aiofiles.open(chunk_path, "wb") as f:
        await f.write(content)

    # Check if all chunks uploaded
    uploaded_chunks = len([f for f in os.listdir(chunk_dir) if f.startswith("chunk_")])

    if uploaded_chunks == total_chunks:
        # Combine chunks
        file_id = f"{uuid.uuid4()}_{original_filename}"
        final_path = os.path.join(settings.upload_dir, file_id)

        async with aiofiles.open(final_path, "wb") as outfile:
            for i in range(total_chunks):
                chunk_path = os.path.join(chunk_dir, f"chunk_{i:05d}")
                async with aiofiles.open(chunk_path, "rb") as infile:
                    await outfile.write(await infile.read())

        # Clean up chunks
        import shutil
        shutil.rmtree(chunk_dir, ignore_errors=True)

        # Get final size
        file_size = os.path.getsize(final_path)

        return {
            "status": "completed",
            "file_id": file_id,
            "filename": original_filename,
            "size": file_size,
            "content_type": get_mime_type(original_filename),
        }

    return {
        "status": "partial",
        "uploaded_chunks": uploaded_chunks,
        "total_chunks": total_chunks,
    }


@router.get("/file/{file_id:path}")
async def get_uploaded_file(file_id: str):
    """Get uploaded file info."""
    settings = get_settings()

    # URL decode the file_id
    file_id = unquote(file_id)

    # Sanitize file_id
    if ".." in file_id or file_id.startswith("/") or "\\" in file_id:
        raise HTTPException(status_code=400, detail="Invalid file ID")

    file_path = os.path.join(settings.upload_dir, file_id)

    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File not found")

    # Extract original filename from file_id
    parts = file_id.split("_", 1)
    original_filename = parts[1] if len(parts) > 1 else file_id

    return {
        "file_id": file_id,
        "filename": original_filename,
        "size": os.path.getsize(file_path),
        "content_type": get_mime_type(original_filename),
    }


@router.get("/preview/{file_id:path}")
async def preview_file(file_id: str):
    """Preview uploaded file."""
    settings = get_settings()

    # URL decode the file_id (handles Korean and other non-ASCII characters)
    file_id = unquote(file_id)

    # Sanitize file_id
    if ".." in file_id or file_id.startswith("/") or "\\" in file_id:
        raise HTTPException(status_code=400, detail="Invalid file ID")

    file_path = os.path.join(settings.upload_dir, file_id)

    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File not found")

    # Extract original filename
    parts = file_id.split("_", 1)
    original_filename = parts[1] if len(parts) > 1 else file_id

    return FileResponse(
        file_path,
        media_type=get_mime_type(original_filename),
        filename=original_filename,
    )


@router.get("/metadata/{file_id:path}")
async def get_file_metadata(file_id: str):
    """Get detailed metadata for an uploaded file."""
    settings = get_settings()

    # URL decode the file_id
    file_id = unquote(file_id)

    # Sanitize file_id
    if ".." in file_id or file_id.startswith("/") or "\\" in file_id:
        raise HTTPException(status_code=400, detail="Invalid file ID")

    file_path = os.path.join(settings.upload_dir, file_id)

    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File not found")

    # Extract original filename from file_id
    parts = file_id.split("_", 1)
    original_filename = parts[1] if len(parts) > 1 else file_id

    file_size = os.path.getsize(file_path)
    ext = os.path.splitext(original_filename)[1].lower()
    content_type = get_mime_type(original_filename)

    metadata = {
        "file_id": file_id,
        "filename": original_filename,
        "size": file_size,
        "content_type": content_type,
        "type": "unknown",
    }

    if ext in IMAGE_EXTENSIONS:
        metadata["type"] = "image"
        try:
            with Image.open(file_path) as img:
                metadata["width"] = img.width
                metadata["height"] = img.height
                metadata["format"] = img.format
                metadata["mode"] = img.mode

                # For GIF, check if animated
                if ext == ".gif":
                    try:
                        img.seek(1)
                        metadata["animated"] = True
                        # Count frames
                        frame_count = 1
                        while True:
                            try:
                                img.seek(img.tell() + 1)
                                frame_count += 1
                            except EOFError:
                                break
                        metadata["frames"] = frame_count
                    except EOFError:
                        metadata["animated"] = False

                # Extract EXIF data for JPEG
                if ext in [".jpg", ".jpeg"]:
                    exif = extract_exif_data(img)
                    if exif:
                        metadata["exif"] = exif
                        # Extract common fields
                        if "Make" in exif:
                            metadata["camera_make"] = exif["Make"]
                        if "Model" in exif:
                            metadata["camera_model"] = exif["Model"]
                        if "DateTimeOriginal" in exif:
                            metadata["date_taken"] = exif["DateTimeOriginal"]
                        if "ExposureTime" in exif:
                            metadata["exposure_time"] = exif["ExposureTime"]
                        if "FNumber" in exif:
                            metadata["f_number"] = exif["FNumber"]
                        if "ISOSpeedRatings" in exif:
                            metadata["iso"] = exif["ISOSpeedRatings"]
                        if "FocalLength" in exif:
                            metadata["focal_length"] = exif["FocalLength"]
        except Exception as e:
            metadata["error"] = str(e)

    elif ext in VIDEO_EXTENSIONS:
        metadata["type"] = "video"
        ffprobe_data = await get_video_metadata(file_path)

        if ffprobe_data:
            # Extract format info
            if "format" in ffprobe_data:
                fmt = ffprobe_data["format"]
                if "duration" in fmt:
                    metadata["duration"] = float(fmt["duration"])
                if "bit_rate" in fmt:
                    metadata["bitrate"] = int(fmt["bit_rate"])
                if "format_long_name" in fmt:
                    metadata["format_name"] = fmt["format_long_name"]

            # Extract stream info
            if "streams" in ffprobe_data:
                for stream in ffprobe_data["streams"]:
                    if stream.get("codec_type") == "video":
                        metadata["width"] = stream.get("width")
                        metadata["height"] = stream.get("height")
                        metadata["video_codec"] = stream.get("codec_name")
                        metadata["video_codec_long"] = stream.get("codec_long_name")
                        # Frame rate
                        if "r_frame_rate" in stream:
                            try:
                                num, den = stream["r_frame_rate"].split("/")
                                metadata["fps"] = round(int(num) / int(den), 2)
                            except Exception:
                                pass
                        # Pixel format
                        if "pix_fmt" in stream:
                            metadata["pixel_format"] = stream["pix_fmt"]

                    elif stream.get("codec_type") == "audio":
                        metadata["has_audio"] = True
                        metadata["audio_codec"] = stream.get("codec_name")
                        metadata["audio_codec_long"] = stream.get("codec_long_name")
                        if "sample_rate" in stream:
                            metadata["audio_sample_rate"] = int(stream["sample_rate"])
                        if "channels" in stream:
                            metadata["audio_channels"] = stream["channels"]
                        if "bit_rate" in stream:
                            metadata["audio_bitrate"] = int(stream["bit_rate"])

    return metadata
