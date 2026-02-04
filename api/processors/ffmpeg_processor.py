import asyncio
import re
from typing import Callable, Optional, Awaitable


class FFmpegProcessor:
    """FFmpeg processor with progress tracking."""

    async def get_duration(self, input_path: str) -> float:
        """Get video duration in seconds."""
        cmd = [
            "ffprobe",
            "-v", "error",
            "-show_entries", "format=duration",
            "-of", "default=noprint_wrappers=1:nokey=1",
            input_path
        ]

        process = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE
        )

        stdout, _ = await process.communicate()

        try:
            return float(stdout.decode().strip())
        except (ValueError, AttributeError):
            return 0

    async def run(
        self,
        args: list[str],
        progress_callback: Optional[Callable[[int], Awaitable[None]]] = None,
        input_path: Optional[str] = None
    ):
        """Run FFmpeg command with optional progress tracking."""

        # Get duration for progress calculation
        duration = 0
        if progress_callback and input_path:
            duration = await self.get_duration(input_path)

        cmd = ["ffmpeg", "-y", "-progress", "pipe:1", "-nostats"] + args

        process = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE
        )

        # Parse progress from stdout
        current_time = 0

        while True:
            line = await process.stdout.readline()
            if not line:
                break

            line = line.decode().strip()

            # Parse out_time_ms or out_time
            if line.startswith("out_time_ms="):
                try:
                    current_time = int(line.split("=")[1]) / 1_000_000
                except (ValueError, IndexError):
                    pass
            elif line.startswith("out_time="):
                time_str = line.split("=")[1]
                match = re.match(r"(\d+):(\d+):(\d+\.?\d*)", time_str)
                if match:
                    h, m, s = match.groups()
                    current_time = int(h) * 3600 + int(m) * 60 + float(s)

            # Calculate and report progress
            if progress_callback and duration > 0:
                progress = min(int((current_time / duration) * 100), 100)
                await progress_callback(progress)

            # Check for completion
            if line.startswith("progress=end"):
                break

        await process.wait()

        if process.returncode != 0:
            stderr = await process.stderr.read()
            raise RuntimeError(f"FFmpeg error: {stderr.decode()}")
