"""
VidyaSetu ERP — Attendance Router
"""
from datetime import date
from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.dependencies import AuthUser, DBSession, require_permission
from app.modules.attendance.service import (
    HolidayRequest, HolidayResponse,
    BulkAttendanceRequest, AttendanceResponse, SessionResponse,
    BulkTeacherAttendanceRequest, TeacherAttendanceResponse,
    HolidayService, StudentAttendanceService, TeacherAttendanceService,
    AttendanceStatsService,
)
from app.shared.responses import APIResponse

router = APIRouter(prefix="/attendance", tags=["Attendance"])


# ── Stats ─────────────────────────────────────────────────────
@router.get("/stats", response_model=APIResponse,
            dependencies=[Depends(require_permission("attendance.read"))])
async def attendance_stats(current_user: AuthUser, db: DBSession,
                           academic_year_id: int = Query(...)):
    return APIResponse.ok(data=AttendanceStatsService.get(db, academic_year_id).model_dump())


# ── Holidays ──────────────────────────────────────────────────
@router.post("/holidays", response_model=APIResponse, status_code=201,
             dependencies=[Depends(require_permission("attendance.manage"))])
async def create_holiday(body: HolidayRequest, current_user: AuthUser, db: DBSession):
    h = HolidayService.create(db, body, current_user.user_id)
    return APIResponse.created(data=HolidayResponse.model_validate(h).model_dump())

@router.get("/holidays", response_model=APIResponse,
            dependencies=[Depends(require_permission("attendance.read"))])
async def list_holidays(current_user: AuthUser, db: DBSession,
                        year: int = Query(...), month: int = Query(...)):
    holidays = HolidayService.get_by_month(db, year, month)
    return APIResponse.ok(data=[HolidayResponse.model_validate(h).model_dump() for h in holidays])


# ── Student Attendance ────────────────────────────────────────
# ── Student Attendance ────────────────────────────────────
@router.post("/student/bulk", response_model=APIResponse,
             dependencies=[Depends(require_permission("attendance.mark"))])
async def mark_student_attendance(body: BulkAttendanceRequest, current_user: AuthUser, db: DBSession):
    """
    Mark bulk student attendance.
    For teachers (non-admin): validates they are assigned to the target class.
    Super admins and principals bypass this check.
    """
    # ── Teacher class authorization ──────────────────────────────
    if not current_user.is_super_admin():
        from app.modules.teacher.models import Teacher
        from sqlalchemy import select as _select
        teacher = db.scalar(
            _select(Teacher).where(
                Teacher.user_id == current_user.user_id,
                Teacher.is_deleted == False,
            )
        )
        if teacher:
            assigned = [c.strip() for c in (teacher.classes_assigned or "").split(",") if c.strip()]
            # Only enforce if teacher has explicit assignments
            if assigned and body.standard not in assigned:
                from fastapi import HTTPException
                raise HTTPException(
                    status_code=403,
                    detail=f"You are not authorized to mark attendance for Standard {body.standard}. "
                           f"Your assigned classes: {', '.join(assigned)}."
                )

    count = StudentAttendanceService.mark_bulk(db, body, current_user.user_id)
    return APIResponse.ok(data={"saved": count}, message=f"{count} attendance records saved.")

@router.get("/student/roster", response_model=APIResponse,
            dependencies=[Depends(require_permission("attendance.read"))])
async def get_class_roster(current_user: AuthUser, db: DBSession,
                           att_date: date = Query(...), standard: str = Query(...),
                           division: Optional[str] = None,
                           academic_year_id: int = Query(...),
                           period: str = Query("full_day"),
                           subject_id: Optional[int] = None):
    roster_data = StudentAttendanceService.get_class_roster(
        db, standard, division, att_date, academic_year_id, period, subject_id
    )
    return APIResponse.ok(data=roster_data)

@router.get("/student/day", response_model=APIResponse,
            dependencies=[Depends(require_permission("attendance.read"))])
async def get_day_attendance(current_user: AuthUser, db: DBSession,
                             att_date: date = Query(...), standard: str = Query(...),
                             division: Optional[str] = None,
                             academic_year_id: int = Query(...),
                             period: str = Query("full_day"),
                             subject_id: Optional[int] = None):
    records = StudentAttendanceService.get_day_attendance(
        db, att_date, standard, division, academic_year_id, period, subject_id
    )
    return APIResponse.ok(data=records)

@router.get("/student/{student_id}/month", response_model=APIResponse,
            dependencies=[Depends(require_permission("attendance.read"))])
async def get_student_month(student_id: int, current_user: AuthUser, db: DBSession,
                             year: int = Query(...), month: int = Query(...)):
    records = StudentAttendanceService.get_student_month_attendance(db, student_id, year, month)
    return APIResponse.ok(data=[AttendanceResponse.model_validate(r).model_dump() for r in records])

@router.get("/class/sessions", response_model=APIResponse,
            dependencies=[Depends(require_permission("attendance.read"))])
async def get_class_sessions(current_user: AuthUser, db: DBSession,
                              standard: str = Query(...), academic_year_id: int = Query(...),
                              year: int = Query(...), month: int = Query(...),
                              subject_id: Optional[int] = None,
                              period: Optional[str] = None):
    sessions = StudentAttendanceService.get_class_sessions(db, standard, academic_year_id, year, month, subject_id, period)
    return APIResponse.ok(data=[SessionResponse.model_validate(s).model_dump() for s in sessions])

@router.get("/defaulters", response_model=APIResponse,
            dependencies=[Depends(require_permission("attendance.read"))])
async def get_defaulters(current_user: AuthUser, db: DBSession,
                          academic_year_id: int = Query(...),
                          year: int = Query(...), month: int = Query(...),
                          standard: Optional[str] = None,
                          threshold: float = Query(75.0)):
    defaulters = StudentAttendanceService.get_defaulters(
        db, academic_year_id, standard, year, month, threshold
    )
    return APIResponse.ok(data=[d.model_dump() for d in defaulters])


# ── Teacher Attendance ────────────────────────────────────────
@router.post("/teacher/bulk", response_model=APIResponse,
             dependencies=[Depends(require_permission("attendance.mark"))])
async def mark_teacher_attendance(body: BulkTeacherAttendanceRequest,
                                  current_user: AuthUser, db: DBSession):
    count = TeacherAttendanceService.mark_bulk(db, body, current_user.user_id)
    return APIResponse.ok(data={"saved": count}, message=f"{count} teacher attendance records saved.")

@router.get("/teacher/day", response_model=APIResponse,
            dependencies=[Depends(require_permission("attendance.read"))])
async def get_teacher_day(current_user: AuthUser, db: DBSession,
                           att_date: date = Query(...), academic_year_id: int = Query(...)):
    records = TeacherAttendanceService.get_day(db, att_date, academic_year_id)
    return APIResponse.ok(data=[TeacherAttendanceResponse.model_validate(r).model_dump() for r in records])

@router.get("/teacher/{teacher_id}/month", response_model=APIResponse,
            dependencies=[Depends(require_permission("attendance.read"))])
async def get_teacher_month(teacher_id: int, current_user: AuthUser, db: DBSession,
                             year: int = Query(...), month: int = Query(...)):
    records = TeacherAttendanceService.get_teacher_month(db, teacher_id, year, month)
    return APIResponse.ok(data=[TeacherAttendanceResponse.model_validate(r).model_dump() for r in records])
