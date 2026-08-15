"""
VidyaSetu ERP — Temporary Device Expiry Scheduler
===================================================
Background async task that periodically checks for expired temporary devices
and revokes them, invalidating their sessions and notifying via Socket.IO.

Design:
  - Runs every EXPIRY_CHECK_INTERVAL_SECONDS (default 60).
  - Uses its own DB session per tick — never shares with request sessions.
  - Uses SELECT FOR UPDATE to prevent races if multiple workers run.
  - Does NOT delete any device or audit records — status is set to REVOKED
    with revoke_reason = EXPIRED.
  - Notifies connected clients via Socket.IO (best-effort; never raises).

Expiry enforcement:
  - Backend (this scheduler): authoritative — sessions are invalidated here.
  - Frontend countdown: UX only — backend expiry is the true source of truth.
"""
import asyncio
import logging
from datetime import datetime, timezone

from sqlalchemy import select, update
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)

EXPIRY_CHECK_INTERVAL_SECONDS = 60  # How often to scan for expired temporary devices


async def run_temporary_device_expiry(session_factory) -> None:
    """
    Continuously running background coroutine.
    Call once from lifespan startup with the SQLAlchemy SessionLocal factory.
    """
    logger.info("[ExpiryScheduler] Temporary device expiry scheduler started.")
    while True:
        try:
            await _expire_temporary_devices(session_factory)
        except Exception as exc:
            logger.error("[ExpiryScheduler] Error during expiry check: %s", exc, exc_info=True)
        await asyncio.sleep(EXPIRY_CHECK_INTERVAL_SECONDS)


async def _expire_temporary_devices(session_factory) -> None:
    """
    Perform one expiry check cycle.
    Runs all DB operations in a single transaction, then emits Socket.IO events.
    """
    from app.modules.device_security.models import DeviceStatus, LoginEventType, UserDevice
    from app.modules.auth.models import UserSession
    from app.modules.device_security.service import LoginEventService
    from app.shared.socket_manager import emit_temporary_device_expired

    now = datetime.now(timezone.utc)

    # Collect device IDs first (without locking) for quick check
    with session_factory() as db:
        # Find expired temporary devices that are still ACTIVE
        expired_devices = list(db.scalars(
            select(UserDevice)
            .where(
                UserDevice.is_temporary == True,
                UserDevice.status == DeviceStatus.ACTIVE,
                UserDevice.is_deleted == False,
                UserDevice.temporary_expires_at != None,
                UserDevice.temporary_expires_at <= now,
            )
            .with_for_update(skip_locked=True)  # Skip rows locked by concurrent workers
        ).all())

        if not expired_devices:
            return

        expired_device_ids = []

        for device in expired_devices:
            # Revoke the device
            device.status = DeviceStatus.REVOKED
            device.is_trusted = False
            device.revoke_reason = "EXPIRED"
            device.revoked_at = now
            device.last_seen_at = now

            # Invalidate all active sessions for this device
            db.execute(
                update(UserSession)
                .where(
                    UserSession.device_id == device.id,
                    UserSession.is_active == True,
                    UserSession.is_deleted == False,
                )
                .values(is_active=False)
            )

            # Record the audit event
            LoginEventService.record(
                db,
                event_type=LoginEventType.TEMPORARY_DEVICE_EXPIRED,
                user_id=device.user_id,
                device_id=device.id,
                status="EXPIRED",
                failure_reason="Temporary device session expired (automatic).",
            )

            expired_device_ids.append(device.id)
            logger.info(
                "[ExpiryScheduler] Expired temporary device id=%s user_id=%s",
                device.id, device.user_id,
            )

        db.commit()

    # Emit Socket.IO events after DB commit (best-effort)
    for device_id in expired_device_ids:
        try:
            await emit_temporary_device_expired(device_id)
        except Exception as exc:
            logger.warning("[ExpiryScheduler] Socket.IO emit failed for device %s: %s", device_id, exc)
