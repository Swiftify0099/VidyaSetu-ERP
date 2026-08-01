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
    if not assigned_classes:
        assigned_classes = ["9", "10"]

    assigned_subjects = [s.strip() for s in (teacher.subjects or "").split(",") if s.strip()]

    # Count students in assigned classes
    student_count = db.query(func.count(Student.id)).filter(
        Student.standard.in_(assigned_classes),
        Student.is_active == True,
        Student.is_deleted == False,
    ).scalar() or 0

    if student_count == 0:
        student_count = db.query(func.count(Student.id)).filter(
            Student.is_active == True,
            Student.is_deleted == False,
        ).scalar() or 0

    # Today's date info
    today = date.today()

    # Today's timetable count
    today_periods = 0
    try:
        periods_today = db.query(TimetableEntry).filter(
            TimetableEntry.teacher_id == teacher.id,
            TimetableEntry.is_active == True,
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
            "classes_assigned": ",".join(assigned_classes),
            "photo_url": photo_url,
            "mobile": teacher.mobile,
            "email": teacher.email,
            "date_of_joining": str(teacher.date_of_joining) if teacher.date_of_joining else None,
            "blood_group": teacher.blood_group,
        },
        "stats": {
            "assigned_classes": len(assigned_classes),
            "assigned_subjects": len(assigned_subjects),
            "total_students": student_count,
            "today_periods": today_periods,
            "attendance_marked_today": attendance_marked_today,
            "academic_year": ac_year.name if ac_year else "2025-26",
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
    ).order_by(TimetableEntry.day_of_week, TimetableEntry.period_id).all()

    # Fetch related period & subject data
    periods = {p.id: p for p in db.query(PeriodConfig).filter(PeriodConfig.is_active == True).all()}
    subjects = {s.id: s for s in db.query(Subject).filter(Subject.is_active == True).all()}

    DAYS = [
        (1, "Monday", "सोमवार"),
        (2, "Tuesday", "मंगळवार"),
        (3, "Wednesday", "बुधवार"),
        (4, "Thursday", "गुरुवार"),
        (5, "Friday", "शुक्रवार"),
        (6, "Saturday", "शनिवार"),
    ]

    full_week = []
    for day_num, day_en, day_mr in DAYS:
        day_entries = [e for e in entries if e.day_of_week == day_num]
        day_periods = []
        for e in day_entries:
            period = periods.get(e.period_id)
            subject = subjects.get(e.subject_id)
            day_periods.append({
                "id": e.id,
                "period_number": period.period_number if period else 1,
                "period_name": period.period_name if period else f"Period {e.period_id}",
                "start_time": period.start_time if period else "",
                "end_time": period.end_time if period else "",
                "subject": subject.name if subject else "General",
                "subject_name": subject.name if subject else "General",
                "standard": e.standard,
                "division": e.division or "A",
                "room": e.room or "Classroom",
            })
        full_week.append({
            "day": day_en.lower(),
            "day_en": day_en,
            "day_mr": day_mr,
            "day_num": day_num,
            "periods": day_periods,
        })

    today_num = date.today().isoweekday() % 7 or 7  # Mon=1..Sat=6,Sun=0
    today_match = next((w for w in full_week if w["day_num"] == today_num), None)
    today_schedule = today_match["periods"] if today_match else []

    return APIResponse.ok(data={
        "today": today_schedule,
        "full_week": full_week,
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

    query = db.query(Student).filter(
        Student.is_active == True,
        Student.is_deleted == False,
    )
    if standard:
        query = query.filter(Student.standard == standard)
    elif assigned:
        query = query.filter(Student.standard.in_(assigned))

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
    academic_year_id: Optional[int] = 1
    entries: Optional[List[AttendanceEntry]] = None
    records: Optional[List[AttendanceEntry]] = None


@router.post("/attendance", response_model=APIResponse)
def submit_attendance(
    body: AttendanceSubmitRequest,
    current_user: AuthUser,
    db: DBSession,
):
    """Submit attendance for a class."""
    attendance_items = body.entries or body.records or []
    if not attendance_items:
        raise HTTPException(status_code=400, detail="No attendance entries provided.")

    teacher = _get_teacher(db, current_user)
    saved = 0
    for entry in attendance_items:
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
                academic_year_id=body.academic_year_id or 1,
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


# ─────────────────────────────────────────────────────────────
# ASSESSMENTS / QUIZ CREATION — Teacher Portal
# ─────────────────────────────────────────────────────────────

# Import the shared assessment store from student_portal.router
from app.modules.student_portal.router import _ASSESSMENTS_STORE, _ASSESSMENT_RESULTS


class QuestionCreate(BaseModel):
    question: str
    options: List[str]
    correct_index: int
    marks: int = 1


class AssessmentCreate(BaseModel):
    title: str
    title_marathi: Optional[str] = None
    subject: str
    topic: Optional[str] = None
    class_standard: str
    division: Optional[str] = None
    duration_minutes: int = 15
    passing_marks: int
    instructions: Optional[str] = None
    start_date: str
    end_date: str
    questions: List[QuestionCreate]


@router.get("/assessments", response_model=APIResponse)
def get_teacher_assessments(current_user: AuthUser, db: DBSession):
    """List all assessments created by this teacher."""
    teacher = _get_teacher(db, current_user)
    teacher_assessments = [
        a for a in _ASSESSMENTS_STORE
        if a.get("created_by_teacher") == teacher.id or a.get("teacher") == teacher.full_name
    ]
    if not teacher_assessments:
        teacher_assessments = list(_ASSESSMENTS_STORE)

    result = []
    for asm in teacher_assessments:
        attempted_count = sum(1 for k in _ASSESSMENT_RESULTS if k.endswith(f":{asm['id']}"))
        scores = [v["percentage"] for k, v in _ASSESSMENT_RESULTS.items() if k.endswith(f":{asm['id']}")]
        avg_score = round(sum(scores) / len(scores), 1) if scores else 0

        result.append({
            "id": asm["id"],
            "title": asm["title"],
            "title_marathi": asm.get("title_marathi"),
            "subject": asm["subject"],
            "topic": asm.get("topic"),
            "class_standard": asm["class_standard"],
            "division": asm.get("division"),
            "total_questions": len(asm["questions"]),
            "total_marks": asm["total_marks"],
            "passing_marks": asm["passing_marks"],
            "duration_minutes": asm["duration_minutes"],
            "status": asm["status"],
            "start_date": asm["start_date"],
            "end_date": asm["end_date"],
            "attempted_count": attempted_count,
            "avg_score": avg_score,
            "created_at": asm.get("created_at"),
        })

    return APIResponse.ok(data={"assessments": result, "total": len(result)})


@router.post("/assessments", response_model=APIResponse, status_code=201)
def create_assessment(body: AssessmentCreate, current_user: AuthUser, db: DBSession):
    """Create a new assessment/quiz for a class."""
    teacher = _get_teacher(db, current_user)

    if not body.questions or len(body.questions) < 1:
        raise HTTPException(status_code=400, detail="At least 1 question is required.")

    total_marks = sum(q.marks for q in body.questions)
    new_id = max((a["id"] for a in _ASSESSMENTS_STORE), default=1000) + 1

    from datetime import datetime as _dt
    new_asm = {
        "id": new_id,
        "title": body.title,
        "title_marathi": body.title_marathi,
        "subject": body.subject,
        "topic": body.topic,
        "class_standard": body.class_standard,
        "division": body.division,
        "teacher": teacher.full_name,
        "created_by_teacher": teacher.id,
        "duration_minutes": body.duration_minutes,
        "total_marks": total_marks,
        "passing_marks": body.passing_marks,
        "instructions": body.instructions or "Select the correct option for each question.",
        "status": "active",
        "start_date": body.start_date,
        "end_date": body.end_date,
        "created_at": _dt.now().isoformat(),
        "questions": [
            {
                "id": i + 1,
                "question": q.question,
                "options": q.options,
                "correct_index": q.correct_index,
                "marks": q.marks,
            }
            for i, q in enumerate(body.questions)
        ],
    }
    _ASSESSMENTS_STORE.append(new_asm)

    return APIResponse.created(
        data={"id": new_id, "title": body.title, "total_marks": total_marks, "total_questions": len(body.questions)},
        message=f"Assessment '{body.title}' created successfully for Std {body.class_standard}!",
    )


@router.get("/assessments/{assessment_id}/results", response_model=APIResponse)
def get_assessment_results(assessment_id: int, current_user: AuthUser, db: DBSession):
    """Get all student results for a specific assessment."""
    teacher = _get_teacher(db, current_user)
    asm = next((a for a in _ASSESSMENTS_STORE if a["id"] == assessment_id), None)
    if not asm:
        raise HTTPException(status_code=404, detail="Assessment not found.")

    results = [
        v for k, v in _ASSESSMENT_RESULTS.items()
        if k.endswith(f":{assessment_id}")
    ]

    total_attempted = len(results)
    passed_count = sum(1 for r in results if r.get("passed"))
    avg_score = round(sum(r["percentage"] for r in results) / total_attempted, 1) if total_attempted > 0 else 0

    return APIResponse.ok(data={
        "assessment": {
            "id": asm["id"],
            "title": asm["title"],
            "subject": asm["subject"],
            "class_standard": asm["class_standard"],
            "total_marks": asm["total_marks"],
            "passing_marks": asm["passing_marks"],
        },
        "stats": {
            "total_attempted": total_attempted,
            "passed_count": passed_count,
            "failed_count": total_attempted - passed_count,
            "avg_score": avg_score,
        },
        "student_results": results,
    })


@router.delete("/assessments/{assessment_id}", response_model=APIResponse)
def delete_assessment(assessment_id: int, current_user: AuthUser, db: DBSession):
    """Deactivate/delete an assessment."""
    asm = next((a for a in _ASSESSMENTS_STORE if a["id"] == assessment_id), None)
    if not asm:
        raise HTTPException(status_code=404, detail="Assessment not found.")
    asm["status"] = "inactive"
    return APIResponse.ok(message=f"Assessment '{asm['title']}' has been deactivated.")


# ─────────────────────────────────────────────────────────────
# HOMEWORK & ASSIGNMENTS (Teacher Portal)
# ─────────────────────────────────────────────────────────────

from app.modules.student_portal.router import _HOMEWORK_STORE, _HOMEWORK_SUBMISSIONS


class TeacherHomeworkCreateRequest(BaseModel):
    standard: str
    division: Optional[str] = None
    subject: str
    title: str
    description: str
    due_date: str
    priority: Optional[str] = "Normal"
    max_marks: Optional[int] = 20
    instructions: Optional[str] = None
    attachment_url: Optional[str] = None


class HomeworkGradeRequest(BaseModel):
    student_id: int
    marks_obtained: float
    max_marks: Optional[float] = 20.0
    teacher_remarks: Optional[str] = None


@router.get("/homework", response_model=APIResponse)
def get_teacher_homework(current_user: AuthUser, db: DBSession):
    """Get all active homework created by or assigned to teacher's classes."""
    teacher = _get_teacher(db, current_user)
    items = [h for h in _HOMEWORK_STORE if h.get("is_active", True)]
    return APIResponse.ok(data={"homework": items, "total": len(items)})


@router.post("/homework", response_model=APIResponse, status_code=201)
def create_teacher_homework(body: TeacherHomeworkCreateRequest, current_user: AuthUser, db: DBSession):
    """Assign new homework to a class standard/division."""
    teacher = _get_teacher(db, current_user)
    new_id = max((h["id"] for h in _HOMEWORK_STORE), default=100) + 1
    
    new_hw = {
        "id": new_id,
        "standard": body.standard,
        "division": body.division or "A",
        "subject": body.subject,
        "title": body.title,
        "description": body.description,
        "instructions": body.instructions or "Submit working notebook solutions or typed answers.",
        "teacher": teacher.full_name,
        "teacher_id": teacher.id,
        "assigned_date": date.today().isoformat(),
        "due_date": body.due_date,
        "priority": body.priority or "Normal",
        "max_marks": body.max_marks or 20,
        "status": "pending",
        "attachment_url": body.attachment_url,
        "teacher_remarks": None,
        "submitted_at": None,
        "is_active": True,
        "created_at": datetime.now().isoformat(),
    }
    _HOMEWORK_STORE.insert(0, new_hw)

    # Push notification to students
    try:
        from app.shared.notifications import push_notification_to_role
        push_notification_to_role(
            db,
            role_code="student",
            category="homework",
            notification_type="homework.assigned",
            title=f"📚 New Homework: {body.title}",
            body=f"{body.subject} homework assigned by {teacher.full_name}. Due: {body.due_date}",
            priority="high",
            action_url="/student-portal/homework",
            sender_id=current_user.user_id,
        )
    except Exception as e:
        print("Failed to dispatch homework notification:", e)

    return APIResponse.created(
        data=new_hw,
        message=f"Homework '{body.title}' assigned successfully for Std {body.standard}{body.division or ''}!",
    )


@router.get("/homework/{homework_id}/submissions", response_model=APIResponse)
def get_homework_submissions(homework_id: int, current_user: AuthUser, db: DBSession):
    """Get all student submissions for a specific homework assignment."""
    teacher = _get_teacher(db, current_user)
    hw = next((h for h in _HOMEWORK_STORE if h["id"] == homework_id), None)
    if not hw:
        raise HTTPException(status_code=404, detail="Homework assignment not found.")

    subs = _HOMEWORK_SUBMISSIONS.get(homework_id, [])
    # Provide sample submissions if list is empty for demo/testing
    if not subs:
        subs = [
            {
                "id": 10,
                "homework_id": homework_id,
                "student_id": 101,
                "student_name": "Aarav Sharma",
                "gr_number": "GR-2024-001",
                "roll_number": "01",
                "submitted_at": "2026-07-25T10:15:00",
                "submission_text": "Completed all questions as requested. Step by step working included.",
                "attachment_url": "/downloads/math_ex3_2.pdf",
                "status": "submitted",
                "marks_obtained": None,
                "max_marks": hw.get("max_marks", 20),
                "teacher_remarks": None,
            },
            {
                "id": 11,
                "homework_id": homework_id,
                "student_id": 102,
                "student_name": "Ananya Kulkarni",
                "gr_number": "GR-2024-002",
                "roll_number": "02",
                "submitted_at": "2026-07-25T11:40:00",
                "submission_text": "Attached PDF with solution set and graph.",
                "attachment_url": "/downloads/solution_sheet.pdf",
                "status": "evaluated",
                "marks_obtained": 19.5,
                "max_marks": hw.get("max_marks", 20),
                "teacher_remarks": "Outstanding speed and accuracy!",
            },
            {
                "id": 12,
                "homework_id": homework_id,
                "student_id": 103,
                "student_name": "Rohan Patil",
                "gr_number": "GR-2024-003",
                "roll_number": "03",
                "submitted_at": None,
                "submission_text": None,
                "attachment_url": None,
                "status": "pending",
                "marks_obtained": None,
                "max_marks": hw.get("max_marks", 20),
                "teacher_remarks": None,
            }
        ]
        _HOMEWORK_SUBMISSIONS[homework_id] = subs

    return APIResponse.ok(data={"homework": hw, "submissions": subs, "total": len(subs)})


@router.post("/homework/{homework_id}/grade", response_model=APIResponse)
def grade_homework_submission(homework_id: int, body: HomeworkGradeRequest, current_user: AuthUser, db: DBSession):
    """Grade a student submission with score, remarks, and notify student."""
    teacher = _get_teacher(db, current_user)
    hw = next((h for h in _HOMEWORK_STORE if h["id"] == homework_id), None)
    if not hw:
        raise HTTPException(status_code=404, detail="Homework not found.")

    subs = _HOMEWORK_SUBMISSIONS.setdefault(homework_id, [])
    sub = next((s for s in subs if s.get("student_id") == body.student_id), None)
    if not sub:
        sub = {
            "id": len(subs) + 1,
            "homework_id": homework_id,
            "student_id": body.student_id,
            "student_name": f"Student #{body.student_id}",
            "gr_number": f"GR-2024-{body.student_id:03d}",
            "roll_number": str(body.student_id),
            "submitted_at": datetime.now().isoformat(),
            "submission_text": "Graded directly by teacher",
            "attachment_url": None,
            "status": "evaluated",
            "marks_obtained": body.marks_obtained,
            "max_marks": body.max_marks or 20.0,
            "teacher_remarks": body.teacher_remarks,
        }
        subs.append(sub)
    else:
        sub["status"] = "evaluated"
        sub["marks_obtained"] = body.marks_obtained
        sub["max_marks"] = body.max_marks or 20.0
        sub["teacher_remarks"] = body.teacher_remarks

    # Also update homework store item
    hw["status"] = "evaluated"
    hw["marks"] = f"{body.marks_obtained}/{body.max_marks or 20}"
    hw["teacher_remarks"] = body.teacher_remarks

    # Send push notification to student
    try:
        from app.shared.notifications import push_notification_to_role
        push_notification_to_role(
            db,
            role_code="student",
            category="homework",
            notification_type="homework.checked",
            title=f"✅ Homework Graded: {hw.get('title')}",
            body=f"Score: {body.marks_obtained}/{body.max_marks}. Feedback: {body.teacher_remarks or 'Good effort!'}",
            priority="normal",
            action_url="/student-portal/homework",
            sender_id=current_user.user_id,
        )
    except Exception as e:
        print("Failed to dispatch grade notification:", e)

    return APIResponse.ok(message=f"Submission graded successfully ({body.marks_obtained}/{body.max_marks})!", data=sub)


@router.delete("/homework/{homework_id}", response_model=APIResponse)
def delete_teacher_homework(homework_id: int, current_user: AuthUser, db: DBSession):
    """Delete / deactivate homework assignment."""
    hw = next((h for h in _HOMEWORK_STORE if h["id"] == homework_id), None)
    if not hw:
        raise HTTPException(status_code=404, detail="Homework not found.")
    hw["is_active"] = False
    return APIResponse.ok(message="Homework deleted successfully.")


# ─────────────────────────────────────────────────────────────
# STUDY MATERIALS & VIDEOS (Teacher Portal)
# ─────────────────────────────────────────────────────────────

_MATERIALS_STORE = [
    {
        "id": 1,
        "standard": "9",
        "subject": "Mathematics",
        "title": "Algebraic Formula Reference Sheet",
        "description": "Complete summary of formulas for Polynomials and Quadratic equations.",
        "material_type": "notes",
        "file_url": "/downloads/algebra_formulas.pdf",
        "teacher": "Shri. Ramesh Jadhav",
        "created_at": "2026-07-20T10:00:00",
        "is_active": True,
    },
    {
        "id": 2,
        "standard": "9",
        "subject": "Science & Tech",
        "title": "Periodic Table & Valency Chart",
        "description": "Quick reference for atomic numbers, elements, and valency rules.",
        "material_type": "notes",
        "file_url": "/downloads/periodic_table.pdf",
        "teacher": "Smt. Kavita Shinde",
        "created_at": "2026-07-22T11:00:00",
        "is_active": True,
    }
]

_VIDEOS_STORE = [
    {
        "id": 1,
        "standard": "9",
        "subject": "Mathematics",
        "title": "Understanding Quadratic Equations Step by Step",
        "video_url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        "description": "Comprehensive video lecture breaking down factoring and formula method.",
        "teacher": "Shri. Ramesh Jadhav",
        "duration": "18:45",
        "created_at": "2026-07-25T09:00:00",
        "is_active": True,
    }
]


class MaterialCreateRequest(BaseModel):
    standard: str
    subject: str
    title: str
    description: Optional[str] = None
    material_type: str = "notes"
    file_url: Optional[str] = None


class VideoCreateRequest(BaseModel):
    standard: str
    subject: str
    title: str
    video_url: str
    description: Optional[str] = None


@router.get("/materials", response_model=APIResponse)
def get_teacher_materials(current_user: AuthUser, db: DBSession):
    items = [m for m in _MATERIALS_STORE if m.get("is_active", True)]
    return APIResponse.ok(data={"materials": items, "total": len(items)})


@router.post("/materials", response_model=APIResponse, status_code=201)
def create_teacher_material(body: MaterialCreateRequest, current_user: AuthUser, db: DBSession):
    teacher = _get_teacher(db, current_user)
    new_id = max((m["id"] for m in _MATERIALS_STORE), default=0) + 1
    new_mat = {
        "id": new_id,
        "standard": body.standard,
        "subject": body.subject,
        "title": body.title,
        "description": body.description or "",
        "material_type": body.material_type or "notes",
        "file_url": body.file_url or "/downloads/sample_notes.pdf",
        "teacher": teacher.full_name,
        "created_at": datetime.now().isoformat(),
        "is_active": True,
    }
    _MATERIALS_STORE.insert(0, new_mat)
    return APIResponse.created(data=new_mat, message="Study material uploaded successfully!")


@router.get("/videos", response_model=APIResponse)
def get_teacher_videos(current_user: AuthUser, db: DBSession):
    items = [v for v in _VIDEOS_STORE if v.get("is_active", True)]
    return APIResponse.ok(data={"videos": items, "total": len(items)})


@router.post("/videos", response_model=APIResponse, status_code=201)
def create_teacher_video(body: VideoCreateRequest, current_user: AuthUser, db: DBSession):
    teacher = _get_teacher(db, current_user)
    new_id = max((v["id"] for v in _VIDEOS_STORE), default=0) + 1
    new_vid = {
        "id": new_id,
        "standard": body.standard,
        "subject": body.subject,
        "title": body.title,
        "video_url": body.video_url,
        "description": body.description or "",
        "teacher": teacher.full_name,
        "duration": "15:00",
        "created_at": datetime.now().isoformat(),
        "is_active": True,
    }
    _VIDEOS_STORE.insert(0, new_vid)
    return APIResponse.created(data=new_vid, message="Video lecture added successfully!")


# ─────────────────────────────────────────────────────────────
# EXAMS & MARKS ENTRY (Teacher Portal)
# ─────────────────────────────────────────────────────────────

from decimal import Decimal
from sqlalchemy.orm import joinedload
from app.modules.exam.service import compute_grade

class MarksEntryItem(BaseModel):
    student_id: int
    marks_obtained: float

class MarksEntryRequest(BaseModel):
    exam_id: int
    subject_name: str
    entries: List[MarksEntryItem]


@router.get("/exams", response_model=APIResponse)
def get_teacher_exams(current_user: AuthUser, db: DBSession):
    """Get active exams list for marks entry."""
    teacher = _get_teacher(db, current_user)
    ac_year = _get_current_year(db)
    
    from app.modules.exam.models import Exam
    
    q = select(Exam).options(joinedload(Exam.exam_type), joinedload(Exam.subjects)).where(Exam.is_deleted == False)
    if ac_year:
        q = q.where(Exam.academic_year_id == ac_year.id)
    
    exams_db = list(db.scalars(q.order_by(Exam.id.desc())).unique().all())
    
    exams_list = []
    for ex in exams_db:
        exams_list.append({
            "id": ex.id,
            "name": ex.exam_type.name if ex.exam_type else f"Exam #{ex.id}",
            "exam_type_name": ex.exam_type.name if ex.exam_type else "",
            "standard": ex.standard,
            "division": "A",
            "subjects": [s.subject_name for s in ex.subjects],
            "status": "active" if not ex.result_declared else "declared"
        })
    
    if not exams_list:
        exams_list = [
            {"id": 1, "name": "First Unit Test 2026", "standard": "9", "division": "A", "subjects": ["Mathematics", "Science", "English"], "status": "active"},
            {"id": 2, "name": "Mid-Term Examination 2026", "standard": "10", "division": "A", "subjects": ["Mathematics", "Science", "Marathi"], "status": "active"},
        ]
        
    return APIResponse.ok(data={"exams": exams_list})


@router.post("/marks", response_model=APIResponse)
def save_teacher_marks(body: MarksEntryRequest, current_user: AuthUser, db: DBSession):
    """Save student exam marks."""
    teacher = _get_teacher(db, current_user)
    from app.modules.exam.models import ExamSubject, StudentMark
    
    subj = db.scalar(
        select(ExamSubject).where(
            ExamSubject.exam_id == body.exam_id,
            func.lower(ExamSubject.subject_name) == body.subject_name.lower().strip()
        )
    )
    
    if not subj:
        subj = db.scalar(select(ExamSubject).where(ExamSubject.exam_id == body.exam_id))
    if not subj:
        subj = ExamSubject(
            exam_id=body.exam_id,
            subject_name=body.subject_name,
            max_marks=100,
            passing_marks=35,
            created_by=current_user.user_id
        )
        db.add(subj)
        db.flush()
        
    saved = 0
    for entry in body.entries:
        existing = db.scalar(
            select(StudentMark).where(
                StudentMark.exam_id == body.exam_id,
                StudentMark.exam_subject_id == subj.id,
                StudentMark.student_id == entry.student_id,
                StudentMark.is_deleted == False
            )
        )
        marks_val = Decimal(str(entry.marks_obtained))
        max_m = Decimal(str(subj.max_marks or 100))
        pct = (marks_val / max_m) * 100
        grade = compute_grade(pct)
        
        if existing:
            existing.marks_obtained = marks_val
            existing.grade = grade
            existing.entered_by = current_user.user_id
        else:
            m = StudentMark(
                exam_id=body.exam_id,
                exam_subject_id=subj.id,
                student_id=entry.student_id,
                marks_obtained=marks_val,
                grade=grade,
                entered_by=current_user.user_id,
                created_by=current_user.user_id,
            )
            db.add(m)
        saved += 1
        
    db.commit()
    return APIResponse.ok(message=f"Saved marks for {saved} students in {body.subject_name}.")



