"""
VidyaSetu ERP — Auth Service
===============================
Business logic for authentication.
"""
from datetime import datetime, timezone, timedelta
from typing import Optional, Tuple

from fastapi import HTTPException, Request, status
from sqlalchemy import or_, select
from sqlalchemy.orm import Session, selectinload

from app.core.config import settings
from app.core.security import (
    hash_password,
    verify_password,
    create_access_token,
    create_refresh_token,
    verify_refresh_token,
)
from app.modules.auth.models import User, UserRole, UserSession, Role, Permission
from app.modules.auth.schemas import (
    LoginRequest,
    TokenResponse,
    UserMeResponse,
    RoleResponse,
)
from app.shared.audit import AuditService


class AuthService:
    """Handles all authentication operations."""

    @staticmethod
    def find_user_by_username(db: Session, username: str) -> Optional[User]:
        """
        Find user by username (tries mobile, employee_id, gr_number, email, username).
        This enables flexible login methods.
        """
        return db.scalar(
            select(User)
            .where(
                or_(
                    User.username == username,
                    User.mobile == username,
                    User.employee_id == username,
                    User.gr_number == username,
                    User.email == username,
                )
            )
            .where(User.is_deleted == False)
            .options(
                selectinload(User.user_roles)
                .selectinload(UserRole.role)
                .selectinload(Role.role_permissions)
            )
        )

    @staticmethod
    def _build_user_permissions(user: User) -> list[str]:
        """Extract all permission codes from user's roles."""
        permissions = set()
        for user_role in user.user_roles:
            if not user_role.is_active or user_role.is_deleted:
                continue
            role = user_role.role
            if not role or not role.is_active or role.is_deleted:
                continue
            for rp in role.role_permissions:
                if rp.is_active and not rp.is_deleted and rp.permission:
                    permissions.add(rp.permission.code)
        return list(permissions)

    @staticmethod
    def _build_user_response(user: User, permissions: list[str]) -> UserMeResponse:
        """Build UserMeResponse from user model."""
        roles = []
        for ur in user.user_roles:
            if ur.is_active and not ur.is_deleted and ur.role:
                roles.append(RoleResponse(
                    id=ur.role.id,
                    name=ur.role.name,
                    code=ur.role.code,
                    color=ur.role.color,
                ))
        return UserMeResponse(
            id=user.id,
            uuid=user.uuid,
            username=user.username,
            full_name=user.full_name,
            mobile=user.mobile,
            email=user.email,
            employee_id=user.employee_id,
            gr_number=user.gr_number,
            photo_path=user.photo_path,
            preferred_language=user.preferred_language,
            preferred_theme=user.preferred_theme,
            must_change_password=user.must_change_password,
            last_login=user.last_login,
            roles=roles,
            permissions=permissions,
        )

    @classmethod
    def login(
        cls,
        db: Session,
        request: LoginRequest,
        client_request: Request,
    ) -> TokenResponse:
        """
        Authenticate user and return token pair.
        Handles: account lock, failed attempts, session creation.
        """
        user = cls.find_user_by_username(db, request.username)

        # User not found — generic message to prevent enumeration
        if not user:
            AuditService.log(
                db, action="LOGIN_FAILED", module="auth",
                description=f"Login attempt with unknown username: {request.username}",
                ip_address=client_request.client.host if client_request.client else None,
                success=False,
                error_message="User not found",
            )
            db.commit()
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid username or password.",
            )

        # Account inactive
        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Your account has been deactivated. Please contact the administrator.",
            )

        # Account locked
        if user.is_locked:
            if user.locked_until and user.locked_until > datetime.now(timezone.utc):
                remaining = user.locked_until - datetime.now(timezone.utc)
                minutes = int(remaining.total_seconds() / 60) + 1
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail=f"Account locked. Please try again in {minutes} minutes.",
                )
            else:
                # Lock expired — auto-unlock
                user.is_locked = False
                user.failed_attempts = 0
                user.locked_until = None

        # Wrong password
        if not verify_password(request.password, user.password_hash):
            user.failed_attempts += 1
            if user.failed_attempts >= settings.MAX_LOGIN_ATTEMPTS:
                user.is_locked = True
                user.locked_until = datetime.now(timezone.utc) + timedelta(
                    minutes=settings.ACCOUNT_LOCK_DURATION_MINUTES
                )
                lock_msg = f"Account locked for {settings.ACCOUNT_LOCK_DURATION_MINUTES} minutes after {settings.MAX_LOGIN_ATTEMPTS} failed attempts."
                AuditService.log(
                    db, action="ACCOUNT_LOCKED", module="auth",
                    user_id=user.id, user_name=user.full_name,
                    description=lock_msg,
                    success=False,
                )
                db.commit()
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail=lock_msg,
                )
            AuditService.log(
                db, action="LOGIN_FAILED", module="auth",
                user_id=user.id, user_name=user.full_name,
                description=f"Wrong password. Attempt {user.failed_attempts}/{settings.MAX_LOGIN_ATTEMPTS}",
                success=False,
            )
            db.commit()
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"Invalid username or password. {settings.MAX_LOGIN_ATTEMPTS - user.failed_attempts} attempts remaining.",
            )

        # ── Login Successful ──────────────────────────────────
        user.failed_attempts = 0
        user.is_locked = False
        user.last_login = datetime.now(timezone.utc)
        user.last_login_ip = client_request.client.host if client_request.client else None

        permissions = cls._build_user_permissions(user)
        role_codes = [ur.role.code for ur in user.user_roles if ur.is_active and not ur.is_deleted]

        # Create tokens
        access_token, access_jti, access_expires = create_access_token(
            user_id=user.id,
            role_codes=role_codes,
            permissions=permissions,
        )
        refresh_token, refresh_jti, refresh_expires = create_refresh_token(user_id=user.id)

        # Save session
        session = UserSession(
            user_id=user.id,
            token_jti=access_jti,
            refresh_token_jti=refresh_jti,
            device_name=request.device_name,
            browser=client_request.headers.get("User-Agent", "")[:255],
            ip_address=client_request.client.host if client_request.client else None,
            logged_in_at=datetime.now(timezone.utc),
            last_active_at=datetime.now(timezone.utc),
            expires_at=refresh_expires,
        )
        db.add(session)

        AuditService.log(
            db, action="LOGIN", module="auth",
            user_id=user.id, user_name=user.full_name,
            user_role=", ".join(role_codes),
            description="User logged in successfully.",
            ip_address=client_request.client.host if client_request.client else None,
        )

        db.commit()

        user_response = cls._build_user_response(user, permissions)

        return TokenResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
            user=user_response,
        )

    @classmethod
    def refresh_token(cls, db: Session, refresh_token: str) -> TokenResponse:
        """Refresh access token using a valid refresh token."""
        payload = verify_refresh_token(refresh_token)
        if not payload:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired refresh token. Please login again.",
            )

        jti = payload.get("jti")
        user_id = int(payload.get("sub", 0))

        # Verify session exists and is active
        session = db.scalar(
            select(UserSession)
            .where(UserSession.refresh_token_jti == jti)
            .where(UserSession.is_active == True)
            .where(UserSession.is_deleted == False)
        )
        if not session:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Session expired or revoked. Please login again.",
            )

        # Get user
        user = db.get(User, user_id)
        if not user or not user.is_active or user.is_deleted:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Account not found or deactivated.",
            )

        # Load fresh permissions
        user = cls.find_user_by_username(db, user.username)
        permissions = cls._build_user_permissions(user)
        role_codes = [ur.role.code for ur in user.user_roles if ur.is_active and not ur.is_deleted]

        # Create new access token
        access_token, access_jti, _ = create_access_token(
            user_id=user.id,
            role_codes=role_codes,
            permissions=permissions,
        )

        # Update session
        session.token_jti = access_jti
        session.last_active_at = datetime.now(timezone.utc)
        db.commit()

        user_response = cls._build_user_response(user, permissions)

        return TokenResponse(
            access_token=access_token,
            refresh_token=refresh_token,  # Same refresh token
            expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
            user=user_response,
        )

    @staticmethod
    def logout(db: Session, jti: str, user_id: int) -> None:
        """Revoke current session."""
        session = db.scalar(
            select(UserSession)
            .where(UserSession.token_jti == jti)
            .where(UserSession.user_id == user_id)
        )
        if session:
            session.is_active = False
            session.soft_delete(deleted_by=user_id)
            AuditService.log(
                db, action="LOGOUT", module="auth",
                user_id=user_id, description="User logged out.",
            )
            db.commit()

    @staticmethod
    def logout_all(db: Session, user_id: int) -> None:
        """Revoke all sessions for a user."""
        from sqlalchemy import update
        db.execute(
            update(UserSession)
            .where(UserSession.user_id == user_id)
            .where(UserSession.is_active == True)
            .values(is_active=False, is_deleted=True)
        )
        AuditService.log(
            db, action="LOGOUT_ALL", module="auth",
            user_id=user_id, description="User logged out from all devices.",
        )
        db.commit()
