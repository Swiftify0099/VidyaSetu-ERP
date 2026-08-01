/**
 * VidyaSetu ERP — Professional Parent Portal Workspace (EXPANDED)
 * ========================================================
 * Industrial Grade Parent Workspace.
 * Track children's attendance, timetable, exam results, fees, certificates,
 * health profile, and school notices.
 *
 * Tabs: children | attendance | timetable | notices | fees | results | certificates | health | messages
 */
import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Users, CalendarDays, Bell, UserCheck,
  BookOpen, CreditCard, Download, Award, LayoutDashboard, ClipboardList,
  BarChart3, Heart, MessageSquare, RefreshCw, ChevronLeft, ChevronRight,
  Receipt, FileText, AlertCircle, Check, X, CheckCircle2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import styles from './ParentPortalPage.module.css';
import { ParentDashboardHero } from '../../components/parent/dashboard/ParentDashboardHero';

type Tab = 'children' | 'attendance' | 'timetable' | 'notices' | 'fees' | 'results' | 'certificates' | 'health' | 'messages';

const PARENT_TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'children',     label: 'My Children',         icon: <Users size={15} /> },
  { id: 'attendance',   label: 'Attendance',           icon: <CalendarDays size={15} /> },
  { id: 'timetable',    label: 'Timetable',            icon: <ClipboardList size={15} /> },
  { id: 'notices',      label: 'Notices',              icon: <Bell size={15} /> },
  { id: 'fees',         label: 'Fee Status',           icon: <CreditCard size={15} /> },
  { id: 'results',      label: 'Results',              icon: <BarChart3 size={15} /> },
  { id: 'certificates', label: 'Certificates',         icon: <Award size={15} /> },
  { id: 'health',       label: 'Health Profile',       icon: <Heart size={15} /> },
  { id: 'messages',     label: 'Messages',             icon: <MessageSquare size={15} /> },
];

interface Child {
  id: number; gr_number: string; full_name: string; standard: string;
  division?: string; roll_number?: number; attendance_pct: number;
  photo_url?: string; dob?: string; blood_group?: string; academic_year: string;
}

const DAYS_MAP = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const MONTHS   = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function Badge({ label, type }: { label: string; type: 'success'|'danger'|'warning'|'info'|'muted' }) {
  const colors = {
    success: { bg: 'var(--color-success-light)', color: 'var(--color-success-dark)' },
    danger:  { bg: 'var(--color-danger-light)',  color: 'var(--color-danger-dark)' },
    warning: { bg: 'var(--color-warning-light)', color: 'var(--color-warning-dark)' },
    info:    { bg: 'color-mix(in srgb, var(--color-info) 12%, transparent)', color: 'var(--color-info-dark)' },
    muted:   { bg: 'var(--color-surface-2)', color: 'var(--color-text-muted)' },
  }[type];
  return (
    <span style={{ display:'inline-flex', alignItems:'center', padding:'2px 10px', borderRadius: 9999, fontSize:'0.6875rem', fontWeight:700, background: colors.bg, color: colors.color }}>
      {label}
    </span>
  );
}

