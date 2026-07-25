"""
VidyaSetu ERP — Communication Service & Schemas
"""
from datetime import date, datetime, timezone
from typing import Optional
from pydantic import BaseModel as PydanticBase
from sqlalchemy import and_, select, func
from sqlalchemy.orm import Session

from app.modules.communication.models import (
    Notice, MessageTemplate, CommunicationLog, Announcement
)
from app.shared.audit import AuditService


# ═══════════════════════════════════════════════════
# SCHEMAS
# ═══════════════════════════════════════════════════

class NoticeRequest(PydanticBase):
    title: str
    title_marathi: Optional[str] = None
    content: str
    content_marathi: Optional[str] = None
    notice_type: str = "general"
    audience: str = "all"
    is_urgent: bool = False
    is_published: bool = False
    publish_date: Optional[date] = None
    expiry_date: Optional[date] = None
    academic_year_id: Optional[int] = None

class NoticeResponse(PydanticBase):
    model_config = {"from_attributes": True}
    id: int
    title: str
    title_marathi: Optional[str] = None
    content: str
    content_marathi: Optional[str] = None
    notice_type: str
    audience: str
    is_urgent: bool
    is_published: bool
    publish_date: Optional[date] = None
    expiry_date: Optional[date] = None
    view_count: int
    is_active: bool
    created_at: Optional[datetime] = None


class TemplateRequest(PydanticBase):
    name: str
    template_type: str = "sms"
    category: str = "general"
    subject: Optional[str] = None
    body_english: str
    body_marathi: Optional[str] = None
    variables: Optional[str] = None

class TemplateResponse(PydanticBase):
    model_config = {"from_attributes": True}
    id: int
    name: str
    template_type: str
    category: str
    subject: Optional[str] = None
    body_english: str
    body_marathi: Optional[str] = None
    variables: Optional[str] = None
    is_active: bool


class SendMessageRequest(PydanticBase):
    channel: str = "sms"               # sms / whatsapp / email / in_app
    recipient_type: str = "all"
    recipient_ids: Optional[list[int]] = None   # None = broadcast
    recipient_phones: Optional[list[str]] = None
    subject: Optional[str] = None
    message_body: str
    template_id: Optional[int] = None
    notice_id: Optional[int] = None

class CommunicationLogResponse(PydanticBase):
    model_config = {"from_attributes": True}
    id: int
    channel: str
    recipient_type: str
    recipient_id: Optional[int] = None
    recipient_phone: Optional[str] = None
    subject: Optional[str] = None
    message_body: str
    status: str
    sent_at: Optional[datetime] = None
    error_message: Optional[str] = None


class AnnouncementRequest(PydanticBase):
    title: str
    body: Optional[str] = None
    announcement_type: str = "info"
    target_roles: str = "all"
    is_pinned: bool = False
    expiry_date: Optional[date] = None
    academic_year_id: Optional[int] = None

class AnnouncementResponse(PydanticBase):
    model_config = {"from_attributes": True}
    id: int
    title: str
    body: Optional[str] = None
    announcement_type: str
    target_roles: str
    is_pinned: bool
    expiry_date: Optional[date] = None
    is_active: bool
    created_at: Optional[datetime] = None


class CommStatsResponse(PydanticBase):
    total_notices: int
    published_notices: int
    urgent_notices: int
    total_messages_sent: int
    messages_delivered: int
    messages_failed: int
    active_announcements: int
    total_templates: int


# ═══════════════════════════════════════════════════
# SERVICES
# ═══════════════════════════════════════════════════

