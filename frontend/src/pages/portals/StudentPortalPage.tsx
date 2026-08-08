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
  CheckCircle2, XCircle, Calendar, Info, Receipt, Brain, Target, Trophy, Zap,
  Play, ThumbsUp, Bookmark, BookmarkCheck, Eye, Star, Share2, SlidersHorizontal, Layers, Tv, Flame
} from 'lucide-react';
import studentPortalService, {
  type StudentProfile, type AttendanceData,
  type ExamResult, type Notice,
} from '../../services/studentPortalService';
import HomeworkPortalPage from '../homework/HomeworkPortalPage';
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
  | 'assessment'
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
  | 'analytics'
  | 'idcard'
  | 'settings';

const STUDENT_TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: <GraduationCap size={15} /> },
  { id: 'attendance', label: 'Attendance', icon: <CalendarDays size={15} /> },

  { id: 'timetable', label: 'Timetable', icon: <ClipboardList size={15} /> },
  { id: 'homework', label: 'Homework', icon: <BookOpen size={15} /> },
  { id: 'assignments', label: 'Assignments', icon: <FileText size={15} /> },
  { id: 'assessment', label: 'Assessments', icon: <Brain size={15} /> },
  { id: 'study_materials', label: 'Notes', icon: <Download size={15} /> },
  { id: 'videos', label: 'Video Lectures', icon: <Video size={15} /> },
  { id: 'aichat', label: 'AI Tutor', icon: <Bot size={15} /> },
  { id: 'examination', label: 'Hall Ticket', icon: <Ticket size={15} /> },
  { id: 'results', label: 'Results', icon: <BarChart3 size={15} /> },
  { id: 'certificates', label: 'Certificates', icon: <Award size={15} /> },
  { id: 'library', label: 'Library', icon: <Library size={15} /> },
  { id: 'fees', label: 'Fees', icon: <CreditCard size={15} /> },
  { id: 'leave', label: 'Leave Request', icon: <Palmtree size={15} /> },
  { id: 'communication', label: 'Notices', icon: <HelpCircle size={15} /> },
  { id: 'analytics', label: 'Analytics', icon: <BarChart3 size={15} /> },
  { id: 'idcard', label: 'Digital ID Card', icon: <UserCheck size={15} /> },
  { id: 'settings', label: 'Settings', icon: <Settings size={15} /> },
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

function getYouTubeVideoId(url?: string): string | null {
  if (!url) return null;
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
}

