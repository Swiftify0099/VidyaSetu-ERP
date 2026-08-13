/**
 * VidyaSetu ERP — Role-Dispatched Enterprise Dashboard
 * =====================================================
 * Automatically renders the correct dashboard for each role.
 * Admin/SuperAdmin → Full KPI dashboard
 * All other roles → Their own role-specific dashboard component
 */
import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  GraduationCap, Users, BookOpen, DollarSign,
  AlertCircle, CheckCircle2, Clock, Package, Library,
  RefreshCw, Activity, BarChart3, Bell, ArrowRight,
  Shield, Zap, FileText, TrendingUp, TrendingDown, Send, Copy, ChevronDown
} from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip,
  CartesianGrid, Cell
} from 'recharts';
import toast from 'react-hot-toast';
import api from '../../services/api';
import notificationService from '../../services/notificationService';
import styles from './DashboardPage.module.css';
import {
  PrincipalDashboard, VicePrincipalDashboard,
  ClerkDashboard, AccountantDashboard,
  TeacherDashboard, ClassTeacherDashboard,
  LibrarianDashboard, ReceptionistDashboard,
  ExamCoordinatorDashboard, GenericStaffDashboard,
} from './RoleDashboards';

interface DashboardKPI {
  total_students: number;
  total_teachers: number;
  today_attendance_pct: number;
  fee_collection_pct: number;
  books_issued: number;
  pending_assets_repair: number;
  active_notices: number;
  low_stock_alerts: number;
  monthly_revenue: Array<{ month: number; amount: number }>;
}

interface ActivityItem {
  id: string;
  title: string;
  sub: string;
  time: string;
  type: 'admission' | 'fee' | 'attendance' | 'notice' | 'library';
}

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

interface StatCardProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
  trend?: { value: number; up: boolean };
  sub?: string;
  loading?: boolean;
  onClick?: () => void;
}

function StatCard({ label, value, icon, color, trend, sub, loading, onClick }: StatCardProps) {
  return (
    <div
      className={styles.statCard}
      style={{ '--card-color': color } as React.CSSProperties}
    >
      <div className={styles.statHeader}>
        <div className={styles.statIconWrap}>{icon}</div>
      </div>
      
      <div 
        className={styles.statBody} 
        onClick={onClick} 
        role={onClick ? 'button' : undefined} 
        tabIndex={onClick ? 0 : undefined}
      >
        {loading ? (
          <div className={styles.statValueLoading}>—</div>
        ) : (
          <div className={styles.statValue}>
            {value}
            {trend && (
              <span className={`${styles.trend} ${trend.up ? styles.trendUp : styles.trendDown}`}>
                {trend.up ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                {trend.value}%
              </span>
            )}
          </div>
        )}
        <div className={styles.statLabel}>{label}</div>
        {sub && <div className={styles.statSub}>{sub}</div>}
      </div>
    </div>
  );
}

function QuickAction({ icon, label, color, onClick }: { icon: React.ReactNode; label: string; color: string; onClick?: () => void }) {
  return (
    <button className={styles.quickAction} onClick={onClick} style={{ '--qa-color': color } as React.CSSProperties}>
      <div className={styles.qaIcon}>{icon}</div>
      <span className={styles.qaLabel}>{label}</span>
    </button>
  );
}

// Custom Recharts Tooltip
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className={styles.chartTooltip}>
        <p className={styles.tooltipLabel}>{`${label}`}</p>
        <p className={styles.tooltipVal}>{`Collection: ₹${payload[0].value.toLocaleString('en-IN')}`}</p>
      </div>
    );
  }
  return null;
};

