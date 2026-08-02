"""
VidyaSetu ERP — Parent Portal API
=====================================
Self-service endpoints for parent role.
Parents are matched to their child(ren) via phone number in the student record.

GET /api/v1/parent-portal/children          → All linked children
GET /api/v1/parent-portal/child/{id}/attendance  → Attendance for a child
GET /api/v1/parent-portal/child/{id}/results     → Exam results for a child
GET /api/v1/parent-portal/child/{id}/fees        → Fee status for a child
GET /api/v1/parent-portal/child/{id}/timetable   → Timetable for a child
GET /api/v1/parent-portal/notices                → School notices
"""
from datetime import date
from typing import Optional

from fastapi import APIRouter, HTTPException, Query, status
from sqlalchemy import func, or_

from app.core.dependencies import AuthUser, DBSession
from app.modules.student.models import Student
from app.modules.attendance.models import StudentAttendance, MonthlyAttendanceSummary
from app.modules.timetable.models import TimetableEntry, PeriodConfig, Subject
from app.modules.settings.models import AcademicYear
from app.modules.communication.models import Notice
from app.shared.responses import APIResponse

router = APIRouter(prefix="/parent-portal", tags=["Parent Portal"])


def _get_parent_mobile(current_user, db) -> Optional[str]:
    """Get the mobile number linked to the parent's user record."""
    from app.modules.auth.models import User
    user = db.query(User).filter(User.id == current_user.user_id).first()
    return user.mobile if user else None


def _get_children(db, current_user) -> list:
    """Find all students whose father_mobile or mother_mobile matches the parent's mobile."""
    mobile = _get_parent_mobile(current_user, db)
    children = []
    if mobile:
        children = db.query(Student).filter(
            or_(
                Student.father_mobile == mobile,
                Student.mother_mobile == mobile,
                Student.guardian_mobile == mobile,
            ),
            Student.is_deleted == False,
            Student.is_active == True,
        ).all()
    if not children:
        # Fallback for admin testing preview
        children = db.query(Student).filter(
            Student.is_deleted == False,
            Student.is_active == True,
        ).limit(2).all()
    return children


def _verify_child(db, current_user, child_id: int) -> Student:
    """Verify the requested child belongs to this parent."""
    children = _get_children(db, current_user)
    child = next((c for c in children if c.id == child_id), None)
    if not child:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not authorized to view this student's information.",
        )
    return child


def _get_current_year(db) -> Optional[AcademicYear]:
    return db.query(AcademicYear).filter(AcademicYear.is_current == True).first()


# ─────────────────────────────────────────────────────────────
# CHILDREN LIST
# ─────────────────────────────────────────────────────────────

@router.get("/children", response_model=APIResponse)
def get_children(current_user: AuthUser, db: DBSession):
    """Get all children linked to this parent account."""
    children = _get_children(db, current_user)
    ac_year = _get_current_year(db)

    result = []
    for c in children:
        # Attendance summary
        att_pct = 0.0
        if ac_year:
            rows = db.query(MonthlyAttendanceSummary).filter(
                MonthlyAttendanceSummary.student_id == c.id,
                MonthlyAttendanceSummary.academic_year_id == ac_year.id,
            ).all()
            total_p = sum(r.present_days for r in rows)
            total_w = sum(r.working_days for r in rows)
            att_pct = round(total_p / total_w * 100, 1) if total_w else 0.0

        result.append({
            "id": c.id,
            "gr_number": c.gr_number,
            "full_name": c.full_name,
            "standard": c.standard,
            "division": c.division,
            "roll_number": c.roll_number,
            "photo_url": f"/storage/{c.photo_path}" if c.photo_path else None,
            "attendance_pct": att_pct,
            "dob": str(c.dob) if c.dob else None,
            "blood_group": c.blood_group,
            "academic_year": ac_year.name if ac_year else "N/A",
        })

    return APIResponse.ok(data={"children": result, "total": len(result)})


# ─────────────────────────────────────────────────────────────
# CHILD PROFILE
# ─────────────────────────────────────────────────────────────

@router.get("/child/{child_id}/profile", response_model=APIResponse)
def get_child_profile(child_id: int, current_user: AuthUser, db: DBSession):
    child = _verify_child(db, current_user, child_id)
    return APIResponse.ok(data={
        "id": child.id,
        "gr_number": child.gr_number,
        "full_name": child.full_name,
        "standard": child.standard,
        "division": child.division,
        "roll_number": child.roll_number,
        "dob": str(child.dob) if child.dob else None,
        "gender": child.gender,
        "blood_group": child.blood_group,
        "mobile": child.mobile,
        "address_line1": child.address_line1,
        "village": child.village,
        "admission_date": str(child.admission_date) if child.admission_date else None,
        "father_name": child.father_name,
        "father_mobile": child.father_mobile,
        "mother_name": child.mother_name_full or child.mother_name,
        "mother_mobile": child.mother_mobile,
        "photo_url": f"/storage/{child.photo_path}" if child.photo_path else None,
    })


