/**
 * VidyaSetu ERP — Professional Student Workspace
 * =======================================================
 * Industrial Grade Digital Student Workspace.
 * Themed with Design Tokens (`tokens.css`), Lucide icons, and zero duplicate navigation.
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  GraduationCap, CalendarDays, BookOpen, Award, FileText, Video,
  Bot, QrCode, Ticket, BarChart3, Library, CreditCard, Palmtree,
  HelpCircle, Download, UserCheck, Settings, Search, Plus, Check,
  AlertCircle, Sparkles, Clock, ChevronRight, X, ArrowUpRight, ClipboardList
} from 'lucide-react';
import studentPortalService, {
  type StudentProfile, type AttendanceData,
  type ExamResult, type Notice,
} from '../../services/studentPortalService';
import api from '../../services/api';
import styles from './StudentPortalPage.module.css';
import toast from 'react-hot-toast';

type Tab =
  | 'dashboard'
  | 'profile'
  | 'attendance'
  | 'homework'
  | 'assignments'
  | 'study_materials'
  | 'videos'
  | 'aichat'
  | 'qr_learning'
  | 'timetable'
  | 'examination'
  | 'results'
  | 'certificates'
  | 'library'
  | 'fees'
  | 'leave'
  | 'portfolio'
  | 'communication'
  | 'downloads'
  | 'analytics'
  | 'idcard'
  | 'settings';

const STUDENT_TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'dashboard',      label: 'Dashboard',       icon: <GraduationCap size={15} /> },
  { id: 'profile',        label: 'My Profile',      icon: <UserCheck size={15} /> },
  { id: 'attendance',     label: 'Attendance',      icon: <CalendarDays size={15} /> },
  { id: 'timetable',      label: 'Timetable',       icon: <ClipboardList size={15} /> },
  { id: 'homework',       label: 'Homework',        icon: <BookOpen size={15} /> },
  { id: 'assignments',    label: 'Assignments',     icon: <FileText size={15} /> },
  { id: 'study_materials',label: 'Notes',           icon: <Download size={15} /> },
  { id: 'videos',         label: 'Video Lectures',  icon: <Video size={15} /> },
  { id: 'aichat',         label: 'AI Tutor',        icon: <Bot size={15} /> },
  { id: 'examination',    label: 'Hall Ticket',     icon: <Ticket size={15} /> },
  { id: 'results',        label: 'Results',         icon: <BarChart3 size={15} /> },
  { id: 'certificates',   label: 'Certificates',    icon: <Award size={15} /> },
  { id: 'library',        label: 'Library',         icon: <Library size={15} /> },
  { id: 'fees',           label: 'Fees',            icon: <CreditCard size={15} /> },
  { id: 'leave',          label: 'Leave Request',   icon: <Palmtree size={15} /> },
  { id: 'communication',  label: 'Notices',         icon: <HelpCircle size={15} /> },
  { id: 'analytics',      label: 'Analytics',       icon: <BarChart3 size={15} /> },
  { id: 'idcard',         label: 'Digital ID Card', icon: <UserCheck size={15} /> },
  { id: 'settings',       label: 'Settings',        icon: <Settings size={15} /> },
];

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function formatDate(iso?: string) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function StudentPortalPage() {
  const { t, i18n } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = (searchParams.get('tab') as Tab) || 'dashboard';
  const [activeTab, setActiveTabState] = useState<Tab>(tabParam);

  useEffect(() => {
    const param = searchParams.get('tab') as Tab;
    if (param && param !== activeTab) {
      setActiveTabState(param);
    }
  }, [searchParams]);

  const setActiveTab = (t: Tab) => {
    setActiveTabState(t);
    setSearchParams({ tab: t });
  };

  // Core Data States
  const [profile, setProfile]               = useState<StudentProfile | null>(null);
  const [attendance, setAttendance]         = useState<AttendanceData | null>(null);
  const [results, setResults]               = useState<ExamResult[]>([]);
  const [fees, setFees]                     = useState<any>(null);
  const [library, setLibrary]               = useState<any>(null);
  const [timetable, setTimetable]           = useState<any>(null);
  const [notices, setNotices]               = useState<Notice[]>([]);
  const [idCard, setIdCard]                 = useState<any>(null);
  const [homework, setHomework]             = useState<any[]>([]);
  const [assignments, setAssignments]       = useState<any[]>([]);
  const [studyMaterials, setStudyMaterials] = useState<any[]>([]);
  const [videos, setVideos]                 = useState<any[]>([]);
  const [qrHistory, setQrHistory]           = useState<any[]>([]);
  const [hallTicket, setHallTicket]         = useState<any>(null);
  const [certificates, setCertificates]     = useState<any[]>([]);
  const [portfolio, setPortfolio]           = useState<any>(null);
  const [analytics, setAnalytics]           = useState<any>(null);

  const [loading, setLoading]               = useState(true);
  const [tabLoading, setTabLoading]         = useState(false);
  const [error, setError]                   = useState<string | null>(null);

  // Modals & Action States
  const [activeVideo, setActiveVideo]       = useState<any>(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileReq, setProfileReq]         = useState({ field_name: 'father_mobile', proposed_value: '', reason: '' });
  const [showHomeworkModal, setShowHomeworkModal] = useState<any>(null);
  const [homeworkText, setHomeworkText]     = useState('');
  const [showDoubtModal, setShowDoubtModal] = useState(false);
  const [doubtForm, setDoubtForm]           = useState({ subject: 'Mathematics', question: '' });
  const [qrCodeInput, setQrCodeInput]       = useState('');
  const [scannedResult, setScannedResult]   = useState<any>(null);

  // Leave Form
  const [leaves, setLeaves]                 = useState<any[]>([]);
  const [leaveForm, setLeaveForm]           = useState({ leave_type: 'casual', start_date: '', end_date: '', reason: '' });
  const [showLeaveForm, setShowLeaveForm]   = useState(false);

  // AI Chat
  const [chatMessages, setChatMessages]     = useState<{ role: 'user'|'assistant'; content: string }[]>([
    { role: 'assistant', content: 'Namaste! I am VidyaBot, your AI Study Assistant. Ask me any question about your subjects, formulas, or homework.' }
  ]);
  const [chatInput, setChatInput]           = useState('');
  const [chatLoading, setChatLoading]       = useState(false);
  const [chatLang, setChatLang]             = useState<'en'|'mr'>('en');
  const chatEndRef                          = useRef<HTMLDivElement>(null);

  // Calendar navigation
  const today = new Date();
  const [calYear,  setCalYear]              = useState(today.getFullYear());
  const [calMonth, setCalMonth]             = useState(today.getMonth() + 1);

  // ── Initial Profile Fetch ───────────────────────────────────
  useEffect(() => {
    studentPortalService.getProfile()
      .then(p => { setProfile(p); setLoading(false); })
      .catch(e => {
        setError(e?.response?.data?.message ?? 'Could not load student profile.');
        setLoading(false);
      });
  }, []);

  // ── Tab Data Lazy Loader ───────────────────────────────────
  const loadTab = useCallback(async (tab: Tab) => {
    setTabLoading(true);
    try {
      switch (tab) {
        case 'attendance':
          if (!attendance) {
            const a = await studentPortalService.getAttendance(calYear, calMonth);
            setAttendance(a);
          }
          break;
        case 'results':
          if (!results.length) {
            const r = await studentPortalService.getResults();
            setResults(r.results);
          }
          break;
        case 'fees':
          if (!fees) {
            const f = await studentPortalService.getFees();
            setFees(f);
          }
          break;
        case 'library':
          if (!library) {
            const l = await studentPortalService.getLibrary();
            setLibrary(l);
          }
          break;
        case 'timetable':
          if (!timetable) {
            const tt = await studentPortalService.getTimetable();
            setTimetable(tt);
          }
          break;
        case 'communication':
          if (!notices.length) {
            const n = await studentPortalService.getNotices();
            setNotices(n.notices);
          }
          break;
        case 'idcard':
          if (!idCard) {
            const id = await studentPortalService.getIdCard();
            setIdCard(id);
          }
          break;
        case 'leave':
          if (!leaves.length) {
            const lRes = await api.get('/student-portal/leaves');
            setLeaves(lRes.data.data?.leaves || []);
          }
          break;
        case 'homework':
          if (!homework.length) {
            const hw = await studentPortalService.getHomework();
            setHomework(hw.homework || []);
          }
          break;
        case 'assignments':
          if (!assignments.length) {
            const asg = await studentPortalService.getAssignments();
            setAssignments(asg.assignments || []);
          }
          break;
        case 'study_materials':
          if (!studyMaterials.length) {
            const sm = await studentPortalService.getStudyMaterials();
            setStudyMaterials(sm.materials || []);
          }
          break;
        case 'videos':
          if (!videos.length) {
            const v = await studentPortalService.getSubjectVideos();
            setVideos(v.videos || []);
          }
          break;
        case 'qr_learning':
          if (!qrHistory.length) {
            const qr = await studentPortalService.getQRHistory();
            setQrHistory(qr.scans || []);
          }
          break;
        case 'examination':
          if (!hallTicket) {
            const ht = await studentPortalService.getHallTicket();
            setHallTicket(ht);
          }
          break;
        case 'certificates':
          if (!certificates.length) {
            const cert = await studentPortalService.getCertificates();
            setCertificates(cert.certificates || []);
          }
          break;
        case 'portfolio':
          if (!portfolio) {
            const pf = await studentPortalService.getPortfolio();
            setPortfolio(pf);
          }
          break;
        case 'analytics':
          if (!analytics) {
            const an = await studentPortalService.getAnalytics();
            setAnalytics(an);
          }
          break;
        default: break;
      }
    } catch { /* graceful fallback */ }
    setTabLoading(false);
  }, [
    attendance, results, fees, library, timetable, notices, idCard, leaves,
    homework, assignments, studyMaterials, videos, qrHistory, hallTicket,
    certificates, portfolio, analytics, calYear, calMonth
  ]);

  useEffect(() => { loadTab(activeTab); }, [activeTab, loadTab]);

  // ── Action Handlers ─────────────────────────────────────────
  const submitLeaveHandler = async (e: React.FormEvent) => {
    e.preventDefault();
    setTabLoading(true);
    try {
      await api.post('/student-portal/leaves', leaveForm);
      toast.success('Leave application submitted for approval!');
      setShowLeaveForm(false);
      const lRes = await api.get('/student-portal/leaves');
      setLeaves(lRes.data.data?.leaves || []);
    } catch {
      toast.error('Could not submit leave application.');
    }
    setTabLoading(false);
  };

  const sendAIChat = async (msgOverride?: string) => {
    const query = msgOverride || chatInput.trim();
    if (!query) return;
    setChatMessages(prev => [...prev, { role: 'user', content: query }]);
    if (!msgOverride) setChatInput('');
    setChatLoading(true);
    try {
      const res = await api.post('/student-portal/ai-chat', { message: query, language: chatLang });
      setChatMessages(prev => [...prev, { role: 'assistant', content: res.data.data.reply }]);
    } catch {
      setChatMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, I am unable to connect to VidyaBot AI right now.' }]);
    }
    setChatLoading(false);
  };

  const handleHomeworkSubmit = async () => {
    if (!showHomeworkModal) return;
    try {
      await studentPortalService.submitHomework(showHomeworkModal.id, homeworkText);
      toast.success('Homework submitted successfully!');
      setShowHomeworkModal(null);
      setHomeworkText('');
    } catch {
      toast.error('Submission failed.');
    }
  };

  const handleProfileUpdateReq = async () => {
    try {
      await studentPortalService.requestProfileUpdate(profileReq.field_name, profileReq.proposed_value, profileReq.reason);
      toast.success('Correction request submitted to school office!');
      setShowProfileModal(false);
    } catch {
      toast.error('Could not send correction request.');
    }
  };

  const handleDoubtSubmit = async () => {
    try {
      await studentPortalService.sendDoubtRequest(doubtForm.subject, doubtForm.question);
      toast.success('Doubt request sent to subject teacher!');
      setShowDoubtModal(false);
      setDoubtForm({ subject: 'Mathematics', question: '' });
    } catch {
      toast.error('Could not send doubt.');
    }
  };

  const handleQRScan = async () => {
    if (!qrCodeInput.trim()) return;
    try {
      const res = await studentPortalService.scanQRCode(qrCodeInput);
      setScannedResult(res.data);
      toast.success('QR Code unlocked chapter content!');
    } catch {
      toast.error('Invalid QR Code.');
    }
  };

  // ── Render Guard ───────────────────────────────────────────
  if (loading) {
    return (
      <div className={styles.portal}>
        <div className={styles.loading}>
          <div className={styles.spinner} />
          <p>Loading Digital Student Workspace...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.portal}>
        <div className={styles.card} style={{ textAlign: 'center', padding: 40 }}>
          <AlertCircle size={40} color="var(--color-danger)" style={{ margin: '0 auto 12px' }} />
          <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>Student Portal Restricted</h2>
          <p style={{ color: 'var(--color-text-muted)', marginTop: 8 }}>{error}</p>
        </div>
      </div>
    );
  }

  const p = profile!;
  const initials = p.full_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div className={styles.portal}>
      {/* ── Page Header ────────────────────────────────────────── */}
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>
            <GraduationCap size={24} color="var(--color-primary)" />
            Student Digital Workspace
          </h1>
          <p className={styles.pageSub}>
            Welcome, {p.full_name} • Standard {p.standard}-{p.division || 'A'} • Academic Year {p.academic_year || '2025-2026'}
          </p>
        </div>
        <button className={styles.primaryBtn} onClick={() => setActiveTab('aichat')}>
          <Bot size={16} /> Ask AI Tutor
        </button>
      </div>

      {/* ── Welcome Hero Card ──────────────────────────────────── */}
      <div className={styles.hero}>
        <div className={styles.avatar}>
          {p.photo_path ? <img src={`/storage/${p.photo_path}`} alt={p.full_name} /> : initials}
        </div>
        <div className={styles.heroInfo}>
          <h2 className={styles.heroName}>{p.full_name}</h2>
          {p.full_name_marathi && <p className={styles.heroNameMr}>{p.full_name_marathi}</p>}
          <div className={styles.heroBadges}>
            <span className={styles.badge}>Std {p.standard}-{p.division || 'A'}</span>
            <span className={styles.badge}>GR: {p.gr_number}</span>
            {p.roll_number && <span className={styles.badge}>Roll #{p.roll_number}</span>}
            <span className={styles.badge}>Pratap House</span>
          </div>
        </div>
      </div>

      {/* ── Metric Stats Overview Grid ─────────────────────────── */}
      <div className={styles.overviewGrid}>
        <div className={styles.overviewCard} style={{ '--c': 'var(--color-success)' } as any} onClick={() => setActiveTab('attendance')}>
          <div className={styles.overviewIcon}><CalendarDays size={20} /></div>
          <div className={styles.overviewVal}>{p.stats.attendance_percentage}%</div>
          <div className={styles.overviewLabel}>Attendance Percentage</div>
        </div>
        <div className={styles.overviewCard} style={{ '--c': 'var(--color-danger)' } as any} onClick={() => setActiveTab('fees')}>
          <div className={styles.overviewIcon}><CreditCard size={20} /></div>
          <div className={styles.overviewVal}>₹{p.stats.pending_fees}</div>
          <div className={styles.overviewLabel}>Pending Fees</div>
        </div>
        <div className={styles.overviewCard} style={{ '--c': 'var(--color-primary)' } as any} onClick={() => setActiveTab('library')}>
          <div className={styles.overviewIcon}><Library size={20} /></div>
          <div className={styles.overviewVal}>{p.stats.issued_books}</div>
          <div className={styles.overviewLabel}>Issued Library Books</div>
        </div>
        <div className={styles.overviewCard} style={{ '--c': 'var(--color-warning)' } as any} onClick={() => setActiveTab('examination')}>
          <div className={styles.overviewIcon}><Ticket size={20} /></div>
          <div className={styles.overviewVal}>{p.stats.upcoming_exams}</div>
          <div className={styles.overviewLabel}>Upcoming Exams</div>
        </div>
      </div>

      {/* ── Tab Navigation Bar ──────────────────────────────────── */}
      <nav className={styles.tabNav} aria-label="Student portal navigation">
        {STUDENT_TABS.map(t => (
          <button
            key={t.id}
            className={`${styles.tabBtn} ${activeTab === t.id ? styles.tabBtnActive : ''}`}
            onClick={() => setActiveTab(t.id)}
            aria-current={activeTab === t.id ? 'page' : undefined}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </nav>

      {/* ── ACTIVE FEATURE SECTION CONTENT ───────────────────────── */}
      {tabLoading ? (
        <div className={styles.loading}>
          <div className={styles.spinner} />
          <p>Loading feature workspace...</p>
        </div>
      ) : (
        <>
          {/* 1. DASHBOARD OVERVIEW */}
          {activeTab === 'dashboard' && (
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 'var(--space-5)' }}>
              <div className={styles.card}>
                <div className={styles.cardHeader}>
                  <h3 className={styles.cardTitle}><CalendarDays size={18} color="var(--color-primary)" /> Today's Class Schedule</h3>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ padding: '12px 16px', background: 'var(--color-surface-2)', borderRadius: 'var(--radius-md)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <strong style={{ color: 'var(--color-text-primary)' }}>09:00 AM - 10:00 AM</strong>
                      <span className={`${styles.tag} ${styles.tagPrimary}`} style={{ marginLeft: 8 }}>Mathematics</span>
                    </div>
                    <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>Room 102 • Prof. S. R. Patil</span>
                  </div>
                  <div style={{ padding: '12px 16px', background: 'var(--color-surface-2)', borderRadius: 'var(--radius-md)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <strong style={{ color: 'var(--color-text-primary)' }}>10:15 AM - 11:15 AM</strong>
                      <span className={`${styles.tag} ${styles.tagSuccess}`} style={{ marginLeft: 8 }}>Science & Tech</span>
                    </div>
                    <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>Lab 2 • Mrs. A. V. Deshmukh</span>
                  </div>
                  <div style={{ padding: '12px 16px', background: 'var(--color-surface-2)', borderRadius: 'var(--radius-md)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <strong style={{ color: 'var(--color-text-primary)' }}>11:30 AM - 12:30 PM</strong>
                      <span className={`${styles.tag} ${styles.tagWarning}`} style={{ marginLeft: 8 }}>English Literature</span>
                    </div>
                    <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>Room 102 • Mr. K. N. Shinde</span>
                  </div>
                </div>

                <div className={styles.cardHeader} style={{ marginTop: 16 }}>
                  <h3 className={styles.cardTitle}><BookOpen size={18} color="var(--color-danger)" /> Pending Homework Alerts</h3>
                </div>
                <div style={{ padding: '14px', background: 'var(--color-danger-light)', borderRadius: 'var(--radius-lg)', border: '1px solid color-mix(in srgb, var(--color-danger) 30%, transparent)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 700, color: 'var(--color-danger-dark)' }}>Math Quadratic Equations Ex 3.2</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', marginTop: 2 }}>Due: 26 July 2026 • High Priority</div>
                  </div>
                  <button className={styles.primaryBtn} onClick={() => setActiveTab('homework')}>Submit Homework</button>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
                <div className={styles.card}>
                  <div className={styles.cardHeader}>
                    <h3 className={styles.cardTitle}><Sparkles size={18} color="var(--color-warning)" /> School Notices</h3>
                  </div>
                  <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', margin: 0, lineHeight: 1.5 }}>
                    <strong>Independence Day Cultural Auditions</strong><br />
                    Auditions for Marathi folk dance and patriotic singing start on 1st August in the Assembly Hall.
                  </p>
                </div>

                <div className={styles.card}>
                  <div className={styles.cardHeader}>
                    <h3 className={styles.cardTitle}><Plus size={18} color="var(--color-primary)" /> Quick Actions</h3>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <button className={styles.secondaryBtn} onClick={() => setActiveTab('examination')}><Ticket size={14} /> Hall Ticket</button>
                    <button className={styles.secondaryBtn} onClick={() => setActiveTab('leave')}><Palmtree size={14} /> Apply Leave</button>
                    <button className={styles.secondaryBtn} onClick={() => setActiveTab('fees')}><CreditCard size={14} /> View Fees</button>
                    <button className={styles.secondaryBtn} onClick={() => setActiveTab('results')}><BarChart3 size={14} /> Marksheet</button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 2. PROFILE */}
          {activeTab === 'profile' && (
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <h3 className={styles.cardTitle}><UserCheck size={20} color="var(--color-primary)" /> Comprehensive Student Profile</h3>
                <button className={styles.secondaryBtn} onClick={() => setShowProfileModal(true)}>Request Correction</button>
              </div>
              <div className={styles.profileGrid}>
                <div className={styles.profileSection}>
                  <div className={styles.profileSectionTitle}>Personal Details</div>
                  <div className={styles.profileField}><span className={styles.profileFieldLabel}>Full Name:</span><span className={styles.profileFieldValue}>{p.full_name}</span></div>
                  <div className={styles.profileField}><span className={styles.profileFieldLabel}>Marathi Name:</span><span className={styles.profileFieldValue}>{p.full_name_marathi || '—'}</span></div>
                  <div className={styles.profileField}><span className={styles.profileFieldLabel}>Date of Birth:</span><span className={styles.profileFieldValue}>{formatDate(p.dob)}</span></div>
                  <div className={styles.profileField}><span className={styles.profileFieldLabel}>Gender / Blood Group:</span><span className={styles.profileFieldValue}>{p.gender || 'Male'} / {p.blood_group || 'O+'}</span></div>
                </div>
                <div className={styles.profileSection}>
                  <div className={styles.profileSectionTitle}>Academic & Parent Information</div>
                  <div className={styles.profileField}><span className={styles.profileFieldLabel}>Standard & Division:</span><span className={styles.profileFieldValue}>Std {p.standard} - {p.division || 'A'}</span></div>
                  <div className={styles.profileField}><span className={styles.profileFieldLabel}>Father Name:</span><span className={styles.profileFieldValue}>{p.father_name || 'Shri Patil'}</span></div>
                  <div className={styles.profileField}><span className={styles.profileFieldLabel}>Mother Name:</span><span className={styles.profileFieldValue}>{p.mother_name_full || 'Smt. Patil'}</span></div>
                  <div className={styles.profileField}><span className={styles.profileFieldLabel}>Parent Mobile:</span><span className={styles.profileFieldValue}>{p.father_mobile || '9876543210'}</span></div>
                </div>
              </div>
            </div>
          )}

          {/* 3. ATTENDANCE */}
          {activeTab === 'attendance' && (
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <h3 className={styles.cardTitle}><CalendarDays size={20} color="var(--color-success)" /> Monthly Attendance Record</h3>
                <button className={styles.primaryBtn} onClick={() => toast.success('Attendance Report Downloaded!')}><Download size={14} /> Download Report</button>
              </div>
              <div className={styles.attendanceLayout}>
                <div>
                  <div className={styles.monthNav}>
                    <button className={styles.secondaryBtn} onClick={() => setCalMonth(m => m > 1 ? m-1 : 12)}>◀ Prev</button>
                    <span className={styles.monthTitle}>{calYear} / Month {calMonth}</span>
                    <button className={styles.secondaryBtn} onClick={() => setCalMonth(m => m < 12 ? m+1 : 1)}>Next ▶</button>
                  </div>
                  <div className={styles.calendarGrid}>
                    {DAYS.map(d => <div key={d} className={styles.calDayHeader}>{d}</div>)}
                    {Array.from({ length: 30 }, (_, i) => i + 1).map(day => (
                      <div key={day} className={`${styles.calDay} ${day % 7 === 0 ? styles.calDayHoliday : styles.calDayPresent}`}>
                        {day}
                      </div>
                    ))}
                  </div>
                </div>
                <div style={{ background: 'var(--color-surface-2)', padding: '16px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Present Days:</span><strong>24 Days</strong></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--color-danger)' }}><span>Absent Days:</span><strong>1 Day</strong></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--color-warning)' }}><span>Late Entries:</span><strong>2 Days</strong></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Percentage:</span><strong style={{ color: 'var(--color-success)' }}>{p.stats.attendance_percentage}%</strong></div>
                </div>
              </div>
            </div>
          )}

          {/* 4. HOMEWORK */}
          {activeTab === 'homework' && (
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <h3 className={styles.cardTitle}><BookOpen size={20} color="var(--color-primary)" /> Homework Portal</h3>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {homework.map(hw => (
                  <div key={hw.id} style={{ padding: '16px', background: 'var(--color-surface-2)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <span className={`${styles.tag} ${styles.tagPrimary}`}>{hw.subject} • {hw.teacher}</span>
                      <h4 style={{ margin: '8px 0 4px', fontSize: '1rem', fontWeight: 700 }}>{hw.title}</h4>
                      <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>{hw.description}</p>
                      <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: 6 }}>Due: {hw.due_date} | Priority: {hw.priority}</div>
                    </div>
                    <button className={styles.primaryBtn} onClick={() => setShowHomeworkModal(hw)}>
                      {hw.status === 'submitted' ? 'Resubmit' : 'Upload Solution'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 5. ASSIGNMENTS */}
          {activeTab === 'assignments' && (
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <h3 className={styles.cardTitle}><ClipboardList size={20} color="var(--color-primary)" /> Subject Assignments</h3>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {assignments.map(asg => (
                  <div key={asg.id} style={{ padding: '16px', background: 'var(--color-surface-2)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)' }}>
                    <span className={`${styles.tag} ${styles.tagWarning}`}>{asg.subject} • Due: {asg.due_date}</span>
                    <h4 style={{ margin: '8px 0 4px', fontSize: '1rem', fontWeight: 700 }}>{asg.title}</h4>
                    <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>{asg.instructions}</p>
                    {asg.marks_obtained && <div style={{ fontWeight: 700, color: 'var(--color-success)', marginTop: 8 }}>Marks: {asg.marks_obtained} / {asg.max_marks}</div>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 6. STUDY MATERIALS */}
          {activeTab === 'study_materials' && (
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <h3 className={styles.cardTitle}><FileText size={20} color="var(--color-primary)" /> Study Notes & PDF Documents</h3>
              </div>
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead><tr><th>Subject</th><th>Title</th><th>Type</th><th>Size</th><th>Action</th></tr></thead>
                  <tbody>
                    {studyMaterials.map(mat => (
                      <tr key={mat.id}>
                        <td><span className={`${styles.tag} ${styles.tagPrimary}`}>{mat.subject}</span></td>
                        <td><strong>{mat.title}</strong></td>
                        <td>{mat.file_type.toUpperCase()}</td>
                        <td>{mat.file_size}</td>
                        <td><button className={styles.secondaryBtn} onClick={() => toast.success(`Downloading ${mat.title}...`)}><Download size={14} /> Download</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 7. VIDEO LECTURES */}
          {activeTab === 'videos' && (
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <h3 className={styles.cardTitle}><Video size={20} color="var(--color-primary)" /> Subject Video Lectures</h3>
              </div>
              {activeVideo && (
                <div style={{ aspectRatio: '16/9', background: '#000', borderRadius: 'var(--radius-lg)', overflow: 'hidden', marginBottom: 16 }}>
                  <video src={activeVideo.video_url} controls autoPlay style={{ width: '100%', height: '100%' }} />
                </div>
              )}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '16px' }}>
                {videos.map(vid => (
                  <div key={vid.id} style={{ padding: '16px', background: 'var(--color-surface-2)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div style={{ fontWeight: 700 }}>{vid.title}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>{vid.subject} • {vid.teacher} ({vid.duration})</div>
                    <button className={styles.primaryBtn} onClick={() => setActiveVideo(vid)}><Video size={14} /> Watch Lecture</button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 8. AI TUTOR */}
          {activeTab === 'aichat' && (
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <h3 className={styles.cardTitle}><Bot size={20} color="var(--color-primary)" /> VidyaBot — AI Learning Assistant</h3>
                <button className={styles.secondaryBtn} onClick={() => setChatLang(l => l === 'en' ? 'mr' : 'en')}>Language: {chatLang === 'en' ? 'English' : 'मराठी'}</button>
              </div>
              <div style={{ background: 'var(--color-surface-2)', borderRadius: 'var(--radius-lg)', padding: '16px', height: 320, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10, border: '1px solid var(--color-border)' }}>
                {chatMessages.map((m, i) => (
                  <div key={i} style={{ alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start', background: m.role === 'user' ? 'var(--color-primary)' : 'var(--color-surface)', color: m.role === 'user' ? 'white' : 'var(--color-text-primary)', padding: '10px 14px', borderRadius: 'var(--radius-md)', maxWidth: '80%', fontSize: '0.875rem', border: '1px solid var(--color-border)' }}>
                    {m.content}
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <input className={styles.inputField} style={{ flex: 1 }} value={chatInput} onChange={e => setChatInput(e.target.value)} placeholder="Ask VidyaBot about any subject formula, definition, or doubt..." onKeyDown={e => e.key === 'Enter' && sendAIChat()} />
                <button className={styles.primaryBtn} onClick={() => sendAIChat()} disabled={chatLoading}>Send</button>
              </div>
            </div>
          )}

          {/* 9. QR SCANNER */}
          {activeTab === 'qr_learning' && (
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <h3 className={styles.cardTitle}><QrCode size={20} color="var(--color-primary)" /> Classroom QR Code Scanner</h3>
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <input className={styles.inputField} style={{ flex: 1 }} value={qrCodeInput} onChange={e => setQrCodeInput(e.target.value)} placeholder="Enter or scan Classroom QR Code (e.g. QR-MATH-10-CH3)" />
                <button className={styles.primaryBtn} onClick={handleQRScan}>Scan QR</button>
              </div>
              {scannedResult && (
                <div style={{ padding: 16, background: 'var(--color-success-light)', border: '1px solid color-mix(in srgb, var(--color-success) 30%, transparent)', borderRadius: 'var(--radius-lg)', marginTop: 12 }}>
                  <h4 style={{ color: 'var(--color-success-dark)', margin: 0 }}>Unlocked: {scannedResult.chapter_name}</h4>
                  <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', margin: '4px 0 0' }}>Subject: {scannedResult.subject}</p>
                </div>
              )}
            </div>
          )}

          {/* 10. TIMETABLE */}
          {activeTab === 'timetable' && (
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <h3 className={styles.cardTitle}><CalendarDays size={20} color="var(--color-primary)" /> Class Timetable (Std {p.standard}-{p.division})</h3>
              </div>
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead><tr><th>Day</th><th>Period 1</th><th>Period 2</th><th>Period 3</th></tr></thead>
                  <tbody>
                    {timetable?.timetable?.map((day: any) => (
                      <tr key={day.day}>
                        <td><strong>{day.day_en}</strong></td>
                        {day.periods.slice(0, 3).map((per: any, i: number) => (
                          <td key={i}>{per.subject} ({per.start_time})</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 11. HALL TICKET */}
          {activeTab === 'examination' && (
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <h3 className={styles.cardTitle}><Ticket size={20} color="var(--color-warning)" /> Exam Hall Ticket</h3>
                <button className={styles.primaryBtn} onClick={() => toast.success('Hall Ticket PDF Downloaded!')}><Download size={14} /> Download PDF</button>
              </div>
              {hallTicket && (
                <div className={styles.tableWrap}>
                  <table className={styles.table}>
                    <thead><tr><th>Date</th><th>Subject</th><th>Time</th><th>Paper Code</th></tr></thead>
                    <tbody>
                      {hallTicket.schedule.map((s: any, i: number) => (
                        <tr key={i}><td>{s.date}</td><td><strong>{s.subject}</strong></td><td>{s.time}</td><td>{s.paper_code}</td></tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* 12. RESULTS */}
          {activeTab === 'results' && (
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <h3 className={styles.cardTitle}><BarChart3 size={20} color="var(--color-primary)" /> Examination Marksheets</h3>
              </div>
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead><tr><th>Exam</th><th>Percentage</th><th>Status</th></tr></thead>
                  <tbody>
                    {results.map(res => (
                      <tr key={res.exam_id}>
                        <td><strong>{res.exam_type}</strong></td>
                        <td><strong style={{ color: 'var(--color-success)' }}>{res.percentage}%</strong></td>
                        <td><span className={`${styles.tag} ${styles.tagSuccess}`}>Passed</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 13. CERTIFICATES */}
          {activeTab === 'certificates' && (
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <h3 className={styles.cardTitle}><Award size={20} color="var(--color-primary)" /> Digital Certificates</h3>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {certificates.map(cert => (
                  <div key={cert.id} style={{ padding: 16, background: 'var(--color-surface-2)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <span className={`${styles.tag} ${styles.tagPrimary}`}>{cert.type.toUpperCase()} • Verified</span>
                      <h4 style={{ margin: '6px 0 2px', fontSize: '1rem' }}>{cert.title}</h4>
                      <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Issued: {cert.issued_date}</div>
                    </div>
                    <button className={styles.primaryBtn} onClick={() => toast.success(`Downloading ${cert.title}...`)}><Download size={14} /> Download</button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 14. LIBRARY */}
          {activeTab === 'library' && (
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <h3 className={styles.cardTitle}><Library size={20} color="var(--color-primary)" /> Issued Library Books</h3>
              </div>
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead><tr><th>Book Title</th><th>Author</th><th>Due Date</th><th>Status</th></tr></thead>
                  <tbody>
                    {library?.issued?.map((b: any) => (
                      <tr key={b.issue_id}>
                        <td><strong>{b.title}</strong></td>
                        <td>{b.author}</td>
                        <td>{b.due_date}</td>
                        <td><span className={`${styles.tag} ${b.is_overdue ? styles.tagDanger : styles.tagSuccess}`}>{b.is_overdue ? 'Overdue' : 'Issued'}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 15. FEES */}
          {activeTab === 'fees' && (
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <h3 className={styles.cardTitle}><CreditCard size={20} color="var(--color-danger)" /> Fee Structure & Receipts</h3>
              </div>
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead><tr><th>Category</th><th>Amount</th><th>Paid</th><th>Status</th><th>Receipt</th></tr></thead>
                  <tbody>
                    {fees?.fee_records?.map((rec: any) => (
                      <tr key={rec.id}>
                        <td><strong>{rec.category}</strong></td>
                        <td>₹{rec.amount}</td>
                        <td style={{ color: 'var(--color-success)', fontWeight: 700 }}>₹{rec.amount_paid}</td>
                        <td><span className={`${styles.tag} ${rec.status === 'paid' ? styles.tagSuccess : styles.tagDanger}`}>{rec.status}</span></td>
                        <td><button className={styles.secondaryBtn} onClick={() => toast.success('Receipt Downloaded!')}><Download size={14} /> Receipt</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 16. LEAVE REQUEST */}
          {activeTab === 'leave' && (
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <h3 className={styles.cardTitle}><Palmtree size={20} color="var(--color-primary)" /> Leave Applications</h3>
                <button className={styles.primaryBtn} onClick={() => setShowLeaveForm(true)}><Plus size={14} /> Apply Leave</button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {leaves.map((l, i) => (
                  <div key={i} style={{ padding: 16, background: 'var(--color-surface-2)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)' }}>
                    <span className={`${styles.tag} ${styles.tagPrimary}`}>{l.status.toUpperCase()}</span>
                    <h4 style={{ margin: '6px 0 2px' }}>Leave Date: {l.date}</h4>
                    <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>{l.remarks || 'Reason submitted to class teacher.'}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 17. PORTFOLIO */}
          {activeTab === 'portfolio' && (
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <h3 className={styles.cardTitle}><Award size={20} color="var(--color-warning)" /> Earned Badges & Achievements</h3>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 16 }}>
                {portfolio?.badges?.map((b: any) => (
                  <div key={b.id} style={{ padding: 16, background: 'var(--color-surface-2)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)', textAlign: 'center' }}>
                    <div style={{ fontSize: 32, marginBottom: 8 }}>{b.icon}</div>
                    <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{b.name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: 4 }}>Earned {b.earned_date}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 18. DOUBTS & NOTICES */}
          {activeTab === 'communication' && (
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <h3 className={styles.cardTitle}><HelpCircle size={20} color="var(--color-primary)" /> Teacher Doubts & School Circulars</h3>
                <button className={styles.primaryBtn} onClick={() => setShowDoubtModal(true)}><Plus size={14} /> Ask Doubt</button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {notices.map(n => (
                  <div key={n.id} style={{ padding: 16, background: 'var(--color-surface-2)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)' }}>
                    <span className={`${styles.tag} ${styles.tagPrimary}`}>{n.type}</span>
                    <h4 style={{ margin: '6px 0 2px' }}>{n.title}</h4>
                    <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>{n.body}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 19. DOWNLOADS */}
          {activeTab === 'downloads' && (
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <h3 className={styles.cardTitle}><Download size={20} color="var(--color-primary)" /> Centralized Student Download Hub</h3>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 }}>
                <button className={styles.secondaryBtn} style={{ padding: 20, textAlign: 'center', justifyContent: 'center' }} onClick={() => toast.success('Downloading Hall Ticket...')}><Ticket size={16} /> Download Hall Ticket</button>
                <button className={styles.secondaryBtn} style={{ padding: 20, textAlign: 'center', justifyContent: 'center' }} onClick={() => toast.success('Downloading Marksheet...')}><BarChart3 size={16} /> Download Marksheet</button>
                <button className={styles.secondaryBtn} style={{ padding: 20, textAlign: 'center', justifyContent: 'center' }} onClick={() => toast.success('Downloading Attendance Report...')}><CalendarDays size={16} /> Download Attendance</button>
                <button className={styles.secondaryBtn} style={{ padding: 20, textAlign: 'center', justifyContent: 'center' }} onClick={() => toast.success('Downloading Fee Receipts...')}><CreditCard size={16} /> Fee Payment Receipts</button>
              </div>
            </div>
          )}

          {/* 20. ANALYTICS */}
          {activeTab === 'analytics' && (
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <h3 className={styles.cardTitle}><BarChart3 size={20} color="var(--color-primary)" /> Academic Analytics & Study Progress</h3>
              </div>
              {analytics && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div className={styles.profileSection}>
                    <div className={styles.profileSectionTitle}>Study Metrics</div>
                    <div className={styles.profileField}><span>Homework Completion:</span><strong>{analytics.homework_completion_pct}%</strong></div>
                    <div className={styles.profileField}><span>Assignment Completion:</span><strong>{analytics.assignment_completion_pct}%</strong></div>
                    <div className={styles.profileField}><span>Weekly Study Hours:</span><strong>{analytics.weekly_study_hours} hrs</strong></div>
                  </div>
                  <div className={styles.profileSection}>
                    <div className={styles.profileSectionTitle}>AI Study Recommendation</div>
                    <p style={{ margin: 0, fontSize: '0.875rem', lineHeight: 1.6, color: 'var(--color-text-secondary)' }}>{analytics.ai_insights}</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 21. ID CARD */}
          {activeTab === 'idcard' && (
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <h3 className={styles.cardTitle}><UserCheck size={20} color="var(--color-primary)" /> Digital Identity Card</h3>
                <button className={styles.primaryBtn} onClick={() => window.print()}><Download size={14} /> Print ID Card</button>
              </div>
              <div style={{ padding: 24, background: 'var(--gradient-primary)', borderRadius: 'var(--radius-xl)', color: 'white', maxWidth: 360, margin: '0 auto' }}>
                <h3 style={{ margin: 0, fontSize: '1.25rem' }}>Hindkesri Maruti Mane Vidyalay</h3>
                <p style={{ opacity: 0.8, fontSize: '0.8rem', margin: '2px 0 16px' }}>Student Identity Card 2025-26</p>
                <div style={{ fontSize: '1.25rem', fontWeight: 800 }}>{p.full_name}</div>
                <div style={{ fontSize: '0.875rem', marginTop: 4 }}>Standard: Std {p.standard}-{p.division} | Roll #{p.roll_number}</div>
                <div style={{ fontSize: '0.875rem', marginTop: 12, borderTop: '1px solid rgba(255,255,255,0.3)', paddingTop: 8, display: 'flex', justifyContent: 'space-between' }}>
                  <span>GR: {p.gr_number}</span>
                  <span>Blood: {p.blood_group || 'O+'}</span>
                </div>
              </div>
            </div>
          )}

          {/* 22. SETTINGS */}
          {activeTab === 'settings' && (
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <h3 className={styles.cardTitle}><Settings size={20} color="var(--color-primary)" /> Workspace Settings</h3>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 360 }}>
                <label style={{ fontSize: '0.875rem', fontWeight: 600 }}>Language / भाषा preference</label>
                <select className={styles.selectField} value={i18n.language} onChange={e => i18n.changeLanguage(e.target.value)}>
                  <option value="en">English</option>
                  <option value="mr">मराठी (Marathi)</option>
                </select>
                <button className={styles.primaryBtn} onClick={() => toast.success('Language setting updated!')}>Save Settings</button>
              </div>
            </div>
          )}
        </>
      )}

      {/* ── MODALS ────────────────────────────────────────────── */}
      {showProfileModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <div className={styles.modalTitle}>
              <span>Request Profile Correction</span>
              <button className={styles.closeBtn} onClick={() => setShowProfileModal(false)}>✕</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <label style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>Field Name</label>
              <select className={styles.selectField} value={profileReq.field_name} onChange={e => setProfileReq(r => ({ ...r, field_name: e.target.value }))}>
                <option value="father_mobile">Father Contact Mobile</option>
                <option value="address_line1">Residential Address</option>
                <option value="blood_group">Blood Group</option>
              </select>
              <label style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>Correct Value</label>
              <input className={styles.inputField} value={profileReq.proposed_value} onChange={e => setProfileReq(r => ({ ...r, proposed_value: e.target.value }))} placeholder="Enter corrected value" />
              <label style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>Reason</label>
              <input className={styles.inputField} value={profileReq.reason} onChange={e => setProfileReq(r => ({ ...r, reason: e.target.value }))} placeholder="Reason for correction..." />
              <button className={styles.primaryBtn} style={{ marginTop: 8 }} onClick={handleProfileUpdateReq}>Submit Request</button>
            </div>
          </div>
        </div>
      )}

      {showHomeworkModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <div className={styles.modalTitle}>
              <span>Submit Homework: {showHomeworkModal.title}</span>
              <button className={styles.closeBtn} onClick={() => setShowHomeworkModal(null)}>✕</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <textarea className={styles.inputField} rows={4} value={homeworkText} onChange={e => setHomeworkText(e.target.value)} placeholder="Write your solution steps..." />
              <button className={styles.primaryBtn} onClick={handleHomeworkSubmit}>Upload Solution</button>
            </div>
          </div>
        </div>
      )}

      {showLeaveForm && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <div className={styles.modalTitle}>
              <span>Submit Leave Request</span>
              <button className={styles.closeBtn} onClick={() => setShowLeaveForm(false)}>✕</button>
            </div>
            <form onSubmit={submitLeaveHandler} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <select className={styles.selectField} value={leaveForm.leave_type} onChange={e => setLeaveForm(f => ({ ...f, leave_type: e.target.value }))}>
                <option value="casual">Casual Leave</option>
                <option value="medical">Medical Leave</option>
              </select>
              <input type="date" className={styles.inputField} value={leaveForm.start_date} onChange={e => setLeaveForm(f => ({ ...f, start_date: e.target.value }))} required />
              <input type="date" className={styles.inputField} value={leaveForm.end_date} onChange={e => setLeaveForm(f => ({ ...f, end_date: e.target.value }))} required />
              <input className={styles.inputField} value={leaveForm.reason} onChange={e => setLeaveForm(f => ({ ...f, reason: e.target.value }))} placeholder="Reason for leave..." required />
              <button type="submit" className={styles.primaryBtn} style={{ marginTop: 8 }}>Submit Leave</button>
            </form>
          </div>
        </div>
      )}

      {showDoubtModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <div className={styles.modalTitle}>
              <span>Ask Subject Doubt</span>
              <button className={styles.closeBtn} onClick={() => setShowDoubtModal(false)}>✕</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <select className={styles.selectField} value={doubtForm.subject} onChange={e => setDoubtForm(d => ({ ...d, subject: e.target.value }))}>
                <option value="Mathematics">Mathematics</option>
                <option value="Science & Tech">Science & Tech</option>
                <option value="English">English</option>
                <option value="Marathi">Marathi</option>
              </select>
              <textarea className={styles.inputField} rows={4} value={doubtForm.question} onChange={e => setDoubtForm(d => ({ ...d, question: e.target.value }))} placeholder="Type your subject doubt..." />
              <button className={styles.primaryBtn} onClick={handleDoubtSubmit}>Send to Teacher</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
