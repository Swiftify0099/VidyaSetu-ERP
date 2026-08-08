"""
VidyaSetu ERP — Attendance Service & Schemas
=============================================
Bulk attendance marking, monthly summaries,
defaulter detection (< 75%), reports.
"""
from calendar import monthrange
from datetime import date, timedelta
from decimal import Decimal
from typing import Optional
from pydantic import BaseModel as PydanticBase
from fastapi import HTTPException
from sqlalchemy import and_, extract, func, select
from sqlalchemy.orm import Session, joinedload

from app.modules.attendance.models import (
    Holiday, StudentAttendance, ClassAttendanceSession,
    TeacherAttendance, MonthlyAttendanceSummary,
)
from app.shared.audit import AuditService


# ═══════════════════════════════════════════════════
# SCHEMAS
# ═══════════════════════════════════════════════════

class HolidayRequest(PydanticBase):
    date: date
    name: str
    name_marathi: Optional[str] = None
    holiday_type: str = "public"
    academic_year_id: Optional[int] = None

class HolidayResponse(PydanticBase):
    model_config = {"from_attributes": True}
    id: int
    date: date
    name: str
    name_marathi: Optional[str] = None
    holiday_type: str
    is_active: bool


class AttendanceRow(PydanticBase):
    student_id: int
    status: str = "present"   # present / absent / late / half_day / leave / medical_leave
    remarks: Optional[str] = None

class BulkAttendanceRequest(PydanticBase):
    date: date
    standard: str
    division: Optional[str] = None
    academic_year_id: int
    period: str = "full_day"
    subject_id: Optional[int] = None
    rows: list[AttendanceRow]

class AttendanceResponse(PydanticBase):
    model_config = {"from_attributes": True}
    id: int
    student_id: int
    student_name: Optional[str] = None
    gr_number: Optional[str] = None
    date: date
    standard: str
    division: Optional[str] = None
    period: str
    subject_id: Optional[int] = None
    subject_name: Optional[str] = None
    status: str
    remarks: Optional[str] = None


class SessionResponse(PydanticBase):
    model_config = {"from_attributes": True}
    id: int
    date: date
    standard: str
    division: Optional[str] = None
    period: str
    subject_id: Optional[int] = None
    subject_name: Optional[str] = None
    total_students: int
    present_count: int
    absent_count: int
    late_count: int
    leave_count: int
    is_holiday: bool


class TeacherAttendanceRow(PydanticBase):
    teacher_id: int
    status: str = "present"
    check_in: Optional[str] = None
    check_out: Optional[str] = None
    remarks: Optional[str] = None

class BulkTeacherAttendanceRequest(PydanticBase):
    date: date
    academic_year_id: int
    rows: list[TeacherAttendanceRow]

class TeacherAttendanceResponse(PydanticBase):
    model_config = {"from_attributes": True}
    id: int
    teacher_id: int
    date: date
    status: str
    check_in: Optional[str] = None
    check_out: Optional[str] = None
    remarks: Optional[str] = None


class StudentAttendanceSummary(PydanticBase):
    student_id: int
    student_name: str
    gr_number: str
    standard: str
    division: Optional[str] = None
    working_days: int
    present_days: int
    absent_days: int
    late_days: int
    leave_days: int
    attendance_percentage: Decimal
    status: str  # good / warning / danger (< 75%)


class AttendanceStatsResponse(PydanticBase):
    today_total: int
    today_present: int
    today_absent: int
    today_attendance_pct: Decimal
    monthly_avg_pct: Decimal
    defaulters_count: int     # students < 75%
    classes_marked_today: int
    classes_total: int
    teacher_present_today: int
    teacher_total: int


class DayStatusResponse(PydanticBase):
    date: date
    is_holiday: bool
    holiday_name: Optional[str] = None
    is_sunday: bool
    attendance_marked: bool
    present: int
    absent: int
    percentage: Decimal


# ═══════════════════════════════════════════════════
# SERVICES
# ═══════════════════════════════════════════════════

class HolidayService:
    @staticmethod
    def create(db: Session, data: HolidayRequest, created_by: int) -> Holiday:
        h = Holiday(**data.model_dump(), created_by=created_by)
        db.add(h); db.commit(); db.refresh(h); return h

    @staticmethod
    def get_by_month(db: Session, year: int, month: int) -> list[Holiday]:
        _, last_day = monthrange(year, month)
        from_d = date(year, month, 1)
        to_d = date(year, month, last_day)
        return list(db.scalars(
            select(Holiday)
            .where(Holiday.date >= from_d, Holiday.date <= to_d, Holiday.is_deleted == False)
            .order_by(Holiday.date)
        ).all())

    @staticmethod
    def is_holiday(db: Session, d: date) -> Optional[Holiday]:
        return db.scalar(select(Holiday).where(Holiday.date == d, Holiday.is_deleted == False))


