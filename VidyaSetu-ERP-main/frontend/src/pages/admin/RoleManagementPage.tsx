/**
 * VidyaSetu ERP — Role Management Page (Phase 7)
 * ================================================
 * View and manage system roles and their permission matrix.
 */
import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import api from '../../services/api';
import { PageHeader } from '../../components/shared/PageHeader';
import { StatusBadge } from '../../components/shared/StatusBadge';
import { Modal } from '../../components/shared/Modal';
import { EmptyState } from '../../components/shared/EmptyState';
import styles from './RoleManagementPage.module.css';

interface Role {
  id: number;
  name: string;
  code: string;
  color: string;
  is_system: boolean;
  is_active: boolean;
  description?: string;
  user_count?: number;
}

interface Permission {
  id: number;
  code: string;
  module: string;
  action: string;
  description: string;
  category: string;
}

const ACTIONS = ['read', 'create', 'update', 'delete', 'approve', 'export', 'import', 'manage'];
const MODULE_ICONS: Record<string, string> = {
  student: '🎓', teacher: '👨‍🏫', finance: '💰', library: '📚',
  exam: '📝', attendance: '📅', timetable: '🗓️', office: '🏢',
  inventory: '📦', communication: '📢', analytics: '📊',
  leave: '🏖️', lesson_plan: '📖', admin: '⚙️',
};

