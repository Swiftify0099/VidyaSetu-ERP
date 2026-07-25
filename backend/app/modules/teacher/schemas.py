"""
VidyaSetu ERP — Teacher Module Schemas
=========================================
Pydantic schemas for teacher API validation and response.
"""
from datetime import date, datetime
from typing import Optional
from pydantic import BaseModel, field_validator


# ── Request Schemas ───────────────────────────────────────────

class TeacherCreateRequest(BaseModel):
    first_name: str
    middle_name: Optional[str] = None
    last_name: str
    full_name_marathi: Optional[str] = None
    salutation: Optional[str] = None
    employee_type: str = "teaching"
    designation: str
    department: Optional[str] = None
    subjects: Optional[str] = None
    classes_assigned: Optional[str] = None
    date_of_joining: Optional[date] = None
    dob: Optional[date] = None
    gender: Optional[str] = None
    blood_group: Optional[str] = None
    nationality: str = "Indian"
    religion: Optional[str] = None
    caste: Optional[str] = None
    category: Optional[str] = None
    marital_status: Optional[str] = None
    mother_tongue: Optional[str] = None
    aadhaar_number: Optional[str] = None
    pan_number: Optional[str] = None
    pf_number: Optional[str] = None
    gpf_number: Optional[str] = None
    dcps_account: Optional[str] = None
    pran_number: Optional[str] = None
    teacher_saral_id: Optional[str] = None
    mobile: Optional[str] = None
    mobile_alt: Optional[str] = None
    email: Optional[str] = None
    email_official: Optional[str] = None
    address_line1: Optional[str] = None
    address_line2: Optional[str] = None
    village: Optional[str] = None
    taluka: Optional[str] = None
    district: Optional[str] = None
    state: str = "Maharashtra"
    pincode: Optional[str] = None
    highest_qualification: Optional[str] = None
    specialization: Optional[str] = None
    b_ed_year: Optional[int] = None
    d_ed_year: Optional[int] = None
    pay_scale: Optional[str] = None
    basic_salary: Optional[float] = None
    grade_pay: Optional[float] = None
    bank_name: Optional[str] = None
    bank_account_number: Optional[str] = None
    bank_ifsc: Optional[str] = None
    bank_branch: Optional[str] = None
    spouse_name: Optional[str] = None
    father_name: Optional[str] = None
    mother_name: Optional[str] = None
    emergency_contact_name: Optional[str] = None
    emergency_contact_mobile: Optional[str] = None
    emergency_contact_relation: Optional[str] = None


class TeacherUpdateRequest(BaseModel):
    first_name: Optional[str] = None
    middle_name: Optional[str] = None
    last_name: Optional[str] = None
    full_name_marathi: Optional[str] = None
    salutation: Optional[str] = None
    designation: Optional[str] = None
    department: Optional[str] = None
    subjects: Optional[str] = None
    classes_assigned: Optional[str] = None
    dob: Optional[date] = None
    gender: Optional[str] = None
    blood_group: Optional[str] = None
    religion: Optional[str] = None
    caste: Optional[str] = None
    category: Optional[str] = None
    marital_status: Optional[str] = None
    mobile: Optional[str] = None
    mobile_alt: Optional[str] = None
    email: Optional[str] = None
    address_line1: Optional[str] = None
    village: Optional[str] = None
    taluka: Optional[str] = None
    district: Optional[str] = None
    pincode: Optional[str] = None
    highest_qualification: Optional[str] = None
    specialization: Optional[str] = None
    pay_scale: Optional[str] = None
    basic_salary: Optional[float] = None
    bank_account_number: Optional[str] = None
    bank_ifsc: Optional[str] = None
    teacher_saral_id: Optional[str] = None
    emergency_contact_name: Optional[str] = None
    emergency_contact_mobile: Optional[str] = None


class QualificationRequest(BaseModel):
    degree: str
    subject: Optional[str] = None
    university: Optional[str] = None
    year_of_passing: Optional[int] = None
    grade_percentage: Optional[str] = None


class ExperienceRequest(BaseModel):
    organization: str
    designation: Optional[str] = None
    from_date: Optional[date] = None
    to_date: Optional[date] = None
    is_current: bool = False
    description: Optional[str] = None


class LeaveRequest(BaseModel):
    leave_type: str
    from_date: date
    to_date: date
    reason: Optional[str] = None
    substitute_teacher_id: Optional[int] = None