export default function DashboardPage() {
  const { t } = useTranslation();
  const { user, hasPermission, hasRole, isSuperAdmin } = useAuth();
  const navigate = useNavigate();

  // ── Role detection ─────────────────────────────────────────
  const primaryRole = user?.roles?.[0]?.code ?? '';
  const isAdmin = isSuperAdmin() || hasRole('admin');

  // Redirect portals to their own pages
  useEffect(() => {
    if (!user) return;
    if (primaryRole === 'student') navigate('/student-portal', { replace: true });
    else if (primaryRole === 'teacher' || primaryRole === 'class_teacher') navigate('/teacher-portal', { replace: true });
    else if (primaryRole === 'parent') navigate('/parent-portal', { replace: true });
  }, [user, navigate, primaryRole]);

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  // ── Role → Dashboard dispatch ──────────────────────────────
  if (!isAdmin) {
    const roleDashMap: Record<string, React.ReactNode> = {
      principal:         <PrincipalDashboard />,
      vice_principal:    <VicePrincipalDashboard />,
      clerk:             <ClerkDashboard />,
      accountant:        <AccountantDashboard />,
      class_teacher:     <ClassTeacherDashboard />,
      teacher:           <TeacherDashboard />,
      librarian:         <LibrarianDashboard />,
      receptionist:      <ReceptionistDashboard />,
      exam_coordinator:  <ExamCoordinatorDashboard />,
    };
    const roleDash = roleDashMap[primaryRole];
    if (roleDash) {
      const roleLabel: Record<string, string> = {
        principal:         '🏫 Principal Dashboard',
        vice_principal:    '📋 Vice Principal Dashboard',
        clerk:             '📂 Clerk Dashboard',
        accountant:        '💰 Accountant Dashboard',
        class_teacher:     '🏫 Class Teacher Dashboard',
        teacher:           '📚 Teacher Dashboard',
        librarian:         '📖 Library Dashboard',
        receptionist:      '🎯 Reception Dashboard',
        exam_coordinator:  '📝 Exam Coordinator Dashboard',
      };
      return (
        <div className={styles.page}>
          <div className={styles.pageHeader}>
            <div>
              <h1 className={styles.pageTitle}>
                {greeting()}, {user?.full_name?.split(' ')[0]} 👋
              </h1>
              <p className={styles.pageSubtitle}>
                {roleLabel[primaryRole]} · VidyaSetu ERP 2025-26
              </p>
            </div>
          </div>
          {roleDash}
        </div>
      );
    }
    // Fallback for office_staff, support_staff, transport_incharge
    return (
      <div className={styles.page}>
        <div className={styles.pageHeader}>
          <div>
            <h1 className={styles.pageTitle}>Good to see you, {user?.full_name?.split(' ')[0]} 👋</h1>
            <p className={styles.pageSubtitle}>VidyaSetu ERP 2025-26</p>
          </div>
        </div>
        <GenericStaffDashboard />
      </div>
    );
  }

  // ── Admin / Super Admin → Full dashboard below ─────────────
  const [kpi, setKpi] = useState<DashboardKPI | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [activities, setActivities] = useState<ActivityItem[]>([]);

  // ── FCM Push Test State ────────────────────────────────────
  const [fcmTesting, setFcmTesting] = useState(false);
  const [fcmResult, setFcmResult] = useState<any>(null);
  const [currentToken, setCurrentToken] = useState<string | null>(
    notificationService.getCachedFcmToken()
  );
  const [copiedToken, setCopiedToken] = useState(false);
  const [notifPerm, setNotifPerm] = useState<NotificationPermission>(
    typeof Notification !== 'undefined' ? Notification.permission : 'default'
  );

  const handleRequestFcmPermission = async () => {
    const token = await notificationService.initFcmToken();
    setNotifPerm(typeof Notification !== 'undefined' ? Notification.permission : 'default');
    if (token) {
      setCurrentToken(token);
      toast.success('✅ FCM token registered! Now try Test Push.');
    } else {
      toast.error('FCM permission denied or token generation failed. Check console.');
    }
  };

  const handleCopyToken = () => {
    const token = currentToken || notificationService.getCachedFcmToken();
    if (!token) {
      toast.error('No FCM token found. Enable notifications first.');
      return;
    }
    navigator.clipboard.writeText(token);
    setCopiedToken(true);
    toast.success('📋 FCM Token copied to clipboard!');
    setTimeout(() => setCopiedToken(false), 3000);
  };

  const handleTestPush = async () => {
    setFcmTesting(true);
    setFcmResult(null);
    try {
      const res = await api.post('/communication/notifications/test-push');
      const data = res.data?.data;
      setFcmResult(data);
      if (data?.status === 'sent') {
        toast.success('🎉 Real FCM push sent! Check your browser notifications.');
      } else if (data?.status === 'no_token') {
        toast.error('No FCM token found. Click "Enable Notifications" first.');
      } else if (data?.status === 'firebase_not_initialized') {
        toast.error('Firebase not initialized. Add firebase-credentials.json to backend/');
      } else {
        toast.error(data?.message || 'Push failed. See debug info below.');
      }
    } catch (err: any) {
      toast.error('Test push API error: ' + (err?.response?.data?.detail || err.message));
    } finally {
      setFcmTesting(false);
    }
  };

  const fetchDashboard = useCallback(async () => {
    if (!hasPermission('analytics.view_analytics')) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await api.get('/analytics/dashboard', { params: { academic_year_id: 1 } });
      if (res.data?.success && res.data?.data) {
        setKpi(res.data.data);
        setLastUpdated(new Date());
      }
    } catch (err: any) {
      if (err?.response?.status !== 403) {
        console.error('Dashboard KPI fetch failed:', err?.response?.data || err.message);
      }
    } finally {
      setLoading(false);
    }
  }, [hasPermission]);

  const fetchActivities = useCallback(async () => {
    try {
      const res = await api.get('/office/notices');
      const rawNotices = res.data?.data?.notices || res.data?.data || [];
      const list: ActivityItem[] = rawNotices.slice(0, 5).map((n: any, idx: number) => ({
        id: `act-${idx}`,
        title: n.title,
        sub: n.notice_type?.toUpperCase() || 'GENERAL',
        time: n.created_at ? new Date(n.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : 'Recently',
        type: 'notice'
      }));
      setActivities(list.length > 0 ? list : [
          { id: '1', title: 'Daily Attendance Synced', sub: '96% overall presence', time: '10:30 AM', type: 'attendance' },
          { id: '2', title: 'Fee Collection Summary', sub: '₹45,000 received today', time: '09:45 AM', type: 'fee' },
      ]);
    } catch {
      setActivities([
        { id: '1', title: 'Daily Attendance Synced', sub: '96% overall presence', time: '10:30 AM', type: 'attendance' },
        { id: '2', title: 'Fee Collection Summary', sub: '₹45,000 received today', time: '09:45 AM', type: 'fee' },
      ]);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
    fetchActivities();
    const interval = setInterval(fetchDashboard, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchDashboard, fetchActivities]);

  const fmt = (n: number, prefix = '') => {
    if (n >= 100000) return `${prefix}${(n / 100000).toFixed(1)}L`;
    if (n >= 1000) return `${prefix}${(n / 1000).toFixed(1)}K`;
    return `${prefix}${n.toLocaleString('en-IN')}`;
  };

  const chartData = kpi?.monthly_revenue ? kpi.monthly_revenue.map(m => ({
    month: MONTH_NAMES[(m.month - 1) % 12],
    amount: m.amount,
  })) : [];

  const adminQuickActions = [
    { id: 'qa-admin-admission', icon: <GraduationCap size={20} />, label: 'New Admission', color: 'var(--color-primary)', path: '/admission/new', perm: 'admission.create' },
    { id: 'qa-admin-gr',        icon: <BookOpen size={20} />,      label: 'GR Register',  color: 'var(--color-info)',    path: '/admission/gr',  perm: 'clerk.read' },
    { id: 'qa-admin-fee',       icon: <DollarSign size={20} />,    label: 'Collect Fee',  color: 'var(--color-success)', path: '/finance',       perm: 'finance.create' },
    { id: 'qa-admin-attend',    icon: <CheckCircle2 size={20} />,  label: 'Attendance',   color: 'var(--color-warning)', path: '/attendance',    perm: 'attendance.create' },
    { id: 'qa-admin-library',   icon: <Library size={20} />,       label: 'Issue Book',   color: 'var(--color-secondary)', path: '/library',     perm: 'library.create' },
    { id: 'qa-admin-staff',     icon: <Users size={20} />,         label: 'Add Staff',    color: '#8b5cf6',             path: '/teachers/add',  perm: 'teacher.create' },
    { id: 'qa-admin-perms',     icon: <Shield size={20} />,        label: 'Permissions',  color: '#ec4899',             path: '/admin/permissions', perm: 'admin.manage_users' },
    { id: 'qa-admin-audit',     icon: <FileText size={20} />,      label: 'Audit Logs',   color: '#64748b',             path: '/admin/audit',   perm: 'admin.read' },
  ].filter(a => hasPermission(a.perm));

  const stats: StatCardProps[] = [
    { label: 'Total Students', value: kpi ? fmt(kpi.total_students) : '—', icon: <GraduationCap size={22} />, color: 'var(--color-primary)', sub: 'Enrolled this year', loading, onClick: () => navigate('/students') },
    { label: 'Teaching Staff', value: kpi ? kpi.total_teachers : '—', icon: <Users size={22} />, color: 'var(--color-secondary)', sub: 'Active staff members', loading, onClick: () => navigate('/teachers') },
    { label: 'Fee Collection', value: kpi ? `${kpi.fee_collection_pct.toFixed(1)}%` : '—', icon: <DollarSign size={22} />, color: kpi && kpi.fee_collection_pct >= 70 ? 'var(--color-success)' : 'var(--color-danger)', sub: kpi ? (kpi.fee_collection_pct >= 70 ? 'On track' : 'Below target') : 'Loading...', loading, onClick: () => navigate('/finance') },
    { label: 'Attendance Today', value: kpi ? `${kpi.today_attendance_pct}%` : '—', icon: <CheckCircle2 size={22} />, color: kpi && kpi.today_attendance_pct >= 90 ? 'var(--color-info)' : 'var(--color-warning)', sub: kpi ? (kpi.today_attendance_pct >= 90 ? 'Good attendance' : 'Below 90% threshold') : 'Loading...', loading, onClick: () => navigate('/attendance') },
    { label: 'Library Books Issued', value: kpi ? kpi.books_issued : '—', icon: <Library size={22} />, color: 'var(--color-warning)', sub: 'Currently checked out', loading, onClick: () => navigate('/library') },
    { label: 'Low Stock Alerts', value: kpi ? kpi.low_stock_alerts : '—', icon: <Package size={22} />, color: kpi && kpi.low_stock_alerts > 0 ? 'var(--color-danger)' : 'var(--color-success)', sub: kpi && kpi.low_stock_alerts > 0 ? 'Items below minimum' : 'All stocked', loading, onClick: () => navigate('/inventory') },
    { label: 'Active Notices', value: kpi ? kpi.active_notices : '—', icon: <Bell size={22} />, color: 'var(--color-primary)', sub: 'Published notices', loading, onClick: () => navigate('/communication') },
    { label: 'Assets in Repair', value: kpi ? kpi.pending_assets_repair : '—', icon: <AlertCircle size={22} />, color: kpi && kpi.pending_assets_repair > 0 ? 'var(--color-warning)' : 'var(--color-success)', sub: 'Pending maintenance', loading, onClick: () => navigate('/inventory') },
  ];

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>{greeting()}, {user?.full_name?.split(' ')[0]} 👋</h1>
          <p className={styles.pageSubtitle}>Hindkesri Maruti Mane Vidyalay · VidyaSetu ERP 2025-26</p>
        </div>
        <div className={styles.headerRight}>
          <div className={styles.dateInfo}>
            <Clock size={14} />
            <span>{new Date().toLocaleDateString('en-IN', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}</span>
          </div>
          <button className={styles.refreshBtn} onClick={() => { fetchDashboard(); fetchActivities(); toast.success('Dashboard refreshed'); }} disabled={loading} title="Refresh dashboard">
            <RefreshCw size={14} className={loading ? styles.spinning : ''} />
            {lastUpdated && <span className={styles.lastUpdated}>Updated {lastUpdated.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>}
          </button>
        </div>
      </div>

      <div className={styles.statsGrid}>
        {stats.map((s, i) => <StatCard key={i} {...s} />)}
      </div>

      <div className={styles.middleGrid}>
        <div className={styles.card} style={{ gridColumn: 'span 2' }}>
          <div className={styles.cardTitleRow}>
            <h2 className={styles.cardTitle}><BarChart3 size={18} color="var(--color-primary)" /> Monthly Fee Collection Trend</h2>
            <button className={styles.viewAll} onClick={() => navigate('/finance')}>Fee Module <ArrowRight size={12} /></button>
          </div>
          <div style={{ height: 260, width: '100%', marginTop: 'var(--space-4)' }}>
            {loading ? <div className={styles.chartSkeleton} /> : chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" />
                  <XAxis dataKey="month" tickLine={false} axisLine={{ stroke: 'var(--color-border)' }} tick={{ fontSize: 12, fill: 'var(--color-text-muted)' }} />
                  <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: 'var(--color-text-muted)' }} tickFormatter={(val) => `₹${val >= 1000 ? `${(val/1000).toFixed(0)}k` : val}`} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="amount" radius={[6, 6, 0, 0]}>
                    {chartData.map((_, index) => <Cell key={`cell-${index}`} fill={index === chartData.length - 1 ? 'var(--color-primary)' : 'color-mix(in srgb, var(--color-primary) 65%, transparent)'} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : <div className={styles.emptyState}><Activity size={32} /><p>No data available</p><button onClick={() => navigate('/finance')} className={styles.emptyBtn}>Go to Finance</button></div>}
          </div>
        </div>

        <div className={styles.card}>
          <div className={styles.cardTitleRow}>
            <h2 className={styles.cardTitle}><Zap size={18} color="var(--color-warning)" /> Live Activity Stream</h2>
            <span className={styles.liveBadge}>LIVE</span>
          </div>
          <div className={styles.activityFeed}>
            {activities.map((act) => (
              <div key={act.id} className={styles.activityItem}>
                <div className={styles.activityDot} />
                <div className={styles.activityBody}>
                  <div className={styles.activityTitle}>{act.title}</div>
                  <div className={styles.activitySub}>{act.sub}</div>
                </div>
                <span className={styles.activityTime}>{act.time}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className={styles.bottomGrid}>
        <div className={styles.card}>
          <h2 className={styles.cardTitle}>Quick Action Shortcuts</h2>
          <div className={styles.quickActionsGrid}>
            {adminQuickActions.map(a => (
              <button key={a.id} id={a.id} className={styles.quickAction} onClick={() => navigate(a.path)} style={{ '--qa-color': a.color } as React.CSSProperties}>
                <div className={styles.qaIcon}>{a.icon}</div>
                <span className={styles.qaLabel}>{a.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* ── Firebase Push Notification Test Panel ── */}
        <div className={styles.card} style={{ border: '1.5px solid var(--color-border)', background: 'var(--color-surface)' }}>
          <div className={styles.cardTitleRow}>
            <h2 className={styles.cardTitle}><Bell size={18} color="#f97316" /> Firebase Push Test</h2>
            <span style={{
              fontSize: '0.7rem', fontWeight: 700, padding: '2px 10px', borderRadius: 20,
              background: notifPerm === 'granted' ? '#dcfce7' : notifPerm === 'denied' ? '#fee2e2' : '#fef9c3',
              color: notifPerm === 'granted' ? '#16a34a' : notifPerm === 'denied' ? '#dc2626' : '#ca8a04',
            }}>
              {notifPerm === 'granted' ? '✅ Notifications Allowed' : notifPerm === 'denied' ? '❌ Notifications Blocked' : '⚠️ Permission Not Asked'}
            </span>
          </div>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.82rem', margin: '0.5rem 0 1rem' }}>
            Use this panel to test end-to-end Firebase Cloud Messaging push notifications.
            Step 1: Enable Notifications. Step 2: Send Test Push.
          </p>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
            <button
              id="fcm-enable-btn"
              onClick={handleRequestFcmPermission}
              disabled={notifPerm === 'granted'}
              style={{
                padding: '0.5rem 1.2rem', borderRadius: 8, border: 'none', cursor: notifPerm === 'granted' ? 'default' : 'pointer',
                background: notifPerm === 'granted' ? '#dcfce7' : 'var(--color-primary)', color: notifPerm === 'granted' ? '#16a34a' : 'white',
                fontWeight: 600, fontSize: '0.85rem',
              }}
            >
              {notifPerm === 'granted' ? '✅ Notifications Enabled' : '🔔 Enable Notifications'}
            </button>
            <button
              id="fcm-copy-btn"
              onClick={handleCopyToken}
              style={{
                padding: '0.5rem 1.2rem', borderRadius: 8, border: '1px solid var(--color-border)', cursor: 'pointer',
                background: copiedToken ? '#dcfce7' : 'var(--color-surface, #f8fafc)', color: copiedToken ? '#16a34a' : 'var(--color-text)',
                fontWeight: 600, fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: 6,
              }}
            >
              <Copy size={14} />
              {copiedToken ? '📋 Copied!' : 'Copy FCM Token'}
            </button>
            <button
              id="fcm-test-push-btn"
              onClick={handleTestPush}
              disabled={fcmTesting}
              style={{
                padding: '0.5rem 1.2rem', borderRadius: 8, border: 'none', cursor: fcmTesting ? 'wait' : 'pointer',
                background: fcmTesting ? 'var(--color-border)' : '#f97316', color: 'white',
                fontWeight: 600, fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: 6,
              }}
            >
              <Send size={14} />
              {fcmTesting ? 'Sending...' : 'Send Test Push'}
            </button>
          </div>

          {/* FCM Token Display Box */}
          {currentToken && (
            <div style={{
              background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8,
              padding: '0.6rem 0.8rem', marginBottom: '1rem', fontSize: '0.75rem', wordBreak: 'break-all',
            }}>
              <div style={{ fontWeight: 600, color: '#475569', marginBottom: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>🔑 Your FCM Registration Token (for Firebase Console testing):</span>
                <span onClick={handleCopyToken} style={{ color: '#4f46e5', cursor: 'pointer', textDecoration: 'underline' }}>
                  {copiedToken ? 'Copied!' : 'Copy Token'}
                </span>
              </div>
              <code style={{ background: '#e2e8f0', padding: '2px 6px', borderRadius: 4, color: '#1e293b' }}>
                {currentToken}
              </code>
            </div>
          )}

          {/* Diagnostic output */}
          {fcmResult && (
            <div style={{
              background: fcmResult.status === 'sent' ? '#f0fdf4' : '#fef2f2',
              border: `1px solid ${fcmResult.status === 'sent' ? '#86efac' : '#fca5a5'}`,
              borderRadius: 8, padding: '0.75rem 1rem', fontSize: '0.8rem',
            }}>
              <div style={{ fontWeight: 700, marginBottom: 6, color: fcmResult.status === 'sent' ? '#15803d' : '#dc2626' }}>
                {fcmResult.message}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 16px', color: 'var(--color-text-muted)', marginBottom: 8 }}>
                <span><strong>Status:</strong> {fcmResult.status}</span>
                <span><strong>Token found:</strong> {fcmResult.token_found ? '✅ Yes' : '❌ No'}</span>
                <span><strong>Real token:</strong> {fcmResult.is_real_token ? '✅ Yes' : '❌ No (placeholder)'}</span>
                <span><strong>Firebase SDK:</strong> {fcmResult.firebase_initialized ? '✅ Initialized' : '❌ Not initialized'}</span>
                {fcmResult.token_source && <span><strong>Source:</strong> {fcmResult.token_source}</span>}
                {fcmResult.fcm_message_id && <span style={{ gridColumn: 'span 2' }}><strong>Message ID:</strong> <code style={{ fontSize: '0.75rem' }}>{fcmResult.fcm_message_id}</code></span>}
              </div>
              {fcmResult.debug?.length > 0 && (
                <details style={{ marginTop: 4 }}>
                  <summary style={{ cursor: 'pointer', color: 'var(--color-text-muted)', fontSize: '0.78rem' }}>Debug Log ({fcmResult.debug.length} steps)</summary>
                  <pre style={{ fontSize: '0.72rem', marginTop: 6, whiteSpace: 'pre-wrap', color: 'var(--color-text-muted)' }}>
                    {fcmResult.debug.join('\n')}
                  </pre>
                </details>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
