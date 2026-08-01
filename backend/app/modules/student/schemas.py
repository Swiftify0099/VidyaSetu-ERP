"""
VidyaSetu ERP — Student Module Schemas
=========================================
Pydantic schemas for student API validation.
"""
from datetime import date, datetime
from typing import Optional
from pydantic import BaseModel, field_validator, model_validator


# ── Request Schemas ───────────────────────────────────────────

class StudentCreateRequest(BaseModel):
    """Create a new student record."""
    # Name
    first_name: Optional[str] = None
    middle_name: Optional[str] = None
    last_name: Optional[str] = None
    full_name: Optional[str] = None
    full_name_marathi: Optional[str] = None
    mother_name: Optional[str] = None

    # Placement
    standard: str
    division: Optional[str] = None
    roll_number: Optional[int] = None
    previous_school: Optional[str] = None
    previous_standard: Optional[str] = None
    academic_year_id: Optional[int] = None

    # Personal
    dob: Optional[date] = None
    date_of_birth: Optional[date] = None
    dob_in_words: Optional[str] = None
    place_of_birth: Optional[str] = None
    gender: Optional[str] = None
    blood_group: Optional[str] = None
    nationality: str = "Indian"
    religion: Optional[str] = None
    caste: Optional[str] = None
    sub_caste: Optional[str] = None
    category: Optional[str] = None  # SC/ST/OBC/NT/SBC/Open
    mother_tongue: Optional[str] = None
    aadhaar_number: Optional[str] = None

    # Family
    father_name: Optional[str] = None
    father_name_marathi: Optional[str] = None
    father_occupation: Optional[str] = None
    father_mobile: Optional[str] = None
    father_email: Optional[str] = None
    father_annual_income: Optional[float] = None
    mother_name_full: Optional[str] = None
    mother_name_marathi: Optional[str] = None
    mother_occupation: Optional[str] = None
    mother_mobile: Optional[str] = None
    mother_email: Optional[str] = None
    guardian_name: Optional[str] = None
    guardian_mobile: Optional[str] = None
    guardian_relation: Optional[str] = None

    # Contact
    mobile: Optional[str] = None
    email: Optional[str] = None

    # Address
    address: Optional[str] = None
    address_line1: Optional[str] = None
    address_line2: Optional[str] = None
    village: Optional[str] = None
    city: Optional[str] = None
    taluka: Optional[str] = None
    district: Optional[str] = None
    state: str = "Maharashtra"
    pincode: Optional[str] = None

    # Admission
    admission_date: Optional[date] = None
    admission_standard: Optional[str] = None

    # Government IDs
    student_id_saral: Optional[str] = None
    pen_number: Optional[str] = None
    apaar_id: Optional[str] = None

    # Medical & Preferences
    medical_conditions: Optional[str] = None
    disability: Optional[str] = None
    is_differently_abled: bool = False
    uses_transport: bool = False
    transport_required: Optional[bool] = None
    hostel_required: Optional[bool] = None
    transfer_certificate_no: Optional[str] = None
    house: Optional[str] = None

    # Credentials & Notification
    password: Optional[str] = None
    send_email_notification: bool = True

    @field_validator("standard")
    @classmethod
    def validate_standard(cls, v: str) -> str:
        valid = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"]
        v_str = str(v)
        if v_str not in valid:
            raise ValueError(f"Standard must be one of: {', '.join(valid)}")
        return v_str

    @model_validator(mode="after")
    def populate_aliases_and_names(self):
        # 1. Alias date_of_birth -> dob
        if not self.dob and self.date_of_birth:
            self.dob = self.date_of_birth

        # 2. Alias address -> address_line1
        if not self.address_line1 and self.address:
            self.address_line1 = self.address

        # 3. Alias city -> village
        if not self.village and self.city:
            self.village = self.city

        # 4. Alias transport_required -> uses_transport
        if self.transport_required is not None:
            self.uses_transport = self.transport_required

        # 5. Populate first_name, middle_name, last_name if missing but full_name available
        if not self.first_name:
            if self.full_name:
                parts = [p for p in self.full_name.strip().split() if p]
                if len(parts) == 1:
                    self.first_name = parts[0]
                    self.last_name = self.last_name or "."
                elif len(parts) == 2:
                    self.first_name = parts[0]
                    self.last_name = parts[1]
                elif len(parts) >= 3:
                    self.first_name = parts[0]
                    if not self.middle_name:
                        self.middle_name = " ".join(parts[1:-1])
                    self.last_name = parts[-1]
            else:
                self.first_name = "Student"

        if not self.last_name:
            self.last_name = "."

        return self


