"""Add missing permissions to admin role"""
import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

from app.database.session import SessionLocal
from app.modules.auth.models import Role, Permission, RolePermission
from sqlalchemy import select

db = SessionLocal()

admin_role = db.scalar(select(Role).where(Role.code == 'admin'))
print(f'Admin role id: {admin_role.id}')

# Get existing admin permissions  
existing = set()
for rp in db.scalars(select(RolePermission).where(RolePermission.role_id == admin_role.id)).all():
    p = db.get(Permission, rp.permission_id)
    if p: existing.add(p.code)

print(f'Admin has {len(existing)} permissions')

# Add missing permissions
needed = [
    'leave.read', 'leave.create', 'leave.update', 'leave.approve', 'leave.delete', 'leave.export',
    'lesson_plan.read', 'lesson_plan.create', 'lesson_plan.update', 'lesson_plan.approve', 'lesson_plan.delete',
    'admin.manage_users', 'admin.manage_settings', 'admin.read', 'admin.create', 'admin.update', 'admin.delete',
    'ai_assistant.read', 'ai_assistant.create',
    'timetable.create', 'timetable.update', 'timetable.delete',
    'attendance.approve', 'attendance.export',
    'examination.approve', 'examination.export',
    'inventory.create', 'inventory.update', 'inventory.delete', 'inventory.read',
]
added = 0
for code in needed:
    if code not in existing:
        perm = db.scalar(select(Permission).where(Permission.code == code))
        if perm:
            db.add(RolePermission(role_id=admin_role.id, permission_id=perm.id))
            added += 1
            print(f'Added: {code}')
        else:
            parts = code.rsplit('.', 1)
            module, action = parts[0], parts[1]
            perm = Permission(module=module, action=action, code=code, description=f'{action} {module}')
            db.add(perm)
            db.flush()
            db.add(RolePermission(role_id=admin_role.id, permission_id=perm.id))
            added += 1
            print(f'Created+Added: {code}')

db.commit()
print(f'Done! Added {added} permissions to admin role.')
