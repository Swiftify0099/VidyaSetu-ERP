"""
VidyaSetu ERP — Analytics Router
"""
from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.dependencies import AuthUser, DBSession, require_permission
from app.modules.analytics.service import AnalyticsService
from app.shared.responses import APIResponse

router = APIRouter(prefix="/analytics", tags=["Analytics"])


@router.get("/dashboard", response_model=APIResponse,
            dependencies=[Depends(require_permission("analytics.view_analytics"))])
async def master_dashboard(current_user: AuthUser, db: DBSession,
                            academic_year_id: int = Query(1)):
    data = AnalyticsService.master_dashboard(db, academic_year_id)
    return APIResponse.ok(data=data.model_dump())


@router.get("/students", response_model=APIResponse,
            dependencies=[Depends(require_permission("analytics.view_analytics"))])
async def student_report(current_user: AuthUser, db: DBSession,
                          academic_year_id: int = Query(1)):
    data = AnalyticsService.student_strength(db, academic_year_id)
    return APIResponse.ok(data=data.model_dump())


@router.get("/attendance", response_model=APIResponse,
            dependencies=[Depends(require_permission("analytics.view_analytics"))])
async def attendance_report(current_user: AuthUser, db: DBSession,
                             academic_year_id: int = Query(1)):
    data = AnalyticsService.attendance_summary(db, academic_year_id)
    return APIResponse.ok(data=data.model_dump())


@router.get("/fees", response_model=APIResponse,
            dependencies=[Depends(require_permission("analytics.view_analytics"))])
async def fee_report(current_user: AuthUser, db: DBSession,
                      academic_year_id: int = Query(1)):
    data = AnalyticsService.fee_report(db, academic_year_id)
    return APIResponse.ok(data=data.model_dump())


@router.get("/library", response_model=APIResponse,
            dependencies=[Depends(require_permission("analytics.view_analytics"))])
async def library_report(current_user: AuthUser, db: DBSession):
    data = AnalyticsService.library_report(db)
    return APIResponse.ok(data=data.model_dump())


@router.get("/inventory", response_model=APIResponse,
            dependencies=[Depends(require_permission("analytics.view_analytics"))])
async def inventory_report(current_user: AuthUser, db: DBSession):
    data = AnalyticsService.inventory_report(db)
    return APIResponse.ok(data=data.model_dump())
