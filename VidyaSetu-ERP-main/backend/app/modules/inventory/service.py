"""
VidyaSetu ERP — Inventory Service & Schemas
"""
from datetime import date
from decimal import Decimal
from typing import Optional
from pydantic import BaseModel as PydanticBase
from fastapi import HTTPException
from sqlalchemy import select, func
from sqlalchemy.orm import Session, joinedload

from app.modules.inventory.models import (
    AssetCategory, Asset, MaintenanceRecord, StockItem, StockTransaction
)


# ═══════════════════════════════════════════════════
# SCHEMAS
# ═══════════════════════════════════════════════════

class CategoryRequest(PydanticBase):
    name: str
    name_marathi: Optional[str] = None
    parent_id: Optional[int] = None
    color: Optional[str] = None
    icon: Optional[str] = None

class CategoryResponse(PydanticBase):
    model_config = {"from_attributes": True}
    id: int; name: str; name_marathi: Optional[str] = None
    parent_id: Optional[int] = None; color: Optional[str] = None; icon: Optional[str] = None; is_active: bool


class AssetRequest(PydanticBase):
    asset_code: str
    name: str
    name_marathi: Optional[str] = None
    category_id: Optional[int] = None
    brand: Optional[str] = None
    model_number: Optional[str] = None
    serial_number: Optional[str] = None
    purchase_date: Optional[date] = None
    purchase_price: Optional[Decimal] = None
    vendor: Optional[str] = None
    warranty_till: Optional[date] = None
    location: Optional[str] = None
    assigned_to_teacher_id: Optional[int] = None
    status: str = "active"
    condition: str = "good"
    description: Optional[str] = None
    academic_year_id: Optional[int] = None

class AssetResponse(PydanticBase):
    model_config = {"from_attributes": True}
    id: int; asset_code: str; name: str; name_marathi: Optional[str] = None
    category_id: Optional[int] = None; brand: Optional[str] = None
    model_number: Optional[str] = None; serial_number: Optional[str] = None
    purchase_date: Optional[date] = None; purchase_price: Optional[Decimal] = None
    vendor: Optional[str] = None; warranty_till: Optional[date] = None
    location: Optional[str] = None; assigned_to_teacher_id: Optional[int] = None
    status: str; condition: str; description: Optional[str] = None; is_active: bool


class MaintenanceRequest(PydanticBase):
    asset_id: int
    maintenance_date: date
    maintenance_type: str = "repair"
    description: str
    cost: Optional[Decimal] = None
    vendor: Optional[str] = None
    next_service_date: Optional[date] = None
    status_after: str = "active"

class MaintenanceResponse(PydanticBase):
    model_config = {"from_attributes": True}
    id: int; asset_id: int; maintenance_date: date; maintenance_type: str
    description: str; cost: Optional[Decimal] = None; vendor: Optional[str] = None
    next_service_date: Optional[date] = None; status_after: str; is_active: bool


class StockItemRequest(PydanticBase):
    item_code: str
    name: str
    name_marathi: Optional[str] = None
    category: str = "stationery"
    unit: str = "nos"
    current_stock: Decimal = Decimal("0")
    minimum_stock: Decimal = Decimal("10")
    unit_cost: Optional[Decimal] = None
    location: Optional[str] = None
    description: Optional[str] = None

class StockItemResponse(PydanticBase):
    model_config = {"from_attributes": True}
    id: int; item_code: str; name: str; name_marathi: Optional[str] = None
    category: str; unit: str; current_stock: Decimal; minimum_stock: Decimal
    unit_cost: Optional[Decimal] = None; location: Optional[str] = None
    description: Optional[str] = None; is_active: bool
    is_low_stock: bool = False

    @classmethod
    def from_item(cls, item: StockItem) -> "StockItemResponse":
        d = {c.name: getattr(item, c.name) for c in item.__table__.columns}
        d["is_low_stock"] = item.current_stock <= item.minimum_stock
        return cls(**d)


class StockTransactionRequest(PydanticBase):
    stock_item_id: int
    transaction_type: str   # receipt / issue / return / adjustment
    quantity: Decimal
    unit_cost: Optional[Decimal] = None
    reference: Optional[str] = None
    issued_to: Optional[str] = None
    purpose: Optional[str] = None
    transaction_date: date

class StockTransactionResponse(PydanticBase):
    model_config = {"from_attributes": True}
    id: int; stock_item_id: int; transaction_type: str; quantity: Decimal
    unit_cost: Optional[Decimal] = None; total_cost: Optional[Decimal] = None
    stock_before: Decimal; stock_after: Decimal; reference: Optional[str] = None
    issued_to: Optional[str] = None; purpose: Optional[str] = None
    transaction_date: date; is_active: bool


