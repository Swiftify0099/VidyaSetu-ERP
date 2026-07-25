"""
VidyaSetu ERP — Teacher Leave Management Module
=================================================
Models for:
- Leave Types (Casual, Medical, Earned, Duty, Maternity, etc.)
- Leave Applications (apply, approve, reject, cancel)
- Leave Balance per employee per year
- Holiday Calendar
"""
from datetime import date
from decimal import Decimal
from sqlalchemy import (
    BigInteger, Boolean, Date, ForeignKey,
    Integer, Numeric, String, Text, UniqueConstraint
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import BaseModel


class LeaveType(BaseModel):
    """Master list of leave types defined by admin."""
    __tablename__ = "leave_types"

    name: Mapped[str] = mapped_column(String(100), nullable=False, unique=True)
    name_marathi: Mapped[str | None] = mapped_column(String(100), nullable=True)
    code: Mapped[str] = mapped_column(String(20), nullable=False, unique=True)
    # e.g. CL, ML, EL, SL, DL
    annual_quota: Mapped[Decimal] = mapped_column(Numeric(5, 1), nullable=False, default=0)
    is_paid: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    is_half_day_allowed: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    requires_document: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    carry_forward: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    max_carry_forward_days: Mapped[Decimal | None] = mapped_column(Numeric(5, 1), nullable=True)
    min_days_notice: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    description: Mapped[str | None] = mapped_column(String(500), nullable=True)


class LeaveBalance(BaseModel):
    """Annual leave balance per employee."""
    __tablename__ = "leave_balances"
    __table_args__ = (
        UniqueConstraint("employee_id", "leave_type_id", "academic_year", name="uq_leave_balance"),
    )

    employee_id: Mapped[int] = mapped_column(BigInteger, nullable=False, index=True)
    # FK to teachers.id or users.id
    leave_type_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("leave_types.id"), nullable=False)
    academic_year: Mapped[str] = mapped_column(String(10), nullable=False)
    # e.g. "2025-2026"
    entitled_days: Mapped[Decimal] = mapped_column(Numeric(6, 1), nullable=False, default=0)
    used_days: Mapped[Decimal] = mapped_column(Numeric(6, 1), nullable=False, default=0)
    pending_days: Mapped[Decimal] = mapped_column(Numeric(6, 1), nullable=False, default=0)
    # Applied but not approved
    carry_forward_days: Mapped[Decimal] = mapped_column(Numeric(6, 1), nullable=False, default=0)

    leave_type: Mapped["LeaveType"] = relationship("LeaveType")

    @property
    def available_days(self) -> Decimal:
        return self.entitled_days + self.carry_forward_days - self.used_days - self.pending_days


class LeaveApplication(BaseModel):
    """Leave application submitted by a teacher/employee."""
    __tablename__ = "leave_applications"

    application_number: Mapped[str] = mapped_column(String(30), unique=True, nullable=False, index=True)
    employee_id: Mapped[int] = mapped_column(BigInteger, nullable=False, index=True)
    employee_name: Mapped[str] = mapped_column(String(300), nullable=False)
    # Denormalized for quick display
    employee_code: Mapped[str | None] = mapped_column(String(30), nullable=True)

    leave_type_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("leave_types.id"), nullable=False)
    academic_year: Mapped[str] = mapped_column(String(10), nullable=False)

    from_date: Mapped[date] = mapped_column(Date, nullable=False)
    to_date: Mapped[date] = mapped_column(Date, nullable=False)
    total_days: Mapped[Decimal] = mapped_column(Numeric(5, 1), nullable=False)
    is_half_day: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    half_day_session: Mapped[str | None] = mapped_column(String(10), nullable=True)
    # "morning" or "afternoon"

    reason: Mapped[str] = mapped_column(Text, nullable=False)
    document_path: Mapped[str | None] = mapped_column(String(500), nullable=True)

    status: Mapped[str] = mapped_column(String(20), nullable=False, default="pending")
    # pending / approved / rejected / cancelled / withdrawn

    approved_by: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    approved_on: Mapped[date | None] = mapped_column(Date, nullable=True)
    rejection_reason: Mapped[str | None] = mapped_column(String(500), nullable=True)

    # Substitution
    substitute_teacher_id: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    substitute_accepted: Mapped[bool | None] = mapped_column(Boolean, nullable=True)

    leave_type: Mapped["LeaveType"] = relationship("LeaveType")


class HolidayCalendar(BaseModel):
    """School holiday master."""
    __tablename__ = "holiday_calendar"
    __table_args__ = (
        UniqueConstraint("holiday_date", "academic_year", name="uq_holiday"),
    )

    holiday_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    name_marathi: Mapped[str | None] = mapped_column(String(200), nullable=True)
    academic_year: Mapped[str] = mapped_column(String(10), nullable=False)
    holiday_type: Mapped[str] = mapped_column(String(30), nullable=False, default="national")
    # national / state / local / school / optional
    is_optional: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    description: Mapped[str | None] = mapped_column(String(300), nullable=True)
