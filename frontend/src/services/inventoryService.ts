import api from './api';

export interface AssetCategory {
  id: number; name: string; name_marathi?: string;
  parent_id?: number; color?: string; icon?: string; is_active: boolean;
}

export interface Asset {
  id: number; asset_code: string; name: string; name_marathi?: string;
  category_id?: number; brand?: string; model_number?: string; serial_number?: string;
  purchase_date?: string; purchase_price?: number; vendor?: string; warranty_till?: string;
  location?: string; assigned_to_teacher_id?: number; status: string; condition: string;
  description?: string; is_active: boolean;
}

export interface MaintenanceRecord {
  id: number; asset_id: number; maintenance_date: string; maintenance_type: string;
  description: string; cost?: number; vendor?: string; next_service_date?: string;
  status_after: string; is_active: boolean;
}

export interface StockItem {
  id: number; item_code: string; name: string; name_marathi?: string;
  category: string; unit: string; current_stock: number; minimum_stock: number;
  unit_cost?: number; location?: string; description?: string;
  is_active: boolean; is_low_stock: boolean;
}

export interface StockTransaction {
  id: number; stock_item_id: number; transaction_type: string; quantity: number;
  unit_cost?: number; total_cost?: number; stock_before: number; stock_after: number;
  reference?: string; issued_to?: string; purpose?: string;
  transaction_date: string; is_active: boolean;
}

export interface InventoryStats {
  total_assets: number; active_assets: number; in_repair: number; disposed: number;
  total_asset_value: number; warranties_expiring_soon: number;
  total_stock_items: number; low_stock_items: number; total_stock_value: number;
}

const inventoryService = {
  async getStats(): Promise<InventoryStats> { return (await api.get('/inventory/stats')).data.data; },

  // Categories
  async getCategories(): Promise<AssetCategory[]> { return (await api.get('/inventory/categories')).data.data; },
  async createCategory(d: Partial<AssetCategory>): Promise<AssetCategory> { return (await api.post('/inventory/categories', d)).data.data; },

  // Assets
  async getAssets(p?: { status?: string; category_id?: number; search?: string }): Promise<Asset[]> { return (await api.get('/inventory/assets', { params: p })).data.data; },
  async getAsset(id: number): Promise<Asset> { return (await api.get(`/inventory/assets/${id}`)).data.data; },
  async createAsset(d: Partial<Asset>): Promise<Asset> { return (await api.post('/inventory/assets', d)).data.data; },
  async updateAsset(id: number, d: Partial<Asset>): Promise<Asset> { return (await api.put(`/inventory/assets/${id}`, d)).data.data; },
  async deleteAsset(id: number): Promise<void> { await api.delete(`/inventory/assets/${id}`); },
  async getMaintenance(assetId: number): Promise<MaintenanceRecord[]> { return (await api.get(`/inventory/assets/${assetId}/maintenance`)).data.data; },
  async addMaintenance(d: Partial<MaintenanceRecord>): Promise<MaintenanceRecord> { return (await api.post('/inventory/maintenance', d)).data.data; },

  // Stock
  async getStock(p?: { category?: string; low_stock_only?: boolean; search?: string }): Promise<StockItem[]> { return (await api.get('/inventory/stock', { params: p })).data.data; },
  async getStockItem(id: number): Promise<StockItem> { return (await api.get(`/inventory/stock/${id}`)).data.data; },
  async createStockItem(d: Partial<StockItem>): Promise<StockItem> { return (await api.post('/inventory/stock', d)).data.data; },
  async transact(d: { stock_item_id: number; transaction_type: string; quantity: number; unit_cost?: number; reference?: string; issued_to?: string; purpose?: string; transaction_date: string }): Promise<StockTransaction> { return (await api.post('/inventory/stock/transactions', d)).data.data; },
  async getTransactions(itemId: number): Promise<StockTransaction[]> { return (await api.get(`/inventory/stock/${itemId}/transactions`)).data.data; },
};
export default inventoryService;
