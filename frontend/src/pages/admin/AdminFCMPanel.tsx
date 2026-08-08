/**
 * VidyaSetu ERP — Admin FCM Push Notification Panel
 * ====================================================
 * Allows administrators to:
 *   - Send notifications to a single user
 *   - Send to multiple users
 *   - Broadcast to all users
 *   - Send by role (Student, Teacher, Parent, Staff, Admin)
 *   - Send by class
 *   - View notification delivery history
 *   - View all registered devices
 */
import { useState, useEffect, useCallback } from 'react';
import fcmService, {
  type SendNotificationPayload,
  type NotificationSendResult,
} from '../../services/fcmService';
import type { NotificationLogRecord, FCMTokenRecord } from '../../services/fcmService';

// ── Types ─────────────────────────────────────────────────────
type SendMode = 'user' | 'users' | 'broadcast' | 'role' | 'topic' | 'class';
type Tab = 'send' | 'logs' | 'devices';

const ROLE_OPTIONS = [
  { code: 'student', label: '🎓 Students' },
  { code: 'teacher', label: '👩‍🏫 Teachers' },
  { code: 'parent', label: '👨‍👩‍👧 Parents' },
  { code: 'staff', label: '🏢 Staff' },
  { code: 'admin', label: '🔐 Admins' },
];

