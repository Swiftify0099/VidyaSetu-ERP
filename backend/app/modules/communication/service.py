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
    image_url: Optional[str] = None
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
        db.commit(); db.refresh(n)
        # ── Fire notification to target audience
        try:
            from app.shared.notifications import push_event
            event_type = "notice.urgent_published" if n.is_urgent else "notice.published"
            push_event(db, event_type, {
                "title": n.title,
                "content_preview": (n.content or "")[:120] + ("..." if len(n.content or "") > 120 else ""),
                "notice_id": n.id,
                "sender_id": published_by,
            })
        except Exception:
            pass
        return n

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
    def _send_firebase_fcm(channel: str, recipient: str, subject: Optional[str], body: str, fcm_token: Optional[str] = None, image_url: Optional[str] = None) -> Optional[str]:
        """
        Dispatches FCM Push Notification via firebase_admin if initialized,
        or simulates delivery for dev/testing mode.

        - If recipient is specific (e.g. specific_student, specific_teacher, specific_staff, specific_user):
            * If a REAL FCM token is provided, sends direct device message.
            * If token is missing/placeholder, returns simulated direct push ID (DO NOT broadcast to topic!).
        - If recipient is broadcast (e.g. all, all_students, all_staff, students, staff, teachers):
            * Sends to topic (all, students, staff, teachers).
        """
        is_specific = recipient.startswith("specific_")
        title = subject or "VidyaSetu Alert"
        use_real_token = MessageService._is_real_fcm_token(fcm_token)

        try:
            import firebase_admin
            from firebase_admin import messaging
            if firebase_admin._apps:
                notification_payload = messaging.Notification(
                    title=title,
                    body=body,
                    image=image_url if image_url else None,
                )

                data_payload = {
                    "title": title,
                    "body": body,
                    "url": "/",
                    "category": "communication",
                    "priority": "high" if subject and "urgent" in subject.lower() else "medium",
                }
                if image_url:
                    data_payload["image"] = image_url

                # High-priority platform configs to ensure live heads-up popups on screen outside app
                android_config = messaging.AndroidConfig(
                    priority="high",
                    notification=messaging.AndroidNotification(
                        title=title,
                        body=body,
                        image=image_url if image_url else None,
                        sound="default",
                        channel_id="vidyasetu_high_importance",
                        priority="high",
                        visibility="public",
                        default_sound=True,
                        default_vibrate_timings=True,
                    ),
                    data=data_payload,
                )
                apns_config = messaging.APNSConfig(
                    payload=messaging.APNSPayload(
                        aps=messaging.Aps(
                            alert=messaging.ApsAlert(title=title, body=body),
                            sound="default",
                            badge=1,
                            content_available=True,
                        ),
                    ),
                    fcm_options=messaging.APNSFCMOptions(image=image_url) if image_url else None,
                )
                webpush_config = messaging.WebpushConfig(
                    notification=messaging.WebpushNotification(
                        title=title,
                        body=body,
                        image=image_url if image_url else None,
                        icon="/icon.png",
                        require_interaction=True,
                    ),
                    data=data_payload,
                )

                if is_specific:
                    if use_real_token:
                        # Direct device push
                        msg = messaging.Message(
                            notification=notification_payload,
                            token=fcm_token,
                            data=data_payload,
                            android=android_config,
                            apns=apns_config,
                            webpush=webpush_config,
                        )
                        return messaging.send(msg)
                    else:
                        # Direct push requested but no valid device token; avoid topic broadcast leak
                        import uuid
                        return f"projects/vidyasetu-erp/messages/fcm_sim_direct_{uuid.uuid4().hex[:10]}"
                else:
                    # Topic-based broadcast
                    topic_map = {
                        "all_students": "students",
                        "students": "students",
                        "all_teachers": "teachers",
                        "teachers": "teachers",
                        "all_staff": "staff",
                        "staff": "staff",
                        "all": "all",
                    }
                    topic = topic_map.get(recipient, "all")
                    msg = messaging.Message(
                        notification=notification_payload,
                        topic=topic,
                        data=data_payload,
                        android=android_config,
                        apns=apns_config,
                        webpush=webpush_config,
                    )
                    return messaging.send(msg)
        except Exception as e:
            print(f"[Firebase FCM] Push Notification info: {e}")
        import uuid
        return f"projects/vidyasetu-erp/messages/fcm_sim_{uuid.uuid4().hex[:10]}"

    @staticmethod
    def resolve_recipient_details(db: Session, recipient_type: str, recipient_id: Optional[int] = None):
        """
        Look up recipient's full name, role info, and FCM token.
        Checks Student, Teacher, and linked User records.
        """
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
                fcm_token = st.fcm_token
                if not fcm_token and st.user_id:
                    usr = db.scalar(select(User).where(User.id == st.user_id, User.is_deleted == False))
                    if usr: fcm_token = usr.fcm_token
        elif recipient_type in ["specific_teacher", "specific_staff"] and recipient_id:
            tch = db.scalar(select(Teacher).where(Teacher.id == recipient_id, Teacher.is_deleted == False))
            if tch:
                name = f"{tch.full_name} ({tch.designation} ID:{tch.employee_id})"
                fcm_token = tch.fcm_token
                if not fcm_token and tch.user_id:
                    usr = db.scalar(select(User).where(User.id == tch.user_id, User.is_deleted == False))
                    if usr: fcm_token = usr.fcm_token
        elif recipient_type == "specific_user" and recipient_id:
            usr = db.scalar(select(User).where(User.id == recipient_id, User.is_deleted == False))
            if usr:
                name = usr.full_name
                fcm_token = usr.fcm_token
        elif recipient_type in ["all_students", "students"]:
            name = "All Students Broadcast"
        elif recipient_type in ["all_staff", "staff"]:
            name = "All Staff & Teachers Broadcast"
        elif recipient_type in ["all_teachers", "teachers"]:
            name = "All Teachers Broadcast"
        elif recipient_type == "all":
            name = "School-Wide Broadcast"

        return name, fcm_token

    @staticmethod
    def send(db: Session, data: SendMessageRequest, sent_by: int) -> int:
        """
        Send messages via SMS, WhatsApp, Email, Firebase Push Notification or In-App.
        Logs every send attempt with recipient name, status, and external message ID.
        Also writes Notification inbox rows for in-app notification center.
        """
        from app.modules.communication.models import Notification
        from datetime import timedelta

        phones = data.recipient_phones or []
        ids = data.recipient_ids or ([data.recipient_id] if data.recipient_id else [])
        is_fcm = data.channel in ["firebase_fcm", "push", "all"]

        # CASE 1: BROADCAST TO ALL / ROLE (No specific recipient IDs provided)
        if not ids and not phones:
            recipient_name, resolved_fcm_token = MessageService.resolve_recipient_details(
                db, data.recipient_type, None
            )
            final_fcm_token = data.fcm_token or resolved_fcm_token

            fcm_id = None
            if is_fcm:
                fcm_id = MessageService._send_firebase_fcm(
                    data.channel, data.recipient_type, data.subject, data.message_body, final_fcm_token, data.image_url
                )

            log = CommunicationLog(
                channel=data.channel,
                recipient_type=data.recipient_type,
                recipient_id=None,
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
            db.add(log)

            role_map = {
                "all_students": "student", "students": "student",
                "all_teachers": "teacher", "teachers": "teacher",
                "all_staff": "staff", "staff": "staff",
                "all": "all",
            }
            recip_role = role_map.get(data.recipient_type, "all")
            notif = Notification(
                sender_id=sent_by,
                recipient_id=None,
                recipient_role=recip_role,
                category="communication",
                notification_type="broadcast_message",
                priority="high" if data.subject and "urgent" in data.subject.lower() else "medium",
                title=data.subject or "School Notification",
                body=data.message_body,
                channel=data.channel,
                fcm_message_id=fcm_id,
                delivered_at=datetime.now(timezone.utc) if fcm_id else None,
                is_read=False,
                expires_at=datetime.now(timezone.utc) + timedelta(days=30),
                created_by=sent_by,
            )
            db.add(notif)
            db.commit()
            return 1

        # CASE 2: TARGETED RECIPIENTS (Specific student/teacher/staff/user IDs provided)
        count = 0
        for i, target_id in enumerate(ids if ids else phones):
            curr_id = ids[i] if ids and i < len(ids) else None
            curr_name, resolved_fcm_token = MessageService.resolve_recipient_details(db, data.recipient_type, curr_id)
            final_fcm_token = data.fcm_token or resolved_fcm_token

            fcm_id = None
            if is_fcm:
                fcm_id = MessageService._send_firebase_fcm(
                    data.channel, data.recipient_type, data.subject, data.message_body, final_fcm_token, data.image_url
                )

            log = CommunicationLog(
                channel=data.channel,
                recipient_type=data.recipient_type,
                recipient_id=curr_id if isinstance(curr_id, int) else None,
                recipient_name=data.recipient_name or curr_name,
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

            # Resolve actual User ID if curr_id was Student.id or Teacher.id
            target_user_id = curr_id
            if data.recipient_type == "specific_student" and curr_id:
                from app.modules.student.models import Student
                st_user = db.scalar(select(Student.user_id).where(Student.id == curr_id))
                if st_user: target_user_id = st_user
            elif data.recipient_type in ["specific_teacher", "specific_staff"] and curr_id:
                from app.modules.teacher.models import Teacher
                tch_user = db.scalar(select(Teacher.user_id).where(Teacher.id == curr_id))
                if tch_user: target_user_id = tch_user

            notif = Notification(
                sender_id=sent_by,
                recipient_id=target_user_id if isinstance(target_user_id, int) else None,
                recipient_role=None,
                category="communication",
                notification_type="direct_message",
                priority="medium",
                title=data.subject or "Personal Notification",
                body=data.message_body,
                channel=data.channel,
                fcm_message_id=fcm_id,
                delivered_at=datetime.now(timezone.utc) if fcm_id else None,
                is_read=False,
                expires_at=datetime.now(timezone.utc) + timedelta(days=30),
                created_by=sent_by,
            )
            db.add(notif)
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


# ═══════════════════════════════════════════════════
# NOTIFICATION SERVICE
# ═══════════════════════════════════════════════════

class NotificationResponse(PydanticBase):
    """Pydantic schema for the Notification model."""
    model_config = {"from_attributes": True}
    id: int
    sender_id: Optional[int] = None
    sender_role: Optional[str] = None
    recipient_id: Optional[int] = None
    recipient_role: Optional[str] = None
    category: str
    notification_type: str
    priority: str
    title: str
    body: str
    reference_module: Optional[str] = None
    reference_id: Optional[str] = None
    action_url: Optional[str] = None
    channel: str
    fcm_message_id: Optional[str] = None
    delivered_at: Optional[datetime] = None
    is_read: bool
    read_at: Optional[datetime] = None
    seen_at: Optional[datetime] = None
    clicked_at: Optional[datetime] = None
    expires_at: Optional[datetime] = None
    created_at: Optional[datetime] = None


class NotificationCenterResponse(PydanticBase):
    notifications: list[NotificationResponse]
    total: int
    unread_count: int
    category_breakdown: dict
    priority_breakdown: dict


class NotificationService:

    @staticmethod
    def _base_query(db: Session, user_id: int, roles: list):
        """Build base query for current user's notifications."""
        from app.modules.communication.models import Notification
        role_codes = [r.get("code", r) if isinstance(r, dict) else r for r in (roles or [])]
        q = (
            select(Notification)
            .where(
                Notification.is_deleted == False,
                (Notification.expires_at == None) | (Notification.expires_at >= datetime.now(timezone.utc)),
                (
                    (Notification.recipient_id == user_id) |
                    Notification.recipient_role.in_(role_codes) |
                    (Notification.recipient_role == "all")
                ),
            )
        )
        return q

    @staticmethod
    def get_for_user(
        db: Session,
        user_id: int,
        roles: list,
        limit: int = 30,
        offset: int = 0,
        category: Optional[str] = None,
        priority: Optional[str] = None,
        unread_only: bool = False,
        search: Optional[str] = None,
    ):
        from app.modules.communication.models import Notification
        q = NotificationService._base_query(db, user_id, roles)
        if category:
            q = q.where(Notification.category == category)
        if priority:
            q = q.where(Notification.priority == priority)
        if unread_only:
            q = q.where(Notification.is_read == False)
        if search:
            search_term = f"%{search}%"
            q = q.where(
                (Notification.title.ilike(search_term)) |
                (Notification.body.ilike(search_term))
            )
        q = q.order_by(
            Notification.priority.in_(["critical", "high"]).desc(),
            Notification.is_read.asc(),
            Notification.created_at.desc(),
        ).limit(limit).offset(offset)
        return list(db.scalars(q).all())

    @staticmethod
    def get_unread_count(db: Session, user_id: int, roles: list) -> int:
        from app.modules.communication.models import Notification
        q = (
            select(func.count())
            .select_from(Notification)
            .where(
                Notification.is_deleted == False,
                Notification.is_read == False,
                (Notification.expires_at == None) | (Notification.expires_at >= datetime.now(timezone.utc)),
                (
                    (Notification.recipient_id == user_id) |
                    Notification.recipient_role.in_(
                        [r.get("code", r) if isinstance(r, dict) else r for r in (roles or [])]
                    ) |
                    (Notification.recipient_role == "all")
                ),
            )
        )
        return db.scalar(q) or 0

    @staticmethod
    def get_center(
        db: Session,
        user_id: int,
        roles: list,
        limit: int = 50,
        offset: int = 0,
        category: Optional[str] = None,
        priority: Optional[str] = None,
        unread_only: bool = False,
        search: Optional[str] = None,
        date_from: Optional[str] = None,
        date_to: Optional[str] = None,
    ) -> dict:
        from app.modules.communication.models import Notification
        from datetime import date as Date_
        q = NotificationService._base_query(db, user_id, roles)
        if category:
            q = q.where(Notification.category == category)
        if priority:
            q = q.where(Notification.priority == priority)
        if unread_only:
            q = q.where(Notification.is_read == False)
        if search:
            s = f"%{search}%"
            q = q.where((Notification.title.ilike(s)) | (Notification.body.ilike(s)))
        if date_from:
            try:
                q = q.where(Notification.created_at >= datetime.fromisoformat(date_from))
            except Exception:
                pass
        if date_to:
            try:
                q = q.where(Notification.created_at <= datetime.fromisoformat(date_to))
            except Exception:
                pass

        total_q = select(func.count()).select_from(q.subquery())
        total = db.scalar(total_q) or 0
        unread_count = NotificationService.get_unread_count(db, user_id, roles)

        notifs = list(db.scalars(
            q.order_by(Notification.is_read.asc(), Notification.created_at.desc())
            .limit(limit).offset(offset)
        ).all())

        # Category breakdown
        from sqlalchemy import case
        cat_q = NotificationService._base_query(db, user_id, roles)
        cat_counts: dict = {}
        for notif in notifs:
            cat_counts[notif.category] = cat_counts.get(notif.category, 0) + 1

        pri_counts: dict = {}
        for notif in notifs:
            pri_counts[notif.priority] = pri_counts.get(notif.priority, 0) + 1

        return {
            "notifications": [NotificationResponse.model_validate(n).model_dump() for n in notifs],
            "total": total,
            "unread_count": unread_count,
            "category_breakdown": cat_counts,
            "priority_breakdown": pri_counts,
        }

    @staticmethod
    def mark_read(db: Session, notification_id: int, user_id: int) -> bool:
        from app.modules.communication.models import Notification
        n = db.scalar(select(Notification).where(Notification.id == notification_id))
        if n and not n.is_read:
            n.is_read = True
            n.read_at = datetime.now(timezone.utc)
            db.commit()
        return True

    @staticmethod
    def mark_clicked(db: Session, notification_id: int, user_id: int) -> bool:
        from app.modules.communication.models import Notification
        n = db.scalar(select(Notification).where(Notification.id == notification_id))
        if n:
            n.clicked_at = datetime.now(timezone.utc)
            if not n.is_read:
                n.is_read = True
                n.read_at = datetime.now(timezone.utc)
            db.commit()
        return True

    @staticmethod
    def mark_all_read(db: Session, user_id: int, roles: list) -> int:
        from app.modules.communication.models import Notification
        role_codes = [r.get("code", r) if isinstance(r, dict) else r for r in (roles or [])]
        notifs = db.scalars(
            select(Notification).where(
                Notification.is_deleted == False,
                Notification.is_read == False,
                (
                    (Notification.recipient_id == user_id) |
                    Notification.recipient_role.in_(role_codes) |
                    (Notification.recipient_role == "all")
                ),
            )
        ).all()
        now = datetime.now(timezone.utc)
        count = 0
        for n in notifs:
            n.is_read = True
            n.read_at = now
            count += 1
        db.commit()
        return count

    @staticmethod
    def delete(db: Session, notification_id: int, user_id: int) -> None:
        from app.modules.communication.models import Notification
        n = db.scalar(select(Notification).where(Notification.id == notification_id))
        if n:
            n.soft_delete(deleted_by=user_id)
            db.commit()

    @staticmethod
    def get_analytics(db: Session) -> dict:
        from app.modules.communication.models import Notification
        total = db.scalar(select(func.count()).where(Notification.is_deleted == False)) or 0
        delivered = db.scalar(
            select(func.count()).where(Notification.is_deleted == False, Notification.delivered_at != None)
        ) or 0
        read = db.scalar(
            select(func.count()).where(Notification.is_deleted == False, Notification.is_read == True)
        ) or 0
        clicked = db.scalar(
            select(func.count()).where(Notification.is_deleted == False, Notification.clicked_at != None)
        ) or 0
        return {
            "total_notifications": total,
            "delivered": delivered,
            "delivery_rate": round((delivered / total * 100) if total else 0, 1),
            "read": read,
            "read_rate": round((read / total * 100) if total else 0, 1),
            "clicked": clicked,
            "click_rate": round((clicked / total * 100) if total else 0, 1),
        }

    @staticmethod
    def register_fcm_token(db: Session, user_id: int, fcm_token: str) -> None:
        from app.modules.auth.models import User
        from app.modules.student.models import Student
        from app.modules.teacher.models import Teacher

        user = db.scalar(select(User).where(User.id == user_id))
        if user:
            user.fcm_token = fcm_token

        student = db.scalar(select(Student).where((Student.user_id == user_id) | (Student.id == user_id)))
        if student:
            student.fcm_token = fcm_token

        teacher = db.scalar(select(Teacher).where((Teacher.user_id == user_id) | (Teacher.id == user_id)))
        if teacher:
            teacher.fcm_token = fcm_token

        db.commit()

    @staticmethod
    def send_test_push(db: Session, user_id: int) -> dict:
        """
        Send a real FCM test push notification to the current user.
        Returns detailed diagnostic dict: token found, Firebase status, message ID, debug log.
        """
        from app.modules.auth.models import User
        from app.modules.student.models import Student
        from app.modules.teacher.models import Teacher

        debug: list[str] = []
        fcm_token: Optional[str] = None
        token_source = "none"

        # --- 1. Find FCM token from User / Student / Teacher ---
        user = db.scalar(select(User).where(User.id == user_id))
        if user and user.fcm_token:
            fcm_token = user.fcm_token
            token_source = f"User#{user.id} ({user.full_name})"
            debug.append(f"✅ Token found on User model: {fcm_token[:35]}...")

        if not fcm_token:
            student = db.scalar(select(Student).where(Student.user_id == user_id))
            if student and student.fcm_token:
                fcm_token = student.fcm_token
                token_source = f"Student#{student.id} ({student.full_name})"
                debug.append(f"✅ Token found on Student model: {fcm_token[:35]}...")

        if not fcm_token:
            teacher = db.scalar(select(Teacher).where(Teacher.user_id == user_id))
            if teacher and teacher.fcm_token:
                fcm_token = teacher.fcm_token
                token_source = f"Teacher#{teacher.id} ({teacher.full_name})"
                debug.append(f"✅ Token found on Teacher model: {fcm_token[:35]}...")

        if not fcm_token:
            debug.append("❌ No FCM token found for this user in DB.")
            debug.append("   → Open the app in Chrome/Firefox, click the 🔔 bell icon, and allow notifications.")
            debug.append("   → Then reload and try this test again.")
            return {
                "status": "no_token",
                "token_found": False,
                "token_source": "none",
                "is_real_token": False,
                "firebase_initialized": False,
                "fcm_message_id": None,
                "debug": debug,
                "message": "No FCM token registered. Allow browser notifications and try again.",
            }

        # --- 2. Validate token ---
        is_real = MessageService._is_real_fcm_token(fcm_token)
        debug.append(f"Token is {'REAL (live push)' if is_real else 'FAKE/placeholder (simulation only)'}")

        # --- 3. Check Firebase Admin ---
        try:
            import firebase_admin
            from firebase_admin import messaging as fb_msg
            fb_ready = bool(firebase_admin._apps)
            debug.append(f"Firebase Admin SDK initialized: {fb_ready}")
            if not fb_ready:
                debug.append("❌ firebase-credentials.json is missing or not loaded by backend.")
                debug.append("   → Download Service Account JSON from Firebase Console and place it")
                debug.append("   → at: backend/firebase-credentials.json, then restart the server.")
        except ImportError:
            debug.append("❌ firebase-admin package not installed (pip install firebase-admin).")
            return {
                "status": "firebase_not_installed",
                "token_found": True,
                "token_source": token_source,
                "is_real_token": is_real,
                "firebase_initialized": False,
                "fcm_message_id": None,
                "debug": debug,
                "message": "firebase-admin package not installed.",
            }

        if not fb_ready:
            return {
                "status": "firebase_not_initialized",
                "token_found": True,
                "token_source": token_source,
                "is_real_token": is_real,
                "firebase_initialized": False,
                "fcm_message_id": None,
                "debug": debug,
                "message": "Firebase Admin SDK not initialized. Place firebase-credentials.json in backend/ and restart.",
            }

        if not is_real:
            import uuid
            sim_id = f"sim_{uuid.uuid4().hex[:12]}"
            debug.append(f"⚠️ Token is fake/placeholder — simulated message ID: {sim_id}")
            return {
                "status": "fake_token",
                "token_found": True,
                "token_source": token_source,
                "is_real_token": False,
                "firebase_initialized": True,
                "fcm_message_id": sim_id,
                "debug": debug,
                "message": "Token is a placeholder. Browser must generate a real FCM token (allow notifications in browser).",
            }

        # --- 4. Send real push ---
        try:
            msg = fb_msg.Message(
                notification=fb_msg.Notification(
                    title="🔔 VidyaSetu — Test Push",
                    body="Firebase push notification is working! 🎉",
                ),
                token=fcm_token,
                android=fb_msg.AndroidConfig(
                    priority="high",
                    notification=fb_msg.AndroidNotification(
                        title="🔔 VidyaSetu — Test Push",
                        body="Firebase push notification is working! 🎉",
                        sound="default",
                        channel_id="vidyasetu_high_importance",
                    ),
                ),
                webpush=fb_msg.WebpushConfig(
                    notification=fb_msg.WebpushNotification(
                        title="🔔 VidyaSetu — Test Push",
                        body="Firebase push notification is working! 🎉",
                        require_interaction=True,
                        icon="/favicon.ico",
                    ),
                ),
            )
            msg_id = fb_msg.send(msg)
            debug.append(f"✅ FCM push sent! Message ID: {msg_id}")
            return {
                "status": "sent",
                "token_found": True,
                "token_source": token_source,
                "is_real_token": True,
                "firebase_initialized": True,
                "fcm_message_id": msg_id,
                "debug": debug,
                "message": "✅ Real FCM push notification sent successfully!",
            }
        except Exception as e:
            err = str(e)
            debug.append(f"❌ FCM send error: {err}")
            if "registration-token-not-registered" in err or "NOT_FOUND" in err:
                debug.append("   → Token expired/revoked. Reload the app and allow notifications again.")
            elif "invalid-argument" in err:
                debug.append("   → Token format invalid or belongs to a different Firebase project.")
            elif "SENDER_ID_MISMATCH" in err:
                debug.append("   → Token was created for a DIFFERENT Firebase project! Check VITE_FIREBASE_* env vars.")
            return {
                "status": "send_error",
                "token_found": True,
                "token_source": token_source,
                "is_real_token": True,
                "firebase_initialized": True,
                "fcm_message_id": None,
                "debug": debug,
                "message": f"FCM send failed: {err}",
            }

