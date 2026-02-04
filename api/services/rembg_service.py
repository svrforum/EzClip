import uuid
import numpy as np
import cv2
from PIL import Image
from rembg import remove, new_session

from services.base_service import BaseProcessingService
from services.queue_service import job_queue


class RembgService(BaseProcessingService):
    def __init__(self):
        super().__init__()
        self.session = None

    def _get_session(self):
        if self.session is None:
            self.session = new_session(self.settings.rembg_model)
        return self.session

    def _generate_output_filename(self, original_filename: str, suffix: str = "nobg", extension: str = "png") -> str:
        """Override to use simpler naming for background removal."""
        base = original_filename.rsplit(".", 1)[0] if "." in original_filename else original_filename
        unique_id = str(uuid.uuid4())[:8]
        return f"{base}_{suffix}_{unique_id}.{extension}"

    async def remove_background(self, job_id: str, data: dict) -> dict:
        file_id = data["file_id"]
        alpha_matting = data.get("alpha_matting", False)
        fg_threshold = data.get("alpha_matting_foreground_threshold", 240)
        bg_threshold = data.get("alpha_matting_background_threshold", 10)

        input_path = self._get_input_path(file_id)
        output_filename = self._generate_output_filename(file_id)
        output_path = self._get_output_path(output_filename)

        await job_queue.update_job(job_id, progress=10, message="Loading image...")

        with Image.open(input_path) as img:
            await job_queue.update_job(job_id, progress=20, message="Initializing AI model...")

            session = self._get_session()

            await job_queue.update_job(job_id, progress=30, message="Removing background (this may take a while)...")

            result = remove(
                img,
                session=session,
                alpha_matting=alpha_matting,
                alpha_matting_foreground_threshold=fg_threshold,
                alpha_matting_background_threshold=bg_threshold,
            )

            await job_queue.update_job(job_id, progress=80, message="Saving result...")

            result.save(output_path, format="PNG")

        await job_queue.update_job(job_id, progress=90, message="Finalizing...")

        return {"output_file": output_filename}

    async def remove_background_interactive(self, job_id: str, data: dict) -> dict:
        """Remove background using user-specified region (GrabCut algorithm)."""
        file_id = data["file_id"]
        rect = data.get("rect")  # [x, y, width, height]
        fg_points = data.get("fg_points", [])  # [[x, y], ...]
        bg_points = data.get("bg_points", [])  # [[x, y], ...]

        input_path = self._get_input_path(file_id)
        output_filename = self._generate_output_filename(file_id)
        output_path = self._get_output_path(output_filename)

        await job_queue.update_job(job_id, progress=10, message="이미지 로딩 중...")

        with Image.open(input_path) as pil_img:
            # Convert to RGB for OpenCV
            if pil_img.mode == 'RGBA':
                background = Image.new('RGB', pil_img.size, (255, 255, 255))
                background.paste(pil_img, mask=pil_img.split()[3])
                pil_img = background
            elif pil_img.mode != 'RGB':
                pil_img = pil_img.convert('RGB')

            img = np.array(pil_img)
            img = cv2.cvtColor(img, cv2.COLOR_RGB2BGR)

            await job_queue.update_job(job_id, progress=20, message="배경 분석 중...")

            # Create mask
            mask = np.zeros(img.shape[:2], np.uint8)

            # Initialize background and foreground models
            bgd_model = np.zeros((1, 65), np.float64)
            fgd_model = np.zeros((1, 65), np.float64)

            if rect:
                # Use bounding box with GrabCut
                rect_tuple = tuple(rect)  # (x, y, w, h)

                await job_queue.update_job(job_id, progress=30, message="선택 영역 처리 중...")

                cv2.grabCut(img, mask, rect_tuple, bgd_model, fgd_model, 5, cv2.GC_INIT_WITH_RECT)

            # Apply foreground points
            if fg_points:
                for point in fg_points:
                    cv2.circle(mask, (int(point[0]), int(point[1])), 5, cv2.GC_FGD, -1)

            # Apply background points
            if bg_points:
                for point in bg_points:
                    cv2.circle(mask, (int(point[0]), int(point[1])), 5, cv2.GC_BGD, -1)

            # If we have points, run GrabCut again
            if fg_points or bg_points:
                await job_queue.update_job(job_id, progress=50, message="마스크 정제 중...")
                cv2.grabCut(img, mask, None, bgd_model, fgd_model, 5, cv2.GC_INIT_WITH_MASK)

            await job_queue.update_job(job_id, progress=70, message="배경 제거 중...")

            # Create final mask (GC_FGD=1, GC_PR_FGD=3 are foreground)
            mask2 = np.where((mask == cv2.GC_FGD) | (mask == cv2.GC_PR_FGD), 255, 0).astype('uint8')

            # Convert back to RGB
            img_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)

            # Create RGBA image with transparency
            result = np.dstack([img_rgb, mask2])
            result_img = Image.fromarray(result, 'RGBA')

            await job_queue.update_job(job_id, progress=85, message="결과 저장 중...")
            result_img.save(output_path, format="PNG")

        await job_queue.update_job(job_id, progress=90, message="완료 중...")

        return {"output_file": output_filename}


# Global instance
rembg_service = RembgService()