export default function AdminFCMPanel() {
  const [activeTab, setActiveTab] = useState<Tab>('send');
  const [sendMode, setSendMode] = useState<SendMode>('broadcast');

  // Form state
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [targetUserId, setTargetUserId] = useState('');
  const [targetUserIds, setTargetUserIds] = useState('');
  const [targetRole, setTargetRole] = useState('student');
  const [targetTopic, setTargetTopic] = useState('all');
  const [targetClassId, setTargetClassId] = useState('');

  // Status
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<NotificationSendResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Logs and devices
  const [logs, setLogs] = useState<NotificationLogRecord[]>([]);
  const [devices, setDevices] = useState<FCMTokenRecord[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [devicesLoading, setDevicesLoading] = useState(false);

  const loadLogs = useCallback(async () => {
    setLogsLoading(true);
    try {
      const data = await fcmService.getLogs({ limit: 100 });
      setLogs(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLogsLoading(false);
    }
  }, []);

  const loadDevices = useCallback(async () => {
    setDevicesLoading(true);
    try {
      const data = await fcmService.getAllDevices({ limit: 200 });
      setDevices(data);
    } catch (e) {
      console.error(e);
    } finally {
      setDevicesLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'logs') loadLogs();
    if (activeTab === 'devices') loadDevices();
  }, [activeTab, loadLogs, loadDevices]);

  const handleSend = async () => {
    if (!title.trim() || !body.trim()) {
      setError('Title and body are required.');
      return;
    }

    const payload: SendNotificationPayload = {
      title: title.trim(),
      body: body.trim(),
      image_url: imageUrl.trim() || undefined,
    };

    setSending(true);
    setResult(null);
    setError(null);

    try {
      let res: NotificationSendResult;

      switch (sendMode) {
        case 'user': {
          const uid = parseInt(targetUserId, 10);
          if (!uid || isNaN(uid)) throw new Error('Please enter a valid User ID.');
          res = await fcmService.sendToUser(uid, payload);
          break;
        }
        case 'users': {
          const ids = targetUserIds
            .split(',')
            .map(s => parseInt(s.trim(), 10))
            .filter(n => !isNaN(n) && n > 0);
          if (ids.length === 0) throw new Error('Enter at least one valid User ID.');
          res = await fcmService.sendToUsers({ ...payload, user_ids: ids });
          break;
        }
        case 'broadcast':
          res = await fcmService.broadcast(payload);
          break;
        case 'role':
          res = await fcmService.sendToRole(targetRole, payload);
          break;
        case 'topic':
          res = await fcmService.sendToTopic(targetTopic || 'all', payload);
          break;
        case 'class': {
          const cid = parseInt(targetClassId, 10);
          if (!cid || isNaN(cid)) throw new Error('Please enter a valid Class ID.');
          res = await fcmService.sendToClass(cid, payload);
          break;
        }
        default:
          throw new Error('Unknown send mode');
      }

      setResult(res);
    } catch (e: any) {
      setError(e?.response?.data?.detail ?? e?.message ?? 'Send failed. Check console.');
    } finally {
      setSending(false);
    }
  };

  const statusBadge = (status: string) => {
    const colors: Record<string, string> = {
      sent: '#22c55e',
      failed: '#ef4444',
      invalid_token: '#f59e0b',
    };
    return (
      <span style={{
        display: 'inline-block',
        padding: '2px 8px',
        borderRadius: 99,
        fontSize: 11,
        fontWeight: 700,
        background: colors[status] ?? '#6b7280',
        color: '#fff',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
      }}>
        {status}
      </span>
    );
  };

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.h1}>🔔 Push Notification Center</h1>
          <p style={styles.subtitle}>
            Send FCM push notifications to users across web and mobile devices.
          </p>
        </div>
      </div>

      {/* ── Tabs ─────────────────────────────────────────────── */}
      <div style={styles.tabs}>
        {(['send', 'logs', 'devices'] as Tab[]).map(tab => (
          <button
            key={tab}
            style={{ ...styles.tab, ...(activeTab === tab ? styles.tabActive : {}) }}
            onClick={() => setActiveTab(tab)}
          >
            {tab === 'send' && '📤 Send'}
            {tab === 'logs' && '📋 History'}
            {tab === 'devices' && '📱 Devices'}
          </button>
        ))}
      </div>

      {/* ══════════════════════════════════════════════════════ */}
      {/* SEND TAB                                              */}
      {/* ══════════════════════════════════════════════════════ */}
      {activeTab === 'send' && (
        <div style={styles.card}>
          {/* Send Mode selector */}
          <div style={styles.section}>
            <label style={styles.label}>Target Audience</label>
            <div style={styles.modeGrid}>
              {([
                { mode: 'broadcast', icon: '📢', label: 'Broadcast' },
                { mode: 'role', icon: '👥', label: 'By Role' },
                { mode: 'user', icon: '👤', label: 'Single User' },
                { mode: 'users', icon: '👥', label: 'Multiple Users' },
                { mode: 'topic', icon: '📌', label: 'FCM Topic' },
                { mode: 'class', icon: '🏫', label: 'By Class' },
              ] as { mode: SendMode; icon: string; label: string }[]).map(({ mode, icon, label }) => (
                <button
                  key={mode}
                  style={{
                    ...styles.modeBtn,
                    ...(sendMode === mode ? styles.modeBtnActive : {}),
                  }}
                  onClick={() => setSendMode(mode)}
                >
                  <span style={{ fontSize: 20 }}>{icon}</span>
                  <span style={{ fontSize: 12, marginTop: 4 }}>{label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Target input based on mode */}
          {sendMode === 'user' && (
            <div style={styles.section}>
              <label style={styles.label}>User ID</label>
              <input
                style={styles.input}
                type="number"
                placeholder="Enter user ID (e.g. 42)"
                value={targetUserId}
                onChange={e => setTargetUserId(e.target.value)}
              />
            </div>
          )}
          {sendMode === 'users' && (
            <div style={styles.section}>
              <label style={styles.label}>User IDs (comma-separated)</label>
              <input
                style={styles.input}
                type="text"
                placeholder="e.g. 1, 2, 5, 10"
                value={targetUserIds}
                onChange={e => setTargetUserIds(e.target.value)}
              />
            </div>
          )}
          {sendMode === 'role' && (
            <div style={styles.section}>
              <label style={styles.label}>Role</label>
              <select
                style={styles.select}
                value={targetRole}
                onChange={e => setTargetRole(e.target.value)}
              >
                {ROLE_OPTIONS.map(r => (
                  <option key={r.code} value={r.code}>{r.label}</option>
                ))}
              </select>
            </div>
          )}
          {sendMode === 'topic' && (
            <div style={styles.section}>
              <label style={styles.label}>FCM Topic</label>
              <input
                style={styles.input}
                type="text"
                placeholder="e.g. all, student, teacher"
                value={targetTopic}
                onChange={e => setTargetTopic(e.target.value)}
              />
            </div>
          )}
          {sendMode === 'class' && (
            <div style={styles.section}>
              <label style={styles.label}>Class ID</label>
              <input
                style={styles.input}
                type="number"
                placeholder="Enter class ID"
                value={targetClassId}
                onChange={e => setTargetClassId(e.target.value)}
              />
            </div>
          )}

          {/* Message fields */}
          <div style={styles.section}>
            <label style={styles.label}>Notification Title</label>
            <input
              style={styles.input}
              type="text"
              placeholder="e.g. School is closed tomorrow"
              value={title}
              onChange={e => setTitle(e.target.value)}
              maxLength={200}
            />
          </div>
          <div style={styles.section}>
            <label style={styles.label}>Message Body</label>
            <textarea
              style={{ ...styles.input, height: 80, resize: 'vertical' }}
              placeholder="Enter the notification message..."
              value={body}
              onChange={e => setBody(e.target.value)}
              maxLength={1000}
            />
          </div>
          <div style={styles.section}>
            <label style={styles.label}>Image URL <span style={styles.optional}>(optional)</span></label>
            <input
              style={styles.input}
              type="url"
              placeholder="https://example.com/image.png"
              value={imageUrl}
              onChange={e => setImageUrl(e.target.value)}
            />
          </div>

          {/* Error / Result */}
          {error && (
            <div style={styles.errorBox}>
              ❌ {error}
            </div>
          )}
          {result && (
            <div style={styles.resultBox}>
              <div style={styles.resultRow}>
                <span>✅ Sent successfully</span>
                <span style={styles.resultBadge}>{result.success_count}</span>
              </div>
              {result.failure_count > 0 && (
                <div style={styles.resultRow}>
                  <span>❌ Failed</span>
                  <span style={{ ...styles.resultBadge, background: '#ef4444' }}>{result.failure_count}</span>
                </div>
              )}
              {result.invalid_tokens_removed > 0 && (
                <div style={styles.resultRow}>
                  <span>🧹 Stale tokens removed</span>
                  <span style={{ ...styles.resultBadge, background: '#f59e0b' }}>{result.invalid_tokens_removed}</span>
                </div>
              )}
              {result.message_id && (
                <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 6 }}>
                  Message ID: {result.message_id}
                </div>
              )}
            </div>
          )}

          <button
            style={{ ...styles.sendBtn, opacity: sending ? 0.7 : 1 }}
            onClick={handleSend}
            disabled={sending}
          >
            {sending ? '⏳ Sending...' : '🚀 Send Notification'}
          </button>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════ */}
      {/* HISTORY TAB                                           */}
      {/* ══════════════════════════════════════════════════════ */}
      {activeTab === 'logs' && (
        <div style={styles.card}>
          <div style={styles.tableHeader}>
            <span style={styles.tableTitle}>📋 Notification Delivery History</span>
            <button style={styles.refreshBtn} onClick={loadLogs}>↻ Refresh</button>
          </div>

          {logsLoading ? (
            <div style={styles.loading}>Loading history...</div>
          ) : logs.length === 0 ? (
            <div style={styles.empty}>No notification history yet.</div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    {['Time', 'Title', 'Body', 'Target', 'Status', 'Error'].map(h => (
                      <th key={h} style={styles.th}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {logs.map(log => (
                    <tr key={log.id} style={styles.tr}>
                      <td style={styles.td}>{new Date(log.sent_at).toLocaleString('en-IN')}</td>
                      <td style={{ ...styles.td, fontWeight: 600 }}>{log.title}</td>
                      <td style={styles.td}>{log.body.substring(0, 60)}{log.body.length > 60 ? '…' : ''}</td>
                      <td style={styles.td}>
                        <span style={styles.typePill}>{log.target_type}</span>
                        {log.user_id && <span style={{ marginLeft: 4, color: '#9ca3af', fontSize: 11 }}>#{log.user_id}</span>}
                      </td>
                      <td style={styles.td}>{statusBadge(log.delivery_status ?? log.status ?? 'unknown')}</td>
                      <td style={{ ...styles.td, color: '#ef4444', fontSize: 11 }}>{log.error_message ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════ */}
      {/* DEVICES TAB                                           */}
      {/* ══════════════════════════════════════════════════════ */}
      {activeTab === 'devices' && (
        <div style={styles.card}>
          <div style={styles.tableHeader}>
            <span style={styles.tableTitle}>📱 Registered Devices ({devices.length})</span>
            <button style={styles.refreshBtn} onClick={loadDevices}>↻ Refresh</button>
          </div>

          {devicesLoading ? (
            <div style={styles.loading}>Loading devices...</div>
          ) : devices.length === 0 ? (
            <div style={styles.empty}>No registered devices found.</div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    {['User', 'Device Type', 'Browser/OS', 'Device Name', 'Last Used', 'Token'].map(h => (
                      <th key={h} style={styles.th}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {devices.map(dev => (
                    <tr key={dev.id} style={styles.tr}>
                      <td style={styles.td}>#{dev.user_id}</td>
                      <td style={styles.td}>
                        <span style={{
                          ...styles.typePill,
                          background: dev.device_type === 'android' ? '#22c55e22' :
                            dev.device_type === 'ios' ? '#3b82f622' : '#a855f722',
                          color: dev.device_type === 'android' ? '#16a34a' :
                            dev.device_type === 'ios' ? '#2563eb' : '#9333ea',
                        }}>
                          {dev.device_type === 'android' ? '🤖' : dev.device_type === 'ios' ? '🍎' : '🌐'} {dev.device_type}
                        </span>
                      </td>
                      <td style={styles.td}>{dev.browser ?? dev.os ?? '—'}</td>
                      <td style={styles.td}>{dev.device_name ?? '—'}</td>
                      <td style={styles.td}>
                        {dev.last_used_at
                          ? new Date(dev.last_used_at).toLocaleDateString('en-IN')
                          : '—'}
                      </td>
                      <td style={{ ...styles.td, fontFamily: 'monospace', fontSize: 11, color: '#9ca3af' }}>
                        {dev.token_preview}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────
const styles: Record<string, React.CSSProperties> = {
  page: {
    maxWidth: 960,
    margin: '0 auto',
    padding: '24px 16px',
    fontFamily: 'Inter, system-ui, sans-serif',
    color: '#111827',
  },
  header: {
    marginBottom: 24,
  },
  h1: {
    fontSize: 24,
    fontWeight: 700,
    margin: 0,
    color: '#111827',
  },
  subtitle: {
    margin: '4px 0 0',
    color: '#6b7280',
    fontSize: 14,
  },
  tabs: {
    display: 'flex',
    gap: 8,
    marginBottom: 20,
    borderBottom: '1px solid #e5e7eb',
    paddingBottom: 0,
  },
  tab: {
    padding: '10px 20px',
    background: 'none',
    border: 'none',
    borderBottom: '2px solid transparent',
    cursor: 'pointer',
    fontWeight: 600,
    fontSize: 14,
    color: '#6b7280',
    transition: 'all 0.15s',
    borderRadius: '6px 6px 0 0',
  },
  tabActive: {
    color: '#4f46e5',
    borderBottom: '2px solid #4f46e5',
    background: '#f5f3ff',
  },
  card: {
    background: '#fff',
    border: '1px solid #e5e7eb',
    borderRadius: 12,
    padding: 24,
    boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
  },
  section: {
    marginBottom: 16,
  },
  label: {
    display: 'block',
    fontWeight: 600,
    fontSize: 13,
    color: '#374151',
    marginBottom: 6,
  },
  optional: {
    fontWeight: 400,
    color: '#9ca3af',
    fontSize: 12,
  },
  input: {
    width: '100%',
    padding: '10px 12px',
    border: '1px solid #d1d5db',
    borderRadius: 8,
    fontSize: 14,
    background: '#f9fafb',
    boxSizing: 'border-box',
    outline: 'none',
    transition: 'border 0.15s',
  },
  select: {
    width: '100%',
    padding: '10px 12px',
    border: '1px solid #d1d5db',
    borderRadius: 8,
    fontSize: 14,
    background: '#f9fafb',
    boxSizing: 'border-box',
    cursor: 'pointer',
  },
  modeGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: 10,
  },
  modeBtn: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '12px 8px',
    border: '2px solid #e5e7eb',
    borderRadius: 10,
    background: '#f9fafb',
    cursor: 'pointer',
    fontWeight: 600,
    transition: 'all 0.15s',
    gap: 2,
  },
  modeBtnActive: {
    border: '2px solid #4f46e5',
    background: '#eef2ff',
    color: '#4f46e5',
  },
  sendBtn: {
    width: '100%',
    padding: '14px',
    background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
    color: '#fff',
    border: 'none',
    borderRadius: 10,
    fontSize: 16,
    fontWeight: 700,
    cursor: 'pointer',
    marginTop: 8,
    transition: 'opacity 0.15s',
    boxShadow: '0 4px 12px rgba(79,70,229,0.3)',
  },
  errorBox: {
    background: '#fef2f2',
    border: '1px solid #fecaca',
    color: '#dc2626',
    borderRadius: 8,
    padding: '10px 14px',
    marginBottom: 12,
    fontSize: 14,
  },
  resultBox: {
    background: '#f0fdf4',
    border: '1px solid #bbf7d0',
    borderRadius: 8,
    padding: '12px 16px',
    marginBottom: 12,
  },
  resultRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: 14,
    fontWeight: 600,
    marginBottom: 4,
  },
  resultBadge: {
    background: '#22c55e',
    color: '#fff',
    borderRadius: 99,
    padding: '2px 10px',
    fontWeight: 700,
    fontSize: 13,
  },
  tableHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  tableTitle: {
    fontWeight: 700,
    fontSize: 16,
  },
  refreshBtn: {
    padding: '6px 14px',
    border: '1px solid #d1d5db',
    borderRadius: 8,
    background: '#fff',
    cursor: 'pointer',
    fontWeight: 600,
    fontSize: 13,
    color: '#374151',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: 13,
  },
  th: {
    textAlign: 'left',
    padding: '10px 12px',
    background: '#f9fafb',
    borderBottom: '1px solid #e5e7eb',
    fontWeight: 700,
    color: '#374151',
    whiteSpace: 'nowrap',
  },
  tr: {
    borderBottom: '1px solid #f3f4f6',
  },
  td: {
    padding: '10px 12px',
    verticalAlign: 'middle',
    color: '#374151',
  },
  typePill: {
    display: 'inline-block',
    padding: '2px 8px',
    borderRadius: 99,
    fontSize: 11,
    fontWeight: 700,
    background: '#e0e7ff',
    color: '#4338ca',
    textTransform: 'capitalize',
  },
  loading: {
    textAlign: 'center',
    padding: '40px 0',
    color: '#9ca3af',
    fontSize: 15,
  },
  empty: {
    textAlign: 'center',
    padding: '40px 0',
    color: '#9ca3af',
    fontSize: 15,
  },
};
