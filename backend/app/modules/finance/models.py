"""
VidyaSetu ERP — Finance Module Models
======================================
Complete school finance management:
- Fee Categories & Structures (per standard)
- Fee Collection & Receipts
- Concessions / Scholarships
- Expense Management
- Budget Allocation
- Salary Disbursement references
"""
from datetime import date, datetime
from decimal import Decimal
from sqlalchemy import (
    BigInteger, Boolean, Date, DateTime, ForeignKey,
    Integer, Numeric, String, Text, UniqueConstraint
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import BaseModel


class FeeCategory(BaseModel):
    """
    Master fee categories.
    e.g. Tuition Fee, Admission Fee, Library Fee, Sports Fee, Exam Fee, etc.
    """
    __tablename__ = "fee_categories"

    name: Mapped[str] = mapped_column(String(200), nullable=False, unique=True, index=True)
    name_marathi: Mapped[str | None] = mapped_column(String(200), nullable=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_mandatory: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    is_recurring: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    # recurring = monthly/quarterly/annual; one-time = admission/exam
    frequency: Mapped[str] = mapped_column(String(20), nullable=False, default="annual")
    # annual / half_yearly / quarterly / monthly / one_time
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)


class FeeStructure(BaseModel):
    """
    Fee amount per category per standard per academic year.
    This is the master rate card.
    """
    __tablename__ = "fee_structures"
    __table_args__ = (
        UniqueConstraint("academic_year_id", "standard", "category_id", name="uq_fee_structure"),
    )

    academic_year_id: Mapped[int] = mapped_column(BigInteger, nullable=False, index=True)
    standard: Mapped[str] = mapped_column(String(10), nullable=False)
    # 1 through 12, KG, Pre-Primary
    division: Mapped[str | None] = mapped_column(String(5), nullable=True)
    # None = applies to all divisions
    category_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("fee_categories.id"), nullable=False)
    amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    due_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    late_fine_per_day: Mapped[Decimal] = mapped_column(Numeric(8, 2), nullable=False, default=0)

    category: Mapped["FeeCategory"] = relationship("FeeCategory")


class StudentFeeRecord(BaseModel):
    """
    Student-wise fee ledger.
    Auto-created when student is admitted or year starts.
    """
    __tablename__ = "student_fee_records"
    __table_args__ = (
        UniqueConstraint("student_id", "academic_year_id", "category_id",
                         name="uq_student_fee_record"),
    )

    student_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("students.id"), nullable=False, index=True)
    academic_year_id: Mapped[int] = mapped_column(BigInteger, nullable=False)
    category_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("fee_categories.id"), nullable=False)
    amount_due: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    amount_paid: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False, default=0)
    concession_amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False, default=0)
    fine_amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False, default=0)
    due_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="pending")
    # pending / partial / paid / waived / concession

    student: Mapped["Student"] = relationship("Student")  # type: ignore
    category: Mapped["FeeCategory"] = relationship("FeeCategory")
    payments: Mapped[list["FeePayment"]] = relationship("FeePayment", back_populates="fee_record")


class FeePayment(BaseModel):
    """
    Individual payment transaction.
    Each row = one payment receipt.
    """
    __tablename__ = "fee_payments"

    receipt_number: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, index=True)
    student_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("students.id"), nullable=False, index=True)
    academic_year_id: Mapped[int] = mapped_column(BigInteger, nullable=False)

    payment_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    payment_mode: Mapped[str] = mapped_column(String(30), nullable=False, default="cash")
    # cash / cheque / upi / neft / rtgs / dd / online
    amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    late_fine: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False, default=0)
    concession: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False, default=0)
    total_received: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)

    # Cheque / UPI details
    transaction_id: Mapped[str | None] = mapped_column(String(100), nullable=True)
    bank_name: Mapped[str | None] = mapped_column(String(200), nullable=True)
    cheque_number: Mapped[str | None] = mapped_column(String(50), nullable=True)
    cheque_date: Mapped[date | None] = mapped_column(Date, nullable=True)

    remarks: Mapped[str | None] = mapped_column(String(500), nullable=True)
    collected_by: Mapped[int | None] = mapped_column(BigInteger, nullable=True)

    # Which fee records this payment covers
    fee_record_id: Mapped[int | None] = mapped_column(BigInteger, ForeignKey("student_fee_records.id"), nullable=True)

    student: Mapped["Student"] = relationship("Student")  # type: ignore
    fee_record: Mapped["StudentFeeRecord | None"] = relationship("StudentFeeRecord", back_populates="payments")


class FeeDiscount(BaseModel):
    """
    Concession / Scholarship / Waiver record.
    Attached to a student for a specific category.
    """
    __tablename__ = "fee_discounts"

    student_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("students.id"), nullable=False, index=True)
    academic_year_id: Mapped[int] = mapped_column(BigInteger, nullable=False)
    category_id: Mapped[int | None] = mapped_column(BigInteger, ForeignKey("fee_categories.id"), nullable=True)
    # None = applies to all fees
    discount_type: Mapped[str] = mapped_column(String(50), nullable=False)
    # scholarship / sibling / staff_ward / RTE / government / management / sports / merit
    discount_amount: Mapped[Decimal | None] = mapped_column(Numeric(12, 2), nullable=True)
    discount_percentage: Mapped[Decimal | None] = mapped_column(Numeric(5, 2), nullable=True)
    reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    approved_by: Mapped[int | None] = mapped_column(BigInteger, nullable=True)


class Expense(BaseModel):
    """
    School expense ledger.
    All outgoing payments from school account.
    """
    __tablename__ = "expenses"

    expense_number: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, index=True)
    expense_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    category: Mapped[str] = mapped_column(String(100), nullable=False)
    # Salaries / Maintenance / Stationery / Utilities / Transport / Events / Furniture / Equipment / Other
    sub_category: Mapped[str | None] = mapped_column(String(100), nullable=True)
    description: Mapped[str] = mapped_column(String(500), nullable=False)
    amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    payment_mode: Mapped[str] = mapped_column(String(30), nullable=False, default="cash")
    payee: Mapped[str | None] = mapped_column(String(255), nullable=True)
    bill_number: Mapped[str | None] = mapped_column(String(100), nullable=True)
    bill_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    attachment_path: Mapped[str | None] = mapped_column(String(500), nullable=True)
    approved_by: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    academic_year_id: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    remarks: Mapped[str | None] = mapped_column(Text, nullable=True)


# ── Aliases for exports compatibility ──────────────────────────
FeeReceipt = FeePayment
FeeReceiptItem = StudentFeeRecord



# ── Aliases ────────────────────────────────────────────────────
FeeReceipt = FeePayment
FeeReceiptItem = StudentFeeRecord

