"""
VidyaSetu ERP — Auth API Routes
==================================
All authentication endpoints.
"""
from typing import Optional
from fastapi import APIRouter, Depends, Request, status, Query, HTTPException
from sqlalchemy.orm import Session

from app.core.dependencies import AuthUser, DBSession, get_current_user
from app.modules.auth.schemas import (
    ChangePasswordRequest,
    ForgotPasswordRequest,
    LoginRequest,
    RefreshTokenRequest,
    TokenResponse,
    UserMeResponse,
    SessionResponse,
)
from app.modules.auth.service import AuthService
from app.shared.responses import APIResponse

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/login", response_model=APIResponse, status_code=status.HTTP_200_OK)
async def login(
    body: LoginRequest,
    request: Request,
    db: DBSession,
):
    """
    Login with mobile / employee ID / GR number / username.
    Returns JWT access token + refresh token on success.
    Returns HTTP 202 with verification_required=true for new devices.
    """
    from fastapi.responses import JSONResponse
    try:
        token_data = AuthService.login(db, body, request)
        return APIResponse.ok(data=token_data.model_dump(), message="Login successful.")
    except HTTPException as exc:
        if exc.status_code == status.HTTP_202_ACCEPTED:
            # New device detected — return 202 with verification details
            return JSONResponse(
                status_code=202,
                content={
                    "success": True,
                    "message": "Verification required.",
                    "data": exc.detail,
                },
            )
        raise


@router.post("/refresh", response_model=APIResponse)
async def refresh_token(body: RefreshTokenRequest, db: DBSession):
    """Refresh access token using a valid refresh token."""
    token_data = AuthService.refresh_token(db, body.refresh_token)
    return APIResponse.ok(data=token_data.model_dump(), message="Token refreshed.")


@router.post("/logout", response_model=APIResponse)
async def logout(current_user: AuthUser, db: DBSession):
    """Logout current session."""
    AuthService.logout(db, current_user.jti, current_user.user_id)
    return APIResponse.ok(message="Logged out successfully.")


@router.post("/logout-all", response_model=APIResponse)
async def logout_all(current_user: AuthUser, db: DBSession):
    """Logout from all devices."""
    AuthService.logout_all(db, current_user.user_id)
    return APIResponse.ok(message="Logged out from all devices.")


@router.get("/me", response_model=APIResponse)
async def get_me(current_user: AuthUser, db: DBSession):
    """Get current user profile with permissions."""
    from sqlalchemy import select
    from sqlalchemy.orm import selectinload
    from app.modules.auth.models import User, UserRole, Role, RolePermission
    from app.modules.auth.service import AuthService

    user = db.scalar(
        select(User)
        .where(User.id == current_user.user_id)
        .where(User.is_deleted == False)
        .options(
            selectinload(User.user_roles)
            .selectinload(UserRole.role)
            .selectinload(Role.role_permissions)
            .selectinload(RolePermission.permission)
        )
    )
    if not user:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="User not found.")

    permissions = AuthService._build_user_permissions(user)
    user_data = AuthService._build_user_response(user, permissions)
    return APIResponse.ok(data=user_data.model_dump(), message="User profile retrieved.")


@router.post("/forgot-password", response_model=APIResponse)
async def forgot_password(body: ForgotPasswordRequest, db: DBSession):
    """
    Initiate password reset.
    In current version: returns a placeholder response.
    OTP via SMS = future feature.
    """
    # Future: Generate OTP, store in DB, send via SMS gateway
    return APIResponse.ok(
        message="If an account exists with this mobile number, a reset OTP has been sent. (SMS feature coming soon)"
    )


