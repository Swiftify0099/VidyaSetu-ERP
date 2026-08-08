/**
 * VidyaSetu ERP — Analytics & Intelligence Dashboard
 * =====================================================
 * Enterprise-grade school analytics powered entirely by real database data.
 * Every number, chart, and insight is sourced from actual ERP records.
 *
 * RULE: If data is unavailable, show "Insufficient data" — never invent.
 */
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart3, Users, GraduationCap, DollarSign, BookOpen, Package, Bell,
  AlertTriangle, TrendingUp, RefreshCw, Calendar, Percent, BookMarked,
  ShieldAlert, Lightbulb, ChevronRight, School, UserCheck,
  ClipboardList, BarChart2, Activity,
} from 'lucide-react';
import {
  analyticsService,
  type MasterDashboard, type StudentReport, type AttendanceReport,
  type AttendanceTrendReport, type LowAttendanceReport, type FeeReport,
  type FeeClassReport, type FeeOutstandingReport, type PaymentMethodReport,
  type AcademicReport, type ClassAnalyticsReport, type TeacherAnalyticsReport,
  type RiskReport, type InsightsReport, type LibraryReport, type InventoryReport,
} from '../../services/analyticsService';
import styles from './AnalyticsPage.module.css';

// ── Constants ──────────────────────────────────────────────────────────────
const TABS = [
  { id: 'overview',    label: 'Overview',    icon: <BarChart3 size={14}/> },
  { id: 'students',   label: 'Students',    icon: <GraduationCap size={14}/> },
  { id: 'attendance', label: 'Attendance',  icon: <Calendar size={14}/> },
  { id: 'finance',    label: 'Finance',     icon: <DollarSign size={14}/> },
  { id: 'academic',   label: 'Academic',    icon: <BookMarked size={14}/> },
  { id: 'classes',    label: 'Classes',     icon: <School size={14}/> },
  { id: 'teachers',   label: 'Staff',       icon: <UserCheck size={14}/> },
  { id: 'risk',       label: 'Risk',        icon: <ShieldAlert size={14}/> },
  { id: 'library',    label: 'Library',     icon: <BookOpen size={14}/> },
] as const;

type TabId = typeof TABS[number]['id'];

