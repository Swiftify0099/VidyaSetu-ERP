import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Settings, GraduationCap, ShieldCheck, Calendar, RefreshCw,
  Save, Plus, Check, Star
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import styles from './SettingsPage.module.css';

type Tab = 'general' | 'academic' | 'security' | 'system';

interface AcademicYear {
  id: number;
  uuid: string;
  name: string;
  code: string;
  start_date: string;
  end_date: string;
  is_current: boolean;
  status: string;
}

interface SettingEntry {
  key: string;
  value: string;
  label: string;
  description: string;
  type: 'text' | 'number' | 'boolean';
}

const GENERAL_SETTINGS: SettingEntry[] = [
  { key: 'school.name', label: 'School Name', description: 'Full official name of the school', type: 'text', value: '' },
  { key: 'school.address', label: 'School Address', description: 'Complete address for certificates & reports', type: 'text', value: '' },
  { key: 'school.phone', label: 'School Phone', description: 'Primary contact number', type: 'text', value: '' },
  { key: 'school.email', label: 'School Email', description: 'Official email for communication', type: 'text', value: '' },
  { key: 'school.website', label: 'School Website', description: 'Official website URL', type: 'text', value: '' },
  { key: 'school.principal_name', label: 'Principal Name', description: 'Name appears on reports and certificates', type: 'text', value: '' },
];

const SECURITY_SETTINGS: SettingEntry[] = [
  { key: 'security.max_login_attempts', label: 'Max Login Attempts', description: 'Number of failed attempts before account lock', type: 'number', value: '5' },
  { key: 'security.lock_duration_minutes', label: 'Account Lock Duration (min)', description: 'Minutes an account remains locked after failed attempts', type: 'number', value: '30' },
  { key: 'security.session_timeout_minutes', label: 'Session Timeout (min)', description: 'Idle time before automatic logout', type: 'number', value: '120' },
  { key: 'security.password_min_length', label: 'Min Password Length', description: 'Minimum characters required in password', type: 'number', value: '8' },
  { key: 'security.require_password_change_days', label: 'Password Expiry (days)', description: '0 = never expire. Else force change after N days.', type: 'number', value: '90' },
];

const SYSTEM_SETTINGS: SettingEntry[] = [
  { key: 'prefix.receipt', label: 'Receipt Prefix', description: 'Prefix for fee receipt numbers (e.g. HMMV-RCP)', type: 'text', value: '' },
  { key: 'prefix.certificate', label: 'Certificate Prefix', description: 'Prefix for certificate numbers', type: 'text', value: '' },
  { key: 'prefix.admission', label: 'Admission Prefix', description: 'Prefix for admission numbers', type: 'text', value: '' },
  { key: 'prefix.voucher', label: 'Voucher Prefix', description: 'Prefix for payment/receipt vouchers', type: 'text', value: '' },
  { key: 'system.default_language', label: 'Default Language', description: 'Application default language (mr/en)', type: 'text', value: 'mr' },
  { key: 'system.timezone', label: 'Timezone', description: 'Server timezone (e.g. Asia/Kolkata)', type: 'text', value: 'Asia/Kolkata' },
];

