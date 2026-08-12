import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus, Search, Filter, Download, Eye, Edit2, Trash2,
  Users, UserCheck, UserX, GraduationCap, Briefcase,
  RefreshCw, ChevronLeft, ChevronRight, ChevronDown, CalendarOff,
} from 'lucide-react';
import toast from 'react-hot-toast';
import teacherService, { Teacher, TeacherStats } from '../../services/teacherService';
import PermissionGate from '../../components/ui/PermissionGate';
import styles from './TeacherListPage.module.css';

const EMP_TYPES = ['teaching', 'non_teaching', 'contract', 'part_time', 'visiting'];
const DESIGNATIONS = [
  'Head Master', 'Assistant Teacher', 'Senior Teacher',
  'Lab Assistant', 'Clerk', 'Librarian', 'Peon', 'Computer Teacher',
];

export default function TeacherListPage() {
  const navigate = useNavigate();

  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [stats, setStats] = useState<TeacherStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterStatus, setFilterStatus] = useState('active');
  const [filterGender, setFilterGender] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [deleting, setDeleting] = useState<number | null>(null);

  const loadTeachers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await teacherService.getList({
        page, per_page: 20,
        search: search || undefined,
        employee_type: filterType || undefined,
        status: filterStatus || undefined,
        gender: filterGender || undefined,
      });
      setTeachers(res.items);
      setTotal(res.meta.total);
      setTotalPages(res.meta.total_pages);
    } catch {
      toast.error('Failed to load teachers.');
    } finally {
      setLoading(false);
    }
  }, [page, search, filterType, filterStatus, filterGender]);

  const loadStats = useCallback(async () => {
    try {
      const s = await teacherService.getStats();
      setStats(s);
    } catch {}
  }, []);

  useEffect(() => { loadTeachers(); }, [loadTeachers]);
  useEffect(() => { loadStats(); }, [loadStats]);
  useEffect(() => {
    const t = setTimeout(() => setPage(1), 400);
    return () => clearTimeout(t);
  }, [search]);

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
    setDeleting(id);
    try {
      await teacherService.delete(id);
      toast.success(`"${name}" removed.`);
      loadTeachers(); loadStats();
    } catch { toast.error('Delete failed.'); }
    finally { setDeleting(null); }
  };

  const getPhotoUrl = (path?: string) =>
    path ? `${import.meta.env.VITE_STORAGE_URL}/${path}` : null;

  const empTypeBadge = (t: string) => {
    const map: Record<string, string> = {
      teaching: styles.badgePrimary,
      non_teaching: styles.badgeInfo,
      contract: styles.badgeWarning,
      part_time: styles.badgeMuted,
      visiting: styles.badgeMuted,
    };
    return map[t] || styles.badgeMuted;
  };

  const statusBadge = (s: string) => {
    const map: Record<string, string> = {
      active: styles.badgeSuccess,
      on_leave: styles.badgeWarning,
      resigned: styles.badgeDanger,
      retired: styles.badgeMuted,
    };
    return map[s] || styles.badgeMuted;
  };

  return (
    <div className={styles.page}>
      {/* ── Stats ─────────────────────────────────────────── */}
      {stats && (
        <div className={styles.statsRow}>
          {[
            { label: 'Total Staff',    value: stats.total,           color: 'var(--color-primary)',  icon: <Users size={20}/>, sub: 'Registered members' },
            { label: 'Active',         value: stats.active,          color: 'var(--color-success)',  icon: <UserCheck size={20}/>, sub: 'Currently active' },
            { label: 'Teaching',       value: stats.teaching,        color: 'var(--color-info)',     icon: <GraduationCap size={20}/>, sub: 'Academic faculty' },
            { label: 'Non-Teaching',   value: stats.non_teaching,    color: 'var(--color-secondary)',icon: <Briefcase size={20}/>, sub: 'Support & admin' },
          ].map(s => (
            <div key={s.label} className={styles.statCard} style={{ '--card-color': s.color } as React.CSSProperties}>
              <div className={styles.statHeader}>
                <div className={styles.statIconWrap}>{s.icon}</div>
                <div className={styles.statMenuWrap}>
                  <button className={styles.statMenuBtn} aria-label="Options">
                    <ChevronDown size={16} />
                  </button>
                </div>
              </div>
              <div className={styles.statBody}>
                <div className={styles.statValue}>{s.value}</div>
                <div className={styles.statLabel}>{s.label}</div>
                <div className={styles.statSub}>{s.sub}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Toolbar ──────────────────────────────────────── */}
      <div className={styles.toolbar}>
        <div className={styles.toolbarLeft}>
          <div className={styles.searchWrap}>
            <Search size={15} className={styles.searchIcon} />
            <input
              className={styles.searchInput}
              placeholder="Search by name, employee ID, designation, mobile..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              id="teacher-search"
            />
          </div>
          <button
            className={`${styles.filterBtn} ${showFilters ? styles.filterBtnActive : ''}`}
            onClick={() => setShowFilters(v => !v)}
          >
            <Filter size={15} /> Filters
          </button>
        </div>
        <div className={styles.toolbarRight}>
          <button className={styles.iconBtn} onClick={loadTeachers} title="Refresh"><RefreshCw size={15} /></button>
          <PermissionGate permission="teacher.create">
            <button className={styles.addBtn} onClick={() => navigate('/teachers/add')} id="add-teacher-btn">
              <Plus size={16} /> Add Staff
            </button>
          </PermissionGate>
        </div>
      </div>

      {/* ── Filters ──────────────────────────────────────── */}
      {showFilters && (
        <div className={styles.filterPanel}>
          <select className={styles.select} value={filterType} onChange={e => { setFilterType(e.target.value); setPage(1); }}>
            <option value="">All Types</option>
            {EMP_TYPES.map(t => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
          </select>
          <select className={styles.select} value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setPage(1); }}>
            <option value="">All Status</option>
            {['active','on_leave','resigned','retired'].map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
          </select>
          <select className={styles.select} value={filterGender} onChange={e => { setFilterGender(e.target.value); setPage(1); }}>
            <option value="">All Genders</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
          </select>
          <button className={styles.clearBtn} onClick={() => { setFilterType(''); setFilterStatus('active'); setFilterGender(''); setPage(1); }}>Clear</button>
        </div>
      )}

      {/* ── Table ─────────────────────────────────────────── */}
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Photo</th>
              <th>Emp ID</th>
              <th>Name</th>
              <th>Designation</th>
              <th>Type</th>
              <th>Subjects</th>
              <th>Mobile</th>
              <th>Qualification</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <tr key={i} className={styles.skeletonRow}>
                  {Array.from({ length: 10 }).map((_, j) => (
                    <td key={j}><div className={styles.skeleton} /></td>
                  ))}
                </tr>
              ))
            ) : teachers.length === 0 ? (
              <tr>
                <td colSpan={10} className={styles.emptyCell}>
                  <div className={styles.emptyState}>
                    <Users size={48} />
                    <p>No staff found</p>
                    <span>Try adjusting your filters</span>
                  </div>
                </td>
              </tr>
            ) : teachers.map(t => (
              <tr key={t.id} className={styles.row}>
                <td>
                  <div className={styles.avatar}>
                    {getPhotoUrl(t.photo_path)
                      ? <img src={getPhotoUrl(t.photo_path)!} alt={t.full_name} />
                      : <span>{t.salutation ? t.salutation[0] : t.full_name.charAt(0)}</span>
                    }
                  </div>
                </td>
                <td><span className={styles.empId}>{t.employee_id}</span></td>
                <td>
                  <div className={styles.nameCell}>
                    <span className={styles.fullName}>
                      {t.salutation ? `${t.salutation} ` : ''}{t.full_name}
                    </span>
                    {t.full_name_marathi && <span className={styles.nameMr}>{t.full_name_marathi}</span>}
                  </div>
                </td>
                <td>{t.designation}</td>
                <td>
                  <span className={`${styles.badge} ${empTypeBadge(t.employee_type)}`}>
                    {t.employee_type.replace('_', ' ')}
                  </span>
                </td>
                <td className={styles.subjectsCell}>{t.subjects || '-'}</td>
                <td>{t.mobile || '-'}</td>
                <td>{t.highest_qualification || '-'}</td>
                <td>
                  <span className={`${styles.badge} ${statusBadge(t.status)}`}>{t.status.replace('_', ' ')}</span>
                </td>
                <td>
                  <div className={styles.actions}>
                    <button className={styles.actionBtn} onClick={() => navigate(`/teachers/${t.id}`)} title="View">
                      <Eye size={14} />
                    </button>
                    <PermissionGate permission="teacher.update">
                      <button className={styles.actionBtn} onClick={() => navigate(`/teachers/${t.id}/edit`)} title="Edit">
                        <Edit2 size={14} />
                      </button>
                    </PermissionGate>
                    <PermissionGate permission="teacher.delete">
                      <button
                        className={`${styles.actionBtn} ${styles.actionBtnDanger}`}
                        onClick={() => handleDelete(t.id, t.full_name)}
                        disabled={deleting === t.id}
                        title="Delete"
                      >
                        <Trash2 size={14} />
                      </button>
                    </PermissionGate>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Pagination ─────────────────────────────────────── */}
      {!loading && total > 0 && (
        <div className={styles.pagination}>
          <span className={styles.paginInfo}>
            Showing {((page - 1) * 20) + 1}–{Math.min(page * 20, total)} of {total} staff
          </span>
          <div className={styles.paginBtns}>
            <button className={styles.paginBtn} onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
              <ChevronLeft size={16} />
            </button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const pg = Math.max(1, Math.min(page - 2, totalPages - 4)) + i;
              return (
                <button key={pg} className={`${styles.paginBtn} ${pg === page ? styles.paginBtnActive : ''}`} onClick={() => setPage(pg)}>
                  {pg}
                </button>
              );
            })}
            <button className={styles.paginBtn} onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
