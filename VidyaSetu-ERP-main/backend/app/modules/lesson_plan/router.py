"""
VidyaSetu ERP — Lesson Plan Module Schemas + Service + Router (combined)
"""
from datetime import date
from typing import Optional
from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel, Field, field_validator
from sqlalchemy import select, func
from sqlalchemy.orm import Session

from app.core.dependencies import AuthUser, DBSession, require_permission
from app.modules.lesson_plan.models import LessonPlan, TeachingDiary
from app.shared.responses import APIResponse
from app.shared.audit import create_audit_log


# ══════════════════════════════════════════════════════════════
# SCHEMAS
# ══════════════════════════════════════════════════════════════

class LessonPlanCreate(BaseModel):
    standard: str = Field(..., min_length=1, max_length=10)
    division: str = Field(..., min_length=1, max_length=5)
    subject_name: str = Field(..., min_length=1, max_length=150)
    subject_name_marathi: Optional[str] = None
    academic_year: str = Field(..., pattern=r"^\d{4}-\d{4}$")
    month: int = Field(..., ge=1, le=12)
    chapter_name: str = Field(..., min_length=1, max_length=300)
    chapter_name_marathi: Optional[str] = None
    topics_planned: str = Field(..., min_length=1)
    learning_objectives: Optional[str] = None
    teaching_methods: Optional[str] = None
    resources_required: Optional[str] = None
    planned_periods: int = Field(default=0, ge=0)
    formative_assessment: Optional[str] = None
    summative_assessment: Optional[str] = None
    remarks: Optional[str] = None


class LessonPlanUpdate(BaseModel):
    chapter_name: Optional[str] = None
    topics_planned: Optional[str] = None
    learning_objectives: Optional[str] = None
    teaching_methods: Optional[str] = None
    resources_required: Optional[str] = None
    planned_periods: Optional[int] = Field(None, ge=0)
    completed_periods: Optional[int] = Field(None, ge=0)
    formative_assessment: Optional[str] = None
    summative_assessment: Optional[str] = None
    remarks: Optional[str] = None


class LessonPlanResponse(BaseModel):
    id: int
    teacher_id: int
    teacher_name: str
    standard: str
    division: str
    subject_name: str
    subject_name_marathi: Optional[str]
    academic_year: str
    month: int
    chapter_name: str
    topics_planned: str
    learning_objectives: Optional[str]
    teaching_methods: Optional[str]
    resources_required: Optional[str]
    planned_periods: int
    completed_periods: int
    formative_assessment: Optional[str]
    summative_assessment: Optional[str]
    status: str
    submitted_on: Optional[date]
    approved_by: Optional[int]
    approved_on: Optional[date]
    revision_remarks: Optional[str]
    remarks: Optional[str]
    is_active: bool
    model_config = {"from_attributes": True}


class DiaryCreate(BaseModel):
    lesson_plan_id: Optional[int] = None
    standard: str = Field(..., max_length=10)
    division: str = Field(..., max_length=5)
    subject_name: str = Field(..., max_length=150)
    academic_year: str = Field(..., pattern=r"^\d{4}-\d{4}$")
    diary_date: date
    period_number: Optional[int] = Field(None, ge=1)
    topic_covered: str = Field(..., min_length=1, max_length=500)
    sub_topics: Optional[str] = None
    teaching_method_used: Optional[str] = None
    students_present: Optional[int] = Field(None, ge=0)
    class_participation: Optional[str] = Field(None, pattern="^(excellent|good|average|poor)$")
    homework_given: bool = False
    homework_description: Optional[str] = None
    homework_due_date: Optional[date] = None
    difficulties_observed: Optional[str] = None
    remedial_needed: bool = False
    remedial_students: Optional[str] = None
    remarks: Optional[str] = None

    @field_validator("homework_due_date")
    @classmethod
    def due_after_diary(cls, v, info):
        d = info.data.get("diary_date")
        if v and d and v < d:
            raise ValueError("homework_due_date must be on or after diary_date")
        return v


