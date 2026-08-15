"""
VidyaSetu ERP — Device Security API Routes
============================================
All device security endpoints. Uses /auth/ prefix to match
the existing API convention.

Endpoints:
  POST  /auth/login/verify          — Verify new device ('Yes, This Is Me')
  POST  /auth/login/reject          — Reject login attempt ('No, This Wasn't Me')
  GET   /auth/login-attempt/:id     — Poll verification status (frontend)
  GET   /auth/devices               — List current user's trusted devices
  POST  /auth/devices/:id/revoke    — Revoke a device
  POST  /auth/devices/:id/make-primary — Change primary device
  GET   /auth/security-events       — User's own login history
  GET   /auth/security-events/admin — Admin security dashboard (RBAC)
"""
import logging
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from slowapi import Limiter
from slowapi.util import get_remote_address
from sqlalchemy import func, select, update as sa_update
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.dependencies import AuthUser, DBSession, get_current_user
from app.core.security import create_access_token, create_refresh_token
from app.modules.auth.models import User, UserSession
from app.modules.auth.schemas import TokenResponse, UserMeResponse
from app.modules.auth.service import AuthService
from app.modules.device_security.email_templates import (
    build_device_verification_email,
    build_suspicious_login_email,
    build_verification_success_email,
)
from app.modules.device_security.models import (
    DeviceStatus,
    LoginEvent,
    LoginEventType,
    LoginVerificationRequest,
    UserDevice,
    VerificationStatus,
)
from app.modules.device_security.schemas import (
    AdminLoginEventResponse,
    AdminSecurityStats,
    DeviceListResponse,
    DeviceResponse,
    LoginEventResponse,
    RejectLoginRequest,
    SecurityEventListResponse,
    VerificationRequiredResponse,
    VerificationSuccessResponse,
    VerifyLoginRequest,
)
from app.modules.device_security.service import (
    DeviceSecurityOrchestrator,
    DeviceService,
    LoginEventService,
    VerificationService,
    get_client_ip,
)
from app.modules.fcm.service import FCMPushService
from app.shared.email import send_email_async
from app.shared.responses import APIResponse
from app.shared.socket_manager import (
    emit_device_revoked,
    emit_login_approved,
    emit_login_rejected,
)

logger = logging.getLogger(__name__)

limiter = Limiter(key_func=get_remote_address)

router = APIRouter(prefix="/auth", tags=["Device Security"])


# ═══════════════════════════════════════════════════════════════
# INTERNAL HELPERS
# ═══════════════════════════════════════════════════════════════

def _build_approve_url(token: str) -> str:
    """Build the approve link embedded in the verification email."""
    return f"{settings.FRONTEND_URL}/auth/verify-device?token={token}"


def _build_reject_url(token: str) -> str:
    """Build the reject link embedded in the verification email."""
    return f"{settings.FRONTEND_URL}/auth/reject-device?token={token}"


def _send_verification_email_async(
    user: User,
    token: str,
    device_type: Optional[str],
    browser_or_app: Optional[str],
    ip_address: Optional[str],
    approximate_location: Optional[str],
    login_time: datetime,
) -> None:
    """Fire-and-forget email send. Does not block the API response."""
    if not user.email:
        logger.warning(f"[DeviceSecurity] User {user.id} has no email — cannot send verification.")
        return

    approve_url = _build_approve_url(token)
    reject_url = _build_reject_url(token)

    html, plain = build_device_verification_email(
        user_name=user.full_name,
        device_type=device_type,
        browser_or_app=browser_or_app,
        ip_address=ip_address,
        approximate_location=approximate_location,
        login_time=login_time,
        approve_url=approve_url,
        reject_url=reject_url,
    )

    send_email_async(
        to_email=user.email,
        subject="VidyaSetu ERP — New Login Verification Required",
        html_content=html,
        text_content=plain,
    )


def _send_verification_push(db: Session, user_id: int, device_type: Optional[str]) -> None:
    """Send FCM push notification as additional channel. Never raises."""
    try:
        FCMPushService.send_to_user(
            db=db,
            user_id=user_id,
            title="New Device Login Detected 🔐",
            body=f"A login from a new {(device_type or 'device').title()} requires your approval. Check your email.",
            data={"type": "device_verification", "action": "check_email"},
        )
    except Exception as e:
        logger.warning(f"[DeviceSecurity] FCM push failed (non-critical): {e}")


