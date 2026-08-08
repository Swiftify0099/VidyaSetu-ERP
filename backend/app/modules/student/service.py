"""
VidyaSetu ERP — Student Service
====================================
Business logic for all student operations.
GR number auto-generation, attendance, certificates.
"""
from datetime import date, datetime, timezone
from typing import Optional
from io import BytesIO

from fastapi import HTTPException, UploadFile, status
from sqlalchemy import and_, func, select, or_
from sqlalchemy.orm import Session

from app.core.config import settings
from app.modules.student.models import Student, StudentDocument
from app.modules.attendance.models import StudentAttendance
from app.modules.student.schemas import (
    AttendanceMarkRequest,
    SingleAttendanceRequest,
    StudentCreateRequest,
    StudentUpdateRequest,
    StudentLeavingRequest,
    AttendanceSummaryResponse,
)
from app.modules.settings.models import AcademicYear, SystemSetting
from app.shared.audit import AuditService
from app.shared.storage import StorageService


class GRNumberService:
    """GR Number auto-generation service."""

    @staticmethod
    def generate(db: Session) -> str:
        """
        Generate next GR number: HMMV-GR-YYYY-NNNN
        Based on prefix from settings and auto-incrementing sequence.
        """
        # Get prefix from settings
        setting = db.scalar(
            select(SystemSetting).where(SystemSetting.key == "prefix.gr_number")
        )
        prefix = setting.value if setting and setting.value else settings.GR_PREFIX

        # Get current academic year
        year_setting = db.scalar(
            select(SystemSetting).where(SystemSetting.key == "school.current_academic_year")
        )
        year = (year_setting.value or settings.CURRENT_ACADEMIC_YEAR).split("-")[0][-2:]

        # Get max existing sequence for this year
        pattern = f"{prefix}-{year}-%"
        last = db.scalar(
            select(Student.gr_number)
            .where(Student.gr_number.like(pattern))
            .where(Student.is_deleted == False)
            .order_by(Student.gr_number.desc())
        )

        if last:
            try:
                seq = int(last.split("-")[-1]) + 1
            except (ValueError, IndexError):
                seq = 1
        else:
            seq = 1

        return f"{prefix}-{year}-{seq:04d}"


