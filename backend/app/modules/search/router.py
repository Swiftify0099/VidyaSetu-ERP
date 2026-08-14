"""
VidyaSetu ERP — Global Search Router
====================================
- /api/v1/search?q=...  — cross-module search
"""
from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy import select, or_

from app.core.dependencies import AuthUser, DBSession, require_permission
from app.shared.responses import APIResponse

router = APIRouter(tags=["Search"])


# ── Global Search ─────────────────────────────────────────────
@router.get("/search", response_model=APIResponse,
            dependencies=[Depends(require_permission("admin.read"))])
async def global_search(
    current_user: AuthUser,
    db: DBSession,
    q: str = Query(..., min_length=2, max_length=100, description="Search query"),
    modules: Optional[str] = Query(
        None,
        description="Comma-separated modules: students,teachers,finance,library,inventory"
    ),
):
    """
    Cross-module global search.
    Searches by name, GR number, employee ID, mobile, book title, etc.
    Returns categorized results.
    """
    if not q.strip():
        return APIResponse.ok(data={}, message="Query too short")

    term = f"%{q.strip()}%"
    requested = set(modules.split(",")) if modules else {
        "students", "teachers", "finance", "library", "inventory", "office"
    }

    results: dict = {}

    # ── Students ──────────────────────────────────────────────
    if "students" in requested:
        try:
            from app.modules.student.models import Student
            rows = db.scalars(
                select(Student).where(
                    Student.is_deleted == False,
                    or_(
                        Student.full_name.ilike(term),
                        Student.gr_number.ilike(term),
                        Student.admission_number.ilike(term),
                        Student.mobile.ilike(term),
                        Student.father_name.ilike(term),
                    )
                ).limit(10)
            ).all()
            results["students"] = [
                {
                    "id": s.id,
                    "label": s.full_name,
                    "sub": f"GR: {s.gr_number} | Std: {s.standard}-{s.division}",
                    "url": f"/students/{s.id}",
                    "type": "student",
                }
                for s in rows
            ]
        except Exception:
            results["students"] = []

    # ── Teachers ──────────────────────────────────────────────
    if "teachers" in requested:
        try:
            from app.modules.teacher.models import Teacher
            rows = db.scalars(
                select(Teacher).where(
                    Teacher.is_deleted == False,
                    or_(
                        Teacher.full_name.ilike(term),
                        Teacher.employee_id.ilike(term),
                        Teacher.mobile.ilike(term),
                        Teacher.email.ilike(term),
                    )
                ).limit(10)
            ).all()
            results["teachers"] = [
                {
                    "id": t.id,
                    "label": t.full_name,
                    "sub": f"Emp: {t.employee_id} | {t.designation or ''}",
                    "url": f"/teachers/{t.id}",
                    "type": "teacher",
                }
                for t in rows
            ]
        except Exception:
            results["teachers"] = []

    # ── Library Books ─────────────────────────────────────────
    if "library" in requested:
        try:
            from app.modules.library.models import Book
            rows = db.scalars(
                select(Book).where(
                    Book.is_deleted == False,
                    or_(
                        Book.title.ilike(term),
                        Book.isbn.ilike(term),
                        Book.accession_number.ilike(term),
                        Book.keywords.ilike(term),
                    )
                ).limit(10)
            ).all()
            results["library"] = [
                {
                    "id": b.id,
                    "label": b.title,
                    "sub": f"ISBN: {b.isbn or '—'} | Copies: {b.available_copies}/{b.total_copies}",
                    "url": "/library",
                    "type": "book",
                }
                for b in rows
            ]
        except Exception:
            results["library"] = []

    # ── Fee Receipts ──────────────────────────────────────────
    if "finance" in requested:
        try:
            from app.modules.finance.models import FeeReceipt
            rows = db.scalars(
                select(FeeReceipt).where(
                    FeeReceipt.is_deleted == False,
                    or_(
                        FeeReceipt.receipt_number.ilike(term),
                        FeeReceipt.student_name.ilike(term),
                        FeeReceipt.gr_number.ilike(term),
                    )
                ).limit(10)
            ).all()
            results["finance"] = [
                {
                    "id": r.id,
                    "label": r.receipt_number,
                    "sub": f"{r.student_name} | ₹{r.total_amount}",
                    "url": "/finance",
                    "type": "receipt",
                }
                for r in rows
            ]
        except Exception:
            results["finance"] = []

    total = sum(len(v) for v in results.values())
    return APIResponse.ok(
        data={"query": q, "total": total, "results": results},
        message=f"Found {total} results for '{q}'",
    )
