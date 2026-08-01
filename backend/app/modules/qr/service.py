"""
VidyaSetu ERP — QR Module Service
===================================
Business logic for generating QR codes, scanning, verifying, and logging.
"""
from datetime import datetime, date, timezone
import json
import urllib.parse
import io
import base64
from typing import Optional, Dict, Any, Tuple, List
from sqlalchemy import select
from sqlalchemy.orm import Session
import qrcode

from app.modules.qr.models import QRCodeRecord, QRScanLog
from app.modules.student.models import Student
from app.modules.library.models import Book, BookIssue, LibraryMember
from app.modules.finance.models import FeeReceipt
from app.shared.audit import AuditService


class QRService:

    @staticmethod
    def _generate_qr_svg_url(data_str: str) -> str:
        """
        Generate a base64 PNG data URL of a real scannable QR code using python qrcode library.
        """
        try:
            qr = qrcode.QRCode(
                version=1,
                error_correction=qrcode.constants.ERROR_CORRECT_M,
                box_size=8,
                border=2,
            )
            qr.add_data(data_str)
            qr.make(fit=True)
            img = qr.make_image(fill_color="#1e1b4b", back_color="#ffffff")
            buf = io.BytesIO()
            img.save(buf, format="PNG")
            b64 = base64.b64encode(buf.getvalue()).decode("utf-8")
            return f"data:image/png;base64,{b64}"
        except Exception:
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
                <text x="100" y="193" font-size="9" font-family="sans-serif" text-anchor="middle" fill="#6b7280">{encoded_text}</text>
            </svg>"""
            return f"data:image/svg+xml;utf8,{urllib.parse.quote(svg_content)}"

    @classmethod
    def generate_qr(cls, db: Session, qr_type: str, reference_id: Any, user_id: int) -> QRCodeRecord:
        """
        Generate and persist QR code record for specified entity type and ID.
        Supports integer ID or string codes (GR Number, Receipt Number, Accession No).
        """
        label = ""
        sub_label = ""
        ref_code = ""
        ref_id_str = str(reference_id).strip()
        ref_int: Optional[int] = None
        if isinstance(reference_id, int) or ref_id_str.isdigit():
            ref_int = int(ref_id_str)

        actual_ref_id: int = ref_int if ref_int is not None else 0
        payload: Dict[str, Any] = {"type": qr_type, "v": 1}

        if qr_type == "student":
            student = None
            if ref_int is not None:
                student = db.get(Student, ref_int)
            if not student:
                student = db.scalar(
                    select(Student).where(
                        (Student.gr_number == ref_id_str) |
                        (Student.admission_number == ref_id_str) |
                        (Student.full_name.ilike(f"%{ref_id_str}%")),
                        Student.is_deleted == False
                    )
                )
            if not student:
                sample_students = db.scalars(select(Student.gr_number).where(Student.is_deleted == False).limit(3)).all()
                samples_hint = f" (Sample GRs: {', '.join(sample_students)})" if sample_students else ""
                raise ValueError(f"Student ID or GR Number '{ref_id_str}' not found.{samples_hint}")

            actual_ref_id = student.id
            label = student.full_name
            sub_label = f"Std {student.standard}-{student.division or 'A'} | Roll: {student.roll_number or 'N/A'}"
            ref_code = student.gr_number or f"STU-{student.id}"
            payload.update({
                "id": student.id,
                "gr_number": student.gr_number,
                "full_name": student.full_name,
                "standard": student.standard,
                "division": student.division or "A",
                "roll_number": student.roll_number,
            })

        elif qr_type == "library":
            book = None
            if ref_int is not None:
                book = db.get(Book, ref_int)
            if not book:
                book = db.scalar(
                    select(Book).where(
                        (Book.accession_number == ref_id_str) |
                        (Book.title.ilike(f"%{ref_id_str}%")),
                        Book.is_deleted == False
                    )
                )
            if not book:
                raise ValueError(f"Book ID or Accession No. '{ref_id_str}' not found")
            actual_ref_id = book.id
            label = book.title
            sub_label = f"Author: {book.author or 'N/A'} | ISBN: {book.isbn or 'N/A'}"
            ref_code = getattr(book, "accession_number", f"LIB-{book.id}")
            payload.update({"id": book.id, "title": book.title, "accession": ref_code})

        elif qr_type == "fee":
            receipt = None
            if ref_int is not None:
                receipt = db.get(FeeReceipt, ref_int)
            if not receipt:
                receipt = db.scalar(
                    select(FeeReceipt).where(
                        FeeReceipt.receipt_number == ref_id_str,
                        FeeReceipt.is_deleted == False
                    )
                )
            if not receipt:
                raise ValueError(f"Fee receipt '{ref_id_str}' not found")
            actual_ref_id = receipt.id
            label = f"Fee Receipt #{receipt.receipt_number}"
            sub_label = f"Student: {receipt.student_name} | Amount: ₹{receipt.total_amount}"
            ref_code = receipt.receipt_number
            payload.update({"id": receipt.id, "receipt_number": receipt.receipt_number, "amount": str(receipt.total_amount)})

        elif qr_type == "attendance":
            actual_ref_id = ref_int if ref_int is not None else 1
            label = f"Attendance Class {ref_id_str}"
            sub_label = f"Date: {date.today().isoformat()}"
            ref_code = f"ATT-{ref_id_str}-{date.today().strftime('%Y%m%d')}"
            payload.update({"id": actual_ref_id, "class": ref_id_str, "date": date.today().isoformat()})

        elif qr_type == "certificate":
            student = None
            if ref_int is not None:
                student = db.get(Student, ref_int)
            if not student:
                student = db.scalar(
                    select(Student).where(
                        (Student.gr_number == ref_id_str) | (Student.full_name.ilike(f"%{ref_id_str}%")),
                        Student.is_deleted == False
                    )
                )
            if not student:
                raise ValueError(f"Student '{ref_id_str}' not found for certificate")
            actual_ref_id = student.id
            label = f"Bonafide Cert — {student.full_name}"
            sub_label = f"GR: {student.gr_number}"
            ref_code = f"CERT-{student.gr_number}"
            payload.update({"id": student.id, "gr": student.gr_number, "cert_id": student.id})

        else:
            actual_ref_id = ref_int if ref_int is not None else 1
            label = f"QR Record #{ref_id_str}"
            ref_code = f"QR-{qr_type.upper()}-{ref_id_str}"
            payload.update({"id": actual_ref_id})

        qr_data = json.dumps(payload)
        qr_img = cls._generate_qr_svg_url(qr_data)

        # Check existing record
        rec = db.scalar(
            select(QRCodeRecord).where(
                QRCodeRecord.type == qr_type,
                QRCodeRecord.reference_id == actual_ref_id,
                QRCodeRecord.is_deleted == False,
            )
        )
        if not rec:
            rec = QRCodeRecord(
                type=qr_type,
                reference_id=actual_ref_id,
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
            rec.reference_code = ref_code
            rec.label = label
            rec.sub_label = sub_label
            rec.qr_data = qr_data
            rec.qr_image_url = qr_img
            rec.updated_by = user_id

        db.commit()
        db.refresh(rec)

        AuditService.log(
            db, action="QR_GENERATED", module="qr",
            user_id=user_id, description=f"QR code generated for {qr_type} ref '{ref_id_str}' (ID {actual_ref_id})",
        )
        return rec

    @classmethod
    def search_entities(cls, db: Session, qr_type: str, query: str = "") -> List[Dict[str, Any]]:
        """
        Helper method to search entities (students, books, receipts) for QR generation dropdown.
        """
        q = query.strip()
        if qr_type == "student":
            stmt = select(Student).where(Student.is_deleted == False)
            if q:
                stmt = stmt.where(
                    (Student.full_name.ilike(f"%{q}%")) |
                    (Student.gr_number.ilike(f"%{q}%")) |
                    (Student.standard.ilike(f"%{q}%"))
                )
            students = db.scalars(stmt.limit(15)).all()
            return [
                {
                    "id": s.id,
                    "code": s.gr_number,
                    "label": s.full_name,
                    "sub": f"Std {s.standard}-{s.division or 'A'} | Roll: {s.roll_number or 'N/A'} | GR: {s.gr_number}"
                }
                for s in students
            ]
        elif qr_type == "library":
            stmt = select(Book).where(Book.is_deleted == False)
            if q:
                stmt = stmt.where(
                    (Book.title.ilike(f"%{q}%")) |
                    (Book.author.ilike(f"%{q}%"))
                )
            books = db.scalars(stmt.limit(15)).all()
            return [
                {
                    "id": b.id,
                    "code": getattr(b, "accession_number", f"LIB-{b.id}"),
                    "label": b.title,
                    "sub": f"Author: {b.author or 'N/A'}"
                }
                for b in books
            ]
        elif qr_type == "fee":
            stmt = select(FeeReceipt).where(FeeReceipt.is_deleted == False)
            if q:
                stmt = stmt.where(
                    (FeeReceipt.receipt_number.ilike(f"%{q}%")) |
                    (FeeReceipt.student_name.ilike(f"%{q}%"))
                )
            receipts = db.scalars(stmt.limit(15)).all()
            return [
                {
                    "id": r.id,
                    "code": r.receipt_number,
                    "label": f"Receipt #{r.receipt_number}",
                    "sub": f"Student: {r.student_name} | ₹{r.total_amount}"
                }
                for r in receipts
            ]
        return []

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
            gr_no = payload.get("gr_number")

            if qr_type == "student":
                student = None
                if ref_id:
                    student = db.get(Student, ref_id)
                if not student and gr_no:
                    student = db.scalar(select(Student).where(Student.gr_number == gr_no, Student.is_deleted == False))
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
                            "division": student.division or "A",
                            "roll_number": student.roll_number,
                            "gender": student.gender,
                            "status": student.status,
                            "dob": str(student.dob) if student.dob else "N/A",
                            "blood_group": student.blood_group or "N/A",
                        },
                    }

            elif qr_type == "library":
                book = db.get(Book, ref_id) if ref_id else None
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
                receipt = db.get(FeeReceipt, ref_id) if ref_id else None
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
