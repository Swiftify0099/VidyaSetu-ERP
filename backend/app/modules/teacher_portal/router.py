"""
VidyaSetu ERP — Teacher Portal API
=====================================
Self-service endpoints for teacher/class-teacher role.

GET  /api/v1/teacher-portal/me             → Profile + dashboard stats
GET  /api/v1/teacher-portal/timetable      → Today & weekly timetable
GET  /api/v1/teacher-portal/students       → Students of assigned classes
POST /api/v1/teacher-portal/attendance     → Submit class attendance
GET  /api/v1/teacher-portal/attendance     → View submitted attendance
GET  /api/v1/teacher-portal/notices        → School notices
GET  /api/v1/teacher-portal/leaves         → Leave history
POST /api/v1/teacher-portal/leaves         → Apply leave
"""
from datetime import date, datetime
from typing import List, Optional

from fastapi import APIRouter, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy import and_, func, select

from app.core.dependencies import AuthUser, DBSession
from app.modules.teacher.models import Teacher, TeacherLeave
from app.modules.student.models import Student
from app.modules.attendance.models import StudentAttendance, Holiday
from app.modules.timetable.models import TimetableEntry, PeriodConfig, Subject
from app.modules.settings.models import AcademicYear
from app.modules.communication.models import Notice
from app.shared.responses import APIResponse

router = APIRouter(prefix="/teacher-portal", tags=["Teacher Portal"])


# ── Helpers ───────────────────────────────────────────────────

def _get_teacher(db, current_user) -> Teacher:
    teacher = db.query(Teacher).filter(
        Teacher.user_id == current_user.user_id,
        Teacher.is_deleted == False,
    ).first()
    if not teacher:
        # Fallback for admin/staff testing accounts previewing teacher portal
        teacher = db.query(Teacher).filter(Teacher.is_deleted == False).first()
    if not teacher:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No teacher record found in database. Please seed or add a teacher.",
        )
    return teacher


def _get_current_year(db) -> Optional[AcademicYear]:
    return db.query(AcademicYear).filter(AcademicYear.is_current == True).first()


# ─────────────────────────────────────────────────────────────
# MY PROFILE + DASHBOARD STATS
# ─────────────────────────────────────────────────────────────

@router.get("/me", response_model=APIResponse)
def get_teacher_profile(current_user: AuthUser, db: DBSession):
    """Teacher profile with dashboard KPIs."""
    teacher = _get_teacher(db, current_user)
    ac_year = _get_current_year(db)

    # Get assigned classes list
    assigned_classes = [c.strip() for c in (teacher.classes_assigned or "").split(",") if c.strip()]
    assigned_subjects = [s.strip() for s in (teacher.subjects or "").split(",") if s.strip()]

    # Count students in assigned classes
    student_count = 0
    if assigned_classes and ac_year:
        student_count = db.query(func.count(Student.id)).filter(
            Student.standard.in_(assigned_classes),
            Student.is_active == True,
            Student.is_deleted == False,
        ).scalar() or 0

    # Today's date info
    today = date.today()
    today_day = today.strftime("%A").lower()  # monday, tuesday etc.

    # Today's timetable count
    today_periods = 0
    try:
        periods_today = db.query(Timetable).filter(
            Timetable.teacher_id == teacher.id,
            Timetable.day_of_week == today_day,
            Timetable.is_active == True,
        ).count()
        today_periods = periods_today
    except Exception:
        pass

    # Pending attendance (classes not marked today)
    attendance_marked_today = db.query(func.count(StudentAttendance.id)).filter(
        StudentAttendance.date == today,
        StudentAttendance.marked_by == teacher.user_id,
    ).scalar() or 0

    photo_url = None
    if teacher.photo_path:
        import os
        photo_url = f"/storage/{teacher.photo_path}"

    return APIResponse.ok(data={
        "teacher": {
            "id": teacher.id,
            "employee_id": teacher.employee_id,
            "full_name": teacher.full_name,
            "full_name_marathi": teacher.full_name_marathi,
            "designation": teacher.designation,
            "department": teacher.department,
            "subjects": assigned_subjects,
            "classes_assigned": assigned_classes,
            "photo_url": photo_url,
            "mobile": teacher.mobile,
            "email": teacher.email_personal or teacher.email_official,
            "date_of_joining": str(teacher.date_of_joining) if teacher.date_of_joining else None,
            "blood_group": teacher.blood_group,
        },
        "stats": {
            "assigned_classes": len(assigned_classes),
            "assigned_subjects": len(assigned_subjects),
            "total_students": student_count,
            "today_periods": today_periods,
            "attendance_marked_today": attendance_marked_today,
            "academic_year": ac_year.name if ac_year else "N/A",
        },
    })


# ─────────────────────────────────────────────────────────────
# TIMETABLE
# ─────────────────────────────────────────────────────────────

