"""
VidyaSetu ERP — Attendance Module Models
==========================================
Student & Teacher daily attendance management:
- Daily class attendance (student-wise)
- Teacher / Staff attendance
- Holiday calendar
- Monthly attendance summary (computed)
- Attendance reports
"""
from datetime import date
from decimal import Decimal
from sqlalchemy import (
    BigInteger, Boolean, Date, ForeignKey,
    Integer, Numeric, String, Text, UniqueConstraint
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import BaseModel
from app.modules.timetable.models import Subject  # noqa: F401


class Holiday(BaseModel):
    """
    School holiday calendar.
    Attendance is not taken on holidays.
    """
    __tablename__ = "holidays"

    date: Mapped[date] = mapped_column(Date, nullable=False, unique=True, index=True)
    name: Mapped[str] = mapped_column(String(300), nullable=False)
    name_marathi: Mapped[str | None] = mapped_column(String(300), nullable=True)
    holiday_type: Mapped[str] = mapped_column(String(50), nullable=False, default="public")
    # public / school / local / exam
    academic_year_id: Mapped[int | None] = mapped_column(BigInteger, nullable=True)


class StudentAttendance(BaseModel):
    """
    Daily student attendance record.
    One row per student per day per period/session (and optionally subject).
    """
    __tablename__ = "student_attendance"

    student_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("students.id"), nullable=False, index=True)
    date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    standard: Mapped[str] = mapped_column(String(10), nullable=False)
    division: Mapped[str | None] = mapped_column(String(5), nullable=True)
    academic_year_id: Mapped[int] = mapped_column(BigInteger, nullable=False)
    period: Mapped[str] = mapped_column(String(20), nullable=False, default="full_day")
    # full_day / morning / afternoon / period_1 … period_8
    subject_id: Mapped[int | None] = mapped_column(BigInteger, ForeignKey("subjects.id"), nullable=True, index=True)

    status: Mapped[str] = mapped_column(String(20), nullable=False, default="present")
    # present / absent / late / half_day / leave / medical_leave

    marked_by: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    remarks: Mapped[str | None] = mapped_column(String(300), nullable=True)

    student: Mapped["Student"] = relationship("Student", lazy="select")  # type: ignore
    subject: Mapped["Subject | None"] = relationship("Subject", lazy="select")  # type: ignore


class ClassAttendanceSession(BaseModel):
    """
    Tracks whether attendance has been marked for a class on a given day.
    Prevents double-marking and provides completion tracking per session/subject.
    """
    __tablename__ = "class_attendance_sessions"

    date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    standard: Mapped[str] = mapped_column(String(10), nullable=False)
    division: Mapped[str | None] = mapped_column(String(5), nullable=True)
    academic_year_id: Mapped[int] = mapped_column(BigInteger, nullable=False)
    period: Mapped[str] = mapped_column(String(20), nullable=False, default="full_day")
    subject_id: Mapped[int | None] = mapped_column(BigInteger, ForeignKey("subjects.id"), nullable=True, index=True)
    total_students: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    present_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    absent_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    late_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    leave_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    marked_by: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    is_holiday: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    subject: Mapped["Subject | None"] = relationship("Subject", lazy="select")  # type: ignore


class TeacherAttendance(BaseModel):
    """
    Teacher / Staff daily attendance.
    """
    __tablename__ = "teacher_attendance"
    __table_args__ = (
        UniqueConstraint("teacher_id", "date", name="uq_teacher_attendance"),
    )

    teacher_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("teachers.id"), nullable=False, index=True)
    date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    academic_year_id: Mapped[int] = mapped_column(BigInteger, nullable=False)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="present")
    # present / absent / late / half_day / leave / medical_leave / casual_leave / earned_leave
    check_in: Mapped[str | None] = mapped_column(String(10), nullable=True)   # HH:MM
    check_out: Mapped[str | None] = mapped_column(String(10), nullable=True)
    remarks: Mapped[str | None] = mapped_column(String(300), nullable=True)
    marked_by: Mapped[int | None] = mapped_column(BigInteger, nullable=True)

    teacher: Mapped["Teacher"] = relationship("Teacher")  # type: ignore


class MonthlyAttendanceSummary(BaseModel):
    """
    Pre-computed monthly attendance summary per student.
    Updated whenever daily attendance is saved.
    """
    __tablename__ = "monthly_attendance_summary"
    __table_args__ = (
        UniqueConstraint("student_id", "year", "month", "academic_year_id",
                         name="uq_monthly_attendance"),
    )

    student_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("students.id"), nullable=False, index=True)
    academic_year_id: Mapped[int] = mapped_column(BigInteger, nullable=False)
    year: Mapped[int] = mapped_column(Integer, nullable=False)
    month: Mapped[int] = mapped_column(Integer, nullable=False)   # 1-12
    working_days: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    present_days: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    absent_days: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    late_days: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    leave_days: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    attendance_percentage: Mapped[Decimal] = mapped_column(Numeric(5, 2), nullable=False, default=0)

    student: Mapped["Student"] = relationship("Student")  # type: ignore