def _build_device_response(device: UserDevice) -> DeviceResponse:
    return DeviceResponse(
        id=device.id,
        uuid=device.uuid,
        device_type=device.device_type,
        platform=device.platform,
        manufacturer=device.manufacturer,
        model=device.model,
        os_version=device.os_version,
        browser_name=device.browser_name,
        user_agent=device.user_agent[:100] if device.user_agent else None,
        is_primary=device.is_primary,
        is_trusted=device.is_trusted,
        is_temporary=getattr(device, 'is_temporary', False) or False,
        status=device.status,
        first_seen_at=device.first_seen_at,
        last_seen_at=device.last_seen_at,
        trusted_at=device.trusted_at,
        temporary_expires_at=getattr(device, 'temporary_expires_at', None),
        display_name=device.display_name,
    )


# ═══════════════════════════════════════════════════════════════
# DEVICE VERIFICATION — Approve ('Yes, This Is Me')
# ═══════════════════════════════════════════════════════════════

@router.post(
    "/login/verify",
    summary="Verify new device login ('Yes, This Is Me')",
    status_code=status.HTTP_200_OK,
)
async def verify_device_login(
    body: VerifyLoginRequest,
    request: Request,
    db: DBSession,
):
    """
    Process 'I'M IN — I WANT TO LOGIN' / 'Yes, This Is Me' approval.

    Flow:
    1. Validate approval token (hash, expiry, single-use).
    2. Mark device as TEMPORARY with configured expiry (or PRIMARY if first).
    3. Enforce max-2 temporary devices (evict oldest if needed).
    4. Create a JWT session linked to the device.
    5. Emit LOGIN_APPROVED via Socket.IO with full auth payload to the waiting device.
    6. Return tokens to the approving client (email callback page).
    """
    success, error_reason, vr, device = DeviceSecurityOrchestrator.complete_verification(
        db, body.token, request
    )

    if not success:
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=error_reason or "Verification failed.",
        )

    # Load user
    user = AuthService.find_user_by_username(db, _get_username_by_id(db, vr.user_id))
    if not user or not user.is_active:
        db.commit()
        raise HTTPException(status_code=401, detail="Account not found or deactivated.")

    # ── Temporary device lifecycle ─────────────────────────────
    if device and not device.is_primary:
        # Invalidate sessions for any evicted devices
        evicted = DeviceService.enforce_temporary_device_limit(
            db, vr.user_id, device.id
        )
        if evicted:
            LoginEventService.record(
                db,
                event_type=LoginEventType.TEMPORARY_DEVICE_REVOKED,
                user_id=vr.user_id,
                device_id=evicted.id,
                login_attempt_id=vr.login_attempt_id,
                ip_address=get_client_ip(request),
                failure_reason="MAX_TEMPORARY_DEVICE_LIMIT: new temporary device added",
                status="SUCCESS",
            )
            db.execute(
                sa_update(UserSession)
                .where(
                    UserSession.device_id == evicted.id,
                    UserSession.is_active == True,
                    UserSession.is_deleted == False,
                )
                .values(is_active=False)
            )

        LoginEventService.record(
            db,
            event_type=LoginEventType.TEMPORARY_DEVICE_REGISTERED,
            user_id=vr.user_id,
            device_id=device.id,
            login_attempt_id=vr.login_attempt_id,
            ip_address=get_client_ip(request),
            status="SUCCESS",
        )
        LoginEventService.record(
            db,
            event_type=LoginEventType.TEMPORARY_LOGIN_APPROVED,
            user_id=vr.user_id,
            device_id=device.id,
            login_attempt_id=vr.login_attempt_id,
            ip_address=get_client_ip(request),
            status="SUCCESS",
        )

    # ── Build session tokens ───────────────────────────────────
    permissions = AuthService._build_user_permissions(user)
    role_codes = [ur.role.code for ur in user.user_roles if ur.is_active and not ur.is_deleted]

    access_token, access_jti, _ = create_access_token(
        user_id=user.id,
        role_codes=role_codes,
        permissions=permissions,
        full_name=user.full_name,
    )
    refresh_token, refresh_jti, refresh_expires = create_refresh_token(user_id=user.id)

    ip = get_client_ip(request)
    ua = request.headers.get("User-Agent", "")[:255]
    session = UserSession(
        user_id=user.id,
        token_jti=access_jti,
        refresh_token_jti=refresh_jti,
        device_name=device.display_name if device else None,
        device_id=device.id if device else None,
        browser=ua,
        ip_address=ip,
        logged_in_at=datetime.now(timezone.utc),
        last_active_at=datetime.now(timezone.utc),
        expires_at=refresh_expires,
    )
    db.add(session)

    user.last_login = datetime.now(timezone.utc)
    user.last_login_ip = ip
    user.failed_attempts = 0

    db.commit()

    user_response = AuthService._build_user_response(user, permissions)
    temporary_expires_at = None
    if device and getattr(device, 'is_temporary', False) and device.temporary_expires_at:
        temporary_expires_at = device.temporary_expires_at.isoformat()

    auth_payload = {
        "status": "success",
        "requires_verification": False,
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "expires_in": settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        "is_temporary_device": bool(device and getattr(device, 'is_temporary', False)),
        "temporary_expires_at": temporary_expires_at,
        "user": user_response.model_dump(),
    }

    # ── Socket.IO: notify the waiting device ──────────────────
    if vr.login_attempt_id:
        try:
            await emit_login_approved(vr.login_attempt_id, auth_payload)
        except Exception as exc:
            logger.warning("[DeviceSecurity] Socket.IO emit failed (non-critical): %s", exc)

    # ── Confirmation email ─────────────────────────────────────
    if user.email:
        html, plain = build_verification_success_email(
            user_name=user.full_name,
            device_type=device.device_type if device else None,
            ip_address=ip,
            login_time=datetime.now(timezone.utc),
        )
        send_email_async(
            to_email=user.email,
            subject="VidyaSetu ERP – Device Login Approved",
            html_content=html,
            text_content=plain,
        )

    return APIResponse.ok(
        data=auth_payload,
        message="Device verified and login approved.",
    )


