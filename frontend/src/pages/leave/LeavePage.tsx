/**
 * VidyaSetu ERP — Leave Management Page (Phase 3 / Phase 7)
 * ===========================================================
 * Apply, approve/reject leave applications and manage holiday calendar.
 */
import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import api from '../../services/api';
import { PageHeader } from '../../components/shared/PageHeader';
import { DataTable } from '../../components/shared/DataTable';
import { StatusBadge } from '../../components/shared/StatusBadge';
import { SearchBar } from '../../components/shared/SearchBar';
import { Modal } from '../../components/shared/Modal';
import { EmptyState } from '../../components/shared/EmptyState';
import type { TableColumn } from '../../types';
import styles from './LeavePage.module.css';

interface LeaveType { id: number; name: string; code: string; annual_quota: string; is_paid: boolean; }
interface LeaveBalance { id: number; leave_type_name: string; leave_type_code: string; entitled_days: string; used_days: string; available_days: string; pending_days: string; }
interface LeaveApplication {
  id: number; application_number: string; employee_name: string; employee_code?: string;
  from_date: string; to_date: string; total_days: string;
  reason: string; status: string; academic_year: string;
  leave_type_id: number;
}
interface Holiday { id: number; holiday_date: string; name: string; holiday_type: string; is_optional: boolean; }

const CUR_YEAR = '2025-2026';

const LEAVE_TABS = ['Applications', 'My Balance', 'Holiday Calendar', 'Leave Types'] as const;
type LeaveTab = typeof LEAVE_TABS[number];

