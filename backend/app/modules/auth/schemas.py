"""
VidyaSetu ERP — Auth Module Schemas
=======================================
Pydantic schemas for auth request/response validation.
"""
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr, field_validator


# ── Request Schemas ───────────────────────────────────────────

class LoginRequest(BaseModel):
    """Login with username (mobile / employee_id / gr_number)."""
    username: str
    password: str
    remember_me: bool = False
    device_name: Optional[str] = None

    @field_validator("username")
    @classmethod
    def username_not_empty(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Username cannot be empty.")
        return v.strip()


class RefreshTokenRequest(BaseModel):
    """Refresh access token using refresh token."""
    refresh_token: str


class ForgotPasswordRequest(BaseModel):
    """Initiate forgot password flow."""
    mobile: str

    @field_validator("mobile")
    @classmethod
    def validate_mobile(cls, v: str) -> str:
        from app.core.validators import validate_indian_phone
        validated = validate_indian_phone(v, required=True)
        return validated or v.strip()


class ResetPasswordRequest(BaseModel):
    """Reset password with OTP."""
    mobile: str
    otp: str
    new_password: str
    confirm_password: str

    @field_validator("mobile")
    @classmethod
    def validate_mobile(cls, v: str) -> str:
        from app.core.validators import validate_indian_phone
        validated = validate_indian_phone(v, required=True)
        return validated or v.strip()

    @field_validator("new_password")
    @classmethod
    def validate_new_pass(cls, v: str) -> str:
        if len(v.strip()) < 6:
            raise ValueError("Password must be at least 6 characters long.")
        if len(v) > 100:
            raise ValueError("Password cannot exceed 100 characters.")
        return v

    @field_validator("confirm_password")
    @classmethod
    def passwords_match(cls, v: str, info) -> str:
        if "new_password" in info.data and v != info.data["new_password"]:
            raise ValueError("Passwords do not match.")
        return v


class ChangePasswordRequest(BaseModel):
    """Change password (authenticated)."""
    current_password: str
    new_password: str
    confirm_password: str

    @field_validator("new_password")
    @classmethod
    def validate_new_pass(cls, v: str) -> str:
        if len(v.strip()) < 6:
            raise ValueError("New password must be at least 6 characters long.")
        if len(v) > 100:
            raise ValueError("New password cannot exceed 100 characters.")
        return v

    @field_validator("confirm_password")
    @classmethod
    def passwords_match(cls, v: str, info) -> str:
        if "new_password" in info.data and v != info.data["new_password"]:
            raise ValueError("Passwords do not match.")
        return v


# ── Response Schemas ──────────────────────────────────────────

class RoleResponse(BaseModel):
    """Role info in token/user response."""
    model_config = {"from_attributes": True}
    id: int
    name: str
    code: str
    color: Optional[str] = None


class UserMeResponse(BaseModel):
    """Current user info response (/auth/me)."""
    model_config = {"from_attributes": True}
    id: int
    uuid: str
    username: str
    full_name: str
    mobile: Optional[str] = None
    email: Optional[str] = None
    employee_id: Optional[str] = None
    gr_number: Optional[str] = None
    photo_path: Optional[str] = None
    preferred_language: str
    preferred_theme: str
    must_change_password: bool
    last_login: Optional[datetime] = None
    roles: list[RoleResponse] = []
    permissions: list[str] = []


class TokenResponse(BaseModel):
    """JWT token pair response."""
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int  # seconds
    user: UserMeResponse


class SessionResponse(BaseModel):
    """Active session info."""
    model_config = {"from_attributes": True}
    id: int
    device_name: Optional[str] = None
    browser: Optional[str] = None
    os: Optional[str] = None
    ip_address: Optional[str] = None
    logged_in_at: Optional[datetime] = None
    last_active_at: Optional[datetime] = None
    is_active: bool
