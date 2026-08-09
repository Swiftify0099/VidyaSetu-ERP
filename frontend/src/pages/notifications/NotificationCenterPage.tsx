/**
 * VidyaSetu ERP — Notification Center Page
 * ==========================================
 * Full-page notification management center.
 * Route: /notifications
 * Features:
 *  - Category tabs (All / Academic / Attendance / Finance / Leave / Library / Security / System)
 *  - Priority filter (Critical / High / Medium / Low)
 *  - Search bar
 *  - Unread-only toggle
 *  - Per-notification: mark read, delete, navigate to action URL
 *  - Mark all read
 *  - Admin analytics panel
 *  - Auto-refresh every 30s
 */
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell, CheckCheck, Search, Trash2, ExternalLink, RefreshCw, BarChart3, Flame, Sparkles,
  Monitor, ShieldAlert, CheckCircle2, XCircle, AlertTriangle, HelpCircle, Send
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useNotificationContext } from '../../contexts/NotificationContext';
import notificationService, { AppNotification } from '../../services/notificationService';
import { scheduleDelayedSystemNotification } from '../../utils/notificationUtils';
import { NotificationCategoryIcon } from '../../components/shared/NotificationCategoryIcon';
import styles from './NotificationCenterPage.module.css';

// ── Category config ────────────────────────────────────────

const CATEGORIES = [
  { key: 'all',         label: 'All' },
  { key: 'exam',        label: 'Exam' },
  { key: 'attendance',  label: 'Attendance' },
  { key: 'fee',         label: 'Finance' },
  { key: 'leave',       label: 'Leave' },
  { key: 'library',     label: 'Library' },
  { key: 'homework',    label: 'Homework' },
  { key: 'notice',      label: 'Notices' },
  { key: 'security',    label: 'Security' },
  { key: 'system',      label: 'System' },
];

const PRIORITIES = [
  { key: '',         label: 'All Priority', icon: <Bell size={14} /> },
  { key: 'critical', label: 'Critical',     icon: <Flame size={14} className="text-rose-500" /> },
  { key: 'high',     label: 'High',         icon: <AlertTriangle size={14} className="text-amber-500" /> },
  { key: 'medium',   label: 'Medium',       icon: <ShieldAlert size={14} className="text-blue-500" /> },
  { key: 'low',      label: 'Low',          icon: <CheckCircle2 size={14} className="text-slate-400" /> },
];

