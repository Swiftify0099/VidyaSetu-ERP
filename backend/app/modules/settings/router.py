"""
VidyaSetu ERP — Settings API Routes
=======================================
System settings and academic year management.
"""
from datetime import date
from typing import Optional
from fastapi import APIRouter, Depends, status
from pydantic import BaseModel
from sqlalchemy import select, update
from sqlalchemy.orm import Session

from app.core.dependencies import AuthUser, DBSession, require_permission
from app.modules.settings.models import AcademicYear, SystemSetting
from app.shared.audit import AuditService
from app.shared.responses import APIResponse, PaginatedResponse

router = APIRouter(prefix="/system", tags=["System Settings"])


# ── Settings Schemas ──────────────────────────────────────────
class SettingUpdateRequest(BaseModel):
    value: Optional[str] = None


class AcademicYearCreateRequest(BaseModel):
    name: str
    code: str
    start_date: date
    end_date: date


# ── Health Check (Public) ─────────────────────────────────────
@router.get("/health", include_in_schema=True)
async def health_check():
    """System health check endpoint."""
    return {
        "status": "healthy",
        "service": "VidyaSetu ERP API",
        "version": "1.0.0",
    }


# ── System Settings ───────────────────────────────────────────
@router.get("/settings", response_model=APIResponse)
async def get_all_settings(
    current_user: AuthUser,
    db: DBSession,
    category: Optional[str] = None,
):
    """Get all system settings. Admins see all; others see public only."""
    query = select(SystemSetting).where(SystemSetting.is_deleted == False)

    if not current_user.is_super_admin():
        query = query.where(SystemSetting.is_public == True)

    if category:
        query = query.where(SystemSetting.category == category)

    settings_list = db.scalars(query).all()
    data = {s.key: s.value for s in settings_list}
    return APIResponse.ok(data=data)


@router.put("/settings/{key}", response_model=APIResponse,
            dependencies=[Depends(require_permission("admin.manage_settings"))])
async def update_setting(
    key: str,
    body: SettingUpdateRequest,
    current_user: AuthUser,
    db: DBSession,
):
    """Update a system setting value."""
    setting = db.scalar(
        select(SystemSetting)
        .where(SystemSetting.key == key)
        .where(SystemSetting.is_deleted == False)
    )
    if not setting:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail=f"Setting '{key}' not found.")

    if not setting.is_editable:
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail=f"Setting '{key}' is not editable.")

    old_value = setting.value
    setting.value = body.value
    setting.updated_by = current_user.user_id

    AuditService.log(
        db, action="SETTING_UPDATED", module="settings",
        user_id=current_user.user_id, entity_type="SystemSetting",
        entity_id=setting.id, old_value={"value": old_value},
        new_value={"value": body.value},
        description=f"Setting '{key}' updated.",
    )
    db.commit()
    return APIResponse.ok(message=f"Setting '{key}' updated successfully.")


# ── Academic Year ─────────────────────────────────────────────
@router.get("/academic-years", response_model=APIResponse)
async def get_academic_years(current_user: AuthUser, db: DBSession):
    """List all academic years."""
    years = db.scalars(
        select(AcademicYear)
        .where(AcademicYear.is_deleted == False)
        .order_by(AcademicYear.start_date.desc())
    ).all()
    data = [
        {
            "id": y.id, "uuid": y.uuid, "name": y.name, "code": y.code,
            "start_date": str(y.start_date), "end_date": str(y.end_date),
            "is_current": y.is_current, "status": y.status,
        }
        for y in years
    ]
    return APIResponse.ok(data=data)


@router.post("/academic-years", response_model=APIResponse,
             dependencies=[Depends(require_permission("admin.manage_settings"))],
             status_code=status.HTTP_201_CREATED)
async def create_academic_year(
    body: AcademicYearCreateRequest,
    current_user: AuthUser,
    db: DBSession,
):
    """Create a new academic year."""
    existing = db.scalar(
        select(AcademicYear).where(AcademicYear.code == body.code)
    )
    if existing:
        from fastapi import HTTPException
        raise HTTPException(status_code=409, detail=f"Academic year '{body.code}' already exists.")

    year = AcademicYear(
        name=body.name, code=body.code,
        start_date=body.start_date, end_date=body.end_date,
        created_by=current_user.user_id,
    )
    db.add(year)
    AuditService.log(
        db, action="ACADEMIC_YEAR_CREATED", module="settings",
        user_id=current_user.user_id,
        description=f"Academic year '{body.name}' created.",
    )
    db.commit()
    return APIResponse.created(
        data={"id": year.id, "name": year.name},
        message=f"Academic year '{year.name}' created.",
    )


@router.post("/academic-years/{year_id}/set-current", response_model=APIResponse,
             dependencies=[Depends(require_permission("admin.manage_settings"))])
async def set_current_academic_year(
    year_id: int,
    current_user: AuthUser,
    db: DBSession,
):
    """Set a specific academic year as the current active year."""
    # Unset all current
    db.execute(
        update(AcademicYear)
        .where(AcademicYear.is_deleted == False)
        .values(is_current=False)
    )
    # Set the selected one
    year = db.get(AcademicYear, year_id)
    if not year or year.is_deleted:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Academic year not found.")

    year.is_current = True
    year.updated_by = current_user.user_id

    AuditService.log(
        db, action="CURRENT_YEAR_SET", module="settings",
        user_id=current_user.user_id,
        description=f"Academic year '{year.name}' set as current.",
    )
    db.commit()
    return APIResponse.ok(message=f"'{year.name}' is now the current academic year.")
