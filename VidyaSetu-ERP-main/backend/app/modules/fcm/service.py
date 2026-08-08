"""
VidyaSetu ERP — FCM Token Service
=====================================
Business logic for:
  - Token registration / upsert / unregister
  - FCM push notification delivery (token, user, users, topic, broadcast)
  - Admin push helpers (by role, class, school)
  - Automatic cleanup of invalid tokens reported by Firebase

Usage:
    from app.modules.fcm.service import FCMTokenService, FCMPushService

    # Register a device token after login
    FCMTokenService.register(db, user_id=5, request=req)

    # Send to a user (all their devices)
    result = FCMPushService.send_to_user(db, user_id=5, title="Hello", body="World!")
"""
import json
import logging
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from sqlalchemy import select, and_
from sqlalchemy.orm import Session

from app.modules.fcm.models import FCMToken, NotificationLog
from app.modules.fcm.schemas import RegisterTokenRequest, SendNotificationResponse

logger = logging.getLogger(__name__)


# ═══════════════════════════════════════════════════════════════
# FIREBASE MESSAGING HELPER
# ═══════════════════════════════════════════════════════════════

def _get_firebase_messaging():
    """
    Lazy-import Firebase Admin Messaging.
    Returns None if Firebase is not initialized (simulated mode).
    Never raises — caller checks for None.
    """
    try:
        import firebase_admin
        from firebase_admin import messaging
        if not firebase_admin._apps:
            logger.warning("[FCM] Firebase Admin not initialized — running in simulated mode.")
            return None
        return messaging
    except ImportError:
        logger.warning("[FCM] firebase-admin package not installed.")
        return None


def _build_fcm_message(
    token: Optional[str],
    title: str,
    body: str,
    data: Optional[Dict[str, Any]] = None,
    topic: Optional[str] = None,
    image_url: Optional[str] = None,
) -> Any:
    """Build a firebase_admin.messaging.Message object."""
    messaging = _get_firebase_messaging()
    if messaging is None:
        return None

    # All data values must be strings for FCM
    str_data: Dict[str, str] = {}
    if data:
        for k, v in data.items():
            str_data[str(k)] = str(v) if not isinstance(v, str) else v

    notification = messaging.Notification(title=title, body=body, image=image_url)
    android_config = messaging.AndroidConfig(
        priority="high",
        notification=messaging.AndroidNotification(
            title=title, body=body, icon="ic_notification",
            channel_id="vidyasetu_default",
        ),
    )
    apns_config = messaging.APNSConfig(
        payload=messaging.APNSPayload(
            aps=messaging.Aps(alert=messaging.ApsAlert(title=title, body=body), badge=1, sound="default"),
        ),
    )
    web_push_config = messaging.WebpushConfig(
        notification=messaging.WebpushNotification(title=title, body=body, icon="/icon.png"),
        fcm_options=messaging.WebpushFCMOptions(link="/"),
    )

    return messaging.Message(
        notification=notification,
        android=android_config,
        apns=apns_config,
        webpush=web_push_config,
        data=str_data or None,
        token=token,
        topic=topic,
    )


# ═══════════════════════════════════════════════════════════════
# FCM TOKEN SERVICE — registration, unregistration, listing
# ═══════════════════════════════════════════════════════════════

