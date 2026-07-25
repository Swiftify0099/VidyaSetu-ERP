"""
VidyaSetu ERP — Database Base Model
=====================================
All SQLAlchemy models must inherit from this BaseModel.
Provides standard audit fields on every table.
"""
import uuid as uuid_module
from datetime import datetime, timezone

from sqlalchemy import BigInteger, Boolean, Column, DateTime, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class Base(DeclarativeBase):
    """SQLAlchemy declarative base."""
    pass


class BaseModel(Base):
    """
    Abstract base model — every table inherits this.
    Provides: id, uuid, audit timestamps, soft delete.
    """
    __abstract__ = True

    # ── Primary Identity ──────────────────────────────────────
    id: Mapped[int] = mapped_column(
        BigInteger, primary_key=True, autoincrement=True, index=True
    )
    uuid: Mapped[str] = mapped_column(
        String(36),
        unique=True,
        nullable=False,
        default=lambda: str(uuid_module.uuid4()),
        index=True,
    )

    # ── Timestamps ────────────────────────────────────────────
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False
    )

    # ── Audit — Who Created/Updated ───────────────────────────
    created_by: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    updated_by: Mapped[int | None] = mapped_column(BigInteger, nullable=True)

    # ── Soft Delete ───────────────────────────────────────────
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    is_deleted: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False, index=True)
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    def soft_delete(self, deleted_by: int | None = None) -> None:
        """Mark record as deleted without removing from database."""
        self.is_deleted = True
        self.is_active = False
        self.deleted_at = utc_now()
        if deleted_by:
            self.updated_by = deleted_by

    def restore(self, restored_by: int | None = None) -> None:
        """Restore a soft-deleted record."""
        self.is_deleted = False
        self.is_active = True
        self.deleted_at = None
        if restored_by:
            self.updated_by = restored_by

    def to_dict(self) -> dict:
        """Convert model instance to dictionary."""
        return {
            col.name: getattr(self, col.name)
            for col in self.__table__.columns
        }

    def __repr__(self) -> str:
        return f"<{self.__class__.__name__} id={self.id} uuid={self.uuid}>"