export default function RoleManagementPage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [rolePerms, setRolePerms] = useState<string[]>([]);
  const [showPermModal, setShowPermModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [savingPerms, setSavingPerms] = useState(false);
  const [newRole, setNewRole] = useState({ name: '', code: '', color: '#4f46e5', description: '' });

  useEffect(() => { fetchRoles(); fetchPermissions(); }, []);

  const fetchRoles = async () => {
    setLoading(true);
    try {
      const res = await api.get('/auth/roles');
      const data = res.data?.data;
      setRoles(Array.isArray(data) ? data : data?.roles ?? []);
    } catch { toast.error('Failed to load roles'); }
    finally { setLoading(false); }
  };

  const fetchPermissions = async () => {
    try {
      const res = await api.get('/auth/permissions');
      const d = res.data?.data;
      if (Array.isArray(d)) setPermissions(d);
      else if (d?.by_module) {
        const flat = Object.values(d.by_module).flat() as Permission[];
        setPermissions(flat);
      }
    } catch { /* ignore */ }
  };

  const openPermissions = async (role: Role) => {
    setSelectedRole(role);
    try {
      const res = await api.get(`/auth/roles/${role.id}/permissions`);
      const list = res.data?.data?.permissions ?? res.data?.data ?? [];
      setRolePerms(list.map((p: any) => (typeof p === 'string' ? p : p.code)));
    } catch { setRolePerms([]); }
    setShowPermModal(true);
  };

  const togglePerm = (code: string) => {
    setRolePerms(prev =>
      prev.includes(code) ? prev.filter(c => c !== code) : [...prev, code]
    );
  };

  const savePermissions = async () => {
    if (!selectedRole) return;
    setSavingPerms(true);
    try {
      await api.put(`/auth/roles/${selectedRole.id}/permissions`, { permission_codes: rolePerms });
      toast.success('Permissions saved!');
      setShowPermModal(false);
      fetchRoles();
    } catch { toast.error('Failed to save permissions'); }
    finally { setSavingPerms(false); }
  };

  const handleCreateRole = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/auth/roles', newRole);
      toast.success('Role created!');
      setShowCreateModal(false);
      setNewRole({ name: '', code: '', color: '#4f46e5', description: '' });
      fetchRoles();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg ?? 'Failed to create role');
    }
  };

  const toggleRoleActive = async (role: Role) => {
    try {
      await api.patch(`/auth/roles/${role.id}`, { is_active: !role.is_active });
      toast.success(`Role ${role.is_active ? 'disabled' : 'enabled'}`);
      fetchRoles();
    } catch { toast.error('Action failed'); }
  };

  // Group permissions by module
  const moduleGroups = permissions.reduce<Record<string, Permission[]>>((acc, p) => {
    if (!acc[p.module]) acc[p.module] = [];
    acc[p.module].push(p);
    return acc;
  }, {});

  return (
    <div className={styles.page}>
      <PageHeader
        icon="🛡️"
        title="Role Management"
        subtitle="Configure system roles and their permission matrix"
        breadcrumbs={[{ label: 'Settings', href: '/settings' }, { label: 'Roles' }]}
        actions={
          <button className={styles.createBtn} onClick={() => setShowCreateModal(true)}>
            + New Role
          </button>
        }
      />

      {/* Roles Grid */}
      {loading ? (
        <div className={styles.loadingWrapper}>
          <div className={styles.spinner} />
        </div>
      ) : roles.length === 0 ? (
        <EmptyState icon="🛡️" title="No roles found" size="lg" />
      ) : (
        <div className={styles.rolesGrid}>
          {roles.map(role => (
            <div key={role.id} className={styles.roleCard}>
              <div className={styles.roleHeader}>
                <div className={styles.roleColor} style={{ background: role.color }} />
                <div className={styles.roleInfo}>
                  <h3 className={styles.roleName}>{role.name}</h3>
                  <code className={styles.roleCode}>{role.code}</code>
                </div>
                <div className={styles.roleBadges}>
                  {role.is_system && (
                    <span className={styles.systemBadge}>System</span>
                  )}
                  <StatusBadge status={role.is_active ? 'active' : 'inactive'} size="sm" />
                </div>
              </div>

              {role.description && (
                <p className={styles.roleDesc}>{role.description}</p>
              )}

              <div className={styles.roleFooter}>
                <span className={styles.userCount}>
                  👥 {role.user_count ?? 0} users
                </span>
                <div className={styles.roleActions}>
                  <button
                    className={styles.permBtn}
                    onClick={() => openPermissions(role)}
                  >
                    🔑 Permissions
                  </button>
                  {!role.is_system && (
                    <button
                      className={`${styles.toggleBtn} ${role.is_active ? styles.deactivate : styles.activate}`}
                      onClick={() => toggleRoleActive(role)}
                    >
                      {role.is_active ? 'Disable' : 'Enable'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Role Modal */}
      <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)}
             title="Create New Role" size="md"
             footer={
               <>
                 <button className={styles.cancelBtn} onClick={() => setShowCreateModal(false)}>Cancel</button>
                 <button className={styles.saveBtn} onClick={handleCreateRole}>Create Role</button>
               </>
             }>
        <form className={styles.form} onSubmit={handleCreateRole}>
          <div className={styles.formGroup}>
            <label className={styles.label}>Role Name *</label>
            <input className={styles.input} required value={newRole.name}
              onChange={e => setNewRole(r => ({ ...r, name: e.target.value }))}
              placeholder="e.g. Sports Teacher" />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.label}>Code *</label>
            <input className={styles.input} required value={newRole.code}
              onChange={e => setNewRole(r => ({ ...r, code: e.target.value.toLowerCase().replace(/\s+/g, '_') }))}
              placeholder="e.g. sports_teacher" />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.label}>Color</label>
            <div className={styles.colorRow}>
              <input type="color" value={newRole.color}
                onChange={e => setNewRole(r => ({ ...r, color: e.target.value }))} />
              <span className={styles.colorPreview}
                    style={{ background: newRole.color + '22', color: newRole.color, padding: '4px 12px', borderRadius: 6, fontWeight: 600 }}>
                {newRole.name || 'Preview'}
              </span>
            </div>
          </div>
          <div className={styles.formGroup}>
            <label className={styles.label}>Description</label>
            <textarea className={styles.textarea} rows={2} value={newRole.description}
              onChange={e => setNewRole(r => ({ ...r, description: e.target.value }))}
              placeholder="Brief description of this role's responsibilities" />
          </div>
        </form>
      </Modal>

      {/* Permissions Matrix Modal */}
      <Modal isOpen={showPermModal} onClose={() => setShowPermModal(false)}
             title={`Permissions — ${selectedRole?.name}`}
             subtitle="Toggle permissions for this role. Changes take effect immediately."
             size="xl"
             footer={
               <>
                 <button className={styles.cancelBtn} onClick={() => setShowPermModal(false)}>Cancel</button>
                 <button className={styles.saveBtn} onClick={savePermissions} disabled={savingPerms}>
                   {savingPerms ? 'Saving...' : '💾 Save Permissions'}
                 </button>
               </>
             }>
        <div className={styles.permMatrix}>
          {Object.entries(moduleGroups).map(([module, perms]) => (
            <div key={module} className={styles.permModule}>
              <div className={styles.permModuleHeader}>
                <span className={styles.permModuleIcon}>{MODULE_ICONS[module] ?? '📋'}</span>
                <span className={styles.permModuleName}>{module.replace(/_/g, ' ').toUpperCase()}</span>
              </div>
              <div className={styles.permActions}>
                {ACTIONS.map(action => {
                  const perm = perms.find(p => p.action === action);
                  if (!perm) return null;
                  const checked = rolePerms.includes(perm.code);
                  return (
                    <label key={action} className={`${styles.permChip} ${checked ? styles.permChecked : ''}`}>
                      <input type="checkbox" checked={checked}
                        onChange={() => togglePerm(perm.code)} />
                      {action}
                    </label>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </Modal>
    </div>
  );
}
