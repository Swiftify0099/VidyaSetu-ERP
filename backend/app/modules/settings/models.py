"""
VidyaSetu ERP — Settings Module Models
=========================================
SystemSettings, AcademicYear models.
"""
from datetime import date, datetime
from sqlalchemy import Boolean, Date, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.database.base import BaseModel


class SystemSetting(BaseModel):
    """
    School configuration stored in database.
    All app behavior driven by this — never hardcoded.
    """
    __tablename__ = "system_settings"

    key: Mapped[str] = mapped_column(String(200), unique=True, nullable=False, index=True)
    value: Mapped[str | None] = mapped_column(Text, nullable=True)
    category: Mapped[str] = mapped_column(String(100), nullable=False, default="general", index=True)
    data_type: Mapped[str] = mapped_column(String(20), nullable=False, default="string")
    label: Mapped[str | None] = mapped_column(String(255), nullable=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_editable: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    is_public: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)


class AcademicYear(BaseModel):
    """Academic year management."""
    __tablename__ = "academic_years"

    name: Mapped[str] = mapped_column(String(20), unique=True, nullable=False)
    code: Mapped[str] = mapped_column(String(20), unique=True, nullable=False, index=True)
    start_date: Mapped[date] = mapped_column(Date, nullable=False)
    end_date: Mapped[date] = mapped_column(Date, nullable=False)
    is_current: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False, index=True)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="open")

    @property
    def display_name(self) -> str:
        return self.name
