"""
VidyaSetu ERP — Enterprise Notification Engine
===============================================
Central service for all automated workflow notifications.

Usage (from any service):
    from app.shared.notifications import push_event
    push_event(db, "leave.applied", {
        "applicant_id": 5, "applicant_name": "Rahul More",
        "approver_id": 12, "days": 2,
        "from_date": "2025-08-01", "to_date": "2025-08-02",
        "app_id": 101,
    })

Rules:
- push_event() NEVER raises — wrapped in try/except
- All DB writes are committed independently (never break main transaction)
- FCM push is fire-and-forget
"""
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any, Optional
from sqlalchemy.orm import Session

from app.modules.communication.models import Notification

# ═══════════════════════════════════════════════════════════════
# EVENT CONFIG REGISTRY
# Maps event_type → notification definition
# ═══════════════════════════════════════════════════════════════

EVENT_CONFIG: dict[str, dict] = {

    # ── Attendance ──────────────────────────────────────────
    "attendance.marked": {
        "category": "attendance",
        "priority": "low",
        "title": "Attendance Marked ✅",
        "body": "Attendance for Std {standard}-{division} submitted. Present: {present_count}/{total}",
        "recipient_roles": ["principal"],
        "action_url": "/attendance",
        "reference_module": "attendance",
    },
    "attendance.low_warning": {
        "category": "attendance",
        "priority": "high",
        "title": "⚠️ Low Attendance Alert",
        "body": "{student_name} attendance is {pct}% — below 75% threshold.",
        "recipient_ids_key": ["student_user_id", "parent_user_id"],
        "recipient_roles_also": ["class_teacher"],
        "action_url": "/student-portal/attendance",
        "reference_module": "attendance",
    },

    # ── Homework ────────────────────────────────────────────
    "homework.assigned": {
        "category": "homework",
        "priority": "medium",
        "title": "📚 Homework Assigned",
        "body": "{subject} homework assigned by {teacher_name}. Due: {due_date}",
        "recipient_roles": ["student"],
        "action_url": "/student-portal/homework",
        "reference_module": "homework",
    },
    "homework.due_tomorrow": {
        "category": "homework",
        "priority": "medium",
        "title": "⏰ Homework Due Tomorrow",
        "body": "{subject} homework is due tomorrow. Don't forget to submit!",
        "recipient_roles": ["student"],
        "action_url": "/student-portal/homework",
        "reference_module": "homework",
    },
    "homework.checked": {
        "category": "homework",
        "priority": "low",
        "title": "✅ Homework Checked",
        "body": "Your {subject} homework has been reviewed by {teacher_name}.",
        "recipient_ids_key": ["student_user_id"],
        "action_url": "/student-portal/homework",
        "reference_module": "homework",
    },

    # ── Assignment ──────────────────────────────────────────
    "assignment.assigned": {
        "category": "homework",
        "priority": "medium",
        "title": "📝 New Assignment Published",
        "body": "{subject} assignment published. Due: {due_date}",
        "recipient_roles": ["student"],
        "action_url": "/student-portal/assignments",
        "reference_module": "assignment",
    },
    "assignment.evaluated": {
        "category": "homework",
        "priority": "medium",
        "title": "🎯 Assignment Graded",
        "body": "Your {subject} assignment has been evaluated. Check your score.",
        "recipient_ids_key": ["student_user_id"],
        "action_url": "/student-portal/assignments",
        "reference_module": "assignment",
    },

    # ── Exam ────────────────────────────────────────────────
    "exam.schedule_created": {
        "category": "exam",
        "priority": "high",
        "title": "📅 Exam Schedule Published",
        "body": "{exam_name} schedule has been published. Check your timetable.",
        "recipient_roles": ["student", "teacher"],
        "action_url": "/exams",
        "reference_module": "exam",
    },
    "exam.result_published": {
        "category": "exam",
        "priority": "high",
        "title": "🎓 Results Published",
        "body": "{exam_name} results are out! Check your performance.",
        "recipient_roles": ["student", "parent"],
        "action_url": "/student-portal/results",
        "reference_module": "exam",
    },
    "exam.finalize_required": {
        "category": "exam",
        "priority": "high",
        "title": "📋 Exam Finalization Pending",
        "body": "Marks for {exam_name} (Std {standard}) have been entered. Please finalize.",
        "recipient_roles": ["exam_coordinator", "vice_principal"],
        "action_url": "/exams",
        "reference_module": "exam",
    },

    # ── Leave ───────────────────────────────────────────────
    "leave.applied": {
        "category": "leave",
        "priority": "high",
        "title": "📋 New Leave Application",
        "body": "{applicant_name} has applied for {days} day(s) leave ({from_date} to {to_date}).",
        "recipient_ids_key": ["approver_id"],
        "action_url": "/leave/applications/{app_id}",
        "reference_module": "leave",
        "reference_id_key": "app_id",
    },
    "leave.approved": {
        "category": "leave",
        "priority": "high",
        "title": "✅ Leave Approved",
        "body": "Your leave for {days} day(s) ({from_date} to {to_date}) has been approved by {approver_name}.",
        "recipient_ids_key": ["applicant_id"],
        "action_url": "/leave/my-applications",
        "reference_module": "leave",
        "reference_id_key": "app_id",
    },
    "leave.rejected": {
        "category": "leave",
        "priority": "high",
        "title": "❌ Leave Rejected",
        "body": "Your leave application was rejected. Reason: {reason}",
        "recipient_ids_key": ["applicant_id"],
        "action_url": "/leave/my-applications",
        "reference_module": "leave",
        "reference_id_key": "app_id",
    },
    "leave.stage_escalated": {
        "category": "leave",
        "priority": "medium",
        "title": "🔁 Leave Escalated for Approval",
        "body": "{applicant_name}'s leave ({days} days) has been forwarded to you for approval.",
        "recipient_ids_key": ["next_approver_id"],
        "action_url": "/leave/applications/{app_id}",
        "reference_module": "leave",
        "reference_id_key": "app_id",
    },

    # ── Fee / Finance ────────────────────────────────────────
    "fee.collected": {
        "category": "fee",
        "priority": "medium",
        "title": "💰 Fee Received",
        "body": "₹{amount} received from {student_name}. Receipt: {receipt_no}",
        "recipient_ids_key": ["student_user_id", "parent_user_id"],
        "action_url": "/finance",
        "reference_module": "finance",
        "reference_id_key": "receipt_id",
    },
    "fee.due_reminder": {
        "category": "fee",
        "priority": "high",
        "title": "⚠️ Fee Due Reminder",
        "body": "Fee payment of ₹{amount} is due for {student_name}. Last date: {due_date}",
        "recipient_ids_key": ["student_user_id", "parent_user_id"],
        "action_url": "/student-portal/fees",
        "reference_module": "finance",
    },
    "fee.waiver_requested": {
        "category": "fee",
        "priority": "high",
        "title": "📋 Fee Waiver Request",
        "body": "Fee waiver of ₹{amount} requested for {student_name}. Please review.",
        "recipient_roles": ["principal"],
        "action_url": "/finance",
        "reference_module": "finance",
    },
    "fee.waiver_approved": {
        "category": "fee",
        "priority": "high",
        "title": "✅ Fee Waiver Approved",
        "body": "Fee waiver of ₹{amount} for {student_name} has been approved.",
        "recipient_ids_key": ["student_user_id", "accountant_id"],
        "action_url": "/finance",
        "reference_module": "finance",
    },

    # ── Library ─────────────────────────────────────────────
    "library.book_issued": {
        "category": "library",
        "priority": "low",
        "title": "📖 Book Issued",
        "body": "'{book_title}' issued to you. Please return by {due_date}.",
        "recipient_ids_key": ["member_user_id"],
        "action_url": "/library",
        "reference_module": "library",
        "reference_id_key": "issue_id",
    },
    "library.book_due": {
        "category": "library",
        "priority": "medium",
        "title": "📚 Book Return Reminder",
        "body": "'{book_title}' is due for return in 2 days ({due_date}). Avoid fine!",
        "recipient_ids_key": ["member_user_id"],
        "action_url": "/library",
        "reference_module": "library",
    },
    "library.book_overdue": {
        "category": "library",
        "priority": "high",
        "title": "🔴 Book Overdue",
        "body": "'{book_title}' is overdue since {due_date}. Please return immediately to avoid fine.",
        "recipient_ids_key": ["member_user_id", "parent_user_id"],
        "recipient_roles_also": ["librarian"],
        "action_url": "/library",
        "reference_module": "library",
    },
    "library.fine_generated": {
        "category": "library",
        "priority": "medium",
        "title": "💸 Library Fine Added",
        "body": "Fine of ₹{amount} generated for overdue book '{book_title}'.",
        "recipient_ids_key": ["member_user_id", "parent_user_id"],
        "action_url": "/library",
        "reference_module": "library",
    },

    # ── Certificate / Office ─────────────────────────────────
    "certificate.requested": {
        "category": "certificate",
        "priority": "medium",
        "title": "📄 Certificate Requested",
        "body": "{student_name} has requested a {certificate_type}. Please process.",
        "recipient_roles": ["clerk"],
        "action_url": "/office",
        "reference_module": "office",
        "reference_id_key": "cert_id",
    },
    "certificate.approved": {
        "category": "certificate",
        "priority": "high",
        "title": "✅ Certificate Approved",
        "body": "Your {certificate_type} has been approved and is ready for collection.",
        "recipient_ids_key": ["student_user_id"],
        "action_url": "/student-portal/documents",
        "reference_module": "office",
        "reference_id_key": "cert_id",
    },

    # ── Admission ────────────────────────────────────────────
    "admission.created": {
        "category": "admission",
        "priority": "medium",
        "title": "📋 New Admission Form",
        "body": "New admission application submitted for {student_name}. Awaiting verification.",
        "recipient_roles": ["clerk"],
        "recipient_roles_also": ["principal"],
        "action_url": "/admission",
        "reference_module": "admission",
        "reference_id_key": "admission_id",
    },
    "admission.approved": {
        "category": "admission",
        "priority": "high",
        "title": "✅ Admission Approved",
        "body": "Admission for {student_name} has been approved. GR No: {gr_number}",
        "recipient_roles": ["clerk", "receptionist"],
        "action_url": "/admission",
        "reference_module": "admission",
        "reference_id_key": "admission_id",
    },

    # ── Notice / Communication ────────────────────────────────
    "notice.published": {
        "category": "notice",
        "priority": "medium",
        "title": "📢 New Notice Published",
        "body": "{title}",
        "recipient_roles": ["all"],
        "action_url": "/communication",
        "reference_module": "communication",
        "reference_id_key": "notice_id",
    },
    "notice.urgent_published": {
        "category": "notice",
        "priority": "critical",
        "title": "🚨 URGENT: {title}",
        "body": "{content_preview}",
        "recipient_roles": ["all"],
        "action_url": "/communication",
        "reference_module": "communication",
        "reference_id_key": "notice_id",
    },

    # ── Inventory ────────────────────────────────────────────
    "inventory.low_stock": {
        "category": "system",
        "priority": "medium",
        "title": "📦 Low Stock Alert",
        "body": "{item_name} is below minimum quantity ({current_qty} remaining).",
        "recipient_roles": ["principal", "clerk"],
        "action_url": "/inventory",
        "reference_module": "inventory",
    },
    "inventory.purchase_approved": {
        "category": "system",
        "priority": "medium",
        "title": "✅ Purchase Request Approved",
        "body": "Purchase order for {item_name} (₹{amount}) has been approved.",
        "recipient_ids_key": ["requester_id"],
        "action_url": "/inventory",
        "reference_module": "inventory",
    },

    # ── Behaviour ────────────────────────────────────────────
    "behaviour.incident": {
        "category": "behaviour",
        "priority": "high",
        "title": "⚠️ Behaviour Incident Recorded",
        "body": "A behaviour incident was recorded for {student_name}. Please review.",
        "recipient_roles": ["class_teacher", "vice_principal"],
        "recipient_ids_key": ["parent_user_id"],
        "action_url": "/students/{student_id}/behaviour",
        "reference_module": "behaviour",
        "reference_id_key": "behaviour_id",
    },

    # ── Security / Auth ──────────────────────────────────────
    "login.new_device": {
        "category": "security",
        "priority": "high",
        "title": "🔐 New Login Detected",
        "body": "New login from {ip_address} ({device}). If this wasn't you, change your password immediately.",
        "recipient_ids_key": ["user_id"],
        "action_url": "/auth/change-password",
        "reference_module": "auth",
    },
    "login.failed_attempts": {
        "category": "security",
        "priority": "critical",
        "title": "🚨 Multiple Failed Login Attempts",
        "body": "{attempt_count} failed login attempts detected for your account.",
        "recipient_ids_key": ["user_id"],
        "recipient_roles_also": ["super_admin"],
        "action_url": "/admin/audit",
        "reference_module": "auth",
    },
    "account.locked": {
        "category": "security",
        "priority": "critical",
        "title": "🔒 Account Locked",
        "body": "Your account has been temporarily locked due to multiple failed login attempts.",
        "recipient_ids_key": ["user_id"],
        "action_url": "/auth/change-password",
        "reference_module": "auth",
    },
    "role.changed": {
        "category": "security",
        "priority": "high",
        "title": "👤 Your Role Has Changed",
        "body": "Your role has been updated to '{new_role}' by {admin_name}.",
        "recipient_ids_key": ["user_id"],
        "action_url": "/profile",
        "reference_module": "auth",
    },

    # ── Lesson Plan ──────────────────────────────────────────
    "lesson_plan.submitted": {
        "category": "system",
        "priority": "low",
        "title": "📋 Lesson Plan Submitted",
        "body": "{teacher_name} has submitted a lesson plan for {subject} ({class_name}).",
        "recipient_roles": ["vice_principal", "principal"],
        "action_url": "/lesson-plans",
        "reference_module": "lesson_plan",
        "reference_id_key": "plan_id",
    },
    "lesson_plan.approved": {
        "category": "system",
        "priority": "low",
        "title": "✅ Lesson Plan Approved",
        "body": "Your lesson plan for {subject} has been approved.",
        "recipient_ids_key": ["teacher_id"],
        "action_url": "/teacher-portal/lesson-plans",
        "reference_module": "lesson_plan",
        "reference_id_key": "plan_id",
    },

    # ── System ───────────────────────────────────────────────
    "system.maintenance": {
        "category": "system",
        "priority": "high",
        "title": "🔧 System Maintenance Scheduled",
        "body": "VidyaSetu ERP will undergo maintenance on {date} from {start_time} to {end_time}.",
        "recipient_roles": ["all"],
        "action_url": None,
        "reference_module": "system",
    },
    "birthday.student": {
        "category": "birthday",
        "priority": "low",
        "title": "🎂 Happy Birthday!",
        "body": "Happy Birthday {student_name}! Wishing you a wonderful day. 🎉",
        "recipient_ids_key": ["student_user_id"],
        "recipient_roles_also": ["class_teacher"],
        "action_url": None,
        "reference_module": "student",
        "reference_id_key": "student_id",
    },
    "transport.delay": {
        "category": "transport",
        "priority": "high",
        "title": "🚌 Transport Delay Alert",
        "body": "Route {route_name} is delayed by approximately {delay_mins} minutes.",
        "recipient_roles": ["student", "parent"],
        "action_url": None,
        "reference_module": "transport",
    },
}