class StudentUpdateRequest(BaseModel):
    """Update student record — all fields optional."""
    first_name: Optional[str] = None
    middle_name: Optional[str] = None
    last_name: Optional[str] = None
    full_name_marathi: Optional[str] = None
    standard: Optional[str] = None
    division: Optional[str] = None
    roll_number: Optional[int] = None
    dob: Optional[date] = None
    dob_in_words: Optional[str] = None
    gender: Optional[str] = None
    blood_group: Optional[str] = None
    religion: Optional[str] = None
    caste: Optional[str] = None
    category: Optional[str] = None
    aadhaar_number: Optional[str] = None
    father_name: Optional[str] = None
    father_mobile: Optional[str] = None
    mother_name_full: Optional[str] = None
    mother_mobile: Optional[str] = None
    guardian_name: Optional[str] = None
    guardian_mobile: Optional[str] = None
    mobile: Optional[str] = None
    email: Optional[str] = None
    address_line1: Optional[str] = None
    village: Optional[str] = None
    taluka: Optional[str] = None
    district: Optional[str] = None
    pincode: Optional[str] = None
    student_id_saral: Optional[str] = None
    pen_number: Optional[str] = None
    apaar_id: Optional[str] = None
    medical_conditions: Optional[str] = None
    uses_transport: Optional[bool] = None


class StudentLeavingRequest(BaseModel):
    """Mark student as left/transferred."""
    date_of_leaving: date
    leaving_reason: str
    status: str = "left"  # left / transferred / passed_out


class AttendanceMarkRequest(BaseModel):
    """Mark attendance for multiple students at once."""
    attendance_date: date
    standard: str
    division: Optional[str] = None
    academic_year_id: Optional[int] = None
    period: str = "full_day"
    records: list[dict]  # [{"student_id": 1, "status": "present"}, ...]


class SingleAttendanceRequest(BaseModel):
    """Mark attendance for a single student."""
    student_id: int
    attendance_date: date
    period: str = "full_day"
    status: str = "present"
    reason: Optional[str] = None


# ── Response Schemas ──────────────────────────────────────────

class StudentListResponse(BaseModel):
    """Compact student record for list views."""
    model_config = {"from_attributes": True}
    id: int
    uuid: str
    gr_number: str
    full_name: str
    full_name_marathi: Optional[str] = None
    standard: str
    division: Optional[str] = None
    roll_number: Optional[int] = None
    father_name: Optional[str] = None
    mother_name: Optional[str] = None
    mobile: Optional[str] = None
    photo_path: Optional[str] = None
    status: str
    is_active: bool
    dob: Optional[date] = None
    gender: Optional[str] = None
    category: Optional[str] = None
    admission_date: Optional[date] = None


class StudentDetailResponse(StudentListResponse):
    """Full student record for detail/edit views."""
    admission_number: Optional[str] = None
    first_name: str = ""
    middle_name: Optional[str] = None
    last_name: str = ""
    mother_name_full: Optional[str] = None
    place_of_birth: Optional[str] = None
    dob_in_words: Optional[str] = None
    blood_group: Optional[str] = None
    nationality: str = "Indian"
    religion: Optional[str] = None
    caste: Optional[str] = None
    sub_caste: Optional[str] = None
    mother_tongue: Optional[str] = None
    aadhaar_number: Optional[str] = None
    father_name_marathi: Optional[str] = None
    father_occupation: Optional[str] = None
    father_email: Optional[str] = None
    father_annual_income: Optional[float] = None
    mother_name_marathi: Optional[str] = None
    mother_occupation: Optional[str] = None
    mother_email: Optional[str] = None
    guardian_name: Optional[str] = None
    guardian_mobile: Optional[str] = None
    guardian_relation: Optional[str] = None
    email: Optional[str] = None
    address_line1: Optional[str] = None
    address_line2: Optional[str] = None
    village: Optional[str] = None
    taluka: Optional[str] = None
    district: Optional[str] = None
    state: str = "Maharashtra"
    pincode: Optional[str] = None
    admission_standard: Optional[str] = None
    previous_school: Optional[str] = None
    student_id_saral: Optional[str] = None
    pen_number: Optional[str] = None
    apaar_id: Optional[str] = None
    medical_conditions: Optional[str] = None
    is_differently_abled: bool = False
    uses_transport: bool = False
    tc_issued: bool = False
    tc_number: Optional[str] = None
    tc_issued_date: Optional[date] = None
    date_of_leaving: Optional[date] = None
    leaving_reason: Optional[str] = None
    created_at: Optional[datetime] = None


class AttendanceResponse(BaseModel):
    """Single attendance record response."""
    model_config = {"from_attributes": True}
    id: int
    student_id: int
    attendance_date: date
    standard: str
    division: Optional[str] = None
    period: str
    status: str
    reason: Optional[str] = None
    marked_at: Optional[datetime] = None


class AttendanceSummaryResponse(BaseModel):
    """Attendance summary for a student/class."""
    total_days: int
    present_days: int
    absent_days: int
    late_days: int
    half_day: int
    attendance_percentage: float
