"""
VidyaSetu ERP — Office Module Service
======================================
Business logic for all clerk/office operations.
Auto-numbering for enquiry, complaint, register entries.
"""
from datetime import date, datetime, timezone
from sqlalchemy import and_, func, select, or_
from sqlalchemy.orm import Session
from fastapi import HTTPException, UploadFile

from app.core.config import settings
from app.modules.office.models import (
    Notice, AdmissionEnquiry, Visitor, SchoolEvent, Complaint, InwardRegister
)
from app.modules.office.schemas import (
    NoticeCreateRequest, NoticeUpdateRequest,
    EnquiryCreateRequest, EnquiryUpdateRequest,
    VisitorCreateRequest, VisitorCheckOutRequest,
    EventCreateRequest, ComplaintCreateRequest,
    ComplaintUpdateRequest, RegisterCreateRequest,
    OfficeStatsResponse,
)
from app.shared.audit import AuditService
from app.shared.storage import StorageService


def _auto_number(db: Session, model, field_name: str, prefix: str, date_part: str = "") -> str:
    """Generic auto-number generator: PREFIX-YYYY-NNNN"""
    year = str(date.today().year)
    pattern = f"{prefix}-{year}-%"
    attr = getattr(model, field_name)
    last = db.scalar(
        select(attr).where(attr.like(pattern))
        .where(model.is_deleted == False)
        .order_by(attr.desc())
    )
    try:
        seq = int(last.split("-")[-1]) + 1 if last else 1
    except Exception:
        seq = 1
    return f"{prefix}-{year}-{seq:04d}"


# ── Notice Service ────────────────────────────────────────────

class NoticeService:
    @staticmethod
    def create(db: Session, data: NoticeCreateRequest, created_by: int) -> Notice:
        notice = Notice(
            **data.model_dump(),
            published_by=created_by,
            publish_date=data.publish_date or date.today(),
            created_by=created_by,
        )
        db.add(notice)
        AuditService.log(db, action="NOTICE_CREATED", module="office", user_id=created_by,
                         description=f"Notice published: {data.title}")
        db.commit(); db.refresh(notice)
        return notice

    @staticmethod
    def get_list(db: Session, page: int = 1, per_page: int = 20,
                 notice_type: str | None = None, audience: str | None = None,
                 is_published: bool | None = True, search: str | None = None,
                 priority: str | None = None) -> tuple[list[Notice], int]:
        q = select(Notice).where(Notice.is_deleted == False)
        if notice_type: q = q.where(Notice.notice_type == notice_type)
        if audience and audience != "all": q = q.where(Notice.target_audience.in_(["all", audience]))
        if is_published is not None: q = q.where(Notice.is_published == is_published)
        if search: q = q.where(or_(Notice.title.ilike(f"%{search}%"), Notice.content.ilike(f"%{search}%")))
        if priority: q = q.where(Notice.priority == priority)

        total = db.scalar(select(func.count()).select_from(q.subquery())) or 0
        q = q.order_by(Notice.is_pinned.desc(), Notice.created_at.desc())
        notices = db.scalars(q.offset((page - 1) * per_page).limit(per_page)).all()
        return list(notices), total

    @staticmethod
    def get_by_id(db: Session, notice_id: int) -> Notice:
        n = db.scalar(select(Notice).where(Notice.id == notice_id, Notice.is_deleted == False))
        if not n: raise HTTPException(status_code=404, detail="Notice not found.")
        n.views += 1; db.commit()
        return n

    @staticmethod
    def update(db: Session, notice_id: int, data: NoticeUpdateRequest, updated_by: int) -> Notice:
        n = NoticeService.get_by_id(db, notice_id)
        for k, v in data.model_dump(exclude_none=True).items():
            setattr(n, k, v)
        n.updated_by = updated_by
        db.commit(); db.refresh(n)
        return n

    @staticmethod
    async def upload_attachment(db: Session, notice_id: int, file: UploadFile, uploaded_by: int) -> str:
        n = NoticeService.get_by_id(db, notice_id)
        path = await StorageService.save_file(file, "notice_attachments", str(notice_id))
        n.attachment_path = path; n.updated_by = uploaded_by
        db.commit()
        return path

    @staticmethod
    def delete(db: Session, notice_id: int, deleted_by: int) -> None:
        n = NoticeService.get_by_id(db, notice_id)
        n.soft_delete(deleted_by=deleted_by)
        db.commit()


