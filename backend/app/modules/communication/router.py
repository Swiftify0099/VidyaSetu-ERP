"""
VidyaSetu ERP — Communication Router
"""
from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.dependencies import AuthUser, DBSession, require_permission
from app.modules.communication.service import (
    NoticeRequest, NoticeResponse,
    TemplateRequest, TemplateResponse,
    SendMessageRequest, CommunicationLogResponse,
    AnnouncementRequest, AnnouncementResponse,
    NoticeService, TemplateService, MessageService,
    AnnouncementService, CommStatsService,
)
from app.shared.responses import APIResponse

router = APIRouter(prefix="/communication", tags=["Communication"])


# ── Stats ─────────────────────────────────────────────────────
@router.get("/stats", response_model=APIResponse,
            dependencies=[Depends(require_permission("communication.read"))])
async def comm_stats(current_user: AuthUser, db: DBSession):
    return APIResponse.ok(data=CommStatsService.get(db).model_dump())


# ── Notices ───────────────────────────────────────────────────
@router.post("/notices", response_model=APIResponse, status_code=201,
             dependencies=[Depends(require_permission("communication.manage"))])
async def create_notice(body: NoticeRequest, current_user: AuthUser, db: DBSession):
    n = NoticeService.create(db, body, current_user.user_id)
    return APIResponse.created(data=NoticeResponse.model_validate(n).model_dump())

@router.get("/notices", response_model=APIResponse,
            dependencies=[Depends(require_permission("communication.read"))])
async def list_notices(current_user: AuthUser, db: DBSession,
                       notice_type: Optional[str] = None,
                       audience: Optional[str] = None,
                       published_only: bool = False,
                       academic_year_id: Optional[int] = None,
                       limit: int = Query(50, le=200), offset: int = 0):
    notices = NoticeService.list_notices(db, notice_type, audience, published_only, academic_year_id, limit, offset)
    return APIResponse.ok(data=[NoticeResponse.model_validate(n).model_dump() for n in notices])

@router.get("/notices/{notice_id}", response_model=APIResponse,
            dependencies=[Depends(require_permission("communication.read"))])
async def get_notice(notice_id: int, current_user: AuthUser, db: DBSession):
    n = NoticeService.get_by_id(db, notice_id)
    NoticeService.increment_view(db, notice_id)
    return APIResponse.ok(data=NoticeResponse.model_validate(n).model_dump())

@router.put("/notices/{notice_id}", response_model=APIResponse,
            dependencies=[Depends(require_permission("communication.manage"))])
async def update_notice(notice_id: int, body: NoticeRequest, current_user: AuthUser, db: DBSession):
    n = NoticeService.update(db, notice_id, body, current_user.user_id)
    return APIResponse.ok(data=NoticeResponse.model_validate(n).model_dump())

@router.post("/notices/{notice_id}/publish", response_model=APIResponse,
             dependencies=[Depends(require_permission("communication.publish"))])
async def publish_notice(notice_id: int, current_user: AuthUser, db: DBSession):
    n = NoticeService.publish(db, notice_id, current_user.user_id)
    return APIResponse.ok(data=NoticeResponse.model_validate(n).model_dump(),
                          message=f"Notice '{n.title}' published.")

@router.delete("/notices/{notice_id}", response_model=APIResponse,
               dependencies=[Depends(require_permission("communication.manage"))])
async def delete_notice(notice_id: int, current_user: AuthUser, db: DBSession):
    NoticeService.delete(db, notice_id, current_user.user_id)
    return APIResponse.ok(message="Notice deleted.")


# ── Templates ─────────────────────────────────────────────────
@router.post("/templates", response_model=APIResponse, status_code=201,
             dependencies=[Depends(require_permission("communication.manage"))])
async def create_template(body: TemplateRequest, current_user: AuthUser, db: DBSession):
    t = TemplateService.create(db, body, current_user.user_id)
    return APIResponse.created(data=TemplateResponse.model_validate(t).model_dump())

@router.get("/templates", response_model=APIResponse,
            dependencies=[Depends(require_permission("communication.read"))])
async def list_templates(current_user: AuthUser, db: DBSession,
                         category: Optional[str] = None, template_type: Optional[str] = None):
    templates = TemplateService.list_templates(db, category, template_type)
    return APIResponse.ok(data=[TemplateResponse.model_validate(t).model_dump() for t in templates])

@router.delete("/templates/{template_id}", response_model=APIResponse,
               dependencies=[Depends(require_permission("communication.manage"))])
async def delete_template(template_id: int, current_user: AuthUser, db: DBSession):
    TemplateService.delete(db, template_id, current_user.user_id)
    return APIResponse.ok(message="Template deleted.")


# ── Send Messages ─────────────────────────────────────────────
@router.post("/send", response_model=APIResponse,
             dependencies=[Depends(require_permission("communication.send"))])
async def send_message(body: SendMessageRequest, current_user: AuthUser, db: DBSession):
    count = MessageService.send(db, body, current_user.user_id)
    return APIResponse.ok(data={"sent": count},
                          message=f"{count} message(s) dispatched via {body.channel}.")

@router.get("/logs", response_model=APIResponse,
            dependencies=[Depends(require_permission("communication.read"))])
async def get_logs(current_user: AuthUser, db: DBSession,
                   channel: Optional[str] = None,
                   status: Optional[str] = None,
                   limit: int = Query(100, le=500)):
    logs = MessageService.get_logs(db, channel, status, limit)
    return APIResponse.ok(data=[CommunicationLogResponse.model_validate(l).model_dump() for l in logs])


# ── Announcements ─────────────────────────────────────────────
@router.post("/announcements", response_model=APIResponse, status_code=201,
             dependencies=[Depends(require_permission("communication.manage"))])
async def create_announcement(body: AnnouncementRequest, current_user: AuthUser, db: DBSession):
    a = AnnouncementService.create(db, body, current_user.user_id)
    return APIResponse.created(data=AnnouncementResponse.model_validate(a).model_dump())

@router.get("/announcements", response_model=APIResponse,
            dependencies=[Depends(require_permission("communication.read"))])
async def get_announcements(current_user: AuthUser, db: DBSession):
    announcements = AnnouncementService.get_active(db)
    return APIResponse.ok(data=[AnnouncementResponse.model_validate(a).model_dump() for a in announcements])

@router.delete("/announcements/{ann_id}", response_model=APIResponse,
               dependencies=[Depends(require_permission("communication.manage"))])
async def delete_announcement(ann_id: int, current_user: AuthUser, db: DBSession):
    AnnouncementService.delete(db, ann_id, current_user.user_id)
    return APIResponse.ok(message="Announcement deleted.")
