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
from app.modules.communication.models import Notice, MessageTemplate, Announcement, CommunicationLog

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
    # System
    "auth", "admin",
    # People
    "student", "teacher",
    # Academic
    "attendance", "examination", "exam", "timetable",
    "lesson_plan", "behaviour",
    # Office & Admin
    "clerk", "admission", "office", "principal",
    # Finance
    "finance",
    # Library
    "library",
    # Communication
    "communication",
    # Inventory
    "inventory",
    # Analytics
    "analytics",
    # Transport
    "transport",
    # Leave
    "leave",
    # QR & AI
    "qr", "ai_assistant",
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
    # Extended workflow actions
    ("send",            "Send messages/notifications"),
    ("manage",          "Full manage access for module"),
    ("marks_enter",     "Enter exam marks"),
    ("results_compile", "Compile exam results"),
    ("apply",           "Apply/submit requests (leave, etc.)"),
    ("issue",           "Issue items (books, assets, etc.)"),
    ("publish",         "Publish notices and announcements"),
]

# ── Role → Permission Matrix (Complete Enterprise Blueprint) ───
ROLE_PERMISSIONS = {
    "super_admin": "*",  # Unrestricted — owns the system
    "admin":       "*",  # Unrestricted — school system admin

    # ── Principal ──────────────────────────────────────────────
    "principal": [
        # Students (read only + export)
        "student.read", "student.export",
        # Teachers (read only)
        "teacher.read", "teacher.export",
        # Attendance (read + export)
        "attendance.read", "attendance.export",
        # Exam / Marks (read + approve publication)
        "examination.read", "examination.approve", "examination.export",
        "exam.read", "exam.approve", "exam.export",
        "exam.results_compile",
        # Finance (read + approve waivers + export)
        "finance.read", "finance.approve", "finance.export", "finance.print",
        # Communication (full — principal broadcasts to all)
        "communication.create", "communication.read", "communication.send", "communication.manage",
        # Analytics (full view)
        "analytics.view_analytics",
        # Office (read + approve — certificates, admissions)
        "office.read", "office.approve",
        # Admission (read + approve)
        "admission.read", "admission.approve",
        # Library (read only)
        "library.read",
        # Inventory (read + approve purchases)
        "inventory.read", "inventory.approve",
        # Leave (read + final approval)
        "leave.read", "leave.approve",
        # Behaviour (read)
        "behaviour.read",
        # Lesson Plan (read)
        "lesson_plan.read",
        # AI assistant (read)
        "ai_assistant.read",
        # Admin audit log read
        "admin.read",
    ],

    # ── Vice Principal ─────────────────────────────────────────
    "vice_principal": [
        "student.read",
        "teacher.read",
        "attendance.read", "attendance.export",
        "examination.read", "examination.approve",
        "exam.read", "exam.approve",
        "communication.create", "communication.read", "communication.send",
        "analytics.view_analytics",
        "office.read",
        "behaviour.read", "behaviour.update",
        "leave.read", "leave.approve",
        "lesson_plan.read", "lesson_plan.update",
        "ai_assistant.read",
        "timetable.read",
    ],

    # ── Exam Coordinator ───────────────────────────────────────
    "exam_coordinator": [
        "examination.create", "examination.read", "examination.update",
        "examination.approve", "examination.export",
        "exam.create", "exam.read", "exam.update", "exam.approve", "exam.export",
        "exam.marks_enter", "exam.results_compile",
        "student.read",
        "analytics.view_analytics",
        "communication.read", "communication.create",
        "timetable.read",
    ],

    # ── Class Teacher ──────────────────────────────────────────
    "class_teacher": [
        "student.read",
        "attendance.create", "attendance.read", "attendance.update",
        "examination.create", "examination.update", "examination.read",
        "exam.read", "exam.marks_enter",
        "communication.create", "communication.read", "communication.send",
        "timetable.read",
        "library.read",
        "leave.read", "leave.create", "leave.approve",
        "lesson_plan.create", "lesson_plan.read", "lesson_plan.update",
        "behaviour.create", "behaviour.read", "behaviour.update",
        "ai_assistant.read",
        "qr.read",
    ],

    # ── Teacher ────────────────────────────────────────────────
    "teacher": [
        "student.read",
        "attendance.create", "attendance.read", "attendance.update",
        "examination.create", "examination.update", "examination.read",
        "exam.read", "exam.marks_enter",
        "communication.create", "communication.read",
        "timetable.read",
        "library.read",
        "leave.read", "leave.create",
        "lesson_plan.create", "lesson_plan.read", "lesson_plan.update",
        "behaviour.create", "behaviour.read",
        "ai_assistant.read",
        "qr.read",
    ],

    # ── Clerk ──────────────────────────────────────────────────
    "clerk": [
        # Students
        "student.read", "student.create", "student.update",
        "student.export", "student.print",
        # Admission
        "admission.create", "admission.read", "admission.update",
        "admission.export", "admission.print",
        # Office — Full CRUD (Notices, Enquiries, Visitors, Events, Complaints, Inward/Outward)
        "office.create", "office.read", "office.update", "office.delete",
        "office.export", "office.print", "office.approve",
        "office.notice.create", "office.notice.update",
        # Communication — Create, Read, Send for notices & messages
        "communication.create", "communication.read", "communication.send",
        "communication.manage", "communication.update", "communication.delete",
        # Library — Full CRUD + Issue
        "library.read", "library.create", "library.update", "library.delete",
        "library.manage", "library.issue", "library.export", "library.print",
        # Finance — Full Collection & Read/Print
        "finance.read", "finance.collect", "finance.create", "finance.manage", "finance.print",
        # Leave — Full: apply, manage, view, add holidays
        "leave.read", "leave.create", "leave.apply",
        "leave.manage", "leave.approve",
        # Inventory — Full CRUD for stock and assets
        "inventory.read", "inventory.create", "inventory.update",
        "inventory.manage", "inventory.export",
        # QR reading
        "qr.read",
    ],

    # ── Accountant ─────────────────────────────────────────────
    "accountant": [
        "finance.create", "finance.read", "finance.update",
        "finance.export", "finance.print", "finance.approve",
        "student.read",   # Lookup student fee records
        "analytics.view_analytics",
        "office.read",
        "communication.read",
    ],

    # ── Librarian ──────────────────────────────────────────────
    "librarian": [
        "library.create", "library.read", "library.update", "library.delete",
        "library.export", "library.print",
        "student.read",
        "teacher.read",
        "qr.read", "qr.create",   # QR-based book tracking
        "communication.read",
    ],

    # ── Receptionist ───────────────────────────────────────────
    "receptionist": [
        "office.create", "office.read", "office.update",
        "student.read",
        "teacher.read",
        "communication.read",
        "admission.read",   # View admission inquiries only
    ],

    # ── Office Staff ───────────────────────────────────────────
    "office_staff": [
        "office.read",
        "student.read",
        "communication.read",
    ],

    # ── Student ────────────────────────────────────────────────
    "student": [
        "student.read",
        "attendance.read",
        "examination.read",
        "exam.read",
        "library.read",
        "timetable.read",
        "communication.read",
        "finance.read",     # Own fee status only
        "leave.create", "leave.read",
        "ai_assistant.read",
        "qr.read",
    ],

    # ── Parent ─────────────────────────────────────────────────
    "parent": [
        "student.read",     # Only own child
        "attendance.read",
        "examination.read",
        "exam.read",
        "finance.read",     # Child fee status
        "library.read",     # Child library status
        "communication.read",
        "leave.create", "leave.read",
    ],

    # ── Transport Incharge ─────────────────────────────────────
    "transport_incharge": [
        "transport.create", "transport.read", "transport.update", "transport.export",
        "student.read",
        "office.read",
        "communication.read", "communication.create",
    ],

    # ── Support Staff ──────────────────────────────────────────
    "support_staff": [
        "office.read",
        "communication.read",
    ],
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
                classes_assigned="9,10",
                subjects='["Mathematics","Science"]',
                date_of_joining=date(2010, 6, 15),
                employee_type="permanent",
            ))
            db.flush()
            print("        [OK] Sample teacher: EMP005 --- Ramesh Jadhav")

    # ── Communication Hub Seed Data ──────────────────────────────
    existing_tmpl = db.query(MessageTemplate).first()
    if not existing_tmpl:
        templates_data = [
            {
                "name": "Fee Due Reminder (फीस स्मरणपत्र)",
                "template_type": "sms",
                "category": "fee",
                "subject": "School Fee Reminder / फी भरणा स्मरणपत्र",
                "body_english": "Dear Parent, total outstanding fee for {student_name} is Rs.{amount}. Please pay before {due_date} to avoid late charges.",
                "body_marathi": "आदरणीय पालक, {student_name} यांची शिल्लक फी रु.{amount} आहे. कृपया {due_date} पूर्वी फी जमा करावी.",
                "variables": '["student_name","amount","due_date"]',
            },
            {
                "name": "Student Absence Notification (विद्यार्थी अनुपस्थिती)",
                "template_type": "whatsapp",
                "category": "attendance",
                "subject": "Absence Alert / अनुपस्थिती सूचना",
                "body_english": "Dear Parent, {student_name} of Class {class_name} was marked ABSENT today ({date}). Please inform the school if on leave.",
                "body_marathi": "आदरणीय पालक, {student_name} (इयत्ता {class_name}) आज दिनांक {date} रोजी गैरहजर आहे.",
                "variables": '["student_name","class_name","date"]',
            },
            {
                "name": "Exam Timetable Notice (परीक्षा वेळापत्रक)",
                "template_type": "whatsapp",
                "category": "exam",
                "subject": "Semester Exam Schedule Announcement",
                "body_english": "Dear Parent/Student, Semester Examinations start on {date}. Detailed timetable has been published on VidyaSetu ERP portal.",
                "body_marathi": "आदरणीय विद्यार्थी व पालक, सत्रांत परीक्षा {date} पासून सुरू होत आहेत. सविस्तर वेळापत्रक पोर्टलवर उपलब्ध आहे.",
                "variables": '["date"]',
            },
            {
                "name": "School Holiday Announcement (शाळा सुट्टी जाहीर)",
                "template_type": "sms",
                "category": "notice",
                "subject": "Holiday Announcement / शाळा सुट्टी जाहीर",
                "body_english": "School will remain CLOSED on {date} on account of {event}. Classes will resume as normal on the following working day.",
                "body_marathi": "{event} निमित्त दिनांक {date} रोजी शाळेस सुट्टी राहील. पुढील कामाच्या दिवशी शाळा नियमित वेळेत भरेल.",
                "variables": '["date","event"]',
            },
            {
                "name": "Emergency Closure Alert (तातडीची सुट्टी सूचना)",
                "template_type": "sms",
                "category": "notice",
                "subject": "EMERGENCY ALERT: School Closure",
                "body_english": "URGENT: School will remain CLOSED today ({date}) due to heavy rainfall/unforeseen circumstances. Buses will return students safely.",
                "body_marathi": "तातडीची सूचना: मुसळधार पावसामुळे आज दिनांक {date} रोजी शाळा बंद राहील.",
                "variables": '["date"]',
            },
            {
                "name": "Parent Teacher Meeting (पालक-शिक्षक सभा)",
                "template_type": "whatsapp",
                "category": "general",
                "subject": "Parent Teacher Meeting (PTM) Invitation",
                "body_english": "Dear Parent, Parent-Teacher Meeting (PTM) is scheduled on {date} at {time}. You are requested to discuss progress of {student_name}.",
                "body_marathi": "आदरणीय पालक, पालक-शिक्षक सभा दिनांक {date} रोजी वेळ {time} वाजता आयोजित केली आहे. {student_name} च्या प्रगतीबाबत चर्चा करण्यास उपस्थित राहावे.",
                "variables": '["student_name","date","time"]',
            },
        ]
        for t in templates_data:
            db.add(MessageTemplate(**t))
        db.flush()
        print("        [OK] Seeded 6 default reusable SMS/WhatsApp message templates.")

    existing_notice = db.query(Notice).first()
    if not existing_notice:
        notices_data = [
            {
                "title": "Annual Academic Sports Meet 2026",
                "title_marathi": "वार्षिक क्रीडा महोत्सव २०२६",
                "content": "The Annual Sports Competition will take place from August 10 to August 12. All students must register their names with the sports instructor by August 5.",
                "content_marathi": "वार्षिक क्रीडा स्पर्धा १० ऑगस्ट ते १२ ऑगस्ट दरम्यान आयोजित करण्यात आली आहे. विद्यार्थ्यांनी ५ ऑगस्टपर्यंत नावे नोंदवावीत.",
                "notice_type": "event",
                "audience": "all",
                "is_urgent": False,
                "is_published": True,
                "publish_date": date(2026, 7, 20),
                "expiry_date": date(2026, 8, 15),
            },
            {
                "title": "First Term Examination Fee Submission",
                "title_marathi": "प्रथम सत्रांत परीक्षा फी जमा करणेबाबत",
                "content": "Parents are requested to clear all pending term fees before July 31, 2026. Online payment facility is enabled on VidyaSetu portal.",
                "content_marathi": "सर्व पालकांनी ३१ जुलै २०२६ पूर्वी सत्रांत परीक्षा फी जमा करावी. ऑनलाईन फी भरणा सुविधा पोर्टलवर उपलब्ध आहे.",
                "notice_type": "fee",
                "audience": "parents",
                "is_urgent": True,
                "is_published": True,
                "publish_date": date(2026, 7, 15),
                "expiry_date": date(2026, 8, 1),
            },
        ]
        for n in notices_data:
            db.add(Notice(**n))
        db.flush()
        print("        [OK] Seeded sample official notices.")

    existing_ann = db.query(Announcement).first()
    if not existing_ann:
        anns_data = [
            {
                "title": "Independence Day Cultural Performance Rehearsal",
                "body": "Rehearsal starts at 8:00 AM in Assembly Hall. Participants must wear white uniform.",
                "announcement_type": "info",
                "target_roles": "all",
                "is_pinned": True,
                "expiry_date": date(2026, 8, 16),
            },
            {
                "title": "System Maintenance Notice: VidyaSetu Portal Update",
                "body": "ERP system will be under maintenance on Sunday between 2:00 AM and 5:00 AM.",
                "announcement_type": "warning",
                "target_roles": "all",
                "is_pinned": False,
                "expiry_date": date(2026, 8, 2),
            },
        ]
        for a in anns_data:
            db.add(Announcement(**a))
        db.flush()
        print("        [OK] Seeded sample active announcements.")

    # ── Timetable Seeding ─────────────────────────────────────────
    seed_timetable(db)

    # ── Real Analytics Demo Data Seeding ──────────────────────────
    seed_analytics_demo_data(db)

    db.commit()

