/**
 * VidyaSetu ERP — Professional Teacher & Class Teacher Workspace
 * ================================================================
 * Industrial Grade Teacher Workspace.
 * Designed with CSS Design Tokens, Lucide vector icons, and zero duplicate navigation.
 */
import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Users, CalendarDays, ClipboardList, BookOpen,
  Bell, UserCheck, X, Search, Plus,
  Palmtree, LayoutDashboard, CheckCircle2
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import styles from './TeacherPortalPage.module.css';

type Tab = 'dashboard' | 'timetable' | 'students' | 'attendance' | 'notices' | 'leaves' | 'profile';

const TEACHER_TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'dashboard',  label: 'Dashboard',    icon: <LayoutDashboard size={16} /> },
  { id: 'attendance', label: 'Attendance',   icon: <ClipboardList size={16} /> },
  { id: 'timetable',  label: 'Timetable',    icon: <CalendarDays size={16} /> },
  { id: 'students',   label: 'Students',     icon: <Users size={16} /> },
  { id: 'notices',    label: 'Notices',      icon: <Bell size={16} /> },
  { id: 'leaves',     label: 'Leave',        icon: <Palmtree size={16} /> },
  { id: 'profile',    label: 'My Profile',   icon: <UserCheck size={16} /> },
];

interface TeacherProfile { teacher: any; stats: any; }

