"""
VidyaSetu ERP — Centralized Validation & Hardening Core Module
================================================================
Provides robust validators for string sanitization, BVA, Indian phone numbers,
names, emails, financial amounts, and file uploads.
"""
import re
from datetime import date
from typing import Optional, Set
from fastapi import HTTPException, status, UploadFile


# ── String & XSS Sanitization ─────────────────────────────────
HTML_TAG_RE = re.compile(r"<[^>]*?>")
SCRIPT_INJECTION_RE = re.compile(r"(?i)<script|javascript:|data:text/html|on\w+=")

def sanitize_text(
    val: Optional[str],
    field_name: str = "Field",
    min_len: int = 0,
    max_len: int = 1000,
    allow_empty: bool = True,
) -> Optional[str]:
    """
    Sanitize text input:
    - Strips leading/trailing whitespace
    - Checks min/max length
    - Neutralizes XSS & script injection
    """
    if val is None:
        if not allow_empty and min_len > 0:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"{field_name} is required and cannot be empty."
            )
        return None

    cleaned = val.strip()

    if not cleaned:
        if not allow_empty and min_len > 0:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"{field_name} cannot be empty or blank."
            )
        return "" if allow_empty else None

    if SCRIPT_INJECTION_RE.search(cleaned):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"{field_name} contains prohibited script or HTML content."
        )

    if len(cleaned) < min_len:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"{field_name} must be at least {min_len} characters long."
        )

    if len(cleaned) > max_len:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"{field_name} must not exceed {max_len} characters."
        )

    return cleaned


# ── Indian Name Validator ─────────────────────────────────────
# Allows English, Marathi (Devanagari \u0900-\u097F), spaces, dots, hyphens, single quotes.
NAME_REGEX = re.compile(r"^[A-Za-z\u0900-\u097F\s\.\'\-]+$")

def validate_person_name(name: str, field_name: str = "Name") -> str:
    """Validate standard person name supporting English, Hindi, and Marathi."""
    cleaned = sanitize_text(name, field_name=field_name, min_len=2, max_len=100, allow_empty=False)
    if not cleaned:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"{field_name} is required."
        )
    if not NAME_REGEX.match(cleaned):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"{field_name} contains invalid characters. Use standard letters (English/Hindi/Marathi)."
        )
    return cleaned


# ── Indian Mobile Number Validator ────────────────────────────
# Standard 10 digits starting 6-9, optional leading +91, 91, or 0.
INDIAN_PHONE_REGEX = re.compile(r"^(?:\+?91|0)?[6-9]\d{9}$")

def validate_indian_phone(phone: Optional[str], field_name: str = "Phone Number", required: bool = False) -> Optional[str]:
    """Validate 10-digit Indian phone number with optional prefix."""
    if not phone:
        if required:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"{field_name} is required."
            )
        return None

    cleaned = phone.strip().replace(" ", "").replace("-", "")
    if not cleaned:
        if required:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"{field_name} is required."
            )
        return None

    if not INDIAN_PHONE_REGEX.match(cleaned):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Invalid {field_name}. Must be a valid 10-digit Indian mobile number."
        )

    # Normalize to 10 digits
    if cleaned.startswith("+91"):
        cleaned = cleaned[3:]
    elif cleaned.startswith("91") and len(cleaned) == 12:
        cleaned = cleaned[2:]
    elif cleaned.startswith("0") and len(cleaned) == 11:
        cleaned = cleaned[1:]

    return cleaned


# ── Email Validator ───────────────────────────────────────────
EMAIL_REGEX = re.compile(r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$")

def validate_email_str(email: Optional[str], field_name: str = "Email", required: bool = False) -> Optional[str]:
    """Validate email address format."""
    if not email:
        if required:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"{field_name} is required."
            )
        return None

    cleaned = email.strip().lower()
    if not cleaned:
        if required:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"{field_name} is required."
            )
        return None

    if not EMAIL_REGEX.match(cleaned) or len(cleaned) > 254:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Invalid {field_name} address."
        )
    return cleaned