class StudentService:
    """All student CRUD and business operations."""

    @staticmethod
    def create(
        db: Session,
        data: StudentCreateRequest,
        created_by: int,
    ) -> Student:
        """Create a new student and auto-assign GR number."""
        # Build full_name
        if data.full_name and data.full_name.strip():
            full_name = data.full_name.strip()
        else:
            name_parts = [p for p in [data.first_name, data.middle_name, data.last_name] if p and p != "."]
            full_name = " ".join(name_parts) or "Student"

        # Generate GR number
        gr_number = GRNumberService.generate(db)

        student = Student(
            gr_number=gr_number,
            full_name=full_name,
            first_name=data.first_name,
            middle_name=data.middle_name,
            last_name=data.last_name if data.last_name != "." else None,
            full_name_marathi=data.full_name_marathi,
            mother_name=data.mother_name or data.mother_name_full,
            standard=data.standard,
            division=data.division,
            roll_number=data.roll_number,
            previous_school=data.previous_school,
            previous_standard=data.previous_standard,
            academic_year_id=data.academic_year_id,
            dob=data.dob,
            dob_in_words=data.dob_in_words,
            place_of_birth=data.place_of_birth,
            gender=data.gender,
            blood_group=data.blood_group,
            nationality=data.nationality,
            religion=data.religion,
            caste=data.caste,
            sub_caste=data.sub_caste,
            category=data.category,
            mother_tongue=data.mother_tongue,
            aadhaar_number=data.aadhaar_number,
            father_name=data.father_name,
            father_name_marathi=data.father_name_marathi,
            father_occupation=data.father_occupation,
            father_mobile=data.father_mobile,
            father_email=data.father_email,
            father_annual_income=data.father_annual_income,
            mother_name_full=data.mother_name_full,
            mother_name_marathi=data.mother_name_marathi,
            mother_occupation=data.mother_occupation,
            mother_mobile=data.mother_mobile,
            mother_email=data.mother_email,
            guardian_name=data.guardian_name,
            guardian_mobile=data.guardian_mobile,
            guardian_relation=data.guardian_relation,
            mobile=data.mobile,
            email=data.email,
            address_line1=data.address_line1,
            address_line2=data.address_line2,
            village=data.village,
            taluka=data.taluka,
            district=data.district,
            state=data.state,
            pincode=data.pincode,
            admission_date=data.admission_date or date.today(),
            admission_standard=data.admission_standard or data.standard,
            student_id_saral=data.student_id_saral,
            pen_number=data.pen_number,
            apaar_id=data.apaar_id,
            medical_conditions=data.medical_conditions,
            disability=data.disability,
            is_differently_abled=data.is_differently_abled,
            uses_transport=data.uses_transport,
            status="active",
            created_by=created_by,
        )

        db.add(student)
        db.flush()

        # Determine target recipient email
        target_email = data.email or data.father_email or data.mother_email

        # Generate initial password if not provided
        if data.password and data.password.strip():
            raw_password = data.password.strip()
        else:
            raw_password = f"Vidya@{gr_number.replace('-', '')[-6:]}"

        # Login username: GR Number
        username = gr_number

        # Create linked User account for student portal login if not exists
        from app.core.security import hash_password
        from app.modules.auth.models import User, Role, UserRole

        existing_user = db.scalar(select(User).where(User.username == username))
        if not existing_user:
            user_email = target_email
            if user_email and db.scalar(select(User.id).where(User.email == user_email)):
                user_email = None

            user_mobile = data.mobile or data.father_mobile
            if user_mobile and db.scalar(select(User.id).where(User.mobile == user_mobile)):
                user_mobile = None

            user = User(
                username=username,
                password_hash=hash_password(raw_password),
                gr_number=gr_number,
                full_name=full_name,
                email=user_email,
                mobile=user_mobile,
                must_change_password=True,
            )
            db.add(user)
            db.flush()

            # Assign 'student' role
            student_role = db.scalar(select(Role).where(Role.code == "student"))
            if student_role:
                db.add(UserRole(user_id=user.id, role_id=student_role.id, assigned_by=created_by))

            student.user_id = user.id

        # Dispatch email notification with credentials
        email_sent = False
        if data.send_email_notification and target_email:
            try:
                from app.shared.email import build_admission_credentials_email, send_email_async
                from app.modules.communication.models import CommunicationLog

                academic_year_name = settings.CURRENT_ACADEMIC_YEAR
                if data.academic_year_id:
                    ay = db.scalar(select(AcademicYear).where(AcademicYear.id == data.academic_year_id))
                    if ay and hasattr(ay, 'name'):
                        academic_year_name = ay.name

                html_content, text_content = build_admission_credentials_email(
                    student_name=full_name,
                    gr_number=gr_number,
                    username=username,
                    password=raw_password,
                    standard=data.standard,
                    division=data.division,
                    academic_year=str(academic_year_name),
                    login_url=f"{settings.FRONTEND_URL}/login",
                )

                subject = f"Admission Confirmed — Your {settings.SCHOOL_NAME} Login Credentials"
                send_email_async(
                    to_email=target_email,
                    subject=subject,
                    html_content=html_content,
                    text_content=text_content,
                )

                comm_log = CommunicationLog(
                    channel="email",
                    recipient_type="specific_student",
                    recipient_id=student.id,
                    recipient_name=full_name,
                    recipient_phone=data.mobile or data.father_mobile,
                    subject=subject,
                    message_body=f"Credentials email sent to {target_email} for GR: {gr_number}.",
                    status="sent",
                    sent_at=datetime.now(timezone.utc),
                )
                db.add(comm_log)
                email_sent = True
            except Exception as ex:
                import logging
                logging.getLogger("app.student.service").error(f"Failed to process email dispatch: {ex}")

        AuditService.log(
            db, action="STUDENT_CREATED", module="student",
            user_id=created_by, entity_type="Student",
            entity_id=student.id,
            description=f"Student '{full_name}' (GR: {gr_number}) admitted to Std {data.standard}. User account created. Email sent: {email_sent}.",
        )
        db.commit()
        db.refresh(student)

        # Attach transient metadata for API response
        setattr(student, "_generated_username", username)
        setattr(student, "_generated_password", raw_password)
        setattr(student, "_email_sent", email_sent)
        setattr(student, "_target_email", target_email)

        return student

    @staticmethod
    def get_by_id(db: Session, student_id: int) -> Student:
        student = db.scalar(
            select(Student)
            .where(Student.id == student_id)
            .where(Student.is_deleted == False)
        )
        if not student:
            raise HTTPException(status_code=404, detail="Student not found.")
        return student

    @staticmethod
    def get_by_gr_number(db: Session, gr_number: str) -> Student:
        student = db.scalar(
            select(Student)
            .where(Student.gr_number == gr_number)
            .where(Student.is_deleted == False)
        )
        if not student:
            raise HTTPException(status_code=404, detail=f"Student with GR {gr_number} not found.")
        return student

    @staticmethod
    def get_list(
        db: Session,
        page: int = 1,
        per_page: int = 20,
        search: str | None = None,
        standard: str | None = None,
        division: str | None = None,
        status: str | None = "active",
        academic_year_id: int | None = None,
        category: str | None = None,
        gender: str | None = None,
    ) -> tuple[list[Student], int]:
        query = select(Student).where(Student.is_deleted == False)

        if search:
            search_term = f"%{search}%"
            query = query.where(
                or_(
                    Student.full_name.ilike(search_term),
                    Student.gr_number.ilike(search_term),
                    Student.father_name.ilike(search_term),
                    Student.mobile.ilike(search_term),
                    Student.full_name_marathi.ilike(search_term),
                )
            )
        if standard:
            query = query.where(Student.standard == standard)
        if division:
            query = query.where(Student.division == division)
        if status:
            query = query.where(Student.status == status)
        if academic_year_id:
            query = query.where(Student.academic_year_id == academic_year_id)
        if category:
            query = query.where(Student.category == category)
        if gender:
            query = query.where(Student.gender == gender)

        # Count
        count_q = select(func.count()).select_from(query.subquery())
        total = db.scalar(count_q) or 0

        # Paginate
        query = query.order_by(Student.standard, Student.roll_number, Student.full_name)
        offset = (page - 1) * per_page
        students = db.scalars(query.offset(offset).limit(per_page)).all()

        return list(students), total

    @staticmethod
    def update(
        db: Session,
        student_id: int,
        data: StudentUpdateRequest,
        updated_by: int,
    ) -> Student:
        student = StudentService.get_by_id(db, student_id)
        update_data = data.model_dump(exclude_none=True)

        # Rebuild full_name if name fields changed
        if any(k in update_data for k in ["first_name", "middle_name", "last_name"]):
            fn = update_data.get("first_name", student.first_name)
            mn = update_data.get("middle_name", student.middle_name)
            ln = update_data.get("last_name", student.last_name)
            parts = [fn]
            if mn:
                parts.append(mn)
            parts.append(ln)
            student.full_name = " ".join(parts)

        for field, value in update_data.items():
            setattr(student, field, value)

        student.updated_by = updated_by
        AuditService.log(
            db, action="STUDENT_UPDATED", module="student",
            user_id=updated_by, entity_type="Student",
            entity_id=student.id,
            description=f"Student '{student.full_name}' record updated.",
        )
        db.commit()
        db.refresh(student)
        return student

    @staticmethod
    async def upload_photo(
        db: Session,
        student_id: int,
        file: UploadFile,
        uploaded_by: int,
    ) -> str:
        student = StudentService.get_by_id(db, student_id)

        # Delete old photo
        if student.photo_path:
            StorageService.delete_file(student.photo_path)

        # Save new photo
        path = await StorageService.save_image(file, "student_photos", str(student_id))
        student.photo_path = path
        student.updated_by = uploaded_by

        AuditService.log(
            db, action="STUDENT_PHOTO_UPLOADED", module="student",
            user_id=uploaded_by, entity_type="Student",
            entity_id=student.id,
            description=f"Photo uploaded for student {student.full_name}.",
        )
        db.commit()
        return path

    @staticmethod
    def mark_leaving(
        db: Session,
        student_id: int,
        data: StudentLeavingRequest,
        updated_by: int,
    ) -> Student:
        student = StudentService.get_by_id(db, student_id)
        student.date_of_leaving = data.date_of_leaving
        student.leaving_reason = data.leaving_reason
        student.status = data.status
        student.is_active = False
        student.updated_by = updated_by

        AuditService.log(
            db, action="STUDENT_LEFT", module="student",
            user_id=updated_by, entity_type="Student",
            entity_id=student.id,
            description=f"Student '{student.full_name}' marked as {data.status}. Reason: {data.leaving_reason}",
        )
        db.commit()
        db.refresh(student)
        return student

    @staticmethod
    def delete(db: Session, student_id: int, deleted_by: int) -> None:
        student = StudentService.get_by_id(db, student_id)
        student.soft_delete(deleted_by=deleted_by)
        AuditService.log(
            db, action="STUDENT_DELETED", module="student",
            user_id=deleted_by, entity_type="Student",
            entity_id=student.id,
            description=f"Student '{student.full_name}' deleted.",
        )
        db.commit()

    @staticmethod
    def get_stats(db: Session, academic_year_id: int | None = None) -> dict:
        """Dashboard stats for student module."""
        base = select(Student).where(Student.is_deleted == False)
        if academic_year_id:
            base = base.where(Student.academic_year_id == academic_year_id)

        total = db.scalar(select(func.count()).select_from(base.subquery())) or 0
        active = db.scalar(
            select(func.count()).select_from(
                base.where(Student.status == "active").subquery()
            )
        ) or 0
        boys = db.scalar(
            select(func.count()).select_from(
                base.where(Student.gender == "male").subquery()
            )
        ) or 0
        girls = db.scalar(
            select(func.count()).select_from(
                base.where(Student.gender == "female").subquery()
            )
        ) or 0

        return {
            "total": total,
            "active": active,
            "boys": boys,
            "girls": girls,
            "left": total - active,
        }

    @staticmethod
    def get_admission_stats(db: Session) -> dict:
        """Statistics specific to admission dashboard."""
        from datetime import datetime, date
        now = datetime.now()
        first_of_month = date(now.year, now.month, 1)

        total_this_year = db.scalar(
            select(func.count(Student.id)).where(Student.is_deleted == False)
        ) or 0
        new_this_month = db.scalar(
            select(func.count(Student.id)).where(
                Student.is_deleted == False,
                Student.admission_date >= first_of_month,
            )
        ) or 0
        pending_gr = db.scalar(
            select(func.count(Student.id)).where(
                Student.is_deleted == False,
                (Student.gr_number.is_(None)) | (Student.gr_number == ""),
            )
        ) or 0

        return {
            "total_admissions_this_year": total_this_year,
            "new_this_month": new_this_month,
            "pending_gr": pending_gr,
            "promotions_pending": 0,
        }

    @staticmethod
    def bulk_promote(db: Session, promotions: list[dict], to_academic_year_id: int, by: int) -> int:
        """Promote students to next standard/academic year."""
        count = 0
        for item in promotions:
            student_id = item.get("student_id")
            result = item.get("result")
            promoted_to = item.get("promoted_to_standard")
            if not student_id or result != "pass":
                continue
            student = db.get(Student, student_id)
            if student and not student.is_deleted:
                if promoted_to:
                    student.standard = str(promoted_to)
                if to_academic_year_id:
                    student.academic_year_id = to_academic_year_id
                student.updated_by = by
                count += 1
        db.commit()
        return count



