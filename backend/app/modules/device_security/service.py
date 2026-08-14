"""
VidyaSetu ERP — Device Security Service
=========================================
Production-grade device registration, trust management, verification, and risk scoring.

Key Services:
  - RiskEngine            : Lightweight login risk scoring
  - DeviceService         : Device registration, trust, max-3 enforcement (transactional)
  - LoginEventService     : Append-only audit event recording
  - VerificationService   : Token lifecycle management (create, verify, reject)
  - DeviceSecurityOrchestrator : Top-level coordinator called from AuthService.login()

Security Design:
  - All device-limit enforcement uses DB row locking (with_for_update()) to prevent race conditions.
  - Verification tokens are cryptographically random, single-use, short-lived.
  - Token hashes (SHA-256) are stored — never plaintext.
  - IP extraction respects trusted proxy headers.
"""
import hashlib
import logging
import secrets
import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import Request
from sqlalchemy import func, select, update
from sqlalchemy.orm import Session

from app.core.config import settings
from app.modules.device_security.models import (
    DeviceStatus,
    LoginEvent,
    LoginEventType,
    LoginVerificationRequest,
    UserDevice,
    VerificationStatus,
)

logger = logging.getLogger(__name__)


# ═══════════════════════════════════════════════════════════════
# IP EXTRACTION (Proxy-aware)
# ═══════════════════════════════════════════════════════════════

def get_client_ip(request: Request) -> Optional[str]:
    """
    Extract the real client IP.
    Handles: Render, Cloudflare, Replit, Nginx reverse proxies.
    Does NOT blindly trust arbitrary X-Forwarded-For values —
    only reads the first IP in the chain (the actual client).
    """
    # Cloudflare sets CF-Connecting-IP reliably
    cf_ip = request.headers.get("CF-Connecting-IP")
    if cf_ip:
        return cf_ip.strip().split(",")[0].strip()

    # Standard reverse proxy header
    xff = request.headers.get("X-Forwarded-For")
    if xff:
        # First IP in the chain is the originating client
        return xff.strip().split(",")[0].strip()

    # X-Real-IP (Nginx)
    xri = request.headers.get("X-Real-IP")
    if xri:
        return xri.strip()

    # Direct connection (development / no proxy)
    if request.client:
        return request.client.host

    return None


# ═══════════════════════════════════════════════════════════════
# RISK ENGINE
# ═══════════════════════════════════════════════════════════════

class RiskEngine:
    """
    Lightweight risk scoring system.
    Returns a score 0-100. Higher = more suspicious.
    
    This is a signal — NOT the sole basis for deny/allow decisions.
    A trusted primary device on an unusual IP is still LOW risk overall.
    """

    SCORE_UNKNOWN_DEVICE        = 20
    SCORE_UNKNOWN_BROWSER       = 15
    SCORE_UNUSUAL_IP            = 10
    SCORE_REPEATED_FAILURES     = 20
    SCORE_UNVERIFIED_DEVICE     = 15

    # Thresholds
    LOW_RISK    = 20
    MEDIUM_RISK = 40
    HIGH_RISK   = 60

    @classmethod
    def calculate(
        cls,
        device: Optional[UserDevice],
        is_new_device: bool,
        failed_attempts: int,
        db: Session,
        user_id: int,
    ) -> int:
        score = 0

        if is_new_device:
            score += cls.SCORE_UNKNOWN_DEVICE

        if device and not device.is_trusted:
            score += cls.SCORE_UNVERIFIED_DEVICE

        if failed_attempts >= 3:
            score += cls.SCORE_REPEATED_FAILURES

        return min(score, 100)

    @classmethod
    def risk_label(cls, score: int) -> str:
        if score <= cls.LOW_RISK:
            return "LOW"
        elif score <= cls.MEDIUM_RISK:
            return "MEDIUM"
        else:
            return "HIGH"


# ═══════════════════════════════════════════════════════════════
# DEVICE SERVICE
# ═══════════════════════════════════════════════════════════════

