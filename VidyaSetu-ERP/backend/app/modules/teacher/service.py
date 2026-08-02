"""
VidyaSetu ERP — Teacher Service
====================================
Business logic for all teacher/staff operations.
Employee ID auto-generation, leave management, stats.
"""
from datetime import date, datetime, timezone
from typing import Optional

from fastapi import HTTPException, UploadFile
from sqlalchemy import and_, func, select, or_
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.config import settings
from app.modules.teacher.models import (
    Teacher, TeacherQualification, TeacherExperience,
    TeacherLeave
)
from app.modules.attendance.models import TeacherAttendance
from app.modules.teacher.schemas import (
    TeacherCreateRequest, TeacherUpdateRequest, TeacherLeavingRequest,
    QualificationRequest, ExperienceRequest,
    LeaveRequest, LeaveApprovalRequest,
    TeacherAttendanceMarkRequest, TeacherStatsResponse,
)
from app.modules.settings.models import SystemSetting
from app.shared.audit import AuditService
from app.shared.storage import StorageService


class EmployeeIDService:
    """Employee ID auto-generation service."""

    @staticmethod
    def generate(db: Session, employee_type: str = "teaching") -> str:
        """
        Generate next employee ID: HMMV-TCH-YY-NNNN (teaching)
                                   HMMV-STF-YY-NNNN (non-teaching)
        Robust integer sequence parsing prevents duplicate ID collision.
        """
        prefix = settings.SCHOOL_CODE or "HMMV"
        type_code = "TCH" if employee_type == "teaching" else "STF"
        year = str(date.today().year)[-2:]
        pattern = f"{prefix}-{type_code}-{year}-%"

        existing_ids = list(db.scalars(
            select(Teacher.employee_id)
            .where(Teacher.employee_id.like(pattern))
            .where(Teacher.is_deleted == False)
        ).all())

        max_seq = 0
        for emp_id in existing_ids:
            try:
                seq = int(emp_id.split("-")[-1])
                if seq > max_seq:
                    max_seq = seq
            except (ValueError, IndexError):
                pass

        next_seq = max_seq + 1
        return f"{prefix}-{type_code}-{year}-{next_seq:04d}"


