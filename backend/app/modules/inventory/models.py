"""
VidyaSetu ERP — Inventory & Assets Module Models
==================================================
Complete asset & inventory management:
- Asset categories
- Asset register (individual items with serial numbers)
- Asset assignments (to rooms / teachers / departments)
- Maintenance / repair log
- Consumable stock (stationery, lab chemicals, etc.)
- Stock transactions (in / out / adjustment)
- Low-stock alerts
"""
from datetime import date
from decimal import Decimal
from sqlalchemy import (
    BigInteger, Boolean, Date, ForeignKey,
    Integer, Numeric, String, Text, UniqueConstraint
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import BaseModel


class AssetCategory(BaseModel):
    """Hierarchical asset categories."""
    __tablename__ = "asset_categories"

    name: Mapped[str] = mapped_column(String(200), nullable=False, index=True)
    name_marathi: Mapped[str | None] = mapped_column(String(200), nullable=True)
    parent_id: Mapped[int | None] = mapped_column(
        BigInteger, ForeignKey("asset_categories.id"), nullable=True
    )
    color: Mapped[str | None] = mapped_column(String(10), nullable=True)
    icon: Mapped[str | None] = mapped_column(String(50), nullable=True)
    # lucide icon name


class Asset(BaseModel):
    """
    Individual asset record — each physical item tracked separately.
    """
    __tablename__ = "assets"

    asset_code: Mapped[str] = mapped_column(String(50), nullable=False, unique=True, index=True)
    name: Mapped[str] = mapped_column(String(300), nullable=False, index=True)
    name_marathi: Mapped[str | None] = mapped_column(String(300), nullable=True)
    category_id: Mapped[int | None] = mapped_column(
        BigInteger, ForeignKey("asset_categories.id"), nullable=True
    )
    brand: Mapped[str | None] = mapped_column(String(100), nullable=True)
    model_number: Mapped[str | None] = mapped_column(String(100), nullable=True)
    serial_number: Mapped[str | None] = mapped_column(String(100), nullable=True)
    purchase_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    purchase_price: Mapped[Decimal | None] = mapped_column(Numeric(12, 2), nullable=True)
    vendor: Mapped[str | None] = mapped_column(String(200), nullable=True)
    warranty_till: Mapped[date | None] = mapped_column(Date, nullable=True)
    location: Mapped[str | None] = mapped_column(String(200), nullable=True)
    # e.g. "Room 12", "Computer Lab", "Principal Office"
    assigned_to_teacher_id: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    status: Mapped[str] = mapped_column(String(30), nullable=False, default="active")
    # active / in_repair / disposed / lost / donated
    condition: Mapped[str] = mapped_column(String(20), nullable=False, default="good")
    # excellent / good / fair / poor
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    academic_year_id: Mapped[int | None] = mapped_column(BigInteger, nullable=True)

    category: Mapped["AssetCategory | None"] = relationship("AssetCategory")


class MaintenanceRecord(BaseModel):
    """Repair / maintenance history for each asset."""
    __tablename__ = "maintenance_records"

    asset_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("assets.id"), nullable=False, index=True
    )
    maintenance_date: Mapped[date] = mapped_column(Date, nullable=False)
    maintenance_type: Mapped[str] = mapped_column(String(30), nullable=False, default="repair")
    # repair / servicing / inspection / replacement
    description: Mapped[str] = mapped_column(Text, nullable=False)
    cost: Mapped[Decimal | None] = mapped_column(Numeric(10, 2), nullable=True)
    vendor: Mapped[str | None] = mapped_column(String(200), nullable=True)
    next_service_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    performed_by: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    status_after: Mapped[str] = mapped_column(String(20), nullable=False, default="active")

    asset: Mapped["Asset"] = relationship("Asset")


class StockItem(BaseModel):
    """
    Consumable stock item — stationery, lab supplies, sports equipment.
    Quantity tracked in bulk.
    """
    __tablename__ = "stock_items"
    __table_args__ = (
        UniqueConstraint("item_code", name="uq_stock_item_code"),
    )

    item_code: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(300), nullable=False, index=True)
    name_marathi: Mapped[str | None] = mapped_column(String(300), nullable=True)
    category: Mapped[str] = mapped_column(String(100), nullable=False, default="stationery")
    # stationery / lab / sports / cleaning / admin / medical / library
    unit: Mapped[str] = mapped_column(String(30), nullable=False, default="nos")
    # nos / kg / ltr / pkt / box / ream
    current_stock: Mapped[Decimal] = mapped_column(Numeric(12, 3), nullable=False, default=0)
    minimum_stock: Mapped[Decimal] = mapped_column(Numeric(12, 3), nullable=False, default=10)
    # Alert threshold
    unit_cost: Mapped[Decimal | None] = mapped_column(Numeric(10, 2), nullable=True)
    location: Mapped[str | None] = mapped_column(String(100), nullable=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)


class StockTransaction(BaseModel):
    """
    Stock movement — purchase receipt, issue, adjustment.
    """
    __tablename__ = "stock_transactions"

    stock_item_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("stock_items.id"), nullable=False, index=True
    )
    transaction_type: Mapped[str] = mapped_column(String(20), nullable=False)
    # receipt / issue / return / adjustment / opening
    quantity: Mapped[Decimal] = mapped_column(Numeric(12, 3), nullable=False)
    unit_cost: Mapped[Decimal | None] = mapped_column(Numeric(10, 2), nullable=True)
    total_cost: Mapped[Decimal | None] = mapped_column(Numeric(12, 2), nullable=True)
    stock_before: Mapped[Decimal] = mapped_column(Numeric(12, 3), nullable=False, default=0)
    stock_after: Mapped[Decimal] = mapped_column(Numeric(12, 3), nullable=False, default=0)
    reference: Mapped[str | None] = mapped_column(String(100), nullable=True)
    # PO number, voucher, etc.
    issued_to: Mapped[str | None] = mapped_column(String(200), nullable=True)
    purpose: Mapped[str | None] = mapped_column(String(300), nullable=True)
    transaction_date: Mapped[date] = mapped_column(Date, nullable=False)
    performed_by: Mapped[int | None] = mapped_column(BigInteger, nullable=True)

    stock_item: Mapped["StockItem"] = relationship("StockItem")
