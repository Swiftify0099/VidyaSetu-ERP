import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  BookOpen, Users, Layers, Plus, Search, Filter, RefreshCw,
  Edit2, Trash2, CheckCircle, AlertTriangle, ShieldCheck,
  Grid, List, BarChart2, Download, Printer, X, Check, Sparkles, UserCheck, Star
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import api from '../../services/api';
import timetableService, { TeacherAssignment, Subject } from '../../services/timetableService';
import styles from './SubjectAssignmentsPage.module.css';

interface TeacherItem {
  id: number;
  full_name: string;
  designation?: string;
  employee_id?: string;
}

const STANDARDS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'];
const DIVISIONS = ['', 'A', 'B', 'C', 'D'];
const CURRENT_AY = 1;

export default function SubjectAssignmentsPage() {
  // Data state
  const [assignments, setAssignments] = useState<TeacherAssignment[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [teachers, setTeachers] = useState<TeacherItem[]>([]);
  const [loading, setLoading] = useState(true);

  // View state
  const [viewMode, setViewMode] = useState<'list' | 'matrix' | 'workload'>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStd, setSelectedStd] = useState<string>('all');
  const [selectedDiv, setSelectedDiv] = useState<string>('all');
  const [selectedSubject, setSelectedSubject] = useState<string>('all');
  const [selectedTeacher, setSelectedTeacher] = useState<string>('all');
  const [onlyClassTeachers, setOnlyClassTeachers] = useState(false);

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<TeacherAssignment | null>(null);
  const [formData, setFormData] = useState({
    teacher_id: '',
    subject_id: '',
    standard: '5',
    division: 'A',
    periods_per_week: 5,
    is_class_teacher: false,
  });
  const [submitting, setSubmitting] = useState(false);

  // Bulk Modal State
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkStd, setBulkStd] = useState('5');
  const [bulkDiv, setBulkDiv] = useState('A');
  const [bulkRows, setBulkRows] = useState<Array<{ subject_id: number; teacher_id: string; periods_per_week: number; is_class_teacher: boolean }>>([]);
  const [submittingBulk, setSubmittingBulk] = useState(false);

  // Initial Data Load
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [asgData, subData, tRes] = await Promise.all([
        timetableService.getAssignments(CURRENT_AY),
        timetableService.getSubjects(),
        api.get('/teachers', { params: { per_page: 500 } }).catch(() => ({ data: { data: [] } })),
      ]);

      setAssignments(asgData || []);
      setSubjects(subData || []);

      const rawTeachers = tRes.data?.data;
      const tList = Array.isArray(rawTeachers) ? rawTeachers : (rawTeachers?.items || []);
      setTeachers(tList);
    } catch (err) {
      console.error('Failed to load subject assignments data:', err);
      toast.error('Failed to load allocations data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Executive KPI Calculations
  const kpiStats = useMemo(() => {
    const total = assignments.length;
    const classTeachersCount = assignments.filter(a => a.is_class_teacher).length;

    // Unique standard-division pairs configured
    const activeClasses = new Set(assignments.map(a => `${a.standard}-${a.division || 'All'}`));

    // Total periods allocated
    const totalPeriods = assignments.reduce((acc, curr) => acc + (curr.periods_per_week || 0), 0);
    const uniqueTeachersCount = new Set(assignments.map(a => a.teacher_id)).size;
    const avgWorkload = uniqueTeachersCount > 0 ? (totalPeriods / uniqueTeachersCount).toFixed(1) : '0';

    return {
      totalAllocations: total,
      activeClassesCount: activeClasses.size,
      classTeachersCount,
      avgWorkload,
      totalSubjects: subjects.length,
    };
  }, [assignments, subjects]);

  // Filtered Directory List
  const filteredAssignments = useMemo(() => {
    return assignments.filter(a => {
      // Search
      const query = searchQuery.toLowerCase().trim();
      const teacherName = a.teacher?.full_name?.toLowerCase() || '';
      const subjectName = a.subject?.name?.toLowerCase() || '';
      const stdStr = `std ${a.standard}`.toLowerCase();
      const matchesSearch = !query || teacherName.includes(query) || subjectName.includes(query) || stdStr.includes(query);

      // Filters
      const matchesStd = selectedStd === 'all' || a.standard === selectedStd;
      const matchesDiv = selectedDiv === 'all' || (a.division || 'All') === selectedDiv || (!a.division && selectedDiv === 'All');
      const matchesSub = selectedSubject === 'all' || String(a.subject_id) === selectedSubject;
      const matchesTeacher = selectedTeacher === 'all' || String(a.teacher_id) === selectedTeacher;
      const matchesCT = !onlyClassTeachers || a.is_class_teacher;

      return matchesSearch && matchesStd && matchesDiv && matchesSub && matchesTeacher && matchesCT;
    });
  }, [assignments, searchQuery, selectedStd, selectedDiv, selectedSubject, selectedTeacher, onlyClassTeachers]);

  // Teacher Workload Data
  const teacherWorkloadList = useMemo(() => {
    const map = new Map<number, { teacher: TeacherItem | null; totalPeriods: number; allocations: TeacherAssignment[] }>();

    teachers.forEach(t => {
      map.set(t.id, { teacher: t, totalPeriods: 0, allocations: [] });
    });

    assignments.forEach(a => {
      const entry = map.get(a.teacher_id) || {
        teacher: a.teacher ? { id: a.teacher.id, full_name: a.teacher.full_name || `Teacher #${a.teacher.id}`, designation: a.teacher.designation || undefined } : null,
        totalPeriods: 0,
        allocations: [] as TeacherAssignment[]
      };
      entry.totalPeriods += a.periods_per_week || 0;
      entry.allocations.push(a);
      map.set(a.teacher_id, entry);
    });

    return Array.from(map.values()).filter(w => w.allocations.length > 0 || selectedTeacher === 'all');
  }, [teachers, assignments, selectedTeacher]);


  // Open Single Add/Edit Modal
  const handleOpenAddModal = (presetStd?: string, presetDiv?: string, presetSubId?: number) => {
    setEditingAssignment(null);
    setFormData({
      teacher_id: teachers[0] ? String(teachers[0].id) : '',
      subject_id: presetSubId ? String(presetSubId) : (subjects[0] ? String(subjects[0].id) : ''),
      standard: presetStd || '5',
      division: presetDiv || 'A',
      periods_per_week: 5,
      is_class_teacher: false,
    });
    setShowModal(true);
  };

  const handleOpenEditModal = (asg: TeacherAssignment) => {
    setEditingAssignment(asg);
    setFormData({
      teacher_id: String(asg.teacher_id),
      subject_id: String(asg.subject_id),
      standard: asg.standard,
      division: asg.division || 'A',
      periods_per_week: asg.periods_per_week,
      is_class_teacher: asg.is_class_teacher,
    });
    setShowModal(true);
  };

  // Submit Single Form
  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.teacher_id || !formData.subject_id || !formData.standard) {
      toast.error('Teacher, Subject, and Standard are required.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        teacher_id: Number(formData.teacher_id),
        subject_id: Number(formData.subject_id),
        standard: formData.standard,
        division: formData.division || undefined,
        periods_per_week: Number(formData.periods_per_week),
        is_class_teacher: formData.is_class_teacher,
        academic_year_id: CURRENT_AY,
      };

      if (editingAssignment) {
        await timetableService.updateAssignment(editingAssignment.id, payload);
        toast.success('Subject allocation updated successfully!');
      } else {
        await timetableService.createAssignment(payload);
        toast.success('Subject allocated to teacher successfully!');
      }

      setShowModal(false);
      loadData();
    } catch (err: any) {
      console.error('Error saving allocation:', err);
      toast.error(err?.response?.data?.message || 'Failed to save subject allocation.');
    } finally {
      setSubmitting(false);
    }
  };

  // Delete Allocation
  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to remove this subject allocation?')) return;
    try {
      await timetableService.deleteAssignment(id);
      toast.success('Subject allocation removed.');
      loadData();
    } catch (err) {
      toast.error('Failed to remove allocation.');
    }
  };

  // Open Bulk Wizard Modal
  const handleOpenBulkModal = () => {
    const std = selectedStd !== 'all' ? selectedStd : '5';
    const div = selectedDiv !== 'all' ? selectedDiv : 'A';
    setBulkStd(std);
    setBulkDiv(div);

    // Initialize rows for each subject
    const initialRows = subjects.map(s => {
      // Find existing allocation if any
      const existing = assignments.find(a => a.standard === std && (a.division === div || !a.division) && a.subject_id === s.id);
      return {
        subject_id: s.id,
        teacher_id: existing ? String(existing.teacher_id) : '',
        periods_per_week: existing ? existing.periods_per_week : 5,
        is_class_teacher: existing ? existing.is_class_teacher : false,
      };
    });

    setBulkRows(initialRows);
    setShowBulkModal(true);
  };

  // Submit Bulk Wizard
  const handleSubmitBulk = async () => {
    const activeAllocations = bulkRows.filter(r => r.teacher_id !== '');
    if (activeAllocations.length === 0) {
      toast.error('Please assign at least one teacher before submitting bulk allocations.');
      return;
    }

    setSubmittingBulk(true);
    try {
      await timetableService.bulkCreateAssignments({
        standard: bulkStd,
        division: bulkDiv || undefined,
        academic_year_id: CURRENT_AY,
        allocations: activeAllocations.map(r => ({
          subject_id: r.subject_id,
          teacher_id: Number(r.teacher_id),
          periods_per_week: Number(r.periods_per_week),
          is_class_teacher: r.is_class_teacher,
        })),
      });

      toast.success(`Successfully saved ${activeAllocations.length} subject allocations for Std ${bulkStd}${bulkDiv}!`);
      setShowBulkModal(false);
      loadData();
    } catch (err) {
      toast.error('Failed to save bulk subject allocations.');
    } finally {
      setSubmittingBulk(false);
    }
  };

  // Export CSV
  const handleExportCSV = () => {
    if (filteredAssignments.length === 0) {
      toast.error('No allocations to export.');
      return;
    }

    const headers = ['Standard', 'Division', 'Subject Name', 'Subject Code', 'Teacher Name', 'Weekly Target Periods', 'Is Class Teacher'];
    const rows = filteredAssignments.map(a => [
      `Std ${a.standard}`,
      a.division || 'All',
      `"${a.subject?.name || ''}"`,
      a.subject?.code || '',
      `"${a.teacher?.full_name || ''}"`,
      a.periods_per_week,
      a.is_class_teacher ? 'Yes' : 'No'
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Subject_Assignments_Std_${selectedStd}_Div_${selectedDiv}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('CSV Report downloaded!');
  };

  // Print Summary
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className={styles.container}>
      {/* ── 1. HEADER SECTION ─────────────────────────────────── */}
      <div className={styles.header}>
        <div className={styles.headerTitleGroup}>
          <div className={styles.headerIconBox}>
            <BookOpen size={26} />
          </div>
          <div>
            <h1 className={styles.title}>
              Subject Assignments & Allocations Hub
              <span className={styles.titleMarathi}>(विषय आणि शिक्षक वाटप केंद्र)</span>
            </h1>
            <p className={styles.subtitle}>
              Allocate subjects to qualified teachers, configure target weekly periods, and monitor academic workload distribution across standards.
            </p>
          </div>
        </div>

        <div className={styles.headerActions}>
          <button className={`${styles.btn} ${styles.btnOutline}`} onClick={loadData} title="Refresh data">
            <RefreshCw size={15} className={loading ? styles.spin : ''} />
            Refresh
          </button>

          <button className={`${styles.btn} ${styles.btnSecondary}`} onClick={handleExportCSV}>
            <Download size={15} />
            Export CSV
          </button>

          <button className={`${styles.btn} ${styles.btnSecondary}`} onClick={handlePrint}>
            <Printer size={15} />
            Print
          </button>

          <button className={`${styles.btn} ${styles.btnSecondary}`} onClick={handleOpenBulkModal}>
            <Sparkles size={15} style={{ color: '#8b5cf6' }} />
            Bulk Wizard
          </button>

          <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={() => handleOpenAddModal()}>
            <Plus size={16} />
            Add Allocation
          </button>
        </div>
      </div>

      {/* ── 2. EXECUTIVE KPI CARDS ───────────────────────────── */}
      <div className={styles.kpiGrid}>
        <div className={styles.kpiCard}>
          <div className={styles.kpiIconBox} style={{ background: 'rgba(79, 70, 229, 0.1)', color: '#4f46e5' }}>
            <Layers size={22} />
          </div>
          <div className={styles.kpiMeta}>
            <div className={styles.kpiVal}>{kpiStats.totalAllocations}</div>
            <div className={styles.kpiLabel}>Total Subject Allocations</div>
          </div>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiIconBox} style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>
            <CheckCircle size={22} />
          </div>
          <div className={styles.kpiMeta}>
            <div className={styles.kpiVal}>{kpiStats.activeClassesCount}</div>
            <div className={styles.kpiLabel}>Configured Classes/Divs</div>
          </div>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiIconBox} style={{ background: 'rgba(245, 158, 11, 0.12)', color: '#d97706' }}>
            <Star size={22} />
          </div>
          <div className={styles.kpiMeta}>
            <div className={styles.kpiVal}>{kpiStats.classTeachersCount}</div>
            <div className={styles.kpiLabel}>Class Teachers Assigned</div>
          </div>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiIconBox} style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#2563eb' }}>
            <BarChart2 size={22} />
          </div>
          <div className={styles.kpiMeta}>
            <div className={styles.kpiVal}>{kpiStats.avgWorkload} <span style={{ fontSize: '0.8rem', fontWeight: 500 }}>Periods/Wk</span></div>
            <div className={styles.kpiLabel}>Avg Teacher Workload</div>
          </div>
        </div>
      </div>

      {/* ── 3. NAVIGATION & FILTERS BAR ───────────────────────── */}
      <div className={styles.controlsBar}>
        {/* View Switcher Tabs */}
        <div className={styles.tabsGroup}>
          <button
            className={`${styles.tabBtn} ${viewMode === 'list' ? styles.tabBtnActive : ''}`}
            onClick={() => setViewMode('list')}
          >
            <List size={15} /> Directory List
          </button>
          <button
            className={`${styles.tabBtn} ${viewMode === 'matrix' ? styles.tabBtnActive : ''}`}
            onClick={() => setViewMode('matrix')}
          >
            <Grid size={15} /> Class Matrix
          </button>
          <button
            className={`${styles.tabBtn} ${viewMode === 'workload' ? styles.tabBtnActive : ''}`}
            onClick={() => setViewMode('workload')}
          >
            <Users size={15} /> Teacher Workload
          </button>
        </div>

        {/* Search & Filter Controls */}
        <div className={styles.searchFilterRow}>
          <div className={styles.searchBox}>
            <Search size={15} className={styles.searchIcon} />
            <input
              type="text"
              placeholder="Search teacher, subject, standard..."
              className={styles.searchInput}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>

          <select
            className={styles.selectFilter}
            value={selectedStd}
            onChange={e => setSelectedStd(e.target.value)}
          >
            <option value="all">All Standards</option>
            {STANDARDS.map(s => <option key={s} value={s}>Std {s}</option>)}
          </select>

          <select
            className={styles.selectFilter}
            value={selectedDiv}
            onChange={e => setSelectedDiv(e.target.value)}
          >
            <option value="all">All Divisions</option>
            {DIVISIONS.map(d => <option key={d || 'all'} value={d || 'All'}>Div {d || 'All'}</option>)}
          </select>

          <select
            className={styles.selectFilter}
            value={selectedSubject}
            onChange={e => setSelectedSubject(e.target.value)}
          >
            <option value="all">All Subjects</option>
            {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>

          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', color: 'var(--color-text)' }}>
            <input
              type="checkbox"
              checked={onlyClassTeachers}
              onChange={e => setOnlyClassTeachers(e.target.checked)}
            />
            Class Teachers Only
          </label>
        </div>
      </div>

      {/* ── 4. VIEW CONTENT ───────────────────────────────────── */}
      {loading ? (
        <div className={styles.emptyState}>
          <RefreshCw size={32} className={styles.spin} style={{ color: 'var(--color-primary)' }} />
          <p>Loading subject allocations...</p>
        </div>
      ) : (
        <>
          {/* ── 4A. TAB 1: DIRECTORY LIST VIEW ──────────────────── */}
          {viewMode === 'list' && (
            <div className={styles.tableContainer}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Teacher</th>
                    <th>Subject</th>
                    <th>Class / Standard</th>
                    <th>Division</th>
                    <th>Weekly Target</th>
                    <th>Class Teacher</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAssignments.map(a => (
                    <tr key={a.id}>
                      <td>
                        <div className={styles.teacherMeta}>
                          <div className={styles.avatar}>
                            {a.teacher?.full_name ? a.teacher.full_name.charAt(0).toUpperCase() : 'T'}
                          </div>
                          <div>
                            <div className={styles.teacherName}>{a.teacher?.full_name || `Teacher #${a.teacher_id}`}</div>
                            {a.teacher?.designation && <div className={styles.teacherSub}>{a.teacher.designation}</div>}
                          </div>
                        </div>
                      </td>
                      <td>
                        <div
                          className={styles.subjectBadge}
                          style={{
                            background: `${a.subject?.color || '#4f46e5'}15`,
                            color: a.subject?.color || '#4f46e5',
                            border: `1px solid ${a.subject?.color || '#4f46e5'}40`,
                          }}
                        >
                          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: a.subject?.color || '#4f46e5' }} />
                          {a.subject?.name || `Subject #${a.subject_id}`}
                          {a.subject?.code && <span style={{ opacity: 0.7, fontSize: '0.7rem' }}>({a.subject.code})</span>}
                        </div>
                      </td>
                      <td>
                        <span className={styles.stdBadge}>Std {a.standard}</span>
                      </td>
                      <td>
                        <span style={{ fontWeight: 600 }}>{a.division || 'All Divisions'}</span>
                      </td>
                      <td>
                        <span className={styles.periodBadge}>
                          ⚡ {a.periods_per_week} Periods / Wk
                        </span>
                      </td>
                      <td>
                        {a.is_class_teacher ? (
                          <span className={styles.ctBadge}>
                            <Star size={12} fill="#d97706" /> Class Teacher
                          </span>
                        ) : (
                          <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>Subject Teacher</span>
                        )}
                      </td>
                      <td>
                        <div className={styles.actionBtns}>
                          <button
                            className={styles.iconBtn}
                            onClick={() => handleOpenEditModal(a)}
                            title="Edit Allocation"
                          >
                            <Edit2 size={13} />
                          </button>
                          <button
                            className={`${styles.iconBtn} ${styles.iconBtnDanger}`}
                            onClick={() => handleDelete(a.id)}
                            title="Remove Allocation"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}

                  {filteredAssignments.length === 0 && (
                    <tr>
                      <td colSpan={7}>
                        <div className={styles.emptyState}>
                          <BookOpen size={36} style={{ opacity: 0.4 }} />
                          <p>No subject allocations found matching your criteria.</p>
                          <button
                            className={`${styles.btn} ${styles.btnPrimary}`}
                            onClick={() => handleOpenAddModal()}
                          >
                            <Plus size={15} /> Add First Subject Allocation
                          </button>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* ── 4B. TAB 2: CLASS ALLOCATION MATRIX ──────────────── */}
          {viewMode === 'matrix' && (
            <div className={styles.matrixWrapper}>
              <table className={styles.matrixTable}>
                <thead>
                  <tr>
                    <th className={styles.matrixTh}>Standard & Div</th>
                    {subjects.slice(0, 10).map(s => (
                      <th key={s.id} className={styles.matrixTh}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: s.color || '#4f46e5' }} />
                          {s.name}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(selectedStd !== 'all' ? [selectedStd] : STANDARDS.slice(0, 6)).map(std => {
                    const divs = selectedDiv !== 'all' ? [selectedDiv] : ['A', 'B'];
                    return divs.map(div => (
                      <tr key={`${std}-${div}`}>
                        <td className={styles.matrixClassTd}>
                          Std {std} - Div {div}
                        </td>

                        {subjects.slice(0, 10).map(sub => {
                          const asg = assignments.find(
                            a => a.standard === std && (a.division === div || !a.division) && a.subject_id === sub.id
                          );

                          return (
                            <td key={sub.id} className={`${styles.matrixCell} ${asg ? styles.matrixCellAssigned : ''}`}>
                              {asg ? (
                                <div>
                                  <div className={styles.matrixTeacherName}>👤 {asg.teacher?.full_name}</div>
                                  <div className={styles.matrixSubDetail}>
                                    ⚡ {asg.periods_per_week} Periods/Wk {asg.is_class_teacher ? '⭐ CT' : ''}
                                  </div>
                                  <button
                                    style={{
                                      border: 'none',
                                      background: 'transparent',
                                      color: '#6366f1',
                                      fontSize: '0.7rem',
                                      cursor: 'pointer',
                                      marginTop: '4px',
                                      padding: 0
                                    }}
                                    onClick={() => handleOpenEditModal(asg)}
                                  >
                                    Edit
                                  </button>
                                </div>
                              ) : (
                                <button
                                  className={styles.matrixAddBtn}
                                  onClick={() => handleOpenAddModal(std, div, sub.id)}
                                >
                                  <Plus size={11} /> Assign
                                </button>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ));
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* ── 4C. TAB 3: TEACHER WORKLOAD ANALYZER ────────────── */}
          {viewMode === 'workload' && (
            <div className={styles.workloadGrid}>
              {teacherWorkloadList.map(({ teacher, totalPeriods, allocations }) => {
                const maxPeriods = 30; // standard benchmark max periods/week
                const percentage = Math.min(100, Math.round((totalPeriods / maxPeriods) * 100));

                let statusColor = '#10b981'; // Green (Normal)
                let statusLabel = 'Optimal Load';

                if (totalPeriods > 30) {
                  statusColor = '#ef4444'; // Red (Overloaded)
                  statusLabel = 'Overloaded';
                } else if (totalPeriods >= 24) {
                  statusColor = '#f59e0b'; // Amber (Heavy)
                  statusLabel = 'Heavy Load';
                }

                return (
                  <div key={teacher?.id || Math.random()} className={styles.workloadCard}>
                    <div className={styles.workloadHeader}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--color-text)' }}>
                          👤 {teacher?.full_name || 'Unknown Teacher'}
                        </div>
                        {teacher?.designation && (
                          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{teacher.designation}</div>
                        )}
                      </div>
                      <span
                        style={{
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          padding: '0.2rem 0.5rem',
                          borderRadius: '6px',
                          background: `${statusColor}18`,
                          color: statusColor
                        }}
                      >
                        {statusLabel}
                      </span>
                    </div>

                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px' }}>
                        <span>Weekly Workload:</span>
                        <span>{totalPeriods} / {maxPeriods} Periods</span>
                      </div>
                      <div className={styles.progressBarBg}>
                        <div
                          className={styles.progressBarFill}
                          style={{ width: `${percentage}%`, background: statusColor }}
                        />
                      </div>
                    </div>

                    <div className={styles.workloadList}>
                      <div style={{ fontWeight: 600, fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>
                        Allocated Subjects & Classes ({allocations.length}):
                      </div>
                      {allocations.map(a => (
                        <div key={a.id} className={styles.workloadItem}>
                          <span>
                            <strong>{a.subject?.name}</strong> · Std {a.standard}{a.division || 'All'}
                          </span>
                          <span style={{ fontWeight: 600, color: 'var(--color-primary)' }}>
                            {a.periods_per_week} P/Wk
                          </span>
                        </div>
                      ))}
                      {allocations.length === 0 && (
                        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontStyle: 'italic' }}>
                          No subjects currently assigned to this teacher.
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ── 5. SINGLE ADD/EDIT MODAL ──────────────────────────── */}
      {showModal && (
        <div className={styles.overlay} onClick={() => setShowModal(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>
                {editingAssignment ? 'Edit Subject Allocation' : 'Add Subject Allocation'}
              </h3>
              <button className={styles.modalClose} onClick={() => setShowModal(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmitForm}>
              <div className={styles.modalBody}>
                <div className={styles.mfGroup}>
                  <label className={styles.label}>Select Teacher *</label>
                  <select
                    className={styles.select}
                    value={formData.teacher_id}
                    onChange={e => setFormData(p => ({ ...p, teacher_id: e.target.value }))}
                    required
                  >
                    <option value="">-- Choose Teacher --</option>
                    {teachers.map(t => (
                      <option key={t.id} value={t.id}>
                        👤 {t.full_name} {t.designation ? `(${t.designation})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div className={styles.mfGroup}>
                  <label className={styles.label}>Select Subject *</label>
                  <select
                    className={styles.select}
                    value={formData.subject_id}
                    onChange={e => setFormData(p => ({ ...p, subject_id: e.target.value }))}
                    required
                  >
                    <option value="">-- Choose Subject --</option>
                    {subjects.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.name} {s.name_marathi ? `(${s.name_marathi})` : ''} [{s.subject_type}]
                      </option>
                    ))}
                  </select>
                </div>

                <div className={styles.mfRow}>
                  <div className={styles.mfGroup}>
                    <label className={styles.label}>Standard / Class *</label>
                    <select
                      className={styles.select}
                      value={formData.standard}
                      onChange={e => setFormData(p => ({ ...p, standard: e.target.value }))}
                      required
                    >
                      {STANDARDS.map(s => (
                        <option key={s} value={s}>Std {s}</option>
                      ))}
                    </select>
                  </div>

                  <div className={styles.mfGroup}>
                    <label className={styles.label}>Division</label>
                    <select
                      className={styles.select}
                      value={formData.division}
                      onChange={e => setFormData(p => ({ ...p, division: e.target.value }))}
                    >
                      {DIVISIONS.map(d => (
                        <option key={d || 'all'} value={d || 'All'}>{d || 'All Divisions'}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className={styles.mfRow}>
                  <div className={styles.mfGroup}>
                    <label className={styles.label}>Weekly Target Periods</label>
                    <input
                      type="number"
                      min="1"
                      max="30"
                      className={styles.input}
                      value={formData.periods_per_week}
                      onChange={e => setFormData(p => ({ ...p, periods_per_week: Number(e.target.value) }))}
                    />
                  </div>

                  <div className={styles.mfGroup} style={{ justifyContent: 'center' }}>
                    <label className={styles.label} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', marginTop: '1.2rem' }}>
                      <input
                        type="checkbox"
                        checked={formData.is_class_teacher}
                        onChange={e => setFormData(p => ({ ...p, is_class_teacher: e.target.checked }))}
                      />
                      Designate as Class Teacher
                    </label>
                  </div>
                </div>
              </div>

              <div className={styles.modalFooter}>
                <button type="button" className={`${styles.btn} ${styles.btnSecondary}`} onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className={`${styles.btn} ${styles.btnPrimary}`} disabled={submitting}>
                  {submitting ? <span className={styles.spin} /> : <Check size={15} />}
                  <span>{editingAssignment ? 'Update Allocation' : 'Save Allocation'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── 6. BULK WIZARD MODAL ──────────────────────────────── */}
      {showBulkModal && (
        <div className={styles.overlay} onClick={() => setShowBulkModal(false)}>
          <div className={styles.modal} style={{ maxWidth: '780px' }} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Sparkles size={18} style={{ color: '#8b5cf6' }} />
                Bulk Subject Allocation Wizard
              </h3>
              <button className={styles.modalClose} onClick={() => setShowBulkModal(false)}>
                <X size={18} />
              </button>
            </div>

            <div className={styles.modalBody}>
              <div className={styles.mfRow} style={{ background: 'var(--color-surface-2)', padding: '12px', borderRadius: '10px' }}>
                <div className={styles.mfGroup}>
                  <label className={styles.label}>Target Standard</label>
                  <select className={styles.select} value={bulkStd} onChange={e => setBulkStd(e.target.value)}>
                    {STANDARDS.map(s => <option key={s} value={s}>Std {s}</option>)}
                  </select>
                </div>

                <div className={styles.mfGroup}>
                  <label className={styles.label}>Target Division</label>
                  <select className={styles.select} value={bulkDiv} onChange={e => setBulkDiv(e.target.value)}>
                    {DIVISIONS.map(d => <option key={d || 'all'} value={d}>{d || 'All Divisions'}</option>)}
                  </select>
                </div>
              </div>

              <div style={{ maxHeight: '350px', overflowY: 'auto' }}>
                <table className={styles.table} style={{ fontSize: '0.8rem' }}>
                  <thead>
                    <tr>
                      <th>Subject</th>
                      <th>Assigned Teacher</th>
                      <th>Periods/Wk</th>
                      <th>Class Teacher</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bulkRows.map((row, idx) => {
                      const subObj = subjects.find(s => s.id === row.subject_id);
                      return (
                        <tr key={row.subject_id}>
                          <td style={{ fontWeight: 600 }}>
                            <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: subObj?.color || '#4f46e5', marginRight: '6px' }} />
                            {subObj?.name}
                          </td>
                          <td>
                            <select
                              className={styles.select}
                              style={{ padding: '0.35rem 0.6rem', fontSize: '0.8rem' }}
                              value={row.teacher_id}
                              onChange={e => {
                                const val = e.target.value;
                                setBulkRows(prev => prev.map((r, i) => i === idx ? { ...r, teacher_id: val } : r));
                              }}
                            >
                              <option value="">-- Select Teacher --</option>
                              {teachers.map(t => (
                                <option key={t.id} value={t.id}>{t.full_name}</option>
                              ))}
                            </select>
                          </td>
                          <td>
                            <input
                              type="number"
                              min="1"
                              max="20"
                              className={styles.input}
                              style={{ width: '65px', padding: '0.35rem' }}
                              value={row.periods_per_week}
                              onChange={e => {
                                const val = Number(e.target.value);
                                setBulkRows(prev => prev.map((r, i) => i === idx ? { ...r, periods_per_week: val } : r));
                              }}
                            />
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <input
                              type="checkbox"
                              checked={row.is_class_teacher}
                              onChange={e => {
                                const val = e.target.checked;
                                setBulkRows(prev => prev.map((r, i) => i === idx ? { ...r, is_class_teacher: val } : r));
                              }}
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className={styles.modalFooter}>
              <button type="button" className={`${styles.btn} ${styles.btnSecondary}`} onClick={() => setShowBulkModal(false)}>
                Cancel
              </button>
              <button type="button" className={`${styles.btn} ${styles.btnPrimary}`} onClick={handleSubmitBulk} disabled={submittingBulk}>
                {submittingBulk ? <span className={styles.spin} /> : <Check size={15} />}
                Save All Allocations
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
