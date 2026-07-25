"""
VidyaSetu ERP — Complete Database Seed
========================================
Seeds ALL 13 roles with demo users, permissions,
system settings, academic year, sample student, teacher.

Run from backend/ directory:
    python -m app.modules.seeds.seed
"""
from datetime import date, datetime, timezone
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import hash_password
from app.database.base import BaseModel
from app.database.session import SessionLocal, engine

# Import all models to ensure tables exist
import app.modules.auth.models
import app.modules.settings.models
import app.modules.student.models
import app.modules.teacher.models
import app.modules.office.models
import app.modules.finance.models
import app.modules.library.models
import app.modules.exam.models
import app.modules.attendance.models
import app.modules.timetable.models
import app.modules.communication.models
import app.modules.inventory.models
import app.modules.analytics.models
import app.modules.qr.models
import app.modules.ai.models
import app.shared.audit

from app.modules.auth.models import Permission, Role, RolePermission, User, UserRole
from app.modules.settings.models import AcademicYear, SystemSetting
from app.modules.student.models import Student
from app.modules.teacher.models import Teacher

# ── Roles ─────────────────────────────────────────────────────
DEFAULT_ROLES = [
    {"name": "Super Admin",        "code": "super_admin",       "color": "#DC2626", "is_system": True, "sort_order": 1},
    {"name": "Admin",              "code": "admin",             "color": "#B91C1C", "is_system": True, "sort_order": 2},
    {"name": "Principal",          "code": "principal",         "color": "#7C3AED", "is_system": True, "sort_order": 3},
    {"name": "Vice Principal",     "code": "vice_principal",    "color": "#6D28D9", "is_system": True, "sort_order": 4},
    {"name": "Teacher",            "code": "teacher",           "color": "#2563EB", "is_system": True, "sort_order": 5},
    {"name": "Class Teacher",      "code": "class_teacher",     "color": "#1D4ED8", "is_system": True, "sort_order": 6},
    {"name": "Clerk",              "code": "clerk",             "color": "#0891B2", "is_system": True, "sort_order": 7},
    {"name": "Accountant",         "code": "accountant",        "color": "#059669", "is_system": True, "sort_order": 8},
    {"name": "Librarian",          "code": "librarian",         "color": "#D97706", "is_system": True, "sort_order": 9},
    {"name": "Receptionist",       "code": "receptionist",      "color": "#EC4899", "is_system": True, "sort_order": 10},
    {"name": "Office Staff",       "code": "office_staff",      "color": "#6B7280", "is_system": True, "sort_order": 11},
    {"name": "Student",            "code": "student",           "color": "#10B981", "is_system": True, "sort_order": 12},
    {"name": "Parent",             "code": "parent",            "color": "#F59E0B", "is_system": True, "sort_order": 13},
    {"name": "Exam Coordinator",   "code": "exam_coordinator",  "color": "#8B5CF6", "is_system": True, "sort_order": 14},
    {"name": "Transport Incharge", "code": "transport_incharge","color": "#F97316", "is_system": True, "sort_order": 15},
    {"name": "Support Staff",      "code": "support_staff",     "color": "#9CA3AF", "is_system": True, "sort_order": 16},
]

# ── Permissions ───────────────────────────────────────────────
MODULES = [
    "auth", "student", "teacher", "clerk", "admission",
    "finance", "inventory", "office", "library", "principal",
    "admin", "communication", "analytics", "transport",
    "examination", "attendance", "timetable", "ai_assistant",
]
ACTIONS = [
    ("create",          "Create new records"),
    ("read",            "View records"),
    ("update",          "Edit existing records"),
    ("delete",          "Delete (soft) records"),
    ("approve",         "Approve pending items"),
    ("export",          "Export to PDF/Excel"),
    ("import",          "Import data"),
    ("print",           "Print documents"),
    ("download",        "Download files"),
    ("upload",          "Upload files"),
    ("view_analytics",  "View analytics and reports"),
    ("manage_settings", "Manage system settings"),
    ("manage_users",    "Manage users and roles"),
]

