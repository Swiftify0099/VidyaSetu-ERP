/**
 * VidyaSetu ERP — Professional Teacher & Class Teacher Workspace
 * ================================================================
 * Industrial Grade Teacher Workspace.
 * Designed with CSS Design Tokens, Lucide vector icons, and zero duplicate navigation.
 */
import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Users, CalendarDays, ClipboardList, BookOpen,
  Bell, UserCheck, X, Search, Plus,
  Palmtree, LayoutDashboard, CheckCircle2, RefreshCw, Brain, Trophy, Target, Clock, Trash2, Eye,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import styles from './TeacherPortalPage.module.css';
import { TeacherDashboardHero } from '../../components/teacher/dashboard/TeacherDashboardHero';

type Tab = 'dashboard' | 'timetable' | 'students' | 'attendance' | 'notices' | 'leaves' | 'profile' | 'homework' | 'materials' | 'videos' | 'marks' | 'ai_tools' | 'assessments';

const TEACHER_TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={15} /> },
  { id: 'attendance', label: 'Attendance', icon: <ClipboardList size={15} /> },
  { id: 'timetable', label: 'Timetable', icon: <CalendarDays size={15} /> },
  { id: 'students', label: 'Students', icon: <Users size={15} /> },
  { id: 'homework', label: 'Homework', icon: <BookOpen size={15} /> },
  { id: 'assessments', label: 'Assessments', icon: <Brain size={15} /> },
  { id: 'materials', label: 'Study Materials', icon: <Bell size={15} /> },
  { id: 'videos', label: 'Video Lectures', icon: <UserCheck size={15} /> },
  { id: 'marks', label: 'Marks Entry', icon: <CheckCircle2 size={15} /> },
  { id: 'notices', label: 'Notices', icon: <Bell size={15} /> },
  { id: 'leaves', label: 'Leave', icon: <Palmtree size={15} /> },
  { id: 'ai_tools', label: 'AI Tools', icon: <X size={15} /> },
  { id: 'profile', label: 'My Profile', icon: <UserCheck size={15} /> },
];

interface TeacherProfile { teacher: any; stats: any; }