class AttendanceService:
    """Attendance operations."""

    @staticmethod
    def mark_bulk(
        db: Session,
        data: AttendanceMarkRequest,
        marked_by: int,
    ) -> int:
        """Mark attendance for entire class at once. Returns count saved."""
        marked_now = datetime.now(timezone.utc)
        count = 0

        for record in data.records:
            student_id = record.get("student_id")
            att_status = record.get("status", "present")
            reason = record.get("reason")

            if not student_id:
                continue

            # Upsert attendance record
            existing = db.scalar(
                select(StudentAttendance).where(
                    and_(
                        StudentAttendance.student_id == student_id,
                        StudentAttendance.attendance_date == data.attendance_date,
                        StudentAttendance.period == data.period,
                    )
                )
            )

            if existing:
                existing.status = att_status
                existing.reason = reason
                existing.marked_by = marked_by
                existing.marked_at = marked_now
            else:
                att = StudentAttendance(
                    student_id=student_id,
                    attendance_date=data.attendance_date,
                    standard=data.standard,
                    division=data.division,
                    academic_year_id=data.academic_year_id,
                    period=data.period,
                    status=att_status,
                    reason=reason,
                    marked_by=marked_by,
                    marked_at=marked_now,
                    created_by=marked_by,
                )
                db.add(att)
            count += 1

        AuditService.log(
            db, action="ATTENDANCE_MARKED", module="student",
            user_id=marked_by,
            description=f"Attendance marked for {data.standard}-{data.division or ''} on {data.attendance_date}. {count} records.",
        )
        db.commit()
        return count

    @staticmethod
    def get_class_attendance(
        db: Session,
        standard: str,
        division: str | None,
        attendance_date: date,
        period: str = "full_day",
    ) -> list[StudentAttendance]:
        return list(db.scalars(
            select(StudentAttendance)
            .where(StudentAttendance.attendance_date == attendance_date)
            .where(StudentAttendance.standard == standard)
            .where(StudentAttendance.period == period)
            .where(StudentAttendance.is_deleted == False)
            .join(Student, StudentAttendance.student_id == Student.id)
            .where(Student.is_deleted == False)
        ).all())

    @staticmethod
    def get_student_summary(
        db: Session,
        student_id: int,
        from_date: date,
        to_date: date,
    ) -> AttendanceSummaryResponse:
        records = list(db.scalars(
            select(StudentAttendance)
            .where(StudentAttendance.student_id == student_id)
            .where(StudentAttendance.attendance_date >= from_date)
            .where(StudentAttendance.attendance_date <= to_date)
            .where(StudentAttendance.period == "full_day")
            .where(StudentAttendance.is_deleted == False)
        ).all())

        total = len(records)
        present = sum(1 for r in records if r.status == "present")
        absent = sum(1 for r in records if r.status == "absent")
        late = sum(1 for r in records if r.status == "late")
        half = sum(1 for r in records if r.status == "half_day")
        pct = round((present / total * 100), 2) if total > 0 else 0.0

        return AttendanceSummaryResponse(
            total_days=total,
            present_days=present,
            absent_days=absent,
            late_days=late,
            half_day=half,
            attendance_percentage=pct,
        )
