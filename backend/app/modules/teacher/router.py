"""
VidyaSetu ERP — Teacher API Router
=====================================
All teacher/staff endpoints with permission guards.
"""
from typing import Optional
from fastapi import APIRouter, Depends, File, Query, UploadFile, status
from sqlalchemy.orm import Session

from app.core.dependencies import AuthUser, DBSession, require_permission
from app.modules.teacher.schemas import (
    TeacherCreateRequest, TeacherUpdateRequest, TeacherLeavingRequest,
    QualificationRequest, ExperienceRequest,
    LeaveRequest, LeaveApprovalRequest,
    TeacherAttendanceMarkRequest,
    TeacherListResponse, TeacherDetailResponse,
    QualificationResponse, ExperienceResponse, LeaveResponse,
)
from app.modules.teacher.service import TeacherService
from app.shared.responses import APIResponse

router = APIRouter(prefix="/teachers", tags=["Teachers"])


# ── CRUD ──────────────────────────────────────────────────────

@router.post(
    "",
    response_model=APIResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_permission("teacher.create"))],
)
async def create_teacher(body: TeacherCreateRequest, current_user: AuthUser, db: DBSession):
    """Add a new teacher/staff. Employee ID is auto-generated."""
    teacher = TeacherService.create(db, body, created_by=current_user.user_id)
    return APIResponse.created(
        data={"id": teacher.id, "employee_id": teacher.employee_id, "full_name": teacher.full_name},
        message=f"Teacher '{teacher.full_name}' added. Employee ID: {teacher.employee_id}",
    )


