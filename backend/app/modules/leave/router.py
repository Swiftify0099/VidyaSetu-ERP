"""
VidyaSetu ERP — Leave Module Router
"""
from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.dependencies import AuthUser, DBSession, require_permission
from app.modules.leave.schemas import (
    LeaveTypeCreate, LeaveTypeUpdate, LeaveTypeResponse,
    LeaveApplyRequest, LeaveApproveRequest,
    LeaveApplicationResponse, LeaveBalanceResponse,
    HolidayCreate, HolidayResponse, LeaveStatsResponse,
)
from app.modules.leave.service import (
    LeaveTypeService, LeaveBalanceService,
    LeaveApplicationService, HolidayService,
)
from app.shared.responses import APIResponse

router = APIRouter(prefix="/leave", tags=["Leave Management"])


# ── Stats ──────────────────────────────────────────────────────
@router.get("/stats", response_model=APIResponse,
            dependencies=[Depends(require_permission("leave.read"))])
async def leave_stats(current_user: AuthUser, db: DBSession,
                      academic_year: str = Query(...)):
    stats = LeaveApplicationService.get_stats(db, academic_year)
    return APIResponse.ok(data=stats.model_dump())


# ── Leave Types ────────────────────────────────────────────────
@router.get("/types", response_model=APIResponse,
            dependencies=[Depends(require_permission("leave.read"))])
async def list_leave_types(current_user: AuthUser, db: DBSession):
    types = LeaveTypeService.list_all(db)
    return APIResponse.ok(data=[LeaveTypeResponse.model_validate(t).model_dump() for t in types])


@router.post("/types", response_model=APIResponse, status_code=201,
             dependencies=[Depends(require_permission("leave.manage"))])
async def create_leave_type(body: LeaveTypeCreate, current_user: AuthUser, db: DBSession):
    lt = LeaveTypeService.create(db, body, current_user.user_id)
    return APIResponse.created(data=LeaveTypeResponse.model_validate(lt).model_dump())


@router.put("/types/{type_id}", response_model=APIResponse,
            dependencies=[Depends(require_permission("leave.manage"))])
async def update_leave_type(type_id: int, body: LeaveTypeUpdate,
                            current_user: AuthUser, db: DBSession):
    lt = LeaveTypeService.update(db, type_id, body, current_user.user_id)
    return APIResponse.ok(data=LeaveTypeResponse.model_validate(lt).model_dump())


@router.delete("/types/{type_id}", response_model=APIResponse,
               dependencies=[Depends(require_permission("leave.manage"))])
async def delete_leave_type(type_id: int, current_user: AuthUser, db: DBSession):
    LeaveTypeService.delete(db, type_id, current_user.user_id)
    return APIResponse.ok(message="Leave type deleted.")


# ── Leave Balance ──────────────────────────────────────────────
@router.get("/balance", response_model=APIResponse,
            dependencies=[Depends(require_permission("leave.read"))])
async def my_leave_balance(current_user: AuthUser, db: DBSession,
                           academic_year: str = Query(...)):
    balances = LeaveBalanceService.get_for_employee(
        db, current_user.user_id, academic_year
    )
    return APIResponse.ok(data=[b.model_dump() for b in balances])


@router.get("/balance/{employee_id}", response_model=APIResponse,
            dependencies=[Depends(require_permission("leave.read"))])
async def employee_leave_balance(employee_id: int, current_user: AuthUser,
                                 db: DBSession, academic_year: str = Query(...)):
    balances = LeaveBalanceService.get_for_employee(db, employee_id, academic_year)
    return APIResponse.ok(data=[b.model_dump() for b in balances])


@router.post("/balance/{employee_id}/initialize", response_model=APIResponse,
             dependencies=[Depends(require_permission("leave.manage"))])
async def initialize_balance(employee_id: int, current_user: AuthUser,
                             db: DBSession, academic_year: str = Query(...)):
    LeaveBalanceService.initialize_for_employee(
        db, employee_id, academic_year, current_user.user_id
    )
    return APIResponse.ok(message="Leave balance initialized.")