# Role → permission restrictions (what each role CAN do)
ROLE_PERMISSIONS = {
    "super_admin":    "*",   # all
    "admin":          "*",   # all
    "principal":      ["student.read","student.export","teacher.read","attendance.read",
                       "examination.read","examination.approve","finance.read","finance.export",
                       "communication.create","analytics.view_analytics","office.read","office.approve"],
    "vice_principal": ["student.read","teacher.read","attendance.read","examination.read",
                       "communication.create","analytics.view_analytics","office.read"],
    "teacher":        ["student.read","attendance.create","attendance.read","attendance.update",
                       "examination.create","examination.update","examination.read",
                       "communication.create","timetable.read","library.read"],
    "class_teacher":  ["student.read","attendance.create","attendance.read","attendance.update",
                       "examination.create","examination.update","examination.read",
                       "communication.create","timetable.read","library.read",
                       "admission.read"],
    "clerk":          ["student.read","student.create","student.update","admission.create",
                       "admission.read","admission.update","office.create","office.read",
                       "office.update","communication.create","library.read"],
    "accountant":     ["finance.create","finance.read","finance.update","finance.export",
                       "finance.print","student.read","analytics.view_analytics"],
    "librarian":      ["library.create","library.read","library.update","library.delete",
                       "library.export","student.read","teacher.read"],
    "receptionist":   ["office.create","office.read","student.read","teacher.read",
                       "communication.read"],
    "office_staff":   ["office.read","student.read","communication.read"],
    "student":        ["student.read","attendance.read","examination.read","library.read",
                       "timetable.read","communication.read","finance.read"],
    "parent":         ["student.read","attendance.read","examination.read","finance.read",
                       "communication.read"],
    "exam_coordinator": ["examination.create","examination.read","examination.update",
                         "examination.export","student.read","analytics.view_analytics"],
    "transport_incharge": ["student.read","office.read"],
    "support_staff":  ["office.read"],
}

# ── Demo Users ────────────────────────────────────────────────
DEMO_USERS = [
    {
        "username":    "superadmin",
        "password":    "SuperAdmin@2024!",
        "full_name":   "System Super Administrator",
        "mobile":      "9999000001",
        "employee_id": "EMP001",
        "role_code":   "super_admin",
        "must_change_password": False,
    },
    {
        "username":    "admin",
        "password":    "Admin@2024!",
        "full_name":   "School Admin",
        "mobile":      "9999000002",
        "employee_id": "EMP002",
        "role_code":   "admin",
        "must_change_password": False,
    },
    {
        "username":    "principal",
        "password":    "Principal@2024!",
        "full_name":   "Shri. Ramchandra Patil (Principal)",
        "mobile":      "9999000003",
        "employee_id": "EMP003",
        "role_code":   "principal",
        "must_change_password": False,
    },
    {
        "username":    "viceprincipal",
        "password":    "VicePrincipal@2024!",
        "full_name":   "Smt. Sunita Desai (Vice Principal)",
        "mobile":      "9999000004",
        "employee_id": "EMP004",
        "role_code":   "vice_principal",
        "must_change_password": False,
    },
    {
        "username":    "teacher1",
        "password":    "Teacher@2024!",
        "full_name":   "Shri. Ramesh Jadhav (Teacher - Math)",
        "mobile":      "9999000005",
        "employee_id": "EMP005",
        "role_code":   "teacher",
        "must_change_password": False,
    },
    {
        "username":    "classteacher1",
        "password":    "ClassTeacher@2024!",
        "full_name":   "Smt. Kavita Shinde (Class Teacher - 9A)",
        "mobile":      "9999000006",
        "employee_id": "EMP006",
        "role_code":   "class_teacher",
        "must_change_password": False,
    },
    {
        "username":    "clerk1",
        "password":    "Clerk@2024!",
        "full_name":   "Shri. Prakash More (Clerk)",
        "mobile":      "9999000007",
        "employee_id": "EMP007",
        "role_code":   "clerk",
        "must_change_password": False,
    },
    {
        "username":    "accountant",
        "password":    "Accounts@2024!",
        "full_name":   "Smt. Meera Kulkarni (Accountant)",
        "mobile":      "9999000008",
        "employee_id": "EMP008",
        "role_code":   "accountant",
        "must_change_password": False,
    },
    {
        "username":    "librarian",
        "password":    "Library@2024!",
        "full_name":   "Shri. Vijay Desai (Librarian)",
        "mobile":      "9999000009",
        "employee_id": "EMP009",
        "role_code":   "librarian",
        "must_change_password": False,
    },
    {
        "username":    "receptionist",
        "password":    "Reception@2024!",
        "full_name":   "Smt. Priya Pawar (Receptionist)",
        "mobile":      "9999000010",
        "employee_id": "EMP010",
        "role_code":   "receptionist",
        "must_change_password": False,
    },
    {
        "username":    "officestaff",
        "password":    "Office@2024!",
        "full_name":   "Shri. Suresh Kale (Office Staff)",
        "mobile":      "9999000011",
        "employee_id": "EMP011",
        "role_code":   "office_staff",
        "must_change_password": False,
    },
    {
        "username":    "student001",
        "password":    "Student@2024!",
        "full_name":   "Arjun Ramkumar Sharma",
        "mobile":      "9999000012",
        "gr_number":   "GR001",
        "role_code":   "student",
        "must_change_password": False,
    },
    {
        "username":    "parent001",
        "password":    "Parent@2024!",
        "full_name":   "Ramkumar Sharma (Parent of GR001)",
        "mobile":      "9999000013",
        "role_code":   "parent",
        "must_change_password": False,
    },
]

