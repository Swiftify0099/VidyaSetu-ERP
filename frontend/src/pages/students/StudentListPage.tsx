import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Plus, Search, Filter, Download, Eye, Edit2, Trash2,
  GraduationCap, RefreshCw, ChevronLeft, ChevronRight, ChevronDown,
  UserCheck, UserX, Users, FileText, MoreVertical,
} from 'lucide-react';
import toast from 'react-hot-toast';
import studentService, { Student, StudentStats } from '../../services/studentService';
import { ExportButton } from '../../components/shared';
import { downloadStudentsExcel } from '../../services/exports';
import PermissionGate from '../../components/ui/PermissionGate';
import styles from './StudentListPage.module.css';

const STANDARDS = ['1','2','3','4','5','6','7','8','9','10','11','12'];
const CATEGORIES = ['SC','ST','OBC','NT','SBC','Open'];
const GENDERS = ['male','female','other'];
const STATUS_OPTS = ['active','left','transferred','passed_out'];

export default function StudentListPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [students, setStudents] = useState<Student[]>([]);
  const [stats, setStats] = useState<StudentStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // Filters
  const [search, setSearch] = useState('');
  const [filterStd, setFilterStd] = useState('');
  const [filterDiv, setFilterDiv] = useState('');
  const [filterStatus, setFilterStatus] = useState('active');
  const [filterGender, setFilterGender] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const [deleting, setDeleting] = useState<number | null>(null);

  const loadStudents = useCallback(async () => {
    setLoading(true);
    try {
      const res = await studentService.getList({
        page, per_page: 20,
        search: search || undefined,
        standard: filterStd || undefined,
        division: filterDiv || undefined,
        status: filterStatus || undefined,
        gender: filterGender || undefined,
        category: filterCategory || undefined,
      });
      setStudents(res.items);
      setTotal(res.meta.total);
      setTotalPages(res.meta.total_pages);
    } catch {
      toast.error('Failed to load students.');
    } finally {
      setLoading(false);
    }
  }, [page, search, filterStd, filterDiv, filterStatus, filterGender, filterCategory]);

  const loadStats = useCallback(async () => {
    try {
      const data = await studentService.getStats();
      setStats(data);
    } catch {
      // Silently catch stats failure
    }
  }, []);

  useEffect(() => { loadStudents(); }, [loadStudents]);
  useEffect(() => { loadStats(); }, [loadStats]);
  useEffect(() => { setPage(1); }, [search, filterStd, filterDiv, filterStatus]);

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`Delete student "${name}"? This action cannot be undone.`)) return;
    setDeleting(id);
    try {
      await studentService.delete(id);
      toast.success(`Student "${name}" deleted.`);
      loadStudents();
      loadStats();
    } catch {
      toast.error('Failed to delete student.');
    } finally {
      setDeleting(null);
    }
  };

  const getPhotoUrl = (path?: string) =>
    path ? `${import.meta.env.VITE_STORAGE_URL}/${path}` : null;

  const statusBadge = (s: string) => {
    const map: Record<string, string> = {
      active: styles.badgeSuccess,
      left: styles.badgeDanger,
      transferred: styles.badgeWarning,
      passed_out: styles.badgeInfo,
    };
    return map[s] || styles.badgeMuted;
  };

  return (
    <div className={styles.page}>
      {/* ── Stats Row ─────────────────────────────────────── */}
      {stats && (
        <div className={styles.statsRow}>
          {[
            { label: 'Total Students', value: stats.total, icon: <Users size={20}/>, color: 'var(--color-primary)', sub: 'Registered students' },
            { label: 'Active', value: stats.active, icon: <UserCheck size={20}/>, color: 'var(--color-success)', sub: 'Currently enrolled' },
            { label: 'Boys', value: stats.boys, icon: <GraduationCap size={20}/>, color: 'var(--color-info)', sub: 'Male students' },
            { label: 'Girls', value: stats.girls, icon: <GraduationCap size={20}/>, color: 'var(--color-secondary)', sub: 'Female students' },
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

      {/* ── Toolbar ───────────────────────────────────────── */}
      <div className={styles.toolbar}>
        <div className={styles.toolbarLeft}>
          <div className={styles.searchWrap}>
            <Search size={15} className={styles.searchIcon} />
            <input
              className={styles.searchInput}
              placeholder="Search by name, GR, mobile, father..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              id="student-search"
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
          <button className={styles.iconBtn} onClick={loadStudents} title="Refresh">
            <RefreshCw size={15} />
          </button>
          <PermissionGate permission="student.export">
            <ExportButton
              format="excel"
              label="Export Excel"
              size="sm"
              onExport={() => downloadStudentsExcel({
                standard: filterStd || undefined,
                division: filterDiv || undefined,
              })}
            />
          </PermissionGate>
          <PermissionGate permission="student.create">
            <button
              className={styles.addBtn}
              onClick={() => navigate('/students/add')}
              id="add-student-btn"
            >
              <Plus size={16} /> Add Student
            </button>
          </PermissionGate>
        </div>
      </div>

      {/* ── Filter Panel ──────────────────────────────────── */}
      {showFilters && (
        <div className={styles.filterPanel}>
          <select className={styles.select} value={filterStd} onChange={e => { setFilterStd(e.target.value); setPage(1); }}>
            <option value="">All Standards</option>
            {STANDARDS.map(s => <option key={s} value={s}>Std {s}</option>)}
          </select>
          <input
            className={styles.selectInput}
            placeholder="Division (A/B/C...)"
            value={filterDiv}
            onChange={e => { setFilterDiv(e.target.value.toUpperCase()); setPage(1); }}
            maxLength={2}
          />
          <select className={styles.select} value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setPage(1); }}>
            <option value="">All Status</option>
            {STATUS_OPTS.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
          </select>
          <select className={styles.select} value={filterGender} onChange={e => { setFilterGender(e.target.value); setPage(1); }}>
            <option value="">All Genders</option>
            {GENDERS.map(g => <option key={g} value={g}>{g.charAt(0).toUpperCase() + g.slice(1)}</option>)}
          </select>
          <select className={styles.select} value={filterCategory} onChange={e => { setFilterCategory(e.target.value); setPage(1); }}>
            <option value="">All Categories</option>
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <button className={styles.clearBtn} onClick={() => {
            setFilterStd(''); setFilterDiv(''); setFilterStatus('active');
            setFilterGender(''); setFilterCategory(''); setPage(1);
          }}>Clear</button>
        </div>
      )}

      {/* ── Table ─────────────────────────────────────────── */}
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Photo</th>
              <th>GR No.</th>
              <th>Student Name</th>
              <th>Std / Div</th>
              <th>Roll</th>
              <th>Father's Name</th>
              <th>Mobile</th>
              <th>Category</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <tr key={i} className={styles.skeletonRow}>
                  {Array.from({ length: 10 }).map((_, j) => (
                    <td key={j}><div className={styles.skeleton} /></td>
                  ))}
                </tr>
              ))
            ) : students.length === 0 ? (
              <tr>
                <td colSpan={10} className={styles.emptyCell}>
                  <div className={styles.emptyState}>
                    <GraduationCap size={48} />
                    <p>No students found</p>
                    <span>Try adjusting your search or filters</span>
                  </div>
                </td>
              </tr>
            ) : (
              students.map(student => (
                <tr key={student.id} className={styles.row}>
                  <td>
                    <div className={styles.avatar}>
                      {getPhotoUrl(student.photo_path)
                        ? <img src={getPhotoUrl(student.photo_path)!} alt={student.full_name} />
                        : <span>{student.full_name.charAt(0)}</span>
                      }
                    </div>
                  </td>
                  <td><span className={styles.grNumber}>{student.gr_number}</span></td>
                  <td>
                    <div className={styles.nameCell}>
                      <span className={styles.fullName}>{student.full_name}</span>
                      {student.full_name_marathi && (
                        <span className={styles.nameMarathi}>{student.full_name_marathi}</span>
                      )}
                    </div>
                  </td>
                  <td>
                    <span className={styles.stdBadge}>
                      {student.standard}{student.division ? `-${student.division}` : ''}
                    </span>
                  </td>
                  <td>{student.roll_number || '-'}</td>
                  <td>{student.father_name || '-'}</td>
                  <td>{student.mobile || student.father_mobile || '-'}</td>
                  <td>{student.category || '-'}</td>
                  <td>
                    <span className={`${styles.badge} ${statusBadge(student.status)}`}>
                      {student.status}
                    </span>
                  </td>
                  <td>
                    <div className={styles.actions}>
                      <button
                        className={styles.actionBtn}
                        onClick={() => navigate(`/students/${student.id}`)}
                        title="View Profile"
                      >
                        <Eye size={14} />
                      </button>
                      <PermissionGate permission="student.update">
                        <button
                          className={styles.actionBtn}
                          onClick={() => navigate(`/students/${student.id}/edit`)}
                          title="Edit"
                        >
                          <Edit2 size={14} />
                        </button>
                      </PermissionGate>
                      <PermissionGate permission="student.delete">
                        <button
                          className={`${styles.actionBtn} ${styles.actionBtnDanger}`}
                          onClick={() => handleDelete(student.id, student.full_name)}
                          title="Delete"
                          disabled={deleting === student.id}
                        >
                          <Trash2 size={14} />
                        </button>
                      </PermissionGate>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ── Pagination ────────────────────────────────────── */}
      {!loading && total > 0 && (
        <div className={styles.pagination}>
          <span className={styles.paginInfo}>
            Showing {((page - 1) * 20) + 1}–{Math.min(page * 20, total)} of {total} students
          </span>
          <div className={styles.paginBtns}>
            <button
              className={styles.paginBtn}
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              <ChevronLeft size={16} />
            </button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const pg = Math.max(1, Math.min(page - 2, totalPages - 4)) + i;
              return (
                <button
                  key={pg}
                  className={`${styles.paginBtn} ${pg === page ? styles.paginBtnActive : ''}`}
                  onClick={() => setPage(pg)}
                >
                  {pg}
                </button>
              );
            })}
            <button
              className={styles.paginBtn}
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
