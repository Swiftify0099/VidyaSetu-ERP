import { useState, useEffect, useCallback } from 'react';
import {
  CalendarDays, Users, AlertTriangle, Check, X, RefreshCw,
  Plus, ChevronLeft, ChevronRight, UserCheck, UserX,
  TrendingDown, BarChart3, Clock, ArrowRight,
} from 'lucide-react';
import toast from 'react-hot-toast';
import attendanceService, {
  AttendanceStats, ClassSession, StudentAttendanceSummary,
  AttendanceStatus, Holiday,
} from '../../services/attendanceService';
import PermissionGate from '../../components/ui/PermissionGate';
import styles from './AttendancePage.module.css';

type Section = 'dashboard' | 'mark' | 'reports' | 'defaulters' | 'teacher' | 'holidays';

const STANDARDS = ['1','2','3','4','5','6','7','8','9','10','11','12'];
const DIVISIONS  = ['A','B','C','D'];
const CURRENT_AY = 1;
const TODAY = new Date().toISOString().split('T')[0];
const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const STATUS_CONFIG: Record<AttendanceStatus, { label: string; color: string; short: string }> = {
  present:       { label: 'Present',       color: 'var(--color-success)', short: 'P' },
  absent:        { label: 'Absent',        color: 'var(--color-danger)',  short: 'A' },
  late:          { label: 'Late',          color: 'var(--color-warning)', short: 'L' },
  half_day:      { label: 'Half Day',      color: 'var(--color-info)',    short: 'H' },
  leave:         { label: 'Leave',         color: 'var(--color-primary)', short: 'LE' },
  medical_leave: { label: 'Medical Leave', color: '#8b5cf6',              short: 'ML' },
};

interface MarkRow {
  student_id: number;
  student_name: string;
  gr_number: string;
  status: AttendanceStatus;
  remarks: string;
}

