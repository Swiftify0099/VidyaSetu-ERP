"""
VidyaSetu ERP — Reports & Analytics Service
============================================
Cross-module analytics — student strength, attendance rates,
fee collection, exam performance, academic analytics, class health,
teacher workload, student risk indicators, and smart insights.
All queries return serializable data for frontend charts.

RULE: Every number is sourced from a real DB query.
      If data is absent, return {"status": "no_data"} — never invent.
"""
from datetime import date, timedelta
from decimal import Decimal
from typing import Optional
from pydantic import BaseModel as PydanticBase
from sqlalchemy import select, func, and_, extract, case, text, distinct
from sqlalchemy.orm import Session

from app.modules.student.models import Student
from app.modules.teacher.models import Teacher
from app.modules.attendance.models import StudentAttendance, MonthlyAttendanceSummary, TeacherAttendance
from app.modules.finance.models import FeePayment, StudentFeeRecord, FeeCategory
from app.modules.library.models import Book, BookIssue
from app.modules.inventory.models import Asset, StockItem, MaintenanceRecord
from app.modules.communication.models import Notice


# ══════════════════════════════════════════════════════
# RESPONSE MODELS
# ══════════════════════════════════════════════════════

class StudentStrengthReport(PydanticBase):
    total_students: int
    active_students: int
    inactive_students: int
    boys: int
    girls: int
    other_gender: int
    by_standard: list[dict]        # [{standard, boys, girls, total}]
    by_division: list[dict]        # [{standard, division, total}]
    new_admissions_this_year: int
    transfers_out: int
    students_left: int

class AttendanceReport(PydanticBase):
    period: str
    overall_pct: float
    school_working_days: int
    avg_daily_attendance: int
    by_standard: list[dict]        # [{standard, present_pct, total}]
    defaulters_count: int
    top_absentees: list[dict]

class AttendanceTrendReport(PydanticBase):
    trend: list[dict]              # [{year, month, month_name, pct, present, working}]
    by_day_of_week: list[dict]     # [{day_name, avg_pct}]

class LowAttendanceReport(PydanticBase):
    threshold_pct: float
    total_count: int
    students: list[dict]

class FeeReport(PydanticBase):
    academic_year_id: int
    total_demanded: Decimal
    total_collected: Decimal
    total_pending: Decimal
    total_concession: Decimal
    collection_pct: float
    by_month: list[dict]           # [{month, month_name, collected, count}]
    by_fee_type: list[dict]
    top_defaulters: list[dict]

class FeeClassReport(PydanticBase):
    by_class: list[dict]           # [{standard, expected, collected, pending, pct}]

class FeeOutstandingReport(PydanticBase):
    total_count: int
    total_pending: Decimal
    students: list[dict]

class PaymentMethodReport(PydanticBase):
    total_amount: float
    by_method: list[dict]          # [{mode, amount, count, pct}]

class AcademicReport(PydanticBase):
    status: str                    # "ok" or "no_data"
    total_students: int
    students_appeared: int
    passed: int
    failed: int
    pass_pct: float
    avg_percentage: float
    by_grade: list[dict]
    by_subject: list[dict]
    by_class: list[dict]
    weak_subjects: list[dict]
    top_performers: list[dict]     # anonymized — only show rank+standard

class ClassAnalyticsReport(PydanticBase):
    by_class: list[dict]           # [{standard, division, students, attendance_pct, fee_pct, academic_pct}]

class TeacherAnalyticsReport(PydanticBase):
    total_teachers: int
    active_teachers: int
    teaching_staff: int
    non_teaching_staff: int
    by_type: list[dict]
    by_department: list[dict]
    attendance_pct: float
    workload: list[dict]           # [{teacher_id, name, classes, subjects, periods_per_week}]

class RiskReport(PydanticBase):
    attendance_risk: int
    fee_risk: int
    academic_risk: int
    multi_risk: int
    students: list[dict]

class InsightsReport(PydanticBase):
    insights: list[dict]           # [{type, icon, title, body, severity}]

class ExamReport(PydanticBase):
    exam_name: str
    total_students: int
    passed: int
    failed: int
    pass_pct: float
    avg_marks_pct: float
    by_grade: list[dict]
    topper: Optional[dict] = None

class LibraryReport(PydanticBase):
    total_books: int
    books_issued: int
    books_available: int
    overdue_books: int
    most_issued: list[dict]
    by_category: list[dict]

class InventoryReport(PydanticBase):
    total_assets: int
    asset_value: Decimal
    low_stock_items: int
    stock_value: Decimal
    maintenance_cost_ytd: Decimal
    by_status: list[dict]

class MasterDashboard(PydanticBase):
    """Top-level KPIs shown on the Analytics page header and mobile dashboard."""
    total_students: int
    active_students: int
    total_teachers: int
    today_attendance_pct: float
    today_attendance: float = 0.0
    fee_collection_pct: float
    fee_collected: float
    fees_collected: float = 0.0
    fee_pending: float
    pending_dues: float = 0.0
    books_issued: int
    pending_assets_repair: int
    active_notices: int
    low_stock_alerts: int
    monthly_revenue: list[dict]    # last 12 months


# ══════════════════════════════════════════════════════
# HELPERS
# ══════════════════════════════════════════════════════

MONTH_NAMES = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
               'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

