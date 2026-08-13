"""
VidyaSetu ERP — Device Security Schemas
=========================================
Pydantic schemas for device security request/response validation.
"""
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


# ── Inbound Device Context (sent with every login) ────────────

class DeviceContext(BaseModel):
    """
    Device metadata sent by the client with every login request.
    All fields are optional — backend uses what is available.
    Never contains IMEI, MAC address, or other hardware identifiers.
    """
    device_installation_id: Optional[str] = None   # High-entropy UUID
    device_type: Optional[str] = None               # web | android | ios
    platform: Optional[str] = None
    manufacturer: Optional[str] = None
    model: Optional[str] = None
    os_version: Optional[str] = None
    app_version: Optional[str] = None
    browser_name: Optional[str] = None
    browser_version: Optional[str] = None
    timezone: Optional[str] = None
    language: Optional[str] = None
    # Location — only when explicitly permitted by the user
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    location_accuracy: Optional[float] = None
    approximate_location: Optional[str] = None


# ── Verification Flow ─────────────────────────────────────────

class VerifyLoginRequest(BaseModel):
    """Submitted when user clicks 'Yes, This Is Me' in the email."""
    token: str = Field(..., min_length=32)


class RejectLoginRequest(BaseModel):
    """Submitted when user clicks 'No, This Wasn't Me' in the email."""
    token: str = Field(..., min_length=32)


# ── Device Management ─────────────────────────────────────────

class DeviceResponse(BaseModel):
    """A single device record returned to the frontend."""
    model_config = {"from_attributes": True}

    id: int
    uuid: str
    device_type: Optional[str] = None
    platform: Optional[str] = None
    manufacturer: Optional[str] = None
    model: Optional[str] = None
    os_version: Optional[str] = None
    browser_name: Optional[str] = None
    user_agent: Optional[str] = None
    is_primary: bool
    is_trusted: bool
    status: str
    first_seen_at: Optional[datetime] = None
    last_seen_at: Optional[datetime] = None
    trusted_at: Optional[datetime] = None
    display_name: str


class DeviceListResponse(BaseModel):
    """List of user's trusted devices."""
    devices: list[DeviceResponse]
    total: int


# ── Login Event ───────────────────────────────────────────────

class LoginEventResponse(BaseModel):
    """A single login event for display in the security log."""
    model_config = {"from_attributes": True}

    id: int
    uuid: str
    event_type: str
    status: Optional[str] = None
    ip_address: Optional[str] = None
    device_type: Optional[str] = None
    browser: Optional[str] = None
    os: Optional[str] = None
    approximate_location: Optional[str] = None
    risk_score: int
    failure_reason: Optional[str] = None
    verification_required: bool
    login_at: Optional[datetime] = None
    created_at: datetime


class SecurityEventListResponse(BaseModel):
    """Paginated login events."""
    events: list[LoginEventResponse]
    total: int
    page: int
    page_size: int


# ── Verification Pending Response ─────────────────────────────

class VerificationRequiredResponse(BaseModel):
    """
    Returned (HTTP 202) when login from unknown device.
    Does NOT contain session tokens.
    """
    status: str = "verification_required"
    requires_verification: bool = True
    login_attempt_id: str
    message: str = "New device detected. Please check your email to approve this login."
    device_info: Optional[dict] = None  # Safe subset for display


class VerificationSuccessResponse(BaseModel):
    """Returned after successful verification — contains full session."""
    status: str = "success"
    requires_verification: bool = False
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int
    user: dict


# ── Admin Security Dashboard ──────────────────────────────────

class AdminSecurityStats(BaseModel):
    total_events_today: int
    successful_logins_today: int
    failed_logins_today: int
    new_device_events_today: int
    suspicious_events_today: int
    verification_pending: int


class AdminLoginEventResponse(LoginEventResponse):
    """Extended event response for admin dashboard (includes user info)."""
    user_id: Optional[int] = None
    user_name: Optional[str] = None
