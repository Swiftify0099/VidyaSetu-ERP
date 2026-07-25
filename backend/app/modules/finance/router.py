"""
VidyaSetu ERP — Finance Router
"""
from datetime import date
from typing import Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.core.dependencies import AuthUser, DBSession, require_permission
from app.modules.finance.schemas import (
    FeeCategoryRequest, FeeCategoryResponse,
    FeeStructureRequest, FeeStructureResponse, BulkFeeStructureRequest,
    FeePaymentRequest, FeePaymentResponse,
    FeeDiscountRequest, FeeDiscountResponse,
    ExpenseRequest, ExpenseResponse,
)
from app.modules.finance.service import (
    FeeCategoryService, FeeStructureService,
    StudentFeeService, ExpenseService, FinanceStatsService,
)
from app.shared.responses import APIResponse

router = APIRouter(prefix="/finance", tags=["Finance"])


# ── Stats ─────────────────────────────────────────────────────
@router.get("/stats", response_model=APIResponse,
            dependencies=[Depends(require_permission("finance.read"))])
async def finance_stats(current_user: AuthUser, db: DBSession,
                        academic_year_id: Optional[int] = None):
    return APIResponse.ok(data=FinanceStatsService.get(db, academic_year_id).model_dump())


# ── Fee Categories ────────────────────────────────────────────
@router.post("/categories", response_model=APIResponse, status_code=201,
             dependencies=[Depends(require_permission("finance.manage"))])
async def create_category(body: FeeCategoryRequest, current_user: AuthUser, db: DBSession):
    c = FeeCategoryService.create(db, body, current_user.user_id)
    return APIResponse.created(data=FeeCategoryResponse.model_validate(c).model_dump())


@router.get("/categories", response_model=APIResponse,
            dependencies=[Depends(require_permission("finance.read"))])
async def list_categories(current_user: AuthUser, db: DBSession):
    cats = FeeCategoryService.get_all(db)
    return APIResponse.ok(data=[FeeCategoryResponse.model_validate(c).model_dump() for c in cats])


@router.put("/categories/{cat_id}", response_model=APIResponse,
            dependencies=[Depends(require_permission("finance.manage"))])
async def update_category(cat_id: int, body: FeeCategoryRequest,
                          current_user: AuthUser, db: DBSession):
    c = FeeCategoryService.update(db, cat_id, body, current_user.user_id)
    return APIResponse.ok(data=FeeCategoryResponse.model_validate(c).model_dump())


@router.delete("/categories/{cat_id}", response_model=APIResponse,
               dependencies=[Depends(require_permission("finance.manage"))])
async def delete_category(cat_id: int, current_user: AuthUser, db: DBSession):
    FeeCategoryService.delete(db, cat_id, current_user.user_id)
    return APIResponse.ok(message="Category deleted.")


# ── Fee Structure ─────────────────────────────────────────────
@router.post("/structure", response_model=APIResponse, status_code=201,
             dependencies=[Depends(require_permission("finance.manage"))])
async def upsert_fee_structure(body: FeeStructureRequest, current_user: AuthUser, db: DBSession):
    fs = FeeStructureService.upsert(db, body, current_user.user_id)
    return APIResponse.created(data=FeeStructureResponse.model_validate(fs).model_dump())


@router.post("/structure/bulk", response_model=APIResponse, status_code=201,
             dependencies=[Depends(require_permission("finance.manage"))])
async def bulk_fee_structure(body: BulkFeeStructureRequest, current_user: AuthUser, db: DBSession):
    count = FeeStructureService.bulk_upsert(db, body.academic_year_id, body.structures, current_user.user_id)
    return APIResponse.created(data={"count": count}, message=f"{count} fee structures saved.")


@router.get("/structure", response_model=APIResponse,
            dependencies=[Depends(require_permission("finance.read"))])
async def get_fee_structure(current_user: AuthUser, db: DBSession,
                            academic_year_id: int = Query(...),
                            standard: Optional[str] = None):
    if standard:
        items = FeeStructureService.get_by_year_standard(db, academic_year_id, standard)
    else:
        items = FeeStructureService.get_all_by_year(db, academic_year_id)
    return APIResponse.ok(data=[FeeStructureResponse.model_validate(f).model_dump() for f in items])


@router.delete("/structure/{fs_id}", response_model=APIResponse,
               dependencies=[Depends(require_permission("finance.manage"))])
