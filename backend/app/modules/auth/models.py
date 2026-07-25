"""
VidyaSetu ERP — Auth Module Models
=====================================
User, Role, Permission, Session models.
"""
from datetime import datetime
from typing import Optional
from sqlalchemy import BigInteger, Boolean, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import BaseModel


class User(BaseModel):
    """
    User table — login identity for all roles.
    One user can have multiple roles.
    """
    __tablename__ = "users"

    # ── Login Credentials ─────────────────────────────────────
    username: Mapped[str] = mapped_column(String(100), unique=True, nullable=False, index=True)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)

    # ── Login Methods (multiple ways to login) ────────────────
    mobile: Mapped[str | None] = mapped_column(String(15), unique=True, nullable=True, index=True)
    email: Mapped[str | None] = mapped_column(String(255), unique=True, nullable=True, index=True)
    employee_id: Mapped[str | None] = mapped_column(String(50), unique=True, nullable=True, index=True)
    gr_number: Mapped[str | None] = mapped_column(String(50), unique=True, nullable=True, index=True)

    # ── Profile ───────────────────────────────────────────────
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    photo_path: Mapped[str | None] = mapped_column(String(500), nullable=True)

    # ── Account Status ────────────────────────────────────────
    is_locked: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    lock_reason: Mapped[str | None] = mapped_column(String(500), nullable=True)
    failed_attempts: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    locked_until: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    # ── Password Policy ───────────────────────────────────────
    must_change_password: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    password_changed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    # ── Session Info ──────────────────────────────────────────
    last_login: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    last_login_ip: Mapped[str | None] = mapped_column(String(50), nullable=True)

    # ── Preferences ───────────────────────────────────────────
    preferred_language: Mapped[str] = mapped_column(String(10), default="mr", nullable=False)
    preferred_theme: Mapped[str] = mapped_column(String(20), default="light", nullable=False)

    # ── Relationships ─────────────────────────────────────────
    user_roles: Mapped[list["UserRole"]] = relationship("UserRole", back_populates="user", lazy="select")
    sessions: Mapped[list["UserSession"]] = relationship("UserSession", back_populates="user", lazy="select")

    @property
    def role_codes(self) -> list[str]:
        """Get list of active role codes for this user."""
        return [ur.role.code for ur in self.user_roles if ur.is_active and not ur.is_deleted]


class Role(BaseModel):
    """
    Role master — defines user roles in the system.
    System roles cannot be deleted.
    """
    __tablename__ = "roles"

    name: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    code: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, index=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_system: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    sort_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    color: Mapped[str | None] = mapped_column(String(20), nullable=True)

    # ── Relationships ─────────────────────────────────────────
    role_permissions: Mapped[list["RolePermission"]] = relationship(
        "RolePermission", back_populates="role", lazy="select"
    )
    user_roles: Mapped[list["UserRole"]] = relationship(
        "UserRole", back_populates="role", lazy="select"
    )

    @property
    def permission_codes(self) -> list[str]:
        """Get list of active permission codes for this role."""
        return [
            rp.permission.code
            for rp in self.role_permissions
            if rp.is_active and not rp.is_deleted
        ]


class Permission(BaseModel):
    """
    Permission definitions — module.action format.
    Example: student.create, finance.approve
    """
    __tablename__ = "permissions"

    module: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    action: Mapped[str] = mapped_column(String(100), nullable=False)
    code: Mapped[str] = mapped_column(String(200), unique=True, nullable=False, index=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    category: Mapped[str | None] = mapped_column(String(100), nullable=True)

    # ── Relationships ─────────────────────────────────────────
    role_permissions: Mapped[list["RolePermission"]] = relationship(
        "RolePermission", back_populates="permission", lazy="select"
    )


class RolePermission(BaseModel):
    """Many-to-many: Role ↔ Permission."""
    __tablename__ = "role_permissions"

    role_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("roles.id"), nullable=False, index=True)
    permission_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("permissions.id"), nullable=False, index=True)
    granted_by: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    granted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    # ── Relationships ─────────────────────────────────────────
    role: Mapped["Role"] = relationship("Role", back_populates="role_permissions")
    permission: Mapped["Permission"] = relationship("Permission", back_populates="role_permissions")


class UserRole(BaseModel):
    """Many-to-many: User ↔ Role."""
    __tablename__ = "user_roles"

    user_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("users.id"), nullable=False, index=True)
    role_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("roles.id"), nullable=False, index=True)
    assigned_by: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    assigned_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    # ── Relationships ─────────────────────────────────────────
    user: Mapped["User"] = relationship("User", back_populates="user_roles")
    role: Mapped["Role"] = relationship("Role", back_populates="user_roles")


class UserSession(BaseModel):
    """Tracks active login sessions per user."""
    __tablename__ = "user_sessions"

    user_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("users.id"), nullable=False, index=True)
    token_jti: Mapped[str] = mapped_column(String(100), unique=True, nullable=False, index=True)
    refresh_token_jti: Mapped[str | None] = mapped_column(String(100), unique=True, nullable=True, index=True)

    # Device info
    device_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    browser: Mapped[str | None] = mapped_column(String(255), nullable=True)
    os: Mapped[str | None] = mapped_column(String(100), nullable=True)
    ip_address: Mapped[str | None] = mapped_column(String(50), nullable=True)

    # Timing
    logged_in_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    last_active_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    # ── Relationships ─────────────────────────────────────────
    user: Mapped["User"] = relationship("User", back_populates="sessions")