@router.get("/timetable", response_model=APIResponse)
def get_teacher_timetable(
    current_user: AuthUser,
    db: DBSession,
    day: Optional[str] = Query(None),
):
    """Get teacher's timetable. Optional ?day=monday filter."""
    teacher = _get_teacher(db, current_user)

    entries = db.query(TimetableEntry).filter(
        TimetableEntry.teacher_id == teacher.id,
        TimetableEntry.is_active == True,
    )
    if day:
        # day_of_week stored as int: 1=Mon..6=Sat
        day_map = {"monday":1,"tuesday":2,"wednesday":3,"thursday":4,"friday":5,"saturday":6,"sunday":0}
        day_int = day_map.get(day.lower())
        if day_int is not None:
            entries = entries.filter(TimetableEntry.day_of_week == day_int)

    entries = entries.order_by(TimetableEntry.day_of_week, TimetableEntry.period_id).all()

    # Fetch related period & subject data
    periods = {p.id: p for p in db.query(PeriodConfig).filter(PeriodConfig.is_active == True).all()}
    subjects = {s.id: s for s in db.query(Subject).filter(Subject.is_active == True).all()}

    day_map_r = {1:"monday",2:"tuesday",3:"wednesday",4:"thursday",5:"friday",6:"saturday",0:"sunday"}
    result = []
    for e in entries:
        period = periods.get(e.period_id)
        subject = subjects.get(e.subject_id)
        day_name = day_map_r.get(e.day_of_week, str(e.day_of_week))
        result.append({
            "id": e.id,
            "day": day_name,
            "standard": e.standard,
            "division": e.division,
            "period_number": period.period_number if period else None,
            "period_name": period.period_name if period else None,
            "start_time": period.start_time if period else None,
            "end_time": period.end_time if period else None,
            "subject_name": subject.name if subject else None,
            "subject_color": subject.color if subject else None,
            "room_number": e.room,
        })

    today_num = date.today().isoweekday() % 7 or 7  # Mon=1..Sat=6,Sun=0
    today_schedule = [r for r in result if day_map_r.get(today_num) == r["day"]]

    return APIResponse.ok(data={
        "today": today_schedule,
        "full_week": result,
    })


# ─────────────────────────────────────────────────────────────
# STUDENTS (Assigned classes)
# ─────────────────────────────────────────────────────────────

@router.get("/students", response_model=APIResponse)
def get_assigned_students(
    current_user: AuthUser,
    db: DBSession,
    standard: Optional[str] = Query(None),
    division: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
):
    """Get students in the teacher's assigned classes."""
    teacher = _get_teacher(db, current_user)
    assigned = [c.strip() for c in (teacher.classes_assigned or "").split(",") if c.strip()]

    if not assigned:
        return APIResponse.ok(data={"students": [], "total": 0})

    query = db.query(Student).filter(
        Student.standard.in_(assigned),
        Student.is_active == True,
        Student.is_deleted == False,
    )
    if standard:
        query = query.filter(Student.standard == standard)
    if division:
        query = query.filter(Student.division == division)
    if search:
        pattern = f"%{search}%"
        query = query.filter(
            Student.full_name.ilike(pattern) |
            Student.gr_number.ilike(pattern)
        )

    students = query.order_by(Student.standard, Student.division, Student.roll_number).all()

    return APIResponse.ok(data={
        "students": [
            {
                "id": s.id,
                "gr_number": s.gr_number,
                "full_name": s.full_name,
                "standard": s.standard,
                "division": s.division,
                "roll_number": s.roll_number,
                "gender": s.gender,
                "photo_url": f"/storage/{s.photo_path}" if s.photo_path else None,
            }
            for s in students
        ],
        "total": len(students),
    })


# ─────────────────────────────────────────────────────────────
# ATTENDANCE — Mark & View
# ─────────────────────────────────────────────────────────────

class AttendanceEntry(BaseModel):
    student_id: int
    status: str  # present / absent / late / leave
    remarks: Optional[str] = None


class AttendanceSubmitRequest(BaseModel):
    standard: str
    division: Optional[str] = None
    date: date
    period: str = "full_day"
    academic_year_id: int
    entries: List[AttendanceEntry]


