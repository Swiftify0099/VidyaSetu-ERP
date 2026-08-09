/**
 * VidyaSetu ERP — Student Behaviour Log Page (Phase 3)
 * =====================================================
 * Track student behaviour incidents, counselling notes,
 * achievements, and generate behaviour reports.
 */
import { useState, useEffect, useCallback } from 'react';
import { ShieldAlert, Star, AlertTriangle, BookOpen, Plus, Search, Filter, RefreshCw, Download, FileText } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import {
  PageHeader, DataTable, StatusBadge, SearchBar,
  Modal, Pagination, ExportButton,
} from '../../components/shared';
import type { TableColumn } from '../../types';
import styles from './BehaviourLogPage.module.css';

// ── Types ─────────────────────────────────────────────────────
interface BehaviourEntry {
  id: number;
  student_id: number;
  student_name: string;
  gr_number: string;
  standard: string;
  division: string;
  incident_date: string;
  incident_type: 'positive' | 'negative' | 'neutral';
  category: string;
  description: string;
  action_taken?: string;
  reported_by_name: string;
  follow_up_required: boolean;
  follow_up_date?: string;
  status: 'open' | 'resolved' | 'escalated' | 'closed';
}

const CATEGORIES = {
  positive:  ['Achievement', 'Good Behaviour', 'Leadership', 'Helping', 'Participation', 'Academic Excellence'],
  negative:  ['Absenteeism', 'Bullying', 'Disruptive Behaviour', 'Damage to Property', 'Misconduct', 'Violence', 'Cheating'],
  neutral:   ['Counselling Session', 'Parent Meeting', 'Medical', 'General Observation'],
};

const TYPE_CONFIG = {
  positive: { icon: <Star size={13} />, label: 'Positive',  color: '#059669', bg: '#d1fae5' },
  negative: { icon: <AlertTriangle size={13} />, label: 'Negative',  color: '#dc2626', bg: '#fee2e2' },
  neutral:  { icon: <FileText size={13} />, label: 'Neutral',   color: '#6b7280', bg: '#f3f4f6' },
};

const STANDARDS = ['1','2','3','4','5','6','7','8','9','10','11','12'];

const initialForm = {
  student_gr: '', incident_date: new Date().toISOString().split('T')[0],
  incident_type: 'negative' as BehaviourEntry['incident_type'],
  category: '', description: '', action_taken: '',
  follow_up_required: false, follow_up_date: '',
};