export default function AttendancePage() {
  const [section, setSection] = useState<Section>('dashboard');
  const [stats, setStats] = useState<AttendanceStats | null>(null);

  // Mark attendance
  const [markDate, setMarkDate] = useState(TODAY);
  const [markStd, setMarkStd] = useState('8');
  const [markDiv, setMarkDiv] = useState('A');
  const [markRows, setMarkRows] = useState<MarkRow[]>([]);
  const [markLoading, setMarkLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [alreadyMarked, setAlreadyMarked] = useState(false);

  // Reports
  const [repStd, setRepStd] = useState('8');
  const [repYear, setRepYear] = useState(new Date().getFullYear());
  const [repMonth, setRepMonth] = useState(new Date().getMonth() + 1);
  const [sessions, setSessions] = useState<ClassSession[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(false);

  // Defaulters
  const [defYear, setDefYear]  = useState(new Date().getFullYear());
  const [defMonth, setDefMonth] = useState(new Date().getMonth() + 1);
  const [defStd, setDefStd] = useState('');
  const [defThreshold, setDefThreshold] = useState(75);
  const [defaulters, setDefaulters] = useState<StudentAttendanceSummary[]>([]);
  const [loadingDef, setLoadingDef] = useState(false);

  // Teacher attendance
  const [teacherDate, setTeacherDate] = useState(TODAY);
  const [teacherRows, setTeacherRows] = useState<Array<{ teacher_id: number; teacher_name: string; status: string; check_in: string; check_out: string }>>([]);
  const [savingTeacher, setSavingTeacher] = useState(false);

  // Holidays
  const [holYear, setHolYear]  = useState(new Date().getFullYear());
  const [holMonth, setHolMonth] = useState(new Date().getMonth() + 1);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [showHolModal, setShowHolModal] = useState(false);
  const [newHol, setNewHol] = useState({ date: TODAY, name: '', name_marathi: '', holiday_type: 'public', academic_year_id: CURRENT_AY });
  const [savingHol, setSavingHol] = useState(false);

  const loadStats = useCallback(async () => {
    try { setStats(await attendanceService.getStats(CURRENT_AY)); } catch {}
  }, []);

  useEffect(() => { loadStats(); }, [loadStats]);

  // Load existing marks when mark params change
  const loadExistingMarks = useCallback(async () => {
    setMarkLoading(true);
    try {
      const existing = await attendanceService.getDayAttendance({
        att_date: markDate, standard: markStd,
        division: markDiv, academic_year_id: CURRENT_AY,
      });
      if (existing.length > 0) {
        setAlreadyMarked(true);
        setMarkRows(existing.map(r => ({
          student_id: r.student_id,
          student_name: `Student #${r.student_id}`,
          gr_number: `GR-${r.student_id}`,
          status: r.status as AttendanceStatus,
          remarks: '',
        })));
      } else {
        setAlreadyMarked(false);
        setMarkRows([]);
      }
    } catch { setMarkRows([]); }
    finally { setMarkLoading(false); }
  }, [markDate, markStd, markDiv]);

  useEffect(() => {
    if (section === 'mark') loadExistingMarks();
  }, [section, loadExistingMarks]);

  const addMarkRow = () => setMarkRows(p => [...p, {
    student_id: 0, student_name: '', gr_number: '', status: 'present', remarks: '',
  }]);

  const updateRow = (i: number, field: string, val: string) =>
    setMarkRows(p => p.map((r, idx) => idx === i ? { ...r, [field]: val } : r));

  const markAll = (status: AttendanceStatus) =>
    setMarkRows(p => p.map(r => ({ ...r, status })));

  const saveAttendance = async () => {
    const validRows = markRows.filter(r => r.student_id > 0);
    if (validRows.length === 0) { toast.error('Add at least one student row.'); return; }
    setSaving(true);
    try {
      const saved = await attendanceService.markStudentAttendance({
        date: markDate, standard: markStd, division: markDiv,
        academic_year_id: CURRENT_AY,
        rows: validRows.map(r => ({
          student_id: r.student_id,
          status: r.status,
          remarks: r.remarks || undefined,
        })),
      });
      toast.success(`${saved} attendance records saved! ✅`);
      setAlreadyMarked(true);
      loadStats();
    } catch (e: any) { toast.error(e?.response?.data?.detail || 'Failed to save.'); }
    finally { setSaving(false); }
  };

  const loadSessions = useCallback(async () => {
    setLoadingSessions(true);
    try { setSessions(await attendanceService.getClassSessions(repStd, CURRENT_AY, repYear, repMonth)); }
    catch {} finally { setLoadingSessions(false); }
  }, [repStd, repYear, repMonth]);

  useEffect(() => { if (section === 'reports') loadSessions(); }, [section, loadSessions]);

  const loadDefaulters = useCallback(async () => {
    setLoadingDef(true);
    try {
      setDefaulters(await attendanceService.getDefaulters({
        academic_year_id: CURRENT_AY,
        year: defYear, month: defMonth,
        standard: defStd || undefined,
        threshold: defThreshold,
      }));
    } catch {} finally { setLoadingDef(false); }
  }, [defYear, defMonth, defStd, defThreshold]);

  useEffect(() => { if (section === 'defaulters') loadDefaulters(); }, [section, loadDefaulters]);

  const loadHolidays = useCallback(async () => {
    try { setHolidays(await attendanceService.getHolidays(holYear, holMonth)); }
    catch {}
  }, [holYear, holMonth]);

  useEffect(() => { if (section === 'holidays') loadHolidays(); }, [section, loadHolidays]);

  const saveHoliday = async () => {
    if (!newHol.date || !newHol.name) { toast.error('Date and name required.'); return; }
    setSavingHol(true);
    try {
      await attendanceService.createHoliday(newHol);
      toast.success('Holiday added!');
      setShowHolModal(false);
      setNewHol({ date: TODAY, name: '', name_marathi: '', holiday_type: 'public', academic_year_id: CURRENT_AY });
      loadHolidays();
    } catch { toast.error('Failed.'); }
    finally { setSavingHol(false); }
  };

  const saveTeacherAttendance = async () => {
    const validRows = teacherRows.filter(r => r.teacher_id > 0);
    if (validRows.length === 0) { toast.error('Add teacher rows.'); return; }
    setSavingTeacher(true);
    try {
      await attendanceService.markTeacherAttendance({
        date: teacherDate, academic_year_id: CURRENT_AY,
        rows: validRows.map(r => ({
          teacher_id: r.teacher_id, status: r.status,
          check_in: r.check_in || undefined, check_out: r.check_out || undefined,
        })),
      });
      toast.success('Teacher attendance saved! ✅');
      loadStats();
    } catch { toast.error('Failed.'); }
    finally { setSavingTeacher(false); }
  };

  // Calendar session map for report view
  const sessionMap = new Map(sessions.map(s => [s.date, s]));
  const daysInMonth = new Date(repYear, repMonth, 0).getDate();
  const firstDay = new Date(repYear, repMonth - 1, 1).getDay(); // 0=Sun

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Attendance Management</h1>
          <p className={styles.pageSub}>उपस्थिती व्यवस्थापन · Daily Marking & Reports</p>
        </div>
        <div className={styles.todayBadge}><CalendarDays size={14}/> {new Date().toLocaleDateString('en-IN', { weekday:'long', day:'numeric', month:'long' })}</div>
      </div>

      {/* Tabs */}
      <div className={styles.tabBar}>
        {([
          { id: 'dashboard',  label: 'Dashboard',        icon: <BarChart3 size={14}/> },
          { id: 'mark',       label: 'Mark Attendance',  icon: <UserCheck size={14}/> },
          { id: 'reports',    label: 'Monthly Report',   icon: <CalendarDays size={14}/> },
          { id: 'defaulters', label: 'Defaulters',       icon: <AlertTriangle size={14}/> },
          { id: 'teacher',    label: 'Teacher',          icon: <Users size={14}/> },
          { id: 'holidays',   label: 'Holidays',         icon: <CalendarDays size={14}/> },
        ] as const).map(t => (
          <button key={t.id} className={`${styles.tab} ${section === t.id ? styles.tabActive : ''}`}
            onClick={() => setSection(t.id as Section)}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* ── DASHBOARD ──────────────────────────────────────── */}
      {section === 'dashboard' && (
        <div className={styles.dashContent}>
          {stats ? (
            <>
              {/* Today banner */}
              <div className={styles.todayBanner}>
                <div className={styles.todayBannerLeft}>
                  <div className={styles.todayBannerTitle}>Today's Attendance</div>
                  <div className={styles.todayBannerSub}>
                    {stats.classes_marked_today} of {stats.classes_total} classes marked
                  </div>
                </div>
                <div className={styles.todayCircle} style={{ '--pct': `${stats.today_attendance_pct}` } as React.CSSProperties}>
                  <div className={styles.todayCircleInner}>
                    <span className={styles.todayPct}>{Number(stats.today_attendance_pct).toFixed(1)}%</span>
                    <span className={styles.todayPctLabel}>Present</span>
                  </div>
                </div>
                <div className={styles.todayStats}>
                  <div className={styles.todayStat}><span className={styles.tsVal} style={{color:'var(--color-success)'}}>{stats.today_present}</span><span className={styles.tsLabel}>Present</span></div>
                  <div className={styles.todayStat}><span className={styles.tsVal} style={{color:'var(--color-danger)'}}>{stats.today_absent}</span><span className={styles.tsLabel}>Absent</span></div>
                  <div className={styles.todayStat}><span className={styles.tsVal}>{stats.today_total}</span><span className={styles.tsLabel}>Total</span></div>
                </div>
              </div>

              {/* KPI grid */}
              <div className={styles.kpiGrid}>
                {[
                  { label: 'Monthly Average',    value: `${Number(stats.monthly_avg_pct).toFixed(1)}%`,  icon: <BarChart3 size={20}/>,     color: 'var(--color-primary)' },
                  { label: 'Defaulters (<75%)',  value: stats.defaulters_count,                           icon: <TrendingDown size={20}/>,   color: 'var(--color-danger)', action: () => setSection('defaulters') },
                  { label: 'Classes Marked',     value: `${stats.classes_marked_today}/${stats.classes_total}`, icon: <Check size={20}/>, color: 'var(--color-success)', action: () => setSection('mark') },
                  { label: 'Teachers Present',   value: `${stats.teacher_present_today}/${stats.teacher_total}`, icon: <UserCheck size={20}/>, color: 'var(--color-info)', action: () => setSection('teacher') },
                ].map(k => (
                  <div key={k.label} className={`${styles.kpiCard} ${k.action ? styles.kpiClickable : ''}`}
                       style={{ '--kc': k.color } as React.CSSProperties}
                       onClick={k.action}>
                    <div className={styles.kpiIcon} style={{ color: k.color }}>{k.icon}</div>
                    <div className={styles.kpiVal}>{k.value}</div>
                    <div className={styles.kpiLabel}>{k.label}</div>
                    {k.action && <ArrowRight size={13} className={styles.kpiArrow}/>}
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className={styles.loadingSkel}/>
          )}
        </div>
      )}

      {/* ── MARK ATTENDANCE ─────────────────────────────────── */}
      {section === 'mark' && (
        <div className={styles.markContent}>
          {/* Controls */}
          <div className={styles.markControls}>
            <div className={styles.controlGroup}>
              <label className={styles.controlLabel}>Date</label>
              <input type="date" className={styles.input} value={markDate} onChange={e => setMarkDate(e.target.value)} max={TODAY}/>
            </div>
            <div className={styles.controlGroup}>
              <label className={styles.controlLabel}>Standard</label>
              <select className={styles.sel} value={markStd} onChange={e => setMarkStd(e.target.value)}>
                {STANDARDS.map(s => <option key={s} value={s}>Std {s}</option>)}
              </select>
            </div>
            <div className={styles.controlGroup}>
              <label className={styles.controlLabel}>Division</label>
              <select className={styles.sel} value={markDiv} onChange={e => setMarkDiv(e.target.value)}>
                {DIVISIONS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <button className={styles.iconBtn} onClick={loadExistingMarks}><RefreshCw size={14}/></button>
          </div>

          {alreadyMarked && (
            <div className={styles.alreadyMarkedBanner}>
              <Check size={16}/> Attendance already marked for Std {markStd}-{markDiv} on {markDate}. You can update it below.
            </div>
          )}

          {/* Quick actions */}
          <div className={styles.quickActions}>
            <span className={styles.qlabel}>Mark All:</span>
            {(['present','absent','late','leave'] as AttendanceStatus[]).map(s => (
              <button key={s} className={styles.qBtn}
                style={{ background: STATUS_CONFIG[s].color, color: 'white' }}
                onClick={() => markAll(s)}>
                {STATUS_CONFIG[s].label}
              </button>
            ))}
            <button className={styles.iconBtn} onClick={addMarkRow}><Plus size={14}/> Add Row</button>
          </div>

          {/* Attendance table */}
          <div className={styles.attTableWrap}>
            {markLoading ? <div className={styles.loadingSkel}/> : (
              <table className={styles.table}>
                <thead><tr>
                  <th>#</th><th>Student ID</th><th>Name</th><th>Status</th><th>Remarks</th><th>Action</th>
                </tr></thead>
                <tbody>
                  {markRows.length === 0 ? (
                    <tr><td colSpan={6} className={styles.emptyCell}>
                      <div className={styles.emptyState}><UserCheck size={48}/><p>Add student rows or load from student list.</p></div>
                    </td></tr>
                  ) : markRows.map((row, i) => (
                    <tr key={i} className={styles.tr}>
                      <td>{i + 1}</td>
                      <td>
                        <input className={styles.miniInput} type="number" value={row.student_id || ''} placeholder="ID"
                          onChange={e => updateRow(i, 'student_id', e.target.value)}/>
                      </td>
                      <td>
                        <input className={styles.miniInput} value={row.student_name} placeholder="Name"
                          onChange={e => updateRow(i, 'student_name', e.target.value)}/>
                      </td>
                      <td>
                        <div className={styles.statusBtns}>
                          {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                            <button key={key}
                              className={`${styles.sBtn} ${row.status === key ? styles.sBtnActive : ''}`}
                              style={{ '--sc': cfg.color } as React.CSSProperties}
                              onClick={() => updateRow(i, 'status', key)}>
                              {cfg.short}
                            </button>
                          ))}
                        </div>
                      </td>
                      <td>
                        <input className={styles.miniInput} value={row.remarks} placeholder="Optional"
                          onChange={e => updateRow(i, 'remarks', e.target.value)}/>
                      </td>
                      <td>
                        <button className={styles.delBtn} onClick={() => setMarkRows(p => p.filter((_,idx)=>idx!==i))}><X size={12}/></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Summary bar */}
          {markRows.length > 0 && (
            <div className={styles.summaryBar}>
              {(['present','absent','late','half_day','leave','medical_leave'] as AttendanceStatus[]).map(s => {
                const count = markRows.filter(r => r.status === s).length;
                if (count === 0) return null;
                return (
                  <div key={s} className={styles.summaryChip} style={{ '--sc': STATUS_CONFIG[s].color } as React.CSSProperties}>
                    <span className={styles.scCount}>{count}</span>
                    <span className={styles.scLabel}>{STATUS_CONFIG[s].label}</span>
                  </div>
                );
              })}
            </div>
          )}

          <PermissionGate permission="attendance.mark">
            <button className={styles.saveBtn} onClick={saveAttendance} disabled={saving || markRows.length === 0}>
              {saving ? <span className={styles.spin}/> : <Check size={16}/>}
              {saving ? 'Saving...' : `Save Attendance (${markRows.length} students)`}
            </button>
          </PermissionGate>
        </div>
      )}

      {/* ── MONTHLY REPORT ──────────────────────────────────── */}
      {section === 'reports' && (
        <div className={styles.reportContent}>
          <div className={styles.reportControls}>
            <div className={styles.controlGroup}>
              <label className={styles.controlLabel}>Standard</label>
              <select className={styles.sel} value={repStd} onChange={e => setRepStd(e.target.value)}>
                {STANDARDS.map(s => <option key={s} value={s}>Std {s}</option>)}
              </select>
            </div>
            <div className={styles.monthNav}>
              <button className={styles.iconBtn} onClick={() => {
                if (repMonth === 1) { setRepMonth(12); setRepYear(y=>y-1); } else setRepMonth(m=>m-1);
              }}><ChevronLeft size={14}/></button>
              <span className={styles.monthLabel}>{MONTH_NAMES[repMonth-1]} {repYear}</span>
              <button className={styles.iconBtn} onClick={() => {
                if (repMonth === 12) { setRepMonth(1); setRepYear(y=>y+1); } else setRepMonth(m=>m+1);
              }}><ChevronRight size={14}/></button>
            </div>
            <button className={styles.iconBtn} onClick={loadSessions}><RefreshCw size={14}/></button>
          </div>

          {loadingSessions ? <div className={styles.loadingSkel}/> : (
            <div className={styles.calendarWrap}>
              {/* Day headers */}
              <div className={styles.calGrid}>
                {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => (
                  <div key={d} className={styles.calDayHeader}>{d}</div>
                ))}
                {/* Empty cells */}
                {Array.from({length: firstDay}).map((_,i) => <div key={`e${i}`} className={styles.calEmptyCell}/>)}
                {/* Days */}
                {Array.from({length: daysInMonth}).map((_,i) => {
                  const day = i + 1;
                  const d = `${repYear}-${String(repMonth).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
                  const session = sessionMap.get(d);
                  const dow = new Date(repYear, repMonth-1, day).getDay();
                  const isSunday = dow === 0;
                  const pct = session ? Math.round(session.present_count / Math.max(session.total_students, 1) * 100) : null;
                  return (
                    <div key={day} className={`${styles.calCell} ${isSunday ? styles.calSunday : ''} ${session?.is_holiday ? styles.calHoliday : ''}`}>
                      <span className={styles.calDay}>{day}</span>
                      {isSunday && <span className={styles.calMark} style={{color:'var(--color-text-muted)'}}>Off</span>}
                      {session && !isSunday && (
                        <>
                          <div className={styles.calBar}>
                            <div className={styles.calBarFill} style={{ width: `${pct}%`, background: pct! >= 90 ? 'var(--color-success)' : pct! >= 75 ? 'var(--color-warning)' : 'var(--color-danger)' }}/>
                          </div>
                          <div className={styles.calPct} style={{ color: pct! >= 90 ? 'var(--color-success)' : pct! >= 75 ? 'var(--color-warning)' : 'var(--color-danger)' }}>
                            {pct}%
                          </div>
                          <div className={styles.calCounts}>{session.present_count}P/{session.absent_count}A</div>
                        </>
                      )}
                      {!session && !isSunday && <span className={styles.calNotMarked}>—</span>}
                    </div>
                  );
                })}
              </div>

              {/* Summary */}
              {sessions.length > 0 && (
                <div className={styles.reportSummary}>
                  <div className={styles.rSummCard}><div className={styles.rSummVal}>{sessions.length}</div><div className={styles.rSummLabel}>Days Marked</div></div>
                  <div className={styles.rSummCard}><div className={styles.rSummVal}>{Math.round(sessions.reduce((a,s)=>a+s.present_count,0)/Math.max(sessions.reduce((a,s)=>a+s.total_students,0),1)*100)}%</div><div className={styles.rSummLabel}>Avg Attendance</div></div>
                  <div className={styles.rSummCard}><div className={styles.rSummVal}>{sessions.reduce((a,s)=>a+s.absent_count,0)}</div><div className={styles.rSummLabel}>Total Absences</div></div>
                  <div className={styles.rSummCard}><div className={styles.rSummVal}>{sessions.reduce((a,s)=>a+s.late_count,0)}</div><div className={styles.rSummLabel}>Late Entries</div></div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── DEFAULTERS ──────────────────────────────────────── */}
      {section === 'defaulters' && (
        <div className={styles.defaultersContent}>
          <div className={styles.reportControls}>
            <div className={styles.monthNav}>
              <button className={styles.iconBtn} onClick={() => {
                if (defMonth === 1) { setDefMonth(12); setDefYear(y=>y-1); } else setDefMonth(m=>m-1);
              }}><ChevronLeft size={14}/></button>
              <span className={styles.monthLabel}>{MONTH_NAMES[defMonth-1]} {defYear}</span>
              <button className={styles.iconBtn} onClick={() => {
                if (defMonth === 12) { setDefMonth(1); setDefYear(y=>y+1); } else setDefMonth(m=>m+1);
              }}><ChevronRight size={14}/></button>
            </div>
            <div className={styles.controlGroup}>
              <select className={styles.sel} value={defStd} onChange={e => setDefStd(e.target.value)}>
                <option value="">All Standards</option>
                {STANDARDS.map(s => <option key={s} value={s}>Std {s}</option>)}
              </select>
            </div>
            <div className={styles.controlGroup}>
              <select className={styles.sel} value={defThreshold} onChange={e => setDefThreshold(Number(e.target.value))}>
                {[90,85,80,75,70,65,60].map(t => <option key={t} value={t}>&lt;{t}%</option>)}
              </select>
            </div>
            <button className={styles.iconBtn} onClick={loadDefaulters}><RefreshCw size={14}/></button>
          </div>

          {loadingDef ? <div className={styles.loadingSkel}/> : (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead><tr>
                  <th>#</th><th>Name</th><th>GR No.</th><th>Standard</th>
                  <th>Working Days</th><th>Present</th><th>Absent</th><th>Late</th><th>Attendance %</th><th>Status</th>
                </tr></thead>
                <tbody>
                  {defaulters.length === 0 ? (
                    <tr><td colSpan={10} className={styles.emptyCell}>
                      <div className={styles.emptyState}><Check size={48} style={{color:'var(--color-success)'}}/><p>No defaulters! 🎉 All students above {defThreshold}%</p></div>
                    </td></tr>
                  ) : defaulters.map((d, i) => (
                    <tr key={d.student_id} className={`${styles.tr} ${d.status === 'danger' ? styles.trDanger : styles.trWarning}`}>
                      <td>{i+1}</td>
                      <td><strong>{d.student_name}</strong></td>
                      <td className={styles.monoId}>{d.gr_number}</td>
                      <td>Std {d.standard}{d.division}</td>
                      <td>{d.working_days}</td>
                      <td className={styles.presentCell}>{d.present_days}</td>
                      <td className={styles.absentCell}>{d.absent_days}</td>
                      <td className={styles.lateCell}>{d.late_days}</td>
                      <td>
                        <div className={styles.pctCell}>
                          <div className={styles.pctBar}>
                            <div className={styles.pctFill} style={{ width: `${d.attendance_percentage}%`, background: d.status === 'danger' ? 'var(--color-danger)' : 'var(--color-warning)' }}/>
                          </div>
                          <span className={styles.pctNum} style={{ color: d.status === 'danger' ? 'var(--color-danger)' : 'var(--color-warning)' }}>
                            {Number(d.attendance_percentage).toFixed(1)}%
                          </span>
                        </div>
                      </td>
                      <td>
                        <span className={`${styles.tag} ${d.status === 'danger' ? styles.tagDanger : styles.tagWarning}`}>
                          {d.status === 'danger' ? '🔴 Critical' : '🟡 Warning'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── TEACHER ATTENDANCE ──────────────────────────────── */}
      {section === 'teacher' && (
        <div className={styles.teacherContent}>
          <div className={styles.markControls}>
            <div className={styles.controlGroup}>
              <label className={styles.controlLabel}>Date</label>
              <input type="date" className={styles.input} value={teacherDate} onChange={e => setTeacherDate(e.target.value)} max={TODAY}/>
            </div>
            <button className={styles.iconBtn} onClick={() => setTeacherRows(p => [...p, { teacher_id: 0, teacher_name: '', status: 'present', check_in: '', check_out: '' }])}>
              <Plus size={14}/> Add Teacher
            </button>
          </div>

          <div className={styles.attTableWrap}>
            <table className={styles.table}>
              <thead><tr><th>#</th><th>Teacher ID</th><th>Name</th><th>Status</th><th>Check In</th><th>Check Out</th><th></th></tr></thead>
              <tbody>
                {teacherRows.length === 0 ? (
                  <tr><td colSpan={7} className={styles.emptyCell}>
                    <div className={styles.emptyState}><Users size={48}/><p>Add teacher rows to mark attendance.</p></div>
                  </td></tr>
                ) : teacherRows.map((row, i) => (
                  <tr key={i} className={styles.tr}>
                    <td>{i+1}</td>
                    <td><input className={styles.miniInput} type="number" value={row.teacher_id||''} placeholder="ID" onChange={e => setTeacherRows(p=>p.map((r,idx)=>idx===i?{...r,teacher_id:Number(e.target.value)}:r))}/></td>
                    <td><input className={styles.miniInput} value={row.teacher_name} placeholder="Name" onChange={e => setTeacherRows(p=>p.map((r,idx)=>idx===i?{...r,teacher_name:e.target.value}:r))}/></td>
                    <td>
                      <select className={styles.miniInput} value={row.status} onChange={e => setTeacherRows(p=>p.map((r,idx)=>idx===i?{...r,status:e.target.value}:r))}>
                        {['present','absent','late','half_day','leave','medical_leave','casual_leave','earned_leave'].map(s=><option key={s} value={s}>{s.replace('_',' ')}</option>)}
                      </select>
                    </td>
                    <td><input type="time" className={styles.miniInput} value={row.check_in} onChange={e => setTeacherRows(p=>p.map((r,idx)=>idx===i?{...r,check_in:e.target.value}:r))}/></td>
                    <td><input type="time" className={styles.miniInput} value={row.check_out} onChange={e => setTeacherRows(p=>p.map((r,idx)=>idx===i?{...r,check_out:e.target.value}:r))}/></td>
                    <td><button className={styles.delBtn} onClick={()=>setTeacherRows(p=>p.filter((_,idx)=>idx!==i))}><X size={12}/></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <PermissionGate permission="attendance.mark">
            <button className={styles.saveBtn} onClick={saveTeacherAttendance} disabled={savingTeacher || teacherRows.length === 0}>
              {savingTeacher ? <span className={styles.spin}/> : <Check size={16}/>}
              {savingTeacher ? 'Saving...' : `Save Teacher Attendance (${teacherRows.length})`}
            </button>
          </PermissionGate>
        </div>
      )}

      {/* ── HOLIDAYS ──────────────────────────────────────── */}
      {section === 'holidays' && (
        <div className={styles.holidayContent}>
          <div className={styles.reportControls}>
            <div className={styles.monthNav}>
              <button className={styles.iconBtn} onClick={() => { if (holMonth===1){setHolMonth(12);setHolYear(y=>y-1);}else setHolMonth(m=>m-1); }}><ChevronLeft size={14}/></button>
              <span className={styles.monthLabel}>{MONTH_NAMES[holMonth-1]} {holYear}</span>
              <button className={styles.iconBtn} onClick={() => { if (holMonth===12){setHolMonth(1);setHolYear(y=>y+1);}else setHolMonth(m=>m+1); }}><ChevronRight size={14}/></button>
            </div>
            <button className={styles.iconBtn} onClick={loadHolidays}><RefreshCw size={14}/></button>
            <PermissionGate permission="attendance.manage">
              <button className={styles.addBtn} onClick={() => setShowHolModal(true)}><Plus size={15}/> Add Holiday</button>
            </PermissionGate>
          </div>

          <div className={styles.holidayList}>
            {holidays.length === 0 ? (
              <div className={styles.emptyState}><CalendarDays size={48}/><p>No holidays in {MONTH_NAMES[holMonth-1]} {holYear}</p></div>
            ) : holidays.map(h => (
              <div key={h.id} className={styles.holidayItem}>
                <div className={styles.holDate}>{new Date(h.date).toLocaleDateString('en-IN', { day:'numeric', month:'short', weekday:'short' })}</div>
                <div>
                  <div className={styles.holName}>{h.name}</div>
                  {h.name_marathi && <div className={styles.holNameMr}>{h.name_marathi}</div>}
                </div>
                <span className={styles.holType}>{h.holiday_type}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ════ Holiday Modal ════ */}
      {showHolModal && (
        <div className={styles.overlay} onClick={() => setShowHolModal(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Add Holiday</h3>
              <button className={styles.modalClose} onClick={() => setShowHolModal(false)}><X size={16}/></button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.mf}><label className={styles.ml}>Date *</label><input type="date" className={styles.mi} value={newHol.date} onChange={e=>setNewHol(p=>({...p,date:e.target.value}))}/></div>
              <div className={styles.mf}><label className={styles.ml}>Holiday Name *</label><input className={styles.mi} value={newHol.name} onChange={e=>setNewHol(p=>({...p,name:e.target.value}))} placeholder="e.g. Diwali"/></div>
              <div className={styles.mf}><label className={styles.ml}>Name (Marathi)</label><input className={styles.mi} value={newHol.name_marathi} onChange={e=>setNewHol(p=>({...p,name_marathi:e.target.value}))} placeholder="दिवाळी"/></div>
              <div className={styles.mf}><label className={styles.ml}>Type</label>
                <select className={styles.mi} value={newHol.holiday_type} onChange={e=>setNewHol(p=>({...p,holiday_type:e.target.value}))}>
                  {['public','school','local','exam'].map(t=><option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>
            <div className={styles.modalFooter}>
              <button className={styles.cancelBtn} onClick={() => setShowHolModal(false)}>Cancel</button>
              <button className={styles.submitBtn} onClick={saveHoliday} disabled={savingHol}>{savingHol ? <span className={styles.spin}/> : <Check size={14}/>} Add</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
