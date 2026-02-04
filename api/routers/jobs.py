import os
import asyncio
import json
from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import FileResponse, StreamingResponse
import redis.asyncio as redis

from config import get_settings
from models.job import JobDetailResponse, JobListResponse, JobResponse, JobStatus
from services.queue_service import job_queue

router = APIRouter()


@router.get("", response_model=JobListResponse)
async def list_jobs(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
):
    """List all jobs with pagination."""
    jobs, total = await job_queue.list_jobs(page, page_size)

    return JobListResponse(
        jobs=jobs,
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/{job_id}", response_model=JobDetailResponse)
async def get_job(job_id: str):
    """Get job details."""
    job = await job_queue.get_job(job_id)

    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    return job


@router.get("/{job_id}/progress")
async def get_job_progress(job_id: str):
    """Stream job progress updates using SSE."""
    settings = get_settings()

    async def event_generator():
        # Connect to Redis for pub/sub
        r = redis.Redis(
            host=settings.redis_host,
            port=settings.redis_port,
            decode_responses=True,
        )

        pubsub = r.pubsub()
        await pubsub.subscribe(f"job_updates:{job_id}")

        try:
            # Send initial status
            job = await job_queue.get_job(job_id)
            if job:
                yield f"data: {json.dumps({'job_id': job.job_id, 'status': job.status.value, 'progress': job.progress, 'message': job.message, 'output_file': job.output_file, 'error': job.error})}\n\n"

                # If already completed or failed, close immediately
                if job.status in [JobStatus.COMPLETED, JobStatus.FAILED, JobStatus.CANCELLED]:
                    return

            # Listen for updates
            while True:
                message = await pubsub.get_message(ignore_subscribe_messages=True, timeout=30)

                if message and message["type"] == "message":
                    data = json.loads(message["data"])
                    yield f"data: {json.dumps(data)}\n\n"

                    # Close on completion
                    if data.get("status") in ["completed", "failed", "cancelled"]:
                        break

                # Send keepalive
                yield f": keepalive\n\n"
                await asyncio.sleep(1)

        finally:
            await pubsub.unsubscribe(f"job_updates:{job_id}")
            await r.close()

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        }
    )


@router.delete("/{job_id}", response_model=JobResponse)
async def cancel_job(job_id: str):
    """Cancel a pending or processing job."""
    job = await job_queue.get_job(job_id)

    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    success = await job_queue.cancel_job(job_id)

    if not success:
        raise HTTPException(
            status_code=400,
            detail="Cannot cancel job in current state"
        )

    # Get updated job
    job = await job_queue.get_job(job_id)

    return JobResponse(
        job_id=job.job_id,
        status=job.status,
        progress=job.progress,
        message=job.message,
    )


@router.post("/{job_id}/use-result")
async def use_result_as_input(job_id: str):
    """Copy job result to uploads for use as input in next operation."""
    import shutil
    import uuid

    settings = get_settings()

    job = await job_queue.get_job(job_id)

    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    if job.status != JobStatus.COMPLETED:
        raise HTTPException(status_code=400, detail="Job not completed")

    if not job.output_file:
        raise HTTPException(status_code=404, detail="Output file not found")

    output_path = os.path.join(settings.processed_dir, job.output_file)

    if not os.path.exists(output_path):
        raise HTTPException(status_code=404, detail="Output file not found")

    # Generate new file ID and copy to uploads
    ext = os.path.splitext(job.output_file)[1]
    new_file_id = f"{uuid.uuid4()}_edited{ext}"
    new_path = os.path.join(settings.upload_dir, new_file_id)

    shutil.copy2(output_path, new_path)

    # Determine content type
    ext_lower = ext.lower()
    content_types = {
        ".png": "image/png",
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".webp": "image/webp",
        ".avif": "image/avif",
        ".gif": "image/gif",
    }

    return {
        "file_id": new_file_id,
        "filename": f"edited{ext}",
        "size": os.path.getsize(new_path),
        "content_type": content_types.get(ext_lower, "application/octet-stream"),
    }


@router.get("/{job_id}/download")
async def download_result(job_id: str):
    """Download processed file."""
    settings = get_settings()

    job = await job_queue.get_job(job_id)

    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    if job.status != JobStatus.COMPLETED:
        raise HTTPException(status_code=400, detail="Job not completed")

    if not job.output_file:
        raise HTTPException(status_code=404, detail="Output file not found")

    # Sanitize output file path
    if ".." in job.output_file or "/" in job.output_file or "\\" in job.output_file:
        raise HTTPException(status_code=400, detail="Invalid output file")

    output_path = os.path.join(settings.processed_dir, job.output_file)

    if not os.path.exists(output_path):
        raise HTTPException(status_code=404, detail="Output file not found")

    # Determine content type
    ext = os.path.splitext(job.output_file)[1].lower()
    content_types = {
        ".png": "image/png",
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".webp": "image/webp",
        ".avif": "image/avif",
        ".gif": "image/gif",
        ".mp4": "video/mp4",
        ".webm": "video/webm",
        ".avi": "video/x-msvideo",
        ".mov": "video/quicktime",
        ".mp3": "audio/mpeg",
        ".aac": "audio/aac",
        ".wav": "audio/wav",
        ".flac": "audio/flac",
    }

    return FileResponse(
        output_path,
        media_type=content_types.get(ext, "application/octet-stream"),
        filename=job.output_file,
    )
