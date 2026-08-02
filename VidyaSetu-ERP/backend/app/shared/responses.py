"""
VidyaSetu ERP — Standard API Responses
========================================
All API endpoints must use these response models.
Consistent format across the entire application.
"""
from typing import Any, Generic, List, Optional, TypeVar
from pydantic import BaseModel

T = TypeVar("T")


class APIResponse(BaseModel, Generic[T]):
    """Standard success response."""
    success: bool = True
    message: str = "Operation successful"
    data: Optional[T] = None

    @classmethod
    def ok(cls, data: Any = None, message: str = "Operation successful") -> "APIResponse":
        return cls(success=True, message=message, data=data)

    @classmethod
    def created(cls, data: Any = None, message: str = "Created successfully") -> "APIResponse":
        return cls(success=True, message=message, data=data)


class FieldError(BaseModel):
    """Single field validation error."""
    field: str
    message: str


class ErrorResponse(BaseModel):
    """Standard error response."""
    success: bool = False
    message: str
    errors: Optional[List[FieldError]] = None
    code: Optional[str] = None

    @classmethod
    def bad_request(cls, message: str, errors: List[FieldError] | None = None) -> "ErrorResponse":
        return cls(success=False, message=message, errors=errors, code="BAD_REQUEST")

    @classmethod
    def unauthorized(cls, message: str = "Authentication required") -> "ErrorResponse":
        return cls(success=False, message=message, code="UNAUTHORIZED")

    @classmethod
    def forbidden(cls, message: str = "Access denied") -> "ErrorResponse":
        return cls(success=False, message=message, code="FORBIDDEN")

    @classmethod
    def not_found(cls, message: str = "Record not found") -> "ErrorResponse":
        return cls(success=False, message=message, code="NOT_FOUND")

    @classmethod
    def conflict(cls, message: str) -> "ErrorResponse":
        return cls(success=False, message=message, code="CONFLICT")

    @classmethod
    def server_error(cls, message: str = "Internal server error") -> "ErrorResponse":
        return cls(success=False, message=message, code="SERVER_ERROR")


class PaginationMeta(BaseModel):
    """Pagination metadata."""
    page: int
    per_page: int
    total: int
    total_pages: int
    has_next: bool
    has_prev: bool


class PaginatedResponse(BaseModel, Generic[T]):
    """Paginated list response."""
    success: bool = True
    message: str = "Data retrieved successfully"
    data: List[T]
    meta: PaginationMeta

    @classmethod
    def ok(
        cls,
        data: List[Any],
        page: int,
        per_page: int,
        total: int,
        message: str = "Data retrieved successfully",
    ) -> "PaginatedResponse":
        total_pages = max(1, (total + per_page - 1) // per_page)
        return cls(
            success=True,
            message=message,
            data=data,
            meta=PaginationMeta(
                page=page,
                per_page=per_page,
                total=total,
                total_pages=total_pages,
                has_next=page < total_pages,
                has_prev=page > 1,
            ),
        )
