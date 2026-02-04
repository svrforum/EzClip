import os
import uuid

from services.base_service import BaseProcessingService
from services.queue_service import job_queue
from processors.ffmpeg_processor import FFmpegProcessor
from constants import QUALITY_CRF_MAP, GIF_QUALITY_SETTINGS, GIF_AUTO_WIDTH, RESOLUTION_MAP, AUDIO_CODEC_MAP


class VideoService(BaseProcessingService):
    def __init__(self):
        super().__init__()
        self.ffmpeg = FFmpegProcessor()

    async def convert(self, job_id: str, data: dict) -> dict:
        file_id = data["file_id"]
        target_format = data["target_format"]
        quality = data.get("quality", "medium")

        input_path = self._get_input_path(file_id)
        output_filename = self._generate_output_filename(file_id, "converted", target_format)
        output_path = self._get_output_path(output_filename)

        await job_queue.update_job(job_id, progress=5, message="Analyzing video...")

        crf = QUALITY_CRF_MAP.get(quality, 23)

        args = [
            "-i", input_path,
            "-c:v", "libx264" if target_format == "mp4" else "libvpx-vp9",
            "-crf", str(crf),
            "-c:a", "aac" if target_format == "mp4" else "libopus",
            "-threads", str(self.settings.ffmpeg_threads),
            output_path
        ]

        async def progress_callback(progress: int):
            await job_queue.update_job(job_id, progress=min(progress, 95), message="Converting...")

        await self.ffmpeg.run(args, progress_callback, input_path)

        await job_queue.update_job(job_id, progress=95, message="Finalizing...")

        return {"output_file": output_filename}

    async def to_gif(self, job_id: str, data: dict) -> dict:
        file_id = data["file_id"]
        start_time = data.get("start_time")
        duration = data.get("duration")
        fps = data.get("fps", 10)
        width = data.get("width")
        optimize = data.get("optimize", True)
        quality = data.get("quality", "medium")

        input_path = self._get_input_path(file_id)
        output_filename = self._generate_output_filename(file_id, "gif", "gif")
        output_path = self._get_output_path(output_filename)
        palette_path = os.path.join(self.settings.temp_dir, f"{uuid.uuid4()}_palette.png")

        await job_queue.update_job(job_id, progress=5, message="Preparing conversion...")

        settings = GIF_QUALITY_SETTINGS.get(quality, GIF_QUALITY_SETTINGS["medium"])

        # Build filter - limit width for smaller files
        filters = [f"fps={fps}"]

        # If no width specified and quality is low/medium, auto-limit width
        effective_width = width
        if not effective_width:
            effective_width = GIF_AUTO_WIDTH.get(quality)

        if effective_width:
            filters.append(f"scale={effective_width}:-1:flags=lanczos")

        filter_str = ",".join(filters)

        # Time options
        time_opts = []
        if start_time is not None:
            time_opts.extend(["-ss", str(start_time)])
        if duration is not None:
            time_opts.extend(["-t", str(duration)])

        if optimize:
            # Two-pass for better quality
            await job_queue.update_job(job_id, progress=20, message="Generating palette...")

            palette_args = time_opts + [
                "-i", input_path,
                "-vf", f"{filter_str},palettegen=max_colors={settings['max_colors']}:stats_mode=diff",
                "-y", palette_path
            ]
            await self.ffmpeg.run(palette_args)

            await job_queue.update_job(job_id, progress=50, message="Creating GIF...")

            gif_args = time_opts + [
                "-i", input_path,
                "-i", palette_path,
                "-lavfi", f"{filter_str}[x];[x][1:v]paletteuse=dither={settings['dither']}",
                "-y", output_path
            ]
            await self.ffmpeg.run(gif_args)

            # Clean up palette
            if os.path.exists(palette_path):
                os.remove(palette_path)
        else:
            args = time_opts + [
                "-i", input_path,
                "-vf", filter_str,
                "-y", output_path
            ]
            await self.ffmpeg.run(args)

        await job_queue.update_job(job_id, progress=95, message="Finalizing...")

        return {"output_file": output_filename}

    async def from_gif(self, job_id: str, data: dict) -> dict:
        file_id = data["file_id"]
        target_format = data.get("target_format", "mp4")
        loop = data.get("loop", 1)

        input_path = self._get_input_path(file_id)
        output_filename = self._generate_output_filename(file_id, "video", target_format)
        output_path = self._get_output_path(output_filename)

        await job_queue.update_job(job_id, progress=10, message="Converting GIF to video...")

        args = [
            "-stream_loop", str(loop - 1),
            "-i", input_path,
            "-movflags", "faststart",
            "-pix_fmt", "yuv420p",
            "-vf", "scale=trunc(iw/2)*2:trunc(ih/2)*2",
            "-y", output_path
        ]

        await self.ffmpeg.run(args)

        await job_queue.update_job(job_id, progress=95, message="Finalizing...")

        return {"output_file": output_filename}

    async def trim(self, job_id: str, data: dict) -> dict:
        file_id = data["file_id"]
        start_time = data["start_time"]
        end_time = data["end_time"]

        input_path = self._get_input_path(file_id)
        ext = os.path.splitext(file_id)[1] or ".mp4"
        output_filename = self._generate_output_filename(file_id, "trimmed", ext.lstrip("."))
        output_path = self._get_output_path(output_filename)

        await job_queue.update_job(job_id, progress=10, message="Trimming video...")

        duration = end_time - start_time

        args = [
            "-ss", str(start_time),
            "-i", input_path,
            "-t", str(duration),
            "-c", "copy",
            "-y", output_path
        ]

        await self.ffmpeg.run(args)

        await job_queue.update_job(job_id, progress=95, message="Finalizing...")

        return {"output_file": output_filename}

    async def crop(self, job_id: str, data: dict) -> dict:
        """Crop video to specified region."""
        file_id = data["file_id"]
        x = data["x"]
        y = data["y"]
        width = data["width"]
        height = data["height"]

        input_path = self._get_input_path(file_id)
        ext = os.path.splitext(file_id)[1] or ".mp4"
        output_filename = self._generate_output_filename(file_id, "cropped", ext.lstrip("."))
        output_path = self._get_output_path(output_filename)

        await job_queue.update_job(job_id, progress=5, message="Cropping video...")

        # Use crop filter: crop=width:height:x:y
        crop_filter = f"crop={width}:{height}:{x}:{y}"

        args = [
            "-i", input_path,
            "-vf", crop_filter,
            "-c:a", "copy",
            "-threads", str(self.settings.ffmpeg_threads),
            "-y", output_path
        ]

        async def progress_callback(progress: int):
            await job_queue.update_job(job_id, progress=min(progress, 95), message="Cropping...")

        await self.ffmpeg.run(args, progress_callback, input_path)

        await job_queue.update_job(job_id, progress=95, message="Finalizing...")

        return {"output_file": output_filename}

    async def resize(self, job_id: str, data: dict) -> dict:
        file_id = data["file_id"]
        resolution = data["resolution"]

        input_path = self._get_input_path(file_id)
        ext = os.path.splitext(file_id)[1] or ".mp4"
        output_filename = self._generate_output_filename(file_id, f"resized_{resolution}", ext.lstrip("."))
        output_path = self._get_output_path(output_filename)

        await job_queue.update_job(job_id, progress=5, message="Resizing video...")

        scale = RESOLUTION_MAP.get(resolution, "1280:720")

        args = [
            "-i", input_path,
            "-vf", f"scale={scale}:force_original_aspect_ratio=decrease,pad={scale}:(ow-iw)/2:(oh-ih)/2",
            "-c:a", "copy",
            "-threads", str(self.settings.ffmpeg_threads),
            "-y", output_path
        ]

        async def progress_callback(progress: int):
            await job_queue.update_job(job_id, progress=min(progress, 95), message="Resizing...")

        await self.ffmpeg.run(args, progress_callback, input_path)

        await job_queue.update_job(job_id, progress=95, message="Finalizing...")

        return {"output_file": output_filename}

    async def compress(self, job_id: str, data: dict) -> dict:
        file_id = data["file_id"]
        target_size_mb = data.get("target_size_mb")
        crf = data.get("crf", 28)

        input_path = self._get_input_path(file_id)
        ext = os.path.splitext(file_id)[1] or ".mp4"
        output_filename = self._generate_output_filename(file_id, "compressed", ext.lstrip("."))
        output_path = self._get_output_path(output_filename)

        await job_queue.update_job(job_id, progress=5, message="Compressing video...")

        args = [
            "-i", input_path,
            "-c:v", "libx264",
            "-crf", str(crf),
            "-preset", "medium",
            "-c:a", "aac",
            "-b:a", "128k",
            "-threads", str(self.settings.ffmpeg_threads),
            "-y", output_path
        ]

        async def progress_callback(progress: int):
            await job_queue.update_job(job_id, progress=min(progress, 95), message="Compressing...")

        await self.ffmpeg.run(args, progress_callback, input_path)

        await job_queue.update_job(job_id, progress=95, message="Finalizing...")

        return {"output_file": output_filename}

    async def thumbnail(self, job_id: str, data: dict) -> dict:
        file_id = data["file_id"]
        timestamp = data.get("timestamp", 0)
        width = data.get("width")
        height = data.get("height")

        input_path = self._get_input_path(file_id)
        output_filename = self._generate_output_filename(file_id, "thumbnail", "jpg")
        output_path = self._get_output_path(output_filename)

        await job_queue.update_job(job_id, progress=20, message="Extracting thumbnail...")

        # Build scale filter
        scale_filter = ""
        if width and height:
            scale_filter = f"-vf scale={width}:{height}"
        elif width:
            scale_filter = f"-vf scale={width}:-1"
        elif height:
            scale_filter = f"-vf scale=-1:{height}"

        args = [
            "-ss", str(timestamp),
            "-i", input_path,
            "-vframes", "1",
            "-q:v", "2",
        ]

        if scale_filter:
            args.extend(["-vf", scale_filter.replace("-vf ", "")])

        args.extend(["-y", output_path])

        await self.ffmpeg.run(args)

        await job_queue.update_job(job_id, progress=95, message="Finalizing...")

        return {"output_file": output_filename}

    async def handle_audio(self, job_id: str, data: dict) -> dict:
        file_id = data["file_id"]
        action = data["action"]
        audio_format = data.get("audio_format", "mp3")

        input_path = self._get_input_path(file_id)

        if action == "extract":
            output_filename = self._generate_output_filename(file_id, "audio", audio_format)
            output_path = self._get_output_path(output_filename)

            await job_queue.update_job(job_id, progress=10, message="Extracting audio...")

            args = [
                "-i", input_path,
                "-vn",
                "-acodec", AUDIO_CODEC_MAP.get(audio_format, "libmp3lame"),
                "-y", output_path
            ]

            await self.ffmpeg.run(args)

        else:  # remove
            ext = os.path.splitext(file_id)[1] or ".mp4"
            output_filename = self._generate_output_filename(file_id, "noaudio", ext.lstrip("."))
            output_path = self._get_output_path(output_filename)

            await job_queue.update_job(job_id, progress=10, message="Removing audio...")

            args = [
                "-i", input_path,
                "-c:v", "copy",
                "-an",
                "-y", output_path
            ]

            await self.ffmpeg.run(args)

        await job_queue.update_job(job_id, progress=95, message="Finalizing...")

        return {"output_file": output_filename}


# Global instance
video_service = VideoService()