# ── Leave Applications ─────────────────────────────────────────
@router.post("/apply", response_model=APIResponse, status_code=201,
             dependencies=[Depends(require_permission("leave.apply"))])
async def apply_leave(body: LeaveApplyRequest, current_user: AuthUser, db: DBSession):
    app = LeaveApplicationService.apply(
        db,
        employee_id=current_user.user_id,
        employee_name=current_user.full_name,
        employee_code=getattr(current_user, "employee_id", None),
        data=body,
        by=current_user.user_id,
    )
    return APIResponse.created(
        data=LeaveApplicationResponse.model_validate(app).model_dump(),
        message=f"Leave application {app.application_number} submitted.",
    )


@router.get("/applications", response_model=APIResponse,
            dependencies=[Depends(require_permission("leave.read"))])
async def list_applications(current_user: AuthUser, db: DBSession,
                            employee_id: Optional[int] = None,
                            status: Optional[str] = None,
                            academic_year: Optional[str] = None,
                            limit: int = Query(default=50, le=200)):
    apps = LeaveApplicationService.list_applications(
        db, employee_id=employee_id, status=status,
        academic_year=academic_year, limit=limit
    )
    return APIResponse.ok(data=[LeaveApplicationResponse.model_validate(a).model_dump() for a in apps])


@router.get("/my-applications", response_model=APIResponse,
            dependencies=[Depends(require_permission("leave.apply"))])
async def my_applications(current_user: AuthUser, db: DBSession,
                          academic_year: Optional[str] = None,
                          status: Optional[str] = None):
    apps = LeaveApplicationService.list_applications(
        db, employee_id=current_user.user_id,
        status=status, academic_year=academic_year,
    )
    return APIResponse.ok(data=[LeaveApplicationResponse.model_validate(a).model_dump() for a in apps])


@router.post("/applications/{app_id}/action", response_model=APIResponse,
             dependencies=[Depends(require_permission("leave.approve"))])
async def approve_or_reject_leave(app_id: int, body: LeaveApproveRequest,
                                  current_user: AuthUser, db: DBSession):
    app = LeaveApplicationService.approve_or_reject(db, app_id, body, current_user.user_id)
    return APIResponse.ok(
        data=LeaveApplicationResponse.model_validate(app).model_dump(),
        message=f"Leave application {app.status}.",
    )


@router.post("/applications/{app_id}/cancel", response_model=APIResponse,
             dependencies=[Depends(require_permission("leave.apply"))])
async def cancel_leave(app_id: int, current_user: AuthUser, db: DBSession):
    app = LeaveApplicationService.cancel(db, app_id, current_user.user_id)
    return APIResponse.ok(message=f"Leave application {app.application_number} cancelled.")


# ── Holiday Calendar ───────────────────────────────────────────
@router.get("/holidays", response_model=APIResponse,
            dependencies=[Depends(require_permission("leave.read"))])
async def list_holidays(current_user: AuthUser, db: DBSession,
                        academic_year: str = Query(...)):
    holidays = HolidayService.list_by_year(db, academic_year)
    return APIResponse.ok(data=[HolidayResponse.model_validate(h).model_dump() for h in holidays])


@router.post("/holidays", response_model=APIResponse, status_code=201,
             dependencies=[Depends(require_permission("leave.manage"))])
async def create_holiday(body: HolidayCreate, current_user: AuthUser, db: DBSession):
    h = HolidayService.create(db, body, current_user.user_id)
    return APIResponse.created(data=HolidayResponse.model_validate(h).model_dump())


@router.delete("/holidays/{holiday_id}", response_model=APIResponse,
               dependencies=[Depends(require_permission("leave.manage"))])
async def delete_holiday(holiday_id: int, current_user: AuthUser, db: DBSession):
    HolidayService.delete(db, holiday_id, current_user.user_id)
    return APIResponse.ok(message="Holiday deleted.")
