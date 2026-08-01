"""
VidyaSetu ERP — Finance Service
=================================
All fee, collection, receipt, expense business logic.
Receipt number auto-generation (HMMV/YYYY-YY/NNNNN).
"""
from datetime import date, datetime, timezone
from decimal import Decimal
from io import BytesIO
from typing import Optional

from fastapi import HTTPException
from sqlalchemy import and_, extract, func, select, or_
from sqlalchemy.orm import Session, joinedload

from app.core.config import settings
from app.modules.finance.models import (
    FeeCategory, FeeStructure, StudentFeeRecord,
    FeePayment, FeeDiscount, Expense
)
from app.modules.finance.schemas import (
    FeeCategoryRequest, FeeStructureRequest, FeePaymentRequest,
    FeeDiscountRequest, ExpenseRequest,
    StudentFeeSummary, FinanceStatsResponse, DefaulterEntry,
)
from app.shared.audit import AuditService


def _receipt_number(db: Session) -> str:
    """Generate: HMMV/2026-27/00001"""
    today = date.today()
    yr_start = today.year if today.month >= 6 else today.year - 1
    yr_label = f"{yr_start}-{str(yr_start + 1)[-2:]}"
    prefix = f"{settings.SCHOOL_CODE or 'HMMV'}/{yr_label}/"

    last = db.scalar(
        select(FeePayment.receipt_number)
        .where(FeePayment.receipt_number.like(f"{prefix}%"))
        .where(FeePayment.is_deleted == False)
        .order_by(FeePayment.receipt_number.desc())
    )
    try:
        seq = int(last.split("/")[-1]) + 1 if last else 1
    except Exception:
        seq = 1
    return f"{prefix}{seq:05d}"


def _expense_number(db: Session) -> str:
    year = str(date.today().year)
    prefix = f"{settings.SCHOOL_CODE or 'HMMV'}-EXP-{year}-"
    last = db.scalar(
        select(Expense.expense_number)
        .where(Expense.expense_number.like(f"{prefix}%"))
        .where(Expense.is_deleted == False)
        .order_by(Expense.expense_number.desc())
    )
    try:
        seq = int(last.split("-")[-1]) + 1 if last else 1
    except Exception:
        seq = 1
    return f"{prefix}{seq:04d}"


# ── Fee Category Service ──────────────────────────────────────

class FeeCategoryService:
    @staticmethod
    def create(db: Session, data: FeeCategoryRequest, created_by: int) -> FeeCategory:
        cat = FeeCategory(**data.model_dump(), created_by=created_by)
        db.add(cat); db.commit(); db.refresh(cat)
        return cat

    @staticmethod
    def get_all(db: Session) -> list[FeeCategory]:
        return list(db.scalars(
            select(FeeCategory)
            .where(FeeCategory.is_deleted == False)
            .order_by(FeeCategory.sort_order, FeeCategory.name)
        ).all())

    @staticmethod
    def get_by_id(db: Session, cat_id: int) -> FeeCategory:
        c = db.scalar(select(FeeCategory).where(FeeCategory.id == cat_id, FeeCategory.is_deleted == False))
        if not c: raise HTTPException(404, "Fee category not found.")
        return c

    @staticmethod
    def update(db: Session, cat_id: int, data: FeeCategoryRequest, updated_by: int) -> FeeCategory:
        c = FeeCategoryService.get_by_id(db, cat_id)
        for k, v in data.model_dump(exclude_none=True).items():
            setattr(c, k, v)
        c.updated_by = updated_by
        db.commit(); db.refresh(c); return c

    @staticmethod
    def delete(db: Session, cat_id: int, deleted_by: int) -> None:
        c = FeeCategoryService.get_by_id(db, cat_id)
        c.soft_delete(deleted_by=deleted_by); db.commit()


# ── Fee Structure Service ─────────────────────────────────────

