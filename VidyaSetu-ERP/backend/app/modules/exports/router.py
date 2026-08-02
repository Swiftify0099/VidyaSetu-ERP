"""
VidyaSetu ERP — Export Router
==============================
Exposes PDF & Excel download endpoints for all major reports.
"""
from typing import Optional
import sqlalchemy as sa
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import Response
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.core.dependencies import AuthUser, DBSession, require_permission
from app.shared.exports import (
    generate_fee_receipt_pdf,
    generate_mark_sheet_pdf,
    generate_attendance_report_pdf,
    generate_students_excel,
    generate_fee_collection_excel,
    generate_marks_excel,
)
from app.modules.finance.models import FeeReceipt, FeeReceiptItem
from app.modules.student.models import Student
from app.core.config import settings

router = APIRouter(prefix="/exports", tags=["Exports (PDF & Excel)"])


# ── Helpers ───────────────────────────────────────────────────
def _pdf_response(data: bytes, filename: str) -> Response:
    return Response(
        content=data,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


def _excel_response(data: bytes, filename: str) -> Response:
    return Response(
        content=data,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


# ── Fee Receipt PDF ───────────────────────────────────────────
@router.get(
    "/fee-receipt/{receipt_id}/pdf",
    dependencies=[Depends(require_permission("finance.read"))],
    response_class=Response,
)
async def download_fee_receipt_pdf(
    receipt_id: int,
    current_user: AuthUser,
    db: DBSession,
):
    """Download a fee receipt as a printable PDF."""
    receipt = db.get(FeeReceipt, receipt_id)
    if not receipt or receipt.is_deleted:
        raise HTTPException(404, "Receipt not found")

    items = db.scalars(
        select(FeeReceiptItem).where(FeeReceiptItem.receipt_id == receipt_id)
    ).all()

    receipt_dict = {
        "receipt_number":    receipt.receipt_number,
        "student_name":      receipt.student_name,
        "gr_number":         receipt.gr_number,
        "standard":          receipt.standard,
        "division":          receipt.division,
        "father_name":       getattr(receipt, "father_name", "—"),
        "total_amount":      str(receipt.total_amount),
        "payment_mode":      receipt.payment_mode,
        "receipt_date":      str(receipt.receipt_date),
        "collected_by_name": getattr(receipt, "collected_by_name", current_user.full_name),
        "academic_year":     receipt.academic_year,
        "fee_items": [
            {"name": item.fee_head_name, "amount": str(item.amount)}
            for item in items
        ],
    }
    pdf_bytes = generate_fee_receipt_pdf(receipt_dict)
    return _pdf_response(pdf_bytes, f"receipt_{receipt.receipt_number}.pdf")


# ── Students Excel ────────────────────────────────────────────
@router.get(
    "/students/excel",
    dependencies=[Depends(require_permission("student.export"))],
    response_class=Response,
)
async def export_students_excel(
    current_user: AuthUser,
    db: DBSession,
    standard: Optional[str] = None,
    division: Optional[str] = None,
    academic_year: str = Query(default=settings.CURRENT_ACADEMIC_YEAR),
):
    """Download student list as Excel file."""
    q = select(Student).where(
        Student.is_deleted == False,
    )
    if standard: q = q.where(Student.standard == standard)
    if division: q = q.where(Student.division == division)
    students = db.scalars(q.order_by(Student.standard, Student.division, Student.roll_number)).all()

    data = [
        {
            "gr_number":        s.gr_number,
            "admission_number": s.admission_number,
            "full_name":        s.full_name,
            "standard":         s.standard,
            "division":         s.division,
            "roll_number":      s.roll_number,
            "gender":           s.gender,
            "dob":              str(s.dob) if s.dob else "",
            "mobile":           s.mobile or "",
            "father_name":      s.father_name or "",
            "category":         s.category or "",
            "status":           s.status,
        }
        for s in students
    ]

    excel_bytes = generate_students_excel(data)
    filename = f"students_{standard or 'all'}_{division or 'all'}_{academic_year}.xlsx"
    return _excel_response(excel_bytes, filename)


# ── Fee Collection Excel ──────────────────────────────────────
@router.get(
    "/fee-collection/excel",
    dependencies=[Depends(require_permission("finance.export"))],
    response_class=Response,
)
async def export_fee_collection_excel(
    current_user: AuthUser,
    db: DBSession,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    academic_year: str = Query(default=settings.CURRENT_ACADEMIC_YEAR),
):
    """Download fee collection report as Excel."""
    q = select(FeeReceipt).where(
        FeeReceipt.is_deleted == False,
        FeeReceipt.academic_year == academic_year,
    )
    if date_from: q = q.where(FeeReceipt.receipt_date >= date_from)
    if date_to:   q = q.where(FeeReceipt.receipt_date <= date_to)
    receipts = db.scalars(q.order_by(FeeReceipt.receipt_date.desc())).all()

    data = [
        {
            "receipt_number":    r.receipt_number,
            "receipt_date":      str(r.receipt_date),
            "gr_number":         r.gr_number,
            "student_name":      r.student_name,
            "standard":          r.standard,
            "division":          r.division,
            "total_amount":      str(r.total_amount),
            "payment_mode":      r.payment_mode,
            "collected_by_name": getattr(r, "collected_by_name", ""),
            "status":            r.status,
        }
        for r in receipts
    ]

    excel_bytes = generate_fee_collection_excel(data, {
        "date_from": date_from or "",
        "date_to": date_to or "",
    })
    return _excel_response(excel_bytes, f"fee_collection_{academic_year}.xlsx")


# ── Attendance Report PDF ─────────────────────────────────────
@router.get(
    "/attendance/pdf",
    dependencies=[Depends(require_permission("attendance.read"))],
    response_class=Response,
)
async def export_attendance_pdf(
    current_user: AuthUser,
    db: DBSession,
    standard: str = Query(...),
    division: str = Query(...),
    month: Optional[int] = Query(None, ge=1, le=12),
    academic_year: str = Query(default=settings.CURRENT_ACADEMIC_YEAR),
):
    """Download class attendance report as PDF."""
    # Build a summarized attendance per student using existing StudentAttendance model
    try:
        from app.modules.attendance.models import StudentAttendance
        from app.modules.student.models import Student as StudentModel
        from sqlalchemy import func, join

        summary = db.execute(
            select(
                StudentAttendance.student_id,
                StudentModel.full_name.label("student_name"),
                StudentModel.gr_number.label("gr_number"),
                func.count().label("total_days"),
                func.sum(
                    sa.case((StudentAttendance.status == "present", 1), else_=0)
                ).label("present"),
                func.sum(
                    sa.case((StudentAttendance.status == "absent", 1), else_=0)
                ).label("absent"),
                func.sum(
                    sa.case((StudentAttendance.status.in_(["leave", "medical_leave"]), 1), else_=0)
                ).label("leave"),
            )
            .join(StudentModel, StudentModel.id == StudentAttendance.student_id)
            .where(
                StudentAttendance.standard == standard,
                StudentAttendance.division == division,
                StudentAttendance.is_deleted == False,
            )
            .group_by(
                StudentAttendance.student_id,
                StudentModel.full_name,
                StudentModel.gr_number,
            )
        ).all()

        rows = []
        for r in summary:
            total = r.total_days or 0
            present = r.present or 0
            pct = (present / total * 100) if total > 0 else 0
            rows.append({
                "gr_number":    r.gr_number or "",
                "student_name": r.student_name or "",
                "total_days":   total,
                "present":      present,
                "absent":       r.absent or 0,
                "leave":        r.leave or 0,
                "percentage":   round(pct, 1),
            })
    except Exception:
        rows = []



    data = {
        "standard":     standard,
        "division":     division,
        "academic_year": academic_year,
        "period":       f"Month {month}" if month else academic_year,
        "rows":         rows,
    }
    pdf_bytes = generate_attendance_report_pdf(data)
    return _pdf_response(pdf_bytes, f"attendance_{standard}{division}_{academic_year}.pdf")
