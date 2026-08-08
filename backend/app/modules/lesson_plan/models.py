"""
VidyaSetu ERP — Lesson Plan Module Models
==========================================
- Lesson Plan (annual/monthly plan per teacher per subject)
- Daily Teaching Diary (daily record of actual teaching)
- Learning Objective tracker
"""
from datetime import date
from sqlalchemy import (
    BigInteger, Boolean, Date, ForeignKey,
    Integer, String, Text, UniqueConstraint
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import BaseModel


class LessonPlan(BaseModel):
    """
    Annual/Monthly lesson plan created by a teacher for a subject and standard.
    Covers what topics will be taught during which month.
    """
    __tablename__ = "lesson_plans"
    __table_args__ = (
        UniqueConstraint(
            "teacher_id", "standard", "division", "subject_name", "academic_year", "month",
            name="uq_lesson_plan"
        ),
    )

    teacher_id: Mapped[int] = mapped_column(BigInteger, nullable=False, index=True)
    teacher_name: Mapped[str] = mapped_column(String(300), nullable=False)
    standard: Mapped[str] = mapped_column(String(10), nullable=False)
    division: Mapped[str] = mapped_column(String(5), nullable=False)
    subject_name: Mapped[str] = mapped_column(String(150), nullable=False)
    subject_name_marathi: Mapped[str | None] = mapped_column(String(150), nullable=True)
    academic_year: Mapped[str] = mapped_column(String(10), nullable=False)
    month: Mapped[int] = mapped_column(Integer, nullable=False)
    # 1=Jan … 12=Dec

    # Content
    chapter_name: Mapped[str] = mapped_column(String(300), nullable=False)
    chapter_name_marathi: Mapped[str | None] = mapped_column(String(300), nullable=True)
    topics_planned: Mapped[str] = mapped_column(Text, nullable=False)
    # Comma/newline separated topic list
    learning_objectives: Mapped[str | None] = mapped_column(Text, nullable=True)
    teaching_methods: Mapped[str | None] = mapped_column(String(500), nullable=True)
    # lecture, discussion, activity, experiment, field visit
    resources_required: Mapped[str | None] = mapped_column(String(500), nullable=True)
    # textbook, charts, models, projector
    planned_periods: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    completed_periods: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    # Assessments planned in this month
    formative_assessment: Mapped[str | None] = mapped_column(String(300), nullable=True)
    summative_assessment: Mapped[str | None] = mapped_column(String(300), nullable=True)

    # Status
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="draft")
    # draft / submitted / approved / revision_needed
    submitted_on: Mapped[date | None] = mapped_column(Date, nullable=True)
    approved_by: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    approved_on: Mapped[date | None] = mapped_column(Date, nullable=True)
    revision_remarks: Mapped[str | None] = mapped_column(String(500), nullable=True)

    remarks: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Relationship to daily diary entries
    diary_entries: Mapped[list["TeachingDiary"]] = relationship(
        "TeachingDiary", back_populates="lesson_plan"
    )


class TeachingDiary(BaseModel):
    """
    Daily Teaching Diary — actual record of what was taught on a given day.
    One entry per teacher per subject per class per date.
    """
    __tablename__ = "teaching_diary"
    __table_args__ = (
        UniqueConstraint(
            "teacher_id", "standard", "division", "subject_name", "diary_date",
            name="uq_teaching_diary"
        ),
    )

    lesson_plan_id: Mapped[int | None] = mapped_column(
        BigInteger, ForeignKey("lesson_plans.id"), nullable=True, index=True
    )
    teacher_id: Mapped[int] = mapped_column(BigInteger, nullable=False, index=True)
    teacher_name: Mapped[str] = mapped_column(String(300), nullable=False)
    standard: Mapped[str] = mapped_column(String(10), nullable=False)
    division: Mapped[str] = mapped_column(String(5), nullable=False)
    subject_name: Mapped[str] = mapped_column(String(150), nullable=False)
    academic_year: Mapped[str] = mapped_column(String(10), nullable=False)

    diary_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    period_number: Mapped[int | None] = mapped_column(Integer, nullable=True)

    # What was actually taught
    topic_covered: Mapped[str] = mapped_column(String(500), nullable=False)
    sub_topics: Mapped[str | None] = mapped_column(Text, nullable=True)
    teaching_method_used: Mapped[str | None] = mapped_column(String(200), nullable=True)

    # Student engagement
    students_present: Mapped[int | None] = mapped_column(Integer, nullable=True)
    class_participation: Mapped[str | None] = mapped_column(String(20), nullable=True)
    # excellent / good / average / poor

    # Homework
    homework_given: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    homework_description: Mapped[str | None] = mapped_column(String(500), nullable=True)
    homework_due_date: Mapped[date | None] = mapped_column(Date, nullable=True)

    # Issues / observations
    difficulties_observed: Mapped[str | None] = mapped_column(Text, nullable=True)
    remedial_needed: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    remedial_students: Mapped[str | None] = mapped_column(String(500), nullable=True)
    # Comma-separated student names or IDs

    remarks: Mapped[str | None] = mapped_column(Text, nullable=True)

    lesson_plan: Mapped["LessonPlan | None"] = relationship(
        "LessonPlan", back_populates="diary_entries"
    )
