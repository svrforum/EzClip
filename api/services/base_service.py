"""Base service class with common utilities for processing services."""

import os
import uuid
from abc import ABC

from config import get_settings


class BaseProcessingService(ABC):
    """Base class for media processing services.

    Provides common path handling and filename generation utilities.
    """

    def __init__(self):
        self.settings = get_settings()

    def _get_input_path(self, file_id: str) -> str:
        """Get the full path for an uploaded file.

        Args:
            file_id: The unique identifier of the uploaded file.

        Returns:
            The absolute path to the file in the upload directory.
        """
        return os.path.join(self.settings.upload_dir, file_id)

    def _get_output_path(self, filename: str) -> str:
        """Get the full path for a processed output file.

        Args:
            filename: The name of the output file.

        Returns:
            The absolute path to the file in the processed directory.
        """
        return os.path.join(self.settings.processed_dir, filename)

    def _generate_output_filename(self, original_filename: str, suffix: str, extension: str) -> str:
        """Generate a unique output filename.

        Args:
            original_filename: The original input filename.
            suffix: A suffix to describe the operation (e.g., 'converted', 'cropped').
            extension: The file extension for the output (without dot).

        Returns:
            A unique filename in the format: {base}_{suffix}_{unique_id}.{extension}
        """
        base = os.path.splitext(original_filename)[0]
        unique_id = str(uuid.uuid4())[:8]
        return f"{base}_{suffix}_{unique_id}.{extension}"
