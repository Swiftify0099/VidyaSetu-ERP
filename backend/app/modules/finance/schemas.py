"""
VidyaSetu ERP — Finance Module Schemas
"""
from datetime import date, datetime
from decimal import Decimal
from typing import Optional
from pydantic import BaseModel, field_validator


# ── Fee Category ──────────────────────────────────────────────

class FeeCategoryRequest(BaseModel):
    name: str
    name_marathi: Optional[str] = None
    description: Optional[str] = None
    is_mandatory: bool = True
    is_recurring: bool = True
    frequency: str = "annual"
    sort_order: int = 0


class StudentInstallmentRequest(BaseModel):
    academic_year_id: int = 1
    installment_name: str
    amount: Decimal
    due_date: date
    remarks: Optional[str] = None



class FeeCategoryResponse(BaseModel):
    model_config = {"from_attributes": True}
    id: int
    name: str
    name_marathi: Optional[str] = None
    description: Optional[str] = None
    is_mandatory: bool
    is_recurring: bool
    frequency: str
    sort_order: int
    is_active: bool


# ── Fee Structure ─────────────────────────────────────────────

class FeeStructureRequest(BaseModel):
    academic_year_id: int
    standard: str
    division: Optional[str] = None
    category_id: int
    amount: Decimal
    due_date: Optional[date] = None
    late_fine_per_day: Decimal = Decimal("0")


class FeeStructureResponse(BaseModel):
    model_config = {"from_attributes": True}
    id: int
    academic_year_id: int
    standard: str
    division: Optional[str] = None
    category_id: int
    amount: Decimal
    due_date: Optional[date] = None
    late_fine_per_day: Decimal
    category: Optional[FeeCategoryResponse] = None


class BulkFeeStructureRequest(BaseModel):
    academic_year_id: int
    structures: list[FeeStructureRequest]


# ── Fee Collection ────────────────────────────────────────────

class FeePaymentRequest(BaseModel):
    student_id: int
    academic_year_id: int
    fee_record_ids: list[int]  # Which fee records this payment covers
    payment_date: date
    payment_mode: str = "cash"
    amount: Decimal
    late_fine: Decimal = Decimal("0")
    concession: Decimal = Decimal("0")
    transaction_id: Optional[str] = None
    bank_name: Optional[str] = None
    cheque_number: Optional[str] = None
    cheque_date: Optional[date] = None
    remarks: Optional[str] = None


class FeePaymentResponse(BaseModel):
    model_config = {"from_attributes": True}
    id: int
    receipt_number: str
    student_id: int
    academic_year_id: int
    payment_date: date
    payment_mode: str
    amount: Decimal
    late_fine: Decimal
    concession: Decimal
    total_received: Decimal
    transaction_id: Optional[str] = None
    bank_name: Optional[str] = None
    cheque_number: Optional[str] = None
    remarks: Optional[str] = None
    created_at: Optional[datetime] = None


# ── Student Fee Summary ────────────────────────────────────────

class StudentFeeRecordResponse(BaseModel):
    model_config = {"from_attributes": True}
    id: int
    student_id: int
    academic_year_id: int
    category_id: int
    amount_due: Decimal
    amount_paid: Decimal
    concession_amount: Decimal
    fine_amount: Decimal
    due_date: Optional[date] = None
    status: str
    category: Optional[FeeCategoryResponse] = None


class StudentFeeSummary(BaseModel):
    student_id: int
    student_name: str
    gr_number: str
    standard: str
    division: Optional[str] = None
    total_due: Decimal
    total_paid: Decimal
    total_concession: Decimal
    total_fine: Decimal
    balance: Decimal
    records: list[StudentFeeRecordResponse]


# ── Fee Discount ──────────────────────────────────────────────

class FeeDiscountRequest(BaseModel):
    student_id: int
    academic_year_id: int
    category_id: Optional[int] = None
    discount_type: str
    discount_amount: Optional[Decimal] = None
    discount_percentage: Optional[Decimal] = None
    reason: Optional[str] = None


class FeeDiscountResponse(BaseModel):
    model_config = {"from_attributes": True}
    id: int
    student_id: int
    academic_year_id: int
    category_id: Optional[int] = None
    discount_type: str
    discount_amount: Optional[Decimal] = None
    discount_percentage: Optional[Decimal] = None
    reason: Optional[str] = None
    approved_by: Optional[int] = None


# ── Expense ───────────────────────────────────────────────────

class ExpenseRequest(BaseModel):
    expense_date: date
    category: str
    sub_category: Optional[str] = None
    description: str
    amount: Decimal
    payment_mode: str = "cash"
    payee: Optional[str] = None
    bill_number: Optional[str] = None
    bill_date: Optional[date] = None
    academic_year_id: Optional[int] = None
    remarks: Optional[str] = None


class ExpenseResponse(BaseModel):
    model_config = {"from_attributes": True}
    id: int
    expense_number: str
    expense_date: date
    category: str
    sub_category: Optional[str] = None
    description: str
    amount: Decimal
    payment_mode: str
    payee: Optional[str] = None
    bill_number: Optional[str] = None
    bill_date: Optional[date] = None
    remarks: Optional[str] = None
    created_at: Optional[datetime] = None


# ── Finance Dashboard ─────────────────────────────────────────

class FinanceStatsResponse(BaseModel):
    total_fee_collected: Decimal
    total_fee_due: Decimal
    total_concessions: Decimal
    pending_amount: Decimal
    total_expenses: Decimal
    net_balance: Decimal
    defaulter_count: int
    collection_this_month: Decimal
    expense_this_month: Decimal
    total_students_with_dues: int


class DefaulterEntry(BaseModel):
    student_id: int
    student_name: str
    gr_number: str
    standard: str
    division: Optional[str] = None
    contact_mobile: Optional[str] = None
    total_due: Decimal
    total_paid: Decimal
    balance: Decimal
    overdue_since: Optional[date] = None