@router.patch("/change-password", response_model=APIResponse)
async def change_password(
    body: ChangePasswordRequest,
    current_user: AuthUser,
    db: DBSession,
):
    """Change password for authenticated user."""
    from sqlalchemy import select
    from app.modules.auth.models import User
    from app.core.security import verify_password, hash_password, validate_password_strength
    from datetime import datetime, timezone
    from app.shared.audit import AuditService

    user = db.scalar(select(User).where(User.id == current_user.user_id))
    if not user:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="User not found.")

    if not verify_password(body.current_password, user.password_hash):
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail="Current password is incorrect.")

    is_valid, error = validate_password_strength(body.new_password)
    if not is_valid:
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail=error)

    user.password_hash = hash_password(body.new_password)
    user.must_change_password = False
    user.password_changed_at = datetime.now(timezone.utc)
    user.updated_by = current_user.user_id

    AuditService.log(
        db, action="PASSWORD_CHANGED", module="auth",
        user_id=user.id, user_name=user.full_name,
        description="User changed their password.",
    )
    db.commit()

    return APIResponse.ok(message="Password changed successfully.")


# ════════════════════════════════════════════════════════════════
# ADMIN — User Management
# ════════════════════════════════════════════════════════════════

@router.get("/users", response_model=APIResponse)
async def list_users(
    current_user: AuthUser,
    db: DBSession,
    page: int = 1,
    page_size: int = 20,
    search: str = "",
    is_active: str = "",
):
    """List all system users. Super Admin / Admin only."""
    from fastapi import HTTPException
    from sqlalchemy import select, or_
    from sqlalchemy.orm import selectinload
    from app.modules.auth.models import User, UserRole, Role
    from app.core.dependencies import require_permission

    if not current_user.is_super_admin() and not current_user.has_permission("admin.manage_users"):
        raise HTTPException(403, "Admin access required.")

    q = select(User).where(User.is_deleted == False).options(
        selectinload(User.user_roles).selectinload(UserRole.role)
    )
    if search:
        term = f"%{search}%"
        q = q.where(or_(
            User.full_name.ilike(term),
            User.username.ilike(term),
            User.mobile.ilike(term),
            User.employee_id.ilike(term),
        ))
    if is_active == "true":
        q = q.where(User.is_active == True)
    elif is_active == "false":
        q = q.where(User.is_active == False)

    total = db.scalar(select(__import__('sqlalchemy', fromlist=['func']).func.count()).select_from(q.subquery()))
    offset = (page - 1) * page_size
    users = db.scalars(q.order_by(User.full_name).offset(offset).limit(page_size)).all()

    users_data = []
    for u in users:
        roles = [{"id": ur.role.id, "name": ur.role.name, "code": ur.role.code, "color": ur.role.color}
                 for ur in u.user_roles if ur.role]
        users_data.append({
            "id": u.id,
            "uuid": str(u.uuid),
            "username": u.username,
            "full_name": u.full_name,
            "mobile": u.mobile,
            "employee_id": u.employee_id,
            "email": u.email,
            "is_active": u.is_active,
            "is_locked": u.is_locked,
            "login_count": u.login_count or 0,
            "last_login": u.last_login.isoformat() if u.last_login else None,
            "must_change_password": u.must_change_password,
            "preferred_language": u.preferred_language,
            "roles": roles,
            "created_at": u.created_at.isoformat() if u.created_at else None,
        })

    from app.shared.responses import PaginatedResponse
    return APIResponse.ok(data=PaginatedResponse(
        items=users_data, total=total or 0, page=page,
        page_size=page_size, total_pages=((total or 0) + page_size - 1) // page_size,
    ).model_dump())


