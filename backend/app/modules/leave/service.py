"""
VidyaSetu ERP — Leave Module Service
"""
from datetime import date, timedelta
from decimal import Decimal
from typing import Optional
from sqlalchemy import func, select, and_
from sqlalchemy.orm import Session

from app.modules.leave.models import (
    LeaveType, LeaveBalance, LeaveApplication, HolidayCalendar
)
from app.modules.leave.schemas import (
    LeaveTypeCreate, LeaveTypeUpdate,
    LeaveApplyRequest, LeaveApproveRequest,
    LeaveTypeResponse, LeaveBalanceResponse,
    LeaveApplicationResponse, HolidayCreate,
    HolidayResponse, LeaveStatsResponse,
)
from app.core.config import settings
from app.shared.audit import create_audit_log


def _gen_application_number(db: Session) -> str:
    today = date.today()
    prefix = f"LVE-{today.year}-"
    count = db.scalar(
        select(func.count()).select_from(LeaveApplication)
        .where(LeaveApplication.application_number.like(f"{prefix}%"))
    ) or 0
    return f"{prefix}{count + 1:04d}"


def _working_days(from_date: date, to_date: date,
                  holidays: list[date], is_half_day: bool) -> Decimal:
    """Count working days between dates, excluding weekends and holidays."""
    if is_half_day:
        return Decimal("0.5")
    count = 0
    current = from_date
    while current <= to_date:
        if current.weekday() < 6 and current not in holidays:  # Mon–Sat
            count += 1
        current += timedelta(days=1)
    return Decimal(str(count))


# ── Leave Type Service ────────────────────────────────────────

class LeaveTypeService:

    @staticmethod
    def create(db: Session, data: LeaveTypeCreate, by: int) -> LeaveType:
        lt = LeaveType(**data.model_dump(), created_by=by, updated_by=by)
        db.add(lt)
        db.commit()
        db.refresh(lt)
        create_audit_log(db, "create", "leave_types", lt.id, None, data.model_dump(), by)
        return lt

    @staticmethod
    def list_all(db: Session) -> list[LeaveType]:
        return db.scalars(
            select(LeaveType).where(LeaveType.is_deleted == False).order_by(LeaveType.name)
        ).all()

    @staticmethod
    def get_by_id(db: Session, lt_id: int) -> LeaveType:
        lt = db.get(LeaveType, lt_id)
        if not lt or lt.is_deleted:
            raise ValueError(f"Leave type {lt_id} not found")
        return lt

    @staticmethod
    def update(db: Session, lt_id: int, data: LeaveTypeUpdate, by: int) -> LeaveType:
        lt = LeaveTypeService.get_by_id(db, lt_id)
        before = {c.name: getattr(lt, c.name) for c in lt.__table__.columns}
        for k, v in data.model_dump(exclude_none=True).items():
            setattr(lt, k, v)
        lt.updated_by = by
        db.commit()
        db.refresh(lt)
        create_audit_log(db, "update", "leave_types", lt_id, before, data.model_dump(), by)
        return lt

    @staticmethod
    def delete(db: Session, lt_id: int, by: int) -> None:
        lt = LeaveTypeService.get_by_id(db, lt_id)
        lt.is_deleted = True
        lt.updated_by = by
        db.commit()


# ── Leave Balance Service ─────────────────────────────────────

class LeaveBalanceService:

    @staticmethod
    def initialize_for_employee(db: Session, employee_id: int,
                                academic_year: str, by: int) -> list[LeaveBalance]:
        """Create balance entries for all active leave types for an employee."""
        types = db.scalars(
            select(LeaveType).where(
                LeaveType.is_deleted == False,
                LeaveType.is_active == True
            )
        ).all()

        balances = []
        for lt in types:
            existing = db.scalar(
                select(LeaveBalance).where(
                    LeaveBalance.employee_id == employee_id,
                    LeaveBalance.leave_type_id == lt.id,
                    LeaveBalance.academic_year == academic_year,
                )
            )
            if not existing:
                lb = LeaveBalance(
                    employee_id=employee_id,
                    leave_type_id=lt.id,
                    academic_year=academic_year,
                    entitled_days=lt.annual_quota,
                    created_by=by,
                    updated_by=by,
                )
                db.add(lb)
                balances.append(lb)
        db.commit()
        return balances

    @staticmethod
    def get_for_employee(db: Session, employee_id: int,
                         academic_year: str) -> list[LeaveBalanceResponse]:
        rows = db.scalars(
            select(LeaveBalance).where(
                LeaveBalance.employee_id == employee_id,
                LeaveBalance.academic_year == academic_year,
                LeaveBalance.is_deleted == False,
            )
        ).all()
        result = []
        for r in rows:
            lt = r.leave_type
            result.append(LeaveBalanceResponse(
                id=r.id,
                employee_id=r.employee_id,
                leave_type_id=r.leave_type_id,
                leave_type_name=lt.name,
                leave_type_code=lt.code,
                academic_year=r.academic_year,
                entitled_days=r.entitled_days,
                used_days=r.used_days,
                pending_days=r.pending_days,
                carry_forward_days=r.carry_forward_days,
                available_days=r.entitled_days + r.carry_forward_days - r.used_days - r.pending_days,
            ))
        return result


