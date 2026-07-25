"""
VidyaSetu ERP — QR Module Schemas
====================================
"""
from datetime import datetime
from typing import Optional, Any, Dict
from pydantic import BaseModel, Field


class QRGenerateRequest(BaseModel):
    type: str = Field(..., pattern="^(student|library|attendance|fee|learning|certificate)$")
    reference_id: int = Field(..., ge=1)
    label: Optional[str] = None


class QRScanRequest(BaseModel):
    qr_data: str = Field(..., min_length=3)
    action: Optional[str] = "verify"  # verify, mark_attendance, return_book, verify_fee


class QRAttendanceRequest(BaseModel):
    qr_data: str
    standard: Optional[str] = None
    division: Optional[str] = None
    academic_year_id: int = 1


class QRRecordResponse(BaseModel):
    id: int
    uuid: str
    type: str
    reference_id: int
    reference_code: str
    label: str
    sub_label: Optional[str] = None
    qr_data: str
    qr_image_url: Optional[str] = None
    generated_at: str
    is_active: bool

    model_config = {"from_attributes": True}


class ScanResultResponse(BaseModel):
    type: str
    found: bool
    data: Optional[Dict[str, Any]] = None
    message: str
    scan_id: Optional[int] = None
