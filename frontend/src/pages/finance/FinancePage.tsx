import { useState, useEffect, useCallback } from 'react';
import {
  IndianRupee, TrendingUp, TrendingDown, Users, AlertTriangle,
  Plus, Search, RefreshCw, Check, X, Printer, Download,
  CreditCard, Wallet, ChevronDown, ChevronUp, Receipt,
  BookOpen, BarChart3, ArrowUpRight, ArrowDownRight,
} from 'lucide-react';
import toast from 'react-hot-toast';
import financeService, {
  FinanceStats, FeeCategory, FeeStructure, StudentFeeSummary,
  FeePayment, DefaulterEntry, Expense,
} from '../../services/financeService';
import PermissionGate from '../../components/ui/PermissionGate';
import { ExportButton } from '../../components/shared';
import { downloadFeeCollectionExcel, downloadFeeReceiptPDF } from '../../services/exports';
import styles from './FinancePage.module.css';

type Section = 'dashboard' | 'collection' | 'structure' | 'defaulters' | 'expenses' | 'categories';

const STANDARDS = ['1','2','3','4','5','6','7','8','9','10','11','12'];
const PAYMENT_MODES = ['cash','cheque','upi','neft','rtgs','dd','online'];
const EXPENSE_CATS = ['Salaries','Maintenance','Stationery','Utilities','Transport','Events','Furniture','Equipment','Books','Miscellaneous'];
const CURRENT_AY = 1; // Will be dynamic from settings