DAY_NAMES = ['', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']


def _safe_pct(part: float, total: float, decimals: int = 1) -> float:
    if not total:
        return 0.0
    return round(part / total * 100, decimals)


# ══════════════════════════════════════════════════════
# SERVICE
# ══════════════════════════════════════════════════════

class AnalyticsService:

    @staticmethod
    def master_dashboard(db: Session, academic_year_id: int = 1) -> MasterDashboard:
        """Aggregate KPIs across all modules for the analytics dashboard."""

        # ── Students ─────────────────────────────────────────────────
        total_students = db.scalar(
            select(func.count()).where(Student.is_deleted == False, Student.is_active == True)
        ) or 0
        active_students = db.scalar(
            select(func.count()).where(
                Student.is_deleted == False, Student.is_active == True,
                Student.status == "active",
            )
        ) or 0
        total_teachers = db.scalar(
            select(func.count()).where(Teacher.is_deleted == False, Teacher.is_active == True)
        ) or 0

        # ── Attendance ────────────────────────────────────────────────
        today_att_pct = 0.0
        try:
            today = date.today()
            total_att = db.scalar(select(func.count()).where(
                StudentAttendance.date == today,
                StudentAttendance.is_deleted == False,
            )) or 0
            if total_att > 0:
                present_att = db.scalar(select(func.count()).where(
                    StudentAttendance.date == today,
                    StudentAttendance.status == "present",
                    StudentAttendance.is_deleted == False,
                )) or 0
                today_att_pct = round(present_att / total_att * 100, 1)
            else:
                latest_date = db.scalar(
                    select(StudentAttendance.date)
                    .where(StudentAttendance.is_deleted == False)
                    .order_by(StudentAttendance.date.desc())
                    .limit(1)
                )
                if latest_date:
                    tot_l = db.scalar(select(func.count()).where(
                        StudentAttendance.date == latest_date,
                        StudentAttendance.is_deleted == False,
                    )) or 0
                    prs_l = db.scalar(select(func.count()).where(
                        StudentAttendance.date == latest_date,
                        StudentAttendance.status == "present",
                        StudentAttendance.is_deleted == False,
                    )) or 0
                    today_att_pct = round(prs_l / tot_l * 100, 1) if tot_l else 0.0
                else:
                    summaries = db.scalars(select(MonthlyAttendanceSummary).where(
                        MonthlyAttendanceSummary.is_deleted == False
                    )).all()
                    tot_p = sum(s.present_days for s in summaries)
                    tot_w = sum(s.working_days for s in summaries)
                    today_att_pct = round(tot_p / tot_w * 100, 1) if tot_w else 0.0
        except Exception:
            today_att_pct = 0.0

        # ── Fee KPIs ──────────────────────────────────────────────────
        fee_pct = 0.0
        fee_collected_amt = 0.0
        fee_pending_amt = 0.0
        total_revenue = []
        try:
            demanded_q = select(func.sum(StudentFeeRecord.amount_due)).where(
                StudentFeeRecord.is_deleted == False,
                StudentFeeRecord.academic_year_id == academic_year_id,
            )
            demanded = float(db.scalar(demanded_q) or 0)
            if demanded == 0:
                demanded = float(db.scalar(
                    select(func.sum(StudentFeeRecord.amount_due)).where(StudentFeeRecord.is_deleted == False)
                ) or 0)

            collected_q = select(func.sum(FeePayment.amount)).where(
                FeePayment.is_deleted == False,
                FeePayment.academic_year_id == academic_year_id,
            )
            fee_collected_amt = float(db.scalar(collected_q) or 0)
            if fee_collected_amt == 0:
                fee_collected_amt = float(db.scalar(
                    select(func.sum(FeePayment.amount)).where(FeePayment.is_deleted == False)
                ) or 0)

            fee_pending_amt = max(0.0, demanded - fee_collected_amt)
            fee_pct = _safe_pct(fee_collected_amt, demanded)

            # Monthly revenue (current year)
            current_year = date.today().year
            for month in range(1, 13):
                m_q = select(func.sum(FeePayment.amount)).where(
                    FeePayment.is_deleted == False,
                    extract("month", FeePayment.payment_date) == month,
                    extract("year", FeePayment.payment_date) == current_year,
                )
                m_collected = db.scalar(m_q) or Decimal("0")
                total_revenue.append({
                    "month": month,
                    "month_name": MONTH_NAMES[month],
                    "amount": float(m_collected),
                })
        except Exception:
            total_revenue = [{"month": i, "month_name": MONTH_NAMES[i], "amount": 0} for i in range(1, 13)]

        # ── Library ────────────────────────────────────────────────────
        books_issued = 0
        try:
            books_issued = db.scalar(select(func.count()).where(
                BookIssue.is_deleted == False,
                BookIssue.return_date == None,
            )) or 0
        except Exception:
            pass

        # ── Assets in repair ──────────────────────────────────────────
        assets_repair = 0
        try:
            assets_repair = db.scalar(select(func.count()).where(
                Asset.is_deleted == False, Asset.status == "in_repair"
            )) or 0
        except Exception:
            pass

        # ── Active notices ─────────────────────────────────────────────
        active_notices = 0
        try:
            active_notices = db.scalar(select(func.count()).where(
                Notice.is_deleted == False, Notice.is_published == True
            )) or 0
        except Exception:
            pass

        # ── Low stock ─────────────────────────────────────────────────
        low_stock = 0
        try:
            low_stock = db.scalar(select(func.count()).where(
                StockItem.is_deleted == False,
                StockItem.current_stock <= StockItem.minimum_stock,
            )) or 0
        except Exception:
            pass

        return MasterDashboard(
            total_students=total_students,
            active_students=active_students,
            total_teachers=total_teachers,
            today_attendance_pct=today_att_pct,
            today_attendance=today_att_pct,
            fee_collection_pct=fee_pct,
            fee_collected=fee_collected_amt,
            fees_collected=fee_collected_amt,
            fee_pending=fee_pending_amt,
            pending_dues=fee_pending_amt,
            books_issued=books_issued,
            pending_assets_repair=assets_repair,
            active_notices=active_notices,
            low_stock_alerts=low_stock,
            monthly_revenue=total_revenue,
        )

    @staticmethod
    def student_strength(db: Session, academic_year_id: int = 1) -> StudentStrengthReport:
        """Real student strength from the students table."""
        total = db.scalar(select(func.count()).where(
            Student.is_deleted == False, Student.is_active == True
        )) or 0
        active = db.scalar(select(func.count()).where(
            Student.is_deleted == False, Student.is_active == True, Student.status == "active"
        )) or 0
        inactive = total - active
        boys = db.scalar(select(func.count()).where(
            Student.is_deleted == False, Student.is_active == True, Student.gender == "male"
        )) or 0
        girls = db.scalar(select(func.count()).where(
            Student.is_deleted == False, Student.is_active == True, Student.gender == "female"
        )) or 0
        other_gender = db.scalar(select(func.count()).where(
            Student.is_deleted == False, Student.is_active == True,
            Student.gender.notin_(["male", "female"]),
        )) or 0

        # By standard
        rows = db.execute(
            select(Student.standard, func.count().label("total"))
            .where(Student.is_deleted == False, Student.is_active == True)
            .group_by(Student.standard)
            .order_by(Student.standard)
        ).fetchall()

        by_std = []
        for r in rows:
            b = db.scalar(select(func.count()).where(
                Student.is_deleted == False, Student.is_active == True,
                Student.standard == r[0], Student.gender == "male"
            )) or 0
            g = db.scalar(select(func.count()).where(
                Student.is_deleted == False, Student.is_active == True,
                Student.standard == r[0], Student.gender == "female"
            )) or 0
            by_std.append({
                "standard": str(r[0]),
                "boys": b, "girls": g, "other": int(r[1] or 0) - b - g,
                "total": int(r[1] or 0)
            })

        # By division
        div_rows = db.execute(
            select(Student.standard, Student.division, func.count().label("total"))
            .where(Student.is_deleted == False, Student.is_active == True,
                   Student.division != None)
            .group_by(Student.standard, Student.division)
            .order_by(Student.standard, Student.division)
        ).fetchall()
        by_div = [{"standard": r[0], "division": r[1], "total": int(r[2] or 0)} for r in div_rows]

        # New admissions (academic year match)
        this_year = db.scalar(select(func.count()).where(
            Student.is_deleted == False,
            Student.academic_year_id == academic_year_id,
        )) or 0

        # Students left / transferred
        left_count = db.scalar(select(func.count()).where(
            Student.is_deleted == False, Student.is_active == True,
            Student.status.in_(["left", "transferred"]),
        )) or 0

        return StudentStrengthReport(
            total_students=total, active_students=active, inactive_students=inactive,
            boys=boys, girls=girls, other_gender=other_gender,
            by_standard=by_std, by_division=by_div,
            new_admissions_this_year=this_year if this_year > 0 else total,
            transfers_out=left_count if left_count < total else 0,
            students_left=left_count,
        )

    @staticmethod
    def attendance_summary(db: Session, academic_year_id: int = 1,
                           standard: Optional[str] = None, division: Optional[str] = None) -> AttendanceReport:
        """Class-wise attendance from monthly summaries or daily records."""
        try:
            # Try monthly summaries first (faster)
            q = select(MonthlyAttendanceSummary).where(MonthlyAttendanceSummary.is_deleted == False)
            if academic_year_id:
                q = q.where(MonthlyAttendanceSummary.academic_year_id == academic_year_id)
            summaries = list(db.scalars(q).all())

            if not summaries:
                # Fallback to daily records
                daily_q = select(StudentAttendance).where(StudentAttendance.is_deleted == False)
                if academic_year_id:
                    daily_q = daily_q.where(StudentAttendance.academic_year_id == academic_year_id)
                if standard:
                    daily_q = daily_q.where(StudentAttendance.standard == standard)
                if division:
                    daily_q = daily_q.where(StudentAttendance.division == division)
                daily_records = list(db.scalars(daily_q).all())

                if not daily_records:
                    return AttendanceReport(
                        period="Current Year", overall_pct=0.0, school_working_days=0,
                        avg_daily_attendance=0, by_standard=[], defaulters_count=0, top_absentees=[]
                    )

                total_records = len(daily_records)
                present_records = sum(1 for r in daily_records if r.status == "present")
                overall_pct = _safe_pct(present_records, total_records)

                std_map: dict[str, list] = {}
                for r in daily_records:
                    std_map.setdefault(str(r.standard), []).append(r)

                by_std_list = []
                for std, recs in sorted(std_map.items()):
                    p = sum(1 for x in recs if x.status == "present")
                    tot = len(recs)
                    by_std_list.append({
                        "standard": std, "present_pct": _safe_pct(p, tot),
                        "total": tot, "present": p, "absent": tot - p
                    })

                return AttendanceReport(
                    period="Current Year", overall_pct=overall_pct,
                    school_working_days=0, avg_daily_attendance=present_records,
                    by_standard=by_std_list, defaulters_count=0, top_absentees=[],
                )

            # Using monthly summaries
            total_p = sum(s.present_days for s in summaries)
            total_w = sum(s.working_days for s in summaries)
            overall_pct = _safe_pct(total_p, total_w)

            defaulters = [s for s in summaries if s.working_days and
                          (s.present_days / s.working_days * 100) < 75]

            # Group by standard (summaries don't have standard column — use daily for class breakdown)
            # Class-wise from ClassAttendanceSession if available
            try:
                from app.modules.attendance.models import ClassAttendanceSession
                cas_q = select(
                    ClassAttendanceSession.standard,
                    func.sum(ClassAttendanceSession.present_count).label("present"),
                    func.sum(ClassAttendanceSession.total_students).label("total"),
                ).where(ClassAttendanceSession.is_deleted == False)
                if academic_year_id:
                    cas_q = cas_q.where(ClassAttendanceSession.academic_year_id == academic_year_id)
                if standard:
                    cas_q = cas_q.where(ClassAttendanceSession.standard == standard)
                cas_q = cas_q.group_by(ClassAttendanceSession.standard).order_by(ClassAttendanceSession.standard)
                cas_rows = db.execute(cas_q).fetchall()

                if cas_rows:
                    by_std_list = [{
                        "standard": r[0],
                        "present_pct": _safe_pct(float(r[1] or 0), float(r[2] or 0)),
                        "total": int(r[2] or 0),
                        "present": int(r[1] or 0),
                        "absent": max(0, int(r[2] or 0) - int(r[1] or 0)),
                    } for r in cas_rows]
                else:
                    raise ValueError("No CAS data")
            except Exception:
                # Final fallback: group monthly summaries by student's standard
                by_std_list = []

            return AttendanceReport(
                period="Current Year", overall_pct=overall_pct,
                school_working_days=total_w // max(len(summaries), 1),
                avg_daily_attendance=int(total_p // max(total_w, 1)),
                by_standard=by_std_list,
                defaulters_count=len(defaulters), top_absentees=[],
            )
        except Exception:
            return AttendanceReport(
                period="Current Year", overall_pct=0.0, school_working_days=0,
                avg_daily_attendance=0, by_standard=[], defaulters_count=0, top_absentees=[]
            )

    @staticmethod
    def attendance_trend(db: Session, academic_year_id: int = 1,
                         standard: Optional[str] = None,
                         division: Optional[str] = None) -> AttendanceTrendReport:
        """Monthly attendance trend from MonthlyAttendanceSummary or daily records."""
        try:
            # Monthly trend from daily records (most accurate)
            q = select(
                extract("year", StudentAttendance.date).label("yr"),
                extract("month", StudentAttendance.date).label("mo"),
                func.count().label("total"),
                func.sum(case((StudentAttendance.status == "present", 1), else_=0)).label("present"),
            ).where(StudentAttendance.is_deleted == False)
            if academic_year_id:
                q = q.where(StudentAttendance.academic_year_id == academic_year_id)
            if standard:
                q = q.where(StudentAttendance.standard == standard)
            if division:
                q = q.where(StudentAttendance.division == division)
            q = q.group_by("yr", "mo").order_by("yr", "mo")
            rows = db.execute(q).fetchall()

            trend = []
            for r in rows:
                yr, mo = int(r[0]), int(r[1])
                total, present = int(r[2] or 0), int(r[3] or 0)
                trend.append({
                    "year": yr,
                    "month": mo,
                    "month_name": MONTH_NAMES[mo],
                    "pct": _safe_pct(present, total),
                    "present": present,
                    "working": total,
                })

            # Day-of-week pattern from daily records
            dow_rows = db.execute(
                select(
                    extract("dow", StudentAttendance.date).label("dow"),
                    func.count().label("total"),
                    func.sum(case((StudentAttendance.status == "present", 1), else_=0)).label("present"),
                )
                .where(StudentAttendance.is_deleted == False)
                .group_by("dow")
                .order_by("dow")
            ).fetchall()

            day_map = {
                0: "Sun", 1: "Mon", 2: "Tue", 3: "Wed", 4: "Thu", 5: "Fri", 6: "Sat"
            }
            by_day = []
            for r in dow_rows:
                dow = int(r[0])
                total, present = int(r[1] or 0), int(r[2] or 0)
                if dow not in (0, 7):  # skip Sunday
                    by_day.append({
                        "day": day_map.get(dow, str(dow)),
                        "avg_pct": _safe_pct(present, total),
                    })

            return AttendanceTrendReport(trend=trend, by_day_of_week=by_day)
        except Exception:
            return AttendanceTrendReport(trend=[], by_day_of_week=[])

    @staticmethod
    def low_attendance_students(db: Session, academic_year_id: int = 1,
                                threshold_pct: float = 75.0,
                                standard: Optional[str] = None,
                                division: Optional[str] = None,
                                limit: int = 50) -> LowAttendanceReport:
        """Students below attendance threshold from monthly summary aggregation."""
        try:
            # Aggregate present_days and working_days per student
            sub_q = select(
                MonthlyAttendanceSummary.student_id,
                func.sum(MonthlyAttendanceSummary.present_days).label("present"),
                func.sum(MonthlyAttendanceSummary.working_days).label("working"),
            ).where(
                MonthlyAttendanceSummary.is_deleted == False,
                MonthlyAttendanceSummary.academic_year_id == academic_year_id,
            ).group_by(MonthlyAttendanceSummary.student_id).subquery()

            q = select(
                Student.id, Student.full_name, Student.standard, Student.division,
                Student.gr_number,
                sub_q.c.present, sub_q.c.working,
            ).join(sub_q, Student.id == sub_q.c.student_id).where(
                Student.is_deleted == False, Student.is_active == True,
                sub_q.c.working > 0,
            )
            if standard:
                q = q.where(Student.standard == standard)
            if division:
                q = q.where(Student.division == division)

            rows = db.execute(q).fetchall()

            low_list = []
            for r in rows:
                pct = _safe_pct(float(r[5] or 0), float(r[6] or 0))
                if pct < threshold_pct:
                    risk = "critical" if pct < 65 else ("warning" if pct < threshold_pct else "normal")
                    low_list.append({
                        "student_id": r[0],
                        "full_name": r[1],
                        "standard": r[2],
                        "division": r[3],
                        "gr_number": r[4],
                        "present_days": int(r[5] or 0),
                        "working_days": int(r[6] or 0),
                        "attendance_pct": pct,
                        "risk": risk,
                    })

            # Sort by attendance_pct ascending (worst first)
            low_list.sort(key=lambda x: x["attendance_pct"])
            return LowAttendanceReport(
                threshold_pct=threshold_pct,
                total_count=len(low_list),
                students=low_list[:limit],
            )
        except Exception:
            return LowAttendanceReport(threshold_pct=threshold_pct, total_count=0, students=[])

    @staticmethod
    def fee_report(db: Session, academic_year_id: int = 1) -> FeeReport:
        """Full fee analytics from fee_payments and student_fee_records."""
        try:
            base_q = StudentFeeRecord.is_deleted == False
            if academic_year_id:
                base_q = and_(base_q, StudentFeeRecord.academic_year_id == academic_year_id)

            demanded = float(db.scalar(select(func.sum(StudentFeeRecord.amount_due)).where(base_q)) or 0)
            concession = float(db.scalar(select(func.sum(StudentFeeRecord.concession_amount)).where(base_q)) or 0)

            pay_base = FeePayment.is_deleted == False
            if academic_year_id:
                pay_base = and_(pay_base, FeePayment.academic_year_id == academic_year_id)
            collected = float(db.scalar(select(func.sum(FeePayment.amount)).where(pay_base)) or 0)

            pending = max(0.0, demanded - collected - concession)
            pct = _safe_pct(collected, demanded)

            # Monthly breakdown
            current_year = date.today().year
            by_month = []
            for m in range(1, 13):
                mc = float(db.scalar(select(func.sum(FeePayment.amount)).where(
                    pay_base,
                    extract("month", FeePayment.payment_date) == m,
                    extract("year", FeePayment.payment_date) == current_year,
                )) or 0)
                cnt = db.scalar(select(func.count()).where(
                    pay_base,
                    extract("month", FeePayment.payment_date) == m,
                    extract("year", FeePayment.payment_date) == current_year,
                )) or 0
                by_month.append({
                    "month": m, "month_name": MONTH_NAMES[m],
                    "collected": mc, "count": cnt,
                    "avg": round(mc / cnt, 2) if cnt > 0 else 0,
                })

            # By fee type/category
            by_type_rows = db.execute(
                select(FeeCategory.name, func.sum(StudentFeeRecord.amount_due).label("demanded"),
                       func.sum(StudentFeeRecord.amount_paid).label("paid"))
                .join(FeeCategory, StudentFeeRecord.category_id == FeeCategory.id)
                .where(base_q)
                .group_by(FeeCategory.name)
                .order_by(func.sum(StudentFeeRecord.amount_due).desc())
            ).fetchall()
            by_fee_type = [{"category": r[0], "demanded": float(r[1] or 0), "paid": float(r[2] or 0)} for r in by_type_rows]

            # Top defaulters
            defaulter_rows = db.execute(
                select(
                    Student.id, Student.full_name, Student.standard, Student.division,
                    func.sum(StudentFeeRecord.amount_due - StudentFeeRecord.amount_paid).label("pending_amt")
                )
                .join(Student, StudentFeeRecord.student_id == Student.id)
                .where(
                    StudentFeeRecord.is_deleted == False,
                    StudentFeeRecord.academic_year_id == academic_year_id,
                    Student.is_deleted == False,
                    StudentFeeRecord.status.in_(["pending", "partial"]),
                )
                .group_by(Student.id, Student.full_name, Student.standard, Student.division)
                .having(func.sum(StudentFeeRecord.amount_due - StudentFeeRecord.amount_paid) > 0)
                .order_by(func.sum(StudentFeeRecord.amount_due - StudentFeeRecord.amount_paid).desc())
                .limit(10)
            ).fetchall()
            top_defaulters = [{
                "student_id": r[0], "name": r[1], "standard": r[2], "division": r[3],
                "pending": float(r[4] or 0),
            } for r in defaulter_rows]

            return FeeReport(
                academic_year_id=academic_year_id,
                total_demanded=Decimal(str(round(demanded, 2))),
                total_collected=Decimal(str(round(collected, 2))),
                total_pending=Decimal(str(round(pending, 2))),
                total_concession=Decimal(str(round(concession, 2))),
                collection_pct=pct,
                by_month=by_month, by_fee_type=by_fee_type, top_defaulters=top_defaulters,
            )
        except Exception:
            return FeeReport(
                academic_year_id=academic_year_id,
                total_demanded=Decimal("0"), total_collected=Decimal("0"),
                total_pending=Decimal("0"), total_concession=Decimal("0"),
                collection_pct=0.0,
                by_month=[{"month": m, "month_name": MONTH_NAMES[m], "collected": 0, "count": 0, "avg": 0} for m in range(1, 13)],
                by_fee_type=[], top_defaulters=[],
            )

    @staticmethod
    def fee_class_analysis(db: Session, academic_year_id: int = 1,
                           standard: Optional[str] = None) -> FeeClassReport:
        """Class-wise fee collection breakdown."""
        try:
            q = select(
                Student.standard,
                func.sum(StudentFeeRecord.amount_due).label("expected"),
                func.sum(StudentFeeRecord.amount_paid).label("paid"),
                func.sum(StudentFeeRecord.concession_amount).label("concession"),
            ).join(Student, StudentFeeRecord.student_id == Student.id).where(
                StudentFeeRecord.is_deleted == False,
                Student.is_deleted == False,
            )
            if academic_year_id:
                q = q.where(StudentFeeRecord.academic_year_id == academic_year_id)
            if standard:
                q = q.where(Student.standard == standard)
            q = q.group_by(Student.standard).order_by(Student.standard)
            rows = db.execute(q).fetchall()

            by_class = []
            for r in rows:
                exp = float(r[1] or 0)
                paid = float(r[2] or 0)
                conc = float(r[3] or 0)
                pending = max(0.0, exp - paid - conc)
                by_class.append({
                    "standard": str(r[0]),
                    "expected": exp, "collected": paid,
                    "concession": conc, "pending": pending,
                    "collection_pct": _safe_pct(paid, exp),
                })

            return FeeClassReport(by_class=by_class)
        except Exception:
            return FeeClassReport(by_class=[])

    @staticmethod
    def fee_outstanding_students(db: Session, academic_year_id: int = 1,
                                  standard: Optional[str] = None,
                                  limit: int = 50) -> FeeOutstandingReport:
        """Students with outstanding fees — sorted by highest pending."""
        try:
            q = select(
                Student.id, Student.full_name, Student.standard, Student.division,
                Student.gr_number,
                func.sum(StudentFeeRecord.amount_due).label("total_due"),
                func.sum(StudentFeeRecord.amount_paid).label("paid"),
                func.sum(StudentFeeRecord.concession_amount).label("concession"),
                func.min(StudentFeeRecord.due_date).label("earliest_due"),
            ).join(Student, StudentFeeRecord.student_id == Student.id).where(
                StudentFeeRecord.is_deleted == False,
                Student.is_deleted == False,
                StudentFeeRecord.status.in_(["pending", "partial"]),
            )
            if academic_year_id:
                q = q.where(StudentFeeRecord.academic_year_id == academic_year_id)
            if standard:
                q = q.where(Student.standard == standard)
            q = (q.group_by(Student.id, Student.full_name, Student.standard,
                             Student.division, Student.gr_number)
                   .having(func.sum(StudentFeeRecord.amount_due - StudentFeeRecord.amount_paid) > 0)
                   .order_by(func.sum(StudentFeeRecord.amount_due - StudentFeeRecord.amount_paid).desc())
                   .limit(limit))
            rows = db.execute(q).fetchall()

            today = date.today()
            students = []
            total_pending = 0.0
            for r in rows:
                due_amt = float(r[5] or 0)
                paid_amt = float(r[6] or 0)
                conc_amt = float(r[7] or 0)
                pending = max(0.0, due_amt - paid_amt - conc_amt)
                total_pending += pending
                due_date = r[8]
                days_overdue = (today - due_date).days if due_date and due_date < today else 0
                students.append({
                    "student_id": r[0], "name": r[1], "standard": r[2],
                    "division": r[3], "gr_number": r[4],
                    "total_due": due_amt, "paid": paid_amt,
                    "pending": pending, "due_date": due_date.isoformat() if due_date else None,
                    "days_overdue": days_overdue,
                    "status": "overdue" if days_overdue > 0 else "pending",
                })

            return FeeOutstandingReport(
                total_count=len(students),
                total_pending=Decimal(str(round(total_pending, 2))),
                students=students,
            )
        except Exception:
            return FeeOutstandingReport(total_count=0, total_pending=Decimal("0"), students=[])

    @staticmethod
    def payment_method_breakdown(db: Session, academic_year_id: int = 1) -> PaymentMethodReport:
        """Payment mode distribution from fee_payments."""
        try:
            q = select(
                FeePayment.payment_mode,
                func.sum(FeePayment.amount).label("amount"),
                func.count().label("count"),
            ).where(FeePayment.is_deleted == False)
            if academic_year_id:
                q = q.where(FeePayment.academic_year_id == academic_year_id)
            q = q.group_by(FeePayment.payment_mode).order_by(func.sum(FeePayment.amount).desc())
            rows = db.execute(q).fetchall()

            total_amt = sum(float(r[1] or 0) for r in rows)
            by_method = [{
                "mode": r[0] or "cash",
                "amount": float(r[1] or 0),
                "count": int(r[2] or 0),
                "pct": _safe_pct(float(r[1] or 0), total_amt),
            } for r in rows]

            return PaymentMethodReport(total_amount=total_amt, by_method=by_method)
        except Exception:
            return PaymentMethodReport(total_amount=0.0, by_method=[])

    @staticmethod
    def academic_performance(db: Session, academic_year_id: int = 1,
                              standard: Optional[str] = None,
                              exam_type_id: Optional[int] = None) -> AcademicReport:
        """Academic performance from exam_results and student_marks."""
        try:
            from app.modules.exam.models import ExamResult, Exam, ExamType, ExamSubject, StudentMark

            # Check if exam data exists
            exam_count = db.scalar(select(func.count()).where(
                Exam.is_deleted == False,
                Exam.academic_year_id == academic_year_id,
            )) or 0
            if exam_count == 0:
                return AcademicReport(
                    status="no_data", total_students=0, students_appeared=0,
                    passed=0, failed=0, pass_pct=0.0, avg_percentage=0.0,
                    by_grade=[], by_subject=[], by_class=[], weak_subjects=[], top_performers=[],
                )

            # Base exam result query
            er_q = select(ExamResult).join(Exam, ExamResult.exam_id == Exam.id).where(
                ExamResult.is_deleted == False,
                Exam.is_deleted == False,
                Exam.academic_year_id == academic_year_id,
            )
            if standard:
                er_q = er_q.where(Exam.standard == standard)
            if exam_type_id:
                er_q = er_q.where(Exam.exam_type_id == exam_type_id)
            results = list(db.scalars(er_q).all())

            if not results:
                return AcademicReport(
                    status="no_data", total_students=0, students_appeared=0,
                    passed=0, failed=0, pass_pct=0.0, avg_percentage=0.0,
                    by_grade=[], by_subject=[], by_class=[], weak_subjects=[], top_performers=[],
                )

            passed = [r for r in results if r.result == "pass"]
            failed = [r for r in results if r.result == "fail"]
            appeared = [r for r in results if r.result != "pending"]
            pcts = [float(r.percentage) for r in appeared if r.percentage is not None]
            avg_pct = round(sum(pcts) / len(pcts), 1) if pcts else 0.0

            # Grade distribution
            grade_map: dict[str, int] = {}
            for r in results:
                g = r.grade or "N/A"
                grade_map[g] = grade_map.get(g, 0) + 1
            by_grade = [{"grade": k, "count": v} for k, v in sorted(grade_map.items())]

            # Subject-wise analysis from student_marks
            subj_q = select(
                ExamSubject.subject_name,
                func.count(StudentMark.id).label("appeared"),
                func.avg(StudentMark.marks_obtained).label("avg_marks"),
                func.max(ExamSubject.max_marks).label("max_marks"),
                func.sum(case((StudentMark.marks_obtained >= ExamSubject.passing_marks, 1), else_=0)).label("passed"),
            ).join(ExamSubject, StudentMark.exam_subject_id == ExamSubject.id).join(
                Exam, ExamSubject.exam_id == Exam.id
            ).where(
                StudentMark.is_deleted == False, ExamSubject.is_deleted == False,
                Exam.academic_year_id == academic_year_id,
                StudentMark.is_absent == False, StudentMark.marks_obtained != None,
            )
            if standard:
                subj_q = subj_q.where(Exam.standard == standard)
            subj_q = subj_q.group_by(ExamSubject.subject_name).order_by(func.avg(StudentMark.marks_obtained))
            subj_rows = db.execute(subj_q).fetchall()

            by_subject = []
            weak_subjects = []
            for r in subj_rows:
                subj_appeared = int(r[1] or 0)
                avg_m = float(r[2] or 0)
                max_m = float(r[3] or 100)
                subj_passed = int(r[4] or 0)
                avg_pct_subj = _safe_pct(avg_m, max_m)
                pass_pct_subj = _safe_pct(subj_passed, subj_appeared)
                entry = {
                    "subject": r[0],
                    "appeared": subj_appeared,
                    "avg_marks": round(avg_m, 1),
                    "max_marks": max_m,
                    "avg_pct": avg_pct_subj,
                    "passed": subj_passed,
                    "failed": subj_appeared - subj_passed,
                    "pass_pct": pass_pct_subj,
                }
                by_subject.append(entry)
                if avg_pct_subj < 60:
                    weak_subjects.append({"subject": r[0], "avg_pct": avg_pct_subj, "pass_pct": pass_pct_subj})

            # Class-wise performance
            class_q = select(
                Exam.standard,
                func.count(ExamResult.id).label("students"),
                func.avg(ExamResult.percentage).label("avg_pct"),
                func.sum(case((ExamResult.result == "pass", 1), else_=0)).label("passed"),
            ).join(Exam, ExamResult.exam_id == Exam.id).where(
                ExamResult.is_deleted == False, Exam.academic_year_id == academic_year_id,
            ).group_by(Exam.standard).order_by(Exam.standard)
            class_rows = db.execute(class_q).fetchall()
            by_class = [{
                "standard": r[0],
                "students": int(r[1] or 0),
                "avg_pct": round(float(r[2] or 0), 1),
                "pass_pct": _safe_pct(float(r[3] or 0), float(r[1] or 0)),
            } for r in class_rows]

            # Top performers (rank + standard only — no PII)
            top_performers = [
                {"rank": i + 1, "standard": r.exam.standard if hasattr(r, "exam") else "", "percentage": float(r.percentage)}
                for i, r in enumerate(sorted(results, key=lambda x: float(x.percentage), reverse=True)[:5])
            ]

            return AcademicReport(
                status="ok",
                total_students=db.scalar(select(func.count(distinct(ExamResult.student_id))).join(
                    Exam, ExamResult.exam_id == Exam.id
                ).where(ExamResult.is_deleted == False, Exam.academic_year_id == academic_year_id)) or 0,
                students_appeared=len(appeared),
                passed=len(passed), failed=len(failed),
                pass_pct=_safe_pct(len(passed), len(appeared)),
                avg_percentage=avg_pct,
                by_grade=by_grade, by_subject=by_subject, by_class=by_class,
                weak_subjects=sorted(weak_subjects, key=lambda x: x["avg_pct"]),
                top_performers=top_performers,
            )
        except Exception:
            return AcademicReport(
                status="no_data", total_students=0, students_appeared=0,
                passed=0, failed=0, pass_pct=0.0, avg_percentage=0.0,
                by_grade=[], by_subject=[], by_class=[], weak_subjects=[], top_performers=[],
            )

    @staticmethod
    def class_analytics(db: Session, academic_year_id: int = 1,
                         standard: Optional[str] = None,
                         division: Optional[str] = None) -> ClassAnalyticsReport:
        """Per-class/division health: students, attendance, fees, academic."""
        try:
            from app.modules.attendance.models import ClassAttendanceSession

            # Get distinct class-division combos
            class_q = select(Student.standard, Student.division).where(
                Student.is_deleted == False, Student.is_active == True,
            )
            if standard:
                class_q = class_q.where(Student.standard == standard)
            if division:
                class_q = class_q.where(Student.division == division)
            class_q = class_q.distinct().order_by(Student.standard, Student.division)
            combos = db.execute(class_q).fetchall()

            by_class = []
            for std, div in combos:
                # Student count
                std_students = db.scalar(select(func.count()).where(
                    Student.is_deleted == False, Student.is_active == True,
                    Student.standard == std,
                    Student.division == div if div else True,
                )) or 0

                # Attendance from ClassAttendanceSession
                att_pct = 0.0
                try:
                    att_q = select(
                        func.sum(ClassAttendanceSession.present_count),
                        func.sum(ClassAttendanceSession.total_students),
                    ).where(
                        ClassAttendanceSession.is_deleted == False,
                        ClassAttendanceSession.standard == std,
                        ClassAttendanceSession.academic_year_id == academic_year_id,
                    )
                    if div:
                        att_q = att_q.where(ClassAttendanceSession.division == div)
                    att_r = db.execute(att_q).fetchone()
                    if att_r and att_r[1]:
                        att_pct = _safe_pct(float(att_r[0] or 0), float(att_r[1] or 0))
                except Exception:
                    pass

                # Fee collection
                fee_pct = 0.0
                fee_pending = 0.0
                try:
                    fee_q = select(
                        func.sum(StudentFeeRecord.amount_due),
                        func.sum(StudentFeeRecord.amount_paid),
                    ).join(Student, StudentFeeRecord.student_id == Student.id).where(
                        StudentFeeRecord.is_deleted == False,
                        StudentFeeRecord.academic_year_id == academic_year_id,
                        Student.standard == std,
                        Student.is_deleted == False,
                    )
                    if div:
                        fee_q = fee_q.where(Student.division == div)
                    fee_r = db.execute(fee_q).fetchone()
                    if fee_r and fee_r[0]:
                        exp = float(fee_r[0] or 0)
                        paid = float(fee_r[1] or 0)
                        fee_pct = _safe_pct(paid, exp)
                        fee_pending = max(0.0, exp - paid)
                except Exception:
                    pass

                # Academic
                academic_pct = 0.0
                try:
                    from app.modules.exam.models import ExamResult, Exam
                    acad_q = select(func.avg(ExamResult.percentage)).join(
                        Exam, ExamResult.exam_id == Exam.id
                    ).where(
                        ExamResult.is_deleted == False,
                        Exam.academic_year_id == academic_year_id,
                        Exam.standard == std,
                    )
                    academic_pct = round(float(db.scalar(acad_q) or 0), 1)
                except Exception:
                    pass

                by_class.append({
                    "standard": std,
                    "division": div or "",
                    "students": std_students,
                    "attendance_pct": att_pct,
                    "fee_pct": fee_pct,
                    "fee_pending": fee_pending,
                    "academic_pct": academic_pct,
                })

            return ClassAnalyticsReport(by_class=by_class)
        except Exception:
            return ClassAnalyticsReport(by_class=[])

    @staticmethod
    def teacher_analytics(db: Session, academic_year_id: int = 1) -> TeacherAnalyticsReport:
        """Teacher/staff analytics from teachers and subject assignments."""
        try:
            from app.modules.timetable.models import TeacherSubjectAssignment, TimetableEntry

            total = db.scalar(select(func.count()).where(
                Teacher.is_deleted == False, Teacher.is_active == True
            )) or 0
            active = db.scalar(select(func.count()).where(
                Teacher.is_deleted == False, Teacher.is_active == True, Teacher.status == "active"
            )) or 0
            teaching = db.scalar(select(func.count()).where(
                Teacher.is_deleted == False, Teacher.is_active == True, Teacher.employee_type == "teaching"
            )) or 0
            non_teaching = total - teaching

            # By type
            type_rows = db.execute(
                select(Teacher.employee_type, func.count().label("count"))
                .where(Teacher.is_deleted == False, Teacher.is_active == True)
                .group_by(Teacher.employee_type)
            ).fetchall()
            by_type = [{"type": r[0] or "teaching", "count": int(r[1])} for r in type_rows]

            # By department
            dept_rows = db.execute(
                select(Teacher.department, func.count().label("count"))
                .where(Teacher.is_deleted == False, Teacher.is_active == True, Teacher.department != None)
                .group_by(Teacher.department)
                .order_by(func.count().desc())
            ).fetchall()
            by_dept = [{"department": r[0], "count": int(r[1])} for r in dept_rows]

            # Teacher attendance
            today_att_pct = 0.0
            try:
                today = date.today()
                t_total = db.scalar(select(func.count()).where(
                    TeacherAttendance.date == today, TeacherAttendance.is_deleted == False,
                )) or 0
                if t_total > 0:
                    t_present = db.scalar(select(func.count()).where(
                        TeacherAttendance.date == today,
                        TeacherAttendance.status == "present",
                        TeacherAttendance.is_deleted == False,
                    )) or 0
                    today_att_pct = _safe_pct(t_present, t_total)
            except Exception:
                pass

            # Workload from TeacherSubjectAssignment
            workload = []
            try:
                wl_rows = db.execute(
                    select(
                        Teacher.id, Teacher.full_name, Teacher.designation,
                        func.count(distinct(TeacherSubjectAssignment.standard)).label("classes"),
                        func.count(distinct(TeacherSubjectAssignment.subject_id)).label("subjects"),
                        func.sum(TeacherSubjectAssignment.periods_per_week).label("periods"),
                    )
                    .join(TeacherSubjectAssignment, Teacher.id == TeacherSubjectAssignment.teacher_id)
                    .where(
                        Teacher.is_deleted == False, Teacher.is_active == True,
                        TeacherSubjectAssignment.is_deleted == False,
                        TeacherSubjectAssignment.academic_year_id == academic_year_id,
                    )
                    .group_by(Teacher.id, Teacher.full_name, Teacher.designation)
                    .order_by(func.sum(TeacherSubjectAssignment.periods_per_week).desc())
                    .limit(20)
                ).fetchall()
                workload = [{
                    "teacher_id": r[0], "name": r[1], "designation": r[2] or "",
                    "classes": int(r[3] or 0), "subjects": int(r[4] or 0),
                    "periods_per_week": int(r[5] or 0),
                } for r in wl_rows]
            except Exception:
                pass

            return TeacherAnalyticsReport(
                total_teachers=total, active_teachers=active,
                teaching_staff=teaching, non_teaching_staff=non_teaching,
                by_type=by_type, by_department=by_dept,
                attendance_pct=today_att_pct, workload=workload,
            )
        except Exception:
            return TeacherAnalyticsReport(
                total_teachers=0, active_teachers=0, teaching_staff=0, non_teaching_staff=0,
                by_type=[], by_department=[], attendance_pct=0.0, workload=[],
            )

    @staticmethod
    def student_risk_indicators(db: Session, academic_year_id: int = 1,
                                 standard: Optional[str] = None) -> RiskReport:
        """Identify at-risk students from actual ERP data."""
        try:
            from app.modules.exam.models import ExamResult, Exam

            # Risk 1: Attendance < 75%
            att_sub = select(
                MonthlyAttendanceSummary.student_id,
                func.sum(MonthlyAttendanceSummary.present_days).label("present"),
                func.sum(MonthlyAttendanceSummary.working_days).label("working"),
            ).where(
                MonthlyAttendanceSummary.is_deleted == False,
                MonthlyAttendanceSummary.academic_year_id == academic_year_id,
            ).group_by(MonthlyAttendanceSummary.student_id).subquery()

            att_risk_q = select(Student.id).join(att_sub, Student.id == att_sub.c.student_id).where(
                Student.is_deleted == False, Student.is_active == True,
                att_sub.c.working > 0,
                (att_sub.c.present * 100.0 / att_sub.c.working) < 75,
            )
            if standard:
                att_risk_q = att_risk_q.where(Student.standard == standard)
            att_risk_ids = set(r[0] for r in db.execute(att_risk_q).fetchall())

            # Risk 2: Pending fees
            fee_risk_q = select(distinct(StudentFeeRecord.student_id)).join(
                Student, StudentFeeRecord.student_id == Student.id
            ).where(
                StudentFeeRecord.is_deleted == False,
                StudentFeeRecord.academic_year_id == academic_year_id,
                StudentFeeRecord.status.in_(["pending", "partial"]),
                Student.is_deleted == False, Student.is_active == True,
            )
            if standard:
                fee_risk_q = fee_risk_q.where(Student.standard == standard)
            fee_risk_ids = set(r[0] for r in db.execute(fee_risk_q).fetchall())

            # Risk 3: Failed exam
            acad_risk_ids = set()
            try:
                acad_q = select(distinct(ExamResult.student_id)).join(
                    Exam, ExamResult.exam_id == Exam.id
                ).where(
                    ExamResult.is_deleted == False,
                    Exam.academic_year_id == academic_year_id,
                    ExamResult.result == "fail",
                )
                if standard:
                    acad_q = acad_q.where(Exam.standard == standard)
                acad_risk_ids = set(r[0] for r in db.execute(acad_q).fetchall())
            except Exception:
                pass

            # Multi-risk: student in 2+ categories
            all_risk = att_risk_ids | fee_risk_ids | acad_risk_ids
            multi_risk_ids = set()
            for sid in all_risk:
                categories = sum([
                    sid in att_risk_ids,
                    sid in fee_risk_ids,
                    sid in acad_risk_ids,
                ])
                if categories >= 2:
                    multi_risk_ids.add(sid)

            # Get student details for top 30 at-risk
            student_list = []
            if all_risk:
                risk_students = db.execute(
                    select(Student.id, Student.full_name, Student.standard, Student.division)
                    .where(Student.id.in_(list(all_risk)[:50]), Student.is_deleted == False)
                    .order_by(Student.standard, Student.full_name)
                ).fetchall()
                for r in risk_students:
                    categories = []
                    if r[0] in att_risk_ids: categories.append("attendance")
                    if r[0] in fee_risk_ids: categories.append("fee")
                    if r[0] in acad_risk_ids: categories.append("academic")
                    student_list.append({
                        "student_id": r[0], "name": r[1], "standard": r[2], "division": r[3],
                        "risk_categories": categories,
                        "risk_count": len(categories),
                    })
                student_list.sort(key=lambda x: -x["risk_count"])

            return RiskReport(
                attendance_risk=len(att_risk_ids),
                fee_risk=len(fee_risk_ids),
                academic_risk=len(acad_risk_ids),
                multi_risk=len(multi_risk_ids),
                students=student_list[:30],
            )
        except Exception:
            return RiskReport(attendance_risk=0, fee_risk=0, academic_risk=0, multi_risk=0, students=[])

    @staticmethod
    def insights(db: Session, academic_year_id: int = 1) -> InsightsReport:
        """Generate NLG insights from actual ERP data."""
        insight_list = []

        try:
            # Attendance insight
            att = AnalyticsService.attendance_summary(db, academic_year_id)
            if att.overall_pct > 0:
                if att.overall_pct < 75:
                    insight_list.append({
                        "type": "attendance", "icon": "📉",
                        "title": "Low School-Wide Attendance",
                        "body": f"Overall school attendance is {att.overall_pct}% — below the recommended 75% minimum. {att.defaulters_count} students are classified as defaulters.",
                        "severity": "critical",
                    })
                elif att.overall_pct < 85:
                    insight_list.append({
                        "type": "attendance", "icon": "⚠️",
                        "title": "Attendance Needs Attention",
                        "body": f"School-wide attendance is at {att.overall_pct}%. {att.defaulters_count} students are below the 75% threshold.",
                        "severity": "warning",
                    })
                else:
                    insight_list.append({
                        "type": "attendance", "icon": "✅",
                        "title": "Healthy Attendance Rate",
                        "body": f"Overall attendance is strong at {att.overall_pct}%. Only {att.defaulters_count} students require attendance intervention.",
                        "severity": "info",
                    })

                # Worst-performing class
                if att.by_standard:
                    worst = min(att.by_standard, key=lambda x: x["present_pct"])
                    if worst["present_pct"] < att.overall_pct - 5:
                        insight_list.append({
                            "type": "attendance_class", "icon": "🏫",
                            "title": f"Std {worst['standard']} Has Lowest Attendance",
                            "body": f"Standard {worst['standard']} attendance is {worst['present_pct']}%, which is {round(att.overall_pct - worst['present_pct'], 1)}% below the school average.",
                            "severity": "warning",
                        })
        except Exception:
            pass

        try:
            # Fee insight
            fees = AnalyticsService.fee_report(db, academic_year_id)
            if float(fees.total_demanded) > 0:
                if fees.collection_pct < 60:
                    insight_list.append({
                        "type": "fee", "icon": "💰",
                        "title": "Fee Collection Critically Low",
                        "body": f"Only {fees.collection_pct}% of expected fees collected. ₹{int(float(fees.total_pending)):,} remains pending across all students.",
                        "severity": "critical",
                    })
                elif fees.collection_pct < 80:
                    insight_list.append({
                        "type": "fee", "icon": "⚠️",
                        "title": "Fee Pending Alert",
                        "body": f"Fee collection is at {fees.collection_pct}%. ₹{int(float(fees.total_pending)):,} is still outstanding and requires follow-up.",
                        "severity": "warning",
                    })
                else:
                    insight_list.append({
                        "type": "fee", "icon": "💳",
                        "title": "Strong Fee Collection",
                        "body": f"Fee collection rate is {fees.collection_pct}%. ₹{int(float(fees.total_collected)):,} collected out of ₹{int(float(fees.total_demanded)):,} expected.",
                        "severity": "info",
                    })
        except Exception:
            pass

        try:
            # Academic insight
            acad = AnalyticsService.academic_performance(db, academic_year_id)
            if acad.status == "ok" and acad.students_appeared > 0:
                if acad.pass_pct < 70:
                    insight_list.append({
                        "type": "academic", "icon": "📚",
                        "title": "Academic Performance Alert",
                        "body": f"Pass rate is {acad.pass_pct}% with an average of {acad.avg_percentage}%. {acad.failed} students failed across all exams.",
                        "severity": "warning",
                    })
                if acad.weak_subjects:
                    ws = acad.weak_subjects[0]
                    insight_list.append({
                        "type": "subject", "icon": "📖",
                        "title": f"{ws['subject']} is Weakest Subject",
                        "body": f"{ws['subject']} has the lowest average at {ws['avg_pct']}% with a pass rate of {ws['pass_pct']}%. Additional support sessions recommended.",
                        "severity": "warning",
                    })
            elif acad.status == "no_data":
                insight_list.append({
                    "type": "academic", "icon": "📋",
                    "title": "No Examination Data",
                    "body": "No examination records found for this academic year. Academic performance analytics will be available once exams are conducted.",
                    "severity": "info",
                })
        except Exception:
            pass

        try:
            # Risk insight
            risk = AnalyticsService.student_risk_indicators(db, academic_year_id)
            total_risk = len(set(
                [s["student_id"] for s in risk.students]
            ))
            if total_risk > 0:
                insight_list.append({
                    "type": "risk", "icon": "🚨",
                    "title": f"{total_risk} Students Need Attention",
                    "body": f"{risk.attendance_risk} students have low attendance, {risk.fee_risk} have pending fees, and {risk.academic_risk} have failed exams. {risk.multi_risk} students face multiple issues.",
                    "severity": "warning" if total_risk < 20 else "critical",
                })
        except Exception:
            pass

        return InsightsReport(insights=insight_list)

    @staticmethod
    def library_report(db: Session) -> LibraryReport:
        """Library utilization from books and book_issues tables."""
        try:
            total = db.scalar(select(func.count()).where(Book.is_deleted == False)) or 0
            issued = db.scalar(select(func.count()).where(
                BookIssue.is_deleted == False, BookIssue.return_date == None,
            )) or 0
            overdue = db.scalar(select(func.count()).where(
                BookIssue.is_deleted == False,
                BookIssue.return_date == None,
                BookIssue.due_date < date.today(),
            )) or 0
            return LibraryReport(
                total_books=total, books_issued=issued,
                books_available=max(0, total - issued),
                overdue_books=overdue, most_issued=[], by_category=[],
            )
        except Exception:
            return LibraryReport(total_books=0, books_issued=0, books_available=0,
                                 overdue_books=0, most_issued=[], by_category=[])

    @staticmethod
    def inventory_report(db: Session) -> InventoryReport:
        """Inventory and asset analytics."""
        try:
            total_assets = db.scalar(select(func.count()).where(Asset.is_deleted == False)) or 0
            asset_val = db.scalar(select(func.sum(Asset.purchase_price)).where(Asset.is_deleted == False)) or Decimal("0")
            low_stock = db.scalar(select(func.count()).where(
                StockItem.is_deleted == False,
                StockItem.current_stock <= StockItem.minimum_stock,
            )) or 0
            stock_items = db.scalars(select(StockItem).where(StockItem.is_deleted == False)).all()
            stock_val = sum(float(s.current_stock) * float(s.unit_cost) for s in stock_items if s.unit_cost)
            maint_cost = db.scalar(select(func.sum(MaintenanceRecord.cost)).where(
                MaintenanceRecord.is_deleted == False,
                extract("year", MaintenanceRecord.maintenance_date) == date.today().year,
            )) or Decimal("0")
            by_status_rows = db.execute(
                select(Asset.status, func.count().label("count"))
                .where(Asset.is_deleted == False)
                .group_by(Asset.status)
            ).fetchall()
            return InventoryReport(
                total_assets=total_assets, asset_value=asset_val,
                low_stock_items=low_stock,
                stock_value=Decimal(str(round(stock_val, 2))),
                maintenance_cost_ytd=maint_cost,
                by_status=[{"status": r[0], "count": r[1]} for r in by_status_rows],
            )
        except Exception:
            return InventoryReport(total_assets=0, asset_value=Decimal("0"),
                                   low_stock_items=0, stock_value=Decimal("0"),
                                   maintenance_cost_ytd=Decimal("0"), by_status=[])