# ── Leave Application Service ─────────────────────────────────

class LeaveApplicationService:

    @staticmethod
    def apply(db: Session, employee_id: int, employee_name: str,
              employee_code: Optional[str], data: LeaveApplyRequest, by: int) -> LeaveApplication:
        lt = LeaveTypeService.get_by_id(db, data.leave_type_id)

        # Get holidays in range
        holidays = [
            h.holiday_date for h in db.scalars(
                select(HolidayCalendar).where(
                    HolidayCalendar.academic_year == data.academic_year,
                    HolidayCalendar.holiday_date.between(data.from_date, data.to_date),
                    HolidayCalendar.is_deleted == False,
                )
            ).all()
        ]

        total_days = _working_days(data.from_date, data.to_date, holidays, data.is_half_day)

        if total_days <= 0:
            raise ValueError("No working days in selected range")

        # Check leave balance
        balance = db.scalar(
            select(LeaveBalance).where(
                LeaveBalance.employee_id == employee_id,
                LeaveBalance.leave_type_id == data.leave_type_id,
                LeaveBalance.academic_year == data.academic_year,
            )
        )
        if balance:
            available = balance.entitled_days + balance.carry_forward_days - balance.used_days - balance.pending_days
            if total_days > available:
                raise ValueError(
                    f"Insufficient balance. Available: {available} days, Requested: {total_days} days"
                )
            # Reserve as pending
            balance.pending_days += total_days
            balance.updated_by = by

        app = LeaveApplication(
            application_number=_gen_application_number(db),
            employee_id=employee_id,
            employee_name=employee_name,
            employee_code=employee_code,
            leave_type_id=data.leave_type_id,
            academic_year=data.academic_year,
            from_date=data.from_date,
            to_date=data.to_date,
            total_days=total_days,
            is_half_day=data.is_half_day,
            half_day_session=data.half_day_session,
            reason=data.reason,
            substitute_teacher_id=data.substitute_teacher_id,
            status="pending",
            created_by=by,
            updated_by=by,
        )
        db.add(app)
        db.commit()
        db.refresh(app)
        create_audit_log(db, "create", "leave_applications", app.id, None, {"status": "pending", "days": str(total_days)}, by)
        return app

    @staticmethod
    def approve_or_reject(db: Session, app_id: int, data: LeaveApproveRequest, by: int) -> LeaveApplication:
        app = db.get(LeaveApplication, app_id)
        if not app or app.is_deleted:
            raise ValueError("Leave application not found")
        if app.status != "pending":
            raise ValueError(f"Cannot {data.action} a {app.status} application")

        # Update balance
        balance = db.scalar(
            select(LeaveBalance).where(
                LeaveBalance.employee_id == app.employee_id,
                LeaveBalance.leave_type_id == app.leave_type_id,
                LeaveBalance.academic_year == app.academic_year,
            )
        )
        if balance:
            balance.pending_days = max(Decimal("0"), balance.pending_days - app.total_days)
            if data.action == "approve":
                balance.used_days += app.total_days
            balance.updated_by = by

        app.status = "approved" if data.action == "approve" else "rejected"
        app.approved_by = by
        app.approved_on = date.today()
        app.rejection_reason = data.rejection_reason
        app.updated_by = by
        db.commit()
        db.refresh(app)
        create_audit_log(db, "update", "leave_applications", app_id, {"status": "pending"}, {"status": app.status}, by)
        return app

    @staticmethod
    def cancel(db: Session, app_id: int, by: int) -> LeaveApplication:
        app = db.get(LeaveApplication, app_id)
        if not app or app.is_deleted:
            raise ValueError("Leave application not found")
        if app.status not in ("pending", "approved"):
            raise ValueError(f"Cannot cancel a {app.status} application")

        # Restore balance
        balance = db.scalar(
            select(LeaveBalance).where(
                LeaveBalance.employee_id == app.employee_id,
                LeaveBalance.leave_type_id == app.leave_type_id,
                LeaveBalance.academic_year == app.academic_year,
            )
        )
        if balance:
            if app.status == "pending":
                balance.pending_days = max(Decimal("0"), balance.pending_days - app.total_days)
            elif app.status == "approved":
                balance.used_days = max(Decimal("0"), balance.used_days - app.total_days)
            balance.updated_by = by

        app.status = "cancelled"
        app.updated_by = by
        db.commit()
        db.refresh(app)
        return app

    @staticmethod
    def list_applications(db: Session, employee_id: Optional[int] = None,
                          status: Optional[str] = None,
                          academic_year: Optional[str] = None,
                          limit: int = 50) -> list[LeaveApplication]:
        q = select(LeaveApplication).where(LeaveApplication.is_deleted == False)
        if employee_id:
            q = q.where(LeaveApplication.employee_id == employee_id)
        if status:
            q = q.where(LeaveApplication.status == status)
        if academic_year:
            q = q.where(LeaveApplication.academic_year == academic_year)
        return db.scalars(q.order_by(LeaveApplication.created_at.desc()).limit(limit)).all()

    @staticmethod
    def get_stats(db: Session, academic_year: str) -> LeaveStatsResponse:
        apps = db.scalars(
            select(LeaveApplication).where(
                LeaveApplication.academic_year == academic_year,
                LeaveApplication.is_deleted == False,
            )
        ).all()
        today = date.today()
        approved_this_month = [
            a for a in apps
            if a.status == "approved"
            and a.from_date.month == today.month
            and a.from_date.year == today.year
        ]
        total_days_month = sum(a.total_days for a in approved_this_month)

        upcoming_holidays = db.scalar(
            select(func.count()).select_from(HolidayCalendar).where(
                HolidayCalendar.academic_year == academic_year,
                HolidayCalendar.holiday_date >= today,
                HolidayCalendar.is_deleted == False,
            )
        ) or 0

        return LeaveStatsResponse(
            total_applications=len(apps),
            pending=sum(1 for a in apps if a.status == "pending"),
            approved=sum(1 for a in apps if a.status == "approved"),
            rejected=sum(1 for a in apps if a.status == "rejected"),
            cancelled=sum(1 for a in apps if a.status == "cancelled"),
            total_days_on_leave_this_month=Decimal(str(total_days_month)),
            upcoming_holidays=upcoming_holidays,
        )


