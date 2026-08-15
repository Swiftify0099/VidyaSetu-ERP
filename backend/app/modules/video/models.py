"""
VidyaSetu ERP — Video Content Model
======================================
Stores teacher-uploaded video lectures and YouTube/external video links.
Only the file path / URL is stored in the database; binary data is NEVER stored in PostgreSQL.
"""
from datetime import datetime
from typing import Optional
from sqlalchemy import BigInteger, Boolean, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import BaseModel


class VideoContent(BaseModel):
    """
    A video resource shared by a teacher with students.

    file_path  → set when teacher uploads a local video file (stored via StorageService).
                 The path is relative to UPLOAD_BASE_DIR, e.g. "videos/20240801_abc123.mp4"
    video_url  → set when teacher links an external video (YouTube, Vimeo, etc.)

    Exactly one of file_path or video_url should be non-null.
    """
    __tablename__ = "video_contents"

    # ── Content ───────────────────────────────────────────────
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    standard: Mapped[str] = mapped_column(String(20), nullable=False, index=True)
    division: Mapped[str | None] = mapped_column(String(10), nullable=True)
    subject: Mapped[str] = mapped_column(String(100), nullable=False)
    topic: Mapped[str | None] = mapped_column(String(200), nullable=True)

    # ── Storage ───────────────────────────────────────────────
    # Relative path stored in DB (e.g. "videos/20240801_abc123.mp4")
    file_path: Mapped[str | None] = mapped_column(String(500), nullable=True)
    # Full external URL (YouTube etc.)
    video_url: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    file_size_bytes: Mapped[int | None] = mapped_column(Integer, nullable=True)
    mime_type: Mapped[str | None] = mapped_column(String(100), nullable=True)
    duration: Mapped[str | None] = mapped_column(String(20), nullable=True)  # e.g. "18:45"

    # ── Ownership ─────────────────────────────────────────────
    teacher_id: Mapped[int | None] = mapped_column(
        BigInteger, ForeignKey("teachers.id"), nullable=True, index=True
    )
    uploaded_by: Mapped[int | None] = mapped_column(BigInteger, nullable=True)

    # ── Status ────────────────────────────────────────────────
    is_published: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    # ── Relationships ─────────────────────────────────────────
    teacher: Mapped[Optional["Teacher"]] = relationship(  # type: ignore
        "Teacher", lazy="select", foreign_keys=[teacher_id]
    )
