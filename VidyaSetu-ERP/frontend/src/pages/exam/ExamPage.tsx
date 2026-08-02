import { useState, useEffect, useCallback } from 'react';
import {
  GraduationCap, Plus, RefreshCw, Check, X, Search,
  BarChart3, Trophy, BookOpen, AlertCircle, ArrowRight,
  FileText, ChevronDown, ChevronUp, Medal, Printer, Filter,
  CheckCircle2, UserCheck, UserX,
} from 'lucide-react';
import toast from 'react-hot-toast';
import examService, {
  ExamType, Exam, ExamSubject, ClassResultSummary, StudentResultDetail, ExamStats, MarkRow,
} from '../../services/examService';
import timetableService from '../../services/timetableService';
import PermissionGate from '../../components/ui/PermissionGate';
import styles from './ExamPage.module.css';

type Section = 'dashboard' | 'exams' | 'marks' | 'results' | 'types';

const STANDARDS = ['All', '1','2','3','4','5','6','7','8','9','10','11','12'];
const DIVISIONS = ['All', 'A', 'B', 'C', 'D'];
const CURRENT_AY = 1;

const GRADE_COLORS: Record<string, string> = {
  'A+': '#10b981', 'A': '#22c55e', 'B+': '#3b82f6', 'B': '#6366f1',
  'C': '#f59e0b', 'D': '#f97316', 'E': '#ef4444', 'F': '#dc2626',
};

const COMMON_SUBJECTS = [
  'Marathi','English','Hindi','Mathematics','Science','Social Science',
  'Sanskrit','Geography','History','Civics','Environmental Studies',
  'Drawing','Physical Education','Computer','Urdu',
];

interface ExtendedMarkRow {
  student_id: number;
  student_name: string;
  roll_number?: number;
  gr_number?: string;
  division?: string;
  marks: string;
  theory_marks: string;
  practical_marks: string;
  is_absent: boolean;
  is_exempted: boolean;
  remarks: string;
}