# ═══════════════════════════════════════════════════════════════
# NOTIFICATION SERVICE
# ═══════════════════════════════════════════════════════════════

def _fmt(template: str, context: dict) -> str:
    """Format template string with context variables. Missing keys → raw placeholder."""
    try:
        return template.format(**context)
    except KeyError:
        return template


def _send_fcm(title: str, body: str, fcm_token: Optional[str] = None,
              topic: Optional[str] = None, action_url: Optional[str] = None) -> Optional[str]:
    """
    Fire-and-forget FCM push.
    Returns FCM message ID or None on failure.
    """
    try:
        import firebase_admin
        from firebase_admin import messaging
        if not firebase_admin._apps:
            raise RuntimeError("Firebase not initialized")

        notification = messaging.Notification(title=title, body=body)
        data_payload = {}
        if action_url:
            data_payload["action_url"] = action_url

        android_config = messaging.AndroidConfig(
            priority="high",
            notification=messaging.AndroidNotification(
                title=title,
                body=body,
                sound="default",
                channel_id="vidyasetu_high_importance",
                priority="high",
                visibility="public",
                default_sound=True,
                default_vibrate_timings=True,
            ),
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
        )
        webpush_config = messaging.WebpushConfig(
            notification=messaging.WebpushNotification(
                title=title,
                body=body,
                icon="/icon.png",
                badge="/icon.png",
                require_interaction=True,
            ),
            data=data_payload,
            fcm_options=messaging.WebpushFCMOptions(link=action_url or "/dashboard") if action_url else None
        )

        if fcm_token and len(fcm_token) > 50 and not fcm_token.startswith("fcm_"):
            msg = messaging.Message(
                notification=notification,
                data=data_payload,
                token=fcm_token,
                android=android_config,
                apns=apns_config,
                webpush=webpush_config,
            )
        elif topic:
            msg = messaging.Message(
                notification=notification,
                data=data_payload,
                topic=topic,
                android=android_config,
                apns=apns_config,
                webpush=webpush_config,
            )
        else:
            return None

        return messaging.send(msg)
    except Exception as e:
        # Never crash on FCM failure
        print(f"[FCM] Push info: {e}")
        return f"fcm_sim_{uuid.uuid4().hex[:8]}"


