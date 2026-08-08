import { useState, useEffect, useCallback } from 'react';
import {
  Package, Plus, RefreshCw, Check, X, AlertTriangle,
  Wrench, ArrowDownToLine, ArrowUpFromLine, BarChart3,
  Pencil, Trash2, ArrowRight, ShieldCheck, History,
  Printer, FileText, Calendar, Filter, Search, IndianRupee,
} from 'lucide-react';
import toast from 'react-hot-toast';
import inventoryService, {
  Asset, AssetCategory, StockItem, StockTransaction, InventoryStats, RegisterEntry,
} from '../../services/inventoryService';
import PermissionGate from '../../components/ui/PermissionGate';
import styles from './InventoryPage.module.css';

type Section = 'dashboard' | 'assets' | 'stock' | 'register' | 'maintenance';

const TODAY = new Date().toISOString().split('T')[0];
const FIRST_DAY_YEAR = `${new Date().getFullYear()}-04-01`;

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

  // Date-wise Register (Dr / Cr)
  const [regFromDate, setRegFromDate] = useState(FIRST_DAY_YEAR);
  const [regToDate, setRegToDate] = useState(TODAY);
  const [regType, setRegType] = useState('all');
  const [regSearch, setRegSearch] = useState('');
  const [registerEntries, setRegisterEntries] = useState<RegisterEntry[]>([]);
  const [loadingRegister, setLoadingRegister] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);

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

  const loadRegister = useCallback(async () => {
    setLoadingRegister(true);
    try {
      const data = await inventoryService.getRegister({
        from_date: regFromDate || undefined,
        to_date: regToDate || undefined,
        register_type: regType !== 'all' ? regType : undefined,
        search: regSearch || undefined,
      });
      setRegisterEntries(data);
    } catch {
      toast.error('Failed to load register entries.');
    } finally {
      setLoadingRegister(false);
    }
  }, [regFromDate, regToDate, regType, regSearch]);

  useEffect(() => { loadStats(); loadCategories(); }, [loadStats, loadCategories]);
  useEffect(() => { if (section === 'assets' || section === 'maintenance') loadAssets(); }, [section, loadAssets]);
  useEffect(() => { if (section === 'stock') loadStock(); }, [section, loadStock]);
  useEffect(() => { if (section === 'register') loadRegister(); }, [section, loadRegister]);

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

  const handlePrint = () => {
    window.print();
  };

  const totalDr = registerEntries.reduce((acc, curr) => acc + (Number(curr.dr_amount) || 0), 0);
  const totalCr = registerEntries.reduce((acc, curr) => acc + (Number(curr.cr_amount) || 0), 0);
  const netBalance = totalDr - totalCr;

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
          { id:'dashboard',   label:'Dashboard',               icon:<BarChart3 size={14}/> },
          { id:'assets',      label:'Asset Register',          icon:<Package size={14}/> },
          { id:'stock',       label:'Stock & Consumables',     icon:<ArrowDownToLine size={14}/> },
          { id:'register',    label:'Date-wise Register (Dr/Cr)', icon:<FileText size={14}/> },
          { id:'maintenance', label:'Maintenance',             icon:<Wrench size={14}/> },
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
                      <td><strong>{fmt(a.purchase_price)}</strong></td>
                      <td>{fmtDate(a.warranty_till)}</td>
                      <td>
                        <div className={styles.rowActions}>
                          <button className={styles.rowBtn} onClick={()=>openAssetModal(a)} title="Edit"><Pencil size={13}/></button>
                          <button className={styles.rowBtn} onClick={()=>openMaintModal(a)} title="Maintenance"><Wrench size={13}/></button>
                          <button className={styles.rowBtnDanger} onClick={()=>deleteAsset(a.id)} title="Delete"><Trash2 size={13}/></button>
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
            <input className={styles.searchInput} placeholder="Search item code/name..." value={stockSearch}
              onChange={e=>setStockSearch(e.target.value)} onKeyDown={e=>e.key==='Enter'&&loadStock()}/>
            <select className={styles.filterSel} value={stockCat} onChange={e=>{setStockCat(e.target.value);setTimeout(loadStock,50);}}>
              <option value="">All Categories</option>
              {STOCK_CATS.map(c=><option key={c} value={c}>{c}</option>)}
            </select>
            <label className={styles.checkLabel}><input type="checkbox" checked={lowOnly} onChange={e=>{setLowOnly(e.target.checked);setTimeout(loadStock,50);}}/> Low Stock Only</label>
            <button className={styles.iconBtn} onClick={loadStock}><RefreshCw size={14}/></button>
            <PermissionGate permission="inventory.manage">
              <button className={styles.addBtn} onClick={()=>setShowStockModal(true)}><Plus size={15}/> Add Stock Item</button>
            </PermissionGate>
          </div>
          {loadingStock ? <div className={styles.loadingSkel}/> : (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead><tr><th>Code</th><th>Item Name</th><th>Category</th><th>Current Stock</th><th>Min Stock</th><th>Unit Cost</th><th>Total Value</th><th>Actions</th></tr></thead>
                <tbody>
                  {stock.length===0 ? <tr><td colSpan={8} className={styles.emptyCell}><div className={styles.emptyState}><Package size={48}/><p>No stock items found.</p></div></td></tr>
                  : stock.map(item => (
                    <tr key={item.id} className={`${styles.tr} ${item.is_low_stock?styles.lowStockRow:''}`}>
                      <td><span className={styles.assetCode}>{item.item_code}</span></td>
                      <td><div className={styles.assetName}>{item.name}</div>{item.name_marathi&&<div className={styles.assetNameMr}>{item.name_marathi}</div>}</td>
                      <td><span className={styles.catBadge}>{item.category}</span></td>
                      <td><strong className={item.is_low_stock?styles.lowStockText:''}>{item.current_stock} {item.unit}</strong>{item.is_low_stock&&<span className={styles.lowBadge}>Low</span>}</td>
                      <td>{item.minimum_stock} {item.unit}</td>
                      <td>{fmt(item.unit_cost)}</td>
                      <td><strong>{fmt((item.unit_cost||0)*item.current_stock)}</strong></td>
                      <td><button className={styles.transactBtn} onClick={()=>openTxnModal(item)}><ArrowDownToLine size={13}/> Transact</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── DATE-WISE REGISTER (DR / CR) ───────────────────── */}
      {section==='register' && (
        <div className={styles.registerContent}>
          <div className={styles.registerToolbar}>
            <div className={styles.dateGroup}>
              <label><Calendar size={13}/> From:</label>
              <input type="date" className={styles.dateInp} value={regFromDate} onChange={e=>setRegFromDate(e.target.value)}/>
            </div>
            <div className={styles.dateGroup}>
              <label><Calendar size={13}/> To:</label>
              <input type="date" className={styles.dateInp} value={regToDate} onChange={e=>setRegToDate(e.target.value)}/>
            </div>
            <select className={styles.filterSel} value={regType} onChange={e=>setRegType(e.target.value)}>
              <option value="all">All Entries (Assets & Stock)</option>
              <option value="asset">Assets Only (Purchases & Disposal)</option>
              <option value="stock">Stock Consumables Only</option>
            </select>
            <input className={styles.searchInput} placeholder="Search Code, Ref, Vendor, Particulars..."
              value={regSearch} onChange={e=>setRegSearch(e.target.value)} onKeyDown={e=>e.key==='Enter'&&loadRegister()}/>
            <button className={styles.iconBtn} onClick={loadRegister} title="Refresh"><RefreshCw size={14}/></button>
            <button className={styles.printBtn} onClick={()=>setShowPrintModal(true)} title="Print Date-wise Register">
              <Printer size={15}/> Print Register (Dr/Cr)
            </button>
          </div>

          {/* Dr / Cr Summary Header */}
          <div className={styles.regSummaryGrid}>
            <div className={`${styles.regSummaryCard} ${styles.drCard}`}>
              <div className={styles.regSumLabel}>Total Debit (Dr / जमा / Inward)</div>
              <div className={styles.regSumVal}>{fmt(totalDr)}</div>
              <div className={styles.regSumSub}>Purchases, Stock Receipts & Returns</div>
            </div>
            <div className={`${styles.regSummaryCard} ${styles.crCard}`}>
              <div className={styles.regSumLabel}>Total Credit (Cr / नावे / Outward)</div>
              <div className={styles.regSumVal}>{fmt(totalCr)}</div>
              <div className={styles.regSumSub}>Stock Issues, Maintenance & Disposals</div>
            </div>
            <div className={`${styles.regSummaryCard} ${styles.netCard}`}>
              <div className={styles.regSumLabel}>Net Closing Balance (शिल्लक)</div>
              <div className={styles.regSumVal}>{fmt(netBalance)}</div>
              <div className={styles.regSumSub}>Difference (Dr - Cr)</div>
            </div>
          </div>

          {loadingRegister ? <div className={styles.loadingSkel}/> : (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Date (दिनांक)</th>
                    <th>Voucher / Ref (पावती/कोड)</th>
                    <th>Code & Particulars (तपशील)</th>
                    <th>Type / Category</th>
                    <th style={{textAlign:'right', color:'#16a34a'}}>Dr / Addition (जमा ₹)</th>
                    <th style={{textAlign:'right', color:'#dc2626'}}>Cr / Issue (नावे ₹)</th>
                    <th>Party / Location</th>
                    <th>Remarks (शेरा)</th>
                  </tr>
                </thead>
                <tbody>
                  {registerEntries.length === 0 ? (
                    <tr><td colSpan={8} className={styles.emptyCell}><div className={styles.emptyState}><FileText size={48}/><p>No register entries found for selected dates.</p></div></td></tr>
                  ) : registerEntries.map((e, idx) => (
                    <tr key={`${e.id}-${idx}`} className={styles.tr}>
                      <td><strong>{fmtDate(e.entry_date)}</strong></td>
                      <td><code className={styles.refCode}>{e.reference || e.code}</code></td>
                      <td>
                        <div className={styles.assetName}>{e.particulars}</div>
                        {e.particulars_marathi && <div className={styles.assetNameMr}>{e.particulars_marathi}</div>}
                      </td>
                      <td><span className={styles.catBadge}>{e.category} ({e.entry_type.replace('_',' ')})</span></td>
                      <td style={{textAlign:'right'}} className={Number(e.dr_amount)>0 ? styles.drText : ''}>
                        {Number(e.dr_amount) > 0 ? (
                          <div><strong>{fmt(e.dr_amount)}</strong>{e.dr_qty ? <div style={{fontSize:'0.75rem',color:'#16a34a'}}>({e.dr_qty} Qty)</div> : null}</div>
                        ) : '—'}
                      </td>
                      <td style={{textAlign:'right'}} className={Number(e.cr_amount)>0 ? styles.crText : ''}>
                        {Number(e.cr_amount) > 0 ? (
                          <div><strong>{fmt(e.cr_amount)}</strong>{e.cr_qty ? <div style={{fontSize:'0.75rem',color:'#dc2626'}}>({e.cr_qty} Qty)</div> : null}</div>
                        ) : '—'}
                      </td>
                      <td>{e.party_location || '—'}</td>
                      <td><span className={styles.remarksText}>{e.remarks || '—'}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── MAINTENANCE ────────────────────────────────────── */}
      {section==='maintenance' && (
        <div className={styles.maintContent}>
          <div className={styles.toolbar}>
            <input className={styles.searchInput} placeholder="Search asset name/code for maintenance..." value={assetSearch}
              onChange={e=>setAssetSearch(e.target.value)} onKeyDown={e=>e.key==='Enter'&&loadAssets()}/>
            <button className={styles.iconBtn} onClick={loadAssets}><RefreshCw size={14}/></button>
          </div>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead><tr><th>Code</th><th>Asset Name</th><th>Location</th><th>Condition</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>
                {assets.map(a => (
                  <tr key={a.id} className={styles.tr}>
                    <td><span className={styles.assetCode}>{a.asset_code}</span></td>
                    <td><div className={styles.assetName}>{a.name}</div></td>
                    <td>{a.location||'—'}</td>
                    <td><span className={styles.condTag} style={{color:COND_COLOR[a.condition],background:`${COND_COLOR[a.condition]}18`}}>{a.condition}</span></td>
                    <td><span className={styles.statusTag} style={{color:STATUS_COLOR[a.status],background:`${STATUS_COLOR[a.status]}18`}}>{a.status}</span></td>
                    <td>
                      <div className={styles.rowActions}>
                        <button className={styles.addBtnSmall} onClick={()=>openMaintModal(a)}><Plus size={12}/> Add Service Record</button>
                        <button className={styles.rowBtn} onClick={()=>loadMaintenance(a)} title="History"><History size={13}/></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {assetDetail && maintenance.length > 0 && (
            <div className={styles.maintHistoryCard}>
              <h3>Maintenance History for: {assetDetail.name} ({assetDetail.asset_code})</h3>
              <table className={styles.table}>
                <thead><tr><th>Date</th><th>Type</th><th>Description</th><th>Cost</th><th>Vendor</th><th>Status After</th></tr></thead>
                <tbody>
                  {maintenance.map(m => (
                    <tr key={m.id}>
                      <td>{fmtDate(m.maintenance_date)}</td>
                      <td><span className={styles.catBadge}>{m.maintenance_type}</span></td>
                      <td>{m.description}</td>
                      <td><strong>{fmt(m.cost)}</strong></td>
                      <td>{m.vendor||'—'}</td>
                      <td><span className={styles.statusTag} style={{color:STATUS_COLOR[m.status_after],background:`${STATUS_COLOR[m.status_after]}18`}}>{m.status_after}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── MODALS ─────────────────────────────────────────── */}
      {/* Add/Edit Asset Modal */}
      {showAssetModal && (
        <div className={styles.modalOverlay} onClick={()=>setShowAssetModal(false)}>
          <div className={styles.modal} onClick={e=>e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>{editAsset ? 'Edit Asset' : 'Add New Asset (नवीन मालमत्ता)'}</h3>
              <button className={styles.closeBtn} onClick={()=>setShowAssetModal(false)}><X size={16}/></button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.mfRow}>
                <div className={styles.mf}><label className={styles.ml}>Asset Code *</label><input className={styles.mi} value={assetForm.asset_code} onChange={e=>setAssetForm(p=>({...p,asset_code:e.target.value}))} placeholder="AST-001"/></div>
                <div className={styles.mf}><label className={styles.ml}>Name (English) *</label><input className={styles.mi} value={assetForm.name} onChange={e=>setAssetForm(p=>({...p,name:e.target.value}))} placeholder="Smart Board 65 inch"/></div>
              </div>
              <div className={styles.mfRow}>
                <div className={styles.mf}><label className={styles.ml}>Name (Marathi)</label><input className={styles.mi} value={assetForm.name_marathi} onChange={e=>setAssetForm(p=>({...p,name_marathi:e.target.value}))} placeholder="डिजिटल फलक 65 इंच"/></div>
                <div className={styles.mf}><label className={styles.ml}>Category</label>
                  <select className={styles.mi} value={assetForm.category_id} onChange={e=>setAssetForm(p=>({...p,category_id:e.target.value}))}>
                    <option value="">Select Category</option>
                    {categories.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              </div>
              <div className={styles.mfRow}>
                <div className={styles.mf}><label className={styles.ml}>Brand</label><input className={styles.mi} value={assetForm.brand} onChange={e=>setAssetForm(p=>({...p,brand:e.target.value}))}/></div>
                <div className={styles.mf}><label className={styles.ml}>Model Number</label><input className={styles.mi} value={assetForm.model_number} onChange={e=>setAssetForm(p=>({...p,model_number:e.target.value}))}/></div>
                <div className={styles.mf}><label className={styles.ml}>Serial Number</label><input className={styles.mi} value={assetForm.serial_number} onChange={e=>setAssetForm(p=>({...p,serial_number:e.target.value}))}/></div>
              </div>
              <div className={styles.mfRow}>
                <div className={styles.mf}><label className={styles.ml}>Purchase Date</label><input type="date" className={styles.mi} value={assetForm.purchase_date} onChange={e=>setAssetForm(p=>({...p,purchase_date:e.target.value}))}/></div>
                <div className={styles.mf}><label className={styles.ml}>Purchase Price (₹)</label><input type="number" className={styles.mi} value={assetForm.purchase_price} onChange={e=>setAssetForm(p=>({...p,purchase_price:e.target.value}))}/></div>
                <div className={styles.mf}><label className={styles.ml}>Vendor/Supplier</label><input className={styles.mi} value={assetForm.vendor} onChange={e=>setAssetForm(p=>({...p,vendor:e.target.value}))}/></div>
              </div>
              <div className={styles.mfRow}>
                <div className={styles.mf}><label className={styles.ml}>Warranty Till</label><input type="date" className={styles.mi} value={assetForm.warranty_till} onChange={e=>setAssetForm(p=>({...p,warranty_till:e.target.value}))}/></div>
                <div className={styles.mf}><label className={styles.ml}>Location/Room</label><input className={styles.mi} value={assetForm.location} onChange={e=>setAssetForm(p=>({...p,location:e.target.value}))} placeholder="Computer Lab 1"/></div>
              </div>
              <div className={styles.mfRow}>
                <div className={styles.mf}><label className={styles.ml}>Status</label>
                  <select className={styles.mi} value={assetForm.status} onChange={e=>setAssetForm(p=>({...p,status:e.target.value}))}>
                    {ASSET_STATUSES.map(s=><option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div className={styles.mf}><label className={styles.ml}>Condition</label>
                  <select className={styles.mi} value={assetForm.condition} onChange={e=>setAssetForm(p=>({...p,condition:e.target.value}))}>
                    {ASSET_CONDITIONS.map(c=><option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div className={styles.mf}><label className={styles.ml}>Description / Notes</label><textarea className={styles.mta} value={assetForm.description} onChange={e=>setAssetForm(p=>({...p,description:e.target.value}))} rows={2}/></div>
            </div>
            <div className={styles.modalFooter}>
              <button className={styles.cancelBtn} onClick={()=>setShowAssetModal(false)}>Cancel</button>
              <button className={styles.saveBtn} onClick={saveAsset} disabled={savingAsset}>{savingAsset?<span className={styles.spin}/>:<Check size={14}/>} {editAsset?'Update Asset':'Save Asset'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Add Stock Item Modal */}
      {showStockModal && (
        <div className={styles.modalOverlay} onClick={()=>setShowStockModal(false)}>
          <div className={styles.modal} onClick={e=>e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>Add Stock Item (नवीन साठा वस्तू)</h3>
              <button className={styles.closeBtn} onClick={()=>setShowStockModal(false)}><X size={16}/></button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.mfRow}>
                <div className={styles.mf}><label className={styles.ml}>Item Code *</label><input className={styles.mi} value={stockForm.item_code} onChange={e=>setStockForm(p=>({...p,item_code:e.target.value}))} placeholder="STK-001"/></div>
                <div className={styles.mf}><label className={styles.ml}>Item Name *</label><input className={styles.mi} value={stockForm.name} onChange={e=>setStockForm(p=>({...p,name:e.target.value}))} placeholder="A4 Paper Rim"/></div>
              </div>
              <div className={styles.mfRow}>
                <div className={styles.mf}><label className={styles.ml}>Name (Marathi)</label><input className={styles.mi} value={stockForm.name_marathi} onChange={e=>setStockForm(p=>({...p,name_marathi:e.target.value}))} placeholder="A4 कागद रीम"/></div>
                <div className={styles.mf}><label className={styles.ml}>Category</label>
                  <select className={styles.mi} value={stockForm.category} onChange={e=>setStockForm(p=>({...p,category:e.target.value}))}>
                    {STOCK_CATS.map(c=><option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div className={styles.mfRow}>
                <div className={styles.mf}><label className={styles.ml}>Unit</label>
                  <select className={styles.mi} value={stockForm.unit} onChange={e=>setStockForm(p=>({...p,unit:e.target.value}))}>
                    {STOCK_UNITS.map(u=><option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
                <div className={styles.mf}><label className={styles.ml}>Initial Stock</label><input type="number" className={styles.mi} value={stockForm.current_stock} onChange={e=>setStockForm(p=>({...p,current_stock:e.target.value}))}/></div>
                <div className={styles.mf}><label className={styles.ml}>Min Warning Stock</label><input type="number" className={styles.mi} value={stockForm.minimum_stock} onChange={e=>setStockForm(p=>({...p,minimum_stock:e.target.value}))}/></div>
              </div>
              <div className={styles.mfRow}>
                <div className={styles.mf}><label className={styles.ml}>Unit Cost (₹)</label><input type="number" className={styles.mi} value={stockForm.unit_cost} onChange={e=>setStockForm(p=>({...p,unit_cost:e.target.value}))}/></div>
                <div className={styles.mf}><label className={styles.ml}>Storage Location</label><input className={styles.mi} value={stockForm.location} onChange={e=>setStockForm(p=>({...p,location:e.target.value}))} placeholder="Store Room Shelf A2"/></div>
              </div>
            </div>
            <div className={styles.modalFooter}>
              <button className={styles.cancelBtn} onClick={()=>setShowStockModal(false)}>Cancel</button>
              <button className={styles.saveBtn} onClick={saveStockItem} disabled={savingStock}>{savingStock?<span className={styles.spin}/>:<Check size={14}/>} Save Stock Item</button>
            </div>
          </div>
        </div>
      )}

      {/* Stock Transaction Modal */}
      {showTxnModal && txnItem && (
        <div className={styles.modalOverlay} onClick={()=>setShowTxnModal(false)}>
          <div className={`${styles.modal} ${styles.modalLg}`} onClick={e=>e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>Stock Transaction: {txnItem.name} ({txnItem.item_code})</h3>
              <button className={styles.closeBtn} onClick={()=>setShowTxnModal(false)}><X size={16}/></button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.txnFormBox}>
                <div className={styles.txnTypeSelector}>
                  {TXN_TYPES.map(t => (
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

      {/* Maintenance Record Modal */}
      {showMaintModal && assetDetail && (
        <div className={styles.modalOverlay} onClick={()=>setShowMaintModal(false)}>
          <div className={styles.modal} onClick={e=>e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>Add Maintenance Record for: {assetDetail.name}</h3>
              <button className={styles.closeBtn} onClick={()=>setShowMaintModal(false)}><X size={16}/></button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.mfRow}>
                <div className={styles.mf}><label className={styles.ml}>Maintenance Date</label><input type="date" className={styles.mi} value={maintForm.maintenance_date} onChange={e=>setMaintForm(p=>({...p,maintenance_date:e.target.value}))}/></div>
                <div className={styles.mf}><label className={styles.ml}>Type</label>
                  <select className={styles.mi} value={maintForm.maintenance_type} onChange={e=>setMaintForm(p=>({...p,maintenance_type:e.target.value}))}>
                    {MAINT_TYPES.map(t=><option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>
              <div className={styles.mf}><label className={styles.ml}>Description / Work Done *</label><textarea className={styles.mta} value={maintForm.description} onChange={e=>setMaintForm(p=>({...p,description:e.target.value}))} rows={2} required/></div>
              <div className={styles.mfRow}>
                <div className={styles.mf}><label className={styles.ml}>Cost (₹)</label><input type="number" className={styles.mi} value={maintForm.cost} onChange={e=>setMaintForm(p=>({...p,cost:e.target.value}))}/></div>
                <div className={styles.mf}><label className={styles.ml}>Service Provider / Vendor</label><input className={styles.mi} value={maintForm.vendor} onChange={e=>setMaintForm(p=>({...p,vendor:e.target.value}))}/></div>
              </div>
              <div className={styles.mfRow}>
                <div className={styles.mf}><label className={styles.ml}>Next Scheduled Service</label><input type="date" className={styles.mi} value={maintForm.next_service_date} onChange={e=>setMaintForm(p=>({...p,next_service_date:e.target.value}))}/></div>
                <div className={styles.mf}><label className={styles.ml}>Asset Status After</label>
                  <select className={styles.mi} value={maintForm.status_after} onChange={e=>setMaintForm(p=>({...p,status_after:e.target.value}))}>
                    {ASSET_STATUSES.map(s=><option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
            </div>
            <div className={styles.modalFooter}>
              <button className={styles.cancelBtn} onClick={()=>setShowMaintModal(false)}>Cancel</button>
              <button className={styles.saveBtn} onClick={saveMaint} disabled={savingMaint}>{savingMaint?<span className={styles.spin}/>:<Check size={14}/>} Record Service</button>
            </div>
          </div>
        </div>
      )}

      {/* ── PRINT REGISTER MODAL / VIEW ────────────────────────── */}
      {showPrintModal && (
        <div className={styles.modalOverlay} onClick={()=>setShowPrintModal(false)}>
          <div className={`${styles.modal} ${styles.printModal}`} onClick={e=>e.stopPropagation()}>
            <div className={styles.modalHeader + ' ' + styles.noPrint}>
              <h3><Printer size={16}/> Date-Wise Asset & Stock Register Print Preview</h3>
              <div className={styles.headerActions}>
                <button className={styles.primaryPrintBtn} onClick={handlePrint}><Printer size={14}/> Print Now (CTRL+P)</button>
                <button className={styles.closeBtn} onClick={()=>setShowPrintModal(false)}><X size={16}/></button>
              </div>
            </div>

            {/* Printable Document Container */}
            <div className={styles.printableDocument}>
              <div className={styles.schoolHeader}>
                <h1 className={styles.schoolName}>विद्यासेतू माध्यमिक व उच्च माध्यमिक विद्यालय, पुणे</h1>
                <p className={styles.schoolSub}>शासकीय नोंदणी क्र. SCH-2025/EX-884 · U-DISE Code: 27250100412</p>
                <h2 className={styles.docTitle}>मालमत्ता व साठा दैनिक नोंदवही (ASSET & STOCK REGISTER - DR / CR)</h2>
                <div className={styles.metaRow}>
                  <span><strong>कालावधी (Period):</strong> {fmtDate(regFromDate)} ते {fmtDate(regToDate)}</span>
                  <span><strong>मुद्रण दिनांक (Print Date):</strong> {fmtDate(TODAY)}</span>
                  <span><strong>नोंदणी प्रकार:</strong> {regType.toUpperCase()}</span>
                </div>
              </div>

              {/* Table */}
              <table className={styles.printTable}>
                <thead>
                  <tr>
                    <th style={{width:'50px'}}>क्र.</th>
                    <th style={{width:'85px'}}>दिनांक</th>
                    <th style={{width:'100px'}}>पावती / कोड</th>
                    <th>मालमत्ता / साठा नाव (Particulars)</th>
                    <th style={{width:'80px'}}>प्रकार</th>
                    <th style={{width:'90px', textAlign:'right'}}>जमा ₹ (Dr)</th>
                    <th style={{width:'90px', textAlign:'right'}}>नावे ₹ (Cr)</th>
                    <th style={{width:'110px'}}>पुरवठादार / ठिकाण</th>
                    <th>शेरा (Remarks)</th>
                  </tr>
                </thead>
                <tbody>
                  {registerEntries.length === 0 ? (
                    <tr><td colSpan={9} style={{textAlign:'center', padding:'20px'}}>या कालावधीसाठी कोणत्या नोंद आढळल्या नाहीत.</td></tr>
                  ) : registerEntries.map((e, idx) => (
                    <tr key={`print_${e.id}_${idx}`}>
                      <td style={{textAlign:'center'}}>{idx + 1}</td>
                      <td>{fmtDate(e.entry_date)}</td>
                      <td><code>{e.reference || e.code}</code></td>
                      <td>
                        <strong>{e.particulars}</strong>
                        {e.particulars_marathi && <div style={{fontSize:'0.75rem', color:'#4b5563'}}>{e.particulars_marathi}</div>}
                      </td>
                      <td>{e.category}</td>
                      <td style={{textAlign:'right', color: Number(e.dr_amount) > 0 ? '#15803d' : '#000'}}>
                        {Number(e.dr_amount) > 0 ? fmt(e.dr_amount) : '—'}
                      </td>
                      <td style={{textAlign:'right', color: Number(e.cr_amount) > 0 ? '#b91c1c' : '#000'}}>
                        {Number(e.cr_amount) > 0 ? fmt(e.cr_amount) : '—'}
                      </td>
                      <td>{e.party_location || '—'}</td>
                      <td style={{fontSize:'0.75rem'}}>{e.remarks || '—'}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className={styles.totalRow}>
                    <td colSpan={5} style={{textAlign:'right'}}><strong>एकूण जमा व नावे (Total Dr & Cr):</strong></td>
                    <td style={{textAlign:'right', color:'#15803d'}}><strong>{fmt(totalDr)}</strong></td>
                    <td style={{textAlign:'right', color:'#b91c1c'}}><strong>{fmt(totalCr)}</strong></td>
                    <td colSpan={2}><strong>निव्वळ शिल्लक: {fmt(netBalance)}</strong></td>
                  </tr>
                </tfoot>
              </table>

              {/* Signatures */}
              <div className={styles.sigContainer}>
                <div className={styles.sigBox}>
                  <div className={styles.sigLine}/>
                  <span>तयार करणार (लिपीक)<br/>Prepared by Clerk</span>
                </div>
                <div className={styles.sigBox}>
                  <div className={styles.sigLine}/>
                  <span>साठा प्रमुख / भांडारपाल<br/>Store Keeper</span>
                </div>
                <div className={styles.sigBox}>
                  <div className={styles.sigLine}/>
                  <span>तपासणीकार / लेखापाल<br/>Verified Accountant</span>
                </div>
                <div className={styles.sigBox}>
                  <div className={styles.sigLine}/>
                  <span>मुख्याध्यापक / स्वाक्षरी<br/>Headmaster / Principal</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
