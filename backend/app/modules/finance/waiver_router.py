"""
VidyaSetu ERP — Fee Waiver Router
Workflow: Parent/Student applies → Accountant reviews → Principal approves
"""
from datetime import date
from decimal import Decimal
from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import select, func

from app.core.dependencies import AuthUser, DBSession, require_permission
from app.modules.finance.models import FeeWaiver
from app.shared.responses import APIResponse
from app.shared.audit import create_audit_log

router = APIRouter(prefix="/finance/waivers", tags=["Fee Waivers"])


def _waiver_dict(w: FeeWaiver) -> dict:
    return {
        "id": w.id,
        "waiver_number": w.waiver_number,
        "student_id": w.student_id,
        "academic_year": w.academic_year,
        "reason": w.reason,
        "waiver_type": w.waiver_type,
        "requested_amount": float(w.requested_amount) if w.requested_amount else 0,
        "status": w.status,
        "accountant_remarks": w.accountant_remarks,
        "accountant_action": w.accountant_action,
        "accountant_reviewed_on": str(w.accountant_reviewed_on) if w.accountant_reviewed_on else None,
        "accountant_recommended_amount": float(w.accountant_recommended_amount) if w.accountant_recommended_amount else None,
        "principal_remarks": w.principal_remarks,
        "principal_approved_on": str(w.principal_approved_on) if w.principal_approved_on else None,
        "approved_amount": float(w.approved_amount) if w.approved_amount else None,
        "is_active": w.is_active,
        "created_at": w.created_at.isoformat() if w.created_at else None,
    }


def _gen_waiver_number(db: Session) -> str:
    today = date.today()
    prefix = f"WVR-{today.year}-"
    count = db.scalar(
        select(func.count()).select_from(FeeWaiver)
        .where(FeeWaiver.waiver_number.like(f"{prefix}%"))
    ) or 0
    return f"{prefix}{count + 1:04d}"


@router.get("", response_model=APIResponse,
            dependencies=[Depends(require_permission("finance.read"))])
async def list_waivers(
    db: DBSession, current_user: AuthUser,
    status: Optional[str] = None,
    academic_year: Optional[str] = None,
    student_id: Optional[int] = None,
):
    q = select(FeeWaiver).where(FeeWaiver.is_deleted == False)
    if status:
        q = q.where(FeeWaiver.status == status)
    if academic_year:
        q = q.where(FeeWaiver.academic_year == academic_year)
    if student_id:
        q = q.where(FeeWaiver.student_id == student_id)
    waivers = db.scalars(q.order_by(FeeWaiver.created_at.desc())).all()
    return APIResponse.ok(data=[_waiver_dict(w) for w in waivers])


@router.post("", response_model=APIResponse, status_code=201,
             dependencies=[Depends(require_permission("finance.read"))])
async def apply_waiver(body: dict, db: DBSession, current_user: AuthUser):
    """Apply for fee waiver — parent or student."""
    waiver = FeeWaiver(
        waiver_number=_gen_waiver_number(db),
        student_id=body.get("student_id"),
        academic_year=body.get("academic_year", "2025-26"),
        requested_by=current_user.user_id,
        reason=body.get("reason", ""),
        waiver_type=body.get("waiver_type", "partial"),
        requested_amount=Decimal(str(body.get("requested_amount", 0))),
        document_path=body.get("document_path"),
        status="pending",
        created_by=current_user.user_id,
        updated_by=current_user.user_id,
    )
    db.add(waiver)
    db.commit()
    db.refresh(waiver)
    create_audit_log(db, "create", "fee_waivers", waiver.id, None,
                     {"student_id": waiver.student_id, "amount": str(waiver.requested_amount)},
                     current_user.user_id)
    # Notify accountant
    try:
        from app.shared.notifications import push_event
        push_event(db, "fee_waiver.applied", {
            "waiver_id": waiver.id,
            "student_id": waiver.student_id,
            "amount": float(waiver.requested_amount),
            "sender_id": current_user.user_id,
        })
    except Exception:
        pass
    return APIResponse.created(data=_waiver_dict(waiver), message=f"Fee waiver {waiver.waiver_number} submitted.")


@router.post("/{waiver_id}/accountant-review", response_model=APIResponse,
             dependencies=[Depends(require_permission("finance.create"))])
async def accountant_review(waiver_id: int, body: dict, db: DBSession, current_user: AuthUser):
    """Accountant reviews and recommends/rejects the waiver."""
    waiver = db.get(FeeWaiver, waiver_id)
    if not waiver or waiver.is_deleted:
        return APIResponse.error("Waiver not found", status_code=404)
    if waiver.status != "pending":
        return APIResponse.error(f"Cannot review a '{waiver.status}' waiver", status_code=400)

    action = body.get("action", "recommend")  # recommend / reject
    waiver.accountant_action = action
    waiver.accountant_id = current_user.user_id
    waiver.accountant_reviewed_on = date.today()
    waiver.accountant_remarks = body.get("remarks", "")
    waiver.accountant_recommended_amount = body.get("recommended_amount")

    if action == "reject":
        waiver.status = "rejected"
    else:
        waiver.status = "accountant_reviewed"
        # Notify principal
        try:
            from app.shared.notifications import push_event
            push_event(db, "fee_waiver.pending_principal", {
                "waiver_id": waiver.id,
                "student_id": waiver.student_id,
                "sender_id": current_user.user_id,
            })
        except Exception:
            pass

    waiver.updated_by = current_user.user_id
    db.commit()
    db.refresh(waiver)
    create_audit_log(db, "update", "fee_waivers", waiver_id,
                     {"status": "pending"}, {"status": waiver.status, "action": action},
                     current_user.user_id)
    return APIResponse.ok(data=_waiver_dict(waiver), message=f"Waiver {action}ed by accountant.")


@router.post("/{waiver_id}/principal-decision", response_model=APIResponse,
             dependencies=[Depends(require_permission("finance.approve"))])
async def principal_decision(waiver_id: int, body: dict, db: DBSession, current_user: AuthUser):
    """Principal gives final approval or rejection for the waiver."""
    waiver = db.get(FeeWaiver, waiver_id)
    if not waiver or waiver.is_deleted:
        return APIResponse.error("Waiver not found", status_code=404)
    if waiver.status not in ("accountant_reviewed", "pending"):
        return APIResponse.error(f"Cannot action a '{waiver.status}' waiver", status_code=400)

    action = body.get("action", "approve")  # approve / reject
    waiver.principal_id = current_user.user_id
    waiver.principal_approved_on = date.today()
    waiver.principal_remarks = body.get("remarks", "")

    if action == "approve":
        waiver.status = "approved"
        waiver.approved_amount = body.get("approved_amount") or waiver.accountant_recommended_amount or waiver.requested_amount
    else:
        waiver.status = "rejected"
        waiver.approved_amount = None

    waiver.updated_by = current_user.user_id
    db.commit()
    db.refresh(waiver)
    create_audit_log(db, "update", "fee_waivers", waiver_id,
                     {"status": "accountant_reviewed"}, {"status": waiver.status},
                     current_user.user_id)
    # Notify applicant
    try:
        from app.shared.notifications import push_event
        event = "fee_waiver.approved" if action == "approve" else "fee_waiver.rejected"
        push_event(db, event, {
            "waiver_id": waiver.id,
            "student_id": waiver.student_id,
            "approved_amount": float(waiver.approved_amount) if waiver.approved_amount else 0,
            "sender_id": current_user.user_id,
        })
    except Exception:
        pass
    return APIResponse.ok(data=_waiver_dict(waiver), message=f"Waiver {action}d by Principal.")