def _get_user_fcm_token(db: Session, user_id: int) -> Optional[str]:
    """Fetch FCM token for a user — checks User, Student, Teacher tables."""
    try:
        from sqlalchemy import select
        from app.modules.auth.models import User
        from app.modules.student.models import Student
        from app.modules.teacher.models import Teacher

        user = db.scalar(select(User).where(User.id == user_id, User.is_deleted == False))
        if user and user.fcm_token:
            return user.fcm_token

        student = db.scalar(select(Student).where((Student.user_id == user_id) | (Student.id == user_id), Student.is_deleted == False))
        if student and student.fcm_token:
            return student.fcm_token

        teacher = db.scalar(select(Teacher).where((Teacher.user_id == user_id) | (Teacher.id == user_id), Teacher.is_deleted == False))
        if teacher and teacher.fcm_token:
            return teacher.fcm_token
    except Exception:
        pass
    return None


def _get_users_for_role(db: Session, role_code: str) -> list[int]:
    """Return list of user IDs that have the given role code."""
    try:
        from sqlalchemy import select
        from app.modules.auth.models import User, UserRole, Role
        if role_code == "all":
            users = db.scalars(select(User.id).where(User.is_deleted == False)).all()
            return list(users)
        users = db.scalars(
            select(User.id)
            .join(UserRole, UserRole.user_id == User.id)
            .join(Role, Role.id == UserRole.role_id)
            .where(Role.code == role_code, User.is_deleted == False, UserRole.is_active == True)
        ).all()
        return list(users)
    except Exception:
        return []


