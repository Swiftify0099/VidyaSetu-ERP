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
    AssignmentRequest, AssignmentResponse, BulkAssignmentRequest,
    SubstituteRequest, SubstituteResponse,
    CopyTimetableRequest, AutoGenerateRequest,
    SubjectService, PeriodService, TimetableService, AssignmentService, SubstituteService,
)
from app.shared.responses import APIResponse

router = APIRouter(prefix="/timetable", tags=["Timetable"])


# ── Stats ─────────────────────────────────────────────────────
@router.get("/stats", response_model=APIResponse)
async def get_timetable_stats(current_user: AuthUser, db: DBSession, academic_year_id: int = Query(default=1)):
    stats = TimetableService.get_stats(db, academic_year_id)
    return APIResponse.ok(data=stats.model_dump())


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

@router.put("/periods/{period_id}", response_model=APIResponse)
async def update_period(period_id: int, body: PeriodConfigRequest, current_user: AuthUser, db: DBSession):
    p = PeriodService.update(db, period_id, body, current_user.user_id)
    return APIResponse.ok(data=PeriodConfigResponse.model_validate(p).model_dump())

@router.delete("/periods/{period_id}", response_model=APIResponse)
async def delete_period(period_id: int, current_user: AuthUser, db: DBSession):
    PeriodService.delete(db, period_id, current_user.user_id)
    return APIResponse.ok(message="Period deleted.")

@router.post("/periods/seed", response_model=APIResponse)
async def seed_periods(current_user: AuthUser, db: DBSession, academic_year_id: int = Query(default=1)):
    count = PeriodService.seed_default(db, academic_year_id, current_user.user_id)
    return APIResponse.ok(data={"created": count}, message=f"{count} periods seeded.")


# ── Timetable Entries & Grid ──────────────────────────────────
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

@router.get("/check-conflict", response_model=APIResponse)
async def check_teacher_conflict(current_user: AuthUser, db: DBSession,
                                  teacher_id: int = Query(...),
                                  day_of_week: int = Query(...),
                                  period_id: int = Query(...),
                                  standard: str = Query(...),
                                  division: Optional[str] = Query(default=None),
                                  academic_year_id: int = Query(default=1)):
    conflict = TimetableService.check_teacher_conflict(
        db, teacher_id, day_of_week, period_id, academic_year_id, standard, division
    )
    return APIResponse.ok(data=conflict.model_dump())

@router.get("/free-teachers", response_model=APIResponse)
async def get_free_teachers(current_user: AuthUser, db: DBSession,
                             day_of_week: int = Query(...),
                             period_id: int = Query(...),
                             academic_year_id: int = Query(default=1)):
    teachers = TimetableService.get_free_teachers(db, day_of_week, period_id, academic_year_id)
    return APIResponse.ok(data=[t.model_dump() for t in teachers])

@router.post("/copy", response_model=APIResponse)
async def copy_timetable(body: CopyTimetableRequest, current_user: AuthUser, db: DBSession):
    count = TimetableService.copy_timetable(db, body, current_user.user_id)
    return APIResponse.ok(data={"copied": count}, message=f"{count} timetable entries copied successfully.")

@router.post("/auto-generate", response_model=APIResponse)
async def auto_generate_timetable(body: AutoGenerateRequest, current_user: AuthUser, db: DBSession):
    count = TimetableService.auto_generate_timetable(db, body, current_user.user_id)
    return APIResponse.ok(data={"generated": count}, message=f"Successfully generated {count} timetable periods for Std {body.standard}{body.division or ''}.")



# ── Substitutes ───────────────────────────────────────────────
@router.post("/substitutes", response_model=APIResponse, status_code=201)
async def create_substitute(body: SubstituteRequest, current_user: AuthUser, db: DBSession):
    sub = SubstituteService.create(db, body, current_user.user_id)
    return APIResponse.created(data={"id": sub.id}, message="Substitute assigned.")

@router.get("/substitutes", response_model=APIResponse)
async def list_substitutes(current_user: AuthUser, db: DBSession, substitute_date: str = Query(...)):
    subs = SubstituteService.get_by_date(db, substitute_date)
    return APIResponse.ok(data=[s.model_dump() for s in subs])

@router.delete("/substitutes/{substitute_id}", response_model=APIResponse)
async def delete_substitute(substitute_id: int, current_user: AuthUser, db: DBSession):
    SubstituteService.delete(db, substitute_id, current_user.user_id)
    return APIResponse.ok(message="Substitute entry removed.")


# ── Teacher-Subject Assignments ───────────────────────────────
@router.post("/assignments", response_model=APIResponse, status_code=201)
async def create_assignment(body: AssignmentRequest, current_user: AuthUser, db: DBSession):
    a = AssignmentService.create(db, body, current_user.user_id)
    return APIResponse.created(data=AssignmentResponse.model_validate(a).model_dump())

@router.post("/assignments/bulk", response_model=APIResponse, status_code=201)
async def bulk_create_assignments(body: BulkAssignmentRequest, current_user: AuthUser, db: DBSession):
    created = AssignmentService.bulk_create(db, body, current_user.user_id)
    return APIResponse.created(
        data=[AssignmentResponse.model_validate(a).model_dump() for a in created],
        message=f"{len(created)} teacher subject allocations created successfully."
    )

@router.get("/assignments", response_model=APIResponse)
async def list_assignments(current_user: AuthUser, db: DBSession, academic_year_id: int = Query(default=1)):
    assignments = AssignmentService.get_all(db, academic_year_id)
    return APIResponse.ok(data=[AssignmentResponse.model_validate(a).model_dump() for a in assignments])

@router.get("/assignments/teacher/{teacher_id}", response_model=APIResponse)
async def get_teacher_assignments(teacher_id: int, current_user: AuthUser, db: DBSession,
                                   academic_year_id: int = Query(default=1)):
    assignments = AssignmentService.get_by_teacher(db, teacher_id, academic_year_id)
    return APIResponse.ok(data=[AssignmentResponse.model_validate(a).model_dump() for a in assignments])

@router.put("/assignments/{assignment_id}", response_model=APIResponse)
async def update_assignment(assignment_id: int, body: AssignmentRequest, current_user: AuthUser, db: DBSession):
    a = AssignmentService.update(db, assignment_id, body, current_user.user_id)
    return APIResponse.ok(data=AssignmentResponse.model_validate(a).model_dump(), message="Assignment updated.")

@router.delete("/assignments/{assignment_id}", response_model=APIResponse)
async def delete_assignment(assignment_id: int, current_user: AuthUser, db: DBSession):
    AssignmentService.delete(db, assignment_id, current_user.user_id)
    return APIResponse.ok(message="Assignment removed.")


