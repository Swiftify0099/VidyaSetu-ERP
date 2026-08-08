"""
VidyaSetu ERP — Audit Log Service
====================================
Records every important action in the system.
Everything is traceable.
"""
import json
from datetime import datetime, timezone
from typing import Any, Optional

from sqlalchemy.orm import Session

from app.database.base import BaseModel
from sqlalchemy import BigInteger, Column, String, Text, Boolean, DateTime
from sqlalchemy.orm import Mapped, mapped_column


class AuditLog(BaseModel):
    """
    Audit log table — stores every significant action.
    Records who did what, when, on which record.
    """
    __tablename__ = "audit_logs"

    # Who performed the action
    user_id: Mapped[int | None] = mapped_column(BigInteger, nullable=True, index=True)
    user_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    user_role: Mapped[str | None] = mapped_column(String(100), nullable=True)

    # What action was performed
    action: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    module: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    entity_type: Mapped[str | None] = mapped_column(String(100), nullable=True)
    entity_id: Mapped[str | None] = mapped_column(String(100), nullable=True, index=True)

    # Values before/after
    old_value: Mapped[str | None] = mapped_column(Text, nullable=True)
    new_value: Mapped[str | None] = mapped_column(Text, nullable=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Request context
    ip_address: Mapped[str | None] = mapped_column(String(50), nullable=True)
    device: Mapped[str | None] = mapped_column(String(255), nullable=True)
    browser: Mapped[str | None] = mapped_column(String(255), nullable=True)

    # Result
    success: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)


class AuditService:
    """
    Service for creating audit log entries.
    Use this everywhere to record important actions.
    """

    @staticmethod
    def log(
        db: Session,
        action: str,
        module: str,
        user_id: Optional[int] = None,
        user_name: Optional[str] = None,
        user_role: Optional[str] = None,
        entity_type: Optional[str] = None,
        entity_id: Optional[Any] = None,
        old_value: Optional[dict] = None,
        new_value: Optional[dict] = None,
        description: Optional[str] = None,
        ip_address: Optional[str] = None,
        device: Optional[str] = None,
        browser: Optional[str] = None,
        success: bool = True,
        error_message: Optional[str] = None,
    ) -> AuditLog:
        """
        Create a single audit log entry.

        Example:
            AuditService.log(
                db=db,
                action="LOGIN",
                module="auth",
                user_id=1,
                description="User logged in successfully",
            )
        """
        log = AuditLog(
            user_id=user_id,
            user_name=user_name,
            user_role=user_role,
            action=action.upper(),
            module=module.lower(),
            entity_type=entity_type,
            entity_id=str(entity_id) if entity_id is not None else None,
            old_value=json.dumps(old_value, default=str) if old_value else None,
            new_value=json.dumps(new_value, default=str) if new_value else None,
            description=description,
            ip_address=ip_address,
            device=device,
            browser=browser,
            success=success,
            error_message=error_message,
        )
        db.add(log)
        db.flush()  # Get ID without committing
        return log


def create_audit_log(
    db: Session,
    action: str,
    entity_type: str,
    entity_id: Any,
    old_value: Optional[dict],
    new_value: Optional[dict],
    user_id: Optional[int] = None,
) -> None:
    """
    Convenience wrapper around AuditService.log().
    Used by service modules that don't have full request context.

    Example:
        create_audit_log(db, "create", "leave_applications", app.id,
                         None, {"status": "pending"}, by)
    """
    try:
        AuditService.log(
            db=db,
            action=action,
            module=entity_type.split("_")[0],  # e.g. "leave_applications" → "leave"
            user_id=user_id,
            entity_type=entity_type,
            entity_id=entity_id,
            old_value=old_value,
            new_value=new_value,
        )
    except Exception:
        # Never let audit logging crash the main operation
        pass