async def delete_fee_structure(fs_id: int, current_user: AuthUser, db: DBSession):
    FeeStructureService.delete(db, fs_id, current_user.user_id)
    return APIResponse.ok(message="Fee structure entry removed.")


# ── Fee Collection ────────────────────────────────────────────
@router.get("/student/{student_id}/fees", response_model=APIResponse,
            dependencies=[Depends(require_permission("finance.read"))])
async def get_student_fees(student_id: int, current_user: AuthUser, db: DBSession,
                           academic_year_id: int = Query(...)):
    summary = StudentFeeService.get_student_fee_summary(db, student_id, academic_year_id)
    return APIResponse.ok(data=summary.model_dump())


@router.post("/student/{student_id}/generate-records", response_model=APIResponse,
             dependencies=[Depends(require_permission("finance.manage"))])
async def generate_fee_records(student_id: int, current_user: AuthUser, db: DBSession,
                               academic_year_id: int = Query(...), standard: str = Query(...)):
    count = StudentFeeService.generate_fee_records(db, student_id, academic_year_id, standard, current_user.user_id)
    return APIResponse.created(data={"count": count}, message=f"{count} fee records generated.")


@router.post("/collect", response_model=APIResponse, status_code=201,
             dependencies=[Depends(require_permission("finance.collect"))])
async def collect_fee(body: FeePaymentRequest, current_user: AuthUser, db: DBSession):
    payment = StudentFeeService.collect_fee(db, body, collected_by=current_user.user_id)
    return APIResponse.created(
        data=FeePaymentResponse.model_validate(payment).model_dump(),
        message=f"Receipt {payment.receipt_number} — ₹{payment.total_received} collected.",
    )


@router.get("/student/{student_id}/payment-history", response_model=APIResponse,
            dependencies=[Depends(require_permission("finance.read"))])
async def payment_history(student_id: int, current_user: AuthUser, db: DBSession,
                          academic_year_id: Optional[int] = None):
    payments = StudentFeeService.get_payment_history(db, student_id, academic_year_id)
    return APIResponse.ok(data=[FeePaymentResponse.model_validate(p).model_dump() for p in payments])


@router.get("/defaulters", response_model=APIResponse,
            dependencies=[Depends(require_permission("finance.read"))])
async def get_defaulters(current_user: AuthUser, db: DBSession,
                         academic_year_id: int = Query(...),
                         standard: Optional[str] = None):
    defaulters = StudentFeeService.get_defaulters(db, academic_year_id, standard)
    return APIResponse.ok(data=[d.model_dump() for d in defaulters])


# ── Expenses ──────────────────────────────────────────────────
@router.post("/expenses", response_model=APIResponse, status_code=201,
             dependencies=[Depends(require_permission("finance.expense.create"))])
async def create_expense(body: ExpenseRequest, current_user: AuthUser, db: DBSession):
    exp = ExpenseService.create(db, body, current_user.user_id)
    return APIResponse.created(data=ExpenseResponse.model_validate(exp).model_dump(),
                               message=f"Expense {exp.expense_number} recorded.")


@router.get("/expenses", response_model=APIResponse,
            dependencies=[Depends(require_permission("finance.read"))])
async def list_expenses(current_user: AuthUser, db: DBSession,
                        page: int = Query(1, ge=1), per_page: int = Query(30, ge=1, le=100),
                        category: Optional[str] = None, academic_year_id: Optional[int] = None,
                        from_date: Optional[date] = None, to_date: Optional[date] = None):
    items, total = ExpenseService.get_list(db, page=page, per_page=per_page,
                                           category=category, academic_year_id=academic_year_id,
                                           from_date=from_date, to_date=to_date)
    total_pages = max(1, (total + per_page - 1) // per_page)
    return APIResponse.ok(data={
        "items": [ExpenseResponse.model_validate(e).model_dump() for e in items],
        "meta": {"total": total, "page": page, "total_pages": total_pages},
    })


@router.delete("/expenses/{exp_id}", response_model=APIResponse,
               dependencies=[Depends(require_permission("finance.expense.delete"))])
async def delete_expense(exp_id: int, current_user: AuthUser, db: DBSession):
    ExpenseService.delete(db, exp_id, current_user.user_id)
    return APIResponse.ok(message="Expense deleted.")