@router.post("/users", response_model=APIResponse, status_code=status.HTTP_201_CREATED)
async def create_user(
    body: dict,
    current_user: AuthUser,
    db: DBSession,
):
    """Create a new system user. Super Admin / Admin only."""
    from fastapi import HTTPException
    from sqlalchemy import select
    from app.modules.auth.models import User, UserRole, Role
    from app.core.security import hash_password, validate_password_strength
    from app.shared.audit import AuditService
    import uuid as _uuid

    if not current_user.is_super_admin() and not current_user.has_permission("admin.manage_users"):
        raise HTTPException(403, "Admin access required.")

    username = body.get("username", "").strip()
    password = body.get("password", "")
    full_name = body.get("full_name", "").strip()
    mobile = body.get("mobile", "").strip() or None
    employee_id = body.get("employee_id", "").strip() or None
    role_ids = body.get("role_ids", [])

    if not username or not password or not full_name:
        raise HTTPException(400, "username, password, full_name are required.")

    existing = db.scalar(select(User).where(User.username == username))
    if existing:
        raise HTTPException(400, f"Username '{username}' already exists.")

    is_valid, err = validate_password_strength(password)
    if not is_valid:
        raise HTTPException(400, err)

    user = User(
        username=username,
        password_hash=hash_password(password),
        full_name=full_name,
        mobile=mobile,
        employee_id=employee_id,
        preferred_language=body.get("preferred_language", "mr"),
        is_active=True,
        created_by=current_user.user_id,
    )
    db.add(user)
    db.flush()

    for role_id in role_ids:
        role = db.get(Role, role_id)
        if role:
            db.add(UserRole(user_id=user.id, role_id=role_id, assigned_by=current_user.user_id))

    AuditService.log(db, action="USER_CREATED", module="auth",
                     user_id=current_user.user_id, user_name=current_user.full_name,
                     description=f"Created user: {username}")
    db.commit()

    return APIResponse.ok(data={"id": user.id, "username": user.username}, message="User created successfully.")


@router.patch("/users/{user_id}", response_model=APIResponse)
async def update_user(
    user_id: int,
    body: dict,
    current_user: AuthUser,
    db: DBSession,
):
    """Update user status or details. Super Admin / Admin only."""
    from fastapi import HTTPException
    from sqlalchemy import select
    from app.modules.auth.models import User
    from app.shared.audit import AuditService

    if not current_user.is_super_admin() and not current_user.has_permission("admin.manage_users"):
        raise HTTPException(403, "Admin access required.")

    user = db.get(User, user_id)
    if not user or user.is_deleted:
        raise HTTPException(404, "User not found.")

    if "is_active" in body:
        user.is_active = bool(body["is_active"])
    if "is_locked" in body:
        user.is_locked = bool(body["is_locked"])
    if "full_name" in body:
        user.full_name = body["full_name"]
    if "mobile" in body:
        user.mobile = body["mobile"]
    if "preferred_language" in body:
        user.preferred_language = body["preferred_language"]

    user.updated_by = current_user.user_id
    AuditService.log(db, action="USER_UPDATED", module="auth",
                     user_id=current_user.user_id, user_name=current_user.full_name,
                     description=f"Updated user ID {user_id}")
    db.commit()
    return APIResponse.ok(message="User updated successfully.")


@router.post("/users/{user_id}/reset-password", response_model=APIResponse)
async def reset_user_password(
    user_id: int,
    body: dict,
    current_user: AuthUser,
    db: DBSession,
):
    """Reset user password. Super Admin / Admin only."""
    from fastapi import HTTPException
    from app.modules.auth.models import User
    from app.core.security import hash_password, validate_password_strength
    from app.shared.audit import AuditService
    from datetime import datetime, timezone

    if not current_user.is_super_admin() and not current_user.has_permission("admin.manage_users"):
        raise HTTPException(403, "Admin access required.")

    user = db.get(User, user_id)
    if not user or user.is_deleted:
        raise HTTPException(404, "User not found.")

    new_password = body.get("new_password", "Admin@2024!")
    is_valid, err = validate_password_strength(new_password)
    if not is_valid:
        raise HTTPException(400, err)

    user.password_hash = hash_password(new_password)
    user.must_change_password = True
    user.failed_login_attempts = 0
    user.is_locked = False
    user.password_changed_at = datetime.now(timezone.utc)
    user.updated_by = current_user.user_id

    AuditService.log(db, action="PASSWORD_RESET", module="auth",
                     user_id=current_user.user_id, user_name=current_user.full_name,
                     description=f"Reset password for user ID {user_id}")
    db.commit()
    return APIResponse.ok(message="Password reset successfully. User must change on next login.")


# ════════════════════════════════════════════════════════════════
# ADMIN — Role Management
# ════════════════════════════════════════════════════════════════

