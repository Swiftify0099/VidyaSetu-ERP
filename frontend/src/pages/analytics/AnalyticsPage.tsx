import { useState, useEffect, useCallback } from 'react';
import {
  BarChart3, Users, GraduationCap, DollarSign, BookOpen,
  Package, Bell, AlertTriangle, TrendingUp, TrendingDown,
  RefreshCw, ChevronRight, Percent, Calendar,
} from 'lucide-react';
import api from '../../services/api';
import styles from './AnalyticsPage.module.css';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

interface Dashboard {
  total_students: number; total_teachers: number;
  today_attendance_pct: number; fee_collection_pct: number;
  books_issued: number; pending_assets_repair: number;
  active_notices: number; low_stock_alerts: number;
  monthly_revenue: { month: number; amount: number }[];
}
interface StudentReport {
  total_students: number; boys: number; girls: number;
  by_standard: { standard: string; boys: number; girls: number; total: number }[];
  new_admissions_this_year: number; transfers_out: number;
}
interface AttendanceReport {
  overall_pct: number; school_working_days: number;
  by_standard: { standard: string; present_pct: number }[];
  defaulters_count: number;
}
interface FeeReport {
  total_demanded: number; total_collected: number;
  total_pending: number; collection_pct: number;
  by_month: { month: number; collected: number }[];
}
interface LibraryReport {
  total_books: number; books_issued: number;
  books_available: number; overdue_books: number;
}
interface InventoryReport {
  total_assets: number; asset_value: number;
  low_stock_items: number; stock_value: number;
  maintenance_cost_ytd: number;
  by_status: { status: string; count: number }[];
}

const fmt = (n: number) => `₹${Number(n).toLocaleString('en-IN')}`;
const fmtK = (n: number) => n >= 100000 ? `₹${(n/100000).toFixed(1)}L` : n >= 1000 ? `₹${(n/1000).toFixed(1)}K` : `₹${n}`;

// Pure-CSS bar chart component
function BarChart({ data, valueKey, labelKey, color = 'var(--color-primary)', maxVal }: {
  data: any[]; valueKey: string; labelKey: string; color?: string; maxVal?: number;
}) {
  const max = maxVal ?? Math.max(...data.map(d => d[valueKey]), 1);
  return (
    <div className={styles.barChart}>
      {data.map((d, i) => (
        <div key={i} className={styles.barItem}>
          <div className={styles.barTrack}>
            <div className={styles.barFill}
              style={{ height: `${(d[valueKey] / max) * 100}%`, background: color,
                       animationDelay: `${i * 60}ms` }}/>
          </div>
          <div className={styles.barLabel}>{d[labelKey]}</div>
          <div className={styles.barVal}>{typeof d[valueKey]==='number'&&d[valueKey]>1000?fmtK(d[valueKey]):d[valueKey]}</div>
        </div>
      ))}
    </div>
  );
}

// Horizontal progress bar
function ProgressBar({ pct, color = 'var(--color-primary)', label, sub }: {
  pct: number; color?: string; label: string; sub?: string;
}) {
  return (
    <div className={styles.progRow}>
      <div className={styles.progLeft}>
        <span className={styles.progLabel}>{label}</span>
        {sub && <span className={styles.progSub}>{sub}</span>}
      </div>
      <div className={styles.progTrack}>
        <div className={styles.progFill} style={{ width: `${Math.min(pct, 100)}%`, background: color }}/>
      </div>
      <div className={styles.progPct}>{pct.toFixed(1)}%</div>
    </div>
  );
}

// Donut / ring chart (pure CSS)
function RingChart({ pct, color, label, sub }: { pct: number; color: string; label: string; sub?: string }) {
  const r = 40; const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;
  return (
    <div className={styles.ringWrap}>
      <svg width="100" height="100" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r={r} fill="none" stroke="var(--color-border)" strokeWidth="10"/>
        <circle cx="50" cy="50" r={r} fill="none" stroke={color} strokeWidth="10"
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
          transform="rotate(-90 50 50)" style={{ transition: 'stroke-dasharray .8s ease' }}/>
        <text x="50" y="46" textAnchor="middle" dominantBaseline="middle"
          fill="var(--color-text-primary)" fontSize="14" fontWeight="bold">{pct.toFixed(0)}%</text>
        <text x="50" y="62" textAnchor="middle" dominantBaseline="middle"
          fill="var(--color-text-muted)" fontSize="8">{label}</text>
      </svg>
      {sub && <div className={styles.ringSub}>{sub}</div>}
    </div>
  );
}