export default function NotificationCenterPage() {
  const { user, hasRole, isSuperAdmin } = useAuth();
  const { triggerToastNotification, triggerNativeNotification } = useNotificationContext();
  const navigate = useNavigate();

  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [total, setTotal]     = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);
  const [catBreakdown, setCatBreakdown] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  const [category, setCategory]     = useState('all');
  const [priority, setPriority]     = useState('');
  const [search, setSearch]         = useState('');
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [offset, setOffset]         = useState(0);

  const [analytics, setAnalytics] = useState<Record<string, number> | null>(null);
  const isAdmin = isSuperAdmin() || hasRole('admin') || hasRole('principal');

  // Diagnostics & Outside-App push testing state
  const [permission, setPermission] = useState<NotificationPermission>(
    typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'denied'
  );
  const [swActive, setSwActive] = useState<boolean>(false);
  const [countdown, setCountdown] = useState<number>(0);
  const [showGuide, setShowGuide] = useState<boolean>(false);

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistration('/firebase-messaging-sw.js').then((reg) => {
        setSwActive(!!reg?.active);
      }).catch(() => setSwActive(false));
    }
  }, []);

  const handleRequestPermission = async () => {
    const granted = await notificationService.requestSystemNotificationPermission();
    setPermission(granted ? 'granted' : Notification.permission);
  };

  const handleTestOutsideAppPush = async () => {
    if (permission !== 'granted') {
      const granted = await notificationService.requestSystemNotificationPermission();
      if (!granted) return;
      setPermission('granted');
    }

    setCountdown(5);
    scheduleDelayedSystemNotification(
      5,
      '🚨 VidyaSetu Outside-App Push Alert',
      'Success! Background OS Push notification delivered successfully while outside the app.',
      '/notifications'
    );

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleTestNotification = (preset: 'exam' | 'fee' | 'critical' | 'system') => {
    const presets = {
      exam: {
        title: '🎓 Mid-Term Exam Schedule Released',
        body: 'Mathematics & Science exam timetables for Class X are now available in the portal.',
        category: 'exam',
        priority: 'high',
        actionUrl: '/timetable',
      },
      fee: {
        title: '💰 Fee Receipt Confirmed',
        body: 'Payment of ₹15,000 for Term II fees has been successfully received & acknowledged.',
        category: 'fee',
        priority: 'medium',
        actionUrl: '/finance/fees',
      },
      critical: {
        title: '🚨 Emergency Weather Advisory',
        body: 'School will remain closed tomorrow due to severe heavy rainfall warning by IMD.',
        category: 'security',
        priority: 'critical',
        actionUrl: '/notice-board',
      },
      system: {
        title: '⚙️ Scheduled System Maintenance',
        body: 'VidyaSetu ERP servers will undergo routine maintenance tonight from 11:00 PM to 1:00 AM.',
        category: 'system',
        priority: 'low',
        actionUrl: '/settings',
      },
    };

    const target = presets[preset];
    triggerToastNotification(target);
    triggerNativeNotification({
      notification: {
        title: target.title,
        body: target.body,
        icon: '/icon.png',
      },
      data: {
        category: target.category,
        priority: target.priority,
        action_url: target.actionUrl,
      },
    });
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await notificationService.getCenter({
        limit: 50,
        offset,
        category: category === 'all' ? undefined : category,
        priority: priority || undefined,
        search: search.trim() || undefined,
        unread_only: unreadOnly,
      });
      setNotifications(data.notifications);
      setTotal(data.total);
      setUnreadCount(data.unread_count);
      setCatBreakdown(data.category_breakdown);
    } catch {
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  }, [category, priority, search, unreadOnly, offset]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30_000);
    return () => clearInterval(interval);
  }, [fetchData]);

  useEffect(() => {
    if (isAdmin) {
      notificationService.getAnalytics().then(setAnalytics).catch(() => {});
    }
  }, [isAdmin]);

  useEffect(() => { setOffset(0); }, [category, priority, search, unreadOnly]);

  const handleMarkRead = async (notif: AppNotification) => {
    await notificationService.markRead(notif.id);
    setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, is_read: true } : n));
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const handleClick = async (notif: AppNotification) => {
    try {
      await notificationService.markClicked(notif.id);
    } catch { /* fire-and-forget */ }
    setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, is_read: true, clicked_at: new Date().toISOString() } : n));
    if (notif.action_url) {
      navigate(notif.action_url);
    }
  };

  const handleDelete = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    await notificationService.deleteNotification(id);
    setNotifications(prev => prev.filter(n => n.id !== id));
    setTotal(prev => prev - 1);
  };

  const handleMarkAllRead = async () => {
    await notificationService.markAllRead();
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    setUnreadCount(0);
  };

  const priorityClass = (p: string) => styles[notificationService.getPriorityClass(p)] ?? '';

  return (
    <div className={styles.page}>
      {/* ── Page Header ──────────────────────────────────────── */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <div className={styles.headerIcon}>🔔</div>
          <div>
            <h1 className={styles.headerTitle}>
              Notification Center
              {unreadCount > 0 && (
                <span style={{ marginLeft: '0.5rem', fontSize: '0.8rem', background: 'var(--color-danger)', color: '#fff', borderRadius: '99px', padding: '2px 8px', fontWeight: 700 }}>
                  {unreadCount} new
                </span>
              )}
            </h1>
            <p className={styles.headerSub}>{total} total notifications · Auto-refreshes every 30s</p>
          </div>
        </div>
        <div className={styles.headerActions}>
          <div style={{ display: 'flex', gap: '0.4rem' }}>
            <button
              className={styles.markAllBtn}
              onClick={() => handleTestNotification('critical')}
              title="Preview Critical Alert Toast"
              style={{ background: 'linear-gradient(135deg, #ef4444, #dc2626)', color: '#fff', border: 'none' }}
            >
              <Flame size={14} /> Test Critical
            </button>
            <button
              className={styles.markAllBtn}
              onClick={() => handleTestNotification('exam')}
              title="Preview Exam Notification Toast"
              style={{ background: 'linear-gradient(135deg, #6366f1, #4f46e5)', color: '#fff', border: 'none' }}
            >
              <Sparkles size={14} /> Test Exam Toast
            </button>
          </div>
          <button className={styles.markAllBtn} onClick={handleMarkAllRead} disabled={unreadCount === 0}>
            <CheckCheck size={14} />
            Mark all read
          </button>
          <button
            className={styles.markAllBtn}
            onClick={fetchData}
            title="Refresh"
          >
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {/* ── Stats Bar ─────────────────────────────────────────── */}
      <div className={styles.statsBar}>
        <div className={styles.statCard}>
          <div className={`${styles.statIconWrap} ${styles.blue}`}>🔔</div>
          <div>
            <div className={styles.statValue}>{total}</div>
            <div className={styles.statLabel}>Total</div>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={`${styles.statIconWrap} ${styles.red}`}>🔴</div>
          <div>
            <div className={styles.statValue}>{unreadCount}</div>
            <div className={styles.statLabel}>Unread</div>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={`${styles.statIconWrap} ${styles.green}`}>✅</div>
          <div>
            <div className={styles.statValue}>{total - unreadCount}</div>
            <div className={styles.statLabel}>Read</div>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={`${styles.statIconWrap} ${styles.amber}`}>🚨</div>
          <div>
            <div className={styles.statValue}>
              {notifications.filter(n => n.priority === 'critical' || n.priority === 'high').length}
            </div>
            <div className={styles.statLabel}>High Priority</div>
          </div>
        </div>
      </div>

      {/* ── Outside-App Push Notification Diagnostic & Tester Panel ── */}
      <div className={styles.diagnosticSection}>
        <div className={styles.diagnosticHeader}>
          <div className={styles.diagnosticTitleWrap}>
            <Monitor size={20} style={{ color: 'var(--color-primary)' }} />
            <div>
              <h3 className={styles.diagnosticTitle}>Outside-App OS Notification Status</h3>
              <p className={styles.diagnosticSub}>Verify push notifications when browser is minimized or tab is closed</p>
            </div>
          </div>

          <div className={styles.statusPills}>
            <span className={`${styles.pill} ${permission === 'granted' ? styles.pillSuccess : permission === 'denied' ? styles.pillDanger : styles.pillWarning}`}>
              {permission === 'granted' ? <CheckCircle2 size={12} /> : permission === 'denied' ? <XCircle size={12} /> : <AlertTriangle size={12} />}
              OS Permission: {permission.toUpperCase()}
            </span>
            <span className={`${styles.pill} ${swActive ? styles.pillSuccess : styles.pillWarning}`}>
              {swActive ? <CheckCircle2 size={12} /> : <RefreshCw size={12} />}
              Service Worker: {swActive ? 'ACTIVE' : 'READY / PENDING'}
            </span>
          </div>
        </div>

        <div className={styles.diagnosticActions}>
          {permission !== 'granted' && (
            <button className={styles.permissionBtn} onClick={handleRequestPermission}>
              <ShieldAlert size={14} /> Enable OS Push Permissions
            </button>
          )}

          <button className={styles.testPushBtn} onClick={handleTestOutsideAppPush} disabled={countdown > 0}>
            <Send size={14} />
            {countdown > 0 ? `Testing Push... (${countdown}s)` : 'Test Outside-App Push (Switch Tab)'}
          </button>

          <button className={styles.guideToggleBtn} onClick={() => setShowGuide(!showGuide)}>
            <HelpCircle size={14} /> {showGuide ? 'Hide Setup Guide' : 'Why Notifications Not Visible Outside App?'}
          </button>
        </div>

        {countdown > 0 && (
          <div className={styles.countdownBanner}>
            <Sparkles size={16} />
            <div>
              <strong>Switch or minimize your browser now!</strong> Notification will popup on your desktop tray in {countdown} second{countdown !== 1 ? 's' : ''}...
            </div>
          </div>
        )}

        {showGuide && (
          <div className={styles.guideBox}>
            <div className={styles.guideTitle}>
              <HelpCircle size={16} style={{ color: 'var(--color-primary)' }} />
              Troubleshooting Checklist for Outside-App OS Notifications
            </div>
            <div className={styles.guideSteps}>
              <div className={styles.guideStepCard}>
                <div className={styles.stepNum}>Step 1</div>
                <div className={styles.stepTitle}>Browser Site Permission</div>
                <div className={styles.stepDesc}>
                  Click the padlock 🔒 icon next to your URL bar → Ensure Notifications permission is set to <strong>Allow</strong>.
                </div>
              </div>
              <div className={styles.guideStepCard}>
                <div className={styles.stepNum}>Step 2</div>
                <div className={styles.stepTitle}>Windows / OS Notifications</div>
                <div className={styles.stepDesc}>
                  In Windows Settings ⚙️ → System → Notifications → Ensure Google Chrome / Edge is toggled <strong>ON</strong>.
                </div>
              </div>
              <div className={styles.guideStepCard}>
                <div className={styles.stepNum}>Step 3</div>
                <div className={styles.stepTitle}>Turn Off Focus Assist</div>
                <div className={styles.stepDesc}>
                  Disable Windows "Focus Assist" / "Do Not Disturb" mode in your bottom-right system tray.
                </div>
              </div>
              <div className={styles.guideStepCard}>
                <div className={styles.stepNum}>Step 4</div>
                <div className={styles.stepTitle}>Secure Context</div>
                <div className={styles.stepDesc}>
                  Service Workers & Push API require <code>localhost</code> or an <code>HTTPS://</code> connection to send background alerts.
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Admin Analytics ───────────────────────────────────── */}
      {isAdmin && analytics && (
        <div className={styles.analyticsSection}>
          <div className={styles.analyticsTitle}>
            <BarChart3 size={16} /> Delivery Analytics
          </div>
          <div className={styles.analyticsGrid}>
            <div className={styles.analyticsStat}>
              <div className={styles.analyticsVal}>{analytics.total_notifications ?? 0}</div>
              <div className={styles.analyticsKey}>Total Sent</div>
            </div>
            <div className={styles.analyticsStat}>
              <div className={styles.analyticsVal}>{analytics.delivery_rate ?? 0}%</div>
              <div className={styles.analyticsKey}>Delivery Rate</div>
            </div>
            <div className={styles.analyticsStat}>
              <div className={styles.analyticsVal}>{analytics.read_rate ?? 0}%</div>
              <div className={styles.analyticsKey}>Read Rate</div>
            </div>
          </div>
        </div>
      )}

      {/* ── Main Layout ───────────────────────────────────────── */}
      <div className={styles.main}>
        {/* Filter Sidebar */}
        <div className={styles.filterPanel}>
          <div className={styles.filterSection}>
            <div className={styles.filterSectionTitle}>Search</div>
            <div className={styles.searchWrap}>
              <Search size={13} className={styles.searchIcon} />
              <input
                type="text"
                className={styles.searchInput}
                placeholder="Search notifications..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                id="notif-search"
              />
            </div>
          </div>

          <div className={styles.filterSection}>
            <div className={styles.filterSectionTitle}>Category</div>
            {CATEGORIES.map(cat => (
              <button
                key={cat.key}
                className={`${styles.filterBtn} ${category === cat.key ? styles.active : ''}`}
                onClick={() => setCategory(cat.key)}
                id={`notif-cat-${cat.key}`}
              >
                <NotificationCategoryIcon category={cat.key} size={15} />
                {cat.label}
                {catBreakdown[cat.key] ? (
                  <span className={styles.filterBadge}>{catBreakdown[cat.key]}</span>
                ) : null}
              </button>
            ))}
          </div>

          <div className={styles.filterSection}>
            <div className={styles.filterSectionTitle}>Priority</div>
            {PRIORITIES.map(p => (
              <button
                key={p.key}
                className={`${styles.filterBtn} ${priority === p.key ? styles.active : ''}`}
                onClick={() => setPriority(p.key)}
                id={`notif-pri-${p.key || 'all'}`}
              >
                {p.icon}
                {p.label}
              </button>
            ))}
          </div>

          <div className={styles.filterSection}>
            <div className={styles.filterSectionTitle}>Filter</div>
            <div className={styles.toggleWrap}>
              <span className={styles.toggleLabel}>Unread only</span>
              <label className={styles.toggle}>
                <input
                  type="checkbox"
                  checked={unreadOnly}
                  onChange={e => setUnreadOnly(e.target.checked)}
                  id="notif-unread-toggle"
                />
                <span className={styles.toggleSlider} />
              </label>
            </div>
          </div>
        </div>

        {/* Notification List */}
        <div className={styles.listArea}>
          <div className={styles.listHeader}>
            <span className={styles.listCount}>
              {total} notification{total !== 1 ? 's' : ''}
              {unreadCount > 0 ? ` · ${unreadCount} unread` : ''}
            </span>
            {unreadCount > 0 && (
              <button className={styles.markAllBtn} onClick={handleMarkAllRead}>
                <CheckCheck size={13} /> Mark all read
              </button>
            )}
          </div>

          {loading ? (
            <div className={styles.loading}>
              <div className={styles.spinner} />
            </div>
          ) : notifications.length === 0 ? (
            <div className={styles.empty}>
              <div className={styles.emptyIcon}>
                <NotificationCategoryIcon category={category} size={28} />
              </div>
              <div className={styles.emptyTitle}>No notifications found</div>
              <div className={styles.emptyBody}>
                {unreadOnly
                  ? "You're all caught up! No unread notifications."
                  : search
                  ? `No notifications match "${search}"`
                  : 'No notifications in this category yet. Notifications appear here automatically when events occur.'}
              </div>
            </div>
          ) : (
            notifications.map(notif => (
              <div
                key={notif.id}
                className={[
                  styles.notifCard,
                  !notif.is_read ? styles.unread : '',
                  styles[notificationService.getPriorityClass(notif.priority)] ?? '',
                ].join(' ')}
                onClick={() => handleClick(notif)}
                id={`notif-card-${notif.id}`}
                role="button"
                tabIndex={0}
                onKeyDown={e => e.key === 'Enter' && handleClick(notif)}
              >
                {!notif.is_read && <div className={styles.unreadDot} />}

                <div className={styles.notifIconWrap}>
                  <NotificationCategoryIcon category={notif.category} size={18} />
                </div>

                <div className={styles.notifBody}>
                  <div className={styles.notifMeta}>
                    <span className={`${styles.notifPriorityBadge} ${styles[notificationService.getPriorityClass(notif.priority)]}`}>
                      {notif.priority}
                    </span>
                    <span className={styles.notifCategoryBadge}>{notif.category}</span>
                    <span className={styles.notifTime}>
                      {notificationService.formatRelativeTime(notif.created_at)}
                    </span>
                  </div>

                  <div className={styles.notifTitle}>{notif.title}</div>
                  <div className={styles.notifText}>{notif.body}</div>

                  <div className={styles.notifActions} onClick={e => e.stopPropagation()}>
                    {!notif.is_read && (
                      <button
                        className={styles.actionBtn}
                        onClick={() => handleMarkRead(notif)}
                        id={`notif-read-${notif.id}`}
                      >
                        <CheckCheck size={10} /> Mark read
                      </button>
                    )}
                    {notif.action_url && (
                      <button
                        className={styles.deepLinkBtn}
                        onClick={() => handleClick(notif)}
                        id={`notif-goto-${notif.id}`}
                      >
                        <ExternalLink size={10} /> Open
                      </button>
                    )}
                    <button
                      className={`${styles.actionBtn} ${styles.danger}`}
                      onClick={e => handleDelete(notif.id, e)}
                      id={`notif-delete-${notif.id}`}
                      title="Delete notification"
                    >
                      <Trash2 size={10} />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
