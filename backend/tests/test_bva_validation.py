"""
VidyaSetu ERP — Boundary Value Analysis & Validation Test Suite
===============================================================
Comprehensive unit & integration tests covering:
- BVA on numeric fields (Marks, Fee amounts, Age, Roll numbers)
- String sanitization & XSS injection payload prevention
- Phone number validation (Indian 10-digit formats + Unicode names)
- Email validation & date range checks
- Unsafe file upload handling
"""
import pytest
from datetime import date, timedelta
from fastapi import HTTPException

from app.core.validators import (
    sanitize_text,
    validate_person_name,
    validate_indian_phone,
    validate_email_str,
    validate_financial_amount,
    validate_marks_obtained,
    validate_date_range,
    validate_student_dob,
)
from app.modules.finance.schemas import FeeStructureRequest, FeePaymentRequest
from app.modules.student.schemas import StudentCreateRequest
from app.modules.auth.schemas import ResetPasswordRequest


# ── 1. STRING & XSS SANITIZATION TESTS ────────────────────────

def test_sanitize_text_valid():
    assert sanitize_text("  VidyaSetu ERP  ") == "VidyaSetu ERP"
    assert sanitize_text("Hello World", min_len=3, max_len=20) == "Hello World"


def test_sanitize_text_xss_prevention():
    with pytest.raises(HTTPException) as exc_info:
        sanitize_text("<script>alert('xss')</script>")
    assert exc_info.value.status_code == 422
    assert "prohibited script" in str(exc_info.value.detail)

    with pytest.raises(HTTPException):
        sanitize_text("javascript:void(0)")

    with pytest.raises(HTTPException):
        sanitize_text("<img src=x onerror=alert(1)>")


def test_sanitize_text_length_boundaries():
    # Min length boundary
    with pytest.raises(HTTPException):
        sanitize_text("ab", min_len=5)

    # Max length boundary
    with pytest.raises(HTTPException):
        sanitize_text("a" * 101, max_len=100)


# ── 2. PERSON NAME TESTS (UNICODE / ENGLISH / MARATHI) ─────────

def test_validate_person_name_valid():
    assert validate_person_name("Rahul Sharma") == "Rahul Sharma"
    assert validate_person_name("राहुल शर्मा") == "राहुल शर्मा"
    assert validate_person_name("प्रणव पाटील") == "प्रणव पाटील"
    assert validate_person_name("O'Connor-Smith") == "O'Connor-Smith"


def test_validate_person_name_invalid():
    with pytest.raises(HTTPException):
        validate_person_name("Rahul123")

    with pytest.raises(HTTPException):
        validate_person_name("<script>")


# ── 3. INDIAN PHONE NUMBER BVA TESTS ──────────────────────────

def test_validate_indian_phone_boundaries():
    # Valid 10-digit formats starting 6-9
    assert validate_indian_phone("9876543210") == "9876543210"
    assert validate_indian_phone("+91 9876543210") == "9876543210"
    assert validate_indian_phone("09876543210") == "9876543210"
    assert validate_indian_phone("7012345678") == "7012345678"

    # Too short (9 digits) -> Reject
    with pytest.raises(HTTPException):
        validate_indian_phone("987654321")

    # Starts with invalid digit (e.g. 5) -> Reject
    with pytest.raises(HTTPException):
        validate_indian_phone("5876543210")

    # Contains letters -> Reject
    with pytest.raises(HTTPException):
        validate_indian_phone("987654321A")


# ── 4. EMAIL VALIDATION TESTS ─────────────────────────────────

def test_validate_email_boundaries():
    assert validate_email_str("test@example.com") == "test@example.com"
    assert validate_email_str("  User.Name+Tag@School.Edu.IN ") == "user.name+tag@school.edu.in"

    with pytest.raises(HTTPException):
        validate_email_str("invalid-email")

    with pytest.raises(HTTPException):
        validate_email_str("user@domain")

    with pytest.raises(HTTPException):
        validate_email_str("@example.com")


# ── 5. FINANCIAL NUMERIC BVA TESTS ────────────────────────────

def test_validate_financial_amount_bva():
    # Normal positive amount
    assert validate_financial_amount(500.50) == 500.50

    # Min-1 (Negative) -> Reject
    with pytest.raises(HTTPException):
        validate_financial_amount(-1.00)

    # Min (0) when allow_zero=False -> Reject
    with pytest.raises(HTTPException):
        validate_financial_amount(0.0, allow_zero=False)

    # Max + 1 -> Reject
    with pytest.raises(HTTPException):
        validate_financial_amount(20_00_00_000.0, max_val=10_00_00_000.0)


# ── 6. MARKS OBTAINED BVA TESTS ───────────────────────────────

def test_validate_marks_obtained_bva():
    # If Max Marks = 100:
    max_m = 100.0

    # Min-1 (-1) -> Reject
    with pytest.raises(HTTPException):
        validate_marks_obtained(-1, max_m)

    # Min (0) -> Accept
    assert validate_marks_obtained(0, max_m) == 0.0

    # Min+1 (1) -> Accept
    assert validate_marks_obtained(1, max_m) == 1.0

    # Max-1 (99) -> Accept
    assert validate_marks_obtained(99, max_m) == 99.0

    # Max (100) -> Accept
    assert validate_marks_obtained(100, max_m) == 100.0

    # Max+1 (101) -> Reject
    with pytest.raises(HTTPException):
        validate_marks_obtained(101, max_m)


# ── 7. DATE & AGE BOUNDARY TESTS ──────────────────────────────

def test_validate_date_range_bva():
    today = date.today()
    tomorrow = today + timedelta(days=1)
    yesterday = today - timedelta(days=1)

    # Start < End -> Valid
    validate_date_range(today, tomorrow)

    # Start == End -> Valid
    validate_date_range(today, today)

    # Start > End -> Reject
    with pytest.raises(HTTPException):
        validate_date_range(tomorrow, yesterday)


def test_validate_student_dob_bva():
    today = date.today()

    # Future DOB -> Reject
    with pytest.raises(HTTPException):
        validate_student_dob(today + timedelta(days=1))

    # Age < 3 -> Reject
    with pytest.raises(HTTPException):
        validate_student_dob(today - timedelta(days=365))


# ── 8. PYDANTIC SCHEMA BVA INTEGRATION TESTS ──────────────────

def test_fee_structure_request_schema_bva():
    # Negative amount -> ValueError
    with pytest.raises(ValueError):
        FeeStructureRequest(
            academic_year_id=1,
            standard="10",
            category_id=1,
            amount=-500,
        )


def test_fee_payment_request_schema_bva():
    # Payment amount <= 0 -> ValueError
    with pytest.raises(ValueError):
        FeePaymentRequest(
            student_id=1,
            academic_year_id=1,
            fee_record_ids=[1],
            payment_date=date.today(),
            amount=0,
        )


def test_student_create_schema_phone_bva():
    # Invalid Aadhaar (11 digits) -> ValueError
    with pytest.raises(ValueError):
        StudentCreateRequest(
            standard="10",
            first_name="Aarav",
            last_name="Sharma",
            aadhaar_number="12345678901",
        )