class TeacherService:
    """All teacher CRUD and business operations."""

    @staticmethod
    def create(db: Session, data: TeacherCreateRequest, created_by: int) -> Teacher:
        name_parts = [data.first_name]
        if data.middle_name:
            name_parts.append(data.middle_name)
        name_parts.append(data.last_name)
        full_name = " ".join(name_parts)

        employee_id = EmployeeIDService.generate(db, data.employee_type)

        def _t(val: Optional[str], max_len: int = 50) -> Optional[str]:
            return str(val)[:max_len] if val is not None else None

        teacher = Teacher(
            employee_id=employee_id,
            full_name=_t(full_name, 255),
            first_name=_t(data.first_name, 100),
            middle_name=_t(data.middle_name, 100),
            last_name=_t(data.last_name, 100),
            full_name_marathi=_t(data.full_name_marathi, 255),
            salutation=_t(data.salutation, 50),
            employee_type=_t(data.employee_type, 50) or "teaching",
            designation=_t(data.designation, 100) or "Teacher",
            department=_t(data.department, 100),
            subjects=_t(data.subjects, 255),
            classes_assigned=_t(data.classes_assigned, 255),
            date_of_joining=data.date_of_joining or date.today(),
            dob=data.dob,
            gender=_t(data.gender, 50),
            blood_group=_t(data.blood_group, 20),
            nationality=_t(data.nationality, 50) or "Indian",
            religion=_t(data.religion, 50),
            caste=_t(data.caste, 100),
            category=_t(data.category, 50),
            marital_status=_t(data.marital_status, 50),
            mother_tongue=_t(data.mother_tongue, 50),
            aadhaar_number=_t(data.aadhaar_number, 50),
            pan_number=_t(data.pan_number, 50),
            pf_number=_t(data.pf_number, 50),
            gpf_number=_t(data.gpf_number, 50),
            dcps_account=_t(data.dcps_account, 50),
            pran_number=_t(data.pran_number, 50),
            teacher_saral_id=_t(data.teacher_saral_id, 50),
            mobile=_t(data.mobile, 50),
            mobile_alt=_t(data.mobile_alt, 50),
            email=_t(data.email, 255),
            email_official=_t(data.email_official, 255),
            address_line1=_t(data.address_line1, 500),
            address_line2=_t(data.address_line2, 500),
            village=_t(data.village, 100),
            taluka=_t(data.taluka, 100),
            district=_t(data.district, 100),
            state=_t(data.state, 100) or "Maharashtra",
            pincode=_t(data.pincode, 20),
            highest_qualification=_t(data.highest_qualification, 100),
            specialization=_t(data.specialization, 255),
            b_ed_year=data.b_ed_year,
            d_ed_year=data.d_ed_year,
            pay_scale=_t(data.pay_scale, 100),
            basic_salary=data.basic_salary,
            grade_pay=data.grade_pay,
            bank_name=_t(data.bank_name, 200),
            bank_account_number=_t(data.bank_account_number, 50),
            bank_ifsc=_t(data.bank_ifsc, 30),
            bank_branch=_t(data.bank_branch, 200),
            spouse_name=_t(data.spouse_name, 255),
            father_name=_t(data.father_name, 255),
            mother_name=_t(data.mother_name, 255),
            emergency_contact_name=_t(data.emergency_contact_name, 255),
            emergency_contact_mobile=_t(data.emergency_contact_mobile, 50),
            emergency_contact_relation=_t(data.emergency_contact_relation, 100),
            status="active",
            created_by=created_by,
        )

        try:
            db.add(teacher)
            db.flush()

            AuditService.log(
                db, action="TEACHER_CREATED", module="teacher",
                user_id=created_by, entity_type="Teacher",
                entity_id=teacher.id,
                description=f"Teacher '{full_name}' (Emp: {employee_id}) added as {data.designation}.",
            )
            db.commit()
            db.refresh(teacher)
            return teacher
        except IntegrityError as ie:
            db.rollback()
            err_str = str(ie.orig) if hasattr(ie, 'orig') else str(ie)
            raise HTTPException(
                status_code=400,
                detail=f"Database constraint error: A staff record with this Employee ID, Aadhaar, or PAN may already exist."
            )
        except Exception as e:
            db.rollback()
            raise HTTPException(
                status_code=500,
                detail=f"Failed to create staff record: {str(e)}"
            )

    @staticmethod
    def get_by_id(db: Session, teacher_id: int) -> Teacher:
        teacher = db.scalar(
            select(Teacher)
            .where(Teacher.id == teacher_id)
            .where(Teacher.is_deleted == False)
        )
        if not teacher:
            raise HTTPException(status_code=404, detail="Teacher not found.")
        return teacher

    @staticmethod
    def get_by_employee_id(db: Session, employee_id: str) -> Teacher:
        teacher = db.scalar(
            select(Teacher)
            .where(Teacher.employee_id == employee_id)
            .where(Teacher.is_deleted == False)
        )
        if not teacher:
            raise HTTPException(status_code=404, detail=f"Employee {employee_id} not found.")
        return teacher

    @staticmethod
    def get_list(
        db: Session,
        page: int = 1,
        per_page: int = 20,
        search: str | None = None,
        employee_type: str | None = None,
        designation: str | None = None,
        status: str | None = "active",
        department: str | None = None,
        gender: str | None = None,
        category: str | None = None,
    ) -> tuple[list[Teacher], int]:
        query = select(Teacher).where(Teacher.is_deleted == False)

        if search:
            term = f"%{search}%"
            query = query.where(or_(
                Teacher.full_name.ilike(term),
                Teacher.employee_id.ilike(term),
                Teacher.mobile.ilike(term),
                Teacher.email.ilike(term),
                Teacher.designation.ilike(term),
                Teacher.full_name_marathi.ilike(term),
            ))
        if employee_type:
            query = query.where(Teacher.employee_type == employee_type)
        if designation:
            query = query.where(Teacher.designation.ilike(f"%{designation}%"))
        if status:
            query = query.where(Teacher.status == status)
        if department:
            query = query.where(Teacher.department.ilike(f"%{department}%"))
        if gender:
            query = query.where(Teacher.gender == gender)
        if category:
            query = query.where(Teacher.category == category)

        total = db.scalar(select(func.count()).select_from(query.subquery())) or 0
        query = query.order_by(Teacher.employee_type, Teacher.designation, Teacher.full_name)
        offset = (page - 1) * per_page
        teachers = db.scalars(query.offset(offset).limit(per_page)).all()
        return list(teachers), total

    @staticmethod
    def update(
        db: Session, teacher_id: int, data: TeacherUpdateRequest, updated_by: int
    ) -> Teacher:
        teacher = TeacherService.get_by_id(db, teacher_id)
        update_data = data.model_dump(exclude_none=True)

        if any(k in update_data for k in ["first_name", "middle_name", "last_name"]):
            fn = update_data.get("first_name", teacher.first_name)
            mn = update_data.get("middle_name", teacher.middle_name)
            ln = update_data.get("last_name", teacher.last_name)
            parts = [fn] + ([mn] if mn else []) + [ln]
            teacher.full_name = " ".join(parts)

        for field, value in update_data.items():
            setattr(teacher, field, value)

        teacher.updated_by = updated_by
        AuditService.log(
            db, action="TEACHER_UPDATED", module="teacher",
            user_id=updated_by, entity_type="Teacher",
            entity_id=teacher.id,
            description=f"Teacher '{teacher.full_name}' record updated.",
        )
        db.commit()
        db.refresh(teacher)
        return teacher

    @staticmethod
    async def upload_photo(db: Session, teacher_id: int, file: UploadFile, uploaded_by: int) -> str:
        teacher = TeacherService.get_by_id(db, teacher_id)
        if teacher.photo_path:
            StorageService.delete_file(teacher.photo_path)
        path = await StorageService.save_image(file, "teacher_photos", str(teacher_id))
        teacher.photo_path = path
        teacher.updated_by = uploaded_by
        AuditService.log(
            db, action="TEACHER_PHOTO_UPLOADED", module="teacher",
            user_id=uploaded_by, entity_type="Teacher", entity_id=teacher.id,
            description=f"Photo uploaded for {teacher.full_name}.",
        )
        db.commit()
        return path

    @staticmethod
    def mark_leaving(db: Session, teacher_id: int, data: TeacherLeavingRequest, updated_by: int) -> Teacher:
        teacher = TeacherService.get_by_id(db, teacher_id)
        teacher.date_of_leaving = data.date_of_leaving
        teacher.leaving_reason = data.leaving_reason
        teacher.status = data.status
        teacher.is_active = False
        teacher.updated_by = updated_by
        AuditService.log(
            db, action="TEACHER_LEFT", module="teacher",
            user_id=updated_by, entity_type="Teacher", entity_id=teacher.id,
            description=f"Teacher '{teacher.full_name}' marked as {data.status}.",
        )
        db.commit()
        db.refresh(teacher)
        return teacher

    @staticmethod
    def delete(db: Session, teacher_id: int, deleted_by: int) -> None:
        teacher = TeacherService.get_by_id(db, teacher_id)
        teacher.soft_delete(deleted_by=deleted_by)
        AuditService.log(
            db, action="TEACHER_DELETED", module="teacher",
            user_id=deleted_by, entity_type="Teacher", entity_id=teacher.id,
            description=f"Teacher '{teacher.full_name}' deleted.",
        )
        db.commit()

    @staticmethod
    def get_stats(db: Session) -> TeacherStatsResponse:
        base = select(Teacher).where(Teacher.is_deleted == False)
        total   = db.scalar(select(func.count()).select_from(base.subquery())) or 0
        active  = db.scalar(select(func.count()).select_from(base.where(Teacher.status == "active").subquery())) or 0
        teaching = db.scalar(select(func.count()).select_from(base.where(Teacher.employee_type == "teaching").subquery())) or 0
        non_teaching = total - teaching
        male    = db.scalar(select(func.count()).select_from(base.where(Teacher.gender == "male").subquery())) or 0
        female  = db.scalar(select(func.count()).select_from(base.where(Teacher.gender == "female").subquery())) or 0

        # Count on leave today
        today = date.today()
        on_leave = db.scalar(
            select(func.count()).select_from(
                select(TeacherLeave)
                .where(TeacherLeave.status == "approved")
                .where(TeacherLeave.from_date <= today)
                .where(TeacherLeave.to_date >= today)
                .where(TeacherLeave.is_deleted == False)
                .subquery()
            )
        ) or 0

        return TeacherStatsResponse(
            total=total, active=active,
            teaching=teaching, non_teaching=non_teaching,
            male=male, female=female, on_leave_today=on_leave,
        )

    # ── Qualifications ─────────────────────────────────────────

    @staticmethod
    def add_qualification(db: Session, teacher_id: int, data: QualificationRequest, created_by: int) -> TeacherQualification:
        teacher = TeacherService.get_by_id(db, teacher_id)
        q = TeacherQualification(
            teacher_id=teacher_id, created_by=created_by,
            **data.model_dump()
        )
        db.add(q)
        db.commit()
        db.refresh(q)
        return q

    @staticmethod
    def get_qualifications(db: Session, teacher_id: int) -> list[TeacherQualification]:
        return list(db.scalars(
            select(TeacherQualification)
            .where(TeacherQualification.teacher_id == teacher_id)
            .where(TeacherQualification.is_deleted == False)
            .order_by(TeacherQualification.year_of_passing.desc())
        ).all())

    @staticmethod
    def delete_qualification(db: Session, qual_id: int, deleted_by: int) -> None:
        q = db.scalar(select(TeacherQualification).where(TeacherQualification.id == qual_id))
        if q:
            q.soft_delete(deleted_by=deleted_by)
            db.commit()

    # ── Experience ─────────────────────────────────────────────

    @staticmethod
    def add_experience(db: Session, teacher_id: int, data: ExperienceRequest, created_by: int) -> TeacherExperience:
        TeacherService.get_by_id(db, teacher_id)
        exp = TeacherExperience(teacher_id=teacher_id, created_by=created_by, **data.model_dump())
        db.add(exp)
        db.commit()
        db.refresh(exp)
        return exp

    @staticmethod
    def get_experience(db: Session, teacher_id: int) -> list[TeacherExperience]:
        return list(db.scalars(
            select(TeacherExperience)
            .where(TeacherExperience.teacher_id == teacher_id)
            .where(TeacherExperience.is_deleted == False)
            .order_by(TeacherExperience.from_date.desc())
        ).all())

    # ── Leave Management ───────────────────────────────────────

    @staticmethod
    def apply_leave(db: Session, teacher_id: int, data: LeaveRequest, created_by: int) -> TeacherLeave:
        TeacherService.get_by_id(db, teacher_id)
        days = (data.to_date - data.from_date).days + 1

        leave = TeacherLeave(
            teacher_id=teacher_id,
            leave_type=data.leave_type,
            from_date=data.from_date,
            to_date=data.to_date,
            days=days,
            reason=data.reason,
            substitute_teacher_id=data.substitute_teacher_id,
            status="pending",
            created_by=created_by,
        )
        db.add(leave)
        db.commit()
        db.refresh(leave)
        return leave

    @staticmethod
    def approve_leave(
        db: Session, leave_id: int, data: LeaveApprovalRequest, approved_by: int
    ) -> TeacherLeave:
        leave = db.scalar(select(TeacherLeave).where(TeacherLeave.id == leave_id))
        if not leave:
            raise HTTPException(status_code=404, detail="Leave request not found.")

        if data.action == "approve":
            leave.status = "approved"
            leave.approved_by = approved_by
            leave.approved_at = datetime.now(timezone.utc)
        elif data.action == "reject":
            leave.status = "rejected"
            leave.rejection_reason = data.rejection_reason
        else:
            raise HTTPException(status_code=400, detail="Action must be 'approve' or 'reject'.")

        db.commit()
        db.refresh(leave)
        return leave

    @staticmethod
    def get_leaves(
        db: Session, teacher_id: int | None = None, status: str | None = None
    ) -> list[TeacherLeave]:
        query = select(TeacherLeave).where(TeacherLeave.is_deleted == False)
        if teacher_id:
            query = query.where(TeacherLeave.teacher_id == teacher_id)
        if status:
            query = query.where(TeacherLeave.status == status)
        return list(db.scalars(query.order_by(TeacherLeave.created_at.desc())).all())

    # ── Attendance ─────────────────────────────────────────────

    @staticmethod
    def mark_attendance_bulk(
        db: Session, data: TeacherAttendanceMarkRequest, marked_by: int
    ) -> int:
        count = 0
        for record in data.records:
            teacher_id = record.get("teacher_id")
            att_status = record.get("status", "present")
            if not teacher_id:
                continue

            existing = db.scalar(
                select(TeacherAttendance).where(
                    and_(
                        TeacherAttendance.teacher_id == teacher_id,
                        TeacherAttendance.attendance_date == data.attendance_date,
                    )
                )
            )
            if existing:
                existing.status = att_status
                existing.marked_by = marked_by
            else:
                att = TeacherAttendance(
                    teacher_id=teacher_id,
                    attendance_date=data.attendance_date,
                    status=att_status,
                    marked_by=marked_by,
                    created_by=marked_by,
                )
                db.add(att)
            count += 1

        AuditService.log(
            db, action="TEACHER_ATTENDANCE_MARKED", module="teacher",
            user_id=marked_by,
            description=f"Teacher attendance marked for {data.attendance_date}. {count} records.",
        )
        db.commit()
        return count
