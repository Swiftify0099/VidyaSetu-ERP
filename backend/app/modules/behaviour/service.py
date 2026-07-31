"""
VidyaSetu ERP — Student Behaviour Service
"""
from typing import Optional, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import select, func, or_
from app.modules.behaviour.models import StudentBehaviourLog, IncidentType, IncidentStatus
from app.modules.behaviour.schemas import BehaviourCreateRequest, BehaviourUpdateRequest
from app.modules.student.models import Student
from app.shared.audit import AuditService

class BehaviourService:

    @staticmethod
    def create(db: Session, data: BehaviourCreateRequest, reporter_id: int, reporter_name: str) -> StudentBehaviourLog:
        student = db.scalar(
            select(Student).where(
                or_(Student.gr_number == data.student_gr, Student.admission_number == data.student_gr),
                Student.is_deleted == False
            )
        )
        if not student:
            # Fallback for testing: look up by ID
            try:
                sid = int(data.student_gr)
                student = db.get(Student, sid)
            except ValueError:
                pass

        if not student:
            raise ValueError(f"Student with GR Number/ID '{data.student_gr}' not found.")

        log = StudentBehaviourLog(
            student_id=student.id,
            student_name=student.full_name,
            gr_number=student.gr_number or str(student.id),
            standard=student.standard,
            division=student.division,
            incident_date=data.incident_date,
            incident_type=data.incident_type,
            category=data.category,
            description=data.description,
            action_taken=data.action_taken,
            reported_by_name=reporter_name,
            follow_up_required=data.follow_up_required,
            follow_up_date=data.follow_up_date,
            status=IncidentStatus.open,
            created_by=reporter_id,
            updated_by=reporter_id,
        )
        db.add(log)
        AuditService.log(
            db, action="BEHAVIOUR_LOG_CREATED", module="behaviour",
            user_id=reporter_id, user_name=reporter_name,
            entity_type="StudentBehaviourLog",
            description=f"Log created for {student.full_name}: {data.category}"
        )
        db.commit()
        db.refresh(log)
        return log

    @staticmethod
    def get_list(
        db: Session,
        page: int = 1,
        per_page: int = 15,
        search: Optional[str] = None,
        incident_type: Optional[str] = None,
        standard: Optional[str] = None,
        status: Optional[str] = None,
    ) -> Tuple[list[StudentBehaviourLog], int]:
        q = select(StudentBehaviourLog).where(StudentBehaviourLog.is_deleted == False)
        if search:
            term = f"%{search}%"
            q = q.where(or_(
                StudentBehaviourLog.student_name.ilike(term),
                StudentBehaviourLog.gr_number.ilike(term),
                StudentBehaviourLog.category.ilike(term),
                StudentBehaviourLog.description.ilike(term),
            ))
        if incident_type:
            q = q.where(StudentBehaviourLog.incident_type == incident_type)
        if standard:
            q = q.where(StudentBehaviourLog.standard == standard)
        if status:
            q = q.where(StudentBehaviourLog.status == status)

        total = db.scalar(select(func.count()).select_from(q.subquery())) or 0
        items = db.scalars(q.order_by(StudentBehaviourLog.created_at.desc()).offset((page - 1) * per_page).limit(per_page)).all()
        return items, total

    @staticmethod
    def update(db: Session, log_id: int, data: BehaviourUpdateRequest, user_id: int) -> StudentBehaviourLog:
        log = db.get(StudentBehaviourLog, log_id)
        if not log or log.is_deleted:
            raise ValueError("Behaviour log not found.")
        if data.action_taken is not None:
            log.action_taken = data.action_taken
        if data.status is not None:
            log.status = data.status
        if data.follow_up_required is not None:
            log.follow_up_required = data.follow_up_required
        if data.follow_up_date is not None:
            log.follow_up_date = data.follow_up_date
        log.updated_by = user_id
        db.commit()
        db.refresh(log)
        return log
