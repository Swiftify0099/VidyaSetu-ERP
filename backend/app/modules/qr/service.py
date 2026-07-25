"""
VidyaSetu ERP — QR Module Service
===================================
Business logic for generating QR codes, scanning, verifying, and logging.
"""
from datetime import datetime, date, timezone
import json
import urllib.parse
from typing import Optional, Dict, Any, Tuple
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.modules.qr.models import QRCodeRecord, QRScanLog
from app.modules.student.models import Student
from app.modules.library.models import Book, BookIssue, LibraryMember
from app.modules.finance.models import FeeReceipt
from app.shared.audit import AuditService


class QRService:

    @staticmethod
    def _generate_qr_svg_url(data_str: str) -> str:
        """
        Generate a data URL representing an SVG QR code placeholder graphic.
        """
        encoded_text = urllib.parse.quote(data_str[:50])
        svg_content = f"""<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200">
            <rect width="200" height="200" fill="#ffffff" rx="12"/>
            <rect x="20" y="20" width="50" height="50" fill="#1e1b4b" rx="4"/>
            <rect x="26" y="26" width="38" height="38" fill="#ffffff" rx="2"/>
            <rect x="32" y="32" width="26" height="26" fill="#4f46e5" rx="2"/>
            
            <rect x="130" y="20" width="50" height="50" fill="#1e1b4b" rx="4"/>
            <rect x="136" y="26" width="38" height="38" fill="#ffffff" rx="2"/>
            <rect x="142" y="32" width="26" height="26" fill="#4f46e5" rx="2"/>
            
            <rect x="20" y="130" width="50" height="50" fill="#1e1b4b" rx="4"/>
            <rect x="26" y="136" width="38" height="38" fill="#ffffff" rx="2"/>
            <rect x="32" y="142" width="26" height="26" fill="#4f46e5" rx="2"/>
            
            <rect x="80" y="20" width="20" height="20" fill="#4f46e5"/>
            <rect x="80" y="50" width="30" height="20" fill="#1e1b4b"/>
            <rect x="20" y="80" width="30" height="20" fill="#1e1b4b"/>
            <rect x="60" y="80" width="40" height="40" fill="#4f46e5"/>
            <rect x="110" y="80" width="30" height="20" fill="#1e1b4b"/>
            <rect x="150" y="80" width="30" height="30" fill="#4f46e5"/>
            <rect x="80" y="130" width="30" height="30" fill="#1e1b4b"/>
            <rect x="120" y="120" width="60" height="60" fill="#4f46e5"/>
            <text x="100" y="193" font-size="9" font-family="sans-serif" text-anchor="middle" fill="#6b7280">{encoded_text}</text>
        </svg>"""
        return f"data:image/svg+xml;utf8,{urllib.parse.quote(svg_content)}"

    @classmethod
    def generate_qr(cls, db: Session, qr_type: str, reference_id: int, user_id: int) -> QRCodeRecord:
        """
        Generate and persist QR code record for specified entity type and ID.
        """
        label = ""
        sub_label = ""
        ref_code = ""
        payload: Dict[str, Any] = {"type": qr_type, "id": reference_id, "v": 1}

        if qr_type == "student":
            student = db.get(Student, reference_id)
            if not student or student.is_deleted:
                raise ValueError(f"Student ID {reference_id} not found")
            label = student.full_name
            sub_label = f"Std {student.standard}-{student.division} | Roll: {student.roll_number}"
            ref_code = student.gr_number or f"STU-{student.id}"
            payload.update({"gr_number": student.gr_number, "standard": student.standard, "division": student.division})

        elif qr_type == "library":
            book = db.get(Book, reference_id)
            if not book or book.is_deleted:
                raise ValueError(f"Book ID {reference_id} not found")
            label = book.title
            sub_label = f"Author: {book.author or 'N/A'} | ISBN: {book.isbn or 'N/A'}"
            ref_code = getattr(book, "accession_number", f"LIB-{book.id}")
            payload.update({"title": book.title, "accession": ref_code})

        elif qr_type == "fee":
            receipt = db.get(FeeReceipt, reference_id)
            if not receipt or receipt.is_deleted:
                raise ValueError(f"Fee receipt ID {reference_id} not found")
            label = f"Fee Receipt #{receipt.receipt_number}"
            sub_label = f"Student: {receipt.student_name} | Amount: ₹{receipt.total_amount}"
            ref_code = receipt.receipt_number
            payload.update({"receipt_number": receipt.receipt_number, "amount": str(receipt.total_amount)})

        elif qr_type == "attendance":
            label = f"Attendance Session Class {reference_id}"
            sub_label = f"Date: {date.today().isoformat()}"
            ref_code = f"ATT-{reference_id}-{date.today().strftime('%Y%m%d')}"
            payload.update({"class_id": reference_id, "date": date.today().isoformat()})

        elif qr_type == "certificate":
            student = db.get(Student, reference_id)
            if not student or student.is_deleted:
                raise ValueError(f"Student ID {reference_id} not found")
            label = f"Bonafide / Leaving Cert — {student.full_name}"
            sub_label = f"GR: {student.gr_number}"
            ref_code = f"CERT-{student.gr_number}"
            payload.update({"gr": student.gr_number, "cert_id": reference_id})

        else:
            label = f"QR Record #{reference_id}"
            ref_code = f"QR-{qr_type.upper()}-{reference_id}"

        qr_data = json.dumps(payload)
        qr_img = cls._generate_qr_svg_url(qr_data)

        # Check existing
        rec = db.scalar(
            select(QRCodeRecord).where(
                QRCodeRecord.type == qr_type,
                QRCodeRecord.reference_id == reference_id,
                QRCodeRecord.is_deleted == False,
            )
        )
        if not rec:
            rec = QRCodeRecord(
                type=qr_type,
                reference_id=reference_id,
                reference_code=ref_code,
                label=label,
                sub_label=sub_label,
                qr_data=qr_data,
                qr_image_url=qr_img,
                created_by=user_id,
                updated_by=user_id,
            )
            db.add(rec)
        else:
            rec.label = label
            rec.sub_label = sub_label
            rec.qr_data = qr_data
            rec.qr_image_url = qr_img
            rec.updated_by = user_id

        db.commit()
        db.refresh(rec)

        AuditService.log(
            db, action="QR_GENERATED", module="qr",
            user_id=user_id, description=f"QR code generated for {qr_type} ID {reference_id}",
        )
        return rec

    @classmethod
    def scan_qr(cls, db: Session, qr_data_str: str, scanned_by: int) -> Dict[str, Any]:
        """
        Parse scanned QR code data, verify entity, and log result.
        """
        scan_log = QRScanLog(
            scanned_by=scanned_by,
            qr_data=qr_data_str,
            scan_type="verify",
            scan_result="invalid",
            details="Unknown QR structure",
        )

        try:
            payload = json.loads(qr_data_str)
            qr_type = payload.get("type")
            ref_id = payload.get("id")

            if qr_type == "student":
                student = db.get(Student, ref_id)
                if student and not student.is_deleted:
                    scan_log.scan_type = "student_verification"
                    scan_log.scan_result = "success"
                    scan_log.details = f"Verified Student: {student.full_name} ({student.gr_number})"
                    db.add(scan_log)
                    db.commit()
                    return {
                        "type": "student",
                        "found": True,
                        "message": f"Student Verified: {student.full_name}",
                        "data": {
                            "full_name": student.full_name,
                            "gr_number": student.gr_number,
                            "standard": student.standard,
                            "division": student.division,
                            "roll_number": student.roll_number,
                            "gender": student.gender,
                            "status": student.status,
                        },
                    }

            elif qr_type == "library":
                book = db.get(Book, ref_id)
                if book and not book.is_deleted:
                    scan_log.scan_type = "library_book"
                    scan_log.scan_result = "success"
                    scan_log.details = f"Verified Book: {book.title}"
                    db.add(scan_log)
                    db.commit()
                    return {
                        "type": "library",
                        "found": True,
                        "message": f"Book Verified: {book.title}",
                        "data": {
                            "title": book.title,
                            "author": book.author,
                            "isbn": book.isbn,
                            "accession_number": getattr(book, "accession_number", "N/A"),
                            "available_copies": getattr(book, "available_copies", 1),
                        },
                    }

            elif qr_type == "fee":
                receipt = db.get(FeeReceipt, ref_id)
                if receipt and not receipt.is_deleted:
                    scan_log.scan_type = "fee_receipt"
                    scan_log.scan_result = "success"
                    scan_log.details = f"Verified Fee Receipt: {receipt.receipt_number}"
                    db.add(scan_log)
                    db.commit()
                    return {
                        "type": "fee",
                        "found": True,
                        "message": f"Fee Receipt Verified: {receipt.receipt_number}",
                        "data": {
                            "receipt_number": receipt.receipt_number,
                            "student_name": receipt.student_name,
                            "amount": str(receipt.total_amount),
                            "payment_mode": receipt.payment_mode,
                            "receipt_date": str(receipt.receipt_date),
                            "status": receipt.status,
                        },
                    }

            elif qr_type == "attendance":
                scan_log.scan_type = "attendance"
                scan_log.scan_result = "success"
                scan_log.details = f"Verified Attendance QR Session {ref_id}"
                db.add(scan_log)
                db.commit()
                return {
                    "type": "attendance",
                    "found": True,
                    "message": "Attendance QR Session Valid",
                    "data": payload,
                }

        except Exception as e:
            scan_log.details = f"Error parsing QR: {str(e)}"

        db.add(scan_log)
        db.commit()
        return {
            "type": "unknown",
            "found": False,
            "message": "QR Code data invalid or record not found.",
            "data": None,
        }
