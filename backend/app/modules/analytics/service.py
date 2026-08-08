"""
VidyaSetu ERP — Reports & Analytics Service
============================================
Cross-module analytics — student strength, attendance rates,
fee collection, exam performance, library usage, inventory value.
All queries return serializable data for frontend charts.
"""
from datetime import date, timedelta
from decimal import Decimal
from typing import Optional
from pydantic import BaseModel as PydanticBase
from sqlalchemy import select, func, and_, extract
from sqlalchemy.orm import Session

from app.modules.student.models import Student
from app.modules.teacher.models import Teacher
from app.modules.attendance.models import StudentAttendance, MonthlyAttendanceSummary
from app.modules.finance.models import FeePayment, StudentFeeRecord
from app.modules.library.models import Book, BookIssue
from app.modules.inventory.models import Asset, StockItem, MaintenanceRecord
from app.modules.communication.models import Notice



# ══════════════════════════════════════════════════════
# RESPONSE MODELS
# ══════════════════════════════════════════════════════

class StudentStrengthReport(PydanticBase):
    total_students: int
    boys: int
    girls: int
    by_standard: list[dict]        # [{standard, boys, girls, total}]
    new_admissions_this_year: int
    transfers_out: int

class AttendanceReport(PydanticBase):
    period: str
    overall_pct: float
    school_working_days: int
    avg_daily_attendance: int
    by_standard: list[dict]        # [{standard, present_pct}]
    defaulters_count: int
    top_absentees: list[dict]

class FeeReport(PydanticBase):
    academic_year_id: int
    total_demanded: Decimal
    total_collected: Decimal
    total_pending: Decimal
    collection_pct: float
    by_month: list[dict]           # [{month, collected}]
    by_fee_type: list[dict]
    top_defaulters: list[dict]

class ExamReport(PydanticBase):
    exam_name: str
    total_students: int
    passed: int
    failed: int
    pass_pct: float
    avg_marks_pct: float
    by_grade: list[dict]           # [{grade, count}]
    topper: Optional[dict] = None

class LibraryReport(PydanticBase):
    total_books: int
    books_issued: int
    books_available: int
    overdue_books: int
    most_issued: list[dict]        # [{title, count}]
    by_category: list[dict]

class InventoryReport(PydanticBase):
    total_assets: int
    asset_value: Decimal
    low_stock_items: int
    stock_value: Decimal
    maintenance_cost_ytd: Decimal
    by_status: list[dict]

class MasterDashboard(PydanticBase):
    """Top-level KPIs shown on the Analytics page header."""
    total_students: int
    total_teachers: int
    today_attendance_pct: float
    fee_collection_pct: float
    books_issued: int
    pending_assets_repair: int
    active_notices: int
    low_stock_alerts: int
    monthly_revenue: list[dict]    # last 12 months


# ══════════════════════════════════════════════════════
# SERVICE
# ══════════════════════════════════════════════════════

