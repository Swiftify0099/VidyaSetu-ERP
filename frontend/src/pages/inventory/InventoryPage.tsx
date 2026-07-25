import { useState, useEffect, useCallback } from 'react';
import {
  Package, Plus, RefreshCw, Check, X, AlertTriangle,
  Wrench, ArrowDownToLine, ArrowUpFromLine, BarChart3,
  Pencil, Trash2, ArrowRight, ShieldCheck, History,
} from 'lucide-react';
import toast from 'react-hot-toast';
import inventoryService, {
  Asset, AssetCategory, StockItem, StockTransaction, InventoryStats,
} from '../../services/inventoryService';
import PermissionGate from '../../components/ui/PermissionGate';
import styles from './InventoryPage.module.css';

type Section = 'dashboard' | 'assets' | 'stock' | 'maintenance';

const TODAY = new Date().toISOString().split('T')[0];
const ASSET_STATUSES = ['active','in_repair','disposed','lost','donated'];
const ASSET_CONDITIONS = ['excellent','good','fair','poor'];
const STOCK_CATS = ['stationery','lab','sports','cleaning','admin','medical','library'];
const STOCK_UNITS = ['nos','kg','ltr','pkt','box','ream'];
const TXN_TYPES = ['receipt','issue','return','adjustment'];
const MAINT_TYPES = ['repair','servicing','inspection','replacement'];

const STATUS_COLOR: Record<string, string> = {
  active: 'var(--color-success)', in_repair: 'var(--color-warning)',
  disposed: 'var(--color-danger)', lost: 'var(--color-danger)', donated: 'var(--color-info)',
};
const COND_COLOR: Record<string, string> = {
  excellent: 'var(--color-success)', good: 'var(--color-info)',
  fair: 'var(--color-warning)', poor: 'var(--color-danger)',
};
const TXN_COLOR: Record<string, string> = {
  receipt: 'var(--color-success)', issue: 'var(--color-danger)',
  return: 'var(--color-info)', adjustment: 'var(--color-warning)',
};

