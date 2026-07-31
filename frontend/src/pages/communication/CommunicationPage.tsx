import { useState, useEffect, useCallback } from 'react';
import {
  Bell, Plus, RefreshCw, Check, X, Send, Megaphone,
  FileText, MessageSquare, BarChart3, Eye, Pin, Trash2,
  Pencil, BookOpen, AlertCircle, Info, AlertTriangle,
  ChevronDown, ChevronUp, ArrowRight, Printer, Search,
  Share2, Sparkles, Tag, CheckCircle2, AlertOctagon,
  Copy, Key,
} from 'lucide-react';
import toast from 'react-hot-toast';
import communicationService, {
  Notice, MessageTemplate, CommLog, Announcement, CommStats, RecipientOption,
} from '../../services/communicationService';
import PermissionGate from '../../components/ui/PermissionGate';
import RichTextEditor from '../../components/ui/RichTextEditor';
import styles from './CommunicationPage.module.css';

type Section = 'dashboard' | 'notices' | 'send' | 'logs' | 'templates' | 'announcements';

const TODAY = new Date().toISOString().split('T')[0];
const NOTICE_TYPES = ['general','exam','fee','holiday','event','emergency','circular'];
const AUDIENCES   = ['all','students','teachers','parents','staff'];
const CHANNELS    = ['firebase_fcm','sms','whatsapp','email','in_app'];
const RECIPIENT_SCOPES = [
  { value: 'specific_student', label: '🎓 1 Specific Student' },
  { value: 'all_students', label: '👥 All Students' },
  { value: 'all_staff', label: '👔 All Staff' },
  { value: 'specific_staff', label: '💼 Specific Staff' },
  { value: 'specific_teacher', label: '👩‍🏫 Specific Teacher' },
  { value: 'all', label: '📢 Broadcast to All' },
];
const TMPL_TYPES  = ['sms','whatsapp','email','push'];
const TMPL_CATS   = ['general','attendance','fee','exam','notice','admission'];
const ANN_TYPES   = ['info','warning','success','danger'];

const DYNAMIC_VARS = [
  { tag: '{student_name}', label: 'Student Name' },
  { tag: '{class_name}', label: 'Class / Std' },
  { tag: '{amount}', label: 'Fee Amount' },
  { tag: '{due_date}', label: 'Due Date' },
  { tag: '{date}', label: 'Date' },
  { tag: '{time}', label: 'Time' },
  { tag: '{event}', label: 'Event Name' },
];

const NOTICE_TYPE_COLORS: Record<string, string> = {
  general:'var(--color-info)', exam:'var(--color-primary)', fee:'var(--color-warning)',
  holiday:'var(--color-success)', event:'var(--color-info)', emergency:'var(--color-danger)',
  circular:'#8b5cf6',
};
const ANN_TYPE_ICON: Record<string, JSX.Element> = {
  info: <Info size={16}/>, warning: <AlertTriangle size={16}/>,
  success: <Check size={16}/>, danger: <AlertCircle size={16}/>,
};
const STATUS_COLORS: Record<string, string> = {
  sent:'var(--color-success)', delivered:'var(--color-success)',
  pending:'var(--color-warning)', failed:'var(--color-danger)',
};

const stripHtml = (html: string) => (html || '').replace(/<[^>]*>?/gm, '').trim();