# ── Enquiry Service ───────────────────────────────────────────

class EnquiryService:
    @staticmethod
    def create(db: Session, data: EnquiryCreateRequest, created_by: int) -> AdmissionEnquiry:
        num = _auto_number(db, AdmissionEnquiry, "enquiry_number",
                           f"{settings.SCHOOL_CODE or 'HMMV'}-ENQ")
        enq = AdmissionEnquiry(
            **data.model_dump(),
            enquiry_number=num,
            enquiry_date=date.today(),
            status="pending",
            created_by=created_by,
        )
        db.add(enq)
        AuditService.log(db, action="ENQUIRY_CREATED", module="office", user_id=created_by,
                         description=f"Admission enquiry for {data.student_name} (Std {data.standard_applying_for})")
        db.commit(); db.refresh(enq)
        return enq

    @staticmethod
    def get_list(db: Session, page: int = 1, per_page: int = 20,
                 status: str | None = None, standard: str | None = None,
                 search: str | None = None, from_date: date | None = None,
                 to_date: date | None = None) -> tuple[list[AdmissionEnquiry], int]:
        q = select(AdmissionEnquiry).where(AdmissionEnquiry.is_deleted == False)
        if status: q = q.where(AdmissionEnquiry.status == status)
        if standard: q = q.where(AdmissionEnquiry.standard_applying_for == standard)
        if search:
            term = f"%{search}%"
            q = q.where(or_(AdmissionEnquiry.student_name.ilike(term),
                            AdmissionEnquiry.contact_mobile.ilike(term),
                            AdmissionEnquiry.father_name.ilike(term),
                            AdmissionEnquiry.enquiry_number.ilike(term)))
        if from_date: q = q.where(AdmissionEnquiry.enquiry_date >= from_date)
        if to_date: q = q.where(AdmissionEnquiry.enquiry_date <= to_date)

        total = db.scalar(select(func.count()).select_from(q.subquery())) or 0
        items = db.scalars(q.order_by(AdmissionEnquiry.enquiry_date.desc())
                           .offset((page - 1) * per_page).limit(per_page)).all()
        return list(items), total

    @staticmethod
    def get_by_id(db: Session, enq_id: int) -> AdmissionEnquiry:
        e = db.scalar(select(AdmissionEnquiry).where(AdmissionEnquiry.id == enq_id,
                                                      AdmissionEnquiry.is_deleted == False))
        if not e: raise HTTPException(status_code=404, detail="Enquiry not found.")
        return e

    @staticmethod
    def update(db: Session, enq_id: int, data: EnquiryUpdateRequest, updated_by: int) -> AdmissionEnquiry:
        e = EnquiryService.get_by_id(db, enq_id)
        for k, v in data.model_dump(exclude_none=True).items():
            setattr(e, k, v)
        e.updated_by = updated_by
        db.commit(); db.refresh(e)
        return e

    @staticmethod
    def delete(db: Session, enq_id: int, deleted_by: int) -> None:
        e = EnquiryService.get_by_id(db, enq_id)
        e.soft_delete(deleted_by=deleted_by)
        db.commit()


# ── Visitor Service ───────────────────────────────────────────