export default function TeacherPortalPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = (searchParams.get('tab') as Tab) || 'dashboard';
  const [tab, setTabState] = useState<Tab>(tabParam);

  useEffect(() => {
    const param = searchParams.get('tab') as Tab;
    if (param && param !== tab) {
      setTabState(param);
    }
  }, [searchParams]);

  const setTab = (t: Tab) => {
    setTabState(t);
    setSearchParams({ tab: t });
  };

  const [profile, setProfile] = useState<TeacherProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Timetable
  const [timetable, setTimetable] = useState<{ today: any[]; full_week: any[] }>({ today: [], full_week: [] });

  // Students
  const [students, setStudents] = useState<any[]>([]);
  const [studentSearch, setStudentSearch] = useState('');
  const [stdFilter, setStdFilter] = useState('');

  // Attendance
  const [attStudents, setAttStudents] = useState<any[]>([]);
  const [attMap, setAttMap] = useState<Record<number, string>>({});
  const [attStd, setAttStd] = useState('');
  const [attDiv, setAttDiv] = useState('');
  const [attDate, setAttDate] = useState(new Date().toISOString().split('T')[0]);
  const [savingAtt, setSavingAtt] = useState(false);

  // Notices
  const [notices, setNotices] = useState<any[]>([]);

  // Leaves
  const [leaves, setLeaves] = useState<any[]>([]);
  const [showLeaveForm, setShowLeaveForm] = useState(false);
  const [leaveForm, setLeaveForm] = useState({ leave_type: 'casual', start_date: '', end_date: '', reason: '' });
  const [savingLeave, setSavingLeave] = useState(false);

  // Load profile
  const loadProfile = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/teacher-portal/me');
      setProfile(res.data.data);
      const classes = res.data.data?.teacher?.classes_assigned || [];
      if (classes.length > 0) {
        setAttStd(classes[0]);
        setStdFilter(classes[0]);
      }
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || 'Failed to load profile');
    } finally { setLoading(false); }
  }, []);

  const loadTimetable = useCallback(async () => {
    try {
      const res = await api.get('/teacher-portal/timetable');
      setTimetable(res.data.data);
    } catch { toast.error('Failed to load timetable'); }
  }, []);

  const loadStudents = useCallback(async () => {
    try {
      const params: Record<string, string> = {};
      if (stdFilter) params.standard = stdFilter;
      if (studentSearch) params.search = studentSearch;
      const res = await api.get('/teacher-portal/students', { params });
      setStudents(res.data.data?.students || []);
    } catch { toast.error('Failed to load students'); }
  }, [stdFilter, studentSearch]);

  const loadAttStudents = useCallback(async () => {
    if (!attStd) return;
    try {
      const params: Record<string, string> = { standard: attStd };
      if (attDiv) params.division = attDiv;
      const res = await api.get('/teacher-portal/students', { params });
      const studs = res.data.data?.students || [];
      setAttStudents(studs);
      const map: Record<number, string> = {};
      studs.forEach((s: any) => { map[s.id] = 'present'; });
      setAttMap(map);
    } catch { toast.error('Failed to load students'); }
  }, [attStd, attDiv]);

  const loadNotices = useCallback(async () => {
    try {
      const res = await api.get('/teacher-portal/notices');
      setNotices(res.data.data?.notices || []);
    } catch { toast.error('Failed to load notices'); }
  }, []);

  const loadLeaves = useCallback(async () => {
    try {
      const res = await api.get('/teacher-portal/leaves');
      setLeaves(res.data.data?.leaves || []);
    } catch { toast.error('Failed to load leaves'); }
  }, []);

  useEffect(() => { loadProfile(); }, [loadProfile]);

  useEffect(() => {
    if (tab === 'timetable') loadTimetable();
    else if (tab === 'students') loadStudents();
    else if (tab === 'attendance') loadAttStudents();
    else if (tab === 'notices') loadNotices();
    else if (tab === 'leaves') loadLeaves();
  }, [tab, loadTimetable, loadStudents, loadAttStudents, loadNotices, loadLeaves]);

  // Attendance Save
  const handleSaveAttendance = async () => {
    setSavingAtt(true);
    try {
      const entries = Object.entries(attMap).map(([sid, st]) => ({
        student_id: Number(sid),
        status: st,
      }));
      await api.post('/teacher-portal/attendance', {
        standard: attStd,
        division: attDiv || null,
        date: attDate,
        records: entries,
      });
      toast.success(`Attendance marked successfully for ${entries.length} students!`);
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || 'Failed to save attendance');
    } finally { setSavingAtt(false); }
  };

  // Leave Submit
  const handleApplyLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingLeave(true);
    try {
      await api.post('/teacher-portal/leaves', leaveForm);
      toast.success('Leave application submitted to Principal!');
      setShowLeaveForm(false);
      loadLeaves();
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || 'Failed to apply leave');
    } finally { setSavingLeave(false); }
  };

  if (loading) {
    return (
      <div className={styles.portal}>
        <div className={styles.loading}>
          <div className={styles.spinner} />
          <p>Loading Teacher Workspace...</p>
        </div>
      </div>
    );
  }

  const teacher = profile?.teacher;
  const s = profile?.stats;
  const classes = teacher?.classes_assigned ? teacher.classes_assigned.split(',') : [];

  return (
    <div className={styles.portal}>
      {/* ── Page Header ────────────────────────────────────────── */}
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>
            <UserCheck size={24} color="var(--color-primary)" />
            Teacher Digital Workspace
          </h1>
          <p className={styles.pageSub}>
            Welcome, {teacher?.salutation || 'Prof.'} {teacher?.full_name} • EMP: {teacher?.employee_id || 'EMP-001'} • {teacher?.designation || 'Teacher'}
          </p>
        </div>
        <button className={styles.primaryBtn} onClick={() => setTab('attendance')}>
          <ClipboardList size={16} /> Mark Attendance
        </button>
      </div>

      {/* ── Welcome Hero Banner ────────────────────────────────── */}
      <div className={styles.hero}>
        <div className={styles.avatar}>
          {teacher?.photo_path
            ? <img src={`/storage/${teacher.photo_path}`} alt={teacher.full_name} />
            : (teacher?.full_name?.[0] || 'T')}
        </div>
        <div className={styles.heroInfo}>
          <h2 className={styles.heroName}>{teacher?.salutation} {teacher?.full_name}</h2>
          {teacher?.full_name_marathi && <p className={styles.heroNameMr}>{teacher.full_name_marathi}</p>}
          <div className={styles.heroBadges}>
            <span className={styles.badge}>EMP ID: {teacher?.employee_id}</span>
            <span className={styles.badge}>{teacher?.designation || 'Teacher'}</span>
            {classes.map((c: string) => <span key={c} className={styles.badge}>Std {c}</span>)}
          </div>
        </div>
      </div>

      {/* ── Tab Navigation Bar ──────────────────────────────────── */}
      <nav className={styles.tabNav} aria-label="Teacher portal navigation">
        {TEACHER_TABS.map(t => (
          <button
            key={t.id}
            className={`${styles.tabBtn} ${tab === t.id ? styles.tabBtnActive : ''}`}
            onClick={() => setTab(t.id)}
            aria-current={tab === t.id ? 'page' : undefined}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </nav>

      {/* ── Metric Overview Cards ──────────────────────────────── */}
      <div className={styles.overviewGrid}>
        <div className={styles.overviewCard} style={{ '--c': 'var(--color-primary)' } as any} onClick={() => setTab('students')}>
          <div className={styles.overviewIcon}><BookOpen size={20} /></div>
          <div className={styles.overviewVal}>{s?.assigned_classes ?? 0}</div>
          <div className={styles.overviewLabel}>Assigned Classes</div>
        </div>
        <div className={styles.overviewCard} style={{ '--c': 'var(--color-success)' } as any} onClick={() => setTab('students')}>
          <div className={styles.overviewIcon}><Users size={20} /></div>
          <div className={styles.overviewVal}>{s?.total_students ?? 0}</div>
          <div className={styles.overviewLabel}>Total Students</div>
        </div>
        <div className={styles.overviewCard} style={{ '--c': 'var(--color-warning)' } as any} onClick={() => setTab('timetable')}>
          <div className={styles.overviewIcon}><CalendarDays size={20} /></div>
          <div className={styles.overviewVal}>{s?.today_periods ?? 0}</div>
          <div className={styles.overviewLabel}>Today's Periods</div>
        </div>
        <div className={styles.overviewCard} style={{ '--c': 'var(--color-danger)' } as any} onClick={() => setTab('attendance')}>
          <div className={styles.overviewIcon}><ClipboardList size={20} /></div>
          <div className={styles.overviewVal}>{s?.academic_year || '2025-26'}</div>
          <div className={styles.overviewLabel}>Academic Year</div>
        </div>
      </div>

      {/* ── ACTIVE FEATURE SECTION CONTENT ─────────────────────── */}
      {/* 1. DASHBOARD */}
      {tab === 'dashboard' && (
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 'var(--space-5)' }}>
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <h3 className={styles.cardTitle}><CalendarDays size={18} color="var(--color-primary)" /> Today's Teaching Schedule</h3>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ padding: '12px 16px', background: 'var(--color-surface-2)', borderRadius: 'var(--radius-md)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <strong style={{ color: 'var(--color-text-primary)' }}>09:00 AM - 10:00 AM</strong>
                  <span style={{ marginLeft: 8, padding: '2px 8px', background: 'var(--color-primary-light)', color: 'var(--color-primary)', borderRadius: 999, fontSize: '0.75rem', fontWeight: 700 }}>Std 9-A • Mathematics</span>
                </div>
                <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>Room 102</span>
              </div>
              <div style={{ padding: '12px 16px', background: 'var(--color-surface-2)', borderRadius: 'var(--radius-md)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <strong style={{ color: 'var(--color-text-primary)' }}>11:30 AM - 12:30 PM</strong>
                  <span style={{ marginLeft: 8, padding: '2px 8px', background: 'var(--color-success-light)', color: 'var(--color-success)', borderRadius: 999, fontSize: '0.75rem', fontWeight: 700 }}>Std 10-B • Science Lab</span>
                </div>
                <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>Lab 2</span>
              </div>
            </div>
          </div>

          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <h3 className={styles.cardTitle}><Plus size={18} color="var(--color-primary)" /> Teacher Quick Actions</h3>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button className={styles.primaryBtn} onClick={() => setTab('attendance')}><ClipboardList size={16} /> Mark Class Attendance</button>
              <button className={styles.secondaryBtn} onClick={() => setTab('students')}><Users size={16} /> View Class Students</button>
              <button className={styles.secondaryBtn} onClick={() => setTab('leaves')}><Palmtree size={16} /> Apply Leave</button>
            </div>
          </div>
        </div>
      )}

      {/* 2. ATTENDANCE MARKING */}
      {tab === 'attendance' && (
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h3 className={styles.cardTitle}><ClipboardList size={20} color="var(--color-primary)" /> Student Attendance Register</h3>
            <button className={styles.primaryBtn} onClick={handleSaveAttendance} disabled={savingAtt || !attStudents.length}>
              <CheckCircle2 size={16} /> {savingAtt ? 'Saving...' : 'Submit Attendance'}
            </button>
          </div>

          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Select Class</label>
              <select className={styles.selectField} value={attStd} onChange={e => setAttStd(e.target.value)}>
                {classes.map((c: string) => <option key={c} value={c}>Std {c}</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Division</label>
              <input className={styles.inputField} style={{ width: 80 }} value={attDiv} onChange={e => setAttDiv(e.target.value.toUpperCase())} placeholder="A" />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Date</label>
              <input type="date" className={styles.inputField} value={attDate} onChange={e => setAttDate(e.target.value)} />
            </div>
            <button className={styles.secondaryBtn} style={{ marginTop: 'auto' }} onClick={loadAttStudents}><Search size={14} /> Fetch Students</button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
            {attStudents.map((stud, idx) => {
              const currentSt = attMap[stud.id] || 'present';
              return (
                <div key={stud.id} className={styles.attRow}>
                  <div>
                    <div className={styles.attName}>{idx + 1}. {stud.full_name}</div>
                    <div className={styles.attSub}>GR: {stud.gr_number} | Roll #{stud.roll_number || '—'}</div>
                  </div>
                  <div className={styles.attBtnGroup}>
                    <button className={`${styles.attBtn} ${currentSt === 'present' ? styles.attBtnPresent : ''}`} onClick={() => setAttMap(m => ({ ...m, [stud.id]: 'present' }))}>Present</button>
                    <button className={`${styles.attBtn} ${currentSt === 'absent' ? styles.attBtnAbsent : ''}`} onClick={() => setAttMap(m => ({ ...m, [stud.id]: 'absent' }))}>Absent</button>
                    <button className={`${styles.attBtn} ${currentSt === 'leave' ? styles.attBtnLeave : ''}`} onClick={() => setAttMap(m => ({ ...m, [stud.id]: 'leave' }))}>Leave</button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 3. TIMETABLE */}
      {tab === 'timetable' && (
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h3 className={styles.cardTitle}><CalendarDays size={20} color="var(--color-primary)" /> Weekly Teaching Schedule</h3>
          </div>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead><tr><th>Day</th><th>Period 1</th><th>Period 2</th><th>Period 3</th><th>Period 4</th></tr></thead>
              <tbody>
                {timetable.full_week?.map((w: any) => (
                  <tr key={w.day}>
                    <td><strong>{w.day_en}</strong></td>
                    {w.periods?.slice(0, 4).map((p: any, i: number) => (
                      <td key={i}>{p.subject} (Std {p.standard}-{p.division})</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 4. STUDENTS */}
      {tab === 'students' && (
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h3 className={styles.cardTitle}><Users size={20} color="var(--color-primary)" /> Class Student Roster</h3>
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <input className={styles.inputField} style={{ flex: 1 }} value={studentSearch} onChange={e => setStudentSearch(e.target.value)} placeholder="Search student name or GR number..." />
            <button className={styles.primaryBtn} onClick={loadStudents}><Search size={14} /> Search</button>
          </div>
          <div className={styles.tableWrap} style={{ marginTop: 12 }}>
            <table className={styles.table}>
              <thead><tr><th>GR No</th><th>Roll</th><th>Student Name</th><th>Standard</th><th>Parent Contact</th></tr></thead>
              <tbody>
                {students.map(s => (
                  <tr key={s.id}>
                    <td><strong>{s.gr_number}</strong></td>
                    <td>{s.roll_number || '—'}</td>
                    <td><strong>{s.full_name}</strong></td>
                    <td>Std {s.standard}-{s.division}</td>
                    <td>{s.father_mobile || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 5. NOTICES */}
      {tab === 'notices' && (
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h3 className={styles.cardTitle}><Bell size={20} color="var(--color-primary)" /> School Notices & Circulars</h3>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {notices.map(n => (
              <div key={n.id} style={{ padding: 16, background: 'var(--color-surface-2)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, padding: '2px 8px', background: 'var(--color-primary-light)', color: 'var(--color-primary)', borderRadius: 999 }}>{n.notice_type || 'General'}</span>
                <h4 style={{ margin: '6px 0 4px' }}>{n.title}</h4>
                <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>{n.content}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 6. LEAVES */}
      {tab === 'leaves' && (
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h3 className={styles.cardTitle}><Palmtree size={20} color="var(--color-primary)" /> Teacher Leave Applications</h3>
            <button className={styles.primaryBtn} onClick={() => setShowLeaveForm(true)}><Plus size={14} /> Apply Leave</button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {leaves.map((l: any) => (
              <div key={l.id} style={{ padding: 16, background: 'var(--color-surface-2)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, padding: '2px 8px', background: 'var(--color-warning-light)', color: 'var(--color-warning-dark)', borderRadius: 999 }}>{l.status?.toUpperCase()}</span>
                <h4 style={{ margin: '6px 0 4px' }}>{l.leave_type?.toUpperCase()} ({l.start_date} to {l.end_date})</h4>
                <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>{l.reason}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 7. PROFILE */}
      {tab === 'profile' && (
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h3 className={styles.cardTitle}><UserCheck size={20} color="var(--color-primary)" /> Teacher Employee Profile</h3>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
            <div style={{ background: 'var(--color-surface-2)', padding: 16, borderRadius: 'var(--radius-lg)' }}>
              <strong>Full Name:</strong> {teacher?.salutation} {teacher?.full_name}<br /><br />
              <strong>Employee ID:</strong> {teacher?.employee_id}<br /><br />
              <strong>Designation:</strong> {teacher?.designation}<br /><br />
              <strong>Department:</strong> {teacher?.department || 'Teaching'}
            </div>
            <div style={{ background: 'var(--color-surface-2)', padding: 16, borderRadius: 'var(--radius-lg)' }}>
              <strong>Mobile Contact:</strong> {teacher?.mobile || '—'}<br /><br />
              <strong>Email:</strong> {teacher?.email || '—'}<br /><br />
              <strong>Qualification:</strong> {teacher?.highest_qualification || 'B.Ed / M.A.'}<br /><br />
              <strong>SARAL ID:</strong> {teacher?.teacher_saral_id || '—'}
            </div>
          </div>
        </div>
      )}

      {/* ── LEAVE MODAL ───────────────────────────────────────── */}
      {showLeaveForm && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <div className={styles.modalTitle}>
              <span>Submit Leave Application</span>
              <button className={styles.closeBtn} onClick={() => setShowLeaveForm(false)}>✕</button>
            </div>
            <form onSubmit={handleApplyLeave} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <select className={styles.selectField} value={leaveForm.leave_type} onChange={e => setLeaveForm(l => ({ ...l, leave_type: e.target.value }))}>
                <option value="casual">Casual Leave</option>
                <option value="medical">Medical Leave</option>
                <option value="earned">Earned Leave</option>
              </select>
              <input type="date" className={styles.inputField} value={leaveForm.start_date} onChange={e => setLeaveForm(l => ({ ...l, start_date: e.target.value }))} required />
              <input type="date" className={styles.inputField} value={leaveForm.end_date} onChange={e => setLeaveForm(l => ({ ...l, end_date: e.target.value }))} required />
              <input className={styles.inputField} value={leaveForm.reason} onChange={e => setLeaveForm(l => ({ ...l, reason: e.target.value }))} placeholder="Reason for leave..." required />
              <button type="submit" className={styles.primaryBtn} disabled={savingLeave}>Submit to Principal</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