export default function SettingsPage() {
  const { t } = useTranslation();
  const [tab, setTab] = useState<Tab>('general');

  // ── System settings state ──────────────────────────────────
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [localValues, setLocalValues] = useState<Record<string, string>>({});

  // ── Academic Years ─────────────────────────────────────────
  const [years, setYears] = useState<AcademicYear[]>([]);
  const [loadingYears, setLoadingYears] = useState(false);
  const [settingCurrent, setSettingCurrent] = useState<number | null>(null);
  const [showAddYear, setShowAddYear] = useState(false);
  const [newYear, setNewYear] = useState({ name: '', code: '', start_date: '', end_date: '' });
  const [addingYear, setAddingYear] = useState(false);

  // ── Fetch settings ─────────────────────────────────────────
  const loadSettings = useCallback(async () => {
    setLoadingSettings(true);
    try {
      const res = await api.get('/system/settings');
      const data: Record<string, string> = res.data.data || {};
      setSettings(data);
      setLocalValues(data);
    } catch { toast.error('Failed to load settings'); }
    finally { setLoadingSettings(false); }
  }, []);

  // ── Fetch academic years ───────────────────────────────────
  const loadYears = useCallback(async () => {
    setLoadingYears(true);
    try {
      const res = await api.get('/system/academic-years');
      setYears(res.data.data || []);
    } catch { toast.error('Failed to load academic years'); }
    finally { setLoadingYears(false); }
  }, []);

  useEffect(() => { loadSettings(); }, [loadSettings]);
  useEffect(() => { if (tab === 'academic') loadYears(); }, [tab, loadYears]);

  // ── Save individual setting ────────────────────────────────
  const saveSetting = async (key: string) => {
    setSavingKey(key);
    try {
      await api.put(`/system/settings/${key}`, { value: localValues[key] ?? '' });
      setSettings(prev => ({ ...prev, [key]: localValues[key] ?? '' }));
      toast.success('Setting saved');
    } catch { toast.error('Failed to save setting'); }
    finally { setSavingKey(null); }
  };

  // ── Set current academic year ──────────────────────────────
  const setCurrentYear = async (id: number) => {
    setSettingCurrent(id);
    try {
      await api.post(`/system/academic-years/${id}/set-current`);
      toast.success('Current academic year updated');
      loadYears();
    } catch { toast.error('Failed to update academic year'); }
    finally { setSettingCurrent(null); }
  };

  // ── Add academic year ──────────────────────────────────────
  const addYear = async () => {
    if (!newYear.name || !newYear.code || !newYear.start_date || !newYear.end_date) {
      toast.error('All fields are required'); return;
    }
    setAddingYear(true);
    try {
      await api.post('/system/academic-years', newYear);
      toast.success('Academic year created');
      setShowAddYear(false);
      setNewYear({ name: '', code: '', start_date: '', end_date: '' });
      loadYears();
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || 'Failed to create academic year');
    } finally { setAddingYear(false); }
  };

  // ── Render setting rows ────────────────────────────────────
  const renderSettingRows = (entries: SettingEntry[]) => entries.map(s => {
    const val = localValues[s.key] ?? settings[s.key] ?? s.value;
    const isDirty = val !== (settings[s.key] ?? s.value);
    return (
      <div key={s.key} className={styles.settingRow}>
        <div className={styles.settingInfo}>
          <div className={styles.settingLabel}>{s.label}</div>
          <div className={styles.settingDesc}>{s.description}</div>
        </div>
        <div className={styles.settingControl}>
          <input
            className={styles.settingInput}
            type={s.type === 'number' ? 'number' : 'text'}
            value={val}
            onChange={e => setLocalValues(prev => ({ ...prev, [s.key]: e.target.value }))}
          />
          <button
            className={styles.saveBtn}
            onClick={() => saveSetting(s.key)}
            disabled={savingKey === s.key || !isDirty}
          >
            {savingKey === s.key
              ? <span className={styles.spin} />
              : <Save size={13} />}
            <span>Save</span>
          </button>
        </div>
      </div>
    );
  });

  const TABS: { key: Tab; icon: React.ReactNode; label: string }[] = [
    { key: 'general', icon: <Settings size={15} />, label: 'General' },
    { key: 'academic', icon: <Calendar size={15} />, label: 'Academic Years' },
    { key: 'security', icon: <ShieldCheck size={15} />, label: 'Security' },
    { key: 'system', icon: <GraduationCap size={15} />, label: 'System Prefixes' },
  ];

  return (
    <div className={styles.page}>
      {/* Header */}
      <div>
        <h1 className={styles.pageTitle}>System Settings</h1>
        <p className={styles.pageSub}>Configure school settings, academic years, security and system preferences.</p>
      </div>

      {/* Tabs */}
      <div className={styles.tabBar}>
        {TABS.map(tb => (
          <button
            key={tb.key}
            className={`${styles.tab} ${tab === tb.key ? styles.tabActive : ''}`}
            onClick={() => setTab(tb.key)}
          >
            {tb.icon}
            <span>{tb.label}</span>
          </button>
        ))}
      </div>

      {/* ── General Tab ── */}
      {tab === 'general' && (
        <div className={styles.card}>
          <div className={styles.cardTitle}><Settings size={16} /> School Information</div>
          {loadingSettings
            ? <div style={{ color: 'var(--color-text-muted)', fontSize: 'var(--font-size-sm)' }}>Loading…</div>
            : renderSettingRows(GENERAL_SETTINGS)}
        </div>
      )}

      {/* ── Academic Years Tab ── */}
      {tab === 'academic' && (
        <div className={styles.card}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-4)' }}>
            <div className={styles.cardTitle} style={{ marginBottom: 0 }}><Calendar size={16} /> Academic Years</div>
            <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
              <button className={styles.iconBtn} onClick={loadYears}><RefreshCw size={14} /></button>
              <button className={styles.btnPrimary} onClick={() => setShowAddYear(v => !v)}>
                <Plus size={14} />
                <span>Add Year</span>
              </button>
            </div>
          </div>

          {/* Add form */}
          {showAddYear && (
            <div className={styles.card} style={{ marginBottom: 'var(--space-4)', background: 'var(--color-surface-2)' }}>
              <div className={styles.cardTitle} style={{ fontSize: 'var(--font-size-sm)' }}>New Academic Year</div>
              <div className={styles.formRow}>
                <div className={styles.field}>
                  <label className={styles.label}>Name *</label>
                  <input className={styles.input} placeholder="e.g. 2025-2026" value={newYear.name} onChange={e => setNewYear(p => ({ ...p, name: e.target.value }))} />
                </div>
                <div className={styles.field}>
                  <label className={styles.label}>Code *</label>
                  <input className={styles.input} placeholder="e.g. 2025-26" value={newYear.code} onChange={e => setNewYear(p => ({ ...p, code: e.target.value }))} />
                </div>
                <div className={styles.field}>
                  <label className={styles.label}>Start Date *</label>
                  <input className={styles.input} type="date" value={newYear.start_date} onChange={e => setNewYear(p => ({ ...p, start_date: e.target.value }))} />
                </div>
                <div className={styles.field}>
                  <label className={styles.label}>End Date *</label>
                  <input className={styles.input} type="date" value={newYear.end_date} onChange={e => setNewYear(p => ({ ...p, end_date: e.target.value }))} />
                </div>
              </div>
              <div className={styles.btnRow}>
                <button className={styles.btnSecondary} onClick={() => setShowAddYear(false)}>Cancel</button>
                <button className={styles.btnPrimary} onClick={addYear} disabled={addingYear}>
                  {addingYear ? <span className={styles.spin} /> : <Check size={14} />}
                  <span>Create Year</span>
                </button>
              </div>
            </div>
          )}

          {/* Table */}
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Code</th>
                  <th>Start Date</th>
                  <th>End Date</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {loadingYears ? (
                  <tr><td colSpan={6} style={{ textAlign: 'center', padding: 'var(--space-6)', color: 'var(--color-text-muted)' }}>Loading…</td></tr>
                ) : years.length === 0 ? (
                  <tr><td colSpan={6} style={{ textAlign: 'center', padding: 'var(--space-6)', color: 'var(--color-text-muted)' }}>No academic years found</td></tr>
                ) : years.map(y => (
                  <tr key={y.id}>
                    <td style={{ fontWeight: 'var(--font-weight-semibold)' }}>{y.name}</td>
                    <td style={{ color: 'var(--color-text-muted)' }}>{y.code}</td>
                    <td>{y.start_date}</td>
                    <td>{y.end_date}</td>
                    <td>
                      <span className={`${styles.badge} ${y.is_current ? styles.badgeGreen : styles.badgeGray}`}>
                        {y.is_current ? <><Star size={11} fill="currentColor" className="inline mr-1" /> Current</> : y.status}
                      </span>
                    </td>
                    <td>
                      {!y.is_current && (
                        <button
                          className={styles.saveBtn}
                          onClick={() => setCurrentYear(y.id)}
                          disabled={settingCurrent === y.id}
                        >
                          {settingCurrent === y.id ? <span className={styles.spin} /> : <Star size={12} />}
                          <span>Set Current</span>
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Security Tab ── */}
      {tab === 'security' && (
        <div className={styles.card}>
          <div className={styles.cardTitle}><ShieldCheck size={16} /> Security Policy</div>
          {loadingSettings
            ? <div style={{ color: 'var(--color-text-muted)', fontSize: 'var(--font-size-sm)' }}>Loading…</div>
            : renderSettingRows(SECURITY_SETTINGS)}
        </div>
      )}

      {/* ── System Prefixes Tab ── */}
      {tab === 'system' && (
        <div className={styles.card}>
          <div className={styles.cardTitle}><GraduationCap size={16} /> System Prefixes & Locale</div>
          {loadingSettings
            ? <div style={{ color: 'var(--color-text-muted)', fontSize: 'var(--font-size-sm)' }}>Loading…</div>
            : renderSettingRows(SYSTEM_SETTINGS)}
        </div>
      )}
    </div>
  );
}
