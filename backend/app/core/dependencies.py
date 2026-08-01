"""
VidyaSetu ERP — FastAPI Dependencies
======================================
Reusable dependency injectors for routes.
"""
from typing import Annotated, Optional

from fastapi import Depends, HTTPException, Header, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from app.core.security import verify_access_token
from app.database.session import get_db

security_scheme = HTTPBearer(auto_error=False)


# ── Database Dependency ───────────────────────────────────────
DBSession = Annotated[Session, Depends(get_db)]


# ── Auth Dependencies ─────────────────────────────────────────
class CurrentUser:
    """Represents the authenticated user extracted from JWT."""

    def __init__(
        self,
        user_id: int,
        role_codes: list[str],
        permissions: list[str],
        jti: str,
        full_name: str = "",
    ):
        self.user_id = user_id
        self.role_codes = role_codes
        self.permissions = permissions
        self.jti = jti
        self.full_name = full_name

    def has_permission(self, permission: str) -> bool:
        """Check if user has a specific permission."""
        return permission in self.permissions or "*" in self.permissions

    def has_role(self, role_code: str) -> bool:
        """Check if user has a specific role."""
        return role_code in self.role_codes

    @property
    def roles(self) -> list[str]:
        """Alias for role_codes."""
        return self.role_codes

    def is_super_admin(self) -> bool:
        """Check if user is Super Admin or Admin."""
        return "super_admin" in self.role_codes or "admin" in self.role_codes


async def get_current_user(
    credentials: Annotated[
        Optional[HTTPAuthorizationCredentials], Depends(security_scheme)
    ] = None,
) -> CurrentUser:
    """
    Extract and validate JWT from Authorization header.
    Raises 401 if token is missing or invalid.
    """
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required. Please login.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = credentials.credentials
    payload = verify_access_token(token)

    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token. Please login again.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return CurrentUser(
        user_id=int(payload["sub"]),
        role_codes=payload.get("roles", []),
        permissions=payload.get("permissions", []),
        jti=payload.get("jti", ""),
        full_name=payload.get("name", ""),
    )


AuthUser = Annotated[CurrentUser, Depends(get_current_user)]


async def get_optional_user(
    credentials: Annotated[
        Optional[HTTPAuthorizationCredentials], Depends(security_scheme)
    ] = None,
) -> Optional[CurrentUser]:
    """
    Optional auth — returns user if logged in, None otherwise.
    Use for endpoints that work both authenticated and unauthenticated.
    """
    if credentials is None:
        return None
    token = credentials.credentials
    payload = verify_access_token(token)
    if payload is None:
        return None
    return CurrentUser(
        user_id=int(payload["sub"]),
        role_codes=payload.get("roles", []),
        permissions=payload.get("permissions", []),
        jti=payload.get("jti", ""),
        full_name=payload.get("name", ""),
    )


def require_permission(*permissions: str):
    """
    Dependency factory — enforces that the user has at least one of the specified permissions.

    Usage:
        @router.get("/", dependencies=[Depends(require_permission("student.read"))])
        @router.post("/send", dependencies=[Depends(require_permission("communication.send", "communication.create"))])
    """
    async def permission_check(current_user: AuthUser) -> CurrentUser:
        if current_user.is_super_admin():
            return current_user
        for p in permissions:
            if current_user.has_permission(p):
                return current_user
        req_str = ", ".join(permissions)
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"You don't have permission to perform this action. Required: {req_str}",
        )

    return permission_check


def require_role(role_code: str):
    """
    Dependency factory — enforces a specific role.

    Usage:
        @router.get("/", dependencies=[Depends(require_role("principal"))])
    """
    async def role_check(current_user: AuthUser) -> CurrentUser:
        if not current_user.is_super_admin() and not current_user.has_role(role_code):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"This endpoint requires the '{role_code}' role.",
            )
        return current_user

    return role_check


def require_super_admin():
    """Enforce Super Admin access only."""
    async def super_admin_check(current_user: AuthUser) -> CurrentUser:
        if not current_user.is_super_admin():
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="This endpoint is restricted to Super Administrators only.",
            )
        return current_user

    return super_admin_check