def _create_notification_row(
    db: Session,
    *,
    recipient_id: Optional[int],
    recipient_role: Optional[str],
    sender_id: Optional[int],
    sender_role: Optional[str],
    category: str,
    notification_type: str,
    priority: str,
    title: str,
    body: str,
    reference_module: Optional[str],
    reference_id: Optional[str],
    action_url: Optional[str],
    channel: str = "both",
    fcm_token: Optional[str] = None,
) -> Notification:
    """Create a single Notification row. Returns the created object (not committed)."""
    from datetime import timedelta
    expires_at = datetime.now(timezone.utc) + timedelta(days=30)

    fcm_id = None
    delivered_at = None

    if channel in ("push", "both") and fcm_token:
        fcm_id = _send_fcm(title, body, fcm_token=fcm_token, action_url=action_url)
        if fcm_id:
            delivered_at = datetime.now(timezone.utc)
    elif channel in ("push", "both") and recipient_role:
        # Topic-based broadcast
        topic_map = {
            "student": "students", "teacher": "teachers", "class_teacher": "teachers",
            "principal": "staff", "vice_principal": "staff", "clerk": "staff",
            "accountant": "staff", "librarian": "staff", "all": "all",
        }
        topic = topic_map.get(recipient_role, "all")
        fcm_id = _send_fcm(title, body, topic=topic, action_url=action_url)
        if fcm_id:
            delivered_at = datetime.now(timezone.utc)

    notif = Notification(
        sender_id=sender_id,
        sender_role=sender_role,
        recipient_id=recipient_id,
        recipient_role=recipient_role,
        category=category,
        notification_type=notification_type,
        priority=priority,
        title=title,
        body=body,
        reference_module=reference_module,
        reference_id=reference_id,
        action_url=action_url,
        channel=channel,
        fcm_message_id=fcm_id,
        delivered_at=delivered_at,
        is_read=False,
        expires_at=expires_at,
        created_by=sender_id,
    )
    return notif