class DiaryResponse(BaseModel):
    id: int
    lesson_plan_id: Optional[int]
    teacher_id: int
    teacher_name: str
    standard: str
    division: str
    subject_name: str
    academic_year: str
    diary_date: date
    period_number: Optional[int]
    topic_covered: str
    sub_topics: Optional[str]
    teaching_method_used: Optional[str]
    students_present: Optional[int]
    class_participation: Optional[str]
    homework_given: bool
    homework_description: Optional[str]
    homework_due_date: Optional[date]
    difficulties_observed: Optional[str]
    remedial_needed: bool
    remedial_students: Optional[str]
    remarks: Optional[str]
    model_config = {"from_attributes": True}


# ══════════════════════════════════════════════════════════════
# SERVICE
# ══════════════════════════════════════════════════════════════

class LessonPlanService:

    @staticmethod
    def create(db: Session, data: LessonPlanCreate,
               teacher_id: int, teacher_name: str, by: int) -> LessonPlan:
        # Check uniqueness
        existing = db.scalar(
            select(LessonPlan).where(
                LessonPlan.teacher_id == teacher_id,
                LessonPlan.standard == data.standard,
                LessonPlan.division == data.division,
                LessonPlan.subject_name == data.subject_name,
                LessonPlan.academic_year == data.academic_year,
                LessonPlan.month == data.month,
                LessonPlan.is_deleted == False,
            )
        )
        if existing:
            raise ValueError(
                f"Lesson plan for {data.subject_name} Std {data.standard}{data.division} "
                f"Month {data.month} already exists."
            )
        lp = LessonPlan(
            **data.model_dump(),
            teacher_id=teacher_id,
            teacher_name=teacher_name,
            created_by=by, updated_by=by,
        )
        db.add(lp)
        db.commit()
        db.refresh(lp)
        create_audit_log(db, "create", "lesson_plans", lp.id, None, {"subject": data.subject_name}, by)
        return lp

    @staticmethod
    def update(db: Session, plan_id: int, data: LessonPlanUpdate, by: int) -> LessonPlan:
        lp = db.get(LessonPlan, plan_id)
        if not lp or lp.is_deleted:
            raise ValueError("Lesson plan not found")
        for k, v in data.model_dump(exclude_none=True).items():
            setattr(lp, k, v)
        lp.updated_by = by
        db.commit()
        db.refresh(lp)
        return lp

    @staticmethod
    def submit(db: Session, plan_id: int, by: int) -> LessonPlan:
        lp = db.get(LessonPlan, plan_id)
        if not lp or lp.is_deleted:
            raise ValueError("Lesson plan not found")
        if lp.status not in ("draft", "revision_needed"):
            raise ValueError(f"Cannot submit a {lp.status} lesson plan")
        lp.status = "submitted"
        lp.submitted_on = date.today()
        lp.updated_by = by
        db.commit()
        db.refresh(lp)
        return lp

    @staticmethod
    def approve_or_revise(db: Session, plan_id: int,
                          action: str, remarks: Optional[str],
                          by: int) -> LessonPlan:
        lp = db.get(LessonPlan, plan_id)
        if not lp or lp.is_deleted:
            raise ValueError("Lesson plan not found")
        if lp.status != "submitted":
            raise ValueError("Only submitted plans can be approved/revised")
        if action == "approve":
            lp.status = "approved"
            lp.approved_by = by
            lp.approved_on = date.today()
        else:
            lp.status = "revision_needed"
            lp.revision_remarks = remarks
        lp.updated_by = by
        db.commit()
        db.refresh(lp)
        return lp

    @staticmethod
    def list_plans(db: Session, teacher_id: Optional[int] = None,
                   standard: Optional[str] = None, academic_year: Optional[str] = None,
                   month: Optional[int] = None, status: Optional[str] = None) -> list[LessonPlan]:
        q = select(LessonPlan).where(LessonPlan.is_deleted == False)
        if teacher_id: q = q.where(LessonPlan.teacher_id == teacher_id)
        if standard:   q = q.where(LessonPlan.standard == standard)
        if academic_year: q = q.where(LessonPlan.academic_year == academic_year)
        if month:      q = q.where(LessonPlan.month == month)
        if status:     q = q.where(LessonPlan.status == status)
        return db.scalars(q.order_by(LessonPlan.academic_year, LessonPlan.month)).all()

    @staticmethod
    def delete(db: Session, plan_id: int, by: int) -> None:
        lp = db.get(LessonPlan, plan_id)
        if not lp or lp.is_deleted:
            raise ValueError("Lesson plan not found")
        lp.is_deleted = True
        lp.updated_by = by
        db.commit()


