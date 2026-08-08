"""
VidyaSetu ERP — Student Behaviour Router
"""
from typing import Optional
from fastapi import APIRouter, Depends, Query, status, HTTPException
from sqlalchemy.orm import Session

from app.core.dependencies import AuthUser, DBSession, require_permission
from app.modules.behaviour.schemas import (
    BehaviourCreateRequest, BehaviourUpdateRequest, BehaviourResponse,
)
from app.modules.behaviour.service import BehaviourService
from app.shared.responses import APIResponse, PaginatedResponse

router = APIRouter(prefix="/behaviour", tags=["Student Behaviour Log"])


@router.post("", response_model=APIResponse, status_code=status.HTTP_201_CREATED)
async def create_behaviour_log(
    body: BehaviourCreateRequest,
    current_user: AuthUser,
    db: DBSession,
):
    """Log a new student behaviour incident or achievement."""
    try:
        log = BehaviourService.create(db, body, current_user.user_id, current_user.full_name)
        return APIResponse.created(
            data=BehaviourResponse.model_validate(log).model_dump(),
            message=f"Behaviour log entry recorded for student {log.student_name}.",
        )
    except ValueError as e:
        raise HTTPException(400, detail=str(e))


@router.get("", response_model=APIResponse)
async def list_behaviour_logs(
    current_user: AuthUser,
    db: DBSession,
    page: int = Query(1, ge=1),
    per_page: int = Query(15, ge=1, le=100),
    search: Optional[str] = None,
    incident_type: Optional[str] = None,
    standard: Optional[str] = None,
    status: Optional[str] = None,
):
    """List student behaviour log entries."""
    items, total = BehaviourService.get_list(
        db, page=page, per_page=per_page, search=search,
        incident_type=incident_type, standard=standard, status=status,
    )
    data = [BehaviourResponse.model_validate(i).model_dump() for i in items]
    total_pages = max(1, (total + per_page - 1) // per_page)
    return APIResponse.ok(data={
        "items": data,
        "total": total,
        "page": page,
        "per_page": per_page,
        "pages": total_pages,
    })


@router.put("/{log_id}", response_model=APIResponse)
async def update_behaviour_log(
    log_id: int,
    body: BehaviourUpdateRequest,
    current_user: AuthUser,
    db: DBSession,
):
    """Update action taken or status of a behaviour log."""
    try:
        log = BehaviourService.update(db, log_id, body, current_user.user_id)
        return APIResponse.ok(
            data=BehaviourResponse.model_validate(log).model_dump(),
            message="Behaviour log updated.",
        )
    except ValueError as e:
        raise HTTPException(400, detail=str(e))
