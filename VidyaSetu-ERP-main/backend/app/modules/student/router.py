"""
VidyaSetu ERP — Student API Router
=====================================
All student endpoints with permission guards.
"""
from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, File, Form, Query, UploadFile, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.core.dependencies import AuthUser, DBSession, require_permission
from app.modules.student.certificates import CertificateGenerator
from app.modules.student.schemas import (
    AttendanceMarkRequest,
    StudentCreateRequest,
    StudentLeavingRequest,
    StudentUpdateRequest,
)
from app.modules.student.service import AttendanceService, StudentService
from app.shared.responses import APIResponse, PaginatedResponse

router = APIRouter(prefix="/students", tags=["Students"])


# ── CRUD ──────────────────────────────────────────────────────

@router.post(
    "",
    response_model=APIResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_permission("student.create"))],
)
async def create_student(
    body: StudentCreateRequest,
    current_user: AuthUser,
    db: DBSession,
):
    """Admit a new student. Auto-generates GR number, user login account, and emails credentials."""
    student = StudentService.create(db, body, created_by=current_user.user_id)
    username = getattr(student, "_generated_username", student.gr_number)
    password = getattr(student, "_generated_password", None)
    email_sent = getattr(student, "_email_sent", False)
    target_email = getattr(student, "_target_email", None)

    msg = f"Student '{student.full_name}' admitted. GR: {student.gr_number}."
    if email_sent:
        msg += f" Login credentials emailed to {target_email}."

    return APIResponse.created(
        data={
            "id": student.id,
            "gr_number": student.gr_number,
            "full_name": student.full_name,
            "username": username,
            "initial_password": password,
            "user_id": student.user_id,
            "email_sent": email_sent,
            "target_email": target_email,
        },
        message=msg,
    )