class InventoryStatsResponse(PydanticBase):
    total_assets: int
    active_assets: int
    in_repair: int
    disposed: int
    total_asset_value: Decimal
    warranties_expiring_soon: int    # within 30 days
    total_stock_items: int
    low_stock_items: int
    total_stock_value: Decimal


class RegisterEntryResponse(PydanticBase):
    id: str
    entry_date: date
    entry_type: str
    code: str
    particulars: str
    particulars_marathi: Optional[str] = None
    category: str
    reference: Optional[str] = None
    dr_qty: Optional[Decimal] = Decimal("0")
    dr_amount: Decimal = Decimal("0")
    cr_qty: Optional[Decimal] = Decimal("0")
    cr_amount: Decimal = Decimal("0")
    party_location: Optional[str] = None
    remarks: Optional[str] = None


# ═══════════════════════════════════════════════════
# SERVICES
# ═══════════════════════════════════════════════════

class AssetCategoryService:
    @staticmethod
    def create(db: Session, data: CategoryRequest, created_by: int) -> AssetCategory:
        c = AssetCategory(**data.model_dump(), created_by=created_by)
        db.add(c); db.commit(); db.refresh(c); return c

    @staticmethod
    def get_all(db: Session) -> list[AssetCategory]:
        return list(db.scalars(
            select(AssetCategory).where(AssetCategory.is_deleted == False).order_by(AssetCategory.name)
        ).all())


class AssetService:
    @staticmethod
    def create(db: Session, data: AssetRequest, created_by: int) -> Asset:
        # Check unique code
        existing = db.scalar(select(Asset).where(Asset.asset_code == data.asset_code))
        if existing: raise HTTPException(409, f"Asset code {data.asset_code} already exists.")
        a = Asset(**data.model_dump(), created_by=created_by)
        db.add(a); db.commit(); db.refresh(a); return a

    @staticmethod
    def get_all(db: Session, status: Optional[str] = None, category_id: Optional[int] = None,
                search: Optional[str] = None, limit: int = 100, offset: int = 0) -> list[Asset]:
        q = select(Asset).where(Asset.is_deleted == False)
        if status: q = q.where(Asset.status == status)
        if category_id: q = q.where(Asset.category_id == category_id)
        if search: q = q.where(
            Asset.name.ilike(f"%{search}%") |
            Asset.asset_code.ilike(f"%{search}%") |
            Asset.serial_number.ilike(f"%{search}%")
        )
        return list(db.scalars(q.order_by(Asset.name).limit(limit).offset(offset)).all())

    @staticmethod
    def get_by_id(db: Session, asset_id: int) -> Asset:
        a = db.scalar(select(Asset).where(Asset.id == asset_id, Asset.is_deleted == False))
        if not a: raise HTTPException(404, "Asset not found.")
        return a

    @staticmethod
    def update(db: Session, asset_id: int, data: AssetRequest, updated_by: int) -> Asset:
        a = AssetService.get_by_id(db, asset_id)
        for k, v in data.model_dump().items(): setattr(a, k, v)
        a.updated_by = updated_by; db.commit(); db.refresh(a); return a

    @staticmethod
    def delete(db: Session, asset_id: int, deleted_by: int) -> None:
        a = AssetService.get_by_id(db, asset_id)
        a.soft_delete(deleted_by=deleted_by); db.commit()

    @staticmethod
    def get_maintenance(db: Session, asset_id: int) -> list[MaintenanceRecord]:
        return list(db.scalars(
            select(MaintenanceRecord)
            .where(MaintenanceRecord.asset_id == asset_id, MaintenanceRecord.is_deleted == False)
            .order_by(MaintenanceRecord.maintenance_date.desc())
        ).all())

    @staticmethod
    def add_maintenance(db: Session, data: MaintenanceRequest, created_by: int) -> MaintenanceRecord:
        a = AssetService.get_by_id(db, data.asset_id)
        m = MaintenanceRecord(**data.model_dump(), performed_by=created_by, created_by=created_by)
        db.add(m)
        a.status = data.status_after   # update asset status
        a.updated_by = created_by
        db.commit(); db.refresh(m); return m