# ═══════════════════════════════════════════════════════════════
# DEVICE VERIFICATION — Reject ('No, This Wasn't Me')
# ═══════════════════════════════════════════════════════════════

@router.post(
    "/login/reject",
    summary="Reject login attempt (No, This Wasn't Me)",
    status_code=status.HTTP_200_OK,
)
async def reject_device_login(
    body: RejectLoginRequest,
    request: Request,
    db: DBSession,
):
    """
    Process 'No, This Wasn't Me' rejection.
    
    - Marks verification rejected
    - Revokes pending device record
    - Records SUSPICIOUS_LOGIN event
    - Emits LOGIN_REJECTED via Socket.IO
    - Sends suspicious activity email
    """
    success, error_reason, vr = DeviceSecurityOrchestrator.reject_verification(
        db, body.token, request
    )

    if not success:
        db.commit()
        raise HTTPException(status_code=400, detail=error_reason or "Rejection failed.")

    db.commit()

    # Socket.IO notification to the waiting device
    if vr and vr.login_attempt_id:
        try:
            await emit_login_rejected(vr.login_attempt_id)
        except Exception as exc:
            logger.warning("[DeviceSecurity] Socket.IO emit_login_rejected failed: %s", exc)

    # Notify user (async)
    if vr:
        user = db.get(User, vr.user_id)
        if user and user.email:
            html, plain = build_suspicious_login_email(
                user_name=user.full_name,
                ip_address=vr.ip_address,
                login_time=datetime.now(timezone.utc),
            )
            send_email_async(
                to_email=user.email,
                subject="VidyaSetu ERP — Suspicious Login Blocked ⚠️",
                html_content=html,
                text_content=plain,
            )

    return APIResponse.ok(message="Login attempt has been blocked. Thank you for keeping your account secure.")


# ═══════════════════════════════════════════════════════════════
# POLL VERIFICATION STATUS
# ═══════════════════════════════════════════════════════════════

@router.get(
    "/login-attempt/{login_attempt_id}",
    summary="Poll verification status",
    status_code=status.HTTP_200_OK,
)
async def get_login_attempt_status(
    login_attempt_id: str,
    db: DBSession,
):
    """
    Frontend polls this to check if email verification is complete.
    Returns status: PENDING | VERIFIED | REJECTED | EXPIRED.
    """
    vr = VerificationService.find_by_attempt_id(db, login_attempt_id)

    if vr is None:
        # Check if it was already verified
        verified = db.scalar(
            select(LoginVerificationRequest).where(
                LoginVerificationRequest.login_attempt_id == login_attempt_id,
                LoginVerificationRequest.status == VerificationStatus.VERIFIED,
            )
        )
        if verified:
            return APIResponse.ok(data={"status": "VERIFIED"})
        return APIResponse.ok(data={"status": "EXPIRED"})

    # Check if expired
    if vr.is_expired and vr.status == VerificationStatus.PENDING:
        vr.status = VerificationStatus.EXPIRED
        db.commit()

    return APIResponse.ok(data={"status": vr.status})


# ═══════════════════════════════════════════════════════════════
# MY DEVICES
# ═══════════════════════════════════════════════════════════════

