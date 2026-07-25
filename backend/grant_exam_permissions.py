"""Grant exam permissions to all academic roles"""
import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

from app.database.session import SessionLocal
from app.modules.auth.models import Role, Permission, RolePermission
from sqlalchemy import select

db = SessionLocal()

roles = ['admin', 'principal', 'vice_principal', 'teacher', 'class_teacher']
exam_perms = [
    'exam.read',
    'exam.manage',
    'exam.marks.enter',
    'exam.results.compile'
]

# Ensure permissions exist in DB
for perm_code in exam_perms:
    parts = perm_code.rsplit('.', 1)
    module, action = parts[0], parts[1]
    p = db.scalar(select(Permission).where(Permission.code == perm_code))
    if not p:
        p = Permission(module=module, action=action, code=perm_code, description=f'{action} {module}')
        db.add(p)
        db.flush()
        print(f"Created permission: {perm_code}")

db.commit()

# Grant permissions to all target roles
for role_code in roles:
    role = db.scalar(select(Role).where(Role.code == role_code))
    if not role:
        print(f"Role not found: {role_code}")
        continue
    
    for perm_code in exam_perms:
        perm = db.scalar(select(Permission).where(Permission.code == perm_code))
        if not perm:
            continue
        
        rp = db.scalar(select(RolePermission).where(
            RolePermission.role_id == role.id,
            RolePermission.permission_id == perm.id
        ))
        if not rp:
            db.add(RolePermission(role_id=role.id, permission_id=perm.id))
            print(f"Granted {perm_code} to role {role_code}")

db.commit()
print("All exam permissions successfully assigned!")
