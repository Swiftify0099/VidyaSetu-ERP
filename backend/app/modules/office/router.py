"""
VidyaSetu ERP — Office Module Router
"""
from datetime import date
from typing import Optional
from fastapi import APIRouter, Depends, File, Query, UploadFile, status
from sqlalchemy.orm import Session

from app.core.dependencies import AuthUser, DBSession, require_permission
from app.modules.office.schemas import (
    NoticeCreateRequest, NoticeUpdateRequest, NoticeResponse,
    EnquiryCreateRequest, EnquiryUpdateRequest, EnquiryResponse,
    VisitorCreateRequest, VisitorCheckOutRequest, VisitorResponse,
    EventCreateRequest, EventResponse,
    ComplaintCreateRequest, ComplaintUpdateRequest, ComplaintResponse,
    RegisterCreateRequest, RegisterResponse,
    BonafideApplyRequest, BonafideClerkCreateRequest, BonafideApproveRejectRequest,
)
from app.modules.office.service import (
    NoticeService, EnquiryService, VisitorService,
    EventService, ComplaintService, RegisterService, OfficeStatsService,
    BonafideService,
)
from app.shared.responses import APIResponse

router = APIRouter(prefix="/office", tags=["Office"])


# ── Stats ─────────────────────────────────────────────────────
@router.get("/stats", response_model=APIResponse,
            dependencies=[Depends(require_permission("office.read"))])
async def office_stats(current_user: AuthUser, db: DBSession):
    return APIResponse.ok(data=OfficeStatsService.get(db).model_dump())


# ── Notices ───────────────────────────────────────────────────
@router.post("/notices", response_model=APIResponse, status_code=201,
             dependencies=[Depends(require_permission("office.notice.create"))])
async def create_notice(body: NoticeCreateRequest, current_user: AuthUser, db: DBSession):
    n = NoticeService.create(db, body, current_user.user_id)
    return APIResponse.created(data=NoticeResponse.model_validate(n).model_dump(),
                               message=f"Notice '{n.title}' published.")


@router.get("/notices", response_model=APIResponse,
            dependencies=[Depends(require_permission("office.read"))])
