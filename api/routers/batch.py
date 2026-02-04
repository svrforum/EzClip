from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Any

from models.job import JobResponse, JobStatus, JobType
from services.queue_service import job_queue

router = APIRouter()


class BatchItem(BaseModel):
    job_type: str
    data: dict[str, Any]


class BatchRequest(BaseModel):
    items: list[BatchItem] = Field(min_length=1, max_length=100)


class BatchResponse(BaseModel):
    batch_id: str
    jobs: list[JobResponse]
    total: int


@router.post("", response_model=BatchResponse)
async def create_batch(request: BatchRequest):
    """Create multiple processing jobs at once."""

    # Validate job types
    valid_types = {t.value for t in JobType if t != JobType.BATCH}

    for item in request.items:
        if item.job_type not in valid_types:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid job type: {item.job_type}"
            )

    # Enqueue all jobs
    jobs = []
    for item in request.items:
        job_id = await job_queue.enqueue(item.job_type, item.data)
        jobs.append(JobResponse(
            job_id=job_id,
            status=JobStatus.PENDING,
            progress=0
        ))

    # Create batch ID for tracking
    import uuid
    batch_id = str(uuid.uuid4())

    return BatchResponse(
        batch_id=batch_id,
        jobs=jobs,
        total=len(jobs)
    )


class BatchStatusResponse(BaseModel):
    batch_id: str
    jobs: list[dict[str, Any]]
    completed: int
    failed: int
    pending: int
    processing: int


@router.post("/status", response_model=BatchStatusResponse)
async def get_batch_status(job_ids: list[str]):
    """Get status of multiple jobs."""
    jobs = []
    completed = 0
    failed = 0
    pending = 0
    processing = 0

    for job_id in job_ids:
        job = await job_queue.get_job(job_id)
        if job:
            jobs.append({
                "job_id": job.job_id,
                "status": job.status.value,
                "progress": job.progress,
                "output_file": job.output_file,
                "error": job.error,
            })

            if job.status == JobStatus.COMPLETED:
                completed += 1
            elif job.status == JobStatus.FAILED:
                failed += 1
            elif job.status == JobStatus.PROCESSING:
                processing += 1
            else:
                pending += 1

    return BatchStatusResponse(
        batch_id="",
        jobs=jobs,
        completed=completed,
        failed=failed,
        pending=pending,
        processing=processing,
    )