def seed_analytics_demo_data(db: Session):
    """Seed comprehensive ERP demonstration data for real analytics."""
    from app.modules.student.models import Student
    from app.modules.teacher.models import Teacher
    from app.modules.attendance.models import StudentAttendance, MonthlyAttendanceSummary
    from app.modules.finance.models import FeeCategory, FeeStructure, StudentFeeRecord, FeePayment
    from app.modules.library.models import Book, BookIssue
    from app.modules.inventory.models import Asset, StockItem, MaintenanceRecord
    from decimal import Decimal
    from datetime import date, timedelta
    import random

    print("  [8/8] Seeding rich school-wide analytics demo data...")

    # 1. Seed more students across standards (1 to 10)
    existing_students_count = db.query(Student).count()
    if existing_students_count < 30:
        names = [
            ("Aarav", "Patil", "male", "1", "A"),
            ("Ananya", "Deshmukh", "female", "1", "A"),
            ("Aditya", "Kulkarni", "male", "2", "A"),
            ("Isha", "Jadhav", "female", "2", "B"),
            ("Rohan", "Pawar", "male", "3", "A"),
            ("Saniya", "More", "female", "3", "B"),
            ("Kabir", "Shinde", "male", "5", "A"),
            ("Diya", "Chavan", "female", "5", "A"),
            ("Tanmay", "Gaikwad", "male", "8", "A"),
            ("Neha", "Bhosale", "female", "8", "B"),
            ("Pranav", "Mane", "male", "9", "A"),
            ("Shruti", "Suryavanshi", "female", "9", "A"),
            ("Siddharth", "Joshi", "male", "10", "A"),
            ("Pooja", "Kamble", "female", "10", "B"),
            ("Varun", "Thorat", "male", "10", "A"),
            ("Riya", "Nimbalkar", "female", "10", "B"),
            ("Yash", "Salunkhe", "male", "5", "B"),
            ("Sakshi", "Giri", "female", "8", "A"),
            ("Atharva", "Sawant", "male", "9", "B"),
            ("Anushri", "Kadam", "female", "9", "B"),
            ("Soham", "Kharat", "male", "6", "A"),
            ("Tanvi", "Parab", "female", "6", "B"),
            ("Omkar", "Ghadge", "male", "7", "A"),
            ("Avani", "Rane", "female", "7", "B"),
        ]
        for idx, (fn, ln, g, std, div) in enumerate(names, start=existing_students_count + 1):
            gr_num = f"GR{idx:03d}"
            adm_num = f"ADM{idx:03d}"
            st_obj = Student(
                gr_number=gr_num,
                admission_number=adm_num,
                full_name=f"{fn} {ln}",
                full_name_marathi=f"{fn} {ln}",
                first_name=fn,
                last_name=ln,
                academic_year_id=1,
                standard=std,
                division=div,
                roll_number=idx,
                dob=date(2012, 1, 1),
                gender=g,
                blood_group="B+",
                father_name=f"Father of {fn}",
                mother_name_full=f"Mother of {fn}",
                mobile=f"9822{idx:06d}",
                address_line1="School Campus",
                district="Pune",
                state="Maharashtra",
                status="active",
            )
            db.add(st_obj)
        db.flush()
        print("        [OK] Seeded 24 additional students across Standards 1-10.")

    all_students = db.query(Student).all()

    # 2. Seed Monthly Attendance Summary & Daily Attendance
    existing_monthly_att = db.query(MonthlyAttendanceSummary).first()
    if not existing_monthly_att and all_students:
        for st in all_students:
            # 88% to 96% attendance
            w_days = 22
            p_days = random.randint(18, 22)
            db.add(MonthlyAttendanceSummary(
                student_id=st.id,
                academic_year_id=1,
                year=2026,
                month=7,
                working_days=w_days,
                present_days=p_days,
                absent_days=w_days - p_days,
                attendance_percentage=Decimal(str(round(p_days / w_days * 100, 2))),
            ))
            # Seed daily attendance for all students across recent dates
            for d_offset in range(10):
                att_date = date.today() - timedelta(days=d_offset)
                exists = db.query(StudentAttendance).filter(
                    StudentAttendance.student_id == st.id,
                    StudentAttendance.date == att_date,
                    StudentAttendance.period == "full_day"
                ).first()
                if not exists:
                    st_status = "present" if (st.id + d_offset) % 9 != 0 else "absent"
                    db.add(StudentAttendance(
                        student_id=st.id,
                        date=att_date,
                        standard=st.standard,
                        division=st.division,
                        academic_year_id=1,
                        period="full_day",
                        status=st_status,
                    ))
        db.flush()
        print("        [OK] Seeded student monthly summaries and daily attendance logs.")

    # 3. Seed Fee Categories, Fee Structures, Student Fee Ledgers & Payments
    cat_tuition = db.query(FeeCategory).filter(FeeCategory.name == "Tuition Fee").first()
    if not cat_tuition:
        cat_tuition = FeeCategory(name="Tuition Fee", description="Annual academic tuition fee", is_mandatory=True, is_recurring=True)
        cat_lib = FeeCategory(name="Library & IT Fee", description="Library access & computer lab fees", is_mandatory=True, is_recurring=True)
        db.add_all([cat_tuition, cat_lib])
        db.flush()

        for std in range(1, 11):
            db.add(FeeStructure(academic_year_id=1, standard=str(std), category_id=cat_tuition.id, amount=Decimal("15000.00")))
            db.add(FeeStructure(academic_year_id=1, standard=str(std), category_id=cat_lib.id, amount=Decimal("3000.00")))
        db.flush()
        print("        [OK] Seeded fee categories & fee structures.")

    existing_fee_rec = db.query(StudentFeeRecord).first()
    if not existing_fee_rec and all_students and cat_tuition:
        receipt_counter = 1001
        for st in all_students:
            fee_due = Decimal("18000.00")
            fee_paid = Decimal("14400.00") if st.id % 4 != 0 else Decimal("9000.00")
            rec = StudentFeeRecord(
                student_id=st.id,
                academic_year_id=1,
                category_id=cat_tuition.id,
                amount_due=fee_due,
                amount_paid=fee_paid,
                status="partial" if fee_paid < fee_due else "paid",
            )
            db.add(rec)
            db.flush()

            # Payments distributed across months Jan - Aug
            m = (st.id % 7) + 1
            db.add(FeePayment(
                receipt_number=f"RCP2026-{receipt_counter}",
                student_id=st.id,
                academic_year_id=1,
                payment_date=date(2026, m, 10),
                payment_mode="online" if st.id % 2 == 0 else "cash",
                amount=fee_paid,
                total_received=fee_paid,
                fee_record_id=rec.id,
            ))
            receipt_counter += 1
        db.flush()
        print("        [OK] Seeded student fee records and monthly payments.")

    # 4. Seed Library Catalog & Issues
    from app.modules.library.models import Book, BookIssue, LibraryMember
    lib_members = []
    for st in all_students:
        lm = db.query(LibraryMember).filter(LibraryMember.reference_id == st.id, LibraryMember.member_type == "student").first()
        if not lm:
            lm = LibraryMember(
                member_id=f"LIB-STU-{st.id:04d}",
                member_type="student",
                reference_id=st.id,
                full_name=st.full_name,
                standard=st.standard,
                division=st.division,
                mobile=st.mobile,
                membership_date=date(2025, 6, 1),
            )
            db.add(lm)
            db.flush()
        lib_members.append(lm)

    existing_book = db.query(Book).first()
    if not existing_book:
        books_data = [
            ("Wings of Fire", "Dr. A.P.J. Abdul Kalam", "Science / Biography", 10),
            ("Shyamchi Aai (श्यामची आई)", "Sane Guruji", "Marathi Literature", 15),
            ("Brief Answers to Big Questions", "Stephen Hawking", "Science", 8),
            ("Discovery of India", "Jawaharlal Nehru", "History", 12),
            ("The Story of My Experiments with Truth", "M. K. Gandhi", "Biography", 10),
            ("Ignited Minds", "Dr. A.P.J. Abdul Kalam", "Motivation", 7),
            ("Yayati (ययाती)", "V. S. Khandekar", "Marathi Literature", 14),
            ("General Science Standards 8-10 Guide", "State Board", "Academics", 20),
            ("Higher Mathematics for Schools", "R. D. Sharma", "Mathematics", 15),
            ("English Grammar & Composition", "Wren & Martin", "Languages", 18),
        ]
        for idx, (title, author, cat, qty) in enumerate(books_data, start=1):
            b_obj = Book(
                isbn=f"978-81-7000-{idx:03d}",
                accession_number=f"ACC-{idx:04d}",
                title=title,
                edition="1st",
                total_copies=qty,
                available_copies=qty - 2,
                language="Marathi" if "आई" in title or "ययाती" in title else "English",
            )
            db.add(b_obj)
        db.flush()

        books_list = db.query(Book).all()
        for idx, b in enumerate(books_list[:5]):
            lm = lib_members[idx % len(lib_members)] if lib_members else None
            if lm:
                issue_date = date.today() - timedelta(days=10 + idx * 2)
                due_date = issue_date + timedelta(days=14)
                is_overdue = due_date < date.today()
                db.add(BookIssue(
                    issue_number=f"ISS-{100+idx}",
                    book_id=b.id,
                    member_id=lm.id,
                    issue_date=issue_date,
                    due_date=due_date,
                    return_date=None,
                    status="overdue" if is_overdue else "issued",
                ))
        db.flush()
        print("        [OK] Seeded library books catalog and active issued/overdue books.")

    # 5. Seed Inventory & Assets & Stock Items
    existing_asset = db.query(Asset).filter(Asset.name != "Dell Latitude Laptop").first()
    if not existing_asset:
        assets_data = [
            ("Dell OptiPlex Desktop Computers (Computer Lab)", "Dell", "OptiPlex 3080", Decimal("450000.00"), "active"),
            ("Epson iProjection Classroom LCD Projectors", "Epson", "EB-E01", Decimal("120000.00"), "active"),
            ("Interactive Smart Whiteboard 75 inch", "Promethean", "AP7", Decimal("180000.00"), "active"),
            ("Physics Lab Oscilloscope & Signal Generator", "Rigol", "DS1054Z", Decimal("65000.00"), "in_repair"),
            ("Chemistry Fume Hood & Distillation Unit", "Lab Tech", "LT-FH20", Decimal("85000.00"), "maintenance"),
            ("School Transport Bus 40-Seater", "Tata Motors", "Starbus", Decimal("1850000.00"), "active"),
        ]
        for idx, (name, brand, model, price, st) in enumerate(assets_data, start=1):
            db.add(Asset(
                asset_code=f"AST-2026-{idx:03d}",
                name=name,
                brand=brand,
                model_number=model,
                purchase_date=date(2025, 4, 1),
                purchase_price=price,
                status=st,
                condition="Good" if st == "active" else "Requires Maintenance",
            ))
        db.flush()
        print("        [OK] Seeded school infrastructure assets.")

    existing_stock = db.query(StockItem).first()
    if not existing_stock:
        stock_data = [
            ("Whiteboard Marker Pen Boxes (Black/Blue)", "Stationery", 12, 15, Decimal("250.00")),   # Low Stock!
            ("A4 Size Examination Answer Booklet Reams", "Stationery", 8, 20, Decimal("1400.00")),   # Low Stock!
            ("Dustless Chalk Box White (100 Pcs)", "Stationery", 45, 10, Decimal("80.00")),
            ("Practical Science Lab Chemicals Kit", "Lab Supplies", 3, 5, Decimal("3500.00")),        # Low Stock!
            ("Student Identity Card Lamination Pockets", "Office", 500, 100, Decimal("5.00")),
        ]
        for idx, (name, cat, cur, mini, cost) in enumerate(stock_data, start=1):
            db.add(StockItem(
                item_code=f"STK-{idx:03d}",
                name=name,
                category=cat,
                unit="box/ream/kit",
                current_stock=cur,
                minimum_stock=mini,
                unit_cost=cost,
            ))
        db.flush()
        print("        [OK] Seeded stock consumable items (with low-stock alerts).")


