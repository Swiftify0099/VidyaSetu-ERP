"""
VidyaSetu ERP — Clerk & Office Module Models
==============================================
Covers all daily office operations:
- Notice Board (नोटीस बोर्ड)
- Admission Enquiry Register
- Visitor Log (अभ्यागत नोंदणी)
- School Events / Calendar
- Complaint & Feedback
- Outward / Inward Registers
"""
from datetime import date, datetime
from sqlalchemy import BigInteger, Boolean, Date, DateTime, ForeignKey, Integer, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import BaseModel


class Notice(BaseModel):
    """
    School Notice Board.
    Handles circulars, notices, announcements, and government orders.
    """
    __tablename__ = "office_notices"

    title: Mapped[str] = mapped_column(String(500), nullable=False, index=True)
    title_marathi: Mapped[str | None] = mapped_column(String(500), nullable=True)
    content: Mapped[str | None] = mapped_column(Text, nullable=True)
    content_marathi: Mapped[str | None] = mapped_column(Text, nullable=True)
    notice_type: Mapped[str] = mapped_column(String(50), nullable=False, default="general")
    # Types: general / circular / academic / exam / holiday / sports / cultural / government / urgent
    priority: Mapped[str] = mapped_column(String(20), nullable=False, default="normal")
    # Priority: low / normal / high / urgent
    target_audience: Mapped[str] = mapped_column(String(100), nullable=False, default="all")
    # Audience: all / students / parents / teachers / staff / management
    publish_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    expiry_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    attachment_path: Mapped[str | None] = mapped_column(String(500), nullable=True)
    is_pinned: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_published: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    views: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    published_by: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    # Notice number for official circular tracking
    notice_number: Mapped[str | None] = mapped_column(String(50), nullable=True, unique=True)


class AdmissionEnquiry(BaseModel):
    """
    Pre-admission enquiry register.
    Tracks walk-in / phone enquiries for new admissions.
    """
    __tablename__ = "admission_enquiries"

    enquiry_number: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, index=True)
    enquiry_date: Mapped[date] = mapped_column(Date, nullable=False, default=date.today)

    # Applicant Details
    student_name: Mapped[str] = mapped_column(String(255), nullable=False)
    student_name_marathi: Mapped[str | None] = mapped_column(String(255), nullable=True)
    standard_applying_for: Mapped[str] = mapped_column(String(10), nullable=False)
    dob: Mapped[date | None] = mapped_column(Date, nullable=True)
    gender: Mapped[str | None] = mapped_column(String(10), nullable=True)
    category: Mapped[str | None] = mapped_column(String(20), nullable=True)

    # Parent Details
    father_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    mother_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    contact_mobile: Mapped[str] = mapped_column(String(15), nullable=False)
    contact_email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    address: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Previous School
    previous_school: Mapped[str | None] = mapped_column(String(255), nullable=True)
    previous_standard: Mapped[str | None] = mapped_column(String(10), nullable=True)
    previous_percentage: Mapped[str | None] = mapped_column(String(10), nullable=True)

    # Tracking
    source: Mapped[str | None] = mapped_column(String(100), nullable=True)
    # Source: walk_in / phone / website / referral / social_media
    status: Mapped[str] = mapped_column(String(30), nullable=False, default="pending")
    # Status: pending / follow_up / documents_submitted / admitted / rejected / withdrawn
    follow_up_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    assigned_to: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    remarks: Mapped[str | None] = mapped_column(Text, nullable=True)
    converted_student_id: Mapped[int | None] = mapped_column(BigInteger, nullable=True)


class Visitor(BaseModel):
    """
    Visitor Log — अभ्यागत नोंदणी.
    Records every visitor entering school premises.
    """
    __tablename__ = "visitors"

    visitor_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    visitor_name: Mapped[str] = mapped_column(String(255), nullable=False)
    visitor_mobile: Mapped[str | None] = mapped_column(String(15), nullable=True)
    visitor_address: Mapped[str | None] = mapped_column(String(500), nullable=True)
    id_proof_type: Mapped[str | None] = mapped_column(String(50), nullable=True)
    # Aadhaar / PAN / Driving License / Voter ID
    id_proof_number: Mapped[str | None] = mapped_column(String(50), nullable=True)
    purpose: Mapped[str] = mapped_column(String(500), nullable=False)
    whom_to_meet: Mapped[str | None] = mapped_column(String(255), nullable=True)
    # Name of teacher/office staff being visited
    check_in_time: Mapped[str | None] = mapped_column(String(10), nullable=True)
    check_out_time: Mapped[str | None] = mapped_column(String(10), nullable=True)
    badge_number: Mapped[str | None] = mapped_column(String(20), nullable=True)
    remarks: Mapped[str | None] = mapped_column(String(500), nullable=True)
    recorded_by: Mapped[int | None] = mapped_column(BigInteger, nullable=True)


