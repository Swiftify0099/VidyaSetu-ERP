"""
VidyaSetu ERP — Patch Clerk & Librarian Permissions
=====================================================
Run this to PATCH existing database permissions without losing any data.
This adds missing permissions to existing roles.

Run from backend/ directory:
    python -m app.modules.seeds.patch_permissions
"""
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from app.database.session import SessionLocal

from app.modules.auth.models import Permission, Role, RolePermission

# Permissions that clerk needs (in addition to what they may already have)
CLERK_ADDITIONAL_PERMISSIONS = [
    # Office full CRUD
    "office.delete", "office.approve",
    "office.notice.create", "office.notice.update",
    # Communication full
    "communication.send", "communication.manage",
    "communication.update", "communication.delete",
    "communication.publish",
    # Library full
    "library.create", "library.update", "library.delete",
    "library.manage", "library.issue", "library.export", "library.print",
    "library.apply",
    # Finance full collect & manage
    "finance.read", "finance.collect", "finance.create", "finance.manage", "finance.print",
    # Leave full
    "leave.create", "leave.apply", "leave.manage", "leave.approve",
    # Inventory full
    "inventory.read", "inventory.create", "inventory.update",
    "inventory.manage", "inventory.export",
    # QR
    "qr.read",
]

# New permissions to create if they don't exist
NEW_PERMISSIONS = [
    {"module": "leave",         "action": "apply",   "code": "leave.apply",          "description": "Apply for leave"},
    {"module": "library",       "action": "issue",   "code": "library.issue",         "description": "Issue books to members"},
    {"module": "communication", "action": "publish", "code": "communication.publish", "description": "Publish notices/announcements"},
    {"module": "library",       "action": "apply",   "code": "library.apply",         "description": "Library membership application"},
    # Finance special permissions
    {"module": "finance", "action": "collect", "code": "finance.collect", "description": "Collect student fees and issue receipts"},
    # Office special permissions
    {"module": "office",  "action": "notice.create", "code": "office.notice.create", "description": "Create office notices"},
    {"module": "office",  "action": "notice.update", "code": "office.notice.update", "description": "Update office notices"},
]


def patch_permissions(db: Session) -> None:
    print("\n=== VidyaSetu ERP — Patching Permissions ===")

    # Step 1: Ensure new permission codes exist
    print("\n[1] Creating missing permissions...")
    perm_map: dict[str, Permission] = {}

    # Load all existing permissions
    for p in db.query(Permission).all():
        perm_map[p.code] = p

    for np in NEW_PERMISSIONS:
        if np["code"] not in perm_map:
            perm = Permission(
                module=np["module"],
                action=np["action"],
                code=np["code"],
                description=np["description"],
                category=np["module"],
            )
            db.add(perm)
            db.flush()
            perm_map[np["code"]] = perm
            print(f"  [CREATED] {np['code']}")
        else:
            print(f"  [EXISTS]  {np['code']}")

    db.commit()

    # Step 2: Add permissions to clerk role
    print("\n[2] Patching clerk role permissions...")
    clerk_role = db.query(Role).filter(Role.code == "clerk").first()
    if not clerk_role:
        print("  [ERROR] clerk role not found!")
        return

    added = 0
    for perm_code in CLERK_ADDITIONAL_PERMISSIONS:
        perm = perm_map.get(perm_code)
        if not perm:
            # Try to fetch from DB again (might exist from seed but not in our map)
            perm = db.query(Permission).filter(Permission.code == perm_code).first()
        if not perm:
            print(f"  [SKIP] {perm_code} — permission not found in DB")
            continue
        exists = db.query(RolePermission).filter(
            RolePermission.role_id == clerk_role.id,
            RolePermission.permission_id == perm.id,
        ).first()
        if not exists:
            db.add(RolePermission(
                role_id=clerk_role.id,
                permission_id=perm.id,
                granted_at=datetime.now(timezone.utc),
            ))
            added += 1
            print(f"  [ADDED]  {perm_code} -> clerk")
        else:
            print(f"  [HAS]    {perm_code} -> clerk")

    # Step 3: Add library.issue to librarian
    print("\n[3] Patching librarian role permissions...")
    lib_role = db.query(Role).filter(Role.code == "librarian").first()
    if lib_role:
        for perm_code in ["library.issue", "library.apply", "library.manage"]:
            perm = perm_map.get(perm_code) or db.query(Permission).filter(Permission.code == perm_code).first()
            if perm:
                exists = db.query(RolePermission).filter(
                    RolePermission.role_id == lib_role.id,
                    RolePermission.permission_id == perm.id,
                ).first()
                if not exists:
                    db.add(RolePermission(role_id=lib_role.id, permission_id=perm.id, granted_at=datetime.now(timezone.utc)))
                    print(f"  [ADDED]  {perm_code} -> librarian")

    db.commit()
    print(f"\n[DONE] Permissions patched! Added {added} new permissions to clerk role.")
    print("=" * 44)


if __name__ == "__main__":
    db = SessionLocal()
    try:
        patch_permissions(db)
    finally:
        db.close()
