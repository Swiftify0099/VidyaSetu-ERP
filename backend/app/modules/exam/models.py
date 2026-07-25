"""
VidyaSetu ERP — Examination Module Models
==========================================
Comprehensive exam & results management:
- Exam Types (Unit Test, Half-Yearly, Annual, etc.)
- Subject-wise marks entry per student
- Grade calculation (A+/A/B/C/D/F)
- Result sheet & report card generation
- Rank / Merit list
- Marks statistics per class
"""
from datetime import date
from decimal import Decimal
from sqlalchemy import (
    BigInteger, Boolean, Date, ForeignKey,
    Integer, Numeric, String, Text, UniqueConstraint
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import BaseModel


class ExamType(BaseModel):
    """
    Master list of exam types defined by school.
    e.g. Unit Test 1, Half-Yearly, Annual, etc.
    """
    __tablename__ = "exam_types"

    name: Mapped[str] = mapped_column(String(200), nullable=False)
    name_marathi: Mapped[str | None] = mapped_column(String(200), nullable=True)
    academic_year_id: Mapped[int] = mapped_column(BigInteger, nullable=False)
    sequence: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    max_marks: Mapped[int] = mapped_column(Integer, nullable=False, default=100)
    passing_marks: Mapped[int] = mapped_column(Integer, nullable=False, default=35)
    is_grade_system: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    weightage: Mapped[Decimal] = mapped_column(Numeric(5, 2), nullable=False, default=100)
    # for weighted average calculation
    description: Mapped[str | None] = mapped_column(String(500), nullable=True)


class Exam(BaseModel):
    """
    An actual exam event.
    One exam = one exam_type for one standard.
    """
    __tablename__ = "exams"
    __table_args__ = (
        UniqueConstraint("exam_type_id", "standard", "academic_year_id", name="uq_exam"),
    )

    exam_type_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("exam_types.id"), nullable=False)
    academic_year_id: Mapped[int] = mapped_column(BigInteger, nullable=False)
    standard: Mapped[str] = mapped_column(String(10), nullable=False)
    exam_date_from: Mapped[date | None] = mapped_column(Date, nullable=True)
    exam_date_to: Mapped[date | None] = mapped_column(Date, nullable=True)
    result_declared: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    result_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    remarks: Mapped[str | None] = mapped_column(String(500), nullable=True)

    exam_type: Mapped["ExamType"] = relationship("ExamType")
    subjects: Mapped[list["ExamSubject"]] = relationship("ExamSubject", back_populates="exam")


class ExamSubject(BaseModel):
    """
    Subject configuration for an exam.
    Defines max marks and passing marks per subject.
    """
    __tablename__ = "exam_subjects"
    __table_args__ = (
        UniqueConstraint("exam_id", "subject_name", name="uq_exam_subject"),
    )

    exam_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("exams.id"), nullable=False, index=True)
    subject_name: Mapped[str] = mapped_column(String(150), nullable=False)
    subject_name_marathi: Mapped[str | None] = mapped_column(String(150), nullable=True)
    subject_code: Mapped[str | None] = mapped_column(String(20), nullable=True)
    max_marks: Mapped[int] = mapped_column(Integer, nullable=False, default=100)
    passing_marks: Mapped[int] = mapped_column(Integer, nullable=False, default=35)
    theory_max: Mapped[int | None] = mapped_column(Integer, nullable=True)
    # Split theory/practical e.g. 80 theory + 20 practical
    practical_max: Mapped[int | None] = mapped_column(Integer, nullable=True)
    is_optional: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    exam: Mapped["Exam"] = relationship("Exam", back_populates="subjects")
    marks: Mapped[list["StudentMark"]] = relationship("StudentMark", back_populates="subject")


class StudentMark(BaseModel):
    """
    Marks obtained by a student in a subject for an exam.
    Central marks-entry table.
    """
    __tablename__ = "student_marks"
    __table_args__ = (
        UniqueConstraint("exam_id", "exam_subject_id", "student_id", name="uq_student_mark"),
    )

    exam_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("exams.id"), nullable=False, index=True)
    exam_subject_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("exam_subjects.id"), nullable=False, index=True)
    student_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("students.id"), nullable=False, index=True)

    marks_obtained: Mapped[Decimal | None] = mapped_column(Numeric(7, 2), nullable=True)
    theory_marks: Mapped[Decimal | None] = mapped_column(Numeric(7, 2), nullable=True)
    practical_marks: Mapped[Decimal | None] = mapped_column(Numeric(7, 2), nullable=True)
    grade: Mapped[str | None] = mapped_column(String(5), nullable=True)
    # A+, A, B, C, D, E, F
    is_absent: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_exempted: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    remarks: Mapped[str | None] = mapped_column(String(200), nullable=True)
    entered_by: Mapped[int | None] = mapped_column(BigInteger, nullable=True)

    student: Mapped["Student"] = relationship("Student")  # type: ignore
    subject: Mapped["ExamSubject"] = relationship("ExamSubject", back_populates="marks")


class ExamResult(BaseModel):
    """
    Consolidated result per student per exam.
    Computed after all subject marks are entered.
    """
    __tablename__ = "exam_results"
    __table_args__ = (
        UniqueConstraint("exam_id", "student_id", name="uq_exam_result"),
    )

    exam_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("exams.id"), nullable=False, index=True)
    student_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("students.id"), nullable=False, index=True)

    total_marks: Mapped[Decimal] = mapped_column(Numeric(9, 2), nullable=False, default=0)
    max_marks: Mapped[Decimal] = mapped_column(Numeric(9, 2), nullable=False, default=0)
    percentage: Mapped[Decimal] = mapped_column(Numeric(6, 2), nullable=False, default=0)
    grade: Mapped[str | None] = mapped_column(String(5), nullable=True)
    result: Mapped[str] = mapped_column(String(20), nullable=False, default="pending")
    # pass / fail / absent / promoted / detained / pending
    rank: Mapped[int | None] = mapped_column(Integer, nullable=True)
    subjects_passed: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    subjects_failed: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    subjects_absent: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    remarks: Mapped[str | None] = mapped_column(String(500), nullable=True)

    student: Mapped["Student"] = relationship("Student")  # type: ignore
    exam: Mapped["Exam"] = relationship("Exam")
