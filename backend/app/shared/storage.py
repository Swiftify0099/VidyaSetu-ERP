"""
VidyaSetu ERP — File Storage Service
=======================================
Handles all file uploads — organized directory structure.
All files stored locally. Only paths stored in database.
"""
import os
import uuid
import shutil
import hashlib
from datetime import datetime
from pathlib import Path
from typing import Optional, Tuple

from fastapi import HTTPException, UploadFile, status

from app.core.config import settings


class StorageService:
    """
    Centralized file storage service.
    Every module uses this — never handle files directly in routes.
    """

    BASE_DIR = Path(settings.UPLOAD_BASE_DIR)

    # Directory map per module
    DIRECTORIES = {
        "students": "students",
        "student_photos": "students/photos",
        "student_docs": "students/documents",
        "student_submissions": "students/submissions",
        "teachers": "teachers",
        "teacher_photos": "teachers/photos",
        "teacher_docs": "teachers/documents",
        "videos": "videos",
        "video_thumbnails": "videos/thumbnails",
        "notes": "notes",
        "question_papers": "question_papers",
        "library": "library",
        "library_covers": "library/covers",
        "digital_books": "library/digital",
        "inventory": "inventory",
        "asset_photos": "inventory/assets",
        "certificates": "certificates",
        "reports": "reports",
        "backups": "backups",
        "temp": "temp",
        "logos": "school/logos",
        "signatures": "school/signatures",
    }

    @classmethod
    def _ensure_directory(cls, directory: Path) -> None:
        """Create directory if it doesn't exist."""
        directory.mkdir(parents=True, exist_ok=True)

    @classmethod
    def _get_directory(cls, module: str, sub_path: Optional[str] = None) -> Path:
        """Get the storage directory for a module."""
        dir_name = cls.DIRECTORIES.get(module, module)
        directory = cls.BASE_DIR / dir_name
        if sub_path:
            directory = directory / sub_path
        cls._ensure_directory(directory)
        return directory

    @classmethod
    def _generate_filename(cls, original_filename: str) -> str:
        """Generate a unique filename preserving the extension."""
        ext = Path(original_filename).suffix.lower()
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        unique_id = str(uuid.uuid4())[:8]
        return f"{timestamp}_{unique_id}{ext}"

    @classmethod
    def _validate_file(
        cls,
        file: UploadFile,
        allowed_types: list[str],
        max_size_mb: int,
    ) -> None:
        """Validate file type and size."""
        if file.filename:
            ext = Path(file.filename).suffix.lower().lstrip(".")
            if ext not in allowed_types:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"File type '.{ext}' is not allowed. Allowed: {', '.join(allowed_types)}",
                )
        # File size validation done during read

    @classmethod
    async def save_image(
        cls,
        file: UploadFile,
        module: str,
        sub_path: Optional[str] = None,
    ) -> str:
        """
        Save an image file.
        Returns the relative file path (stored in DB).
        """
        cls._validate_file(file, settings.allowed_image_types_list, settings.MAX_FILE_SIZE_MB)
        return await cls._save_file(file, module, sub_path, settings.MAX_FILE_SIZE_MB)

    @classmethod
    async def save_document(
        cls,
        file: UploadFile,
        module: str,
        sub_path: Optional[str] = None,
    ) -> str:
        """
        Save a document file (PDF, DOC, XLS, etc.).
        Returns the relative file path (stored in DB).
        """
        cls._validate_file(file, settings.allowed_doc_types_list, settings.MAX_FILE_SIZE_MB)
        return await cls._save_file(file, module, sub_path, settings.MAX_FILE_SIZE_MB)

    @classmethod
    async def save_video(
        cls,
        file: UploadFile,
        module: str,
        sub_path: Optional[str] = None,
    ) -> str:
        """
        Save a video file.
        Returns the relative file path (stored in DB).
        """
        cls._validate_file(file, settings.allowed_video_types_list, settings.MAX_VIDEO_SIZE_MB)
        return await cls._save_file(file, module, sub_path, settings.MAX_VIDEO_SIZE_MB)

    @classmethod
    async def _save_file(
        cls,
        file: UploadFile,
        module: str,
        sub_path: Optional[str],
        max_size_mb: int,
    ) -> str:
        """Internal file save logic."""
        directory = cls._get_directory(module, sub_path)
        filename = cls._generate_filename(file.filename or "file")
        file_path = directory / filename

        max_size_bytes = max_size_mb * 1024 * 1024
        total_size = 0
        content_chunks = []

        try:
            while chunk := await file.read(1024 * 64):  # 64KB chunks
                total_size += len(chunk)
                if total_size > max_size_bytes:
                    raise HTTPException(
                        status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                        detail=f"File size exceeds maximum allowed size of {max_size_mb}MB.",
                    )
                content_chunks.append(chunk)

            with open(file_path, "wb") as f:
                for chunk in content_chunks:
                    f.write(chunk)

        except HTTPException:
            # Clean up partial file
            if file_path.exists():
                file_path.unlink()
            raise

        # Return relative path for storage in database
        relative_path = str(file_path.relative_to(cls.BASE_DIR))
        return relative_path.replace("\\", "/")  # Normalize for cross-platform

    @classmethod
    def delete_file(cls, relative_path: str) -> bool:
        """Delete a file by its relative path."""
        file_path = cls.BASE_DIR / relative_path
        if file_path.exists():
            file_path.unlink()
            return True
        return False

    @classmethod
    def get_absolute_path(cls, relative_path: str) -> Path:
        """Get the absolute path for a stored file."""
        return cls.BASE_DIR / relative_path

    @classmethod
    def file_exists(cls, relative_path: str) -> bool:
        """Check if a stored file exists."""
        return (cls.BASE_DIR / relative_path).exists()

    @classmethod
    def initialize_storage(cls) -> None:
        """Create all storage directories on startup."""
        for key, path in cls.DIRECTORIES.items():
            (cls.BASE_DIR / path).mkdir(parents=True, exist_ok=True)