class DiaryService:

    @staticmethod
    def create(db: Session, data: DiaryCreate,
               teacher_id: int, teacher_name: str, by: int) -> TeachingDiary:
        existing = db.scalar(
            select(TeachingDiary).where(
                TeachingDiary.teacher_id == teacher_id,
                TeachingDiary.standard == data.standard,
                TeachingDiary.division == data.division,
                TeachingDiary.subject_name == data.subject_name,
                TeachingDiary.diary_date == data.diary_date,
                TeachingDiary.is_deleted == False,
            )
        )
        if existing:
            raise ValueError(
                f"Diary entry for {data.subject_name} on {data.diary_date} already exists."
            )
        entry = TeachingDiary(
            **data.model_dump(),
            teacher_id=teacher_id,
            teacher_name=teacher_name,
            created_by=by, updated_by=by,
        )
        # Update lesson plan completed periods
        if data.lesson_plan_id:
            lp = db.get(LessonPlan, data.lesson_plan_id)
            if lp:
                lp.completed_periods += 1
                lp.updated_by = by

        db.add(entry)
        db.commit()
        db.refresh(entry)
        return entry

    @staticmethod
    def list_diary(db: Session, teacher_id: Optional[int] = None,
                   standard: Optional[str] = None, date_from: Optional[date] = None,
                   date_to: Optional[date] = None, academic_year: Optional[str] = None,
                   limit: int = 50) -> list[TeachingDiary]:
        q = select(TeachingDiary).where(TeachingDiary.is_deleted == False)
        if teacher_id:    q = q.where(TeachingDiary.teacher_id == teacher_id)
        if standard:      q = q.where(TeachingDiary.standard == standard)
        if academic_year: q = q.where(TeachingDiary.academic_year == academic_year)
        if date_from:     q = q.where(TeachingDiary.diary_date >= date_from)
        if date_to:       q = q.where(TeachingDiary.diary_date <= date_to)
        return db.scalars(q.order_by(TeachingDiary.diary_date.desc()).limit(limit)).all()

    @staticmethod
    def delete(db: Session, entry_id: int, by: int) -> None:
        entry = db.get(TeachingDiary, entry_id)
        if not entry or entry.is_deleted:
            raise ValueError("Diary entry not found")
        entry.is_deleted = True
        entry.updated_by = by
        db.commit()


# ══════════════════════════════════════════════════════════════
# ROUTER
# ══════════════════════════════════════════════════════════════

router = APIRouter(prefix="/lesson-plans", tags=["Lesson Plans & Teaching Diary"])


# ── Lesson Plans ───────────────────────────────────────────────
@router.get("", response_model=APIResponse,
            dependencies=[Depends(require_permission("lesson_plan.read"))])
async def list_lesson_plans(
    current_user: AuthUser, db: DBSession,
    teacher_id: Optional[int] = None,
    standard: Optional[str] = None,
    academic_year: Optional[str] = None,
    month: Optional[int] = Query(None, ge=1, le=12),
    status: Optional[str] = None,
):
    plans = LessonPlanService.list_plans(
        db, teacher_id=teacher_id, standard=standard,
        academic_year=academic_year, month=month, status=status
    )
    return APIResponse.ok(data=[LessonPlanResponse.model_validate(p).model_dump() for p in plans])