export default function BehaviourLogPage() {
  const [entries, setEntries] = useState<BehaviourEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterStd, setFilterStd] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [stats, setStats] = useState({ positive: 0, negative: 0, open: 0, resolved: 0 });

  const loadEntries = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/behaviour', {
        params: {
          page, per_page: 15,
          search: search || undefined,
          incident_type: filterType || undefined,
          standard: filterStd || undefined,
          status: filterStatus || undefined,
        },
      });
      const d = res.data?.data;
      setEntries(d?.items ?? []);
      setTotal(d?.total ?? 0);
      setTotalPages(d?.pages ?? 1);
      // Compute stats from items
      const items: BehaviourEntry[] = d?.items ?? [];
      setStats({
        positive: items.filter(e => e.incident_type === 'positive').length,
        negative: items.filter(e => e.incident_type === 'negative').length,
        open:     items.filter(e => e.status === 'open').length,
        resolved: items.filter(e => e.status === 'resolved').length,
      });
    } catch {
      // Fallback to demo data for testing
      setEntries([]);
    } finally { setLoading(false); }
  }, [page, search, filterType, filterStd, filterStatus]);

  useEffect(() => { loadEntries(); }, [loadEntries]);

  const saveEntry = async () => {
    if (!form.student_gr || !form.category || !form.description) {
      toast.error('GR number, category and description are required');
      return;
    }
    setSaving(true);
    try {
      await api.post('/behaviour', form);
      toast.success('Behaviour log entry added!');
      setShowModal(false);
      setForm(initialForm);
      loadEntries();
    } catch { toast.error('Failed to save entry'); }
    finally { setSaving(false); }
  };

  const resolveEntry = async (id: number) => {
    try {
      await api.patch(`/behaviour/${id}/resolve`);
      toast.success('Marked as resolved');
      loadEntries();
    } catch { toast.error('Failed to update'); }
  };

  const columns: TableColumn<BehaviourEntry>[] = [
    {
      key: 'incident_date', header: 'Date',
      render: (v) => <span className={styles.mono}>{String(v)}</span>,
    },
    {
      key: 'student_name', header: 'Student',
      render: (_, row) => (
        <div>
          <div className={styles.studentName}>{row.student_name}</div>
          <div className={styles.studentMeta}>GR: {row.gr_number} | Std: {row.standard}-{row.division}</div>
        </div>
      ),
    },
    {
      key: 'incident_type', header: 'Type',
      render: (v) => {
        const cfg = TYPE_CONFIG[v as BehaviourEntry['incident_type']];
        return (
          <span className={styles.typeBadge} style={{ color: cfg.color, backgroundColor: cfg.bg }}>
            {cfg.icon} {cfg.label}
          </span>
        );
      },
    },
    { key: 'category', header: 'Category' },
    {
      key: 'description', header: 'Description',
      render: (v) => <span className={styles.desc}>{String(v)}</span>,
    },
    {
      key: 'status', header: 'Status',
      render: (v) => <StatusBadge status={String(v)} size="sm" />,
    },
    {
      key: 'follow_up_required', header: 'Follow-up',
      align: 'center',
      render: (v, row) => v ? (
        <span className={styles.followUp}>
          📅 {row.follow_up_date || 'Required'}
        </span>
      ) : <span className={styles.noFollowUp}>—</span>,
    },
    {
      key: 'id', header: 'Actions',
      render: (_, row) => row.status === 'open' ? (
        <button
          className={styles.resolveBtn}
          onClick={() => resolveEntry(row.id)}
          title="Mark as Resolved"
        >
          ✓ Resolve
        </button>
      ) : null,
    },
  ];

  return (
    <div className={styles.page}>
      <PageHeader
        title="Student Behaviour Log"
        subtitle="Incidents, achievements, and counselling records — विद्यार्थी वर्तन नोंदणी"
        actions={
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className={styles.addBtn} onClick={() => setShowModal(true)}>
              <Plus size={15} /> Add Entry
            </button>
          </div>
        }
      />

      {/* Stats Row */}
      <div className={styles.statsRow}>
        {[
          { icon: '⭐', label: 'Positive', value: stats.positive, color: '#059669', bg: '#d1fae5' },
          { icon: '⚠️', label: 'Negative', value: stats.negative, color: '#dc2626', bg: '#fee2e2' },
          { icon: '🔔', label: 'Open', value: stats.open, color: '#d97706', bg: '#fef3c7' },
          { icon: '✅', label: 'Resolved', value: stats.resolved, color: '#6b7280', bg: '#f3f4f6' },
        ].map(s => (
          <div key={s.label} className={styles.statCard} style={{ borderTopColor: s.color }}>
            <span style={{ fontSize: '1.4rem' }}>{s.icon}</span>
            <span className={styles.statValue} style={{ color: s.color }}>{s.value}</span>
            <span className={styles.statLabel}>{s.label}</span>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className={styles.toolbar}>
        <div className={styles.toolbarLeft}>
          <SearchBar
            value={search}
            onChange={setSearch}
            placeholder="Search by student name or GR number..."
          />
          <select
            className={styles.select}
            value={filterType}
            onChange={e => { setFilterType(e.target.value); setPage(1); }}
          >
            <option value="">All Types</option>
            <option value="positive">⭐ Positive</option>
            <option value="negative">⚠️ Negative</option>
            <option value="neutral">📝 Neutral</option>
          </select>
          <select
            className={styles.select}
            value={filterStd}
            onChange={e => { setFilterStd(e.target.value); setPage(1); }}
          >
            <option value="">All Standards</option>
            {STANDARDS.map(s => <option key={s} value={s}>Std {s}</option>)}
          </select>
          <select
            className={styles.select}
            value={filterStatus}
            onChange={e => { setFilterStatus(e.target.value); setPage(1); }}
          >
            <option value="">All Status</option>
            <option value="open">Open</option>
            <option value="resolved">Resolved</option>
            <option value="escalated">Escalated</option>
          </select>
        </div>
        <div className={styles.toolbarRight}>
          <button className={styles.iconBtn} onClick={loadEntries} title="Refresh">
            <RefreshCw size={15} />
          </button>
        </div>
      </div>

      {/* Table */}
      <DataTable<BehaviourEntry>
        data={entries}
        columns={columns}
        loading={loading}
        emptyMessage="No behaviour log entries yet. Add the first entry using the button above."
        emptyIcon="🛡️"
        keyExtractor={r => String(r.id)}
      />

      {totalPages > 1 && (
        <Pagination
          page={page}
          totalPages={totalPages}
          total={total}
          pageSize={15}
          onPageChange={setPage}
        />
      )}

      {/* Add Entry Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => { setShowModal(false); setForm(initialForm); }}
        title="Add Behaviour Log Entry"
        size="lg"
        footer={
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
            <button className={styles.cancelBtn} onClick={() => setShowModal(false)}>Cancel</button>
            <button className={styles.saveBtn} onClick={saveEntry} disabled={saving}>
              {saving ? 'Saving...' : '💾 Save Entry'}
            </button>
          </div>
        }
      >
        <div className={styles.formGrid}>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Student GR Number *</label>
            <input
              className={styles.formInput}
              placeholder="Enter GR number"
              value={form.student_gr}
              onChange={e => setForm(f => ({ ...f, student_gr: e.target.value }))}
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Incident Date *</label>
            <input
              type="date"
              className={styles.formInput}
              value={form.incident_date}
              onChange={e => setForm(f => ({ ...f, incident_date: e.target.value }))}
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Incident Type *</label>
            <div className={styles.typeRow}>
              {(['positive', 'negative', 'neutral'] as const).map(t => {
                const cfg = TYPE_CONFIG[t];
                return (
                  <button
                    key={t}
                    type="button"
                    className={`${styles.typeBtn} ${form.incident_type === t ? styles.typeBtnActive : ''}`}
                    style={form.incident_type === t ? { borderColor: cfg.color, backgroundColor: cfg.bg, color: cfg.color } : {}}
                    onClick={() => setForm(f => ({ ...f, incident_type: t, category: '' }))}
                  >
                    {cfg.icon} {cfg.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Category *</label>
            <select
              className={styles.formInput}
              value={form.category}
              onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
            >
              <option value="">Select category</option>
              {CATEGORIES[form.incident_type].map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div className={`${styles.formGroup} ${styles.fullCol}`}>
            <label className={styles.formLabel}>Description *</label>
            <textarea
              className={`${styles.formInput} ${styles.textarea}`}
              rows={3}
              placeholder="Describe the incident or achievement in detail..."
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            />
          </div>

          <div className={`${styles.formGroup} ${styles.fullCol}`}>
            <label className={styles.formLabel}>Action Taken</label>
            <textarea
              className={`${styles.formInput} ${styles.textarea}`}
              rows={2}
              placeholder="What action was taken? (optional)"
              value={form.action_taken}
              onChange={e => setForm(f => ({ ...f, action_taken: e.target.value }))}
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.formLabel}>
              <input
                type="checkbox"
                checked={form.follow_up_required}
                onChange={e => setForm(f => ({ ...f, follow_up_required: e.target.checked }))}
                style={{ marginRight: '6px' }}
              />
              Follow-up Required?
            </label>
          </div>

          {form.follow_up_required && (
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Follow-up Date</label>
              <input
                type="date"
                className={styles.formInput}
                value={form.follow_up_date}
                onChange={e => setForm(f => ({ ...f, follow_up_date: e.target.value }))}
              />
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