export default function ExamPage() {
  const [section, setSection] = useState<Section>('dashboard');
  const [stats, setStats] = useState<ExamStats | null>(null);

  // Filters
  const [selStd, setSelStd] = useState('8');
  const [selDiv, setSelDiv] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  // Exam management
  const [exams, setExams] = useState<Exam[]>([]);
  const [examTypes, setExamTypes] = useState<ExamType[]>([]);
  const [loadingExams, setLoadingExams] = useState(false);
  const [showExamModal, setShowExamModal] = useState(false);
  const [newExam, setNewExam] = useState({ exam_type_id: '', standard: '8', exam_date_from: '', exam_date_to: '' });
  const [examSubjects, setExamSubjects] = useState<Array<{ subject_name: string; max_marks: string; passing_marks: string; theory_max: string; practical_max: string }>>([
    { subject_name: 'Marathi', max_marks: '100', passing_marks: '35', theory_max: '', practical_max: '' },
  ]);
  const [savingExam, setSavingExam] = useState(false);

  // Marks entry
  const [marksExam, setMarksExam] = useState<Exam | null>(null);
  const [marksSubject, setMarksSubject] = useState<ExamSubject | null>(null);
  const [markRows, setMarkRows] = useState<ExtendedMarkRow[]>([]);
  const [loadingMarks, setLoadingMarks] = useState(false);
  const [savingMarks, setSavingMarks] = useState(false);

  // Results & Report Cards
  const [resultExam, setResultExam] = useState<Exam | null>(null);
  const [classResult, setClassResult] = useState<ClassResultSummary | null>(null);
  const [loadingResult, setLoadingResult] = useState(false);
  const [compilingResult, setCompilingResult] = useState(false);
  const [expandedStudent, setExpandedStudent] = useState<number | null>(null);
  const [printStudent, setPrintStudent] = useState<StudentResultDetail | null>(null);

  // Exam Types modal
  const [showTypeModal, setShowTypeModal] = useState(false);
  const [newType, setNewType] = useState({ name: '', name_marathi: '', academic_year_id: CURRENT_AY, sequence: 1, max_marks: 100, passing_marks: 35, weightage: 100 });
  const [savingType, setSavingType] = useState(false);

  const loadStats = useCallback(async () => {
    try { setStats(await examService.getStats(CURRENT_AY)); } catch {}
  }, []);

  const loadExamTypes = useCallback(async () => {
    try {
      let types = await examService.getExamTypes(CURRENT_AY);
      if (types.length === 0) {
        const defaults = [
          { name: 'Unit Test 1', name_marathi: 'एकक चाचणी १', academic_year_id: CURRENT_AY, sequence: 1, max_marks: 25, passing_marks: 10, weightage: 10 },
          { name: 'Semester 1 Exam', name_marathi: 'प्रथम सत्रांत परीक्षा', academic_year_id: CURRENT_AY, sequence: 2, max_marks: 50, passing_marks: 18, weightage: 40 },
          { name: 'Unit Test 2', name_marathi: 'एकक चाचणी २', academic_year_id: CURRENT_AY, sequence: 3, max_marks: 25, passing_marks: 10, weightage: 10 },
          { name: 'Annual Examination', name_marathi: 'वार्षिक परीक्षा', academic_year_id: CURRENT_AY, sequence: 4, max_marks: 100, passing_marks: 35, weightage: 40 },
        ];
        for (const d of defaults) {
          try { await examService.createExamType(d); } catch {}
        }
        types = await examService.getExamTypes(CURRENT_AY);
      }
      setExamTypes(types);
      if (types.length > 0) {
        setNewExam(p => ({ ...p, exam_type_id: p.exam_type_id || String(types[0].id) }));
      }
    } catch {}
  }, []);

  useEffect(() => { loadStats(); loadExamTypes(); }, [loadStats, loadExamTypes]);

  const loadExams = useCallback(async () => {
    setLoadingExams(true);
    try { setExams(await examService.getExams(CURRENT_AY, selStd)); }
    catch {} finally { setLoadingExams(false); }
  }, [selStd]);

  useEffect(() => {
    if (section === 'exams' || section === 'marks') loadExams();
  }, [section, loadExams]);

  const saveExamType = async () => {
    if (!newType.name) { toast.error('Name required.'); return; }
    setSavingType(true);
    try {
      await examService.createExamType(newType);
      toast.success('Exam type added!');
      setShowTypeModal(false);
      setNewType({ name: '', name_marathi: '', academic_year_id: CURRENT_AY, sequence: 1, max_marks: 100, passing_marks: 35, weightage: 100 });
      loadExamTypes(); loadStats();
    } catch { toast.error('Failed to add type.'); }
    finally { setSavingType(false); }
  };

  const loadStandardSubjects = useCallback(async (std: string, typeId?: string) => {
    try {
      const selectedType = examTypes.find(t => String(t.id) === typeId);
      const defMax = selectedType ? String(selectedType.max_marks) : '100';
      const defPass = selectedType ? String(selectedType.passing_marks) : '35';

      const assignments = await timetableService.getAssignments(CURRENT_AY);
      const stdAssignments = assignments.filter(a => a.standard === std);
      if (stdAssignments.length > 0) {
        const subjs: Array<{ subject_name: string; max_marks: string; passing_marks: string; theory_max: string; practical_max: string }> = [];
        const seen = new Set<string>();
        stdAssignments.forEach(a => {
          const name = a.subject?.name;
          if (name && !seen.has(name)) {
            seen.add(name);
            subjs.push({ subject_name: name, max_marks: defMax, passing_marks: defPass, theory_max: '', practical_max: '' });
          }
        });
        if (subjs.length > 0) {
          setExamSubjects(subjs);
          return;
        }
      }

      const masterSubjs = await timetableService.getSubjects();
      if (masterSubjs.length > 0) {
        const subjs: Array<{ subject_name: string; max_marks: string; passing_marks: string; theory_max: string; practical_max: string }> = [];
        const seen = new Set<string>();
        masterSubjs.forEach(ms => {
          if (ms.name && !seen.has(ms.name)) {
            if (!ms.applicable_standards || ms.applicable_standards === 'All' || ms.applicable_standards.split(',').includes(std)) {
              seen.add(ms.name);
              subjs.push({ subject_name: ms.name, max_marks: defMax, passing_marks: defPass, theory_max: '', practical_max: '' });
            }
          }
        });
        if (subjs.length > 0) {
          setExamSubjects(subjs);
          return;
        }
      }
    } catch {}

    const defaultList = ['Marathi', 'English', 'Hindi', 'Mathematics', 'Science', 'Social Studies'];
    const selectedType = examTypes.find(t => String(t.id) === typeId);
    const defMax = selectedType ? String(selectedType.max_marks) : '100';
    const defPass = selectedType ? String(selectedType.passing_marks) : '35';
    setExamSubjects(defaultList.map(name => ({
      subject_name: name, max_marks: defMax, passing_marks: defPass, theory_max: '', practical_max: ''
    })));
  }, [examTypes]);

  const openCreateExamModal = (std: string) => {
    const targetStd = std === 'All' ? '8' : std;
    const initialTypeId = examTypes.length > 0 ? String(examTypes[0].id) : '';
    setNewExam({
      exam_type_id: initialTypeId,
      standard: targetStd,
      exam_date_from: '',
      exam_date_to: ''
    });
    setShowExamModal(true);
    loadStandardSubjects(targetStd, initialTypeId);
  };

  const addSubjectRow = () => setExamSubjects(p => [...p, { subject_name: '', max_marks: '100', passing_marks: '35', theory_max: '', practical_max: '' }]);
  const removeSubjectRow = (i: number) => setExamSubjects(p => p.filter((_, idx) => idx !== i));
  const updateSubjectRow = (i: number, field: string, val: string) => setExamSubjects(p => p.map((r, idx) => idx === i ? { ...r, [field]: val } : r));

  const saveExam = async () => {
    if (!newExam.exam_type_id) { toast.error('Select exam type.'); return; }
    const validSubjects = examSubjects.filter(s => s.subject_name.trim());
    if (validSubjects.length === 0) { toast.error('Add at least one subject.'); return; }
    setSavingExam(true);
    try {
      const subjects = validSubjects.map((s, i) => ({
        subject_name: s.subject_name,
        max_marks: Number(s.max_marks) || 100,
        passing_marks: Number(s.passing_marks) || 35,
        theory_max: s.theory_max ? Number(s.theory_max) : undefined,
        practical_max: s.practical_max ? Number(s.practical_max) : undefined,
        sort_order: i,
      }));
      await examService.createExam({
        exam_type_id: Number(newExam.exam_type_id),
        academic_year_id: CURRENT_AY,
        standard: newExam.standard || selStd,
        exam_date_from: newExam.exam_date_from || undefined,
        exam_date_to: newExam.exam_date_to || undefined,
        subjects,
      });
      toast.success('Exam created successfully!');
      setShowExamModal(false);
      setNewExam({ exam_type_id: '', standard: selStd, exam_date_from: '', exam_date_to: '' });
      setExamSubjects([{ subject_name: 'Marathi', max_marks: '100', passing_marks: '35', theory_max: '', practical_max: '' }]);
      loadExams(); loadStats();
    } catch (e: any) { toast.error(e?.response?.data?.detail || 'Failed.'); }
    finally { setSavingExam(false); }
  };

  const openMarksEntry = async (exam: Exam, subject: ExamSubject, div: string = selDiv) => {
    setMarksExam(exam);
    setMarksSubject(subject);
    setLoadingMarks(true);
    setSection('marks');
    try {
      const data = await examService.getSubjectMarks(exam.id, subject.id, div === 'All' ? undefined : div);
      const rows: ExtendedMarkRow[] = data.map((m: MarkRow) => ({
        student_id: m.student_id,
        student_name: m.student_name || `Student #${m.student_id}`,
        roll_number: m.roll_number,
        gr_number: m.gr_number || `GR-${m.student_id}`,
        division: m.division || (div !== 'All' ? div : 'A'),
        marks: m.marks_obtained !== null && m.marks_obtained !== undefined ? String(m.marks_obtained) : '',
        theory_marks: m.theory_marks !== null && m.theory_marks !== undefined ? String(m.theory_marks) : '',
        practical_marks: m.practical_marks !== null && m.practical_marks !== undefined ? String(m.practical_marks) : '',
        is_absent: m.is_absent || false,
        is_exempted: m.is_exempted || false,
        remarks: m.remarks || '',
      }));
      setMarkRows(rows);
    } catch {
      toast.error('Failed to load student roster.');
      setMarkRows([]);
    } finally {
      setLoadingMarks(false);
    }
  };

  const handleDivChangeForMarks = (div: string) => {
    setSelDiv(div);
    if (marksExam && marksSubject) {
      openMarksEntry(marksExam, marksSubject, div);
    }
  };

  const saveMarks = async () => {
    if (!marksExam || !marksSubject) return;
    const validRows = markRows.filter(r => r.student_id > 0);
    if (validRows.length === 0) { toast.error('No student rows to save.'); return; }
    setSavingMarks(true);
    try {
      const saved = await examService.bulkEnterMarks(
        marksExam.id, marksSubject.id,
        validRows.map(r => ({
          student_id: r.student_id,
          marks_obtained: r.is_absent ? undefined : (r.marks !== '' && r.marks !== null && r.marks !== undefined ? Number(r.marks) : undefined),
          theory_marks: r.theory_marks !== '' && r.theory_marks !== null && r.theory_marks !== undefined ? Number(r.theory_marks) : undefined,
          practical_marks: r.practical_marks !== '' && r.practical_marks !== null && r.practical_marks !== undefined ? Number(r.practical_marks) : undefined,
          is_absent: r.is_absent,
          is_exempted: r.is_exempted,
          remarks: r.remarks,
        }))
      );
      toast.success(`${saved} marks saved successfully!`);
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || err?.response?.data?.message || 'Failed to save marks.');
    }
    finally { setSavingMarks(false); }
  };

  const loadResult = async (exam: Exam, div: string = selDiv) => {
    setResultExam(exam);
    setLoadingResult(true);
    setClassResult(null);
    setSection('results');
    try {
      const summary = await examService.getClassResults(exam.id, div === 'All' ? undefined : div);
      setClassResult(summary);
    } catch {
      toast.error('No results compiled yet. Click Compile Results.');
    } finally {
      setLoadingResult(false);
    }
  };

  const handleDivChangeForResults = (div: string) => {
    setSelDiv(div);
    if (resultExam) {
      loadResult(resultExam, div);
    }
  };

  const compileResults = async () => {
    if (!resultExam) return;
    setCompilingResult(true);
    try {
      const count = await examService.compileResults(resultExam.id);
      toast.success(`Results compiled for ${count} students!`);
      const summary = await examService.getClassResults(resultExam.id, selDiv === 'All' ? undefined : selDiv);
      setClassResult(summary);
      loadStats();
    } catch (e: any) { toast.error(e?.response?.data?.detail || 'Compilation failed.'); }
    finally { setCompilingResult(false); }
  };

  const gradeColor = (g: string | undefined) => g ? (GRADE_COLORS[g] || '#6b7280') : '#6b7280';

  const markAllPresent = () => setMarkRows(p => p.map(r => ({ ...r, is_absent: false })));
  const markAllAbsent = () => setMarkRows(p => p.map(r => ({ ...r, is_absent: true, marks: '', theory_marks: '', practical_marks: '' })));

  const filteredMarkRows = markRows.filter(r => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      r.student_name.toLowerCase().includes(q) ||
      (r.gr_number && r.gr_number.toLowerCase().includes(q)) ||
      (r.roll_number && String(r.roll_number).includes(q))
    );
  });

  const filteredResults = classResult?.results.filter(r => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      r.student_name.toLowerCase().includes(q) ||
      (r.gr_number && r.gr_number.toLowerCase().includes(q))
    );
  }) || [];

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Examination & Results</h1>
          <p className={styles.pageSub}>परीक्षा व निकाल · Marks Entry, Grades & Class Merit List</p>
        </div>
      </div>

      {/* Main Tabs */}
      <div className={styles.tabBar}>
        {([
          { id: 'dashboard', label: 'Dashboard',    icon: <BarChart3 size={14}/> },
          { id: 'exams',     label: 'Exams',        icon: <BookOpen size={14}/> },
          { id: 'marks',     label: 'Marks Entry',  icon: <FileText size={14}/> },
          { id: 'results',   label: 'Results',      icon: <Trophy size={14}/> },
          { id: 'types',     label: 'Exam Types',   icon: <GraduationCap size={14}/> },
        ] as const).map(t => (
          <button key={t.id} className={`${styles.tab} ${section === t.id ? styles.tabActive : ''}`}
            onClick={() => setSection(t.id as Section)}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* ── DASHBOARD ──────────────────────────────────────── */}
      {section === 'dashboard' && stats && (
        <div className={styles.dashContent}>
          <div className={styles.kpiGrid}>
            {[
              { label: 'Total Exams',        value: stats.total_exams,            icon: <BookOpen size={20}/>, color: 'var(--color-primary)', action: () => setSection('exams') },
              { label: 'Results Declared',   value: stats.results_declared,       icon: <Trophy size={20}/>, color: 'var(--color-success)', action: () => setSection('results') },
              { label: 'Pending Results',    value: stats.pending_results,        icon: <AlertCircle size={20}/>, color: 'var(--color-warning)' },
              { label: 'Students Examined',  value: stats.total_students_examined, icon: <GraduationCap size={20}/>, color: 'var(--color-info)' },
            ].map(k => (
              <div key={k.label} className={`${styles.kpiCard} ${k.action ? styles.kpiClickable : ''}`}
                   style={{ '--kc': k.color } as React.CSSProperties}
                   onClick={k.action}>
                <div className={styles.kpiIcon} style={{ color: k.color }}>{k.icon}</div>
                <div className={styles.kpiVal}>{k.value}</div>
                <div className={styles.kpiLabel}>{k.label}</div>
                {k.action && <ArrowRight size={13} className={styles.kpiArrow}/>}
              </div>
            ))}
          </div>

          {/* Grade Scale Reference */}
          <div className={styles.gradeCard}>
            <h3 className={styles.gradeCardTitle}>Official Grade Scale Reference</h3>
            <div className={styles.gradeScale}>
              {[['A+','90–100'],['A','80–89'],['B+','70–79'],['B','60–69'],['C','50–59'],['D','40–49'],['E','35–39'],['F','<35']].map(([g, r]) => (
                <div key={g} className={styles.gradeItem} style={{ '--gc': gradeColor(g) } as React.CSSProperties}>
                  <span className={styles.gradeLetter}>{g}</span>
                  <span className={styles.gradeRange}>{r}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── EXAMS ─────────────────────────────────────────── */}
      {section === 'exams' && (
        <div className={styles.examContent}>
          <div className={styles.filterRow}>
            <div className={styles.filterGroup}>
              <span className={styles.filterLabel}>Standard:</span>
              <div className={styles.stdTabs}>
                {STANDARDS.map(s => (
                  <button key={s} className={`${styles.stdTab} ${selStd === s ? styles.stdTabActive : ''}`}
                    onClick={() => setSelStd(s)}>{s === 'All' ? 'All Standards' : `Std ${s}`}</button>
                ))}
              </div>
            </div>

            <div className={styles.toolbar}>
              <button className={styles.iconBtn} onClick={loadExams} title="Refresh"><RefreshCw size={14}/></button>
              <PermissionGate permission="exam.manage">
                <button className={styles.addBtn} onClick={() => openCreateExamModal(selStd)}>
                  <Plus size={15}/> Create Exam
                </button>
              </PermissionGate>
            </div>
          </div>

          {loadingExams ? <div className={styles.loadingSkel}/> :
           exams.length === 0 ? (
            <div className={styles.emptyState}><GraduationCap size={64}/><p>No exams created for Std {selStd} yet.</p></div>
           ) : (
            <div className={styles.examList}>
              {exams.map(exam => (
                <div key={exam.id} className={styles.examCard}>
                  <div className={styles.examCardTop}>
                    <div className={styles.examMeta}>
                      <div className={styles.examName}>{exam.exam_type?.name || `Exam #${exam.id}`}</div>
                      {exam.exam_type?.name_marathi && <div className={styles.examNameMr}>{exam.exam_type.name_marathi}</div>}
                      <div className={styles.examDates}>
                        Std {exam.standard}
                        {exam.exam_date_from && ` · ${new Date(exam.exam_date_from).toLocaleDateString('en-IN')}`}
                        {exam.exam_date_to && ` – ${new Date(exam.exam_date_to).toLocaleDateString('en-IN')}`}
                      </div>
                    </div>
                    <div className={styles.examBadge}>
                      {exam.result_declared
                        ? <span className={styles.tagSuccess}>Results Declared</span>
                        : <span className={styles.tagWarning}>Pending Entry</span>}
                    </div>
                  </div>

                  {/* Subjects Chips */}
                  <div className={styles.subjectChips}>
                    {exam.subjects.map(s => (
                      <button key={s.id} className={styles.subjectChip}
                        onClick={() => openMarksEntry(exam, s)}>
                        <FileText size={11}/> {s.subject_name}
                        <span className={styles.chipMax}>/{s.max_marks}</span>
                      </button>
                    ))}
                  </div>

                  <div className={styles.examActions}>
                    <button className={styles.miniBtn} onClick={() => loadResult(exam)}>
                      <Trophy size={12}/> View / Compile Results
                    </button>
                  </div>
                </div>
              ))}
            </div>
           )}
        </div>
      )}

      {/* ── MARKS ENTRY ──────────────────────────────────── */}
      {section === 'marks' && (
        <div className={styles.marksContent}>
          {!marksExam || !marksSubject ? (
            <div className={styles.noMarksState}>
              <FileText size={64}/>
              <p>Select an exam subject from the <strong>Exams</strong> tab to open marks entry.</p>
              <button className={styles.addBtn} onClick={() => setSection('exams')}>Go to Exams</button>
            </div>
          ) : (
            <>
              <div className={styles.filterRow}>
                <div>
                  <div className={styles.marksTitle}>{marksExam.exam_type?.name} — {marksSubject.subject_name}</div>
                  <div className={styles.marksSub}>
                    Std {marksExam.standard} · Max: {marksSubject.max_marks} · Passing: {marksSubject.passing_marks}
                  </div>
                </div>

                <div className={styles.filterGroup}>
                  <span className={styles.filterLabel}>Section / Division:</span>
                  <div className={styles.divTabs}>
                    {DIVISIONS.map(d => (
                      <button key={d} className={`${styles.divTab} ${selDiv === d ? styles.divTabActive : ''}`}
                        onClick={() => handleDivChangeForMarks(d)}>
                        {d === 'All' ? 'All Divs' : `Div ${d}`}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className={styles.marksHeader}>
                <div className={styles.filterGroup}>
                  <div className={styles.searchBox}>
                    <Search size={14} color="var(--color-text-muted)"/>
                    <input
                      className={styles.searchInput}
                      placeholder="Search student name / GR / Roll..."
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                    />
                  </div>
                  <span className={styles.rowCount}>{filteredMarkRows.length} students</span>
                </div>

                <div className={styles.marksActions}>
                  <button className={styles.miniBtn} onClick={markAllPresent} title="Mark All Present">
                    <UserCheck size={13}/> All Present
                  </button>
                  <button className={styles.miniBtn} onClick={markAllAbsent} title="Mark All Absent">
                    <UserX size={13}/> All Absent
                  </button>
                  <button className={styles.iconBtn} onClick={() => { setMarksExam(null); setMarksSubject(null); }} title="Close">
                    <X size={14}/>
                  </button>
                  <PermissionGate permission="exam.marks.enter">
                    <button className={styles.addBtn} onClick={saveMarks} disabled={savingMarks}>
                      {savingMarks ? <span className={styles.spin}/> : <Check size={14}/>}
                      <span>Save Marks</span>
                    </button>
                  </PermissionGate>
                </div>
              </div>

              {loadingMarks ? <div className={styles.loadingSkel}/> : (
                <div className={styles.marksTable}>
                  <table className={styles.table}>
                    <thead><tr>
                      <th>Roll #</th><th>GR Number</th><th>Student Name</th><th>Div</th>
                      <th>Marks (/{marksSubject.max_marks})</th><th>Absent</th><th>Exempted</th><th>Remarks</th>
                    </tr></thead>
                    <tbody>
                      {filteredMarkRows.length === 0 ? (
                        <tr><td colSpan={8} className={styles.emptyCell}>
                          <div className={styles.emptyState}><FileText size={40}/><p>No students found for Std {marksExam.standard} {selDiv !== 'All' ? `Div ${selDiv}` : ''}</p></div>
                        </td></tr>
                      ) : filteredMarkRows.map((row, i) => (
                        <tr key={row.student_id || i} className={`${styles.tr} ${row.is_absent ? styles.absentRow : ''}`}>
                          <td>{row.roll_number || i + 1}</td>
                          <td><strong>{row.gr_number}</strong></td>
                          <td>{row.student_name}</td>
                          <td><span className={styles.tagMuted}>{row.division || selDiv}</span></td>
                          <td>
                            <input className={styles.markInput} type="number" value={row.marks} placeholder="0"
                              min="0" max={marksSubject.max_marks} disabled={row.is_absent || row.is_exempted}
                              onChange={e => setMarkRows(p => p.map(r => r.student_id === row.student_id ? { ...r, marks: e.target.value } : r))}/>
                          </td>
                          <td>
                            <input type="checkbox" checked={row.is_absent}
                              onChange={e => setMarkRows(p => p.map(r => r.student_id === row.student_id ? { ...r, is_absent: e.target.checked, marks: '', is_exempted: false } : r))}/>
                          </td>
                          <td>
                            <input type="checkbox" checked={row.is_exempted}
                              onChange={e => setMarkRows(p => p.map(r => r.student_id === row.student_id ? { ...r, is_exempted: e.target.checked, is_absent: false } : r))}/>
                          </td>
                          <td>
                            <input className={styles.markInput} value={row.remarks} placeholder="Optional"
                              onChange={e => setMarkRows(p => p.map(r => r.student_id === row.student_id ? { ...r, remarks: e.target.value } : r))}/>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ── RESULTS & MERIT LIST ──────────────────────────── */}
      {section === 'results' && (
        <div className={styles.resultsContent}>
          {!resultExam ? (
            <div className={styles.noMarksState}>
              <Trophy size={64}/>
              <p>Select an exam from the <strong>Exams</strong> tab to view class results & merit list.</p>
              <button className={styles.addBtn} onClick={() => setSection('exams')}>Go to Exams</button>
            </div>
          ) : (
            <>
              <div className={styles.filterRow}>
                <div>
                  <div className={styles.marksTitle}>{resultExam.exam_type?.name} — Std {resultExam.standard} Merit List</div>
                  {resultExam.result_declared && <div className={styles.marksSub}>Results declared on {resultExam.result_date ? new Date(resultExam.result_date).toLocaleDateString('en-IN') : '—'}</div>}
                </div>

                <div className={styles.filterGroup}>
                  <span className={styles.filterLabel}>Section / Division:</span>
                  <div className={styles.divTabs}>
                    {DIVISIONS.map(d => (
                      <button key={d} className={`${styles.divTab} ${selDiv === d ? styles.divTabActive : ''}`}
                        onClick={() => handleDivChangeForResults(d)}>
                        {d === 'All' ? 'All Divs' : `Div ${d}`}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className={styles.resultHeader}>
                <div className={styles.searchBox}>
                  <Search size={14} color="var(--color-text-muted)"/>
                  <input
                    className={styles.searchInput}
                    placeholder="Search student or GR..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                  />
                </div>

                <div className={styles.marksActions}>
                  <button className={styles.iconBtn} onClick={() => { setResultExam(null); setClassResult(null); }} title="Close"><X size={14}/></button>
                  <PermissionGate permission="exam.results.compile">
                    <button className={styles.compileBtn} onClick={compileResults} disabled={compilingResult}>
                      {compilingResult ? <span className={styles.spin}/> : <Trophy size={14}/>}
                      <span>{compilingResult ? 'Compiling...' : 'Compile Results'}</span>
                    </button>
                  </PermissionGate>
                </div>
              </div>

              {loadingResult ? <div className={styles.loadingSkel}/> :
               !classResult ? (
                <div className={styles.emptyState}><AlertCircle size={48}/><p>Results not yet compiled. Click "Compile Results" to generate merit list.</p></div>
               ) : (
                <>
                  {/* Summary KPI Bar */}
                  <div className={styles.resultSummary}>
                    {[
                      { label: 'Total Students', value: classResult.total_students, color: 'var(--color-primary)' },
                      { label: 'Appeared',        value: classResult.appeared,       color: 'var(--color-info)' },
                      { label: 'Passed',          value: classResult.passed,         color: 'var(--color-success)' },
                      { label: 'Failed',          value: classResult.failed,         color: 'var(--color-danger)' },
                      { label: 'Pass %',          value: `${Number(classResult.pass_percentage).toFixed(1)}%`, color: 'var(--color-success)' },
                      { label: 'Class Avg',       value: `${Number(classResult.class_average).toFixed(1)}%`,  color: 'var(--color-warning)' },
                      { label: 'Highest',         value: `${Number(classResult.highest_marks).toFixed(1)}%`,  color: 'var(--color-success)' },
                      { label: 'Lowest',          value: `${Number(classResult.lowest_marks).toFixed(1)}%`,   color: 'var(--color-danger)' },
                    ].map(k => (
                      <div key={k.label} className={styles.summaryCard} style={{ '--sc': k.color } as React.CSSProperties}>
                        <div className={styles.summaryVal}>{k.value}</div>
                        <div className={styles.summaryLabel}>{k.label}</div>
                      </div>
                    ))}
                  </div>

                  {/* Merit List Rows */}
                  <div className={styles.meritList}>
                    <div className={styles.meritHeader}>
                      Class Merit List — {filteredResults.length} Students {selDiv !== 'All' ? `(Div ${selDiv})` : ''}
                    </div>

                    {filteredResults.map((student) => (
                      <div key={student.student_id} className={`${styles.meritItem} ${student.result === 'fail' ? styles.meritFail : ''}`}>
                        <div className={styles.meritLeft}>
                          <div className={styles.rankBadge}>
                            {student.rank === 1 ? '🥇' : student.rank === 2 ? '🥈' : student.rank === 3 ? '🥉' : `#${student.rank}`}
                          </div>
                          <div>
                            <div className={styles.meritName}>{student.student_name}</div>
                            <div className={styles.meritMeta}>
                              GR: <strong>{student.gr_number}</strong> · Std {student.standard}-{student.division || 'A'} · {student.subjects_passed} Passed / {student.subjects_failed} Failed
                            </div>
                          </div>
                        </div>

                        <div className={styles.meritRight}>
                          <span className={styles.meritPct}>{Number(student.percentage).toFixed(1)}%</span>
                          <span className={styles.gradeChip} style={{ background: gradeColor(student.grade), color: 'white' }}>{student.grade}</span>
                          <span className={`${styles.tag} ${student.result === 'pass' ? styles.tagSuccess : student.result === 'fail' ? styles.tagDanger : styles.tagMuted}`}>{student.result}</span>
                          <button className={styles.miniBtn} onClick={() => setPrintStudent(student)} title="Print Report Card">
                            <Printer size={12}/> Report Card
                          </button>
                          <button className={styles.expandBtn} onClick={() => setExpandedStudent(expandedStudent === student.student_id ? null : student.student_id)}>
                            {expandedStudent === student.student_id ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}
                          </button>
                        </div>

                        {expandedStudent === student.student_id && (
                          <div className={styles.subjectBreakdown}>
                            {student.subjects.map(s => (
                              <div key={s.subject_id} className={`${styles.breakdownRow} ${s.status === 'fail' ? styles.breakdownFail : s.status === 'absent' ? styles.breakdownAbsent : ''}`}>
                                <span className={styles.breakdownSubject}>{s.subject_name}</span>
                                <span className={styles.breakdownMarks}>
                                  {s.is_absent ? 'ABSENT' : s.marks_obtained !== null && s.marks_obtained !== undefined ? `${s.marks_obtained} / ${s.max_marks}` : '—'}
                                </span>
                                {s.grade && <span className={styles.gradeChip} style={{ background: gradeColor(s.grade), color: 'white' }}>{s.grade}</span>}
                                <span className={`${styles.tag} ${s.status === 'pass' ? styles.tagSuccess : s.status === 'fail' ? styles.tagDanger : s.status === 'absent' ? styles.tagDanger : styles.tagMuted}`}>{s.status}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </>
               )}
            </>
          )}
        </div>
      )}

      {/* ── EXAM TYPES ───────────────────────────────────── */}
      {section === 'types' && (
        <div className={styles.typesContent}>
          <div className={styles.toolbar}>
            <span className={styles.muted}>{examTypes.length} exam types configured</span>
            <PermissionGate permission="exam.manage">
              <button className={styles.addBtn} onClick={() => setShowTypeModal(true)}><Plus size={15}/> Add Type</button>
            </PermissionGate>
          </div>
          <div className={styles.typeGrid}>
            {examTypes.map(t => (
              <div key={t.id} className={styles.typeCard}>
                <div className={styles.typeSeq}>#{t.sequence}</div>
                <div className={styles.typeName}>{t.name}</div>
                {t.name_marathi && <div className={styles.typeNameMr}>{t.name_marathi}</div>}
                <div className={styles.typeMeta}>
                  <span>Max: {t.max_marks}</span>
                  <span>Pass: {t.passing_marks}</span>
                  <span>Weight: {t.weightage}%</span>
                </div>
              </div>
            ))}
            {examTypes.length === 0 && <div className={styles.emptyMsg}>No exam types added yet.</div>}
          </div>
        </div>
      )}

      {/* ════ Create Exam Modal ════ */}
      {showExamModal && (
        <div className={styles.overlay} onClick={() => setShowExamModal(false)}>
          <div className={`${styles.modal} ${styles.wideModal}`} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Create Exam — Std {newExam.standard || selStd}</h3>
              <button className={styles.modalClose} onClick={() => setShowExamModal(false)}><X size={16}/></button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.mfRow}>
                <div className={styles.mf}>
                  <label className={styles.ml}>Exam Type *</label>
                  <select className={styles.mi} value={newExam.exam_type_id} onChange={e => {
                    const val = e.target.value;
                    setNewExam(p => ({ ...p, exam_type_id: val }));
                    loadStandardSubjects(newExam.standard || selStd, val);
                  }}>
                    <option value="">-- Select Exam Type --</option>
                    {examTypes.map(t=>(
                      <option key={t.id} value={t.id}>
                        {t.name} {t.name_marathi ? `(${t.name_marathi})` : ''}
                      </option>
                    ))}
                  </select>
                  {examTypes.length === 0 && (
                    <div className={styles.mutedWarn}>No exam types found. Default types will be seeded automatically.</div>
                  )}
                </div>
                <div className={styles.mf}>
                  <label className={styles.ml}>Standard</label>
                  <select className={styles.mi} value={newExam.standard} onChange={e => {
                    const val = e.target.value;
                    setNewExam(p => ({ ...p, standard: val }));
                    loadStandardSubjects(val, newExam.exam_type_id);
                  }}>
                    {STANDARDS.filter(s => s !== 'All').map(s=><option key={s} value={s}>Std {s}</option>)}
                  </select>
                </div>
              </div>
              <div className={styles.mfRow}>
                <div className={styles.mf}><label className={styles.ml}>Date From</label><input type="date" className={styles.mi} value={newExam.exam_date_from} onChange={e=>setNewExam(p=>({...p,exam_date_from:e.target.value}))}/></div>
                <div className={styles.mf}><label className={styles.ml}>Date To</label><input type="date" className={styles.mi} value={newExam.exam_date_to} onChange={e=>setNewExam(p=>({...p,exam_date_to:e.target.value}))}/></div>
              </div>

              <div className={styles.subjectsSection}>
                <div className={styles.subjectsSectionHeader}>
                  <span className={styles.ml}>Subjects Configuration ({examSubjects.length})</span>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button className={styles.miniBtn} type="button" onClick={() => loadStandardSubjects(newExam.standard || selStd, newExam.exam_type_id)}>
                      <RefreshCw size={12}/> Auto-fill Standard Subjects
                    </button>
                    <button className={styles.miniBtn} type="button" onClick={addSubjectRow}>
                      <Plus size={12}/> Add Subject
                    </button>
                  </div>
                </div>
                <div className={styles.subjectRows}>
                  <div className={styles.subjectRowHeader}>
                    <span className={styles.rowColLabelFlex}>Subject Name</span>
                    <span className={styles.rowColLabelNum}>Max Marks</span>
                    <span className={styles.rowColLabelNum}>Pass Marks</span>
                    {examSubjects.length > 1 && <span className={styles.rowColLabelAction}>&nbsp;</span>}
                  </div>
                  {examSubjects.map((s, i) => {
                    const isPredefined = COMMON_SUBJECTS.includes(s.subject_name);
                    const isCustomMode = !isPredefined && s.subject_name !== '';
                    return (
                      <div key={i} className={styles.subjectRow}>
                        <div className={styles.subjInputGroup}>
                          <select
                            className={`${styles.mi} ${styles.subjSel}`}
                            value={isCustomMode ? 'CUSTOM_INPUT' : s.subject_name}
                            onChange={e => {
                              const val = e.target.value;
                              if (val === 'CUSTOM_INPUT') {
                                updateSubjectRow(i, 'subject_name', '');
                              } else {
                                updateSubjectRow(i, 'subject_name', val);
                              }
                            }}
                          >
                            <option value="">Select Subject</option>
                            {COMMON_SUBJECTS.map(cs => (
                              <option key={cs} value={cs}>{cs}</option>
                            ))}
                            <option value="CUSTOM_INPUT">✏️ Custom / Other Subject...</option>
                          </select>

                          {(isCustomMode || s.subject_name === '') && (
                            <input
                              className={`${styles.mi} ${styles.customSubjInput}`}
                              placeholder="Type custom subject name..."
                              value={s.subject_name}
                              onChange={e => updateSubjectRow(i, 'subject_name', e.target.value)}
                            />
                          )}
                        </div>

                        <input
                          className={`${styles.mi} ${styles.numMi}`}
                          placeholder="100"
                          type="number"
                          value={s.max_marks}
                          onChange={e => updateSubjectRow(i, 'max_marks', e.target.value)}
                        />

                        <input
                          className={`${styles.mi} ${styles.numMi}`}
                          placeholder="35"
                          type="number"
                          value={s.passing_marks}
                          onChange={e => updateSubjectRow(i, 'passing_marks', e.target.value)}
                        />

                        {examSubjects.length > 1 && (
                          <button className={styles.delBtn} onClick={() => removeSubjectRow(i)} title="Remove subject">
                            <X size={14}/>
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
            <div className={styles.modalFooter}>
              <button className={styles.cancelBtn} onClick={() => setShowExamModal(false)}>Cancel</button>
              <button className={styles.submitBtn} onClick={saveExam} disabled={savingExam}>
                {savingExam ? <span className={styles.spin}/> : <Check size={14}/>}
                <span>Create Exam</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ════ Exam Type Modal ════ */}
      {showTypeModal && (
        <div className={styles.overlay} onClick={() => setShowTypeModal(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Add Exam Type</h3>
              <button className={styles.modalClose} onClick={() => setShowTypeModal(false)}><X size={16}/></button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.mf}><label className={styles.ml}>Name *</label><input className={styles.mi} value={newType.name} onChange={e=>setNewType(p=>({...p,name:e.target.value}))} placeholder="e.g. Unit Test 1"/></div>
              <div className={styles.mf}><label className={styles.ml}>Marathi Name</label><input className={styles.mi} value={newType.name_marathi} onChange={e=>setNewType(p=>({...p,name_marathi:e.target.value}))} placeholder="एकक चाचणी १"/></div>
              <div className={styles.mfRow}>
                <div className={styles.mf}><label className={styles.ml}>Sequence</label><input type="number" className={styles.mi} value={newType.sequence} onChange={e=>setNewType(p=>({...p,sequence:Number(e.target.value)}))}/></div>
                <div className={styles.mf}><label className={styles.ml}>Max Marks</label><input type="number" className={styles.mi} value={newType.max_marks} onChange={e=>setNewType(p=>({...p,max_marks:Number(e.target.value)}))}/></div>
                <div className={styles.mf}><label className={styles.ml}>Passing Marks</label><input type="number" className={styles.mi} value={newType.passing_marks} onChange={e=>setNewType(p=>({...p,passing_marks:Number(e.target.value)}))}/></div>
                <div className={styles.mf}><label className={styles.ml}>Weightage %</label><input type="number" className={styles.mi} value={newType.weightage} onChange={e=>setNewType(p=>({...p,weightage:Number(e.target.value)}))}/></div>
              </div>
            </div>
            <div className={styles.modalFooter}>
              <button className={styles.cancelBtn} onClick={() => setShowTypeModal(false)}>Cancel</button>
              <button className={styles.submitBtn} onClick={saveExamType} disabled={savingType}>
                {savingType ? <span className={styles.spin}/> : <Check size={14}/>}
                <span>Add</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ════ Student Report Card Preview Modal ════ */}
      {printStudent && (
        <div className={styles.overlay} onClick={() => setPrintStudent(null)}>
          <div className={styles.printModal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Official Report Card Preview</h3>
              <div className={styles.filterGroup}>
                <button className={styles.printActionBtn} onClick={() => window.print()}>
                  <Printer size={15}/> Print Report Card
                </button>
                <button className={styles.modalClose} onClick={() => setPrintStudent(null)}><X size={16}/></button>
              </div>
            </div>

            <div className={styles.reportCardPrint}>
              <div className={styles.reportHeader}>
                <div className={styles.reportSchoolName}>VIDYASETU ACADEMIC ERP</div>
                <div className={styles.reportSub}>Government Recognized School System · Maharashtra</div>
                <div className={styles.reportTitle}>{resultExam?.exam_type?.name || 'EXAMINATION'} REPORT CARD</div>
              </div>

              <div className={styles.studentInfoGrid}>
                <div className={styles.infoRow}><span className={styles.infoLabel}>Student Name:</span><span className={styles.infoVal}>{printStudent.student_name}</span></div>
                <div className={styles.infoRow}><span className={styles.infoLabel}>GR Number:</span><span className={styles.infoVal}>{printStudent.gr_number}</span></div>
                <div className={styles.infoRow}><span className={styles.infoLabel}>Class / Div:</span><span className={styles.infoVal}>Std {printStudent.standard} - {printStudent.division || 'A'}</span></div>
                <div className={styles.infoRow}><span className={styles.infoLabel}>Rank in Class:</span><span className={styles.infoVal}>#{printStudent.rank || '—'}</span></div>
              </div>

              <table className={styles.reportTable}>
                <thead>
                  <tr>
                    <th>Subject</th>
                    <th>Max Marks</th>
                    <th>Passing</th>
                    <th>Obtained</th>
                    <th>Grade</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {printStudent.subjects.map((subj) => (
                    <tr key={subj.subject_id}>
                      <td><strong>{subj.subject_name}</strong> {subj.subject_name_marathi && `(${subj.subject_name_marathi})`}</td>
                      <td>{subj.max_marks}</td>
                      <td>{subj.passing_marks}</td>
                      <td><strong>{subj.is_absent ? 'ABSENT' : subj.marks_obtained ?? '—'}</strong></td>
                      <td><span className={styles.gradeChip} style={{ background: gradeColor(subj.grade), color: 'white' }}>{subj.grade || '—'}</span></td>
                      <td><strong style={{ color: subj.status === 'pass' ? '#10b981' : '#ef4444' }}>{subj.status.toUpperCase()}</strong></td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className={styles.studentInfoGrid}>
                <div className={styles.infoRow}><span className={styles.infoLabel}>Total Marks:</span><span className={styles.infoVal}>{printStudent.total_marks} / {printStudent.max_marks}</span></div>
                <div className={styles.infoRow}><span className={styles.infoLabel}>Percentage:</span><span className={styles.infoVal}>{Number(printStudent.percentage).toFixed(2)}%</span></div>
                <div className={styles.infoRow}><span className={styles.infoLabel}>Overall Grade:</span><span className={styles.infoVal}>{printStudent.grade}</span></div>
                <div className={styles.infoRow}><span className={styles.infoLabel}>Final Result:</span><span className={styles.infoVal} style={{ color: printStudent.result === 'pass' ? '#10b981' : '#ef4444' }}>{printStudent.result.toUpperCase()}</span></div>
              </div>

              <div className={styles.reportFooter}>
                <div className={styles.sigBlock}>
                  <div className={styles.sigLine}/>
                  <div className={styles.sigTitle}>Class Teacher Signature</div>
                </div>
                <div className={styles.sigBlock}>
                  <div className={styles.sigLine}/>
                  <div className={styles.sigTitle}>Principal Signature & Stamp</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
