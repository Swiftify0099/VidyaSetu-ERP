"""
VidyaSetu ERP — Student Module Models
========================================
Complete student data model per government requirements.
"""
from datetime import date, datetime
from typing import Optional
from sqlalchemy import (
    BigInteger, Boolean, Column, Date, DateTime,
    ForeignKey, Integer, Numeric, String, Text, UniqueConstraint
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import BaseModel


class Student(BaseModel):
    """
    Student master record.
    Linked to User for login access.
    All fields follow Maharashtra government school records format.
    """
    __tablename__ = "students"

    # ── Identity ─────────────────────────────────────────────
    gr_number: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, index=True)
    admission_number: Mapped[str | None] = mapped_column(String(50), unique=True, nullable=True, index=True)
    user_id: Mapped[int | None] = mapped_column(BigInteger, ForeignKey("users.id"), nullable=True, index=True)

    # ── Name ──────────────────────────────────────────────────
    full_name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    full_name_marathi: Mapped[str | None] = mapped_column(String(255), nullable=True)
    first_name: Mapped[str] = mapped_column(String(100), nullable=False)
    middle_name: Mapped[str | None] = mapped_column(String(100), nullable=True)
    last_name: Mapped[str] = mapped_column(String(100), nullable=False)
    mother_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    surname_marathi: Mapped[str | None] = mapped_column(String(100), nullable=True)

    # ── Photo ─────────────────────────────────────────────────
    photo_path: Mapped[str | None] = mapped_column(String(500), nullable=True)

    # ── Academic Placement ────────────────────────────────────
    academic_year_id: Mapped[int | None] = mapped_column(BigInteger, ForeignKey("academic_years.id"), nullable=True, index=True)
    standard: Mapped[str] = mapped_column(String(10), nullable=False, index=True)  # 1-12
    division: Mapped[str | None] = mapped_column(String(5), nullable=True, index=True)  # A, B, C
    roll_number: Mapped[int | None] = mapped_column(Integer, nullable=True)
    previous_school: Mapped[str | None] = mapped_column(String(255), nullable=True)
    previous_standard: Mapped[str | None] = mapped_column(String(10), nullable=True)

    # ── Date of Birth ─────────────────────────────────────────
    dob: Mapped[date | None] = mapped_column(Date, nullable=True)
    dob_in_words: Mapped[str | None] = mapped_column(String(255), nullable=True)
    place_of_birth: Mapped[str | None] = mapped_column(String(255), nullable=True)

    # ── Personal Information ──────────────────────────────────
    gender: Mapped[str | None] = mapped_column(String(10), nullable=True)  # male/female/other
    blood_group: Mapped[str | None] = mapped_column(String(5), nullable=True)
    nationality: Mapped[str] = mapped_column(String(50), nullable=False, default="Indian")
    religion: Mapped[str | None] = mapped_column(String(50), nullable=True)
    caste: Mapped[str | None] = mapped_column(String(100), nullable=True)
    sub_caste: Mapped[str | None] = mapped_column(String(100), nullable=True)
    category: Mapped[str | None] = mapped_column(String(20), nullable=True)  # SC/ST/OBC/NT/SBC/Open
    mother_tongue: Mapped[str | None] = mapped_column(String(50), nullable=True)

    # ── Aadhaar ───────────────────────────────────────────────
    aadhaar_number: Mapped[str | None] = mapped_column(String(12), nullable=True)

    # ── Family Information ────────────────────────────────────
    father_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    father_name_marathi: Mapped[str | None] = mapped_column(String(255), nullable=True)
    father_occupation: Mapped[str | None] = mapped_column(String(255), nullable=True)
    father_mobile: Mapped[str | None] = mapped_column(String(15), nullable=True)
    father_email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    father_annual_income: Mapped[float | None] = mapped_column(Numeric(12, 2), nullable=True)

    mother_name_full: Mapped[str | None] = mapped_column(String(255), nullable=True)
    mother_name_marathi: Mapped[str | None] = mapped_column(String(255), nullable=True)
    mother_occupation: Mapped[str | None] = mapped_column(String(255), nullable=True)
    mother_mobile: Mapped[str | None] = mapped_column(String(15), nullable=True)
    mother_email: Mapped[str | None] = mapped_column(String(255), nullable=True)

    guardian_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    guardian_mobile: Mapped[str | None] = mapped_column(String(15), nullable=True)
    guardian_relation: Mapped[str | None] = mapped_column(String(100), nullable=True)

    # ── Contact ───────────────────────────────────────────────
    mobile: Mapped[str | None] = mapped_column(String(15), nullable=True, index=True)
    email: Mapped[str | None] = mapped_column(String(255), nullable=True)

    # ── Address ───────────────────────────────────────────────
    address_line1: Mapped[str | None] = mapped_column(String(500), nullable=True)
    address_line2: Mapped[str | None] = mapped_column(String(500), nullable=True)
    village: Mapped[str | None] = mapped_column(String(100), nullable=True)
    taluka: Mapped[str | None] = mapped_column(String(100), nullable=True)
    district: Mapped[str | None] = mapped_column(String(100), nullable=True)
    state: Mapped[str] = mapped_column(String(100), nullable=False, default="Maharashtra")
    pincode: Mapped[str | None] = mapped_column(String(10), nullable=True)

    # ── Admission Info ────────────────────────────────────────
    admission_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    admission_standard: Mapped[str | None] = mapped_column(String(10), nullable=True)  # Standard at which admitted
    date_of_leaving: Mapped[date | None] = mapped_column(Date, nullable=True)
    leaving_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    tc_number: Mapped[str | None] = mapped_column(String(50), nullable=True)
    tc_issued_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    tc_issued: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    # ── Government / Exam IDs ─────────────────────────────────
    student_id_saral: Mapped[str | None] = mapped_column(String(50), nullable=True)  # Maharashtra SARAL ID
    pen_number: Mapped[str | None] = mapped_column(String(20), nullable=True)         # Permanent Education Number
    apaar_id: Mapped[str | None] = mapped_column(String(20), nullable=True)            # Academic Bank of Credits ID

    # ── Transport ─────────────────────────────────────────────
    uses_transport: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    transport_route_id: Mapped[int | None] = mapped_column(BigInteger, nullable=True)

    # ── Medical ───────────────────────────────────────────────
    medical_conditions: Mapped[str | None] = mapped_column(Text, nullable=True)
    disability: Mapped[str | None] = mapped_column(String(255), nullable=True)
    is_differently_abled: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    # ── Status ────────────────────────────────────────────────
    status: Mapped[str] = mapped_column(
        String(20), nullable=False, default="active", index=True
    )  # active / left / transferred / passed_out / deceased

    # ── Relationships ─────────────────────────────────────────
    # Attendance records — defined in attendance.models.StudentAttendance
    # Loaded lazily via string reference; no back_populates needed across modules
    attendance_records: Mapped[list] = relationship(
        "StudentAttendance", lazy="select", viewonly=True,
    )

    @property
    def display_name(self) -> str:
        return self.full_name

    @property
    def age(self) -> int | None:
        if not self.dob:
            return None
        today = date.today()
        return today.year - self.dob.year - (
            (today.month, today.day) < (self.dob.month, self.dob.day)
        )


# NOTE: StudentAttendance is defined in app.modules.attendance.models
# It is imported and registered there to avoid duplicate table definition.


class StudentDocument(BaseModel):
    """Documents uploaded for a student."""
    __tablename__ = "student_documents"

    student_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("students.id"), nullable=False, index=True)
    document_type: Mapped[str] = mapped_column(String(100), nullable=False)
    # Types: aadhaar, birth_certificate, caste_certificate, tc, bonafide, leaving_certificate, photo_id, other
    document_name: Mapped[str] = mapped_column(String(255), nullable=False)
    file_path: Mapped[str] = mapped_column(String(500), nullable=False)
    uploaded_by: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    verified: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    verified_by: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    remarks: Mapped[str | None] = mapped_column(String(500), nullable=True)
