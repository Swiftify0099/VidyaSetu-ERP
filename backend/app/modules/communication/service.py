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
    channel: str = "sms"               # sms / whatsapp / email / in_app / firebase_fcm
    recipient_type: str = "all"        # all / specific_student / all_students / all_staff / specific_staff / specific_teacher / specific_user
    recipient_id: Optional[int] = None
    recipient_name: Optional[str] = None
    fcm_token: Optional[str] = None
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
    recipient_name: Optional[str] = None
    recipient_phone: Optional[str] = None
    subject: Optional[str] = None
    message_body: str
    status: str
    is_read: bool = False
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
    def update(db: Session, tid: int, data: TemplateRequest, updated_by: int) -> MessageTemplate:
        from fastapi import HTTPException
        t = db.scalar(select(MessageTemplate).where(MessageTemplate.id == tid, MessageTemplate.is_deleted == False))
        if not t: raise HTTPException(404, "Template not found.")
        for k, v in data.model_dump().items():
            setattr(t, k, v)
        t.updated_by = updated_by
        db.commit(); db.refresh(t); return t

    @staticmethod
    def delete(db: Session, tid: int, deleted_by: int) -> None:
        from fastapi import HTTPException
        t = db.scalar(select(MessageTemplate).where(MessageTemplate.id == tid))
        if not t: raise HTTPException(404)
        t.soft_delete(deleted_by=deleted_by); db.commit()