@router.get(
    "/devices",
    summary="List current user's trusted devices",
)
async def list_my_devices(
    current_user: AuthUser,
    db: DBSession,
):
    """Return all registered devices for the authenticated user."""
    devices = DeviceService.get_user_devices(db, current_user.user_id, include_revoked=True)
    device_responses = [_build_device_response(d) for d in devices]
    return APIResponse.ok(data={
        "devices": [d.model_dump() for d in device_responses],
        "total": len(device_responses),
    })


@router.post(
    "/devices/{device_id}/revoke",
    summary="Revoke a trusted device",
)
async def revoke_device(
    device_id: int,
    current_user: AuthUser,
    request: Request,
    db: DBSession,
):
    """
    Revoke one of the user's devices.
    Backend verifies ownership — user cannot revoke another user's device.
    """
    device = db.get(UserDevice, device_id)

    if not device or device.is_deleted:
        raise HTTPException(status_code=404, detail="Device not found.")

    # Ownership check
    if device.user_id != current_user.user_id and not current_user.is_super_admin():
        raise HTTPException(status_code=403, detail="You can only revoke your own devices.")

    if device.status == DeviceStatus.REVOKED:
        raise HTTPException(status_code=400, detail="Device is already revoked.")

    DeviceService.revoke_device(db, device, revoked_by=current_user.user_id)

    # Invalidate all active sessions for this device
    db.execute(
        sa_update(UserSession)
        .where(
            UserSession.device_id == device.id,
            UserSession.is_active == True,
            UserSession.is_deleted == False,
        )
        .values(is_active=False)
    )

    ip = get_client_ip(request)
    LoginEventService.record(
        db,
        event_type=LoginEventType.DEVICE_REVOKED,
        user_id=current_user.user_id,
        device_id=device.id,
        ip_address=ip,
        status="SUCCESS",
    )

    db.commit()

    # Emit Socket.IO notification to the revoked device
    try:
        await emit_device_revoked(device.id)
    except Exception as exc:
        logger.warning("[DeviceSecurity] Socket.IO emit_device_revoked failed: %s", exc)

    return APIResponse.ok(message="Device revoked successfully.")


@router.post(
    "/devices/{device_id}/make-primary",
    summary="Change primary device",
)
async def make_device_primary(
    device_id: int,
    current_user: AuthUser,
    request: Request,
    db: DBSession,
):
    """
    Change which device is the primary device.
    """
    device = db.get(UserDevice, device_id)

    if not device or device.is_deleted:
        raise HTTPException(status_code=404, detail="Device not found.")

    # Ownership check
    if device.user_id != current_user.user_id:
        raise HTTPException(status_code=403, detail="You can only manage your own devices.")

    if device.status == DeviceStatus.REVOKED:
        raise HTTPException(status_code=400, detail="A revoked device cannot be made primary.")

    if device.is_primary:
        raise HTTPException(status_code=400, detail="This device is already primary.")

    old_primary = DeviceService.change_primary_device(db, current_user.user_id, device)

    ip = get_client_ip(request)
    LoginEventService.record(
        db,
        event_type=LoginEventType.PRIMARY_DEVICE_CHANGED,
        user_id=current_user.user_id,
        device_id=device.id,
        ip_address=ip,
        status="SUCCESS",
    )

    db.commit()
    return APIResponse.ok(message="Primary device updated successfully.")


# ═══════════════════════════════════════════════════════════════
# SECURITY EVENTS — User's own log
# ═══════════════════════════════════════════════════════════════

@router.get(
    "/security-events",
    summary="User's own login/security event history",
)
async def my_security_events(
    current_user: AuthUser,
    db: DBSession,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
):
    """Return security events for the current user (their own activity only)."""
    q = (
        select(LoginEvent)
        .where(LoginEvent.user_id == current_user.user_id)
        .order_by(LoginEvent.created_at.desc())
    )
    total = db.scalar(select(func.count()).select_from(q.subquery())) or 0
    events = db.scalars(q.offset((page - 1) * page_size).limit(page_size)).all()

    items = [
        LoginEventResponse(
            id=e.id, uuid=e.uuid, event_type=e.event_type,
            status=e.status, ip_address=e.ip_address,
            device_type=e.device_type, browser=e.browser, os=e.os,
            approximate_location=e.approximate_location,
            risk_score=e.risk_score, failure_reason=e.failure_reason,
            verification_required=e.verification_required,
            login_at=e.login_at, created_at=e.created_at,
        ).model_dump()
        for e in events
    ]

    return APIResponse.ok(data={
        "events": items,
        "total": total,
        "page": page,
        "page_size": page_size,
    })


