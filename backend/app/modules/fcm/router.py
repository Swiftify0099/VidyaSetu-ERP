"""
VidyaSetu ERP — FCM API Router
==================================
REST endpoints for FCM token management and push notification delivery.

Routes:
  POST   /api/v1/fcm/register          — Register or update FCM token (JWT required)
  DELETE /api/v1/fcm/unregister        — Remove token on logout (JWT required)
  GET    /api/v1/fcm/tokens            — List current user's registered devices (JWT required)
  POST   /api/v1/fcm/send/user/{id}   — Admin: send to one user
  POST   /api/v1/fcm/send/users       — Admin: send to multiple users
  POST   /api/v1/fcm/send/broadcast   — Admin: send to everyone
  POST   /api/v1/fcm/send/role/{code} — Admin: send by role
  POST   /api/v1/fcm/send/topic/{t}   — Admin: send to FCM topic
  GET    /api/v1/fcm/logs             — Admin: notification history
"""
from typing import List, Optional
from fastapi import APIRouter, Query, status, HTTPException
from sqlalchemy import select

from app.core.dependencies import AuthUser, DBSession, require_permission
from app.modules.fcm.models import FCMToken, NotificationLog
from app.modules.fcm.schemas import (
    RegisterTokenRequest,
    UnregisterTokenRequest,
    SendNotificationRequest,
    SendToUsersRequest,
    FCMTokenRecord,
    NotificationLogRecord,
    SendNotificationResponse,
)
from app.modules.fcm.service import FCMTokenService, FCMPushService
from app.shared.responses import APIResponse

router = APIRouter(prefix="/fcm", tags=["FCM Push Notifications"])


# ═══════════════════════════════════════════════════════════════
# TOKEN MANAGEMENT — user endpoints
# ═══════════════════════════════════════════════════════════════

@router.post(
    "/register",
    response_model=APIResponse,
    status_code=status.HTTP_200_OK,
    summary="Register or update FCM device token",
)
@router.post("/register/", response_model=APIResponse, include_in_schema=False)
@router.put("/register", response_model=APIResponse, include_in_schema=False)
@router.put("/register/", response_model=APIResponse, include_in_schema=False)
async def register_fcm_token(
    body: RegisterTokenRequest,
    current_user: AuthUser,
    db: DBSession,
):
    """
    Register (or update) an FCM token for the authenticated user's device.

    - If the token already exists, its metadata and last_used_at are refreshed.
    - Duplicate tokens are never inserted — upsert logic handles it gracefully.
    - Call this immediately after login and whenever the token refreshes.
    """
    token_obj = FCMTokenService.register(db, current_user.user_id, body)
    record = FCMTokenRecord.from_model(token_obj)
    return APIResponse.ok(
        data=record.model_dump(),
        message="FCM token registered successfully.",
    )


@router.delete(
    "/unregister",
    response_model=APIResponse,
    summary="Remove FCM token on logout",
)
@router.post("/unregister", response_model=APIResponse, include_in_schema=False)
@router.delete("/unregister/", response_model=APIResponse, include_in_schema=False)
@router.post("/unregister/", response_model=APIResponse, include_in_schema=False)
async def unregister_fcm_token(
    body: UnregisterTokenRequest,
    current_user: AuthUser,
    db: DBSession,
):
    """
    Soft-delete the FCM token for the current user's device.
    Call this on user logout so the device no longer receives push notifications.
    """
    removed = FCMTokenService.unregister(db, current_user.user_id, body.fcm_token)
    msg = "FCM token removed." if removed else "Token not found (may already be removed)."
    return APIResponse.ok(data={"removed": removed}, message=msg)


@router.delete(
    "/unregister-all",
    response_model=APIResponse,
    summary="Remove ALL FCM tokens for this user (logout-all)",
)
@router.post("/unregister-all", response_model=APIResponse, include_in_schema=False)
@router.delete("/unregister-all/", response_model=APIResponse, include_in_schema=False)
@router.post("/unregister-all/", response_model=APIResponse, include_in_schema=False)
async def unregister_all_fcm_tokens(
    current_user: AuthUser,
    db: DBSession,
):
    """
    Remove all registered devices for the current user.
    Use this for 'Logout from all devices'.
    """
    count = FCMTokenService.unregister_all(db, current_user.user_id)
    return APIResponse.ok(
        data={"removed_count": count},
        message=f"Removed {count} FCM token(s).",
    )