class FeeStructureService:
    @staticmethod
    def upsert(db: Session, data: FeeStructureRequest, created_by: int) -> FeeStructure:
        existing = db.scalar(
            select(FeeStructure).where(
                FeeStructure.academic_year_id == data.academic_year_id,
                FeeStructure.standard == data.standard,
                FeeStructure.category_id == data.category_id,
                FeeStructure.is_deleted == False,
            )
        )
        if existing:
            existing.amount = data.amount
            existing.due_date = data.due_date
            existing.late_fine_per_day = data.late_fine_per_day
            existing.updated_by = created_by
            db.commit(); db.refresh(existing); return existing

        fs = FeeStructure(**data.model_dump(), created_by=created_by)
        db.add(fs); db.commit(); db.refresh(fs); return fs

    @staticmethod
    def bulk_upsert(db: Session, academic_year_id: int,
                    structures: list[FeeStructureRequest], created_by: int) -> int:
        count = 0
        for s in structures:
            s.academic_year_id = academic_year_id
            FeeStructureService.upsert(db, s, created_by)
            count += 1
        return count

    @staticmethod
    def get_by_year_standard(db: Session, academic_year_id: int,
                              standard: str) -> list[FeeStructure]:
        return list(db.scalars(
            select(FeeStructure)
            .options(joinedload(FeeStructure.category))
            .where(
                FeeStructure.academic_year_id == academic_year_id,
                FeeStructure.standard == standard,
                FeeStructure.is_deleted == False,
            )
            .order_by(FeeStructure.category_id)
        ).all())

    @staticmethod
    def get_all_by_year(db: Session, academic_year_id: int) -> list[FeeStructure]:
        return list(db.scalars(
            select(FeeStructure)
            .options(joinedload(FeeStructure.category))
            .where(FeeStructure.academic_year_id == academic_year_id,
                   FeeStructure.is_deleted == False)
            .order_by(FeeStructure.standard, FeeStructure.category_id)
        ).all())

    @staticmethod
    def delete(db: Session, fs_id: int, deleted_by: int) -> None:
        fs = db.scalar(select(FeeStructure).where(FeeStructure.id == fs_id))
        if fs: fs.soft_delete(deleted_by=deleted_by); db.commit()


# ── Student Fee Service ────────────────────────────────────────