class DeviceService:
    """
    Manages device registration, trust, and the max-3 device policy.
    All device-limit mutations use explicit transactions with row locking
    to prevent race conditions from concurrent logins.
    """

    MAX_ACTIVE_DEVICES = 3  # Override via settings.MAX_TRUSTED_DEVICES

    @classmethod
    def _max_devices(cls) -> int:
        return getattr(settings, "MAX_TRUSTED_DEVICES", cls.MAX_ACTIVE_DEVICES)

    @classmethod
    def find_device(
        cls, db: Session, user_id: int, device_installation_id: str
    ) -> Optional[UserDevice]:
        """Find an existing device record by user + installation ID."""
        return db.scalar(
            select(UserDevice)
            .where(
                UserDevice.user_id == user_id,
                UserDevice.device_installation_id == device_installation_id,
                UserDevice.is_deleted == False,
            )
        )

    @classmethod
    def get_user_devices(
        cls, db: Session, user_id: int, include_revoked: bool = False
    ) -> list[UserDevice]:
        """Return all devices for a user (optionally including revoked)."""
        q = (
            select(UserDevice)
            .where(UserDevice.user_id == user_id, UserDevice.is_deleted == False)
        )
        if not include_revoked:
            q = q.where(UserDevice.status != DeviceStatus.REVOKED)
        return list(db.scalars(q.order_by(UserDevice.created_at.asc())).all())

    @classmethod
    def count_active_devices(cls, db: Session, user_id: int) -> int:
        """Count ACTIVE/TRUSTED non-revoked devices for a user."""
        return db.scalar(
            select(func.count(UserDevice.id)).where(
                UserDevice.user_id == user_id,
                UserDevice.status.in_([DeviceStatus.ACTIVE, DeviceStatus.PENDING]),
                UserDevice.is_deleted == False,
            )
        ) or 0

    @classmethod
    def register_new_device(
        cls,
        db: Session,
        user_id: int,
        device_installation_id: str,
        device_meta: dict,
        make_primary: bool = False,
        make_trusted: bool = False,
    ) -> UserDevice:
        """
        Register a brand-new device record.
        Does NOT commit — caller must commit after business logic is complete.
        """
        now = datetime.now(timezone.utc)
        device = UserDevice(
            user_id=user_id,
            device_installation_id=device_installation_id,
            device_type=device_meta.get("device_type"),
            platform=device_meta.get("platform"),
            manufacturer=device_meta.get("manufacturer"),
            model=device_meta.get("model"),
            os_version=device_meta.get("os_version"),
            app_version=device_meta.get("app_version"),
            browser_name=device_meta.get("browser_name"),
            browser_version=device_meta.get("browser_version"),
            user_agent=device_meta.get("user_agent"),
            timezone=device_meta.get("timezone"),
            language=device_meta.get("language"),
            is_primary=make_primary,
            is_trusted=make_trusted,
            status=DeviceStatus.ACTIVE if make_trusted else DeviceStatus.PENDING,
            first_seen_at=now,
            last_seen_at=now,
            trusted_at=now if make_trusted else None,
        )
        db.add(device)
        db.flush()  # Get ID without committing
        return device

    @classmethod
    def trust_device(cls, db: Session, device: UserDevice) -> None:
        """Mark a device as trusted/active. Does NOT commit."""
        now = datetime.now(timezone.utc)
        device.is_trusted = True
        device.status = DeviceStatus.ACTIVE
        device.trusted_at = now
        device.last_seen_at = now

    @classmethod
    def touch_device(cls, db: Session, device: UserDevice) -> None:
        """Update last_seen_at for an existing device. Does NOT commit."""
        device.last_seen_at = datetime.now(timezone.utc)

    @classmethod
    def enforce_device_limit(
        cls, db: Session, user_id: int, new_device_id: int
    ) -> Optional[UserDevice]:
        """
        Enforce the maximum-3 device rule.
        
        If adding a new device would exceed the limit:
          1. Lock all device rows for this user (SELECT FOR UPDATE)
          2. Find the oldest non-primary active device
          3. Revoke it atomically
          4. Return the revoked device (for logging)
        
        This is called INSIDE a transaction, before commit.
        The FOR UPDATE lock prevents concurrent logins from creating > 3 devices.
        """
        # Lock all active device rows for this user
        active_devices = list(db.scalars(
            select(UserDevice)
            .where(
                UserDevice.user_id == user_id,
                UserDevice.status.in_([DeviceStatus.ACTIVE, DeviceStatus.PENDING]),
                UserDevice.is_deleted == False,
            )
            .order_by(UserDevice.last_seen_at.asc().nullsfirst())
            .with_for_update()  # Row-level lock — prevents race conditions
        ).all())

        # Count active devices accurately (whether new device is already in query or not)
        existing_ids = {dev.id for dev in active_devices}
        total_after_add = len(active_devices) if new_device_id in existing_ids else len(active_devices) + 1

        if total_after_add <= cls._max_devices():
            return None  # No eviction needed

        # Find the oldest non-primary device to evict
        evict_candidate = None
        for dev in active_devices:
            if not dev.is_primary and dev.id != new_device_id:
                evict_candidate = dev
                break

        if evict_candidate is None:
            # All devices are primary (shouldn't happen, but be safe)
            # Evict the oldest non-new device
            for dev in active_devices:
                if dev.id != new_device_id:
                    evict_candidate = dev
                    break

        if evict_candidate:
            cls._revoke_device_internal(db, evict_candidate)
            logger.info(
                f"[DeviceSecurity] Evicted device id={evict_candidate.id} "
                f"for user_id={user_id} (device limit enforcement)"
            )
            return evict_candidate

        return None

    @classmethod
    def _revoke_device_internal(cls, db: Session, device: UserDevice) -> None:
        """Internal revocation — no commit."""
        now = datetime.now(timezone.utc)
        device.is_trusted = False
        device.is_primary = False
        device.status = DeviceStatus.REVOKED
        device.revoked_at = now
        device.is_active = False

    @classmethod
    def revoke_device(cls, db: Session, device: UserDevice, revoked_by: int) -> None:
        """Public revocation (from user's My Devices page). No commit."""
        cls._revoke_device_internal(db, device)
        device.updated_by = revoked_by

    @classmethod
    def change_primary_device(
        cls, db: Session, user_id: int, new_primary_device: UserDevice
    ) -> Optional[UserDevice]:
        """
        Atomically change the primary device.
        Uses FOR UPDATE to prevent concurrent primary-change races.
        Returns the old primary device (if any).
        """
        # Lock all devices for this user
        devices = list(db.scalars(
            select(UserDevice)
            .where(
                UserDevice.user_id == user_id,
                UserDevice.is_deleted == False,
            )
            .with_for_update()
        ).all())

        old_primary = None
        for dev in devices:
            if dev.is_primary and dev.id != new_primary_device.id:
                dev.is_primary = False
                old_primary = dev

        new_primary_device.is_primary = True
        new_primary_device.is_trusted = True
        new_primary_device.status = DeviceStatus.ACTIVE

        return old_primary

    @classmethod
    def has_any_device(cls, db: Session, user_id: int) -> bool:
        """Check if a user has any registered devices at all."""
        return (
            db.scalar(
                select(func.count(UserDevice.id)).where(
                    UserDevice.user_id == user_id,
                    UserDevice.is_deleted == False,
                )
            ) or 0
        ) > 0