@router.get(
    "/tokens",
    response_model=APIResponse,
    summary="List registered devices for current user",
)
@router.get("/tokens/", response_model=APIResponse, include_in_schema=False)
async def get_my_tokens(
    current_user: AuthUser,
    db: DBSession,
):
    """Return all active FCM tokens (registered devices) for the authenticated user."""
    tokens = FCMTokenService.get_user_tokens(db, current_user.user_id)
    records = [FCMTokenRecord.from_model(t).model_dump() for t in tokens]
    return APIResponse.ok(data=records, message=f"Found {len(records)} device(s).")


# ═══════════════════════════════════════════════════════════════
# ADMIN — SEND NOTIFICATIONS
# ═══════════════════════════════════════════════════════════════

@router.post(
    "/send/user/{user_id}",
    response_model=APIResponse,
    summary="Send notification to a single user (Admin)",
)
async def send_to_user(
    user_id: int,
    body: SendNotificationRequest,
    current_user: AuthUser,
    db: DBSession,
):
    """
    Admin: Send a push notification to all registered devices of a specific user.
    Requires 'communication.send' or admin role.
    """
    if not current_user.is_super_admin() and not current_user.has_permission("communication.send"):
        raise HTTPException(status_code=403, detail="Insufficient permissions.")
    result = FCMPushService.send_to_user(
        db, user_id=user_id, title=body.title, body=body.body,
        data=body.data, image_url=body.image_url, sent_by=current_user.user_id,
    )
    return APIResponse.ok(data=result.model_dump(), message="Notification sent.")


@router.post(
    "/send/users",
    response_model=APIResponse,
    summary="Send notification to multiple users (Admin)",
)
async def send_to_users(
    body: SendToUsersRequest,
    current_user: AuthUser,
    db: DBSession,
):
    """
    Admin: Send a push notification to a specific list of users.
    Maximum 500 users per call for performance.
    """
    if not current_user.is_super_admin() and not current_user.has_permission("communication.send"):
        raise HTTPException(status_code=403, detail="Insufficient permissions.")
    if len(body.user_ids) > 500:
        raise HTTPException(status_code=400, detail="Maximum 500 users per request.")
    result = FCMPushService.send_to_users(
        db, user_ids=body.user_ids, title=body.title, body=body.body,
        data=body.data, image_url=body.image_url, sent_by=current_user.user_id,
    )
    return APIResponse.ok(data=result.model_dump(), message="Notification sent.")


@router.post(
    "/send/broadcast",
    response_model=APIResponse,
    summary="Broadcast notification to ALL users (Admin)",
)
async def broadcast_notification(
    body: SendNotificationRequest,
    current_user: AuthUser,
    db: DBSession,
):
    """
    Admin: Send a push notification to every active FCM token in the system.
    Only super_admin or users with 'communication.broadcast' permission can do this.
    """
    if not current_user.is_super_admin() and not current_user.has_permission("communication.broadcast"):
        raise HTTPException(status_code=403, detail="Insufficient permissions.")
    result = FCMPushService.broadcast(
        db, title=body.title, body=body.body,
        data=body.data, image_url=body.image_url, sent_by=current_user.user_id,
    )
    return APIResponse.ok(data=result.model_dump(), message="Broadcast sent.")


@router.post(
    "/send/role/{role_code}",
    response_model=APIResponse,
    summary="Send notification to all users with a specific role (Admin)",
)
async def send_to_role(
    role_code: str,
    body: SendNotificationRequest,
    current_user: AuthUser,
    db: DBSession,
):
    """
    Admin: Send a push notification to all users who have the specified role.
    Role codes: student, teacher, parent, staff, admin, super_admin
    """
    if not current_user.is_super_admin() and not current_user.has_permission("communication.send"):
        raise HTTPException(status_code=403, detail="Insufficient permissions.")
    result = FCMPushService.send_by_role(
        db, role_code=role_code, title=body.title, body=body.body,
        data=body.data, image_url=body.image_url, sent_by=current_user.user_id,
    )
    return APIResponse.ok(
        data=result.model_dump(),
        message=f"Notification sent to role '{role_code}'.",
    )


