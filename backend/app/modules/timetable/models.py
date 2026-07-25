"""
VidyaSetu ERP — Timetable Module Models
=========================================
Complete class scheduling system:
- Subject Master
- Period configuration per school
- Weekly timetable per standard/division
- Teacher subject-class assignments
- Substitute teacher entries
"""
from sqlalchemy import (
    BigInteger, Boolean, ForeignKey,
    Integer, String, Text, UniqueConstraint
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import BaseModel


class Subject(BaseModel):
    """School subject master."""
    __tablename__ = "subjects"

    name: Mapped[str] = mapped_column(String(200), nullable=False, index=True)
    name_marathi: Mapped[str | None] = mapped_column(String(200), nullable=True)
    code: Mapped[str | None] = mapped_column(String(20), nullable=True, unique=True)
    subject_type: Mapped[str] = mapped_column(String(30), nullable=False, default="theory")
    # theory / practical / activity / language / co-curricular
    applicable_standards: Mapped[str | None] = mapped_column(String(100), nullable=True)
    # "1,2,3" or "All"
    color: Mapped[str | None] = mapped_column(String(10), nullable=True)
    # HEX color for timetable display


class PeriodConfig(BaseModel):
    """
    Period/session configuration per school.
    Defines period number, time, and type.
    """
    __tablename__ = "period_configs"
    __table_args__ = (
        UniqueConstraint("period_number", "academic_year_id", name="uq_period_config"),
    )

    academic_year_id: Mapped[int] = mapped_column(BigInteger, nullable=False)
    period_number: Mapped[int] = mapped_column(Integer, nullable=False)
    period_name: Mapped[str] = mapped_column(String(50), nullable=False)
    # "Period 1", "Lunch Break", "Assembly"
    start_time: Mapped[str] = mapped_column(String(10), nullable=False)  # HH:MM
    end_time: Mapped[str] = mapped_column(String(10), nullable=False)
    duration_minutes: Mapped[int] = mapped_column(Integer, nullable=False, default=45)
    period_type: Mapped[str] = mapped_column(String(20), nullable=False, default="class")
    # class / break / lunch / assembly / sports / library
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)


class TimetableEntry(BaseModel):
    """
    One cell in the weekly timetable grid.
    Standard × Division × Day × Period → Subject × Teacher
    """
    __tablename__ = "timetable_entries"
    __table_args__ = (
        UniqueConstraint(
            "standard", "division", "day_of_week", "period_id",
            "academic_year_id", name="uq_timetable_entry"
        ),
    )

    academic_year_id: Mapped[int] = mapped_column(BigInteger, nullable=False, index=True)
    standard: Mapped[str] = mapped_column(String(10), nullable=False, index=True)
    division: Mapped[str | None] = mapped_column(String(5), nullable=True)
    day_of_week: Mapped[int] = mapped_column(Integer, nullable=False)
    # 1=Monday … 6=Saturday, 0=Sunday
    period_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("period_configs.id"), nullable=False)
    subject_id: Mapped[int | None] = mapped_column(BigInteger, ForeignKey("subjects.id"), nullable=True)
    teacher_id: Mapped[int | None] = mapped_column(BigInteger, ForeignKey("teachers.id"), nullable=True)
    room: Mapped[str | None] = mapped_column(String(50), nullable=True)
    notes: Mapped[str | None] = mapped_column(String(300), nullable=True)

    period: Mapped["PeriodConfig"] = relationship("PeriodConfig")
    subject: Mapped["Subject | None"] = relationship("Subject")
    teacher: Mapped["Teacher | None"] = relationship("Teacher")  # type: ignore


class TeacherSubjectAssignment(BaseModel):
    """
    Which teacher teaches which subject in which standard/division.
    Used to populate timetable dropdowns.
    """
    __tablename__ = "teacher_subject_assignments"
    __table_args__ = (
        UniqueConstraint(
            "teacher_id", "subject_id", "standard", "division",
            "academic_year_id", name="uq_teacher_subject"
        ),
    )

    teacher_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("teachers.id"), nullable=False, index=True)
    subject_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("subjects.id"), nullable=False, index=True)
    standard: Mapped[str] = mapped_column(String(10), nullable=False)
    division: Mapped[str | None] = mapped_column(String(5), nullable=True)
    academic_year_id: Mapped[int] = mapped_column(BigInteger, nullable=False)
    periods_per_week: Mapped[int] = mapped_column(Integer, nullable=False, default=5)
    is_class_teacher: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    teacher: Mapped["Teacher"] = relationship("Teacher")  # type: ignore
    subject: Mapped["Subject"] = relationship("Subject")


class SubstituteEntry(BaseModel):
    """
    Substitute teacher for a specific period/date when regular teacher is absent.
    """
    __tablename__ = "substitute_entries"

    timetable_entry_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("timetable_entries.id"), nullable=False, index=True
    )
    substitute_date: Mapped[str] = mapped_column(String(10), nullable=False)  # YYYY-MM-DD
    substitute_teacher_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("teachers.id"), nullable=False
    )
    reason: Mapped[str | None] = mapped_column(String(300), nullable=True)
    marked_by: Mapped[int | None] = mapped_column(BigInteger, nullable=True)

    substitute_teacher: Mapped["Teacher"] = relationship(  # type: ignore
        "Teacher", foreign_keys=[substitute_teacher_id]
    )