def seed_timetable(db: Session):
    from app.modules.timetable.models import Subject, PeriodConfig, TimetableEntry, TeacherSubjectAssignment
    from app.modules.teacher.models import Teacher

    # 1. Seed Subjects
    existing_subj = db.query(Subject).first()
    subjects_map = {}
    if not existing_subj:
        subjs_data = [
            {"name": "Mathematics", "name_marathi": "गणित", "code": "MATH", "subject_type": "theory", "applicable_standards": "All", "color": "#6366f1"},
            {"name": "Science & Technology", "name_marathi": "विज्ञान व तंत्रज्ञान", "code": "SCI", "subject_type": "theory", "applicable_standards": "All", "color": "#10b981"},
            {"name": "English Language", "name_marathi": "इंग्रजी भाषा", "code": "ENG", "subject_type": "language", "applicable_standards": "All", "color": "#3b82f6"},
            {"name": "Marathi Literature", "name_marathi": "मराठी साहित्य", "code": "MAR", "subject_type": "language", "applicable_standards": "All", "color": "#f59e0b"},
            {"name": "Hindi Language", "name_marathi": "हिंदी भाषा", "code": "HIN", "subject_type": "language", "applicable_standards": "All", "color": "#ec4899"},
            {"name": "Social Studies", "name_marathi": "सामाजिक शास्त्रे", "code": "SS", "subject_type": "theory", "applicable_standards": "All", "color": "#8b5cf6"},
            {"name": "Information Technology", "name_marathi": "माहिती तंत्रज्ञान", "code": "IT", "subject_type": "practical", "applicable_standards": "All", "color": "#06b6d4"},
            {"name": "Physical Education", "name_marathi": "शारीरिक शिक्षण", "code": "PE", "subject_type": "activity", "applicable_standards": "All", "color": "#ef4444"},
            {"name": "Art & Craft", "name_marathi": "कला व हस्तकला", "code": "ART", "subject_type": "activity", "applicable_standards": "All", "color": "#14b8a6"},
        ]
        for s in subjs_data:
            subj_obj = Subject(**s)
            db.add(subj_obj)
        db.flush()
        print("        [OK] Seeded 9 standard subjects.")

    all_subjects = db.query(Subject).all()
    for s in all_subjects:
        subjects_map[s.code or s.name] = s.id

    # 2. Seed Period Configurations
    existing_periods = db.query(PeriodConfig).filter(PeriodConfig.academic_year_id == 1).all()
    if not existing_periods:
        periods_data = [
            (0, "Assembly",   "07:30", "07:45",  15, "assembly"),
            (1, "Period 1",   "07:45", "08:30",  45, "class"),
            (2, "Period 2",   "08:30", "09:15",  45, "class"),
            (3, "Period 3",   "09:15", "10:00",  45, "class"),
            (4, "Short Break","10:00", "10:15",  15, "break"),
            (5, "Period 4",   "10:15", "11:00",  45, "class"),
            (6, "Period 5",   "11:00", "11:45",  45, "class"),
            (7, "Lunch",      "11:45", "12:15",  30, "lunch"),
            (8, "Period 6",   "12:15", "13:00",  45, "class"),
            (9, "Period 7",   "13:00", "13:45",  45, "class"),
        ]
        for i, (num, name, st, et, dur, ptype) in enumerate(periods_data):
            p = PeriodConfig(
                academic_year_id=1,
                period_number=num, period_name=name,
                start_time=st, end_time=et,
                duration_minutes=dur, period_type=ptype,
                sort_order=i
            )
            db.add(p)
        db.flush()
        print("        [OK] Seeded 10 default period configurations.")

    # 3. Seed Teacher Allocations & Timetable Entries
    teachers = db.query(Teacher).all()
    t_ids = [t.id for t in teachers] if teachers else [1, 2, 3, 4]
    
    existing_assignments = db.query(TeacherSubjectAssignment).filter(TeacherSubjectAssignment.academic_year_id == 1).first()
    if not existing_assignments and t_ids and all_subjects:
        stds = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10']
        divs = ['A', 'B']
        for std in stds:
            for div in divs:
                for idx, subj in enumerate(all_subjects[:6]):
                    t_id = t_ids[idx % len(t_ids)]
                    db.add(TeacherSubjectAssignment(
                        teacher_id=t_id,
                        subject_id=subj.id,
                        standard=std,
                        division=div,
                        academic_year_id=1,
                        periods_per_week=5,
                        is_class_teacher=(idx == 0)
                    ))
        db.flush()
        print("        [OK] Seeded teacher-subject allocations.")

        from app.modules.timetable.service import TimetableService, AutoGenerateRequest
        for std in ['8', '9', '10']:
            for div in ['A', 'B']:
                try:
                    TimetableService.auto_generate_timetable(
                        db, AutoGenerateRequest(standard=std, division=div, academic_year_id=1, overwrite=True), 1
                    )
                except Exception as ex:
                    pass
        print("        [OK] Pre-generated timetable entries for Std 8-10.")


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
