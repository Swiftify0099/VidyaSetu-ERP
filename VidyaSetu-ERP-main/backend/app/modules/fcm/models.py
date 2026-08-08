"""
VidyaSetu ERP — FCM Token Models
==================================
SQLAlchemy models for FCM device token management and notification history.

Tables:
  - fcm_tokens        : One record per device per user
  - notification_logs : Delivery history for auditing
"""
from datetime import datetime
from typing import Optional
from sqlalchemy import BigInteger, Boolean, DateTime, ForeignKey, String, Text, Index
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import BaseModel, utc_now


# ═══════════════════════════════════════════════════════════════
# FCM TOKEN — one row per registered device per user
# ═══════════════════════════════════════════════════════════════
class FCMToken(BaseModel):
    """
    Stores Firebase Cloud Messaging device tokens.

    Each user can have multiple FCM tokens (one per device/browser).
    Tokens are unique globally; if a token is re-registered it updates
    the existing record and refreshes last_used_at.
    """
    __tablename__ = "fcm_tokens"

    # ── Foreign Key ──────────────────────────────────────────────
    user_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )

    # ── Token ────────────────────────────────────────────────────
    fcm_token: Mapped[str] = mapped_column(
        Text, unique=True, nullable=False, index=True,
        comment="Firebase Cloud Messaging registration token — globally unique"
    )

    # ── Device Metadata ──────────────────────────────────────────
    device_type: Mapped[str] = mapped_column(
        String(20), nullable=False, default="web",
        comment="web | android | ios"
    )
    platform: Mapped[Optional[str]] = mapped_column(
        String(50), nullable=True,
        comment="Browser platform string, e.g. Win32, Linux x86_64"
    )
    browser: Mapped[Optional[str]] = mapped_column(
        String(100), nullable=True,
        comment="Browser name, e.g. Chrome 120, Firefox 121, Safari"
    )
    os: Mapped[Optional[str]] = mapped_column(
        String(100), nullable=True,
        comment="Operating system, e.g. Windows 11, Android 14, iOS 17"
    )
    device_name: Mapped[Optional[str]] = mapped_column(
        String(200), nullable=True,
        comment="Human-readable device label, e.g. iPhone 15 Pro, Galaxy S24"
    )

    # ── Timestamps ───────────────────────────────────────────────
    last_used_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True,
        comment="Updated every time the token is used to send a notification"
    )

    # ── Relationship ─────────────────────────────────────────────
    user: Mapped["User"] = relationship("User", foreign_keys=[user_id], lazy="select")  # type: ignore

    # ── Composite index for fast user-token lookups ───────────────
    __table_args__ = (
        Index("ix_fcm_tokens_user_active", "user_id", "is_active", "is_deleted"),
    )

    def __repr__(self) -> str:
        return f"<FCMToken user_id={self.user_id} device={self.device_type} token={self.fcm_token[:20]}...>"


# ═══════════════════════════════════════════════════════════════
# NOTIFICATION LOG — push notification delivery history
# ═══════════════════════════════════════════════════════════════
class NotificationLog(BaseModel):
    """
    Tracks every push notification attempt (FCM send).

    Records title, body, payload, delivery status, and any error message
    returned by Firebase. Used for the admin notification history panel.
    """
    __tablename__ = "notification_logs"

    # ── Who was notified ─────────────────────────────────────────
    user_id: Mapped[Optional[int]] = mapped_column(
        BigInteger, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True,
        comment="NULL when sent to a topic or broadcast"
    )

    # ── Message Content ──────────────────────────────────────────
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    body: Mapped[str] = mapped_column(Text, nullable=False)
    payload: Mapped[Optional[str]] = mapped_column(
        Text, nullable=True,
        comment="JSON-encoded extra data sent with the notification"
    )

    # ── Targeting ────────────────────────────────────────────────
    fcm_token: Mapped[Optional[str]] = mapped_column(
        Text, nullable=True,
        comment="Token used — NULL for topic sends"
    )
    topic: Mapped[Optional[str]] = mapped_column(
        String(255), nullable=True,
        comment="FCM topic name when using topic-based send"
    )
    target_type: Mapped[str] = mapped_column(
        String(20), nullable=False, default="token",
        comment="token | topic | user | broadcast | role"
    )

    # ── Delivery Status ──────────────────────────────────────────
    delivery_status: Mapped[str] = mapped_column(
        String(20), nullable=False, default="sent",
        comment="sent | delivered | failed | invalid_token"
    )
    error_message: Mapped[Optional[str]] = mapped_column(
        Text, nullable=True,
        comment="Error message from Firebase if delivery failed"
    )

    # ── Timing ───────────────────────────────────────────────────
    sent_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, nullable=False
    )

    # ── Sender (admin who triggered broadcast) ────────────────────
    sent_by: Mapped[Optional[int]] = mapped_column(
        BigInteger, nullable=True,
        comment="user_id of the admin who triggered the notification"
    )

    def __repr__(self) -> str:
        return f"<NotificationLog user_id={self.user_id} status={self.delivery_status} title={self.title[:30]}>"