export default function InventoryPage() {
  const [section, setSection] = useState<Section>('dashboard');
  const [stats, setStats] = useState<InventoryStats | null>(null);

  // Assets
  const [assets, setAssets] = useState<Asset[]>([]);
  const [categories, setCategories] = useState<AssetCategory[]>([]);
  const [assetFilter, setAssetFilter] = useState('');
  const [assetSearch, setAssetSearch] = useState('');
  const [loadingAssets, setLoadingAssets] = useState(false);
  const [showAssetModal, setShowAssetModal] = useState(false);
  const [editAsset, setEditAsset] = useState<Asset | null>(null);
  const [assetForm, setAssetForm] = useState({ asset_code:'', name:'', name_marathi:'', category_id:'', brand:'', model_number:'', serial_number:'', purchase_date:'', purchase_price:'', vendor:'', warranty_till:'', location:'', status:'active', condition:'good', description:'' });
  const [savingAsset, setSavingAsset] = useState(false);
  const [assetDetail, setAssetDetail] = useState<Asset | null>(null);
  const [maintenance, setMaintenance] = useState<any[]>([]);
  const [showMaintModal, setShowMaintModal] = useState(false);
  const [maintForm, setMaintForm] = useState({ asset_id:0, maintenance_date:TODAY, maintenance_type:'repair', description:'', cost:'', vendor:'', next_service_date:'', status_after:'active' });
  const [savingMaint, setSavingMaint] = useState(false);

  // Stock
  const [stock, setStock] = useState<StockItem[]>([]);
  const [stockCat, setStockCat] = useState('');
  const [lowOnly, setLowOnly] = useState(false);
  const [stockSearch, setStockSearch] = useState('');
  const [loadingStock, setLoadingStock] = useState(false);
  const [showStockModal, setShowStockModal] = useState(false);
  const [stockForm, setStockForm] = useState({ item_code:'', name:'', name_marathi:'', category:'stationery', unit:'nos', current_stock:'0', minimum_stock:'10', unit_cost:'', location:'', description:'' });
  const [savingStock, setSavingStock] = useState(false);
  const [txnItem, setTxnItem] = useState<StockItem | null>(null);
  const [transactions, setTransactions] = useState<StockTransaction[]>([]);
  const [showTxnModal, setShowTxnModal] = useState(false);
  const [txnForm, setTxnForm] = useState({ transaction_type:'receipt', quantity:'', unit_cost:'', reference:'', issued_to:'', purpose:'', transaction_date:TODAY });
  const [savingTxn, setSavingTxn] = useState(false);

  const loadStats = useCallback(async () => {
    try { setStats(await inventoryService.getStats()); } catch {}
  }, []);
  const loadCategories = useCallback(async () => {
    try { setCategories(await inventoryService.getCategories()); } catch {}
  }, []);
  const loadAssets = useCallback(async () => {
    setLoadingAssets(true);
    try { setAssets(await inventoryService.getAssets({ status: assetFilter||undefined, search: assetSearch||undefined })); }
    catch {} finally { setLoadingAssets(false); }
  }, [assetFilter, assetSearch]);
  const loadStock = useCallback(async () => {
    setLoadingStock(true);
    try { setStock(await inventoryService.getStock({ category: stockCat||undefined, low_stock_only: lowOnly, search: stockSearch||undefined })); }
    catch {} finally { setLoadingStock(false); }
  }, [stockCat, lowOnly, stockSearch]);

  useEffect(() => { loadStats(); loadCategories(); }, [loadStats, loadCategories]);
  useEffect(() => { if (section === 'assets' || section === 'maintenance') loadAssets(); }, [section, loadAssets]);
  useEffect(() => { if (section === 'stock') loadStock(); }, [section, loadStock]);

  const openAssetModal = (a?: Asset) => {
    setEditAsset(a || null);
    setAssetForm(a ? { asset_code:a.asset_code, name:a.name, name_marathi:a.name_marathi||'', category_id:String(a.category_id||''), brand:a.brand||'', model_number:a.model_number||'', serial_number:a.serial_number||'', purchase_date:a.purchase_date||'', purchase_price:String(a.purchase_price||''), vendor:a.vendor||'', warranty_till:a.warranty_till||'', location:a.location||'', status:a.status, condition:a.condition, description:a.description||'' } : { asset_code:'', name:'', name_marathi:'', category_id:'', brand:'', model_number:'', serial_number:'', purchase_date:'', purchase_price:'', vendor:'', warranty_till:'', location:'', status:'active', condition:'good', description:'' });
    setShowAssetModal(true);
  };

  const saveAsset = async () => {
    if (!assetForm.asset_code || !assetForm.name) { toast.error('Code and name required.'); return; }
    setSavingAsset(true);
    const payload = { ...assetForm, category_id: assetForm.category_id ? Number(assetForm.category_id) : undefined, purchase_price: assetForm.purchase_price ? Number(assetForm.purchase_price) : undefined, purchase_date: assetForm.purchase_date || undefined, warranty_till: assetForm.warranty_till || undefined };
    try {
      if (editAsset) { await inventoryService.updateAsset(editAsset.id, payload); toast.success('Asset updated!'); }
      else { await inventoryService.createAsset(payload); toast.success('Asset added!'); }
      setShowAssetModal(false); loadAssets(); loadStats();
    } catch (e: any) { toast.error(e?.response?.data?.detail || 'Failed.'); }
    finally { setSavingAsset(false); }
  };

  const deleteAsset = async (id: number) => {
    if (!confirm('Delete this asset?')) return;
    try { await inventoryService.deleteAsset(id); toast.success('Deleted.'); loadAssets(); loadStats(); }
    catch { toast.error('Failed.'); }
  };

  const openMaintModal = (a: Asset) => {
    setMaintForm({ asset_id:a.id, maintenance_date:TODAY, maintenance_type:'repair', description:'', cost:'', vendor:'', next_service_date:'', status_after:'active' });
    setAssetDetail(a);
    setShowMaintModal(true);
  };

  const loadMaintenance = async (a: Asset) => {
    setAssetDetail(a);
    try { setMaintenance(await inventoryService.getMaintenance(a.id)); } catch {}
  };

  const saveMaint = async () => {
    if (!maintForm.description) { toast.error('Description required.'); return; }
    setSavingMaint(true);
    try {
      await inventoryService.addMaintenance({ ...maintForm, cost: maintForm.cost ? Number(maintForm.cost) : undefined });
      toast.success('Maintenance recorded!'); setShowMaintModal(false); loadAssets(); loadStats();
    } catch { toast.error('Failed.'); } finally { setSavingMaint(false); }
  };

  const saveStockItem = async () => {
    if (!stockForm.item_code || !stockForm.name) { toast.error('Code and name required.'); return; }
    setSavingStock(true);
    const payload = { ...stockForm, current_stock: Number(stockForm.current_stock), minimum_stock: Number(stockForm.minimum_stock), unit_cost: stockForm.unit_cost ? Number(stockForm.unit_cost) : undefined };
    try {
      await inventoryService.createStockItem(payload); toast.success('Stock item added!');
      setShowStockModal(false);
      setStockForm({ item_code:'', name:'', name_marathi:'', category:'stationery', unit:'nos', current_stock:'0', minimum_stock:'10', unit_cost:'', location:'', description:'' });
      loadStock(); loadStats();
    } catch (e: any) { toast.error(e?.response?.data?.detail || 'Failed.'); } finally { setSavingStock(false); }
  };

  const openTxnModal = async (item: StockItem) => {
    setTxnItem(item); setTransactions([]);
    setTxnForm({ transaction_type:'receipt', quantity:'', unit_cost:'', reference:'', issued_to:'', purpose:'', transaction_date:TODAY });
    setShowTxnModal(true);
    try { setTransactions(await inventoryService.getTransactions(item.id)); } catch {}
  };

  const saveTxn = async () => {
    if (!txnItem || !txnForm.quantity) { toast.error('Quantity required.'); return; }
    setSavingTxn(true);
    try {
      await inventoryService.transact({ stock_item_id: txnItem.id, transaction_type: txnForm.transaction_type, quantity: Number(txnForm.quantity), unit_cost: txnForm.unit_cost ? Number(txnForm.unit_cost) : undefined, reference: txnForm.reference || undefined, issued_to: txnForm.issued_to || undefined, purpose: txnForm.purpose || undefined, transaction_date: txnForm.transaction_date });
      toast.success(`${txnForm.transaction_type} recorded!`);
      setTransactions(await inventoryService.getTransactions(txnItem.id));
      loadStock(); loadStats();
      setTxnForm(p => ({ ...p, quantity:'', reference:'', issued_to:'', purpose:'' }));
    } catch (e: any) { toast.error(e?.response?.data?.detail || 'Failed.'); } finally { setSavingTxn(false); }
  };

  const fmt = (n?: number) => n != null ? `₹${Number(n).toLocaleString('en-IN')}` : '—';
  const fmtDate = (d?: string) => d ? new Date(d).toLocaleDateString('en-IN') : '—';

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Inventory & Assets</h1>
          <p className={styles.pageSub}>साठा व मालमत्ता · Asset Register & Stock Management</p>
        </div>
      </div>

      <div className={styles.tabBar}>
        {([
          { id:'dashboard', label:'Dashboard',   icon:<BarChart3 size={14}/> },
          { id:'assets',    label:'Asset Register', icon:<Package size={14}/> },
          { id:'stock',     label:'Stock & Consumables', icon:<ArrowDownToLine size={14}/> },
          { id:'maintenance', label:'Maintenance', icon:<Wrench size={14}/> },
        ] as const).map(t => (
          <button key={t.id} className={`${styles.tab} ${section===t.id?styles.tabActive:''}`}
            onClick={() => setSection(t.id as Section)}>{t.icon} {t.label}</button>
        ))}
      </div>

      {/* ── DASHBOARD ──────────────────────────────────────── */}
      {section==='dashboard' && stats && (
        <div className={styles.dashContent}>
          <div className={styles.kpiGrid}>
            {[
              { label:'Total Assets',     value:stats.total_assets,       icon:<Package size={20}/>,      color:'var(--color-primary)',  action:()=>setSection('assets') },
              { label:'Active',           value:stats.active_assets,      icon:<Check size={20}/>,        color:'var(--color-success)' },
              { label:'In Repair',        value:stats.in_repair,          icon:<Wrench size={20}/>,       color:'var(--color-warning)',  action:()=>setSection('maintenance') },
              { label:'Disposed',         value:stats.disposed,           icon:<X size={20}/>,            color:'var(--color-danger)' },
              { label:'Asset Value',      value:fmt(stats.total_asset_value), icon:<BarChart3 size={20}/>, color:'var(--color-info)',  isStr:true },
              { label:'Warranty Expiring',value:stats.warranties_expiring_soon, icon:<ShieldCheck size={20}/>, color:stats.warranties_expiring_soon>0?'var(--color-warning)':'var(--color-success)' },
              { label:'Stock Items',      value:stats.total_stock_items,  icon:<Package size={20}/>,      color:'var(--color-primary)',  action:()=>setSection('stock') },
              { label:'Low Stock 🔴',     value:stats.low_stock_items,    icon:<AlertTriangle size={20}/>,color:stats.low_stock_items>0?'var(--color-danger)':'var(--color-success)', action:()=>{ setSection('stock'); setLowOnly(true); } },
            ].map(k => (
              <div key={k.label} className={`${styles.kpiCard} ${k.action?styles.kpiClickable:''}`}
                style={{'--kc':k.color} as React.CSSProperties} onClick={k.action}>
                <div style={{color:k.color}}>{k.icon}</div>
                <div className={styles.kpiVal}>{k.value}</div>
                <div className={styles.kpiLabel}>{k.label}</div>
                {k.action && <ArrowRight size={13} className={styles.kpiArrow}/>}
              </div>
            ))}
          </div>
          <div className={styles.stockValCard}>
            <span>Total Stock Value</span>
            <span className={styles.stockValNum}>{fmt(stats.total_stock_value)}</span>
          </div>
        </div>
      )}

      {/* ── ASSETS ─────────────────────────────────────────── */}
      {section==='assets' && (
        <div className={styles.assetsContent}>
          <div className={styles.toolbar}>
            <input className={styles.searchInput} placeholder="Search assets..." value={assetSearch}
              onChange={e=>setAssetSearch(e.target.value)} onKeyDown={e=>e.key==='Enter'&&loadAssets()}/>
            <div className={styles.filterTabs}>
              <button className={`${styles.fTab} ${!assetFilter?styles.fTabActive:''}`} onClick={()=>{setAssetFilter('');setTimeout(loadAssets,50);}}>All</button>
              {ASSET_STATUSES.map(s=><button key={s} className={`${styles.fTab} ${assetFilter===s?styles.fTabActive:''}`} onClick={()=>{setAssetFilter(s);setTimeout(loadAssets,50);}}>{s}</button>)}
            </div>
            <button className={styles.iconBtn} onClick={loadAssets}><RefreshCw size={14}/></button>
            <PermissionGate permission="inventory.manage">
              <button className={styles.addBtn} onClick={()=>openAssetModal()}><Plus size={15}/> Add Asset</button>
            </PermissionGate>
          </div>
          {loadingAssets ? <div className={styles.loadingSkel}/> : (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead><tr><th>Code</th><th>Asset Name</th><th>Category</th><th>Location</th><th>Condition</th><th>Status</th><th>Purchase Price</th><th>Warranty</th><th>Actions</th></tr></thead>
                <tbody>
                  {assets.length===0 ? <tr><td colSpan={9} className={styles.emptyCell}><div className={styles.emptyState}><Package size={48}/><p>No assets found.</p></div></td></tr>
                  : assets.map(a => (
                    <tr key={a.id} className={styles.tr}>
                      <td><span className={styles.assetCode}>{a.asset_code}</span></td>
                      <td><div className={styles.assetName}>{a.name}</div>{a.name_marathi&&<div className={styles.assetNameMr}>{a.name_marathi}</div>}</td>
                      <td>{categories.find(c=>c.id===a.category_id)?.name||'—'}</td>
                      <td>{a.location||'—'}</td>
                      <td><span className={styles.condTag} style={{color:COND_COLOR[a.condition],background:`${COND_COLOR[a.condition]}18`}}>{a.condition}</span></td>
                      <td><span className={styles.statusTag} style={{color:STATUS_COLOR[a.status],background:`${STATUS_COLOR[a.status]}18`}}>{a.status}</span></td>
                      <td>{fmt(a.purchase_price)}</td>
                      <td className={a.warranty_till && new Date(a.warranty_till) < new Date(Date.now()+30*86400000) ? styles.warningDate : ''}>{fmtDate(a.warranty_till)}</td>
                      <td>
                        <div className={styles.actionBtns}>
                          <PermissionGate permission="inventory.manage">
                            <button className={styles.miniBtn} title="Maintenance" onClick={()=>openMaintModal(a)}><Wrench size={11}/></button>
                            <button className={styles.miniBtn} title="Edit" onClick={()=>openAssetModal(a)}><Pencil size={11}/></button>
                            <button className={`${styles.miniBtn} ${styles.miniBtnDanger}`} onClick={()=>deleteAsset(a.id)}><Trash2 size={11}/></button>
                          </PermissionGate>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── STOCK ──────────────────────────────────────────── */}
      {section==='stock' && (
        <div className={styles.stockContent}>
          <div className={styles.toolbar}>
            <input className={styles.searchInput} placeholder="Search stock..." value={stockSearch} onChange={e=>setStockSearch(e.target.value)} onKeyDown={e=>e.key==='Enter'&&loadStock()}/>
            <div className={styles.filterTabs}>
              <button className={`${styles.fTab} ${!stockCat?styles.fTabActive:''}`} onClick={()=>{setStockCat('');setLowOnly(false);}}>All</button>
              {STOCK_CATS.map(c=><button key={c} className={`${styles.fTab} ${stockCat===c?styles.fTabActive:''}`} onClick={()=>setStockCat(c)}>{c}</button>)}
              <button className={`${styles.fTab} ${styles.fTabLow} ${lowOnly?styles.fTabActive:''}`} onClick={()=>setLowOnly(v=>!v)}>🔴 Low Stock</button>
            </div>
            <button className={styles.iconBtn} onClick={loadStock}><RefreshCw size={14}/></button>
            <PermissionGate permission="inventory.manage">
              <button className={styles.addBtn} onClick={()=>setShowStockModal(true)}><Plus size={15}/> Add Item</button>
            </PermissionGate>
          </div>
          {loadingStock ? <div className={styles.loadingSkel}/> : (
            <div className={styles.stockGrid}>
              {stock.length===0 ? <div className={styles.emptyState}><Package size={64}/><p>No stock items.</p></div>
              : stock.map(s=>(
                <div key={s.id} className={`${styles.stockCard} ${s.is_low_stock?styles.stockLow:''}`}>
                  {s.is_low_stock && <div className={styles.lowBadge}><AlertTriangle size={10}/> Low Stock</div>}
                  <div className={styles.stockTop}>
                    <div className={styles.stockCode}>{s.item_code}</div>
                    <span className={styles.stockCatTag}>{s.category}</span>
                  </div>
                  <div className={styles.stockName}>{s.name}</div>
                  {s.name_marathi && <div className={styles.stockNameMr}>{s.name_marathi}</div>}
                  <div className={styles.stockBar}>
                    <div className={styles.stockBarFill} style={{ width:`${Math.min(100,Number(s.current_stock)/Number(s.minimum_stock)*50)}%`, background: s.is_low_stock?'var(--color-danger)':'var(--color-success)' }}/>
                  </div>
                  <div className={styles.stockNums}>
                    <span className={`${styles.stockQty} ${s.is_low_stock?styles.stockQtyLow:''}`}>{s.current_stock} {s.unit}</span>
                    <span className={styles.stockMin}>Min: {s.minimum_stock}</span>
                  </div>
                  {s.unit_cost && <div className={styles.stockCost}>{fmt(s.unit_cost)} / {s.unit}</div>}
                  <div className={styles.stockActions}>
                    <button className={styles.txnBtn} onClick={()=>openTxnModal(s)}>
                      <History size={12}/> Transactions
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── MAINTENANCE ────────────────────────────────────── */}
      {section==='maintenance' && (
        <div className={styles.maintContent}>
          <div className={styles.toolbar}>
            <button className={styles.iconBtn} onClick={loadAssets}><RefreshCw size={14}/></button>
          </div>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead><tr><th>Asset</th><th>Serial</th><th>Status</th><th>Location</th><th>Next Service</th><th>Actions</th></tr></thead>
              <tbody>
                {assets.filter(a=>a.status==='in_repair'||a.warranty_till).map(a=>(
                  <tr key={a.id} className={styles.tr}>
                    <td><div className={styles.assetName}>{a.name}</div><div className={styles.assetCode}>{a.asset_code}</div></td>
                    <td>{a.serial_number||'—'}</td>
                    <td><span className={styles.statusTag} style={{color:STATUS_COLOR[a.status],background:`${STATUS_COLOR[a.status]}18`}}>{a.status}</span></td>
                    <td>{a.location||'—'}</td>
                    <td className={styles.warningDate}>{fmtDate(a.warranty_till)}</td>
                    <td><button className={styles.miniBtn} onClick={()=>openMaintModal(a)}><Wrench size={11}/> Log Maintenance</button></td>
                  </tr>
                ))}
                {assets.filter(a=>a.status==='in_repair'||a.warranty_till).length===0 && (
                  <tr><td colSpan={6} className={styles.emptyCell}><div className={styles.emptyState}><Wrench size={48}/><p>No assets in repair or with warranty.</p></div></td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ════ Asset Modal ════ */}
      {showAssetModal && (
        <div className={styles.overlay} onClick={()=>setShowAssetModal(false)}>
          <div className={`${styles.modal} ${styles.wideModal}`} onClick={e=>e.stopPropagation()}>
            <div className={styles.modalHeader}><h3 className={styles.modalTitle}>{editAsset?'Edit Asset':'Add Asset'}</h3><button className={styles.modalClose} onClick={()=>setShowAssetModal(false)}><X size={16}/></button></div>
            <div className={styles.modalBody}>
              <div className={styles.mfRow}>
                <div className={styles.mf}><label className={styles.ml}>Asset Code *</label><input className={styles.mi} value={assetForm.asset_code} onChange={e=>setAssetForm(p=>({...p,asset_code:e.target.value}))} placeholder="e.g. COMP-001"/></div>
                <div className={styles.mf}><label className={styles.ml}>Category</label><select className={styles.mi} value={assetForm.category_id} onChange={e=>setAssetForm(p=>({...p,category_id:e.target.value}))}><option value="">-- None --</option>{categories.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
              </div>
              <div className={styles.mf}><label className={styles.ml}>Asset Name *</label><input className={styles.mi} value={assetForm.name} onChange={e=>setAssetForm(p=>({...p,name:e.target.value}))} placeholder="e.g. Dell Laptop"/></div>
              <div className={styles.mf}><label className={styles.ml}>Marathi Name</label><input className={styles.mi} value={assetForm.name_marathi} onChange={e=>setAssetForm(p=>({...p,name_marathi:e.target.value}))}/></div>
              <div className={styles.mfRow}>
                <div className={styles.mf}><label className={styles.ml}>Brand</label><input className={styles.mi} value={assetForm.brand} onChange={e=>setAssetForm(p=>({...p,brand:e.target.value}))}/></div>
                <div className={styles.mf}><label className={styles.ml}>Model</label><input className={styles.mi} value={assetForm.model_number} onChange={e=>setAssetForm(p=>({...p,model_number:e.target.value}))}/></div>
                <div className={styles.mf}><label className={styles.ml}>Serial No.</label><input className={styles.mi} value={assetForm.serial_number} onChange={e=>setAssetForm(p=>({...p,serial_number:e.target.value}))}/></div>
              </div>
              <div className={styles.mfRow}>
                <div className={styles.mf}><label className={styles.ml}>Purchase Date</label><input type="date" className={styles.mi} value={assetForm.purchase_date} onChange={e=>setAssetForm(p=>({...p,purchase_date:e.target.value}))}/></div>
                <div className={styles.mf}><label className={styles.ml}>Purchase Price (₹)</label><input type="number" className={styles.mi} value={assetForm.purchase_price} onChange={e=>setAssetForm(p=>({...p,purchase_price:e.target.value}))}/></div>
                <div className={styles.mf}><label className={styles.ml}>Warranty Till</label><input type="date" className={styles.mi} value={assetForm.warranty_till} onChange={e=>setAssetForm(p=>({...p,warranty_till:e.target.value}))}/></div>
              </div>
              <div className={styles.mfRow}>
                <div className={styles.mf}><label className={styles.ml}>Vendor</label><input className={styles.mi} value={assetForm.vendor} onChange={e=>setAssetForm(p=>({...p,vendor:e.target.value}))}/></div>
                <div className={styles.mf}><label className={styles.ml}>Location</label><input className={styles.mi} value={assetForm.location} onChange={e=>setAssetForm(p=>({...p,location:e.target.value}))} placeholder="Room 12, Computer Lab"/></div>
              </div>
              <div className={styles.mfRow}>
                <div className={styles.mf}><label className={styles.ml}>Status</label><select className={styles.mi} value={assetForm.status} onChange={e=>setAssetForm(p=>({...p,status:e.target.value}))}>{ASSET_STATUSES.map(s=><option key={s}>{s}</option>)}</select></div>
                <div className={styles.mf}><label className={styles.ml}>Condition</label><select className={styles.mi} value={assetForm.condition} onChange={e=>setAssetForm(p=>({...p,condition:e.target.value}))}>{ASSET_CONDITIONS.map(c=><option key={c}>{c}</option>)}</select></div>
              </div>
            </div>
            <div className={styles.modalFooter}><button className={styles.cancelBtn} onClick={()=>setShowAssetModal(false)}>Cancel</button><button className={styles.submitBtn} onClick={saveAsset} disabled={savingAsset}>{savingAsset?<span className={styles.spin}/>:<Check size={14}/>} {editAsset?'Update':'Add'}</button></div>
          </div>
        </div>
      )}

      {/* ════ Maintenance Modal ════ */}
      {showMaintModal && assetDetail && (
        <div className={styles.overlay} onClick={()=>setShowMaintModal(false)}>
          <div className={styles.modal} onClick={e=>e.stopPropagation()}>
            <div className={styles.modalHeader}><h3 className={styles.modalTitle}>Log Maintenance<span className={styles.modalSub}> — {assetDetail.name}</span></h3><button className={styles.modalClose} onClick={()=>setShowMaintModal(false)}><X size={16}/></button></div>
            <div className={styles.modalBody}>
              <div className={styles.mfRow}>
                <div className={styles.mf}><label className={styles.ml}>Date *</label><input type="date" className={styles.mi} value={maintForm.maintenance_date} max={TODAY} onChange={e=>setMaintForm(p=>({...p,maintenance_date:e.target.value}))}/></div>
                <div className={styles.mf}><label className={styles.ml}>Type</label><select className={styles.mi} value={maintForm.maintenance_type} onChange={e=>setMaintForm(p=>({...p,maintenance_type:e.target.value}))}>{MAINT_TYPES.map(t=><option key={t}>{t}</option>)}</select></div>
              </div>
              <div className={styles.mf}><label className={styles.ml}>Description *</label><textarea className={styles.mta} rows={3} value={maintForm.description} onChange={e=>setMaintForm(p=>({...p,description:e.target.value}))} placeholder="What was done?"/></div>
              <div className={styles.mfRow}>
                <div className={styles.mf}><label className={styles.ml}>Cost (₹)</label><input type="number" className={styles.mi} value={maintForm.cost} onChange={e=>setMaintForm(p=>({...p,cost:e.target.value}))}/></div>
                <div className={styles.mf}><label className={styles.ml}>Vendor</label><input className={styles.mi} value={maintForm.vendor} onChange={e=>setMaintForm(p=>({...p,vendor:e.target.value}))}/></div>
                <div className={styles.mf}><label className={styles.ml}>Next Service</label><input type="date" className={styles.mi} value={maintForm.next_service_date} onChange={e=>setMaintForm(p=>({...p,next_service_date:e.target.value}))}/></div>
              </div>
              <div className={styles.mf}><label className={styles.ml}>Asset Status After</label><select className={styles.mi} value={maintForm.status_after} onChange={e=>setMaintForm(p=>({...p,status_after:e.target.value}))}>{ASSET_STATUSES.map(s=><option key={s}>{s}</option>)}</select></div>
            </div>
            <div className={styles.modalFooter}><button className={styles.cancelBtn} onClick={()=>setShowMaintModal(false)}>Cancel</button><button className={styles.submitBtn} onClick={saveMaint} disabled={savingMaint}>{savingMaint?<span className={styles.spin}/>:<Check size={14}/>} Save</button></div>
          </div>
        </div>
      )}

      {/* ════ Stock Item Modal ════ */}
      {showStockModal && (
        <div className={styles.overlay} onClick={()=>setShowStockModal(false)}>
          <div className={styles.modal} onClick={e=>e.stopPropagation()}>
            <div className={styles.modalHeader}><h3 className={styles.modalTitle}>Add Stock Item</h3><button className={styles.modalClose} onClick={()=>setShowStockModal(false)}><X size={16}/></button></div>
            <div className={styles.modalBody}>
              <div className={styles.mfRow}><div className={styles.mf}><label className={styles.ml}>Item Code *</label><input className={styles.mi} value={stockForm.item_code} onChange={e=>setStockForm(p=>({...p,item_code:e.target.value}))} placeholder="STAT-001"/></div><div className={styles.mf}><label className={styles.ml}>Category</label><select className={styles.mi} value={stockForm.category} onChange={e=>setStockForm(p=>({...p,category:e.target.value}))}>{STOCK_CATS.map(c=><option key={c}>{c}</option>)}</select></div></div>
              <div className={styles.mf}><label className={styles.ml}>Name *</label><input className={styles.mi} value={stockForm.name} onChange={e=>setStockForm(p=>({...p,name:e.target.value}))} placeholder="e.g. A4 Paper Ream"/></div>
              <div className={styles.mf}><label className={styles.ml}>Marathi Name</label><input className={styles.mi} value={stockForm.name_marathi} onChange={e=>setStockForm(p=>({...p,name_marathi:e.target.value}))}/></div>
              <div className={styles.mfRow}>
                <div className={styles.mf}><label className={styles.ml}>Unit</label><select className={styles.mi} value={stockForm.unit} onChange={e=>setStockForm(p=>({...p,unit:e.target.value}))}>{STOCK_UNITS.map(u=><option key={u}>{u}</option>)}</select></div>
                <div className={styles.mf}><label className={styles.ml}>Opening Stock</label><input type="number" className={styles.mi} value={stockForm.current_stock} onChange={e=>setStockForm(p=>({...p,current_stock:e.target.value}))}/></div>
                <div className={styles.mf}><label className={styles.ml}>Min Stock (Alert)</label><input type="number" className={styles.mi} value={stockForm.minimum_stock} onChange={e=>setStockForm(p=>({...p,minimum_stock:e.target.value}))}/></div>
                <div className={styles.mf}><label className={styles.ml}>Unit Cost (₹)</label><input type="number" className={styles.mi} value={stockForm.unit_cost} onChange={e=>setStockForm(p=>({...p,unit_cost:e.target.value}))}/></div>
              </div>
              <div className={styles.mf}><label className={styles.ml}>Location</label><input className={styles.mi} value={stockForm.location} onChange={e=>setStockForm(p=>({...p,location:e.target.value}))} placeholder="Storeroom, Lab Cupboard"/></div>
            </div>
            <div className={styles.modalFooter}><button className={styles.cancelBtn} onClick={()=>setShowStockModal(false)}>Cancel</button><button className={styles.submitBtn} onClick={saveStockItem} disabled={savingStock}>{savingStock?<span className={styles.spin}/>:<Check size={14}/>} Add</button></div>
          </div>
        </div>
      )}

      {/* ════ Transaction Modal ════ */}
      {showTxnModal && txnItem && (
        <div className={styles.overlay} onClick={()=>setShowTxnModal(false)}>
          <div className={`${styles.modal} ${styles.wideModal}`} onClick={e=>e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>{txnItem.name}<span className={styles.modalSub}> · {txnItem.current_stock} {txnItem.unit} in stock</span></h3>
              <button className={styles.modalClose} onClick={()=>setShowTxnModal(false)}><X size={16}/></button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.txnForm}>
                <div className={styles.txnTypeBtns}>
                  {TXN_TYPES.map(t=>(
                    <button key={t} className={`${styles.txnTypeBtn} ${txnForm.transaction_type===t?styles.txnTypeBtnActive:''}`}
                      style={{'--tc':TXN_COLOR[t]} as React.CSSProperties}
                      onClick={()=>setTxnForm(p=>({...p,transaction_type:t}))}>
                      {t==='receipt'?<ArrowDownToLine size={13}/>:t==='issue'?<ArrowUpFromLine size={13}/>:t==='return'?<ArrowDownToLine size={13}/>:<History size={13}/>}
                      {t}
                    </button>
                  ))}
                </div>
                <div className={styles.mfRow}>
                  <div className={styles.mf}><label className={styles.ml}>Quantity *</label><input type="number" className={styles.mi} value={txnForm.quantity} onChange={e=>setTxnForm(p=>({...p,quantity:e.target.value}))} placeholder={`in ${txnItem.unit}`}/></div>
                  <div className={styles.mf}><label className={styles.ml}>Unit Cost (₹)</label><input type="number" className={styles.mi} value={txnForm.unit_cost} onChange={e=>setTxnForm(p=>({...p,unit_cost:e.target.value}))}/></div>
                  <div className={styles.mf}><label className={styles.ml}>Date</label><input type="date" className={styles.mi} value={txnForm.transaction_date} max={TODAY} onChange={e=>setTxnForm(p=>({...p,transaction_date:e.target.value}))}/></div>
                </div>
                <div className={styles.mfRow}>
                  <div className={styles.mf}><label className={styles.ml}>Reference / PO#</label><input className={styles.mi} value={txnForm.reference} onChange={e=>setTxnForm(p=>({...p,reference:e.target.value}))}/></div>
                  {txnForm.transaction_type==='issue' && <div className={styles.mf}><label className={styles.ml}>Issued To</label><input className={styles.mi} value={txnForm.issued_to} onChange={e=>setTxnForm(p=>({...p,issued_to:e.target.value}))} placeholder="Teacher / Class"/></div>}
                </div>
                <button className={styles.txnSubmit} onClick={saveTxn} disabled={savingTxn}>{savingTxn?<span className={styles.spin}/>:<Check size={14}/>} Record {txnForm.transaction_type}</button>
              </div>
              {transactions.length > 0 && (
                <div className={styles.txnHistory}>
                  <div className={styles.txnHistoryTitle}><History size={14}/> Transaction History</div>
                  <table className={styles.table}>
                    <thead><tr><th>Date</th><th>Type</th><th>Qty</th><th>Before</th><th>After</th><th>Ref</th></tr></thead>
                    <tbody>
                      {transactions.slice(0,20).map(t=>(
                        <tr key={t.id} className={styles.tr}>
                          <td>{fmtDate(t.transaction_date)}</td>
                          <td><span className={styles.txnTag} style={{color:TXN_COLOR[t.transaction_type],background:`${TXN_COLOR[t.transaction_type]}18`}}>{t.transaction_type}</span></td>
                          <td className={t.transaction_type==='issue'?styles.negQty:styles.posQty}>{t.transaction_type==='issue'?'-':'+' }{t.quantity}</td>
                          <td>{t.stock_before}</td>
                          <td><strong>{t.stock_after}</strong></td>
                          <td>{t.reference||t.issued_to||'—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