const fmt = (n: number) => `₹${Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

export default function FinancePage() {
  const [section, setSection] = useState<Section>('dashboard');
  const [stats, setStats] = useState<FinanceStats | null>(null);
  const [categories, setCategories] = useState<FeeCategory[]>([]);

  // Fee Collection
  const [searchGr, setSearchGr] = useState('');
  const [feeSummary, setFeeSummary] = useState<StudentFeeSummary | null>(null);
  const [loadingFees, setLoadingFees] = useState(false);
  const [selectedRecords, setSelectedRecords] = useState<number[]>([]);
  const [paymentMode, setPaymentMode] = useState('cash');
  const [payAmount, setPayAmount] = useState('');
  const [payFine, setPayFine] = useState('0');
  const [payConcession, setPayConcession] = useState('0');
  const [payTxId, setPayTxId] = useState('');
  const [payRemarks, setPayRemarks] = useState('');
  const [collecting, setCollecting] = useState(false);
  const [lastReceipt, setLastReceipt] = useState<FeePayment | null>(null);

  // Fee Structure
  const [structStd, setStructStd] = useState('1');
  const [feeStructures, setFeeStructures] = useState<FeeStructure[]>([]);
  const [loadingStruct, setLoadingStruct] = useState(false);
  const [editingStruct, setEditingStruct] = useState<{[catId: number]: string}>({});

  // Defaulters
  const [defaulters, setDefaulters] = useState<DefaulterEntry[]>([]);
  const [defaulterStd, setDefaulterStd] = useState('');
  const [loadingDefaulters, setLoadingDefaulters] = useState(false);

  // Expenses
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [expenseTotal, setExpenseTotal] = useState(0);
  const [loadingExp, setLoadingExp] = useState(false);
  const [showExpModal, setShowExpModal] = useState(false);
  const [newExp, setNewExp] = useState({
    expense_date: new Date().toISOString().split('T')[0],
    category: 'Maintenance', sub_category: '',
    description: '', amount: '', payment_mode: 'cash',
    payee: '', bill_number: '', remarks: '',
  });
  const [savingExp, setSavingExp] = useState(false);

  // Category Modal
  const [showCatModal, setShowCatModal] = useState(false);
  const [newCat, setNewCat] = useState({ name: '', name_marathi: '', frequency: 'annual', is_mandatory: true });
  const [savingCat, setSavingCat] = useState(false);

  const loadStats = useCallback(async () => {
    try { setStats(await financeService.getStats()); } catch {}
  }, []);

  const loadCategories = useCallback(async () => {
    try { setCategories(await financeService.getCategories()); } catch {}
  }, []);

  useEffect(() => { loadStats(); loadCategories(); }, [loadStats, loadCategories]);

  // Load fee structure for selected standard
  const loadStructure = useCallback(async () => {
    setLoadingStruct(true);
    try {
      const items = await financeService.getFeeStructure(CURRENT_AY, structStd);
      setFeeStructures(items);
      const initial: {[k: number]: string} = {};
      items.forEach(f => { initial[f.category_id] = String(f.amount); });
      setEditingStruct(initial);
    } catch {} finally { setLoadingStruct(false); }
  }, [structStd]);

  useEffect(() => { if (section === 'structure') loadStructure(); }, [section, loadStructure]);

  // Load defaulters
  const loadDefaulters = useCallback(async () => {
    setLoadingDefaulters(true);
    try { setDefaulters(await financeService.getDefaulters(CURRENT_AY, defaulterStd || undefined)); }
    catch {} finally { setLoadingDefaulters(false); }
  }, [defaulterStd]);

  useEffect(() => { if (section === 'defaulters') loadDefaulters(); }, [section, loadDefaulters]);

  // Load expenses
  const loadExpenses = useCallback(async () => {
    setLoadingExp(true);
    try {
      const res = await financeService.getExpenses({ academic_year_id: CURRENT_AY });
      setExpenses(res.items);
      setExpenseTotal(res.meta.total || 0);
    } catch {} finally { setLoadingExp(false); }
  }, []);

  useEffect(() => { if (section === 'expenses') loadExpenses(); }, [section, loadExpenses]);

  // Search student fees by GR number
  const searchStudentFees = async () => {
    if (!searchGr.trim()) { toast.error('Enter GR number or student ID.'); return; }
    setLoadingFees(true); setFeeSummary(null); setSelectedRecords([]);
    try {
      // Numeric = student ID; else GR number lookup via student list
      const studentId = parseInt(searchGr);
      if (isNaN(studentId)) { toast.error('Enter numeric student ID or GR number.'); return; }
      const summary = await financeService.getStudentFees(studentId, CURRENT_AY);
      setFeeSummary(summary);
      if (summary.records.length === 0) toast('No fee records. Generate from structure first.');
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || 'Student not found.');
    } finally { setLoadingFees(false); }
  };

  const generateRecords = async () => {
    if (!feeSummary) return;
    try {
      const count = await financeService.generateFeeRecords(feeSummary.student_id, CURRENT_AY, feeSummary.standard);
      toast.success(`${count} fee records generated!`);
      searchStudentFees();
    } catch { toast.error('Failed to generate records.'); }
  };

  const toggleRecord = (id: number) => {
    setSelectedRecords(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const collectFee = async () => {
    if (!feeSummary || selectedRecords.length === 0) { toast.error('Select fee records to collect.'); return; }
    if (!payAmount || Number(payAmount) <= 0) { toast.error('Enter amount.'); return; }
    setCollecting(true);
    try {
      const receipt = await financeService.collectFee({
        student_id: feeSummary.student_id,
        academic_year_id: CURRENT_AY,
        fee_record_ids: selectedRecords,
        payment_date: new Date().toISOString().split('T')[0],
        payment_mode: paymentMode,
        amount: Number(payAmount),
        late_fine: Number(payFine) || 0,
        concession: Number(payConcession) || 0,
        transaction_id: payTxId || undefined,
        remarks: payRemarks || undefined,
      });
      setLastReceipt(receipt);
      toast.success(`✅ Receipt ${receipt.receipt_number} generated!`);
      setPayAmount(''); setPayFine('0'); setPayConcession('0');
      setPayTxId(''); setPayRemarks('');
      setSelectedRecords([]);
      searchStudentFees(); loadStats();
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || 'Collection failed.');
    } finally { setCollecting(false); }
  };

  const saveStructure = async () => {
    const entries = Object.entries(editingStruct);
    if (entries.length === 0) { toast.error('No categories to save.'); return; }
    let saved = 0;
    for (const [catId, amount] of entries) {
      if (!amount || Number(amount) < 0) continue;
      try {
        await financeService.upsertFeeStructure({
          academic_year_id: CURRENT_AY,
          standard: structStd,
          category_id: Number(catId),
          amount: Number(amount),
          late_fine_per_day: 0,
        });
        saved++;
      } catch {}
    }
    toast.success(`${saved} fee structures saved!`);
    loadStructure(); loadStats();
  };

  const saveExpense = async () => {
    if (!newExp.description || !newExp.amount) { toast.error('Description and amount required.'); return; }
    setSavingExp(true);
    try {
      await financeService.createExpense({
        ...newExp, amount: Number(newExp.amount),
        academic_year_id: CURRENT_AY,
      } as any);
      toast.success('Expense recorded!');
      setShowExpModal(false);
      setNewExp({ expense_date: new Date().toISOString().split('T')[0], category: 'Maintenance', sub_category: '', description: '', amount: '', payment_mode: 'cash', payee: '', bill_number: '', remarks: '' });
      loadExpenses(); loadStats();
    } catch { toast.error('Failed.'); }
    finally { setSavingExp(false); }
  };

  const saveCat = async () => {
    if (!newCat.name) { toast.error('Name required.'); return; }
    setSavingCat(true);
    try {
      await financeService.createCategory(newCat);
      toast.success('Category added!');
      setShowCatModal(false);
      setNewCat({ name: '', name_marathi: '', frequency: 'annual', is_mandatory: true });
      loadCategories();
    } catch { toast.error('Failed.'); }
    finally { setSavingCat(false); }
  };

  const totalBalance = feeSummary ? feeSummary.balance : 0;
  const selectedBalance = feeSummary
    ? feeSummary.records.filter(r => selectedRecords.includes(r.id))
        .reduce((s, r) => s + (r.amount_due - r.amount_paid - r.concession_amount), 0)
    : 0;

  const statusClass = (s: string) => {
    const m: Record<string, string> = {
      paid: styles.tagSuccess, partial: styles.tagWarning,
      pending: styles.tagDanger, waived: styles.tagMuted,
    };
    return m[s] || styles.tagMuted;
  };

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Finance &amp; Fee Management</h1>
          <p className={styles.pageSub}>शुल्क व्यवस्थापन · Fee Collection &amp; Financial Reports</p>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <PermissionGate permission="finance.export">
            <ExportButton
              format="excel"
              label="Export Fees"
              size="sm"
              onExport={() => downloadFeeCollectionExcel()}
            />
          </PermissionGate>
        </div>
      </div>

      {/* Tabs */}
      <div className={styles.tabBar}>
        {([
          { id: 'dashboard',  label: 'Dashboard',     icon: <BarChart3 size={14}/> },
          { id: 'collection', label: 'Fee Collection', icon: <Receipt size={14}/> },
          { id: 'structure',  label: 'Fee Structure',  icon: <BookOpen size={14}/> },
          { id: 'defaulters', label: 'Defaulters',     icon: <AlertTriangle size={14}/> },
          { id: 'expenses',   label: 'Expenses',       icon: <TrendingDown size={14}/> },
          { id: 'categories', label: 'Categories',     icon: <CreditCard size={14}/> },
        ] as const).map(t => (
          <button key={t.id} className={`${styles.tab} ${section === t.id ? styles.tabActive : ''}`}
            onClick={() => setSection(t.id as Section)}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* ── DASHBOARD ──────────────────────────────────────── */}
      {section === 'dashboard' && stats && (
        <div className={styles.dashContent}>
          {/* KPI Cards */}
          <div className={styles.kpiGrid}>
            {[
              { label: 'Total Collected',     value: fmt(stats.total_fee_collected), icon: <TrendingUp size={20}/>, color: 'var(--color-success)', sub: `This month: ${fmt(stats.collection_this_month)}` },
              { label: 'Pending Amount',       value: fmt(stats.pending_amount),      icon: <AlertTriangle size={20}/>, color: 'var(--color-danger)', sub: `${stats.defaulter_count} defaulters` },
              { label: 'Total Expenses',       value: fmt(stats.total_expenses),      icon: <TrendingDown size={20}/>, color: 'var(--color-warning)', sub: `This month: ${fmt(stats.expense_this_month)}` },
              { label: 'Net Balance',          value: fmt(stats.net_balance),         icon: <Wallet size={20}/>, color: stats.net_balance >= 0 ? 'var(--color-success)' : 'var(--color-danger)', sub: 'Collected − Expenses' },
              { label: 'Total Fee Due',        value: fmt(stats.total_fee_due),       icon: <IndianRupee size={20}/>, color: 'var(--color-primary)', sub: `Concessions: ${fmt(stats.total_concessions)}` },
              { label: 'Students with Dues',   value: stats.total_students_with_dues, icon: <Users size={20}/>, color: 'var(--color-secondary, #7c3aed)', sub: 'need follow-up' },
            ].map(k => (
              <div key={k.label} className={styles.kpiCard} style={{ '--kc': k.color } as React.CSSProperties}>
                <div className={styles.kpiTop}>
                  <div className={styles.kpiIcon} style={{ color: k.color }}>{k.icon}</div>
                  <div className={styles.kpiVal}>{k.value}</div>
                </div>
                <div className={styles.kpiLabel}>{k.label}</div>
                <div className={styles.kpiSub}>{k.sub}</div>
              </div>
            ))}
          </div>

          {/* Progress Bar */}
          <div className={styles.collectionProgress}>
            <div className={styles.progressHeader}>
              <span>Collection Progress</span>
              <span>{stats.total_fee_due > 0 ? ((stats.total_fee_collected / stats.total_fee_due) * 100).toFixed(1) : 0}%</span>
            </div>
            <div className={styles.progressBar}>
              <div
                className={styles.progressFill}
                style={{ width: `${stats.total_fee_due > 0 ? Math.min((stats.total_fee_collected / stats.total_fee_due) * 100, 100) : 0}%` }}
              />
            </div>
            <div className={styles.progressLegend}>
              <span className={styles.legendSuccess}>■ Collected: {fmt(stats.total_fee_collected)}</span>
              <span className={styles.legendDanger}>■ Pending: {fmt(stats.pending_amount)}</span>
              <span className={styles.legendMuted}>■ Concessions: {fmt(stats.total_concessions)}</span>
            </div>
          </div>
        </div>
      )}

      {/* ── FEE COLLECTION ─────────────────────────────────── */}
      {section === 'collection' && (
        <div className={styles.collectionLayout}>
          {/* Left — Student Search */}
          <div className={styles.collectionLeft}>
            <div className={styles.panel}>
              <h3 className={styles.panelTitle}><Search size={15}/> Search Student</h3>
              <div className={styles.searchRow}>
                <input
                  className={styles.input}
                  placeholder="Enter Student ID or GR Number"
                  value={searchGr}
                  onChange={e => setSearchGr(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && searchStudentFees()}
                  id="fee-student-search"
                />
                <button className={styles.primaryBtn} onClick={searchStudentFees} disabled={loadingFees}>
                  {loadingFees ? <span className={styles.spin}/> : <Search size={15}/>} Search
                </button>
              </div>
            </div>

            {feeSummary && (
              <>
                {/* Student Info */}
                <div className={styles.studentPanel}>
                  <div className={styles.studentPanelTop}>
                    <div className={styles.studentAvatar}>{feeSummary.student_name.charAt(0)}</div>
                    <div>
                      <div className={styles.studentPanelName}>{feeSummary.student_name}</div>
                      <div className={styles.studentPanelMeta}>
                        GR: {feeSummary.gr_number} · Std {feeSummary.standard}{feeSummary.division || ''}
                      </div>
                    </div>
                  </div>
                  <div className={styles.feeQuickStats}>
                    <div className={styles.fqs}><span>Due</span><strong className={styles.fqsDue}>{fmt(feeSummary.total_due)}</strong></div>
                    <div className={styles.fqs}><span>Paid</span><strong className={styles.fqsPaid}>{fmt(feeSummary.total_paid)}</strong></div>
                    <div className={styles.fqs}><span>Balance</span><strong className={totalBalance > 0 ? styles.fqsDue : styles.fqsPaid}>{fmt(totalBalance)}</strong></div>
                  </div>
                </div>

                {/* Fee Records */}
                <div className={styles.panel}>
                  <div className={styles.panelTitleRow}>
                    <h3 className={styles.panelTitle}><IndianRupee size={15}/> Fee Records</h3>
                    {feeSummary.records.length === 0 && (
                      <button className={styles.genBtn} onClick={generateRecords}>
                        <Plus size={13}/> Generate
                      </button>
                    )}
                  </div>
                  {feeSummary.records.length === 0 ? (
                    <div className={styles.emptyMsg}>No fee records. Click Generate to create from fee structure.</div>
                  ) : (
                    <div className={styles.recordList}>
                      {feeSummary.records.map(r => {
                        const balance = r.amount_due - r.amount_paid - r.concession_amount;
                        const isSelected = selectedRecords.includes(r.id);
                        const isPaid = r.status === 'paid';
                        return (
                          <div
                            key={r.id}
                            className={`${styles.recordItem} ${isSelected ? styles.recordSelected : ''} ${isPaid ? styles.recordPaid : ''}`}
                            onClick={() => !isPaid && toggleRecord(r.id)}
                          >
                            <div className={styles.recordLeft}>
                              {!isPaid && (
                                <input type="checkbox" checked={isSelected} readOnly className={styles.cb}/>
                              )}
                              <div>
                                <div className={styles.recordCat}>{r.category?.name || `Category ${r.category_id}`}</div>
                                {r.due_date && <div className={styles.recordDue}>Due: {new Date(r.due_date).toLocaleDateString('en-IN')}</div>}
                              </div>
                            </div>
                            <div className={styles.recordRight}>
                              <span className={`${styles.tag} ${statusClass(r.status)}`}>{r.status}</span>
                              <div className={styles.recordAmounts}>
                                <span className={styles.dueLine}>Due: {fmt(r.amount_due)}</span>
                                {r.amount_paid > 0 && <span className={styles.paidLine}>Paid: {fmt(r.amount_paid)}</span>}
                                {balance > 0 && <strong className={styles.balanceLine}>Bal: {fmt(balance)}</strong>}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Right — Payment Form */}
          <div className={styles.collectionRight}>
            <div className={styles.panel}>
              <h3 className={styles.panelTitle}><Receipt size={15}/> Collect Payment</h3>

              {selectedRecords.length > 0 && (
                <div className={styles.selectedSummary}>
                  <span>{selectedRecords.length} item(s) selected</span>
                  <strong>{fmt(selectedBalance)}</strong>
                </div>
              )}

              <div className={styles.payForm}>
                <div className={styles.payField}>
                  <label className={styles.payLabel}>Payment Mode</label>
                  <div className={styles.modeGrid}>
                    {PAYMENT_MODES.map(m => (
                      <button key={m} className={`${styles.modeBtn} ${paymentMode === m ? styles.modeBtnActive : ''}`}
                        onClick={() => setPaymentMode(m)}>
                        {m.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>
                <div className={styles.payField}>
                  <label className={styles.payLabel}>Amount (₹) *</label>
                  <input className={styles.input} type="number" value={payAmount} onChange={e => setPayAmount(e.target.value)} placeholder="0.00" id="pay-amount"/>
                </div>
                <div className={styles.payFieldRow}>
                  <div className={styles.payField}>
                    <label className={styles.payLabel}>Late Fine (₹)</label>
                    <input className={styles.input} type="number" value={payFine} onChange={e => setPayFine(e.target.value)} placeholder="0"/>
                  </div>
                  <div className={styles.payField}>
                    <label className={styles.payLabel}>Concession (₹)</label>
                    <input className={styles.input} type="number" value={payConcession} onChange={e => setPayConcession(e.target.value)} placeholder="0"/>
                  </div>
                </div>
                {(paymentMode === 'upi' || paymentMode === 'neft' || paymentMode === 'online') && (
                  <div className={styles.payField}>
                    <label className={styles.payLabel}>Transaction ID</label>
                    <input className={styles.input} value={payTxId} onChange={e => setPayTxId(e.target.value)} placeholder="UPI/Transaction reference"/>
                  </div>
                )}
                {(paymentMode === 'cheque' || paymentMode === 'dd') && (
                  <div className={styles.payField}>
                    <label className={styles.payLabel}>Cheque / DD Number</label>
                    <input className={styles.input} value={payTxId} onChange={e => setPayTxId(e.target.value)} placeholder="Instrument number"/>
                  </div>
                )}
                <div className={styles.payField}>
                  <label className={styles.payLabel}>Remarks</label>
                  <input className={styles.input} value={payRemarks} onChange={e => setPayRemarks(e.target.value)} placeholder="Optional remarks"/>
                </div>

                {payAmount && (
                  <div className={styles.totalRow}>
                    <span>Total Received:</span>
                    <strong className={styles.totalAmt}>{fmt(Math.max(0, Number(payAmount) + Number(payFine || 0) - Number(payConcession || 0)))}</strong>
                  </div>
                )}

                <button
                  className={styles.collectBtn}
                  onClick={collectFee}
                  disabled={collecting || !feeSummary || selectedRecords.length === 0}
                  id="collect-fee-btn"
                >
                  {collecting ? <span className={styles.spin}/> : <IndianRupee size={16}/>}
                  {collecting ? 'Processing...' : 'Collect & Generate Receipt'}
                </button>
              </div>
            </div>

            {/* Receipt Preview */}
            {lastReceipt && (
              <div className={styles.receiptPreview}>
                <div className={styles.receiptHeader}>
                  <Receipt size={16} className={styles.receiptIcon}/>
                  <span>Receipt Generated</span>
                </div>
                <div className={styles.receiptNo}>{lastReceipt.receipt_number}</div>
                <div className={styles.receiptAmt}>{fmt(lastReceipt.total_received)}</div>
                <div className={styles.receiptMeta}>
                  {new Date(lastReceipt.payment_date).toLocaleDateString('en-IN')} · {lastReceipt.payment_mode.toUpperCase()}
                </div>
                <button className={styles.printBtn} onClick={() => window.print()}>
                  <Printer size={14}/> Print Receipt
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── FEE STRUCTURE ──────────────────────────────────── */}
      {section === 'structure' && (
        <div className={styles.structureContent}>
          <div className={styles.structureHeader}>
            <div className={styles.stdTabs}>
              {STANDARDS.map(s => (
                <button key={s} className={`${styles.stdTab} ${structStd === s ? styles.stdTabActive : ''}`}
                  onClick={() => setStructStd(s)}>
                  Std {s}
                </button>
              ))}
            </div>
            <button className={styles.primaryBtn} onClick={saveStructure}>
              <Check size={15}/> Save Structure
            </button>
          </div>

          <div className={styles.structureCard}>
            <div className={styles.structureTitle}>Fee Structure — Standard {structStd}</div>
            {loadingStruct ? (
              <div className={styles.loadingRow}/>
            ) : categories.length === 0 ? (
              <div className={styles.emptyMsg}>Add fee categories first.</div>
            ) : (
              <table className={styles.structTable}>
                <thead>
                  <tr>
                    <th>Fee Category</th>
                    <th>Frequency</th>
                    <th>Mandatory</th>
                    <th>Amount (₹)</th>
                    <th>Late Fine/Day (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  {categories.filter(c => c.is_active).map(cat => {
                    const existing = feeStructures.find(f => f.category_id === cat.id);
                    return (
                      <tr key={cat.id} className={styles.structRow}>
                        <td>
                          <div className={styles.catName}>{cat.name}</div>
                          {cat.name_marathi && <div className={styles.catNameMr}>{cat.name_marathi}</div>}
                        </td>
                        <td><span className={styles.freqBadge}>{cat.frequency}</span></td>
                        <td>{cat.is_mandatory ? '✅' : '—'}</td>
                        <td>
                          <input
                            className={styles.amtInput}
                            type="number"
                            value={editingStruct[cat.id] ?? (existing?.amount ?? '')}
                            onChange={e => setEditingStruct(p => ({ ...p, [cat.id]: e.target.value }))}
                            placeholder="0.00"
                            min="0"
                          />
                        </td>
                        <td className={styles.fineTd}>
                          {existing ? fmt(existing.late_fine_per_day) : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ── DEFAULTERS ──────────────────────────────────────── */}
      {section === 'defaulters' && (
        <div className={styles.defaultersContent}>
          <div className={styles.sectionToolbar}>
            <select className={styles.filterSelect} value={defaulterStd} onChange={e => setDefaulterStd(e.target.value)}>
              <option value="">All Standards</option>
              {STANDARDS.map(s => <option key={s} value={s}>Std {s}</option>)}
            </select>
            <button className={styles.iconBtn} onClick={loadDefaulters}><RefreshCw size={14}/></button>
          </div>
          {loadingDefaulters ? <div className={styles.loadingRow}/> :
           defaulters.length === 0 ? (
            <div className={styles.emptyState}><Check size={48}/><p>No defaulters found! 🎉</p></div>
           ) : (
            <div className={styles.defaulterCard}>
              <div className={styles.defaulterSummary}>
                <span>{defaulters.length} defaulter(s)</span>
                <strong className={styles.totalPending}>
                  Total Pending: {fmt(defaulters.reduce((s, d) => s + Number(d.balance), 0))}
                </strong>
              </div>
              <table className={styles.table}>
                <thead><tr>
                  <th>#</th><th>Student Name</th><th>GR No.</th><th>Standard</th>
                  <th>Mobile</th><th>Total Due</th><th>Paid</th><th>Balance</th><th>Overdue Since</th>
                </tr></thead>
                <tbody>
                  {defaulters.map((d, i) => (
                    <tr key={d.student_id} className={styles.tr}>
                      <td>{i + 1}</td>
                      <td><strong>{d.student_name}</strong></td>
                      <td className={styles.monoId}>{d.gr_number}</td>
                      <td>Std {d.standard}{d.division || ''}</td>
                      <td>{d.contact_mobile || '—'}</td>
                      <td>{fmt(d.total_due)}</td>
                      <td className={styles.paidTd}>{fmt(d.total_paid)}</td>
                      <td className={styles.balanceTd}>{fmt(d.balance)}</td>
                      <td>{d.overdue_since ? new Date(d.overdue_since).toLocaleDateString('en-IN') : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
           )}
        </div>
      )}

      {/* ── EXPENSES ────────────────────────────────────────── */}
      {section === 'expenses' && (
        <div className={styles.expensesContent}>
          <div className={styles.sectionToolbar}>
            <span className={styles.dateInfo}>Total: {expenseTotal} entries</span>
            <button className={styles.iconBtn} onClick={loadExpenses}><RefreshCw size={14}/></button>
            <PermissionGate permission="finance.expense.create">
              <button className={styles.primaryBtn} onClick={() => setShowExpModal(true)}><Plus size={15}/> Add Expense</button>
            </PermissionGate>
          </div>
          {loadingExp ? <div className={styles.loadingRow}/> : (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead><tr>
                  <th>Exp. No.</th><th>Date</th><th>Category</th><th>Description</th>
                  <th>Payee</th><th>Mode</th><th>Amount</th><th>Bill No.</th>
                </tr></thead>
                <tbody>
                  {expenses.length === 0 ? (
                    <tr><td colSpan={8} className={styles.emptyCell}><div className={styles.emptyState}><TrendingDown size={48}/><p>No expenses recorded</p></div></td></tr>
                  ) : expenses.map(e => (
                    <tr key={e.id} className={styles.tr}>
                      <td className={styles.monoId}>{e.expense_number}</td>
                      <td>{new Date(e.expense_date).toLocaleDateString('en-IN')}</td>
                      <td><span className={styles.catBadge}>{e.category}</span></td>
                      <td className={styles.descCell}>{e.description}</td>
                      <td>{e.payee || '—'}</td>
                      <td><span className={styles.freqBadge}>{e.payment_mode}</span></td>
                      <td className={styles.amtTd}>{fmt(e.amount)}</td>
                      <td>{e.bill_number || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── CATEGORIES ─────────────────────────────────────── */}
      {section === 'categories' && (
        <div className={styles.catsContent}>
          <div className={styles.sectionToolbar}>
            <span className={styles.dateInfo}>{categories.length} categories</span>
            <PermissionGate permission="finance.manage">
              <button className={styles.primaryBtn} onClick={() => setShowCatModal(true)}><Plus size={15}/> Add Category</button>
            </PermissionGate>
          </div>
          <div className={styles.catGrid}>
            {categories.map(c => (
              <div key={c.id} className={styles.catCard}>
                <div className={styles.catCardName}>{c.name}</div>
                {c.name_marathi && <div className={styles.catCardMr}>{c.name_marathi}</div>}
                <div className={styles.catMeta}>
                  <span className={styles.freqBadge}>{c.frequency}</span>
                  {c.is_mandatory && <span className={styles.mandBadge}>Mandatory</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ════ Expense Modal ════ */}
      {showExpModal && (
        <div className={styles.overlay} onClick={() => setShowExpModal(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Record Expense</h3>
              <button className={styles.modalClose} onClick={() => setShowExpModal(false)}><X size={16}/></button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.mfRow}>
                <div className={styles.mf}><label className={styles.ml}>Date *</label><input type="date" className={styles.mi} value={newExp.expense_date} onChange={e => setNewExp(p => ({ ...p, expense_date: e.target.value }))}/></div>
                <div className={styles.mf}><label className={styles.ml}>Category *</label>
                  <select className={styles.mi} value={newExp.category} onChange={e => setNewExp(p => ({ ...p, category: e.target.value }))}>
                    {EXPENSE_CATS.map(c=><option key={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div className={styles.mf}><label className={styles.ml}>Description *</label><input className={styles.mi} value={newExp.description} onChange={e => setNewExp(p => ({ ...p, description: e.target.value }))} placeholder="Brief description"/></div>
              <div className={styles.mfRow}>
                <div className={styles.mf}><label className={styles.ml}>Amount (₹) *</label><input type="number" className={styles.mi} value={newExp.amount} onChange={e => setNewExp(p => ({ ...p, amount: e.target.value }))} placeholder="0.00"/></div>
                <div className={styles.mf}><label className={styles.ml}>Payment Mode</label>
                  <select className={styles.mi} value={newExp.payment_mode} onChange={e => setNewExp(p => ({ ...p, payment_mode: e.target.value }))}>
                    {PAYMENT_MODES.map(m=><option key={m}>{m}</option>)}
                  </select>
                </div>
              </div>
              <div className={styles.mfRow}>
                <div className={styles.mf}><label className={styles.ml}>Payee</label><input className={styles.mi} value={newExp.payee} onChange={e => setNewExp(p => ({ ...p, payee: e.target.value }))} placeholder="Vendor/person name"/></div>
                <div className={styles.mf}><label className={styles.ml}>Bill Number</label><input className={styles.mi} value={newExp.bill_number} onChange={e => setNewExp(p => ({ ...p, bill_number: e.target.value }))} placeholder="Invoice/Bill no."/></div>
              </div>
              <div className={styles.mf}><label className={styles.ml}>Remarks</label><input className={styles.mi} value={newExp.remarks} onChange={e => setNewExp(p => ({ ...p, remarks: e.target.value }))} placeholder="Optional"/></div>
            </div>
            <div className={styles.modalFooter}>
              <button className={styles.cancelBtn} onClick={() => setShowExpModal(false)}>Cancel</button>
              <button className={styles.submitBtn} onClick={saveExpense} disabled={savingExp}>{savingExp ? <span className={styles.spin}/> : <Check size={14}/>} Save</button>
            </div>
          </div>
        </div>
      )}

      {/* ════ Category Modal ════ */}
      {showCatModal && (
        <div className={styles.overlay} onClick={() => setShowCatModal(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Add Fee Category</h3>
              <button className={styles.modalClose} onClick={() => setShowCatModal(false)}><X size={16}/></button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.mf}><label className={styles.ml}>Category Name *</label><input className={styles.mi} value={newCat.name} onChange={e => setNewCat(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Tuition Fee"/></div>
              <div className={styles.mf}><label className={styles.ml}>Marathi Name</label><input className={styles.mi} value={newCat.name_marathi} onChange={e => setNewCat(p => ({ ...p, name_marathi: e.target.value }))} placeholder="मराठीत नाव"/></div>
              <div className={styles.mf}><label className={styles.ml}>Frequency</label>
                <select className={styles.mi} value={newCat.frequency} onChange={e => setNewCat(p => ({ ...p, frequency: e.target.value }))}>
                  {['annual','half_yearly','quarterly','monthly','one_time'].map(f=><option key={f} value={f}>{f.replace('_',' ')}</option>)}
                </select>
              </div>
              <label className={styles.checkRow}><input type="checkbox" checked={newCat.is_mandatory} onChange={e => setNewCat(p => ({ ...p, is_mandatory: e.target.checked }))}/> Mandatory fee</label>
            </div>
            <div className={styles.modalFooter}>
              <button className={styles.cancelBtn} onClick={() => setShowCatModal(false)}>Cancel</button>
              <button className={styles.submitBtn} onClick={saveCat} disabled={savingCat}>{savingCat ? <span className={styles.spin}/> : <Check size={14}/>} Add</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