DEFAULT_SETTINGS = [
    {"key": "school.name",             "value": "Hindkesri Maruti Mane Vidyalay",    "category": "school",    "label": "School Name",             "is_public": True},
    {"key": "school.name_marathi",     "value": "हिंदकेसरी मारुती माने विद्यालय",      "category": "school",    "label": "School Name (Marathi)",   "is_public": True},
    {"key": "school.address",          "value": "Maharashtra, India",                 "category": "school",    "label": "School Address",          "is_public": True},
    {"key": "school.phone",            "value": "02362-000000",                       "category": "school",    "label": "School Phone",            "is_public": True},
    {"key": "school.email",            "value": "info@hmmv.edu.in",                  "category": "school",    "label": "School Email",            "is_public": True},
    {"key": "school.principal_name",   "value": "Shri. Ramchandra Patil",            "category": "school",    "label": "Principal Name",          "is_public": True},
    {"key": "school.current_academic_year", "value": "2025-2026",                    "category": "school",    "label": "Current Academic Year",   "is_public": True},
    {"key": "school.udise_code",       "value": "000000000000",                      "category": "school",    "label": "UDISE Code"},
    {"key": "school.medium",           "value": "Marathi",                            "category": "school",    "label": "Medium of Instruction",   "is_public": True},
    {"key": "school.board",            "value": "Maharashtra State Board",            "category": "school",    "label": "Board",                   "is_public": True},
    # Prefixes
    {"key": "prefix.receipt",          "value": "RCP",   "category": "prefix", "label": "Receipt Prefix"},
    {"key": "prefix.certificate",      "value": "CERT",  "category": "prefix", "label": "Certificate Prefix"},
    {"key": "prefix.gr_number",        "value": "GR",    "category": "prefix", "label": "GR Number Prefix"},
    {"key": "prefix.voucher",          "value": "VCH",   "category": "prefix", "label": "Voucher Prefix"},
    {"key": "prefix.admission",        "value": "ADM",   "category": "prefix", "label": "Admission Prefix"},
    {"key": "prefix.employee",         "value": "EMP",   "category": "prefix", "label": "Employee ID Prefix"},
    # App
    {"key": "app.default_language",    "value": "mr",      "category": "app", "label": "Default Language", "is_public": True},
    {"key": "app.default_theme",       "value": "light",   "category": "app", "label": "Default Theme",    "is_public": True},
    {"key": "app.timezone",            "value": "Asia/Kolkata", "category": "app", "label": "Timezone",    "is_public": True},
    {"key": "app.date_format",         "value": "DD/MM/YYYY",   "category": "app", "label": "Date Format", "is_public": True},
    # Security
    {"key": "security.max_login_attempts",       "value": "5",  "category": "security", "label": "Max Login Attempts"},
    {"key": "security.account_lock_duration",    "value": "15", "category": "security", "label": "Account Lock Duration (min)"},
    {"key": "security.session_timeout",          "value": "480","category": "security", "label": "Session Timeout (min)"},
    {"key": "security.password_min_length",      "value": "8",  "category": "security", "label": "Min Password Length"},
    # Library
    {"key": "library.max_books_per_student",  "value": "3",    "category": "library", "label": "Max Books Per Student"},
    {"key": "library.max_books_per_teacher",  "value": "5",    "category": "library", "label": "Max Books Per Teacher"},
    {"key": "library.fine_per_day",           "value": "1.00", "category": "library", "label": "Fine Per Day (₹)"},
    {"key": "library.loan_period_days",       "value": "14",   "category": "library", "label": "Default Loan Period (days)"},
    # Attendance
    {"key": "attendance.late_threshold_minutes", "value": "15", "category": "attendance", "label": "Late Arrival Threshold (min)"},
    {"key": "attendance.lock_after_days",        "value": "3",  "category": "attendance", "label": "Lock Attendance After Days"},
]