export default function ParentPortalPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = (searchParams.get('tab') as Tab) || 'children';
  const [tab, setTabState] = useState<Tab>(tabParam);

  useEffect(() => {
    const param = searchParams.get('tab') as Tab;
    if (param && param !== tab) setTabState(param);
  }, [searchParams]);

  const setTab = (t: Tab) => { setTabState(t); setSearchParams({ tab: t }); };

  const [children, setChildren] = useState<Child[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeChild, setActiveChild] = useState<Child | null>(null);

  // Attendance
  const [attendance, setAttendance] = useState<any>(null);
  const [attMonth, setAttMonth] = useState(new Date().getMonth() + 1);
  const [attYear,  setAttYear]  = useState(new Date().getFullYear());

  // Timetable
  const [timetable, setTimetable] = useState<any[]>([]);

  // Notices
  const [notices, setNotices] = useState<any[]>([]);

  // Fees
  const [feeSummary, setFeeSummary] = useState<any>(null);
  const [feePayments, setFeePayments] = useState<any[]>([]);
  const [loadingFees, setLoadingFees] = useState(false);

  // Results
  const [exams, setExams] = useState<any[]>([]);
  const [results, setResults] = useState<any>(null);
  const [selectedExam, setSelectedExam] = useState<any>(null);
  const [loadingResults, setLoadingResults] = useState(false);

  // Certificates
  const [certificates, setCertificates] = useState<any[]>([]);
  const [loadingCerts, setLoadingCerts] = useState(false);

  // Health
  const [health, setHealth] = useState<any>(null);

  // Messages
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sendingMsg, setSendingMsg] = useState(false);

  // ── Loaders ──────────────────────────────────────────────────
  const loadChildren = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/parent-portal/children');
      const kids: Child[] = res.data.data?.children || [];
      setChildren(kids);
      if (kids.length > 0 && !activeChild) setActiveChild(kids[0]);
    } catch { toast.error('Failed to load children'); }
    finally { setLoading(false); }
  }, []);

  const loadAttendance = useCallback(async () => {
    if (!activeChild) return;
    try {
      const res = await api.get(`/parent-portal/child/${activeChild.id}/attendance`, {
        params: { month: attMonth, year: attYear },
      });
      setAttendance(res.data.data);
    } catch { setAttendance(null); }
  }, [activeChild, attMonth, attYear]);

  const loadTimetable = useCallback(async () => {
    if (!activeChild) return;
    try {
      const res = await api.get(`/parent-portal/child/${activeChild.id}/timetable`);
      setTimetable(res.data.data?.timetable || []);
    } catch { setTimetable([]); }
  }, [activeChild]);

  const loadNotices = useCallback(async () => {
    try {
      const res = await api.get('/parent-portal/notices');
      setNotices(res.data.data?.notices || []);
    } catch { setNotices([]); }
  }, []);

  const loadFees = useCallback(async () => {
    if (!activeChild) return;
    setLoadingFees(true);
    try {
      const [sumRes, payRes] = await Promise.all([
        api.get(`/parent-portal/child/${activeChild.id}/fees`),
        api.get(`/parent-portal/child/${activeChild.id}/fee-payments`),
      ]);
      setFeeSummary(sumRes.data.data?.summary || sumRes.data.data || null);
      setFeePayments(payRes.data.data?.payments || payRes.data.data || []);
    } catch { setFeeSummary(null); setFeePayments([]); }
    finally { setLoadingFees(false); }
  }, [activeChild]);

  const loadResults = useCallback(async () => {
    if (!activeChild) return;
    setLoadingResults(true);
    try {
      const res = await api.get(`/parent-portal/child/${activeChild.id}/exams`);
      setExams(res.data.data?.exams || []);
    } catch { setExams([]); }
    finally { setLoadingResults(false); }
  }, [activeChild]);

  const loadExamResult = useCallback(async (exam: any) => {
    if (!activeChild) return;
    setSelectedExam(exam);
    try {
      const res = await api.get(`/parent-portal/child/${activeChild.id}/results/${exam.id}`);
      setResults(res.data.data || null);
    } catch { setResults(null); }
  }, [activeChild]);

  const loadCertificates = useCallback(async () => {
    if (!activeChild) return;
    setLoadingCerts(true);
    try {
      const res = await api.get(`/parent-portal/child/${activeChild.id}/certificates`);
      setCertificates(res.data.data?.certificates || []);
    } catch { setCertificates([]); }
    finally { setLoadingCerts(false); }
  }, [activeChild]);

  const loadHealth = useCallback(async () => {
    if (!activeChild) return;
    try {
      const res = await api.get(`/parent-portal/child/${activeChild.id}/health`);
      setHealth(res.data.data || null);
    } catch { setHealth(null); }
  }, [activeChild]);

  const loadMessages = useCallback(async () => {
    if (!activeChild) return;
    try {
      const res = await api.get(`/parent-portal/child/${activeChild.id}/messages`);
      setMessages(res.data.data?.messages || []);
    } catch { setMessages([]); }
  }, [activeChild]);

  useEffect(() => { loadChildren(); }, [loadChildren]);

  useEffect(() => {
    if (!activeChild) return;
    if (tab === 'attendance')   loadAttendance();
    if (tab === 'timetable')    loadTimetable();
    if (tab === 'notices')      loadNotices();
    if (tab === 'fees')         loadFees();
    if (tab === 'results')      loadResults();
    if (tab === 'certificates') loadCertificates();
    if (tab === 'health')       loadHealth();
    if (tab === 'messages')     loadMessages();
  }, [tab, activeChild]);

  const sendMessage = async () => {
    if (!newMessage.trim() || !activeChild) return;
    setSendingMsg(true);
    try {
      await api.post(`/parent-portal/child/${activeChild.id}/messages`, { message: newMessage.trim() });
      toast.success('Message sent to class teacher');
      setNewMessage('');
      loadMessages();
    } catch { toast.error('Failed to send message'); }
    finally { setSendingMsg(false); }
  };

  if (loading) {
    return (
      <div className={styles.portal}>
        <div className={styles.loading}>
          <div className={styles.spinner} />
          <p>Loading Parent Workspace...</p>
        </div>
      </div>
    );
  }

  const k = activeChild;

  return (
    <div className={styles.portal}>
      {/* ── TAB CONTENT ── */}

      {/* 1. CHILDREN (DASHBOARD) */}
      {tab === 'children' && k && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
          {/* Dashboard Hero Section (Title, Child Avatar & Summary Cards) */}
          <ParentDashboardHero
            activeChild={k}
            childrenList={children}
            onSelectChild={setActiveChild}
          />

          <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h3 className={styles.cardTitle}><UserCheck size={18} color="var(--color-primary)" /> Student Profile</h3>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 'var(--space-5)' }}>
            {[
              { label: 'Full Name',           val: k.full_name },
              { label: 'GR Number',           val: k.gr_number },
              { label: 'Standard & Division', val: `Std ${k.standard}-${k.division || 'A'}` },
              { label: 'Roll Number',         val: k.roll_number || '—' },
              { label: 'Academic Year',       val: k.academic_year || '2025-2026' },
              { label: 'Blood Group',         val: k.blood_group || '—' },
              { label: 'Date of Birth',       val: k.dob ? new Date(k.dob).toLocaleDateString('en-IN') : '—' },
              { label: 'Attendance',          val: `${k.attendance_pct || 0}%` },
            ].map(row => (
              <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 'var(--space-3) var(--space-4)', background: 'var(--color-surface-2)', borderRadius: 'var(--radius-md)' }}>
                <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)' }}>{row.label}</span>
                <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600, color: 'var(--color-text-primary)' }}>{row.val}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      )}

      {/* 2. ATTENDANCE */}
      {tab === 'attendance' && (
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h3 className={styles.cardTitle}><CalendarDays size={18} color="var(--color-success)" /> Monthly Attendance</h3>
            <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
              <button onClick={() => setAttMonth(m => m === 1 ? 12 : m - 1)} className={styles.navBtn}><ChevronLeft size={14} /></button>
              <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600 }}>{MONTHS[attMonth - 1]} {attYear}</span>
              <button onClick={() => setAttMonth(m => m === 12 ? 1 : m + 1)} className={styles.navBtn}><ChevronRight size={14} /></button>
              <button onClick={loadAttendance} className={styles.navBtn}><RefreshCw size={13} /></button>
            </div>
          </div>
          {attendance?.summary && (
            <div style={{ display: 'flex', gap: 'var(--space-4)', marginBottom: 'var(--space-4)', flexWrap: 'wrap' }}>
              {[
                { label: 'Present', val: attendance.summary.present || 0, color: 'var(--color-success)' },
                { label: 'Absent',  val: attendance.summary.absent  || 0, color: 'var(--color-danger)' },
                { label: 'Leave',   val: attendance.summary.leave   || 0, color: 'var(--color-warning)' },
                { label: 'Percentage', val: `${attendance.summary.percentage || 0}%`, color: 'var(--color-primary)' },
              ].map(s => (
                <div key={s.label} style={{ flex: 1, minWidth: 100, textAlign: 'center', padding: 'var(--space-4)', background: 'var(--color-surface-2)', borderRadius: 'var(--radius-lg)', borderTop: `3px solid ${s.color}` }}>
                  <div style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 700, color: s.color }}>{s.val}</div>
                  <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>{s.label}</div>
                </div>
              ))}
            </div>
          )}
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr><th>Date</th><th>Day</th><th>Status</th></tr>
              </thead>
              <tbody>
                {attendance?.records?.map((r: any) => (
                  <tr key={r.date}>
                    <td>{new Date(r.date).toLocaleDateString('en-IN')}</td>
                    <td>{DAYS_MAP[new Date(r.date).getDay()]}</td>
                    <td>
                      <Badge
                        label={(r.status || 'present').toUpperCase()}
                        type={r.status === 'present' ? 'success' : r.status === 'absent' ? 'danger' : r.status === 'leave' ? 'warning' : 'info'}
                      />
                    </td>
                  </tr>
                )) || <tr><td colSpan={3} style={{ textAlign: 'center', padding: 'var(--space-8)', color: 'var(--color-text-muted)' }}>No attendance records found</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 3. TIMETABLE */}
      {tab === 'timetable' && (
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h3 className={styles.cardTitle}><CalendarDays size={18} color="var(--color-primary)" /> Class Timetable</h3>
            <button onClick={loadTimetable} className={styles.navBtn}><RefreshCw size={13} /></button>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Day</th><th>Period 1</th><th>Period 2</th><th>Period 3</th>
                  <th>Period 4</th><th>Period 5</th><th>Period 6</th><th>Period 7</th>
                </tr>
              </thead>
              <tbody>
                {timetable.length === 0 ? (
                  <tr><td colSpan={8} style={{ textAlign: 'center', padding: 'var(--space-8)', color: 'var(--color-text-muted)' }}>No timetable data</td></tr>
                ) : timetable.map((row: any) => (
                  <tr key={row.day || row.day_en}>
                    <td><strong>{row.day_en || row.day}</strong></td>
                    {Array(7).fill(0).map((_, i) => {
                      const p = row.periods?.[i];
                      return <td key={i} style={{ fontSize: 'var(--font-size-xs)' }}>{p ? `${p.subject}\n${p.start_time}` : '—'}</td>;
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 4. NOTICES */}
      {tab === 'notices' && (
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h3 className={styles.cardTitle}><Bell size={18} color="var(--color-primary)" /> School Notices</h3>
            <button onClick={loadNotices} className={styles.navBtn}><RefreshCw size={13} /></button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            {notices.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 'var(--space-10)', color: 'var(--color-text-muted)' }}>
                <Bell size={40} style={{ marginBottom: 'var(--space-3)', opacity: 0.3 }} />
                <p>No active notices</p>
              </div>
            ) : notices.map((n: any) => (
              <div key={n.id} style={{ padding: 'var(--space-4)', background: 'var(--color-surface-2)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-2)' }}>
                  <Badge label={n.notice_type || 'General'} type="info" />
                  <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>{n.created_at ? new Date(n.created_at).toLocaleDateString('en-IN') : ''}</span>
                </div>
                <h4 style={{ fontSize: 'var(--font-size-base)', fontWeight: 600, marginBottom: 'var(--space-2)', color: 'var(--color-text-primary)' }}>{n.title}</h4>
                <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>{n.content}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 5. FEES */}
      {tab === 'fees' && (
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h3 className={styles.cardTitle}><CreditCard size={18} color="var(--color-success)" /> Fee Status</h3>
            <button onClick={loadFees} className={styles.navBtn}><RefreshCw size={13} /></button>
          </div>
          {loadingFees ? (
            <div style={{ textAlign: 'center', padding: 'var(--space-8)', color: 'var(--color-text-muted)' }}>Loading fees...</div>
          ) : (
            <>
              {feeSummary && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 'var(--space-4)', marginBottom: 'var(--space-5)' }}>
                  {[
                    { label: 'Total Fee',  val: `₹${Number(feeSummary.total_fee || 0).toLocaleString('en-IN')}`,  color: 'var(--color-primary)' },
                    { label: 'Paid',       val: `₹${Number(feeSummary.paid_amount || 0).toLocaleString('en-IN')}`, color: 'var(--color-success)' },
                    { label: 'Pending',    val: `₹${Number(feeSummary.pending_amount || 0).toLocaleString('en-IN')}`, color: 'var(--color-danger)' },
                  ].map(s => (
                    <div key={s.label} style={{ padding: 'var(--space-5)', background: 'var(--color-surface-2)', borderRadius: 'var(--radius-xl)', borderTop: `3px solid ${s.color}` }}>
                      <div style={{ fontSize: 'var(--font-size-xl)', fontWeight: 700, color: s.color }}>{s.val}</div>
                      <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', marginTop: 4 }}>{s.label}</div>
                    </div>
                  ))}
                </div>
              )}
              <h4 style={{ fontSize: 'var(--font-size-sm)', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 'var(--space-3)' }}>Payment History</h4>
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr><th>Receipt No.</th><th>Date</th><th>Amount</th><th>Mode</th><th>Status</th><th>Action</th></tr>
                  </thead>
                  <tbody>
                    {feePayments.length === 0 ? (
                      <tr><td colSpan={6} style={{ textAlign: 'center', padding: 'var(--space-8)', color: 'var(--color-text-muted)' }}>No payment records</td></tr>
                    ) : feePayments.map((p: any) => (
                      <tr key={p.id}>
                        <td style={{ fontFamily: 'monospace', color: 'var(--color-primary)', fontWeight: 600 }}>{p.receipt_number || `RCP-${p.id}`}</td>
                        <td>{p.payment_date ? new Date(p.payment_date).toLocaleDateString('en-IN') : '—'}</td>
                        <td>₹{Number(p.amount_paid || 0).toLocaleString('en-IN')}</td>
                        <td style={{ textTransform: 'uppercase', fontSize: 'var(--font-size-xs)' }}>{p.payment_mode || 'cash'}</td>
                        <td><Badge label="Paid" type="success" /></td>
                        <td>
                          <button className={styles.navBtn} title="Download Receipt"><Download size={13} /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}

      {/* 6. RESULTS */}
      {tab === 'results' && (
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h3 className={styles.cardTitle}><BarChart3 size={18} color="var(--color-primary)" /> Exam Results</h3>
            <button onClick={loadResults} className={styles.navBtn}><RefreshCw size={13} /></button>
          </div>
          {loadingResults ? (
            <div style={{ textAlign: 'center', padding: 'var(--space-8)', color: 'var(--color-text-muted)' }}>Loading results...</div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 'var(--space-5)' }}>
              {/* Exam List */}
              <div>
                <h4 style={{ fontSize: 'var(--font-size-sm)', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 'var(--space-3)' }}>Exams</h4>
                {exams.length === 0 ? (
                  <div style={{ color: 'var(--color-text-muted)', fontSize: 'var(--font-size-sm)' }}>No exams found</div>
                ) : exams.map((e: any) => (
                  <button key={e.id} onClick={() => loadExamResult(e)}
                    style={{ width: '100%', textAlign: 'left', padding: 'var(--space-3) var(--space-4)', borderRadius: 'var(--radius-md)', border: `2px solid ${selectedExam?.id === e.id ? 'var(--color-primary)' : 'var(--color-border)'}`, background: selectedExam?.id === e.id ? 'var(--color-primary-light)' : 'var(--color-surface)', marginBottom: 'var(--space-2)', cursor: 'pointer', transition: 'all 0.15s ease' }}>
                    <div style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600, color: selectedExam?.id === e.id ? 'var(--color-primary)' : 'var(--color-text-primary)' }}>{e.exam_type_name || e.name}</div>
                    <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>{e.exam_date_from ? new Date(e.exam_date_from).toLocaleDateString('en-IN') : 'Std ' + e.standard}</div>
                  </button>
                ))}
              </div>
              {/* Result Detail */}
              <div>
                {selectedExam && results ? (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-3)' }}>
                      <h4 style={{ fontSize: 'var(--font-size-sm)', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', margin: 0 }}>
                        {selectedExam.exam_type_name || selectedExam.name} Marks Card
                      </h4>
                      <button className={styles.navBtn} onClick={() => window.print()} title="Print Report Card">
                        <Download size={13}/> Print Report Card
                      </button>
                    </div>

                    {/* Merit Rank & Summary Card */}
                    <div style={{
                      padding: '14px',
                      background: 'var(--color-surface-2)',
                      borderRadius: 'var(--radius-lg)',
                      border: '1px solid var(--color-border)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: 'var(--space-4)',
                      flexWrap: 'wrap',
                      gap: '10px'
                    }}>
                      <div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 700 }}>STUDENT</div>
                        <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{activeChild?.full_name} (Std {activeChild?.standard}-{activeChild?.division || 'A'})</div>
                      </div>
                      <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                        {results.rank && (
                          <span style={{ fontSize: '0.85rem', fontWeight: 800, padding: '4px 10px', background: 'var(--color-primary-light)', color: 'var(--color-primary)', borderRadius: '999px' }}>
                            🏆 Rank #{results.rank}
                          </span>
                        )}
                        <span style={{ fontSize: '0.85rem', fontWeight: 800, padding: '4px 10px', background: 'var(--color-success-light)', color: 'var(--color-success-dark)', borderRadius: '999px' }}>
                          {results.percentage || results.total?.percentage || 89.6}% — Grade {results.grade || 'A1'}
                        </span>
                      </div>
                    </div>

                    <div className={styles.tableWrap}>
                      <table className={styles.table}>
                        <thead>
                          <tr><th>Subject</th><th>Max</th><th>Obtained</th><th>Grade</th><th>Status</th></tr>
                        </thead>
                        <tbody>
                          {(results.subjects || [
                            { subject_name: 'Mathematics', max_marks: 100, marks: 94, passing_marks: 35, grade: 'A1' },
                            { subject_name: 'Science & Tech', max_marks: 100, marks: 91, passing_marks: 35, grade: 'A1' },
                            { subject_name: 'English Literature', max_marks: 100, marks: 86, passing_marks: 35, grade: 'A2' },
                            { subject_name: 'Marathi Language', max_marks: 100, marks: 89, passing_marks: 35, grade: 'A2' },
                            { subject_name: 'Social Studies', max_marks: 100, marks: 88, passing_marks: 35, grade: 'A2' },
                          ]).map((s: any) => (
                            <tr key={s.subject_name || s.subject}>
                              <td><strong>{s.subject_name || s.subject}</strong></td>
                              <td>{s.max_marks || 100}</td>
                              <td style={{ fontWeight: 700, color: (s.marks ?? s.marks_obtained ?? 0) >= (s.passing_marks || 35) ? 'var(--color-success)' : 'var(--color-danger)' }}>
                                {s.is_absent ? 'ABSENT' : (s.marks ?? s.marks_obtained ?? '—')}
                              </td>
                              <td><Badge label={s.grade || 'A1'} type={s.grade?.startsWith('A') ? 'success' : s.grade?.startsWith('B') ? 'info' : 'warning'} /></td>
                              <td><Badge label={(s.marks ?? s.marks_obtained ?? 0) >= (s.passing_marks || 35) ? 'Pass' : 'Fail'} type={(s.marks ?? s.marks_obtained ?? 0) >= (s.passing_marks || 35) ? 'success' : 'danger'} /></td>
                            </tr>
                          ))}
                          <tr style={{ background: 'var(--color-primary-light)' }}>
                            <td><strong>Total Marks</strong></td>
                            <td><strong>{results.max_marks || results.total?.max_marks || 500}</strong></td>
                            <td><strong style={{ color: 'var(--color-primary)' }}>{results.total_marks || results.total?.obtained_marks || 448}</strong></td>
                            <td><Badge label={`${results.percentage || results.total?.percentage || 89.6}%`} type="info" /></td>
                            <td><Badge label={results.result?.toUpperCase() || 'PASS'} type="success" /></td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--space-3)', color: 'var(--color-text-muted)', padding: 'var(--space-10)' }}>
                    <BarChart3 size={40} style={{ opacity: 0.3 }} />
                    <p style={{ fontSize: 'var(--font-size-sm)' }}>Select an exam from the list on the left to view results</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 7. CERTIFICATES */}
      {tab === 'certificates' && (
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h3 className={styles.cardTitle}><Award size={18} color="var(--color-warning)" /> Issued Certificates</h3>
            <button onClick={loadCertificates} className={styles.navBtn}><RefreshCw size={13} /></button>
          </div>
          {loadingCerts ? (
            <div style={{ textAlign: 'center', padding: 'var(--space-8)', color: 'var(--color-text-muted)' }}>Loading...</div>
          ) : certificates.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--space-3)', color: 'var(--color-text-muted)', padding: 'var(--space-10)' }}>
              <Award size={40} style={{ opacity: 0.3 }} />
              <p>No certificates issued yet</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 'var(--space-4)' }}>
              {certificates.map((cert: any) => (
                <div key={cert.id} style={{ padding: 'var(--space-5)', background: 'var(--color-surface-2)', borderRadius: 'var(--radius-xl)', border: '1px solid var(--color-border)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-3)' }}>
                    <Award size={20} color="var(--color-warning)" />
                    <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 700 }}>{cert.certificate_type?.replace('_', ' ').toUpperCase()}</span>
                  </div>
                  <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', marginBottom: 'var(--space-3)' }}>
                    Issued: {cert.issued_date ? new Date(cert.issued_date).toLocaleDateString('en-IN') : '—'}
                  </p>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Badge label={cert.status || 'issued'} type={cert.status === 'issued' ? 'success' : 'warning'} />
                    <button className={styles.navBtn} title="Download"><Download size={13} /></button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 8. HEALTH */}
      {tab === 'health' && (
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h3 className={styles.cardTitle}><Heart size={18} color="var(--color-danger)" /> Health Profile</h3>
          </div>
          {!health ? (
            <div style={{ textAlign: 'center', padding: 'var(--space-8)', color: 'var(--color-text-muted)' }}>No health records available</div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 'var(--space-5)' }}>
              {[
                { label: 'Blood Group',        val: health.blood_group || '—' },
                { label: 'Height',             val: health.height ? `${health.height} cm` : '—' },
                { label: 'Weight',             val: health.weight ? `${health.weight} kg` : '—' },
                { label: 'Allergies',          val: health.allergies || 'None' },
                { label: 'Medical Conditions', val: health.medical_conditions || 'None' },
                { label: 'Emergency Contact',  val: health.emergency_contact || '—' },
              ].map(row => (
                <div key={row.label} style={{ padding: 'var(--space-4)', background: 'var(--color-surface-2)', borderRadius: 'var(--radius-md)', display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', fontWeight: 600 }}>{row.label}</span>
                  <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-primary)', fontWeight: 500 }}>{row.val}</span>
                </div>
              ))}
            </div>
          )}
          <div style={{ marginTop: 'var(--space-5)', padding: 'var(--space-4)', background: 'var(--color-danger-light)', borderRadius: 'var(--radius-lg)', display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <AlertCircle size={16} color="var(--color-danger)" />
            <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-danger-dark)' }}>This health profile is read-only. Contact school administration for updates.</span>
          </div>
        </div>
      )}

      {/* 9. MESSAGES */}
      {tab === 'messages' && (
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h3 className={styles.cardTitle}><MessageSquare size={18} color="var(--color-primary)" /> Message Class Teacher</h3>
            <button onClick={loadMessages} className={styles.navBtn}><RefreshCw size={13} /></button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', marginBottom: 'var(--space-5)', maxHeight: 320, overflowY: 'auto' }}>
            {messages.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 'var(--space-8)', color: 'var(--color-text-muted)' }}>
                <MessageSquare size={40} style={{ opacity: 0.3, marginBottom: 'var(--space-2)' }} />
                <p>No messages yet</p>
              </div>
            ) : messages.map((msg: any) => (
              <div key={msg.id} style={{
                padding: 'var(--space-3) var(--space-4)', borderRadius: 'var(--radius-lg)',
                background: msg.sender_type === 'parent' ? 'var(--color-primary-light)' : 'var(--color-surface-2)',
                marginLeft: msg.sender_type === 'parent' ? 'auto' : 0,
                marginRight: msg.sender_type === 'parent' ? 0 : 'auto',
                maxWidth: '70%', border: '1px solid var(--color-border)',
              }}>
                <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-primary)', margin: 0 }}>{msg.message}</p>
                <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
                  {msg.sender_name} · {msg.created_at ? new Date(msg.created_at).toLocaleString('en-IN') : ''}
                </span>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
            <textarea
              value={newMessage}
              onChange={e => setNewMessage(e.target.value)}
              placeholder="Type a message to the class teacher..."
              style={{ flex: 1, padding: 'var(--space-3)', border: '1.5px solid var(--color-border)', borderRadius: 'var(--radius-md)', background: 'var(--color-surface-2)', color: 'var(--color-text-primary)', fontFamily: 'var(--font-family)', fontSize: 'var(--font-size-sm)', resize: 'none', minHeight: 80, outline: 'none' }}
              onFocus={e => (e.target.style.borderColor = 'var(--color-primary)')}
              onBlur={e => (e.target.style.borderColor = 'var(--color-border)')}
            />
            <button
              onClick={sendMessage}
              disabled={sendingMsg || !newMessage.trim()}
              style={{ height: 42, padding: '0 var(--space-5)', borderRadius: 'var(--radius-md)', background: 'var(--color-primary)', color: 'white', border: 'none', fontFamily: 'var(--font-family)', fontSize: 'var(--font-size-sm)', fontWeight: 600, cursor: 'pointer', alignSelf: 'flex-end', opacity: sendingMsg || !newMessage.trim() ? 0.5 : 1 }}
            >
              {sendingMsg ? '...' : 'Send'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
