"""
VidyaSetu ERP — Teacher Module Models
=======================================
Complete teacher/staff employee record per Maharashtra government format.
Covers all fields required for SARAL, service book, and payroll.
"""
from datetime import date, datetime
from typing import Optional
from sqlalchemy import (
    BigInteger, Boolean, Column, Date, DateTime,
    ForeignKey, Integer, Numeric, String, Text, UniqueConstraint
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import BaseModel
from app.modules.auth.models import User  # noqa: F401


class Teacher(BaseModel):
    """
    Teacher / Staff employee master record.
    Covers all fields required for:
    - Service Book (सेवा पुस्तिका)
    - SARAL employee record
    - Payroll & leave management
    - Maharashtra government school staffing norms
    """
    __tablename__ = "teachers"

    # ── Identity ──────────────────────────────────────────────
    employee_id: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, index=True)
    user_id: Mapped[int | None] = mapped_column(BigInteger, ForeignKey("users.id"), nullable=True)

    # ── Name ──────────────────────────────────────────────────
    full_name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    full_name_marathi: Mapped[str | None] = mapped_column(String(255), nullable=True)
    first_name: Mapped[str] = mapped_column(String(100), nullable=False)
    middle_name: Mapped[str | None] = mapped_column(String(100), nullable=True)
    last_name: Mapped[str] = mapped_column(String(100), nullable=False)
    salutation: Mapped[str | None] = mapped_column(String(10), nullable=True)  # Mr./Mrs./Dr./Prof.

    # ── Photo ─────────────────────────────────────────────────
    photo_path: Mapped[str | None] = mapped_column(String(500), nullable=True)
    fcm_token: Mapped[str | None] = mapped_column(String(500), nullable=True, index=True)

    # ── Employment ────────────────────────────────────────────
    employee_type: Mapped[str] = mapped_column(String(50), nullable=False, default="teaching")
    # Types: teaching / non_teaching / contract / part_time / visiting
    designation: Mapped[str] = mapped_column(String(100), nullable=False)
    # e.g. Assistant Teacher, Head Master, Clerk, Peon, Lab Assistant
    department: Mapped[str | None] = mapped_column(String(100), nullable=True)
    subjects: Mapped[str | None] = mapped_column(String(255), nullable=True)  # Comma-separated
    classes_assigned: Mapped[str | None] = mapped_column(String(255), nullable=True)

    # ── Date of Joining & Service ─────────────────────────────
    date_of_joining: Mapped[date | None] = mapped_column(Date, nullable=True)
    date_of_confirmation: Mapped[date | None] = mapped_column(Date, nullable=True)
    probation_end_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    date_of_retirement: Mapped[date | None] = mapped_column(Date, nullable=True)
    date_of_leaving: Mapped[date | None] = mapped_column(Date, nullable=True)
    leaving_reason: Mapped[str | None] = mapped_column(Text, nullable=True)

    # ── Personal Information ──────────────────────────────────
    dob: Mapped[date | None] = mapped_column(Date, nullable=True)
    gender: Mapped[str | None] = mapped_column(String(10), nullable=True)
    blood_group: Mapped[str | None] = mapped_column(String(5), nullable=True)
    nationality: Mapped[str] = mapped_column(String(50), nullable=False, default="Indian")
    religion: Mapped[str | None] = mapped_column(String(50), nullable=True)
    caste: Mapped[str | None] = mapped_column(String(100), nullable=True)
    category: Mapped[str | None] = mapped_column(String(20), nullable=True)  # SC/ST/OBC/NT/SBC/Open
    marital_status: Mapped[str | None] = mapped_column(String(20), nullable=True)
    mother_tongue: Mapped[str | None] = mapped_column(String(50), nullable=True)

    # ── Aadhaar / PAN / Other IDs ─────────────────────────────
    aadhaar_number: Mapped[str | None] = mapped_column(String(12), nullable=True)
    pan_number: Mapped[str | None] = mapped_column(String(10), nullable=True)
    pf_number: Mapped[str | None] = mapped_column(String(50), nullable=True)        # PF / EPF
    gpf_number: Mapped[str | None] = mapped_column(String(50), nullable=True)       # GPF
    dcps_account: Mapped[str | None] = mapped_column(String(50), nullable=True)     # DCPS / NPS
    pran_number: Mapped[str | None] = mapped_column(String(20), nullable=True)      # PRAN (pension)
    teacher_saral_id: Mapped[str | None] = mapped_column(String(50), nullable=True)

    # ── Contact ───────────────────────────────────────────────
    mobile: Mapped[str | None] = mapped_column(String(15), nullable=True, index=True)
    mobile_alt: Mapped[str | None] = mapped_column(String(15), nullable=True)
    email: Mapped[str | None] = mapped_column(String(255), nullable=True, index=True)
    email_official: Mapped[str | None] = mapped_column(String(255), nullable=True)

    # ── Address ───────────────────────────────────────────────
    address_line1: Mapped[str | None] = mapped_column(String(500), nullable=True)
    address_line2: Mapped[str | None] = mapped_column(String(500), nullable=True)
    village: Mapped[str | None] = mapped_column(String(100), nullable=True)
    taluka: Mapped[str | None] = mapped_column(String(100), nullable=True)
    district: Mapped[str | None] = mapped_column(String(100), nullable=True)
    state: Mapped[str] = mapped_column(String(100), nullable=False, default="Maharashtra")
    pincode: Mapped[str | None] = mapped_column(String(10), nullable=True)

    # ── Qualification ─────────────────────────────────────────
    highest_qualification: Mapped[str | None] = mapped_column(String(100), nullable=True)
    # e.g. B.A., M.A., B.Ed., D.Ed., M.Sc., Ph.D.
    specialization: Mapped[str | None] = mapped_column(String(255), nullable=True)
    b_ed_year: Mapped[int | None] = mapped_column(Integer, nullable=True)
    d_ed_year: Mapped[int | None] = mapped_column(Integer, nullable=True)

    # ── Salary ────────────────────────────────────────────────
    pay_scale: Mapped[str | None] = mapped_column(String(100), nullable=True)
    basic_salary: Mapped[float | None] = mapped_column(Numeric(12, 2), nullable=True)
    grade_pay: Mapped[float | None] = mapped_column(Numeric(12, 2), nullable=True)
    bank_name: Mapped[str | None] = mapped_column(String(200), nullable=True)
    bank_account_number: Mapped[str | None] = mapped_column(String(50), nullable=True)
    bank_ifsc: Mapped[str | None] = mapped_column(String(20), nullable=True)
    bank_branch: Mapped[str | None] = mapped_column(String(200), nullable=True)

    # ── Family ────────────────────────────────────────────────
    spouse_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    spouse_occupation: Mapped[str | None] = mapped_column(String(255), nullable=True)
    father_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    mother_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    emergency_contact_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    emergency_contact_mobile: Mapped[str | None] = mapped_column(String(15), nullable=True)
    emergency_contact_relation: Mapped[str | None] = mapped_column(String(100), nullable=True)

    # ── Leave Balances ────────────────────────────────────────
    casual_leave_balance: Mapped[int] = mapped_column(Integer, nullable=False, default=12)
    earned_leave_balance: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    medical_leave_balance: Mapped[int] = mapped_column(Integer, nullable=False, default=10)
    half_pay_leave_balance: Mapped[int] = mapped_column(Integer, nullable=False, default=20)

    # ── Status ────────────────────────────────────────────────
    status: Mapped[str] = mapped_column(
        String(20), nullable=False, default="active", index=True
    )  # active / on_leave / resigned / retired / deceased / transferred

    # ── Relationships ─────────────────────────────────────────
    qualifications: Mapped[list["TeacherQualification"]] = relationship(
        "TeacherQualification", back_populates="teacher", cascade="all, delete-orphan"
    )
    experience_records: Mapped[list["TeacherExperience"]] = relationship(
        "TeacherExperience", back_populates="teacher", cascade="all, delete-orphan"
    )
    leave_requests: Mapped[list["TeacherLeave"]] = relationship(
        "TeacherLeave", back_populates="teacher", cascade="all, delete-orphan"
    )
    # ── Relationships ─────────────────────────────────────────

    @property
    def years_of_service(self) -> int | None:
        if not self.date_of_joining:
            return None
        end = self.date_of_leaving or date.today()
        return (end - self.date_of_joining).days // 365

    @property
    def age(self) -> int | None:
        if not self.dob:
            return None
        today = date.today()
        return today.year - self.dob.year - (
            (today.month, today.day) < (self.dob.month, self.dob.day)
        )