class StockService:
    @staticmethod
    def create_item(db: Session, data: StockItemRequest, created_by: int) -> StockItem:
        existing = db.scalar(select(StockItem).where(StockItem.item_code == data.item_code))
        if existing: raise HTTPException(409, f"Item code {data.item_code} exists.")
        s = StockItem(**data.model_dump(), created_by=created_by)
        db.add(s); db.commit(); db.refresh(s); return s

    @staticmethod
    def get_all(db: Session, category: Optional[str] = None,
                low_stock_only: bool = False, search: Optional[str] = None) -> list[StockItem]:
        q = select(StockItem).where(StockItem.is_deleted == False, StockItem.is_active == True)
        if category: q = q.where(StockItem.category == category)
        if low_stock_only: q = q.where(StockItem.current_stock <= StockItem.minimum_stock)
        if search: q = q.where(
            StockItem.name.ilike(f"%{search}%") | StockItem.item_code.ilike(f"%{search}%")
        )
        return list(db.scalars(q.order_by(StockItem.name)).all())

    @staticmethod
    def get_by_id(db: Session, sid: int) -> StockItem:
        s = db.scalar(select(StockItem).where(StockItem.id == sid, StockItem.is_deleted == False))
        if not s: raise HTTPException(404, "Stock item not found.")
        return s

    @staticmethod
    def transact(db: Session, data: StockTransactionRequest, created_by: int) -> StockTransaction:
        item = StockService.get_by_id(db, data.stock_item_id)
        stock_before = item.current_stock

        if data.transaction_type in ("receipt", "return", "opening"):
            stock_after = stock_before + data.quantity
        elif data.transaction_type == "issue":
            if data.quantity > stock_before:
                raise HTTPException(400, f"Insufficient stock. Available: {stock_before} {item.unit}")
            stock_after = stock_before - data.quantity
        elif data.transaction_type == "adjustment":
            stock_after = data.quantity   # set absolute quantity
        else:
            raise HTTPException(400, f"Unknown transaction type: {data.transaction_type}")

        total_cost = (data.unit_cost * data.quantity) if data.unit_cost else None

        txn = StockTransaction(
            stock_item_id=data.stock_item_id,
            transaction_type=data.transaction_type,
            quantity=data.quantity,
            unit_cost=data.unit_cost,
            total_cost=total_cost,
            stock_before=stock_before,
            stock_after=stock_after,
            reference=data.reference,
            issued_to=data.issued_to,
            purpose=data.purpose,
            transaction_date=data.transaction_date,
            performed_by=created_by,
            created_by=created_by,
        )
        db.add(txn)
        item.current_stock = stock_after
        if data.unit_cost: item.unit_cost = data.unit_cost
        db.commit(); db.refresh(txn); return txn

    @staticmethod
    def get_transactions(db: Session, stock_item_id: int, limit: int = 50) -> list[StockTransaction]:
        return list(db.scalars(
            select(StockTransaction)
            .where(StockTransaction.stock_item_id == stock_item_id, StockTransaction.is_deleted == False)
            .order_by(StockTransaction.transaction_date.desc()).limit(limit)
        ).all())


class InventoryStatsService:
    @staticmethod
    def get(db: Session) -> InventoryStatsResponse:
        today = date.today()
        from datetime import timedelta
        in_30 = today + timedelta(days=30)

        total_assets = db.scalar(select(func.count()).where(Asset.is_deleted == False)) or 0
        active = db.scalar(select(func.count()).where(Asset.is_deleted == False, Asset.status == "active")) or 0
        in_repair = db.scalar(select(func.count()).where(Asset.is_deleted == False, Asset.status == "in_repair")) or 0
        disposed = db.scalar(select(func.count()).where(Asset.is_deleted == False, Asset.status == "disposed")) or 0
        asset_val = db.scalar(select(func.sum(Asset.purchase_price)).where(Asset.is_deleted == False)) or Decimal("0")
        warranties = db.scalar(select(func.count()).where(
            Asset.is_deleted == False,
            Asset.warranty_till != None,
            Asset.warranty_till >= today,
            Asset.warranty_till <= in_30,
        )) or 0

        total_stock = db.scalar(select(func.count()).where(StockItem.is_deleted == False)) or 0
        low_stock = db.scalar(select(func.count()).where(
            StockItem.is_deleted == False,
            StockItem.current_stock <= StockItem.minimum_stock,
        )) or 0
        stock_items_all = db.scalars(select(StockItem).where(StockItem.is_deleted == False)).all()
        stock_val = sum(
            float(s.current_stock) * float(s.unit_cost)
            for s in stock_items_all if s.unit_cost
        )

        return InventoryStatsResponse(
            total_assets=total_assets, active_assets=active,
            in_repair=in_repair, disposed=disposed,
            total_asset_value=asset_val,
            warranties_expiring_soon=warranties,
            total_stock_items=total_stock, low_stock_items=low_stock,
            total_stock_value=Decimal(str(round(stock_val, 2))),
        )