class StudentAttendanceService:
    @staticmethod
    def mark_bulk(db: Session, data: BulkAttendanceRequest, marked_by: int) -> int:
        holiday = HolidayService.is_holiday(db, data.date)

        saved = 0
        counts = {"present": 0, "absent": 0, "late": 0, "leave": 0, "half_day": 0, "medical_leave": 0}
        for row in data.rows:
            q_att = select(StudentAttendance).where(
                StudentAttendance.student_id == row.student_id,
                StudentAttendance.date == data.date,
                StudentAttendance.period == data.period,
                StudentAttendance.is_deleted == False,
            )
            if data.subject_id is not None:
                q_att = q_att.where(StudentAttendance.subject_id == data.subject_id)
            else:
                q_att = q_att.where(StudentAttendance.subject_id.is_(None))

            existing = db.scalar(q_att)
            if existing:
                existing.status = row.status
                existing.remarks = row.remarks
                existing.marked_by = marked_by
            else:
                att = StudentAttendance(
                    student_id=row.student_id,
                    date=data.date,
                    standard=data.standard,
                    division=data.division,
                    academic_year_id=data.academic_year_id,
                    period=data.period,
                    subject_id=data.subject_id,
                    status=row.status,
                    marked_by=marked_by,
                    remarks=row.remarks,
                    created_by=marked_by,
                )
                db.add(att)
            counts[row.status] = counts.get(row.status, 0) + 1
            saved += 1

        # Update / create session record
        q_sess = select(ClassAttendanceSession).where(
            ClassAttendanceSession.date == data.date,
            ClassAttendanceSession.standard == data.standard,
            ClassAttendanceSession.academic_year_id == data.academic_year_id,
            ClassAttendanceSession.period == data.period,
            ClassAttendanceSession.is_deleted == False,
        )
        if data.subject_id is not None:
            q_sess = q_sess.where(ClassAttendanceSession.subject_id == data.subject_id)
        else:
            q_sess = q_sess.where(ClassAttendanceSession.subject_id.is_(None))

        session = db.scalar(q_sess)
        total = len(data.rows)
        if session:
            session.total_students = total
            session.present_count = counts.get("present", 0) + counts.get("half_day", 0)
            session.absent_count = counts.get("absent", 0)
            session.late_count = counts.get("late", 0)
            session.leave_count = counts.get("leave", 0) + counts.get("medical_leave", 0)
            session.marked_by = marked_by
        else:
            session = ClassAttendanceSession(
                date=data.date,
                standard=data.standard,
                division=data.division,
                academic_year_id=data.academic_year_id,
                period=data.period,
                subject_id=data.subject_id,
                total_students=total,
                present_count=counts.get("present", 0) + counts.get("half_day", 0),
                absent_count=counts.get("absent", 0),
                late_count=counts.get("late", 0),
                leave_count=counts.get("leave", 0) + counts.get("medical_leave", 0),
                marked_by=marked_by,
                is_holiday=bool(holiday),
                created_by=marked_by,
            )
            db.add(session)

        AuditService.log(db, action="ATTENDANCE_MARKED", module="attendance",
                         user_id=marked_by,
                         description=f"Std {data.standard} {data.date} (Session: {data.period}): {counts.get('present', 0)}P / {counts.get('absent', 0)}A")
        db.commit()

        # Update monthly summary
        StudentAttendanceService._update_monthly_summary(
            db, data.standard, data.division, data.academic_year_id,
            data.date.year, data.date.month
        )

        return saved

    @staticmethod
    def _update_monthly_summary(db: Session, standard: str, division: Optional[str],
                                academic_year_id: int, year: int, month: int) -> None:
        """Recompute monthly summary for all students in this standard."""
        _, last_day = monthrange(year, month)
        from_d = date(year, month, 1)
        to_d = date(year, month, last_day)

        # Count working days (exclude sundays + holidays)
        holidays = {h.date for h in db.scalars(
            select(Holiday).where(Holiday.date >= from_d, Holiday.date <= to_d)
        ).all()}
        working = 0
        d = from_d
        while d <= min(to_d, date.today()):
            if d.weekday() != 6 and d not in holidays:  # not Sunday
                working += 1
            d += timedelta(days=1)

        # Get all students in this standard
        from app.modules.student.models import Student
        students = db.scalars(
            select(Student).where(
                Student.standard == standard,
                Student.is_deleted == False,
                Student.is_active == True,
            )
        ).all()

        for student in students:
            records = db.scalars(
                select(StudentAttendance).where(
                    StudentAttendance.student_id == student.id,
                    StudentAttendance.date >= from_d,
                    StudentAttendance.date <= to_d,
                    StudentAttendance.period == "full_day",
                    StudentAttendance.is_deleted == False,
                )
            ).all()

            present = sum(1 for r in records if r.status in ("present", "half_day"))
            absent = sum(1 for r in records if r.status == "absent")
            late = sum(1 for r in records if r.status == "late")
            leave = sum(1 for r in records if r.status in ("leave", "medical_leave"))
            pct = Decimal(str(round(present / working * 100, 2))) if working > 0 else Decimal("0")

            existing = db.scalar(
                select(MonthlyAttendanceSummary).where(
                    MonthlyAttendanceSummary.student_id == student.id,
                    MonthlyAttendanceSummary.year == year,
                    MonthlyAttendanceSummary.month == month,
                    MonthlyAttendanceSummary.academic_year_id == academic_year_id,
                )
            )
            if existing:
                existing.working_days = working
                existing.present_days = present
                existing.absent_days = absent
                existing.late_days = late
                existing.leave_days = leave
                existing.attendance_percentage = pct
            else:
                summ = MonthlyAttendanceSummary(
                    student_id=student.id,
                    academic_year_id=academic_year_id,
                    year=year, month=month,
                    working_days=working, present_days=present,
                    absent_days=absent, late_days=late, leave_days=leave,
                    attendance_percentage=pct,
                    created_by=0,
                )
                db.add(summ)
        db.commit()

    @staticmethod
    def get_day_attendance(db: Session, att_date: date, standard: str,
                           division: Optional[str], academic_year_id: int,
                           period: str = "full_day", subject_id: Optional[int] = None) -> list[dict]:
        from app.modules.student.models import Student
        from app.modules.timetable.models import Subject

        q = select(StudentAttendance).where(
            StudentAttendance.date == att_date,
            StudentAttendance.standard == standard,
            StudentAttendance.academic_year_id == academic_year_id,
            StudentAttendance.period == period,
            StudentAttendance.is_deleted == False,
        )
        if division:
            q = q.where(StudentAttendance.division == division)
        if subject_id:
            q = q.where(StudentAttendance.subject_id == subject_id)

        records = list(db.scalars(q).all())
        results = []
        for r in records:
            st = db.scalar(select(Student).where(Student.id == r.student_id))
            sub = db.scalar(select(Subject).where(Subject.id == r.subject_id)) if r.subject_id else None
            results.append({
                "id": r.id,
                "student_id": r.student_id,
                "student_name": st.full_name if st else f"Student #{r.student_id}",
                "gr_number": st.gr_number if st else f"GR-{r.student_id}",
                "date": r.date,
                "standard": r.standard,
                "division": r.division,
                "period": r.period,
                "subject_id": r.subject_id,
                "subject_name": sub.name if sub else None,
                "status": r.status,
                "remarks": r.remarks,
            })
        return results

    @staticmethod
    def get_class_roster(db: Session, standard: str, division: Optional[str],
                         att_date: date, academic_year_id: int,
                         period: str = "full_day", subject_id: Optional[int] = None) -> dict:
        """Fetch all enrolled students in class with current day attendance status & headcount summary."""
        from app.modules.student.models import Student
        from app.modules.timetable.models import Subject

        q_students = select(Student).where(
            Student.standard == standard,
            Student.is_deleted == False,
            Student.is_active == True,
        )
        if division:
            q_students = q_students.where(Student.division == division)
        students = list(db.scalars(q_students.order_by(Student.roll_number, Student.first_name)).all())

        # Existing attendance records for this slot
        existing_list = StudentAttendanceService.get_day_attendance(
            db, att_date, standard, division, academic_year_id, period, subject_id
        )
        att_map = {r["student_id"]: r for r in existing_list}

        roster = []
        counts = {"present": 0, "absent": 0, "late": 0, "half_day": 0, "leave": 0, "medical_leave": 0}

        for st in students:
            if st.id in att_map:
                st_att = att_map[st.id]
                status = st_att["status"]
                remarks = st_att.get("remarks") or ""
            else:
                status = "present"
                remarks = ""

            counts[status] = counts.get(status, 0) + 1
            roster.append({
                "student_id": st.id,
                "student_name": st.full_name,
                "gr_number": st.gr_number,
                "roll_number": st.roll_number,
                "status": status,
                "remarks": remarks,
            })

        total = len(roster)
        present_total = counts["present"] + counts["half_day"]
        pct = round((present_total / total * 100), 1) if total > 0 else 0.0

        subject_name = None
        if subject_id:
            sub = db.scalar(select(Subject).where(Subject.id == subject_id))
            if sub: subject_name = sub.name

        return {
            "standard": standard,
            "division": division,
            "date": att_date,
            "period": period,
            "subject_id": subject_id,
            "subject_name": subject_name,
            "already_marked": len(existing_list) > 0,
            "headcount": {
                "total": total,
                "present": counts["present"],
                "absent": counts["absent"],
                "late": counts["late"],
                "half_day": counts["half_day"],
                "leave": counts["leave"],
                "medical_leave": counts["medical_leave"],
                "percentage": pct,
            },
            "students": roster,
        }

    @staticmethod
    def get_student_month_attendance(db: Session, student_id: int,
                                     year: int, month: int) -> list[StudentAttendance]:
        _, last_day = monthrange(year, month)
        return list(db.scalars(
            select(StudentAttendance).where(
                StudentAttendance.student_id == student_id,
                StudentAttendance.date >= date(year, month, 1),
                StudentAttendance.date <= date(year, month, last_day),
                StudentAttendance.period == "full_day",
                StudentAttendance.is_deleted == False,
            ).order_by(StudentAttendance.date)
        ).all())

    @staticmethod
    def get_class_sessions(db: Session, standard: str, academic_year_id: int,
                           year: int, month: int, subject_id: Optional[int] = None,
                           period: Optional[str] = None) -> list[ClassAttendanceSession]:
        _, last_day = monthrange(year, month)
        q = select(ClassAttendanceSession).where(
            ClassAttendanceSession.standard == standard,
            ClassAttendanceSession.academic_year_id == academic_year_id,
            ClassAttendanceSession.date >= date(year, month, 1),
            ClassAttendanceSession.date <= date(year, month, last_day),
            ClassAttendanceSession.is_deleted == False,
        )
        if subject_id:
            q = q.where(ClassAttendanceSession.subject_id == subject_id)
        if period:
            q = q.where(ClassAttendanceSession.period == period)
        return list(db.scalars(q.order_by(ClassAttendanceSession.date)).all())

    @staticmethod
    def get_defaulters(db: Session, academic_year_id: int, standard: Optional[str],
                       year: int, month: int, threshold: float = 75.0,
                       ) -> list[StudentAttendanceSummary]:
        from app.modules.student.models import Student
        q = select(MonthlyAttendanceSummary).where(
            MonthlyAttendanceSummary.academic_year_id == academic_year_id,
            MonthlyAttendanceSummary.year == year,
            MonthlyAttendanceSummary.month == month,
            MonthlyAttendanceSummary.attendance_percentage < threshold,
            MonthlyAttendanceSummary.is_deleted == False,
        )
        summaries = db.scalars(q).all()

        result = []
        for s in summaries:
            student = db.scalar(select(Student).where(Student.id == s.student_id))
            if not student: continue
            if standard and student.standard != standard: continue
            pct = float(s.attendance_percentage)
            status = "danger" if pct < 60 else "warning"
            result.append(StudentAttendanceSummary(
                student_id=s.student_id, student_name=student.full_name,
                gr_number=student.gr_number,
                standard=student.standard or "-",
                division=student.division,
                working_days=s.working_days, present_days=s.present_days,
                absent_days=s.absent_days, late_days=s.late_days,
                leave_days=s.leave_days, attendance_percentage=s.attendance_percentage,
                status=status,
            ))
        result.sort(key=lambda r: r.attendance_percentage)
        return result