class NoticeService:
    @staticmethod
    def create(db: Session, data: NoticeRequest, created_by: int) -> Notice:
        n = Notice(**data.model_dump(), created_by=created_by, published_by=created_by if data.is_published else None)
        db.add(n); db.commit(); db.refresh(n); return n

    @staticmethod
    def list_notices(db: Session, notice_type: Optional[str] = None,
                     audience: Optional[str] = None, published_only: bool = False,
                     academic_year_id: Optional[int] = None,
                     limit: int = 50, offset: int = 0) -> list[Notice]:
        q = select(Notice).where(Notice.is_deleted == False)
        if notice_type: q = q.where(Notice.notice_type == notice_type)
        if audience and audience != "all": q = q.where(Notice.audience == audience)
        if published_only: q = q.where(Notice.is_published == True)
        if academic_year_id: q = q.where(Notice.academic_year_id == academic_year_id)
        q = q.order_by(Notice.is_urgent.desc(), Notice.created_at.desc()).limit(limit).offset(offset)
        return list(db.scalars(q).all())

    @staticmethod
    def get_by_id(db: Session, nid: int) -> Notice:
        from fastapi import HTTPException
        n = db.scalar(select(Notice).where(Notice.id == nid, Notice.is_deleted == False))
        if not n: raise HTTPException(404, "Notice not found.")
        return n

    @staticmethod
    def update(db: Session, nid: int, data: NoticeRequest, updated_by: int) -> Notice:
        n = NoticeService.get_by_id(db, nid)
        for k, v in data.model_dump().items():
            setattr(n, k, v)
        n.updated_by = updated_by
        if data.is_published and not n.published_by:
            n.published_by = updated_by
        db.commit(); db.refresh(n); return n

    @staticmethod
    def publish(db: Session, nid: int, published_by: int) -> Notice:
        n = NoticeService.get_by_id(db, nid)
        n.is_published = True
        n.published_by = published_by
        n.publish_date = date.today()
        AuditService.log(db, action="NOTICE_PUBLISHED", module="communication",
                         user_id=published_by, description=f"Notice '{n.title}' published.")
        db.commit(); db.refresh(n); return n

    @staticmethod
    def increment_view(db: Session, nid: int) -> None:
        n = db.scalar(select(Notice).where(Notice.id == nid))
        if n: n.view_count += 1; db.commit()

    @staticmethod
    def delete(db: Session, nid: int, deleted_by: int) -> None:
        n = NoticeService.get_by_id(db, nid)
        n.soft_delete(deleted_by=deleted_by); db.commit()


class TemplateService:
    @staticmethod
    def create(db: Session, data: TemplateRequest, created_by: int) -> MessageTemplate:
        t = MessageTemplate(**data.model_dump(), created_by=created_by)
        db.add(t); db.commit(); db.refresh(t); return t

    @staticmethod
    def list_templates(db: Session, category: Optional[str] = None,
                       template_type: Optional[str] = None) -> list[MessageTemplate]:
        q = select(MessageTemplate).where(MessageTemplate.is_deleted == False)
        if category: q = q.where(MessageTemplate.category == category)
        if template_type: q = q.where(MessageTemplate.template_type == template_type)
        return list(db.scalars(q.order_by(MessageTemplate.name)).all())

    @staticmethod
    def delete(db: Session, tid: int, deleted_by: int) -> None:
        from fastapi import HTTPException
        t = db.scalar(select(MessageTemplate).where(MessageTemplate.id == tid))
        if not t: raise HTTPException(404)
        t.soft_delete(deleted_by=deleted_by); db.commit()


