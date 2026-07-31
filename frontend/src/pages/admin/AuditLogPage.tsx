/**
 * VidyaSetu ERP — Audit Log Viewer
 * =================================
 * Route: /admin/audit
 * Shows all system activity: CREATE, UPDATE, DELETE, LOGIN, LOGOUT, APPROVE, REJECT
 * Role: super_admin, admin
 */
import { useState, useEffect, useCallback } from 'react';
import {
  Shield, Search, RefreshCw, ChevronDown, ChevronUp,
  Download, Filter, X, Clock, User, Activity,
  LogIn, LogOut, Edit2, Trash2, CheckCircle2, AlertCircle,
  ChevronLeft, ChevronRight,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import styles from './AuditLogPage.module.css';

interface AuditEntry {
  id: number;
  action: string;
  module: string;
  entity_type: string;
  entity_id?: number | string;
  description: string;
  user_id?: number;
  user_name?: string;
  user_role?: string;
  ip_address?: string;
  user_agent?: string;
  before_data?: any;
  after_data?: any;
  created_at: string;
  status: 'success' | 'failed';
}

interface AuditStats {
  total_today: number;
  logins_today: number;
  critical_actions: number;
  failed_actions: number;
}

const ACTIONS = ['CREATE','UPDATE','DELETE','LOGIN','LOGOUT','APPROVE','REJECT','EXPORT','VIEW'];
const MODULES = ['student','teacher','finance','library','exam','attendance','inventory','office','leave','admin','communication','settings','auth'];

const ACTION_ICONS: Record<string, React.ReactNode> = {
  CREATE:  <CheckCircle2 size={13} />,
  UPDATE:  <Edit2 size={13} />,
  DELETE:  <Trash2 size={13} />,
  LOGIN:   <LogIn size={13} />,
  LOGOUT:  <LogOut size={13} />,
  APPROVE: <CheckCircle2 size={13} />,
  REJECT:  <AlertCircle size={13} />,
};

function formatTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function formatJSON(obj: any): string {
  if (!obj) return '—';
  try { return JSON.stringify(obj, null, 2); } catch { return String(obj); }
}

export default function AuditLogPage() {
  const [logs, setLogs]       = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats]     = useState<AuditStats | null>(null);
  const [expanded, setExpanded] = useState<number | null>(null);

  // Filters
  const [search, setSearch]         = useState('');
  const [action, setAction]         = useState('');
  const [module, setModule]         = useState('');
  const [dateFrom, setDateFrom]     = useState('');
  const [dateTo, setDateTo]         = useState('');
  const [page, setPage]             = useState(1);
  const [total, setTotal]           = useState(0);
  const PER_PAGE = 30;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/audit-logs', {
        params: {
          search: search || undefined,
          action:    action  || undefined,
          module:    module  || undefined,
          date_from: dateFrom || undefined,
          date_to:   dateTo   || undefined,
          page, per_page: PER_PAGE,
        }
      });
      if (res.data?.success) {
        const d = res.data.data;
        setLogs(d?.logs || d?.items || d || []);
        setTotal(d?.total || 0);
        if (d?.stats) setStats(d.stats);
      }
    } catch (err: any) {
      // If endpoint doesn't exist yet, show empty state gracefully
      console.warn('Audit log endpoint:', err?.response?.status);
      setLogs([]);
    } finally { setLoading(false); }
  }, [search, action, module, dateFrom, dateTo, page]);

  useEffect(() => { load(); }, [load]);

  const clearFilters = () => {
    setSearch(''); setAction(''); setModule('');
    setDateFrom(''); setDateTo(''); setPage(1);
  };

  const totalPages = Math.ceil(total / PER_PAGE);
  const hasFilters = search || action || module || dateFrom || dateTo;

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Audit Log</h1>
          <p className={styles.pageSub}>Complete system activity trail — all user actions, logins, and data changes</p>
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
          <button className={styles.iconBtn} title="Export Logs"><Download size={16} /></button>
          <button className={styles.iconBtn} onClick={load} title="Refresh">
            <RefreshCw size={16} className={loading ? styles.spinning : ''} />
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className={styles.statsRow}>
        {[
          { label: 'Actions Today',      val: stats?.total_today   ?? '—', icon: <Activity size={20} />,     color: 'var(--color-primary)' },
          { label: 'Logins Today',       val: stats?.logins_today  ?? '—', icon: <LogIn size={20} />,        color: 'var(--color-success)' },
          { label: 'Critical Actions',   val: stats?.critical_actions ?? '—', icon: <AlertCircle size={20} />, color: 'var(--color-warning)' },
          { label: 'Failed Actions',     val: stats?.failed_actions  ?? '—', icon: <Shield size={20} />,      color: 'var(--color-danger)' },
        ].map(s => (
          <div key={s.label} className={styles.statCard} style={{ '--c': s.color } as React.CSSProperties}>
            <div className={styles.statIcon}>{s.icon}</div>
            <div className={styles.statVal}>{s.val}</div>
            <div className={styles.statLbl}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className={styles.filterBar}>
        <div className={styles.searchWrap}>
          <Search size={15} className={styles.searchIcon} />
          <input
            className={styles.searchInput}
            placeholder="Search by user, action, entity..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <select className={styles.sel} value={action} onChange={e => { setAction(e.target.value); setPage(1); }}>
          <option value="">All Actions</option>
          {ACTIONS.map(a => <option key={a} value={a}>{a}</option>)}
        </select>
        <select className={styles.sel} value={module} onChange={e => { setModule(e.target.value); setPage(1); }}>
          <option value="">All Modules</option>
          {MODULES.map(m => <option key={m} value={m}>{m.charAt(0).toUpperCase() + m.slice(1)}</option>)}
        </select>
        <input type="date" className={styles.dateInput} value={dateFrom} onChange={e => setDateFrom(e.target.value)} title="From Date" />
        <input type="date" className={styles.dateInput} value={dateTo}   onChange={e => setDateTo(e.target.value)}   title="To Date" />
        {hasFilters && (
          <button className={styles.clearBtn} onClick={clearFilters}>
            <X size={14} /> Clear
          </button>
        )}
      </div>

      {/* Table */}
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Time</th>
              <th>User</th>
              <th>Action</th>
              <th>Module</th>
              <th>Description</th>
              <th>IP Address</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array(10).fill(0).map((_, i) => (
                <tr key={i}>
                  {Array(8).fill(0).map((__, j) => (
                    <td key={j}><div className={styles.skeleton} style={{ width: [120, 100, 60, 80, 200, 80, 60, 20][j] }} /></td>
                  ))}
                </tr>
              ))
            ) : logs.length === 0 ? (
              <tr>
                <td colSpan={8} className={styles.emptyCell}>
                  <div className={styles.emptyState}>
                    <Activity size={40} />
                    <p>No audit logs found</p>
                    <span>Logs appear as users perform actions in the system</span>
                  </div>
                </td>
              </tr>
            ) : logs.map(log => (
              <>
                <tr key={log.id} className={styles.row} onClick={() => setExpanded(expanded === log.id ? null : log.id)}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-1)', color: 'var(--color-text-muted)', fontSize: 'var(--font-size-xs)' }}>
                      <Clock size={12} />
                      {formatTime(log.created_at)}
                    </div>
                  </td>
                  <td>
                    <div className={styles.userCell}>
                      <div className={styles.avatar}>{(log.user_name || 'S').charAt(0).toUpperCase()}</div>
                      <div>
                        <div className={styles.userName}>{log.user_name || 'System'}</div>
                        {log.user_role && <div className={styles.userRole}>{log.user_role}</div>}
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className={`${styles.actionBadge} ${styles[log.action] || ''}`}>
                      {ACTION_ICONS[log.action]} {log.action}
                    </span>
                  </td>
                  <td>
                    <span className={styles.moduleBadge}>{log.module || log.entity_type}</span>
                  </td>
                  <td style={{ maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {log.description}
                  </td>
                  <td style={{ fontFamily: 'monospace', fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
                    {log.ip_address || '—'}
                  </td>
                  <td>
                    <span className={`${styles.actionBadge} ${log.status === 'failed' ? styles.DELETE : styles.CREATE}`}>
                      {log.status || 'success'}
                    </span>
                  </td>
                  <td>{expanded === log.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}</td>
                </tr>
                {expanded === log.id && (
                  <tr key={`${log.id}-detail`} className={styles.detailRow}>
                    <td colSpan={8}>
                      <div className={styles.detailContent}>
                        <div className={styles.detailSection}>
                          <div className={styles.detailLabel}>Before (Previous State)</div>
                          <pre className={styles.detailValue}>{formatJSON(log.before_data)}</pre>
                        </div>
                        <div className={styles.detailSection}>
                          <div className={styles.detailLabel}>After (New State)</div>
                          <pre className={styles.detailValue}>{formatJSON(log.after_data)}</pre>
                        </div>
                        {log.user_agent && (
                          <div className={styles.detailSection} style={{ gridColumn: '1/-1' }}>
                            <div className={styles.detailLabel}>User Agent</div>
                            <div className={styles.detailValue}>{log.user_agent}</div>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>

        {/* Pagination */}
        {!loading && total > PER_PAGE && (
          <div className={styles.pagination}>
            <span className={styles.paginInfo}>
              Showing {(page-1)*PER_PAGE + 1}–{Math.min(page*PER_PAGE, total)} of {total} logs
            </span>
            <div className={styles.paginBtns}>
              <button className={styles.paginBtn} onClick={() => setPage(p => p-1)} disabled={page === 1}><ChevronLeft size={14} /></button>
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map(p => (
                <button key={p} className={`${styles.paginBtn} ${page === p ? styles.paginBtnActive : ''}`} onClick={() => setPage(p)}>{p}</button>
              ))}
              {totalPages > 5 && <span style={{ padding: '0 var(--space-2)', color: 'var(--color-text-muted)' }}>...</span>}
              <button className={styles.paginBtn} onClick={() => setPage(p => p+1)} disabled={page === totalPages}><ChevronRight size={14} /></button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