class StudentFeeService:
    @staticmethod
    def generate_fee_records(db: Session, student_id: int, academic_year_id: int,
                              standard: str, created_by: int) -> int:
        """Generate fee records for a student based on fee structure."""
        structures = FeeStructureService.get_by_year_standard(db, academic_year_id, standard)
        count = 0
        for fs in structures:
            existing = db.scalar(
                select(StudentFeeRecord).where(
                    StudentFeeRecord.student_id == student_id,
                    StudentFeeRecord.academic_year_id == academic_year_id,
                    StudentFeeRecord.category_id == fs.category_id,
                    StudentFeeRecord.is_deleted == False,
                )
            )
            if not existing:
                rec = StudentFeeRecord(
                    student_id=student_id,
                    academic_year_id=academic_year_id,
                    category_id=fs.category_id,
                    amount_due=fs.amount,
                    amount_paid=Decimal("0"),
                    concession_amount=Decimal("0"),
                    fine_amount=Decimal("0"),
                    due_date=fs.due_date,
                    status="pending",
                    created_by=created_by,
                )
                db.add(rec)
                count += 1
        db.commit()
        return count

    @staticmethod
    def lookup_students(db: Session, query: str) -> list[dict]:
        from app.modules.student.models import Student
        from sqlalchemy import or_
        q = select(Student).where(Student.is_deleted == False)
        if query:
            st = f"%{query}%"
            q = q.where(
                or_(
                    Student.full_name.ilike(st),
                    Student.gr_number.ilike(st),
                    Student.mobile_number.ilike(st),
                    Student.roll_number.ilike(st),
                )
            )
        students = db.scalars(q.order_by(Student.full_name).limit(20)).all()
        return [
            {
                "id": s.id,
                "gr_number": s.gr_number,
                "full_name": s.full_name,
                "standard": s.current_standard or getattr(s, "standard", "-") or "-",
                "division": s.current_division or getattr(s, "division", "A") or "A",
                "mobile_number": s.mobile_number,
                "roll_number": s.roll_number,
            }
            for s in students
        ]

    @staticmethod
    def get_student_fee_summary(db: Session, student_id: int,
                                academic_year_id: int) -> StudentFeeSummary:
        from app.modules.student.models import Student
        student = db.scalar(select(Student).where(Student.id == student_id, Student.is_deleted == False))
        if not student:
            raise HTTPException(404, "Student not found.")

        records = list(db.scalars(
            select(StudentFeeRecord)
            .options(joinedload(StudentFeeRecord.category))
            .where(
                StudentFeeRecord.student_id == student_id,
                StudentFeeRecord.academic_year_id == academic_year_id,
                StudentFeeRecord.is_deleted == False,
            )
        ).all())

        # Auto-generate fee records from fee structure if empty
        if not records:
            std = student.current_standard or getattr(student, "standard", "1")
            if std:
                StudentFeeService.generate_fee_records(
                    db, student_id, academic_year_id, str(std), 1
                )
                records = list(db.scalars(
                    select(StudentFeeRecord)
                    .options(joinedload(StudentFeeRecord.category))
                    .where(
                        StudentFeeRecord.student_id == student_id,
                        StudentFeeRecord.academic_year_id == academic_year_id,
                        StudentFeeRecord.is_deleted == False,
                    )
                ).all())

        total_due = sum(r.amount_due for r in records)
        total_paid = sum(r.amount_paid for r in records)
        total_concession = sum(r.concession_amount for r in records)
        total_fine = sum(r.fine_amount for r in records)
        balance = total_due - total_paid - total_concession

        return StudentFeeSummary(
            student_id=student_id,
            student_name=student.full_name,
            gr_number=student.gr_number,
            standard=student.current_standard or getattr(student, "standard", "-") or "-",
            division=student.current_division or getattr(student, "division", "A"),
            total_due=total_due,
            total_paid=total_paid,
            total_concession=total_concession,
            total_fine=total_fine,
            balance=balance,
            records=records,
        )

    @staticmethod
    def collect_fee(db: Session, data: FeePaymentRequest, collected_by: int) -> FeePayment:
        receipt_no = _receipt_number(db)
        total_received = data.amount + data.late_fine - data.concession

        payment = FeePayment(
            receipt_number=receipt_no,
            student_id=data.student_id,
            academic_year_id=data.academic_year_id,
            payment_date=data.payment_date,
            payment_mode=data.payment_mode,
            amount=data.amount,
            late_fine=data.late_fine,
            concession=data.concession,
            total_received=total_received,
            transaction_id=data.transaction_id,
            bank_name=data.bank_name,
            cheque_number=data.cheque_number,
            cheque_date=data.cheque_date,
            remarks=data.remarks,
            collected_by=collected_by,
            created_by=collected_by,
        )
        db.add(payment); db.flush()

        # Update fee records
        remaining = data.amount
        for rec_id in data.fee_record_ids:
            if remaining <= 0:
                break
            rec = db.scalar(select(StudentFeeRecord).where(StudentFeeRecord.id == rec_id))
            if not rec:
                continue
            due = rec.amount_due - rec.amount_paid - rec.concession_amount
            pay = min(due, remaining)
            rec.amount_paid += pay
            remaining -= pay
            if rec.amount_paid + rec.concession_amount >= rec.amount_due:
                rec.status = "paid"
            elif rec.amount_paid > 0:
                rec.status = "partial"
            payment.fee_record_id = rec.id

        AuditService.log(
            db, action="FEE_COLLECTED", module="finance",
            user_id=collected_by,
            description=f"Receipt {receipt_no} — ₹{total_received} from student #{data.student_id}",
        )
        db.commit(); db.refresh(payment)
        # ── Notify student/parent that fee was received
        try:
            from app.shared.notifications import push_event
            from app.modules.student.models import Student
            import app.modules.attendance.models  # noqa: F401
            student = db.scalar(select(Student).where(Student.id == data.student_id, Student.is_deleted == False))
            push_event(db, "fee.collected", {
                "student_name": student.full_name if student else f"Student #{data.student_id}",
                "amount": float(total_received),
                "receipt_no": receipt_no,
                "student_user_id": student.user_id if student and hasattr(student, 'user_id') else None,
                "parent_user_id": None,
                "receipt_id": payment.id,
                "sender_id": collected_by,
            })
        except Exception:
            pass
        return payment

    @staticmethod
    def get_payment_history(db: Session, student_id: int,
                            academic_year_id: int | None = None) -> list[FeePayment]:
        q = select(FeePayment).where(FeePayment.student_id == student_id,
                                     FeePayment.is_deleted == False)
        if academic_year_id:
            q = q.where(FeePayment.academic_year_id == academic_year_id)
        return list(db.scalars(q.order_by(FeePayment.payment_date.desc())).all())

    @staticmethod
    def get_defaulters(db: Session, academic_year_id: int,
                       standard: str | None = None) -> list[DefaulterEntry]:
        from app.modules.student.models import Student

        q = (
            select(
                StudentFeeRecord.student_id,
                func.sum(StudentFeeRecord.amount_due).label("total_due"),
                func.sum(StudentFeeRecord.amount_paid).label("total_paid"),
                func.sum(StudentFeeRecord.concession_amount).label("total_concession"),
                func.min(StudentFeeRecord.due_date).label("earliest_due"),
            )
            .where(
                StudentFeeRecord.academic_year_id == academic_year_id,
                StudentFeeRecord.is_deleted == False,
                StudentFeeRecord.status.in_(["pending", "partial"]),
            )
            .group_by(StudentFeeRecord.student_id)
        )
        rows = db.execute(q).fetchall()

        defaulters = []
        for row in rows:
            balance = (row.total_due or 0) - (row.total_paid or 0) - (row.total_concession or 0)
            if balance <= 0:
                continue
            student = db.scalar(select(Student).where(Student.id == row.student_id))
            if not student:
                continue
            if standard and student.current_standard != standard:
                continue
            defaulters.append(DefaulterEntry(
                student_id=row.student_id,
                student_name=student.full_name,
                gr_number=student.gr_number,
                standard=student.current_standard or "-",
                division=student.current_division,
                contact_mobile=student.father_mobile,
                total_due=Decimal(str(row.total_due or 0)),
                total_paid=Decimal(str(row.total_paid or 0)),
                balance=Decimal(str(balance)),
                overdue_since=row.earliest_due,
            ))
        defaulters.sort(key=lambda d: d.balance, reverse=True)
        return defaulters


