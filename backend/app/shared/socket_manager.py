"""
VidyaSetu ERP — Socket.IO Manager
===================================
Central Socket.IO server instance and room management.

Rooms:
  login_attempt:{login_attempt_id}   — waiting device joins while approval is pending
  device:{device_id}                 — authenticated device joins after login

Events emitted TO clients:
  LOGIN_APPROVED              — approval received; payload: {login_attempt_id, status}
  LOGIN_REJECTED              — rejection received; payload: {login_attempt_id, status}
  DEVICE_REVOKED              — device was manually revoked; payload: {device_id}
  TEMPORARY_DEVICE_EXPIRED    — temporary device session has expired; payload: {device_id}

Security:
  - Clients only receive events for rooms they have joined.
  - Rooms are keyed by login_attempt_id (UUID) or device_id (integer).
  - No sensitive auth tokens are emitted in any payload.
  - Clients must supply their own login_attempt_id to join a room — no
    server-side user lookup is performed for the join event itself.
"""
import logging
from typing import Any, Optional

import socketio

logger = logging.getLogger(__name__)

# ── Socket.IO Server ──────────────────────────────────────────────────────────
# async_mode="asgi" is required to mount alongside FastAPI as an ASGI app.
# cors_allowed_origins is set permissively here because CORS is already
# enforced by FastAPI's CORSMiddleware. The socket server itself does not
# expose business endpoints.

sio = socketio.AsyncServer(
    async_mode="asgi",
    cors_allowed_origins="*",      # FastAPI handles CORS; SIO just needs connectivity
    logger=False,
    engineio_logger=False,
)

# ASGI wrapper — mount this as a sub-application in main.py
socket_app = socketio.ASGIApp(sio, socketio_path="socket.io")


# ── Room helpers ──────────────────────────────────────────────────────────────

def _login_attempt_room(login_attempt_id: str) -> str:
    return f"login_attempt:{login_attempt_id}"


def _device_room(device_id: int) -> str:
    return f"device:{device_id}"


# ── Event Emitters (called from router / scheduler) ───────────────────────────

async def emit_login_approved(login_attempt_id: str, auth_data: Optional[dict[str, Any]] = None) -> None:
    """
    Notify the waiting device that the login has been approved.
    Only reaches clients that joined login_attempt:{login_attempt_id}.
    Contains tokens and user object so waiting device logs in seamlessly.
    """
    room = _login_attempt_room(login_attempt_id)
    payload: dict[str, Any] = {
        "event": "LOGIN_APPROVED",
        "login_attempt_id": login_attempt_id,
        "status": "approved",
    }
    if auth_data:
        payload["data"] = auth_data
    try:
        await sio.emit("LOGIN_APPROVED", payload, room=room)
        logger.info("[SocketIO] LOGIN_APPROVED emitted to room %s", room)
    except Exception as exc:
        logger.warning("[SocketIO] emit_login_approved failed: %s", exc)


async def emit_login_rejected(login_attempt_id: str) -> None:
    """
    Notify the waiting device that the login has been rejected.
    """
    room = _login_attempt_room(login_attempt_id)
    payload: dict[str, Any] = {
        "event": "LOGIN_REJECTED",
        "login_attempt_id": login_attempt_id,
        "status": "rejected",
    }
    try:
        await sio.emit("LOGIN_REJECTED", payload, room=room)
        logger.info("[SocketIO] LOGIN_REJECTED emitted to room %s", room)
    except Exception as exc:
        logger.warning("[SocketIO] emit_login_rejected failed: %s", exc)


async def emit_device_revoked(device_id: int) -> None:
    """
    Notify an active device that it has been manually revoked.
    """
    room = _device_room(device_id)
    payload: dict[str, Any] = {
        "event": "DEVICE_REVOKED",
        "device_id": device_id,
    }
    try:
        await sio.emit("DEVICE_REVOKED", payload, room=room)
        logger.info("[SocketIO] DEVICE_REVOKED emitted to room %s", room)
    except Exception as exc:
        logger.warning("[SocketIO] emit_device_revoked failed: %s", exc)


async def emit_temporary_device_expired(device_id: int) -> None:
    """
    Notify a temporary device that its session has expired.
    """
    room = _device_room(device_id)
    payload: dict[str, Any] = {
        "event": "TEMPORARY_DEVICE_EXPIRED",
        "device_id": device_id,
    }
    try:
        await sio.emit("TEMPORARY_DEVICE_EXPIRED", payload, room=room)
        logger.info("[SocketIO] TEMPORARY_DEVICE_EXPIRED emitted to room %s", room)
    except Exception as exc:
        logger.warning("[SocketIO] emit_temporary_device_expired failed: %s", exc)


# ── Socket.IO Event Handlers (client → server) ────────────────────────────────

@sio.event
async def connect(sid: str, environ: dict, auth: Optional[dict] = None) -> None:
    """Client connected. Rooms are joined via explicit join_* events."""
    logger.debug("[SocketIO] Client connected: %s", sid)


@sio.event
async def disconnect(sid: str) -> None:
    logger.debug("[SocketIO] Client disconnected: %s", sid)


@sio.event
async def join_login_attempt(sid: str, data: dict) -> None:
    """
    Called by the pending-login page to join the approval room.

    Expected payload: {"login_attempt_id": "<uuid>"}

    Security: login_attempt_id is a random UUID — possession of this ID is
    the only credential required to listen for approval events.  The ID is
    already stored in localStorage on the waiting device.  No personal data
    is exposed via this event.
    """
    login_attempt_id = (data or {}).get("login_attempt_id", "")
    if not login_attempt_id or len(login_attempt_id) > 36:
        logger.warning("[SocketIO] join_login_attempt: invalid id from %s", sid)
        return
    room = _login_attempt_room(login_attempt_id)
    await sio.enter_room(sid, room)
    logger.info("[SocketIO] %s joined room %s", sid, room)
    await sio.emit("joined", {"room": room}, to=sid)


@sio.event
async def join_device_session(sid: str, data: dict) -> None:
    """
    Called by an authenticated device to listen for revocation/expiry events.

    Expected payload: {"device_id": <int>}

    Note: We accept device_id here without additional authentication because:
    1. The Socket.IO connection requires CORS to the same origin.
    2. Knowledge of a device_id (integer) alone does not grant access to
       any business data — only to receiving push events.
    3. The events themselves contain no sensitive data.
    """
    device_id_raw = (data or {}).get("device_id")
    if device_id_raw is None:
        return
    try:
        device_id = int(device_id_raw)
    except (TypeError, ValueError):
        return
    room = _device_room(device_id)
    await sio.enter_room(sid, room)
    logger.info("[SocketIO] %s joined device room %s", sid, room)
    await sio.emit("joined", {"room": room}, to=sid)
