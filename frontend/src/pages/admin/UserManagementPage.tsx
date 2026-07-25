/**
 * VidyaSetu ERP — User Management Page (Phase 7)
 * ================================================
 * List, create, edit, deactivate system users.
 * Super Admin only.
 */
import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-hot-toast';
import api from '../../services/api';
import { PageHeader } from '../../components/shared/PageHeader';
import { SearchBar } from '../../components/shared/SearchBar';
import { DataTable } from '../../components/shared/DataTable';
import { StatusBadge } from '../../components/shared/StatusBadge';
import { Modal } from '../../components/shared/Modal';
import { Pagination } from '../../components/shared/Pagination';
import type { TableColumn } from '../../types';
import styles from './UserManagementPage.module.css';

interface User {
  id: number;
  username: string;
  full_name: string;
  mobile?: string;
  employee_id?: string;
  is_active: boolean;
  is_locked: boolean;
  login_count: number;
  last_login?: string;
  roles: Array<{ id: number; name: string; code: string; color: string }>;
  created_at: string;
}

interface CreateUserForm {
  username: string;
  full_name: string;
  mobile: string;
  employee_id: string;
  password: string;
  role_ids: number[];
  preferred_language: string;
}

const INITIAL_FORM: CreateUserForm = {
  username: '',
  full_name: '',
  mobile: '',
  employee_id: '',
  password: '',
  role_ids: [],
  preferred_language: 'mr',
};