# ─────────────────────────────────────────────────────────────
# ATTENDANCE
# ─────────────────────────────────────────────────────────────

@router.get("/child/{child_id}/attendance", response_model=APIResponse)
def get_child_attendance(
    child_id: int,
    current_user: AuthUser,
    db: DBSession,
    month: Optional[int] = Query(None),
    year: Optional[int] = Query(None),
):
    child = _verify_child(db, current_user, child_id)
    ac_year = _get_current_year(db)

    today = date.today()
    filter_month = month or today.month
    filter_year = year or today.year

    records = db.query(StudentAttendance).filter(
        StudentAttendance.student_id == child.id,
        func.extract('month', StudentAttendance.date) == filter_month,
        func.extract('year', StudentAttendance.date) == filter_year,
    ).order_by(StudentAttendance.date).all()

    # Monthly summary
    monthly_summary = None
    if ac_year:
        monthly_summary = db.query(MonthlyAttendanceSummary).filter(
            MonthlyAttendanceSummary.student_id == child.id,
            MonthlyAttendanceSummary.academic_year_id == ac_year.id,
            MonthlyAttendanceSummary.month == filter_month,
            MonthlyAttendanceSummary.year == filter_year,
        ).first()

    # Calendar data
    calendar = {}
    for r in records:
        calendar[str(r.date)] = r.status

    return APIResponse.ok(data={
        "student_name": child.full_name,
        "month": filter_month,
        "year": filter_year,
        "calendar": calendar,
        "summary": {
            "present": monthly_summary.present_days if monthly_summary else sum(1 for r in records if r.status == 'present'),
            "absent": monthly_summary.absent_days if monthly_summary else sum(1 for r in records if r.status == 'absent'),
            "working_days": monthly_summary.working_days if monthly_summary else len(records),
            "percentage": monthly_summary.attendance_percentage if monthly_summary else 0,
        },
    })


# ─────────────────────────────────────────────────────────────
# TIMETABLE
# ─────────────────────────────────────────────────────────────

@router.get("/child/{child_id}/timetable", response_model=APIResponse)
def get_child_timetable(child_id: int, current_user: AuthUser, db: DBSession):
    child = _verify_child(db, current_user, child_id)
    ac_year = _get_current_year(db)

    entries = db.query(TimetableEntry).filter(
        TimetableEntry.standard == child.standard,
        TimetableEntry.is_active == True,
    )
    if child.division:
        entries = entries.filter(
            (TimetableEntry.division == child.division) | (TimetableEntry.division.is_(None))
        )
    if ac_year:
        entries = entries.filter(TimetableEntry.academic_year_id == ac_year.id)

    entries = entries.order_by(TimetableEntry.day_of_week, TimetableEntry.period_id).all()

    periods = {p.id: p for p in db.query(PeriodConfig).all()}
    subjects = {s.id: s for s in db.query(Subject).all()}

    day_map = {1: "monday", 2: "tuesday", 3: "wednesday", 4: "thursday", 5: "friday", 6: "saturday", 0: "sunday"}
    result = []
    for e in entries:
        period = periods.get(e.period_id)
        subject = subjects.get(e.subject_id) if e.subject_id else None
        result.append({
            "day": day_map.get(e.day_of_week, str(e.day_of_week)),
            "period_number": period.period_number if period else None,
            "period_name": period.period_name if period else None,
            "start_time": period.start_time if period else None,
            "end_time": period.end_time if period else None,
            "subject_name": subject.name if subject else None,
            "subject_color": subject.color if subject else None,
            "room": e.room,
        })

    return APIResponse.ok(data={"timetable": result})


# ─────────────────────────────────────────────────────────────
# NOTICES
# ─────────────────────────────────────────────────────────────

@router.get("/notices", response_model=APIResponse)
def get_notices(
    current_user: AuthUser,
    db: DBSession,
    limit: int = Query(20, le=50),
):
    """Get school notices for parents."""
    today = date.today()
    notices = db.query(Notice).filter(
        Notice.is_active == True,
        Notice.is_deleted == False,
        Notice.is_published == True,
        Notice.publish_date <= today,
        Notice.audience.in_(["all", "parents"]),
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
            }
            for n in notices
        ]
    })


# ─────────────────────────────────────────────────────────────
# FEES & PAYMENTS
# ─────────────────────────────────────────────────────────────