@router.post(
    "/send/topic/{topic}",
    response_model=APIResponse,
    summary="Send notification to an FCM topic (Admin)",
)
async def send_to_topic(
    topic: str,
    body: SendNotificationRequest,
    current_user: AuthUser,
    db: DBSession,
):
    """
    Admin: Send to an FCM topic. Devices subscribe to topics via the Firebase SDK.
    Topic names: 'student', 'teacher', 'parent', 'all', etc.
    """
    if not current_user.is_super_admin() and not current_user.has_permission("communication.send"):
        raise HTTPException(status_code=403, detail="Insufficient permissions.")
    result = FCMPushService.send_to_topic(
        db, topic=topic, title=body.title, body=body.body,
        data=body.data, image_url=body.image_url, sent_by=current_user.user_id,
    )
    return APIResponse.ok(data=result.model_dump(), message=f"Sent to topic '{topic}'.")


@router.post(
    "/send/class/{class_id}",
    response_model=APIResponse,
    summary="Send notification to all students in a class (Admin)",
)
async def send_to_class(
    class_id: int,
    body: SendNotificationRequest,
    current_user: AuthUser,
    db: DBSession,
):
    """Admin: Send notification to all students (and their devices) in a class."""
    if not current_user.is_super_admin() and not current_user.has_permission("communication.send"):
        raise HTTPException(status_code=403, detail="Insufficient permissions.")
    result = FCMPushService.send_by_class(
        db, class_id=class_id, title=body.title, body=body.body,
        data=body.data, image_url=body.image_url, sent_by=current_user.user_id,
    )
    return APIResponse.ok(
        data=result.model_dump(),
        message=f"Notification sent to class {class_id}.",
    )


# ═══════════════════════════════════════════════════════════════
# ADMIN — NOTIFICATION HISTORY
# ═══════════════════════════════════════════════════════════════

@router.get(
    "/logs",
    response_model=APIResponse,
    summary="Get notification delivery history (Admin)",
)
async def get_notification_logs(
    current_user: AuthUser,
    db: DBSession,
    limit: int = Query(default=50, le=200),
    offset: int = Query(default=0),
    user_id: Optional[int] = Query(default=None),
    delivery_status: Optional[str] = Query(default=None),
):
    """
    Admin: Retrieve notification delivery history with optional filters.
    """
    if not current_user.is_super_admin() and not current_user.has_permission("communication.send"):
        raise HTTPException(status_code=403, detail="Insufficient permissions.")

    stmt = select(NotificationLog).where(
        NotificationLog.is_deleted == False  # noqa: E712
    )
    if user_id:
        stmt = stmt.where(NotificationLog.user_id == user_id)
    if delivery_status:
        stmt = stmt.where(NotificationLog.delivery_status == delivery_status)
    stmt = stmt.order_by(NotificationLog.sent_at.desc()).offset(offset).limit(limit)

    logs = db.scalars(stmt).all()
    records = [NotificationLogRecord.model_validate(log).model_dump() for log in logs]
    return APIResponse.ok(data=records, message=f"Found {len(records)} log(s).")


@router.get(
    "/admin/devices",
    response_model=APIResponse,
    summary="List all registered devices (Admin)",
)
async def list_all_devices(
    current_user: AuthUser,
    db: DBSession,
    limit: int = Query(default=100, le=500),
    offset: int = Query(default=0),
    user_id: Optional[int] = Query(default=None),
    device_type: Optional[str] = Query(default=None),
):
    """Admin: List all registered FCM tokens / devices."""
    if not current_user.is_super_admin() and not current_user.has_permission("communication.send"):
        raise HTTPException(status_code=403, detail="Insufficient permissions.")

    stmt = select(FCMToken).where(FCMToken.is_deleted == False)  # noqa: E712
    if user_id:
        stmt = stmt.where(FCMToken.user_id == user_id)
    if device_type:
        stmt = stmt.where(FCMToken.device_type == device_type)
    stmt = stmt.order_by(FCMToken.last_used_at.desc().nullslast()).offset(offset).limit(limit)

    tokens = db.scalars(stmt).all()
    records = [FCMTokenRecord.from_model(t).model_dump() for t in tokens]
    return APIResponse.ok(data=records, message=f"Found {len(records)} device(s).")
