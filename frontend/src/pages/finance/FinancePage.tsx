import { useState, useEffect, useCallback } from 'react';
import {
  IndianRupee, TrendingUp, TrendingDown, Users, AlertTriangle,
  Plus, Search, RefreshCw, Check, X, Printer, Download,
  CreditCard, Wallet, ChevronDown, ChevronUp, Receipt,
  BookOpen, BarChart3, ArrowUpRight, ArrowDownRight, User,
  FileText, Calendar, Filter,
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
const CURRENT_AY = 1; // Dynamic from settings

const fmt = (n: number) => `₹${Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

export default function FinancePage() {
  const [section, setSection] = useState<Section>('dashboard');
  const [stats, setStats] = useState<FinanceStats | null>(null);
  const [categories, setCategories] = useState<FeeCategory[]>([]);

  // Fee Collection
  const [searchGr, setSearchGr] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [feeSummary, setFeeSummary] = useState<StudentFeeSummary | null>(null);
  const [paymentHistoryList, setPaymentHistoryList] = useState<FeePayment[]>([]);
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
  const [selectedReceiptForPrint, setSelectedReceiptForPrint] = useState<FeePayment | null>(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);

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

  // Installment Modal
  const [showInstModal, setShowInstModal] = useState(false);
  const [instName, setInstName] = useState('Installment 1');
  const [instAmount, setInstAmount] = useState('');
  const [instDueDate, setInstDueDate] = useState('');
  const [instRemarks, setInstRemarks] = useState('');
  const [savingInst, setSavingInst] = useState(false);
  const [studentInstallments, setStudentInstallments] = useState<any[]>([]);

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

  // Auto-load default student on collection tab open if empty
  useEffect(() => {
    if (section === 'collection' && !feeSummary && !loadingFees) {
      searchStudentFees(1);
    }
  }, [section]);

  // Search student fees by GR number or Name or ID
  const searchStudentFees = async (overrideStudentId?: number) => {
    const term = searchGr.trim();
    if (!overrideStudentId && !term) { toast.error('Enter GR number, Student Name, or Student ID.'); return; }
    setLoadingFees(true); setFeeSummary(null); setSelectedRecords([]); setSearchResults([]);
    try {
      let targetId = overrideStudentId;
      if (!targetId) {
        if (/^\d+$/.test(term)) {
          targetId = parseInt(term);
        } else {
          const results = await financeService.searchStudents(term);
          if (results.length === 1) {
            targetId = results[0].id;
          } else if (results.length > 1) {
            setSearchResults(results);
            toast(`Found ${results.length} matching students. Select one below.`, { icon: '🔍' });
            return;
          } else {
            toast.error('No student found with matching GR Number or Name.');
            return;
          }
        }
      }

      if (!targetId) {
        toast.error('Student ID missing.');
        return;
      }

      const summary = await financeService.getStudentFees(targetId, CURRENT_AY);
      setFeeSummary(summary);

      // Load payment history and installments for this student
      try {
        const [history, insts] = await Promise.all([
          financeService.getPaymentHistory(targetId, CURRENT_AY),
          financeService.getStudentInstallments(targetId, CURRENT_AY).catch(() => [])
        ]);
        setPaymentHistoryList(history);
        setStudentInstallments(insts);
      } catch {}

      if (summary.records.length === 0) toast('Fee records auto-generated for this student.');
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || 'Student not found.');
    } finally { setLoadingFees(false); }
  };

  const saveInstallment = async () => {
    if (!feeSummary || !instName || !instAmount || !instDueDate) {
      toast.error('Please enter installment name, amount, and due date.');
      return;
    }
    setSavingInst(true);
    try {
      await financeService.createStudentInstallment(feeSummary.student_id, {
        academic_year_id: CURRENT_AY,
        installment_name: instName,
        amount: Number(instAmount),
        due_date: instDueDate,
        remarks: instRemarks,
      });
      toast.success(`Installment '${instName}' created for ${feeSummary.student_name}!`);
      setShowInstModal(false);
      setInstName('Installment 2');
      setInstAmount('');
      setInstDueDate('');
      setInstRemarks('');
      const insts = await financeService.getStudentInstallments(feeSummary.student_id, CURRENT_AY);
      setStudentInstallments(insts);
    } catch {
      toast.error('Failed to create installment.');
    } finally {
      setSavingInst(false);
    }
  };

  const generateRecords = async () => {
    if (!feeSummary) return;
    try {
      const count = await financeService.generateFeeRecords(feeSummary.student_id, CURRENT_AY, feeSummary.standard);
      toast.success(`${count} fee records generated!`);
      searchStudentFees(feeSummary.student_id);
    } catch { toast.error('Failed to generate records.'); }
  };

  const toggleRecord = (id: number) => {
    setSelectedRecords(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const collectFee = async () => {
    if (!feeSummary || selectedRecords.length === 0) { toast.error('Select fee records to collect.'); return; }
    if (!payAmount || Number(payAmount) <= 0) { toast.error('Enter payment amount.'); return; }
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
      setSelectedReceiptForPrint(receipt);
      setShowReceiptModal(true);
      toast.success(`✅ Receipt ${receipt.receipt_number} generated!`);
      setPayAmount(''); setPayFine('0'); setPayConcession('0');
      setPayTxId(''); setPayRemarks('');
      setSelectedRecords([]);
      searchStudentFees(feeSummary.student_id); loadStats();
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || 'Collection failed.');
    } finally { setCollecting(false); }
  };

  const openReceiptPrint = (p: FeePayment) => {
    setSelectedReceiptForPrint(p);
    setShowReceiptModal(true);
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
          <p className={styles.pageSub}>शुल्क व्यवस्थापन · Fee Structure, Student Receipts &amp; Ledger</p>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <ExportButton label="Fee Collection Excel" format="excel" onExport={downloadFeeCollectionExcel} />
        </div>
      </div>

      {/* Tabs */}
      <div className={styles.tabBar}>
        {([
          { id: 'dashboard',  label: 'Dashboard',             icon: <BarChart3 size={14}/> },
          { id: 'collection', label: 'Student Fee & Receipts', icon: <Receipt size={14}/> },
          { id: 'structure',  label: 'Fee Structure',         icon: <BookOpen size={14}/> },
          { id: 'defaulters', label: 'Fee Defaulters',        icon: <AlertTriangle size={14}/> },
          { id: 'expenses',   label: 'Expenses Register',     icon: <TrendingDown size={14}/> },
          { id: 'categories', label: 'Fee Categories',        icon: <Plus size={14}/> },
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
          <div className={styles.kpiGrid}>
            {[
              { label: 'Total Fee Collected', value: fmt(stats.total_fee_collected), sub: `₹${Number(stats.collection_this_month).toLocaleString('en-IN')} this month`, icon: <TrendingUp size={20}/>, color: 'var(--color-success)', action: () => setSection('collection') },
              { label: 'Total Fee Due',       value: fmt(stats.total_fee_due),       sub: 'for current academic year', icon: <IndianRupee size={20}/>, color: 'var(--color-primary)' },
              { label: 'Pending Dues 🔴',    value: fmt(stats.pending_amount),       sub: `${stats.defaulter_count} defaulter students`, icon: <AlertTriangle size={20}/>, color: 'var(--color-danger)', action: () => setSection('defaulters') },
              { label: 'Total Concessions',   value: fmt(stats.total_concessions),   sub: 'discounts granted', icon: <Wallet size={20}/>, color: 'var(--color-warning)' },
              { label: 'Total Expenses',      value: fmt(stats.total_expenses),      sub: `₹${Number(stats.expense_this_month).toLocaleString('en-IN')} this month`, icon: <TrendingDown size={20}/>, color: 'var(--color-danger)', action: () => setSection('expenses') },
              { label: 'Net Balance',         value: fmt(stats.net_balance),         sub: 'Collected - Expenses', icon: <CreditCard size={20}/>, color: stats.net_balance >= 0 ? 'var(--color-success)' : 'var(--color-danger)' },
            ].map(k => (
              <div key={k.label} className={`${styles.kpiCard} ${k.action ? styles.kpiClickable : ''}`}
                   style={{ '--kc': k.color } as React.CSSProperties} onClick={k.action}>
                <div style={{ color: k.color }}>{k.icon}</div>
                <div className={styles.kpiVal}>{k.value}</div>
                <div className={styles.kpiLabel}>{k.label}</div>
                <div className={styles.kpiSub}>{k.sub}</div>
              </div>
            ))}
          </div>

          <div className={styles.collectionProgress}>
            <div className={styles.progressHeader}>
              <span>Fee Collection Rate</span>
              <span>{stats.total_fee_due > 0 ? ((stats.total_fee_collected / stats.total_fee_due) * 100).toFixed(1) : 0}%</span>
            </div>
            <div className={styles.progressBar}>
              <div className={styles.progressFill}
                style={{ width: `${stats.total_fee_due > 0 ? Math.min((stats.total_fee_collected / stats.total_fee_due) * 100, 100) : 0}%` }} />
            </div>
            <div className={styles.progressLegend}>
              <span className={styles.legendSuccess}>■ Collected: {fmt(stats.total_fee_collected)}</span>
              <span className={styles.legendDanger}>■ Pending: {fmt(stats.pending_amount)}</span>
              <span className={styles.legendMuted}>■ Concessions: {fmt(stats.total_concessions)}</span>
            </div>
          </div>
        </div>
      )}

      {/* ── STUDENT FEE & RECEIPTS ────────────────────────────── */}
      {section === 'collection' && (
        <div className={styles.collectionLayout}>
          {/* Left — Student Search & Fee Summary */}
          <div className={styles.collectionLeft}>
            <div className={styles.panel}>
              <h3 className={styles.panelTitle}><Search size={15}/> Student Fee Lookup (विद्यार्थी शुल्क शोध)</h3>
              <div className={styles.searchRow}>
                <input
                  className={styles.input}
                  placeholder="Enter GR Number, Student Name, or Student ID..."
                  value={searchGr}
                  onChange={e => setSearchGr(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && searchStudentFees()}
                />
                <button className={styles.primaryBtn} onClick={() => searchStudentFees()} disabled={loadingFees}>
                  {loadingFees ? <span className={styles.spin}/> : <Search size={15}/>} Search
                </button>
              </div>

              {/* Quick Student Shortcuts */}
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8, alignItems: 'center' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 700 }}>Quick Search:</span>
                <button className={styles.secondaryBtn} style={{ fontSize: '0.75rem', padding: '3px 8px' }} onClick={() => { setSearchGr('GR-2024-001'); searchStudentFees(1); }}>
                  👤 Aditya Shinde (GR-2024-001)
                </button>
                <button className={styles.secondaryBtn} style={{ fontSize: '0.75rem', padding: '3px 8px' }} onClick={() => { setSearchGr('Aarav'); searchStudentFees(); }}>
                  👤 Aarav Kulkarni
                </button>
                <button className={styles.secondaryBtn} style={{ fontSize: '0.75rem', padding: '3px 8px' }} onClick={() => { setSearchGr('1'); searchStudentFees(1); }}>
                  🆔 ID #1 (Std 9-A)
                </button>
              </div>

              {/* Search Results Dropdown / Picker */}
              {searchResults.length > 0 && (
                <div className={styles.searchResultsBox}>
                  <div className={styles.searchResultTitle}>Select Student:</div>
                  {searchResults.map(s => (
                    <div key={s.id} className={styles.searchResultItem} onClick={() => searchStudentFees(s.id)}>
                      <div>
                        <strong>{s.full_name}</strong> (GR: {s.gr_number})
                      </div>
                      <span className={styles.stdBadge}>Std {s.standard}{s.division}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {feeSummary && (
              <>
                {/* Student Profile Card */}
                <div className={styles.studentPanel}>
                  <div className={styles.studentPanelTop}>
                    <div className={styles.studentAvatar}>{feeSummary.student_name.charAt(0)}</div>
                    <div>
                      <div className={styles.studentPanelName}>{feeSummary.student_name}</div>
                      <div className={styles.studentPanelMeta}>
                        GR Number: <strong>{feeSummary.gr_number}</strong> · Class: <strong>Std {feeSummary.standard} - {feeSummary.division || 'A'}</strong>
                      </div>
                    </div>
                  </div>
                  <div className={styles.feeQuickStats}>
                    <div className={styles.fqs}><span>Total Fee</span><strong className={styles.fqsDue}>{fmt(feeSummary.total_due)}</strong></div>
                    <div className={styles.fqs}><span>Paid</span><strong className={styles.fqsPaid}>{fmt(feeSummary.total_paid)}</strong></div>
                    <div className={styles.fqs}><span>Pending Balance</span><strong className={totalBalance > 0 ? styles.fqsDue : styles.fqsPaid}>{fmt(totalBalance)}</strong></div>
                  </div>
                </div>

                {/* Student Installment Schedule */}
                <div className={styles.panel}>
                  <div className={styles.panelTitleRow}>
                    <h3 className={styles.panelTitle}><Calendar size={15}/> Student Fee Installment Schedule</h3>
                    <button className={styles.genBtn} onClick={() => setShowInstModal(true)}>
                      <Plus size={13}/> Add Custom Installment
                    </button>
                  </div>
                  {studentInstallments.length === 0 ? (
                    <div className={styles.emptyMsg} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span>No custom installment schedule created yet for this student.</span>
                      <button className={styles.primaryBtn} style={{ fontSize: '0.8rem', padding: '4px 10px' }} onClick={() => setShowInstModal(true)}>
                        <Plus size={13}/> Create Installment
                      </button>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '12px 16px' }}>
                      {studentInstallments.map((inst: any) => (
                        <div key={inst.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: 'var(--color-surface-2)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
                          <div>
                            <strong>{inst.installment_name}</strong>
                            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: 2 }}>Due Date: {inst.due_date} {inst.remarks && `• ${inst.remarks}`}</div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <div style={{ textAlign: 'right' }}>
                              <strong style={{ display: 'block', fontSize: '0.9rem' }}>₹{inst.amount}</strong>
                              <span style={{ fontSize: '0.75rem', color: 'var(--color-success)' }}>Paid: ₹{inst.paid_amount}</span>
                            </div>
                            <span className={`${styles.tag} ${inst.status === 'paid' ? styles.tagSuccess : styles.tagWarning}`}>{inst.status?.toUpperCase()}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Assigned Fee Component Structure */}
                <div className={styles.panel}>
                  <div className={styles.panelTitleRow}>
                    <h3 className={styles.panelTitle}><IndianRupee size={15}/> Fee Components Breakdown</h3>
                    {feeSummary.records.length === 0 && (
                      <button className={styles.genBtn} onClick={generateRecords}>
                        <Plus size={13}/> Auto Generate
                      </button>
                    )}
                  </div>
                  {feeSummary.records.length === 0 ? (
                    <div className={styles.emptyMsg}>No fee records found. Click Auto Generate to assign standard fee structure.</div>
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

                {/* Student Payment History & Receipts List */}
                {paymentHistoryList.length > 0 && (
                  <div className={styles.panel}>
                    <h3 className={styles.panelTitle}><Receipt size={15}/> Payment History &amp; Receipts (पावती इतिहास)</h3>
                    <div className={styles.historyTableWrap}>
                      <table className={styles.historyTable}>
                        <thead>
                          <tr>
                            <th>Receipt #</th>
                            <th>Date</th>
                            <th>Mode</th>
                            <th style={{ textAlign: 'right' }}>Amount Paid</th>
                            <th style={{ textAlign: 'center' }}>Receipt</th>
                          </tr>
                        </thead>
                        <tbody>
                          {paymentHistoryList.map(p => (
                            <tr key={p.id}>
                              <td><strong className={styles.receiptCode}>{p.receipt_number}</strong></td>
                              <td>{new Date(p.payment_date).toLocaleDateString('en-IN')}</td>
                              <td><span className={styles.modeTag}>{p.payment_mode.toUpperCase()}</span></td>
                              <td style={{ textAlign: 'right', color: '#16a34a', fontWeight: 'bold' }}>{fmt(p.total_received)}</td>
                              <td style={{ textAlign: 'center' }}>
                                <button className={styles.printMiniBtn} onClick={() => openReceiptPrint(p)}>
                                  <Printer size={12}/> Print
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Right — Payment Form & Receipt Action */}
          <div className={styles.collectionRight}>
            <div className={styles.panel}>
              <h3 className={styles.panelTitle}><Receipt size={15}/> Collect Fee Payment</h3>

              {selectedRecords.length > 0 && (
                <div className={styles.selectedSummary}>
                  <span>{selectedRecords.length} component(s) selected</span>
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
                  <label className={styles.payLabel}>Amount to Pay (₹) *</label>
                  <input className={styles.input} type="number" value={payAmount} onChange={e => setPayAmount(e.target.value)} placeholder="Enter amount" />
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
                    <label className={styles.payLabel}>Transaction / Reference ID</label>
                    <input className={styles.input} value={payTxId} onChange={e => setPayTxId(e.target.value)} placeholder="UPI/Reference number"/>
                  </div>
                )}
                {(paymentMode === 'cheque' || paymentMode === 'dd') && (
                  <div className={styles.payField}>
                    <label className={styles.payLabel}>Cheque / DD Number</label>
                    <input className={styles.input} value={payTxId} onChange={e => setPayTxId(e.target.value)} placeholder="Instrument number"/>
                  </div>
                )}
                <div className={styles.payField}>
                  <label className={styles.payLabel}>Remarks / Note</label>
                  <input className={styles.input} value={payRemarks} onChange={e => setPayRemarks(e.target.value)} placeholder="e.g. Paid by father"/>
                </div>

                {payAmount && (
                  <div className={styles.totalRow}>
                    <span>Net Amount Received:</span>
                    <strong className={styles.totalAmt}>{fmt(Math.max(0, Number(payAmount) + Number(payFine || 0) - Number(payConcession || 0)))}</strong>
                  </div>
                )}

                <button
                  className={styles.collectBtn}
                  onClick={collectFee}
                  disabled={collecting || !feeSummary || selectedRecords.length === 0}
                >
                  {collecting ? <span className={styles.spin}/> : <IndianRupee size={16}/>}
                  {collecting ? 'Processing...' : 'Collect & Issue Receipt'}
                </button>
              </div>
            </div>

            {/* Last Receipt Preview */}
            {lastReceipt && (
              <div className={styles.receiptPreview}>
                <div className={styles.receiptHeader}>
                  <Receipt size={16} className={styles.receiptIcon}/>
                  <span>Receipt Generated Successfully!</span>
                </div>
                <div className={styles.receiptNo}>{lastReceipt.receipt_number}</div>
                <div className={styles.receiptAmt}>{fmt(lastReceipt.total_received)}</div>
                <div className={styles.receiptMeta}>
                  {new Date(lastReceipt.payment_date).toLocaleDateString('en-IN')} · {lastReceipt.payment_mode.toUpperCase()}
                </div>
                <button className={styles.printBtn} onClick={() => openReceiptPrint(lastReceipt)}>
                  <Printer size={14}/> Print Fee Receipt
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
                  </tr>
                </thead>
                <tbody>
                  {categories.filter(c => c.is_active).map(cat => {
                    const existing = feeStructures.find(f => f.category_id === cat.id);
                    return (
                      <tr key={cat.id} className={styles.structRow}>
                        <td>
                          <strong>{cat.name}</strong>
                          {cat.name_marathi && <span className={styles.catMr}> ({cat.name_marathi})</span>}
                        </td>
                        <td><span className={styles.tag}>{cat.frequency}</span></td>
                        <td>{cat.is_mandatory ? '✓ Yes' : 'Optional'}</td>
                        <td>
                          <input
                            type="number"
                            className={styles.structInput}
                            value={editingStruct[cat.id] ?? (existing ? String(existing.amount) : '')}
                            onChange={e => setEditingStruct({ ...editingStruct, [cat.id]: e.target.value })}
                            placeholder="0.00"
                          />
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

      {/* ── DEFAULTERS ────────────────────────────────────── */}
      {section === 'defaulters' && (
        <div className={styles.defaultersContent}>
          <div className={styles.toolbar}>
            <select className={styles.select} value={defaulterStd} onChange={e => setDefaulterStd(e.target.value)}>
              <option value="">All Standards</option>
              {STANDARDS.map(s => <option key={s} value={s}>Standard {s}</option>)}
            </select>
            <button className={styles.iconBtn} onClick={loadDefaulters}><RefreshCw size={14}/></button>
          </div>
          {loadingDefaulters ? <div className={styles.loadingRow}/> : (
            <div className={styles.tableCard}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>GR Number</th>
                    <th>Student Name</th>
                    <th>Standard</th>
                    <th>Mobile</th>
                    <th style={{ textAlign: 'right' }}>Total Due</th>
                    <th style={{ textAlign: 'right' }}>Paid</th>
                    <th style={{ textAlign: 'right' }}>Pending Balance</th>
                    <th style={{ textAlign: 'center' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {defaulters.length === 0 ? (
                    <tr><td colSpan={8} className={styles.emptyMsg}>No fee defaulters found. 🎉</td></tr>
                  ) : defaulters.map(d => (
                    <tr key={d.student_id} className={styles.tr}>
                      <td><code>{d.gr_number}</code></td>
                      <td><strong>{d.student_name}</strong></td>
                      <td>Std {d.standard}-{d.division || 'A'}</td>
                      <td>{d.contact_mobile || '—'}</td>
                      <td style={{ textAlign: 'right' }}>{fmt(d.total_due)}</td>
                      <td style={{ textAlign: 'right', color: '#16a34a' }}>{fmt(d.total_paid)}</td>
                      <td style={{ textAlign: 'right', color: '#dc2626', fontWeight: 'bold' }}>{fmt(d.balance)}</td>
                      <td style={{ textAlign: 'center' }}>
                        <button className={styles.collectMiniBtn} onClick={() => {
                          setSection('collection');
                          setSearchGr(d.gr_number);
                          setTimeout(() => searchStudentFees(d.student_id), 100);
                        }}>
                          Collect Dues
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── EXPENSES ──────────────────────────────────────── */}
      {section === 'expenses' && (
        <div className={styles.expensesContent}>
          <div className={styles.toolbar}>
            <button className={styles.primaryBtn} onClick={() => setShowExpModal(true)}>
              <Plus size={15}/> Record Expense
            </button>
            <button className={styles.iconBtn} onClick={loadExpenses}><RefreshCw size={14}/></button>
          </div>
          {loadingExp ? <div className={styles.loadingRow}/> : (
            <div className={styles.tableCard}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Expense #</th>
                    <th>Date</th>
                    <th>Category</th>
                    <th>Description</th>
                    <th>Payee / Vendor</th>
                    <th>Mode</th>
                    <th style={{ textAlign: 'right' }}>Amount (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  {expenses.length === 0 ? (
                    <tr><td colSpan={7} className={styles.emptyMsg}>No expense records found.</td></tr>
                  ) : expenses.map(e => (
                    <tr key={e.id} className={styles.tr}>
                      <td><code>{e.expense_number}</code></td>
                      <td>{new Date(e.expense_date).toLocaleDateString('en-IN')}</td>
                      <td><span className={styles.tag}>{e.category}</span></td>
                      <td>{e.description}</td>
                      <td>{e.payee || '—'}</td>
                      <td>{e.payment_mode.toUpperCase()}</td>
                      <td style={{ textAlign: 'right', fontWeight: 'bold', color: '#dc2626' }}>{fmt(e.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── CATEGORIES ────────────────────────────────────── */}
      {section === 'categories' && (
        <div className={styles.categoriesContent}>
          <div className={styles.toolbar}>
            <button className={styles.primaryBtn} onClick={() => setShowCatModal(true)}>
              <Plus size={15}/> Add Fee Category
            </button>
            <button className={styles.iconBtn} onClick={loadCategories}><RefreshCw size={14}/></button>
          </div>
          <div className={styles.tableCard}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Category Name</th>
                  <th>Marathi Name</th>
                  <th>Frequency</th>
                  <th>Mandatory</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {categories.map(c => (
                  <tr key={c.id} className={styles.tr}>
                    <td><strong>{c.name}</strong></td>
                    <td>{c.name_marathi || '—'}</td>
                    <td><span className={styles.tag}>{c.frequency}</span></td>
                    <td>{c.is_mandatory ? '✓ Mandatory' : 'Optional'}</td>
                    <td><span className={styles.tagSuccess}>Active</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── PRINT RECEIPT MODAL ────────────────────────────── */}
      {showReceiptModal && selectedReceiptForPrint && (
        <div className={styles.modalOverlay} onClick={() => setShowReceiptModal(false)}>
          <div className={`${styles.modal} ${styles.receiptModal}`} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader + ' ' + styles.noPrint}>
              <h3><Printer size={16}/> Official Fee Receipt Print Preview</h3>
              <div className={styles.headerActions}>
                <button className={styles.primaryPrintBtn} onClick={() => window.print()}><Printer size={14}/> Print Receipt (CTRL+P)</button>
                <button className={styles.closeBtn} onClick={() => setShowReceiptModal(false)}><X size={16}/></button>
              </div>
            </div>

            {/* Printable Fee Receipt Container */}
            <div className={styles.printableReceipt}>
              <div className={styles.receiptSchoolHeader}>
                <h1 className={styles.rSchoolName}>विद्यासेतू माध्यमिक व उच्च माध्यमिक विद्यालय</h1>
                <p className={styles.rSchoolSub}>शासकीय मान्यता क्र. SCH-2025/EX-884 · U-DISE: 27250100412 · पुणे, महाराष्ट्र</p>
                <div className={styles.rTitleBox}>अधिकृत शुल्क पावती (FEE RECEIPT)</div>
              </div>

              <div className={styles.rMetaGrid}>
                <div><strong>पावती क्र (Receipt No):</strong> <code>{selectedReceiptForPrint.receipt_number}</code></div>
                <div><strong>दिनांक (Date):</strong> {new Date(selectedReceiptForPrint.payment_date).toLocaleDateString('en-IN')}</div>
                <div><strong>विद्यार्थ्याचे नाव (Student):</strong> {feeSummary?.student_name || '—'}</div>
                <div><strong>जी.आर. क्र (GR No):</strong> {feeSummary?.gr_number || '—'}</div>
                <div><strong>इयत्ता व तुकडी (Class):</strong> Std {feeSummary?.standard || '-'}-{feeSummary?.division || 'A'}</div>
                <div><strong>भरणा प्रकार (Payment Mode):</strong> {selectedReceiptForPrint.payment_mode.toUpperCase()}</div>
              </div>

              <table className={styles.rTable}>
                <thead>
                  <tr>
                    <th>अ.क्र.</th>
                    <th>शुल्काचा प्रकार (Fee Component)</th>
                    <th style={{ textAlign: 'right' }}>रक्कम (Amount ₹)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>1</td>
                    <td>शाळा शुल्क / सत्र शुल्क भरणा (Fee Payment Entry)</td>
                    <td style={{ textAlign: 'right' }}><strong>{fmt(selectedReceiptForPrint.amount)}</strong></td>
                  </tr>
                  {selectedReceiptForPrint.late_fine > 0 && (
                    <tr>
                      <td>2</td>
                      <td>विलंब शुल्क (Late Fine)</td>
                      <td style={{ textAlign: 'right' }}>{fmt(selectedReceiptForPrint.late_fine)}</td>
                    </tr>
                  )}
                  {selectedReceiptForPrint.concession > 0 && (
                    <tr>
                      <td>3</td>
                      <td>सवलत / सूट (Concession)</td>
                      <td style={{ textAlign: 'right', color: '#16a34a' }}>-{fmt(selectedReceiptForPrint.concession)}</td>
                    </tr>
                  )}
                </tbody>
                <tfoot>
                  <tr className={styles.rTotalRow}>
                    <td colSpan={2} style={{ textAlign: 'right' }}><strong>एकूण प्राप्त रक्कम (Total Received Amount):</strong></td>
                    <td style={{ textAlign: 'right', fontSize: '1.1rem', color: '#16a34a' }}><strong>{fmt(selectedReceiptForPrint.total_received)}</strong></td>
                  </tr>
                </tfoot>
              </table>

              <div className={styles.rWordsRow}>
                <strong>रक्कम अक्षरी (Amount in Words):</strong> {selectedReceiptForPrint.total_received} Rupees Only.
              </div>

              <div className={styles.rFooterSign}>
                <div className={styles.rSigBox}>
                  <div className={styles.rSigLine}/>
                  <span>पालक / विद्यार्थ्याची स्वाक्षरी<br/>Parent Signature</span>
                </div>
                <div className={styles.rSigBox}>
                  <div className={styles.rSigLine}/>
                  <span>रोखपाल / लिपीक (शिक्षण संस्था)<br/>Clerk / Cashier Stamp &amp; Sign</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Record Expense Modal */}
      {showExpModal && (
        <div className={styles.modalOverlay} onClick={() => setShowExpModal(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>Record New Expense (खर्च नोंद)</h3>
              <button className={styles.closeBtn} onClick={() => setShowExpModal(false)}><X size={16}/></button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.mfRow}>
                <div className={styles.mf}><label className={styles.ml}>Date</label><input type="date" className={styles.mi} value={newExp.expense_date} onChange={e => setNewExp(p => ({ ...p, expense_date: e.target.value }))}/></div>
                <div className={styles.mf}><label className={styles.ml}>Category</label>
                  <select className={styles.mi} value={newExp.category} onChange={e => setNewExp(p => ({ ...p, category: e.target.value }))}>
                    {EXPENSE_CATS.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div className={styles.mf}><label className={styles.ml}>Description *</label><input className={styles.mi} value={newExp.description} onChange={e => setNewExp(p => ({ ...p, description: e.target.value }))} placeholder="Electricity bill / Maintenance work"/></div>
              <div className={styles.mfRow}>
                <div className={styles.mf}><label className={styles.ml}>Amount (₹) *</label><input type="number" className={styles.mi} value={newExp.amount} onChange={e => setNewExp(p => ({ ...p, amount: e.target.value }))}/></div>
                <div className={styles.mf}><label className={styles.ml}>Payment Mode</label>
                  <select className={styles.mi} value={newExp.payment_mode} onChange={e => setNewExp(p => ({ ...p, payment_mode: e.target.value }))}>
                    {PAYMENT_MODES.map(m => <option key={m} value={m}>{m.toUpperCase()}</option>)}
                  </select>
                </div>
              </div>
              <div className={styles.mfRow}>
                <div className={styles.mf}><label className={styles.ml}>Payee / Vendor</label><input className={styles.mi} value={newExp.payee} onChange={e => setNewExp(p => ({ ...p, payee: e.target.value }))}/></div>
                <div className={styles.mf}><label className={styles.ml}>Bill / Invoice Number</label><input className={styles.mi} value={newExp.bill_number} onChange={e => setNewExp(p => ({ ...p, bill_number: e.target.value }))}/></div>
              </div>
            </div>
            <div className={styles.modalFooter}>
              <button className={styles.cancelBtn} onClick={() => setShowExpModal(false)}>Cancel</button>
              <button className={styles.saveBtn} onClick={saveExpense} disabled={savingExp}>{savingExp ? <span className={styles.spin}/> : <Check size={14}/>} Record Expense</button>
            </div>
          </div>
        </div>
      )}

      {/* Fee Category Modal */}
      {showCatModal && (
        <div className={styles.modalOverlay} onClick={() => setShowCatModal(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>Add Fee Category (शुल्क प्रकार)</h3>
              <button className={styles.closeBtn} onClick={() => setShowCatModal(false)}><X size={16}/></button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.mf}><label className={styles.ml}>Category Name (English) *</label><input className={styles.mi} value={newCat.name} onChange={e => setNewCat(p => ({ ...p, name: e.target.value }))} placeholder="Tuition Fee / Development Fee"/></div>
              <div className={styles.mf}><label className={styles.ml}>Category Name (Marathi)</label><input className={styles.mi} value={newCat.name_marathi} onChange={e => setNewCat(p => ({ ...p, name_marathi: e.target.value }))} placeholder="शिक्षण शुल्क / विकास शुल्क"/></div>
              <div className={styles.mfRow}>
                <div className={styles.mf}><label className={styles.ml}>Frequency</label>
                  <select className={styles.mi} value={newCat.frequency} onChange={e => setNewCat(p => ({ ...p, frequency: e.target.value }))}>
                    <option value="annual">Annual (वार्षिक)</option>
                    <option value="term">Term (सत्रनिहाय)</option>
                    <option value="monthly">Monthly (मासिक)</option>
                    <option value="one_time">One Time (एकदाच)</option>
                  </select>
                </div>
                <div className={styles.mf}><label className={styles.ml}>Mandatory?</label>
                  <select className={styles.mi} value={newCat.is_mandatory ? 'yes' : 'no'} onChange={e => setNewCat(p => ({ ...p, is_mandatory: e.target.value === 'yes' }))}>
                    <option value="yes">Mandatory</option>
                    <option value="no">Optional</option>
                  </select>
                </div>
              </div>
            </div>
            <div className={styles.modalFooter}>
              <button className={styles.cancelBtn} onClick={() => setShowCatModal(false)}>Cancel</button>
              <button className={styles.saveBtn} onClick={saveCat} disabled={savingCat}>{savingCat ? <span className={styles.spin}/> : <Check size={14}/>} Add Category</button>
            </div>
          </div>
        </div>
      )}

      {/* Installment Creation Modal */}
      {showInstModal && (
        <div className={styles.modalOverlay} onClick={() => setShowInstModal(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>Add Student Fee Installment (हप्ता नियोजन)</h3>
              <button className={styles.closeBtn} onClick={() => setShowInstModal(false)}><X size={16}/></button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.mf}>
                <label className={styles.ml}>Student Name</label>
                <input className={styles.mi} value={feeSummary?.student_name || 'Selected Student'} disabled />
              </div>
              <div className={styles.mf}>
                <label className={styles.ml}>Installment Name *</label>
                <input className={styles.mi} value={instName} onChange={e => setInstName(e.target.value)} placeholder="e.g. Installment 1 (Term 1)" />
              </div>
              <div className={styles.mfRow}>
                <div className={styles.mf}>
                  <label className={styles.ml}>Installment Amount (₹) *</label>
                  <input type="number" className={styles.mi} value={instAmount} onChange={e => setInstAmount(e.target.value)} placeholder="e.g. 10000" />
                </div>
                <div className={styles.mf}>
                  <label className={styles.ml}>Due Date *</label>
                  <input type="date" className={styles.mi} value={instDueDate} onChange={e => setInstDueDate(e.target.value)} />
                </div>
              </div>
              <div className={styles.mf}>
                <label className={styles.ml}>Remarks / Notes</label>
                <input className={styles.mi} value={instRemarks} onChange={e => setInstRemarks(e.target.value)} placeholder="Optional note for student/parent..." />
              </div>
            </div>
            <div className={styles.modalFooter}>
              <button className={styles.cancelBtn} onClick={() => setShowInstModal(false)}>Cancel</button>
              <button className={styles.saveBtn} onClick={saveInstallment} disabled={savingInst}>
                {savingInst ? <span className={styles.spin}/> : <Check size={14}/>} Save Installment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
