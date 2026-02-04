import os
from PIL import Image, ImageFilter, ImageEnhance, ImageOps

from models.image import ImageFilter as ImgFilter, RotateDirection
from services.base_service import BaseProcessingService
from services.queue_service import job_queue


class ImageService(BaseProcessingService):
    async def convert(self, job_id: str, data: dict) -> dict:
        file_id = data["file_id"]
        target_format = data["target_format"]
        quality = data.get("quality", 85)

        input_path = self._get_input_path(file_id)
        output_filename = self._generate_output_filename(file_id, "converted", target_format)
        output_path = self._get_output_path(output_filename)

        await job_queue.update_job(job_id, progress=10, message="Loading image...")

        with Image.open(input_path) as img:
            # Convert RGBA to RGB for JPEG
            if target_format.lower() in ["jpg", "jpeg"] and img.mode == "RGBA":
                background = Image.new("RGB", img.size, (255, 255, 255))
                background.paste(img, mask=img.split()[3])
                img = background

            await job_queue.update_job(job_id, progress=50, message="Converting format...")

            save_kwargs = {}
            if target_format.lower() in ["jpg", "jpeg", "webp"]:
                save_kwargs["quality"] = quality
            if target_format.lower() == "webp":
                save_kwargs["method"] = 6

            img.save(output_path, format=target_format.upper(), **save_kwargs)

        await job_queue.update_job(job_id, progress=90, message="Finalizing...")

        return {"output_file": output_filename}

    async def resize(self, job_id: str, data: dict) -> dict:
        file_id = data["file_id"]
        width = data.get("width")
        height = data.get("height")
        maintain_aspect = data.get("maintain_aspect", True)

        input_path = self._get_input_path(file_id)
        ext = os.path.splitext(file_id)[1] or ".png"
        output_filename = self._generate_output_filename(file_id, "resized", ext.lstrip("."))
        output_path = self._get_output_path(output_filename)

        await job_queue.update_job(job_id, progress=10, message="Loading image...")

        with Image.open(input_path) as img:
            original_width, original_height = img.size

            if maintain_aspect:
                if width and height:
                    ratio = min(width / original_width, height / original_height)
                    new_width = int(original_width * ratio)
                    new_height = int(original_height * ratio)
                elif width:
                    ratio = width / original_width
                    new_width = width
                    new_height = int(original_height * ratio)
                elif height:
                    ratio = height / original_height
                    new_width = int(original_width * ratio)
                    new_height = height
                else:
                    new_width, new_height = original_width, original_height
            else:
                new_width = width or original_width
                new_height = height or original_height

            await job_queue.update_job(job_id, progress=50, message="Resizing...")

            resized = img.resize((new_width, new_height), Image.Resampling.LANCZOS)
            resized.save(output_path)

        await job_queue.update_job(job_id, progress=90, message="Finalizing...")

        return {"output_file": output_filename}

    async def crop(self, job_id: str, data: dict) -> dict:
        file_id = data["file_id"]
        x = data["x"]
        y = data["y"]
        width = data["width"]
        height = data["height"]

        input_path = self._get_input_path(file_id)
        ext = os.path.splitext(file_id)[1] or ".png"
        output_filename = self._generate_output_filename(file_id, "cropped", ext.lstrip("."))
        output_path = self._get_output_path(output_filename)

        await job_queue.update_job(job_id, progress=10, message="Loading image...")

        with Image.open(input_path) as img:
            await job_queue.update_job(job_id, progress=50, message="Cropping...")

            cropped = img.crop((x, y, x + width, y + height))
            cropped.save(output_path)

        await job_queue.update_job(job_id, progress=90, message="Finalizing...")

        return {"output_file": output_filename}

    async def apply_filter(self, job_id: str, data: dict) -> dict:
        file_id = data["file_id"]
        filter_type = data["filter_type"]
        intensity = data.get("intensity", 1.0)

        input_path = self._get_input_path(file_id)
        ext = os.path.splitext(file_id)[1] or ".png"
        output_filename = self._generate_output_filename(file_id, f"filter_{filter_type}", ext.lstrip("."))
        output_path = self._get_output_path(output_filename)

        await job_queue.update_job(job_id, progress=10, message="Loading image...")

        with Image.open(input_path) as img:
            await job_queue.update_job(job_id, progress=50, message=f"Applying {filter_type} filter...")

            if filter_type == ImgFilter.GRAYSCALE.value:
                result = ImageOps.grayscale(img)
                if img.mode == "RGBA":
                    result = result.convert("RGBA")
            elif filter_type == ImgFilter.SEPIA.value:
                gray = ImageOps.grayscale(img)
                result = ImageOps.colorize(gray, "#704214", "#C0A080")
                if img.mode == "RGBA":
                    result = result.convert("RGBA")
            elif filter_type == ImgFilter.BLUR.value:
                radius = int(intensity * 5)
                result = img.filter(ImageFilter.GaussianBlur(radius=radius))
            elif filter_type == ImgFilter.SHARPEN.value:
                enhancer = ImageEnhance.Sharpness(img)
                result = enhancer.enhance(1 + intensity)
            elif filter_type == ImgFilter.BRIGHTNESS.value:
                enhancer = ImageEnhance.Brightness(img)
                result = enhancer.enhance(intensity)
            elif filter_type == ImgFilter.CONTRAST.value:
                enhancer = ImageEnhance.Contrast(img)
                result = enhancer.enhance(intensity)
            elif filter_type == ImgFilter.INVERT.value:
                if img.mode == "RGBA":
                    r, g, b, a = img.split()
                    rgb = Image.merge("RGB", (r, g, b))
                    inverted = ImageOps.invert(rgb)
                    r, g, b = inverted.split()
                    result = Image.merge("RGBA", (r, g, b, a))
                else:
                    result = ImageOps.invert(img.convert("RGB"))
            else:
                result = img

            result.save(output_path)

        await job_queue.update_job(job_id, progress=90, message="Finalizing...")

        return {"output_file": output_filename}

    async def rotate(self, job_id: str, data: dict) -> dict:
        file_id = data["file_id"]
        direction = data["direction"]

        input_path = self._get_input_path(file_id)
        ext = os.path.splitext(file_id)[1] or ".png"
        output_filename = self._generate_output_filename(file_id, f"rotated_{direction}", ext.lstrip("."))
        output_path = self._get_output_path(output_filename)

        await job_queue.update_job(job_id, progress=10, message="Loading image...")

        with Image.open(input_path) as img:
            await job_queue.update_job(job_id, progress=50, message="Rotating...")

            if direction == RotateDirection.CW_90.value:
                result = img.rotate(-90, expand=True)
            elif direction == RotateDirection.CW_180.value:
                result = img.rotate(180)
            elif direction == RotateDirection.CW_270.value:
                result = img.rotate(-270, expand=True)
            elif direction == RotateDirection.FLIP_H.value:
                result = ImageOps.mirror(img)
            elif direction == RotateDirection.FLIP_V.value:
                result = ImageOps.flip(img)
            else:
                result = img

            result.save(output_path)

        await job_queue.update_job(job_id, progress=90, message="Finalizing...")

        return {"output_file": output_filename}


# Global instance
image_service = ImageService()