export default function LeavePage() {
  const [tab, setTab] = useState<LeaveTab>('Applications');
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [balances, setBalances] = useState<LeaveBalance[]>([]);
  const [applications, setApplications] = useState<LeaveApplication[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Modals
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [showHolidayModal, setShowHolidayModal] = useState(false);
  const [selectedApp, setSelectedApp] = useState<LeaveApplication | null>(null);
  const [showActionModal, setShowActionModal] = useState(false);
  const [actionType, setActionType] = useState<'approve' | 'reject'>('approve');
  const [rejectionReason, setRejectionReason] = useState('');
  const [saving, setSaving] = useState(false);

  const [applyForm, setApplyForm] = useState({
    leave_type_id: 0, academic_year: CUR_YEAR,
    from_date: '', to_date: '', is_half_day: false,
    half_day_session: '', reason: '',
  });
  const [holidayForm, setHolidayForm] = useState({
    holiday_date: '', name: '', name_marathi: '',
    academic_year: CUR_YEAR, holiday_type: 'national', is_optional: false,
  });

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [lt, bal, apps, hols] = await Promise.all([
        api.get('/leave/types'),
        api.get('/leave/balance', { params: { academic_year: CUR_YEAR } }),
        api.get('/leave/applications', { params: { academic_year: CUR_YEAR } }),
        api.get('/leave/holidays', { params: { academic_year: CUR_YEAR } }),
      ]);
      setLeaveTypes(lt.data?.data ?? []);
      setBalances(bal.data?.data ?? []);
      setApplications(apps.data?.data ?? []);
      setHolidays(hols.data?.data ?? []);
    } catch { toast.error('Failed to load leave data'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post('/leave/apply', applyForm);
      toast.success('Leave application submitted!');
      setShowApplyModal(false);
      setApplyForm({ leave_type_id: 0, academic_year: CUR_YEAR, from_date: '', to_date: '', is_half_day: false, half_day_session: '', reason: '' });
      fetchAll();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg ?? 'Failed to submit');
    } finally { setSaving(false); }
  };

  const handleAction = async () => {
    if (!selectedApp) return;
    setSaving(true);
    try {
      await api.post(`/leave/applications/${selectedApp.id}/action`, {
        action: actionType,
        rejection_reason: actionType === 'reject' ? rejectionReason : undefined,
      });
      toast.success(`Leave application ${actionType}d!`);
      setShowActionModal(false);
      setRejectionReason('');
      fetchAll();
    } catch { toast.error('Action failed'); }
    finally { setSaving(false); }
  };

  const handleCancel = async (id: number) => {
    if (!confirm('Cancel this leave application?')) return;
    try {
      await api.post(`/leave/applications/${id}/cancel`);
      toast.success('Leave cancelled');
      fetchAll();
    } catch { toast.error('Failed to cancel'); }
  };

  const handleAddHoliday = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post('/leave/holidays', holidayForm);
      toast.success('Holiday added!');
      setShowHolidayModal(false);
      fetchAll();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg ?? 'Failed to add holiday');
    } finally { setSaving(false); }
  };

  const filteredApps = applications.filter(a => {
    const matchSearch = !search || a.employee_name.toLowerCase().includes(search.toLowerCase()) || a.application_number.includes(search);
    const matchStatus = !statusFilter || a.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const appColumns: TableColumn<LeaveApplication>[] = [
    { key: 'application_number', header: 'Application #', render: (v) => <span className={styles.appNo}>{String(v)}</span> },
    { key: 'employee_name', header: 'Employee', sortable: true },
    { key: 'from_date', header: 'From', render: (v) => new Date(String(v)).toLocaleDateString('en-IN') },
    { key: 'to_date', header: 'To', render: (v) => new Date(String(v)).toLocaleDateString('en-IN') },
    { key: 'total_days', header: 'Days', align: 'center' },
    { key: 'reason', header: 'Reason', render: (v) => <span className={styles.reason}>{String(v).substring(0, 40)}...</span> },
    { key: 'status', header: 'Status', render: (v) => <StatusBadge status={String(v)} /> },
    {
      key: 'id',
      header: 'Actions',
      align: 'center',
      render: (_, row) => (
        <div className={styles.actions}>
          {row.status === 'pending' && (
            <>
              <button className={`${styles.btn} ${styles.success}`}
                onClick={() => { setSelectedApp(row); setActionType('approve'); setShowActionModal(true); }}>✓</button>
              <button className={`${styles.btn} ${styles.danger}`}
                onClick={() => { setSelectedApp(row); setActionType('reject'); setShowActionModal(true); }}>✗</button>
              <button className={`${styles.btn} ${styles.neutral}`}
                onClick={() => handleCancel(row.id)}>Cancel</button>
            </>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className={styles.page}>
      <PageHeader
        icon="🏖️"
        title="Leave Management"
        subtitle="Apply for leave, manage holiday calendar and approve requests"
        breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Leave' }]}
        actions={
          <div className={styles.headerActions}>
            <button className={styles.secondaryBtn} onClick={() => setShowHolidayModal(true)}>+ Holiday</button>
            <button className={styles.primaryBtn} onClick={() => setShowApplyModal(true)}>+ Apply Leave</button>
          </div>
        }
      />

      {/* Tabs */}
      <div className={styles.tabs}>
        {LEAVE_TABS.map(t => (
          <button key={t} className={`${styles.tab} ${tab === t ? styles.activeTab : ''}`}
            onClick={() => setTab(t)}>{t}</button>
        ))}
      </div>

      {/* Applications Tab */}
      {tab === 'Applications' && (
        <div className={styles.section}>
          <div className={styles.toolbar}>
            <SearchBar value={search} onChange={setSearch} placeholder="Search employee or application no..."
              filters={
                <select className={styles.select} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                  <option value="">All Status</option>
                  {['pending', 'approved', 'rejected', 'cancelled'].map(s => (
                    <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                  ))}
                </select>
              }
            />
          </div>
          <div className={styles.tableCard}>
            <DataTable columns={appColumns} data={filteredApps} loading={loading}
              keyExtractor={r => r.id} emptyMessage="No leave applications found" emptyIcon="🏖️" />
          </div>
        </div>
      )}

      {/* Balance Tab */}
      {tab === 'My Balance' && (
        <div className={styles.balanceGrid}>
          {balances.length === 0 ? (
            <EmptyState icon="📊" title="No leave balance found" description="Contact admin to initialize your leave balance" size="md" />
          ) : balances.map(b => (
            <div key={b.id} className={styles.balanceCard}>
              <div className={styles.balanceTitle}>{b.leave_type_name}</div>
              <code className={styles.balanceCode}>{b.leave_type_code}</code>
              <div className={styles.balanceStats}>
                <div className={styles.bStat}><span className={styles.bVal}>{b.entitled_days}</span><span className={styles.bLbl}>Entitled</span></div>
                <div className={styles.bStat}><span className={`${styles.bVal} ${styles.used}`}>{b.used_days}</span><span className={styles.bLbl}>Used</span></div>
                <div className={styles.bStat}><span className={`${styles.bVal} ${styles.avail}`}>{b.available_days}</span><span className={styles.bLbl}>Available</span></div>
              </div>
              <div className={styles.balanceBar}>
                <div className={styles.balanceBarFill}
                  style={{ width: `${Math.min(100, (Number(b.used_days) / Number(b.entitled_days)) * 100)}%` }} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Holiday Calendar Tab */}
      {tab === 'Holiday Calendar' && (
        <div className={styles.tableCard}>
          <DataTable
            columns={[
              { key: 'holiday_date', header: 'Date', sortable: true, render: (v) => new Date(String(v)).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' }) },
              { key: 'name', header: 'Holiday Name', sortable: true },
              { key: 'holiday_type', header: 'Type', render: (v) => <StatusBadge status={String(v)} variant="info" /> },
              { key: 'is_optional', header: 'Optional', render: (v) => v ? 'Yes' : 'No' },
            ] as TableColumn<Holiday>[]}
            data={holidays} loading={loading}
            keyExtractor={r => r.id} emptyMessage="No holidays defined" emptyIcon="📅"
          />
        </div>
      )}

      {/* Leave Types Tab */}
      {tab === 'Leave Types' && (
        <div className={styles.leaveTypesGrid}>
          {leaveTypes.map(lt => (
            <div key={lt.id} className={styles.typeCard}>
              <div className={styles.typeHeader}>
                <div className={styles.typeCode}>{lt.code}</div>
                <span className={styles.typePaid}>{lt.is_paid ? '💰 Paid' : 'Unpaid'}</span>
              </div>
              <div className={styles.typeName}>{lt.name}</div>
              <div className={styles.typeQuota}>{lt.annual_quota} days / year</div>
            </div>
          ))}
        </div>
      )}

      {/* Apply Leave Modal */}
      <Modal isOpen={showApplyModal} onClose={() => setShowApplyModal(false)}
             title="Apply for Leave" size="md"
             footer={
               <>
                 <button className={styles.cancelBtn} onClick={() => setShowApplyModal(false)}>Cancel</button>
                 <button className={styles.primaryBtn} onClick={handleApply} disabled={saving}>
                   {saving ? 'Submitting...' : 'Submit Application'}
                 </button>
               </>
             }>
        <form className={styles.form} onSubmit={handleApply}>
          <div className={styles.fg}><label className={styles.lbl}>Leave Type *</label>
            <select className={styles.inp} required value={applyForm.leave_type_id}
              onChange={e => setApplyForm(f => ({ ...f, leave_type_id: Number(e.target.value) }))}>
              <option value={0} disabled>Select leave type</option>
              {leaveTypes.map(lt => <option key={lt.id} value={lt.id}>{lt.name} ({lt.code})</option>)}
            </select></div>
          <div className={styles.formRow}>
            <div className={styles.fg}><label className={styles.lbl}>From Date *</label>
              <input type="date" className={styles.inp} required value={applyForm.from_date}
                onChange={e => setApplyForm(f => ({ ...f, from_date: e.target.value }))} /></div>
            <div className={styles.fg}><label className={styles.lbl}>To Date *</label>
              <input type="date" className={styles.inp} required value={applyForm.to_date}
                onChange={e => setApplyForm(f => ({ ...f, to_date: e.target.value }))} /></div>
          </div>
          <label className={styles.checkRow}>
            <input type="checkbox" checked={applyForm.is_half_day}
              onChange={e => setApplyForm(f => ({ ...f, is_half_day: e.target.checked }))} />
            Half Day Leave
          </label>
          {applyForm.is_half_day && (
            <div className={styles.fg}><label className={styles.lbl}>Session</label>
              <select className={styles.inp} value={applyForm.half_day_session}
                onChange={e => setApplyForm(f => ({ ...f, half_day_session: e.target.value }))}>
                <option value="">Select</option>
                <option value="morning">Morning</option>
                <option value="afternoon">Afternoon</option>
              </select></div>
          )}
          <div className={styles.fg}><label className={styles.lbl}>Reason *</label>
            <textarea className={styles.textarea} required rows={3} value={applyForm.reason}
              onChange={e => setApplyForm(f => ({ ...f, reason: e.target.value }))}
              placeholder="State your reason for leave..." /></div>
        </form>
      </Modal>

      {/* Approve/Reject Modal */}
      <Modal isOpen={showActionModal} onClose={() => setShowActionModal(false)}
             title={`${actionType === 'approve' ? 'Approve' : 'Reject'} Leave Application`}
             size="sm"
             footer={
               <>
                 <button className={styles.cancelBtn} onClick={() => setShowActionModal(false)}>Cancel</button>
                 <button
                   className={`${styles.primaryBtn} ${actionType === 'reject' ? styles.dangerBtn : ''}`}
                   onClick={handleAction} disabled={saving}>
                   {saving ? '...' : actionType === 'approve' ? '✓ Approve' : '✗ Reject'}
                 </button>
               </>
             }>
        <div>
          <p className={styles.confirmText}>
            {actionType === 'approve'
              ? `Approve leave for ${selectedApp?.employee_name}?`
              : `Reject leave for ${selectedApp?.employee_name}?`}
          </p>
          {actionType === 'reject' && (
            <div className={styles.fg}>
              <label className={styles.lbl}>Rejection Reason *</label>
              <textarea className={styles.textarea} rows={3} required value={rejectionReason}
                onChange={e => setRejectionReason(e.target.value)}
                placeholder="State the reason for rejection..." />
            </div>
          )}
        </div>
      </Modal>

      {/* Add Holiday Modal */}
      <Modal isOpen={showHolidayModal} onClose={() => setShowHolidayModal(false)}
             title="Add Holiday" size="md"
             footer={
               <>
                 <button className={styles.cancelBtn} onClick={() => setShowHolidayModal(false)}>Cancel</button>
                 <button className={styles.primaryBtn} onClick={handleAddHoliday} disabled={saving}>
                   {saving ? 'Adding...' : '+ Add Holiday'}
                 </button>
               </>
             }>
        <form className={styles.form} onSubmit={handleAddHoliday}>
          <div className={styles.fg}><label className={styles.lbl}>Date *</label>
            <input type="date" className={styles.inp} required value={holidayForm.holiday_date}
              onChange={e => setHolidayForm(f => ({ ...f, holiday_date: e.target.value }))} /></div>
          <div className={styles.fg}><label className={styles.lbl}>Holiday Name (English) *</label>
            <input className={styles.inp} required value={holidayForm.name}
              onChange={e => setHolidayForm(f => ({ ...f, name: e.target.value }))}
              placeholder="e.g. Republic Day" /></div>
          <div className={styles.fg}><label className={styles.lbl}>Holiday Name (Marathi)</label>
            <input className={styles.inp} value={holidayForm.name_marathi}
              onChange={e => setHolidayForm(f => ({ ...f, name_marathi: e.target.value }))}
              placeholder="e.g. प्रजासत्ताक दिन" /></div>
          <div className={styles.fg}><label className={styles.lbl}>Type</label>
            <select className={styles.inp} value={holidayForm.holiday_type}
              onChange={e => setHolidayForm(f => ({ ...f, holiday_type: e.target.value }))}>
              {['national', 'state', 'local', 'school', 'optional'].map(t => (
                <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
              ))}
            </select></div>
          <label className={styles.checkRow}>
            <input type="checkbox" checked={holidayForm.is_optional}
              onChange={e => setHolidayForm(f => ({ ...f, is_optional: e.target.checked }))} />
            Optional Holiday
          </label>
        </form>
      </Modal>
    </div>
  );
}
