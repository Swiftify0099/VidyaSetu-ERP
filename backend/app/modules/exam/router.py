"""
VidyaSetu ERP — Exam Router
"""
from typing import Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.core.dependencies import AuthUser, DBSession, require_permission
from app.modules.exam.service import (
    ExamTypeRequest, ExamTypeResponse,
    ExamRequest, ExamResponse,
    ExamSubjectRequest, ExamSubjectResponse,
    BulkMarkEntryRequest, MarkResponse,
    ExamTypeService, ExamService, MarksService, ResultService, ExamStatsService,
)
from app.shared.responses import APIResponse

router = APIRouter(prefix="/exams", tags=["Examinations"])


# ── Stats ─────────────────────────────────────────────────────
@router.get("/stats", response_model=APIResponse,
            dependencies=[Depends(require_permission("exam.read"))])
async def exam_stats(current_user: AuthUser, db: DBSession, academic_year_id: int = Query(...)):
    return APIResponse.ok(data=ExamStatsService.get(db, academic_year_id).model_dump())


# ── Exam Types ────────────────────────────────────────────────
@router.post("/types", response_model=APIResponse, status_code=201,
             dependencies=[Depends(require_permission("exam.manage"))])
async def create_exam_type(body: ExamTypeRequest, current_user: AuthUser, db: DBSession):
    et = ExamTypeService.create(db, body, current_user.user_id)
    return APIResponse.created(data=ExamTypeResponse.model_validate(et).model_dump())

@router.get("/types", response_model=APIResponse,
            dependencies=[Depends(require_permission("exam.read"))])
async def list_exam_types(current_user: AuthUser, db: DBSession, academic_year_id: int = Query(...)):
    types = ExamTypeService.get_by_year(db, academic_year_id)
    return APIResponse.ok(data=[ExamTypeResponse.model_validate(t).model_dump() for t in types])


# ── Exams ─────────────────────────────────────────────────────
@router.post("", response_model=APIResponse, status_code=201,
             dependencies=[Depends(require_permission("exam.manage"))])
async def create_exam(body: ExamRequest, current_user: AuthUser, db: DBSession):
    exam = ExamService.create(db, body, current_user.user_id)
    return APIResponse.created(data=ExamResponse.model_validate(exam).model_dump(),
                               message=f"Exam created for Std {body.standard}.")

@router.get("", response_model=APIResponse,
            dependencies=[Depends(require_permission("exam.read"))])
async def list_exams(current_user: AuthUser, db: DBSession,
                     academic_year_id: int = Query(...), standard: str = Query(...)):
    exams = ExamService.get_by_standard(db, academic_year_id, standard)
    return APIResponse.ok(data=[ExamResponse.model_validate(e).model_dump() for e in exams])

@router.get("/{exam_id}", response_model=APIResponse,
            dependencies=[Depends(require_permission("exam.read"))])
async def get_exam(exam_id: int, current_user: AuthUser, db: DBSession):
    return APIResponse.ok(data=ExamResponse.model_validate(ExamService.get_by_id(db, exam_id)).model_dump())

@router.post("/{exam_id}/subjects", response_model=APIResponse, status_code=201,
             dependencies=[Depends(require_permission("exam.manage"))])
async def add_subject(exam_id: int, body: ExamSubjectRequest, current_user: AuthUser, db: DBSession):
    s = ExamService.add_subject(db, exam_id, body, current_user.user_id)
    return APIResponse.created(data=ExamSubjectResponse.model_validate(s).model_dump())


# ── Marks Entry ───────────────────────────────────────────────
@router.post("/marks/bulk", response_model=APIResponse,
             dependencies=[Depends(require_permission("exam.marks.enter"))])
async def bulk_enter_marks(body: BulkMarkEntryRequest, current_user: AuthUser, db: DBSession):
    count = MarksService.bulk_enter(db, body, entered_by=current_user.user_id)
    return APIResponse.ok(data={"saved": count}, message=f"{count} marks saved.")

@router.get("/{exam_id}/subjects/{subject_id}/marks", response_model=APIResponse,
            dependencies=[Depends(require_permission("exam.read"))])
async def get_subject_marks(
    exam_id: int,
    subject_id: int,
    current_user: AuthUser,
    db: DBSession,
    division: Optional[str] = Query(None),
):
    marks = MarksService.get_marks_for_subject(db, exam_id, subject_id, division=division)
    return APIResponse.ok(data=marks)


# ── Results ───────────────────────────────────────────────────
@router.post("/{exam_id}/compile-results", response_model=APIResponse,
             dependencies=[Depends(require_permission("exam.results.compile"))])
async def compile_results(exam_id: int, current_user: AuthUser, db: DBSession):
    count = ResultService.compile_results(db, exam_id, compiled_by=current_user.user_id)
    return APIResponse.ok(data={"students_processed": count},
                          message=f"Results compiled for {count} students.")

@router.get("/{exam_id}/results", response_model=APIResponse,
            dependencies=[Depends(require_permission("exam.read"))])
async def get_class_results(
    exam_id: int,
    current_user: AuthUser,
    db: DBSession,
    division: Optional[str] = Query(None),
):
    summary = ResultService.get_class_result(db, exam_id, division=division)
    return APIResponse.ok(data=summary.model_dump())