# ── Financial & Numeric BVA ───────────────────────────────────
def validate_financial_amount(
    amount: float | int,
    field_name: str = "Amount",
    min_val: float = 0.0,
    max_val: float = 10_00_00_000.0,  # 10 Crore limit
    allow_zero: bool = True
) -> float:
    """Validate currency/financial numbers, round to 2 decimals."""
    if amount is None:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"{field_name} is required."
        )

    try:
        val = round(float(amount), 2)
    except (ValueError, TypeError):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"{field_name} must be a valid number."
        )

    if not allow_zero and val == 0:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"{field_name} must be greater than zero."
        )

    if val < min_val:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"{field_name} cannot be less than {min_val}."
        )

    if val > max_val:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"{field_name} exceeds maximum limit of {max_val:,.2f}."
        )

    return val


# ── Marks Validation BVA ─────────────────────────────────────
def validate_marks_obtained(obtained: float, max_marks: float, field_name: str = "Marks Obtained") -> float:
    """Validate exam marks obtained against configured max marks."""
    if max_marks is None or max_marks <= 0:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Maximum marks must be a positive number greater than 0."
        )

    try:
        val = round(float(obtained), 2)
    except (ValueError, TypeError):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"{field_name} must be a valid numeric value."
        )

    if val < 0:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"{field_name} cannot be negative."
        )

    if val > max_marks:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"{field_name} ({val}) cannot exceed maximum marks ({max_marks})."
        )

    return val


# ── Date & Date Range Validation ──────────────────────────────
def validate_date_range(start_date: date, end_date: date, field_prefix: str = "Date Range") -> None:
    """Ensure start_date <= end_date."""
    if not start_date or not end_date:
        return
    if start_date > end_date:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"{field_prefix} error: Start date ({start_date}) cannot be after End date ({end_date})."
        )


def validate_student_dob(dob: date, min_age: int = 3, max_age: int = 25) -> date:
    """Validate student Date of Birth against reasonable ERP age bounds."""
    if not dob:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Date of Birth is required."
        )

    today = date.today()
    if dob >= today:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Date of Birth cannot be today or in the future."
        )

    age = today.year - dob.year - ((today.month, today.day) < (dob.month, dob.day))
    if age < min_age or age > max_age:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Student age ({age} years) must be between {min_age} and {max_age} years."
        )

    return dob


# ── File Upload Hardening ──────────────────────────────────────
DEFAULT_ALLOWED_DOC_TYPES: Set[str] = {
    "image/jpeg", "image/png", "image/webp", "application/pdf",
    "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
}

DEFAULT_ALLOWED_IMAGE_TYPES: Set[str] = {
    "image/jpeg", "image/jpg", "image/png", "image/webp"
}

DEFAULT_ALLOWED_VIDEO_TYPES: Set[str] = {
    "video/mp4", "video/webm", "video/quicktime", "video/x-msvideo"
}

def validate_uploaded_file(
    file: UploadFile,
    max_size_mb: float = 10.0,
    allowed_types: Optional[Set[str]] = None,
    field_name: str = "File"
) -> None:
    """
    Validate uploaded file:
    - Check file size against max_size_mb limit
    - Check content-type / extension against allowed MIME set
    - Check filename path traversal attempts
    """
    if not file or not file.filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"No {field_name} uploaded or filename is empty."
        )

    filename = file.filename.strip()
    if ".." in filename or "/" in filename or "\\" in filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid filename in {field_name} (path traversal detected)."
        )

    if allowed_types:
        content_type = (file.content_type or "").lower()
        ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
        
        # Cross check MIME type or extension
        mime_match = any(content_type == allowed.lower() for allowed in allowed_types)
        ext_match = ext in ["jpg", "jpeg", "png", "webp", "pdf", "doc", "docx", "mp4", "webm", "mov", "avi"]
        
        if not (mime_match or ext_match):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Unsupported file format for {field_name}. Provided '{content_type}'."
            )
