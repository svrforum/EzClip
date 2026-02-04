import asyncio
import json
import uuid
from datetime import datetime
from typing import Any, Callable, Optional
import redis.asyncio as redis

from config import get_settings
from models.job import JobStatus, JobType, JobDetailResponse


class JobQueue:
    def __init__(self):
        self.settings = get_settings()
        self.redis: Optional[redis.Redis] = None
        self.worker_task: Optional[asyncio.Task] = None
        self.handlers: dict[str, Callable] = {}
        self._running = False

    async def connect(self):
        if self.redis is None:
            self.redis = redis.Redis(
                host=self.settings.redis_host,
                port=self.settings.redis_port,
                decode_responses=True,
            )

    async def disconnect(self):
        if self.redis:
            await self.redis.close()
            self.redis = None

    def register_handler(self, job_type: str, handler: Callable):
        self.handlers[job_type] = handler

    async def enqueue(self, job_type: str, data: dict[str, Any]) -> str:
        await self.connect()

        job_id = str(uuid.uuid4())
        job = {
            "job_id": job_id,
            "job_type": job_type,
            "status": JobStatus.PENDING.value,
            "progress": 0,
            "data": data,
            "created_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat(),
        }

        # Store job details
        await self.redis.hset(f"job:{job_id}", mapping={
            "job_id": job_id,
            "job_type": job_type,
            "status": JobStatus.PENDING.value,
            "progress": "0",
            "data": json.dumps(data),
            "created_at": job["created_at"],
            "updated_at": job["updated_at"],
        })

        # Add to queue
        await self.redis.lpush("job_queue", json.dumps({"job_id": job_id, "job_type": job_type}))

        # Add to job list (for listing)
        await self.redis.lpush("job_list", job_id)
        await self.redis.ltrim("job_list", 0, 99)  # Keep last 100 jobs

        return job_id

    async def get_job(self, job_id: str) -> Optional[JobDetailResponse]:
        await self.connect()

        job_data = await self.redis.hgetall(f"job:{job_id}")
        if not job_data:
            return None

        return JobDetailResponse(
            job_id=job_data["job_id"],
            job_type=JobType(job_data["job_type"]),
            status=JobStatus(job_data["status"]),
            progress=int(job_data.get("progress", 0)),
            message=job_data.get("message"),
            input_file=job_data.get("input_file"),
            output_file=job_data.get("output_file"),
            file_size=int(job_data["file_size"]) if job_data.get("file_size") else None,
            created_at=datetime.fromisoformat(job_data["created_at"]),
            updated_at=datetime.fromisoformat(job_data["updated_at"]),
            error=job_data.get("error"),
            metadata=json.loads(job_data["data"]) if "data" in job_data else None,
        )

    async def update_job(
        self,
        job_id: str,
        status: Optional[JobStatus] = None,
        progress: Optional[int] = None,
        message: Optional[str] = None,
        output_file: Optional[str] = None,
        error: Optional[str] = None,
        file_size: Optional[int] = None,
    ):
        await self.connect()

        updates = {"updated_at": datetime.utcnow().isoformat()}

        if status is not None:
            updates["status"] = status.value
        if progress is not None:
            updates["progress"] = str(progress)
        if message is not None:
            updates["message"] = message
        if output_file is not None:
            updates["output_file"] = output_file
        if error is not None:
            updates["error"] = error
        if file_size is not None:
            updates["file_size"] = str(file_size)

        await self.redis.hset(f"job:{job_id}", mapping=updates)

        # Publish update for SSE
        await self.redis.publish(f"job_updates:{job_id}", json.dumps({
            "job_id": job_id,
            "status": updates.get("status"),
            "progress": int(updates["progress"]) if "progress" in updates else None,
            "message": updates.get("message"),
            "output_file": updates.get("output_file"),
            "error": updates.get("error"),
            "file_size": int(updates["file_size"]) if "file_size" in updates else None,
        }))

    async def cancel_job(self, job_id: str) -> bool:
        await self.connect()

        job_data = await self.redis.hgetall(f"job:{job_id}")
        if not job_data:
            return False

        if job_data["status"] in [JobStatus.COMPLETED.value, JobStatus.FAILED.value]:
            return False

        await self.update_job(job_id, status=JobStatus.CANCELLED, message="Job cancelled by user")
        return True

    async def list_jobs(self, page: int = 1, page_size: int = 20) -> tuple[list[JobDetailResponse], int]:
        await self.connect()

        job_ids = await self.redis.lrange("job_list", 0, -1)
        total = len(job_ids)

        start = (page - 1) * page_size
        end = start + page_size
        page_job_ids = job_ids[start:end]

        jobs = []
        for job_id in page_job_ids:
            job = await self.get_job(job_id)
            if job:
                jobs.append(job)

        return jobs, total

    async def start_worker(self):
        self._running = True
        self.worker_task = asyncio.create_task(self._worker_loop())

    async def stop_worker(self):
        self._running = False
        if self.worker_task:
            self.worker_task.cancel()
            try:
                await self.worker_task
            except asyncio.CancelledError:
                pass
        await self.disconnect()

    async def _worker_loop(self):
        await self.connect()

        while self._running:
            try:
                # Block for job from queue
                result = await self.redis.brpop("job_queue", timeout=1)
                if result is None:
                    continue

                _, job_json = result
                job_info = json.loads(job_json)
                job_id = job_info["job_id"]
                job_type = job_info["job_type"]

                # Get job data
                job_data = await self.redis.hgetall(f"job:{job_id}")
                if not job_data:
                    continue

                # Check if cancelled
                if job_data["status"] == JobStatus.CANCELLED.value:
                    continue

                # Find handler
                handler = self.handlers.get(job_type)
                if not handler:
                    await self.update_job(
                        job_id,
                        status=JobStatus.FAILED,
                        error=f"No handler for job type: {job_type}"
                    )
                    continue

                # Update status to processing
                await self.update_job(job_id, status=JobStatus.PROCESSING, progress=0)

                # Execute handler
                try:
                    import os
                    data = json.loads(job_data["data"])
                    result = await handler(job_id, data)

                    # Calculate output file size
                    output_file = result.get("output_file")
                    file_size = None
                    if output_file:
                        output_path = os.path.join(self.settings.processed_dir, output_file)
                        if os.path.exists(output_path):
                            file_size = os.path.getsize(output_path)

                    await self.update_job(
                        job_id,
                        status=JobStatus.COMPLETED,
                        progress=100,
                        output_file=output_file,
                        file_size=file_size,
                        message="Processing completed"
                    )
                except Exception as e:
                    await self.update_job(
                        job_id,
                        status=JobStatus.FAILED,
                        error=str(e)
                    )

            except asyncio.CancelledError:
                break
            except Exception as e:
                print(f"Worker error: {e}")
                await asyncio.sleep(1)


# Global job queue instance
job_queue = JobQueue()