async def list_notices(current_user: AuthUser, db: DBSession,
                       page: int = Query(1, ge=1), per_page: int = Query(20, ge=1, le=100),
                       notice_type: Optional[str] = None, audience: Optional[str] = None,
                       is_published: Optional[bool] = True, search: Optional[str] = None,
                       priority: Optional[str] = None):
    items, total = NoticeService.get_list(db, page=page, per_page=per_page,
                                          notice_type=notice_type, audience=audience,
                                          is_published=is_published, search=search, priority=priority)
    total_pages = max(1, (total + per_page - 1) // per_page)
    return APIResponse.ok(data={
        "items": [NoticeResponse.model_validate(n).model_dump() for n in items],
        "meta": {"page": page, "per_page": per_page, "total": total,
                 "total_pages": total_pages, "has_next": page < total_pages},
    })


@router.get("/notices/{notice_id}", response_model=APIResponse,
            dependencies=[Depends(require_permission("office.read"))])
async def get_notice(notice_id: int, current_user: AuthUser, db: DBSession):
    n = NoticeService.get_by_id(db, notice_id)
    return APIResponse.ok(data=NoticeResponse.model_validate(n).model_dump())


@router.put("/notices/{notice_id}", response_model=APIResponse,
            dependencies=[Depends(require_permission("office.notice.update"))])
async def update_notice(notice_id: int, body: NoticeUpdateRequest, current_user: AuthUser, db: DBSession):
    n = NoticeService.update(db, notice_id, body, current_user.user_id)
    return APIResponse.ok(data=NoticeResponse.model_validate(n).model_dump())


@router.post("/notices/{notice_id}/attachment", response_model=APIResponse,
             dependencies=[Depends(require_permission("office.notice.update"))])
async def upload_notice_attachment(notice_id: int, current_user: AuthUser,
                                   db: DBSession, file: UploadFile = File(...)):
    path = await NoticeService.upload_attachment(db, notice_id, file, current_user.user_id)
    return APIResponse.ok(data={"attachment_path": path})


@router.delete("/notices/{notice_id}", response_model=APIResponse,
               dependencies=[Depends(require_permission("office.notice.delete"))])
async def delete_notice(notice_id: int, current_user: AuthUser, db: DBSession):
    NoticeService.delete(db, notice_id, current_user.user_id)
    return APIResponse.ok(message="Notice deleted.")


# ── Enquiries ─────────────────────────────────────────────────
@router.post("/enquiries", response_model=APIResponse, status_code=201,
             dependencies=[Depends(require_permission("office.enquiry.create"))])
async def create_enquiry(body: EnquiryCreateRequest, current_user: AuthUser, db: DBSession):
    e = EnquiryService.create(db, body, current_user.user_id)
    return APIResponse.created(data=EnquiryResponse.model_validate(e).model_dump(),
                               message=f"Enquiry {e.enquiry_number} registered.")


@router.get("/enquiries", response_model=APIResponse,
            dependencies=[Depends(require_permission("office.read"))])
async def list_enquiries(current_user: AuthUser, db: DBSession,
                         page: int = Query(1, ge=1), per_page: int = Query(20, ge=1, le=100),
                         status: Optional[str] = None, standard: Optional[str] = None,
                         search: Optional[str] = None, from_date: Optional[date] = None,
                         to_date: Optional[date] = None):
    items, total = EnquiryService.get_list(db, page=page, per_page=per_page, status=status,
                                           standard=standard, search=search, from_date=from_date, to_date=to_date)
    total_pages = max(1, (total + per_page - 1) // per_page)
    return APIResponse.ok(data={
        "items": [EnquiryResponse.model_validate(e).model_dump() for e in items],
        "meta": {"page": page, "per_page": per_page, "total": total, "total_pages": total_pages},
    })


@router.get("/enquiries/{enq_id}", response_model=APIResponse,
            dependencies=[Depends(require_permission("office.read"))])
async def get_enquiry(enq_id: int, current_user: AuthUser, db: DBSession):
    return APIResponse.ok(data=EnquiryResponse.model_validate(EnquiryService.get_by_id(db, enq_id)).model_dump())


@router.put("/enquiries/{enq_id}", response_model=APIResponse,
            dependencies=[Depends(require_permission("office.enquiry.update"))])
async def update_enquiry(enq_id: int, body: EnquiryUpdateRequest, current_user: AuthUser, db: DBSession):
    e = EnquiryService.update(db, enq_id, body, current_user.user_id)
    return APIResponse.ok(data=EnquiryResponse.model_validate(e).model_dump())


@router.delete("/enquiries/{enq_id}", response_model=APIResponse,
               dependencies=[Depends(require_permission("office.enquiry.delete"))])
async def delete_enquiry(enq_id: int, current_user: AuthUser, db: DBSession):
    EnquiryService.delete(db, enq_id, current_user.user_id)
    return APIResponse.ok(message="Enquiry deleted.")


# ── Visitors ──────────────────────────────────────────────────
@router.post("/visitors/checkin", response_model=APIResponse, status_code=201,
             dependencies=[Depends(require_permission("office.visitor.create"))])
async def visitor_checkin(body: VisitorCreateRequest, current_user: AuthUser, db: DBSession):
    v = VisitorService.check_in(db, body, current_user.user_id)
    return APIResponse.created(data=VisitorResponse.model_validate(v).model_dump(),
                               message="Visitor checked in.")


@router.put("/visitors/{visitor_id}/checkout", response_model=APIResponse,
            dependencies=[Depends(require_permission("office.visitor.create"))])
async def visitor_checkout(visitor_id: int, body: VisitorCheckOutRequest,
                           current_user: AuthUser, db: DBSession):
    v = VisitorService.check_out(db, visitor_id, body, current_user.user_id)
    return APIResponse.ok(data=VisitorResponse.model_validate(v).model_dump(), message="Visitor checked out.")


@router.get("/visitors", response_model=APIResponse,
            dependencies=[Depends(require_permission("office.read"))])
async def list_visitors(current_user: AuthUser, db: DBSession,
                        visitor_date: Optional[date] = None,
                        page: int = Query(1, ge=1), per_page: int = Query(30, ge=1, le=100)):
    items, total = VisitorService.get_list(db, visitor_date=visitor_date, page=page, per_page=per_page)
    return APIResponse.ok(data={
        "items": [VisitorResponse.model_validate(v).model_dump() for v in items],
        "meta": {"total": total, "page": page, "per_page": per_page},
    })


# ── Events ────────────────────────────────────────────────────
@router.post("/events", response_model=APIResponse, status_code=201,
             dependencies=[Depends(require_permission("office.event.create"))])
async def create_event(body: EventCreateRequest, current_user: AuthUser, db: DBSession):
    ev = EventService.create(db, body, current_user.user_id)
    return APIResponse.created(data=EventResponse.model_validate(ev).model_dump(),
                               message=f"Event '{ev.title}' added to calendar.")


@router.get("/events", response_model=APIResponse,
            dependencies=[Depends(require_permission("office.read"))])
async def list_events(current_user: AuthUser, db: DBSession,
                      from_date: Optional[date] = None, to_date: Optional[date] = None,
                      event_type: Optional[str] = None, academic_year_id: Optional[int] = None,
                      page: int = Query(1, ge=1), per_page: int = Query(50, ge=1, le=200)):
    items, total = EventService.get_list(db, from_date=from_date, to_date=to_date,
                                         event_type=event_type, academic_year_id=academic_year_id,
                                         page=page, per_page=per_page)
    return APIResponse.ok(data={
        "items": [EventResponse.model_validate(e).model_dump() for e in items],
        "meta": {"total": total},
    })


@router.delete("/events/{event_id}", response_model=APIResponse,
               dependencies=[Depends(require_permission("office.event.delete"))])
async def delete_event(event_id: int, current_user: AuthUser, db: DBSession):
    EventService.delete(db, event_id, current_user.user_id)
    return APIResponse.ok(message="Event removed.")


# ── Complaints ────────────────────────────────────────────────
@router.post("/complaints", response_model=APIResponse, status_code=201,
             dependencies=[Depends(require_permission("office.complaint.create"))])
async def create_complaint(body: ComplaintCreateRequest, current_user: AuthUser, db: DBSession):
    c = ComplaintService.create(db, body, current_user.user_id)
    return APIResponse.created(data=ComplaintResponse.model_validate(c).model_dump(),
                               message=f"Complaint {c.complaint_number} registered.")


@router.get("/complaints", response_model=APIResponse,
            dependencies=[Depends(require_permission("office.read"))])
async def list_complaints(current_user: AuthUser, db: DBSession,
                          status: Optional[str] = None, complaint_type: Optional[str] = None,
                          page: int = Query(1, ge=1), per_page: int = Query(20, ge=1, le=100)):
    items, total = ComplaintService.get_list(db, status=status, complaint_type=complaint_type,
                                             page=page, per_page=per_page)
    total_pages = max(1, (total + per_page - 1) // per_page)
    return APIResponse.ok(data={
        "items": [ComplaintResponse.model_validate(c).model_dump() for c in items],
        "meta": {"total": total, "page": page, "total_pages": total_pages},
    })


@router.put("/complaints/{complaint_id}", response_model=APIResponse,
            dependencies=[Depends(require_permission("office.complaint.update"))])
async def update_complaint(complaint_id: int, body: ComplaintUpdateRequest,
                           current_user: AuthUser, db: DBSession):
    c = ComplaintService.update(db, complaint_id, body, current_user.user_id)
    return APIResponse.ok(data=ComplaintResponse.model_validate(c).model_dump())


# ── Inward/Outward Register ────────────────────────────────────
@router.post("/register", response_model=APIResponse, status_code=201,
             dependencies=[Depends(require_permission("office.register.create"))])
async def create_register_entry(body: RegisterCreateRequest, current_user: AuthUser, db: DBSession):
    r = RegisterService.create(db, body, current_user.user_id)
    return APIResponse.created(data=RegisterResponse.model_validate(r).model_dump(),
                               message=f"Entry {r.register_number} added.")


@router.get("/register", response_model=APIResponse,
            dependencies=[Depends(require_permission("office.read"))])
async def list_register(current_user: AuthUser, db: DBSession,
                        register_type: Optional[str] = None,
                        from_date: Optional[date] = None, to_date: Optional[date] = None,
                        page: int = Query(1, ge=1), per_page: int = Query(30, ge=1, le=100)):
    items, total = RegisterService.get_list(db, register_type=register_type,
                                            from_date=from_date, to_date=to_date,
                                            page=page, per_page=per_page)
    return APIResponse.ok(data={
        "items": [RegisterResponse.model_validate(r).model_dump() for r in items],
        "meta": {"total": total, "page": page, "per_page": per_page},
    })


# ── Bonafide Certificate Applications ──────────────────────────
@router.get("/bonafide/applications", response_model=APIResponse,
            dependencies=[Depends(require_permission("office.read"))])
async def list_bonafide_applications(current_user: AuthUser, db: DBSession,
                                      status: Optional[str] = None,
                                      student_id: Optional[int] = None,
                                      search: Optional[str] = None,
                                      page: int = Query(1, ge=1),
                                      per_page: int = Query(20, ge=1, le=100)):
    items, total = BonafideService.get_applications(db, status=status, student_id=student_id, search=search, page=page, per_page=per_page)
    total_pages = max(1, (total + per_page - 1) // per_page)
    return APIResponse.ok(data={
        "items": items,
        "meta": {"total": total, "page": page, "per_page": per_page, "total_pages": total_pages},
    })


@router.post("/bonafide/applications", response_model=APIResponse, status_code=201,
             dependencies=[Depends(require_permission("office.create"))])
async def create_direct_bonafide(body: BonafideClerkCreateRequest, current_user: AuthUser, db: DBSession):
    app = BonafideService.clerk_create(db, body, current_user.user_id)
    return APIResponse.created(data={"id": app.id, "application_number": app.application_number}, message=f"Bonafide certificate issued directly: {app.application_number}")


@router.put("/bonafide/applications/{app_id}/approve", response_model=APIResponse,
            dependencies=[Depends(require_permission("office.update"))])
async def approve_bonafide_application(app_id: int, current_user: AuthUser, db: DBSession, remarks: Optional[str] = Query(None)):
    app = BonafideService.approve_application(db, app_id, current_user.user_id, remarks)
    return APIResponse.ok(data={"id": app.id, "status": app.status, "issued_certificate_number": app.issued_certificate_number}, message="Bonafide application approved.")


@router.put("/bonafide/applications/{app_id}/reject", response_model=APIResponse,
            dependencies=[Depends(require_permission("office.update"))])
async def reject_bonafide_application(app_id: int, body: BonafideApproveRejectRequest, current_user: AuthUser, db: DBSession):
    reason = body.rejection_reason or "Verification documents pending or incomplete."
    app = BonafideService.reject_application(db, app_id, current_user.user_id, reason, body.remarks)
    return APIResponse.ok(data={"id": app.id, "status": app.status, "rejection_reason": app.rejection_reason}, message="Bonafide application rejected.")


@router.get("/bonafide/applications/{app_id}/print-data", response_model=APIResponse,
            dependencies=[Depends(require_permission("office.read"))])
async def get_bonafide_print_data(app_id: int, current_user: AuthUser, db: DBSession):
    data = BonafideService.get_print_data(db, app_id)
    return APIResponse.ok(data=data.model_dump())