export default function UserManagementPage() {
  const { t } = useTranslation();

  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const PAGE_SIZE = 20;

  const [roles, setRoles] = useState<Array<{ id: number; name: string; code: string; color: string }>>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [form, setForm] = useState<CreateUserForm>(INITIAL_FORM);
  const [saving, setSaving] = useState(false);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string | number> = { page, page_size: PAGE_SIZE };
      if (search) params.search = search;
      if (statusFilter) params.is_active = statusFilter === 'active' ? 'true' : 'false';
      const res = await api.get('/auth/users', { params });
      const data = res.data?.data;
      setUsers(data?.items ?? data ?? []);
      setTotalPages(data?.total_pages ?? 1);
      setTotal(data?.total ?? (data?.length ?? 0));
    } catch {
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter]);

  const fetchRoles = async () => {
    try {
      const res = await api.get('/auth/roles');
      setRoles(res.data?.data ?? []);
    } catch { /* ignore */ }
  };

  useEffect(() => { fetchUsers(); }, [fetchUsers]);
  useEffect(() => { fetchRoles(); }, []);
  useEffect(() => { setPage(1); }, [search, statusFilter]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post('/auth/users', form);
      toast.success('User created successfully!');
      setShowCreateModal(false);
      setForm(INITIAL_FORM);
      fetchUsers();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg ?? 'Failed to create user');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (user: User) => {
    try {
      await api.patch(`/auth/users/${user.id}`, { is_active: !user.is_active });
      toast.success(`User ${user.is_active ? 'deactivated' : 'activated'}`);
      fetchUsers();
    } catch {
      toast.error('Action failed');
    }
  };

  const handleResetPassword = async (userId: number) => {
    if (!confirm('Reset this user\'s password to default?')) return;
    try {
      await api.post(`/auth/users/${userId}/reset-password`);
      toast.success('Password reset successfully');
    } catch {
      toast.error('Reset failed');
    }
  };

  const columns: TableColumn<User>[] = [
    {
      key: 'full_name',
      header: 'Full Name',
      sortable: true,
      render: (_, row) => (
        <div className={styles.nameCell}>
          <div className={styles.avatar}>
            {row.full_name.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className={styles.name}>{row.full_name}</div>
            <div className={styles.username}>@{row.username}</div>
          </div>
        </div>
      ),
    },
    {
      key: 'roles',
      header: 'Roles',
      render: (_, row) => (
        <div className={styles.roleBadges}>
          {(row.roles ?? []).slice(0, 2).map(r => (
            <span key={r.id} className={styles.roleBadge}
                  style={{ background: r.color + '22', color: r.color }}>
              {r.name}
            </span>
          ))}
          {(row.roles ?? []).length > 2 && (
            <span className={styles.moreRoles}>+{row.roles.length - 2}</span>
          )}
        </div>
      ),
    },
    { key: 'mobile', header: 'Mobile' },
    { key: 'employee_id', header: 'Emp ID' },
    {
      key: 'is_active',
      header: 'Status',
      render: (_, row) => (
        <div className={styles.statusGroup}>
          <StatusBadge status={row.is_active ? 'active' : 'inactive'} />
          {row.is_locked && <StatusBadge status="blocked" size="sm" />}
        </div>
      ),
    },
    {
      key: 'last_login',
      header: 'Last Login',
      render: (v) => v ? new Date(String(v)).toLocaleDateString('en-IN') : '—',
    },
    {
      key: 'id',
      header: 'Actions',
      align: 'center',
      render: (_, row) => (
        <div className={styles.actions}>
          <button
            className={`${styles.actionBtn} ${row.is_active ? styles.danger : styles.success}`}
            onClick={() => handleToggleActive(row)}
            title={row.is_active ? 'Deactivate' : 'Activate'}
          >
            {row.is_active ? '⊗' : '✓'}
          </button>
          <button
            className={`${styles.actionBtn} ${styles.warning}`}
            onClick={() => handleResetPassword(row.id)}
            title="Reset Password"
          >
            🔑
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className={styles.page}>
      <PageHeader
        icon="👥"
        title="User Management"
        subtitle="Manage all system users, roles and access control"
        breadcrumbs={[{ label: 'Settings', href: '/settings' }, { label: 'Users' }]}
        actions={
          <button className={styles.createBtn} onClick={() => setShowCreateModal(true)}>
            + Add User
          </button>
        }
      />

      {/* Stats Row */}
      <div className={styles.statsRow}>
        <div className={styles.statCard}>
          <span className={styles.statValue}>{total}</span>
          <span className={styles.statLabel}>Total Users</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statValue}>{users.filter(u => u.is_active).length}</span>
          <span className={styles.statLabel}>Active</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statValue}>{users.filter(u => !u.is_active).length}</span>
          <span className={styles.statLabel}>Inactive</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statValue}>{users.filter(u => u.is_locked).length}</span>
          <span className={styles.statLabel}>Locked</span>
        </div>
      </div>

      {/* Toolbar */}
      <div className={styles.toolbar}>
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder="Search by name, username, mobile, employee ID..."
          filters={
            <select
              className={styles.filterSelect}
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
            >
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          }
        />
      </div>

      {/* Table */}
      <div className={styles.tableCard}>
        <DataTable
          columns={columns}
          data={users}
          loading={loading}
          emptyMessage="No users found. Create your first user."
          emptyIcon="👤"
          keyExtractor={(row) => row.id}
        />
        <Pagination
          page={page}
          totalPages={totalPages}
          total={total}
          pageSize={PAGE_SIZE}
          onPageChange={setPage}
        />
      </div>

      {/* Create User Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => { setShowCreateModal(false); setForm(INITIAL_FORM); }}
        title="Create New User"
        subtitle="Fill in user details and assign roles"
        size="lg"
        footer={
          <>
            <button className={styles.cancelBtn}
              onClick={() => { setShowCreateModal(false); setForm(INITIAL_FORM); }}>
              Cancel
            </button>
            <button className={styles.saveBtn} onClick={handleCreate} disabled={saving}>
              {saving ? 'Creating...' : 'Create User'}
            </button>
          </>
        }
      >
        <form className={styles.form} onSubmit={handleCreate}>
          <div className={styles.formGrid}>
            <div className={styles.formGroup}>
              <label className={styles.label}>Full Name *</label>
              <input className={styles.input} required value={form.full_name}
                onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))}
                placeholder="e.g. Ramesh Jadhav" />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}>Username *</label>
              <input className={styles.input} required value={form.username}
                onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
                placeholder="e.g. ramesh.jadhav" />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}>Mobile</label>
              <input className={styles.input} value={form.mobile}
                onChange={e => setForm(f => ({ ...f, mobile: e.target.value }))}
                placeholder="10-digit mobile" maxLength={10} />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}>Employee ID</label>
              <input className={styles.input} value={form.employee_id}
                onChange={e => setForm(f => ({ ...f, employee_id: e.target.value }))}
                placeholder="e.g. EMP001" />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}>Password *</label>
              <input className={styles.input} type="password" required value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                placeholder="Min 8 characters" minLength={8} />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}>Language</label>
              <select className={styles.input} value={form.preferred_language}
                onChange={e => setForm(f => ({ ...f, preferred_language: e.target.value }))}>
                <option value="mr">मराठी (Marathi)</option>
                <option value="en">English</option>
              </select>
            </div>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Assign Roles *</label>
            <div className={styles.roleCheckboxes}>
              {roles.map(r => (
                <label key={r.id} className={styles.roleCheckbox}>
                  <input
                    type="checkbox"
                    checked={form.role_ids.includes(r.id)}
                    onChange={e => {
                      setForm(f => ({
                        ...f,
                        role_ids: e.target.checked
                          ? [...f.role_ids, r.id]
                          : f.role_ids.filter(id => id !== r.id),
                      }));
                    }}
                  />
                  <span className={styles.roleChip}
                        style={{ background: r.color + '22', color: r.color }}>
                    {r.name}
                  </span>
                </label>
              ))}
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
}
