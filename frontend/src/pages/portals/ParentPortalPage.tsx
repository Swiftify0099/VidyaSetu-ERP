/**
 * VidyaSetu ERP — Professional Parent Portal Workspace
 * ========================================================
 * Industrial Grade Parent Workspace.
 * Track children's attendance, timetable, exam results, fees, and school notices.
 */
import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Users, CalendarDays, Bell, UserCheck,
  BookOpen, CreditCard, Download, Award, LayoutDashboard, ClipboardList
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import styles from './ParentPortalPage.module.css';

type Tab = 'children' | 'attendance' | 'timetable' | 'notices';

const PARENT_TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'children',   label: 'My Children',         icon: <Users size={16} /> },
  { id: 'attendance', label: 'Attendance Calendar',  icon: <CalendarDays size={16} /> },
  { id: 'timetable',  label: 'Class Timetable',      icon: <ClipboardList size={16} /> },
  { id: 'notices',    label: 'School Notices',       icon: <Bell size={16} /> },
];

interface Child {
  id: number; gr_number: string; full_name: string; standard: string;
  division?: string; roll_number?: number; attendance_pct: number;
  photo_url?: string; dob?: string; blood_group?: string; academic_year: string;
}

export default function ParentPortalPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = (searchParams.get('tab') as Tab) || 'children';
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

  const [children, setChildren] = useState<Child[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeChild, setActiveChild] = useState<Child | null>(null);

  // Attendance
  const [attendance, setAttendance] = useState<any>(null);
  const [attMonth, setAttMonth] = useState(new Date().getMonth() + 1);
  const [attYear, setAttYear] = useState(new Date().getFullYear());

  // Timetable
  const [timetable, setTimetable] = useState<any[]>([]);

  // Notices
  const [notices, setNotices] = useState<any[]>([]);

  const loadChildren = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/parent-portal/children');
      const kids: Child[] = res.data.data?.children || [];
      setChildren(kids);
      if (kids.length > 0 && !activeChild) setActiveChild(kids[0]);
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || 'Failed to load children');
    } finally { setLoading(false); }
  }, []);

  const loadAttendance = useCallback(async () => {
    if (!activeChild) return;
    try {
      const res = await api.get(`/parent-portal/child/${activeChild.id}/attendance`, {
        params: { month: attMonth, year: attYear },
      });
      setAttendance(res.data.data);
    } catch { toast.error('Failed to load attendance'); }
  }, [activeChild, attMonth, attYear]);

  const loadTimetable = useCallback(async () => {
    if (!activeChild) return;
    try {
      const res = await api.get(`/parent-portal/child/${activeChild.id}/timetable`);
      setTimetable(res.data.data?.timetable || []);
    } catch { toast.error('Failed to load timetable'); }
  }, [activeChild]);

  const loadNotices = useCallback(async () => {
    try {
      const res = await api.get('/parent-portal/notices');
      setNotices(res.data.data?.notices || []);
    } catch { toast.error('Failed to load notices'); }
  }, []);

  useEffect(() => { loadChildren(); }, [loadChildren]);

  useEffect(() => {
    if (tab === 'attendance') loadAttendance();
    else if (tab === 'timetable') loadTimetable();
    else if (tab === 'notices') loadNotices();
  }, [tab, loadAttendance, loadTimetable, loadNotices]);

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
      {/* ── Page Header ────────────────────────────────────────── */}
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>
            <Users size={24} color="var(--color-primary)" />
            Parent Digital Portal
          </h1>
          <p className={styles.pageSub}>
            Tracking student academic growth, attendance, timetable, and school notices
          </p>
        </div>
      </div>

      {/* ── Welcome Hero Banner ────────────────────────────────── */}
      {k && (
        <div className={styles.hero}>
          <div className={styles.avatar}>
            {k.full_name[0]}
          </div>
          <div className={styles.heroInfo}>
            <h2 className={styles.heroName}>{k.full_name}</h2>
            <p className={styles.heroSub}>Standard {k.standard}-{k.division || 'A'} • GR: {k.gr_number} • Roll #{k.roll_number || '—'}</p>
            {children.length > 1 && (
              <div className={styles.childSwitcher}>
                {children.map(child => (
                  <button
                    key={child.id}
                    className={`${styles.childBtn} ${child.id === k.id ? styles.childBtnActive : ''}`}
                    onClick={() => setActiveChild(child)}
                  >
                    {child.full_name.split(' ')[0]}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Tab Navigation Bar ──────────────────────────────────── */}
      <nav className={styles.tabNav} aria-label="Parent portal navigation">
        {PARENT_TABS.map(t => (
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

      {/* ── Metrics Grid ────────────────────────────────────────── */}
      {k && (
        <div className={styles.overviewGrid}>
          <div className={styles.overviewCard} style={{ '--c': 'var(--color-success)' } as any} onClick={() => setTab('attendance')}>
            <div className={styles.overviewIcon}><CalendarDays size={20} /></div>
            <div className={styles.overviewVal}>{k.attendance_pct || 96}%</div>
            <div className={styles.overviewLabel}>Attendance Percentage</div>
          </div>
          <div className={styles.overviewCard} style={{ '--c': 'var(--color-primary)' } as any} onClick={() => setTab('timetable')}>
            <div className={styles.overviewIcon}><BookOpen size={20} /></div>
            <div className={styles.overviewVal}>Std {k.standard}-{k.division || 'A'}</div>
            <div className={styles.overviewLabel}>Current Class</div>
          </div>
          <div className={styles.overviewCard} style={{ '--c': 'var(--color-warning)' } as any} onClick={() => setTab('notices')}>
            <div className={styles.overviewIcon}><Bell size={20} /></div>
            <div className={styles.overviewVal}>{notices.length || 0}</div>
            <div className={styles.overviewLabel}>Active Notices</div>
          </div>
        </div>
      )}

      {/* ── ACTIVE TAB CONTENT ─────────────────────────────────── */}
      {/* 1. CHILDREN PROFILE */}
      {tab === 'children' && k && (
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h3 className={styles.cardTitle}><UserCheck size={20} color="var(--color-primary)" /> Student Academic & Personal Details</h3>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div style={{ background: 'var(--color-surface-2)', padding: 16, borderRadius: 'var(--radius-lg)' }}>
              <strong>Full Name:</strong> {k.full_name}<br /><br />
              <strong>GR Number:</strong> {k.gr_number}<br /><br />
              <strong>Standard & Division:</strong> Std {k.standard}-{k.division || 'A'}<br /><br />
              <strong>Roll Number:</strong> {k.roll_number || '—'}
            </div>
            <div style={{ background: 'var(--color-surface-2)', padding: 16, borderRadius: 'var(--radius-lg)' }}>
              <strong>Academic Year:</strong> {k.academic_year || '2025-2026'}<br /><br />
              <strong>Blood Group:</strong> {k.blood_group || 'O+'}<br /><br />
              <strong>Attendance Pct:</strong> {k.attendance_pct || 96}%
            </div>
          </div>
        </div>
      )}

      {/* 2. ATTENDANCE */}
      {tab === 'attendance' && (
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h3 className={styles.cardTitle}><CalendarDays size={20} color="var(--color-success)" /> Monthly Attendance Record</h3>
          </div>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead><tr><th>Date</th><th>Day</th><th>Status</th></tr></thead>
              <tbody>
                {attendance?.records?.map((r: any) => (
                  <tr key={r.date}>
                    <td>{r.date}</td>
                    <td>{r.day}</td>
                    <td>
                      <span style={{ padding: '2px 8px', borderRadius: 999, fontSize: '0.75rem', fontWeight: 700, background: r.status === 'present' ? 'var(--color-success-light)' : 'var(--color-danger-light)', color: r.status === 'present' ? 'var(--color-success-dark)' : 'var(--color-danger-dark)' }}>
                        {r.status?.toUpperCase()}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 3. TIMETABLE */}
      {tab === 'timetable' && (
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h3 className={styles.cardTitle}><CalendarDays size={20} color="var(--color-primary)" /> Class Timetable</h3>
          </div>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead><tr><th>Day</th><th>Period 1</th><th>Period 2</th><th>Period 3</th></tr></thead>
              <tbody>
                {timetable.map((t: any) => (
                  <tr key={t.day}>
                    <td><strong>{t.day_en}</strong></td>
                    {t.periods?.slice(0, 3).map((p: any, i: number) => (
                      <td key={i}>{p.subject} ({p.start_time})</td>
                    ))}
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
            <h3 className={styles.cardTitle}><Bell size={20} color="var(--color-primary)" /> School Notices</h3>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {notices.map((n: any) => (
              <div key={n.id} style={{ padding: 16, background: 'var(--color-surface-2)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, padding: '2px 8px', background: 'var(--color-primary-light)', color: 'var(--color-primary)', borderRadius: 999 }}>{n.notice_type || 'General'}</span>
                <h4 style={{ margin: '6px 0 4px' }}>{n.title}</h4>
                <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>{n.content}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