// ── Formatters ────────────────────────────────────────────────────────────
const fmtK = (n: number) => {
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(2)}Cr`;
  if (n >= 100000)   return `₹${(n / 100000).toFixed(1)}L`;
  if (n >= 1000)     return `₹${(n / 1000).toFixed(1)}K`;
  return `₹${n.toLocaleString('en-IN')}`;
};
const fmtN = (n: number) => n?.toLocaleString('en-IN') ?? '—';
const pctColor = (p: number) => p >= 85 ? 'var(--color-success)' : p >= 75 ? 'var(--color-warning)' : 'var(--color-danger)';
const feeColor = (p: number) => p >= 80 ? 'var(--color-success)' : p >= 60 ? 'var(--color-warning)' : 'var(--color-danger)';

// ── Sub-Components ────────────────────────────────────────────────────────

function NoData({ message = 'Insufficient data for this period.' }: { message?: string }) {
  return (
    <div className={styles.noData}>
      <ClipboardList size={32} opacity={0.3}/>
      <p>{message}</p>
    </div>
  );
}

function Spinner() {
  return <div className={styles.spinnerWrap}><div className={styles.spinner}/></div>;
}

function KpiCard({ icon, value, label, sub, color, onClick }: {
  icon: React.ReactNode; value: string | number; label: string;
  sub?: string; color?: string; onClick?: () => void;
}) {
  return (
    <div className={`${styles.kpiCard} ${onClick ? styles.kpiClickable : ''}`}
         style={{ '--kc': color || 'var(--color-primary)' } as React.CSSProperties}
         onClick={onClick}>
      <div className={styles.kpiIcon} style={{ color: color || 'var(--color-primary)' }}>{icon}</div>
      <div className={styles.kpiVal}>{value}</div>
      <div className={styles.kpiLabel}>{label}</div>
      {sub && <div className={styles.kpiSub}>{sub}</div>}
      {onClick && <ChevronRight size={14} className={styles.kpiArrow}/>}
    </div>
  );
}

function BarChart({ data, valueKey, labelKey, color = 'var(--color-primary)', formatVal }: {
  data: any[]; valueKey: string; labelKey: string; color?: string;
  formatVal?: (v: number) => string;
}) {
  const max = Math.max(...data.map(d => d[valueKey]), 1);
  return (
    <div className={styles.barChart}>
      {data.map((d, i) => (
        <div key={i} className={styles.barItem}>
          <div className={styles.barTrack}>
            <div className={styles.barFill}
              style={{ height: `${(d[valueKey] / max) * 100}%`, background: color, animationDelay: `${i * 50}ms` }}/>
          </div>
          <div className={styles.barLabel}>{d[labelKey]}</div>
          <div className={styles.barVal}>
            {formatVal ? formatVal(d[valueKey]) : (typeof d[valueKey] === 'number' && d[valueKey] > 999 ? fmtK(d[valueKey]) : d[valueKey])}
          </div>
        </div>
      ))}
    </div>
  );
}

function ProgressBar({ pct, label, sub, color }: { pct: number; label: string; sub?: string; color?: string }) {
  const c = color || pctColor(pct);
  return (
    <div className={styles.progRow}>
      <div className={styles.progLeft}>
        <span className={styles.progLabel}>{label}</span>
        {sub && <span className={styles.progSub}>{sub}</span>}
      </div>
      <div className={styles.progTrack}>
        <div className={styles.progFill} style={{ width: `${Math.min(pct, 100)}%`, background: c }}/>
      </div>
      <div className={styles.progPct} style={{ color: c }}>{pct.toFixed(1)}%</div>
    </div>
  );
}

function RingChart({ pct, color, label, sub }: { pct: number; color: string; label: string; sub?: string }) {
  const r = 40; const circ = 2 * Math.PI * r;
  const dash = (Math.min(pct, 100) / 100) * circ;
  return (
    <div className={styles.ringWrap}>
      <svg width="100" height="100" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r={r} fill="none" stroke="var(--color-border)" strokeWidth="10"/>
        <circle cx="50" cy="50" r={r} fill="none" stroke={color} strokeWidth="10"
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
          transform="rotate(-90 50 50)" style={{ transition: 'stroke-dasharray 0.8s ease' }}/>
        <text x="50" y="46" textAnchor="middle" dominantBaseline="middle"
          fill="var(--color-text-primary)" fontSize="14" fontWeight="bold">{pct.toFixed(0)}%</text>
        <text x="50" y="62" textAnchor="middle" dominantBaseline="middle"
          fill="var(--color-text-muted)" fontSize="8">{label}</text>
      </svg>
      {sub && <div className={styles.ringSub}>{sub}</div>}
    </div>
  );
}

function SectionCard({ title, icon, children }: { title: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className={styles.sectionCard}>
      <div className={styles.sectionHeader}>{icon}{title}</div>
      {children}
    </div>
  );
}

function InsightCard({ insight }: { insight: InsightsReport['insights'][0] }) {
  const bg = insight.severity === 'critical' ? '#fff1f2' : insight.severity === 'warning' ? '#fffbeb' : '#f0fdf4';
  const border = insight.severity === 'critical' ? 'var(--color-danger)' : insight.severity === 'warning' ? 'var(--color-warning)' : 'var(--color-success)';
  return (
    <div className={styles.insightCard} style={{ background: bg, borderLeftColor: border }}>
      <div className={styles.insightIcon}>{insight.icon}</div>
      <div>
        <div className={styles.insightTitle}>{insight.title}</div>
        <div className={styles.insightBody}>{insight.body}</div>
      </div>
    </div>
  );
}

function DonutChart({ data, total }: { data: { label: string; value: number; color: string }[]; total: number }) {
  let offset = 0;
  const r = 45; const circ = 2 * Math.PI * r;
  return (
    <div className={styles.donutWrap}>
      <svg width="120" height="120" viewBox="0 0 100 100">
        {data.map((d, i) => {
          const pct = total > 0 ? d.value / total : 0;
          const dash = pct * circ;
          const seg = (
            <circle key={i} cx="50" cy="50" r={r} fill="none" stroke={d.color} strokeWidth="12"
              strokeDasharray={`${dash} ${circ - dash}`}
              strokeDashoffset={-offset * circ / 1 + circ * 0.25}
              transform="rotate(-90 50 50)"
              style={{ transition: 'stroke-dasharray 0.6s ease' }}/>
          );
          offset += pct;
          return seg;
        })}
        <circle cx="50" cy="50" r={35} fill="var(--color-surface)"/>
      </svg>
      <div className={styles.donutLegend}>
        {data.map((d, i) => (
          <div key={i} className={styles.donutItem}>
            <div className={styles.donutDot} style={{ background: d.color }}/>
            <span>{d.label}</span>
            <strong>{total > 0 ? `${(d.value / total * 100).toFixed(0)}%` : '—'}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────

interface FilterState {
  academic_year_id: number;
  standard: string;
  division: string;
}

export default function AnalyticsPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [filters, setFilters] = useState<FilterState>({ academic_year_id: 1, standard: '', division: '' });
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<Record<string, string>>({});

  // Data state
  const [dash, setDash]               = useState<MasterDashboard | null>(null);
  const [students, setStudents]        = useState<StudentReport | null>(null);
  const [attendance, setAttendance]    = useState<AttendanceReport | null>(null);
  const [attTrend, setAttTrend]        = useState<AttendanceTrendReport | null>(null);
  const [lowAtt, setLowAtt]            = useState<LowAttendanceReport | null>(null);
  const [fees, setFees]                = useState<FeeReport | null>(null);
  const [feeClasses, setFeeClasses]    = useState<FeeClassReport | null>(null);
  const [feeOut, setFeeOut]            = useState<FeeOutstandingReport | null>(null);
  const [payModes, setPayModes]        = useState<PaymentMethodReport | null>(null);
  const [academic, setAcademic]        = useState<AcademicReport | null>(null);
  const [classes, setClasses]          = useState<ClassAnalyticsReport | null>(null);
  const [teachers, setTeachers]        = useState<TeacherAnalyticsReport | null>(null);
  const [risk, setRisk]                = useState<RiskReport | null>(null);
  const [insights, setInsights]        = useState<InsightsReport | null>(null);
  const [library, setLibrary]          = useState<LibraryReport | null>(null);
  const [inventory, setInventory]      = useState<InventoryReport | null>(null);

  const setLoad = (key: string, v: boolean) => setLoading(prev => ({ ...prev, [key]: v }));

  const loadOverview = useCallback(async () => {
    setLoad('overview', true);
    try {
      const [d, ins] = await Promise.allSettled([
        analyticsService.getDashboard({ academic_year_id: filters.academic_year_id }),
        analyticsService.getInsights({ academic_year_id: filters.academic_year_id }),
      ]);
      if (d.status === 'fulfilled')   setDash(d.value);
      if (ins.status === 'fulfilled') setInsights(ins.value);
    } catch {} finally { setLoad('overview', false); }
  }, [filters.academic_year_id]);

  const loadStudents = useCallback(async () => {
    setLoad('students', true);
    try {
      const d = await analyticsService.getStudents({ academic_year_id: filters.academic_year_id });
      setStudents(d);
    } catch {} finally { setLoad('students', false); }
  }, [filters.academic_year_id]);

  const loadAttendance = useCallback(async () => {
    setLoad('attendance', true);
    try {
      const params = { academic_year_id: filters.academic_year_id, standard: filters.standard || undefined, division: filters.division || undefined };
      const [a, tr, la] = await Promise.allSettled([
        analyticsService.getAttendance(params),
        analyticsService.getAttendanceTrend(params),
        analyticsService.getLowAttendance({ ...params, threshold_pct: 75 }),
      ]);
      if (a.status === 'fulfilled')  setAttendance(a.value);
      if (tr.status === 'fulfilled') setAttTrend(tr.value);
      if (la.status === 'fulfilled') setLowAtt(la.value);
    } catch {} finally { setLoad('attendance', false); }
  }, [filters]);

  const loadFinance = useCallback(async () => {
    setLoad('finance', true);
    try {
      const [f, fc, fo, pm] = await Promise.allSettled([
        analyticsService.getFees({ academic_year_id: filters.academic_year_id }),
        analyticsService.getFeeClasses({ academic_year_id: filters.academic_year_id, standard: filters.standard || undefined }),
        analyticsService.getFeeOutstanding({ academic_year_id: filters.academic_year_id, standard: filters.standard || undefined }),
        analyticsService.getPaymentModes({ academic_year_id: filters.academic_year_id }),
      ]);
      if (f.status === 'fulfilled')  setFees(f.value);
      if (fc.status === 'fulfilled') setFeeClasses(fc.value);
      if (fo.status === 'fulfilled') setFeeOut(fo.value);
      if (pm.status === 'fulfilled') setPayModes(pm.value);
    } catch {} finally { setLoad('finance', false); }
  }, [filters]);

  const loadAcademic = useCallback(async () => {
    setLoad('academic', true);
    try {
      const d = await analyticsService.getAcademic({ academic_year_id: filters.academic_year_id, standard: filters.standard || undefined });
      setAcademic(d);
    } catch {} finally { setLoad('academic', false); }
  }, [filters.academic_year_id, filters.standard]);

  const loadClasses = useCallback(async () => {
    setLoad('classes', true);
    try {
      const d = await analyticsService.getClasses({ academic_year_id: filters.academic_year_id, standard: filters.standard || undefined, division: filters.division || undefined });
      setClasses(d);
    } catch {} finally { setLoad('classes', false); }
  }, [filters]);

  const loadTeachers = useCallback(async () => {
    setLoad('teachers', true);
    try {
      const d = await analyticsService.getTeachers({ academic_year_id: filters.academic_year_id });
      setTeachers(d);
    } catch {} finally { setLoad('teachers', false); }
  }, [filters.academic_year_id]);

  const loadRisk = useCallback(async () => {
    setLoad('risk', true);
    try {
      const d = await analyticsService.getRisk({ academic_year_id: filters.academic_year_id, standard: filters.standard || undefined });
      setRisk(d);
    } catch {} finally { setLoad('risk', false); }
  }, [filters.academic_year_id, filters.standard]);

  const loadLibrary = useCallback(async () => {
    setLoad('library', true);
    try {
      const [lib, inv] = await Promise.allSettled([analyticsService.getLibrary(), analyticsService.getInventory()]);
      if (lib.status === 'fulfilled') setLibrary(lib.value);
      if (inv.status === 'fulfilled') setInventory(inv.value);
    } catch {} finally { setLoad('library', false); }
  }, []);

  // Load overview on mount
  useEffect(() => { loadOverview(); }, [loadOverview]);

  // Load tab-specific data when tab changes
  useEffect(() => {
    if (activeTab === 'students')   loadStudents();
    if (activeTab === 'attendance') loadAttendance();
    if (activeTab === 'finance')    loadFinance();
    if (activeTab === 'academic')   loadAcademic();
    if (activeTab === 'classes')    loadClasses();
    if (activeTab === 'teachers')   loadTeachers();
    if (activeTab === 'risk')       loadRisk();
    if (activeTab === 'library')    loadLibrary();
  }, [activeTab, loadStudents, loadAttendance, loadFinance, loadAcademic, loadClasses, loadTeachers, loadRisk, loadLibrary]);

  const refreshAll = () => {
    loadOverview();
    if (activeTab === 'students')   loadStudents();
    if (activeTab === 'attendance') loadAttendance();
    if (activeTab === 'finance')    loadFinance();
    if (activeTab === 'academic')   loadAcademic();
    if (activeTab === 'classes')    loadClasses();
    if (activeTab === 'teachers')   loadTeachers();
    if (activeTab === 'risk')       loadRisk();
    if (activeTab === 'library')    loadLibrary();
  };

  const isLoading = (key: string) => loading[key] === true;

  // ── RENDER ─────────────────────────────────────────────────────────────
  return (
    <div className={styles.page}>
      {/* Page Header */}
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>
            <Activity size={22} style={{ marginRight: 8, verticalAlign: 'middle' }}/>
            School Analytics & Intelligence
          </h1>
          <p className={styles.pageSub}>Real-time data from your ERP database · Every number is sourced from actual records</p>
        </div>
        <div className={styles.headerActions}>
          <button className={styles.refreshBtn} onClick={refreshAll}><RefreshCw size={14}/> Refresh</button>
        </div>
      </div>

      {/* Tabs */}
      <div className={styles.tabBar}>
        {TABS.map(t => (
          <button key={t.id} id={`tab-${t.id}`}
            className={`${styles.tab} ${activeTab === t.id ? styles.tabActive : ''}`}
            onClick={() => setActiveTab(t.id)}>{t.icon} {t.label}</button>
        ))}
      </div>

      <div className={styles.tabContent}>

        {/* ══════════════════════════════════════════════════════
            OVERVIEW TAB
            ══════════════════════════════════════════════════════ */}
        {activeTab === 'overview' && (
          <div>
            {isLoading('overview') ? <Spinner/> : !dash ? <NoData message="Could not load dashboard data. Please refresh."/> : (
              <>
                {/* KPI Strip */}
                <div className={styles.kpiStrip}>
                  <KpiCard icon={<GraduationCap size={20}/>} value={fmtN(dash.total_students)} label="Total Students"
                    sub={`${dash.active_students} active`} color="var(--color-primary)"
                    onClick={() => navigate('/students')}/>
                  <KpiCard icon={<UserCheck size={20}/>} value={fmtN(dash.total_teachers)} label="Total Staff"
                    sub="Teaching & non-teaching" color="var(--color-info)"/>
                  <KpiCard icon={<Calendar size={20}/>}
                    value={`${dash.today_attendance_pct}%`} label="Today's Attendance"
                    sub={dash.today_attendance_pct > 0 ? 'Live / Latest' : 'No data today'}
                    color={pctColor(dash.today_attendance_pct)}
                    onClick={() => setActiveTab('attendance')}/>
                  <KpiCard icon={<DollarSign size={20}/>}
                    value={`${dash.fee_collection_pct}%`} label="Fee Collected"
                    sub={`${fmtK(dash.fee_pending)} pending`}
                    color={feeColor(dash.fee_collection_pct)}
                    onClick={() => setActiveTab('finance')}/>
                  <KpiCard icon={<BookOpen size={20}/>} value={dash.books_issued} label="Books Issued"
                    sub="Currently out" color="var(--color-warning)"/>
                  <KpiCard icon={<Bell size={20}/>} value={dash.active_notices} label="Active Notices"
                    sub="Published" color="var(--color-primary)"/>
                  {dash.low_stock_alerts > 0 && (
                    <KpiCard icon={<AlertTriangle size={20}/>} value={dash.low_stock_alerts} label="Low Stock Alerts"
                      sub="Below minimum" color="var(--color-danger)"/>
                  )}
                  {dash.pending_assets_repair > 0 && (
                    <KpiCard icon={<Package size={20}/>} value={dash.pending_assets_repair} label="In Repair"
                      sub="Assets" color="var(--color-warning)"/>
                  )}
                </div>

                {/* Revenue Chart + Rings */}
                <div className={styles.chartsRow}>
                  <SectionCard title="Monthly Fee Collection" icon={<TrendingUp size={16}/>}>
                    {dash.monthly_revenue.every(m => m.amount === 0) ? (
                      <NoData message="No fee collection data recorded yet."/>
                    ) : (
                      <BarChart data={dash.monthly_revenue} valueKey="amount" labelKey="month_name"
                        color="var(--color-primary)" formatVal={fmtK}/>
                    )}
                  </SectionCard>
                  <SectionCard title="Key Metrics" icon={<Percent size={16}/>}>
                    <div className={styles.ringsRow}>
                      <RingChart pct={dash.today_attendance_pct} color={pctColor(dash.today_attendance_pct)} label="Attendance" sub="Today/Latest"/>
                      <RingChart pct={dash.fee_collection_pct} color={feeColor(dash.fee_collection_pct)} label="Fee Collection" sub="This Year"/>
                    </div>
                    <div className={styles.miniStats}>
                      <div><span>Collected</span><strong>{fmtK(dash.fee_collected)}</strong></div>
                      <div><span>Pending</span><strong style={{ color: 'var(--color-danger)' }}>{fmtK(dash.fee_pending)}</strong></div>
                    </div>
                  </SectionCard>
                </div>

                {/* Insights Panel */}
                {insights && insights.insights.length > 0 && (
                  <SectionCard title="🧠 School Intelligence Insights" icon={<Lightbulb size={16}/>}>
                    <p className={styles.insightsMeta}>Generated from actual ERP data · {new Date().toLocaleString('en-IN')}</p>
                    <div className={styles.insightsList}>
                      {insights.insights.map((ins, i) => <InsightCard key={i} insight={ins}/>)}
                    </div>
                  </SectionCard>
                )}
              </>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════
            STUDENTS TAB
            ══════════════════════════════════════════════════════ */}
        {activeTab === 'students' && (
          <div>
            {isLoading('students') ? <Spinner/> : !students ? <NoData/> : (
              <>
                <div className={styles.kpiStrip}>
                  <KpiCard icon={<Users size={20}/>} value={fmtN(students.total_students)} label="Total Students" color="var(--color-primary)"/>
                  <KpiCard icon={<GraduationCap size={20}/>} value={fmtN(students.active_students)} label="Active Students" color="var(--color-success)"/>
                  <KpiCard icon={<Users size={20}/>} value={fmtN(students.boys)} label="Boys" color="var(--color-info)"/>
                  <KpiCard icon={<Users size={20}/>} value={fmtN(students.girls)} label="Girls" color="#ec4899"/>
                  <KpiCard icon={<GraduationCap size={20}/>} value={fmtN(students.new_admissions_this_year)} label="New Admissions" color="var(--color-warning)"/>
                  <KpiCard icon={<AlertTriangle size={20}/>} value={fmtN(students.students_left)} label="Left/Transferred" color="var(--color-danger)"/>
                </div>

                <div className={styles.chartsRow}>
                  <SectionCard title="Students by Standard" icon={<BarChart2 size={16}/>}>
                    {students.by_standard.length === 0 ? <NoData message="No student standard data found."/> : (
                      <BarChart data={students.by_standard.map(s => ({ ...s, label: `Std ${s.standard}` }))}
                        valueKey="total" labelKey="label" color="var(--color-primary)"/>
                    )}
                  </SectionCard>
                  <SectionCard title="Gender Distribution" icon={<Users size={16}/>}>
                    {students.total_students === 0 ? <NoData/> : (
                      <DonutChart
                        data={[
                          { label: 'Boys', value: students.boys, color: 'var(--color-info)' },
                          { label: 'Girls', value: students.girls, color: '#ec4899' },
                          ...(students.other_gender > 0 ? [{ label: 'Other', value: students.other_gender, color: 'var(--color-warning)' }] : []),
                        ]}
                        total={students.total_students}
                      />
                    )}
                  </SectionCard>
                </div>

                <SectionCard title="Class-wise Student Distribution">
                  <div className={styles.tableWrap}>
                    <table className={styles.dataTable}>
                      <thead><tr><th>Standard</th><th>Boys</th><th>Girls</th><th>Total</th><th>Gender Split</th></tr></thead>
                      <tbody>
                        {students.by_standard.length === 0 ? (
                          <tr><td colSpan={5} className={styles.emptyRow}>No data available</td></tr>
                        ) : students.by_standard.map(s => (
                          <tr key={s.standard}>
                            <td className={styles.stdBadge}>Std {s.standard}</td>
                            <td>{s.boys}</td>
                            <td>{s.girls}</td>
                            <td><strong>{s.total}</strong></td>
                            <td>
                              <div className={styles.genderBar}>
                                <div style={{ width: `${s.total ? (s.boys / s.total * 100) : 50}%`, background: 'var(--color-info)', height: '100%', borderRadius: '3px 0 0 3px' }}/>
                                <div style={{ width: `${s.total ? (s.girls / s.total * 100) : 50}%`, background: '#ec4899', height: '100%', borderRadius: '0 3px 3px 0' }}/>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </SectionCard>

                {students.by_division.length > 0 && (
                  <SectionCard title="Division-wise Distribution">
                    <div className={styles.tableWrap}>
                      <table className={styles.dataTable}>
                        <thead><tr><th>Standard</th><th>Division</th><th>Students</th></tr></thead>
                        <tbody>
                          {students.by_division.map((d, i) => (
                            <tr key={i}><td>Std {d.standard}</td><td>{d.division}</td><td><strong>{d.total}</strong></td></tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </SectionCard>
                )}
              </>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════
            ATTENDANCE TAB
            ══════════════════════════════════════════════════════ */}
        {activeTab === 'attendance' && (
          <div>
            {/* Filters */}
            <div className={styles.filterBar}>
              <select className={styles.filterSelect} value={filters.standard}
                onChange={e => setFilters(f => ({ ...f, standard: e.target.value, division: '' }))}>
                <option value="">All Standards</option>
                {attendance?.by_standard.map(s => <option key={s.standard} value={s.standard}>Std {s.standard}</option>)}
              </select>
              {filters.standard && (
                <select className={styles.filterSelect} value={filters.division}
                  onChange={e => setFilters(f => ({ ...f, division: e.target.value }))}>
                  <option value="">All Divisions</option>
                  {['A','B','C','D','E'].map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              )}
            </div>

            {isLoading('attendance') ? <Spinner/> : !attendance ? <NoData/> : (
              <>
                <div className={styles.kpiStrip}>
                  <KpiCard icon={<Percent size={20}/>} value={`${attendance.overall_pct}%`}
                    label="Overall Attendance" color={pctColor(attendance.overall_pct)}
                    sub={attendance.overall_pct === 0 ? 'No records found' : 'Current year'}/>
                  <KpiCard icon={<Calendar size={20}/>} value={attendance.school_working_days || '—'}
                    label="Working Days" color="var(--color-info)"/>
                  <KpiCard icon={<AlertTriangle size={20}/>} value={attendance.defaulters_count}
                    label="Defaulters (<75%)" color="var(--color-danger)"
                    sub="Students needing attention"/>
                </div>

                <div className={styles.chartsRow}>
                  <SectionCard title="Attendance by Standard" icon={<BarChart2 size={16}/>}>
                    {attendance.by_standard.length === 0 ? (
                      <NoData message="No class-wise attendance data found."/>
                    ) : (
                      <div className={styles.progList}>
                        {attendance.by_standard.map(s => (
                          <ProgressBar key={s.standard} label={`Standard ${s.standard}`}
                            pct={s.present_pct}
                            sub={s.total > 0 ? `${s.present}/${s.total} present` : undefined}/>
                        ))}
                      </div>
                    )}
                  </SectionCard>

                  <SectionCard title="Monthly Trend" icon={<TrendingUp size={16}/>}>
                    {!attTrend || attTrend.trend.length === 0 ? (
                      <NoData message="No monthly attendance trend data found."/>
                    ) : (
                      <BarChart data={attTrend.trend} valueKey="pct" labelKey="month_name"
                        color="var(--color-success)"
                        formatVal={v => `${v.toFixed(1)}%`}/>
                    )}
                  </SectionCard>
                </div>

                {attTrend && attTrend.by_day_of_week.length > 0 && (
                  <SectionCard title="Weekly Pattern (Day-of-Week Attendance)" icon={<Calendar size={16}/>}>
                    <BarChart data={attTrend.by_day_of_week} valueKey="avg_pct" labelKey="day"
                      color="var(--color-info)" formatVal={v => `${v.toFixed(1)}%`}/>
                  </SectionCard>
                )}

                {/* Low attendance students */}
                <SectionCard title={`Students Below 75% Attendance (${lowAtt?.total_count ?? 0} found)`} icon={<AlertTriangle size={16}/>}>
                  {!lowAtt || lowAtt.total_count === 0 ? (
                    <NoData message="No students below 75% attendance threshold. ✅"/>
                  ) : (
                    <div className={styles.tableWrap}>
                      <table className={styles.dataTable}>
                        <thead><tr><th>GR No.</th><th>Student</th><th>Std / Div</th><th>Present</th><th>Working</th><th>Attendance %</th><th>Risk</th></tr></thead>
                        <tbody>
                          {lowAtt.students.map(s => (
                            <tr key={s.student_id} className={styles.clickableRow}
                              onClick={() => navigate(`/students/${s.student_id}`)}>
                              <td>{s.gr_number}</td>
                              <td>{s.full_name}</td>
                              <td>Std {s.standard}{s.division ? `-${s.division}` : ''}</td>
                              <td>{s.present_days}</td>
                              <td>{s.working_days}</td>
                              <td style={{ color: pctColor(s.attendance_pct), fontWeight: 700 }}>{s.attendance_pct.toFixed(1)}%</td>
                              <td><span className={`${styles.riskBadge} ${styles[`risk_${s.risk}`]}`}>{s.risk}</span></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </SectionCard>
              </>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════
            FINANCE TAB
            ══════════════════════════════════════════════════════ */}
        {activeTab === 'finance' && (
          <div>
            <div className={styles.filterBar}>
              <select className={styles.filterSelect} value={filters.standard}
                onChange={e => setFilters(f => ({ ...f, standard: e.target.value }))}>
                <option value="">All Standards</option>
                {feeClasses?.by_class.map(c => <option key={c.standard} value={c.standard}>Std {c.standard}</option>)}
              </select>
            </div>

            {isLoading('finance') ? <Spinner/> : !fees ? <NoData/> : (
              <>
                <div className={styles.kpiStrip}>
                  <KpiCard icon={<DollarSign size={20}/>} value={fmtK(fees.total_demanded)} label="Total Expected" color="var(--color-text-secondary)"/>
                  <KpiCard icon={<TrendingUp size={20}/>} value={fmtK(fees.total_collected)} label="Collected" color="var(--color-success)"/>
                  <KpiCard icon={<AlertTriangle size={20}/>} value={fmtK(fees.total_pending)} label="Pending" color="var(--color-danger)"/>
                  <KpiCard icon={<Percent size={20}/>} value={`${fees.collection_pct}%`} label="Collection Rate" color={feeColor(fees.collection_pct)}/>
                  {fees.total_concession > 0 && (
                    <KpiCard icon={<BookOpen size={20}/>} value={fmtK(Number(fees.total_concession))} label="Concessions" color="var(--color-info)"/>
                  )}
                </div>

                <div className={styles.chartsRow}>
                  <SectionCard title="Monthly Fee Collection" icon={<TrendingUp size={16}/>}>
                    {fees.by_month.every(m => m.collected === 0) ? (
                      <NoData message="No fee payments recorded yet."/>
                    ) : (
                      <BarChart data={fees.by_month} valueKey="collected" labelKey="month_name"
                        color="var(--color-success)" formatVal={fmtK}/>
                    )}
                  </SectionCard>
                  <div className={styles.rightCol}>
                    <SectionCard title="Collection Rate" icon={<Percent size={16}/>}>
                      <div className={styles.ringsRow}>
                        <RingChart pct={fees.collection_pct}
                          color={feeColor(fees.collection_pct)} label="Collected"
                          sub={`${fmtK(fees.total_collected)} of ${fmtK(fees.total_demanded)}`}/>
                      </div>
                    </SectionCard>
                    {payModes && payModes.by_method.length > 0 && (
                      <SectionCard title="Payment Methods" icon={<DollarSign size={16}/>}>
                        <DonutChart
                          data={payModes.by_method.map((m, i) => ({
                            label: m.mode.toUpperCase(),
                            value: m.amount,
                            color: ['var(--color-primary)','var(--color-success)','var(--color-warning)','var(--color-info)','#8b5cf6','#ec4899'][i % 6],
                          }))}
                          total={payModes.total_amount}
                        />
                      </SectionCard>
                    )}
                  </div>
                </div>

                {feeClasses && feeClasses.by_class.length > 0 && (
                  <SectionCard title="Class-wise Fee Analysis" icon={<School size={16}/>}>
                    <div className={styles.tableWrap}>
                      <table className={styles.dataTable}>
                        <thead><tr><th>Standard</th><th>Expected</th><th>Collected</th><th>Pending</th><th>Collection %</th><th>Progress</th></tr></thead>
                        <tbody>
                          {feeClasses.by_class.map(c => (
                            <tr key={c.standard}>
                              <td className={styles.stdBadge}>Std {c.standard}</td>
                              <td>{fmtK(c.expected)}</td>
                              <td style={{ color: 'var(--color-success)', fontWeight: 600 }}>{fmtK(c.collected)}</td>
                              <td style={{ color: 'var(--color-danger)' }}>{fmtK(c.pending)}</td>
                              <td style={{ color: feeColor(c.collection_pct), fontWeight: 700 }}>{c.collection_pct.toFixed(1)}%</td>
                              <td style={{ width: 120 }}>
                                <div className={styles.inlineBar}>
                                  <div style={{ width: `${Math.min(c.collection_pct, 100)}%`, background: feeColor(c.collection_pct) }}/>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </SectionCard>
                )}

                {fees.by_fee_type.length > 0 && (
                  <SectionCard title="Fee Category Breakdown" icon={<BarChart2 size={16}/>}>
                    <div className={styles.progList}>
                      {fees.by_fee_type.map(ft => (
                        <ProgressBar key={ft.category} label={ft.category}
                          pct={ft.demanded > 0 ? ft.paid / ft.demanded * 100 : 0}
                          sub={`${fmtK(ft.paid)} of ${fmtK(ft.demanded)}`}
                          color="var(--color-primary)"/>
                      ))}
                    </div>
                  </SectionCard>
                )}

                {feeOut && feeOut.total_count > 0 && (
                  <SectionCard title={`Outstanding Fees — ${feeOut.total_count} Students · Total: ${fmtK(Number(feeOut.total_pending))}`} icon={<AlertTriangle size={16}/>}>
                    <div className={styles.tableWrap}>
                      <table className={styles.dataTable}>
                        <thead><tr><th>Student</th><th>Std / Div</th><th>Total Due</th><th>Paid</th><th>Pending</th><th>Due Date</th><th>Overdue</th><th>Status</th></tr></thead>
                        <tbody>
                          {feeOut.students.map(s => (
                            <tr key={s.student_id} className={styles.clickableRow}
                              onClick={() => navigate(`/students/${s.student_id}`)}>
                              <td>{s.name}</td>
                              <td>Std {s.standard}{s.division ? `-${s.division}` : ''}</td>
                              <td>{fmtK(s.total_due)}</td>
                              <td style={{ color: 'var(--color-success)' }}>{fmtK(s.paid)}</td>
                              <td style={{ color: 'var(--color-danger)', fontWeight: 700 }}>{fmtK(s.pending)}</td>
                              <td>{s.due_date ?? '—'}</td>
                              <td style={{ color: s.days_overdue > 0 ? 'var(--color-danger)' : 'var(--color-text-muted)' }}>
                                {s.days_overdue > 0 ? `${s.days_overdue}d` : '—'}
                              </td>
                              <td><span className={`${styles.statusBadge} ${styles[`status_${s.status}`]}`}>{s.status}</span></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </SectionCard>
                )}
              </>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════
            ACADEMIC TAB
            ══════════════════════════════════════════════════════ */}
        {activeTab === 'academic' && (
          <div>
            <div className={styles.filterBar}>
              <select className={styles.filterSelect} value={filters.standard}
                onChange={e => setFilters(f => ({ ...f, standard: e.target.value }))}>
                <option value="">All Standards</option>
                {academic?.by_class.map(c => <option key={c.standard} value={c.standard}>Std {c.standard}</option>)}
              </select>
            </div>

            {isLoading('academic') ? <Spinner/> : !academic ? <NoData/> :
              academic.status === 'no_data' ? (
                <NoData message="Academic performance unavailable — no examination data found for this academic year."/>
              ) : (
                <>
                  <div className={styles.kpiStrip}>
                    <KpiCard icon={<Users size={20}/>} value={academic.students_appeared} label="Students Appeared" color="var(--color-primary)"/>
                    <KpiCard icon={<GraduationCap size={20}/>} value={academic.passed} label="Passed" color="var(--color-success)"/>
                    <KpiCard icon={<AlertTriangle size={20}/>} value={academic.failed} label="Failed" color="var(--color-danger)"/>
                    <KpiCard icon={<Percent size={20}/>} value={`${academic.pass_pct.toFixed(1)}%`} label="Pass Rate" color={pctColor(academic.pass_pct)}/>
                    <KpiCard icon={<BarChart2 size={20}/>} value={`${academic.avg_percentage}%`} label="Average Score" color="var(--color-info)"/>
                  </div>

                  <div className={styles.chartsRow}>
                    <SectionCard title="Grade Distribution" icon={<BarChart2 size={16}/>}>
                      {academic.by_grade.length === 0 ? <NoData/> : (
                        <BarChart data={academic.by_grade} valueKey="count" labelKey="grade"
                          color="var(--color-primary)"/>
                      )}
                    </SectionCard>
                    <SectionCard title="Class-wise Performance" icon={<School size={16}/>}>
                      {academic.by_class.length === 0 ? <NoData/> : (
                        <div className={styles.progList}>
                          {academic.by_class.map(c => (
                            <ProgressBar key={c.standard} label={`Std ${c.standard}`}
                              pct={c.avg_pct} sub={`Pass: ${c.pass_pct.toFixed(0)}%`}/>
                          ))}
                        </div>
                      )}
                    </SectionCard>
                  </div>

                  {academic.weak_subjects.length > 0 && (
                    <SectionCard title="⚠️ Subjects Needing Attention (Avg < 60%)" icon={<AlertTriangle size={16}/>}>
                      <div className={styles.weakSubjectList}>
                        {academic.weak_subjects.map(ws => (
                          <div key={ws.subject} className={styles.weakSubject}>
                            <div className={styles.weakSubjectName}>{ws.subject}</div>
                            <div className={styles.weakSubjectStats}>
                              <span>Avg: <strong style={{ color: 'var(--color-danger)' }}>{ws.avg_pct}%</strong></span>
                              <span>Pass Rate: <strong>{ws.pass_pct.toFixed(0)}%</strong></span>
                            </div>
                            <div style={{ height: 6, background: 'var(--color-border)', borderRadius: 3, width: '100%' }}>
                              <div style={{ height: '100%', width: `${ws.avg_pct}%`, background: pctColor(ws.avg_pct), borderRadius: 3 }}/>
                            </div>
                          </div>
                        ))}
                      </div>
                    </SectionCard>
                  )}

                  <SectionCard title="Subject-wise Performance" icon={<BookMarked size={16}/>}>
                    {academic.by_subject.length === 0 ? <NoData/> : (
                      <div className={styles.tableWrap}>
                        <table className={styles.dataTable}>
                          <thead><tr><th>Subject</th><th>Appeared</th><th>Avg Marks</th><th>Avg %</th><th>Passed</th><th>Failed</th><th>Pass %</th></tr></thead>
                          <tbody>
                            {academic.by_subject.map(s => (
                              <tr key={s.subject}>
                                <td>{s.subject}</td>
                                <td>{s.appeared}</td>
                                <td>{s.avg_marks}/{s.max_marks}</td>
                                <td style={{ color: pctColor(s.avg_pct), fontWeight: 600 }}>{s.avg_pct}%</td>
                                <td style={{ color: 'var(--color-success)' }}>{s.passed}</td>
                                <td style={{ color: 'var(--color-danger)' }}>{s.failed}</td>
                                <td>{s.pass_pct.toFixed(0)}%</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </SectionCard>
                </>
              )}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════
            CLASSES TAB
            ══════════════════════════════════════════════════════ */}
        {activeTab === 'classes' && (
          <div>
            {isLoading('classes') ? <Spinner/> : !classes || classes.by_class.length === 0 ? (
              <NoData message="No class data found. Ensure students are assigned to classes and divisions."/>
            ) : (
              <SectionCard title="Class & Division Health" icon={<School size={16}/>}>
                <div className={styles.tableWrap}>
                  <table className={styles.dataTable}>
                    <thead>
                      <tr>
                        <th>Class</th><th>Students</th><th>Attendance</th><th>Fee Collection</th>
                        <th>Fee Pending</th><th>Academic Avg</th>
                      </tr>
                    </thead>
                    <tbody>
                      {classes.by_class.map((c, i) => (
                        <tr key={i}>
                          <td className={styles.stdBadge}>Std {c.standard}{c.division ? `-${c.division}` : ''}</td>
                          <td><strong>{c.students}</strong></td>
                          <td>
                            <span style={{ color: pctColor(c.attendance_pct), fontWeight: 600 }}>
                              {c.attendance_pct > 0 ? `${c.attendance_pct.toFixed(1)}%` : '—'}
                            </span>
                          </td>
                          <td>
                            <span style={{ color: feeColor(c.fee_pct), fontWeight: 600 }}>
                              {c.fee_pct > 0 ? `${c.fee_pct.toFixed(1)}%` : '—'}
                            </span>
                          </td>
                          <td style={{ color: 'var(--color-danger)' }}>
                            {c.fee_pending > 0 ? fmtK(c.fee_pending) : '—'}
                          </td>
                          <td>
                            {c.academic_pct > 0 ? (
                              <span style={{ color: pctColor(c.academic_pct), fontWeight: 600 }}>{c.academic_pct.toFixed(1)}%</span>
                            ) : <span className={styles.noDataText}>No exam data</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </SectionCard>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════
            TEACHERS / STAFF TAB
            ══════════════════════════════════════════════════════ */}
        {activeTab === 'teachers' && (
          <div>
            {isLoading('teachers') ? <Spinner/> : !teachers ? <NoData/> : (
              <>
                <div className={styles.kpiStrip}>
                  <KpiCard icon={<Users size={20}/>} value={teachers.total_teachers} label="Total Staff" color="var(--color-primary)"/>
                  <KpiCard icon={<UserCheck size={20}/>} value={teachers.active_teachers} label="Active" color="var(--color-success)"/>
                  <KpiCard icon={<GraduationCap size={20}/>} value={teachers.teaching_staff} label="Teaching Staff" color="var(--color-info)"/>
                  <KpiCard icon={<Users size={20}/>} value={teachers.non_teaching_staff} label="Non-Teaching" color="var(--color-warning)"/>
                  {teachers.attendance_pct > 0 && (
                    <KpiCard icon={<Calendar size={20}/>} value={`${teachers.attendance_pct}%`}
                      label="Staff Attendance Today" color={pctColor(teachers.attendance_pct)}/>
                  )}
                </div>

                <div className={styles.chartsRow}>
                  {teachers.by_type.length > 0 && (
                    <SectionCard title="Staff by Type" icon={<BarChart2 size={16}/>}>
                      <BarChart data={teachers.by_type.map(t => ({ ...t, label: t.type.replace('_', ' ') }))}
                        valueKey="count" labelKey="label" color="var(--color-primary)"/>
                    </SectionCard>
                  )}
                  {teachers.by_department.length > 0 && (
                    <SectionCard title="Staff by Department" icon={<BarChart2 size={16}/>}>
                      <div className={styles.progList}>
                        {teachers.by_department.map(d => (
                          <ProgressBar key={d.department} label={d.department}
                            pct={teachers.total_teachers > 0 ? d.count / teachers.total_teachers * 100 : 0}
                            sub={`${d.count} staff`} color="var(--color-info)"/>
                        ))}
                      </div>
                    </SectionCard>
                  )}
                </div>

                {teachers.workload.length > 0 && (
                  <SectionCard title="Teacher Workload (from Subject Assignments)" icon={<ClipboardList size={16}/>}>
                    <div className={styles.tableWrap}>
                      <table className={styles.dataTable}>
                        <thead><tr><th>Teacher</th><th>Designation</th><th>Classes</th><th>Subjects</th><th>Periods/Week</th></tr></thead>
                        <tbody>
                          {teachers.workload.map(t => (
                            <tr key={t.teacher_id}>
                              <td>{t.name}</td>
                              <td>{t.designation || '—'}</td>
                              <td>{t.classes}</td>
                              <td>{t.subjects}</td>
                              <td><strong style={{ color: t.periods_per_week > 30 ? 'var(--color-danger)' : 'var(--color-success)' }}>{t.periods_per_week}</strong></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </SectionCard>
                )}

                {teachers.workload.length === 0 && teachers.by_type.length === 0 && (
                  <NoData message="Teacher assignment data not found. Assign subjects to teachers in the Timetable module."/>
                )}
              </>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════
            RISK TAB
            ══════════════════════════════════════════════════════ */}
        {activeTab === 'risk' && (
          <div>
            <div className={styles.filterBar}>
              <select className={styles.filterSelect} value={filters.standard}
                onChange={e => setFilters(f => ({ ...f, standard: e.target.value }))}>
                <option value="">All Standards</option>
              </select>
            </div>

            {isLoading('risk') ? <Spinner/> : !risk ? <NoData/> : (
              <>
                <div className={styles.kpiStrip}>
                  <KpiCard icon={<Calendar size={20}/>} value={risk.attendance_risk} label="Attendance Risk"
                    sub="Below 75% attendance" color="var(--color-warning)"/>
                  <KpiCard icon={<DollarSign size={20}/>} value={risk.fee_risk} label="Fee Risk"
                    sub="Pending payments" color="var(--color-danger)"/>
                  <KpiCard icon={<BookMarked size={20}/>} value={risk.academic_risk} label="Academic Risk"
                    sub="Failed in exams" color="#8b5cf6"/>
                  <KpiCard icon={<ShieldAlert size={20}/>} value={risk.multi_risk} label="Multi-Risk"
                    sub="2+ categories" color="var(--color-danger)"/>
                </div>

                {risk.students.length === 0 ? (
                  <NoData message="No at-risk students identified. All students are performing well! ✅"/>
                ) : (
                  <SectionCard title={`Students Requiring Attention (${risk.students.length} identified)`} icon={<ShieldAlert size={16}/>}>
                    <div className={styles.tableWrap}>
                      <table className={styles.dataTable}>
                        <thead><tr><th>Student</th><th>Std / Div</th><th>Risk Categories</th><th>Risk Count</th></tr></thead>
                        <tbody>
                          {risk.students.map(s => (
                            <tr key={s.student_id} className={styles.clickableRow}
                              onClick={() => navigate(`/students/${s.student_id}`)}>
                              <td>{s.name}</td>
                              <td>Std {s.standard}{s.division ? `-${s.division}` : ''}</td>
                              <td>
                                <div className={styles.riskTags}>
                                  {s.risk_categories.map(c => (
                                    <span key={c} className={`${styles.riskTag} ${styles[`riskTag_${c}`]}`}>{c}</span>
                                  ))}
                                </div>
                              </td>
                              <td>
                                <span className={`${styles.riskBadge} ${s.risk_count >= 2 ? styles.risk_critical : styles.risk_warning}`}>
                                  {s.risk_count} issue{s.risk_count !== 1 ? 's' : ''}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </SectionCard>
                )}
              </>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════
            LIBRARY TAB
            ══════════════════════════════════════════════════════ */}
        {activeTab === 'library' && (
          <div>
            {isLoading('library') ? <Spinner/> : (
              <>
                {library && (
                  <>
                    <div className={styles.kpiStrip}>
                      <KpiCard icon={<BookOpen size={20}/>} value={library.total_books} label="Total Books" color="var(--color-primary)"/>
                      <KpiCard icon={<BookMarked size={20}/>} value={library.books_issued} label="Issued" color="var(--color-warning)"/>
                      <KpiCard icon={<BookOpen size={20}/>} value={library.books_available} label="Available" color="var(--color-success)"/>
                      <KpiCard icon={<AlertTriangle size={20}/>} value={library.overdue_books} label="Overdue" color="var(--color-danger)"
                        sub={library.overdue_books > 0 ? 'Needs follow-up' : 'All on time ✅'}/>
                    </div>
                    <div className={styles.chartsRow}>
                      <SectionCard title="Utilization" icon={<Percent size={16}/>}>
                        <div className={styles.ringsRow}>
                          <RingChart pct={library.total_books ? library.books_issued / library.total_books * 100 : 0}
                            color="var(--color-warning)" label="Issued" sub="Books in circulation"/>
                          <RingChart pct={library.books_issued ? library.overdue_books / library.books_issued * 100 : 0}
                            color="var(--color-danger)" label="Overdue" sub="of issued books"/>
                        </div>
                      </SectionCard>
                    </div>
                  </>
                )}
                {inventory && (
                  <>
                    <div style={{ marginTop: 24 }}><h3 className={styles.subHeading}>Assets & Inventory</h3></div>
                    <div className={styles.kpiStrip}>
                      <KpiCard icon={<Package size={20}/>} value={inventory.total_assets} label="Total Assets" color="var(--color-primary)"/>
                      <KpiCard icon={<DollarSign size={20}/>} value={fmtK(inventory.asset_value)} label="Asset Value" color="var(--color-info)"/>
                      <KpiCard icon={<AlertTriangle size={20}/>} value={inventory.low_stock_items} label="Low Stock" color="var(--color-danger)"/>
                      <KpiCard icon={<Package size={20}/>} value={fmtK(inventory.stock_value)} label="Stock Value" color="var(--color-success)"/>
                      <KpiCard icon={<DollarSign size={20}/>} value={fmtK(inventory.maintenance_cost_ytd)} label="Maintenance YTD" color="var(--color-warning)"/>
                    </div>
                    {inventory.by_status.length > 0 && (
                      <SectionCard title="Asset Status" icon={<Package size={16}/>}>
                        <div className={styles.progList}>
                          {inventory.by_status.map(s => {
                            const tot = inventory.by_status.reduce((a, b) => a + b.count, 0) || 1;
                            return <ProgressBar key={s.status} label={s.status} sub={`${s.count} assets`}
                              pct={s.count / tot * 100}
                              color={s.status === 'active' ? 'var(--color-success)' : s.status === 'in_repair' ? 'var(--color-warning)' : 'var(--color-danger)'}/>;
                          })}
                        </div>
                      </SectionCard>
                    )}
                  </>
                )}
              </>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