@router.get(
    "",
    response_model=APIResponse,
    dependencies=[Depends(require_permission("student.read"))],
)
async def list_students(
    current_user: AuthUser,
    db: DBSession,
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    search: Optional[str] = None,
    standard: Optional[str] = None,
    division: Optional[str] = None,
    status: Optional[str] = "active",
    academic_year_id: Optional[int] = None,
    category: Optional[str] = None,
    gender: Optional[str] = None,
):
    """List students with search, filter, and pagination."""
    from app.modules.student.schemas import StudentListResponse

    students, total = StudentService.get_list(
        db, page=page, per_page=per_page, search=search,
        standard=standard, division=division, status=status,
        academic_year_id=academic_year_id, category=category, gender=gender,
    )

    data = [StudentListResponse.model_validate(s).model_dump() for s in students]
    total_pages = max(1, (total + per_page - 1) // per_page)

    return APIResponse.ok(data={
        "items": data,
        "meta": {
            "page": page, "per_page": per_page, "total": total,
            "total_pages": total_pages,
            "has_next": page < total_pages,
            "has_prev": page > 1,
        }
    })


@router.get(
    "/stats",
    response_model=APIResponse,
    dependencies=[Depends(require_permission("student.read"))],
)
async def get_student_stats(
    current_user: AuthUser,
    db: DBSession,
    academic_year_id: Optional[int] = None,
):
    """Get student module statistics."""
    stats = StudentService.get_stats(db, academic_year_id)
    return APIResponse.ok(data=stats)


@router.get(
    "/admission-stats",
    response_model=APIResponse,
    dependencies=[Depends(require_permission("student.read"))],
)
async def get_admission_stats(current_user: AuthUser, db: DBSession):
    """Get admission specific statistics."""
    stats = StudentService.get_admission_stats(db)
    return APIResponse.ok(data=stats)


@router.post(
    "/bulk-promote",
    response_model=APIResponse,
    dependencies=[Depends(require_permission("student.update"))],
)
async def bulk_promote_students(
    body: dict,
    current_user: AuthUser,
    db: DBSession,
):
    """Bulk promote students to next standard/year."""
    promotions = body.get("promotions", [])
    to_year_id = body.get("academic_year_id", 2)
    count = StudentService.bulk_promote(db, promotions, to_year_id, current_user.user_id)
    return APIResponse.ok(data={"count": count}, message=f"{count} students promoted successfully.")



@router.get(
    "/gr/{gr_number}",
    response_model=APIResponse,
    dependencies=[Depends(require_permission("student.read"))],
)
async def get_student_by_gr(gr_number: str, current_user: AuthUser, db: DBSession):
    """Get student by GR number."""
    from app.modules.student.schemas import StudentDetailResponse
    student = StudentService.get_by_gr_number(db, gr_number)
    return APIResponse.ok(data=StudentDetailResponse.model_validate(student).model_dump())


@router.get(
    "/{student_id}",
    response_model=APIResponse,
    dependencies=[Depends(require_permission("student.read"))],
)
async def get_student(student_id: int, current_user: AuthUser, db: DBSession):
    """Get complete student profile."""
    from app.modules.student.schemas import StudentDetailResponse
    student = StudentService.get_by_id(db, student_id)
    return APIResponse.ok(data=StudentDetailResponse.model_validate(student).model_dump())


@router.put(
    "/{student_id}",
    response_model=APIResponse,
    dependencies=[Depends(require_permission("student.update"))],
)
async def update_student(
    student_id: int,
    body: StudentUpdateRequest,
    current_user: AuthUser,
    db: DBSession,
):
    """Update student record."""
    student = StudentService.update(db, student_id, body, updated_by=current_user.user_id)
    return APIResponse.ok(
        data={"id": student.id, "gr_number": student.gr_number},
        message=f"Student '{student.full_name}' updated.",
    )


@router.post(
    "/{student_id}/photo",
    response_model=APIResponse,
    dependencies=[Depends(require_permission("student.update"))],
)
async def upload_student_photo(
    student_id: int,
    current_user: AuthUser,
    db: DBSession,
    file: UploadFile = File(...),
):
    """Upload student photo."""
    path = await StudentService.upload_photo(db, student_id, file, current_user.user_id)
    return APIResponse.ok(data={"photo_path": path}, message="Photo uploaded successfully.")


@router.post(
    "/{student_id}/leaving",
    response_model=APIResponse,
    dependencies=[Depends(require_permission("student.update"))],
)
async def mark_student_leaving(
    student_id: int,
    body: StudentLeavingRequest,
    current_user: AuthUser,
    db: DBSession,
):
    """Mark student as left/transferred."""
    student = StudentService.mark_leaving(db, student_id, body, current_user.user_id)
    return APIResponse.ok(message=f"Student '{student.full_name}' marked as {body.status}.")


@router.delete(
    "/{student_id}",
    response_model=APIResponse,
    dependencies=[Depends(require_permission("student.delete"))],
)
async def delete_student(student_id: int, current_user: AuthUser, db: DBSession):
    """Soft delete a student record."""
    StudentService.delete(db, student_id, current_user.user_id)
    return APIResponse.ok(message="Student record deleted.")


# ── Attendance ────────────────────────────────────────────────

@router.post(
    "/attendance/bulk",
    response_model=APIResponse,
    dependencies=[Depends(require_permission("student.update"))],
)
async def mark_attendance_bulk(
    body: AttendanceMarkRequest,
    current_user: AuthUser,
    db: DBSession,
):
    """Mark attendance for an entire class at once."""
    count = AttendanceService.mark_bulk(db, body, current_user.user_id)
    return APIResponse.ok(
        data={"count": count},
        message=f"Attendance marked for {count} students.",
    )


@router.get(
    "/attendance/class",
    response_model=APIResponse,
    dependencies=[Depends(require_permission("student.read"))],
)
async def get_class_attendance(
    current_user: AuthUser,
    db: DBSession,
    standard: str = Query(...),
    division: Optional[str] = None,
    attendance_date: date = Query(default_factory=date.today),
    period: str = "full_day",
):
    """Get attendance records for a class on a specific date."""
    from app.modules.student.schemas import AttendanceResponse
    records = AttendanceService.get_class_attendance(
        db, standard, division, attendance_date, period
    )
    data = [AttendanceResponse.model_validate(r).model_dump() for r in records]
    return APIResponse.ok(data=data)


@router.get(
    "/{student_id}/attendance/summary",
    response_model=APIResponse,
    dependencies=[Depends(require_permission("student.read"))],
)
async def get_student_attendance_summary(
    student_id: int,
    current_user: AuthUser,
    db: DBSession,
    from_date: date = Query(...),
    to_date: date = Query(default_factory=date.today),
):
    """Get attendance summary for a student in a date range."""
    summary = AttendanceService.get_student_summary(db, student_id, from_date, to_date)
    return APIResponse.ok(data=summary.model_dump())


# ── Certificates ──────────────────────────────────────────────

@router.post(
    "/{student_id}/tc",
    dependencies=[Depends(require_permission("student.print"))],
)
async def generate_tc(
    student_id: int,
    current_user: AuthUser,
    db: DBSession,
):
    """Generate Transfer Certificate (TC) PDF."""
    from app.shared.audit import AuditService
    import datetime

    student = StudentService.get_by_id(db, student_id)

    # Auto-generate TC number
    from app.core.config import settings
    tc_number = f"{settings.CERTIFICATE_PREFIX}-TC-{student.gr_number}"

    # Update student record
    student.tc_issued = True
    student.tc_number = tc_number
    student.tc_issued_date = datetime.date.today()
    student.updated_by = current_user.user_id

    AuditService.log(
        db, action="TC_ISSUED", module="student",
        user_id=current_user.user_id, entity_type="Student",
        entity_id=student.id,
        description=f"TC issued for {student.full_name}. TC#: {tc_number}",
    )
    db.commit()

    pdf_buffer = CertificateGenerator.generate_tc(student, tc_number)

    return StreamingResponse(
        pdf_buffer,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="TC_{student.gr_number}.pdf"'
        },
    )


@router.post(
    "/{student_id}/bonafide",
    dependencies=[Depends(require_permission("student.print"))],
)
async def generate_bonafide(
    student_id: int,
    current_user: AuthUser,
    db: DBSession,
    purpose: str = Query(default="General Purpose"),
):
    """Generate Bonafide Certificate PDF."""
    from app.shared.audit import AuditService

    student = StudentService.get_by_id(db, student_id)

    AuditService.log(
        db, action="BONAFIDE_ISSUED", module="student",
        user_id=current_user.user_id, entity_type="Student",
        entity_id=student.id,
        description=f"Bonafide issued for {student.full_name}. Purpose: {purpose}",
    )
    db.commit()

    pdf_buffer = CertificateGenerator.generate_bonafide(student, purpose)

    return StreamingResponse(
        pdf_buffer,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="Bonafide_{student.gr_number}.pdf"'
        },
    )
