"""
VidyaSetu ERP — QR Module API Router
======================================
Endpoints for QR generation, QR scanning, verification, and QR reports.
"""
from typing import Optional
from fastapi import APIRouter, Depends, Query, status, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.core.dependencies import AuthUser, DBSession, require_permission
from app.modules.qr.schemas import (
    QRGenerateRequest, QRScanRequest, QRAttendanceRequest,
    QRRecordResponse, ScanResultResponse,
)
from app.modules.qr.service import QRService
from app.modules.qr.models import QRCodeRecord, QRScanLog
from app.shared.responses import APIResponse

router = APIRouter(prefix="/qr", tags=["QR Code Module"])


@router.post("/generate", response_model=APIResponse, status_code=status.HTTP_201_CREATED)
async def generate_qr(
    body: QRGenerateRequest,
    current_user: AuthUser,
    db: DBSession,
):
    """Generate a QR code record for student, library book, fee receipt, attendance, or certificate."""
    try:
        qr_rec = QRService.generate_qr(db, body.type, body.reference_id, current_user.user_id)
        resp_data = {
            "id": qr_rec.id,
            "uuid": qr_rec.uuid,
            "type": qr_rec.type,
            "reference_id": qr_rec.reference_id,
            "reference_code": qr_rec.reference_code,
            "label": qr_rec.label,
            "sub_label": qr_rec.sub_label,
            "qr_data": qr_rec.qr_data,
            "qr_image_url": qr_rec.qr_image_url,
            "generated_at": qr_rec.created_at.isoformat(),
            "is_active": qr_rec.is_active,
        }
        return APIResponse.created(data=resp_data, message="QR code generated successfully.")
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/scan", response_model=APIResponse)
async def scan_qr(
    body: QRScanRequest,
    current_user: AuthUser,
    db: DBSession,
):
    """Scan and verify a QR code."""
    res = QRService.scan_qr(db, body.qr_data, current_user.user_id)
    return APIResponse.ok(data=res, message=res["message"])


@router.get("/logs", response_model=APIResponse,
            dependencies=[Depends(require_permission("admin.view_logs"))])
async def scan_logs(
    current_user: AuthUser,
    db: DBSession,
    limit: int = Query(default=50, le=200),
):
    """Get QR code scan audit logs."""
    logs = db.scalars(
        select(QRScanLog)
        .order_by(QRScanLog.scanned_at.desc())
        .limit(limit)
    ).all()

    data = [
        {
            "id": log.id,
            "scanned_by": log.scanned_by,
            "scan_type": log.scan_type,
            "scan_result": log.scan_result,
            "details": log.details,
            "scanned_at": log.scanned_at.isoformat(),
        }
        for log in logs
    ]
    return APIResponse.ok(data=data)