@router.get("/roles", response_model=APIResponse)
async def list_roles(current_user: AuthUser, db: DBSession):
    """List all roles."""
    from sqlalchemy import select
    from sqlalchemy.orm import selectinload
    from app.modules.auth.models import Role, RolePermission, Permission, UserRole

    roles = db.scalars(
        select(Role).where(Role.is_deleted == False)
        .options(selectinload(Role.role_permissions).selectinload(RolePermission.permission))
        .order_by(Role.sort_order)
    ).all()

    roles_data = []
    for r in roles:
        user_count = db.scalar(
            select(__import__('sqlalchemy', fromlist=['func']).func.count(UserRole.id))
            .where(UserRole.role_id == r.id)
        ) or 0
        perms = [rp.permission.code for rp in r.role_permissions if rp.permission]
        roles_data.append({
            "id": r.id,
            "name": r.name,
            "code": r.code,
            "color": r.color,
            "description": r.description,
            "is_system": r.is_system,
            "sort_order": r.sort_order,
            "user_count": user_count,
            "permissions": perms,
            "is_active": r.is_active,
        })

    return APIResponse.ok(data={"roles": roles_data, "total": len(roles_data)})


@router.get("/permissions", response_model=APIResponse)
async def list_permissions(current_user: AuthUser, db: DBSession):
    """List all permissions grouped by module."""
    from sqlalchemy import select
    from app.modules.auth.models import Permission

    if not current_user.is_super_admin() and not current_user.has_permission("admin.manage_users"):
        from fastapi import HTTPException
        raise HTTPException(403, "Admin access required.")

    perms = db.scalars(select(Permission).where(Permission.is_deleted == False).order_by(Permission.module, Permission.action)).all()
    by_module: dict = {}
    for p in perms:
        by_module.setdefault(p.module, []).append({
            "id": p.id, "code": p.code, "module": p.module,
            "action": p.action, "description": p.description,
        })

    return APIResponse.ok(data={"by_module": by_module, "total": len(perms)})


@router.get("/roles/{role_id}/permissions", response_model=APIResponse)
async def get_role_permissions(role_id: int, current_user: AuthUser, db: DBSession):
    """Get assigned permissions for a role."""
    from fastapi import HTTPException
    from sqlalchemy import select
    from sqlalchemy.orm import selectinload
    from app.modules.auth.models import Role, RolePermission, Permission

    role = db.scalar(
        select(Role)
        .where(Role.id == role_id, Role.is_deleted == False)
        .options(selectinload(Role.role_permissions).selectinload(RolePermission.permission))
    )
    if not role:
        raise HTTPException(404, "Role not found.")

    permissions = [
        {"id": rp.permission.id, "code": rp.permission.code, "module": rp.permission.module, "name": rp.permission.code}
        for rp in role.role_permissions if rp.permission
    ]
    return APIResponse.ok(data={"permissions": permissions, "role_id": role_id, "role_name": role.name})


@router.put("/roles/{role_id}/permissions", response_model=APIResponse)
async def set_role_permissions(
    role_id: int,
    body: dict,
    current_user: AuthUser,
    db: DBSession,
):
    """Set permissions for a role. Super Admin only."""
    from fastapi import HTTPException
    from sqlalchemy import select, delete
    from app.modules.auth.models import Role, Permission, RolePermission
    from app.shared.audit import AuditService

    if not current_user.is_super_admin():
        raise HTTPException(403, "Super Admin access required.")

    role = db.get(Role, role_id)
    if not role or role.is_deleted:
        raise HTTPException(404, "Role not found.")

    permission_ids = body.get("permission_ids")
    permission_codes = body.get("permission_codes")

    if permission_ids is None and permission_codes is not None:
        perms = db.scalars(select(Permission).where(Permission.code.in_(permission_codes))).all()
        permission_ids = [p.id for p in perms]
    elif permission_ids is None:
        permission_ids = []

    # Delete existing
    db.execute(delete(RolePermission).where(RolePermission.role_id == role_id))

    # Add new
    for perm_id in permission_ids:
        perm = db.get(Permission, perm_id)
        if perm:
            db.add(RolePermission(role_id=role_id, permission_id=perm_id))

    AuditService.log(db, action="ROLE_PERMISSIONS_UPDATED", module="auth",
                     user_id=current_user.user_id, user_name=current_user.full_name,
                     description=f"Updated permissions for role {role.name}")
    db.commit()
    return APIResponse.ok(message=f"Permissions updated for role '{role.name}'.")



