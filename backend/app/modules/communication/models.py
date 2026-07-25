"""
VidyaSetu ERP — Communication Module Models
============================================
School-wide communication system:
- Circular / Notice management
- Announcement broadcasts
- Parent SMS/WhatsApp notifications (log)
- Message templates
- Communication log (audit trail)
"""
from datetime import date, datetime
from sqlalchemy import (
    BigInteger, Boolean, Date, DateTime, ForeignKey,
    Integer, String, Text, UniqueConstraint
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import BaseModel


class Notice(BaseModel):
    """
    Official circulars and notices from school administration.
    Can be targeted to specific audiences.
    """
    __tablename__ = "notices"

    title: Mapped[str] = mapped_column(String(500), nullable=False, index=True)
    title_marathi: Mapped[str | None] = mapped_column(String(500), nullable=True)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    content_marathi: Mapped[str | None] = mapped_column(Text, nullable=True)
    notice_type: Mapped[str] = mapped_column(String(50), nullable=False, default="general")
    # general / exam / fee / holiday / event / emergency / circular
    audience: Mapped[str] = mapped_column(String(100), nullable=False, default="all")
    # all / students / teachers / parents / staff / standard_8
    is_urgent: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_published: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    publish_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    expiry_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    attachment_path: Mapped[str | None] = mapped_column(String(500), nullable=True)
    academic_year_id: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    view_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    published_by: Mapped[int | None] = mapped_column(BigInteger, nullable=True)


class MessageTemplate(BaseModel):
    """
    Reusable message templates for SMS/WhatsApp/email.
    Support Marathi and English.
    """
    __tablename__ = "message_templates"

    name: Mapped[str] = mapped_column(String(200), nullable=False)
    template_type: Mapped[str] = mapped_column(String(50), nullable=False, default="sms")
    # sms / whatsapp / email / push
    category: Mapped[str] = mapped_column(String(50), nullable=False, default="general")
    # general / attendance / fee / exam / notice / admission
    subject: Mapped[str | None] = mapped_column(String(300), nullable=True)
    body_english: Mapped[str] = mapped_column(Text, nullable=False)
    body_marathi: Mapped[str | None] = mapped_column(Text, nullable=True)
    variables: Mapped[str | None] = mapped_column(String(500), nullable=True)
    # JSON list of variable names: ["student_name", "date", "amount"]


class CommunicationLog(BaseModel):
    """
    Audit log for all outgoing communications.
    """
    __tablename__ = "communication_logs"

    channel: Mapped[str] = mapped_column(String(20), nullable=False)
    # sms / whatsapp / email / push / in_app
    recipient_type: Mapped[str] = mapped_column(String(30), nullable=False)
    # student / parent / teacher / all
    recipient_id: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    recipient_phone: Mapped[str | None] = mapped_column(String(20), nullable=True)
    recipient_email: Mapped[str | None] = mapped_column(String(200), nullable=True)
    subject: Mapped[str | None] = mapped_column(String(300), nullable=True)
    message_body: Mapped[str] = mapped_column(Text, nullable=False)
    template_id: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    notice_id: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="pending")
    # pending / sent / failed / delivered
    sent_by: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    sent_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    external_msg_id: Mapped[str | None] = mapped_column(String(200), nullable=True)


class Announcement(BaseModel):
    """
    Quick announcements — in-app banner messages.
    Shown on dashboards for specific user roles.
    """
    __tablename__ = "announcements"

    title: Mapped[str] = mapped_column(String(300), nullable=False)
    body: Mapped[str | None] = mapped_column(Text, nullable=True)
    announcement_type: Mapped[str] = mapped_column(String(30), nullable=False, default="info")
    # info / warning / success / danger
    target_roles: Mapped[str] = mapped_column(String(200), nullable=False, default="all")
    # "all" or comma-separated roles
    is_pinned: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    expiry_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    academic_year_id: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