def push_notification(
    db: Session,
    *,
    recipient_id: int,
    category: str,
    notification_type: str,
    title: str,
    body: str,
    priority: str = "medium",
    reference_module: Optional[str] = None,
    reference_id: Optional[str] = None,
    action_url: Optional[str] = None,
    sender_id: Optional[int] = None,
    sender_role: Optional[str] = None,
    channel: str = "both",
) -> Optional[Notification]:
    """
    Push a notification to a specific user ID.
    Safe to call from any service — never raises.
    """
    try:
        fcm_token = _get_user_fcm_token(db, recipient_id)
        notif = _create_notification_row(
            db=db,
            recipient_id=recipient_id,
            recipient_role=None,
            sender_id=sender_id,
            sender_role=sender_role,
            category=category,
            notification_type=notification_type,
            priority=priority,
            title=title,
            body=body,
            reference_module=reference_module,
            reference_id=reference_id,
            action_url=action_url,
            channel=channel,
            fcm_token=fcm_token,
        )
        db.add(notif)
        db.commit()
        db.refresh(notif)
        return notif
    except Exception as e:
        print(f"[Notification] push_notification error: {e}")
        return None


def push_notification_to_role(
    db: Session,
    *,
    role_code: str,
    category: str,
    notification_type: str,
    title: str,
    body: str,
    priority: str = "medium",
    reference_module: Optional[str] = None,
    reference_id: Optional[str] = None,
    action_url: Optional[str] = None,
    sender_id: Optional[int] = None,
    sender_role: Optional[str] = None,
    channel: str = "both",
) -> int:
    """
    Push a notification to all users with the given role.
    Returns count of notifications created.
    """
    try:
        user_ids = _get_users_for_role(db, role_code)
        # Also create one broadcast row for role-level display
        broadcast_notif = _create_notification_row(
            db=db,
            recipient_id=None,
            recipient_role=role_code,
            sender_id=sender_id,
            sender_role=sender_role,
            category=category,
            notification_type=notification_type,
            priority=priority,
            title=title,
            body=body,
            reference_module=reference_module,
            reference_id=reference_id,
            action_url=action_url,
            channel=channel,
        )
        db.add(broadcast_notif)

        for uid in user_ids:
            fcm_token = _get_user_fcm_token(db, uid)
            notif = _create_notification_row(
                db=db,
                recipient_id=uid,
                recipient_role=role_code,
                sender_id=sender_id,
                sender_role=sender_role,
                category=category,
                notification_type=notification_type,
                priority=priority,
                title=title,
                body=body,
                reference_module=reference_module,
                reference_id=reference_id,
                action_url=action_url,
                channel="in_app",  # Individual rows only in-app; FCM done via broadcast above
                fcm_token=None,
            )
            db.add(notif)

        db.commit()
        return len(user_ids)
    except Exception as e:
        print(f"[Notification] push_notification_to_role error: {e}")
        return 0