class FCMTokenService:
    """Handles registration and lifecycle management of FCM device tokens."""

    @staticmethod
    def register(db: Session, user_id: int, request: RegisterTokenRequest) -> FCMToken:
        """
        Register or update an FCM token for a user's device.

        Business logic:
        - If the token already exists (for ANY user), update its owner and metadata.
        - If the token does not exist, insert a new record.
        - This handles the case where a device is re-used by a different user.
        """
        # Check for existing token (could be owned by this or another user)
        stmt = select(FCMToken).where(FCMToken.fcm_token == request.fcm_token)
        existing: Optional[FCMToken] = db.scalar(stmt)

        if existing:
            # Update the owner and refresh metadata
            existing.user_id = user_id
            existing.device_type = request.device_type
            existing.platform = request.platform
            existing.browser = request.browser
            existing.os = request.os
            existing.device_name = request.device_name
            existing.is_active = True
            existing.is_deleted = False
            existing.deleted_at = None
            existing.last_used_at = datetime.now(timezone.utc)
            db.commit()
            db.refresh(existing)
            logger.info(f"[FCM] Updated token for user_id={user_id} device={request.device_type}")
            return existing

        # Insert new token record
        new_token = FCMToken(
            user_id=user_id,
            fcm_token=request.fcm_token,
            device_type=request.device_type,
            platform=request.platform,
            browser=request.browser,
            os=request.os,
            device_name=request.device_name,
            last_used_at=datetime.now(timezone.utc),
        )
        db.add(new_token)
        db.commit()
        db.refresh(new_token)
        logger.info(f"[FCM] Registered new token for user_id={user_id} device={request.device_type}")
        return new_token

    @staticmethod
    def unregister(db: Session, user_id: int, fcm_token: str) -> bool:
        """
        Soft-delete a token on logout.
        Returns True if a token was found and deactivated, False otherwise.
        """
        stmt = select(FCMToken).where(
            and_(
                FCMToken.fcm_token == fcm_token,
                FCMToken.user_id == user_id,
                FCMToken.is_deleted == False,  # noqa: E712
            )
        )
        token_obj: Optional[FCMToken] = db.scalar(stmt)

        if token_obj is None:
            logger.warning(f"[FCM] Token not found for user_id={user_id} on unregister.")
            return False

        token_obj.soft_delete(deleted_by=user_id)
        db.commit()
        logger.info(f"[FCM] Unregistered token for user_id={user_id}")
        return True

    @staticmethod
    def unregister_all(db: Session, user_id: int) -> int:
        """Soft-delete ALL tokens for a user (used on logout-all)."""
        stmt = select(FCMToken).where(
            and_(FCMToken.user_id == user_id, FCMToken.is_deleted == False)  # noqa: E712
        )
        tokens = db.scalars(stmt).all()
        count = 0
        for t in tokens:
            t.soft_delete(deleted_by=user_id)
            count += 1
        if count:
            db.commit()
        logger.info(f"[FCM] Unregistered {count} token(s) for user_id={user_id}")
        return count

    @staticmethod
    def get_user_tokens(db: Session, user_id: int) -> List[FCMToken]:
        """Return all active tokens for a user (their registered devices)."""
        stmt = select(FCMToken).where(
            and_(
                FCMToken.user_id == user_id,
                FCMToken.is_active == True,  # noqa: E712
                FCMToken.is_deleted == False,  # noqa: E712
            )
        ).order_by(FCMToken.last_used_at.desc().nullslast())
        return list(db.scalars(stmt).all())

    @staticmethod
    def get_tokens_for_users(db: Session, user_ids: List[int]) -> List[FCMToken]:
        """Return all active tokens for a list of user IDs."""
        stmt = select(FCMToken).where(
            and_(
                FCMToken.user_id.in_(user_ids),
                FCMToken.is_active == True,  # noqa: E712
                FCMToken.is_deleted == False,  # noqa: E712
            )
        )
        return list(db.scalars(stmt).all())

    @staticmethod
    def get_all_active_tokens(db: Session) -> List[FCMToken]:
        """Return ALL active tokens across all users (for broadcast)."""
        stmt = select(FCMToken).where(
            and_(
                FCMToken.is_active == True,  # noqa: E712
                FCMToken.is_deleted == False,  # noqa: E712
            )
        )
        return list(db.scalars(stmt).all())

    @staticmethod
    def _invalidate_tokens(db: Session, invalid_token_strings: List[str]) -> int:
        """
        Soft-delete tokens reported as invalid by Firebase.
        Called automatically after every send to clean up expired tokens.
        """
        if not invalid_token_strings:
            return 0
        stmt = select(FCMToken).where(FCMToken.fcm_token.in_(invalid_token_strings))
        tokens = db.scalars(stmt).all()
        count = 0
        for t in tokens:
            t.soft_delete()
            count += 1
        if count:
            db.commit()
            logger.info(f"[FCM] Invalidated {count} expired token(s)")
        return count


