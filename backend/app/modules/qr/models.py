"""
VidyaSetu ERP — QR Module Models
===================================
Models for QR code management, generation tracking, and scan logs.
"""
from datetime import datetime, timezone
import uuid
from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, ForeignKey, Enum as SQLEnum
from sqlalchemy.orm import relationship

from app.database.base import Base


class QRCodeRecord(Base):
    """
    Stores generated QR codes for students, books, attendance, fee receipts, etc.
    """
    __tablename__ = "qr_code_records"

    id = Column(Integer, primary_key=True, index=True)
    uuid = Column(String(36), default=lambda: str(uuid.uuid4()), unique=True, nullable=False, index=True)

    type = Column(String(50), nullable=False, index=True)  # student, library, attendance, fee, learning, certificate
    reference_id = Column(Integer, nullable=False, index=True)
    reference_code = Column(String(100), nullable=False, index=True)

    label = Column(String(200), nullable=False)
    sub_label = Column(String(200), nullable=True)

    qr_data = Column(Text, nullable=False)
    qr_image_url = Column(Text, nullable=True)

    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)
    created_by = Column(Integer, nullable=True)
    updated_by = Column(Integer, nullable=True)

    is_active = Column(Boolean, default=True, nullable=False)
    is_deleted = Column(Boolean, default=False, nullable=False)
    deleted_at = Column(DateTime(timezone=True), nullable=True)

    scan_logs = relationship("QRScanLog", back_populates="qr_record", cascade="all, delete-orphan")


class QRScanLog(Base):
    """
    Audit log of all QR scans across the system.
    """
    __tablename__ = "qr_scan_logs"

    id = Column(Integer, primary_key=True, index=True)
    uuid = Column(String(36), default=lambda: str(uuid.uuid4()), unique=True, nullable=False)

    qr_record_id = Column(Integer, ForeignKey("qr_code_records.id", ondelete="SET NULL"), nullable=True)
    scanned_by = Column(Integer, nullable=True)

    qr_data = Column(Text, nullable=False)
    scan_type = Column(String(50), nullable=False)
    scan_result = Column(String(50), nullable=False)  # success, invalid, expired, unauthorized
    details = Column(Text, nullable=True)

    scanned_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    qr_record = relationship("QRCodeRecord", back_populates="scan_logs")