@router.get(
    "",
    response_model=APIResponse,
    dependencies=[Depends(require_permission("teacher.read"))],
)
async def list_teachers(
    current_user: AuthUser,
    db: DBSession,
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=500),
    search: Optional[str] = None,
    employee_type: Optional[str] = None,
    designation: Optional[str] = None,
    status: Optional[str] = "active",
    department: Optional[str] = None,
    gender: Optional[str] = None,
    category: Optional[str] = None,
):
    """List teachers with search, filter, pagination."""
    teachers, total = TeacherService.get_list(
        db, page=page, per_page=per_page, search=search,
        employee_type=employee_type, designation=designation,
        status=status, department=department, gender=gender, category=category,
    )
    data = [TeacherListResponse.model_validate(t).model_dump() for t in teachers]
    total_pages = max(1, (total + per_page - 1) // per_page)
    return APIResponse.ok(data={
        "items": data,
        "meta": {"page": page, "per_page": per_page, "total": total,
                  "total_pages": total_pages, "has_next": page < total_pages, "has_prev": page > 1},
    })


@router.get(
    "/stats",
    response_model=APIResponse,
    dependencies=[Depends(require_permission("teacher.read"))],
)
async def get_teacher_stats(current_user: AuthUser, db: DBSession):
    """Teacher module statistics."""
    stats = TeacherService.get_stats(db)
    return APIResponse.ok(data=stats.model_dump())


@router.get(
    "/emp/{employee_id}",
    response_model=APIResponse,
    dependencies=[Depends(require_permission("teacher.read"))],
)
async def get_teacher_by_emp_id(employee_id: str, current_user: AuthUser, db: DBSession):
    """Get teacher by Employee ID."""
    teacher = TeacherService.get_by_employee_id(db, employee_id)
    return APIResponse.ok(data=TeacherDetailResponse.model_validate(teacher).model_dump())


@router.get(
    "/{teacher_id}",
    response_model=APIResponse,
    dependencies=[Depends(require_permission("teacher.read"))],
)
async def get_teacher(teacher_id: int, current_user: AuthUser, db: DBSession):
    """Get complete teacher profile."""
    teacher = TeacherService.get_by_id(db, teacher_id)
    return APIResponse.ok(data=TeacherDetailResponse.model_validate(teacher).model_dump())


@router.put(
    "/{teacher_id}",
    response_model=APIResponse,
    dependencies=[Depends(require_permission("teacher.update"))],
)
async def update_teacher(
    teacher_id: int, body: TeacherUpdateRequest, current_user: AuthUser, db: DBSession
):
    """Update teacher record."""
    teacher = TeacherService.update(db, teacher_id, body, updated_by=current_user.user_id)
    return APIResponse.ok(data={"id": teacher.id}, message=f"Teacher '{teacher.full_name}' updated.")


@router.post(
    "/{teacher_id}/photo",
    response_model=APIResponse,
    dependencies=[Depends(require_permission("teacher.update"))],
)
async def upload_teacher_photo(
    teacher_id: int,
    current_user: AuthUser,
    db: DBSession,
    file: UploadFile = File(...),
):
    """Upload teacher photo."""
    path = await TeacherService.upload_photo(db, teacher_id, file, current_user.user_id)
    return APIResponse.ok(data={"photo_path": path}, message="Photo uploaded.")


@router.post(
    "/{teacher_id}/leaving",
    response_model=APIResponse,
    dependencies=[Depends(require_permission("teacher.update"))],
)
async def mark_teacher_leaving(
    teacher_id: int, body: TeacherLeavingRequest, current_user: AuthUser, db: DBSession
):
    """Mark teacher as resigned/retired/transferred."""
    teacher = TeacherService.mark_leaving(db, teacher_id, body, current_user.user_id)
    return APIResponse.ok(message=f"Teacher '{teacher.full_name}' marked as {body.status}.")


@router.delete(
    "/{teacher_id}",
    response_model=APIResponse,
    dependencies=[Depends(require_permission("teacher.delete"))],
)
async def delete_teacher(teacher_id: int, current_user: AuthUser, db: DBSession):
    """Soft delete teacher record."""
    TeacherService.delete(db, teacher_id, current_user.user_id)
    return APIResponse.ok(message="Teacher record deleted.")


# ── Qualifications ─────────────────────────────────────────────

@router.post(
    "/{teacher_id}/qualifications",
    response_model=APIResponse,
    dependencies=[Depends(require_permission("teacher.update"))],
)
async def add_qualification(
    teacher_id: int, body: QualificationRequest, current_user: AuthUser, db: DBSession
):
    q = TeacherService.add_qualification(db, teacher_id, body, current_user.user_id)
    return APIResponse.created(data=QualificationResponse.model_validate(q).model_dump())


@router.get(
    "/{teacher_id}/qualifications",
    response_model=APIResponse,
    dependencies=[Depends(require_permission("teacher.read"))],
)
async def get_qualifications(teacher_id: int, current_user: AuthUser, db: DBSession):
    quals = TeacherService.get_qualifications(db, teacher_id)
    return APIResponse.ok(data=[QualificationResponse.model_validate(q).model_dump() for q in quals])


@router.delete(
    "/qualifications/{qual_id}",
    response_model=APIResponse,
    dependencies=[Depends(require_permission("teacher.update"))],
)
async def delete_qualification(qual_id: int, current_user: AuthUser, db: DBSession):
    TeacherService.delete_qualification(db, qual_id, current_user.user_id)
    return APIResponse.ok(message="Qualification removed.")


# ── Experience ─────────────────────────────────────────────────

@router.post(
    "/{teacher_id}/experience",
    response_model=APIResponse,
    dependencies=[Depends(require_permission("teacher.update"))],
)
async def add_experience(
    teacher_id: int, body: ExperienceRequest, current_user: AuthUser, db: DBSession
):
    exp = TeacherService.add_experience(db, teacher_id, body, current_user.user_id)
    return APIResponse.created(data=ExperienceResponse.model_validate(exp).model_dump())


@router.get(
    "/{teacher_id}/experience",
    response_model=APIResponse,
    dependencies=[Depends(require_permission("teacher.read"))],
)
async def get_experience(teacher_id: int, current_user: AuthUser, db: DBSession):
    exps = TeacherService.get_experience(db, teacher_id)
    return APIResponse.ok(data=[ExperienceResponse.model_validate(e).model_dump() for e in exps])


# ── Leave Management ───────────────────────────────────────────

@router.post(
    "/{teacher_id}/leave",
    response_model=APIResponse,
    dependencies=[Depends(require_permission("teacher.leave.apply"))],
)
async def apply_leave(
    teacher_id: int, body: LeaveRequest, current_user: AuthUser, db: DBSession
):
    """Apply for leave."""
    leave = TeacherService.apply_leave(db, teacher_id, body, current_user.user_id)
    return APIResponse.created(
        data=LeaveResponse.model_validate(leave).model_dump(),
        message=f"Leave applied for {leave.days} day(s). Awaiting approval.",
    )


@router.post(
    "/leave/{leave_id}/action",
    response_model=APIResponse,
    dependencies=[Depends(require_permission("teacher.leave.approve"))],
)
async def action_leave(
    leave_id: int, body: LeaveApprovalRequest, current_user: AuthUser, db: DBSession
):
    """Approve or reject a leave request."""
    leave = TeacherService.approve_leave(db, leave_id, body, current_user.user_id)
    return APIResponse.ok(
        data=LeaveResponse.model_validate(leave).model_dump(),
        message=f"Leave {leave.status}.",
    )


@router.get(
    "/{teacher_id}/leave",
    response_model=APIResponse,
    dependencies=[Depends(require_permission("teacher.read"))],
)
async def get_teacher_leaves(
    teacher_id: int,
    current_user: AuthUser,
    db: DBSession,
    status: Optional[str] = None,
):
    """Get leave history for a teacher."""
    leaves = TeacherService.get_leaves(db, teacher_id=teacher_id, status=status)
    return APIResponse.ok(data=[LeaveResponse.model_validate(l).model_dump() for l in leaves])


@router.get(
    "/leave/pending",
    response_model=APIResponse,
    dependencies=[Depends(require_permission("teacher.leave.approve"))],
)
async def get_pending_leaves(current_user: AuthUser, db: DBSession):
    """All pending leave requests."""
    leaves = TeacherService.get_leaves(db, status="pending")
    return APIResponse.ok(data=[LeaveResponse.model_validate(l).model_dump() for l in leaves])


# ── Attendance ─────────────────────────────────────────────────

@router.post(
    "/attendance/bulk",
    response_model=APIResponse,
    dependencies=[Depends(require_permission("teacher.update"))],
)
async def mark_teacher_attendance(
    body: TeacherAttendanceMarkRequest, current_user: AuthUser, db: DBSession
):
    """Mark attendance for all teachers."""
    count = TeacherService.mark_attendance_bulk(db, body, current_user.user_id)
    return APIResponse.ok(data={"count": count}, message=f"Attendance marked for {count} staff.")