export default function AnalyticsPage() {
  const [dash, setDash] = useState<Dashboard | null>(null);
  const [students, setStudents] = useState<StudentReport | null>(null);
  const [attendance, setAttendance] = useState<AttendanceReport | null>(null);
  const [fees, setFees] = useState<FeeReport | null>(null);
  const [library, setLibrary] = useState<LibraryReport | null>(null);
  const [inventory, setInventory] = useState<InventoryReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview'|'students'|'attendance'|'finance'|'library'|'assets'>('overview');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [d, s, a, f, l, inv] = await Promise.allSettled([
        api.get('/analytics/dashboard'),
        api.get('/analytics/students'),
        api.get('/analytics/attendance'),
        api.get('/analytics/fees'),
        api.get('/analytics/library'),
        api.get('/analytics/inventory'),
      ]);
      if (d.status==='fulfilled') setDash(d.value.data.data);
      if (s.status==='fulfilled') setStudents(s.value.data.data);
      if (a.status==='fulfilled') setAttendance(a.value.data.data);
      if (f.status==='fulfilled') setFees(f.value.data.data);
      if (l.status==='fulfilled') setLibrary(l.value.data.data);
      if (inv.status==='fulfilled') setInventory(inv.value.data.data);
    } catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const maxRevenue = dash ? Math.max(...dash.monthly_revenue.map(r => r.amount), 1) : 1;

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Reports & Analytics</h1>
          <p className={styles.pageSub}>अहवाल व विश्लेषण · School-wide Intelligence Dashboard</p>
        </div>
        <button className={styles.refreshBtn} onClick={load}><RefreshCw size={14}/> Refresh</button>
      </div>

      {/* Tabs */}
      <div className={styles.tabBar}>
        {([
          { id:'overview',    label:'Overview',    icon:<BarChart3 size={14}/> },
          { id:'students',    label:'Students',    icon:<GraduationCap size={14}/> },
          { id:'attendance',  label:'Attendance',  icon:<Calendar size={14}/> },
          { id:'finance',     label:'Finance',     icon:<DollarSign size={14}/> },
          { id:'library',     label:'Library',     icon:<BookOpen size={14}/> },
          { id:'assets',      label:'Assets',      icon:<Package size={14}/> },
        ] as const).map(t=>(
          <button key={t.id} className={`${styles.tab} ${activeTab===t.id?styles.tabActive:''}`}
            onClick={()=>setActiveTab(t.id)}>{t.icon} {t.label}</button>
        ))}
      </div>

      {loading && <div className={styles.loading}><div className={styles.spinner}/><span>Loading analytics...</span></div>}

      {/* ── OVERVIEW ──────────────────────────────────── */}
      {!loading && activeTab==='overview' && dash && (
        <div className={styles.overviewContent}>
          {/* Hero KPI strip */}
          <div className={styles.heroStrip}>
            {[
              { icon:<GraduationCap size={24}/>, val:dash.total_students, label:'Total Students', color:'var(--color-primary)', note:`${dash.total_teachers} Teachers` },
              { icon:<Calendar size={24}/>,       val:`${dash.today_attendance_pct}%`, label:"Today's Attendance", color: dash.today_attendance_pct>=75?'var(--color-success)':'var(--color-danger)', note:'Live' },
              { icon:<DollarSign size={24}/>,     val:`${dash.fee_collection_pct}%`, label:'Fee Collected',  color:'var(--color-info)',    note:'This Year' },
              { icon:<BookOpen size={24}/>,       val:dash.books_issued,   label:'Books Issued',  color:'var(--color-warning)', note:'Issued' },
              { icon:<AlertTriangle size={24}/>,  val:dash.low_stock_alerts, label:'Low Stock',  color:dash.low_stock_alerts>0?'var(--color-danger)':'var(--color-success)', note:'Alerts' },
              { icon:<Bell size={24}/>,           val:dash.active_notices,  label:'Active Notices', color:'var(--color-primary)', note:'Published' },
            ].map(k=>(
              <div key={k.label} className={styles.heroCard} style={{'--kc':k.color} as React.CSSProperties}>
                <div className={styles.heroCardIcon} style={{color:k.color}}>{k.icon}</div>
                <div className={styles.heroVal}>{k.val}</div>
                <div className={styles.heroLabel}>{k.label}</div>
                <div className={styles.heroNote}>{k.note}</div>
              </div>
            ))}
          </div>

          {/* Revenue chart + Rings */}
          <div className={styles.chartsRow}>
            <div className={styles.chartCard}>
              <div className={styles.chartTitle}><TrendingUp size={16}/> Monthly Fee Collection</div>
              <BarChart data={dash.monthly_revenue.map(r=>({...r,label:MONTHS[r.month-1]}))}
                valueKey="amount" labelKey="label"
                color="var(--color-primary)" maxVal={maxRevenue}/>
            </div>
            <div className={styles.ringsCard}>
              <div className={styles.chartTitle}><Percent size={16}/> Key Metrics</div>
              <div className={styles.ringsRow}>
                <RingChart pct={dash.today_attendance_pct} color="var(--color-success)" label="Attendance" sub="Today"/>
                <RingChart pct={dash.fee_collection_pct} color="var(--color-info)" label="Fees" sub="This Year"/>
              </div>
            </div>
          </div>

          {/* Alert banners */}
          {(dash.low_stock_alerts > 0 || dash.pending_assets_repair > 0) && (
            <div className={styles.alertsRow}>
              {dash.low_stock_alerts > 0 && (
                <div className={styles.alertCard} style={{borderColor:'var(--color-danger)'}}>
                  <AlertTriangle size={18} style={{color:'var(--color-danger)'}}/> 
                  <span><strong>{dash.low_stock_alerts}</strong> stock items are below minimum threshold</span>
                </div>
              )}
              {dash.pending_assets_repair > 0 && (
                <div className={styles.alertCard} style={{borderColor:'var(--color-warning)'}}>
                  <Package size={18} style={{color:'var(--color-warning)'}}/> 
                  <span><strong>{dash.pending_assets_repair}</strong> assets in repair queue</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── STUDENTS ──────────────────────────────────── */}
      {!loading && activeTab==='students' && students && (
        <div className={styles.reportContent}>
          <div className={styles.reportGrid3}>
            <div className={styles.statCard}>
              <div className={styles.statVal}>{students.total_students}</div>
              <div className={styles.statLabel}>Total Students</div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statVal} style={{color:'var(--color-info)'}}>{students.boys}</div>
              <div className={styles.statLabel}>Boys</div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statVal} style={{color:'var(--color-danger)'}}>{students.girls}</div>
              <div className={styles.statLabel}>Girls</div>
            </div>
          </div>
          <div className={styles.chartCard}>
            <div className={styles.chartTitle}><GraduationCap size={16}/> Students by Standard</div>
            <BarChart data={students.by_standard.map(s=>({...s,label:`Std ${s.standard}`}))}
              valueKey="total" labelKey="label" color="var(--color-primary)"/>
          </div>
          <div className={styles.chartCard}>
            <div className={styles.chartTitle}>Gender Distribution by Standard</div>
            <div className={styles.genderTable}>
              <table className={styles.miniTable}>
                <thead><tr><th>Standard</th><th>Boys</th><th>Girls</th><th>Total</th><th>Distribution</th></tr></thead>
                <tbody>
                  {students.by_standard.map(s=>(
                    <tr key={s.standard}>
                      <td className={styles.stdCell}>Std {s.standard}</td>
                      <td className={styles.boysCell}>{s.boys}</td>
                      <td className={styles.girlsCell}>{s.girls}</td>
                      <td><strong>{s.total}</strong></td>
                      <td>
                        <div className={styles.genderBar}>
                          <div style={{width:`${s.total?(s.boys/s.total*100):50}%`,background:'var(--color-info)',height:'100%',borderRadius:'3px 0 0 3px'}}/>
                          <div style={{width:`${s.total?(s.girls/s.total*100):50}%`,background:'var(--color-danger)',height:'100%',borderRadius:'0 3px 3px 0'}}/>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── ATTENDANCE ────────────────────────────────── */}
      {!loading && activeTab==='attendance' && attendance && (
        <div className={styles.reportContent}>
          <div className={styles.reportGrid3}>
            <div className={styles.statCard}>
              <div className={styles.statVal} style={{color:attendance.overall_pct>=75?'var(--color-success)':'var(--color-danger)'}}>{attendance.overall_pct}%</div>
              <div className={styles.statLabel}>Overall Attendance</div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statVal}>{attendance.school_working_days}</div>
              <div className={styles.statLabel}>Working Days</div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statVal} style={{color:'var(--color-danger)'}}>{attendance.defaulters_count}</div>
              <div className={styles.statLabel}>Defaulters (&lt;75%)</div>
            </div>
          </div>
          <div className={styles.chartCard}>
            <div className={styles.chartTitle}><Calendar size={16}/> Attendance % by Standard</div>
            {attendance.by_standard.length === 0 ? (
              <div className={styles.emptyMsg}>No attendance data recorded yet.</div>
            ) : (
              <div className={styles.progList}>
                {attendance.by_standard.map(s=>(
                  <ProgressBar key={s.standard} label={`Standard ${s.standard}`}
                    pct={s.present_pct}
                    color={s.present_pct>=90?'var(--color-success)':s.present_pct>=75?'var(--color-warning)':'var(--color-danger)'}/>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── FINANCE ───────────────────────────────────── */}
      {!loading && activeTab==='finance' && fees && (
        <div className={styles.reportContent}>
          <div className={styles.reportGrid3}>
            <div className={styles.statCard}>
              <div className={styles.statVal}>{fmtK(fees.total_demanded)}</div>
              <div className={styles.statLabel}>Total Demanded</div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statVal} style={{color:'var(--color-success)'}}>{fmtK(fees.total_collected)}</div>
              <div className={styles.statLabel}>Collected</div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statVal} style={{color:'var(--color-danger)'}}>{fmtK(fees.total_pending)}</div>
              <div className={styles.statLabel}>Pending</div>
            </div>
          </div>
          <div className={styles.ringsCard} style={{width:'100%'}}>
            <div className={styles.chartTitle}>Collection Rate</div>
            <RingChart pct={fees.collection_pct} color={fees.collection_pct>=80?'var(--color-success)':'var(--color-warning)'}
              label="Collected" sub={`${fmt(fees.total_collected)} of ${fmt(fees.total_demanded)}`}/>
          </div>
          <div className={styles.chartCard}>
            <div className={styles.chartTitle}><DollarSign size={16}/> Monthly Fee Collection</div>
            <BarChart data={fees.by_month.map(m=>({...m,label:MONTHS[m.month-1]}))}
              valueKey="collected" labelKey="label" color="var(--color-success)"/>
          </div>
        </div>
      )}

      {/* ── LIBRARY ───────────────────────────────────── */}
      {!loading && activeTab==='library' && library && (
        <div className={styles.reportContent}>
          <div className={styles.reportGrid4}>
            {[
              { val:library.total_books,     label:'Total Books',   color:'var(--color-primary)' },
              { val:library.books_issued,    label:'Issued',        color:'var(--color-warning)' },
              { val:library.books_available, label:'Available',     color:'var(--color-success)' },
              { val:library.overdue_books,   label:'Overdue 🔴',    color:'var(--color-danger)' },
            ].map(k=>(
              <div key={k.label} className={styles.statCard}>
                <div className={styles.statVal} style={{color:k.color}}>{k.val}</div>
                <div className={styles.statLabel}>{k.label}</div>
              </div>
            ))}
          </div>
          <div className={styles.ringsCard} style={{width:'100%'}}>
            <div className={styles.chartTitle}>Utilization Rate</div>
            <div className={styles.ringsRow}>
              <RingChart pct={library.total_books?(library.books_issued/library.total_books*100):0}
                color="var(--color-warning)" label="Issued" sub="Books in circulation"/>
              <RingChart pct={library.books_issued?(library.overdue_books/library.books_issued*100):0}
                color="var(--color-danger)" label="Overdue" sub="of issued books"/>
            </div>
          </div>
        </div>
      )}

      {/* ── ASSETS ────────────────────────────────────── */}
      {!loading && activeTab==='assets' && inventory && (
        <div className={styles.reportContent}>
          <div className={styles.reportGrid3}>
            <div className={styles.statCard}>
              <div className={styles.statVal}>{inventory.total_assets}</div>
              <div className={styles.statLabel}>Total Assets</div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statVal}>{fmtK(inventory.asset_value)}</div>
              <div className={styles.statLabel}>Asset Value</div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statVal} style={{color:'var(--color-danger)'}}>{inventory.low_stock_items}</div>
              <div className={styles.statLabel}>Low Stock Items</div>
            </div>
          </div>
          <div className={styles.chartCard}>
            <div className={styles.chartTitle}><Package size={16}/> Asset Status Breakdown</div>
            <div className={styles.progList}>
              {inventory.by_status.map(s=>{
                const tot = inventory.by_status.reduce((a,b)=>a+b.count,0)||1;
                return <ProgressBar key={s.status} label={s.status} sub={`${s.count} assets`}
                  pct={s.count/tot*100}
                  color={s.status==='active'?'var(--color-success)':s.status==='in_repair'?'var(--color-warning)':'var(--color-danger)'}/>;
              })}
            </div>
          </div>
          <div className={styles.reportGrid3}>
            <div className={styles.statCard}>
              <div className={styles.statVal}>{fmtK(inventory.stock_value)}</div>
              <div className={styles.statLabel}>Stock Value</div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statVal} style={{color:'var(--color-warning)'}}>{fmtK(inventory.maintenance_cost_ytd)}</div>
              <div className={styles.statLabel}>Maintenance Cost (YTD)</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
