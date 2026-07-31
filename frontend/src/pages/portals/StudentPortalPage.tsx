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
  AlertCircle, Sparkles, Clock, ChevronRight, ChevronLeft, X, ArrowUpRight, ClipboardList,
  CheckCircle2, XCircle, Calendar, Info
} from 'lucide-react';
import studentPortalService, {
  type StudentProfile, type AttendanceData,
  type ExamResult, type Notice,
} from '../../services/studentPortalService';
import officeService, { type BonafidePrintData } from '../../services/officeService';
import { BonafideCertificatePrint } from '../../components/office/BonafideCertificatePrint';
import api from '../../services/api';
import styles from './StudentPortalPage.module.css';
import toast from 'react-hot-toast';
import { StudentIdCard } from '../../components/shared';
import { StudentDashboardHero } from '../../components/student/dashboard/StudentDashboardHero';


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

const MONTH_NAMES_EN = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const MONTH_NAMES_MR = [
  'जानेवारी', 'फेब्रुवारी', 'मार्च', 'एप्रिल', 'मे', 'जून',
  'जुलै', 'ऑगस्ट', 'सप्टेंबर', 'ऑक्टोबर', 'नोव्हेंबर', 'डिसेंबर'
];

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

  // Bonafide Certificate States
  const [myBonafideApps, setMyBonafideApps]         = useState<any[]>([]);
  const [showApplyBonafideModal, setShowApplyBonafideModal] = useState(false);
  const [bonafidePurpose, setBonafidePurpose]       = useState('Passport / Government ID');
  const [bonafidePaymentMethod, setBonafidePaymentMethod] = useState('UPI');
  const [submittingBonafide, setSubmittingBonafide] = useState(false);
  const [studentPrintData, setStudentPrintData]   = useState<BonafidePrintData | null>(null);

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

  // Calendar navigation & inspection
  const today = new Date();
  const [calYear,  setCalYear]              = useState(today.getFullYear());
  const [calMonth, setCalMonth]             = useState(today.getMonth() + 1);
  const [selectedDay, setSelectedDay]       = useState<number | null>(null);

  const fetchAttendance = useCallback(async (year: number, month: number) => {
    setTabLoading(true);
    try {
      const a = await studentPortalService.getAttendance(year, month);
      setAttendance(a);
    } catch {
      toast.error('Failed to load attendance records.');
    } finally {
      setTabLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'attendance') {
      fetchAttendance(calYear, calMonth);
    }
  }, [activeTab, calYear, calMonth, fetchAttendance]);

  const handlePrevMonth = () => {
    if (calMonth === 1) {
      setCalMonth(12);
      setCalYear(y => y - 1);
    } else {
      setCalMonth(m => m - 1);
    }
    setSelectedDay(null);
  };

  const handleNextMonth = () => {
    if (calMonth === 12) {
      setCalMonth(1);
      setCalYear(y => y + 1);
    } else {
      setCalMonth(m => m + 1);
    }
    setSelectedDay(null);
  };

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
          await fetchAttendance(calYear, calMonth);
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
          const [certRes, bdApps] = await Promise.all([
            studentPortalService.getCertificates(),
            studentPortalService.getMyBonafideApplications().catch(() => []),
          ]);
          setCertificates(certRes.certificates || []);
          const bdList = Array.isArray(bdApps) ? bdApps : (bdApps?.items || []);
          setMyBonafideApps(bdList);
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
  const handleApplyBonafide = async () => {
    if (!bonafidePurpose.trim()) {
      toast.error('Please specify a purpose for the Bonafide certificate.');
      return;
    }
    setSubmittingBonafide(true);
    try {
      await studentPortalService.applyBonafide({
        purpose: bonafidePurpose,
        fee_amount: 20,
        payment_method: bonafidePaymentMethod,
        payment_reference: `UPI-${Date.now()}`,
      });
      toast.success('₹20 fee paid & Bonafide application submitted to clerk!');
      setShowApplyBonafideModal(false);
      const bdApps = await studentPortalService.getMyBonafideApplications();
      setMyBonafideApps(Array.isArray(bdApps) ? bdApps : (bdApps?.items || []));
    } catch {
      toast.error('Failed to submit Bonafide application.');
    } finally {
      setSubmittingBonafide(false);
    }
  };

  const handleStudentPrintBonafide = async (appId: number) => {
    try {
      const data = await officeService.getBonafidePrintData(appId);
      setStudentPrintData(data);
    } catch {
      toast.error('Failed to load certificate printable view.');
    }
  };

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
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
              {/* Dashboard Hero Section (Title, Welcome Card & KPI Summary Cards) */}
              <StudentDashboardHero
                profile={p}
                onNavigateTab={setActiveTab}
              />

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
                  </div>
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
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {/* Header card with month picker & summary download */}
              <div className={styles.card}>
                <div className={styles.cardHeader}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ padding: 10, borderRadius: 'var(--radius-md)', background: 'color-mix(in srgb, var(--color-success) 15%, transparent)', color: 'var(--color-success-dark)' }}>
                      <CalendarDays size={22} />
                    </div>
                    <div>
                      <h3 className={styles.cardTitle}>Monthly Attendance Record</h3>
                      <p style={{ margin: 0, fontSize: '0.825rem', color: 'var(--color-text-muted)' }}>
                        Real-time daily attendance tracking & full academic year record for {p.full_name} (Std {p.standard}-{p.division})
                      </p>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    <button className={styles.primaryBtn} onClick={() => toast.success(`Attendance Report generated for ${MONTH_NAMES_EN[calMonth - 1]} ${calYear}!`)}>
                      <Download size={14} /> Download Monthly Report
                    </button>
                  </div>
                </div>

                {/* Calendar Layout */}
                <div className={styles.attendanceLayout}>
                  <div>
                    {/* Month Navigator Header */}
                    <div className={styles.monthNav}>
                      <button className={styles.secondaryBtn} onClick={handlePrevMonth} style={{ gap: 6 }}>
                        <ChevronLeft size={16} /> Previous Month
                      </button>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <select
                          className={styles.inputField}
                          style={{ padding: '6px 12px', fontWeight: 700, fontSize: '0.95rem' }}
                          value={calMonth}
                          onChange={e => { setCalMonth(Number(e.target.value)); setSelectedDay(null); }}
                        >
                          {MONTH_NAMES_EN.map((mName, idx) => (
                            <option key={idx} value={idx + 1}>{mName} ({MONTH_NAMES_MR[idx]})</option>
                          ))}
                        </select>

                        <select
                          className={styles.inputField}
                          style={{ padding: '6px 12px', fontWeight: 700, fontSize: '0.95rem' }}
                          value={calYear}
                          onChange={e => { setCalYear(Number(e.target.value)); setSelectedDay(null); }}
                        >
                          {[2024, 2025, 2026, 2027].map(y => (
                            <option key={y} value={y}>{y}</option>
                          ))}
                        </select>
                      </div>

                      <button className={styles.secondaryBtn} onClick={handleNextMonth} style={{ gap: 6 }}>
                        Next Month <ChevronRight size={16} />
                      </button>
                    </div>

                    {/* Calendar Grid */}
                    <div className={styles.calendarGrid}>
                      {DAYS.map(d => (
                        <div key={d} className={styles.calDayHeader} style={{ color: d === 'Sun' ? 'var(--color-danger)' : undefined }}>
                          {d}
                        </div>
                      ))}

                      {/* Leading Empty Blank Cells for Month Start Offset */}
                      {Array.from({ length: new Date(calYear, calMonth - 1, 1).getDay() }).map((_, idx) => (
                        <div key={`empty-${idx}`} className={`${styles.calDay} ${styles.calDayEmpty}`} />
                      ))}

                      {/* Days of Month */}
                      {Array.from({ length: new Date(calYear, calMonth, 0).getDate() }, (_, i) => i + 1).map(day => {
                        const dateObj = new Date(calYear, calMonth - 1, day);
                        const isSunday = dateObj.getDay() === 0;
                        const isTodayCell = day === today.getDate() && calMonth === (today.getMonth() + 1) && calYear === today.getFullYear();
                        const isFutureCell = dateObj > today;

                        const dayRecord = attendance?.daily?.[day];
                        const holidayName = attendance?.holidays?.[day];

                        let statusCls = styles.calDayUnmarked;
                        let statusIcon = null;
                        let statusTooltip = 'Not Marked';

                        if (holidayName) {
                          statusCls = styles.calDayHoliday;
                          statusIcon = <Palmtree size={12} />;
                          statusTooltip = `Holiday: ${holidayName}`;
                        } else if (dayRecord) {
                          if (dayRecord.status === 'present') {
                            statusCls = styles.calDayPresent;
                            statusIcon = <CheckCircle2 size={12} />;
                            statusTooltip = 'Present';
                          } else if (dayRecord.status === 'absent') {
                            statusCls = styles.calDayAbsent;
                            statusIcon = <XCircle size={12} />;
                            statusTooltip = 'Absent';
                          } else if (dayRecord.status === 'late') {
                            statusCls = styles.calDayLate;
                            statusIcon = <Clock size={12} />;
                            statusTooltip = 'Late Entry';
                          } else if (dayRecord.status === 'half_day') {
                            statusCls = styles.calDayHalfDay;
                            statusIcon = <Clock size={12} />;
                            statusTooltip = 'Half Day';
                          } else if (dayRecord.status === 'leave' || dayRecord.status === 'medical_leave') {
                            statusCls = styles.calDayLeave;
                            statusIcon = <UserCheck size={12} />;
                            statusTooltip = 'Approved Leave';
                          }
                        } else if (isSunday) {
                          statusCls = styles.calDaySunday;
                          statusTooltip = 'Sunday / Off';
                        } else if (isFutureCell) {
                          statusCls = styles.calDayFuture;
                          statusTooltip = 'Upcoming';
                        }

                        const isSelected = selectedDay === day;

                        return (
                          <div
                            key={day}
                            className={`
                              ${styles.calDay}
                              ${statusCls}
                              ${isTodayCell ? styles.calDayToday : ''}
                              ${isSelected ? styles.calDaySelected : ''}
                            `}
                            onClick={() => setSelectedDay(day)}
                            title={`${day} ${MONTH_NAMES_EN[calMonth - 1]} ${calYear}: ${statusTooltip}`}
                          >
                            <span>{day}</span>
                            {statusIcon && (
                              <span style={{ fontSize: '0.65rem', marginTop: 2, display: 'flex', alignItems: 'center' }}>
                                {statusIcon}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Color Legend Bar */}
                    <div className={styles.legendBar}>
                      <div className={styles.legendItem}>
                        <div className={styles.legendDot} style={{ background: '#dcfce7', border: '1px solid #86efac' }} />
                        <span>Present</span>
                      </div>
                      <div className={styles.legendItem}>
                        <div className={styles.legendDot} style={{ background: '#fee2e2', border: '1px solid #fca5a5' }} />
                        <span>Absent</span>
                      </div>
                      <div className={styles.legendItem}>
                        <div className={styles.legendDot} style={{ background: '#fef3c7', border: '1px solid #fde047' }} />
                        <span>Late / Half Day</span>
                      </div>
                      <div className={styles.legendItem}>
                        <div className={styles.legendDot} style={{ background: '#e0e7ff', border: '1px solid #a5b4fc' }} />
                        <span>Leave</span>
                      </div>
                      <div className={styles.legendItem}>
                        <div className={styles.legendDot} style={{ background: '#fef9c3', border: '1px solid #fde047' }} />
                        <span>Holiday</span>
                      </div>
                      <div className={styles.legendItem}>
                        <div className={styles.legendDot} style={{ background: '#f1f5f9', border: '1px solid #e2e8f0' }} />
                        <span>Sunday / Off</span>
                      </div>
                    </div>
                  </div>

                  {/* Right Sidebar: Real-time Monthly Statistics & Day Inspector */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {/* Monthly KPI Overview Card */}
                    <div style={{ background: 'var(--color-surface-2)', padding: 18, borderRadius: 'var(--radius-xl)', border: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column', gap: 14 }}>
                      <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: 'var(--color-text-primary)', borderBottom: '1px solid var(--color-border)', paddingBottom: 8 }}>
                        {MONTH_NAMES_EN[calMonth - 1]} {calYear} Summary
                      </h4>

                      {/* Percentage Highlight Gauge */}
                      <div style={{ padding: '14px', background: 'var(--color-surface)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)', textAlign: 'center' }}>
                        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Monthly Attendance</div>
                        <div style={{
                          fontSize: '2rem',
                          fontWeight: 900,
                          color: (attendance?.summary?.percentage ?? 0) >= 85 ? 'var(--color-success)' : (attendance?.summary?.percentage ?? 0) >= 75 ? 'var(--color-primary)' : 'var(--color-danger)',
                          margin: '4px 0'
                        }}>
                          {attendance?.summary?.percentage ?? 0}%
                        </div>

                        {/* Visual Progress Bar */}
                        <div style={{ width: '100%', height: 8, background: '#e2e8f0', borderRadius: 999, overflow: 'hidden', margin: '8px 0 6px' }}>
                          <div style={{
                            width: `${Math.min(100, Math.max(0, attendance?.summary?.percentage ?? 0))}%`,
                            height: '100%',
                            background: (attendance?.summary?.percentage ?? 0) >= 85 ? '#16a34a' : (attendance?.summary?.percentage ?? 0) >= 75 ? '#2563eb' : '#dc2626',
                            transition: 'width 0.4s ease'
                          }} />
                        </div>

                        <span className={`${styles.tag} ${(attendance?.summary?.percentage ?? 0) >= 85 ? styles.tagSuccess : (attendance?.summary?.percentage ?? 0) >= 75 ? styles.tagPrimary : styles.tagWarning}`}>
                          {(attendance?.summary?.percentage ?? 0) >= 85 ? 'Excellent Attendance' : (attendance?.summary?.percentage ?? 0) >= 75 ? 'Satisfactory' : 'Low Attendance Alert'}
                        </span>
                      </div>

                      {/* Summary Breakdown List */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: '0.875rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px dashed var(--color-border)' }}>
                          <span style={{ color: 'var(--color-text-muted)' }}>Working Days:</span>
                          <strong>{attendance?.summary?.working_days ?? 0} Days</strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px dashed var(--color-border)', color: 'var(--color-success-dark)' }}>
                          <span>Present Days:</span>
                          <strong>{attendance?.summary?.present_days ?? 0} Days</strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px dashed var(--color-border)', color: 'var(--color-danger)' }}>
                          <span>Absent Days:</span>
                          <strong>{attendance?.summary?.absent_days ?? 0} Days</strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px dashed var(--color-border)', color: 'var(--color-warning-dark)' }}>
                          <span>Late / Half Days:</span>
                          <strong>{attendance?.summary?.late_days ?? 0} Days</strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', color: 'var(--color-primary)' }}>
                          <span>Approved Leave:</span>
                          <strong>{attendance?.summary?.leave_days ?? 0} Days</strong>
                        </div>
                      </div>
                    </div>

                    {/* Inspector Details for Selected Day */}
                    {selectedDay && (
                      <div style={{ background: 'var(--color-surface)', padding: 16, borderRadius: 'var(--radius-xl)', border: '2px solid var(--color-primary)', boxShadow: 'var(--shadow-sm)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                          <strong style={{ fontSize: '0.9rem', color: 'var(--color-primary)' }}>
                            {selectedDay} {MONTH_NAMES_EN[calMonth - 1]} {calYear}
                          </strong>
                          <button onClick={() => setSelectedDay(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)' }}>
                            <X size={14} />
                          </button>
                        </div>
                        {(() => {
                          const dateObj = new Date(calYear, calMonth - 1, selectedDay);
                          const dayOfWeekName = DAYS[dateObj.getDay()];
                          const rec = attendance?.daily?.[selectedDay];
                          const hol = attendance?.holidays?.[selectedDay];

                          if (hol) {
                            return (
                              <div style={{ fontSize: '0.825rem' }}>
                                <div style={{ color: '#854d0e', fontWeight: 700 }}>🎉 School Holiday</div>
                                <div style={{ marginTop: 4, color: 'var(--color-text-secondary)' }}>{hol}</div>
                              </div>
                            );
                          }
                          if (rec) {
                            return (
                              <div style={{ fontSize: '0.825rem', display: 'flex', flexDirection: 'column', gap: 4 }}>
                                <div>Day: <strong>{dayOfWeekName}</strong></div>
                                <div>Status: <span style={{ textTransform: 'capitalize', fontWeight: 700 }}>{rec.status.replace('_', ' ')}</span></div>
                                {rec.remarks && <div>Remarks: <span style={{ color: 'var(--color-text-muted)' }}>{rec.remarks}</span></div>}
                                <div>Session: <span>{rec.period || 'Full Day'}</span></div>
                              </div>
                            );
                          }
                          if (dateObj.getDay() === 0) {
                            return <div style={{ fontSize: '0.825rem', color: 'var(--color-text-muted)' }}>Sunday Weekly Off</div>;
                          }
                          return <div style={{ fontSize: '0.825rem', color: 'var(--color-text-muted)' }}>No attendance record marked for this date.</div>;
                        })()}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Academic Year Monthly Breakdown Table */}
              {attendance?.yearly && attendance.yearly.length > 0 && (
                <div className={styles.card}>
                  <div className={styles.cardHeader}>
                    <h3 className={styles.cardTitle}>
                      <BarChart3 size={18} color="var(--color-primary)" /> Academic Year Monthly Breakdown
                    </h3>
                  </div>
                  <div className={styles.tableWrap}>
                    <table className={styles.table}>
                      <thead>
                        <tr>
                          <th>Month & Year</th>
                          <th>Working Days</th>
                          <th>Present</th>
                          <th>Absent</th>
                          <th>Late / Leave</th>
                          <th>Attendance %</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {attendance.yearly.map(ys => (
                          <tr key={`${ys.year}-${ys.month}`}>
                            <td>
                              <strong>{ys.month_name_en} ({ys.month_name_mr}) {ys.year}</strong>
                            </td>
                            <td>{ys.working_days} Days</td>
                            <td style={{ color: 'var(--color-success-dark)', fontWeight: 700 }}>{ys.present_days} Days</td>
                            <td style={{ color: ys.absent_days > 0 ? 'var(--color-danger)' : undefined }}>{ys.absent_days} Days</td>
                            <td>{ys.late_days + ys.leave_days} Days</td>
                            <td>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <div style={{ flex: 1, height: 6, background: '#e2e8f0', borderRadius: 999, minWidth: 60, overflow: 'hidden' }}>
                                  <div style={{
                                    width: `${Math.min(100, Math.max(0, ys.percentage))}%`,
                                    height: '100%',
                                    background: ys.percentage >= 85 ? '#16a34a' : ys.percentage >= 75 ? '#2563eb' : '#dc2626'
                                  }} />
                                </div>
                                <strong style={{ fontSize: '0.85rem' }}>{ys.percentage}%</strong>
                              </div>
                            </td>
                            <td>
                              <span className={`${styles.tag} ${ys.percentage >= 85 ? styles.tagSuccess : ys.percentage >= 75 ? styles.tagPrimary : styles.tagWarning}`}>
                                {ys.percentage >= 85 ? 'Excellent' : ys.percentage >= 75 ? 'Satisfactory' : 'Low'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
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

          {/* 13. CERTIFICATES & BONAFIDE */}
          {activeTab === 'certificates' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Bonafide Certificate Section */}
              <div className={styles.card}>
                <div className={styles.cardHeader}>
                  <h3 className={styles.cardTitle}>
                    <Award size={20} color="var(--color-primary)" /> बोनाफाइड प्रमाणपत्र अर्ज (Bonafide Certificate Request)
                  </h3>
                  <button className={styles.primaryBtn} onClick={() => setShowApplyBonafideModal(true)}>
                    <Plus size={14} /> Apply for Bonafide Certificate (₹20)
                  </button>
                </div>
                {myBonafideApps.length === 0 ? (
                  <div style={{ padding: 24, textAlign: 'center', color: 'var(--color-text-muted)', background: 'var(--color-surface-2)', borderRadius: 'var(--radius-md)' }}>
                    <p style={{ margin: 0 }}>No active Bonafide applications. Click the button above to apply and pay fees online.</p>
                  </div>
                ) : (
                  <div className={styles.tableWrap}>
                    <table className={styles.table}>
                      <thead>
                        <tr>
                          <th>App #</th>
                          <th>Purpose</th>
                          <th>Fee Charged</th>
                          <th>Applied Date</th>
                          <th>Status</th>
                          <th>Action / Certificate</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(Array.isArray(myBonafideApps) ? myBonafideApps : []).map((app: any) => (
                          <tr key={app.id}>
                            <td><strong>{app.application_number}</strong></td>
                            <td><span className={`${styles.tag} ${styles.tagPrimary}`}>{app.purpose}</span></td>
                            <td>₹{app.fee_amount} ({app.payment_status})</td>
                            <td>{app.applied_date}</td>
                            <td>
                              <span className={`${styles.tag} ${app.status === 'APPROVED' ? styles.tagSuccess : app.status === 'REJECTED' ? styles.tagDanger : styles.tagWarning}`}>
                                {app.status}
                              </span>
                              {app.rejection_reason && (
                                <div style={{ fontSize: '0.7rem', color: 'var(--color-danger)', marginTop: 2 }}>{app.rejection_reason}</div>
                              )}
                            </td>
                            <td>
                              {app.status === 'APPROVED' ? (
                                <button
                                  className={styles.primaryBtn}
                                  style={{ padding: '4px 10px', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                                  onClick={() => handleStudentPrintBonafide(app.id)}
                                >
                                  <Download size={13} /> View / Print Certificate
                                </button>
                              ) : app.status === 'PENDING' ? (
                                <span style={{ fontSize: '0.8rem', color: 'var(--color-warning)', fontWeight: 600 }}>Pending Clerk Verification</span>
                              ) : (
                                <span style={{ fontSize: '0.8rem', color: 'var(--color-danger)', fontWeight: 600 }}>Rejected</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Other Digital Certificates */}
              <div className={styles.card}>
                <div className={styles.cardHeader}>
                  <h3 className={styles.cardTitle}><Award size={20} color="var(--color-primary)" /> Other School Certificates</h3>
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
            <StudentIdCard idCardData={idCard} profileData={profile} />
          )}


          {/* 22. SETTINGS */}
          {activeTab === 'settings' && (
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <h3 className={styles.cardTitle}><Settings size={20} color="var(--color-primary)" /> Workspace Settings</h3>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 360 }}>
                <label style={{ fontSize: '0.875rem', fontWeight: 600 }}>Language / भाषा preference</label>
                <select
                  className={styles.selectField}
                  value={(i18n.language || 'mr').startsWith('mr') ? 'mr' : 'en'}
                  onChange={e => {
                    const lang = e.target.value;
                    i18n.changeLanguage(lang);
                    localStorage.setItem('vidyasetu_lang', lang);
                    document.documentElement.lang = lang;
                  }}
                >
                  <option value="mr">मराठी (Marathi)</option>
                  <option value="en">English</option>
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

      {/* Student Apply Bonafide Modal */}
      {showApplyBonafideModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <div className={styles.modalTitle}>
              <span>बोनाफाइड प्रमाणपत्रासाठी अर्ज (Apply Bonafide Certificate)</span>
              <button className={styles.closeBtn} onClick={() => setShowApplyBonafideModal(false)}>✕</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: 4 }}>
                  Purpose of Certificate / वापराचे कारण *
                </label>
                <select
                  className={styles.selectField}
                  value={bonafidePurpose}
                  onChange={e => setBonafidePurpose(e.target.value)}
                >
                  <option value="Passport / Government ID">Passport / Government ID Application</option>
                  <option value="Bus Pass / Transport Subsidy">Bus Pass / State Transport Concession</option>
                  <option value="Bank Account Opening">Bank Account Opening</option>
                  <option value="MahaDBT / Government Scholarship">MahaDBT / Government Scholarship</option>
                  <option value="Sports / Competition Admission">Sports / Competition Admission</option>
                  <option value="General Purpose">General Purpose (सर्वसाधारण)</option>
                </select>
              </div>

              <div style={{ padding: 12, background: 'var(--color-surface-2)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span>Certificate Fee Charge:</span>
                  <strong style={{ color: 'var(--color-primary)' }}>₹20.00</strong>
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                  Standard nominal processing charge for official Marathi Bonafide Certificate.
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: 4 }}>
                  Payment Method / भरणा पद्धत
                </label>
                <select
                  className={styles.selectField}
                  value={bonafidePaymentMethod}
                  onChange={e => setBonafidePaymentMethod(e.target.value)}
                >
                  <option value="UPI">UPI / GooglePay / PhonePe / Paytm</option>
                  <option value="CARD">Debit / Credit Card</option>
                  <option value="CASH">Pay at Cash Counter</option>
                </select>
              </div>

              <button
                className={styles.primaryBtn}
                style={{ marginTop: 8 }}
                onClick={handleApplyBonafide}
                disabled={submittingBonafide}
              >
                {submittingBonafide ? 'Processing Payment...' : 'Pay ₹20 & Submit Application'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Student Printable Certificate View */}
      {studentPrintData && (
        <BonafideCertificatePrint data={studentPrintData} onClose={() => setStudentPrintData(null)} />
      )}
    </div>
  );
}
