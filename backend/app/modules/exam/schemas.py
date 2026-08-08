"""
VidyaSetu ERP — Examination Module Schemas
===========================================
Pydantic v2 request/response schemas for all exam-related APIs.
Separated from service.py for clean architecture.
"""
from datetime import date
from decimal import Decimal
from typing import Optional, Any
from pydantic import BaseModel, Field, field_validator, model_validator


# ── Exam Type ─────────────────────────────────────────────────

class ExamTypeCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=200)
    name_marathi: Optional[str] = Field(None, max_length=200)
    academic_year_id: int
    sequence: int = Field(default=1, ge=1)
    max_marks: int = Field(default=100, ge=1)
    passing_marks: int = Field(default=35, ge=0)
    is_grade_system: bool = False
    weightage: Decimal = Field(default=Decimal("100.00"), ge=0, le=100)
    description: Optional[str] = Field(None, max_length=500)

    @field_validator("passing_marks")
    @classmethod
    def passing_lte_max(cls, v: int, info) -> int:
        max_m = info.data.get("max_marks", 100)
        if v > max_m:
            raise ValueError("Passing marks cannot exceed max marks")
        return v


class ExamTypeUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=200)
    name_marathi: Optional[str] = Field(None, max_length=200)
    sequence: Optional[int] = Field(None, ge=1)
    max_marks: Optional[int] = Field(None, ge=1)
    passing_marks: Optional[int] = Field(None, ge=0)
    weightage: Optional[Decimal] = Field(None, ge=0, le=100)
    description: Optional[str] = None


class ExamTypeResponse(BaseModel):
    id: int
    name: str
    name_marathi: Optional[str]
    academic_year_id: int
    sequence: int
    max_marks: int
    passing_marks: int
    is_grade_system: bool
    weightage: Decimal
    description: Optional[str]
    is_active: bool

    model_config = {"from_attributes": True}


# ── Exam ──────────────────────────────────────────────────────

class ExamCreate(BaseModel):
    exam_type_id: int
    academic_year_id: int
    standard: str = Field(..., min_length=1, max_length=10)
    exam_date_from: Optional[date] = None
    exam_date_to: Optional[date] = None
    remarks: Optional[str] = Field(None, max_length=500)

    @field_validator("exam_date_to")
    @classmethod
    def end_after_start(cls, v, info):
        start = info.data.get("exam_date_from")
        if start and v and v < start:
            raise ValueError("Exam end date must be on or after start date")
        return v


class ExamUpdate(BaseModel):
    exam_date_from: Optional[date] = None
    exam_date_to: Optional[date] = None
    result_declared: Optional[bool] = None
    result_date: Optional[date] = None
    remarks: Optional[str] = None


class ExamResponse(BaseModel):
    id: int
    exam_type_id: int
    academic_year_id: int
    standard: str
    exam_date_from: Optional[date]
    exam_date_to: Optional[date]
    result_declared: bool
    result_date: Optional[date]
    remarks: Optional[str]
    is_active: bool

    model_config = {"from_attributes": True}


# ── Exam Subject ──────────────────────────────────────────────

class ExamSubjectCreate(BaseModel):
    subject_name: str = Field(..., min_length=1, max_length=150)
    subject_name_marathi: Optional[str] = Field(None, max_length=150)
    subject_code: Optional[str] = Field(None, max_length=20)
    max_marks: int = Field(default=100, ge=1)
    passing_marks: int = Field(default=35, ge=0)
    theory_max: Optional[int] = Field(None, ge=0)
    practical_max: Optional[int] = Field(None, ge=0)
    is_optional: bool = False
    sort_order: int = 0


class ExamSubjectResponse(BaseModel):
    id: int
    exam_id: int
    subject_name: str
    subject_name_marathi: Optional[str]
    subject_code: Optional[str]
    max_marks: int
    passing_marks: int
    theory_max: Optional[int]
    practical_max: Optional[int]
    is_optional: bool
    sort_order: int

    model_config = {"from_attributes": True}


# ── Marks Entry ───────────────────────────────────────────────

class MarkEntry(BaseModel):
    student_id: int
    marks_obtained: Optional[Decimal] = Field(None, ge=0)
    theory_marks: Optional[Decimal] = Field(None, ge=0)
    practical_marks: Optional[Decimal] = Field(None, ge=0)
    is_absent: bool = False
    is_exempted: bool = False
    remarks: Optional[str] = Field(None, max_length=200)


class BulkMarkEntryRequest(BaseModel):
    exam_id: Optional[int] = None
    exam_subject_id: Optional[int] = None
    marks: Optional[list[MarkEntry]] = None
    entries: Optional[list[MarkEntry]] = None

    @model_validator(mode="before")
    @classmethod
    def populate_marks_or_entries(cls, data: Any) -> Any:
        if isinstance(data, dict):
            items = data.get("marks") or data.get("entries") or []
            if "marks" not in data or data["marks"] is None:
                data["marks"] = items
            if "entries" not in data or data["entries"] is None:
                data["entries"] = items
            if items and isinstance(items, list) and len(items) > 0 and isinstance(items[0], dict):
                if not data.get("exam_id") and items[0].get("exam_id"):
                    data["exam_id"] = items[0]["exam_id"]
                if not data.get("exam_subject_id") and items[0].get("exam_subject_id"):
                    data["exam_subject_id"] = items[0]["exam_subject_id"]
        return data



class MarkResponse(BaseModel):
    id: int
    exam_id: int
    exam_subject_id: int
    student_id: int
    marks_obtained: Optional[Decimal]
    theory_marks: Optional[Decimal]
    practical_marks: Optional[Decimal]
    grade: Optional[str]
    is_absent: bool
    is_exempted: bool
    remarks: Optional[str]

    model_config = {"from_attributes": True}


# ── Result ────────────────────────────────────────────────────

class ExamResultResponse(BaseModel):
    id: int
    exam_id: int
    student_id: int
    total_marks: Decimal
    max_marks: Decimal
    percentage: Decimal
    grade: Optional[str]
    result: str
    rank: Optional[int]
    subjects_passed: int
    subjects_failed: int
    subjects_absent: int
    remarks: Optional[str]

    model_config = {"from_attributes": True}


# ── Stats ─────────────────────────────────────────────────────

class ExamStatsResponse(BaseModel):
    total_exams: int
    total_exam_types: int
    pending_results: int
    declared_results: int
    academic_year_id: int