# ── Holiday Service ───────────────────────────────────────────

class HolidayService:

    @staticmethod
    def create(db: Session, data: HolidayCreate, by: int) -> HolidayCalendar:
        existing = db.scalar(
            select(HolidayCalendar).where(
                HolidayCalendar.holiday_date == data.holiday_date,
                HolidayCalendar.academic_year == data.academic_year,
                HolidayCalendar.is_deleted == False,
            )
        )
        if existing:
            raise ValueError(f"Holiday already exists for {data.holiday_date}")
        h = HolidayCalendar(**data.model_dump(), created_by=by, updated_by=by)
        db.add(h)
        db.commit()
        db.refresh(h)
        return h

    @staticmethod
    def list_by_year(db: Session, academic_year: str) -> list[HolidayCalendar]:
        return db.scalars(
            select(HolidayCalendar).where(
                HolidayCalendar.academic_year == academic_year,
                HolidayCalendar.is_deleted == False,
            ).order_by(HolidayCalendar.holiday_date)
        ).all()

    @staticmethod
    def delete(db: Session, h_id: int, by: int) -> None:
        h = db.get(HolidayCalendar, h_id)
        if not h or h.is_deleted:
            raise ValueError("Holiday not found")
        h.is_deleted = True
        h.updated_by = by
        db.commit()