class TeacherAttendanceService:
    @staticmethod
    def mark_bulk(db: Session, data: BulkTeacherAttendanceRequest, marked_by: int) -> int:
        saved = 0
        for row in data.rows:
            existing = db.scalar(
                select(TeacherAttendance).where(
                    TeacherAttendance.teacher_id == row.teacher_id,
                    TeacherAttendance.date == data.date,
                    TeacherAttendance.is_deleted == False,
                )
            )
            if existing:
                existing.status = row.status
                existing.check_in = row.check_in
                existing.check_out = row.check_out
                existing.remarks = row.remarks
                existing.marked_by = marked_by
            else:
                att = TeacherAttendance(
                    teacher_id=row.teacher_id,
                    date=data.date,
                    academic_year_id=data.academic_year_id,
                    status=row.status,
                    check_in=row.check_in,
                    check_out=row.check_out,
                    remarks=row.remarks,
                    marked_by=marked_by,
                    created_by=marked_by,
                )
                db.add(att)
            saved += 1
        db.commit()
        return saved

    @staticmethod
    def get_day(db: Session, att_date: date, academic_year_id: int) -> list[TeacherAttendance]:
        return list(db.scalars(
            select(TeacherAttendance).where(
                TeacherAttendance.date == att_date,
                TeacherAttendance.academic_year_id == academic_year_id,
                TeacherAttendance.is_deleted == False,
            )
        ).all())

    @staticmethod
    def get_teacher_month(db: Session, teacher_id: int, year: int, month: int) -> list[TeacherAttendance]:
        _, last_day = monthrange(year, month)
        return list(db.scalars(
            select(TeacherAttendance).where(
                TeacherAttendance.teacher_id == teacher_id,
                TeacherAttendance.date >= date(year, month, 1),
                TeacherAttendance.date <= date(year, month, last_day),
                TeacherAttendance.is_deleted == False,
            ).order_by(TeacherAttendance.date)
        ).all())


