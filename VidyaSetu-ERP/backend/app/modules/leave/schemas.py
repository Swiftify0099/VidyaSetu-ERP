"""
VidyaSetu ERP — Leave Module Schemas
"""
from datetime import date
from decimal import Decimal
from typing import Optional
from pydantic import BaseModel, Field, field_validator, model_validator


# ── Leave Type ────────────────────────────────────────────────

class LeaveTypeCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    name_marathi: Optional[str] = Field(None, max_length=100)
    code: str = Field(..., min_length=1, max_length=20)
    annual_quota: Decimal = Field(default=Decimal("0"), ge=0, le=365)
    is_paid: bool = True
    is_half_day_allowed: bool = False
    requires_document: bool = False
    carry_forward: bool = False
    max_carry_forward_days: Optional[Decimal] = Field(None, ge=0)
    min_days_notice: int = Field(default=0, ge=0)
    description: Optional[str] = Field(None, max_length=500)


class LeaveTypeUpdate(BaseModel):
    name: Optional[str] = None
    name_marathi: Optional[str] = None
    annual_quota: Optional[Decimal] = Field(None, ge=0)
    is_paid: Optional[bool] = None
    is_half_day_allowed: Optional[bool] = None
    requires_document: Optional[bool] = None
    carry_forward: Optional[bool] = None
    max_carry_forward_days: Optional[Decimal] = None
    min_days_notice: Optional[int] = None
    description: Optional[str] = None


class LeaveTypeResponse(BaseModel):
    id: int
    name: str
    name_marathi: Optional[str]
    code: str
    annual_quota: Decimal
    is_paid: bool
    is_half_day_allowed: bool
    requires_document: bool
    carry_forward: bool
    max_carry_forward_days: Optional[Decimal]
    min_days_notice: int
    description: Optional[str]
    is_active: bool
    model_config = {"from_attributes": True}


# ── Leave Balance ─────────────────────────────────────────────

class LeaveBalanceResponse(BaseModel):
    id: int
    employee_id: int
    leave_type_id: int
    leave_type_name: str
    leave_type_code: str
    academic_year: str
    entitled_days: Decimal
    used_days: Decimal
    pending_days: Decimal
    carry_forward_days: Decimal
    available_days: Decimal
    model_config = {"from_attributes": True}


# ── Leave Application ─────────────────────────────────────────

class LeaveApplyRequest(BaseModel):
    leave_type_id: int
    academic_year: str = Field(..., pattern=r"^\d{4}-\d{4}$")
    from_date: date
    to_date: date
    is_half_day: bool = False
    half_day_session: Optional[str] = Field(None, pattern="^(morning|afternoon)$")
    reason: str = Field(..., min_length=5, max_length=1000)
    substitute_teacher_id: Optional[int] = None

    @field_validator("to_date")
    @classmethod
    def end_after_start(cls, v, info):
        start = info.data.get("from_date")
        if start and v < start:
            raise ValueError("to_date must be on or after from_date")
        return v

    @model_validator(mode="after")
    def half_day_session_required(self):
        if self.is_half_day and not self.half_day_session:
            raise ValueError("half_day_session required when is_half_day is True")
        return self


class LeaveApproveRequest(BaseModel):
    action: str = Field(..., pattern="^(approve|reject)$")
    rejection_reason: Optional[str] = Field(None, max_length=500)

    @model_validator(mode="after")
    def reason_required_for_reject(self):
        if self.action == "reject" and not self.rejection_reason:
            raise ValueError("rejection_reason required when rejecting leave")
        return self


class LeaveApplicationResponse(BaseModel):
    id: int
    application_number: str
    employee_id: int
    employee_name: str
    employee_code: Optional[str]
    leave_type_id: int
    academic_year: str
    from_date: date
    to_date: date
    total_days: Decimal
    is_half_day: bool
    half_day_session: Optional[str]
    reason: str
    document_path: Optional[str]
    status: str
    approved_by: Optional[int]
    approved_on: Optional[date]
    rejection_reason: Optional[str]
    substitute_teacher_id: Optional[int]
    model_config = {"from_attributes": True}


# ── Holiday Calendar ──────────────────────────────────────────

class HolidayCreate(BaseModel):
    holiday_date: date
    name: str = Field(..., min_length=2, max_length=200)
    name_marathi: Optional[str] = Field(None, max_length=200)
    academic_year: str = Field(..., pattern=r"^\d{4}-\d{4}$")
    holiday_type: str = Field(default="national",
                              pattern="^(national|state|local|school|optional)$")
    is_optional: bool = False
    description: Optional[str] = Field(None, max_length=300)


class HolidayResponse(BaseModel):
    id: int
    holiday_date: date
    name: str
    name_marathi: Optional[str]
    academic_year: str
    holiday_type: str
    is_optional: bool
    description: Optional[str]
    is_active: bool
    model_config = {"from_attributes": True}


# ── Stats ─────────────────────────────────────────────────────

class LeaveStatsResponse(BaseModel):
    total_applications: int
    pending: int
    approved: int
    rejected: int
    cancelled: int
    total_days_on_leave_this_month: Decimal
    upcoming_holidays: int
