"""
Grant all communication permissions (read, create, send, publish, manage, update, delete)
to staff roles (principal, vice_principal, teacher, class_teacher, clerk, receptionist, office_staff).
"""
from sqlalchemy.orm import Session
from app.database.session import SessionLocal
from app.modules.auth.models import Permission, Role, RolePermission

STAFF_ROLES = ["principal", "vice_principal", "teacher", "class_teacher", "clerk", "receptionist", "office_staff", "admin", "super_admin"]
COMM_PERMISSIONS = [
    ("communication", "read", "View communication records"),
    ("communication", "create", "Create communication notices/templates"),
    ("communication", "send", "Send SMS, WhatsApp, Email, Firebase messages"),
    ("communication", "publish", "Publish official notices"),
    ("communication", "manage", "Manage communication hub"),
    ("communication", "update", "Update communication items"),
    ("communication", "delete", "Delete communication items"),
]

def update_permissions():
    db = SessionLocal()
    try:
        perm_map = {}
        for mod, act, desc in COMM_PERMISSIONS:
            code = f"{mod}.{act}"
            p = db.query(Permission).filter(Permission.code == code).first()
            if not p:
                p = Permission(module=mod, action=act, code=code, description=desc)
                db.add(p)
                db.flush()
            perm_map[code] = p

        for r_code in STAFF_ROLES:
            role = db.query(Role).filter(Role.code == r_code).first()
            if not role:
                continue
            
            for p_code, perm in perm_map.items():
                existing = db.query(RolePermission).filter(
                    RolePermission.role_id == role.id,
                    RolePermission.permission_id == perm.id
                ).first()
                if not existing:
                    db.add(RolePermission(role_id=role.id, permission_id=perm.id))
        
        db.commit()
        print("[OK] Granted communication permissions to all staff roles successfully!")
    finally:
        db.close()

if __name__ == "__main__":
    update_permissions()