# ═══════════════════════════════════════════════════════════════
# FCM PUSH SERVICE — send notifications
# ═══════════════════════════════════════════════════════════════

class FCMPushService:
    """
    Reusable push notification sender.
    All methods log delivery results and remove invalid tokens automatically.
    """

    @staticmethod
    def send_to_token(
        db: Session,
        token: str,
        title: str,
        body: str,
        data: Optional[Dict[str, Any]] = None,
        image_url: Optional[str] = None,
        user_id: Optional[int] = None,
        sent_by: Optional[int] = None,
    ) -> SendNotificationResponse:
        """
        Send a notification to a single FCM token.
        Returns immediately in simulated mode (no Firebase credentials).
        """
        messaging = _get_firebase_messaging()

        if messaging is None:
            # Simulated mode — log and return success
            logger.info(f"[FCM][SIM] Would send to token={token[:20]}... title='{title}'")
            FCMPushService._log(
                db, user_id=user_id, title=title, body=body,
                payload=json.dumps(data) if data else None,
                fcm_token=token, target_type="token",
                delivery_status="sent", sent_by=sent_by,
            )
            return SendNotificationResponse(
                success_count=1, failure_count=0,
                invalid_tokens_removed=0, message_id="sim_mode",
            )

        msg = _build_fcm_message(token=token, title=title, body=body, data=data, image_url=image_url)
        try:
            message_id = messaging.send(msg)
            logger.info(f"[FCM] Sent to token={token[:20]}... message_id={message_id}")
            FCMPushService._log(
                db, user_id=user_id, title=title, body=body,
                payload=json.dumps(data) if data else None,
                fcm_token=token, target_type="token",
                delivery_status="sent", sent_by=sent_by,
            )
            return SendNotificationResponse(
                success_count=1, failure_count=0,
                invalid_tokens_removed=0, message_id=message_id,
            )
        except Exception as e:
            err_str = str(e)
            logger.error(f"[FCM] Failed to send to token={token[:20]}...: {err_str}")
            # Remove invalid token if Firebase rejects it
            removed = 0
            if "registration-token-not-registered" in err_str or "invalid-registration-token" in err_str:
                removed = FCMTokenService._invalidate_tokens(db, [token])
            FCMPushService._log(
                db, user_id=user_id, title=title, body=body,
                payload=json.dumps(data) if data else None,
                fcm_token=token, target_type="token",
                delivery_status="failed", error_message=err_str, sent_by=sent_by,
            )
            return SendNotificationResponse(
                success_count=0, failure_count=1,
                invalid_tokens_removed=removed, message_id=None,
            )

    @staticmethod
    def send_to_user(
        db: Session,
        user_id: int,
        title: str,
        body: str,
        data: Optional[Dict[str, Any]] = None,
        image_url: Optional[str] = None,
        sent_by: Optional[int] = None,
    ) -> SendNotificationResponse:
        """Send a notification to ALL registered devices of a single user."""
        tokens = FCMTokenService.get_user_tokens(db, user_id)
        if not tokens:
            logger.info(f"[FCM] No active tokens for user_id={user_id}")
            return SendNotificationResponse(
                success_count=0, failure_count=0, invalid_tokens_removed=0
            )
        return FCMPushService._send_to_token_list(
            db, tokens, title, body, data, image_url, sent_by=sent_by
        )

    @staticmethod
    def send_to_users(
        db: Session,
        user_ids: List[int],
        title: str,
        body: str,
        data: Optional[Dict[str, Any]] = None,
        image_url: Optional[str] = None,
        sent_by: Optional[int] = None,
    ) -> SendNotificationResponse:
        """Send a notification to all devices of multiple users."""
        tokens = FCMTokenService.get_tokens_for_users(db, user_ids)
        if not tokens:
            logger.info(f"[FCM] No active tokens for {len(user_ids)} user(s)")
            return SendNotificationResponse(
                success_count=0, failure_count=0, invalid_tokens_removed=0
            )
        return FCMPushService._send_to_token_list(
            db, tokens, title, body, data, image_url, sent_by=sent_by
        )

    @staticmethod
    def send_to_topic(
        db: Session,
        topic: str,
        title: str,
        body: str,
        data: Optional[Dict[str, Any]] = None,
        image_url: Optional[str] = None,
        sent_by: Optional[int] = None,
    ) -> SendNotificationResponse:
        """
        Send to an FCM topic (e.g. 'student', 'teacher', 'all').
        Devices subscribe to topics via the Firebase SDK.
        """
        messaging = _get_firebase_messaging()

        if messaging is None:
            logger.info(f"[FCM][SIM] Would send to topic={topic} title='{title}'")
            FCMPushService._log(
                db, user_id=None, title=title, body=body,
                payload=json.dumps(data) if data else None,
                topic=topic, target_type="topic",
                delivery_status="sent", sent_by=sent_by,
            )
            return SendNotificationResponse(
                success_count=1, failure_count=0,
                invalid_tokens_removed=0, message_id="sim_mode",
            )

        msg = _build_fcm_message(token=None, title=title, body=body, data=data, topic=topic, image_url=image_url)
        try:
            message_id = messaging.send(msg)
            logger.info(f"[FCM] Sent to topic={topic} message_id={message_id}")
            FCMPushService._log(
                db, user_id=None, title=title, body=body,
                payload=json.dumps(data) if data else None,
                topic=topic, target_type="topic",
                delivery_status="sent", sent_by=sent_by,
            )
            return SendNotificationResponse(
                success_count=1, failure_count=0,
                invalid_tokens_removed=0, message_id=message_id,
            )
        except Exception as e:
            err_str = str(e)
            logger.error(f"[FCM] Topic send failed topic={topic}: {err_str}")
            FCMPushService._log(
                db, user_id=None, title=title, body=body,
                payload=json.dumps(data) if data else None,
                topic=topic, target_type="topic",
                delivery_status="failed", error_message=err_str, sent_by=sent_by,
            )
            return SendNotificationResponse(
                success_count=0, failure_count=1,
                invalid_tokens_removed=0,
            )

    @staticmethod
    def broadcast(
        db: Session,
        title: str,
        body: str,
        data: Optional[Dict[str, Any]] = None,
        image_url: Optional[str] = None,
        sent_by: Optional[int] = None,
    ) -> SendNotificationResponse:
        """Send to ALL active device tokens in the system."""
        tokens = FCMTokenService.get_all_active_tokens(db)
        if not tokens:
            return SendNotificationResponse(
                success_count=0, failure_count=0, invalid_tokens_removed=0
            )
        logger.info(f"[FCM] Broadcasting to {len(tokens)} token(s)")
        return FCMPushService._send_to_token_list(
            db, tokens, title, body, data, image_url,
            target_type="broadcast", sent_by=sent_by,
        )

    @staticmethod
    def send_by_role(
        db: Session,
        role_code: str,
        title: str,
        body: str,
        data: Optional[Dict[str, Any]] = None,
        image_url: Optional[str] = None,
        sent_by: Optional[int] = None,
    ) -> SendNotificationResponse:
        """
        Send to all users who have a specific role.
        Joins fcm_tokens → users → user_roles → roles.
        """
        from sqlalchemy import text

        sql = text("""
            SELECT DISTINCT ft.user_id
            FROM fcm_tokens ft
            JOIN user_roles ur ON ur.user_id = ft.user_id AND ur.is_active = true AND ur.is_deleted = false
            JOIN roles r ON r.id = ur.role_id AND r.code = :role_code
            WHERE ft.is_active = true AND ft.is_deleted = false
        """)
        rows = db.execute(sql, {"role_code": role_code}).fetchall()
        user_ids = [row[0] for row in rows]

        if not user_ids:
            logger.info(f"[FCM] No active token holders for role={role_code}")
            return SendNotificationResponse(success_count=0, failure_count=0, invalid_tokens_removed=0)

        tokens = FCMTokenService.get_tokens_for_users(db, user_ids)
        logger.info(f"[FCM] Sending to role={role_code} → {len(tokens)} token(s)")
        return FCMPushService._send_to_token_list(
            db, tokens, title, body, data, image_url,
            target_type="role", sent_by=sent_by,
        )

    @staticmethod
    def send_by_class(
        db: Session,
        class_id: int,
        title: str,
        body: str,
        data: Optional[Dict[str, Any]] = None,
        image_url: Optional[str] = None,
        sent_by: Optional[int] = None,
    ) -> SendNotificationResponse:
        """
        Send notification to all students + parents in a class.
        Looks up student user_ids via the students table.
        """
        from sqlalchemy import text

        sql = text("""
            SELECT DISTINCT u.id
            FROM users u
            JOIN students s ON s.user_id = u.id AND s.is_deleted = false
            WHERE s.class_id = :class_id
              AND EXISTS (
                SELECT 1 FROM fcm_tokens ft
                WHERE ft.user_id = u.id AND ft.is_active = true AND ft.is_deleted = false
              )
        """)
        rows = db.execute(sql, {"class_id": class_id}).fetchall()
        user_ids = [row[0] for row in rows]

        if not user_ids:
            logger.info(f"[FCM] No active token holders for class_id={class_id}")
            return SendNotificationResponse(success_count=0, failure_count=0, invalid_tokens_removed=0)

        tokens = FCMTokenService.get_tokens_for_users(db, user_ids)
        logger.info(f"[FCM] Sending to class_id={class_id} → {len(tokens)} token(s)")
        return FCMPushService._send_to_token_list(
            db, tokens, title, body, data, image_url,
            target_type="class", sent_by=sent_by,
        )

    # ── Internal batch sender ─────────────────────────────────
    @staticmethod
    def _send_to_token_list(
        db: Session,
        tokens: List[FCMToken],
        title: str,
        body: str,
        data: Optional[Dict[str, Any]] = None,
        image_url: Optional[str] = None,
        target_type: str = "token",
        sent_by: Optional[int] = None,
    ) -> SendNotificationResponse:
        """
        Send to a list of FCMToken objects using Firebase send_each (batch).
        Automatically removes invalid tokens reported by Firebase.
        """
        messaging = _get_firebase_messaging()
        token_strings = [t.fcm_token for t in tokens]
        token_to_user = {t.fcm_token: t.user_id for t in tokens}

        if messaging is None:
            # Simulated mode
            logger.info(f"[FCM][SIM] Would send to {len(token_strings)} token(s) title='{title}'")
            for tok, uid in token_to_user.items():
                FCMPushService._log(
                    db, user_id=uid, title=title, body=body,
                    payload=json.dumps(data) if data else None,
                    fcm_token=tok, target_type=target_type,
                    delivery_status="sent", sent_by=sent_by,
                )
            return SendNotificationResponse(
                success_count=len(token_strings),
                failure_count=0,
                invalid_tokens_removed=0,
            )

        # Build individual messages for each token
        messages = [
            _build_fcm_message(token=tok, title=title, body=body, data=data, image_url=image_url)
            for tok in token_strings
        ]

        try:
            batch_response = messaging.send_each(messages)
        except Exception as e:
            logger.error(f"[FCM] Batch send failed: {e}")
            return SendNotificationResponse(
                success_count=0,
                failure_count=len(token_strings),
                invalid_tokens_removed=0,
            )

        success_count = 0
        failure_count = 0
        invalid_tokens: List[str] = []

        for i, resp in enumerate(batch_response.responses):
            tok = token_strings[i]
            uid = token_to_user.get(tok)
            if resp.success:
                success_count += 1
                FCMPushService._log(
                    db, user_id=uid, title=title, body=body,
                    payload=json.dumps(data) if data else None,
                    fcm_token=tok, target_type=target_type,
                    delivery_status="sent", sent_by=sent_by,
                )
            else:
                failure_count += 1
                err_str = str(resp.exception)
                logger.warning(f"[FCM] Failed for token={tok[:20]}...: {err_str}")
                # Collect tokens Firebase says are invalid/unregistered
                if resp.exception and hasattr(resp.exception, "code"):
                    code = resp.exception.code
                    if code in (
                        "messaging/registration-token-not-registered",
                        "messaging/invalid-registration-token",
                    ):
                        invalid_tokens.append(tok)
                FCMPushService._log(
                    db, user_id=uid, title=title, body=body,
                    payload=json.dumps(data) if data else None,
                    fcm_token=tok, target_type=target_type,
                    delivery_status="failed", error_message=err_str, sent_by=sent_by,
                )

        removed = FCMTokenService._invalidate_tokens(db, invalid_tokens)
        logger.info(
            f"[FCM] Batch complete: {success_count} sent, {failure_count} failed, {removed} tokens removed."
        )
        return SendNotificationResponse(
            success_count=success_count,
            failure_count=failure_count,
            invalid_tokens_removed=removed,
        )

    @staticmethod
    def _log(
        db: Session,
        user_id: Optional[int],
        title: str,
        body: str,
        payload: Optional[str] = None,
        fcm_token: Optional[str] = None,
        topic: Optional[str] = None,
        target_type: str = "token",
        delivery_status: str = "sent",
        error_message: Optional[str] = None,
        sent_by: Optional[int] = None,
    ) -> None:
        """Insert a notification delivery record. Never raises."""
        try:
            log = NotificationLog(
                user_id=user_id,
                title=title,
                body=body,
                payload=payload,
                fcm_token=fcm_token,
                topic=topic,
                target_type=target_type,
                delivery_status=delivery_status,
                error_message=error_message,
                sent_by=sent_by,
            )
            db.add(log)
            db.commit()
        except Exception as e:
            logger.warning(f"[FCM] Failed to write notification log: {e}")
            db.rollback()


# ═══════════════════════════════════════════════════════════════
# PUBLIC API — module-level convenience functions
# ═══════════════════════════════════════════════════════════════

def send_to_user(db: Session, user_id: int, title: str, body: str, data: Optional[Dict] = None) -> SendNotificationResponse:
    """Convenience wrapper: send to a single user's all devices."""
    return FCMPushService.send_to_user(db, user_id, title, body, data)


def send_to_users(db: Session, user_ids: List[int], title: str, body: str, data: Optional[Dict] = None) -> SendNotificationResponse:
    """Convenience wrapper: send to multiple users' devices."""
    return FCMPushService.send_to_users(db, user_ids, title, body, data)


def send_to_topic(db: Session, topic: str, title: str, body: str, data: Optional[Dict] = None) -> SendNotificationResponse:
    """Convenience wrapper: send to an FCM topic."""
    return FCMPushService.send_to_topic(db, topic, title, body, data)


def send_to_token(db: Session, token: str, title: str, body: str, data: Optional[Dict] = None) -> SendNotificationResponse:
    """Convenience wrapper: send to a single FCM token."""
    return FCMPushService.send_to_token(db, token, title, body, data)