# ═══════════════════════════════════════════════════════════════
# ADMIN SECURITY DASHBOARD
# ═══════════════════════════════════════════════════════════════

@router.get(
    "/security-events/admin",
    summary="Admin security dashboard — all users",
)
async def admin_security_events(
    current_user: AuthUser,
    db: DBSession,
    page: int = Query(1, ge=1),
    page_size: int = Query(30, ge=1, le=100),
    user_id: Optional[int] = None,
    event_type: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    risk_min: Optional[int] = None,
):
    """
    Admin-only security event dashboard.
    Restricted to super_admin and admin roles via RBAC.
    """
    if not current_user.is_super_admin() and not current_user.has_permission("admin.security"):
        raise HTTPException(status_code=403, detail="Admin access required.")

    q = select(LoginEvent)

    if user_id:
        q = q.where(LoginEvent.user_id == user_id)
    if event_type:
        q = q.where(LoginEvent.event_type == event_type.upper())
    if risk_min is not None:
        q = q.where(LoginEvent.risk_score >= risk_min)
    if date_from:
        try:
            q = q.where(LoginEvent.login_at >= datetime.fromisoformat(date_from))
        except ValueError:
            pass
    if date_to:
        try:
            q = q.where(LoginEvent.login_at <= datetime.fromisoformat(date_to))
        except ValueError:
            pass

    total = db.scalar(select(func.count()).select_from(q.subquery())) or 0
    events = db.scalars(
        q.order_by(LoginEvent.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    ).all()

    from datetime import date
    today = date.today()

    def count_today(event_type_filter=None):
        sq = select(func.count(LoginEvent.id)).where(
            func.date(LoginEvent.created_at) == today
        )
        if event_type_filter:
            sq = sq.where(LoginEvent.event_type == event_type_filter)
        return db.scalar(sq) or 0

    stats = {
        "total_events_today": count_today(),
        "successful_logins_today": count_today(LoginEventType.LOGIN_SUCCESS),
        "failed_logins_today": count_today(LoginEventType.LOGIN_FAILED),
        "new_device_events_today": count_today(LoginEventType.NEW_DEVICE),
        "suspicious_events_today": count_today(LoginEventType.SUSPICIOUS_LOGIN),
        "verification_pending": db.scalar(
            select(func.count(LoginVerificationRequest.id)).where(
                LoginVerificationRequest.status == VerificationStatus.PENDING
            )
        ) or 0,
    }

    items = []
    for e in events:
        user_name = None
        if e.user_id:
            u = db.get(User, e.user_id)
            user_name = u.full_name if u else f"User #{e.user_id}"

        items.append({
            "id": e.id, "uuid": e.uuid, "event_type": e.event_type,
            "status": e.status, "ip_address": e.ip_address,
            "device_type": e.device_type, "browser": e.browser, "os": e.os,
            "approximate_location": e.approximate_location,
            "risk_score": e.risk_score, "failure_reason": e.failure_reason,
            "verification_required": e.verification_required,
            "login_at": e.login_at.isoformat() if e.login_at else None,
            "created_at": e.created_at.isoformat() if e.created_at else None,
            "user_id": e.user_id, "user_name": user_name,
        })

    return APIResponse.ok(data={
        "events": items,
        "total": total,
        "page": page,
        "page_size": page_size,
        "stats": stats,
    })


# ═══════════════════════════════════════════════════════════════
# INTERNAL HELPER
# ═══════════════════════════════════════════════════════════════

def _get_username_by_id(db: Session, user_id: int) -> str:
    """Fetch username for a user ID (used internally after verification)."""
    user = db.get(User, user_id)
    return user.username if user else ""


# ═══════════════════════════════════════════════════════════════
# PUBLIC HELPER — called from auth/service.py after login check
# ═══════════════════════════════════════════════════════════════

def dispatch_verification_email_and_push(
    db: Session,
    user: User,
    token: str,
    device: Optional[UserDevice],
    ip_address: Optional[str],
    login_time: datetime,
) -> None:
    """
    Send verification email + FCM push.
    Called from AuthService.login() when a new device is detected.
    Both calls are async/non-blocking.
    """
    device_type = device.device_type if device else None
    browser_or_app = device.browser_name if device else None

    _send_verification_email_async(
        user=user,
        token=token,
        device_type=device_type,
        browser_or_app=browser_or_app,
        ip_address=ip_address,
        approximate_location=None,
        login_time=login_time,
    )

    _send_verification_push(db, user.id, device_type)
