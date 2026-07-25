"""
VidyaSetu ERP — Office Module Schemas
"""
from datetime import date, datetime
from typing import Optional
from pydantic import BaseModel


# ── Notice ────────────────────────────────────────────────────

class NoticeCreateRequest(BaseModel):
    title: str
    title_marathi: Optional[str] = None
    content: Optional[str] = None
    content_marathi: Optional[str] = None
    notice_type: str = "general"
    priority: str = "normal"
    target_audience: str = "all"
    publish_date: Optional[date] = None
    expiry_date: Optional[date] = None
    is_pinned: bool = False
    is_published: bool = True
    notice_number: Optional[str] = None


class NoticeUpdateRequest(BaseModel):
    title: Optional[str] = None
    title_marathi: Optional[str] = None
    content: Optional[str] = None
    content_marathi: Optional[str] = None
    notice_type: Optional[str] = None
    priority: Optional[str] = None
    target_audience: Optional[str] = None
    expiry_date: Optional[date] = None
    is_pinned: Optional[bool] = None
    is_published: Optional[bool] = None


class NoticeResponse(BaseModel):
    model_config = {"from_attributes": True}
    id: int
    uuid: str
    title: str
    title_marathi: Optional[str] = None
    content: Optional[str] = None
    content_marathi: Optional[str] = None
    notice_type: str
    priority: str
    target_audience: str
    publish_date: Optional[date] = None
    expiry_date: Optional[date] = None
    is_pinned: bool
    is_published: bool
    views: int
    notice_number: Optional[str] = None
    attachment_path: Optional[str] = None
    created_at: Optional[datetime] = None
    is_active: bool


# ── Admission Enquiry ─────────────────────────────────────────

class EnquiryCreateRequest(BaseModel):
    student_name: str
    student_name_marathi: Optional[str] = None
    standard_applying_for: str
    dob: Optional[date] = None
    gender: Optional[str] = None
    category: Optional[str] = None
    father_name: Optional[str] = None
    mother_name: Optional[str] = None
    contact_mobile: str
    contact_email: Optional[str] = None
    address: Optional[str] = None
    previous_school: Optional[str] = None
    previous_standard: Optional[str] = None
    previous_percentage: Optional[str] = None
    source: Optional[str] = None
    follow_up_date: Optional[date] = None
    remarks: Optional[str] = None


class EnquiryUpdateRequest(BaseModel):
    status: Optional[str] = None
    follow_up_date: Optional[date] = None
    remarks: Optional[str] = None
    assigned_to: Optional[int] = None
    converted_student_id: Optional[int] = None


class EnquiryResponse(BaseModel):
    model_config = {"from_attributes": True}
    id: int
    uuid: str
    enquiry_number: str
    enquiry_date: date
    student_name: str
    student_name_marathi: Optional[str] = None
    standard_applying_for: str
    dob: Optional[date] = None
    gender: Optional[str] = None
    category: Optional[str] = None
    father_name: Optional[str] = None
    mother_name: Optional[str] = None
    contact_mobile: str
    contact_email: Optional[str] = None
    previous_school: Optional[str] = None
    source: Optional[str] = None
    status: str
    follow_up_date: Optional[date] = None
    remarks: Optional[str] = None
    converted_student_id: Optional[int] = None
    is_active: bool
    created_at: Optional[datetime] = None


# ── Visitor ───────────────────────────────────────────────────

class VisitorCreateRequest(BaseModel):
    visitor_name: str
    visitor_mobile: Optional[str] = None
    visitor_address: Optional[str] = None
    id_proof_type: Optional[str] = None
    id_proof_number: Optional[str] = None
    purpose: str
    whom_to_meet: Optional[str] = None
    check_in_time: Optional[str] = None
    remarks: Optional[str] = None


class VisitorCheckOutRequest(BaseModel):
    check_out_time: str
    badge_number: Optional[str] = None


class VisitorResponse(BaseModel):
    model_config = {"from_attributes": True}
    id: int
    visitor_date: date
    visitor_name: str
    visitor_mobile: Optional[str] = None
    purpose: str
    whom_to_meet: Optional[str] = None
    check_in_time: Optional[str] = None
    check_out_time: Optional[str] = None
    badge_number: Optional[str] = None
    id_proof_type: Optional[str] = None
    remarks: Optional[str] = None
    created_at: Optional[datetime] = None


# ── Event ─────────────────────────────────────────────────────

class EventCreateRequest(BaseModel):
    title: str
    title_marathi: Optional[str] = None
    description: Optional[str] = None
    event_type: str = "general"
    start_date: date
    end_date: Optional[date] = None
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    venue: Optional[str] = None
    organizer: Optional[str] = None
    target_audience: str = "all"
    is_holiday: bool = False
    color: Optional[str] = None
    academic_year_id: Optional[int] = None


class EventResponse(BaseModel):
    model_config = {"from_attributes": True}
    id: int
    uuid: str
    title: str
    title_marathi: Optional[str] = None
    description: Optional[str] = None
    event_type: str
    start_date: date
    end_date: Optional[date] = None
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    venue: Optional[str] = None
    organizer: Optional[str] = None
    target_audience: str
    is_holiday: bool
    is_published: bool
    color: Optional[str] = None
    academic_year_id: Optional[int] = None
    created_at: Optional[datetime] = None


# ── Complaint ─────────────────────────────────────────────────

class ComplaintCreateRequest(BaseModel):
    complainant_name: str
    complainant_type: str = "parent"
    complainant_mobile: Optional[str] = None
    related_student_id: Optional[int] = None
    subject: str
    description: str
    complaint_type: str = "other"
    priority: str = "normal"


class ComplaintUpdateRequest(BaseModel):
    status: Optional[str] = None
    assigned_to: Optional[int] = None
    resolution: Optional[str] = None


class ComplaintResponse(BaseModel):
    model_config = {"from_attributes": True}
    id: int
    uuid: str
    complaint_number: str
    complaint_date: date
    complainant_name: str
    complainant_type: str
    complainant_mobile: Optional[str] = None
    subject: str
    description: str
    complaint_type: str
    priority: str
    status: str
    resolution: Optional[str] = None
    resolved_at: Optional[datetime] = None
    created_at: Optional[datetime] = None


# ── Inward/Outward ────────────────────────────────────────────

class RegisterCreateRequest(BaseModel):
    register_date: date
    register_type: str = "inward"
    from_to: str
    subject: str
    reference_number: Optional[str] = None
    reference_date: Optional[date] = None
    document_type: Optional[str] = None
    remarks: Optional[str] = None


class RegisterResponse(BaseModel):
    model_config = {"from_attributes": True}
    id: int
    uuid: str
    register_number: str
    register_date: date
    register_type: str
    from_to: str
    subject: str
    reference_number: Optional[str] = None
    reference_date: Optional[date] = None
    document_type: Optional[str] = None
    remarks: Optional[str] = None
    action_taken: Optional[str] = None
    action_date: Optional[date] = None
    created_at: Optional[datetime] = None


# ── Stats ─────────────────────────────────────────────────────

class OfficeStatsResponse(BaseModel):
    total_notices: int
    active_notices: int
    total_enquiries: int
    pending_enquiries: int
    today_visitors: int
    upcoming_events: int
    open_complaints: int
