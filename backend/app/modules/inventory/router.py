"""
VidyaSetu ERP — Inventory Router
"""
from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.dependencies import AuthUser, DBSession, require_permission
from app.modules.inventory.service import (
    CategoryRequest, CategoryResponse,
    AssetRequest, AssetResponse,
    MaintenanceRequest, MaintenanceResponse,
    StockItemRequest, StockItemResponse,
    StockTransactionRequest, StockTransactionResponse,
    AssetCategoryService, AssetService, StockService, InventoryStatsService,
)
from app.shared.responses import APIResponse

router = APIRouter(prefix="/inventory", tags=["Inventory"])


# ── Stats ─────────────────────────────────────────────────────
@router.get("/stats", response_model=APIResponse,
            dependencies=[Depends(require_permission("inventory.read"))])
async def inventory_stats(current_user: AuthUser, db: DBSession):
    return APIResponse.ok(data=InventoryStatsService.get(db).model_dump())


# ── Categories ─────────────────────────────────────────────────
@router.post("/categories", response_model=APIResponse, status_code=201,
             dependencies=[Depends(require_permission("inventory.manage"))])
async def create_category(body: CategoryRequest, current_user: AuthUser, db: DBSession):
    c = AssetCategoryService.create(db, body, current_user.user_id)
    return APIResponse.created(data=CategoryResponse.model_validate(c).model_dump())

@router.get("/categories", response_model=APIResponse,
            dependencies=[Depends(require_permission("inventory.read"))])
async def list_categories(current_user: AuthUser, db: DBSession):
    cats = AssetCategoryService.get_all(db)
    return APIResponse.ok(data=[CategoryResponse.model_validate(c).model_dump() for c in cats])


# ── Assets ────────────────────────────────────────────────────
@router.post("/assets", response_model=APIResponse, status_code=201,
             dependencies=[Depends(require_permission("inventory.manage"))])
async def create_asset(body: AssetRequest, current_user: AuthUser, db: DBSession):
    a = AssetService.create(db, body, current_user.user_id)
    return APIResponse.created(data=AssetResponse.model_validate(a).model_dump())

@router.get("/assets", response_model=APIResponse,
            dependencies=[Depends(require_permission("inventory.read"))])
async def list_assets(current_user: AuthUser, db: DBSession,
                      status: Optional[str] = None,
                      category_id: Optional[int] = None,
                      search: Optional[str] = None,
                      limit: int = Query(100, le=500), offset: int = 0):
    assets = AssetService.get_all(db, status, category_id, search, limit, offset)
    return APIResponse.ok(data=[AssetResponse.model_validate(a).model_dump() for a in assets])

@router.get("/assets/{asset_id}", response_model=APIResponse,
            dependencies=[Depends(require_permission("inventory.read"))])
async def get_asset(asset_id: int, current_user: AuthUser, db: DBSession):
    a = AssetService.get_by_id(db, asset_id)
    return APIResponse.ok(data=AssetResponse.model_validate(a).model_dump())

@router.put("/assets/{asset_id}", response_model=APIResponse,
            dependencies=[Depends(require_permission("inventory.manage"))])
async def update_asset(asset_id: int, body: AssetRequest, current_user: AuthUser, db: DBSession):
    a = AssetService.update(db, asset_id, body, current_user.user_id)
    return APIResponse.ok(data=AssetResponse.model_validate(a).model_dump())

@router.delete("/assets/{asset_id}", response_model=APIResponse,
               dependencies=[Depends(require_permission("inventory.manage"))])
async def delete_asset(asset_id: int, current_user: AuthUser, db: DBSession):
    AssetService.delete(db, asset_id, current_user.user_id)
    return APIResponse.ok(message="Asset deleted.")


# ── Maintenance ───────────────────────────────────────────────
@router.post("/maintenance", response_model=APIResponse, status_code=201,
             dependencies=[Depends(require_permission("inventory.manage"))])
async def add_maintenance(body: MaintenanceRequest, current_user: AuthUser, db: DBSession):
    m = AssetService.add_maintenance(db, body, current_user.user_id)
    return APIResponse.created(data=MaintenanceResponse.model_validate(m).model_dump())

@router.get("/assets/{asset_id}/maintenance", response_model=APIResponse,
            dependencies=[Depends(require_permission("inventory.read"))])
async def get_asset_maintenance(asset_id: int, current_user: AuthUser, db: DBSession):
    records = AssetService.get_maintenance(db, asset_id)
    return APIResponse.ok(data=[MaintenanceResponse.model_validate(r).model_dump() for r in records])


# ── Stock Items ───────────────────────────────────────────────
@router.post("/stock", response_model=APIResponse, status_code=201,
             dependencies=[Depends(require_permission("inventory.manage"))])
async def create_stock_item(body: StockItemRequest, current_user: AuthUser, db: DBSession):
    s = StockService.create_item(db, body, current_user.user_id)
    return APIResponse.created(data=StockItemResponse.from_item(s).model_dump())

@router.get("/stock", response_model=APIResponse,
            dependencies=[Depends(require_permission("inventory.read"))])
async def list_stock(current_user: AuthUser, db: DBSession,
                     category: Optional[str] = None,
                     low_stock_only: bool = False,
                     search: Optional[str] = None):
    items = StockService.get_all(db, category, low_stock_only, search)
    return APIResponse.ok(data=[StockItemResponse.from_item(i).model_dump() for i in items])

@router.get("/stock/{item_id}", response_model=APIResponse,
            dependencies=[Depends(require_permission("inventory.read"))])
async def get_stock_item(item_id: int, current_user: AuthUser, db: DBSession):
    item = StockService.get_by_id(db, item_id)
    return APIResponse.ok(data=StockItemResponse.from_item(item).model_dump())


# ── Stock Transactions ────────────────────────────────────────
@router.post("/stock/transactions", response_model=APIResponse, status_code=201,
             dependencies=[Depends(require_permission("inventory.manage"))])
async def stock_transaction(body: StockTransactionRequest, current_user: AuthUser, db: DBSession):
    txn = StockService.transact(db, body, current_user.user_id)
    return APIResponse.created(data=StockTransactionResponse.model_validate(txn).model_dump(),
                               message=f"Stock {body.transaction_type} recorded.")

@router.get("/stock/{item_id}/transactions", response_model=APIResponse,
            dependencies=[Depends(require_permission("inventory.read"))])
async def get_stock_transactions(item_id: int, current_user: AuthUser, db: DBSession,
                                  limit: int = Query(50, le=200)):
    txns = StockService.get_transactions(db, item_id, limit)
    return APIResponse.ok(data=[StockTransactionResponse.model_validate(t).model_dump() for t in txns])