class SchoolEvent(BaseModel):
    """
    School Events Calendar.
    Tracks all events — academic, cultural, sports, government.
    """
    __tablename__ = "school_events"

    title: Mapped[str] = mapped_column(String(500), nullable=False)
    title_marathi: Mapped[str | None] = mapped_column(String(500), nullable=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    event_type: Mapped[str] = mapped_column(String(50), nullable=False, default="general")
    # Types: academic / cultural / sports / exam / holiday / government / meeting / other
    start_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    end_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    start_time: Mapped[str | None] = mapped_column(String(10), nullable=True)
    end_time: Mapped[str | None] = mapped_column(String(10), nullable=True)
    venue: Mapped[str | None] = mapped_column(String(255), nullable=True)
    organizer: Mapped[str | None] = mapped_column(String(255), nullable=True)
    target_audience: Mapped[str] = mapped_column(String(100), nullable=False, default="all")
    is_holiday: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_published: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    color: Mapped[str | None] = mapped_column(String(20), nullable=True)  # Hex color for calendar
    attachment_path: Mapped[str | None] = mapped_column(String(500), nullable=True)
    academic_year_id: Mapped[int | None] = mapped_column(BigInteger, nullable=True)


class Complaint(BaseModel):
    """
    Complaint & Feedback Management.
    For parents, students, and staff grievances.
    """
    __tablename__ = "complaints"

    complaint_number: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, index=True)
    complaint_date: Mapped[date] = mapped_column(Date, nullable=False, default=date.today)

    # Complainant
    complainant_name: Mapped[str] = mapped_column(String(255), nullable=False)
    complainant_type: Mapped[str] = mapped_column(String(50), nullable=False)
    # parent / student / teacher / staff / anonymous
    complainant_mobile: Mapped[str | None] = mapped_column(String(15), nullable=True)
    related_student_id: Mapped[int | None] = mapped_column(BigInteger, nullable=True)

    # Complaint Details
    subject: Mapped[str] = mapped_column(String(500), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    complaint_type: Mapped[str] = mapped_column(String(100), nullable=False)
    # academic / fee / behavior / facility / teacher / staff / other
    priority: Mapped[str] = mapped_column(String(20), nullable=False, default="normal")

    # Resolution
    status: Mapped[str] = mapped_column(String(30), nullable=False, default="open")
    # open / in_progress / resolved / closed / escalated
    assigned_to: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    resolution: Mapped[str | None] = mapped_column(Text, nullable=True)
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    resolved_by: Mapped[int | None] = mapped_column(BigInteger, nullable=True)


class InwardRegister(BaseModel):
    """
    Inward / Outward Mail Register.
    Tracks official letters, government circulars, communications.
    """
    __tablename__ = "inward_register"

    register_number: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, index=True)
    register_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    register_type: Mapped[str] = mapped_column(String(10), nullable=False, default="inward")
    # inward / outward
    from_to: Mapped[str] = mapped_column(String(255), nullable=False)
    # From (inward) or To (outward)
    subject: Mapped[str] = mapped_column(String(500), nullable=False)
    reference_number: Mapped[str | None] = mapped_column(String(100), nullable=True)
    reference_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    document_type: Mapped[str | None] = mapped_column(String(100), nullable=True)
    # Letter / Notice / Circular / Order / Application / Report
    attachment_path: Mapped[str | None] = mapped_column(String(500), nullable=True)
    remarks: Mapped[str | None] = mapped_column(Text, nullable=True)
    action_taken: Mapped[str | None] = mapped_column(Text, nullable=True)
    action_by: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    action_date: Mapped[date | None] = mapped_column(Date, nullable=True)


class BonafideApplication(BaseModel):
    """
    Bonafide Certificate Application (बोनाफाइड प्रमाणपत्र अर्ज).
    Handles student applications, payment of charges, clerk approval/rejection,
    and printable Marathi Bonafide certificate generation.
    """
    __tablename__ = "bonafide_applications"

    application_number: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, index=True)
    student_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("students.id"), nullable=False, index=True)
    purpose: Mapped[str] = mapped_column(String(255), nullable=False)
    fee_amount: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False, default=20.0)
    payment_status: Mapped[str] = mapped_column(String(20), nullable=False, default="PAID")  # UNPAID, PAID, EXEMPT
    payment_reference: Mapped[str | None] = mapped_column(String(100), nullable=True)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="PENDING", index=True)  # PENDING, APPROVED, REJECTED
    rejection_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    applied_date: Mapped[date] = mapped_column(Date, nullable=False, default=date.today)
    processed_by: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    processed_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    issued_certificate_number: Mapped[str | None] = mapped_column(String(100), nullable=True)
    academic_year: Mapped[str | None] = mapped_column(String(50), nullable=True)
    remarks: Mapped[str | None] = mapped_column(Text, nullable=True)

    student: Mapped["Student"] = relationship("Student", lazy="joined")  # type: ignore