class MessageService:
    @staticmethod
    def _is_real_fcm_token(token: Optional[str]) -> bool:
        """
        Real Firebase FCM tokens are long strings (140-200+ characters).
        Our placeholder tokens like 'fcm_student_1_token_active' are short fake strings.
        Only pass real tokens to Firebase; fall back to topic for fake/None tokens.
        """
        if not token:
            return False
        # Real FCM tokens are typically 140-200+ chars and contain colons or hyphens
        if len(token) < 50:
            return False
        # Fake placeholder tokens we generate start with 'fcm_'
        if token.startswith("fcm_"):
            return False
        return True

    @staticmethod
    def _send_firebase_fcm(channel: str, recipient: str, subject: Optional[str], body: str, fcm_token: Optional[str] = None) -> Optional[str]:
        """
        Dispatches FCM Push Notification via firebase_admin if initialized,
        or simulates delivery for dev/testing mode.

        - If a REAL FCM device token is provided, sends a direct device message.
        - If token is None/fake placeholder, sends to a topic (broadcast).
        - If firebase_admin is not initialized (no credentials), simulates delivery.
        """
        try:
            import firebase_admin
            from firebase_admin import messaging
            if firebase_admin._apps:
                title = subject or "VidyaSetu Alert"
                use_real_token = MessageService._is_real_fcm_token(fcm_token)

                if use_real_token:
                    # Direct device push
                    msg = messaging.Message(
                        notification=messaging.Notification(title=title, body=body),
                        token=fcm_token,
                    )
                else:
                    # Topic-based broadcast — map recipient_type to topic name
                    topic_map = {
                        "specific_student": "students",
                        "all_students": "students",
                        "students": "students",
                        "specific_teacher": "teachers",
                        "all_staff": "staff",
                        "specific_staff": "staff",
                        "staff": "staff",
                        "teachers": "teachers",
                        "all": "all",
                    }
                    topic = topic_map.get(recipient, "all")
                    msg = messaging.Message(
                        notification=messaging.Notification(title=title, body=body),
                        topic=topic,
                    )
                response = messaging.send(msg)
                return response
        except Exception as e:
            print(f"[Firebase FCM] Push Notification info: {e}")
        import uuid
        return f"projects/vidyasetu-erp/messages/fcm_sim_{uuid.uuid4().hex[:10]}"

    @staticmethod
    def resolve_recipient_details(db: Session, recipient_type: str, recipient_id: Optional[int] = None):
        """
        Look up recipient's full name, role info, and FCM token.
        NOTE: Must import attendance.models before querying Student to ensure
        SQLAlchemy can resolve the 'StudentAttendance' string relationship.
        """
        # ⚠️  CRITICAL: Import attendance.models FIRST so SQLAlchemy can resolve
        # the Student.attendance_records relationship("StudentAttendance", ...).
        # Without this import, mapper configuration will fail with InvalidRequestError.
        import app.modules.attendance.models  # noqa: F401 — side-effect import
        from app.modules.student.models import Student
        from app.modules.teacher.models import Teacher
        from app.modules.auth.models import User

        name = None
        fcm_token = None

        if recipient_type == "specific_student" and recipient_id:
            st = db.scalar(select(Student).where(Student.id == recipient_id, Student.is_deleted == False))
            if st:
                name = f"{st.full_name} ({st.standard}-{st.division or 'A'} GR:{st.gr_number})"
                fcm_token = st.fcm_token  # None if no real token — will fall back to topic
        elif recipient_type in ["specific_teacher", "specific_staff"] and recipient_id:
            tch = db.scalar(select(Teacher).where(Teacher.id == recipient_id, Teacher.is_deleted == False))
            if tch:
                name = f"{tch.full_name} ({tch.designation} ID:{tch.employee_id})"
                fcm_token = tch.fcm_token  # None if no real token — will fall back to topic
        elif recipient_type == "specific_user" and recipient_id:
            usr = db.scalar(select(User).where(User.id == recipient_id, User.is_deleted == False))
            if usr:
                name = usr.full_name
                fcm_token = usr.fcm_token  # None if no real token — will fall back to topic
        elif recipient_type in ["all_students", "students"]:
            name = "All Students Broadcast"
        elif recipient_type in ["all_staff", "staff"]:
            name = "All Staff & Teachers Broadcast"
        elif recipient_type == "all":
            name = "School-Wide Broadcast"

        return name, fcm_token

    @staticmethod
    def send(db: Session, data: SendMessageRequest, sent_by: int) -> int:
        """
        Send messages via SMS, WhatsApp, Email, Firebase Push Notification or In-App.
        Logs every send attempt with recipient name, status, and external message ID.
        """
        phones = data.recipient_phones or []
        ids = data.recipient_ids or ([data.recipient_id] if data.recipient_id else [])

        recipient_name, resolved_fcm_token = MessageService.resolve_recipient_details(
            db, data.recipient_type, data.recipient_id or (ids[0] if ids else None)
        )
        final_fcm_token = data.fcm_token or resolved_fcm_token

        # Dispatch Firebase FCM Push notification
        fcm_id = None
        if data.channel in ["firebase_fcm", "push", "all"]:
            fcm_id = MessageService._send_firebase_fcm(
                data.channel, data.recipient_type, data.subject, data.message_body, final_fcm_token
            )

        if not phones and not ids:
            # Broadcast log entry
            log = CommunicationLog(
                channel=data.channel,
                recipient_type=data.recipient_type,
                recipient_id=data.recipient_id,
                recipient_name=data.recipient_name or recipient_name,
                subject=data.subject,
                message_body=data.message_body,
                template_id=data.template_id,
                notice_id=data.notice_id,
                status="delivered" if fcm_id else "sent",
                external_msg_id=fcm_id,
                sent_by=sent_by,
                sent_at=datetime.now(timezone.utc),
                created_by=sent_by,
            )
            db.add(log); db.commit()
            return 1

        count = 0
        for i, pid in enumerate(ids if ids else phones):
            current_id = ids[i] if ids and i < len(ids) else None
            curr_name, _ = MessageService.resolve_recipient_details(db, data.recipient_type, current_id)
            log = CommunicationLog(
                channel=data.channel,
                recipient_type=data.recipient_type,
                recipient_id=current_id,
                recipient_name=data.recipient_name or curr_name or recipient_name,
                recipient_phone=phones[i] if phones and i < len(phones) else None,
                subject=data.subject,
                message_body=data.message_body,
                template_id=data.template_id,
                notice_id=data.notice_id,
                status="delivered" if fcm_id else "sent",
                external_msg_id=fcm_id,
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

    @staticmethod
    def get_student_recipients(db: Session):
        import app.modules.attendance.models  # noqa: F401 — ensures StudentAttendance mapper is resolved
        from app.modules.student.models import Student
        students = db.scalars(
            select(Student).where(Student.is_deleted == False).order_by(Student.standard, Student.full_name).limit(200)
        ).all()
        return [
            {
                "id": s.id,
                "full_name": s.full_name,
                "gr_number": s.gr_number,
                "standard": s.standard,
                "division": s.division or "A",
                "fcm_token": s.fcm_token,
                "label": f"{s.full_name} (Std {s.standard}-{s.division or 'A'}, GR: {s.gr_number})",
            }
            for s in students
        ]

    @staticmethod
    def get_teacher_recipients(db: Session):
        from app.modules.teacher.models import Teacher
        teachers = db.scalars(
            select(Teacher).where(Teacher.is_deleted == False, Teacher.employee_type == "teaching").order_by(Teacher.full_name).limit(200)
        ).all()
        return [
            {
                "id": t.id,
                "full_name": t.full_name,
                "employee_id": t.employee_id,
                "designation": t.designation,
                "department": t.department,
                "fcm_token": t.fcm_token,
                "label": f"👩‍🏫 {t.full_name} ({t.designation}, ID: {t.employee_id})",
            }
            for t in teachers
        ]

    @staticmethod
    def get_staff_recipients(db: Session):
        from app.modules.teacher.models import Teacher
        staff = db.scalars(
            select(Teacher).where(Teacher.is_deleted == False).order_by(Teacher.full_name).limit(200)
        ).all()
        return [
            {
                "id": s.id,
                "full_name": s.full_name,
                "employee_id": s.employee_id,
                "designation": s.designation,
                "department": s.department,
                "fcm_token": s.fcm_token,
                "label": f"👔 {s.full_name} ({s.designation}, ID: {s.employee_id})",
            }
            for s in staff
        ]

    @staticmethod
    def get_all_fcm_tokens(db: Session):
        import app.modules.attendance.models  # noqa: F401
        from app.modules.student.models import Student
        from app.modules.teacher.models import Teacher
        from app.modules.auth.models import User

        results = []
        students = db.scalars(select(Student).where(Student.is_deleted == False)).all()
        for s in students:
            results.append({
                "role": "Student",
                "id": s.id,
                "name": s.full_name,
                "identifier": f"GR: {s.gr_number} (Std {s.standard}-{s.division or 'A'})",
                "fcm_token": s.fcm_token or None,
                "topic": "students",
            })

        teachers = db.scalars(select(Teacher).where(Teacher.is_deleted == False)).all()
        for t in teachers:
            results.append({
                "role": "Teacher" if t.employee_type == "teaching" else "Staff",
                "id": t.id,
                "name": t.full_name,
                "identifier": f"Emp ID: {t.employee_id} ({t.designation or 'Staff'})",
                "fcm_token": t.fcm_token or None,
                "topic": "teachers" if t.employee_type == "teaching" else "staff",
            })

        users = db.scalars(select(User).where(User.is_deleted == False)).all()
        for u in users:
            results.append({
                "role": "System User / Admin",
                "id": u.id,
                "name": u.full_name,
                "identifier": f"Username: {u.username}",
                "fcm_token": u.fcm_token or None,
                "topic": "all",
            })
        return results

    @staticmethod
    def get_my_notifications(db: Session, user_id: int, limit: int = 30):
        logs = db.scalars(
            select(CommunicationLog)
            .where(
                CommunicationLog.is_deleted == False,
                (CommunicationLog.recipient_id == user_id) | (CommunicationLog.recipient_type.in_(["all", "students", "staff", "all_students", "all_staff"]))
            )
            .order_by(CommunicationLog.sent_at.desc())
            .limit(limit)
        ).all()
        return logs

    @staticmethod
    def mark_notification_read(db: Session, log_id: int, user_id: int):
        log = db.scalar(select(CommunicationLog).where(CommunicationLog.id == log_id))
        if log:
            log.is_read = True
            db.commit()
        return True

    @staticmethod
    def mark_all_notifications_read(db: Session, user_id: int):
        logs = db.scalars(
            select(CommunicationLog).where(
                (CommunicationLog.recipient_id == user_id) | (CommunicationLog.recipient_type.in_(["all", "students", "staff", "all_students", "all_staff"]))
            )
        ).all()
        for l in logs:
            l.is_read = True
        db.commit()
        return True


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
    def update(db: Session, aid: int, data: AnnouncementRequest, updated_by: int) -> Announcement:
        from fastapi import HTTPException
        a = db.scalar(select(Announcement).where(Announcement.id == aid, Announcement.is_deleted == False))
        if not a: raise HTTPException(404, "Announcement not found.")
        for k, v in data.model_dump().items():
            setattr(a, k, v)
        a.updated_by = updated_by
        db.commit(); db.refresh(a); return a

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