class AnalyticsService:

    @staticmethod
    def master_dashboard(db: Session, academic_year_id: int = 1) -> MasterDashboard:
        """Aggregate KPIs across all modules for the analytics dashboard."""
        from app.modules.student.models import Student
        from app.modules.teacher.models import Teacher

        total_students = db.scalar(
            select(func.count()).where(Student.is_deleted == False, Student.is_active == True)
        ) or 0
        total_teachers = db.scalar(
            select(func.count()).where(Teacher.is_deleted == False, Teacher.is_active == True)
        ) or 0

        # Attendance percentage (today if available, else latest date or overall summary)
        today_att_pct = 0.0
        try:
            today = date.today()
            total = db.scalar(select(func.count()).where(
                StudentAttendance.date == today,
                StudentAttendance.is_deleted == False,
            )) or 0
            if total > 0:
                present = db.scalar(select(func.count()).where(
                    StudentAttendance.date == today,
                    StudentAttendance.status == "present",
                    StudentAttendance.is_deleted == False,
                )) or 0
                today_att_pct = round(present / total * 100, 1)
            else:
                # Query latest attendance date recorded
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
                    # Fallback to MonthlyAttendanceSummary overall rate
                    summaries = db.scalars(select(MonthlyAttendanceSummary).where(MonthlyAttendanceSummary.is_deleted == False)).all()
                    tot_p = sum(s.present_days for s in summaries)
                    tot_w = sum(s.working_days for s in summaries)
                    today_att_pct = round(tot_p / tot_w * 100, 1) if tot_w else 0.0
        except Exception:
            today_att_pct = 0.0

        # Fee collection %
        fee_pct = 0.0
        total_revenue = []
        try:
            from app.modules.finance.models import FeePayment, StudentFeeRecord
            # Total demanded = sum of all StudentFeeRecord amount_due
            demanded_q = select(func.sum(StudentFeeRecord.amount_due)).where(StudentFeeRecord.is_deleted == False)
            if academic_year_id:
                demanded_q = demanded_q.where(StudentFeeRecord.academic_year_id == academic_year_id)
            demanded = float(db.scalar(demanded_q) or 0)
            if demanded == 0 and academic_year_id:
                # Retry without academic year filter
                demanded = float(db.scalar(select(func.sum(StudentFeeRecord.amount_due)).where(StudentFeeRecord.is_deleted == False)) or 0)

            # Total collected = sum of all FeePayment total_received / amount
            collected_q = select(func.sum(FeePayment.amount)).where(FeePayment.is_deleted == False)
            if academic_year_id:
                collected_q = collected_q.where(FeePayment.academic_year_id == academic_year_id)
            collected = float(db.scalar(collected_q) or 0)
            if collected == 0 and academic_year_id:
                collected = float(db.scalar(select(func.sum(FeePayment.amount)).where(FeePayment.is_deleted == False)) or 0)

            fee_pct = round(collected / demanded * 100, 1) if demanded > 0 else 0.0

            # Monthly revenue for chart
            for month in range(1, 13):
                m_q = select(func.sum(FeePayment.amount)).where(
                    FeePayment.is_deleted == False,
                    extract("month", FeePayment.payment_date) == month,
                )
                m_collected = db.scalar(m_q) or Decimal("0")
                total_revenue.append({"month": month, "amount": float(m_collected)})
        except Exception:
            total_revenue = [{"month": i, "amount": 0} for i in range(1, 13)]

        # Books issued
        books_issued = 0
        try:
            from app.modules.library.models import BookIssue
            books_issued = db.scalar(select(func.count()).where(
                BookIssue.is_deleted == False,
                BookIssue.return_date == None,
            )) or 0
        except Exception:
            pass

        # Assets in repair
        assets_repair = 0
        try:
            from app.modules.inventory.models import Asset
            assets_repair = db.scalar(select(func.count()).where(
                Asset.is_deleted == False, Asset.status == "in_repair"
            )) or 0
        except Exception:
            pass

        # Active notices
        active_notices = 0
        try:
            from app.modules.communication.models import Notice
            active_notices = db.scalar(select(func.count()).where(
                Notice.is_deleted == False, Notice.is_published == True
            )) or 0
        except Exception:
            pass

        # Low stock alerts
        low_stock = 0
        try:
            from app.modules.inventory.models import StockItem
            low_stock = db.scalar(select(func.count()).where(
                StockItem.is_deleted == False,
                StockItem.current_stock <= StockItem.minimum_stock,
            )) or 0
        except Exception:
            pass

        return MasterDashboard(
            total_students=total_students,
            total_teachers=total_teachers,
            today_attendance_pct=today_att_pct,
            fee_collection_pct=fee_pct,
            books_issued=books_issued,
            pending_assets_repair=assets_repair,
            active_notices=active_notices,
            low_stock_alerts=low_stock,
            monthly_revenue=total_revenue,
        )

    @staticmethod
    def student_strength(db: Session, academic_year_id: int = 1) -> StudentStrengthReport:
        from app.modules.student.models import Student
        total = db.scalar(select(func.count()).where(
            Student.is_deleted == False, Student.is_active == True
        )) or 0
        boys = db.scalar(select(func.count()).where(
            Student.is_deleted == False, Student.is_active == True, Student.gender == "male"
        )) or 0
        girls = db.scalar(select(func.count()).where(
            Student.is_deleted == False, Student.is_active == True, Student.gender == "female"
        )) or 0

        # By standard
        rows = db.execute(
            select(Student.standard,
                   func.count().label("total"))
            .where(Student.is_deleted == False, Student.is_active == True)
            .group_by(Student.standard)
            .order_by(Student.standard)
        ).fetchall()

        by_std = []
        for r in rows:
            # Count boys/girls per standard separately
            b = db.scalar(select(func.count()).where(
                Student.is_deleted == False, Student.is_active == True,
                Student.standard == r[0], Student.gender == "male"
            )) or 0
            g = db.scalar(select(func.count()).where(
                Student.is_deleted == False, Student.is_active == True,
                Student.standard == r[0], Student.gender == "female"
            )) or 0
            by_std.append({"standard": str(r[0]), "boys": b, "girls": g, "total": int(r[1] or 0)})

        this_year = db.scalar(select(func.count()).where(
            Student.is_deleted == False,
            Student.academic_year_id == academic_year_id,
        )) or 0
        if this_year == 0:
            this_year = total

        return StudentStrengthReport(
            total_students=total, boys=boys, girls=girls,
            by_standard=by_std, new_admissions_this_year=this_year, transfers_out=0,
        )

    @staticmethod
    def attendance_summary(db: Session, academic_year_id: int = 1) -> AttendanceReport:
        try:
            from app.modules.attendance.models import MonthlyAttendanceSummary, StudentAttendance
            summaries = list(db.scalars(
                select(MonthlyAttendanceSummary).where(
                    MonthlyAttendanceSummary.is_deleted == False,
                )
            ).all())

            if not summaries:
                # Compute on the fly from StudentAttendance daily records
                daily_records = list(db.scalars(
                    select(StudentAttendance).where(StudentAttendance.is_deleted == False)
                ).all())
                if not daily_records:
                    return AttendanceReport(period="Current Year", overall_pct=0, school_working_days=0,
                                            avg_daily_attendance=0, by_standard=[], defaulters_count=0, top_absentees=[])

                total_records = len(daily_records)
                present_records = sum(1 for r in daily_records if r.status == "present")
                overall_pct = round(present_records / total_records * 100, 1) if total_records else 0.0

                std_map: dict[str, list] = {}
                for r in daily_records:
                    std_map.setdefault(str(r.standard), []).append(r)

                by_std_list = []
                for std, recs in sorted(std_map.items()):
                    p = sum(1 for x in recs if x.status == "present")
                    tot = len(recs)
                    by_std_list.append({"standard": std, "present_pct": round(p / tot * 100, 1) if tot else 0.0})

                return AttendanceReport(
                    period="Current Year", overall_pct=overall_pct,
                    school_working_days=220,
                    avg_daily_attendance=present_records,
                    by_standard=by_std_list,
                    defaulters_count=0, top_absentees=[],
                )

            total_p = sum(s.present_days for s in summaries)
            total_w = sum(s.working_days for s in summaries)
            overall_pct = round(total_p / total_w * 100, 1) if total_w else 0.0

            defaulters = [s for s in summaries if s.working_days and (s.present_days / s.working_days * 100) < 75]

            by_standard: dict[str, list] = {}
            for s in summaries:
                by_standard.setdefault(str(s.standard if hasattr(s, "standard") else "All"), []).append(s)

            by_std_list = []
            for std, ss in sorted(by_standard.items()):
                p = sum(x.present_days for x in ss)
                w = sum(x.working_days for x in ss)
                by_std_list.append({"standard": std, "present_pct": round(p/w*100, 1) if w else 0.0})

            return AttendanceReport(
                period="Current Year", overall_pct=overall_pct,
                school_working_days=total_w // max(len(summaries), 1),
                avg_daily_attendance=total_p // max(total_w, 1),
                by_standard=by_std_list,
                defaulters_count=len(defaulters), top_absentees=[],
            )
        except Exception:
            return AttendanceReport(period="Current Year", overall_pct=0, school_working_days=0,
                                    avg_daily_attendance=0, by_standard=[], defaulters_count=0, top_absentees=[])

    @staticmethod
    def fee_report(db: Session, academic_year_id: int = 1) -> FeeReport:
        try:
            from app.modules.finance.models import FeePayment, StudentFeeRecord
            demanded = float(db.scalar(select(func.sum(StudentFeeRecord.amount_due)).where(
                StudentFeeRecord.is_deleted == False,
            )) or 0)
            collected = float(db.scalar(select(func.sum(FeePayment.amount)).where(
                FeePayment.is_deleted == False,
            )) or 0)
            pending = max(0.0, demanded - collected)
            pct = round(collected / demanded * 100, 1) if demanded > 0 else 0.0

            by_month = []
            for m in range(1, 13):
                mc = float(db.scalar(select(func.sum(FeePayment.amount)).where(
                    FeePayment.is_deleted == False,
                    extract("month", FeePayment.payment_date) == m,
                )) or 0)
                by_month.append({"month": m, "collected": mc})

            return FeeReport(
                academic_year_id=academic_year_id,
                total_demanded=Decimal(str(round(demanded, 2))),
                total_collected=Decimal(str(round(collected, 2))),
                total_pending=Decimal(str(round(pending, 2))),
                collection_pct=pct, by_month=by_month,
                by_fee_type=[], top_defaulters=[],
            )
        except Exception:
            return FeeReport(academic_year_id=academic_year_id,
                             total_demanded=Decimal("0"), total_collected=Decimal("0"),
                             total_pending=Decimal("0"), collection_pct=0,
                             by_month=[{"month":m,"collected":0} for m in range(1,13)],
                             by_fee_type=[], top_defaulters=[])

    @staticmethod
    def library_report(db: Session) -> LibraryReport:
        try:
            from app.modules.library.models import Book, BookIssue
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
        try:
            from app.modules.inventory.models import Asset, StockItem, MaintenanceRecord
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