def seed_database(db: Session) -> None:
    """Seed all default data into the database."""
    print("\n=== VidyaSetu ERP --- Database Seeding Started ===")
    print("-" * 52)

    # ── Step 1: Roles ────────────────────────────────────────────
    print("  [1/7] Creating roles...")
    role_map: dict[str, Role] = {}
    for rd in DEFAULT_ROLES:
        existing = db.query(Role).filter(Role.code == rd["code"]).first()
        if not existing:
            role = Role(**rd)
            db.add(role)
            db.flush()
            role_map[rd["code"]] = role
            print(f"        [OK] {rd['name']}")
        else:
            role_map[rd["code"]] = existing
    print(f"        -> {len(DEFAULT_ROLES)} roles ready")

    # ── Step 2: Permissions ──────────────────────────────────────
    print("  [2/7] Creating permissions...")
    perm_map: dict[str, Permission] = {}
    for module in MODULES:
        for action, desc in ACTIONS:
            code = f"{module}.{action}"
            existing = db.query(Permission).filter(Permission.code == code).first()
            if not existing:
                perm = Permission(
                    module=module, action=action, code=code,
                    description=f"{desc} in {module.replace('_',' ').title()}",
                    category=module,
                )
                db.add(perm)
                db.flush()
                perm_map[code] = perm
            else:
                perm_map[code] = existing
    total_perms = len(MODULES) * len(ACTIONS)
    print(f"        -> {total_perms} permissions ready")

    # ── Step 3: Assign permissions to roles ───────────────────────
    print("  [3/7] Assigning role permissions...")
    for role_code, allowed in ROLE_PERMISSIONS.items():
        role = role_map.get(role_code)
        if not role:
            continue
        if allowed == "*":
            targets = list(perm_map.values())
        else:
            targets = [perm_map[c] for c in allowed if c in perm_map]

        for perm in targets:
            exists = db.query(RolePermission).filter(
                RolePermission.role_id == role.id,
                RolePermission.permission_id == perm.id,
            ).first()
            if not exists:
                db.add(RolePermission(
                    role_id=role.id,
                    permission_id=perm.id,
                    granted_at=datetime.now(timezone.utc),
                ))
    db.flush()
    print("        -> Role permissions assigned")

    # ── Step 4: Demo users ───────────────────────────────────────
    print("  [4/7] Creating demo users...")
    user_map: dict[str, User] = {}
    for ud in DEMO_USERS:
        existing = db.query(User).filter(
            (User.username == ud["username"]) |
            (User.mobile == ud.get("mobile"))
        ).first()
        if existing:
            user_map[ud["username"]] = existing
            print(f"        [SKIP] {ud['username']} (already exists)")
            continue

        user = User(
            username=ud["username"],
            password_hash=hash_password(ud["password"]),
            full_name=ud["full_name"],
            mobile=ud.get("mobile"),
            employee_id=ud.get("employee_id"),
            gr_number=ud.get("gr_number"),
            must_change_password=ud.get("must_change_password", False),
            preferred_language="mr",
        )
        db.add(user)
        db.flush()

        # Assign role
        role = role_map.get(ud["role_code"])
        if role:
            db.add(UserRole(
                user_id=user.id,
                role_id=role.id,
                assigned_at=datetime.now(timezone.utc),
            ))
            db.flush()

        user_map[ud["username"]] = user
        print(f"        [OK] {ud['username']} [{ud['role_code']}]")

    # ── Step 5: System settings ──────────────────────────────────
    print("  [5/7] Creating system settings...")
    for sd in DEFAULT_SETTINGS:
        if not db.query(SystemSetting).filter(SystemSetting.key == sd["key"]).first():
            db.add(SystemSetting(
                key=sd["key"], value=sd.get("value"),
                category=sd.get("category", "general"),
                label=sd.get("label"),
                data_type="string",
                is_public=sd.get("is_public", False),
            ))
    db.flush()
    print(f"        -> {len(DEFAULT_SETTINGS)} settings ready")

    # ── Step 6: Academic year ────────────────────────────────────
    print("  [6/7] Creating academic year...")
    year_name = "2025-2026"
    if not db.query(AcademicYear).filter(AcademicYear.name == year_name).first():
        db.add(AcademicYear(
            name=year_name, code="20252026",
            start_date=date(2025, 6, 1),
            end_date=date(2026, 5, 31),
            is_current=True, status="open",
        ))
        db.flush()
        print(f"        [OK] Academic year '{year_name}' created")
    else:
        print(f"        [EXISTS] Academic year '{year_name}' already exists")

    # ── Step 7: Sample student & teacher ─────────────────────────
    print("  [7/7] Creating sample student & teacher records...")

    # Get student001 user
    student_user = user_map.get("student001")
    if student_user:
        existing_student = db.query(Student).filter(Student.gr_number == "GR001").first()
        if not existing_student:
            academic_year = db.query(AcademicYear).filter(AcademicYear.is_current == True).first()
            db.add(Student(
                gr_number="GR001",
                admission_number="ADM001",
                user_id=student_user.id,
                full_name="Arjun Ramkumar Sharma",
                full_name_marathi="अर्जुन रामकुमार शर्मा",
                first_name="Arjun",
                middle_name="Ramkumar",
                last_name="Sharma",
                academic_year_id=academic_year.id if academic_year else None,
                standard="9",
                division="A",
                roll_number=1,
                dob=date(2010, 5, 15),
                gender="male",
                blood_group="O+",
                nationality="Indian",
                religion="Hindu",
                category="Open",
                father_name="Ramkumar Sharma",
                mother_name_full="Geeta Sharma",
                father_mobile="9999000012",
                mobile="9999000012",
                address_line1="123 Main Street",
                village="Pune",
                taluka="Haveli",
                district="Pune",
                state="Maharashtra",
                pincode="411001",
                admission_date=date(2023, 6, 1),
                status="active",
            ))
            db.flush()
            print("        [OK] Sample student: GR001 --- Arjun Sharma (Std 9A)")

    # Sample teacher
    teacher_user = user_map.get("teacher1")
    if teacher_user:
        existing_teacher = db.query(Teacher).filter(Teacher.employee_id == "EMP005").first()
        if not existing_teacher:
            db.add(Teacher(
                employee_id="EMP005",
                user_id=teacher_user.id,
                full_name="Shri. Ramesh Jadhav",
                full_name_marathi="श्री. रमेश जाधव",
                first_name="Ramesh",
                last_name="Jadhav",
                dob=date(1985, 3, 20),
                gender="male",
                mobile="9999000005",
                email="ramesh.jadhav@hmmv.edu.in",
                designation="Assistant Teacher",
                subjects='["Mathematics","Science"]',
                date_of_joining=date(2010, 6, 15),
                employee_type="permanent",
            ))
            db.flush()
            print("        [OK] Sample teacher: EMP005 --- Ramesh Jadhav")

    db.commit()

    # ── Summary ──────────────────────────────────────────────────
    print("\n" + "-" * 52)
    print("[DONE] Database seeded successfully!\n")
    print("Default Login Credentials")
    print("-" * 52)
    print(f"{'Role':<20} {'Username':<20} {'Password'}")
    print("-" * 52)
    creds = [
        ("Super Admin",    "superadmin",     "SuperAdmin@2024!"),
        ("Admin",          "admin",          "Admin@2024!"),
        ("Principal",      "principal",      "Principal@2024!"),
        ("Vice Principal", "viceprincipal",  "VicePrincipal@2024!"),
        ("Teacher",        "teacher1",       "Teacher@2024!"),
        ("Class Teacher",  "classteacher1",  "ClassTeacher@2024!"),
        ("Clerk",          "clerk1",         "Clerk@2024!"),
        ("Accountant",     "accountant",     "Accounts@2024!"),
        ("Librarian",      "librarian",      "Library@2024!"),
        ("Receptionist",   "receptionist",   "Reception@2024!"),
        ("Office Staff",   "officestaff",    "Office@2024!"),
        ("Student",        "student001",     "Student@2024!"),
        ("Parent",         "parent001",      "Parent@2024!"),
    ]
    for role, user, pwd in creds:
        print(f"  {role:<18} {user:<20} {pwd}")
    print("-" * 52)
    print("  IMPORTANT: Change all passwords after first login!\n")


if __name__ == "__main__":
    print("Creating database tables...")
    BaseModel.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        seed_database(db)
    finally:
        db.close()