class RegisterService:
    @staticmethod
    def get_register(db: Session, from_date: Optional[date] = None, to_date: Optional[date] = None,
                     register_type: Optional[str] = None, search: Optional[str] = None) -> list[RegisterEntryResponse]:
        entries: list[RegisterEntryResponse] = []
        cats = {c.id: c.name for c in db.scalars(select(AssetCategory)).all()}

        # 1. Assets
        if not register_type or register_type in ("all", "asset"):
            q_asset = select(Asset).where(Asset.is_deleted == False)
            if from_date: q_asset = q_asset.where(Asset.purchase_date >= from_date)
            if to_date: q_asset = q_asset.where(Asset.purchase_date <= to_date)
            assets = db.scalars(q_asset).all()
            for a in assets:
                cat_name = cats.get(a.category_id, "Asset") if a.category_id else "Asset"
                if search:
                    st = search.lower()
                    if st not in a.name.lower() and st not in a.asset_code.lower() and (not a.vendor or st not in a.vendor.lower()):
                        continue
                entries.append(RegisterEntryResponse(
                    id=f"ast_{a.id}",
                    entry_date=a.purchase_date or date.today(),
                    entry_type="asset_addition",
                    code=a.asset_code,
                    particulars=a.name,
                    particulars_marathi=a.name_marathi,
                    category=cat_name,
                    reference=a.serial_number or a.brand,
                    dr_qty=Decimal("1"),
                    dr_amount=a.purchase_price or Decimal("0"),
                    cr_qty=Decimal("0"),
                    cr_amount=Decimal("0"),
                    party_location=a.vendor or a.location,
                    remarks=f"Condition: {a.condition}, Status: {a.status}",
                ))

        # 2. Stock Transactions
        if not register_type or register_type in ("all", "stock"):
            q_txn = select(StockTransaction).where(StockTransaction.is_deleted == False)
            if from_date: q_txn = q_txn.where(StockTransaction.transaction_date >= from_date)
            if to_date: q_txn = q_txn.where(StockTransaction.transaction_date <= to_date)
            txns = db.scalars(q_txn).all()
            
            stock_ids = {t.stock_item_id for t in txns}
            stock_items = {s.id: s for s in db.scalars(select(StockItem).where(StockItem.id.in_(stock_ids))).all()} if stock_ids else {}

            for t in txns:
                item = stock_items.get(t.stock_item_id)
                item_name = item.name if item else "Stock Item"
                item_code = item.item_code if item else f"STK-{t.stock_item_id}"
                item_cat = item.category if item else "Stock"
                item_mr = item.name_marathi if item else None

                if search:
                    st = search.lower()
                    if st not in item_name.lower() and st not in item_code.lower() and (not t.reference or st not in t.reference.lower()):
                        continue

                is_inward = t.transaction_type in ("receipt", "return", "opening")
                cost = t.total_cost or ((t.unit_cost or Decimal("0")) * t.quantity)

                entries.append(RegisterEntryResponse(
                    id=f"stk_{t.id}",
                    entry_date=t.transaction_date,
                    entry_type=f"stock_{t.transaction_type}",
                    code=item_code,
                    particulars=item_name,
                    particulars_marathi=item_mr,
                    category=item_cat,
                    reference=t.reference,
                    dr_qty=t.quantity if is_inward else Decimal("0"),
                    dr_amount=cost if is_inward else Decimal("0"),
                    cr_qty=t.quantity if not is_inward else Decimal("0"),
                    cr_amount=cost if not is_inward else Decimal("0"),
                    party_location=t.issued_to or t.purpose,
                    remarks=t.purpose,
                ))

        # 3. Maintenance Records
        if not register_type or register_type in ("all", "asset"):
            q_maint = select(MaintenanceRecord).where(MaintenanceRecord.is_deleted == False)
            if from_date: q_maint = q_maint.where(MaintenanceRecord.maintenance_date >= from_date)
            if to_date: q_maint = q_maint.where(MaintenanceRecord.maintenance_date <= to_date)
            maints = db.scalars(q_maint).all()

            asset_ids = {m.asset_id for m in maints}
            maint_assets = {a.id: a for a in db.scalars(select(Asset).where(Asset.id.in_(asset_ids))).all()} if asset_ids else {}

            for m in maints:
                ast = maint_assets.get(m.asset_id)
                ast_name = ast.name if ast else "Asset"
                ast_code = ast.asset_code if ast else f"AST-{m.asset_id}"
                if search:
                    st = search.lower()
                    if st not in ast_name.lower() and st not in ast_code.lower() and (not m.vendor or st not in m.vendor.lower()):
                        continue

                entries.append(RegisterEntryResponse(
                    id=f"mnt_{m.id}",
                    entry_date=m.maintenance_date,
                    entry_type="maintenance",
                    code=ast_code,
                    particulars=f"{ast_name} ({m.maintenance_type})",
                    category="Maintenance",
                    reference=m.vendor,
                    dr_qty=Decimal("0"),
                    dr_amount=Decimal("0"),
                    cr_qty=Decimal("1"),
                    cr_amount=m.cost or Decimal("0"),
                    party_location=m.vendor,
                    remarks=m.description,
                ))

        entries.sort(key=lambda x: x.entry_date, reverse=True)
        return entries