export default function TeacherPortalPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = (searchParams.get('tab') as Tab) || 'dashboard';
  const [tab, setTabState] = useState<Tab>(tabParam);

  useEffect(() => {
    const param = searchParams.get('tab') as Tab;
    if (param && param !== tab) {
      setTabState(param);
    }
  }, [searchParams]);

  const setTab = (t: Tab) => {
    setTabState(t);
    setSearchParams({ tab: t });
  };

  const [profile, setProfile] = useState<TeacherProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Timetable
  const [timetable, setTimetable] = useState<{ today: any[]; full_week: any[] }>({ today: [], full_week: [] });

  // Students
  const [students, setStudents] = useState<any[]>([]);
  const [studentSearch, setStudentSearch] = useState('');
  const [stdFilter, setStdFilter] = useState('');

  // Attendance
  const [attStudents, setAttStudents] = useState<any[]>([]);
  const [attMap, setAttMap] = useState<Record<number, string>>({});
  const [attRemarksMap, setAttRemarksMap] = useState<Record<number, string>>({});
  const [attStd, setAttStd] = useState('');
  const [attDiv, setAttDiv] = useState('');
  const [attDate, setAttDate] = useState(new Date().toISOString().split('T')[0]);
  const [savingAtt, setSavingAtt] = useState(false);

  // Homework
  const [homeworkList, setHomeworkList] = useState<any[]>([]);
  const [hwForm, setHwForm] = useState({ standard: '', division: '', subject: '', title: '', description: '', due_date: '', });
  const [savingHw, setSavingHw] = useState(false);

  // Materials
  const [materials, setMaterials] = useState<any[]>([]);
  const [matForm, setMatForm] = useState({ standard: '', subject: '', title: '', description: '', material_type: 'notes', });
  const [savingMat, setSavingMat] = useState(false);

  // Videos
  const [videos, setVideos] = useState<any[]>([]);
  const [vidForm, setVidForm] = useState({ standard: '', subject: '', title: '', video_url: '', description: '', });
  const [savingVid, setSavingVid] = useState(false);

  // Marks Entry
  const [marksExams, setMarksExams] = useState<any[]>([]);
  const [selectedMarksExam, setSelectedMarksExam] = useState<any>(null);
  const [marksStudents, setMarksStudents] = useState<any[]>([]);
  const [marksMap, setMarksMap] = useState<Record<number, string>>({});
  const [savingMarks, setSavingMarks] = useState(false);
  const [marksSubject, setMarksSubject] = useState('');


  // Notices
  const [notices, setNotices] = useState<any[]>([]);

  // Leaves
  const [leaves, setLeaves] = useState<any[]>([]);
  const [showLeaveForm, setShowLeaveForm] = useState(false);
  const [leaveForm, setLeaveForm] = useState({ leave_type: 'casual', start_date: '', end_date: '', reason: '' });
  const [savingLeave, setSavingLeave] = useState(false);

  // Assessments
  const [teacherAssessments, setTeacherAssessments] = useState<any[]>([]);
  const [viewingResultsId, setViewingResultsId] = useState<number | null>(null);
  const [assessmentResults, setAssessmentResults] = useState<any>(null);
  const [savingAssessment, setSavingAssessment] = useState(false);
  const [asmForm, setAsmForm] = useState({
    title: '', subject: '', topic: '', class_standard: '9', division: '', duration_minutes: 15, passing_marks: 4, instructions: '',
    start_date: new Date().toISOString().split('T')[0],
    end_date: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
  });
  const [asmQuestions, setAsmQuestions] = useState<Array<{ question: string; options: string[]; correct_index: number; marks: number }>>([{ question: '', options: ['', '', '', ''], correct_index: 0, marks: 1 }]);

  // Load profile
  const loadProfile = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/teacher-portal/me');
      setProfile(res.data.data);
      const rawClasses = res.data.data?.teacher?.classes_assigned;
      const classArr = typeof rawClasses === 'string'
        ? rawClasses.split(',').map((c: string) => c.trim()).filter(Boolean)
        : Array.isArray(rawClasses)
          ? rawClasses
          : ['9', '10'];

      const initialStd = classArr[0] || '9';
      setAttStd(prev => prev || initialStd);
      setStdFilter(prev => prev || initialStd);
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || 'Failed to load profile');
    } finally { setLoading(false); }
  }, []);

  const loadTimetable = useCallback(async () => {
    try {
      const res = await api.get('/teacher-portal/timetable');
      setTimetable(res.data.data);
    } catch { toast.error('Failed to load timetable'); }
  }, []);

  const loadStudents = useCallback(async () => {
    try {
      const params: Record<string, string> = {};
      if (stdFilter) params.standard = stdFilter;
      if (studentSearch) params.search = studentSearch;
      const res = await api.get('/teacher-portal/students', { params });
      setStudents(res.data.data?.students || []);
    } catch { toast.error('Failed to load students'); }
  }, [stdFilter, studentSearch]);

  const loadAttStudents = useCallback(async () => {
    const targetStd = attStd || '9';
    try {
      const params: Record<string, string> = { standard: targetStd };
      if (attDiv) params.division = attDiv;
      const res = await api.get('/teacher-portal/students', { params });
      const studs = res.data.data?.students || [];
      setAttStudents(studs);
      const map: Record<number, string> = {};
      studs.forEach((s: any) => { map[s.id] = 'present'; });
      setAttMap(map);
    } catch { toast.error('Failed to load students'); }
  }, [attStd, attDiv]);

  const loadNotices = useCallback(async () => {
    try {
      const res = await api.get('/teacher-portal/notices');
      setNotices(res.data.data?.notices || []);
    } catch { toast.error('Failed to load notices'); }
  }, []);

  const loadLeaves = useCallback(async () => {
    try {
      const res = await api.get('/teacher-portal/leaves');
      setLeaves(res.data.data?.leaves || []);
    } catch { toast.error('Failed to load leaves'); }
  }, []);

  useEffect(() => { loadProfile(); }, [loadProfile]);

  useEffect(() => {
    if (tab === 'timetable') loadTimetable();
    else if (tab === 'students') loadStudents();
    else if (tab === 'attendance') loadAttStudents();
    else if (tab === 'notices') loadNotices();
    else if (tab === 'leaves') loadLeaves();
    else if (tab === 'homework') loadHomework();
    else if (tab === 'materials') loadMaterials();
    else if (tab === 'videos') loadVideos();
    else if (tab === 'marks') loadMarksExams();
    else if (tab === 'assessments') loadTeacherAssessments();
  }, [tab, loadTimetable, loadStudents, loadAttStudents, loadNotices, loadLeaves]);

  const loadHomework = async () => {
    try {
      const res = await api.get('/teacher-portal/homework');
      setHomeworkList(res.data.data?.homework || res.data.data || []);
    } catch { setHomeworkList([]); }
  };

  const loadTeacherAssessments = async () => {
    try {
      const res = await api.get('/teacher-portal/assessments');
      setTeacherAssessments(res.data.data?.assessments || []);
    } catch { setTeacherAssessments([]); }
  };

  const loadAssessmentResults = async (id: number) => {
    try {
      const res = await api.get(`/teacher-portal/assessments/${id}/results`);
      setAssessmentResults(res.data.data);
      setViewingResultsId(id);
    } catch { toast.error('Failed to load results'); }
  };

  const handleCreateAssessment = async (e: React.FormEvent) => {
    e.preventDefault();
    const emptyQ = asmQuestions.some(q => !q.question.trim() || q.options.some(o => !o.trim()));
    if (emptyQ) { toast.error('Fill all questions and options.'); return; }
    setSavingAssessment(true);
    try {
      await api.post('/teacher-portal/assessments', {
        ...asmForm,
        duration_minutes: Number(asmForm.duration_minutes),
        passing_marks: Number(asmForm.passing_marks),
        questions: asmQuestions,
      });
      toast.success('Assessment created and published to students!');
      loadTeacherAssessments();
      setAsmForm({ title: '', subject: '', topic: '', class_standard: '9', division: '', duration_minutes: 15, passing_marks: 4, instructions: '', start_date: new Date().toISOString().split('T')[0], end_date: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0] });
      setAsmQuestions([{ question: '', options: ['', '', '', ''], correct_index: 0, marks: 1 }]);
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Failed to create assessment');
    } finally { setSavingAssessment(false); }
  };

  const handleDeleteAssessment = async (id: number) => {
    if (!window.confirm('Deactivate this assessment?')) return;
    try {
      await api.delete('/teacher-portal/assessments/' + id);
      toast.success('Assessment deactivated.');
      loadTeacherAssessments();
    } catch { toast.error('Failed to deactivate'); }
  };

  const loadMaterials = async () => {
    try {
      const res = await api.get('/teacher-portal/materials');
      setMaterials(res.data.data?.materials || res.data.data || []);
    } catch { setMaterials([]); }
  };

  const loadVideos = async () => {
    try {
      const res = await api.get('/teacher-portal/videos');
      setVideos(res.data.data?.videos || res.data.data || []);
    } catch { setVideos([]); }
  };

  const loadMarksExams = async () => {
    try {
      const res = await api.get('/teacher-portal/exams');
      setMarksExams(res.data.data?.exams || res.data.data || []);
    } catch { setMarksExams([]); }
  };

  const loadMarksStudents = async (examId: number, std: string, div?: string) => {
    try {
      const res = await api.get('/teacher-portal/students', { params: { standard: std, division: div || undefined } });
      const studs = res.data.data?.students || [];
      setMarksStudents(studs);
      const map: Record<number, string> = {};
      studs.forEach((s: any) => { map[s.id] = ''; });
      setMarksMap(map);
    } catch { setMarksStudents([]); }
  };

  const handleSaveMarks = async () => {
    if (!selectedMarksExam || !marksSubject) { toast.error('Select exam and subject'); return; }
    setSavingMarks(true);
    try {
      const entries = Object.entries(marksMap).map(([sid, marks]) => ({
        student_id: Number(sid),
        marks_obtained: parseFloat(marks) || 0,
      }));
      await api.post('/teacher-portal/marks', {
        exam_id: selectedMarksExam.id,
        subject_name: marksSubject,
        entries,
      });
      toast.success('Marks saved successfully!');
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Save failed');
    } finally { setSavingMarks(false); }
  };

  const handleAddHomework = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingHw(true);
    try {
      await api.post('/teacher-portal/homework', hwForm);
      toast.success('Homework assigned!'); loadHomework();
      setHwForm({ standard: '', division: '', subject: '', title: '', description: '', due_date: '' });
    } catch (err: any) { toast.error(err?.response?.data?.detail || 'Failed'); }
    finally { setSavingHw(false); }
  };

  const handleAddMaterial = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingMat(true);
    try {
      await api.post('/teacher-portal/materials', matForm);
      toast.success('Material uploaded!'); loadMaterials();
      setMatForm({ standard: '', subject: '', title: '', description: '', material_type: 'notes' });
    } catch (err: any) { toast.error(err?.response?.data?.detail || 'Failed'); }
    finally { setSavingMat(false); }
  };

  const handleAddVideo = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingVid(true);
    try {
      await api.post('/teacher-portal/videos', vidForm);
      toast.success('Video lecture added!'); loadVideos();
      setVidForm({ standard: '', subject: '', title: '', video_url: '', description: '' });
    } catch (err: any) { toast.error(err?.response?.data?.detail || 'Failed'); }
    finally { setSavingVid(false); }
  };

  // Attendance Save
  const handleSaveAttendance = async () => {
    const targetStd = attStd || '9';
    if (!attStudents.length) {
      toast.error('No students loaded to mark attendance.');
      return;
    }
    setSavingAtt(true);
    try {
      const entries = attStudents.map(stud => ({
        student_id: stud.id,
        status: attMap[stud.id] || 'present',
        remarks: attRemarksMap[stud.id] || undefined,
      }));
      await api.post('/teacher-portal/attendance', {
        standard: targetStd,
        division: attDiv || undefined,
        date: attDate,
        records: entries,
        entries: entries,
        academic_year_id: 1,
      });
      toast.success(`Attendance saved successfully for ${entries.length} students in Std ${targetStd}${attDiv ? '-' + attDiv : ''}!`);
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || 'Failed to save attendance');
    } finally { setSavingAtt(false); }
  };

  const setAllAttendanceStatus = (status: 'present' | 'absent' | 'late' | 'leave') => {
    setAttMap(prev => {
      const next = { ...prev };
      attStudents.forEach(s => { next[s.id] = status; });
      return next;
    });
  };

  // Leave Submit
  const handleApplyLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingLeave(true);
    try {
      await api.post('/teacher-portal/leaves', leaveForm);
      toast.success('Leave application submitted to Principal!');
      setShowLeaveForm(false);
      loadLeaves();
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || 'Failed to apply leave');
    } finally { setSavingLeave(false); }
  };

  if (loading) {
    return (
      <div className={styles.portal}>
        <div className={styles.loading}>
          <div className={styles.spinner} />
          <p>Loading Teacher Workspace...</p>
        </div>
      </div>
    );
  }

  const teacher = profile?.teacher;
  const s = profile?.stats;
  const classes = teacher?.classes_assigned ? teacher.classes_assigned.split(',') : [];

  return (
    <div className={styles.portal}>
      {/* ── ACTIVE FEATURE SECTION CONTENT ─────────────────────── */}
      {/* 1. DASHBOARD */}
      {tab === 'dashboard' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
          {/* Dashboard Hero Section (Title, Welcome Banner & KPI Summary Cards) */}
          <TeacherDashboardHero
            teacher={teacher}
            stats={s}
            onMarkAttendance={() => setTab('attendance')}
            onNavigateTab={setTab}
          />

          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 'var(--space-5)' }}>
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <h3 className={styles.cardTitle}><CalendarDays size={18} color="var(--color-primary)" /> Today's Teaching Schedule</h3>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ padding: '12px 16px', background: 'var(--color-surface-2)', borderRadius: 'var(--radius-md)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <strong style={{ color: 'var(--color-text-primary)' }}>09:00 AM - 10:00 AM</strong>
                  <span style={{ marginLeft: 8, padding: '2px 8px', background: 'var(--color-primary-light)', color: 'var(--color-primary)', borderRadius: 999, fontSize: '0.75rem', fontWeight: 700 }}>Std 9-A • Mathematics</span>
                </div>
                <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>Room 102</span>
              </div>
              <div style={{ padding: '12px 16px', background: 'var(--color-surface-2)', borderRadius: 'var(--radius-md)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <strong style={{ color: 'var(--color-text-primary)' }}>11:30 AM - 12:30 PM</strong>
                  <span style={{ marginLeft: 8, padding: '2px 8px', background: 'var(--color-success-light)', color: 'var(--color-success)', borderRadius: 999, fontSize: '0.75rem', fontWeight: 700 }}>Std 10-B • Science Lab</span>
                </div>
                <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>Lab 2</span>
              </div>
            </div>
          </div>

          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <h3 className={styles.cardTitle}><Plus size={18} color="var(--color-primary)" /> Teacher Quick Actions</h3>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button className={styles.primaryBtn} onClick={() => setTab('attendance')}><ClipboardList size={16} /> Mark Class Attendance</button>
              <button className={styles.secondaryBtn} onClick={() => setTab('students')}><Users size={16} /> View Class Students</button>
              <button className={styles.secondaryBtn} onClick={() => setTab('leaves')}><Palmtree size={16} /> Apply Leave</button>
            </div>
          </div>
        </div>
      </div>
      )}

      {/* 2. ATTENDANCE MARKING */}
      {tab === 'attendance' && (
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h3 className={styles.cardTitle}><ClipboardList size={20} color="var(--color-primary)" /> Student Attendance Register</h3>
            <button className={styles.primaryBtn} onClick={handleSaveAttendance} disabled={savingAtt || !attStudents.length}>
              <CheckCircle2 size={16} /> {savingAtt ? 'Saving...' : `Submit Attendance (${attStudents.length})`}
            </button>
          </div>

          {/* Controls Header */}
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end', background: 'var(--color-surface-2)', padding: 16, borderRadius: 'var(--radius-md)' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>Select Class</label>
              <select className={styles.selectField} value={attStd} onChange={e => setAttStd(e.target.value)}>
                {Array.from(new Set([...classes, '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'])).sort((a, b) => Number(a) - Number(b)).map(c => (
                  <option key={c} value={c}>Std {c} {classes.includes(c) ? '(Assigned)' : ''}</option>
                ))}
              </select>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>Division</label>
              <input className={styles.inputField} style={{ width: 80 }} value={attDiv} onChange={e => setAttDiv(e.target.value.toUpperCase())} placeholder="A" />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>Date</label>
              <input type="date" className={styles.inputField} value={attDate} onChange={e => setAttDate(e.target.value)} />
            </div>
            <button className={styles.secondaryBtn} onClick={loadAttStudents}><Search size={14} /> Fetch Students</button>
          </div>

          {/* KPI Summary Bar & Bulk Actions */}
          {attStudents.length > 0 && (
            <div style={{ marginTop: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
              {/* Quick Bulk Action Buttons */}
              <div style={{ display: 'flex', gap: 8 }}>
                <button className={styles.secondaryBtn} onClick={() => setAllAttendanceStatus('present')} style={{ borderColor: 'var(--color-success)', color: 'var(--color-success)' }}>
                  Mark All Present
                </button>
                <button className={styles.secondaryBtn} onClick={() => setAllAttendanceStatus('absent')} style={{ borderColor: 'var(--color-danger)', color: 'var(--color-danger)' }}>
                  Mark All Absent
                </button>
                <button className={styles.secondaryBtn} onClick={() => setAllAttendanceStatus('late')} style={{ borderColor: 'var(--color-warning)', color: 'var(--color-warning)' }}>
                  Mark All Late
                </button>
              </div>

              {/* Realtime Stats Pills */}
              <div style={{ display: 'flex', gap: 12, fontSize: '0.85rem', fontWeight: 600 }}>
                <span style={{ padding: '4px 10px', background: 'var(--color-surface-2)', borderRadius: 999 }}>Total: {attStudents.length}</span>
                <span style={{ padding: '4px 10px', background: 'rgba(16, 185, 129, 0.15)', color: 'var(--color-success)', borderRadius: 999 }}>
                  Present: {Object.values(attMap).filter(v => v === 'present').length}
                </span>
                <span style={{ padding: '4px 10px', background: 'rgba(239, 68, 68, 0.15)', color: 'var(--color-danger)', borderRadius: 999 }}>
                  Absent: {Object.values(attMap).filter(v => v === 'absent').length}
                </span>
                <span style={{ padding: '4px 10px', background: 'rgba(245, 158, 11, 0.15)', color: 'var(--color-warning)', borderRadius: 999 }}>
                  Late: {Object.values(attMap).filter(v => v === 'late').length}
                </span>
                <span style={{ padding: '4px 10px', background: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6', borderRadius: 999 }}>
                  Rate: {attStudents.length > 0 ? ((Object.values(attMap).filter(v => v === 'present').length / attStudents.length) * 100).toFixed(0) : 0}%
                </span>
              </div>
            </div>
          )}

          {/* Student List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 16 }}>
            {attStudents.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 40, color: 'var(--color-text-muted)', background: 'var(--color-surface-2)', borderRadius: 'var(--radius-md)' }}>
                <Users size={32} style={{ opacity: 0.5, marginBottom: 8 }} />
                <p style={{ margin: 0 }}>No students loaded for Std {attStd || '9'} {attDiv ? `-${attDiv}` : ''}. Click "Fetch Students" above.</p>
              </div>
            ) : (
              attStudents.map((stud, idx) => {
                const currentSt = attMap[stud.id] || 'present';
                return (
                  <div key={stud.id} className={styles.attRow} style={{ padding: '12px 16px', background: 'var(--color-surface-1)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--color-primary-light)', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.875rem' }}>
                        {stud.full_name?.[0] || 'S'}
                      </div>
                      <div>
                        <div className={styles.attName} style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>{idx + 1}. {stud.full_name}</div>
                        <div className={styles.attSub} style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>GR: {stud.gr_number} | Roll #{stud.roll_number || '—'} | Std {stud.standard}-{stud.division || 'A'}</div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                      <input
                        type="text"
                        className={styles.inputField}
                        style={{ width: 150, height: 32, fontSize: '0.75rem' }}
                        placeholder="Remarks / Reason..."
                        value={attRemarksMap[stud.id] || ''}
                        onChange={e => setAttRemarksMap(prev => ({ ...prev, [stud.id]: e.target.value }))}
                      />
                      <div className={styles.attBtnGroup} style={{ display: 'flex', gap: 4 }}>
                        <button
                          type="button"
                          className={`${styles.attBtn} ${currentSt === 'present' ? styles.attBtnPresent : ''}`}
                          style={currentSt === 'present' ? { background: 'var(--color-success)', color: '#fff' } : {}}
                          onClick={() => setAttMap(m => ({ ...m, [stud.id]: 'present' }))}
                        >
                          Present
                        </button>
                        <button
                          type="button"
                          className={`${styles.attBtn} ${currentSt === 'absent' ? styles.attBtnAbsent : ''}`}
                          style={currentSt === 'absent' ? { background: 'var(--color-danger)', color: '#fff' } : {}}
                          onClick={() => setAttMap(m => ({ ...m, [stud.id]: 'absent' }))}
                        >
                          Absent
                        </button>
                        <button
                          type="button"
                          className={`${styles.attBtn}`}
                          style={currentSt === 'late' ? { background: 'var(--color-warning)', color: '#fff' } : {}}
                          onClick={() => setAttMap(m => ({ ...m, [stud.id]: 'late' }))}
                        >
                          Late
                        </button>
                        <button
                          type="button"
                          className={`${styles.attBtn} ${currentSt === 'leave' ? styles.attBtnLeave : ''}`}
                          style={currentSt === 'leave' ? { background: '#3b82f6', color: '#fff' } : {}}
                          onClick={() => setAttMap(m => ({ ...m, [stud.id]: 'leave' }))}
                        >
                          Leave
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* 3. TIMETABLE */}
      {tab === 'timetable' && (
        <div className={styles.card}>
          <div className={styles.cardHeader} style={{ flexWrap: 'wrap', gap: 8 }}>
            <div>
              <h3 className={styles.cardTitle}><CalendarDays size={20} color="var(--color-primary)" /> Weekly Teaching Schedule</h3>
              <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                Scheduled by Office Clerk & Principal • Mon to Sat
              </p>
            </div>
            <button className={styles.secondaryBtn} onClick={loadTimetable}><RefreshCw size={14} /> Refresh Schedule</button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16, marginTop: 16 }}>
            {timetable?.full_week?.map((w: any) => (
              <div key={w.day_en} style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, borderBottom: '1px solid var(--color-border)', paddingBottom: 8 }}>
                  <h4 style={{ margin: 0, fontSize: '0.95rem', color: 'var(--color-text-primary)' }}>{w.day_en} <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', fontWeight: 400 }}>({w.day_mr})</span></h4>
                  <span style={{ fontSize: '0.75rem', fontWeight: 600, padding: '2px 8px', background: w.periods?.length ? 'var(--color-primary-light)' : 'var(--color-surface-1)', color: w.periods?.length ? 'var(--color-primary)' : 'var(--color-text-muted)', borderRadius: 999 }}>
                    {w.periods?.length ? `${w.periods.length} Periods` : 'No Classes'}
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {!w.periods || w.periods.length === 0 ? (
                    <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', fontStyle: 'italic', padding: '8px 0' }}>
                      Free Period / Off
                    </div>
                  ) : (
                    w.periods.map((p: any, idx: number) => (
                      <div key={p.id || idx} style={{ padding: '8px 12px', background: 'var(--color-surface-1)', borderRadius: 'var(--radius-sm)', borderLeft: '3px solid var(--color-primary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--color-text-primary)' }}>{p.subject}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>Std {p.standard}-{p.division} • {p.room || 'Classroom'}</div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '2px 6px', background: 'var(--color-surface-2)', borderRadius: 4, color: 'var(--color-text-muted)' }}>
                            {p.period_name || `P${idx + 1}`}
                          </span>
                          {p.start_time && <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', marginTop: 2 }}>{p.start_time}-{p.end_time}</div>}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. STUDENTS */}
      {tab === 'students' && (
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h3 className={styles.cardTitle}><Users size={20} color="var(--color-primary)" /> Class Student Roster</h3>
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <input className={styles.inputField} style={{ flex: 1 }} value={studentSearch} onChange={e => setStudentSearch(e.target.value)} placeholder="Search student name or GR number..." />
            <button className={styles.primaryBtn} onClick={loadStudents}><Search size={14} /> Search</button>
          </div>
          <div className={styles.tableWrap} style={{ marginTop: 12 }}>
            <table className={styles.table}>
              <thead><tr><th>GR No</th><th>Roll</th><th>Student Name</th><th>Standard</th><th>Parent Contact</th></tr></thead>
              <tbody>
                {students.map(s => (
                  <tr key={s.id}>
                    <td><strong>{s.gr_number}</strong></td>
                    <td>{s.roll_number || '—'}</td>
                    <td><strong>{s.full_name}</strong></td>
                    <td>Std {s.standard}-{s.division}</td>
                    <td>{s.father_mobile || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 5. NOTICES */}
      {tab === 'notices' && (
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h3 className={styles.cardTitle}><Bell size={20} color="var(--color-primary)" /> School Notices & Circulars</h3>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {notices.map(n => (
              <div key={n.id} style={{ padding: 16, background: 'var(--color-surface-2)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, padding: '2px 8px', background: 'var(--color-primary-light)', color: 'var(--color-primary)', borderRadius: 999 }}>{n.notice_type || 'General'}</span>
                <h4 style={{ margin: '6px 0 4px' }}>{n.title}</h4>
                <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>{n.content}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 6. LEAVES */}
      {tab === 'leaves' && (
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h3 className={styles.cardTitle}><Palmtree size={20} color="var(--color-primary)" /> Teacher Leave Applications</h3>
            <button className={styles.primaryBtn} onClick={() => setShowLeaveForm(true)}><Plus size={14} /> Apply Leave</button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {leaves.map((l: any) => (
              <div key={l.id} style={{ padding: 16, background: 'var(--color-surface-2)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, padding: '2px 8px', background: 'var(--color-warning-light)', color: 'var(--color-warning-dark)', borderRadius: 999 }}>{l.status?.toUpperCase()}</span>
                <h4 style={{ margin: '6px 0 4px' }}>{l.leave_type?.toUpperCase()} ({l.start_date} to {l.end_date})</h4>
                <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>{l.reason}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 7. PROFILE */}
      {tab === 'profile' && (
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h3 className={styles.cardTitle}><UserCheck size={20} color="var(--color-primary)" /> Teacher Employee Profile</h3>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
            <div style={{ background: 'var(--color-surface-2)', padding: 16, borderRadius: 'var(--radius-lg)' }}>
              <strong>Full Name:</strong> {teacher?.salutation} {teacher?.full_name}<br /><br />
              <strong>Employee ID:</strong> {teacher?.employee_id}<br /><br />
              <strong>Designation:</strong> {teacher?.designation}<br /><br />
              <strong>Department:</strong> {teacher?.department || 'Teaching'}
            </div>
            <div style={{ background: 'var(--color-surface-2)', padding: 16, borderRadius: 'var(--radius-lg)' }}>
              <strong>Mobile Contact:</strong> {teacher?.mobile || '—'}<br /><br />
              <strong>Email:</strong> {teacher?.email || '—'}<br /><br />
              <strong>Qualification:</strong> {teacher?.highest_qualification || 'B.Ed / M.A.'}<br /><br />
              <strong>SARAL ID:</strong> {teacher?.teacher_saral_id || '—'}
            </div>
          </div>
        </div>
      )}

      {/* 8. HOMEWORK */}
      {tab === 'homework' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-5)' }}>
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <h3 className={styles.cardTitle}><BookOpen size={18} color="var(--color-primary)" /> Assign Homework</h3>
            </div>
            <form onSubmit={handleAddHomework} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              {[['Standard', 'standard', 'number'], ['Division', 'division', 'text'], ['Subject', 'subject', 'text'], ['Title', 'title', 'text'], ['Due Date', 'due_date', 'date']].map(([lbl, key, type]) => (
                <div key={key} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <label style={{ fontSize: 'var(--font-size-xs)', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>{lbl}</label>
                  <input type={type} className={styles.inputField} value={(hwForm as any)[key]} onChange={e => setHwForm(f => ({ ...f, [key]: e.target.value }))} required />
                </div>
              ))}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <label style={{ fontSize: 'var(--font-size-xs)', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Description</label>
                <textarea className={styles.inputField} style={{ minHeight: 80, resize: 'vertical' }} value={hwForm.description} onChange={e => setHwForm(f => ({ ...f, description: e.target.value }))} />
              </div>
              <button type="submit" className={styles.primaryBtn} disabled={savingHw}>{savingHw ? 'Assigning...' : 'Assign Homework'}</button>
            </form>
          </div>
          <div className={styles.card}>
            <div className={styles.cardHeader}><h3 className={styles.cardTitle}>Recent Homework</h3></div>
            {homeworkList.length === 0 ? <p style={{ color: 'var(--color-text-muted)', textAlign: 'center', padding: 'var(--space-8)' }}>No homework assigned yet</p> : homeworkList.map((hw: any) => (
              <div key={hw.id} style={{ padding: 'var(--space-3)', background: 'var(--color-surface-2)', borderRadius: 'var(--radius-md)', marginBottom: 'var(--space-2)', border: '1px solid var(--color-border)' }}>
                <div style={{ fontWeight: 600, fontSize: 'var(--font-size-sm)' }}>{hw.title}</div>
                <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>Std {hw.standard} • {hw.subject} • Due: {hw.due_date}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 8b. ASSESSMENTS */}
      {tab === 'assessments' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* View Results Panel */}
          {viewingResultsId && assessmentResults && (
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <h3 className={styles.cardTitle}><Trophy size={20} color='var(--color-warning)' /> Assessment Results: {assessmentResults.assessment?.title}</h3>
                <button className={styles.secondaryBtn} onClick={() => { setViewingResultsId(null); setAssessmentResults(null); }}>Back to List</button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 20 }}>
                <div style={{ padding: 16, background: 'var(--color-surface-2)', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
                  <div style={{ fontSize: '1.8rem', fontWeight: 900, color: 'var(--color-primary)' }}>{assessmentResults.stats?.total_attempted}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>Attempted</div>
                </div>
                <div style={{ padding: 16, background: 'var(--color-surface-2)', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
                  <div style={{ fontSize: '1.8rem', fontWeight: 900, color: 'var(--color-success)' }}>{assessmentResults.stats?.passed_count}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>Passed</div>
                </div>
                <div style={{ padding: 16, background: 'var(--color-surface-2)', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
                  <div style={{ fontSize: '1.8rem', fontWeight: 900, color: 'var(--color-danger)' }}>{assessmentResults.stats?.failed_count}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>Failed</div>
                </div>
                <div style={{ padding: 16, background: 'var(--color-surface-2)', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
                  <div style={{ fontSize: '1.8rem', fontWeight: 900, color: 'var(--color-warning)' }}>{assessmentResults.stats?.avg_score}%</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>Avg Score</div>
                </div>
              </div>
              {assessmentResults.student_results?.length === 0 ? (
                <p style={{ color: 'var(--color-text-muted)', textAlign: 'center', padding: 32 }}>No students have attempted this assessment yet.</p>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table className={styles.table}>
                    <thead><tr><th>Student</th><th>Score</th><th>%</th><th>Grade</th><th>Result</th><th>Correct</th><th>Wrong</th></tr></thead>
                    <tbody>
                      {assessmentResults.student_results?.map((r: any) => (
                        <tr key={r.student_id}>
                          <td><strong>{r.student_name}</strong></td>
                          <td>{r.score}/{r.total_marks}</td>
                          <td><strong style={{ color: r.percentage >= 60 ? 'var(--color-success)' : 'var(--color-danger)' }}>{r.percentage}%</strong></td>
                          <td><strong>{r.grade}</strong></td>
                          <td><span style={{ padding: '2px 8px', borderRadius: 4, background: r.passed ? 'var(--color-success-light)' : 'var(--color-danger-light)', color: r.passed ? 'var(--color-success)' : 'var(--color-danger)', fontWeight: 700, fontSize: '0.8rem' }}>{r.result}</span></td>
                          <td style={{ color: 'var(--color-success)' }}>{r.correct_count}</td>
                          <td style={{ color: 'var(--color-danger)' }}>{r.wrong_count}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Create Assessment Form */}
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <h3 className={styles.cardTitle}><Brain size={20} color='var(--color-primary)' /> Create New Assessment / Quiz</h3>
            </div>
            <form onSubmit={handleCreateAssessment} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 12 }}>
                <div><label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-muted)', display: 'block', marginBottom: 4 }}>Title *</label><input className={styles.inputField} value={asmForm.title} onChange={e => setAsmForm(f => ({ ...f, title: e.target.value }))} required placeholder='e.g. Mathematics Chapter 3 Test' /></div>
                <div><label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-muted)', display: 'block', marginBottom: 4 }}>Subject *</label><input className={styles.inputField} value={asmForm.subject} onChange={e => setAsmForm(f => ({ ...f, subject: e.target.value }))} required placeholder='Mathematics' /></div>
                <div><label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-muted)', display: 'block', marginBottom: 4 }}>Topic</label><input className={styles.inputField} value={asmForm.topic} onChange={e => setAsmForm(f => ({ ...f, topic: e.target.value }))} placeholder='Quadratic Equations' /></div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 12 }}>
                <div><label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-muted)', display: 'block', marginBottom: 4 }}>Class Std *</label><input className={styles.inputField} value={asmForm.class_standard} onChange={e => setAsmForm(f => ({ ...f, class_standard: e.target.value }))} required placeholder='9' /></div>
                <div><label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-muted)', display: 'block', marginBottom: 4 }}>Duration (min)</label><input type='number' className={styles.inputField} value={asmForm.duration_minutes} onChange={e => setAsmForm(f => ({ ...f, duration_minutes: Number(e.target.value) }))} min={5} max={180} /></div>
                <div><label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-muted)', display: 'block', marginBottom: 4 }}>Passing Marks *</label><input type='number' className={styles.inputField} value={asmForm.passing_marks} onChange={e => setAsmForm(f => ({ ...f, passing_marks: Number(e.target.value) }))} min={1} required /></div>
                <div><label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-muted)', display: 'block', marginBottom: 4 }}>Start Date</label><input type='date' className={styles.inputField} value={asmForm.start_date} onChange={e => setAsmForm(f => ({ ...f, start_date: e.target.value }))} /></div>
              </div>

              {/* Questions */}
              <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <h4 style={{ margin: 0 }}>Questions ({asmQuestions.length})</h4>
                  <button type='button' className={styles.secondaryBtn} onClick={() => setAsmQuestions(qs => [...qs, { question: '', options: ['', '', '', ''], correct_index: 0, marks: 1 }])}>
                    <Plus size={14} /> Add Question
                  </button>
                </div>
                {asmQuestions.map((q, qi) => (
                  <div key={qi} style={{ padding: 16, background: 'var(--color-surface-2)', borderRadius: 'var(--radius-md)', marginBottom: 12, border: '1px solid var(--color-border)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                      <strong style={{ fontSize: '0.9rem' }}>Q{qi + 1}</strong>
                      {asmQuestions.length > 1 && <button type='button' onClick={() => setAsmQuestions(qs => qs.filter((_, i) => i !== qi))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-danger)' }}><Trash2 size={16} /></button>}
                    </div>
                    <input className={styles.inputField} value={q.question} onChange={e => setAsmQuestions(qs => qs.map((x, i) => i === qi ? { ...x, question: e.target.value } : x))} placeholder={'Question ' + (qi + 1)} style={{ marginBottom: 10 }} required />
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
                      {q.options.map((opt, oi) => (
                        <div key={oi} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <input type='radio' name={'correct_' + qi} checked={q.correct_index === oi} onChange={() => setAsmQuestions(qs => qs.map((x, i) => i === qi ? { ...x, correct_index: oi } : x))} title='Mark as correct answer' />
                          <input className={styles.inputField} value={opt} onChange={e => setAsmQuestions(qs => qs.map((x, i) => i === qi ? { ...x, options: x.options.map((o, j) => j === oi ? e.target.value : o) } : x))} placeholder={'Option ' + String.fromCharCode(65 + oi)} required />
                        </div>
                      ))}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-success)', fontWeight: 600 }}>
                      Correct Answer: Option {String.fromCharCode(65 + q.correct_index)} (select radio button to change)
                    </div>
                  </div>
                ))}
              </div>
              <button type='submit' className={styles.primaryBtn} disabled={savingAssessment} style={{ alignSelf: 'flex-start' }}>
                {savingAssessment ? 'Publishing...' : <><Brain size={16} /> Publish Assessment to Students</>}
              </button>
            </form>
          </div>

          {/* Existing Assessments List */}
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <h3 className={styles.cardTitle}><ClipboardList size={20} color='var(--color-primary)' /> Published Assessments</h3>
              <button className={styles.secondaryBtn} onClick={loadTeacherAssessments}><RefreshCw size={14} /> Refresh</button>
            </div>
            {teacherAssessments.length === 0 ? (
              <p style={{ color: 'var(--color-text-muted)', textAlign: 'center', padding: 32 }}>No assessments created yet. Create one above!</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {teacherAssessments.map((asm: any) => (
                  <div key={asm.id} style={{ padding: '14px 18px', background: 'var(--color-surface-2)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4 }}>
                        <span style={{ fontSize: '0.75rem', padding: '2px 8px', background: 'var(--color-primary-light)', color: 'var(--color-primary)', borderRadius: 4, fontWeight: 700 }}>{asm.subject}</span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Std {asm.class_standard}</span>
                        <span style={{ fontSize: '0.75rem', padding: '2px 8px', background: asm.status === 'active' ? 'var(--color-success-light)' : 'var(--color-danger-light)', color: asm.status === 'active' ? 'var(--color-success)' : 'var(--color-danger)', borderRadius: 4, fontWeight: 700 }}>{asm.status.toUpperCase()}</span>
                      </div>
                      <div style={{ fontWeight: 700 }}>{asm.title}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: 4 }}>
                        {asm.total_questions} questions &bull; {asm.total_marks} marks &bull; {asm.duration_minutes} min &bull; {asm.attempted_count} attempted &bull; Avg: {asm.avg_score}%
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button className={styles.secondaryBtn} onClick={() => loadAssessmentResults(asm.id)}><Eye size={14} /> Results</button>
                      <button className={styles.secondaryBtn} style={{ color: 'var(--color-danger)' }} onClick={() => handleDeleteAssessment(asm.id)}><Trash2 size={14} /></button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 9. MATERIALS */}
      {tab === 'materials' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-5)' }}>
          <div className={styles.card}>
            <div className={styles.cardHeader}><h3 className={styles.cardTitle}><Bell size={18} color="var(--color-primary)" /> Upload Study Material</h3></div>
            <form onSubmit={handleAddMaterial} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              {[['Standard', 'standard', 'text'], ['Subject', 'subject', 'text'], ['Title', 'title', 'text']].map(([lbl, key, type]) => (
                <div key={key} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <label style={{ fontSize: 'var(--font-size-xs)', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>{lbl}</label>
                  <input type={type} className={styles.inputField} value={(matForm as any)[key]} onChange={e => setMatForm(f => ({ ...f, [key]: e.target.value }))} required />
                </div>
              ))}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <label style={{ fontSize: 'var(--font-size-xs)', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Material Type</label>
                <select className={styles.selectField} value={matForm.material_type} onChange={e => setMatForm(f => ({ ...f, material_type: e.target.value }))}>
                  {['notes', 'pdf', 'ppt', 'assignment', 'question_paper', 'syllabus'].map(t => <option key={t} value={t}>{t.replace('_', ' ').toUpperCase()}</option>)}
                </select>
              </div>
              <button type="submit" className={styles.primaryBtn} disabled={savingMat}>{savingMat ? 'Uploading...' : 'Upload Material'}</button>
            </form>
          </div>
          <div className={styles.card}>
            <div className={styles.cardHeader}><h3 className={styles.cardTitle}>Uploaded Materials</h3></div>
            {materials.length === 0 ? <p style={{ color: 'var(--color-text-muted)', textAlign: 'center', padding: 'var(--space-8)' }}>No materials uploaded</p> : materials.map((m: any) => (
              <div key={m.id} style={{ padding: 'var(--space-3)', background: 'var(--color-surface-2)', borderRadius: 'var(--radius-md)', marginBottom: 'var(--space-2)', border: '1px solid var(--color-border)' }}>
                <div style={{ fontWeight: 600, fontSize: 'var(--font-size-sm)' }}>{m.title}</div>
                <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>Std {m.standard} • {m.subject} • {m.material_type?.replace('_', ' ').toUpperCase()}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 10. VIDEOS */}
      {tab === 'videos' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-5)' }}>
          <div className={styles.card}>
            <div className={styles.cardHeader}><h3 className={styles.cardTitle}><UserCheck size={18} color="var(--color-primary)" /> Add Video Lecture</h3></div>
            <form onSubmit={handleAddVideo} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              {[['Standard', 'standard', 'text'], ['Subject', 'subject', 'text'], ['Title', 'title', 'text'], ['Video URL (YouTube)', 'video_url', 'url']].map(([lbl, key, type]) => (
                <div key={key} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <label style={{ fontSize: 'var(--font-size-xs)', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>{lbl}</label>
                  <input type={type} className={styles.inputField} value={(vidForm as any)[key]} onChange={e => setVidForm(f => ({ ...f, [key]: e.target.value }))} required />
                </div>
              ))}
              <button type="submit" className={styles.primaryBtn} disabled={savingVid}>{savingVid ? 'Adding...' : 'Add Video'}</button>
            </form>
          </div>
          <div className={styles.card}>
            <div className={styles.cardHeader}><h3 className={styles.cardTitle}>Video Library</h3></div>
            {videos.length === 0 ? <p style={{ color: 'var(--color-text-muted)', textAlign: 'center', padding: 'var(--space-8)' }}>No videos uploaded</p> : videos.map((v: any) => (
              <div key={v.id} style={{ padding: 'var(--space-3)', background: 'var(--color-surface-2)', borderRadius: 'var(--radius-md)', marginBottom: 'var(--space-2)', border: '1px solid var(--color-border)' }}>
                <div style={{ fontWeight: 600, fontSize: 'var(--font-size-sm)' }}>{v.title}</div>
                <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>Std {v.standard} • {v.subject}</div>
                {v.video_url && <a href={v.video_url} target="_blank" rel="noreferrer" style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-primary)' }}>▶ Watch</a>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 11. MARKS ENTRY */}
      {tab === 'marks' && (
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h3 className={styles.cardTitle}><CheckCircle2 size={18} color="var(--color-primary)" /> Quick Marks Entry</h3>
            {selectedMarksExam && (
              <button className={styles.primaryBtn} onClick={handleSaveMarks} disabled={savingMarks}>{savingMarks ? 'Saving...' : 'Save Marks'}</button>
            )}
          </div>
          <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap', marginBottom: 'var(--space-4)', alignItems: 'center' }}>
            <select className={styles.selectField} value={selectedMarksExam?.id || ''} onChange={e => {
              const ex = marksExams.find((x: any) => x.id === parseInt(e.target.value));
              setSelectedMarksExam(ex || null);
              if (ex) {
                loadMarksStudents(ex.id, ex.standard, ex.division);
                if (ex.subjects && ex.subjects.length > 0) {
                  setMarksSubject(ex.subjects[0]);
                }
              }
            }}>
              <option value="">Select Exam</option>
              {marksExams.map((ex: any) => <option key={ex.id} value={ex.id}>{ex.name || ex.exam_type_name} - Std {ex.standard}</option>)}
            </select>

            {selectedMarksExam?.subjects && selectedMarksExam.subjects.length > 0 ? (
              <select className={styles.selectField} value={marksSubject} onChange={e => setMarksSubject(e.target.value)} style={{ minWidth: 180 }}>
                <option value="">Select Subject</option>
                {selectedMarksExam.subjects.map((sub: string) => (
                  <option key={sub} value={sub}>{sub}</option>
                ))}
              </select>
            ) : (
              <input className={styles.inputField} placeholder="Subject Name" value={marksSubject} onChange={e => setMarksSubject(e.target.value)} style={{ width: 180 }} />
            )}
          </div>
          {marksStudents.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 'var(--space-8)', color: 'var(--color-text-muted)' }}>Select an exam to load students</div>
          ) : (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead><tr><th>#</th><th>GR No.</th><th>Student Name</th><th>Marks (out of 100)</th></tr></thead>
                <tbody>
                  {marksStudents.map((s: any, i: number) => (
                    <tr key={s.id}>
                      <td>{i + 1}</td>
                      <td style={{ fontFamily: 'monospace', color: 'var(--color-primary)', fontWeight: 600 }}>{s.gr_number}</td>
                      <td>{s.full_name}</td>
                      <td><input type="number" min={0} max={100} className={styles.inputField} style={{ width: 80 }} value={marksMap[s.id] ?? ''} onChange={e => setMarksMap(m => ({ ...m, [s.id]: e.target.value }))} placeholder="—" /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* 12. AI TOOLS */}
      {tab === 'ai_tools' && (
        <div className={styles.card}>
          <div className={styles.cardHeader}><h3 className={styles.cardTitle}><X size={18} color="var(--color-primary)" /> AI Teaching Assistant</h3></div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 'var(--space-4)' }}>
            {[
              { label: 'Generate Lesson Plan', desc: 'AI creates structured lesson plan from topic', icon: '📋' },
              { label: 'Create Question Paper', desc: 'Auto-generate MCQ/short answer questions', icon: '📝' },
              { label: 'Summarize Chapter', desc: 'Get a concise summary of any textbook chapter', icon: '📖' },
              { label: 'Homework Generator', desc: 'Generate age-appropriate homework tasks', icon: '✏️' },
              { label: 'Rubric Creator', desc: 'Create grading rubrics for assignments', icon: '📊' },
              { label: 'Parent Message Draft', desc: 'Draft professional parent communication', icon: '✉️' },
            ].map(tool => (
              <div key={tool.label} style={{ padding: 'var(--space-5)', background: 'var(--color-surface-2)', borderRadius: 'var(--radius-xl)', border: '1px solid var(--color-border)', cursor: 'pointer', transition: 'all 0.15s ease' }}
                onClick={() => window.open('/ai-hub', '_blank')}
                onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--color-primary)')}
                onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--color-border)')}
              >
                <div style={{ fontSize: '2rem', marginBottom: 'var(--space-3)' }}>{tool.icon}</div>
                <div style={{ fontSize: 'var(--font-size-sm)', fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: 'var(--space-1)' }}>{tool.label}</div>
                <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>{tool.desc}</div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 'var(--space-4)', padding: 'var(--space-4)', background: 'var(--color-primary-light)', borderRadius: 'var(--radius-lg)', fontSize: 'var(--font-size-sm)', color: 'var(--color-primary)' }}>
            💡 These tools use the VidyaSetu AI Hub. Click any tool to open the AI assistant with the relevant prompt pre-loaded.
          </div>
        </div>
      )}

      {/* ── LEAVE MODAL */}
      {showLeaveForm && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <div className={styles.modalTitle}>
              <span>Submit Leave Application</span>
              <button className={styles.closeBtn} onClick={() => setShowLeaveForm(false)}>✕</button>
            </div>
            <form onSubmit={handleApplyLeave} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <select className={styles.selectField} value={leaveForm.leave_type} onChange={e => setLeaveForm(l => ({ ...l, leave_type: e.target.value }))}>
                <option value="casual">Casual Leave</option>
                <option value="medical">Medical Leave</option>
                <option value="earned">Earned Leave</option>
              </select>
              <input type="date" className={styles.inputField} value={leaveForm.start_date} onChange={e => setLeaveForm(l => ({ ...l, start_date: e.target.value }))} required />
              <input type="date" className={styles.inputField} value={leaveForm.end_date} onChange={e => setLeaveForm(l => ({ ...l, end_date: e.target.value }))} required />
              <input className={styles.inputField} value={leaveForm.reason} onChange={e => setLeaveForm(l => ({ ...l, reason: e.target.value }))} placeholder="Reason for leave..." required />
              <button type="submit" className={styles.primaryBtn} disabled={savingLeave}>Submit to Principal</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