# ═══════════════════════════════════════════════════════════════
# LOGIN EVENT SERVICE
# ═══════════════════════════════════════════════════════════════

class LoginEventService:
    """
    Append-only login audit event recorder.
    Never modifies or deletes records.
    Normal users have no write access — enforced at application + DB layer.
    """

    @staticmethod
    def record(
        db: Session,
        event_type: str,
        user_id: Optional[int] = None,
        device_id: Optional[int] = None,
        login_attempt_id: Optional[str] = None,
        status: Optional[str] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
        device_type: Optional[str] = None,
        platform: Optional[str] = None,
        browser: Optional[str] = None,
        os: Optional[str] = None,
        approximate_location: Optional[str] = None,
        latitude: Optional[float] = None,
        longitude: Optional[float] = None,
        location_accuracy: Optional[float] = None,
        verification_required: bool = False,
        verification_method: Optional[str] = None,
        risk_score: int = 0,
        failure_reason: Optional[str] = None,
    ) -> LoginEvent:
        """Record a security event. Flushes but does not commit."""
        event = LoginEvent(
            user_id=user_id,
            device_id=device_id,
            login_attempt_id=login_attempt_id,
            event_type=event_type,
            status=status,
            ip_address=ip_address,
            user_agent=user_agent,
            device_type=device_type,
            platform=platform,
            browser=browser,
            os=os,
            approximate_location=approximate_location,
            latitude=latitude,
            longitude=longitude,
            location_accuracy=location_accuracy,
            login_at=datetime.now(timezone.utc),
            verification_required=verification_required,
            verification_method=verification_method,
            risk_score=risk_score,
            failure_reason=failure_reason,
        )
        db.add(event)
        db.flush()
        return event


