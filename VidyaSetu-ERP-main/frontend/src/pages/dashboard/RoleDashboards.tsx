/**
 * VidyaSetu ERP — Role-Based Dashboard Components
 * ===================================================
 * Premium role-specific dashboards for:
 *   Principal, Vice Principal, Clerk, Accountant,
 *   Class Teacher, Librarian, Receptionist, Exam Coordinator
 * 
 * Each component fetches its own data via dedicated API.
 */
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  GraduationCap, Users, DollarSign, CheckCircle2, AlertCircle,
  Clock, Package, Library, RefreshCw, Bell, ArrowRight,
  FileText, Shield, BarChart3, BookOpen, CalendarDays,
  ClipboardList, AlertTriangle, TrendingUp, TrendingDown,
  UserCheck, Zap, Star, ChevronRight, PenLine, Palmtree,
  Scan, Book, Calendar,
} from 'lucide-react';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import styles from './RoleDashboards.module.css';

// ── Reusable StatCard ─────────────────────────────────────────
export function StatCard({
  label, value, icon, color, sub, loading, onClick, badge,
}: {
  label: string; value: string | number; icon: React.ReactNode;
  color: string; sub?: string; loading?: boolean;
  onClick?: () => void; badge?: string;
}) {
  return (
    <div
      className={styles.statCard}
      style={{ '--card-color': color } as React.CSSProperties}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      <div className={styles.statHeader}>
        <div className={styles.statIconWrap}>{icon}</div>
        {badge && <span className={styles.statBadge}>{badge}</span>}
      </div>
      {loading ? <div className={styles.statValueLoading}>—</div>
        : <div className={styles.statValue}>{value}</div>}
      <div className={styles.statLabel}>{label}</div>
      {sub && <div className={styles.statSub}>{sub}</div>}
    </div>
  );
}

// ── Reusable DashCard (section container) ─────────────────────
export function DashCard({
  title, icon, children, onViewAll, viewAllLabel,
}: {
  title: string; icon: React.ReactNode; children: React.ReactNode;
  onViewAll?: () => void; viewAllLabel?: string;
}) {
  return (
    <div className={styles.dashCard}>
      <div className={styles.dashCardHeader}>
        <h2 className={styles.dashCardTitle}>{icon} {title}</h2>
        {onViewAll && (
          <button className={styles.viewAllBtn} onClick={onViewAll}>
            {viewAllLabel ?? 'View All'} <ChevronRight size={13} />
          </button>
        )}
      </div>
      {children}
    </div>
  );
}

// ── Reusable Quick Action Button ──────────────────────────────
export function QuickAction({
  icon, label, color, onClick, id,
}: { icon: React.ReactNode; label: string; color: string; onClick: () => void; id: string }) {
  return (
    <button className={styles.quickAction} id={id} onClick={onClick}
      style={{ '--qa-color': color } as React.CSSProperties}>
      <div className={styles.qaIcon}>{icon}</div>
      <span className={styles.qaLabel}>{label}</span>
    </button>
  );
}

