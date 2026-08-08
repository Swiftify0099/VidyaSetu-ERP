/**
 * VidyaSetu ERP — Permission Matrix Management
 * ==============================================
 * Route: /admin/permissions
 * Fine-grained RBAC permission matrix — role × permission grid
 * Role: super_admin only
 */
import { useState, useEffect, useCallback } from 'react';
import {
  Shield, RefreshCw, Save, Search, CheckSquare,
  Square, Minus, AlertCircle, Users, Lock,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import styles from './PermissionsPage.module.css';

interface Role {
  id: number;
  name: string;
  code: string;
  description?: string;
  is_system: boolean;
}

interface Permission {
  id: number;
  code: string;
  name: string;
  module: string;
  description?: string;
}

interface RolePermissionMap {
  [roleCode: string]: Set<string>;
}

// Group permissions by module
function groupByModule(perms: Permission[]): Record<string, Permission[]> {
  return perms.reduce((acc, p) => {
    const m = p.module || 'general';
    if (!acc[m]) acc[m] = [];
    acc[m].push(p);
    return acc;
  }, {} as Record<string, Permission[]>);
}

export default function PermissionsPage() {
  const [roles, setRoles]           = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [matrix, setMatrix]         = useState<RolePermissionMap>({});
  const [loading, setLoading]       = useState(true);
  const [saving, setSaving]         = useState<string | null>(null);
  const [search, setSearch]         = useState('');
  const [moduleFilter, setModuleFilter] = useState('');
  const [pendingChanges, setPendingChanges] = useState<Map<string, Set<string>>>(new Map());

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [rolesRes, permsRes] = await Promise.all([
        api.get('/admin/roles'),
        api.get('/admin/permissions'),
      ]);

      const loadedRoles: Role[] = Array.isArray(rolesRes.data?.data?.roles)
        ? rolesRes.data.data.roles
        : Array.isArray(rolesRes.data?.data)
        ? rolesRes.data.data
        : [];

      const rawPermsData = permsRes.data?.data;
      let loadedPerms: Permission[] = [];
      if (Array.isArray(rawPermsData?.permissions)) {
        loadedPerms = rawPermsData.permissions;
      } else if (Array.isArray(rawPermsData)) {
        loadedPerms = rawPermsData;
      } else if (rawPermsData?.by_module && typeof rawPermsData.by_module === 'object') {
        loadedPerms = Object.values(rawPermsData.by_module).flat() as Permission[];
      }

      setRoles(loadedRoles);
      setPermissions(loadedPerms);

      // Build matrix — fetch each role's permissions
      const mat: RolePermissionMap = {};
      await Promise.all(
        loadedRoles.map(async (role) => {
          try {
            const res = await api.get(`/admin/roles/${role.id}/permissions`);
            const codes: string[] = (res.data?.data?.permissions || []).map((p: any) => p.code || p);
            mat[role.code] = new Set(codes);
          } catch {
            mat[role.code] = new Set();
          }
        })
      );
      setMatrix(mat);
    } catch (err: any) {
      toast.error('Failed to load permissions matrix');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const isGranted = (roleCode: string, permCode: string): boolean => {
    const pending = pendingChanges.get(roleCode);
    if (pending) return pending.has(permCode);
    return matrix[roleCode]?.has(permCode) ?? false;
  };

  const toggle = (roleCode: string, permCode: string) => {
    // Super admin is immutable
    if (roleCode === 'super_admin') {
      toast('Super Admin always has all permissions.', { icon: '🔒' });
      return;
    }

    setPendingChanges(prev => {
      const next = new Map(prev);
      const current = next.get(roleCode) ?? new Set(matrix[roleCode] ?? new Set());
      const updated = new Set(current);
      if (updated.has(permCode)) updated.delete(permCode);
      else updated.add(permCode);
      next.set(roleCode, updated);
      return next;
    });
  };

  const saveRole = async (roleCode: string) => {
    const role = roles.find(r => r.code === roleCode);
    if (!role) return;
    setSaving(roleCode);
    try {
      const permCodes = Array.from(pendingChanges.get(roleCode) ?? matrix[roleCode] ?? new Set());
      await api.put(`/admin/roles/${role.id}/permissions`, { permission_codes: permCodes });
      setMatrix(prev => ({ ...prev, [roleCode]: new Set(permCodes) }));
      setPendingChanges(prev => { const n = new Map(prev); n.delete(roleCode); return n; });
      toast.success(`Permissions saved for ${role.name}`);
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Save failed');
    } finally { setSaving(null); }
  };

  const safePerms = Array.isArray(permissions) ? permissions : [];

  const bulkGrantModule = (roleCode: string, module: string) => {
    if (roleCode === 'super_admin') return;
    const modPerms = safePerms.filter(p => p.module === module).map(p => p.code);
    setPendingChanges(prev => {
      const next = new Map(prev);
      const current = new Set(next.get(roleCode) ?? matrix[roleCode] ?? new Set());
      modPerms.forEach(c => current.add(c));
      next.set(roleCode, current);
      return next;
    });
  };

  const bulkRevokeModule = (roleCode: string, module: string) => {
    if (roleCode === 'super_admin') return;
    const modPerms = safePerms.filter(p => p.module === module).map(p => p.code);
    setPendingChanges(prev => {
      const next = new Map(prev);
      const current = new Set(next.get(roleCode) ?? matrix[roleCode] ?? new Set());
      modPerms.forEach(c => current.delete(c));
      next.set(roleCode, current);
      return next;
    });
  };

  const modules = [...new Set(safePerms.map(p => p.module))].sort();

  const filteredPerms = safePerms.filter(p => {
    const matchSearch = !search || p.code.toLowerCase().includes(search.toLowerCase()) || p.name.toLowerCase().includes(search.toLowerCase());
    const matchModule = !moduleFilter || p.module === moduleFilter;
    return matchSearch && matchModule;
  });

  const grouped = groupByModule(filteredPerms);
  const displayModules = Object.keys(grouped).sort();

  const hasPending = (roleCode: string) => pendingChanges.has(roleCode);

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Permission Matrix</h1>
          <p className={styles.pageSub}>Fine-grained RBAC control — manage which roles can perform which actions</p>
        </div>
        <button className={styles.iconBtn} onClick={load} disabled={loading}>
          <RefreshCw size={16} className={loading ? styles.spinning : ''} />
        </button>
      </div>

      {/* Info Banner */}
      <div className={styles.infoBanner}>
        <Shield size={16} />
        <span>Super Admin has all permissions and cannot be modified. System roles cannot be deleted. Changes take effect immediately after saving each role.</span>
      </div>

      {/* Filters */}
      <div className={styles.filterBar}>
        <div className={styles.searchWrap}>
          <Search size={15} className={styles.searchIcon} />
          <input
            className={styles.searchInput}
            placeholder="Search permissions..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select className={styles.sel} value={moduleFilter} onChange={e => setModuleFilter(e.target.value)}>
          <option value="">All Modules</option>
          {modules.map(m => <option key={m} value={m}>{m.charAt(0).toUpperCase() + m.slice(1)}</option>)}
        </select>
        <div className={styles.legend}>
          <span className={styles.legendItem}><CheckSquare size={14} style={{ color: 'var(--color-success)' }} /> Granted</span>
          <span className={styles.legendItem}><Square size={14} style={{ color: 'var(--color-text-muted)' }} /> Not Granted</span>
          <span className={styles.legendItem}><Lock size={14} style={{ color: 'var(--color-primary)' }} /> System Lock</span>
        </div>
      </div>

      {loading ? (
        <div className={styles.loadingWrap}>
          <RefreshCw size={32} className={styles.spinning} style={{ color: 'var(--color-primary)' }} />
          <p style={{ color: 'var(--color-text-muted)', marginTop: 'var(--space-3)' }}>Loading permission matrix...</p>
        </div>
      ) : (
        <div className={styles.matrixWrap}>
          {displayModules.map(mod => (
            <div key={mod} className={styles.moduleBlock}>
              {/* Module Header */}
              <div className={styles.moduleHeader}>
                <span className={styles.moduleTitle}>{mod.charAt(0).toUpperCase() + mod.slice(1)}</span>
                <span className={styles.moduleCount}>{grouped[mod].length} permissions</span>
              </div>

              {/* Permission → Role Grid */}
              <div className={styles.matrixTable}>
                {/* Column Headers (Roles) */}
                <div className={styles.matrixHeaderRow}>
                  <div className={styles.permCell}>Permission</div>
                  {roles.map(role => (
                    <div key={role.code} className={styles.roleHeader}>
                      <div className={styles.roleName}>{role.name}</div>
                      <div className={styles.roleActions}>
                        {role.code !== 'super_admin' && (
                          <>
                            <button className={styles.bulkBtn} onClick={() => bulkGrantModule(role.code, mod)} title="Grant all">All</button>
                            <button className={styles.bulkBtnDanger} onClick={() => bulkRevokeModule(role.code, mod)} title="Revoke all">None</button>
                          </>
                        )}
                        {role.code === 'super_admin' && <Lock size={12} style={{ color: 'var(--color-primary)' }} />}
                      </div>
                      {hasPending(role.code) && (
                        <button className={styles.saveRoleBtn} onClick={() => saveRole(role.code)} disabled={!!saving}>
                          {saving === role.code ? <RefreshCw size={11} className={styles.spinning} /> : <Save size={11} />}
                          Save
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                {/* Permission Rows */}
                {grouped[mod].map(perm => (
                  <div key={perm.code} className={styles.matrixRow}>
                    <div className={styles.permCell}>
                      <span className={styles.permCode}>{perm.code}</span>
                      {perm.description && <span className={styles.permDesc}>{perm.description}</span>}
                    </div>
                    {roles.map(role => {
                      const granted = role.code === 'super_admin' ? true : isGranted(role.code, perm.code);
                      const isPending = pendingChanges.has(role.code) && (pendingChanges.get(role.code)?.has(perm.code) !== matrix[role.code]?.has(perm.code));
                      return (
                        <div key={role.code} className={styles.checkCell}>
                          <button
                            className={`${styles.checkBtn} ${granted ? styles.checkGranted : ''} ${isPending ? styles.checkPending : ''}`}
                            onClick={() => toggle(role.code, perm.code)}
                            title={`${granted ? 'Revoke' : 'Grant'} ${perm.code} from ${role.name}`}
                          >
                            {granted ? <CheckSquare size={17} /> : <Square size={17} />}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          ))}

          {displayModules.length === 0 && (
            <div className={styles.emptyState}>
              <AlertCircle size={40} />
              <p>No permissions match your search</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
