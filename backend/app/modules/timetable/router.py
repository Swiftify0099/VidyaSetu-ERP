"""
VidyaSetu ERP — Timetable Router
"""
from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.dependencies import AuthUser, DBSession, require_permission
from app.modules.timetable.service import (
    SubjectRequest, SubjectResponse,
    PeriodConfigRequest, PeriodConfigResponse,
    TimetableEntryRequest, TimetableEntryResponse,
    AssignmentRequest, AssignmentResponse,
    SubjectService, PeriodService, TimetableService, AssignmentService,
)
from app.shared.responses import APIResponse

router = APIRouter(prefix="/timetable", tags=["Timetable"])


# ── Subjects ──────────────────────────────────────────────────
@router.post("/subjects", response_model=APIResponse, status_code=201)
async def create_subject(body: SubjectRequest, current_user: AuthUser, db: DBSession):
    s = SubjectService.create(db, body, current_user.user_id)
    return APIResponse.created(data=SubjectResponse.model_validate(s).model_dump())

@router.get("/subjects", response_model=APIResponse)
async def list_subjects(current_user: AuthUser, db: DBSession):
    subjects = SubjectService.get_all(db)
    return APIResponse.ok(data=[SubjectResponse.model_validate(s).model_dump() for s in subjects])

@router.put("/subjects/{subject_id}", response_model=APIResponse)
async def update_subject(subject_id: int, body: SubjectRequest, current_user: AuthUser, db: DBSession):
    s = SubjectService.update(db, subject_id, body, current_user.user_id)
    return APIResponse.ok(data=SubjectResponse.model_validate(s).model_dump())

@router.delete("/subjects/{subject_id}", response_model=APIResponse)
async def delete_subject(subject_id: int, current_user: AuthUser, db: DBSession):
    SubjectService.delete(db, subject_id, current_user.user_id)
    return APIResponse.ok(message="Subject deleted.")


# ── Period Configuration ──────────────────────────────────────
@router.post("/periods", response_model=APIResponse, status_code=201)
async def create_period(body: PeriodConfigRequest, current_user: AuthUser, db: DBSession):
    p = PeriodService.create(db, body, current_user.user_id)
    return APIResponse.created(data=PeriodConfigResponse.model_validate(p).model_dump())

@router.get("/periods", response_model=APIResponse)
async def list_periods(current_user: AuthUser, db: DBSession, academic_year_id: int = Query(default=1)):
    periods = PeriodService.get_by_year(db, academic_year_id)
    return APIResponse.ok(data=[PeriodConfigResponse.model_validate(p).model_dump() for p in periods])

@router.post("/periods/seed", response_model=APIResponse)
async def seed_periods(current_user: AuthUser, db: DBSession, academic_year_id: int = Query(default=1)):
    count = PeriodService.seed_default(db, academic_year_id, current_user.user_id)
    return APIResponse.ok(data={"created": count}, message=f"{count} periods seeded.")


# ── Timetable Entries ─────────────────────────────────────────
@router.post("/entries", response_model=APIResponse)
async def upsert_entry(body: TimetableEntryRequest, current_user: AuthUser, db: DBSession):
    entry = TimetableService.upsert_entry(db, body, current_user.user_id)
    return APIResponse.ok(data=TimetableEntryResponse.model_validate(entry).model_dump(),
                          message="Timetable updated.")

@router.get("/class", response_model=APIResponse)
async def get_class_timetable(current_user: AuthUser, db: DBSession,
                               standard: str = Query(...),
                               division: Optional[str] = None,
                               academic_year_id: int = Query(default=1)):
    tt = TimetableService.get_class_timetable(db, standard, division, academic_year_id)
    return APIResponse.ok(data=tt.model_dump())

@router.get("/teacher/{teacher_id}", response_model=APIResponse)
async def get_teacher_timetable(teacher_id: int, current_user: AuthUser, db: DBSession,
                                 academic_year_id: int = Query(default=1)):
    cells = TimetableService.get_teacher_timetable(db, teacher_id, academic_year_id)
    return APIResponse.ok(data=[c.model_dump() for c in cells])

@router.delete("/entries/{entry_id}", response_model=APIResponse)
async def delete_entry(entry_id: int, current_user: AuthUser, db: DBSession):
    TimetableService.delete_entry(db, entry_id, current_user.user_id)
    return APIResponse.ok(message="Entry cleared.")


# ── Teacher-Subject Assignments ───────────────────────────────
@router.post("/assignments", response_model=APIResponse, status_code=201)
async def create_assignment(body: AssignmentRequest, current_user: AuthUser, db: DBSession):
    a = AssignmentService.create(db, body, current_user.user_id)
    return APIResponse.created(data=AssignmentResponse.model_validate(a).model_dump())

@router.get("/assignments/teacher/{teacher_id}", response_model=APIResponse)
async def get_teacher_assignments(teacher_id: int, current_user: AuthUser, db: DBSession,
                                   academic_year_id: int = Query(default=1)):
    assignments = AssignmentService.get_by_teacher(db, teacher_id, academic_year_id)
    return APIResponse.ok(data=[AssignmentResponse.model_validate(a).model_dump() for a in assignments])