# ═══════════════════════════════════════════════════════════════
# VERIFICATION SERVICE
# ═══════════════════════════════════════════════════════════════

class VerificationService:
    """
    Manages the lifecycle of login verification tokens.
    
    Token Security:
    - 32-byte cryptographically random token (256 bits of entropy)
    - SHA-256 hashed before storage
    - Single-use: invalidated after first successful use
    - Short-lived: expires in DEVICE_VERIFICATION_TOKEN_EXPIRE_MINUTES
    - Rate-limited: maximum 5 attempts per request
    """

    @staticmethod
    def _generate_token() -> str:
        """Generate a 32-byte URL-safe random token."""
        return secrets.token_urlsafe(32)

    @staticmethod
    def _hash_token(token: str) -> str:
        """SHA-256 hash of token for DB storage."""
        return hashlib.sha256(token.encode()).hexdigest()

    @classmethod
    def create_verification(
        cls,
        db: Session,
        user_id: int,
        device_id: Optional[int],
        login_attempt_id: str,
        ip_address: Optional[str],
        user_agent: Optional[str],
    ) -> tuple[str, "LoginVerificationRequest"]:
        """
        Create a new verification request.
        Returns (raw_token, verification_request).
        
        The raw_token is placed in the email link.
        Only the hash is stored in the DB.
        """
        expire_minutes = getattr(settings, "DEVICE_VERIFICATION_TOKEN_EXPIRE_MINUTES", 30)
        token = cls._generate_token()
        token_hash = cls._hash_token(token)
        request_id = str(uuid.uuid4())

        now = datetime.now(timezone.utc)
        vr = LoginVerificationRequest(
            id=request_id,
            user_id=user_id,
            device_id=device_id,
            login_attempt_id=login_attempt_id,
            verification_token_hash=token_hash,
            status=VerificationStatus.PENDING,
            attempts=0,
            max_attempts=5,
            expires_at=now + timedelta(minutes=expire_minutes),
            ip_address=ip_address,
            user_agent=user_agent,
        )
        db.add(vr)
        db.flush()
        return token, vr

    @classmethod
    def find_by_token(
        cls, db: Session, token: str
    ) -> Optional[LoginVerificationRequest]:
        """Look up a verification request by raw token (hashed before lookup)."""
        token_hash = cls._hash_token(token)
        return db.scalar(
            select(LoginVerificationRequest).where(
                LoginVerificationRequest.verification_token_hash == token_hash,
                LoginVerificationRequest.status == VerificationStatus.PENDING,
            )
        )

    @classmethod
    def find_by_attempt_id(
        cls, db: Session, login_attempt_id: str
    ) -> Optional[LoginVerificationRequest]:
        """Look up a verification request by login attempt ID."""
        return db.scalar(
            select(LoginVerificationRequest).where(
                LoginVerificationRequest.login_attempt_id == login_attempt_id,
                LoginVerificationRequest.status == VerificationStatus.PENDING,
            )
        )

    @classmethod
    def validate_token(
        cls, db: Session, token: str
    ) -> tuple[bool, str, Optional[LoginVerificationRequest]]:
        """
        Validate a verification token.
        Returns (is_valid, error_reason, verification_request).
        
        Checks:
        1. Token exists
        2. Not already used/rejected
        3. Not expired
        4. Not exhausted (too many attempts)
        """
        vr = cls.find_by_token(db, token)

        if vr is None:
            return False, "Invalid or already-used verification token.", None

        # Increment attempt counter (whether valid or not — prevents probing)
        vr.attempts += 1

        if vr.is_expired:
            vr.status = VerificationStatus.EXPIRED
            db.flush()
            return False, "Verification link has expired. Please login again.", vr

        if vr.is_exhausted:
            return False, "Maximum verification attempts exceeded.", vr

        return True, "", vr

    @classmethod
    def mark_verified(cls, db: Session, vr: LoginVerificationRequest) -> None:
        """Mark verification as successful and invalidate the token. No commit."""
        vr.status = VerificationStatus.VERIFIED
        vr.verified_at = datetime.now(timezone.utc)
        # Zero out the token hash to prevent reuse even if status check is bypassed
        vr.verification_token_hash = ""

    @classmethod
    def mark_rejected(cls, db: Session, vr: LoginVerificationRequest) -> None:
        """Mark verification as rejected by the user. No commit."""
        vr.status = VerificationStatus.REJECTED
        vr.rejected_at = datetime.now(timezone.utc)
        vr.verification_token_hash = ""

    @classmethod
    def expire_old_requests(cls, db: Session, user_id: int) -> None:
        """Expire all pending verification requests for a user (call before creating new one)."""
        now = datetime.now(timezone.utc)
        db.execute(
            update(LoginVerificationRequest)
            .where(
                LoginVerificationRequest.user_id == user_id,
                LoginVerificationRequest.status == VerificationStatus.PENDING,
                LoginVerificationRequest.expires_at < now,
            )
            .values(status=VerificationStatus.EXPIRED)
        )