class LeaveApprovalRequest(BaseModel):
    action: str  # approve / reject
    rejection_reason: Optional[str] = None


class TeacherLeavingRequest(BaseModel):
    date_of_leaving: date
    leaving_reason: str
    status: str = "resigned"


class TeacherAttendanceMarkRequest(BaseModel):
    attendance_date: date
    records: list[dict]  # [{"teacher_id": 1, "status": "present"}]


# ── Response Schemas ──────────────────────────────────────────

class TeacherListResponse(BaseModel):
    model_config = {"from_attributes": True}
    id: int
    uuid: str
    employee_id: str
    full_name: str
    full_name_marathi: Optional[str] = None
    salutation: Optional[str] = None
    designation: str
    employee_type: str
    department: Optional[str] = None
    subjects: Optional[str] = None
    mobile: Optional[str] = None
    email: Optional[str] = None
    photo_path: Optional[str] = None
    status: str
    is_active: bool
    date_of_joining: Optional[date] = None
    dob: Optional[date] = None
    gender: Optional[str] = None
    category: Optional[str] = None
    highest_qualification: Optional[str] = None
    classes_assigned: Optional[str] = None


class TeacherDetailResponse(TeacherListResponse):
    first_name: str = ""
    middle_name: Optional[str] = None
    last_name: str = ""
    blood_group: Optional[str] = None
    nationality: str = "Indian"
    religion: Optional[str] = None
    caste: Optional[str] = None
    marital_status: Optional[str] = None
    mother_tongue: Optional[str] = None
    aadhaar_number: Optional[str] = None
    pan_number: Optional[str] = None
    pf_number: Optional[str] = None
    gpf_number: Optional[str] = None
    dcps_account: Optional[str] = None
    pran_number: Optional[str] = None
    teacher_saral_id: Optional[str] = None
    mobile_alt: Optional[str] = None
    email_official: Optional[str] = None
    address_line1: Optional[str] = None
    address_line2: Optional[str] = None
    village: Optional[str] = None
    taluka: Optional[str] = None
    district: Optional[str] = None
    state: str = "Maharashtra"
    pincode: Optional[str] = None
    specialization: Optional[str] = None
    b_ed_year: Optional[int] = None
    d_ed_year: Optional[int] = None
    pay_scale: Optional[str] = None
    basic_salary: Optional[float] = None
    grade_pay: Optional[float] = None
    bank_name: Optional[str] = None
    bank_account_number: Optional[str] = None
    bank_ifsc: Optional[str] = None
    bank_branch: Optional[str] = None
    spouse_name: Optional[str] = None
    father_name: Optional[str] = None
    mother_name: Optional[str] = None
    emergency_contact_name: Optional[str] = None
    emergency_contact_mobile: Optional[str] = None
    emergency_contact_relation: Optional[str] = None
    date_of_confirmation: Optional[date] = None
    date_of_retirement: Optional[date] = None
    date_of_leaving: Optional[date] = None
    leaving_reason: Optional[str] = None
    casual_leave_balance: int = 12
    earned_leave_balance: int = 0
    medical_leave_balance: int = 10
    half_pay_leave_balance: int = 20
    created_at: Optional[datetime] = None


class QualificationResponse(BaseModel):
    model_config = {"from_attributes": True}
    id: int
    degree: str
    subject: Optional[str] = None
    university: Optional[str] = None
    year_of_passing: Optional[int] = None
    grade_percentage: Optional[str] = None


class ExperienceResponse(BaseModel):
    model_config = {"from_attributes": True}
    id: int
    organization: str
    designation: Optional[str] = None
    from_date: Optional[date] = None
    to_date: Optional[date] = None
    is_current: bool = False
    description: Optional[str] = None


class LeaveResponse(BaseModel):
    model_config = {"from_attributes": True}
    id: int
    teacher_id: int
    leave_type: str
    from_date: date
    to_date: date
    days: int
    reason: Optional[str] = None
    status: str
    approved_by: Optional[int] = None
    approved_at: Optional[datetime] = None
    rejection_reason: Optional[str] = None


class TeacherStatsResponse(BaseModel):
    total: int
    active: int
    teaching: int
    non_teaching: int
    male: int
    female: int
    on_leave_today: int