class MessageService:
    @staticmethod
    def send(db: Session, data: SendMessageRequest, sent_by: int) -> int:
        """
        Simulate sending messages. In production, integrate with
        SMS gateway / WhatsApp Business API.
        Logs every send attempt.
        """
        phones = data.recipient_phones or []
        ids = data.recipient_ids or []

        if not phones and not ids:
            # Broadcast — create a single log entry
            log = CommunicationLog(
                channel=data.channel,
                recipient_type=data.recipient_type,
                subject=data.subject,
                message_body=data.message_body,
                template_id=data.template_id,
                notice_id=data.notice_id,
                status="sent",   # Simulated
                sent_by=sent_by,
                sent_at=datetime.now(timezone.utc),
                created_by=sent_by,
            )
            db.add(log); db.commit()
            return 1

        count = 0
        for i, pid in enumerate(phones if phones else ids):
            log = CommunicationLog(
                channel=data.channel,
                recipient_type=data.recipient_type,
                recipient_id=ids[i] if ids and i < len(ids) else None,
                recipient_phone=phones[i] if phones and i < len(phones) else None,
                subject=data.subject,
                message_body=data.message_body,
                template_id=data.template_id,
                notice_id=data.notice_id,
                status="sent",   # Simulated — replace with real API call result
                sent_by=sent_by,
                sent_at=datetime.now(timezone.utc),
                created_by=sent_by,
            )
            db.add(log)
            count += 1
        db.commit()
        AuditService.log(db, action="MESSAGES_SENT", module="communication",
                         user_id=sent_by,
                         description=f"{count} {data.channel} messages dispatched.")
        return count

    @staticmethod
    def get_logs(db: Session, channel: Optional[str] = None,
                 status: Optional[str] = None, limit: int = 100) -> list[CommunicationLog]:
        q = select(CommunicationLog).where(CommunicationLog.is_deleted == False)
        if channel: q = q.where(CommunicationLog.channel == channel)
        if status: q = q.where(CommunicationLog.status == status)
        return list(db.scalars(q.order_by(CommunicationLog.sent_at.desc()).limit(limit)).all())


class AnnouncementService:
    @staticmethod
    def create(db: Session, data: AnnouncementRequest, created_by: int) -> Announcement:
        a = Announcement(**data.model_dump(), created_by=created_by)
        db.add(a); db.commit(); db.refresh(a); return a

    @staticmethod
    def get_active(db: Session, role: Optional[str] = None) -> list[Announcement]:
        today = date.today()
        q = select(Announcement).where(
            Announcement.is_deleted == False,
            Announcement.is_active == True,
            (Announcement.expiry_date == None) | (Announcement.expiry_date >= today),
        ).order_by(Announcement.is_pinned.desc(), Announcement.created_at.desc())
        return list(db.scalars(q).all())

    @staticmethod
    def delete(db: Session, aid: int, deleted_by: int) -> None:
        from fastapi import HTTPException
        a = db.scalar(select(Announcement).where(Announcement.id == aid))
        if not a: raise HTTPException(404)
        a.soft_delete(deleted_by=deleted_by); db.commit()


class CommStatsService:
    @staticmethod
    def get(db: Session) -> CommStatsResponse:
        today = date.today()
        total_notices = db.scalar(select(func.count()).where(Notice.is_deleted == False)) or 0
        published = db.scalar(select(func.count()).where(Notice.is_deleted == False, Notice.is_published == True)) or 0
        urgent = db.scalar(select(func.count()).where(Notice.is_deleted == False, Notice.is_urgent == True, Notice.is_published == True)) or 0

        total_msg = db.scalar(select(func.count()).where(CommunicationLog.is_deleted == False)) or 0
        delivered = db.scalar(select(func.count()).where(CommunicationLog.is_deleted == False, CommunicationLog.status.in_(["sent","delivered"]))) or 0
        failed = db.scalar(select(func.count()).where(CommunicationLog.is_deleted == False, CommunicationLog.status == "failed")) or 0

        active_ann = db.scalar(select(func.count()).where(
            Announcement.is_deleted == False, Announcement.is_active == True,
            (Announcement.expiry_date == None) | (Announcement.expiry_date >= today)
        )) or 0

        templates = db.scalar(select(func.count()).where(MessageTemplate.is_deleted == False)) or 0

        return CommStatsResponse(
            total_notices=total_notices, published_notices=published, urgent_notices=urgent,
            total_messages_sent=total_msg, messages_delivered=delivered, messages_failed=failed,
            active_announcements=active_ann, total_templates=templates,
        )