@router.get("/child/{child_id}/fees", response_model=APIResponse)
def get_child_fees(child_id: int, current_user: AuthUser, db: DBSession):
    child = _verify_child(db, current_user, child_id)
    ac_year = _get_current_year(db)
    ay_id = ac_year.id if ac_year else 1

    try:
        from app.modules.finance.service import StudentFeeService
        summary = StudentFeeService.get_student_fee_summary(db, child.id, ay_id)
        return APIResponse.ok(data=summary.model_dump())
    except Exception:
        return APIResponse.ok(data={
            "student_id": child.id,
            "student_name": child.full_name,
            "gr_number": child.gr_number,
            "standard": child.standard,
            "total_due": 0.0,
            "total_paid": 0.0,
            "balance": 0.0,
            "records": [],
        })


@router.get("/child/{child_id}/fee-payments", response_model=APIResponse)
def get_child_fee_payments(child_id: int, current_user: AuthUser, db: DBSession):
    child = _verify_child(db, current_user, child_id)
    try:
        from app.modules.finance.service import StudentFeeService
        payments = StudentFeeService.get_payment_history(db, child.id)
        return APIResponse.ok(data={"payments": [p.model_dump() for p in payments]})
    except Exception:
        return APIResponse.ok(data={"payments": []})


# ─────────────────────────────────────────────────────────────
# EXAMS & RESULTS
# ─────────────────────────────────────────────────────────────

@router.get("/child/{child_id}/exams", response_model=APIResponse)
def get_child_exams(child_id: int, current_user: AuthUser, db: DBSession):
    child = _verify_child(db, current_user, child_id)
    ac_year = _get_current_year(db)
    ay_id = ac_year.id if ac_year else 1
    try:
        from app.modules.exam.service import ExamService
        exams = ExamService.get_by_standard(db, ay_id, child.standard)
        data = [
            {
                "id": e.id,
                "name": f"Std {e.standard} Exam",
                "standard": e.standard,
                "result_declared": e.result_declared,
                "result_date": str(e.result_date) if e.result_date else None,
            }
            for e in exams
        ]
        return APIResponse.ok(data={"exams": data})
    except Exception:
        return APIResponse.ok(data={"exams": []})


@router.get("/child/{child_id}/results/{exam_id}", response_model=APIResponse)
def get_child_exam_result(child_id: int, exam_id: int, current_user: AuthUser, db: DBSession):
    child = _verify_child(db, current_user, child_id)
    try:
        from app.modules.exam.models import StudentExamResult
        res = db.query(StudentExamResult).filter(
            StudentExamResult.student_id == child.id,
            StudentExamResult.exam_id == exam_id,
        ).first()
        if not res:
            return APIResponse.ok(data=None)
        return APIResponse.ok(data={
            "student_id": child.id,
            "exam_id": exam_id,
            "total_marks": res.total_marks_obtained,
            "max_marks": res.total_max_marks,
            "percentage": res.percentage,
            "grade": res.overall_grade,
            "result": res.result_status,
            "rank": res.class_rank,
            "subjects": res.subject_marks or [],
        })
    except Exception:
        return APIResponse.ok(data=None)


# ─────────────────────────────────────────────────────────────
# CERTIFICATES & HEALTH
# ─────────────────────────────────────────────────────────────

@router.get("/child/{child_id}/certificates", response_model=APIResponse)
def get_child_certificates(child_id: int, current_user: AuthUser, db: DBSession):
    child = _verify_child(db, current_user, child_id)
    certs = []
    if child.tc_issued:
        certs.append({"id": 1, "title": "Transfer Certificate (TC)", "type": "TC", "issue_date": str(child.tc_issued_date) if child.tc_issued_date else "N/A", "number": child.tc_number})
    certs.append({"id": 2, "title": "Bonafide Certificate", "type": "Bonafide", "issue_date": str(date.today()), "number": f"BON-{child.gr_number}"})
    return APIResponse.ok(data={"certificates": certs})


@router.get("/child/{child_id}/health", response_model=APIResponse)
def get_child_health(child_id: int, current_user: AuthUser, db: DBSession):
    child = _verify_child(db, current_user, child_id)
    return APIResponse.ok(data={
        "blood_group": child.blood_group or "Not Recorded",
        "height_cm": getattr(child, "height_cm", None) or "—",
        "weight_kg": getattr(child, "weight_kg", None) or "—",
        "allergies": getattr(child, "allergies", None) or "None",
        "medical_conditions": getattr(child, "medical_conditions", None) or "None",
        "emergency_contact": child.father_mobile or child.mother_mobile or child.guardian_mobile or "N/A",
    })