class AttendanceStatsService:
    @staticmethod
    def get(db: Session, academic_year_id: int) -> AttendanceStatsResponse:
        today = date.today()
        month = today.month
        year = today.year

        # Today's class session totals
        sessions = list(db.scalars(
            select(ClassAttendanceSession).where(
                ClassAttendanceSession.date == today,
                ClassAttendanceSession.academic_year_id == academic_year_id,
                ClassAttendanceSession.period == "full_day",
                ClassAttendanceSession.is_deleted == False,
            )
        ).all())

        today_total   = sum(s.total_students for s in sessions)
        today_present = sum(s.present_count  for s in sessions)
        today_absent  = sum(s.absent_count   for s in sessions)
        today_pct = Decimal(str(round(today_present / today_total * 100, 2))) if today_total > 0 else Decimal("0")

        # Monthly average
        month_avgs = db.scalars(
            select(MonthlyAttendanceSummary.attendance_percentage).where(
                MonthlyAttendanceSummary.academic_year_id == academic_year_id,
                MonthlyAttendanceSummary.year == year,
                MonthlyAttendanceSummary.month == month,
                MonthlyAttendanceSummary.is_deleted == False,
            )
        ).all()
        monthly_avg = Decimal(str(round(sum(float(p) for p in month_avgs) / len(month_avgs), 2))) if month_avgs else Decimal("0")

        defaulters = db.scalar(
            select(func.count()).where(
                MonthlyAttendanceSummary.academic_year_id == academic_year_id,
                MonthlyAttendanceSummary.year == year,
                MonthlyAttendanceSummary.month == month,
                MonthlyAttendanceSummary.attendance_percentage < 75,
                MonthlyAttendanceSummary.is_deleted == False,
            )
        ) or 0

        # Classes marked today vs total standards (rough estimate)
        classes_marked = len(sessions)

        # Teacher attendance today
        t_att = list(db.scalars(
            select(TeacherAttendance).where(
                TeacherAttendance.date == today,
                TeacherAttendance.academic_year_id == academic_year_id,
                TeacherAttendance.is_deleted == False,
            )
        ).all())
        teacher_present = sum(1 for t in t_att if t.status == "present")

        from app.modules.teacher.models import Teacher
        teacher_total = db.scalar(select(func.count()).where(
            Teacher.is_deleted == False, Teacher.is_active == True
        )) or 0

        return AttendanceStatsResponse(
            today_total=today_total,
            today_present=today_present,
            today_absent=today_absent,
            today_attendance_pct=today_pct,
            monthly_avg_pct=monthly_avg,
            defaulters_count=defaulters,
            classes_marked_today=classes_marked,
            classes_total=12,  # Std 1-12
            teacher_present_today=teacher_present,
            teacher_total=teacher_total,
        )
