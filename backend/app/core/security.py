"""
VidyaSetu ERP — Security Module
================================
JWT token management, password hashing, token validation.
"""
import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional, Tuple

import bcrypt
import jwt
from jwt import InvalidTokenError as JWTError

from app.core.config import settings

# ── Password Hashing ──────────────────────────────────────────
def hash_password(password: str) -> str:
    """Hash a plain-text password using bcrypt with automatic 72-byte truncation."""
    pwd_bytes = password.encode("utf-8")[:72]
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(pwd_bytes, salt).decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a plain-text password against a hashed password."""
    try:
        pwd_bytes = plain_password.encode("utf-8")[:72]
        hash_bytes = hashed_password.encode("utf-8")
        return bcrypt.checkpw(pwd_bytes, hash_bytes)
    except Exception:
        return False


# ── JWT Token Management ──────────────────────────────────────
def create_access_token(
    user_id: int,
    role_codes: list[str],
    permissions: list[str],
    jti: Optional[str] = None,
    full_name: str = "",
) -> Tuple[str, str, datetime]:
    """
    Create a JWT access token.
    Returns: (token, jti, expires_at)
    """
    jti = jti or str(uuid.uuid4())
    expires_at = datetime.now(timezone.utc) + timedelta(
        minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
    )
    payload = {
        "sub": str(user_id),
        "jti": jti,
        "type": "access",
        "roles": role_codes,
        "permissions": permissions,
        "name": full_name,
        "exp": expires_at,
        "iat": datetime.now(timezone.utc),
    }
    token = jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)
    return token, jti, expires_at


def create_refresh_token(
    user_id: int,
    jti: Optional[str] = None,
) -> Tuple[str, str, datetime]:
    """
    Create a JWT refresh token.
    Returns: (token, jti, expires_at)
    """
    jti = jti or str(uuid.uuid4())
    expires_at = datetime.now(timezone.utc) + timedelta(
        days=settings.REFRESH_TOKEN_EXPIRE_DAYS
    )
    payload = {
        "sub": str(user_id),
        "jti": jti,
        "type": "refresh",
        "exp": expires_at,
        "iat": datetime.now(timezone.utc),
    }
    token = jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)
    return token, jti, expires_at


def decode_token(token: str) -> dict:
    """
    Decode and validate a JWT token.
    Raises JWTError if invalid or expired.
    """
    payload = jwt.decode(
        token,
        settings.JWT_SECRET_KEY,
        algorithms=[settings.JWT_ALGORITHM],
    )
    return payload


def verify_access_token(token: str) -> Optional[dict]:
    """
    Verify an access token and return payload.
    Returns None if invalid.
    """
    try:
        payload = decode_token(token)
        if payload.get("type") != "access":
            return None
        return payload
    except JWTError:
        return None


def verify_refresh_token(token: str) -> Optional[dict]:
    """
    Verify a refresh token and return payload.
    Returns None if invalid.
    """
    try:
        payload = decode_token(token)
        if payload.get("type") != "refresh":
            return None
        return payload
    except JWTError:
        return None


def validate_password_strength(password: str) -> Tuple[bool, str]:
    """
    Validate password meets minimum requirements.
    Returns: (is_valid, error_message)
    """
    if len(password) < settings.PASSWORD_MIN_LENGTH:
        return False, f"Password must be at least {settings.PASSWORD_MIN_LENGTH} characters."
    if not any(c.isupper() for c in password):
        return False, "Password must contain at least one uppercase letter."
    if not any(c.islower() for c in password):
        return False, "Password must contain at least one lowercase letter."
    if not any(c.isdigit() for c in password):
        return False, "Password must contain at least one number."
    if not any(c in "!@#$%^&*()_+-=[]{}|;:,.<>?" for c in password):
        return False, "Password must contain at least one special character."
    return True, ""