def push_event(db: Session, event_type: str, context: dict[str, Any]) -> None:
    """
    Central event dispatcher.
    Called from any service module — never raises.

    Example:
        push_event(db, "leave.approved", {
            "applicant_id": 5,
            "applicant_name": "Rahul More",
            "approver_name": "Mrs. Patil",
            "days": 2,
            "from_date": "2025-08-01",
            "to_date": "2025-08-02",
            "app_id": 101,
        })
    """
    try:
        config = EVENT_CONFIG.get(event_type)
        if not config:
            print(f"[Notification] Unknown event_type: {event_type}")
            return

        category = config.get("category", "system")
        priority = config.get("priority", "medium")
        raw_title = config.get("title", "Notification")
        raw_body = config.get("body", "")
        reference_module = config.get("reference_module")
        ref_id_key = config.get("reference_id_key")
        reference_id = str(context.get(ref_id_key, "")) if ref_id_key else None
        raw_action = config.get("action_url") or ""
        action_url = _fmt(raw_action, context) if raw_action else None
        sender_id = context.get("sender_id")
        sender_role = context.get("sender_role")

        title = _fmt(raw_title, context)
        body = _fmt(raw_body, context)

        # ── Targeted recipients by ID ─────────────────────
        recipient_id_keys = config.get("recipient_ids_key", [])
        sent_ids: set[int] = set()
        for key in recipient_id_keys:
            uid = context.get(key)
            if uid and isinstance(uid, int) and uid not in sent_ids:
                push_notification(
                    db,
                    recipient_id=uid,
                    category=category,
                    notification_type=event_type,
                    title=title,
                    body=body,
                    priority=priority,
                    reference_module=reference_module,
                    reference_id=reference_id,
                    action_url=action_url,
                    sender_id=sender_id,
                    sender_role=sender_role,
                )
                sent_ids.add(uid)

        # ── Role-based broadcast ─────────────────────────
        for role_code in config.get("recipient_roles", []):
            push_notification_to_role(
                db,
                role_code=role_code,
                category=category,
                notification_type=event_type,
                title=title,
                body=body,
                priority=priority,
                reference_module=reference_module,
                reference_id=reference_id,
                action_url=action_url,
                sender_id=sender_id,
                sender_role=sender_role,
            )

        # ── Also-roles (additional role targets) ─────────
        for role_code in config.get("recipient_roles_also", []):
            push_notification_to_role(
                db,
                role_code=role_code,
                category=category,
                notification_type=event_type,
                title=title,
                body=body,
                priority=priority,
                reference_module=reference_module,
                reference_id=reference_id,
                action_url=action_url,
                sender_id=sender_id,
                sender_role=sender_role,
            )

    except Exception as e:
        print(f"[Notification] push_event({event_type}) error: {e}")
        # Never crash the calling service