class VisitorService:
    @staticmethod
    def check_in(db: Session, data: VisitorCreateRequest, created_by: int) -> Visitor:
        from datetime import datetime as dt
        v = Visitor(
            **data.model_dump(),
            visitor_date=date.today(),
            check_in_time=data.check_in_time or dt.now().strftime("%H:%M"),
            recorded_by=created_by,
            created_by=created_by,
        )
        db.add(v); db.commit(); db.refresh(v)
        return v

    @staticmethod
    def check_out(db: Session, visitor_id: int, data: VisitorCheckOutRequest, updated_by: int) -> Visitor:
        v = db.scalar(select(Visitor).where(Visitor.id == visitor_id, Visitor.is_deleted == False))
        if not v: raise HTTPException(status_code=404, detail="Visitor not found.")
        v.check_out_time = data.check_out_time
        if data.badge_number: v.badge_number = data.badge_number
        v.updated_by = updated_by
        db.commit(); db.refresh(v)
        return v

    @staticmethod
    def get_list(db: Session, visitor_date: date | None = None,
                 page: int = 1, per_page: int = 30) -> tuple[list[Visitor], int]:
        q = select(Visitor).where(Visitor.is_deleted == False)
        if visitor_date: q = q.where(Visitor.visitor_date == visitor_date)
        else: q = q.where(Visitor.visitor_date == date.today())
        total = db.scalar(select(func.count()).select_from(q.subquery())) or 0
        items = db.scalars(q.order_by(Visitor.created_at.desc())
                           .offset((page - 1) * per_page).limit(per_page)).all()
        return list(items), total


# ── Event Service ─────────────────────────────────────────────

class EventService:
    @staticmethod
    def create(db: Session, data: EventCreateRequest, created_by: int) -> SchoolEvent:
        ev = SchoolEvent(**data.model_dump(), is_published=True, created_by=created_by)
        db.add(ev)
        AuditService.log(db, action="EVENT_CREATED", module="office", user_id=created_by,
                         description=f"Event: {data.title} on {data.start_date}")
        db.commit(); db.refresh(ev)
        return ev

    @staticmethod
    def get_list(db: Session, from_date: date | None = None, to_date: date | None = None,
                 event_type: str | None = None, academic_year_id: int | None = None,
                 page: int = 1, per_page: int = 50) -> tuple[list[SchoolEvent], int]:
        q = select(SchoolEvent).where(SchoolEvent.is_deleted == False, SchoolEvent.is_published == True)
        if from_date: q = q.where(SchoolEvent.start_date >= from_date)
        if to_date: q = q.where(SchoolEvent.start_date <= to_date)
        if event_type: q = q.where(SchoolEvent.event_type == event_type)
        if academic_year_id: q = q.where(SchoolEvent.academic_year_id == academic_year_id)
        total = db.scalar(select(func.count()).select_from(q.subquery())) or 0
        items = db.scalars(q.order_by(SchoolEvent.start_date)
                           .offset((page - 1) * per_page).limit(per_page)).all()
        return list(items), total

    @staticmethod
    def get_by_id(db: Session, event_id: int) -> SchoolEvent:
        ev = db.scalar(select(SchoolEvent).where(SchoolEvent.id == event_id,
                                                  SchoolEvent.is_deleted == False))
        if not ev: raise HTTPException(status_code=404, detail="Event not found.")
        return ev

    @staticmethod
    def delete(db: Session, event_id: int, deleted_by: int) -> None:
        ev = EventService.get_by_id(db, event_id)
        ev.soft_delete(deleted_by=deleted_by)
        db.commit()


# ── Complaint Service ─────────────────────────────────────────