@router.get("/my-permissions", response_model=APIResponse)
async def my_permissions(current_user: AuthUser, db: DBSession):
    """Get current user's full permission list."""
    from sqlalchemy import select
    from sqlalchemy.orm import selectinload
    from app.modules.auth.models import User, UserRole, Role, RolePermission

    user = db.scalar(
        select(User)
        .where(User.id == current_user.user_id)
        .options(
            selectinload(User.user_roles)
            .selectinload(UserRole.role)
            .selectinload(Role.role_permissions)
        )
    )
    if not user:
        from fastapi import HTTPException
        raise HTTPException(404, "User not found.")

    from app.modules.auth.service import AuthService
    permissions = AuthService._build_user_permissions(user)
    return APIResponse.ok(data={"permissions": list(permissions)})


# ════════════════════════════════════════════════════════════════
# ADMIN — System Audit Logs & Admin Endpoints
# ════════════════════════════════════════════════════════════════

admin_router = APIRouter(prefix="/admin", tags=["Admin System"])


@admin_router.get("/audit-logs", response_model=APIResponse)
async def list_audit_logs(
    current_user: AuthUser,
    db: DBSession,
    page: int = Query(1, ge=1),
    per_page: int = Query(30, ge=1, le=100),
    search: Optional[str] = None,
    action: Optional[str] = None,
    module: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
):
    """List system audit logs."""
    from sqlalchemy import select, func, or_
    from app.shared.audit import AuditLog
    from datetime import datetime, date

    q = select(AuditLog)
    if search:
        term = f"%{search}%"
        q = q.where(or_(
            AuditLog.description.ilike(term),
            AuditLog.user_name.ilike(term),
            AuditLog.module.ilike(term),
            AuditLog.action.ilike(term),
        ))
    if action:
        q = q.where(AuditLog.action == action.upper())
    if module:
        q = q.where(AuditLog.module == module.lower())

    total = db.scalar(select(func.count()).select_from(q.subquery())) or 0
    logs = db.scalars(q.order_by(AuditLog.created_at.desc()).offset((page - 1) * per_page).limit(per_page)).all()

    items = [
        {
            "id": l.id,
            "action": l.action,
            "module": l.module,
            "entity_type": l.entity_type or "",
            "entity_id": l.entity_id,
            "description": l.description or "",
            "user_id": l.user_id,
            "user_name": l.user_name or "System",
            "ip_address": l.ip_address,
            "created_at": l.created_at.isoformat() if l.created_at else "",
            "status": "success" if getattr(l, "status_code", 200) < 400 else "failed",
        }
        for l in logs
    ]

    now_date = date.today()
    total_today = db.scalar(select(func.count(AuditLog.id)).where(func.date(AuditLog.created_at) == now_date)) or 0
    logins_today = db.scalar(select(func.count(AuditLog.id)).where(func.date(AuditLog.created_at) == now_date, AuditLog.action == "LOGIN")) or 0

    stats = {
        "total_today": total_today,
        "logins_today": logins_today,
        "critical_actions": 0,
        "failed_actions": 0,
    }

    return APIResponse.ok(data={"logs": items, "total": total, "stats": stats})


# Alias routes under /admin for frontend backward compatibility
admin_router.add_api_route("/roles", list_roles, methods=["GET"], response_model=APIResponse)
admin_router.add_api_route("/permissions", list_permissions, methods=["GET"], response_model=APIResponse)
admin_router.add_api_route("/roles/{role_id}/permissions", get_role_permissions, methods=["GET"], response_model=APIResponse)
admin_router.add_api_route("/roles/{role_id}/permissions", set_role_permissions, methods=["PUT"], response_model=APIResponse)