@router.post("/attendance", response_model=APIResponse)
def submit_attendance(
    body: AttendanceSubmitRequest,
    current_user: AuthUser,
    db: DBSession,
):
    """Submit attendance for a class."""
    teacher = _get_teacher(db, current_user)
    assigned = [c.strip() for c in (teacher.classes_assigned or "").split(",") if c.strip()]

    if body.standard not in assigned:
        raise HTTPException(status_code=403, detail="You are not assigned to this class.")

    saved = 0
    for entry in body.entries:
        # Upsert attendance record
        existing = db.query(StudentAttendance).filter(
            StudentAttendance.student_id == entry.student_id,
            StudentAttendance.date == body.date,
            StudentAttendance.period == body.period,
        ).first()

        if existing:
            existing.status = entry.status
            existing.remarks = entry.remarks
            existing.marked_by = current_user.user_id
        else:
            att = StudentAttendance(
                student_id=entry.student_id,
                date=body.date,
                standard=body.standard,
                division=body.division,
                academic_year_id=body.academic_year_id,
                period=body.period,
                status=entry.status,
                remarks=entry.remarks,
                marked_by=current_user.user_id,
                created_by=current_user.user_id,
            )
            db.add(att)
        saved += 1

    db.commit()
    return APIResponse.ok(message=f"Attendance saved for {saved} students.")


@router.get("/attendance", response_model=APIResponse)
def get_class_attendance(
    current_user: AuthUser,
    db: DBSession,
    standard: str = Query(...),
    date_from: Optional[date] = Query(None),
    date_to: Optional[date] = Query(None),
    division: Optional[str] = Query(None),
):
    """Get attendance records for a class."""
    teacher = _get_teacher(db, current_user)
    assigned = [c.strip() for c in (teacher.classes_assigned or "").split(",") if c.strip()]
    if standard not in assigned:
        raise HTTPException(status_code=403, detail="Not assigned to this class.")

    query = db.query(StudentAttendance).filter(
        StudentAttendance.standard == standard,
    )
    if division:
        query = query.filter(StudentAttendance.division == division)
    if date_from:
        query = query.filter(StudentAttendance.date >= date_from)
    if date_to:
        query = query.filter(StudentAttendance.date <= date_to)

    records = query.order_by(StudentAttendance.date.desc()).limit(200).all()

    return APIResponse.ok(data={
        "records": [
            {
                "id": r.id,
                "student_id": r.student_id,
                "date": str(r.date),
                "period": r.period,
                "status": r.status,
                "remarks": r.remarks,
            }
            for r in records
        ],
        "total": len(records),
    })


# ─────────────────────────────────────────────────────────────
# LEAVES
# ─────────────────────────────────────────────────────────────

class LeaveApplyRequest(BaseModel):
    leave_type: str
    start_date: date
    end_date: date
    reason: str
    alternate_arrangement: Optional[str] = None


@router.get("/leaves", response_model=APIResponse)
def get_my_leaves(current_user: AuthUser, db: DBSession):
    """Get teacher's leave history."""
    teacher = _get_teacher(db, current_user)
    leaves = db.query(TeacherLeave).filter(
        TeacherLeave.teacher_id == teacher.id,
        TeacherLeave.is_deleted == False,
    ).order_by(TeacherLeave.created_at.desc()).limit(50).all()

    return APIResponse.ok(data={
        "leaves": [
            {
                "id": l.id,
                "leave_type": l.leave_type,
                "start_date": str(l.from_date),
                "end_date": str(l.to_date),
                "total_days": l.days,
                "reason": l.reason,
                "status": l.status,
                "principal_remarks": l.rejection_reason,
                "created_at": str(l.created_at),
            }
            for l in leaves
        ]
    })


@router.post("/leaves", response_model=APIResponse, status_code=201)
def apply_leave(
    body: LeaveApplyRequest,
    current_user: AuthUser,
    db: DBSession,
):
    """Apply for leave."""
    teacher = _get_teacher(db, current_user)

    total = (body.end_date - body.start_date).days + 1
    leave = TeacherLeave(
        teacher_id=teacher.id,
        leave_type=body.leave_type,
        from_date=body.start_date,
        to_date=body.end_date,
        days=total,
        reason=body.reason,
        alternate_arrangement=body.alternate_arrangement,
        status="pending",
        created_by=current_user.user_id,
    )
    db.add(leave)
    db.commit()
    return APIResponse.created(
        data={"id": leave.id},
        message="Leave application submitted.",
    )


# ─────────────────────────────────────────────────────────────
# NOTICES
# ─────────────────────────────────────────────────────────────

@router.get("/notices", response_model=APIResponse)
def get_notices(
    current_user: AuthUser,
    db: DBSession,
    limit: int = Query(20, le=50),
):
    """Get recent school notices."""
    today = date.today()
    notices = db.query(Notice).filter(
        Notice.is_active == True,
        Notice.is_deleted == False,
        Notice.is_published == True,
        Notice.publish_date <= today,
    ).order_by(Notice.publish_date.desc()).limit(limit).all()

    return APIResponse.ok(data={
        "notices": [
            {
                "id": n.id,
                "title": n.title,
                "content": n.content,
                "notice_type": n.notice_type,
                "is_urgent": n.is_urgent,
                "publish_date": str(n.publish_date),
                "expiry_date": str(n.expiry_date) if n.expiry_date else None,
                "attachment_path": n.attachment_path,
            }
            for n in notices
        ]
    })