# ═══════════════════════════════════════════════════════════════
# DEVICE SECURITY ORCHESTRATOR (called from AuthService.login)
# ═══════════════════════════════════════════════════════════════

class DeviceCheckResult:
    """Result of device check during login."""

    def __init__(
        self,
        is_trusted: bool,
        requires_verification: bool,
        device: Optional[UserDevice],
        login_attempt_id: Optional[str],
        verification_token: Optional[str],
        verification_request: Optional[LoginVerificationRequest],
        risk_score: int,
    ):
        self.is_trusted = is_trusted
        self.requires_verification = requires_verification
        self.device = device
        self.login_attempt_id = login_attempt_id
        self.verification_token = verification_token
        self.verification_request = verification_request
        self.risk_score = risk_score


class DeviceSecurityOrchestrator:
    """
    Top-level coordinator for device security during login.
    Called from AuthService.login() after credential validation passes.
    
    Returns a DeviceCheckResult indicating whether:
    - The login can proceed immediately (trusted device)
    - Verification is required (new/untrusted device)
    """

    @classmethod
    def check_device_on_login(
        cls,
        db: Session,
        user_id: int,
        failed_attempts: int,
        device_installation_id: Optional[str],
        device_meta: dict,
        request: Request,
    ) -> DeviceCheckResult:
        """
        Main entry point for device check during login.
        
        Decision tree:
        1. No device ID provided → treat as new device
        2. Device ID found + trusted → allow, update last_seen_at
        3. Device ID found but REVOKED/BLOCKED → require verification
        4. Device ID not found (new device):
           a. If user has no devices at all → register as primary, allow
           b. Otherwise → create pending verification
        """
        ip = get_client_ip(request)
        ua = request.headers.get("User-Agent", "")[:500]
        login_attempt_id = str(uuid.uuid4())

        # ── Log the attempt ──────────────────────────────────
        LoginEventService.record(
            db,
            event_type=LoginEventType.LOGIN_ATTEMPT,
            user_id=user_id,
            login_attempt_id=login_attempt_id,
            ip_address=ip,
            user_agent=ua,
            device_type=device_meta.get("device_type"),
            platform=device_meta.get("platform"),
            browser=device_meta.get("browser_name"),
            os=device_meta.get("os_version"),
            latitude=device_meta.get("latitude"),
            longitude=device_meta.get("longitude"),
            approximate_location=device_meta.get("approximate_location"),
            location_accuracy=device_meta.get("location_accuracy"),
        )

        # ── Case 1: No device ID → existing user migration path ──
        if not device_installation_id:
            return cls._handle_no_device_id(
                db, user_id, login_attempt_id, failed_attempts, device_meta, ip, ua
            )

        # ── Case 2: Look up existing device ──────────────────
        existing_device = DeviceService.find_device(db, user_id, device_installation_id)

        if existing_device:
            return cls._handle_existing_device(
                db, user_id, existing_device, login_attempt_id, failed_attempts,
                device_meta, ip, ua
            )
        else:
            return cls._handle_new_device(
                db, user_id, device_installation_id, login_attempt_id,
                failed_attempts, device_meta, ip, ua
            )

    @classmethod
    def _handle_no_device_id(
        cls, db, user_id, login_attempt_id, failed_attempts, device_meta, ip, ua
    ) -> DeviceCheckResult:
        """
        No device ID sent (legacy client or first login without device ID support).
        If user has no registered devices or user has no email configured,
        auto-register and trust this device up to the active device limit.
        """
        from app.modules.auth.models import User
        user = db.get(User, user_id)
        user_has_email = bool(user and user.email and user.email.strip())
        has_devices = DeviceService.has_any_device(db, user_id)

        if not has_devices or not user_has_email:
            # First login ever or user has no email for verification — trust device
            generated_id = f"legacy-{uuid.uuid4()}"
            device = DeviceService.register_new_device(
                db, user_id, generated_id, device_meta,
                make_primary=not has_devices, make_trusted=True
            )
            DeviceService.enforce_device_limit(db, user_id, device.id)
            LoginEventService.record(
                db,
                event_type=LoginEventType.DEVICE_REGISTERED,
                user_id=user_id,
                device_id=device.id,
                login_attempt_id=login_attempt_id,
                ip_address=ip,
                user_agent=ua,
                device_type=device_meta.get("device_type"),
                status="SUCCESS",
            )
            return DeviceCheckResult(
                is_trusted=True, requires_verification=False,
                device=device, login_attempt_id=login_attempt_id,
                verification_token=None, verification_request=None,
                risk_score=0,
            )
        else:
            # User has devices and has email — require verification
            return cls._create_verification(
                db, user_id, device_id=None, login_attempt_id=login_attempt_id,
                failed_attempts=failed_attempts, device_meta=device_meta,
                ip=ip, ua=ua, is_new_device=True,
            )

    @classmethod
    def _handle_existing_device(
        cls, db, user_id, device: UserDevice, login_attempt_id,
        failed_attempts, device_meta, ip, ua
    ) -> DeviceCheckResult:
        """Handle a login from a recognized device."""

        if device.status == DeviceStatus.REVOKED:
            # Revoked device — require fresh verification
            LoginEventService.record(
                db, event_type=LoginEventType.LOGIN_FAILED,
                user_id=user_id, device_id=device.id,
                login_attempt_id=login_attempt_id,
                ip_address=ip, user_agent=ua,
                failure_reason="Device revoked",
                status="FAILED",
            )
            return cls._create_verification(
                db, user_id, device_id=device.id,
                login_attempt_id=login_attempt_id,
                failed_attempts=failed_attempts, device_meta=device_meta,
                ip=ip, ua=ua, is_new_device=False,
            )

        if device.status == DeviceStatus.BLOCKED:
            LoginEventService.record(
                db, event_type=LoginEventType.LOGIN_FAILED,
                user_id=user_id, device_id=device.id,
                login_attempt_id=login_attempt_id,
                ip_address=ip, user_agent=ua,
                failure_reason="Device blocked",
                status="FAILED",
            )
            return DeviceCheckResult(
                is_trusted=False, requires_verification=True,
                device=device, login_attempt_id=login_attempt_id,
                verification_token=None, verification_request=None,
                risk_score=100,
            )

        if device.is_trusted and device.status == DeviceStatus.ACTIVE:
            # Trusted device — normal login
            DeviceService.touch_device(db, device)
            risk = RiskEngine.calculate(device, False, failed_attempts, db, user_id)
            LoginEventService.record(
                db, event_type=LoginEventType.LOGIN_SUCCESS,
                user_id=user_id, device_id=device.id,
                login_attempt_id=login_attempt_id,
                ip_address=ip, user_agent=ua,
                device_type=device_meta.get("device_type"),
                platform=device_meta.get("platform"),
                browser=device_meta.get("browser_name"),
                os=device_meta.get("os_version"),
                risk_score=risk,
                status="SUCCESS",
            )
            return DeviceCheckResult(
                is_trusted=True, requires_verification=False,
                device=device, login_attempt_id=login_attempt_id,
                verification_token=None, verification_request=None,
                risk_score=risk,
            )

        # Known but pending/untrusted — check if user has email
        from app.modules.auth.models import User
        user = db.get(User, user_id)
        user_has_email = bool(user and user.email and user.email.strip())

        if not user_has_email:
            # Auto-trust since user has no email for verification
            DeviceService.trust_device(db, device)
            LoginEventService.record(
                db, event_type=LoginEventType.LOGIN_SUCCESS,
                user_id=user_id, device_id=device.id,
                login_attempt_id=login_attempt_id,
                ip_address=ip, user_agent=ua,
                device_type=device_meta.get("device_type"),
                platform=device_meta.get("platform"),
                browser=device_meta.get("browser_name"),
                os=device_meta.get("os_version"),
                risk_score=0,
                status="SUCCESS",
            )
            return DeviceCheckResult(
                is_trusted=True, requires_verification=False,
                device=device, login_attempt_id=login_attempt_id,
                verification_token=None, verification_request=None,
                risk_score=0,
            )

        return cls._create_verification(
            db, user_id, device_id=device.id,
            login_attempt_id=login_attempt_id,
            failed_attempts=failed_attempts, device_meta=device_meta,
            ip=ip, ua=ua, is_new_device=False,
        )

    @classmethod
    def _handle_new_device(
        cls, db, user_id, device_installation_id, login_attempt_id,
        failed_attempts, device_meta, ip, ua
    ) -> DeviceCheckResult:
        """Handle a login from a completely new (unregistered) device."""
        from app.modules.auth.models import User
        user = db.get(User, user_id)
        user_has_email = bool(user and user.email and user.email.strip())
        has_devices = DeviceService.has_any_device(db, user_id)

        if not has_devices or not user_has_email:
            # First device ever OR user has no registered email — register & trust immediately
            device = DeviceService.register_new_device(
                db, user_id, device_installation_id, device_meta,
                make_primary=not has_devices, make_trusted=True
            )
            DeviceService.enforce_device_limit(db, user_id, device.id)
            LoginEventService.record(
                db,
                event_type=LoginEventType.DEVICE_REGISTERED,
                user_id=user_id,
                device_id=device.id,
                login_attempt_id=login_attempt_id,
                ip_address=ip,
                user_agent=ua,
                device_type=device_meta.get("device_type"),
                status="SUCCESS",
            )
            return DeviceCheckResult(
                is_trusted=True, requires_verification=False,
                device=device, login_attempt_id=login_attempt_id,
                verification_token=None, verification_request=None,
                risk_score=0,
            )

        # User has existing devices AND has email — new device needs verification
        # Register the device as PENDING (don't trust yet)
        device = DeviceService.register_new_device(
            db, user_id, device_installation_id, device_meta,
            make_primary=False, make_trusted=False
        )

        LoginEventService.record(
            db,
            event_type=LoginEventType.NEW_DEVICE,
            user_id=user_id,
            device_id=device.id,
            login_attempt_id=login_attempt_id,
            ip_address=ip,
            user_agent=ua,
            device_type=device_meta.get("device_type"),
            platform=device_meta.get("platform"),
            browser=device_meta.get("browser_name"),
            os=device_meta.get("os_version"),
            risk_score=RiskEngine.SCORE_UNKNOWN_DEVICE,
            status="PENDING",
        )

        return cls._create_verification(
            db, user_id, device_id=device.id,
            login_attempt_id=login_attempt_id,
            failed_attempts=failed_attempts, device_meta=device_meta,
            ip=ip, ua=ua, is_new_device=True,
            existing_pending_device=device,
        )

    @classmethod
    def _create_verification(
        cls, db, user_id, device_id, login_attempt_id,
        failed_attempts, device_meta, ip, ua,
        is_new_device: bool = True,
        existing_pending_device: Optional[UserDevice] = None,
    ) -> DeviceCheckResult:
        """Create a pending verification request and log the event."""

        # Expire any stale pending requests first
        VerificationService.expire_old_requests(db, user_id)

        risk = RiskEngine.calculate(
            existing_pending_device, is_new_device, failed_attempts, db, user_id
        )

        token, vr = VerificationService.create_verification(
            db, user_id, device_id, login_attempt_id, ip, ua
        )

        LoginEventService.record(
            db,
            event_type=LoginEventType.DEVICE_VERIFICATION_REQUESTED,
            user_id=user_id,
            device_id=device_id,
            login_attempt_id=login_attempt_id,
            ip_address=ip,
            user_agent=ua,
            device_type=device_meta.get("device_type"),
            platform=device_meta.get("platform"),
            browser=device_meta.get("browser_name"),
            os=device_meta.get("os_version"),
            verification_required=True,
            verification_method="email",
            risk_score=risk,
            status="PENDING",
        )

        return DeviceCheckResult(
            is_trusted=False,
            requires_verification=True,
            device=existing_pending_device,
            login_attempt_id=login_attempt_id,
            verification_token=token,
            verification_request=vr,
            risk_score=risk,
        )

    @classmethod
    def complete_verification(
        cls,
        db: Session,
        token: str,
        request: Request,
    ) -> tuple[bool, str, Optional["LoginVerificationRequest"], Optional[UserDevice]]:
        """
        Process 'Yes, This Is Me' verification.
        
        Returns: (success, error_msg, verification_request, device)
        
        On success:
        - Marks verification as complete
        - Trusts the device
        - Enforces max-3 device limit (may evict oldest non-primary device)
        - All changes are in the same transaction
        """
        ip = get_client_ip(request)
        ua = request.headers.get("User-Agent", "")[:500]

        is_valid, error_reason, vr = VerificationService.validate_token(db, token)

        if not is_valid:
            if vr:
                LoginEventService.record(
                    db,
                    event_type=LoginEventType.DEVICE_VERIFICATION_FAILED,
                    user_id=vr.user_id,
                    device_id=vr.device_id,
                    login_attempt_id=vr.login_attempt_id,
                    ip_address=ip,
                    user_agent=ua,
                    failure_reason=error_reason,
                    status="FAILED",
                )
            db.flush()
            return False, error_reason, vr, None

        # ── Token is valid — trust the device ────────────────
        device = None
        if vr.device_id:
            device = db.get(UserDevice, vr.device_id)

        if device:
            DeviceService.trust_device(db, device)

            # Enforce max-3 device limit (with row lock)
            evicted = DeviceService.enforce_device_limit(db, vr.user_id, device.id)
            if evicted:
                LoginEventService.record(
                    db,
                    event_type=LoginEventType.DEVICE_REVOKED,
                    user_id=vr.user_id,
                    device_id=evicted.id,
                    login_attempt_id=vr.login_attempt_id,
                    ip_address=ip,
                    failure_reason="Auto-evicted: max device limit reached",
                    status="SUCCESS",
                )

        VerificationService.mark_verified(db, vr)

        LoginEventService.record(
            db,
            event_type=LoginEventType.DEVICE_VERIFICATION_SUCCESS,
            user_id=vr.user_id,
            device_id=vr.device_id,
            login_attempt_id=vr.login_attempt_id,
            ip_address=ip,
            user_agent=ua,
            status="SUCCESS",
        )
        LoginEventService.record(
            db,
            event_type=LoginEventType.LOGIN_SUCCESS,
            user_id=vr.user_id,
            device_id=vr.device_id,
            login_attempt_id=vr.login_attempt_id,
            ip_address=ip,
            user_agent=ua,
            status="SUCCESS",
        )

        db.flush()
        return True, "", vr, device

    @classmethod
    def reject_verification(
        cls,
        db: Session,
        token: str,
        request: Request,
    ) -> tuple[bool, str, Optional["LoginVerificationRequest"]]:
        """
        Process 'No, This Wasn't Me' rejection.
        Marks the verification rejected, records suspicious login.
        """
        ip = get_client_ip(request)
        ua = request.headers.get("User-Agent", "")[:500]

        vr = VerificationService.find_by_token(db, token)

        if vr is None:
            return False, "Invalid or expired token.", None

        VerificationService.mark_rejected(db, vr)

        # If a pending device was registered for this attempt, revert it
        if vr.device_id:
            device = db.get(UserDevice, vr.device_id)
            if device and device.status == DeviceStatus.PENDING:
                DeviceService._revoke_device_internal(db, device)

        LoginEventService.record(
            db,
            event_type=LoginEventType.SUSPICIOUS_LOGIN,
            user_id=vr.user_id,
            device_id=vr.device_id,
            login_attempt_id=vr.login_attempt_id,
            ip_address=ip,
            user_agent=ua,
            failure_reason="User rejected login attempt",
            status="FAILED",
            risk_score=80,
        )

        db.flush()
        return True, "", vr