@router.post("", response_model=APIResponse, status_code=201,
             dependencies=[Depends(require_permission("lesson_plan.create"))])
async def create_lesson_plan(body: LessonPlanCreate, current_user: AuthUser, db: DBSession):
    lp = LessonPlanService.create(
        db, body,
        teacher_id=current_user.user_id,
        teacher_name=current_user.full_name,
        by=current_user.user_id,
    )
    return APIResponse.created(data=LessonPlanResponse.model_validate(lp).model_dump())


@router.put("/{plan_id}", response_model=APIResponse,
            dependencies=[Depends(require_permission("lesson_plan.create"))])
async def update_lesson_plan(plan_id: int, body: LessonPlanUpdate,
                             current_user: AuthUser, db: DBSession):
    lp = LessonPlanService.update(db, plan_id, body, current_user.user_id)
    return APIResponse.ok(data=LessonPlanResponse.model_validate(lp).model_dump())


@router.post("/{plan_id}/submit", response_model=APIResponse,
             dependencies=[Depends(require_permission("lesson_plan.create"))])
async def submit_lesson_plan(plan_id: int, current_user: AuthUser, db: DBSession):
    lp = LessonPlanService.submit(db, plan_id, current_user.user_id)
    return APIResponse.ok(data=LessonPlanResponse.model_validate(lp).model_dump(),
                          message="Lesson plan submitted for approval.")


@router.post("/{plan_id}/review", response_model=APIResponse,
             dependencies=[Depends(require_permission("lesson_plan.approve"))])
async def review_lesson_plan(plan_id: int, current_user: AuthUser, db: DBSession,
                             action: str = Query(..., pattern="^(approve|revise)$"),
                             remarks: Optional[str] = Query(None)):
    lp = LessonPlanService.approve_or_revise(db, plan_id, action, remarks, current_user.user_id)
    return APIResponse.ok(data=LessonPlanResponse.model_validate(lp).model_dump(),
                          message=f"Lesson plan {lp.status}.")


@router.delete("/{plan_id}", response_model=APIResponse,
               dependencies=[Depends(require_permission("lesson_plan.create"))])
async def delete_lesson_plan(plan_id: int, current_user: AuthUser, db: DBSession):
    LessonPlanService.delete(db, plan_id, current_user.user_id)
    return APIResponse.ok(message="Lesson plan deleted.")


# ── Teaching Diary ─────────────────────────────────────────────
@router.get("/diary", response_model=APIResponse,
            dependencies=[Depends(require_permission("lesson_plan.read"))])
async def list_diary_entries(
    current_user: AuthUser, db: DBSession,
    teacher_id: Optional[int] = None,
    standard: Optional[str] = None,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    academic_year: Optional[str] = None,
    limit: int = Query(default=50, le=200),
):
    entries = DiaryService.list_diary(
        db, teacher_id=teacher_id, standard=standard,
        date_from=date_from, date_to=date_to,
        academic_year=academic_year, limit=limit,
    )
    return APIResponse.ok(data=[DiaryResponse.model_validate(e).model_dump() for e in entries])


@router.post("/diary", response_model=APIResponse, status_code=201,
             dependencies=[Depends(require_permission("lesson_plan.create"))])
async def create_diary_entry(body: DiaryCreate, current_user: AuthUser, db: DBSession):
    entry = DiaryService.create(
        db, body,
        teacher_id=current_user.user_id,
        teacher_name=current_user.full_name,
        by=current_user.user_id,
    )
    return APIResponse.created(data=DiaryResponse.model_validate(entry).model_dump())


@router.delete("/diary/{entry_id}", response_model=APIResponse,
               dependencies=[Depends(require_permission("lesson_plan.create"))])
async def delete_diary_entry(entry_id: int, current_user: AuthUser, db: DBSession):
    DiaryService.delete(db, entry_id, current_user.user_id)
    return APIResponse.ok(message="Diary entry deleted.")