class TeacherQualification(BaseModel):
    """Academic qualifications of a teacher."""
    __tablename__ = "teacher_qualifications"

    teacher_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("teachers.id"), nullable=False, index=True)
    degree: Mapped[str] = mapped_column(String(100), nullable=False)  # B.A., M.Ed., Ph.D.
    subject: Mapped[str | None] = mapped_column(String(200), nullable=True)
    university: Mapped[str | None] = mapped_column(String(255), nullable=True)
    year_of_passing: Mapped[int | None] = mapped_column(Integer, nullable=True)
    grade_percentage: Mapped[str | None] = mapped_column(String(20), nullable=True)
    certificate_path: Mapped[str | None] = mapped_column(String(500), nullable=True)

    teacher: Mapped["Teacher"] = relationship("Teacher", back_populates="qualifications")


class TeacherExperience(BaseModel):
    """Previous work experience records."""
    __tablename__ = "teacher_experience"

    teacher_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("teachers.id"), nullable=False, index=True)
    organization: Mapped[str] = mapped_column(String(255), nullable=False)
    designation: Mapped[str | None] = mapped_column(String(100), nullable=True)
    from_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    to_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    is_current: Mapped[bool] = mapped_column(Boolean, default=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)

    teacher: Mapped["Teacher"] = relationship("Teacher", back_populates="experience_records")


class TeacherLeave(BaseModel):
    """Leave application and approval record."""
    __tablename__ = "teacher_leaves"

    teacher_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("teachers.id"), nullable=False, index=True)
    leave_type: Mapped[str] = mapped_column(String(30), nullable=False)
    # casual / earned / medical / half_pay / maternity / paternity / special / unpaid
    from_date: Mapped[date] = mapped_column(Date, nullable=False)
    to_date: Mapped[date] = mapped_column(Date, nullable=False)
    days: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="pending")
    # pending / approved / rejected / cancelled
    approved_by: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    approved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    rejection_reason: Mapped[str | None] = mapped_column(String(500), nullable=True)
    substitute_teacher_id: Mapped[int | None] = mapped_column(BigInteger, nullable=True)

    teacher: Mapped["Teacher"] = relationship("Teacher", back_populates="leave_requests")


# NOTE: TeacherAttendance is defined in app.modules.attendance.models
# It is imported and registered there to avoid duplicate table definition.
