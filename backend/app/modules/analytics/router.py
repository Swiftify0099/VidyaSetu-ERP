"""
VidyaSetu ERP — Analytics Router
==================================
All analytics endpoints wired to real DB aggregations.
Authorization: requires analytics.view_analytics permission.
Role filtering is applied inside each handler where needed.
"""
from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.dependencies import AuthUser, DBSession, require_permission
from app.modules.analytics.service import AnalyticsService
from app.shared.responses import APIResponse

router = APIRouter(prefix="/analytics", tags=["Analytics"])

_PERM = Depends(require_permission("analytics.view_analytics"))


# ── Overview / Dashboard ─────────────────────────────────────────────────────

@router.get("/dashboard", response_model=APIResponse, dependencies=[_PERM])
async def master_dashboard(current_user: AuthUser, db: DBSession,
                            academic_year_id: int = Query(1)):
    """Top-level KPI strip for admin/principal — real DB aggregation."""
    data = AnalyticsService.master_dashboard(db, academic_year_id)
    return APIResponse.ok(data=data.model_dump())


@router.get("/summary", response_model=APIResponse, dependencies=[_PERM])
async def master_dashboard_alias(current_user: AuthUser, db: DBSession,
                                  academic_year_id: int = Query(1),
                                  academic_year: Optional[str] = Query(None)):
    """Alias for /dashboard — backwards compatibility with mobile app."""
    data = AnalyticsService.master_dashboard(db, academic_year_id)
    return APIResponse.ok(data=data.model_dump())


# ── Student Analytics ────────────────────────────────────────────────────────

@router.get("/students", response_model=APIResponse, dependencies=[_PERM])
async def student_report(current_user: AuthUser, db: DBSession,
                          academic_year_id: int = Query(1)):
    """Student strength: total, gender breakdown, class-wise, division-wise, admissions."""
    data = AnalyticsService.student_strength(db, academic_year_id)
    return APIResponse.ok(data=data.model_dump())


# ── Attendance Analytics ──────────────────────────────────────────────────────

@router.get("/attendance", response_model=APIResponse, dependencies=[_PERM])
async def attendance_report(current_user: AuthUser, db: DBSession,
                             academic_year_id: int = Query(1),
                             standard: Optional[str] = Query(None),
                             division: Optional[str] = Query(None)):
    """Overall attendance stats with class-wise breakdown."""
    data = AnalyticsService.attendance_summary(db, academic_year_id, standard, division)
    return APIResponse.ok(data=data.model_dump())


@router.get("/attendance/trend", response_model=APIResponse, dependencies=[_PERM])
async def attendance_trend(current_user: AuthUser, db: DBSession,
                            academic_year_id: int = Query(1),
                            standard: Optional[str] = Query(None),
                            division: Optional[str] = Query(None)):
    """Monthly attendance trend + day-of-week pattern from actual records."""
    data = AnalyticsService.attendance_trend(db, academic_year_id, standard, division)
    return APIResponse.ok(data=data.model_dump())


@router.get("/attendance/low", response_model=APIResponse, dependencies=[_PERM])
async def low_attendance_students(current_user: AuthUser, db: DBSession,
                                   academic_year_id: int = Query(1),
                                   threshold_pct: float = Query(75.0),
                                   standard: Optional[str] = Query(None),
                                   division: Optional[str] = Query(None),
                                   limit: int = Query(50)):
    """Students below attendance threshold — sorted by lowest attendance."""
    data = AnalyticsService.low_attendance_students(
        db, academic_year_id, threshold_pct, standard, division, limit
    )
    return APIResponse.ok(data=data.model_dump())


# ── Finance Analytics ─────────────────────────────────────────────────────────

@router.get("/fees", response_model=APIResponse, dependencies=[_PERM])
async def fee_report(current_user: AuthUser, db: DBSession,
                      academic_year_id: int = Query(1)):
    """Full fee analytics: collection %, monthly trend, defaulters, payment types."""
    data = AnalyticsService.fee_report(db, academic_year_id)
    return APIResponse.ok(data=data.model_dump())


@router.get("/fees/classes", response_model=APIResponse, dependencies=[_PERM])
async def fee_class_analysis(current_user: AuthUser, db: DBSession,
                              academic_year_id: int = Query(1),
                              standard: Optional[str] = Query(None)):
    """Class-wise fee collection breakdown from student_fee_records."""
    data = AnalyticsService.fee_class_analysis(db, academic_year_id, standard)
    return APIResponse.ok(data=data.model_dump())