class ComplaintService:
    @staticmethod
    def create(db: Session, data: ComplaintCreateRequest, created_by: int) -> Complaint:
        num = _auto_number(db, Complaint, "complaint_number",
                           f"{settings.SCHOOL_CODE or 'HMMV'}-CMP")
        c = Complaint(**data.model_dump(), complaint_number=num,
                      complaint_date=date.today(), status="open", created_by=created_by)
        db.add(c); db.commit(); db.refresh(c)
        return c

    @staticmethod
    def get_list(db: Session, status: str | None = None, complaint_type: str | None = None,
                 page: int = 1, per_page: int = 20) -> tuple[list[Complaint], int]:
        q = select(Complaint).where(Complaint.is_deleted == False)
        if status: q = q.where(Complaint.status == status)
        if complaint_type: q = q.where(Complaint.complaint_type == complaint_type)
        total = db.scalar(select(func.count()).select_from(q.subquery())) or 0
        items = db.scalars(q.order_by(Complaint.created_at.desc())
                           .offset((page - 1) * per_page).limit(per_page)).all()
        return list(items), total

    @staticmethod
    def update(db: Session, complaint_id: int, data: ComplaintUpdateRequest, updated_by: int) -> Complaint:
        c = db.scalar(select(Complaint).where(Complaint.id == complaint_id, Complaint.is_deleted == False))
        if not c: raise HTTPException(status_code=404, detail="Complaint not found.")
        for k, v in data.model_dump(exclude_none=True).items():
            setattr(c, k, v)
        if data.status in ("resolved", "closed"):
            c.resolved_at = datetime.now(timezone.utc)
            c.resolved_by = updated_by
        c.updated_by = updated_by
        db.commit(); db.refresh(c)
        return c


# ── Inward/Outward Service ────────────────────────────────────

class RegisterService:
    @staticmethod
    def create(db: Session, data: RegisterCreateRequest, created_by: int) -> InwardRegister:
        prefix = f"{settings.SCHOOL_CODE or 'HMMV'}-{'IN' if data.register_type == 'inward' else 'OUT'}"
        num = _auto_number(db, InwardRegister, "register_number", prefix)
        reg = InwardRegister(**data.model_dump(), register_number=num, created_by=created_by)
        db.add(reg); db.commit(); db.refresh(reg)
        return reg

    @staticmethod
    def get_list(db: Session, register_type: str | None = None,
                 from_date: date | None = None, to_date: date | None = None,
                 page: int = 1, per_page: int = 30) -> tuple[list[InwardRegister], int]:
        q = select(InwardRegister).where(InwardRegister.is_deleted == False)
        if register_type: q = q.where(InwardRegister.register_type == register_type)
        if from_date: q = q.where(InwardRegister.register_date >= from_date)
        if to_date: q = q.where(InwardRegister.register_date <= to_date)
        total = db.scalar(select(func.count()).select_from(q.subquery())) or 0
        items = db.scalars(q.order_by(InwardRegister.register_date.desc())
                           .offset((page - 1) * per_page).limit(per_page)).all()
        return list(items), total


# ── Office Stats ──────────────────────────────────────────────

class OfficeStatsService:
    @staticmethod
    def get(db: Session) -> OfficeStatsResponse:
        today = date.today()
        return OfficeStatsResponse(
            total_notices=db.scalar(select(func.count()).select_from(
                select(Notice).where(Notice.is_deleted == False).subquery())) or 0,
            active_notices=db.scalar(select(func.count()).select_from(
                select(Notice).where(Notice.is_deleted == False, Notice.is_published == True).subquery())) or 0,
            total_enquiries=db.scalar(select(func.count()).select_from(
                select(AdmissionEnquiry).where(AdmissionEnquiry.is_deleted == False).subquery())) or 0,
            pending_enquiries=db.scalar(select(func.count()).select_from(
                select(AdmissionEnquiry).where(AdmissionEnquiry.is_deleted == False,
                                               AdmissionEnquiry.status == "pending").subquery())) or 0,
            today_visitors=db.scalar(select(func.count()).select_from(
                select(Visitor).where(Visitor.is_deleted == False, Visitor.visitor_date == today).subquery())) or 0,
            upcoming_events=db.scalar(select(func.count()).select_from(
                select(SchoolEvent).where(SchoolEvent.is_deleted == False,
                                          SchoolEvent.start_date >= today, SchoolEvent.is_published == True).subquery())) or 0,
            open_complaints=db.scalar(select(func.count()).select_from(
                select(Complaint).where(Complaint.is_deleted == False,
                                        Complaint.status.in_(["open", "in_progress"])).subquery())) or 0,
        )