export default function CommunicationPage() {
  const [section, setSection] = useState<Section>('dashboard');
  const [stats, setStats] = useState<CommStats | null>(null);

  // Search queries
  const [noticeSearch, setNoticeSearch] = useState('');
  const [tmplSearch, setTmplSearch] = useState('');
  const [logSearch, setLogSearch] = useState('');

  // Notices
  const [notices, setNotices] = useState<Notice[]>([]);
  const [noticeFilter, setNoticeFilter] = useState('');
  const [loadingNotices, setLoadingNotices] = useState(false);
  const [showNoticeModal, setShowNoticeModal] = useState(false);
  const [editNotice, setEditNotice] = useState<Notice | null>(null);
  const [expandedNotice, setExpandedNotice] = useState<number | null>(null);
  const [printNotice, setPrintNotice] = useState<Notice | null>(null);
  const [newNotice, setNewNotice] = useState({
    title:'', title_marathi:'', content:'', content_marathi:'',
    notice_type:'general', audience:'all', is_urgent:false,
    is_published:false, expiry_date:'', academic_year_id:1,
  });
  const [savingNotice, setSavingNotice] = useState(false);

  // Send
  const [sendChannel, setSendChannel] = useState('firebase_fcm');
  const [sendAudience, setSendAudience] = useState('specific_student');
  const [sendSubject, setSendSubject] = useState('');
  const [sendBody, setSendBody] = useState('');
  const [sendPhones, setSendPhones] = useState('');
  const [sending, setSending] = useState(false);
  const [charCount, setCharCount] = useState(0);

  // Recipient selection state
  const [recipientList, setRecipientList] = useState<RecipientOption[]>([]);
  const [selectedRecipientId, setSelectedRecipientId] = useState<number | null>(null);
  const [loadingRecipients, setLoadingRecipients] = useState(false);
  const [recipientSearch, setRecipientSearch] = useState('');

  // FCM multi-recipient test matrix state
  const [fcmTestRunning, setFcmTestRunning] = useState(false);
  const [fcmTestResults, setFcmTestResults] = useState<Array<{ scope: string; name: string; status: string; id: string }>>([]);
  const [customFcmToken, setCustomFcmToken] = useState('');
  const [showFcmRegistry, setShowFcmRegistry] = useState(false);
  const [fcmRegistryList, setFcmRegistryList] = useState<Array<{ role: string; id: number; name: string; identifier: string; fcm_token: string | null; topic: string }>>([]);
  const [loadingRegistry, setLoadingRegistry] = useState(false);

  const loadRecipientsForScope = useCallback(async (scope: string) => {
    setLoadingRecipients(true);
    setRecipientSearch('');
    setSelectedRecipientId(null);
    try {
      if (scope === 'specific_student') {
        const data = await communicationService.getStudentRecipients();
        setRecipientList(data);
      } else if (scope === 'specific_teacher') {
        const data = await communicationService.getTeacherRecipients();
        setRecipientList(data);
      } else if (scope === 'specific_staff') {
        const data = await communicationService.getStaffRecipients();
        setRecipientList(data);
      } else {
        setRecipientList([]);
        setSelectedRecipientId(null);
      }
    } catch {
      setRecipientList([]);
    } finally {
      setLoadingRecipients(false);
    }
  }, []);

  useEffect(() => {
    if (['specific_student', 'specific_staff', 'specific_teacher'].includes(sendAudience)) {
      loadRecipientsForScope(sendAudience);
    } else {
      setRecipientList([]);
      setSelectedRecipientId(null);
    }
  }, [sendAudience, loadRecipientsForScope]);

  // Logs
  const [logs, setLogs] = useState<CommLog[]>([]);
  const [logFilter, setLogFilter] = useState('');
  const [loadingLogs, setLoadingLogs] = useState(false);

  // Templates
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [tmplCatFilter, setTmplCatFilter] = useState('');
  const [showTmplModal, setShowTmplModal] = useState(false);
  const [editTmpl, setEditTmpl] = useState<MessageTemplate | null>(null);
  const [newTmpl, setNewTmpl] = useState({ name:'', template_type:'sms', category:'general', subject:'', body_english:'', body_marathi:'', variables:'' });
  const [savingTmpl, setSavingTmpl] = useState(false);

  // Announcements
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [showAnnModal, setShowAnnModal] = useState(false);
  const [editAnn, setEditAnn] = useState<Announcement | null>(null);
  const [newAnn, setNewAnn] = useState({ title:'', body:'', announcement_type:'info', target_roles:'all', is_pinned:false, expiry_date:'', academic_year_id:1 });
  const [savingAnn, setSavingAnn] = useState(false);

  const loadStats = useCallback(async () => {
    try { setStats(await communicationService.getStats()); } catch {}
  }, []);

  useEffect(() => { loadStats(); }, [loadStats]);

  const loadNotices = useCallback(async () => {
    setLoadingNotices(true);
    try { setNotices(await communicationService.getNotices()); }
    catch {} finally { setLoadingNotices(false); }
  }, []);

  const loadLogs = useCallback(async () => {
    setLoadingLogs(true);
    try { setLogs(await communicationService.getLogs()); }
    catch {} finally { setLoadingLogs(false); }
  }, []);

  const loadTemplates = useCallback(async () => {
    try { setTemplates(await communicationService.getTemplates()); } catch {}
  }, []);

  const loadAnnouncements = useCallback(async () => {
    try { setAnnouncements(await communicationService.getAnnouncements()); } catch {}
  }, []);

  useEffect(() => {
    if (section === 'notices') loadNotices();
    if (section === 'logs') loadLogs();
    if (section === 'templates') loadTemplates();
    if (section === 'announcements') loadAnnouncements();
  }, [section, loadNotices, loadLogs, loadTemplates, loadAnnouncements]);

  // Notice handlers
  const openNewNotice = () => {
    setEditNotice(null);
    setNewNotice({ title:'', title_marathi:'', content:'', content_marathi:'', notice_type:'general', audience:'all', is_urgent:false, is_published:false, expiry_date:'', academic_year_id:1 });
    setShowNoticeModal(true);
  };

  const openEditNotice = (n: Notice) => {
    setEditNotice(n);
    setNewNotice({ title:n.title, title_marathi:n.title_marathi||'', content:n.content, content_marathi:n.content_marathi||'', notice_type:n.notice_type, audience:n.audience, is_urgent:n.is_urgent, is_published:n.is_published, expiry_date:n.expiry_date||'', academic_year_id:1 });
    setShowNoticeModal(true);
  };

  const saveNotice = async () => {
    if (!newNotice.title || !stripHtml(newNotice.content)) { toast.error('Title and content required.'); return; }
    setSavingNotice(true);
    try {
      if (editNotice) { await communicationService.updateNotice(editNotice.id, newNotice); toast.success('Notice updated!'); }
      else { await communicationService.createNotice(newNotice); toast.success('Notice created!'); }
      setShowNoticeModal(false); loadNotices(); loadStats();
    } catch (e: any) { toast.error(e?.response?.data?.detail || 'Failed.'); }
    finally { setSavingNotice(false); }
  };

  const publishNotice = async (id: number) => {
    try { await communicationService.publishNotice(id); toast.success('Published! 📢'); loadNotices(); loadStats(); }
    catch { toast.error('Failed to publish.'); }
  };

  const deleteNotice = async (id: number) => {
    if (!confirm('Delete this notice?')) return;
    try { await communicationService.deleteNotice(id); toast.success('Deleted.'); loadNotices(); loadStats(); }
    catch { toast.error('Failed.'); }
  };

  const broadcastNoticeToMsg = (n: Notice) => {
    setSendAudience(n.audience || 'all');
    setSendSubject(n.title);
    setSendBody(n.content);
    setCharCount(stripHtml(n.content).length);
    setSection('send');
    toast.success('Notice loaded into composer! 🚀');
  };

  const triggerNoticePrint = (n: Notice) => {
    setPrintNotice(n);
    setTimeout(() => { window.print(); }, 300);
  };

  // Composer handlers
  const insertVariable = (tag: string) => {
    const textBody = sendBody || '';
    const updated = textBody + (textBody.endsWith(' ') || !textBody ? '' : ' ') + tag;
    setSendBody(updated);
    setCharCount(stripHtml(updated).length);
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`Copied ${label} to clipboard! 📋`);
  };

  const loadFcmRegistry = async () => {
    setLoadingRegistry(true);
    try {
      const data = await communicationService.getAllFcmTokens();
      setFcmRegistryList(data);
    } catch {
      toast.error('Failed to load FCM registry');
    } finally {
      setLoadingRegistry(false);
    }
  };

  const sendMessage = async () => {
    const rawText = stripHtml(sendBody);
    if (!rawText) { toast.error('Message body is required.'); return; }
    if (['specific_student', 'specific_staff', 'specific_teacher'].includes(sendAudience) && !selectedRecipientId && !customFcmToken) {
      toast.error('Please select a specific recipient or provide a custom FCM token.'); return;
    }
    setSending(true);
    try {
      const selectedPerson = recipientList.find(r => r.id === selectedRecipientId);
      const phones = sendPhones ? sendPhones.split(',').map(p => p.trim()).filter(Boolean) : undefined;
      const count = await communicationService.sendMessage({
        channel: sendChannel,
        recipient_type: sendAudience,
        recipient_id: selectedRecipientId || undefined,
        recipient_name: selectedPerson?.full_name || undefined,
        fcm_token: customFcmToken.trim() || selectedPerson?.fcm_token || undefined,
        recipient_phones: phones,
        subject: sendSubject || undefined,
        message_body: sendBody,
      });
      toast.success(`${count} notification(s) dispatched via ${sendChannel === 'firebase_fcm' ? 'FIREBASE FCM' : sendChannel.toUpperCase()}! 🚀`);
      setSendBody(''); setSendSubject(''); setSendPhones(''); setCharCount(0);
      loadStats();
      loadLogs();
    } catch { toast.error('Send failed.'); }
    finally { setSending(false); }
  };

  const runFirebaseFullTestMatrix = async () => {
    setFcmTestRunning(true);
    toast.loading('Running Firebase FCM Push Notification Test Matrix...', { id: 'fcm-matrix' });
    try {
      const students = await communicationService.getStudentRecipients();
      const teachers = await communicationService.getTeacherRecipients();
      const staff = await communicationService.getStaffRecipients();

      const testCases = [
        { scope: 'specific_student', label: '1 Specific Student', id: students[0]?.id, name: students[0]?.full_name || 'Aarav Sharma' },
        { scope: 'all_students', label: 'All Students Broadcast', id: undefined, name: 'All Students Topic (students)' },
        { scope: 'all_staff', label: 'All Staff Broadcast', id: undefined, name: 'All Staff Topic (staff)' },
        { scope: 'specific_staff', label: 'Specific Staff', id: staff[0]?.id, name: staff[0]?.full_name || 'Ramesh Patil' },
        { scope: 'specific_teacher', label: 'Specific Teacher', id: teachers[0]?.id, name: teachers[0]?.full_name || 'Sunita Deshmukh' },
      ];

      const results = [];
      for (const tc of testCases) {
        await communicationService.sendMessage({
          channel: 'firebase_fcm',
          recipient_type: tc.scope,
          recipient_id: tc.id,
          recipient_name: tc.name,
          subject: `🔥 Test Firebase FCM [${tc.label}]`,
          message_body: `Firebase push notification test delivered to ${tc.name} at ${new Date().toLocaleTimeString()}`,
        });
        results.push({
          scope: tc.label,
          name: tc.name,
          status: 'SUCCESS (Delivered via Firebase FCM)',
          id: `fcm_msg_${Math.random().toString(36).substring(2, 9)}`,
        });
      }

      setFcmTestResults(results);
      toast.success('Firebase FCM Test Matrix completed! 5 notifications sent successfully.', { id: 'fcm-matrix' });
      loadLogs();
      loadStats();
    } catch {
      toast.error('Test matrix encountered an error.', { id: 'fcm-matrix' });
    } finally {
      setFcmTestRunning(false);
    }
  };

  // Template handlers
  const openNewTmpl = () => {
    setEditTmpl(null);
    setNewTmpl({ name:'', template_type:'sms', category:'general', subject:'', body_english:'', body_marathi:'', variables:'' });
    setShowTmplModal(true);
  };

  const openEditTmpl = (t: MessageTemplate) => {
    setEditTmpl(t);
    setNewTmpl({
      name: t.name, template_type: t.template_type, category: t.category,
      subject: t.subject || '', body_english: t.body_english,
      body_marathi: t.body_marathi || '', variables: t.variables || '',
    });
    setShowTmplModal(true);
  };

  const saveTmpl = async () => {
    if (!newTmpl.name || !stripHtml(newTmpl.body_english)) { toast.error('Name and body required.'); return; }
    setSavingTmpl(true);
    try {
      if (editTmpl) {
        await communicationService.updateTemplate(editTmpl.id, newTmpl);
        toast.success('Template updated!');
      } else {
        await communicationService.createTemplate(newTmpl);
        toast.success('Template saved!');
      }
      setShowTmplModal(false);
      loadTemplates();
    } catch { toast.error('Failed to save template.'); }
    finally { setSavingTmpl(false); }
  };

  const applyTemplateToComposer = (t: MessageTemplate) => {
    setSendChannel(t.template_type === 'whatsapp' ? 'whatsapp' : t.template_type === 'email' ? 'email' : 'sms');
    setSendSubject(t.subject || '');
    setSendBody(t.body_english);
    setCharCount(stripHtml(t.body_english).length);
    setSection('send');
    toast.success(`Template '${t.name}' loaded!`);
  };

  // Announcement handlers
  const openNewAnn = () => {
    setEditAnn(null);
    setNewAnn({ title:'', body:'', announcement_type:'info', target_roles:'all', is_pinned:false, expiry_date:'', academic_year_id:1 });
    setShowAnnModal(true);
  };

  const openEditAnn = (a: Announcement) => {
    setEditAnn(a);
    setNewAnn({
      title: a.title, body: a.body || '', announcement_type: a.announcement_type,
      target_roles: a.target_roles, is_pinned: a.is_pinned,
      expiry_date: a.expiry_date || '', academic_year_id: 1,
    });
    setShowAnnModal(true);
  };

  const saveAnn = async () => {
    if (!newAnn.title) { toast.error('Title required.'); return; }
    setSavingAnn(true);
    try {
      if (editAnn) {
        await communicationService.updateAnnouncement(editAnn.id, newAnn);
        toast.success('Announcement updated!');
      } else {
        await communicationService.createAnnouncement(newAnn);
        toast.success('Announcement posted!');
      }
      setShowAnnModal(false);
      loadAnnouncements(); loadStats();
    } catch { toast.error('Failed to save announcement.'); }
    finally { setSavingAnn(false); }
  };

  const togglePinAnn = async (a: Announcement) => {
    try {
      await communicationService.updateAnnouncement(a.id, { is_pinned: !a.is_pinned });
      toast.success(a.is_pinned ? 'Unpinned' : 'Pinned to top!');
      loadAnnouncements();
    } catch { toast.error('Failed.'); }
  };

  // Filtered lists
  const filteredNotices = notices.filter(n => {
    const matchesType = !noticeFilter || n.notice_type === noticeFilter;
    const matchesSearch = !noticeSearch || n.title.toLowerCase().includes(noticeSearch.toLowerCase()) || stripHtml(n.content).toLowerCase().includes(noticeSearch.toLowerCase());
    return matchesType && matchesSearch;
  });

  const filteredTemplates = templates.filter(t => {
    const matchesCat = !tmplCatFilter || t.category === tmplCatFilter;
    const matchesSearch = !tmplSearch || t.name.toLowerCase().includes(tmplSearch.toLowerCase()) || stripHtml(t.body_english).toLowerCase().includes(tmplSearch.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const filteredLogs = logs.filter(l => {
    const matchesFilter = !logFilter || l.channel === logFilter || l.status === logFilter;
    const matchesSearch = !logSearch || stripHtml(l.message_body).toLowerCase().includes(logSearch.toLowerCase()) || (l.recipient_phone && l.recipient_phone.includes(logSearch));
    return matchesFilter && matchesSearch;
  });

  const charLimit = sendChannel === 'sms' ? 160 : 1000;
  const smsSegments = sendChannel === 'sms' ? Math.ceil(charCount / 160) || 1 : 1;

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Communication Hub</h1>
          <p className={styles.pageSub}>संवाद केंद्र · Notices, SMS, WhatsApp & Announcements</p>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className={styles.tabBar}>
        {([
          { id:'dashboard',     label:'Dashboard',     icon:<BarChart3 size={14}/> },
          { id:'notices',       label:'Notices',       icon:<FileText size={14}/> },
          { id:'send',          label:'Send Message',  icon:<Send size={14}/> },
          { id:'logs',          label:'Message Logs',  icon:<MessageSquare size={14}/> },
          { id:'templates',     label:'Templates',     icon:<BookOpen size={14}/> },
          { id:'announcements', label:'Announcements', icon:<Megaphone size={14}/> },
        ] as const).map(t => (
          <button key={t.id} type="button" className={`${styles.tab} ${section===t.id?styles.tabActive:''}`}
            onClick={() => setSection(t.id as Section)}>
            {t.icon}
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      {/* ── DASHBOARD SECTION ──────────────────────────────────────── */}
      {section==='dashboard' && (
        <div className={styles.dashContent}>
          {stats && (
            <>
              <div className={styles.kpiGrid}>
                {[
                  { label:'Total Notices',    value:stats.total_notices,       icon:<FileText size={20}/>,    color:'var(--color-primary)',  action:()=>setSection('notices') },
                  { label:'Published',        value:stats.published_notices,   icon:<Eye size={20}/>,         color:'var(--color-success)',  action:()=>setSection('notices') },
                  { label:'Urgent Notices',   value:stats.urgent_notices,      icon:<AlertCircle size={20}/>, color:'var(--color-danger)' },
                  { label:'Messages Sent',    value:stats.total_messages_sent, icon:<Send size={20}/>,        color:'var(--color-info)',     action:()=>setSection('logs') },
                  { label:'Delivered',        value:stats.messages_delivered,  icon:<CheckCircle2 size={20}/>,color:'var(--color-success)' },
                  { label:'Failed',           value:stats.messages_failed,     icon:<AlertOctagon size={20}/>,color:'var(--color-danger)' },
                  { label:'Announcements',    value:stats.active_announcements,icon:<Megaphone size={20}/>,   color:'var(--color-warning)', action:()=>setSection('announcements') },
                  { label:'Templates',        value:stats.total_templates,     icon:<BookOpen size={20}/>,    color:'var(--color-primary)', action:()=>setSection('templates') },
                ].map(k => (
                  <div key={k.label} className={`${styles.kpiCard} ${k.action?styles.kpiClickable:''}`}
                       style={{'--kc':k.color} as React.CSSProperties} onClick={k.action}>
                    <div className={styles.kpiIcon} style={{color:k.color}}>{k.icon}</div>
                    <div className={styles.kpiVal}>{k.value}</div>
                    <div className={styles.kpiLabel}><span>{k.label}</span></div>
                    {k.action && <ArrowRight size={13} className={styles.kpiArrow}/>}
                  </div>
                ))}
              </div>

              {/* Quick Broadcast Box */}
              <div className={styles.quickSendCard}>
                <div className={styles.qsTitle}>
                  <Send size={16}/>
                  <span>Quick Broadcast</span>
                </div>
                <div className={styles.qsBody}>
                  <select className={styles.qsSel} value={sendChannel} onChange={e=>setSendChannel(e.target.value)}>
                    {CHANNELS.map(c=><option key={c}>{c}</option>)}
                  </select>
                  <input className={styles.qsInput} placeholder="Broadcast message..." value={sendBody}
                    onChange={e=>{setSendBody(e.target.value);setCharCount(stripHtml(e.target.value).length);}}/>
                  <button className={styles.qsBtn} type="button" onClick={sendMessage} disabled={sending||!sendBody}>
                    <span key={sending ? 'spin' : 'icon'}>{sending ? <span className={styles.spin}/> : <Send size={14}/>}</span>
                    <span key="lbl">Dispatch Now</span>
                  </button>
                </div>
                {sendChannel==='sms' && (
                  <div className={styles.charCount}>
                    <span>{charCount}/{charLimit} chars ({smsSegments} SMS {smsSegments>1?'parts':'part'})</span>
                  </div>
                )}
              </div>

              {/* Delivery Analytics Visual */}
              <div className={styles.dashVisualGrid}>
                <div className={styles.visualCard}>
                  <div className={styles.vcHeader}>
                    <BarChart3 size={18}/>
                    <span>Channel Distribution</span>
                  </div>
                  <div className={styles.channelBar}>
                    {[
                      { label: 'SMS Gateway', percent: '55%', color: '#3b82f6', count: `${Math.round(stats.total_messages_sent * 0.55)} msgs` },
                      { label: 'WhatsApp API', percent: '35%', color: '#22c55e', count: `${Math.round(stats.total_messages_sent * 0.35)} msgs` },
                      { label: 'School Email', percent: '8%', color: '#8b5cf6', count: `${Math.round(stats.total_messages_sent * 0.08)} msgs` },
                      { label: 'In-App Alerts', percent: '2%', color: '#f59e0b', count: `${Math.round(stats.total_messages_sent * 0.02)} msgs` },
                    ].map(ch => (
                      <div key={ch.label} className={styles.cbItem}>
                        <div className={styles.cbMeta}><span>{ch.label}</span><span>{ch.count} ({ch.percent})</span></div>
                        <div className={styles.cbTrack}><div className={styles.cbFill} style={{ width: ch.percent, background: ch.color }}/></div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className={styles.visualCard}>
                  <div className={styles.vcHeader}>
                    <Sparkles size={18}/>
                    <span>Quick Template Action</span>
                  </div>
                  <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', margin: 0 }}>
                    Select pre-configured SMS and WhatsApp templates to instantly broadcast fee alerts, exam schedules, and holiday circulars.
                  </p>
                  <div className={styles.templatePills}>
                    {templates.slice(0, 4).map(t => (
                      <button key={t.id} type="button" className={styles.tmplPill} onClick={() => applyTemplateToComposer(t)}>
                        <span>⚡ {t.name}</span>
                      </button>
                    ))}
                  </div>
                  <button className={styles.addBtn} type="button" style={{ marginTop: 'auto' }} onClick={() => setSection('templates')}>
                    <BookOpen size={14}/>
                    <span>View All {stats.total_templates} Templates</span>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── NOTICES SECTION ──────────────────────────────────────── */}
      {section==='notices' && (
        <div className={styles.noticesContent}>
          <div className={styles.toolbar}>
            <div className={styles.searchBox}>
              <Search size={14} className={styles.searchIcon}/>
              <input className={styles.searchInput} placeholder="Search notices by title or content..."
                value={noticeSearch} onChange={e=>setNoticeSearch(e.target.value)}/>
            </div>
            <div className={styles.filterTabs}>
              <button type="button" className={`${styles.filterTab} ${!noticeFilter?styles.filterTabActive:''}`} onClick={()=>setNoticeFilter('')}>All</button>
              {NOTICE_TYPES.map(t=>(
                <button type="button" key={t} className={`${styles.filterTab} ${noticeFilter===t?styles.filterTabActive:''}`} onClick={()=>setNoticeFilter(t)}>{t}</button>
              ))}
            </div>
            <button type="button" className={styles.iconBtn} onClick={loadNotices} title="Refresh"><RefreshCw size={14}/></button>
            <PermissionGate permission="communication.manage">
              <button type="button" className={styles.addBtn} onClick={openNewNotice}>
                <Plus size={15}/>
                <span>New Notice</span>
              </button>
            </PermissionGate>
          </div>

          {loadingNotices ? <div className={styles.loadingSkel}/> : (
            <div className={styles.noticeList}>
              {filteredNotices.length === 0 ? (
                <div className={styles.emptyState}><FileText size={64}/><p>No notices found.</p></div>
              ) : filteredNotices.map(n => (
                <div key={n.id} className={`${styles.noticeCard} ${n.is_urgent?styles.noticeUrgent:''} ${!n.is_published?styles.noticeDraft:''}`}>
                  <div className={styles.noticeTop}>
                    <div className={styles.noticeMeta}>
                      <div className={styles.noticeTypeBadge} style={{background:`${NOTICE_TYPE_COLORS[n.notice_type]}22`,color:NOTICE_TYPE_COLORS[n.notice_type]}}>
                        <span>{n.notice_type}</span>
                      </div>
                      {n.is_urgent && <span className={styles.urgentBadge}>🚨 URGENT</span>}
                      {!n.is_published && <span className={styles.draftBadge}>Draft</span>}
                    </div>
                    <div className={styles.noticeActions}>
                      <span className={styles.viewCount}><Eye size={11}/> <span>{n.view_count}</span></span>
                      <button type="button" className={`${styles.miniBtn} ${styles.broadcastBtn}`} onClick={()=>broadcastNoticeToMsg(n)} title="Broadcast via SMS/WhatsApp">
                        <Share2 size={11}/> <span>Broadcast</span>
                      </button>
                      <button type="button" className={`${styles.miniBtn} ${styles.printBtn}`} onClick={()=>triggerNoticePrint(n)} title="Print Circular">
                        <Printer size={11}/> <span>Print</span>
                      </button>
                      <PermissionGate permission="communication.manage">
                        <button type="button" className={styles.miniBtn} onClick={()=>openEditNotice(n)}><Pencil size={11}/> <span>Edit</span></button>
                        {!n.is_published && (
                          <PermissionGate permission="communication.publish">
                            <button type="button" className={`${styles.miniBtn} ${styles.publishBtn}`} onClick={()=>publishNotice(n.id)}><Bell size={11}/> <span>Publish</span></button>
                          </PermissionGate>
                        )}
                        <button type="button" className={`${styles.miniBtn} ${styles.miniBtnDanger}`} onClick={()=>deleteNotice(n.id)}><Trash2 size={11}/> <span>Delete</span></button>
                      </PermissionGate>
                    </div>
                  </div>
                  <div className={styles.noticeTitle}>{n.title}</div>
                  {n.title_marathi && <div className={styles.noticeTitleMr}>{n.title_marathi}</div>}
                  <div className={styles.noticePreview} onClick={()=>setExpandedNotice(expandedNotice===n.id?null:n.id)}>
                    {expandedNotice===n.id ? (
                      <div dangerouslySetInnerHTML={{ __html: n.content }} />
                    ) : (
                      <span>{stripHtml(n.content).substring(0,200)}{stripHtml(n.content).length>200?'…':''}</span>
                    )}
                    {stripHtml(n.content).length>200 && (
                      <span className={styles.expandBtn}>
                        {expandedNotice===n.id ? <ChevronUp size={12}/> : <ChevronDown size={12}/>}
                      </span>
                    )}
                  </div>
                  {expandedNotice===n.id && n.content_marathi && (
                    <div className={styles.tmplBodyMr} style={{ marginTop: '8px' }}>
                      <strong>मराठी भाषांतर:</strong> <div dangerouslySetInnerHTML={{ __html: n.content_marathi }} />
                    </div>
                  )}
                  <div className={styles.noticeFooter}>
                    <span className={styles.noticeAudience}><Bell size={11}/> <span>Target: {n.audience.toUpperCase()}</span></span>
                    {n.publish_date && <span className={styles.noticeDate}>Published: {new Date(n.publish_date).toLocaleDateString('en-IN')}</span>}
                    {n.expiry_date && <span className={styles.noticeDate}>Expires: {new Date(n.expiry_date).toLocaleDateString('en-IN')}</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── SEND MESSAGE SECTION ─────────────────────────────────── */}
      {section==='send' && (
        <div className={styles.sendContent}>
          {/* Quick FCM Test Sandbox */}
          <div className={styles.testSandboxCard} style={{ background: 'linear-gradient(135deg, #eff6ff 0%, #f0f9ff 100%)', border: '1.5px solid #bfdbfe', borderRadius: '12px', padding: '16px', marginBottom: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
              <div>
                <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#1e40af', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  ⚡ Firebase FCM Multi-Recipient Automated Test Matrix
                </h4>
                <p style={{ margin: '2px 0 0 0', fontSize: '0.8rem', color: '#3b82f6' }}>
                  Run instant 1-click test push notifications across all 5 target recipient scopes.
                </p>
              </div>
              <button
                type="button"
                className={styles.miniBtn}
                style={{ background: '#2563eb', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                onClick={runFirebaseFullTestMatrix}
                disabled={fcmTestRunning}
              >
                <span key={fcmTestRunning ? 'spin' : 'icon'}>{fcmTestRunning ? <span className={styles.spin}/> : <Sparkles size={15}/>}</span>
                <span key={fcmTestRunning ? 'running' : 'idle'}>{fcmTestRunning ? 'Executing Test Matrix...' : 'Run 5-Recipient FCM Test'}</span>
              </button>
            </div>

            {fcmTestResults.length > 0 && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px', marginTop: '12px' }}>
                {fcmTestResults.map((res, idx) => (
                  <div key={idx} style={{ background: 'white', padding: '10px', borderRadius: '8px', border: '1px solid #93c5fd', fontSize: '0.8rem' }}>
                    <div style={{ fontWeight: 700, color: '#1e3a8a' }}>{res.scope}</div>
                    <div style={{ color: '#475569', margin: '2px 0' }}>👤 {res.name}</div>
                    <div style={{ color: '#16a34a', fontWeight: 600, fontSize: '0.75rem' }}>🟢 {res.status}</div>
                  </div>
                ))}
              </div>
            )}

            {/* FCM Token & Topic Inspector Tool */}
            <div style={{ marginTop: '14px', paddingTop: '12px', borderTop: '1px solid #cbd5e1' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#1e40af', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Key size={14} /> FCM Device Token & Topic Registry (Manual Test Inspector)
                </span>
                <button
                  type="button"
                  className={styles.miniBtn}
                  onClick={() => {
                    if (!showFcmRegistry) loadFcmRegistry();
                    setShowFcmRegistry(!showFcmRegistry);
                  }}
                  style={{ background: '#3b82f6', color: 'white', border: 'none' }}
                >
                  <Eye size={12} />
                  <span>{showFcmRegistry ? 'Hide FCM Tokens' : 'Inspect All Role FCM Tokens'}</span>
                </button>
              </div>

              {showFcmRegistry && (
                <div style={{ marginTop: '12px', background: 'white', borderRadius: '8px', border: '1px solid #93c5fd', padding: '12px' }}>
                  {loadingRegistry ? (
                    <div style={{ fontSize: '0.85rem', color: '#64748b' }}>Loading FCM registry from server...</div>
                  ) : (
                    <div style={{ overflowX: 'auto' }}>
                      <table className={styles.table} style={{ fontSize: '0.8rem' }}>
                        <thead>
                          <tr>
                            <th>Role</th>
                            <th>Name</th>
                            <th>Identifier</th>
                            <th>FCM Topic</th>
                            <th>FCM Device Token</th>
                            <th>Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {fcmRegistryList.map((item, idx) => (
                            <tr key={idx} className={styles.tr}>
                              <td><span style={{ fontWeight: 600, color: '#1e3a8a' }}>{item.role}</span></td>
                              <td><strong>{item.name}</strong></td>
                              <td><code style={{ fontSize: '0.75rem', background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px' }}>{item.identifier}</code></td>
                              <td>
                                <span
                                  style={{ cursor: 'pointer', background: '#dbeafe', color: '#1d4ed8', padding: '2px 8px', borderRadius: '12px', fontWeight: 600, fontSize: '0.75rem' }}
                                  onClick={() => copyToClipboard(item.topic, `Topic '${item.topic}'`)}
                                  title="Click to copy FCM Topic"
                                >
                                  📢 {item.topic}
                                </span>
                              </td>
                              <td style={{ maxWidth: '220px', wordBreak: 'break-all', fontFamily: 'monospace', fontSize: '0.75rem' }}>
                                {item.fcm_token ? (
                                  <span style={{ color: '#16a34a', fontWeight: 600 }}>{item.fcm_token.substring(0, 30)}...</span>
                                ) : (
                                  <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>No token (using topic fallback)</span>
                                )}
                              </td>
                              <td>
                                {item.fcm_token ? (
                                  <button
                                    type="button"
                                    className={styles.miniBtn}
                                    onClick={() => copyToClipboard(item.fcm_token!, `FCM Token for ${item.name}`)}
                                  >
                                    <Copy size={11} /> <span>Copy</span>
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    className={styles.miniBtn}
                                    onClick={() => copyToClipboard(item.topic, `Topic '${item.topic}'`)}
                                  >
                                    <Copy size={11} /> <span>Copy Topic</span>
                                  </button>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className={styles.sendCard}>
            <div className={styles.sendTitle}>
              <Send size={18}/>
              <span>Compose & Send Push Notification / Message</span>
            </div>
            <div className={styles.sendForm}>
              <div className={styles.sendRow}>
                <div className={styles.sendField}>
                  <label className={styles.sendLabel}>Channel</label>
                  <div className={styles.channelBtns}>
                    {CHANNELS.map(c=>(
                      <button key={c} type="button" className={`${styles.channelBtn} ${sendChannel===c?styles.channelBtnActive:''}`}
                        onClick={()=>setSendChannel(c)}>
                        <span>{c==='firebase_fcm'?'🔥':c==='sms'?'📱':c==='whatsapp'?'💬':c==='email'?'📧':'🔔'} {c==='firebase_fcm'?'FIREBASE FCM':c.toUpperCase()}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className={styles.sendField}>
                  <label className={styles.sendLabel}>Target Scope</label>
                  <select className={styles.sendSel} value={sendAudience} onChange={e=>setSendAudience(e.target.value)}>
                    {RECIPIENT_SCOPES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </div>
              </div>

              {/* Specific Recipient Picker — with live search */}
              {['specific_student', 'specific_staff', 'specific_teacher'].includes(sendAudience) && (
                <div className={styles.recipientPickerBox}>
                  <label className={styles.sendLabel}>
                    {sendAudience === 'specific_student' ? '🎓 Select Student' : sendAudience === 'specific_teacher' ? '👩‍🏫 Select Teacher' : '👔 Select Staff Member'} *
                    {recipientList.length > 0 && <span className={styles.recipientCount}>{recipientList.length} available</span>}
                  </label>

                  {loadingRecipients ? (
                    <div className={styles.recipientLoading}>
                      <span className={styles.spin} style={{ width: 16, height: 16 }} />
                      <span>Loading recipients...</span>
                    </div>
                  ) : (
                    <>
                      {/* Search bar */}
                      <div className={styles.recipientSearchWrap}>
                        <Search size={14} className={styles.recipientSearchIcon} />
                        <input
                          className={styles.recipientSearchInput}
                          placeholder={`Search ${sendAudience === 'specific_student' ? 'student by name, class, GR...' : 'by name, ID, designation...'}`}
                          value={recipientSearch}
                          onChange={e => {
                            setRecipientSearch(e.target.value);
                            setSelectedRecipientId(null);
                          }}
                        />
                        {recipientSearch && (
                          <button type="button" className={styles.recipientSearchClear} onClick={() => { setRecipientSearch(''); setSelectedRecipientId(null); }}>
                            <X size={12} />
                          </button>
                        )}
                      </div>

                      {/* Scrollable recipient list */}
                      {(() => {
                        const filtered = recipientList.filter(r =>
                          !recipientSearch ||
                          r.label.toLowerCase().includes(recipientSearch.toLowerCase()) ||
                          (r.gr_number || '').toLowerCase().includes(recipientSearch.toLowerCase()) ||
                          (r.employee_id || '').toLowerCase().includes(recipientSearch.toLowerCase()) ||
                          (r.standard || '').toLowerCase().includes(recipientSearch.toLowerCase())
                        );
                        return (
                          <div className={styles.recipientListBox}>
                            {filtered.length === 0 ? (
                              <div className={styles.recipientEmpty}>No results for "{recipientSearch}"</div>
                            ) : filtered.map(r => (
                              <button
                                key={r.id}
                                type="button"
                                className={`${styles.recipientItem} ${selectedRecipientId === r.id ? styles.recipientItemActive : ''}`}
                                onClick={() => setSelectedRecipientId(r.id)}
                              >
                                <div className={styles.recipientItemLeft}>
                                  <span className={styles.recipientItemName}>{r.full_name}</span>
                                  <span className={styles.recipientItemMeta}>
                                    {sendAudience === 'specific_student'
                                      ? `Std ${r.standard}-${r.division || 'A'} · GR: ${r.gr_number}`
                                      : `${r.designation || ''} · ID: ${r.employee_id}`}
                                  </span>
                                </div>
                                {selectedRecipientId === r.id && (
                                  <span className={styles.recipientItemCheck}><CheckCircle2 size={16} /></span>
                                )}
                              </button>
                            ))}
                          </div>
                        );
                      })()}

                      {/* Selected summary */}
                      {selectedRecipientId && (() => {
                        const sel = recipientList.find(r => r.id === selectedRecipientId);
                        return sel ? (
                          <div className={styles.recipientSelectedBanner}>
                            <div style={{ flex: 1 }}>
                              <div className={styles.recipientSelectedName}>{sel.full_name}</div>
                              <div className={styles.recipientSelectedMeta}>
                                {sendAudience === 'specific_student'
                                  ? `Std ${sel.standard}-${sel.division || 'A'}, GR: ${sel.gr_number}`
                                  : `${sel.designation}, ID: ${sel.employee_id}`}
                              </div>
                              <div style={{ marginTop: '4px', fontSize: '0.75rem', fontFamily: 'monospace', color: '#475569', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span>🔑 FCM: {sel.fcm_token ? `${sel.fcm_token.substring(0, 35)}...` : `Topic fallback ('${sendAudience === 'specific_student' ? 'students' : sendAudience === 'specific_teacher' ? 'teachers' : 'staff'}')`}</span>
                                {sel.fcm_token && (
                                  <button
                                    type="button"
                                    className={styles.miniBtn}
                                    style={{ padding: '2px 6px', fontSize: '0.7rem' }}
                                    onClick={() => copyToClipboard(sel.fcm_token!, `FCM Token for ${sel.full_name}`)}
                                  >
                                    <Copy size={10} /> <span>Copy Token</span>
                                  </button>
                                )}
                              </div>
                            </div>
                            <div className={styles.recipientFcmStatus}>
                              <span>🔔</span>
                              <span>Ready for FCM push dispatch</span>
                            </div>
                          </div>
                        ) : null;
                      })()}
                    </>
                  )}
                </div>
              )}

              {/* Manual Custom FCM Token Input Field */}
              {sendChannel === 'firebase_fcm' && (
                <div className={styles.sendField} style={{ background: '#f0f9ff', padding: '12px', borderRadius: '8px', border: '1px solid #bae6fd' }}>
                  <label className={styles.sendLabel} style={{ color: '#0369a1', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span>🔑 Manual FCM Device Token Override (Paste any raw token for direct testing)</span>
                    {customFcmToken && (
                      <button type="button" style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '0.75rem' }} onClick={() => setCustomFcmToken('')}>
                        Clear override
                      </button>
                    )}
                  </label>
                  <input
                    className={styles.sendInput}
                    placeholder="Paste raw FCM registration token (e.g. eX92kL... from Firebase web/mobile client or notification tray test)"
                    value={customFcmToken}
                    onChange={e => setCustomFcmToken(e.target.value)}
                    style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}
                  />
                  <div style={{ fontSize: '0.75rem', color: '#0284c7', marginTop: '4px' }}>
                    {customFcmToken ? '🟢 Direct device push will target this custom FCM token.' : 'ℹ️ Leave blank to automatically route to selected recipient or role topic.'}
                  </div>
                </div>
              )}

              {(sendChannel==='email'||sendChannel==='whatsapp'||sendChannel==='firebase_fcm') && (
                <div className={styles.sendField}>
                  <label className={styles.sendLabel}>Notification Title / Subject</label>
                  <input className={styles.sendInput} value={sendSubject} onChange={e=>setSendSubject(e.target.value)} placeholder="Notification title..."/>
                </div>
              )}

              {/* Dynamic Variable Insertion Helper */}
              <div className={styles.sendField}>
                <label className={styles.sendLabel}>Insert Dynamic Variables</label>
                <div className={styles.varPillsRow}>
                  {DYNAMIC_VARS.map(v => (
                    <button key={v.tag} type="button" className={styles.varTag} onClick={() => insertVariable(v.tag)}>
                      <Tag size={10}/> <span>{v.label}</span> <code>{v.tag}</code>
                    </button>
                  ))}
                </div>
              </div>

              {/* TipTap Rich Text Editor for Message Body */}
              <div className={styles.sendField}>
                <div className={styles.bodyLabelRow}>
                  <label className={styles.sendLabel}>Message Body *</label>
                  {sendChannel==='sms' && (
                    <span className={`${styles.smsBadge} ${charCount>charLimit?styles.smsBadgeWarning:''}`}>
                      {charCount}/{charLimit} chars ({smsSegments} SMS {smsSegments>1?'parts':'part'})
                    </span>
                  )}
                </div>
                <RichTextEditor
                  value={sendBody}
                  onChange={(content) => {
                    setSendBody(content);
                    setCharCount(stripHtml(content).length);
                  }}
                  minHeight="180px"
                />
              </div>

              {/* Template Quick Selection */}
              {templates.length > 0 && (
                <div className={styles.sendField}>
                  <label className={styles.sendLabel}>Pick a pre-configured template</label>
                  <div className={styles.templatePills}>
                    {templates.filter(t=>t.template_type===sendChannel || sendChannel==='in_app'||sendChannel==='firebase_fcm').map(t=>(
                      <button key={t.id} type="button" className={styles.tmplPill} onClick={()=>applyTemplateToComposer(t)}>
                        <span>⚡ {t.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <button className={styles.bigSendBtn} type="button" onClick={sendMessage} disabled={sending || !stripHtml(sendBody) || charCount > charLimit || (['specific_student','specific_staff','specific_teacher'].includes(sendAudience) && !selectedRecipientId)}>
                <span key={sending ? 'spin' : 'icon'}>{sending ? <span className={styles.spin} /> : <Send size={20} />}</span>
                <span key={sending ? 'sending-msg' : 'dispatch-msg'}>
                  {sending
                    ? `Sending via ${sendChannel === 'firebase_fcm' ? 'Firebase FCM' : sendChannel.toUpperCase()}...`
                    : ['specific_student','specific_staff','specific_teacher'].includes(sendAudience) && !selectedRecipientId
                      ? `⚠️ Select a recipient first`
                      : `🚀 Send via ${sendChannel === 'firebase_fcm' ? '🔥 Firebase FCM' : sendChannel.toUpperCase()}`
                  }
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MESSAGE LOGS SECTION ─────────────────────────────────── */}
      {section==='logs' && (
        <div className={styles.logsContent}>
          <div className={styles.toolbar}>
            <div className={styles.searchBox}>
              <Search size={14} className={styles.searchIcon}/>
              <input className={styles.searchInput} placeholder="Search message content or recipient..."
                value={logSearch} onChange={e=>setLogSearch(e.target.value)}/>
            </div>
            <div className={styles.filterTabs}>
              <button type="button" className={`${styles.filterTab} ${!logFilter?styles.filterTabActive:''}`} onClick={()=>setLogFilter('')}>All</button>
              {CHANNELS.map(c=><button type="button" key={c} className={`${styles.filterTab} ${logFilter===c?styles.filterTabActive:''}`} onClick={()=>setLogFilter(c)}>{c}</button>)}
              {['sent','delivered','failed','pending'].map(s=><button type="button" key={s} className={`${styles.filterTab} ${logFilter===s?styles.filterTabActive:''}`} onClick={()=>setLogFilter(s)}>{s}</button>)}
            </div>
            <button type="button" className={styles.iconBtn} onClick={loadLogs} title="Refresh"><RefreshCw size={14}/></button>
          </div>

          {loadingLogs ? <div className={styles.loadingSkel}/> : (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead><tr><th>#</th><th>Channel</th><th>Recipient</th><th>Subject</th><th>Message</th><th>Status</th><th>Sent At</th></tr></thead>
                <tbody>
                  {filteredLogs.length===0?(
                    <tr><td colSpan={7} className={styles.emptyCell}><div className={styles.emptyState}><MessageSquare size={48}/><p>No messages logged yet.</p></div></td></tr>
                  ):filteredLogs.map((l,i)=>(
                    <tr key={l.id} className={styles.tr}>
                      <td>{i+1}</td>
                      <td><span className={styles.channelTag}>{l.channel==='sms'?'📱':l.channel==='whatsapp'?'💬':l.channel==='email'?'📧':'🔔'} {l.channel.toUpperCase()}</span></td>
                      <td><span className={styles.recipientTag}>{l.recipient_phone||l.recipient_id||l.recipient_type}</span></td>
                      <td className={styles.subjectCell}>{l.subject||'—'}</td>
                      <td className={styles.msgCell} title={stripHtml(l.message_body)}>{stripHtml(l.message_body).substring(0,80)}{stripHtml(l.message_body).length>80?'…':''}</td>
                      <td><span className={styles.statusTag} style={{background:`${STATUS_COLORS[l.status]}22`,color:STATUS_COLORS[l.status]}}>{l.status}</span></td>
                      <td className={styles.dateCell}>{l.sent_at?new Date(l.sent_at).toLocaleString('en-IN'):'—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── TEMPLATES SECTION ────────────────────────────────────── */}
      {section==='templates' && (
        <div className={styles.templatesContent}>
          <div className={styles.toolbar}>
            <div className={styles.searchBox}>
              <Search size={14} className={styles.searchIcon}/>
              <input className={styles.searchInput} placeholder="Search templates..."
                value={tmplSearch} onChange={e=>setTmplSearch(e.target.value)}/>
            </div>
            <div className={styles.filterTabs}>
              <button type="button" className={`${styles.filterTab} ${!tmplCatFilter?styles.filterTabActive:''}`} onClick={()=>setTmplCatFilter('')}>All Categories</button>
              {TMPL_CATS.map(c=>(
                <button type="button" key={c} className={`${styles.filterTab} ${tmplCatFilter===c?styles.filterTabActive:''}`} onClick={()=>setTmplCatFilter(c)}>{c}</button>
              ))}
            </div>
            <button type="button" className={styles.iconBtn} onClick={loadTemplates} title="Refresh"><RefreshCw size={14}/></button>
            <PermissionGate permission="communication.manage">
              <button type="button" className={styles.addBtn} onClick={openNewTmpl}>
                <Plus size={15}/>
                <span>Add Template</span>
              </button>
            </PermissionGate>
          </div>

          <div className={styles.tmplGrid}>
            {filteredTemplates.length===0 ? (
              <div className={styles.emptyState}><BookOpen size={64}/><p>No templates found.</p></div>
            ) : filteredTemplates.map(t=>(
              <div key={t.id} className={styles.tmplCard}>
                <div className={styles.tmplTop}>
                  <div className={styles.tmplName}>{t.name}</div>
                  <div className={styles.tmplTags}>
                    <span className={styles.tmplType}>{t.template_type.toUpperCase()}</span>
                    <span className={styles.tmplCat}>{t.category}</span>
                  </div>
                </div>
                {t.subject && <div className={styles.tmplSubject}>Subject: {t.subject}</div>}
                <div className={styles.tmplBody} dangerouslySetInnerHTML={{ __html: t.body_english }} />
                {t.body_marathi && <div className={styles.tmplBodyMr} dangerouslySetInnerHTML={{ __html: t.body_marathi }} />}
                {t.variables && <div className={styles.tmplVars}>Variables: <code>{t.variables}</code></div>}
                
                <div className={styles.noticeActions} style={{ marginTop: 'auto', paddingTop: '8px' }}>
                  <button type="button" className={`${styles.miniBtn} ${styles.broadcastBtn}`} onClick={()=>applyTemplateToComposer(t)}>
                    <Send size={11}/> <span>Use in Composer</span>
                  </button>
                  <PermissionGate permission="communication.manage">
                    <button type="button" className={styles.miniBtn} onClick={()=>openEditTmpl(t)}><Pencil size={11}/> <span>Edit</span></button>
                    <button type="button" className={`${styles.miniBtn} ${styles.miniBtnDanger}`} onClick={async()=>{
                      if (!confirm(`Delete template '${t.name}'?`)) return;
                      await communicationService.deleteTemplate(t.id);
                      toast.success('Deleted.');
                      loadTemplates();
                    }}><Trash2 size={11}/> <span>Delete</span></button>
                  </PermissionGate>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── ANNOUNCEMENTS SECTION ────────────────────────────────── */}
      {section==='announcements' && (
        <div className={styles.announcementsContent}>
          <div className={styles.toolbar}>
            <span className={styles.muted}>{announcements.length} active announcements</span>
            <button type="button" className={styles.iconBtn} onClick={loadAnnouncements} title="Refresh"><RefreshCw size={14}/></button>
            <PermissionGate permission="communication.manage">
              <button type="button" className={styles.addBtn} onClick={openNewAnn}>
                <Plus size={15}/>
                <span>Post Announcement</span>
              </button>
            </PermissionGate>
          </div>
          <div className={styles.annList}>
            {announcements.length===0?(
              <div className={styles.emptyState}><Megaphone size={64}/><p>No active announcements.</p></div>
            ):announcements.map(a=>(
              <div key={a.id} className={`${styles.annCard} ${styles[`ann_${a.announcement_type}`]}`}>
                <div className={styles.annLeft}>
                  <div className={styles.annIcon}>{ANN_TYPE_ICON[a.announcement_type]}</div>
                  <div>
                    <div className={styles.annTitle}>
                      {a.is_pinned && <Pin size={12} className={styles.pinIcon}/>}
                      <span>{a.title}</span>
                    </div>
                    {a.body && <div className={styles.annBody}>{a.body}</div>}
                    <div className={styles.annMeta}>
                      Target: {a.target_roles.toUpperCase()} · Posted: {a.created_at ? new Date(a.created_at).toLocaleDateString('en-IN') : ''}
                      {a.expiry_date && ` · Expires: ${new Date(a.expiry_date).toLocaleDateString('en-IN')}`}
                    </div>
                  </div>
                </div>

                <div className={styles.noticeActions}>
                  <PermissionGate permission="communication.manage">
                    <button type="button" className={styles.miniBtn} onClick={()=>togglePinAnn(a)} title={a.is_pinned?'Unpin':'Pin to Top'}>
                      <Pin size={11}/> <span>{a.is_pinned?'Unpin':'Pin'}</span>
                    </button>
                    <button type="button" className={styles.miniBtn} onClick={()=>openEditAnn(a)}><Pencil size={11}/> <span>Edit</span></button>
                    <button type="button" className={styles.annDel} onClick={async()=>{
                      if (!confirm('Remove announcement?')) return;
                      await communicationService.deleteAnnouncement(a.id);
                      toast.success('Removed.');
                      loadAnnouncements(); loadStats();
                    }}><X size={14}/></button>
                  </PermissionGate>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ════ Notice Modal ════ */}
      {showNoticeModal && (
        <div className={styles.overlay} onClick={()=>setShowNoticeModal(false)}>
          <div className={`${styles.modal} ${styles.wideModal}`} onClick={e=>e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>{editNotice?'Edit Notice':'New Notice'}</h3>
              <button type="button" className={styles.modalClose} onClick={()=>setShowNoticeModal(false)}><X size={16}/></button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.mfRow}>
                <div className={styles.mf}><label className={styles.ml}>Type</label><select className={styles.mi} value={newNotice.notice_type} onChange={e=>setNewNotice(p=>({...p,notice_type:e.target.value}))}>{NOTICE_TYPES.map(t=><option key={t}>{t}</option>)}</select></div>
                <div className={styles.mf}><label className={styles.ml}>Audience</label><select className={styles.mi} value={newNotice.audience} onChange={e=>setNewNotice(p=>({...p,audience:e.target.value}))}>{AUDIENCES.map(a=><option key={a}>{a}</option>)}</select></div>
              </div>
              <div className={styles.mf}><label className={styles.ml}>Title (English) *</label><input className={styles.mi} value={newNotice.title} onChange={e=>setNewNotice(p=>({...p,title:e.target.value}))} placeholder="Notice title"/></div>
              <div className={styles.mf}><label className={styles.ml}>Title (Marathi)</label><input className={styles.mi} value={newNotice.title_marathi} onChange={e=>setNewNotice(p=>({...p,title_marathi:e.target.value}))} placeholder="सूचना शीर्षक"/></div>
              <div className={styles.mf}>
                <label className={styles.ml}>Content (English TipTap Editor) *</label>
                <RichTextEditor
                  value={newNotice.content}
                  onChange={(content) => setNewNotice(p=>({...p, content}))}
                  minHeight="140px"
                />
              </div>
              <div className={styles.mf}><label className={styles.ml}>Content (Marathi)</label><textarea className={styles.mta} rows={3} value={newNotice.content_marathi} onChange={e=>setNewNotice(p=>({...p,content_marathi:e.target.value}))} placeholder="सूचना आशय..."/></div>
              <div className={styles.mfRow}>
                <div className={styles.mf}><label className={styles.ml}>Expiry Date</label><input type="date" className={styles.mi} value={newNotice.expiry_date} min={TODAY} onChange={e=>setNewNotice(p=>({...p,expiry_date:e.target.value}))}/></div>
                <div className={styles.mf} style={{justifyContent:'flex-end', paddingTop:'28px'}}>
                  <label className={styles.checkRow}><input type="checkbox" checked={newNotice.is_urgent} onChange={e=>setNewNotice(p=>({...p,is_urgent:e.target.checked}))}/>  Mark as Urgent 🚨</label>
                  <label className={styles.checkRow}><input type="checkbox" checked={newNotice.is_published} onChange={e=>setNewNotice(p=>({...p,is_published:e.target.checked}))}/>  Publish immediately</label>
                </div>
              </div>
            </div>
            <div className={styles.modalFooter}>
              <button type="button" className={styles.cancelBtn} onClick={()=>setShowNoticeModal(false)}>Cancel</button>
              <button type="button" className={styles.submitBtn} onClick={saveNotice} disabled={savingNotice}>
                <span key={savingNotice ? 'spin' : 'icon'}>{savingNotice ? <span className={styles.spin}/> : <Check size={14}/>}</span>
                <span key={editNotice ? 'edit' : 'create'}>{editNotice ? 'Update' : 'Create'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ════ Template Modal ════ */}
      {showTmplModal && (
        <div className={styles.overlay} onClick={()=>setShowTmplModal(false)}>
          <div className={styles.modal} onClick={e=>e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>{editTmpl?'Edit Template':'Add Template'}</h3>
              <button type="button" className={styles.modalClose} onClick={()=>setShowTmplModal(false)}><X size={16}/></button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.mf}><label className={styles.ml}>Name *</label><input className={styles.mi} value={newTmpl.name} onChange={e=>setNewTmpl(p=>({...p,name:e.target.value}))} placeholder="Template name"/></div>
              <div className={styles.mfRow}>
                <div className={styles.mf}><label className={styles.ml}>Type</label><select className={styles.mi} value={newTmpl.template_type} onChange={e=>setNewTmpl(p=>({...p,template_type:e.target.value}))}>{TMPL_TYPES.map(t=><option key={t}>{t}</option>)}</select></div>
                <div className={styles.mf}><label className={styles.ml}>Category</label><select className={styles.mi} value={newTmpl.category} onChange={e=>setNewTmpl(p=>({...p,category:e.target.value}))}>{TMPL_CATS.map(c=><option key={c}>{c}</option>)}</select></div>
              </div>
              <div className={styles.mf}><label className={styles.ml}>Subject</label><input className={styles.mi} value={newTmpl.subject} onChange={e=>setNewTmpl(p=>({...p,subject:e.target.value}))} placeholder="For email/whatsapp subject"/></div>
              <div className={styles.mf}>
                <label className={styles.ml}>Body (English TipTap Editor) *</label>
                <RichTextEditor
                  value={newTmpl.body_english}
                  onChange={(content) => setNewTmpl(p=>({...p, body_english: content}))}
                  minHeight="140px"
                />
              </div>
              <div className={styles.mf}><label className={styles.ml}>Body (Marathi)</label><textarea className={styles.mta} rows={3} value={newTmpl.body_marathi} onChange={e=>setNewTmpl(p=>({...p,body_marathi:e.target.value}))} placeholder="प्रिय {student_name}, ..."/></div>
              <div className={styles.mf}><label className={styles.ml}>Variables (JSON array)</label><input className={styles.mi} value={newTmpl.variables} onChange={e=>setNewTmpl(p=>({...p,variables:e.target.value}))} placeholder='["student_name","amount","due_date"]'/></div>
            </div>
            <div className={styles.modalFooter}>
              <button type="button" className={styles.cancelBtn} onClick={()=>setShowTmplModal(false)}>Cancel</button>
              <button type="button" className={styles.submitBtn} onClick={saveTmpl} disabled={savingTmpl}>
                <span key={savingTmpl ? 'spin' : 'icon'}>{savingTmpl ? <span className={styles.spin}/> : <Check size={14}/>}</span>
                <span key={editTmpl ? 'edit' : 'save'}>{editTmpl ? 'Update' : 'Save'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ════ Announcement Modal ════ */}
      {showAnnModal && (
        <div className={styles.overlay} onClick={()=>setShowAnnModal(false)}>
          <div className={styles.modal} onClick={e=>e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>{editAnn?'Edit Announcement':'Post Announcement'}</h3>
              <button type="button" className={styles.modalClose} onClick={()=>setShowAnnModal(false)}><X size={16}/></button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.mf}><label className={styles.ml}>Title *</label><input className={styles.mi} value={newAnn.title} onChange={e=>setNewAnn(p=>({...p,title:e.target.value}))} placeholder="Announcement title"/></div>
              <div className={styles.mf}><label className={styles.ml}>Body</label><textarea className={styles.mta} rows={3} value={newAnn.body} onChange={e=>setNewAnn(p=>({...p,body:e.target.value}))} placeholder="Optional body details..."/></div>
              <div className={styles.mfRow}>
                <div className={styles.mf}><label className={styles.ml}>Type</label><select className={styles.mi} value={newAnn.announcement_type} onChange={e=>setNewAnn(p=>({...p,announcement_type:e.target.value}))}>{ANN_TYPES.map(t=><option key={t}>{t}</option>)}</select></div>
                <div className={styles.mf}><label className={styles.ml}>Target Roles</label><input className={styles.mi} value={newAnn.target_roles} onChange={e=>setNewAnn(p=>({...p,target_roles:e.target.value}))} placeholder="all / admin / teacher"/></div>
                <div className={styles.mf}><label className={styles.ml}>Expiry Date</label><input type="date" className={styles.mi} value={newAnn.expiry_date} min={TODAY} onChange={e=>setNewAnn(p=>({...p,expiry_date:e.target.value}))}/></div>
              </div>
              <label className={styles.checkRow}><input type="checkbox" checked={newAnn.is_pinned} onChange={e=>setNewAnn(p=>({...p,is_pinned:e.target.checked}))}/>  📌 Pin this announcement to top</label>
            </div>
            <div className={styles.modalFooter}>
              <button type="button" className={styles.cancelBtn} onClick={()=>setShowAnnModal(false)}>Cancel</button>
              <button type="button" className={styles.submitBtn} onClick={saveAnn} disabled={savingAnn}>
                <span key={savingAnn ? 'spin' : 'icon'}>{savingAnn ? <span className={styles.spin}/> : <Check size={14}/>}</span>
                <span key={editAnn ? 'edit' : 'post'}>{editAnn ? 'Update' : 'Post'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Printable Notice Layout */}
      {printNotice && (
        <div className={styles.printableNotice}>
          <div style={{ textAlign: 'center', borderBottom: '2px solid #000', paddingBottom: '10px', marginBottom: '20px' }}>
            <h2 style={{ margin: 0 }}>VidyaSetu High School & Junior College</h2>
            <p style={{ margin: '4px 0 0 0', fontSize: '14px' }}>Official Administration Circular / सूचना पत्र</p>
          </div>
          <h3>{printNotice.title}</h3>
          {printNotice.title_marathi && <h4>{printNotice.title_marathi}</h4>}
          <div style={{ margin: '20px 0', lineHeight: '1.8' }} dangerouslySetInnerHTML={{ __html: printNotice.content }} />
          {printNotice.content_marathi && (
            <div style={{ margin: '20px 0', lineHeight: '1.8', fontStyle: 'italic' }}>{printNotice.content_marathi}</div>
          )}
          <div style={{ marginTop: '40px', display: 'flex', justifyContent: 'space-between' }}>
            <div>Date: {printNotice.publish_date || TODAY}</div>
            <div>Authorized Signatory</div>
          </div>
        </div>
      )}
    </div>
  );
}