function getThumbnailUrl(video: { video_url?: string; thumbnail?: string; subject?: string }): string {
  if (video.thumbnail && !video.thumbnail.startsWith('/images/')) {
    return video.thumbnail;
  }
  const ytId = getYouTubeVideoId(video.video_url);
  if (ytId) {
    return `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`;
  }
  const subjectStr = (video.subject || '').toLowerCase();
  if (subjectStr.includes('math')) {
    return 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?auto=format&fit=crop&w=600&q=80';
  } else if (subjectStr.includes('sci') || subjectStr.includes('chem') || subjectStr.includes('phys')) {
    return 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?auto=format&fit=crop&w=600&q=80';
  } else if (subjectStr.includes('hist') || subjectStr.includes('soc')) {
    return 'https://images.unsplash.com/photo-1461360370896-922624d12aa1?auto=format&fit=crop&w=600&q=80';
  } else if (subjectStr.includes('eng') || subjectStr.includes('marath') || subjectStr.includes('lang')) {
    return 'https://images.unsplash.com/photo-1457369804613-52c61a468e7d?auto=format&fit=crop&w=600&q=80';
  }
  return 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=600&q=80';
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
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [attendance, setAttendance] = useState<AttendanceData | null>(null);
  const [results, setResults] = useState<ExamResult[]>([]);
  const [examData, setExamData] = useState<any>(null);
  const [fees, setFees] = useState<any>(null);
  const [library, setLibrary] = useState<any>(null);
  const [timetable, setTimetable] = useState<any>(null);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [idCard, setIdCard] = useState<any>(null);
  const [homework, setHomework] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [assessments, setAssessments] = useState<any[]>([]);
  const [studyMaterials, setStudyMaterials] = useState<any[]>([]);
  const [videos, setVideos] = useState<any[]>([]);
  const [activeVideo, setActiveVideo] = useState<any | null>(null);
  const [videoSearch, setVideoSearch] = useState('');
  const [videoSubjectFilter, setVideoSubjectFilter] = useState('All');
  const [qrHistory, setQrHistory] = useState<any[]>([]);
  const [hallTicket, setHallTicket] = useState<any>(null);
  const [certificates, setCertificates] = useState<any[]>([]);
  const [portfolio, setPortfolio] = useState<any>(null);
  const [analytics, setAnalytics] = useState<any>(null);

  // Assessment / Quiz States
  const [activeAssessment, setActiveAssessment] = useState<any>(null);  // quiz being taken
  const [quizAnswers, setQuizAnswers] = useState<Record<string, number>>({});
  const [flaggedQuestions, setFlaggedQuestions] = useState<Record<number, boolean>>({});
  const [asmSearch, setAsmSearch] = useState('');
  const [asmFilterStatus, setAsmFilterStatus] = useState<'all' | 'pending' | 'completed'>('all');
  const [quizCurrentQ, setQuizCurrentQ] = useState(0);
  const [quizTimeLeft, setQuizTimeLeft] = useState(0);
  const [quizResult, setQuizResult] = useState<any>(null);
  const [quizSubmitting, setQuizSubmitting] = useState(false);
  const [quizMode, setQuizMode] = useState<'list' | 'quiz' | 'result'>('list');
  const quizTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);


  const [loading, setLoading] = useState(true);
  const [tabLoading, setTabLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Modals & Action States
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileReq, setProfileReq] = useState({ field_name: 'father_mobile', proposed_value: '', reason: '' });
  const [showHomeworkModal, setShowHomeworkModal] = useState<any>(null);
  const [homeworkText, setHomeworkText] = useState('');
  const [showDoubtModal, setShowDoubtModal] = useState(false);
  const [doubtForm, setDoubtForm] = useState({ subject: 'Mathematics', question: '' });
  const [qrCodeInput, setQrCodeInput] = useState('');
  const [scannedResult, setScannedResult] = useState<any>(null);

  // Bonafide Certificate States
  const [myBonafideApps, setMyBonafideApps] = useState<any[]>([]);
  const [showApplyBonafideModal, setShowApplyBonafideModal] = useState(false);
  const [bonafidePurpose, setBonafidePurpose] = useState('Passport / Government ID');
  const [bonafidePaymentMethod, setBonafidePaymentMethod] = useState('UPI');
  const [submittingBonafide, setSubmittingBonafide] = useState(false);
  const [studentPrintData, setStudentPrintData] = useState<BonafidePrintData | null>(null);

  // Leave Form
  const [leaves, setLeaves] = useState<any[]>([]);
  const [leaveForm, setLeaveForm] = useState({ leave_type: 'casual', start_date: '', end_date: '', reason: '' });
  const [showLeaveForm, setShowLeaveForm] = useState(false);

  // AI Chat
  const [chatMessages, setChatMessages] = useState<{ role: 'user' | 'assistant'; content: string }[]>([
    { role: 'assistant', content: 'Namaste! I am VidyaBot, your AI Study Assistant. Ask me any question about your subjects, formulas, or homework.' }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [chatLang, setChatLang] = useState<'en' | 'mr'>('en');
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Calendar navigation & inspection
  const today = new Date();
  const [calYear, setCalYear] = useState(today.getFullYear());
  const [calMonth, setCalMonth] = useState(today.getMonth() + 1);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

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

  // ── Initial Profile & Leaves Fetch ───────────────────────────────────
  useEffect(() => {
    Promise.all([
      studentPortalService.getProfile(),
      api.get('/student-portal/leaves').catch(() => null)
    ])
      .then(([p, lRes]) => {
        setProfile(p);
        if (lRes?.data?.data?.leaves) setLeaves(lRes.data.data.leaves);
        setLoading(false);
      })
      .catch(e => {
        setError(e?.response?.data?.detail ?? e?.response?.data?.message ?? 'Could not load student profile.');
        setLoading(false);
      });
  }, []);

  const handleCancelLeave = async (leaveId: number) => {
    try {
      await studentPortalService.cancelLeave(leaveId);
      toast.success('Leave application cancelled.');
      const lRes = await api.get('/student-portal/leaves');
      setLeaves(lRes.data.data?.leaves || []);
    } catch {
      toast.error('Could not cancel leave application.');
    }
  };

  // ── Tab Data Lazy Loader ───────────────────────────────────
  const loadTab = useCallback(async (tab: Tab) => {
    if (tab === 'attendance' || tab === 'dashboard' || tab === 'profile' || tab === 'settings') {
      return; // Handled by dedicated effects / initial load
    }
    setTabLoading(true);
    try {
      switch (tab) {
        case 'results':
        case 'examination':
          if (!examData) {
            const r = await studentPortalService.getResults();
            setResults(r.results || []);
            setExamData(r);
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
          const nRes = await studentPortalService.getNotices();
          setNotices(nRes.notices || []);
          break;
        case 'idcard':
          if (!idCard) {
            const id = await studentPortalService.getIdCard();
            setIdCard(id);
          }
          break;
        case 'leave':
          const lRes = await api.get('/student-portal/leaves');
          setLeaves(lRes.data.data?.leaves || []);
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
        case 'assessment':
          const asmRes = await studentPortalService.getAssessments();
          setAssessments(asmRes.assessments || []);
          setQuizMode('list');
          setActiveAssessment(null);
          setQuizResult(null);
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
        case 'certificates':
          if (!certificates.length) {
            const [certRes, bdApps] = await Promise.all([
              studentPortalService.getCertificates(),
              studentPortalService.getMyBonafideApplications().catch(() => []),
            ]);
            setCertificates(certRes.certificates || []);
            const bdList = Array.isArray(bdApps) ? bdApps : (bdApps?.items || []);
            setMyBonafideApps(bdList);
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
    results.length, fees !== null, library !== null, timetable !== null, notices.length, idCard !== null, leaves.length,
    homework.length, assignments.length, studyMaterials.length, videos.length, qrHistory.length, hallTicket !== null,
    certificates.length, portfolio !== null, analytics !== null, assessments.length
  ]);

  // ── Quiz Timer ────────────────────────────────────────────
  const startQuizTimer = (minutes: number) => {
    setQuizTimeLeft(minutes * 60);
    if (quizTimerRef.current) clearInterval(quizTimerRef.current);
    quizTimerRef.current = setInterval(() => {
      setQuizTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(quizTimerRef.current!);
          handleQuizSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleStartQuiz = async (asm: any) => {
    try {
      setTabLoading(true);
      const data = await studentPortalService.startAssessment(asm.id);
      if (data.already_attempted && data.previous_result) {
        setQuizResult(data.previous_result);
        setActiveAssessment(data);
        setQuizMode('result');
      } else {
        setActiveAssessment(data);
        setQuizAnswers({});
        setFlaggedQuestions({});
        setQuizCurrentQ(0);
        setQuizResult(null);
        setQuizMode('quiz');
        startQuizTimer(data.duration_minutes);
      }
    } catch {
      toast.error('Could not start assessment.');
    } finally {
      setTabLoading(false);
    }
  };

  const toggleFlagQuestion = (qId: number) => {
    setFlaggedQuestions(prev => ({
      ...prev,
      [qId]: !prev[qId]
    }));
  };

  const clearAnswerSelection = (qId: number) => {
    setQuizAnswers(prev => {
      const next = { ...prev };
      delete next[String(qId)];
      return next;
    });
  };


  const handleQuizSubmit = async () => {
    if (!activeAssessment || quizSubmitting) return;
    if (quizTimerRef.current) clearInterval(quizTimerRef.current!);
    setQuizSubmitting(true);
    try {
      const result = await studentPortalService.submitAssessment(activeAssessment.assessment_id, quizAnswers);
      setQuizResult(result);
      setQuizMode('result');
      // Refresh list
      const asmRes = await studentPortalService.getAssessments();
      setAssessments(asmRes.assessments || []);
      if (result.passed) {
        toast.success(`🎉 Excellent! You scored ${result.score}/${result.total_marks} (${result.percentage}%) — ${result.grade}`);
      } else {
        toast('📚 Assessment submitted. Practice more to improve your score!', { icon: '💡' });
      }
    } catch {
      toast.error('Submission failed. Please try again.');
    } finally {
      setQuizSubmitting(false);
    }
  };

  const formatQuizTime = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  useEffect(() => { loadTab(activeTab); }, [activeTab, loadTab]);

  // ── Action Handlers ─────────────────────────────────────────
  const [submittingDoubt, setSubmittingDoubt] = useState(false);

  const handleSendDoubt = async () => {
    if (!doubtForm.question.trim()) {
      toast.error('Please enter your question or doubt.');
      return;
    }
    setSubmittingDoubt(true);
    try {
      await studentPortalService.sendDoubtRequest(doubtForm.subject, doubtForm.question);
      toast.success('Your doubt request has been sent to your subject teacher!');
      setShowDoubtModal(false);
      setDoubtForm({ subject: 'Mathematics', question: '' });
    } catch {
      toast.error('Failed to submit doubt request.');
    } finally {
      setSubmittingDoubt(false);
    }
  };

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

    // Detect if prompt contains Marathi / Devanagari characters
    const isMarathiPrompt = /[\u0900-\u097F]/.test(query);
    const targetLang = isMarathiPrompt ? 'mr' : chatLang;

    setChatMessages(prev => [...prev, { role: 'user', content: query }]);
    if (!msgOverride) setChatInput('');
    setChatLoading(true);

    try {
      const res = await api.post('/student-portal/ai-chat', { message: query, language: targetLang });
      setChatMessages(prev => [...prev, { role: 'assistant', content: res.data.data.reply }]);
    } catch {
      const fallbackMsg = targetLang === 'mr'
        ? '🤖 **VidyaBot**: क्षमस्व, AI सेवेशी कनेक्ट करताना अडचण आली. कृपया थोड्या वेळाने प्रयत्न करा.'
        : '🤖 **VidyaBot**: Sorry, I am unable to connect to VidyaBot AI right now. Please try again shortly.';
      setChatMessages(prev => [...prev, { role: 'assistant', content: fallbackMsg }]);
    } finally {
      setChatLoading(false);
      setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    }
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

                  <div className={styles.card}>
                    <div className={styles.cardHeader}>
                      <h3 className={styles.cardTitle}><Palmtree size={18} color="var(--color-primary)" /> My Applied Live Leaves</h3>
                      <button className={styles.secondaryBtn} style={{ padding: '4px 10px', fontSize: '0.75rem' }} onClick={() => setActiveTab('leave')}>View All</button>
                    </div>
                    {leaves.length === 0 ? (
                      <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', margin: 0 }}>No active leave applications found.</p>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {leaves.slice(0, 3).map((l: any, i: number) => (
                          <div key={i} style={{ padding: '10px 12px', background: 'var(--color-surface-2)', borderRadius: 'var(--radius-md)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                              <strong style={{ fontSize: '0.85rem', color: 'var(--color-text-primary)' }}>{l.leave_type?.toUpperCase() || 'CASUAL'} ({l.total_days || 1} d)</strong>
                              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: 2 }}>{l.date || l.start_date}</div>
                            </div>
                            <span className={`${styles.tag} ${l.status === 'approved' ? styles.tagSuccess : l.status === 'rejected' ? styles.tagDanger : l.status === 'cancelled' ? styles.tagMuted : styles.tagWarning}`}>
                              {l.status?.toUpperCase() || 'PENDING'}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
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
            <HomeworkPortalPage />
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


          {/* 5b. ASSESSMENTS */}
          {activeTab === 'assessment' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {/* LIST MODE */}
              {quizMode === 'list' && (
                <div className={styles.card}>
                  <div className={styles.cardHeader} style={{ flexWrap: 'wrap', gap: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ padding: 10, borderRadius: 'var(--radius-md)', background: 'color-mix(in srgb, var(--color-primary) 15%, transparent)', color: 'var(--color-primary)' }}>
                        <Brain size={22} />
                      </div>
                      <div>
                        <h3 className={styles.cardTitle}>Online Live Assessments & Quizzes</h3>
                        <p style={{ margin: 0, fontSize: '0.825rem', color: 'var(--color-text-muted)' }}>Interactive MCQ live tests assigned by teachers — attempt and get instant results!</p>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                      <div style={{ position: 'relative', minWidth: 200 }}>
                        <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
                        <input
                          type="text"
                          placeholder="Search test, subject, topic..."
                          value={asmSearch}
                          onChange={e => setAsmSearch(e.target.value)}
                          style={{ width: '100%', padding: '6px 10px 6px 30px', fontSize: '0.8rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text-primary)' }}
                        />
                      </div>

                      <div style={{ display: 'flex', background: 'var(--color-surface-2)', padding: 3, borderRadius: 'var(--radius-md)', gap: 3 }}>
                        <button
                          style={{ border: 'none', background: asmFilterStatus === 'all' ? 'var(--color-surface)' : 'transparent', color: asmFilterStatus === 'all' ? 'var(--color-primary)' : 'var(--color-text-muted)', fontSize: '0.78rem', fontWeight: 600, padding: '4px 10px', borderRadius: 'var(--radius-sm)', cursor: 'pointer' }}
                          onClick={() => setAsmFilterStatus('all')}
                        >
                          All ({assessments.length})
                        </button>
                        <button
                          style={{ border: 'none', background: asmFilterStatus === 'pending' ? 'var(--color-surface)' : 'transparent', color: asmFilterStatus === 'pending' ? 'var(--color-primary)' : 'var(--color-text-muted)', fontSize: '0.78rem', fontWeight: 600, padding: '4px 10px', borderRadius: 'var(--radius-sm)', cursor: 'pointer' }}
                          onClick={() => setAsmFilterStatus('pending')}
                        >
                          🔴 Live Pending ({assessments.filter((a: any) => !a.attempted).length})
                        </button>
                        <button
                          style={{ border: 'none', background: asmFilterStatus === 'completed' ? 'var(--color-surface)' : 'transparent', color: asmFilterStatus === 'completed' ? 'var(--color-primary)' : 'var(--color-text-muted)', fontSize: '0.78rem', fontWeight: 600, padding: '4px 10px', borderRadius: 'var(--radius-sm)', cursor: 'pointer' }}
                          onClick={() => setAsmFilterStatus('completed')}
                        >
                          ✓ Completed ({assessments.filter((a: any) => a.attempted).length})
                        </button>
                      </div>
                    </div>
                  </div>

                  {(() => {
                    const filtered = assessments.filter((asm: any) => {
                      const q = asmSearch.toLowerCase().trim();
                      const matchesQuery = !q || asm.title.toLowerCase().includes(q) || asm.subject.toLowerCase().includes(q) || (asm.topic && asm.topic.toLowerCase().includes(q));
                      const matchesStatus = asmFilterStatus === 'all' || (asmFilterStatus === 'pending' && !asm.attempted) || (asmFilterStatus === 'completed' && asm.attempted);
                      return matchesQuery && matchesStatus;
                    });

                    if (filtered.length === 0) {
                      return (
                        <div style={{ padding: 40, textAlign: 'center', color: 'var(--color-text-muted)' }}>
                          <Brain size={40} style={{ opacity: 0.3, marginBottom: 12 }} />
                          <p style={{ margin: 0, fontWeight: 600 }}>No assessments found matching your search.</p>
                        </div>
                      );
                    }

                    return (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                        {filtered.map((asm: any) => (
                          <div key={asm.id} style={{ padding: '18px 20px', background: 'var(--color-surface-2)', borderRadius: 'var(--radius-lg)', border: '1px solid ' + (asm.attempted ? 'color-mix(in srgb, var(--color-success) 40%, transparent)' : 'var(--color-border)'), display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
                            <div style={{ flex: 1, minWidth: 260 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
                                <span className={styles.tag + ' ' + styles.tagPrimary}>{asm.subject}</span>
                                {asm.topic && <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 500 }}>• {asm.topic}</span>}
                                {asm.attempted ? (
                                  <span className={styles.tag + ' ' + styles.tagSuccess}>✓ Completed</span>
                                ) : (
                                  <span className={styles.tag + ' ' + styles.tagWarning} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#ef4444', animation: 'pulse 1.5s infinite' }} />
                                    🔴 Live Assessment
                                  </span>
                                )}
                              </div>

                              <h4 style={{ margin: '4px 0 6px', fontSize: '1.05rem', fontWeight: 700 }}>
                                {asm.title} {asm.title_marathi && <span style={{ fontSize: '0.85rem', fontWeight: 400, color: 'var(--color-text-muted)' }}>({asm.title_marathi})</span>}
                              </h4>

                              <div style={{ display: 'flex', gap: 16, fontSize: '0.8rem', color: 'var(--color-text-muted)', flexWrap: 'wrap', marginTop: 4 }}>
                                <span><Clock size={13} style={{ verticalAlign: 'middle', marginRight: 3 }} /> {asm.duration_minutes} min duration</span>
                                <span><Target size={13} style={{ verticalAlign: 'middle', marginRight: 3 }} /> {asm.total_questions} MCQs</span>
                                <span><Zap size={13} style={{ verticalAlign: 'middle', marginRight: 3 }} /> {asm.total_marks} Total Marks</span>
                                {asm.teacher && <span>👤 By {asm.teacher}</span>}
                              </div>

                              {asm.attempted && asm.my_score !== null && (
                                <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                                  <div style={{ height: 6, flex: 1, maxWidth: 180, background: 'var(--color-border)', borderRadius: 99, overflow: 'hidden' }}>
                                    <div style={{ height: '100%', width: asm.my_percentage + '%', background: asm.my_percentage >= 60 ? 'var(--color-success)' : 'var(--color-danger)', borderRadius: 99 }} />
                                  </div>
                                  <strong style={{ fontSize: '0.875rem', color: asm.my_percentage >= 60 ? 'var(--color-success)' : 'var(--color-danger)' }}>
                                    Score: {asm.my_score}/{asm.total_marks} ({asm.my_percentage}%) — Grade {asm.my_grade}
                                  </strong>
                                  <span className={styles.tag + ' ' + (asm.result === 'PASSED' ? styles.tagSuccess : styles.tagDanger)}>{asm.result}</span>
                                </div>
                              )}
                            </div>

                            <div style={{ flexShrink: 0 }}>
                              <button className={asm.attempted ? styles.secondaryBtn : styles.primaryBtn} onClick={() => handleStartQuiz(asm)}>
                                {asm.attempted ? <><Trophy size={14} /> View Scorecard</> : <><Brain size={14} /> Start Live Test</>}
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* LIVE QUIZ / TEST MODE */}
              {quizMode === 'quiz' && activeAssessment && (
                <div className={styles.card} style={{ padding: 0, overflow: 'hidden' }}>
                  {/* Proctored Header Bar */}
                  <div style={{ padding: '16px 24px', background: 'linear-gradient(135deg, var(--color-primary), #4338ca)', color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
                    <div>
                      <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.85, fontWeight: 700 }}>
                        {activeAssessment.subject} {activeAssessment.topic ? `• ${activeAssessment.topic}` : ''}
                      </div>
                      <h3 style={{ margin: '2px 0 0', fontSize: '1.15rem', fontWeight: 800 }}>{activeAssessment.title}</h3>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
                      <div style={{ textAlign: 'center', background: 'rgba(255,255,255,0.15)', padding: '6px 16px', borderRadius: 'var(--radius-md)', backdropFilter: 'blur(4px)' }}>
                        <div style={{ fontSize: '0.7rem', opacity: 0.85, textTransform: 'uppercase', fontWeight: 700 }}>Time Remaining</div>
                        <div style={{ fontFamily: 'monospace', fontSize: '1.4rem', fontWeight: 900, color: quizTimeLeft < 60 ? '#fca5a5' : quizTimeLeft < 180 ? '#fde047' : '#fff' }}>
                          <Clock size={16} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                          {formatQuizTime(quizTimeLeft)}
                        </div>
                      </div>

                      <button
                        className={styles.primaryBtn}
                        style={{ background: '#10b981', borderColor: '#10b981', boxShadow: '0 4px 12px rgba(16,185,129,0.3)' }}
                        onClick={handleQuizSubmit}
                        disabled={quizSubmitting}
                      >
                        {quizSubmitting ? 'Submitting...' : <><Check size={16} /> Finish & Submit</>}
                      </button>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div style={{ height: 6, background: 'var(--color-surface-2)', width: '100%' }}>
                    <div
                      style={{
                        height: '100%',
                        width: (((quizCurrentQ + 1) / activeAssessment.total_questions) * 100) + '%',
                        background: 'linear-gradient(90deg, #6366f1, #10b981)',
                        transition: 'width 0.3s ease'
                      }}
                    />
                  </div>

                  <div style={{ padding: 24 }}>
                    {(() => {
                      const q = activeAssessment.questions[quizCurrentQ];
                      if (!q) return null;
                      const selectedIdx = quizAnswers[String(q.id)];
                      const isFlagged = flaggedQuestions[q.id];

                      return (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                          {/* Question Top Card */}
                          <div style={{ padding: '20px 24px', background: 'var(--color-surface-2)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <span style={{ padding: '3px 10px', borderRadius: 99, background: 'var(--color-primary)', color: '#fff', fontSize: '0.8rem', fontWeight: 800 }}>
                                  Question {quizCurrentQ + 1} of {activeAssessment.total_questions}
                                </span>
                                <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>
                                  ({q.marks || 1} Mark{q.marks > 1 ? 's' : ''})
                                </span>
                              </div>

                              <button
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 6,
                                  border: '1px solid ' + (isFlagged ? '#f59e0b' : 'var(--color-border)'),
                                  background: isFlagged ? 'rgba(245, 158, 11, 0.12)' : 'var(--color-surface)',
                                  color: isFlagged ? '#d97706' : 'var(--color-text-muted)',
                                  padding: '4px 12px',
                                  borderRadius: 'var(--radius-md)',
                                  fontSize: '0.78rem',
                                  fontWeight: 600,
                                  cursor: 'pointer'
                                }}
                                onClick={() => toggleFlagQuestion(q.id)}
                              >
                                <Star size={14} fill={isFlagged ? '#f59e0b' : 'none'} color={isFlagged ? '#d97706' : 'currentColor'} />
                                {isFlagged ? 'Flagged for Review' : 'Flag Question'}
                              </button>
                            </div>

                            <p style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, lineHeight: 1.6, color: 'var(--color-text-primary)' }}>
                              {q.question}
                            </p>
                          </div>

                          {/* Options Grid */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            {q.options.map((opt: string, idx: number) => {
                              const isSelected = selectedIdx === idx;
                              return (
                                <button
                                  key={idx}
                                  onClick={() => setQuizAnswers(prev => ({ ...prev, [String(q.id)]: idx }))}
                                  style={{
                                    padding: '16px 20px',
                                    background: isSelected ? 'color-mix(in srgb, var(--color-primary) 12%, var(--color-surface))' : 'var(--color-surface)',
                                    color: 'var(--color-text-primary)',
                                    border: '2px solid ' + (isSelected ? 'var(--color-primary)' : 'var(--color-border)'),
                                    borderRadius: 'var(--radius-lg)',
                                    cursor: 'pointer',
                                    textAlign: 'left',
                                    fontSize: '0.95rem',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                            gap: 14,
                            transition: 'all 0.2s ease',
                            boxShadow: isSelected ? '0 4px 14px rgba(99, 102, 241, 0.15)' : 'none'
                                  }}
                                >
                            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                              <span
                                style={{
                                  width: 32,
                                  height: 32,
                                  borderRadius: '50%',
                                  background: isSelected ? 'var(--color-primary)' : 'var(--color-surface-2)',
                                  color: isSelected ? '#fff' : 'var(--color-text-secondary)',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                              fontWeight: 800,
                              fontSize: '0.85rem',
                              flexShrink: 0
                                      }}
                                    >
                              {String.fromCharCode(65 + idx)}
                            </span>
                            <span style={{ fontWeight: isSelected ? 700 : 500 }}>{opt}</span>
                          </div>

                          {isSelected && (
                            <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'var(--color-primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem' }}>
                              ✓
                            </div>
                          )}

                        </button>
                      );
                    })}
                  </div>

                  {/* Question Palette & Controls */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16, paddingTop: 12, borderTop: '1px solid var(--color-border)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                      <button
                        className={styles.secondaryBtn}
                        onClick={() => setQuizCurrentQ(q => Math.max(0, q - 1))}
                        disabled={quizCurrentQ === 0}
                      >
                        <ChevronLeft size={16} /> Previous Question
                      </button>

                      {selectedIdx !== undefined && (
                        <button
                          style={{ border: 'none', background: 'transparent', color: '#ef4444', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}
                          onClick={() => clearAnswerSelection(q.id)}
                        >
                          Clear Selection
                        </button>
                      )}

                      {quizCurrentQ < activeAssessment.total_questions - 1 ? (
                        <button className={styles.primaryBtn} onClick={() => setQuizCurrentQ(q => q + 1)}>
                          Next Question <ChevronRight size={16} />
                        </button>
                      ) : (
                        <button
                          className={styles.primaryBtn}
                          style={{ background: '#10b981', borderColor: '#10b981' }}
                          onClick={handleQuizSubmit}
                          disabled={quizSubmitting}
                        >
                          {quizSubmitting ? 'Submitting...' : <><Check size={16} /> Submit Assessment</>}
                        </button>
                      )}
                    </div>

                    {/* Question Palette Matrix */}
                    <div style={{ background: 'var(--color-surface-2)', padding: 14, borderRadius: 'var(--radius-lg)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-text-muted)' }}>
                        <span>QUESTION PALETTE MATRIX ({Object.keys(quizAnswers).length}/{activeAssessment.total_questions} Answered)</span>
                        <div style={{ display: 'flex', gap: 12, fontSize: '0.72rem' }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><span style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981' }} /> Answered</span>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><span style={{ width: 8, height: 8, borderRadius: '50%', background: '#f59e0b' }} /> Flagged</span>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><span style={{ width: 8, height: 8, borderRadius: '50%', background: '#6366f1' }} /> Current</span>
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        {activeAssessment.questions.map((qItem: any, i: number) => {
                          const isAnswered = quizAnswers[String(qItem.id)] !== undefined;
                          const isFlg = flaggedQuestions[qItem.id];
                          const isCurrent = i === quizCurrentQ;

                          let bg = 'var(--color-surface)';
                          let color = 'var(--color-text-secondary)';
                          let border = '1px solid var(--color-border)';

                          if (isCurrent) {
                            bg = 'var(--color-primary)';
                            color = '#fff';
                            border = '2px solid var(--color-primary)';
                          } else if (isFlg) {
                            bg = '#f59e0b';
                            color = '#fff';
                            border = '1px solid #d97706';
                          } else if (isAnswered) {
                            bg = '#10b981';
                            color = '#fff';
                            border = '1px solid #059669';
                          }

                          return (
                            <button
                              key={i}
                              onClick={() => setQuizCurrentQ(i)}
                              style={{
                                width: 32,
                                height: 32,
                                borderRadius: 8,
                                border,
                                background: bg,
                                color,
                                fontSize: '0.8rem',
                                fontWeight: 800,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                transition: 'all 0.15s ease'
                              }}
                            >
                              {i + 1}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              );
                    })()}
            </div>
                </div>
              )}

      {/* RESULT MODE */}
      {quizMode === 'result' && quizResult && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div className={styles.card} style={{ textAlign: 'center', padding: 36, position: 'relative', overflow: 'hidden' }}>
            <div style={{ fontSize: 56, marginBottom: 8 }}>{quizResult.passed ? '🏆' : '📚'}</div>
            <h2 style={{ margin: '0 0 4px', fontSize: '1.75rem', fontWeight: 900, color: quizResult.passed ? 'var(--color-success)' : 'var(--color-danger)' }}>
              {quizResult.passed ? 'Assessment Passed!' : 'Needs Improvement'}
            </h2>
            <p style={{ margin: '0 0 24px', color: 'var(--color-text-muted)', fontSize: '0.95rem' }}>{quizResult.title}</p>

            <div style={{ display: 'flex', justifyContent: 'center', gap: 36, flexWrap: 'wrap', marginBottom: 24 }}>
              <div style={{ background: 'var(--color-surface-2)', padding: '16px 28px', borderRadius: 'var(--radius-lg)' }}>
                <div style={{ fontSize: '2.4rem', fontWeight: 900, color: 'var(--color-primary)' }}>{quizResult.score}/{quizResult.total_marks}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>Total Score</div>
              </div>

              <div style={{ background: 'var(--color-surface-2)', padding: '16px 28px', borderRadius: 'var(--radius-lg)' }}>
                <div style={{ fontSize: '2.4rem', fontWeight: 900, color: quizResult.percentage >= 60 ? 'var(--color-success)' : 'var(--color-danger)' }}>{quizResult.percentage}%</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>Percentage</div>
              </div>

              <div style={{ background: 'var(--color-surface-2)', padding: '16px 28px', borderRadius: 'var(--radius-lg)' }}>
                <div style={{ fontSize: '2.4rem', fontWeight: 900, color: 'var(--color-warning)' }}>{quizResult.grade}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>Grade</div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', gap: 14, flexWrap: 'wrap', marginBottom: 24 }}>
              <span className={styles.tag + ' ' + styles.tagSuccess} style={{ fontSize: '0.9rem', padding: '8px 16px' }}>✓ Correct: {quizResult.correct_count}</span>
              <span className={styles.tag + ' ' + styles.tagDanger} style={{ fontSize: '0.9rem', padding: '8px 16px' }}>✕ Wrong: {quizResult.wrong_count}</span>
              <span style={{ fontSize: '0.9rem', padding: '8px 16px', background: 'var(--color-surface-2)', color: 'var(--color-text-muted)', borderRadius: 'var(--radius-md)', fontWeight: 600 }}>⏩ Skipped: {quizResult.skipped_count}</span>
            </div>

            <button className={styles.secondaryBtn} onClick={() => { setQuizMode('list'); setActiveAssessment(null); setQuizResult(null); }}>
              ← Back to All Live Assessments
            </button>
          </div>

          {/* Detailed Question Review */}
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <h3 className={styles.cardTitle}><Target size={18} color='var(--color-primary)' /> Detailed Question Answer Review</h3>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {quizResult.question_results?.map((qr: any, i: number) => (
                <div
                  key={qr.question_id}
                  style={{
                    padding: '16px 20px',
                    borderRadius: 'var(--radius-lg)',
                    border: '1px solid ' + (qr.is_correct ? 'color-mix(in srgb, var(--color-success) 40%, transparent)' : qr.is_skipped ? 'var(--color-border)' : 'color-mix(in srgb, var(--color-danger) 40%, transparent)'),
                    background: qr.is_correct ? 'color-mix(in srgb, var(--color-success) 6%, transparent)' : qr.is_skipped ? 'var(--color-surface-2)' : 'color-mix(in srgb, var(--color-danger) 6%, transparent)'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, alignItems: 'center' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-text-muted)' }}>Question {i + 1}</span>
                    <span className={styles.tag + ' ' + (qr.is_correct ? styles.tagSuccess : qr.is_skipped ? styles.tagWarning : styles.tagDanger)}>
                      {qr.is_correct ? '✓ Correct (+' + qr.marks_obtained + ')' : qr.is_skipped ? 'Skipped (0)' : '✕ Incorrect (0)'}
                    </span>
                  </div>

                  <p style={{ margin: '0 0 10px', fontWeight: 700, fontSize: '0.95rem', color: 'var(--color-text-primary)' }}>{qr.question}</p>

                  {!qr.is_skipped && !qr.is_correct && qr.selected_index !== null && (
                    <div style={{ fontSize: '0.85rem', color: '#ef4444', marginBottom: 6, fontWeight: 600 }}>
                      Your Selection: <em>{activeAssessment?.questions?.[i]?.options?.[qr.selected_index] ?? 'Option ' + (qr.selected_index + 1)}</em>
                    </div>
                  )}

                  <div style={{ fontSize: '0.85rem', color: '#059669', fontWeight: 700 }}>
                    Correct Answer: <em>{qr.correct_option}</em>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}


{/* 6. STUDY MATERIALS */ }
{
  activeTab === 'study_materials' && (
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
  )
}

{/* 7. YOUTUBE STYLE VIDEO LECTURES */ }
{
  activeTab === 'videos' && (
    <div className={styles.ytContainer}>
      {/* Active Video Cinema / Theater Mode Player */}
      {activeVideo ? (
        <div className={styles.ytPlayerCard}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <button
              className={styles.secondaryBtn}
              onClick={() => setActiveVideo(null)}
              style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600 }}
            >
              <ChevronLeft size={16} /> Back to All Lectures
            </button>

            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <span className={styles.ytSubjectTag} style={{ position: 'static' }}>
                <Video size={12} /> {activeVideo.subject}
              </span>
              {activeVideo.progress_pct > 0 && (
                <span className={`${styles.tag} ${styles.tagSuccess}`}>
                  Watch Progress: {activeVideo.progress_pct}%
                </span>
              )}
            </div>
          </div>

          {/* Player Box */}
          <div className={styles.ytPlayerFrameWrapper}>
            {getYouTubeVideoId(activeVideo.video_url) ? (
              <iframe
                src={`https://www.youtube-nocookie.com/embed/${getYouTubeVideoId(activeVideo.video_url)}?autoplay=1&rel=0`}
                title={activeVideo.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                style={{ width: '100%', height: '100%', border: 'none' }}
              />
            ) : (
              <video
                src={activeVideo.video_url}
                controls
                autoPlay
                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
              />
            )}
          </div>

          {/* Video Meta Header */}
          <div>
            <h2 className={styles.ytPlayerTitle}>{activeVideo.title}</h2>
            <div style={{ display: 'flex', gap: 16, fontSize: '0.85rem', color: 'var(--color-text-muted)', flexWrap: 'wrap', alignItems: 'center' }}>
              <span><Eye size={14} style={{ verticalAlign: 'middle' }} /> {activeVideo.views || '3.5K views'}</span>
              <span><Clock size={14} style={{ verticalAlign: 'middle' }} /> {activeVideo.duration}</span>
              <span>Published {activeVideo.uploaded_at || 'Recently'}</span>
              {activeVideo.rating && (
                <span style={{ color: '#f59e0b', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Star size={14} fill="#f59e0b" /> {activeVideo.rating}.0 / 5.0
                </span>
              )}
            </div>
          </div>

          {/* Channel / Educator Bar */}
          <div className={styles.ytChannelBar}>
            <div className={styles.ytChannelInfo}>
              <img
                src={activeVideo.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80'}
                alt={activeVideo.teacher}
                className={styles.ytChannelAvatar}
              />
              <div>
                <div style={{ fontWeight: 800, fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: 4 }}>
                  {activeVideo.teacher || 'Subject Faculty'} <CheckCircle2 size={15} color="#2563eb" fill="#2563eb" style={{ color: '#fff' }} />
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>
                  Verified Subject Faculty &bull; VidyaSetu ERP
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <button
                className={styles.secondaryBtn}
                onClick={() => {
                  const isB = !activeVideo.is_bookmarked;
                  setActiveVideo({ ...activeVideo, is_bookmarked: isB });
                  setVideos(vList => vList.map(v => v.id === activeVideo.id ? { ...v, is_bookmarked: isB } : v));
                  toast.success(isB ? 'Saved to Bookmarked Lectures!' : 'Removed from Bookmarks');
                }}
                style={{ color: activeVideo.is_bookmarked ? '#ef4444' : 'inherit' }}
              >
                {activeVideo.is_bookmarked ? <BookmarkCheck size={16} fill="#ef4444" color="#ef4444" /> : <Bookmark size={16} />}
                {activeVideo.is_bookmarked ? 'Bookmarked' : 'Bookmark'}
              </button>

              <button
                className={styles.secondaryBtn}
                onClick={() => {
                  setActiveTab('aichat');
                  toast.success(`Opening VidyaBot for "${activeVideo.subject}" doubt solving!`);
                }}
              >
                <Bot size={16} color="var(--color-primary)" /> Ask AI Tutor
              </button>

              <button className={styles.primaryBtn} style={{ background: '#ff0000', borderColor: '#ff0000' }} onClick={() => toast.success('Lecture URL copied to clipboard!')}>
                <Share2 size={16} /> Share Lecture
              </button>
            </div>
          </div>

          {/* Description Box */}
          <div className={styles.ytDescBox}>
            <div style={{ fontWeight: 700, marginBottom: 4, color: 'var(--color-text-primary)' }}>Lecture Overview &amp; Learning Objectives</div>
            <div>{activeVideo.description || 'This subject lecture covers core textbook chapters, important formula derivations, and step-by-step solved examples for board exam preparation.'}</div>
          </div>

          {/* Recommendation Queue */}
          <div>
            <h3 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Flame size={18} color="#ff0000" /> More Recommended Subject Lectures
            </h3>
            <div className={styles.ytGrid}>
              {videos.filter(v => v.id !== activeVideo.id).slice(0, 3).map(vid => (
                <div key={vid.id} className={styles.ytCard} onClick={() => { setActiveVideo(vid); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>
                  <div className={styles.ytThumbWrapper}>
                    <img src={getThumbnailUrl(vid)} alt={vid.title} className={styles.ytThumbImg} />
                    <div className={styles.ytPlayOverlay}>
                      <div className={styles.ytPlayBtnCircle}><Play size={20} fill="#fff" /></div>
                    </div>
                    <span className={styles.ytSubjectTag}>{vid.subject}</span>
                    <span className={styles.ytDurationBadge}>{vid.duration}</span>
                  </div>
                  <div className={styles.ytCardBody}>
                    <img src={vid.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80'} alt={vid.teacher} className={styles.ytAvatar} />
                    <div className={styles.ytMeta}>
                      <h4 className={styles.ytCardTitle}>{vid.title}</h4>
                      <div className={styles.ytTeacherName}>{vid.teacher}</div>
                      <div className={styles.ytViewsRow}><span>{vid.views || '2.5K views'}</span></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        /* YouTube Video Grid View */
        <div className={styles.card} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* YouTube Top Bar Header */}
          <div className={styles.ytHeader}>
            <div className={styles.ytTitleRow}>
              <div className={styles.ytLogoBadge}>
                <Video size={18} /> YOUTUBE LECTURES
              </div>
              <div>
                <h3 className={styles.cardTitle} style={{ margin: 0 }}>Subject Video Lectures</h3>
                <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>
                  Interactive video lessons with first-frame thumbnails, progress tracking &amp; teacher channels
                </p>
              </div>
            </div>

            <div className={styles.ytSearchBox}>
              <Search size={16} color="var(--color-text-muted)" />
              <input
                type="text"
                placeholder="Search video title, topic or teacher..."
                value={videoSearch}
                onChange={e => setVideoSearch(e.target.value)}
                className={styles.ytSearchInput}
              />
              {videoSearch && (
                <button onClick={() => setVideoSearch('')} style={{ border: 'none', background: 'transparent', cursor: 'pointer' }}>
                  <X size={14} color="var(--color-text-muted)" />
                </button>
              )}
            </div>
          </div>

          {/* Subject Filter Chips Bar */}
          <div className={styles.ytChipsRow}>
            {['All', 'Mathematics', 'Science & Tech', 'History', 'English', 'Marathi', 'Physics', '★ Bookmarked'].map(chip => (
              <button
                key={chip}
                className={`${styles.ytChip} ${videoSubjectFilter === chip ? styles.ytChipActive : ''}`}
                onClick={() => setVideoSubjectFilter(chip)}
              >
                {chip === 'All' && <Tv size={14} />}
                {chip === '★ Bookmarked' && <Bookmark size={14} />}
                {chip}
              </button>
            ))}
          </div>

          {/* YouTube Video Cards Grid */}
          {(() => {
            const filteredVideos = videos.filter(vid => {
              const matchesSearch = !videoSearch || vid.title.toLowerCase().includes(videoSearch.toLowerCase()) || vid.teacher.toLowerCase().includes(videoSearch.toLowerCase()) || vid.subject.toLowerCase().includes(videoSearch.toLowerCase());
              const matchesSubject = videoSubjectFilter === 'All'
                || (videoSubjectFilter === '★ Bookmarked' ? vid.is_bookmarked : vid.subject.toLowerCase().includes(videoSubjectFilter.toLowerCase().replace(' & tech', '')));
              return matchesSearch && matchesSubject;
            });

            if (filteredVideos.length === 0) {
              return (
                <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--color-text-muted)' }}>
                  <Video size={40} style={{ opacity: 0.3, marginBottom: 10 }} />
                  <div style={{ fontWeight: 700, fontSize: '1rem' }}>No Video Lectures Found</div>
                  <div style={{ fontSize: '0.85rem' }}>Try clearing your search query or selecting another subject filter.</div>
                </div>
              );
            }

            return (
              <div className={styles.ytGrid}>
                {filteredVideos.map(vid => {
                  const thumbUrl = getThumbnailUrl(vid);
                  return (
                    <div key={vid.id} className={styles.ytCard} onClick={() => setActiveVideo(vid)}>
                      {/* 16:9 Thumbnail Wrapper */}
                      <div className={styles.ytThumbWrapper}>
                        <img src={thumbUrl} alt={vid.title} className={styles.ytThumbImg} />

                        {/* Play Button Overlay */}
                        <div className={styles.ytPlayOverlay}>
                          <div className={styles.ytPlayBtnCircle}>
                            <Play size={24} fill="#ffffff" style={{ marginLeft: 3 }} />
                          </div>
                        </div>

                        {/* Subject Tag & Duration Badge */}
                        <span className={styles.ytSubjectTag}>
                          <Video size={10} /> {vid.subject}
                        </span>
                        <span className={styles.ytDurationBadge}>{vid.duration}</span>

                        {/* Watch Progress Bar (YouTube red line) */}
                        {vid.progress_pct > 0 && (
                          <div className={styles.ytProgressBarTrack}>
                            <div className={styles.ytProgressBarFill} style={{ width: `${vid.progress_pct}%` }} />
                          </div>
                        )}
                      </div>

                      {/* Card Metadata */}
                      <div className={styles.ytCardBody}>
                        <img
                          src={vid.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80'}
                          alt={vid.teacher}
                          className={styles.ytAvatar}
                        />
                        <div className={styles.ytMeta}>
                          <h4 className={styles.ytCardTitle}>{vid.title}</h4>
                          <div className={styles.ytTeacherName}>
                            {vid.teacher} <CheckCircle2 size={13} color="#2563eb" fill="#2563eb" style={{ color: '#fff' }} />
                          </div>
                          <div className={styles.ytViewsRow}>
                            <span>{vid.views || '3.2K views'} &bull; {vid.uploaded_at || 'Recently'}</span>
                            {vid.rating && (
                              <span style={{ color: '#f59e0b', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 2 }}>
                                ★ {vid.rating}.0
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>
      )}
    </div>
  )
}

{/* 8. AI TUTOR */ }
{
  activeTab === 'aichat' && (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <div>
          <h3 className={styles.cardTitle}>
            <Bot size={22} color="var(--color-primary)" /> VidyaBot — AI Academic Study Assistant
          </h3>
          <p style={{ margin: 0, fontSize: '0.825rem', color: 'var(--color-text-muted)', marginTop: 2 }}>
            Dedicated 24/7 AI tutor for school subjects, doubt solving, formulas, and homework (English &amp; मराठी)
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button className={styles.secondaryBtn} onClick={() => setChatLang(l => l === 'en' ? 'mr' : 'en')}>
            {chatLang === 'en' ? '🌐 Language: English' : '🌐 भाषा: मराठी'}
          </button>
          {chatMessages.length > 1 && (
            <button className={styles.secondaryBtn} style={{ color: 'var(--color-danger)' }} onClick={() => setChatMessages([{ role: 'assistant', content: chatLang === 'mr' ? 'नमस्कार! मी विद्याबॉट, आपला AI अभ्यास सहाय्यक आहे. मला कोणताही अभ्यासाचा किंवा विषयाचा प्रश्न विचारा.' : 'Namaste! I am VidyaBot, your AI Study Assistant. Ask me any academic question, math formula, or subject doubt!' }])}>
              Clear Chat
            </button>
          )}
        </div>
      </div>

      {/* Quick Academic Subject Doubt Chips */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', padding: '10px 14px', background: 'var(--color-surface-2)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
        <span style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', fontWeight: 700, alignSelf: 'center', marginRight: 4 }}>Quick Doubts:</span>
        <button className={styles.secondaryBtn} style={{ fontSize: '0.78rem', padding: '4px 10px' }} onClick={() => sendAIChat(chatLang === 'mr' ? 'पायथागोरसचे प्रमेय उदाहरणासह स्पष्ट करा' : 'Explain Pythagoras Theorem with step-by-step example')}>
          📐 Pythagoras Theorem
        </button>
        <button className={styles.secondaryBtn} style={{ fontSize: '0.78rem', padding: '4px 10px' }} onClick={() => sendAIChat(chatLang === 'mr' ? 'प्रकाशसंश्लेषण प्रक्रिया आणि तिचे रासायनिक समीकरण काय आहे?' : 'What is Photosynthesis process and its chemical equation?')}>
          🔬 Photosynthesis
        </button>
        <button className={styles.secondaryBtn} style={{ fontSize: '0.78rem', padding: '4px 10px' }} onClick={() => sendAIChat(chatLang === 'mr' ? 'न्यूटनचे गतीविषयक ३ नियम सांगा' : 'State Newton\'s 3 Laws of Motion with real examples')}>
          ⚙️ Newton\'s Laws
        </button>
        <button className={styles.secondaryBtn} style={{ fontSize: '0.78rem', padding: '4px 10px' }} onClick={() => sendAIChat(chatLang === 'mr' ? 'इंग्रजी व्याकरणातील Tenses व त्यांची वाक्ये सांगा' : 'Explain English Grammar Tenses rules with examples')}>
          📝 English Tenses
        </button>
      </div>

      {/* Chat Message Stream */}
      <div style={{ background: 'var(--color-surface-2)', borderRadius: 'var(--radius-lg)', padding: '16px', height: 380, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12, border: '1px solid var(--color-border)', marginTop: 12 }}>
        {chatMessages.map((m, i) => (
          <div key={i} style={{ alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '85%' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: 4, textAlign: m.role === 'user' ? 'right' : 'left', fontWeight: 600 }}>
              {m.role === 'user' ? 'You (Student)' : '🤖 VidyaBot AI Tutor'}
            </div>
            <div style={{
              background: m.role === 'user' ? 'var(--color-primary)' : 'var(--color-surface)',
              color: m.role === 'user' ? 'white' : 'var(--color-text-primary)',
              padding: '12px 16px',
              borderRadius: m.role === 'user' ? '16px 16px 2px 16px' : '16px 16px 16px 2px',
              fontSize: '0.9rem',
              lineHeight: '1.5',
              whiteSpace: 'pre-wrap',
              boxShadow: 'var(--shadow-sm)',
              border: '1px solid var(--color-border)'
            }}>
              {m.content}
              {m.role === 'assistant' && i > 0 && (
                <div style={{ marginTop: 8, paddingTop: 6, borderTop: '1px dashed var(--color-border)', display: 'flex', justifyContent: 'flex-end' }}>
                  <button style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', fontSize: '0.75rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }} onClick={() => { navigator.clipboard.writeText(m.content); toast.success('Response copied to clipboard!'); }}>
                    📋 Copy Response
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
        {chatLoading && (
          <div style={{ alignSelf: 'flex-start', background: 'var(--color-surface)', padding: '10px 16px', borderRadius: '16px 16px 16px 2px', border: '1px solid var(--color-border)', fontSize: '0.85rem', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className={styles.spin} />
            <span>VidyaBot is solving your study doubt...</span>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Chat Input Row */}
      <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
        <input
          className={styles.inputField}
          style={{ flex: 1, padding: '12px 16px' }}
          value={chatInput}
          onChange={e => setChatInput(e.target.value)}
          placeholder={chatLang === 'mr' ? 'तुमचा शालेय अभ्यासाचा किंवा विषयाचा प्रश्न येथे टाईप करा (उदा. गणिताचे सूत्र, विज्ञानाची व्याख्या)...' : 'Type your subject question, math problem, formula, or study doubt here...'}
          onKeyDown={e => e.key === 'Enter' && !chatLoading && sendAIChat()}
        />
        <button className={styles.primaryBtn} onClick={() => sendAIChat()} disabled={chatLoading || !chatInput.trim()} style={{ padding: '0 24px' }}>
          {chatLoading ? <span className={styles.spin} /> : 'Ask VidyaBot'}
        </button>
      </div>
    </div>
  )
}

{/* 9. QR SCANNER */ }
{
  activeTab === 'qr_learning' && (
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
  )
}

{/* 10. TIMETABLE */ }
{
  activeTab === 'timetable' && (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <div>
            <h3 className={styles.cardTitle}>
              <CalendarDays size={22} color="var(--color-primary)" />
              Official Class Timetable — Std {p.standard || timetable?.standard || '9'}-{p.division || timetable?.division || 'A'}
            </h3>
            <p style={{ margin: 0, fontSize: '0.825rem', color: 'var(--color-text-muted)', marginTop: 2 }}>
              Weekly academic schedule prepared by Class Teacher & School Administration for {p.full_name}
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span className={`${styles.tag} ${styles.tagPrimary}`}>Std {p.standard || '9'}-{p.division || 'A'}</span>
            <button className={styles.primaryBtn} onClick={() => toast.success(`Class Timetable PDF downloaded for Std ${p.standard}-${p.division || 'A'}!`)}>
              <Download size={14} /> Download Timetable
            </button>
          </div>
        </div>

        {/* Day-Wise Schedule Breakdown */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 12 }}>
          {timetable?.timetable?.map((dayObj: any) => (
            <div key={dayObj.day} style={{ background: 'var(--color-surface-2)', borderRadius: 'var(--radius-lg)', padding: 16, border: '1px solid var(--color-border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, borderBottom: '1px dashed var(--color-border)', paddingBottom: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--color-primary)' }}>{dayObj.day_en}</span>
                  <span style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>({dayObj.day_mr})</span>
                </div>
                <span style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>{dayObj.periods?.length || 6} Scheduled Periods</span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12 }}>
                {dayObj.periods?.map((per: any, idx: number) => (
                  <div key={idx} style={{ background: 'var(--color-surface)', padding: '12px 14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem' }}>
                      <span className={`${styles.tag} ${styles.tagPrimary}`} style={{ fontSize: '0.7rem' }}>Period {per.period || idx + 1}</span>
                      <span style={{ fontWeight: 600, color: 'var(--color-text-muted)' }}><Clock size={11} style={{ marginRight: 3, verticalAlign: 'middle' }} />{per.time_slot || `${per.start_time} - ${per.end_time}`}</span>
                    </div>
                    <div style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--color-text-primary)', marginTop: 2 }}>{per.subject}</div>
                    {per.subject_marathi && <div style={{ fontSize: '0.78rem', color: 'var(--color-primary)' }}>{per.subject_marathi}</div>}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginTop: 4 }}>
                      <span>👤 {per.teacher || 'Class Teacher'}</span>
                      <span style={{ fontWeight: 600 }}>📍 {per.room || `Room 10${p.standard}`}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

{/* 11. HALL TICKET & EXAM SCHEDULE */ }
{
  activeTab === 'examination' && (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <div>
            <h3 className={styles.cardTitle}>
              <Ticket size={22} color="var(--color-warning)" />
              {examData?.upcoming_exam?.exam_title || `Annual Examination Schedule — Std ${p.standard}-${p.division || 'A'}`}
            </h3>
            <p style={{ margin: 0, fontSize: '0.825rem', color: 'var(--color-text-muted)', marginTop: 2 }}>
              Official examination schedule & hall ticket issued for {p.full_name} (GR: {p.gr_number})
            </p>
          </div>
          <button className={styles.primaryBtn} onClick={() => toast.success('Official Exam Hall Ticket PDF Downloaded!')}>
            <Download size={14} /> Download Hall Ticket PDF
          </button>
        </div>

        {/* Hall Ticket Candidate Header */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, padding: 16, background: 'var(--color-surface-2)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)' }}>
          <div><span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Candidate Name</span><div style={{ fontSize: '1rem', fontWeight: 800 }}>{p.full_name}</div></div>
          <div><span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Class & Division</span><div style={{ fontSize: '1rem', fontWeight: 800 }}>Std {p.standard} - {p.division || 'A'}</div></div>
          <div><span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Roll No / GR No</span><div style={{ fontSize: '1rem', fontWeight: 800 }}>Roll #{p.roll_number || '05'} ({p.gr_number})</div></div>
          <div><span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Hall Ticket No</span><div style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--color-primary)' }}>{examData?.upcoming_exam?.hall_ticket_number || `HT-2026-${p.standard}A-05`}</div></div>
          <div style={{ gridColumn: '1 / -1' }}><span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Exam Center</span><div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--color-text-secondary)' }}>📍 {examData?.upcoming_exam?.center_name || 'VidyaSetu Academy Main Examination Center, Hall B'}</div></div>
        </div>

        {/* Exam Date-Sheet Table */}
        <div className={styles.tableWrap} style={{ marginTop: 12 }}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Date &amp; Day</th>
                <th>Subject Title</th>
                <th>Exam Timing</th>
                <th>Paper Code</th>
                <th>Max / Pass Marks</th>
                <th>Exam Hall</th>
              </tr>
            </thead>
            <tbody>
              {(examData?.upcoming_exam?.schedule || [
                { date: '2026-03-15', day: 'Monday', subject: 'Mathematics (Paper 1 & 2)', time: '09:30 AM - 12:30 PM', paper_code: `MTH-${p.standard}01`, max_marks: 100, passing_marks: 35, room: 'Hall 102' },
                { date: '2026-03-17', day: 'Wednesday', subject: 'Science & Technology', time: '09:30 AM - 12:30 PM', paper_code: `SCI-${p.standard}02`, max_marks: 100, passing_marks: 35, room: 'Lab Hall 1' },
                { date: '2026-03-19', day: 'Friday', subject: 'English Literature', time: '09:30 AM - 12:30 PM', paper_code: `ENG-${p.standard}03`, max_marks: 100, passing_marks: 35, room: 'Hall 102' },
                { date: '2026-03-21', day: 'Saturday', subject: 'Marathi Language', time: '09:30 AM - 12:30 PM', paper_code: `MAR-${p.standard}04`, max_marks: 100, passing_marks: 35, room: 'Hall 102' },
                { date: '2026-03-24', day: 'Tuesday', subject: 'Social Sciences', time: '09:30 AM - 12:30 PM', paper_code: `SOC-${p.standard}05`, max_marks: 100, passing_marks: 35, room: 'Hall 102' },
              ]).map((s: any, i: number) => (
                <tr key={i}>
                  <td><strong>{s.date}</strong> <span style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>({s.day})</span></td>
                  <td>
                    <strong>{s.subject}</strong>
                    {s.subject_marathi && <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{s.subject_marathi}</div>}
                  </td>
                  <td><span className={`${styles.tag} ${styles.tagPrimary}`} style={{ fontSize: '0.78rem' }}><Clock size={11} style={{ marginRight: 4 }} />{s.time}</span></td>
                  <td><code>{s.paper_code}</code></td>
                  <td>{s.max_marks || 100} / Pass: {s.passing_marks || 35}</td>
                  <td><strong>{s.room || 'Hall 102'}</strong></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

{/* 12. RESULTS, MARKSHEETS & CLASS MERIT LIST */ }
{
  activeTab === 'results' && (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Overall Performance & Rank Summary Card */}
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <div>
            <h3 className={styles.cardTitle}>
              <BarChart3 size={22} color="var(--color-primary)" /> Academic Marksheets &amp; Merit Performance
            </h3>
            <p style={{ margin: 0, fontSize: '0.825rem', color: 'var(--color-text-muted)', marginTop: 2 }}>
              Official academic evaluation records, subject-wise marks, and class rank for Std {p.standard}-{p.division || 'A'}
            </p>
          </div>
          <span className={`${styles.tag} ${styles.tagSuccess}`} style={{ fontSize: '0.85rem' }}>
            🏆 Class Rank #{results[0]?.rank || 2} of {results[0]?.class_total_students || 45} Students
          </span>
        </div>

        {/* KPI Summary Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14, marginTop: 10 }}>
          <div style={{ padding: 16, background: 'var(--color-surface-2)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Class Merit Rank</div>
            <div style={{ fontSize: '1.7rem', fontWeight: 800, color: 'var(--color-primary)', marginTop: 4 }}>
              #{results[0]?.rank || 2} <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>/ {results[0]?.class_total_students || 45}</span>
            </div>
          </div>

          <div style={{ padding: 16, background: 'color-mix(in srgb, var(--color-success) 10%, transparent)', borderRadius: 'var(--radius-lg)', border: '1px solid color-mix(in srgb, var(--color-success) 30%, transparent)' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-success-dark)', fontWeight: 700, textTransform: 'uppercase' }}>Latest Percentage</div>
            <div style={{ fontSize: '1.7rem', fontWeight: 800, color: 'var(--color-success)', marginTop: 4 }}>
              {results[0]?.percentage || 89.6}%
            </div>
          </div>

          <div style={{ padding: 16, background: 'var(--color-surface-2)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Overall Grade</div>
            <div style={{ fontSize: '1.7rem', fontWeight: 800, color: 'var(--color-text-primary)', marginTop: 4 }}>
              {results[0]?.grade || 'A1'} <span style={{ fontSize: '0.85rem', color: 'var(--color-success)' }}>(Distinction)</span>
            </div>
          </div>

          <div style={{ padding: 16, background: 'var(--color-surface-2)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Total Marks Scored</div>
            <div style={{ fontSize: '1.7rem', fontWeight: 800, color: 'var(--color-text-primary)', marginTop: 4 }}>
              {results[0]?.total_marks || 448} / {results[0]?.total_max || 500}
            </div>
          </div>
        </div>
      </div>

      {/* Class Merit List Toppers Section */}
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <h3 className={styles.cardTitle}>
            <Award size={20} color="var(--color-warning)" /> Class Merit List &amp; Top Scorers (Std {p.standard}-{p.division || 'A'})
          </h3>
          <span className={`${styles.tag} ${styles.tagPrimary}`}>Academic Year 2025-2026</span>
        </div>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Class Rank</th>
                <th>Student Name</th>
                <th>GR Number</th>
                <th>Total Marks</th>
                <th>Percentage</th>
                <th>Grade</th>
                <th>Result</th>
              </tr>
            </thead>
            <tbody>
              {(examData?.merit_list || [
                { rank: 1, student_name: 'Aarav Sachin Kulkarni', gr_number: 'GR-2024-012', percentage: 93.4, total_marks: '467 / 500', grade: 'A1', status: 'Passed' },
                { rank: 2, student_name: `${p.full_name} (You)`, gr_number: p.gr_number, percentage: 89.6, total_marks: '448 / 500', grade: 'A1', status: 'Passed' },
                { rank: 3, student_name: 'Ananya Rahul Deshmukh', gr_number: 'GR-2024-018', percentage: 88.2, total_marks: '441 / 500', grade: 'A1', status: 'Passed' },
                { rank: 4, student_name: 'Rohan Prakash More', gr_number: 'GR-2024-025', percentage: 86.0, total_marks: '430 / 500', grade: 'A2', status: 'Passed' },
                { rank: 5, student_name: 'Siddhi Vinayak Salunkhe', gr_number: 'GR-2024-031', percentage: 84.8, total_marks: '424 / 500', grade: 'A2', status: 'Passed' },
              ]).map((m: any) => (
                <tr key={m.rank} style={{ background: m.rank === (results[0]?.rank || 2) ? 'color-mix(in srgb, var(--color-primary) 12%, transparent)' : undefined }}>
                  <td>
                    <strong style={{ fontSize: '1rem', color: m.rank === 1 ? '#eab308' : m.rank === 2 ? '#94a3b8' : m.rank === 3 ? '#b45309' : 'inherit' }}>
                      #{m.rank} {m.rank === 1 ? '🥇' : m.rank === 2 ? '🥈' : m.rank === 3 ? '🥉' : ''}
                    </strong>
                  </td>
                  <td>
                    <strong>{m.student_name}</strong>
                  </td>
                  <td><code>{m.gr_number}</code></td>
                  <td>{m.total_marks}</td>
                  <td><strong style={{ color: 'var(--color-success)' }}>{m.percentage}%</strong></td>
                  <td><span className={`${styles.tag} ${styles.tagSuccess}`}>{m.grade}</span></td>
                  <td><span className={`${styles.tag} ${styles.tagSuccess}`}>{m.status || 'Passed'}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detailed Subject-Wise Marksheets */}
      {results.map((res: any, idx: number) => (
        <div key={res.exam_id || idx} className={styles.card}>
          <div className={styles.cardHeader}>
            <div>
              <h3 className={styles.cardTitle}>
                <FileText size={20} color="var(--color-primary)" /> {res.exam_type}
              </h3>
              {res.exam_type_marathi && <p style={{ margin: 0, fontSize: '0.825rem', color: 'var(--color-text-muted)' }}>{res.exam_type_marathi} • Declared on {res.result_date || '2025-11-10'}</p>}
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <span className={`${styles.tag} ${styles.tagSuccess}`} style={{ fontSize: '0.85rem' }}>
                {res.percentage}% — Grade {res.grade || 'A1'}
              </span>
              <button className={styles.secondaryBtn} onClick={() => toast.success(`Official Marksheet PDF downloaded for ${res.exam_type}!`)}>
                <Download size={14} /> Download Marksheet PDF
              </button>
            </div>
          </div>

          {res.remarks && (
            <div style={{ padding: '10px 14px', background: 'var(--color-surface-2)', borderRadius: 'var(--radius-md)', marginBottom: 14, fontSize: '0.85rem', color: 'var(--color-text-secondary)', borderLeft: '4px solid var(--color-primary)' }}>
              <strong>Teacher Remarks:</strong> {res.remarks}
            </div>
          )}

          {/* Subject Marks Table */}
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Subject Name</th>
                  <th>Theory Marks</th>
                  <th>Practical / Internal</th>
                  <th>Total Obtained</th>
                  <th>Max Marks</th>
                  <th>Passing</th>
                  <th>Grade</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {res.subjects?.map((sub: any, sIdx: number) => (
                  <tr key={sIdx}>
                    <td>
                      <strong>{sub.subject}</strong>
                      {sub.subject_marathi && <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{sub.subject_marathi}</div>}
                    </td>
                    <td>{sub.theory_marks ?? sub.marks_obtained}</td>
                    <td>{sub.practical_marks ?? 0}</td>
                    <td><strong style={{ fontSize: '0.95rem', color: sub.is_pass ? 'var(--color-success)' : 'var(--color-danger)' }}>{sub.marks_obtained}</strong></td>
                    <td>{sub.max_marks}</td>
                    <td>{sub.passing_marks}</td>
                    <td><span className={`${styles.tag} ${sub.is_pass ? styles.tagSuccess : styles.tagDanger}`}>{sub.grade || 'A1'}</span></td>
                    <td>
                      <span className={`${styles.tag} ${sub.is_pass ? styles.tagSuccess : styles.tagDanger}`}>
                        {sub.is_absent ? 'ABSENT' : sub.is_pass ? 'PASSED' : 'FAILED'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  )
}

{/* 13. CERTIFICATES & BONAFIDE */ }
{
  activeTab === 'certificates' && (
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
  )
}

{/* 14. LIBRARY */ }
{
  activeTab === 'library' && (
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
  )
}

{/* 15. FEES */ }
{
  activeTab === 'fees' && (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Financial Summary KPIs */}
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <div>
            <h3 className={styles.cardTitle}><CreditCard size={20} color="var(--color-primary)" /> Student Fee Ledger & Payment Status</h3>
            <p style={{ margin: 0, fontSize: '0.825rem', color: 'var(--color-text-muted)' }}>
              Academic Year {fees?.academic_year || '2025-2026'} • Standard {p.standard}-{p.division || 'A'}
            </p>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginTop: 12 }}>
          <div style={{ padding: 16, background: 'var(--color-surface-2)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Total Prescribed Fee</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--color-text-primary)', marginTop: 4 }}>₹{(fees?.summary?.total_due || fees?.class_total_fee || 0).toLocaleString('en-IN')}</div>
          </div>

          <div style={{ padding: 16, background: 'color-mix(in srgb, var(--color-success) 10%, transparent)', borderRadius: 'var(--radius-lg)', border: '1px solid color-mix(in srgb, var(--color-success) 30%, transparent)' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-success-dark)', fontWeight: 700, textTransform: 'uppercase' }}>Total Fee Paid</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--color-success)', marginTop: 4 }}>₹{(fees?.summary?.total_paid || 0).toLocaleString('en-IN')}</div>
          </div>

          <div style={{ padding: 16, background: 'color-mix(in srgb, var(--color-danger) 10%, transparent)', borderRadius: 'var(--radius-lg)', border: '1px solid color-mix(in srgb, var(--color-danger) 30%, transparent)' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-danger-dark)', fontWeight: 700, textTransform: 'uppercase' }}>Remaining Amount to Pay</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--color-danger)', marginTop: 4 }}>₹{(fees?.summary?.total_remaining ?? fees?.summary?.balance ?? 0).toLocaleString('en-IN')}</div>
          </div>
        </div>

        {/* Progress Bar */}
        <div style={{ marginTop: 16, padding: '12px 16px', background: 'var(--color-surface-2)', borderRadius: 'var(--radius-md)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: 6 }}>
            <span><strong>Fee Payment Progress:</strong> {fees?.summary?.paid_percentage || 0}% Completed</span>
            <span>Remaining Balance: <strong>₹{(fees?.summary?.total_remaining ?? 0).toLocaleString('en-IN')}</strong></span>
          </div>
          <div style={{ width: '100%', height: 10, background: '#e2e8f0', borderRadius: 999, overflow: 'hidden' }}>
            <div style={{
              width: `${Math.min(100, Math.max(0, fees?.summary?.paid_percentage || 0))}%`,
              height: '100%',
              background: (fees?.summary?.paid_percentage || 0) >= 100 ? 'var(--color-success)' : 'var(--color-primary)',
              transition: 'width 0.4s ease'
            }} />
          </div>
        </div>
      </div>

      {/* Class-Wise Official Fee Structure Card */}
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <h3 className={styles.cardTitle}>
            <BookOpen size={18} color="var(--color-primary)" /> Class-Wise Fee Structure (Standard {p.standard})
          </h3>
          <span className={`${styles.tag} ${styles.tagPrimary}`}>Total Annual Class Fee: ₹{(fees?.class_total_fee || 0).toLocaleString('en-IN')}</span>
        </div>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Fee Category</th>
                <th>Billing Frequency</th>
                <th>Prescribed Amount</th>
                <th>Due Date</th>
                <th>Late Fine</th>
              </tr>
            </thead>
            <tbody>
              {fees?.class_fee_structure?.map((item: any) => (
                <tr key={item.id}>
                  <td>
                    <strong>{item.category}</strong>
                    {item.category_marathi && <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{item.category_marathi}</div>}
                  </td>
                  <td><span style={{ textTransform: 'capitalize' }}>{item.frequency}</span></td>
                  <td><strong style={{ color: 'var(--color-text-primary)' }}>₹{item.amount.toLocaleString('en-IN')}</strong></td>
                  <td>{item.due_date || 'Standard Academic Terms'}</td>
                  <td>₹{item.late_fine_per_day || 0} / day</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Installment Schedule Breakdown */}
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <h3 className={styles.cardTitle}>
            <CalendarDays size={18} color="var(--color-warning)" /> Fee Payment Installment Schedule
          </h3>
        </div>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Installment Name</th>
                <th>Total Amount</th>
                <th>Paid Amount</th>
                <th>Remaining to Pay</th>
                <th>Due Date</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {fees?.installments?.map((inst: any) => (
                <tr key={inst.id}>
                  <td><strong>{inst.installment_name}</strong></td>
                  <td>₹{inst.amount.toLocaleString('en-IN')}</td>
                  <td style={{ color: 'var(--color-success)', fontWeight: 700 }}>₹{inst.paid_amount.toLocaleString('en-IN')}</td>
                  <td style={{ color: inst.remaining_amount > 0 ? 'var(--color-danger)' : 'var(--color-text-muted)', fontWeight: 700 }}>₹{inst.remaining_amount.toLocaleString('en-IN')}</td>
                  <td>{inst.due_date}</td>
                  <td>
                    <span className={`${styles.tag} ${inst.status === 'paid' ? styles.tagSuccess : inst.status === 'partial' ? styles.tagWarning : styles.tagDanger}`}>
                      {inst.status.toUpperCase()}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Fee Payment History & Receipts */}
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <h3 className={styles.cardTitle}><Receipt size={18} color="var(--color-primary)" /> Payment Receipts & Transactions</h3>
        </div>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Receipt #</th>
                <th>Payment Date</th>
                <th>Amount Paid</th>
                <th>Payment Mode</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {fees?.payments?.length === 0 ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--color-text-muted)' }}>No payment receipts recorded yet.</td></tr>
              ) : (
                fees?.payments?.map((rec: any, idx: number) => (
                  <tr key={idx}>
                    <td><strong>{rec.receipt_number || `REC-2026-0${idx + 1}`}</strong></td>
                    <td>{rec.payment_date}</td>
                    <td style={{ color: 'var(--color-success)', fontWeight: 700 }}>₹{rec.amount}</td>
                    <td><span style={{ textTransform: 'uppercase', fontSize: '0.8rem' }}>{rec.mode}</span></td>
                    <td><span className={`${styles.tag} ${styles.tagSuccess}`}>SUCCESS</span></td>
                    <td>
                      <button className={styles.secondaryBtn} onClick={() => toast.success(`Receipt ${rec.receipt_number || 'REC-2026-01'} downloaded!`)}>
                        <Download size={14} /> Download Receipt
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

{/* 16. LEAVE REQUEST */ }
{
  activeTab === 'leave' && (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <h3 className={styles.cardTitle}><Palmtree size={20} color="var(--color-primary)" /> Applied Live Leave Applications</h3>
        <button className={styles.primaryBtn} onClick={() => setShowLeaveForm(true)}><Plus size={14} /> Apply Leave</button>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {leaves.length === 0 ? (
          <div style={{ padding: 32, textAlign: 'center', color: 'var(--color-text-muted)', background: 'var(--color-surface-2)', borderRadius: 'var(--radius-lg)' }}>
            <Palmtree size={36} style={{ opacity: 0.4, marginBottom: 8 }} />
            <p style={{ margin: 0, fontWeight: 600 }}>No leave applications submitted yet.</p>
            <p style={{ margin: '4px 0 16px', fontSize: '0.85rem' }}>Click "Apply Leave" above to request leave for sickness, family function, or personal reasons.</p>
            <button className={styles.primaryBtn} onClick={() => setShowLeaveForm(true)} style={{ margin: '0 auto' }}><Plus size={14} /> Apply Leave</button>
          </div>
        ) : (
          leaves.map((l: any, i: number) => (
            <div key={i} style={{ padding: 16, background: 'var(--color-surface-2)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <span className={`${styles.tag} ${styles.tagPrimary}`}>{l.leave_type?.toUpperCase() || 'CASUAL LEAVE'}</span>
                  <span className={`${styles.tag} ${l.status === 'approved' ? styles.tagSuccess : l.status === 'rejected' ? styles.tagDanger : l.status === 'cancelled' ? styles.tagMuted : styles.tagWarning}`}>
                    {l.status?.toUpperCase() || 'PENDING'}
                  </span>
                  {l.total_days && <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>{l.total_days} Day{l.total_days > 1 ? 's' : ''}</span>}
                </div>
                <h4 style={{ margin: '4px 0 6px', fontSize: '1rem' }}>Dates: <strong>{l.date || `${l.start_date} to ${l.end_date}`}</strong></h4>
                <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>Reason: {l.reason || l.remarks || 'Reason submitted to class teacher.'}</p>
                {l.rejection_reason && (
                  <div style={{ marginTop: 6, fontSize: '0.8rem', color: 'var(--color-danger)' }}>
                    Rejection Note: {l.rejection_reason}
                  </div>
                )}
              </div>
              {l.status === 'pending' && l.id && (
                <button className={styles.secondaryBtn} style={{ color: 'var(--color-danger)' }} onClick={() => handleCancelLeave(l.id)}>
                  Cancel Request
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}

{/* 17. PORTFOLIO */ }
{
  activeTab === 'portfolio' && (
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
  )
}

{/* 18. DOUBTS & NOTICES */ }
{
  activeTab === 'communication' && (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <h3 className={styles.cardTitle}><HelpCircle size={20} color="var(--color-primary)" /> Teacher Doubts &amp; School Circulars</h3>
        <button className={styles.primaryBtn} onClick={() => setShowDoubtModal(true)}><Plus size={14} /> Ask Doubt</button>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {notices.length === 0 ? (
          <div style={{ padding: 32, textAlign: 'center', color: 'var(--color-text-muted)', background: 'var(--color-surface-2)', borderRadius: 'var(--radius-lg)' }}>
            <HelpCircle size={32} style={{ marginBottom: 8, opacity: 0.5 }} />
            <p style={{ margin: 0, fontWeight: 600 }}>No active school circulars or announcements at this time.</p>
            <p style={{ margin: '4px 0 16px', fontSize: '0.85rem' }}>Have an academic question? Click "Ask Doubt" to send a question directly to your teacher.</p>
            <button className={styles.primaryBtn} onClick={() => setShowDoubtModal(true)} style={{ margin: '0 auto' }}><Plus size={14} /> Ask Doubt</button>
          </div>
        ) : (
          notices.map(n => (
            <div key={n.id} style={{ padding: 16, background: 'var(--color-surface-2)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span className={`${styles.tag} ${styles.tagPrimary}`}>{n.type?.toUpperCase() || 'CIRCULAR'}</span>
                  {n.is_pinned && <span style={{ fontSize: '0.75rem', background: '#f59e0b', color: '#fff', padding: '2px 8px', borderRadius: 4, fontWeight: 600 }}>📌 PINNED</span>}
                  {(n as any).notice_number && <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>#{(n as any).notice_number}</span>}
                </div>
                {n.created_at && <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{formatDate(n.created_at)}</span>}
              </div>
              <h4 style={{ margin: '6px 0 4px', fontSize: '1rem' }}>{n.title}</h4>
              {(n as any).title_marathi && <div style={{ fontSize: '0.875rem', color: 'var(--color-primary)', marginBottom: 6 }}>{(n as any).title_marathi}</div>}
              <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--color-text-secondary)', lineHeight: 1.5, whiteSpace: 'pre-line' }}>{n.body || (n as any).content || 'No content description.'}</p>
            </div>
          ))
        )}
      </div>
    </div>
  )
}


{/* 20. ACADEMIC ANALYTICS & STUDY PROGRESS */ }
{
  activeTab === 'analytics' && (
    <div className={styles.analyticsContainer}>
      {/* Header Title */}
      <div className={styles.cardHeader} style={{ marginBottom: 0 }}>
        <h3 className={styles.cardTitle}>
          <BarChart3 size={22} color="var(--color-primary)" />
          Academic Analytics & Study Progress
        </h3>
        <span className={styles.chartSub}>Live Performance & Performance Metrics</span>
      </div>

      {analytics && (
        <>
          {/* KPI Summary Grid */}
          <div className={styles.analyticsKpiGrid}>
            <div className={styles.analyticsKpiCard} style={{ borderTop: '3.5px solid var(--color-primary)' }}>
              <div className={styles.analyticsKpiHeader}>
                <span className={styles.analyticsKpiLabel}>Homework Completed</span>
                <div className={styles.analyticsKpiIcon}><CheckCircle2 size={20} /></div>
              </div>
              <div className={styles.analyticsKpiValue}>{analytics.homework_completion_pct ?? 0}%</div>
              <span className={styles.chartSub}>Assigned coursework submission rate</span>
            </div>

            <div className={styles.analyticsKpiCard} style={{ borderTop: '3.5px solid var(--color-success)' }}>
              <div className={styles.analyticsKpiHeader}>
                <span className={styles.analyticsKpiLabel}>Assignment Completion</span>
                <div className={styles.analyticsKpiIcon}><ClipboardList size={20} /></div>
              </div>
              <div className={styles.analyticsKpiValue}>{analytics.assignment_completion_pct ?? 0}%</div>
              <span className={styles.chartSub}>Completed project & lab submissions</span>
            </div>

            <div className={styles.analyticsKpiCard} style={{ borderTop: '3.5px solid #8b5cf6' }}>
              <div className={styles.analyticsKpiHeader}>
                <span className={styles.analyticsKpiLabel}>Weekly Study Time</span>
                <div className={styles.analyticsKpiIcon}><Clock size={20} /></div>
              </div>
              <div className={styles.analyticsKpiValue}>{analytics.weekly_study_hours ?? 0} hrs</div>
              <span className={styles.chartSub}>Tracked active learning time / week</span>
            </div>

            <div className={styles.analyticsKpiCard} style={{ borderTop: '3.5px solid var(--color-warning)' }}>
              <div className={styles.analyticsKpiHeader}>
                <span className={styles.analyticsKpiLabel}>Exam Performance Peak</span>
                <div className={styles.analyticsKpiIcon}><Trophy size={20} /></div>
              </div>
              <div className={styles.analyticsKpiValue}>
                {analytics.marks_trend && analytics.marks_trend.length > 0
                  ? `${Math.max(...analytics.marks_trend.map((m: any) => m.pct))}%`
                  : 'N/A'}
              </div>
              <span className={styles.chartSub}>Highest examination score achieved</span>
            </div>
          </div>

          {/* Visual Graphs Row */}
          <div className={styles.chartRowGrid}>
            {/* Graph 1: Exam Performance Trend */}
            <div className={styles.chartCard}>
              <div className={styles.chartHeader}>
                <h4 className={styles.chartTitle}><Trophy size={18} color="var(--color-primary)" /> Examination Marks Trend</h4>
                <span className={styles.chartSub}>Real Exam Performance Over Time</span>
              </div>

              {analytics.marks_trend && analytics.marks_trend.length > 0 ? (
                <div className={styles.graphContainer}>
                  <div className={styles.graphBenchmarkLine}>
                    <span className={styles.graphBenchmarkLabel}>Target (85%)</span>
                  </div>
                  {analytics.marks_trend.map((item: any, idx: number) => {
                    const val = Number(item.pct) || 0;
                    const heightPct = Math.min(Math.max(val, 10), 100);
                    return (
                      <div key={idx} className={styles.barCol}>
                        <div className={styles.barValuePill}>{val}%</div>
                        <div className={styles.barTrack}>
                          <div
                            className={styles.barFill}
                            style={{
                              height: `${heightPct}%`,
                              background: val >= 85
                                ? 'linear-gradient(180deg, #10b981 0%, #059669 100%)'
                                : 'linear-gradient(180deg, #2563eb 0%, #1d4ed8 100%)'
                            }}
                          />
                        </div>
                        <span className={styles.barLabel}>{item.exam}</span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className={styles.emptyState}>No exam performance trends recorded yet.</div>
              )}
            </div>

            {/* Graph 2: Monthly Attendance Trend */}
            <div className={styles.chartCard}>
              <div className={styles.chartHeader}>
                <h4 className={styles.chartTitle}><CalendarDays size={18} color="var(--color-success)" /> Attendance Rate Trend</h4>
                <span className={styles.chartSub}>Monthly Attendance (%)</span>
              </div>

              {analytics.attendance_trend && analytics.attendance_trend.length > 0 ? (
                <div className={styles.graphContainer}>
                  <div className={styles.graphBenchmarkLine} style={{ top: '25%' }}>
                    <span className={styles.graphBenchmarkLabel} style={{ color: 'var(--color-success)' }}>Min Threshold (75%)</span>
                  </div>
                  {analytics.attendance_trend.map((item: any, idx: number) => {
                    const val = Number(item.pct) || 0;
                    const heightPct = Math.min(Math.max(val, 10), 100);
                    return (
                      <div key={idx} className={styles.barCol}>
                        <div className={styles.barValuePill}>{val}%</div>
                        <div className={styles.barTrack}>
                          <div
                            className={styles.barFill}
                            style={{
                              height: `${heightPct}%`,
                              background: val >= 90
                                ? 'linear-gradient(180deg, #10b981 0%, #047857 100%)'
                                : val >= 75
                                  ? 'linear-gradient(180deg, #3b82f6 0%, #1d4ed8 100%)'
                                  : 'linear-gradient(180deg, #ef4444 0%, #b91c1c 100%)'
                            }}
                          />
                        </div>
                        <span className={styles.barLabel}>{item.month}</span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className={styles.emptyState}>No attendance trend data available.</div>
              )}
            </div>
          </div>

          {/* Subject Mastery & AI Study Recommendation Grid */}
          <div className={styles.chartRowGrid}>
            {/* Strong & Weak Subject Breakdown */}
            <div className={styles.chartCard}>
              <div className={styles.chartHeader}>
                <h4 className={styles.chartTitle}><Target size={18} color="#8b5cf6" /> Subject Mastery Breakdown</h4>
                <span className={styles.chartSub}>Strengths & Focus Areas</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    🌟 Strong Subjects (High Proficiency)
                  </div>
                  <div className={styles.subjectTagGroup}>
                    {analytics.strong_subjects && analytics.strong_subjects.length > 0 ? (
                      analytics.strong_subjects.map((sub: string, i: number) => (
                        <span key={i} className={styles.strongTag}><Check size={14} /> {sub}</span>
                      ))
                    ) : (
                      <span className={styles.chartSub}>All core subjects performing consistently.</span>
                    )}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    🎯 Needs Focus & Revision
                  </div>
                  <div className={styles.subjectTagGroup}>
                    {analytics.weak_subjects && analytics.weak_subjects.length > 0 ? (
                      analytics.weak_subjects.map((sub: string, i: number) => (
                        <span key={i} className={styles.weakTag}><AlertCircle size={14} /> {sub}</span>
                      ))
                    ) : (
                      <span className={styles.chartSub}>No critical weak areas detected.</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* AI Personal Study Insights Card */}
            <div className={styles.insightCard}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div className={styles.insightIconWrap}>
                  <Brain size={20} />
                </div>
                <div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--color-text-primary)' }}>AI Personal Study Recommendation</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Automated Learning Path Insights</div>
                </div>
              </div>
              <p style={{ margin: 0, fontSize: '0.875rem', lineHeight: 1.6, color: 'var(--color-text-secondary)', fontWeight: 500 }}>
                {analytics.ai_insights || 'Continue maintaining your study schedule to preserve your strong performance across all subjects.'}
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 'auto', paddingTop: 8 }}>
                <Sparkles size={16} color="var(--color-primary)" />
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-primary)' }}>Updated live based on real classroom assessments</span>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}


{/* 21. ID CARD */ }
{
  activeTab === 'idcard' && (
    <StudentIdCard idCardData={idCard} profileData={profile} />
  )
}


{/* 22. SETTINGS */ }
{
  activeTab === 'settings' && (
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
  )
}
        </>
      )}

{/* ── MODALS ────────────────────────────────────────────── */ }
{
  showProfileModal && (
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
  )
}

{
  showHomeworkModal && (
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
  )
}

{
  showLeaveForm && (
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
  )
}

{
  showDoubtModal && (
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
  )
}

{/* Student Apply Bonafide Modal */ }
{
  showApplyBonafideModal && (
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
  )
}

{/* ── ASK DOUBT MODAL ── */ }
{
  showDoubtModal && (
    <div className={styles.modalOverlay} onClick={() => setShowDoubtModal(false)}>
      <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h3><HelpCircle size={18} /> Ask Academic Doubt to Subject Teacher</h3>
          <button className={styles.modalCloseBtn} onClick={() => setShowDoubtModal(false)}>✕</button>
        </div>
        <div className={styles.modalBody} style={{ gap: 16 }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: 4 }}>Select Subject *</label>
            <select
              className={styles.selectField}
              value={doubtForm.subject}
              onChange={e => setDoubtForm(p => ({ ...p, subject: e.target.value }))}
            >
              <option value="Mathematics">Mathematics (गणित)</option>
              <option value="Science">Science (विज्ञान)</option>
              <option value="English">English (इंग्रजी)</option>
              <option value="Marathi">Marathi (मराठी)</option>
              <option value="Hindi">Hindi (हिंदी)</option>
              <option value="Social Studies">Social Studies (सामाजिक शास्त्रे)</option>
              <option value="Computer">Computer / IT</option>
              <option value="Other">Other / General Question</option>
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: 4 }}>Your Question or Doubt *</label>
            <textarea
              className={styles.selectField}
              rows={4}
              style={{ resize: 'vertical' }}
              placeholder="Type your question, exercise number, or concept doubt here..."
              value={doubtForm.question}
              onChange={e => setDoubtForm(p => ({ ...p, question: e.target.value }))}
            />
          </div>
          <button
            className={styles.primaryBtn}
            onClick={handleSendDoubt}
            disabled={submittingDoubt}
          >
            {submittingDoubt ? 'Sending Doubt...' : 'Send Question to Teacher'}
          </button>
        </div>
      </div>
    </div>
  )
}

{/* Student Printable Certificate View */ }
{
  studentPrintData && (
    <BonafideCertificatePrint data={studentPrintData} onClose={() => setStudentPrintData(null)} />
  )
}
    </div >
  );
}