@router.get("/fees/outstanding", response_model=APIResponse, dependencies=[_PERM])
async def fee_outstanding(current_user: AuthUser, db: DBSession,
                           academic_year_id: int = Query(1),
                           standard: Optional[str] = Query(None),
                           limit: int = Query(50)):
    """Students with outstanding fees, sorted by highest pending amount."""
    data = AnalyticsService.fee_outstanding_students(db, academic_year_id, standard, limit)
    return APIResponse.ok(data=data.model_dump())


@router.get("/fees/payment-modes", response_model=APIResponse, dependencies=[_PERM])
async def payment_method_breakdown(current_user: AuthUser, db: DBSession,
                                    academic_year_id: int = Query(1)):
    """Payment mode distribution: cash, UPI, cheque, bank transfer, etc."""
    data = AnalyticsService.payment_method_breakdown(db, academic_year_id)
    return APIResponse.ok(data=data.model_dump())


# ── Academic Analytics ────────────────────────────────────────────────────────

@router.get("/academic", response_model=APIResponse, dependencies=[_PERM])
async def academic_performance(current_user: AuthUser, db: DBSession,
                                academic_year_id: int = Query(1),
                                standard: Optional[str] = Query(None),
                                exam_type_id: Optional[int] = Query(None)):
    """Academic performance: pass %, avg marks, subject-wise, grade distribution."""
    data = AnalyticsService.academic_performance(db, academic_year_id, standard, exam_type_id)
    return APIResponse.ok(data=data.model_dump())


# ── Class Analytics ───────────────────────────────────────────────────────────

@router.get("/classes", response_model=APIResponse, dependencies=[_PERM])
async def class_analytics(current_user: AuthUser, db: DBSession,
                           academic_year_id: int = Query(1),
                           standard: Optional[str] = Query(None),
                           division: Optional[str] = Query(None)):
    """Per-class/division health: students, attendance, fees, academic performance."""
    data = AnalyticsService.class_analytics(db, academic_year_id, standard, division)
    return APIResponse.ok(data=data.model_dump())


# ── Teacher / Staff Analytics ─────────────────────────────────────────────────

@router.get("/teachers", response_model=APIResponse, dependencies=[_PERM])
async def teacher_analytics(current_user: AuthUser, db: DBSession,
                             academic_year_id: int = Query(1)):
    """Teacher/staff analytics: count by type, department, workload, attendance."""
    data = AnalyticsService.teacher_analytics(db, academic_year_id)
    return APIResponse.ok(data=data.model_dump())


# ── Risk Indicators ───────────────────────────────────────────────────────────

@router.get("/risk", response_model=APIResponse, dependencies=[_PERM])
async def student_risk(current_user: AuthUser, db: DBSession,
                        academic_year_id: int = Query(1),
                        standard: Optional[str] = Query(None)):
    """Students at risk: low attendance, pending fees, academic failure."""
    data = AnalyticsService.student_risk_indicators(db, academic_year_id, standard)
    return APIResponse.ok(data=data.model_dump())


# ── Insights ──────────────────────────────────────────────────────────────────

@router.get("/insights", response_model=APIResponse, dependencies=[_PERM])
async def insights(current_user: AuthUser, db: DBSession,
                    academic_year_id: int = Query(1)):
    """NLG insights generated from real ERP data — no hardcoded messages."""
    data = AnalyticsService.insights(db, academic_year_id)
    return APIResponse.ok(data=data.model_dump())


# ── Library ───────────────────────────────────────────────────────────────────

@router.get("/library", response_model=APIResponse, dependencies=[_PERM])
async def library_report(current_user: AuthUser, db: DBSession):
    """Library utilization: books, issued, overdue."""
    data = AnalyticsService.library_report(db)
    return APIResponse.ok(data=data.model_dump())


# ── Inventory ─────────────────────────────────────────────────────────────────

@router.get("/inventory", response_model=APIResponse, dependencies=[_PERM])
async def inventory_report(current_user: AuthUser, db: DBSession):
    """Inventory/asset analytics: total assets, value, low stock alerts."""
    data = AnalyticsService.inventory_report(db)
    return APIResponse.ok(data=data.model_dump())
