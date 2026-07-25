"""
VidyaSetu ERP — Library Module Schemas
========================================
Pydantic v2 request/response schemas for all library APIs.
Separated from service.py for clean architecture.
"""
from datetime import date
from decimal import Decimal
from typing import Optional
from pydantic import BaseModel, Field, field_validator


# ── Author ────────────────────────────────────────────────────

class AuthorCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=255)
    name_marathi: Optional[str] = Field(None, max_length=255)
    bio: Optional[str] = None


class AuthorUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=255)
    name_marathi: Optional[str] = None
    bio: Optional[str] = None


class AuthorResponse(BaseModel):
    id: int
    name: str
    name_marathi: Optional[str]
    bio: Optional[str]
    is_active: bool

    model_config = {"from_attributes": True}


# ── Publisher ─────────────────────────────────────────────────

class PublisherCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=300)
    address: Optional[str] = Field(None, max_length=500)
    contact: Optional[str] = Field(None, max_length=100)


class PublisherUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=300)
    address: Optional[str] = None
    contact: Optional[str] = None


class PublisherResponse(BaseModel):
    id: int
    name: str
    address: Optional[str]
    contact: Optional[str]
    is_active: bool

    model_config = {"from_attributes": True}


# ── Book Category ─────────────────────────────────────────────

class CategoryCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=200)
    name_marathi: Optional[str] = Field(None, max_length=200)
    description: Optional[str] = Field(None, max_length=500)
    parent_id: Optional[int] = None


class CategoryResponse(BaseModel):
    id: int
    name: str
    name_marathi: Optional[str]
    description: Optional[str]
    parent_id: Optional[int]
    is_active: bool

    model_config = {"from_attributes": True}


# ── Book ──────────────────────────────────────────────────────

class BookCreate(BaseModel):
    isbn: Optional[str] = Field(None, max_length=20)
    accession_number: Optional[str] = Field(None, max_length=30)
    title: str = Field(..., min_length=1, max_length=500)
    title_marathi: Optional[str] = Field(None, max_length=500)
    author_id: Optional[int] = None
    publisher_id: Optional[int] = None
    category_id: Optional[int] = None
    edition: Optional[str] = Field(None, max_length=50)
    publication_year: Optional[int] = Field(None, ge=1800, le=2100)
    language: str = Field(default="Marathi", max_length=30)
    medium: Optional[str] = Field(None, max_length=50)
    pages: Optional[int] = Field(None, ge=1)
    price: Optional[Decimal] = Field(None, ge=0)
    total_copies: int = Field(default=1, ge=1)
    description: Optional[str] = None
    keywords: Optional[str] = Field(None, max_length=500)
    location_shelf: Optional[str] = Field(None, max_length=100)


class BookUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=500)
    title_marathi: Optional[str] = None
    author_id: Optional[int] = None
    publisher_id: Optional[int] = None
    category_id: Optional[int] = None
    edition: Optional[str] = None
    publication_year: Optional[int] = Field(None, ge=1800, le=2100)
    language: Optional[str] = None
    pages: Optional[int] = Field(None, ge=1)
    price: Optional[Decimal] = Field(None, ge=0)
    description: Optional[str] = None
    keywords: Optional[str] = None
    location_shelf: Optional[str] = None


class BookResponse(BaseModel):
    id: int
    isbn: Optional[str]
    accession_number: Optional[str]
    title: str
    title_marathi: Optional[str]
    author_id: Optional[int]
    publisher_id: Optional[int]
    category_id: Optional[int]
    edition: Optional[str]
    publication_year: Optional[int]
    language: str
    pages: Optional[int]
    price: Optional[Decimal]
    total_copies: int
    available_copies: int
    cover_image_path: Optional[str]
    description: Optional[str]
    keywords: Optional[str]
    location_shelf: Optional[str]
    is_active: bool

    model_config = {"from_attributes": True}


# ── Book Copy ─────────────────────────────────────────────────

class BookCopyCreate(BaseModel):
    book_id: int
    accession_number: str = Field(..., min_length=1, max_length=50)
    condition: str = Field(default="good", pattern="^(good|fair|poor|damaged|lost)$")
    purchase_date: Optional[date] = None
    purchase_price: Optional[Decimal] = Field(None, ge=0)
    vendor: Optional[str] = Field(None, max_length=255)
    remarks: Optional[str] = Field(None, max_length=500)


class BookCopyResponse(BaseModel):
    id: int
    book_id: int
    accession_number: str
    condition: str
    status: str
    purchase_date: Optional[date]
    purchase_price: Optional[Decimal]
    vendor: Optional[str]
    remarks: Optional[str]

    model_config = {"from_attributes": True}


# ── Library Member ────────────────────────────────────────────

class MemberCreate(BaseModel):
    member_type: str = Field(..., pattern="^(student|teacher|staff)$")
    reference_id: int
    full_name: str = Field(..., min_length=2, max_length=300)
    standard: Optional[str] = Field(None, max_length=10)
    division: Optional[str] = Field(None, max_length=5)
    mobile: Optional[str] = Field(None, max_length=15)
    membership_date: date
    membership_expiry: Optional[date] = None
    max_books_allowed: int = Field(default=2, ge=1, le=10)


class MemberUpdate(BaseModel):
    mobile: Optional[str] = None
    membership_expiry: Optional[date] = None
    max_books_allowed: Optional[int] = Field(None, ge=1, le=10)
    is_blocked: Optional[bool] = None


class MemberResponse(BaseModel):
    id: int
    member_id: str
    member_type: str
    reference_id: int
    full_name: str
    standard: Optional[str]
    division: Optional[str]
    mobile: Optional[str]
    membership_date: date
    membership_expiry: Optional[date]
    max_books_allowed: int
    books_currently_issued: int
    total_fine_due: Decimal
    is_blocked: bool
    is_active: bool

    model_config = {"from_attributes": True}


# ── Book Issue / Return ───────────────────────────────────────

class IssueCreate(BaseModel):
    book_id: int
    copy_id: Optional[int] = None
    member_id: int
    issue_date: date
    due_date: date
    fine_per_day: Decimal = Field(default=Decimal("1.00"), ge=0)
    remarks: Optional[str] = Field(None, max_length=500)

    @field_validator("due_date")
    @classmethod
    def due_after_issue(cls, v, info):
        issue = info.data.get("issue_date")
        if issue and v <= issue:
            raise ValueError("Due date must be after issue date")
        return v


class ReturnRequest(BaseModel):
    issue_id: int
    return_date: date
    condition: str = Field(default="good", pattern="^(good|fair|poor|damaged|lost)$")
    remarks: Optional[str] = Field(None, max_length=500)


class IssueResponse(BaseModel):
    id: int
    issue_number: str
    book_id: int
    copy_id: Optional[int]
    member_id: int
    issue_date: date
    due_date: date
    return_date: Optional[date]
    status: str
    fine_amount: Decimal
    fine_paid: bool
    fine_per_day: Decimal
    remarks: Optional[str]

    model_config = {"from_attributes": True}


# ── Library Stats ─────────────────────────────────────────────

class LibraryStatsResponse(BaseModel):
    total_books: int
    total_copies: int
    available_copies: int
    issued_copies: int
    overdue_issues: int
    total_members: int
    active_members: int
    total_fine_collected: Decimal
    today_issues: int
    today_returns: int
