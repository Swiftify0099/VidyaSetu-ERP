"""
VidyaSetu ERP — FCM Module Schemas
=====================================
Pydantic request / response models for FCM token management endpoints.
"""
from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field, field_validator


# ═══════════════════════════════════════════════════════════════
# REQUEST SCHEMAS
# ═══════════════════════════════════════════════════════════════

class RegisterTokenRequest(BaseModel):
    """Request body for POST /api/v1/fcm/register"""

    fcm_token: str = Field(..., min_length=10, description="Firebase registration token")
    device_type: str = Field(default="web", description="web | android | ios")
    platform: Optional[str] = Field(default=None, description="OS platform string")
    browser: Optional[str] = Field(default=None, description="Browser name and version")
    os: Optional[str] = Field(default=None, description="Operating system")
    device_name: Optional[str] = Field(default=None, description="Human-readable device name")

    @field_validator("device_type")
    @classmethod
    def validate_device_type(cls, v: str) -> str:
        allowed = {"web", "android", "ios"}
        if v.lower() not in allowed:
            raise ValueError(f"device_type must be one of: {', '.join(allowed)}")
        return v.lower()


class UnregisterTokenRequest(BaseModel):
    """Request body for DELETE /api/v1/fcm/unregister"""

    fcm_token: str = Field(..., min_length=10, description="Firebase registration token to remove")


class SendNotificationRequest(BaseModel):
    """Shared payload for all admin send endpoints"""

    title: str = Field(..., min_length=1, max_length=200, description="Notification title")
    body: str = Field(..., min_length=1, max_length=1000, description="Notification body text")
    data: Optional[Dict[str, Any]] = Field(default=None, description="Extra key/value data payload")
    image_url: Optional[str] = Field(default=None, description="Optional image URL for rich notifications")


class SendToUsersRequest(SendNotificationRequest):
    """Request body for POST /api/v1/fcm/send/users (multi-user send)"""

    user_ids: List[int] = Field(..., min_length=1, description="List of user IDs to notify")


# ═══════════════════════════════════════════════════════════════
# RESPONSE SCHEMAS
# ═══════════════════════════════════════════════════════════════

class FCMTokenRecord(BaseModel):
    """Represents a single registered device token in API responses."""

    id: int
    uuid: str
    user_id: int
    device_type: str
    platform: Optional[str]
    browser: Optional[str]
    os: Optional[str]
    device_name: Optional[str]
    is_active: bool
    created_at: datetime
    updated_at: datetime
    last_used_at: Optional[datetime]

    # Expose only the first 20 chars of the token for security
    token_preview: str = Field(default="", description="Partial token for display only")

    model_config = {"from_attributes": True}

    @classmethod
    def from_model(cls, m: Any) -> "FCMTokenRecord":
        return cls(
            id=m.id,
            uuid=m.uuid,
            user_id=m.user_id,
            device_type=m.device_type,
            platform=m.platform,
            browser=m.browser,
            os=m.os,
            device_name=m.device_name,
            is_active=m.is_active,
            created_at=m.created_at,
            updated_at=m.updated_at,
            last_used_at=m.last_used_at,
            token_preview=m.fcm_token[:25] + "..." if m.fcm_token else "",
        )


class NotificationLogRecord(BaseModel):
    """Represents a notification delivery history record."""

    id: int
    uuid: str
    user_id: Optional[int]
    title: str
    body: str
    payload: Optional[str]
    fcm_token: Optional[str]
    topic: Optional[str]
    target_type: str
    delivery_status: str
    error_message: Optional[str]
    sent_at: datetime
    sent_by: Optional[int]
    created_at: datetime

    model_config = {"from_attributes": True}


class SendNotificationResponse(BaseModel):
    """Response after sending a push notification."""

    success_count: int = Field(description="Number of tokens notified successfully")
    failure_count: int = Field(description="Number of tokens that failed")
    invalid_tokens_removed: int = Field(description="Expired/invalid tokens auto-removed")
    message_id: Optional[str] = Field(default=None, description="FCM message ID (single sends)")
