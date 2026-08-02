import { useState, useEffect, useCallback, Fragment } from 'react';
import {
  CalendarDays, Plus, RefreshCw, Check, X, BookOpen,
  Clock, Pencil, Trash2, LayoutGrid, User, Copy, AlertTriangle,
  Printer, UserCheck, ShieldAlert, Layers, Sparkles
} from 'lucide-react';
import toast from 'react-hot-toast';
import timetableService, {
  Subject, PeriodConfig, WeeklyTimetable, TimetableCell, TeacherTimetableCell,
  TimetableStats, ConflictCheck, FreeTeacher, SubstituteEntry, TeacherAssignment,
} from '../../services/timetableService';
import api from '../../services/api';
import styles from './TimetablePage.module.css';

type Section = 'timetable' | 'teacher' | 'substitutes' | 'assignments' | 'subjects' | 'periods';

const STANDARDS = ['1','2','3','4','5','6','7','8','9','10','11','12'];
const DIVISIONS  = ['','A','B','C','D'];
const DAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const CURRENT_AY = 1;

const SUBJECT_TYPES = ['theory','practical','activity','language','co-curricular'];
const PERIOD_TYPES  = ['class','break','lunch','assembly','sports','library'];

const SUBJECT_COLORS = [
  '#6366f1','#8b5cf6','#ec4899','#ef4444','#f97316',
  '#f59e0b','#10b981','#14b8a6','#3b82f6','#06b6d4',
];

const bg = (hex: string | undefined) =>
  hex ? `${hex}22` : 'var(--color-surface-2)';

