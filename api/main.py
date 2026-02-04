from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import os

from config import get_settings
from routers import image, video, batch, jobs, upload
from services.queue_service import job_queue


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    settings = get_settings()

    # Ensure directories exist
    for directory in [settings.upload_dir, settings.processed_dir, settings.temp_dir]:
        os.makedirs(directory, exist_ok=True)

    # Start job queue worker
    await job_queue.start_worker()

    yield

    # Shutdown
    await job_queue.stop_worker()


app = FastAPI(
    title="EzClip API",
    description="Self-hosted Image/Video Editor API",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(upload.router, prefix="/api/upload", tags=["Upload"])
app.include_router(image.router, prefix="/api/image", tags=["Image"])
app.include_router(video.router, prefix="/api/video", tags=["Video"])
app.include_router(batch.router, prefix="/api/batch", tags=["Batch"])
app.include_router(jobs.router, prefix="/api/jobs", tags=["Jobs"])


@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "ezclip-api"}


@app.get("/api/health")
async def api_health_check():
    return {"status": "healthy", "service": "ezclip-api"}