// ── Approval Row Item ─────────────────────────────────────────
export function ApprovalItem({
  title, sub, priority, onAction,
}: { title: string; sub: string; priority: 'high' | 'medium' | 'low'; onAction: () => void }) {
  return (
    <div className={styles.approvalItem}>
      <div className={`${styles.approvalDot} ${styles[`dot_${priority}`]}`} />
      <div className={styles.approvalBody}>
        <div className={styles.approvalTitle}>{title}</div>
        <div className={styles.approvalSub}>{sub}</div>
      </div>
      <button className={styles.approvalBtn} onClick={onAction}>Review</button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// PRINCIPAL DASHBOARD
// ─────────────────────────────────────────────────────────────
export function PrincipalDashboard() {
  const navigate = useNavigate();
  const [kpi, setKpi] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/analytics/dashboard', { params: { academic_year_id: 1 } });
      setKpi(res.data?.data);
    } catch { /* ok */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <div className={styles.roleDash}>
      {/* Stats */}
      <div className={styles.statsGrid}>
        <StatCard label="Today's Attendance" value={kpi ? `${kpi.today_attendance_pct ?? 0}%` : '—'}
          icon={<CheckCircle2 size={20} />} color="var(--color-success)"
          sub={kpi?.today_attendance_pct >= 90 ? '✅ Good' : '⚠️ Below threshold'} loading={loading}
          onClick={() => navigate('/attendance')} />
        <StatCard label="Pending Approvals" value={kpi?.pending_leaves ?? '—'}
          icon={<Bell size={20} />} color="var(--color-warning)"
          sub="Leave + certificates" loading={loading} badge="Action" />
        <StatCard label="Fee Collection" value={kpi ? `${kpi.fee_collection_pct?.toFixed(1) ?? 0}%` : '—'}
          icon={<DollarSign size={20} />} color="var(--color-primary)"
          sub="This month" loading={loading} onClick={() => navigate('/finance')} />
        <StatCard label="Total Students" value={kpi?.total_students ?? '—'}
          icon={<GraduationCap size={20} />} color="var(--color-info)"
          sub="Enrolled this year" loading={loading} onClick={() => navigate('/students')} />
        <StatCard label="Active Notices" value={kpi?.active_notices ?? '—'}
          icon={<Bell size={20} />} color="#8b5cf6"
          sub="Published" loading={loading} onClick={() => navigate('/communication')} />
        <StatCard label="Discipline Alerts" value={kpi?.behaviour_alerts ?? '0'}
          icon={<AlertTriangle size={20} />} color="var(--color-danger)"
          sub="This week" loading={loading} onClick={() => navigate('/behaviour')} />
      </div>

      <div className={styles.middleGrid}>
        {/* Pending Approvals Panel */}
        <DashCard title="Pending Approvals" icon={<Bell size={16} color="var(--color-warning)" />}
          onViewAll={() => navigate('/leave')} viewAllLabel="View Leaves">
          <div className={styles.approvalList}>
            <ApprovalItem title="Leave Requests" sub="3 pending staff leaves" priority="high" onAction={() => navigate('/leave')} />
            <ApprovalItem title="Certificate Requests" sub="2 students waiting" priority="medium" onAction={() => navigate('/office')} />
            <ApprovalItem title="Fee Waiver Request" sub="1 request from parent" priority="medium" onAction={() => navigate('/finance')} />
            <ApprovalItem title="Admission Approval" sub="5 new applications" priority="high" onAction={() => navigate('/admission/new')} />
          </div>
        </DashCard>

        {/* Quick Actions */}
        <DashCard title="Quick Actions" icon={<Zap size={16} color="var(--color-primary)" />}>
          <div className={styles.quickActionsGrid}>
            <QuickAction id="qa-principal-analytics" icon={<BarChart3 size={18} />} label="Analytics" color="var(--color-primary)" onClick={() => navigate('/analytics')} />
            <QuickAction id="qa-principal-notice" icon={<Bell size={18} />} label="Send Notice" color="#8b5cf6" onClick={() => navigate('/communication')} />
            <QuickAction id="qa-principal-leave" icon={<Palmtree size={18} />} label="Approve Leave" color="var(--color-warning)" onClick={() => navigate('/leave')} />
            <QuickAction id="qa-principal-finance" icon={<DollarSign size={18} />} label="Finance" color="var(--color-success)" onClick={() => navigate('/finance')} />
            <QuickAction id="qa-principal-students" icon={<GraduationCap size={18} />} label="Students" color="var(--color-info)" onClick={() => navigate('/students')} />
            <QuickAction id="qa-principal-audit" icon={<Shield size={18} />} label="Audit Logs" color="#64748b" onClick={() => navigate('/admin/audit')} />
          </div>
        </DashCard>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// VICE PRINCIPAL DASHBOARD
// ─────────────────────────────────────────────────────────────
export function VicePrincipalDashboard() {
  const navigate = useNavigate();
  const [kpi, setKpi] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/analytics/dashboard', { params: { academic_year_id: 1 } });
      setKpi(res.data?.data);
    } catch { /* ok */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <div className={styles.roleDash}>
      <div className={styles.statsGrid}>
        <StatCard label="Total Teachers" value={kpi?.total_teachers ?? '—'}
          icon={<Users size={20} />} color="var(--color-primary)" sub="Active staff" loading={loading} onClick={() => navigate('/teachers')} />
        <StatCard label="Attendance Today" value={kpi ? `${kpi.today_attendance_pct ?? 0}%` : '—'}
          icon={<CheckCircle2 size={20} />} color="var(--color-success)" sub="School-wide" loading={loading} onClick={() => navigate('/attendance')} />
        <StatCard label="Behaviour Incidents" value={kpi?.behaviour_alerts ?? '0'}
          icon={<AlertTriangle size={20} />} color="var(--color-danger)" sub="This week" loading={loading} onClick={() => navigate('/behaviour')} />
        <StatCard label="Pending Leave Approvals" value={kpi?.pending_leaves ?? '—'}
          icon={<Palmtree size={20} />} color="var(--color-warning)" sub="Escalated to VP" loading={loading} badge="Action" onClick={() => navigate('/leave')} />
      </div>

      <div className={styles.middleGrid}>
        <DashCard title="Academic Reviews Pending" icon={<PenLine size={16} color="var(--color-primary)" />}
          onViewAll={() => navigate('/lesson-plans')}>
          <div className={styles.approvalList}>
            <ApprovalItem title="Lesson Plans Review" sub="8 plans submitted, 3 pending review" priority="medium" onAction={() => navigate('/lesson-plans')} />
            <ApprovalItem title="Escalated Leave Requests" sub="2 leaves > 3 days from teachers" priority="high" onAction={() => navigate('/leave')} />
            <ApprovalItem title="Exam Results Review" sub="Awaiting VP sign-off" priority="high" onAction={() => navigate('/exams')} />
          </div>
        </DashCard>
        <DashCard title="Quick Actions" icon={<Zap size={16} color="var(--color-primary)" />}>
          <div className={styles.quickActionsGrid}>
            <QuickAction id="qa-vp-lesson" icon={<PenLine size={18} />} label="Lesson Plans" color="var(--color-primary)" onClick={() => navigate('/lesson-plans')} />
            <QuickAction id="qa-vp-behaviour" icon={<AlertTriangle size={18} />} label="Behaviour Log" color="var(--color-danger)" onClick={() => navigate('/behaviour')} />
            <QuickAction id="qa-vp-leave" icon={<Palmtree size={18} />} label="Leave Approvals" color="var(--color-warning)" onClick={() => navigate('/leave')} />
            <QuickAction id="qa-vp-analytics" icon={<BarChart3 size={18} />} label="Analytics" color="var(--color-info)" onClick={() => navigate('/analytics')} />
            <QuickAction id="qa-vp-attendance" icon={<ClipboardList size={18} />} label="Attendance" color="var(--color-success)" onClick={() => navigate('/attendance')} />
            <QuickAction id="qa-vp-notice" icon={<Bell size={18} />} label="Send Notice" color="#8b5cf6" onClick={() => navigate('/communication')} />
          </div>
        </DashCard>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// CLERK DASHBOARD
// ─────────────────────────────────────────────────────────────
export function ClerkDashboard() {
  const navigate = useNavigate();
  const [kpi, setKpi] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/analytics/dashboard', { params: { academic_year_id: 1 } });
      setKpi(res.data?.data);
    } catch { /* ok */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <div className={styles.roleDash}>
      <div className={styles.statsGrid}>
        <StatCard label="Total Students" value={kpi?.total_students ?? '—'}
          icon={<GraduationCap size={20} />} color="var(--color-primary)" sub="Enrolled" loading={loading} onClick={() => navigate('/students')} />
        <StatCard label="Pending Admissions" value="—"
          icon={<FileText size={20} />} color="var(--color-warning)" sub="Awaiting processing" badge="Pending" />
        <StatCard label="Certificates Pending" value="—"
          icon={<Star size={20} />} color="#8b5cf6" sub="Awaiting principal" badge="Action" />
        <StatCard label="Office Tasks Today" value="—"
          icon={<ClipboardList size={20} />} color="var(--color-success)" sub="Daily register" />
      </div>

      <div className={styles.middleGrid}>
        <DashCard title="Today's Tasks" icon={<ClipboardList size={16} color="var(--color-primary)" />}>
          <div className={styles.approvalList}>
            <ApprovalItem title="New Admission Processing" sub="Verify documents + issue GR" priority="high" onAction={() => navigate('/admission/new')} />
            <ApprovalItem title="GR Register Update" sub="5 entries pending" priority="medium" onAction={() => navigate('/admission/gr')} />
            <ApprovalItem title="Certificate Requests" sub="2 requests pending approval" priority="medium" onAction={() => navigate('/office')} />
            <ApprovalItem title="Student Records Update" sub="Correction requests" priority="low" onAction={() => navigate('/students')} />
          </div>
        </DashCard>
        <DashCard title="Quick Actions" icon={<Zap size={16} color="var(--color-primary)" />}>
          <div className={styles.quickActionsGrid}>
            <QuickAction id="qa-clerk-admission" icon={<GraduationCap size={18} />} label="New Admission" color="var(--color-primary)" onClick={() => navigate('/admission/new')} />
            <QuickAction id="qa-clerk-gr" icon={<BookOpen size={18} />} label="GR Register" color="var(--color-info)" onClick={() => navigate('/admission/gr')} />
            <QuickAction id="qa-clerk-search" icon={<Users size={18} />} label="Search Student" color="#8b5cf6" onClick={() => navigate('/students')} />
            <QuickAction id="qa-clerk-office" icon={<FileText size={18} />} label="Office Records" color="var(--color-warning)" onClick={() => navigate('/office')} />
            <QuickAction id="qa-clerk-promotions" icon={<TrendingUp size={18} />} label="Promotions" color="var(--color-success)" onClick={() => navigate('/admission/promotions')} />
            <QuickAction id="qa-clerk-notice" icon={<Bell size={18} />} label="Notices" color="#64748b" onClick={() => navigate('/communication')} />
          </div>
        </DashCard>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// ACCOUNTANT DASHBOARD
// ─────────────────────────────────────────────────────────────
export function AccountantDashboard() {
  const navigate = useNavigate();
  const [kpi, setKpi] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/analytics/dashboard', { params: { academic_year_id: 1 } });
      setKpi(res.data?.data);
    } catch { /* ok */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const pct = kpi?.fee_collection_pct ?? 0;

  return (
    <div className={styles.roleDash}>
      <div className={styles.statsGrid}>
        <StatCard label="Fee Collection %" value={kpi ? `${pct.toFixed(1)}%` : '—'}
          icon={<DollarSign size={20} />}
          color={pct >= 70 ? 'var(--color-success)' : 'var(--color-danger)'}
          sub={pct >= 70 ? '✅ On track' : '⚠️ Below target'} loading={loading} onClick={() => navigate('/finance')} />
        <StatCard label="Students" value={kpi?.total_students ?? '—'}
          icon={<GraduationCap size={20} />} color="var(--color-primary)" sub="For fee lookup" loading={loading} onClick={() => navigate('/students')} />
        <StatCard label="Pending Dues" value="—"
          icon={<AlertCircle size={20} />} color="var(--color-warning)" sub="Unpaid fees" badge="Alert" />
        <StatCard label="Receipts Today" value="—"
          icon={<FileText size={20} />} color="var(--color-info)" sub="Generated today" />
      </div>

      <div className={styles.middleGrid}>
        <DashCard title="Finance Alerts" icon={<AlertCircle size={16} color="var(--color-warning)" />}>
          <div className={styles.approvalList}>
            <ApprovalItem title="Fee Waiver Requests" sub="1 request needs Accountant review" priority="medium" onAction={() => navigate('/finance')} />
            <ApprovalItem title="Reconciliation Alert" sub="Bank statement pending match" priority="high" onAction={() => navigate('/finance')} />
            <ApprovalItem title="Monthly Closing" sub="End-of-month closure pending" priority="medium" onAction={() => navigate('/finance')} />
          </div>
        </DashCard>
        <DashCard title="Quick Actions" icon={<Zap size={16} color="var(--color-primary)" />}>
          <div className={styles.quickActionsGrid}>
            <QuickAction id="qa-acct-collect" icon={<DollarSign size={18} />} label="Collect Fee" color="var(--color-success)" onClick={() => navigate('/finance')} />
            <QuickAction id="qa-acct-receipt" icon={<FileText size={18} />} label="Receipts" color="var(--color-primary)" onClick={() => navigate('/finance')} />
            <QuickAction id="qa-acct-analytics" icon={<BarChart3 size={18} />} label="Finance Report" color="var(--color-info)" onClick={() => navigate('/analytics')} />
            <QuickAction id="qa-acct-student" icon={<GraduationCap size={18} />} label="Student Fees" color="#8b5cf6" onClick={() => navigate('/students')} />
          </div>
        </DashCard>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// CLASS TEACHER DASHBOARD
// ─────────────────────────────────────────────────────────────
export function ClassTeacherDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();

  return (
    <div className={styles.roleDash}>
      <div className={styles.statsGrid}>
        <StatCard label="Class Strength" value="—"
          icon={<Users size={20} />} color="var(--color-primary)" sub="Your assigned class" />
        <StatCard label="Present Today" value="—"
          icon={<CheckCircle2 size={20} />} color="var(--color-success)" sub="In class" />
        <StatCard label="Absent Today" value="—"
          icon={<AlertCircle size={20} />} color="var(--color-danger)" sub="Not in school" />
        <StatCard label="Pending Leave Requests" value="—"
          icon={<Palmtree size={20} />} color="var(--color-warning)" sub="Awaiting CT approval" badge="Action" />
        <StatCard label="Homework Completion" value="—"
          icon={<BookOpen size={20} />} color="var(--color-info)" sub="Today's homework" />
        <StatCard label="Behaviour Alerts" value="—"
          icon={<AlertTriangle size={20} />} color="#ef4444" sub="This week" onClick={() => navigate('/behaviour')} />
      </div>

      <div className={styles.middleGrid}>
        <DashCard title="Class Pending Actions" icon={<Bell size={16} color="var(--color-warning)" />}>
          <div className={styles.approvalList}>
            <ApprovalItem title="Mark Today's Attendance" sub="Not yet marked for your class" priority="high" onAction={() => navigate('/attendance')} />
            <ApprovalItem title="Leave Request Review" sub="Student leave applications" priority="medium" onAction={() => navigate('/leave')} />
            <ApprovalItem title="Parent Communication" sub="Pending parent messages" priority="low" onAction={() => navigate('/communication')} />
          </div>
        </DashCard>
        <DashCard title="Quick Actions" icon={<Zap size={16} color="var(--color-primary)" />}>
          <div className={styles.quickActionsGrid}>
            <QuickAction id="qa-ct-attendance" icon={<CheckCircle2 size={18} />} label="Attendance" color="var(--color-success)" onClick={() => navigate('/attendance')} />
            <QuickAction id="qa-ct-leave" icon={<Palmtree size={18} />} label="Leave Requests" color="var(--color-warning)" onClick={() => navigate('/leave')} />
            <QuickAction id="qa-ct-behaviour" icon={<AlertTriangle size={18} />} label="Behaviour Log" color="var(--color-danger)" onClick={() => navigate('/behaviour')} />
            <QuickAction id="qa-ct-lesson" icon={<PenLine size={18} />} label="Lesson Plans" color="var(--color-primary)" onClick={() => navigate('/lesson-plans')} />
            <QuickAction id="qa-ct-notice" icon={<Bell size={18} />} label="Send Notice" color="#8b5cf6" onClick={() => navigate('/communication')} />
            <QuickAction id="qa-ct-timetable" icon={<CalendarDays size={18} />} label="Timetable" color="var(--color-info)" onClick={() => navigate('/timetable')} />
          </div>
        </DashCard>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// TEACHER DASHBOARD
// ─────────────────────────────────────────────────────────────
export function TeacherDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();

  return (
    <div className={styles.roleDash}>
      <div className={styles.statsGrid}>
        <StatCard label="Today's Classes" value="—"
          icon={<CalendarDays size={20} />} color="var(--color-primary)" sub="Timetable for today" onClick={() => navigate('/timetable')} />
        <StatCard label="Pending Homework Check" value="—"
          icon={<BookOpen size={20} />} color="var(--color-warning)" sub="Awaiting your review" badge="Action" />
        <StatCard label="Assignments Pending" value="—"
          icon={<ClipboardList size={20} />} color="var(--color-info)" sub="Evaluation pending" badge="Action" />
        <StatCard label="Student Doubts" value="—"
          icon={<Users size={20} />} color="#8b5cf6" sub="Unanswered" />
      </div>

      <div className={styles.middleGrid}>
        <DashCard title="Pending Tasks" icon={<Clock size={16} color="var(--color-warning)" />}>
          <div className={styles.approvalList}>
            <ApprovalItem title="Mark Attendance" sub="Today's classes — not yet marked" priority="high" onAction={() => navigate('/attendance')} />
            <ApprovalItem title="Homework Review" sub="Submissions awaiting evaluation" priority="medium" onAction={() => navigate('/exams')} />
            <ApprovalItem title="Submit Lesson Plan" sub="Week's plan due today" priority="medium" onAction={() => navigate('/lesson-plans')} />
          </div>
        </DashCard>
        <DashCard title="Quick Actions" icon={<Zap size={16} color="var(--color-primary)" />}>
          <div className={styles.quickActionsGrid}>
            <QuickAction id="qa-t-attendance" icon={<CheckCircle2 size={18} />} label="Attendance" color="var(--color-success)" onClick={() => navigate('/attendance')} />
            <QuickAction id="qa-t-homework" icon={<BookOpen size={18} />} label="Homework" color="var(--color-primary)" onClick={() => navigate('/exams')} />
            <QuickAction id="qa-t-marks" icon={<PenLine size={18} />} label="Enter Marks" color="var(--color-info)" onClick={() => navigate('/exams')} />
            <QuickAction id="qa-t-lesson" icon={<FileText size={18} />} label="Lesson Plans" color="#8b5cf6" onClick={() => navigate('/lesson-plans')} />
            <QuickAction id="qa-t-behaviour" icon={<AlertTriangle size={18} />} label="Behaviour Log" color="var(--color-danger)" onClick={() => navigate('/behaviour')} />
            <QuickAction id="qa-t-timetable" icon={<CalendarDays size={18} />} label="My Timetable" color="var(--color-warning)" onClick={() => navigate('/timetable')} />
          </div>
        </DashCard>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// LIBRARIAN DASHBOARD
// ─────────────────────────────────────────────────────────────
export function LibrarianDashboard() {
  const navigate = useNavigate();
  const [kpi, setKpi] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/analytics/library');
      setKpi(res.data?.data);
    } catch { /* ok */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <div className={styles.roleDash}>
      <div className={styles.statsGrid}>
        <StatCard label="Books Issued" value={kpi?.issued_books ?? '—'}
          icon={<Book size={20} />} color="var(--color-primary)" sub="Currently out" loading={loading} onClick={() => navigate('/library')} />
        <StatCard label="Overdue Books" value={kpi?.overdue_books ?? '—'}
          icon={<AlertCircle size={20} />} color="var(--color-danger)"
          sub="Past due date" loading={loading} badge={kpi?.overdue_books > 0 ? 'Alert' : undefined}
          onClick={() => navigate('/library')} />
        <StatCard label="Total Books" value={kpi?.total_books ?? '—'}
          icon={<Library size={20} />} color="var(--color-success)" sub="In library" loading={loading} onClick={() => navigate('/library')} />
        <StatCard label="Fine Collected" value={kpi?.fine_collected ? `₹${kpi.fine_collected}` : '—'}
          icon={<DollarSign size={20} />} color="var(--color-warning)" sub="This month" loading={loading} />
      </div>

      <div className={styles.middleGrid}>
        <DashCard title="Library Actions Needed" icon={<AlertCircle size={16} color="var(--color-warning)" />}>
          <div className={styles.approvalList}>
            <ApprovalItem title="Overdue Follow-up" sub="Contact students with overdue books" priority="high" onAction={() => navigate('/library')} />
            <ApprovalItem title="New Book Entry" sub="Cataloguing pending" priority="medium" onAction={() => navigate('/library')} />
            <ApprovalItem title="Reservation Approvals" sub="Book reservations pending" priority="low" onAction={() => navigate('/library')} />
          </div>
        </DashCard>
        <DashCard title="Quick Actions" icon={<Zap size={16} color="var(--color-primary)" />}>
          <div className={styles.quickActionsGrid}>
            <QuickAction id="qa-lib-issue" icon={<Book size={18} />} label="Issue Book" color="var(--color-primary)" onClick={() => navigate('/library')} />
            <QuickAction id="qa-lib-return" icon={<CheckCircle2 size={18} />} label="Return Book" color="var(--color-success)" onClick={() => navigate('/library')} />
            <QuickAction id="qa-lib-qr" icon={<Scan size={18} />} label="QR Scan" color="var(--color-info)" onClick={() => navigate('/qr-center')} />
            <QuickAction id="qa-lib-member" icon={<UserCheck size={18} />} label="Members" color="#8b5cf6" onClick={() => navigate('/library')} />
          </div>
        </DashCard>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// RECEPTIONIST DASHBOARD
// ─────────────────────────────────────────────────────────────
export function ReceptionistDashboard() {
  const navigate = useNavigate();

  return (
    <div className={styles.roleDash}>
      <div className={styles.statsGrid}>
        <StatCard label="Today's Visitors" value="—"
          icon={<Users size={20} />} color="var(--color-primary)" sub="Logged in today" />
        <StatCard label="Today's Inquiries" value="—"
          icon={<Bell size={20} />} color="var(--color-warning)" sub="New inquiries" badge="New" />
        <StatCard label="Pending Follow-ups" value="—"
          icon={<Clock size={20} />} color="var(--color-danger)" sub="Due today" badge="Action" />
        <StatCard label="Appointments Today" value="—"
          icon={<Calendar size={20} />} color="var(--color-success)" sub="Scheduled" />
      </div>

      <div className={styles.middleGrid}>
        <DashCard title="Reception Tasks" icon={<ClipboardList size={16} color="var(--color-primary)" />}>
          <div className={styles.approvalList}>
            <ApprovalItem title="Register Visitor" sub="Log new visitor entry" priority="high" onAction={() => navigate('/office')} />
            <ApprovalItem title="Admission Inquiry" sub="Forward to clerk" priority="medium" onAction={() => navigate('/admission/new')} />
            <ApprovalItem title="Phone Call Follow-up" sub="2 callbacks pending" priority="medium" onAction={() => navigate('/office')} />
          </div>
        </DashCard>
        <DashCard title="Quick Actions" icon={<Zap size={16} color="var(--color-primary)" />}>
          <div className={styles.quickActionsGrid}>
            <QuickAction id="qa-rec-visitor" icon={<UserCheck size={18} />} label="Log Visitor" color="var(--color-primary)" onClick={() => navigate('/office')} />
            <QuickAction id="qa-rec-inquiry" icon={<FileText size={18} />} label="New Inquiry" color="var(--color-warning)" onClick={() => navigate('/admission/new')} />
            <QuickAction id="qa-rec-students" icon={<GraduationCap size={18} />} label="Search Student" color="var(--color-info)" onClick={() => navigate('/students')} />
            <QuickAction id="qa-rec-notice" icon={<Bell size={18} />} label="Notices" color="#8b5cf6" onClick={() => navigate('/communication')} />
          </div>
        </DashCard>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// EXAM COORDINATOR DASHBOARD
// ─────────────────────────────────────────────────────────────
export function ExamCoordinatorDashboard() {
  const navigate = useNavigate();
  const [kpi, setKpi] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/analytics/dashboard', { params: { academic_year_id: 1 } });
      setKpi(res.data?.data);
    } catch { /* ok */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <div className={styles.roleDash}>
      <div className={styles.statsGrid}>
        <StatCard label="Total Students" value={kpi?.total_students ?? '—'}
          icon={<GraduationCap size={20} />} color="var(--color-primary)" sub="For exam setup" loading={loading} onClick={() => navigate('/students')} />
        <StatCard label="Exams Scheduled" value="—"
          icon={<CalendarDays size={20} />} color="var(--color-info)" sub="This term" />
        <StatCard label="Pending Mark Entry" value="—"
          icon={<PenLine size={20} />} color="var(--color-warning)" sub="By teachers" badge="Action" />
        <StatCard label="Results Compiled" value="—"
          icon={<CheckCircle2 size={20} />} color="var(--color-success)" sub="Ready for publish" />
      </div>

      <div className={styles.middleGrid}>
        <DashCard title="Exam Actions Pending" icon={<AlertCircle size={16} color="var(--color-warning)" />}>
          <div className={styles.approvalList}>
            <ApprovalItem title="Marks Entry Pending" sub="3 teachers yet to enter marks" priority="high" onAction={() => navigate('/exams')} />
            <ApprovalItem title="Compile Results" sub="Ready for compilation" priority="high" onAction={() => navigate('/exams')} />
            <ApprovalItem title="Schedule Publication" sub="Exam schedule not yet published" priority="medium" onAction={() => navigate('/exams')} />
          </div>
        </DashCard>
        <DashCard title="Quick Actions" icon={<Zap size={16} color="var(--color-primary)" />}>
          <div className={styles.quickActionsGrid}>
            <QuickAction id="qa-ec-create" icon={<CalendarDays size={18} />} label="Create Exam" color="var(--color-primary)" onClick={() => navigate('/exams')} />
            <QuickAction id="qa-ec-marks" icon={<PenLine size={18} />} label="Enter Marks" color="var(--color-warning)" onClick={() => navigate('/exams')} />
            <QuickAction id="qa-ec-results" icon={<CheckCircle2 size={18} />} label="Compile Results" color="var(--color-success)" onClick={() => navigate('/exams')} />
            <QuickAction id="qa-ec-analytics" icon={<BarChart3 size={18} />} label="Analytics" color="var(--color-info)" onClick={() => navigate('/analytics')} />
          </div>
        </DashCard>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// GENERIC STAFF DASHBOARD (Office Staff, Support Staff, etc.)
// ─────────────────────────────────────────────────────────────
export function GenericStaffDashboard() {
  const navigate = useNavigate();
  return (
    <div className={styles.roleDash}>
      <div className={styles.statsGrid}>
        <StatCard label="Office Records" value="—" icon={<FileText size={20} />}
          color="var(--color-primary)" sub="Read-only access" onClick={() => navigate('/office')} />
        <StatCard label="Notices" value="—" icon={<Bell size={20} />}
          color="var(--color-info)" sub="Active notices" onClick={() => navigate('/communication')} />
      </div>
      <div className={styles.middleGrid}>
        <DashCard title="Quick Actions" icon={<Zap size={16} color="var(--color-primary)" />}>
          <div className={styles.quickActionsGrid}>
            <QuickAction id="qa-gen-office" icon={<FileText size={18} />} label="Office" color="var(--color-primary)" onClick={() => navigate('/office')} />
            <QuickAction id="qa-gen-notice" icon={<Bell size={18} />} label="Notices" color="var(--color-info)" onClick={() => navigate('/communication')} />
          </div>
        </DashCard>
      </div>
    </div>
  );
}