export default function TimetablePage() {
  const [section, setSection] = useState<Section>('timetable');

  // Global KPI Stats
  const [stats, setStats] = useState<TimetableStats | null>(null);

  // Class timetable tab
  const [selStd, setSelStd] = useState('8');
  const [selDiv, setSelDiv] = useState('A');
  const [timetable, setTimetable] = useState<WeeklyTimetable | null>(null);
  const [loadingTT, setLoadingTT] = useState(false);

  // Edit cell modal
  const [editCell, setEditCell] = useState<{ day: number; period: TimetableCell } | null>(null);
  const [cellSubject, setCellSubject] = useState('');
  const [cellTeacher, setCellTeacher] = useState('');
  const [cellRoom, setCellRoom] = useState('');
  const [cellNotes, setCellNotes] = useState('');
  const [conflict, setConflict] = useState<ConflictCheck | null>(null);
  const [savingCell, setSavingCell] = useState(false);

  // Teachers master list
  const [teachersList, setTeachersList] = useState<Array<{ id: number; full_name?: string; designation?: string; employee_code?: string }>>([]);

  // Teacher view tab
  const [teacherId, setTeacherId] = useState('');
  const [teacherTT, setTeacherTT] = useState<TeacherTimetableCell[]>([]);
  const [loadingTeacher, setLoadingTeacher] = useState(false);

  // Copy timetable modal
  const [showCopyModal, setShowCopyModal] = useState(false);
  const [copyTargetStd, setCopyTargetStd] = useState('8');
  const [copyTargetDiv, setCopyTargetDiv] = useState('B');
  const [copying, setCopying] = useState(false);

  // Auto-generate timetable modal
  const [showAutoGenerateModal, setShowAutoGenerateModal] = useState(false);
  const [autoGenerating, setAutoGenerating] = useState(false);
  const [autoOverwrite, setAutoOverwrite] = useState(true);

  // Smart Substitutions tab
  const [subDate, setSubDate] = useState(new Date().toISOString().split('T')[0]);
  const [substitutesList, setSubstitutesList] = useState<SubstituteEntry[]>([]);
  const [absentTeacherId, setAbsentTeacherId] = useState('');
  const [showSubModal, setShowSubModal] = useState(false);
  const [subTtEntry, setSubTtEntry] = useState<TimetableCell | null>(null);
  const [subDayNum, setSubDayNum] = useState<number>(1);
  const [freeTeachers, setFreeTeachers] = useState<FreeTeacher[]>([]);
  const [selSubTeacher, setSelSubTeacher] = useState('');
  const [subReason, setSubReason] = useState('');
  const [savingSub, setSavingSub] = useState(false);

  // Teacher-Subject Assignments tab
  const [assignments, setAssignments] = useState<TeacherAssignment[]>([]);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [newAssign, setNewAssign] = useState({ teacher_id: '', subject_id: '', standard: '8', division: 'A', periods_per_week: 5, is_class_teacher: false });
  const [savingAssign, setSavingAssign] = useState(false);

  // Subjects tab
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [showSubjectModal, setShowSubjectModal] = useState(false);
  const [editSubject, setEditSubject] = useState<Subject | null>(null);
  const [newSubject, setNewSubject] = useState({ name: '', name_marathi: '', code: '', subject_type: 'theory', color: SUBJECT_COLORS[0], applicable_standards: 'All' });
  const [savingSubject, setSavingSubject] = useState(false);

  // Periods tab
  const [periods, setPeriods] = useState<PeriodConfig[]>([]);
  const [showPeriodModal, setShowPeriodModal] = useState(false);
  const [editPeriod, setEditPeriod] = useState<PeriodConfig | null>(null);
  const [newPeriod, setNewPeriod] = useState({ period_number: 1, period_name: '', start_time: '', end_time: '', duration_minutes: 45, period_type: 'class', sort_order: 0, academic_year_id: CURRENT_AY });
  const [savingPeriod, setSavingPeriod] = useState(false);

  // Initial Loaders
  const loadStats = useCallback(async () => {
    try { setStats(await timetableService.getStats(CURRENT_AY)); } catch {}
  }, []);

  const loadTeachersList = useCallback(async () => {
    try {
      const res = await api.get('/teachers', { params: { per_page: 500 } });
      const raw = res.data?.data;
      const list = Array.isArray(raw) ? raw : (raw?.items || []);
      setTeachersList(list);
    } catch (err) {
      console.error('Failed to load teachers list:', err);
    }
  }, []);

  const loadSubjects = useCallback(async () => {
    try { setSubjects(await timetableService.getSubjects()); } catch {}
  }, []);

  const loadPeriods = useCallback(async () => {
    try { setPeriods(await timetableService.getPeriods(CURRENT_AY)); } catch {}
  }, []);

  const loadAssignments = useCallback(async () => {
    try { setAssignments(await timetableService.getAssignments(CURRENT_AY)); } catch {}
  }, []);

  const loadSubstitutes = useCallback(async () => {
    try { setSubstitutesList(await timetableService.getSubstitutes(subDate)); } catch {}
  }, [subDate]);

  useEffect(() => {
    loadStats();
    loadSubjects();
    loadPeriods();
    loadTeachersList();
  }, [loadStats, loadSubjects, loadPeriods, loadTeachersList]);

  // Load Class Timetable
  const loadTimetable = useCallback(async () => {
    setLoadingTT(true); setTimetable(null);
    try { setTimetable(await timetableService.getClassTimetable(selStd, selDiv || undefined, CURRENT_AY)); }
    catch { toast.error('Failed to load timetable.'); }
    finally { setLoadingTT(false); }
  }, [selStd, selDiv]);

  useEffect(() => {
    if (section === 'timetable') loadTimetable();
    if (section === 'substitutes') loadSubstitutes();
    if (section === 'assignments') loadAssignments();
  }, [section, loadTimetable, loadSubstitutes, loadAssignments]);

  // Open Edit Cell Modal & check conflict
  const openEditCell = async (day: number, period: TimetableCell) => {
    if (period.period_type !== 'class') return;
    setEditCell({ day, period });
    setCellSubject(period.subject_id ? String(period.subject_id) : '');
    setCellTeacher(period.teacher_id ? String(period.teacher_id) : '');
    setCellRoom(period.room || '');
    setCellNotes(period.notes || '');
    setConflict(null);

    if (period.teacher_id) {
      try {
        const conf = await timetableService.checkTeacherConflict({
          teacher_id: period.teacher_id,
          day_of_week: day,
          period_id: period.period_id,
          standard: selStd,
          division: selDiv || undefined,
          academic_year_id: CURRENT_AY,
        });
        setConflict(conf);
      } catch {}
    }
  };

  // On Teacher Change in Cell Edit Modal -> Check Conflict
  const handleTeacherChangeInCell = async (teacherIdStr: string) => {
    setCellTeacher(teacherIdStr);
    setConflict(null);
    if (!teacherIdStr || !editCell) return;
    try {
      const conf = await timetableService.checkTeacherConflict({
        teacher_id: Number(teacherIdStr),
        day_of_week: editCell.day,
        period_id: editCell.period.period_id,
        standard: selStd,
        division: selDiv || undefined,
        academic_year_id: CURRENT_AY,
      });
      setConflict(conf);
    } catch {}
  };

  // Save Cell
  const saveCell = async () => {
    if (!editCell) return;
    setSavingCell(true);
    try {
      await timetableService.upsertEntry({
        standard: selStd,
        division: selDiv || undefined,
        day_of_week: editCell.day,
        period_id: editCell.period.period_id,
        subject_id: cellSubject ? Number(cellSubject) : undefined,
        teacher_id: cellTeacher ? Number(cellTeacher) : undefined,
        room: cellRoom || undefined,
        notes: cellNotes || undefined,
        academic_year_id: CURRENT_AY,
      });
      toast.success('Period updated!');
      setEditCell(null);
      loadTimetable();
      loadStats();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || e?.response?.data?.detail || 'Failed to save period cell.');
    } finally { setSavingCell(false); }
  };

  const clearCell = async () => {
    if (!editCell?.period.entry_id) { setEditCell(null); return; }
    try {
      await timetableService.deleteEntry(editCell.period.entry_id);
      toast.success('Period cleared.'); setEditCell(null); loadTimetable(); loadStats();
    } catch { toast.error('Failed.'); }
  };

  // Teacher Timetable View
  const loadTeacherTT = async () => {
    if (!teacherId) return;
    setLoadingTeacher(true);
    try { setTeacherTT(await timetableService.getTeacherTimetable(Number(teacherId), CURRENT_AY)); }
    catch { toast.error('Teacher schedule not found.'); }
    finally { setLoadingTeacher(false); }
  };

  // Copy Timetable
  const handleCopyTimetable = async () => {
    if (selStd === copyTargetStd && (selDiv || '') === copyTargetDiv) {
      toast.error('Source and target class cannot be identical!'); return;
    }
    setCopying(true);
    try {
      const count = await timetableService.copyTimetable({
        source_standard: selStd,
        source_division: selDiv || undefined,
        target_standard: copyTargetStd,
        target_division: copyTargetDiv || undefined,
        academic_year_id: CURRENT_AY,
      });
      toast.success(`Successfully copied ${count} entries to Std ${copyTargetStd}${copyTargetDiv}!`);
      setShowCopyModal(false);
      loadStats();
    } catch { toast.error('Failed to copy timetable.'); }
    finally { setCopying(false); }
  };

  // Auto-Generate Timetable
  const handleAutoGenerate = async () => {
    setAutoGenerating(true);
    try {
      const count = await timetableService.autoGenerateTimetable({
        standard: selStd,
        division: selDiv || undefined,
        academic_year_id: CURRENT_AY,
        overwrite: autoOverwrite,
      });
      toast.success(`Generated ${count} periods for Std ${selStd}${selDiv}!`);
      setShowAutoGenerateModal(false);
      loadTimetable();
      loadStats();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.response?.data?.detail || 'Failed to auto-generate timetable.');
    } finally {
      setAutoGenerating(false);
    }
  };

  // Smart Substitutions
  const openSubstituteModalForCell = async (dayNum: number, cell: TimetableCell) => {
    if (!cell.entry_id) { toast.error('No scheduled period entry.'); return; }
    setSubTtEntry(cell);
    setSubDayNum(dayNum);
    setSelSubTeacher('');
    setSubReason('');
    try {
      const free = await timetableService.getFreeTeachers(dayNum, cell.period_id, CURRENT_AY);
      setFreeTeachers(free);
      setShowSubModal(true);
    } catch { toast.error('Failed to fetch free teachers.'); }
  };

  const saveSubstitute = async () => {
    if (!subTtEntry?.entry_id || !selSubTeacher) { toast.error('Select substitute teacher.'); return; }
    setSavingSub(true);
    try {
      await timetableService.createSubstitute({
        timetable_entry_id: subTtEntry.entry_id,
        substitute_date: subDate,
        substitute_teacher_id: Number(selSubTeacher),
        reason: subReason || undefined,
      });
      toast.success('Substitute assigned successfully!');
      setShowSubModal(false);
      loadSubstitutes();
      loadStats();
    } catch { toast.error('Failed to assign substitute.'); }
    finally { setSavingSub(false); }
  };

  const deleteSubstitute = async (id: number) => {
    if (!confirm('Remove this substitute assignment?')) return;
    try {
      await timetableService.deleteSubstitute(id);
      toast.success('Substitute removed.');
      loadSubstitutes();
      loadStats();
    } catch { toast.error('Failed to remove substitute.'); }
  };

  // Teacher-Subject Assignments
  const saveAssignment = async () => {
    if (!newAssign.teacher_id || !newAssign.subject_id || !newAssign.standard) {
      toast.error('Teacher, Subject, and Standard are required.'); return;
    }
    setSavingAssign(true);
    try {
      await timetableService.createAssignment({
        teacher_id: Number(newAssign.teacher_id),
        subject_id: Number(newAssign.subject_id),
        standard: newAssign.standard,
        division: newAssign.division || undefined,
        periods_per_week: Number(newAssign.periods_per_week || 4),
        is_class_teacher: Boolean(newAssign.is_class_teacher),
        academic_year_id: CURRENT_AY,
      });
      toast.success('Allocation added successfully!');
      setShowAssignModal(false);
      setNewAssign({ teacher_id: '', subject_id: '', standard: '1', division: 'A', periods_per_week: 4, is_class_teacher: false });
      loadAssignments();
      loadStats();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.response?.data?.detail || 'Failed to save assignment.');
    }
    finally { setSavingAssign(false); }
  };

  const deleteAssignment = async (id: number) => {
    if (!confirm('Remove this teacher assignment?')) return;
    try {
      await timetableService.deleteAssignment(id);
      toast.success('Assignment removed.');
      loadAssignments();
      loadStats();
    } catch { toast.error('Failed to delete assignment.'); }
  };

  // Subjects
  const saveSubject = async () => {
    if (!newSubject.name) { toast.error('Subject name is required.'); return; }
    setSavingSubject(true);
    try {
      if (editSubject) {
        await timetableService.updateSubject(editSubject.id, newSubject);
        toast.success('Subject updated!');
      } else {
        await timetableService.createSubject(newSubject);
        toast.success('Subject added!');
      }
      setShowSubjectModal(false); setEditSubject(null);
      setNewSubject({ name:'', name_marathi:'', code:'', subject_type:'theory', color:SUBJECT_COLORS[0], applicable_standards:'All' });
      loadSubjects(); loadStats();
    } catch { toast.error('Failed.'); }
    finally { setSavingSubject(false); }
  };

  const deleteSubject = async (id: number) => {
    if (!confirm('Delete this subject?')) return;
    try { await timetableService.deleteSubject(id); toast.success('Deleted.'); loadSubjects(); loadStats(); }
    catch { toast.error('Failed.'); }
  };

  // Periods
  const seedPeriods = async () => {
    try {
      const count = await timetableService.seedPeriods(CURRENT_AY);
      toast.success(`${count} periods seeded!`); loadPeriods(); loadStats();
    } catch { toast.error('Failed.'); }
  };

  const savePeriod = async () => {
    if (!newPeriod.period_name || !newPeriod.start_time || !newPeriod.end_time) {
      toast.error('All fields are required.'); return;
    }
    setSavingPeriod(true);
    try {
      if (editPeriod) {
        await timetableService.updatePeriod(editPeriod.id, newPeriod);
        toast.success('Period updated!');
      } else {
        await timetableService.createPeriod(newPeriod);
        toast.success('Period added!');
      }
      setShowPeriodModal(false); setEditPeriod(null);
      setNewPeriod({ period_number:1, period_name:'', start_time:'', end_time:'', duration_minutes:45, period_type:'class', sort_order:0, academic_year_id:CURRENT_AY });
      loadPeriods(); loadStats();
    } catch { toast.error('Failed.'); }
    finally { setSavingPeriod(false); }
  };

  const deletePeriod = async (id: number) => {
    if (!confirm('Delete this period config?')) return;
    try { await timetableService.deletePeriod(id); toast.success('Deleted.'); loadPeriods(); loadStats(); }
    catch { toast.error('Failed.'); }
  };

  // Teacher Grid Map
  const teacherGrid: Record<number, Record<string, TeacherTimetableCell>> = {};
  teacherTT.forEach(c => {
    if (!teacherGrid[c.day_number]) teacherGrid[c.day_number] = {};
    teacherGrid[c.day_number][c.period_name] = c;
  });

  const allPeriods = timetable?.periods || periods || [];
  const selectedTeacherObj = teachersList.find(t => String(t.id) === teacherId);

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Timetable Management</h1>
          <p className={styles.pageSub}>वेळापत्रक व्यवस्थापन · Superadmin Master Schedule & Substitution Engine</p>
        </div>
        <button className={styles.iconBtn} onClick={() => window.print()} title="Print Timetable">
          <Printer size={15}/> Print / Export
        </button>
      </div>

      {/* KPI Stats Banner */}
      {stats && (
        <div className={styles.kpiRow}>
          <div className={styles.kpiCard}>
            <div className={styles.kpiIcon}><BookOpen size={20}/></div>
            <div>
              <div className={styles.kpiVal}>{stats.total_subjects}</div>
              <div className={styles.kpiLabel}>Active Subjects</div>
            </div>
          </div>
          <div className={styles.kpiCard}>
            <div className={`${styles.kpiIcon} ${styles.kpiIconGreen}`}><Clock size={20}/></div>
            <div>
              <div className={styles.kpiVal}>{stats.total_periods}</div>
              <div className={styles.kpiLabel}>Periods / Day</div>
            </div>
          </div>
          <div className={styles.kpiCard}>
            <div className={`${styles.kpiIcon} ${styles.kpiIconOrange}`}><LayoutGrid size={20}/></div>
            <div>
              <div className={styles.kpiVal}>{stats.total_entries}</div>
              <div className={styles.kpiLabel}>Scheduled Slots</div>
            </div>
          </div>
          <div className={styles.kpiCard}>
            <div className={`${styles.kpiIcon} ${styles.kpiIconPurple}`}><UserCheck size={20}/></div>
            <div>
              <div className={styles.kpiVal}>{stats.total_assignments}</div>
              <div className={styles.kpiLabel}>Teacher Allocations</div>
            </div>
          </div>
          <div className={styles.kpiCard}>
            <div className={`${styles.kpiIcon} ${styles.kpiIconOrange}`}><ShieldAlert size={20}/></div>
            <div>
              <div className={styles.kpiVal}>{stats.active_substitutes_today}</div>
              <div className={styles.kpiLabel}>Today Substitutes</div>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className={styles.tabBar}>
        {([
          { id: 'timetable',   label: 'Class Schedule',   icon: <LayoutGrid size={14}/> },
          { id: 'teacher',     label: 'Teacher View',     icon: <User size={14}/> },
          { id: 'substitutes', label: 'Substitutions',    icon: <ShieldAlert size={14}/> },
          { id: 'assignments', label: 'Teacher Allocations', icon: <Layers size={14}/> },
          { id: 'subjects',    label: 'Subject Master',   icon: <BookOpen size={14}/> },
          { id: 'periods',     label: 'Period Master',    icon: <Clock size={14}/> },
        ] as const).map(t => (
          <button key={t.id} className={`${styles.tab} ${section === t.id ? styles.tabActive : ''}`}
            onClick={() => setSection(t.id as Section)}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* ── 1. CLASS TIMETABLE ────────────────────────────── */}
      {section === 'timetable' && (
        <div className={styles.ttContent}>
          <div className={styles.toolbar}>
            <div className={styles.stdTabs}>
              {STANDARDS.map(s => (
                <button key={s} className={`${styles.stdTab} ${selStd===s?styles.stdTabActive:''}`}
                  onClick={() => setSelStd(s)}>Std {s}</button>
              ))}
            </div>
            <div className={styles.divTabs}>
              {DIVISIONS.map(d => (
                <button key={d||'all'} className={`${styles.divTab} ${selDiv===d?styles.divTabActive:''}`}
                  onClick={() => setSelDiv(d)}>{d||'All'}</button>
              ))}
            </div>
            <button className={styles.iconBtn} onClick={loadTimetable}><RefreshCw size={14}/> Refresh</button>
            <button className={styles.addBtn} onClick={() => setShowAutoGenerateModal(true)}><Sparkles size={14}/> Auto-Generate Schedule</button>
            <button className={styles.seedBtn} onClick={() => setShowCopyModal(true)}><Copy size={14}/> Copy Timetable</button>
          </div>

          {loadingTT ? (
            <div className={styles.loadingSkel}/>
          ) : !timetable ? (
            <div className={styles.emptyState}><CalendarDays size={64}/><p>No timetable data configured for Std {selStd}{selDiv}</p></div>
          ) : (
            <div className={styles.ttGridWrap}>
              <div className={styles.ttGrid} style={{ '--cols': allPeriods.length + 1 } as React.CSSProperties}>
                {/* Header row */}
                <div className={styles.ttHeaderCell}>Day / Period</div>
                {allPeriods.map(p => (
                  <div key={p.id} className={`${styles.ttHeaderCell} ${p.period_type !== 'class' ? styles.ttBreakHeader : ''}`}>
                    <div className={styles.phName}>{p.period_name}</div>
                    <div className={styles.phTime}>{p.start_time}–{p.end_time}</div>
                  </div>
                ))}

                {/* Data rows */}
                {timetable.days.map(day => (
                  <Fragment key={`day-row-${day.day_number}`}>
                    <div key={`d${day.day_number}`} className={styles.ttDayCell}>{day.day_name}</div>
                    {day.periods.map(cell => {
                      const isBreak = cell.period_type !== 'class';
                      return (
                        <div key={`${day.day_number}-${cell.period_id}`}
                          className={`${styles.ttCell} ${isBreak ? styles.ttBreakCell : ''} ${cell.subject_id ? styles.ttFilledCell : styles.ttEmptyCell}`}
                          style={cell.subject_color ? { background: bg(cell.subject_color), borderLeft: `3px solid ${cell.subject_color}` } : {}}
                          onClick={() => !isBreak && openEditCell(day.day_number, cell)}>
                          {isBreak ? (
                            <span className={styles.breakLabel}>{cell.period_type}</span>
                          ) : cell.subject_id ? (
                            <>
                              <div className={styles.cellSubject}>{cell.subject_name}</div>
                              {cell.subject_name_marathi && <div className={styles.cellSubjectMr}>{cell.subject_name_marathi}</div>}
                              {cell.teacher_name && <div className={styles.cellTeacher}>👤 {cell.teacher_name.split(' ').slice(-1)[0]}</div>}
                              {cell.room && <div className={styles.cellRoom}>🏫 {cell.room}</div>}
                            </>
                          ) : (
                            <div className={styles.emptyCell}>
                              <Plus size={14} className={styles.plusIcon}/>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </Fragment>
                ))}
              </div>

              {/* Legend */}
              <div className={styles.legend}>
                {subjects.filter(s => s.color).map(s => (
                  <div key={s.id} className={styles.legendItem}>
                    <div className={styles.legendDot} style={{ background: s.color! }}/>
                    <span>{s.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── 2. TEACHER VIEW ───────────────────────────────── */}
      {section === 'teacher' && (
        <div className={styles.teacherContent}>
          <div className={styles.toolbar}>
            <select className={styles.searchInput} value={teacherId} onChange={e => { setTeacherId(e.target.value); setTeacherTT([]); }}>
              <option value="">-- Select Teacher --</option>
              {teachersList.map(t => (
                <option key={t.id} value={t.id}>
                  {t.full_name || `Teacher #${t.id}`} {t.designation ? `(${t.designation})` : ''}
                </option>
              ))}
            </select>
            <button className={styles.addBtn} onClick={loadTeacherTT} disabled={!teacherId}>
              <User size={14}/> Load Schedule
            </button>
            {loadingTeacher && <span className={styles.spin2}/>}
          </div>

          {selectedTeacherObj && teacherTT.length > 0 && (
            <div className={styles.workloadCard}>
              <div className={styles.workloadTitle}>
                <span>Weekly Workload: <strong>{selectedTeacherObj.full_name}</strong></span>
                <span>{teacherTT.length} Periods / Week (Max 30)</span>
              </div>
              <div className={styles.workloadBar}>
                <div className={`${styles.workloadProgress} ${teacherTT.length > 30 ? styles.workloadProgressOver : ''}`}
                  style={{ width: `${Math.min(100, (teacherTT.length / 30) * 100)}%` }}/>
              </div>
            </div>
          )}

          {teacherTT.length === 0 ? (
            <div className={styles.emptyState}><User size={64}/><p>Select a teacher above to view their weekly class timetable matrix & workload.</p></div>
          ) : (
            <div className={styles.teacherGrid}>
              <table className={styles.table}>
                <thead><tr>
                  <th>Period</th>
                  {DAYS.map(d => <th key={d}>{d}</th>)}
                </tr></thead>
                <tbody>
                  {Array.from(new Set(teacherTT.map(c => c.period_name))).map(pName => (
                    <tr key={pName} className={styles.tr}>
                      <td className={styles.periodNameCell}>{pName}</td>
                      {DAYS.map((_, i) => {
                        const cell = teacherGrid[i+1]?.[pName];
                        return (
                          <td key={i} className={cell ? styles.teacherCell : ''}>
                            {cell ? (
                              <div className={styles.teacherCellInner}>
                                <div className={styles.tcClass}>Std {cell.standard}{cell.division}</div>
                                <div className={styles.tcSubject}>{cell.subject_name}</div>
                                {cell.room && <div className={styles.tcRoom}>🏫 {cell.room}</div>}
                              </div>
                            ) : <span className={styles.freeCell}>— Free —</span>}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── 3. SMART SUBSTITUTIONS ───────────────────────── */}
      {section === 'substitutes' && (
        <div className={styles.subContent}>
          <div className={styles.toolbar}>
            <label className={styles.ml}>Date:</label>
            <input type="date" className={styles.searchInput} value={subDate} onChange={e => setSubDate(e.target.value)}/>
            <button className={styles.iconBtn} onClick={loadSubstitutes}><RefreshCw size={14}/> Refresh</button>
            <span className={styles.muted}>{substitutesList.length} substitute assignments for {subDate}</span>
          </div>

          {/* Quick Assign Panel by Teacher & Class */}
          <div className={styles.workloadCard}>
            <div className={styles.workloadTitle}>
              <span>Assign Substitute Teacher for Absent Teacher</span>
            </div>
            <div className={styles.mfRow} style={{ alignItems: 'flex-end' }}>
              <div className={styles.mf}>
                <label className={styles.ml}>Select Absent Teacher</label>
                <select className={styles.mi} value={absentTeacherId} onChange={e => setAbsentTeacherId(e.target.value)}>
                  <option value="">-- Choose Absent Teacher --</option>
                  {teachersList.map(t => <option key={t.id} value={t.id}>{t.full_name}</option>)}
                </select>
              </div>
              <button className={styles.addBtn} onClick={async () => {
                if (!absentTeacherId) { toast.error('Select teacher first'); return; }
                const dayNum = new Date(subDate).getDay(); // 0-6
                const dayOfWeek = dayNum === 0 ? 7 : dayNum; // map Sunday or 1-6 Mon-Sat
                try {
                  const ttt = await timetableService.getTeacherTimetable(Number(absentTeacherId), CURRENT_AY);
                  const dayEntries = ttt.filter(c => c.day_number === dayOfWeek);
                  if (dayEntries.length === 0) {
                    toast.error('This teacher has no scheduled classes on this day of week.');
                    return;
                  }
                  toast.success(`Found ${dayEntries.length} scheduled periods for teacher. Pick period from class timetable to assign substitute.`);
                } catch { toast.error('Error querying teacher timetable.'); }
              }}><UserCheck size={14}/> Check Absent Teacher Schedule</button>
            </div>
          </div>

          {/* Substitute List Cards */}
          <div className={styles.subCardGrid}>
            {substitutesList.map(s => (
              <div key={s.id} className={styles.subCard}>
                <span className={styles.subCardBadge}>Active</span>
                <div style={{ fontWeight: 'bold', fontSize: '15px' }}>{s.period_name} ({s.start_time} - {s.end_time})</div>
                <div>Class: <strong>Std {s.standard}{s.division}</strong> · Subject: <strong>{s.subject_name}</strong></div>
                <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
                  Original Teacher: <span style={{ textDecoration: 'line-through' }}>{s.original_teacher_name || 'N/A'}</span>
                </div>
                <div style={{ fontSize: '13px', color: 'var(--color-primary)', fontWeight: 'bold' }}>
                  Substitute: 👤 {s.substitute_teacher_name}
                </div>
                {s.reason && <div style={{ fontSize: '12px', fontStyle: 'italic' }}>Note: {s.reason}</div>}
                <button className={`${styles.miniBtn} ${styles.miniBtnDanger}`} style={{ alignSelf: 'flex-start', marginTop: '8px' }}
                  onClick={() => deleteSubstitute(s.id)}>
                  <Trash2 size={12}/> Remove Substitute
                </button>
              </div>
            ))}
            {substitutesList.length === 0 && (
              <div className={styles.emptyState}><ShieldAlert size={48}/><p>No substitute entries recorded for {subDate}. To assign a substitute, click on any occupied period cell in the Class Schedule view.</p></div>
            )}
          </div>
        </div>
      )}

      {/* ── 4. TEACHER ALLOCATIONS ───────────────────────── */}
      {section === 'assignments' && (
        <div className={styles.teacherContent}>
          <div className={styles.toolbar}>
            <span className={styles.muted}>{assignments.length} Total Teacher-Subject Allocations</span>
            <button className={styles.iconBtn} onClick={loadAssignments}><RefreshCw size={14}/></button>
            <button className={styles.addBtn} onClick={() => setShowAssignModal(true)}><Plus size={15}/> Add Teacher Assignment</button>
          </div>

          <div className={styles.teacherGrid}>
            <table className={styles.table}>
              <thead><tr>
                <th>Teacher</th>
                <th>Subject</th>
                <th>Standard</th>
                <th>Division</th>
                <th>Weekly Target</th>
                <th>Class Teacher</th>
                <th>Actions</th>
              </tr></thead>
              <tbody>
                {assignments.map(a => (
                  <tr key={a.id} className={styles.tr}>
                    <td style={{ fontWeight: 'bold' }}>👤 {a.teacher?.full_name || `Teacher #${a.teacher_id}`}</td>
                    <td>{a.subject?.name || `Subject #${a.subject_id}`}</td>
                    <td>Std {a.standard}</td>
                    <td>{a.division || 'All'}</td>
                    <td>{a.periods_per_week} Periods/Wk</td>
                    <td>{a.is_class_teacher ? <span style={{ color: '#10b981', fontWeight: 'bold' }}>Yes</span> : 'No'}</td>
                    <td>
                      <button className={`${styles.miniBtn} ${styles.miniBtnDanger}`} onClick={() => deleteAssignment(a.id)}>
                        <Trash2 size={12}/> Remove
                      </button>
                    </td>
                  </tr>
                ))}
                {assignments.length === 0 && (
                  <tr><td colSpan={7} className={styles.emptyMsg}>No teacher assignments defined. Click "Add Teacher Assignment" to allocate subjects to teachers.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── 5. SUBJECTS ──────────────────────────────────── */}
      {section === 'subjects' && (
        <div className={styles.subjectsContent}>
          <div className={styles.toolbar}>
            <span className={styles.muted}>{subjects.length} Subjects Configured</span>
            <button className={styles.iconBtn} onClick={loadSubjects}><RefreshCw size={14}/></button>
            <button className={styles.addBtn} onClick={() => { setEditSubject(null); setNewSubject({ name:'', name_marathi:'', code:'', subject_type:'theory', color:SUBJECT_COLORS[0], applicable_standards:'All' }); setShowSubjectModal(true); }}>
              <Plus size={15}/> Add Subject
            </button>
          </div>

          <div className={styles.subjectGrid}>
            {subjects.map(s => (
              <div key={s.id} className={styles.subjectCard} style={{ borderLeft: `4px solid ${s.color || 'var(--color-border)'}` }}>
                <div className={styles.subjectCardTop}>
                  <div className={styles.subjectDot} style={{ background: s.color || 'var(--color-border)' }}/>
                  <div>
                    <div className={styles.subjectName}>{s.name}</div>
                    {s.name_marathi && <div className={styles.subjectNameMr}>{s.name_marathi}</div>}
                  </div>
                </div>
                <div className={styles.subjectMeta}>
                  {s.code && <span className={styles.codeTag}>{s.code}</span>}
                  <span className={styles.typeTag}>{s.subject_type}</span>
                  {s.applicable_standards && <span className={styles.stdTag}>Std: {s.applicable_standards}</span>}
                </div>
                <div className={styles.subjectActions}>
                  <button className={styles.miniBtn} onClick={() => {
                    setEditSubject(s);
                    setNewSubject({ name:s.name, name_marathi:s.name_marathi||'', code:s.code||'', subject_type:s.subject_type, color:s.color||SUBJECT_COLORS[0], applicable_standards:s.applicable_standards||'All' });
                    setShowSubjectModal(true);
                  }}><Pencil size={11}/> Edit</button>
                  <button className={`${styles.miniBtn} ${styles.miniBtnDanger}`} onClick={() => deleteSubject(s.id)}><Trash2 size={11}/></button>
                </div>
              </div>
            ))}
            {subjects.length === 0 && <div className={styles.emptyMsg}>No subjects added yet.</div>}
          </div>
        </div>
      )}

      {/* ── 6. PERIOD CONFIG MASTER ──────────────────────── */}
      {section === 'periods' && (
        <div className={styles.periodsContent}>
          <div className={styles.toolbar}>
            <span className={styles.muted}>{periods.length} Periods Configured</span>
            <button className={styles.iconBtn} onClick={loadPeriods}><RefreshCw size={14}/></button>
            <button className={styles.seedBtn} onClick={seedPeriods}><CalendarDays size={14}/> Seed Default (8-Period)</button>
            <button className={styles.addBtn} onClick={() => { setEditPeriod(null); setNewPeriod({ period_number: periods.length+1, period_name:'', start_time:'', end_time:'', duration_minutes:45, period_type:'class', sort_order:periods.length+1, academic_year_id:CURRENT_AY }); setShowPeriodModal(true); }}>
              <Plus size={15}/> Add Period
            </button>
          </div>

          <div className={styles.periodList}>
            {periods.map(p => (
              <div key={p.id} className={`${styles.periodItem} ${p.period_type !== 'class' ? styles.periodBreak : ''}`}>
                <div className={styles.periodNum}>#{p.period_number}</div>
                <div className={styles.periodInfo}>
                  <div className={styles.periodName}>{p.period_name}</div>
                  <div className={styles.periodTime}>{p.start_time} – {p.end_time} · {p.duration_minutes} min</div>
                </div>
                <span className={`${styles.pTag} ${p.period_type==='class'?styles.pTagClass:p.period_type==='break'||p.period_type==='lunch'?styles.pTagBreak:styles.pTagOther}`}>
                  {p.period_type}
                </span>
                <button className={styles.miniBtn} onClick={() => {
                  setEditPeriod(p);
                  setNewPeriod({ period_number:p.period_number, period_name:p.period_name, start_time:p.start_time, end_time:p.end_time, duration_minutes:p.duration_minutes, period_type:p.period_type, sort_order:p.sort_order, academic_year_id:p.academic_year_id });
                  setShowPeriodModal(true);
                }}><Pencil size={11}/> Edit</button>
                <button className={`${styles.miniBtn} ${styles.miniBtnDanger}`} onClick={() => deletePeriod(p.id)}><Trash2 size={11}/></button>
              </div>
            ))}
            {periods.length === 0 && (
              <div className={styles.emptyState}><Clock size={48}/><p>No periods configured. Click "Seed Default" to auto-create standard 8-period timetable periods.</p></div>
            )}
          </div>
        </div>
      )}

      {/* ════ MODAL: Edit Cell ════ */}
      {editCell && (
        <div className={styles.overlay} onClick={() => setEditCell(null)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>
                {DAYS[editCell.day-1]} · {editCell.period.subject_name || editCell.period.period_name}
                <span className={styles.modalSub}> (Std {selStd}{selDiv || 'A'} — {editCell.period.period_name})</span>
              </h3>
              <button className={styles.modalClose} onClick={() => setEditCell(null)}><X size={16}/></button>
            </div>
            <div className={styles.modalBody}>
              {conflict?.has_conflict && (
                <div className={styles.conflictAlert}>
                  <AlertTriangle size={18}/>
                  <div>
                    Teacher Conflict Warning! Already assigned to Std {conflict.conflicting_standard}{conflict.conflicting_division} ({conflict.conflicting_period_name}) during this period.
                  </div>
                </div>
              )}

              <div className={styles.mf}>
                <label className={styles.ml}>Subject</label>
                <select className={styles.mi} value={cellSubject} onChange={e => setCellSubject(e.target.value)}>
                  <option value="">-- Free Period --</option>
                  {subjects.map(s => <option key={s.id} value={s.id}>{s.name}{s.name_marathi ? ` (${s.name_marathi})` : ''}</option>)}
                </select>
              </div>
              <div className={styles.mf}>
                <label className={styles.ml}>Assigned Teacher</label>
                <select className={styles.mi} value={cellTeacher} onChange={e => handleTeacherChangeInCell(e.target.value)}>
                  <option value="">-- Select Teacher --</option>
                  {teachersList.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.full_name || `Teacher #${t.id}`} {t.designation ? `(${t.designation})` : ''}
                    </option>
                  ))}
                </select>
              </div>
              <div className={styles.mfRow}>
                <div className={styles.mf}>
                  <label className={styles.ml}>Room / Lab</label>
                  <input className={styles.mi} value={cellRoom} onChange={e => setCellRoom(e.target.value)} placeholder="Room 102 / Lab 1"/>
                </div>
                <div className={styles.mf}>
                  <label className={styles.ml}>Notes</label>
                  <input className={styles.mi} value={cellNotes} onChange={e => setCellNotes(e.target.value)} placeholder="Special instructions..."/>
                </div>
              </div>

              {editCell.period.entry_id && (
                <button className={styles.seedBtn} style={{ marginTop: '8px', width: '100%', justifyContent: 'center' }}
                  onClick={() => {
                    const cellToSub = editCell.period;
                    const dayToSub = editCell.day;
                    setEditCell(null);
                    openSubstituteModalForCell(dayToSub, cellToSub);
                  }}>
                  <ShieldAlert size={14}/> Assign Substitute for this Period
                </button>
              )}
            </div>
            <div className={styles.modalFooter}>
              {editCell.period.entry_id && (
                <button className={styles.clearBtn} onClick={clearCell}><Trash2 size={13}/> Clear Cell</button>
              )}
              <button className={styles.cancelBtn} onClick={() => setEditCell(null)}>Cancel</button>
              <button className={styles.submitBtn} onClick={saveCell} disabled={savingCell}>
                {savingCell ? <span className={styles.spin}/> : <Check size={14}/>} Save Cell
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ════ MODAL: Copy Timetable ════ */}
      {showCopyModal && (
        <div className={styles.overlay} onClick={() => setShowCopyModal(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Copy Timetable</h3>
              <button className={styles.modalClose} onClick={() => setShowCopyModal(false)}><X size={16}/></button>
            </div>
            <div className={styles.modalBody}>
              <p className={styles.pageSub}>Copy all scheduled weekly periods from <strong>Std {selStd}{selDiv}</strong> to a target class.</p>
              <div className={styles.mfRow}>
                <div className={styles.mf}>
                  <label className={styles.ml}>Target Standard</label>
                  <select className={styles.mi} value={copyTargetStd} onChange={e => setCopyTargetStd(e.target.value)}>
                    {STANDARDS.map(s => <option key={s} value={s}>Std {s}</option>)}
                  </select>
                </div>
                <div className={styles.mf}>
                  <label className={styles.ml}>Target Division</label>
                  <select className={styles.mi} value={copyTargetDiv} onChange={e => setCopyTargetDiv(e.target.value)}>
                    {DIVISIONS.map(d => <option key={d||'all'} value={d}>{d||'All'}</option>)}
                  </select>
                </div>
              </div>
            </div>
            <div className={styles.modalFooter}>
              <button className={styles.cancelBtn} onClick={() => setShowCopyModal(false)}>Cancel</button>
              <button className={styles.submitBtn} onClick={handleCopyTimetable} disabled={copying}>
                {copying ? <span className={styles.spin}/> : <Copy size={14}/>} Copy Now
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ════ MODAL: Auto-Generate Timetable ════ */}
      {showAutoGenerateModal && (
        <div className={styles.overlay} onClick={() => setShowAutoGenerateModal(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Sparkles size={18} style={{ color: '#8b5cf6' }}/> Auto-Generate Timetable
              </h3>
              <button className={styles.modalClose} onClick={() => setShowAutoGenerateModal(false)}><X size={16}/></button>
            </div>
            <div className={styles.modalBody}>
              <p className={styles.pageSub}>
                Automatically construct a clash-free weekly schedule for <strong>Std {selStd}{selDiv || 'All'}</strong> based on defined Teacher Allocations.
              </p>
              <div style={{ background: 'var(--color-surface-2)', padding: '12px', borderRadius: '8px', marginBottom: '16px' }}>
                <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '13px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <li>Prevents teacher double-booking across different classes.</li>
                  <li>Enforces maximum 2 periods per subject per day.</li>
                  <li>Prioritizes subject target weekly period counts.</li>
                </ul>
              </div>
              <div className={styles.mf}>
                <label className={styles.ml} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input type="checkbox" checked={autoOverwrite} onChange={e => setAutoOverwrite(e.target.checked)}/>
                  Overwrite existing scheduled periods for Std {selStd}{selDiv}
                </label>
              </div>
            </div>
            <div className={styles.modalFooter}>
              <button className={styles.cancelBtn} onClick={() => setShowAutoGenerateModal(false)}>Cancel</button>
              <button className={styles.submitBtn} onClick={handleAutoGenerate} disabled={autoGenerating}>
                {autoGenerating ? <span className={styles.spin}/> : <Sparkles size={14}/>} Generate Now
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ════ MODAL: Assign Substitute ════ */}
      {showSubModal && subTtEntry && (
        <div className={styles.overlay} onClick={() => setShowSubModal(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Assign Substitute Teacher</h3>
              <button className={styles.modalClose} onClick={() => setShowSubModal(false)}><X size={16}/></button>
            </div>
            <div className={styles.modalBody}>
              <div style={{ background: 'var(--color-surface-2)', padding: '12px', borderRadius: '8px' }}>
                <div><strong>{subTtEntry.period_name} ({subTtEntry.start_time} - {subTtEntry.end_time})</strong></div>
                <div>Class: Std {selStd}{selDiv} · Subject: {subTtEntry.subject_name}</div>
                <div>Regular Teacher: {subTtEntry.teacher_name || 'Unassigned'}</div>
              </div>

              <div className={styles.mf}>
                <label className={styles.ml}>Available (Free) Teachers during this Period</label>
                <select className={styles.mi} value={selSubTeacher} onChange={e => setSelSubTeacher(e.target.value)}>
                  <option value="">-- Select Free Teacher --</option>
                  {freeTeachers.map(t => (
                    <option key={t.id} value={t.id}>👤 {t.full_name} {t.designation ? `(${t.designation})` : ''}</option>
                  ))}
                </select>
                {freeTeachers.length === 0 && <span style={{ fontSize: '11px', color: '#ef4444' }}>No free teachers detected during this period! You can select any teacher below:</span>}
              </div>
              <div className={styles.mf}>
                <label className={styles.ml}>Reason / Note</label>
                <input className={styles.mi} value={subReason} onChange={e => setSubReason(e.target.value)} placeholder="e.g. Leave, Sick, Official Duty"/>
              </div>
            </div>
            <div className={styles.modalFooter}>
              <button className={styles.cancelBtn} onClick={() => setShowSubModal(false)}>Cancel</button>
              <button className={styles.submitBtn} onClick={saveSubstitute} disabled={savingSub}>
                {savingSub ? <span className={styles.spin}/> : <Check size={14}/>} Confirm Substitute
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ════ MODAL: Teacher Assignment ════ */}
      {showAssignModal && (
        <div className={styles.overlay} onClick={() => setShowAssignModal(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Add Teacher Allocation</h3>
              <button className={styles.modalClose} onClick={() => setShowAssignModal(false)}><X size={16}/></button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.mf}>
                <label className={styles.ml}>Teacher *</label>
                <select className={styles.mi} value={newAssign.teacher_id} onChange={e => setNewAssign(p=>({...p, teacher_id: e.target.value}))}>
                  <option value="">-- Select Teacher --</option>
                  {teachersList.map(t => <option key={t.id} value={t.id}>{t.full_name}</option>)}
                </select>
              </div>
              <div className={styles.mf}>
                <label className={styles.ml}>Subject *</label>
                <select className={styles.mi} value={newAssign.subject_id} onChange={e => setNewAssign(p=>({...p, subject_id: e.target.value}))}>
                  <option value="">-- Select Subject --</option>
                  {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div className={styles.mfRow}>
                <div className={styles.mf}>
                  <label className={styles.ml}>Standard *</label>
                  <select className={styles.mi} value={newAssign.standard} onChange={e => setNewAssign(p=>({...p, standard: e.target.value}))}>
                    {STANDARDS.map(s => <option key={s} value={s}>Std {s}</option>)}
                  </select>
                </div>
                <div className={styles.mf}>
                  <label className={styles.ml}>Division</label>
                  <select className={styles.mi} value={newAssign.division} onChange={e => setNewAssign(p=>({...p, division: e.target.value}))}>
                    {DIVISIONS.map(d => <option key={d||'all'} value={d}>{d||'All'}</option>)}
                  </select>
                </div>
              </div>
              <div className={styles.mfRow}>
                <div className={styles.mf}>
                  <label className={styles.ml}>Weekly Target Periods</label>
                  <input type="number" className={styles.mi} value={newAssign.periods_per_week} onChange={e => setNewAssign(p=>({...p, periods_per_week: Number(e.target.value)}))}/>
                </div>
                <div className={styles.mf} style={{ justifyContent: 'center' }}>
                  <label className={styles.ml} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', marginTop: '18px' }}>
                    <input type="checkbox" checked={newAssign.is_class_teacher} onChange={e => setNewAssign(p=>({...p, is_class_teacher: e.target.checked}))}/>
                    Is Class Teacher
                  </label>
                </div>
              </div>
            </div>
            <div className={styles.modalFooter}>
              <button className={styles.cancelBtn} onClick={() => setShowAssignModal(false)}>Cancel</button>
              <button className={styles.submitBtn} onClick={saveAssignment} disabled={savingAssign}>
                {savingAssign ? <span className={styles.spin}/> : <Check size={14}/>} Save Allocation
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ════ MODAL: Subject Modal ════ */}
      {showSubjectModal && (
        <div className={styles.overlay} onClick={() => setShowSubjectModal(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>{editSubject ? 'Edit Subject' : 'Add Subject'}</h3>
              <button className={styles.modalClose} onClick={() => setShowSubjectModal(false)}><X size={16}/></button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.mf}><label className={styles.ml}>Name *</label><input className={styles.mi} value={newSubject.name} onChange={e=>setNewSubject(p=>({...p,name:e.target.value}))} placeholder="Mathematics"/></div>
              <div className={styles.mf}><label className={styles.ml}>Marathi Name</label><input className={styles.mi} value={newSubject.name_marathi} onChange={e=>setNewSubject(p=>({...p,name_marathi:e.target.value}))} placeholder="गणित"/></div>
              <div className={styles.mfRow}>
                <div className={styles.mf}><label className={styles.ml}>Code</label><input className={styles.mi} value={newSubject.code} onChange={e=>setNewSubject(p=>({...p,code:e.target.value}))} placeholder="MATH"/></div>
                <div className={styles.mf}><label className={styles.ml}>Type</label>
                  <select className={styles.mi} value={newSubject.subject_type} onChange={e=>setNewSubject(p=>({...p,subject_type:e.target.value}))}>
                    {SUBJECT_TYPES.map(t=><option key={t}>{t}</option>)}
                  </select>
                </div>
              </div>
              <div className={styles.mf}><label className={styles.ml}>Applicable Standards</label><input className={styles.mi} value={newSubject.applicable_standards} onChange={e=>setNewSubject(p=>({...p,applicable_standards:e.target.value}))} placeholder="All or 1,2,3"/></div>
              <div className={styles.mf}>
                <label className={styles.ml}>Display Color</label>
                <div className={styles.colorPicker}>
                  {SUBJECT_COLORS.map(c => (
                    <button key={c} className={`${styles.colorSwatch} ${newSubject.color===c?styles.colorSwatchActive:''}`}
                      style={{ background: c }} onClick={() => setNewSubject(p=>({...p,color:c}))}/>
                  ))}
                </div>
              </div>
            </div>
            <div className={styles.modalFooter}>
              <button className={styles.cancelBtn} onClick={() => setShowSubjectModal(false)}>Cancel</button>
              <button className={styles.submitBtn} onClick={saveSubject} disabled={savingSubject}>{savingSubject?<span className={styles.spin}/>:<Check size={14}/>} <span>{editSubject?'Update':'Add'}</span></button>
            </div>
          </div>
        </div>
      )}

      {/* ════ MODAL: Period Modal ════ */}
      {showPeriodModal && (
        <div className={styles.overlay} onClick={() => setShowPeriodModal(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>{editPeriod ? 'Edit Period' : 'Add Period'}</h3>
              <button className={styles.modalClose} onClick={() => setShowPeriodModal(false)}><X size={16}/></button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.mfRow}>
                <div className={styles.mf}><label className={styles.ml}>Period #</label><input type="number" className={styles.mi} value={newPeriod.period_number} onChange={e=>setNewPeriod(p=>({...p,period_number:Number(e.target.value)}))}/></div>
                <div className={styles.mf}><label className={styles.ml}>Sort Order</label><input type="number" className={styles.mi} value={newPeriod.sort_order} onChange={e=>setNewPeriod(p=>({...p,sort_order:Number(e.target.value)}))}/></div>
              </div>
              <div className={styles.mf}><label className={styles.ml}>Period Name *</label><input className={styles.mi} value={newPeriod.period_name} onChange={e=>setNewPeriod(p=>({...p,period_name:e.target.value}))} placeholder="Period 1 / Lunch Break"/></div>
              <div className={styles.mfRow}>
                <div className={styles.mf}><label className={styles.ml}>Start Time *</label><input type="time" className={styles.mi} value={newPeriod.start_time} onChange={e=>setNewPeriod(p=>({...p,start_time:e.target.value}))}/></div>
                <div className={styles.mf}><label className={styles.ml}>End Time *</label><input type="time" className={styles.mi} value={newPeriod.end_time} onChange={e=>setNewPeriod(p=>({...p,end_time:e.target.value}))}/></div>
                <div className={styles.mf}><label className={styles.ml}>Duration (min)</label><input type="number" className={styles.mi} value={newPeriod.duration_minutes} onChange={e=>setNewPeriod(p=>({...p,duration_minutes:Number(e.target.value)}))}/></div>
              </div>
              <div className={styles.mf}><label className={styles.ml}>Type</label>
                <select className={styles.mi} value={newPeriod.period_type} onChange={e=>setNewPeriod(p=>({...p,period_type:e.target.value}))}>
                  {PERIOD_TYPES.map(t=><option key={t}>{t}</option>)}
                </select>
              </div>
            </div>
            <div className={styles.modalFooter}>
              <button className={styles.cancelBtn} onClick={() => setShowPeriodModal(false)}>Cancel</button>
              <button className={styles.submitBtn} onClick={savePeriod} disabled={savingPeriod}>{savingPeriod?<span className={styles.spin}/>:<Check size={14}/>} <span>{editPeriod ? 'Update' : 'Add'} Period</span></button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