# ── Expense Service ────────────────────────────────────────────

class ExpenseService:
    @staticmethod
    def create(db: Session, data: ExpenseRequest, created_by: int) -> Expense:
        exp_num = _expense_number(db)
        exp = Expense(**data.model_dump(), expense_number=exp_num, created_by=created_by)
        db.add(exp)
        AuditService.log(db, action="EXPENSE_RECORDED", module="finance", user_id=created_by,
                         description=f"Expense ₹{data.amount} — {data.category}: {data.description}")
        db.commit(); db.refresh(exp); return exp

    @staticmethod
    def get_list(db: Session, page: int = 1, per_page: int = 30,
                 category: str | None = None, academic_year_id: int | None = None,
                 from_date: date | None = None, to_date: date | None = None,
                 ) -> tuple[list[Expense], int]:
        q = select(Expense).where(Expense.is_deleted == False)
        if category: q = q.where(Expense.category == category)
        if academic_year_id: q = q.where(Expense.academic_year_id == academic_year_id)
        if from_date: q = q.where(Expense.expense_date >= from_date)
        if to_date: q = q.where(Expense.expense_date <= to_date)
        total = db.scalar(select(func.count()).select_from(q.subquery())) or 0
        items = db.scalars(q.order_by(Expense.expense_date.desc())
                           .offset((page - 1) * per_page).limit(per_page)).all()
        return list(items), total

    @staticmethod
    def delete(db: Session, exp_id: int, deleted_by: int) -> None:
        e = db.scalar(select(Expense).where(Expense.id == exp_id, Expense.is_deleted == False))
        if e: e.soft_delete(deleted_by=deleted_by); db.commit()


# ── Finance Stats ──────────────────────────────────────────────

class FinanceStatsService:
    @staticmethod
    def get(db: Session, academic_year_id: int | None = None) -> FinanceStatsResponse:
        today = date.today()
        month = today.month
        year = today.year

        rec_q = select(StudentFeeRecord).where(StudentFeeRecord.is_deleted == False)
        if academic_year_id:
            rec_q = rec_q.where(StudentFeeRecord.academic_year_id == academic_year_id)

        totals = db.execute(
            select(
                func.sum(StudentFeeRecord.amount_due),
                func.sum(StudentFeeRecord.amount_paid),
                func.sum(StudentFeeRecord.concession_amount),
                func.sum(StudentFeeRecord.fine_amount),
            ).select_from(rec_q.subquery())
        ).one()

        total_due    = Decimal(str(totals[0] or 0))
        total_paid   = Decimal(str(totals[1] or 0))
        total_conc   = Decimal(str(totals[2] or 0))
        total_fine   = Decimal(str(totals[3] or 0))
        pending      = total_due - total_paid - total_conc

        # This month collection
        month_coll = db.scalar(
            select(func.sum(FeePayment.total_received))
            .where(FeePayment.is_deleted == False)
            .where(extract("month", FeePayment.payment_date) == month)
            .where(extract("year", FeePayment.payment_date) == year)
        ) or 0

        # Total expenses
        exp_q = select(Expense).where(Expense.is_deleted == False)
        if academic_year_id:
            exp_q = exp_q.where(Expense.academic_year_id == academic_year_id)

        total_exp = db.scalar(
            select(func.sum(Expense.amount)).select_from(exp_q.subquery())
        ) or 0

        month_exp = db.scalar(
            select(func.sum(Expense.amount))
            .where(Expense.is_deleted == False)
            .where(extract("month", Expense.expense_date) == month)
            .where(extract("year", Expense.expense_date) == year)
        ) or 0

        # Defaulters
        defaulter_count = db.scalar(
            select(func.count(StudentFeeRecord.student_id.distinct()))
            .where(StudentFeeRecord.is_deleted == False)
            .where(StudentFeeRecord.status.in_(["pending", "partial"]))
        ) or 0

        students_with_dues = defaulter_count

        net_balance = total_paid - Decimal(str(total_exp))

        return FinanceStatsResponse(
            total_fee_collected=total_paid,
            total_fee_due=total_due,
            total_concessions=total_conc,
            pending_amount=pending,
            total_expenses=Decimal(str(total_exp)),
            net_balance=net_balance,
            defaulter_count=defaulter_count,
            collection_this_month=Decimal(str(month_coll)),
            expense_this_month=Decimal(str(month_exp)),
            total_students_with_dues=students_with_dues,
        )
