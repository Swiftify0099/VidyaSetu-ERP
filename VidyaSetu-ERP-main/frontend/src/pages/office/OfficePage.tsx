import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell, Users, UserCheck, Calendar, MessageSquare,
  FileText, Plus, Eye, Edit2, Trash2, Search, RefreshCw,
  ChevronLeft, ChevronRight, X, Check, Clock, AlertTriangle,
  Inbox, Send, ArrowRight, Pin, ExternalLink, Award, Printer,
  CheckCircle, XCircle, FileCheck
} from 'lucide-react';
import toast from 'react-hot-toast';
import officeService, {
  Notice, Enquiry, Visitor, SchoolEvent, Complaint, OfficeStats,
  BonafideApplication, BonafidePrintData
} from '../../services/officeService';
import { BonafideCertificatePrint } from '../../components/office/BonafideCertificatePrint';
import PermissionGate from '../../components/ui/PermissionGate';
import styles from './OfficePage.module.css';

type ActiveSection = 'overview' | 'notices' | 'enquiries' | 'visitors' | 'events' | 'complaints' | 'register' | 'bonafide';

const SECTION_TABS = [
  { id: 'overview',   label: 'Overview',       icon: <FileText size={15}/> },
  { id: 'bonafide',   label: 'Bonafide Certificates', icon: <Award size={15}/> },
  { id: 'notices',    label: 'Notice Board',   icon: <Bell size={15}/> },
  { id: 'enquiries',  label: 'Enquiries',      icon: <Users size={15}/> },
  { id: 'visitors',   label: 'Visitor Log',    icon: <UserCheck size={15}/> },
  { id: 'events',     label: 'Events',         icon: <Calendar size={15}/> },
  { id: 'complaints', label: 'Complaints',     icon: <MessageSquare size={15}/> },
  { id: 'register',   label: 'Inward/Outward', icon: <Inbox size={15}/> },
] as const;

const NOTICE_TYPES = ['general','circular','academic','exam','holiday','sports','cultural','government','urgent'];
const EVENT_TYPES  = ['academic','cultural','sports','exam','holiday','government','meeting','other'];
const PRIORITY_COLORS: Record<string, string> = { low: '#64748b', normal: '#2563eb', high: '#f59e0b', urgent: '#ef4444' };

export default function OfficePage() {
  const navigate = useNavigate();
  const [section, setSection] = useState<ActiveSection>('overview');
  const [stats, setStats] = useState<OfficeStats | null>(null);

  // Notices
  const [notices, setNotices] = useState<Notice[]>([]);
  const [noticeSearch, setNoticeSearch] = useState('');
  const [noticeType, setNoticeType] = useState('');
  const [showNoticeModal, setShowNoticeModal] = useState(false);
  const [editNotice, setEditNotice] = useState<Notice | null>(null);
  const [newNotice, setNewNotice] = useState({
    title: '', title_marathi: '', content: '', notice_type: 'general',
    priority: 'normal', target_audience: 'all', is_pinned: false,
    expiry_date: '', notice_number: '',
  });

  // Enquiries
  const [enquiries, setEnquiries] = useState<Enquiry[]>([]);
  const [enqSearch, setEnqSearch] = useState('');
  const [enqStatus, setEnqStatus] = useState('');
  const [showEnqModal, setShowEnqModal] = useState(false);
  const [newEnq, setNewEnq] = useState({
    student_name: '', standard_applying_for: '', contact_mobile: '',
    father_name: '', mother_name: '', gender: '', category: '',
    previous_school: '', source: 'walk_in', remarks: '',
  });

  // Visitors
  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const [showVisitorModal, setShowVisitorModal] = useState(false);
  const [newVisitor, setNewVisitor] = useState({
    visitor_name: '', visitor_mobile: '', purpose: '', whom_to_meet: '',
    id_proof_type: '', remarks: '',
  });

  // Events
  const [events, setEvents] = useState<SchoolEvent[]>([]);
  const [showEventModal, setShowEventModal] = useState(false);
  const [newEvent, setNewEvent] = useState({
    title: '', event_type: 'general', start_date: '', end_date: '',
    start_time: '', venue: '', organizer: '', is_holiday: false, color: '#2563eb',
  });

  // Complaints
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [showComplaintModal, setShowComplaintModal] = useState(false);
  const [newComplaint, setNewComplaint] = useState({
    complainant_name: '', complainant_mobile: '', complainant_type: 'parent',
    subject: '', description: '', complaint_type: 'other', priority: 'normal',
  });

  // Register
  const [registers, setRegisters] = useState<any[]>([]);
  const [regType, setRegType] = useState('inward');
  const [showRegModal, setShowRegModal] = useState(false);
  const [newReg, setNewReg] = useState({
    register_type: 'inward', from_to: '', subject: '', register_date: new Date().toISOString().split('T')[0],
    reference_number: '', document_type: '', remarks: '',
  });

  // Bonafide Applications
  const [bonafideApps, setBonafideApps] = useState<BonafideApplication[]>([]);
  const [bonafideStatusFilter, setBonafideStatusFilter] = useState('');
  const [bonafideSearch, setBonafideSearch] = useState('');
  const [showRejectModal, setShowRejectModal] = useState<BonafideApplication | null>(null);
  const [rejectionReasonInput, setRejectionReasonInput] = useState('');
  const [printCertData, setPrintCertData] = useState<BonafidePrintData | null>(null);
  const [showDirectBonafideModal, setShowDirectBonafideModal] = useState(false);
  const [directBonafide, setDirectBonafide] = useState({ student_id: '', purpose: 'General Purpose', fee_amount: 20 });

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadStats = useCallback(async () => {
    try { setStats(await officeService.getStats()); } catch {}
  }, []);

  const loadSection = useCallback(async () => {
    setLoading(true);
    try {
      switch (section) {
        case 'bonafide':
          const bd = await officeService.getBonafideApplications({
            status: bonafideStatusFilter || undefined,
            search: bonafideSearch || undefined,
          });
          setBonafideApps(bd.items); break;
        case 'notices':
          const nd = await officeService.getNotices({ search: noticeSearch || undefined, notice_type: noticeType || undefined });
          setNotices(nd.items); break;
        case 'enquiries':
          const ed = await officeService.getEnquiries({ search: enqSearch || undefined, status: enqStatus || undefined });
          setEnquiries(ed.items); break;
        case 'visitors':
          const vd = await officeService.getTodayVisitors();
          setVisitors(vd.items); break;
        case 'events':
          const evd = await officeService.getEvents();
          setEvents(evd.items); break;
        case 'complaints':
          const cd = await officeService.getComplaints();
          setComplaints(cd.items); break;
        case 'register':
          const rd = await officeService.getRegister({ register_type: regType });
          setRegisters(rd.items); break;
      }
    } catch { }
    finally { setLoading(false); }
  }, [section, bonafideStatusFilter, bonafideSearch, noticeSearch, noticeType, enqSearch, enqStatus, regType]);

  useEffect(() => { loadStats(); }, [loadStats]);
  useEffect(() => { if (section !== 'overview') loadSection(); }, [loadSection]);

  // ── Bonafide Certificate Handlers ──────────────────────────
  const handleApproveBonafide = async (id: number) => {
    try {
      await officeService.approveBonafide(id);
      toast.success('Bonafide application accepted & approved!');
      loadSection();
      loadStats();
    } catch {
      toast.error('Failed to approve application.');
    }
  };

  const handleRejectBonafide = async () => {
    if (!showRejectModal) return;
    if (!rejectionReasonInput.trim()) {
      toast.error('Please enter a rejection reason.');
      return;
    }
    try {
      await officeService.rejectBonafide(showRejectModal.id, rejectionReasonInput);
      toast.success('Bonafide application rejected.');
      setShowRejectModal(null);
      setRejectionReasonInput('');
      loadSection();
      loadStats();
    } catch {
      toast.error('Failed to reject application.');
    }
  };

  const handlePrintBonafide = async (id: number) => {
    try {
      const data = await officeService.getBonafidePrintData(id);
      setPrintCertData(data);
    } catch {
      toast.error('Failed to load printable certificate.');
    }
  };

  const handleCreateDirectBonafide = async () => {
    if (!directBonafide.student_id || !directBonafide.purpose) {
      toast.error('Student ID and Purpose are required.');
      return;
    }
    setSaving(true);
    try {
      await officeService.createDirectBonafide({
        student_id: parseInt(directBonafide.student_id),
        purpose: directBonafide.purpose,
        fee_amount: Number(directBonafide.fee_amount),
      });
      toast.success('Bonafide certificate issued directly!');
      setShowDirectBonafideModal(false);
      setDirectBonafide({ student_id: '', purpose: 'General Purpose', fee_amount: 20 });
      loadSection();
      loadStats();
    } catch {
      toast.error('Failed to issue direct certificate.');
    } finally {
      setSaving(false);
    }
  };

  // ── Notice CRUD ───────────────────────────────────────────
  const saveNotice = async () => {
    if (!newNotice.title) { toast.error('Title is required.'); return; }
    setSaving(true);
    try {
      const payload: any = { ...newNotice };
      if (!payload.expiry_date) delete payload.expiry_date;
      if (!payload.notice_number) delete payload.notice_number;

      if (editNotice) {
        await officeService.updateNotice(editNotice.id, payload);
        toast.success('Notice updated.');
      } else {
        await officeService.createNotice(payload);
        toast.success('Notice published!');
      }
      setShowNoticeModal(false); setEditNotice(null);
      resetNoticeForm(); loadSection(); loadStats();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.response?.data?.detail || 'Failed to save notice.');
    }
    finally { setSaving(false); }
  };

  const resetNoticeForm = () => setNewNotice({ title: '', title_marathi: '', content: '', notice_type: 'general', priority: 'normal', target_audience: 'all', is_pinned: false, expiry_date: '', notice_number: '' });

  const deleteNotice = async (id: number) => {
    if (!confirm('Delete this notice?')) return;
    try { await officeService.deleteNotice(id); toast.success('Deleted.'); loadSection(); loadStats(); }
    catch { toast.error('Delete failed.'); }
  };

  // ── Enquiry CRUD ──────────────────────────────────────────
  const saveEnquiry = async () => {
    if (!newEnq.student_name || !newEnq.contact_mobile || !newEnq.standard_applying_for) {
      toast.error('Student name, mobile, and standard are required.'); return;
    }
    setSaving(true);
    try {
      await officeService.createEnquiry(newEnq as any);
      toast.success('Enquiry registered!');
      setShowEnqModal(false);
      setNewEnq({ student_name: '', standard_applying_for: '', contact_mobile: '', father_name: '', mother_name: '', gender: '', category: '', previous_school: '', source: 'walk_in', remarks: '' });
      loadSection(); loadStats();
    } catch { toast.error('Failed to register enquiry.'); }
    finally { setSaving(false); }
  };

  const updateEnquiryStatus = async (id: number, status: string) => {
    try { await officeService.updateEnquiry(id, { status }); toast.success('Status updated.'); loadSection(); }
    catch { toast.error('Update failed.'); }
  };

  // ── Visitor CRUD ──────────────────────────────────────────
  const saveVisitor = async () => {
    if (!newVisitor.visitor_name || !newVisitor.purpose) { toast.error('Name and purpose required.'); return; }
    setSaving(true);
    try {
      await officeService.visitorCheckin(newVisitor);
      toast.success('Visitor checked in!');
      setShowVisitorModal(false);
      setNewVisitor({ visitor_name: '', visitor_mobile: '', purpose: '', whom_to_meet: '', id_proof_type: '', remarks: '' });
      loadSection(); loadStats();
    } catch { toast.error('Failed.'); }
    finally { setSaving(false); }
  };

  const checkoutVisitor = async (id: number) => {
    const now = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false });
    try { await officeService.visitorCheckout(id, now); toast.success('Visitor checked out.'); loadSection(); }
    catch { toast.error('Checkout failed.'); }
  };

  // ── Event CRUD ────────────────────────────────────────────
  const saveEvent = async () => {
    if (!newEvent.title || !newEvent.start_date) { toast.error('Title and date required.'); return; }
    setSaving(true);
    try {
      await officeService.createEvent(newEvent as any);
      toast.success('Event added to calendar!');
      setShowEventModal(false);
      setNewEvent({ title: '', event_type: 'general', start_date: '', end_date: '', start_time: '', venue: '', organizer: '', is_holiday: false, color: '#2563eb' });
      loadSection(); loadStats();
    } catch { toast.error('Failed.'); }
    finally { setSaving(false); }
  };

  // ── Complaint CRUD ────────────────────────────────────────
  const saveComplaint = async () => {
    if (!newComplaint.complainant_name || !newComplaint.subject || !newComplaint.description) {
      toast.error('Name, subject, and description are required.'); return;
    }
    setSaving(true);
    try {
      await officeService.createComplaint(newComplaint);
      toast.success('Complaint registered!');
      setShowComplaintModal(false);
      setNewComplaint({ complainant_name: '', complainant_mobile: '', complainant_type: 'parent', subject: '', description: '', complaint_type: 'other', priority: 'normal' });
      loadSection(); loadStats();
    } catch { toast.error('Failed.'); }
    finally { setSaving(false); }
  };

  // ── Register Entry ────────────────────────────────────────
  const saveRegEntry = async () => {
    if (!newReg.from_to || !newReg.subject) { toast.error('From/To and subject required.'); return; }
    setSaving(true);
    try {
      await officeService.createRegisterEntry(newReg);
      toast.success('Entry added to register!');
      setShowRegModal(false);
      setNewReg({ register_type: regType, from_to: '', subject: '', register_date: new Date().toISOString().split('T')[0], reference_number: '', document_type: '', remarks: '' });
      loadSection();
    } catch { toast.error('Failed.'); }
    finally { setSaving(false); }
  };

  const enqStatusClass = (s: string) => {
    const m: Record<string, string> = {
      pending: styles.tagWarning, follow_up: styles.tagInfo,
      documents_submitted: styles.tagPrimary, admitted: styles.tagSuccess,
      rejected: styles.tagDanger, withdrawn: styles.tagMuted,
    };
    return m[s] || styles.tagMuted;
  };

  const complaintStatusClass = (s: string) => {
    const m: Record<string, string> = {
      open: styles.tagDanger, in_progress: styles.tagWarning,
      resolved: styles.tagSuccess, closed: styles.tagMuted,
    };
    return m[s] || styles.tagMuted;
  };

  const eventTypeColor: Record<string, string> = {
    academic: '#2563eb', cultural: '#7c3aed', sports: '#059669',
    exam: '#ef4444', holiday: '#f59e0b', government: '#374151',
    meeting: '#0ea5e9', other: '#64748b',
  };

  return (
    <div className={styles.page}>
      {/* ── Header ────────────────────────────────────────── */}
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Clerk & Office</h1>
          <p className={styles.pageSub}>कार्यालय व्यवस्थापन · Office Administration</p>
        </div>
      </div>

      {/* ── Section Tabs ──────────────────────────────────── */}
      <div className={styles.tabBar}>
        {SECTION_TABS.map(t => (
          <button key={t.id} className={`${styles.tab} ${section === t.id ? styles.tabActive : ''}`}
            onClick={() => setSection(t.id as ActiveSection)}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* ── Overview ──────────────────────────────────────── */}
      {section === 'overview' && stats && (
        <div className={styles.overviewGrid}>
          {[
            { label: 'Bonafide Requests', value: (stats as any).pending_bonafides || 0, total: null, icon: <Award size={20}/>, color: '#8b5cf6', action: () => setSection('bonafide') },
            { label: 'Active Notices', value: stats.active_notices, total: stats.total_notices, icon: <Bell size={20}/>, color: 'var(--color-primary)', action: () => setSection('notices') },
            { label: 'Pending Enquiries', value: stats.pending_enquiries, total: stats.total_enquiries, icon: <Users size={20}/>, color: 'var(--color-warning)', action: () => setSection('enquiries') },
            { label: "Today's Visitors", value: stats.today_visitors, total: null, icon: <UserCheck size={20}/>, color: 'var(--color-success)', action: () => setSection('visitors') },
            { label: 'Upcoming Events', value: stats.upcoming_events, total: null, icon: <Calendar size={20}/>, color: 'var(--color-info)', action: () => setSection('events') },
            { label: 'Open Complaints', value: stats.open_complaints, total: null, icon: <MessageSquare size={20}/>, color: 'var(--color-danger)', action: () => setSection('complaints') },
          ].map(s => (
            <div key={s.label} className={styles.overviewCard} style={{ '--c': s.color } as React.CSSProperties} onClick={s.action}>
              <div className={styles.overviewIcon} style={{ color: s.color }}>{s.icon}</div>
              <div className={styles.overviewVal}>{s.value}</div>
              {s.total !== null && <div className={styles.overviewTotal}>of {s.total} total</div>}
              <div className={styles.overviewLabel}>{s.label}</div>
              <ArrowRight size={14} className={styles.overviewArrow}/>
            </div>
          ))}
        </div>
      )}

      {/* ── Bonafide Certificates Section ───────────────── */}
      {section === 'bonafide' && (
        <div className={styles.sectionContent}>
          <div className={styles.sectionToolbar}>
            <div className={styles.searchWrap}>
              <Search size={14} className={styles.searchIcon}/>
              <input className={styles.searchInput} placeholder="Search by student name, GR no, purpose..." value={bonafideSearch} onChange={e => setBonafideSearch(e.target.value)}/>
            </div>
            <select className={styles.filterSelect} value={bonafideStatusFilter} onChange={e => setBonafideStatusFilter(e.target.value)}>
              <option value="">All Statuses</option>
              <option value="PENDING">Pending Approval</option>
              <option value="APPROVED">Approved / Issued</option>
              <option value="REJECTED">Rejected</option>
            </select>
            <button className={styles.iconBtn} onClick={loadSection}><RefreshCw size={14}/></button>
            <PermissionGate permission="office.create">
              <button className={styles.addBtn} onClick={() => setShowDirectBonafideModal(true)}>
                <Plus size={15}/> Direct Issue
              </button>
            </PermissionGate>
          </div>

          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>App #</th>
                  <th>Student Name</th>
                  <th>Class</th>
                  <th>Purpose</th>
                  <th>Fee Charge</th>
                  <th>Applied Date</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={8} style={{ textAlign: 'center', padding: 24 }}>Loading applications...</td></tr>
                ) : bonafideApps.length === 0 ? (
                  <tr><td colSpan={8} style={{ textAlign: 'center', padding: 36, color: 'var(--color-text-muted)' }}><Award size={36} style={{ display: 'block', margin: '0 auto 8px', opacity: 0.5 }} />No bonafide applications found.</td></tr>
                ) : (
                  bonafideApps.map(app => (
                    <tr key={app.id}>
                      <td><strong>{app.application_number}</strong></td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{app.student_name}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>GR: {app.student_gr_number}</div>
                      </td>
                      <td>Std {app.student_standard}{app.student_division ? `-${app.student_division}` : ''}</td>
                      <td><span className={`${styles.tag} ${styles.tagPrimary}`}>{app.purpose}</span></td>
                      <td>
                        <span className={`${styles.tag} ${app.payment_status === 'PAID' ? styles.tagSuccess : styles.tagWarning}`}>
                          ₹{app.fee_amount} ({app.payment_status})
                        </span>
                      </td>
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
                        <div style={{ display: 'flex', gap: 6 }}>
                          {app.status === 'PENDING' && (
                            <>
                              <button
                                className={styles.miniBtn}
                                style={{ backgroundColor: 'var(--color-success)', color: '#fff', padding: '4px 8px', borderRadius: 4, display: 'flex', alignItems: 'center', gap: 4 }}
                                onClick={() => handleApproveBonafide(app.id)}
                                title="Accept & Approve Application"
                              >
                                <CheckCircle size={13} /> Accept
                              </button>
                              <button
                                className={`${styles.miniBtn} ${styles.miniBtnDanger}`}
                                style={{ padding: '4px 8px', borderRadius: 4, display: 'flex', alignItems: 'center', gap: 4 }}
                                onClick={() => setShowRejectModal(app)}
                                title="Reject Application"
                              >
                                <XCircle size={13} /> Reject
                              </button>
                            </>
                          )}
                          <button
                            className={styles.miniBtn}
                            style={{ backgroundColor: '#2563eb', color: '#fff', padding: '4px 10px', borderRadius: 4, display: 'flex', alignItems: 'center', gap: 4 }}
                            onClick={() => handlePrintBonafide(app.id)}
                            title="Print Marathi Bonafide Certificate"
                          >
                            <Printer size={13} /> Print
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Notice Board ──────────────────────────────────── */}
      {section === 'notices' && (
        <div className={styles.sectionContent}>
          <div className={styles.sectionToolbar}>
            <div className={styles.searchWrap}>
              <Search size={14} className={styles.searchIcon}/>
              <input className={styles.searchInput} placeholder="Search notices..." value={noticeSearch} onChange={e => setNoticeSearch(e.target.value)}/>
            </div>
            <select className={styles.filterSelect} value={noticeType} onChange={e => setNoticeType(e.target.value)}>
              <option value="">All Types</option>
              {NOTICE_TYPES.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
            </select>
            <button className={styles.iconBtn} onClick={loadSection}><RefreshCw size={14}/></button>
            <PermissionGate permission="office.notice.create">
              <button className={styles.addBtn} onClick={() => { resetNoticeForm(); setEditNotice(null); setShowNoticeModal(true); }}>
                <Plus size={15}/> Add Notice
              </button>
            </PermissionGate>
          </div>
          <div className={styles.noticeGrid}>
            {loading ? Array.from({length:4}).map((_,i)=><div key={i} className={`${styles.noticeCard} ${styles.skeleton}`}/>) :
             notices.length === 0 ? <div className={styles.emptyState}><Bell size={48}/><p>No notices found</p></div> :
             notices.map(n => (
              <div key={n.id} className={`${styles.noticeCard} ${n.is_pinned ? styles.pinned : ''}`}
                   style={{ '--priority-color': PRIORITY_COLORS[n.priority] } as React.CSSProperties}>
                {n.is_pinned && <div className={styles.pinnedBadge}><Pin size={11}/> Pinned</div>}
                <div className={styles.noticeTypeBadge}>{n.notice_type}</div>
                <h3 className={styles.noticeTitle}>{n.title}</h3>
                {n.title_marathi && <p className={styles.noticeTitleMr}>{n.title_marathi}</p>}
                {n.content && <p className={styles.noticeContent}>{n.content.substring(0, 120)}{n.content.length > 120 ? '...' : ''}</p>}
                <div className={styles.noticeMeta}>
                  <span className={styles.noticePriority} style={{ color: PRIORITY_COLORS[n.priority] }}>● {n.priority}</span>
                  <span>👁 {n.views}</span>
                  {n.expiry_date && <span>⏰ Exp: {new Date(n.expiry_date).toLocaleDateString('en-IN')}</span>}
                </div>
                <div className={styles.noticeActions}>
                  <PermissionGate permission="office.notice.update">
                    <button className={styles.miniBtn} onClick={() => {
                      setEditNotice(n);
                      setNewNotice({ title: n.title, title_marathi: n.title_marathi || '', content: n.content || '', notice_type: n.notice_type, priority: n.priority, target_audience: n.target_audience, is_pinned: n.is_pinned, expiry_date: n.expiry_date || '', notice_number: n.notice_number || '' });
                      setShowNoticeModal(true);
                    }}><Edit2 size={12}/></button>
                  </PermissionGate>
                  <PermissionGate permission="office.notice.delete">
                    <button className={`${styles.miniBtn} ${styles.miniBtnDanger}`} onClick={() => deleteNotice(n.id)}><Trash2 size={12}/></button>
                  </PermissionGate>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Enquiries ─────────────────────────────────────── */}
      {section === 'enquiries' && (
        <div className={styles.sectionContent}>
          <div className={styles.sectionToolbar}>
            <div className={styles.searchWrap}>
              <Search size={14} className={styles.searchIcon}/>
              <input className={styles.searchInput} placeholder="Search by name, mobile..." value={enqSearch} onChange={e => setEnqSearch(e.target.value)}/>
            </div>
            <select className={styles.filterSelect} value={enqStatus} onChange={e => setEnqStatus(e.target.value)}>
              <option value="">All Status</option>
              {['pending','follow_up','documents_submitted','admitted','rejected'].map(s => <option key={s} value={s}>{s.replace('_',' ')}</option>)}
            </select>
            <button className={styles.iconBtn} onClick={loadSection}><RefreshCw size={14}/></button>
            <PermissionGate permission="office.enquiry.create">
              <button className={styles.addBtn} onClick={() => setShowEnqModal(true)}><Plus size={15}/> New Enquiry</button>
            </PermissionGate>
          </div>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead><tr>
                <th>Enq. No.</th><th>Date</th><th>Student Name</th><th>Standard</th><th>Father</th>
                <th>Mobile</th><th>Source</th><th>Status</th><th>Follow-Up</th><th>Actions</th>
              </tr></thead>
              <tbody>
                {loading ? Array.from({length:5}).map((_,i)=><tr key={i}>{Array.from({length:10}).map((_,j)=><td key={j}><div className={styles.skeletonLine}/></td>)}</tr>) :
                 enquiries.length === 0 ? <tr><td colSpan={10} className={styles.emptyCell}><div className={styles.emptyState}><Users size={48}/><p>No enquiries found</p></div></td></tr> :
                 enquiries.map(e => (
                  <tr key={e.id} className={styles.tr}>
                    <td className={styles.monoId}>{e.enquiry_number}</td>
                    <td>{new Date(e.enquiry_date).toLocaleDateString('en-IN')}</td>
                    <td><div className={styles.nameStack}><strong>{e.student_name}</strong>{e.student_name_marathi && <span>{e.student_name_marathi}</span>}</div></td>
                    <td>Std {e.standard_applying_for}</td>
                    <td>{e.father_name || '-'}</td>
                    <td>{e.contact_mobile}</td>
                    <td><span className={styles.sourceBadge}>{e.source || '-'}</span></td>
                    <td><span className={`${styles.tag} ${enqStatusClass(e.status)}`}>{e.status.replace('_',' ')}</span></td>
                    <td>{e.follow_up_date ? new Date(e.follow_up_date).toLocaleDateString('en-IN') : '-'}</td>
                    <td>
                      <div className={styles.rowActions}>
                        <select className={styles.statusSelect} value={e.status} onChange={ev => updateEnquiryStatus(e.id, ev.target.value)}>
                          {['pending','follow_up','documents_submitted','admitted','rejected','withdrawn'].map(s => <option key={s} value={s}>{s.replace('_',' ')}</option>)}
                        </select>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Visitor Log ────────────────────────────────────── */}
      {section === 'visitors' && (
        <div className={styles.sectionContent}>
          <div className={styles.sectionToolbar}>
            <div className={styles.dateInfo}><Clock size={14}/> Today's Log — {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}</div>
            <button className={styles.iconBtn} onClick={loadSection}><RefreshCw size={14}/></button>
            <PermissionGate permission="office.visitor.create">
              <button className={styles.addBtn} onClick={() => setShowVisitorModal(true)}><Plus size={15}/> Check In</button>
            </PermissionGate>
          </div>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead><tr><th>#</th><th>Visitor Name</th><th>Mobile</th><th>Purpose</th><th>Meeting</th><th>ID Proof</th><th>In</th><th>Out</th><th>Status</th><th>Action</th></tr></thead>
              <tbody>
                {loading ? Array.from({length:3}).map((_,i)=><tr key={i}>{Array.from({length:10}).map((_,j)=><td key={j}><div className={styles.skeletonLine}/></td>)}</tr>) :
                 visitors.length === 0 ? <tr><td colSpan={10} className={styles.emptyCell}><div className={styles.emptyState}><UserCheck size={48}/><p>No visitors today</p></div></td></tr> :
                 visitors.map((v, i) => (
                  <tr key={v.id} className={styles.tr}>
                    <td>{i+1}</td>
                    <td><strong>{v.visitor_name}</strong><br/><small>{v.visitor_mobile}</small></td>
                    <td>{v.visitor_mobile || '-'}</td>
                    <td className={styles.purposeCell}>{v.purpose}</td>
                    <td>{v.whom_to_meet || '-'}</td>
                    <td>{v.id_proof_type || '-'}</td>
                    <td className={styles.timeCell}>{v.check_in_time || '-'}</td>
                    <td className={styles.timeCell}>{v.check_out_time || '-'}</td>
                    <td>
                      {v.check_out_time
                        ? <span className={`${styles.tag} ${styles.tagMuted}`}>Out</span>
                        : <span className={`${styles.tag} ${styles.tagSuccess}`}>Inside</span>}
                    </td>
                    <td>
                      {!v.check_out_time && (
                        <button className={`${styles.miniBtn} ${styles.miniBtnSuccess}`} onClick={() => checkoutVisitor(v.id)} title="Check out">
                          <Check size={13}/> Out
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Events ─────────────────────────────────────────── */}
      {section === 'events' && (
        <div className={styles.sectionContent}>
          <div className={styles.sectionToolbar}>
            <span className={styles.dateInfo}><Calendar size={14}/> School Calendar</span>
            <button className={styles.iconBtn} onClick={loadSection}><RefreshCw size={14}/></button>
            <PermissionGate permission="office.event.create">
              <button className={styles.addBtn} onClick={() => setShowEventModal(true)}><Plus size={15}/> Add Event</button>
            </PermissionGate>
          </div>
          <div className={styles.eventList}>
            {loading ? Array.from({length:5}).map((_,i)=><div key={i} className={`${styles.eventCard} ${styles.skeleton}`}/>) :
             events.length === 0 ? <div className={styles.emptyState}><Calendar size={48}/><p>No events scheduled</p></div> :
             events.map(ev => {
              const color = ev.color || eventTypeColor[ev.event_type] || '#2563eb';
              return (
                <div key={ev.id} className={`${styles.eventCard} ${ev.is_holiday ? styles.eventHoliday : ''}`}
                     style={{ '--ec': color } as React.CSSProperties}>
                  <div className={styles.eventDate}>
                    <span className={styles.eventDay}>{new Date(ev.start_date).getDate()}</span>
                    <span className={styles.eventMonth}>{new Date(ev.start_date).toLocaleDateString('en-IN', { month: 'short' })}</span>
                  </div>
                  <div className={styles.eventInfo}>
                    <div className={styles.eventTitle}>{ev.title}</div>
                    {ev.title_marathi && <div className={styles.eventTitleMr}>{ev.title_marathi}</div>}
                    <div className={styles.eventMeta}>
                      <span className={styles.eventType} style={{ color }}>{ev.event_type}</span>
                      {ev.venue && <span>📍 {ev.venue}</span>}
                      {ev.start_time && <span>🕐 {ev.start_time}</span>}
                      {ev.is_holiday && <span className={styles.holidayTag}>🎉 Holiday</span>}
                    </div>
                  </div>
                  <PermissionGate permission="office.event.delete">
                    <button className={`${styles.miniBtn} ${styles.miniBtnDanger}`} onClick={async () => { if(confirm('Delete?')) { await officeService.deleteEvent(ev.id); loadSection(); toast.success('Removed.'); } }}><Trash2 size={12}/></button>
                  </PermissionGate>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Complaints ─────────────────────────────────────── */}
      {section === 'complaints' && (
        <div className={styles.sectionContent}>
          <div className={styles.sectionToolbar}>
            <span className={styles.dateInfo}><MessageSquare size={14}/> Complaint Register</span>
            <button className={styles.iconBtn} onClick={loadSection}><RefreshCw size={14}/></button>
            <PermissionGate permission="office.complaint.create">
              <button className={styles.addBtn} onClick={() => setShowComplaintModal(true)}><Plus size={15}/> Register Complaint</button>
            </PermissionGate>
          </div>
          <div className={styles.complaintList}>
            {loading ? Array.from({length:4}).map((_,i)=><div key={i} className={`${styles.complaintCard} ${styles.skeleton}`}/>) :
             complaints.length === 0 ? <div className={styles.emptyState}><MessageSquare size={48}/><p>No complaints found</p></div> :
             complaints.map(c => (
              <div key={c.id} className={styles.complaintCard}>
                <div className={styles.complaintLeft}>
                  <div className={styles.complaintNo}>{c.complaint_number}</div>
                  <div className={styles.complaintSubject}>{c.subject}</div>
                  <div className={styles.complaintBy}>{c.complainant_name} · {c.complainant_type} · {c.complaint_type}</div>
                  <div className={styles.complaintDesc}>{c.description.substring(0, 100)}{c.description.length > 100 ? '...' : ''}</div>
                </div>
                <div className={styles.complaintRight}>
                  <span className={`${styles.tag} ${complaintStatusClass(c.status)}`}>{c.status.replace('_',' ')}</span>
                  <span className={`${styles.tag} ${c.priority === 'urgent' ? styles.tagDanger : c.priority === 'high' ? styles.tagWarning : styles.tagMuted}`}>{c.priority}</span>
                  {c.status === 'open' && (
                    <button className={styles.resolveBtn} onClick={async () => {
                      const res = prompt('Resolution note:');
                      if (res) { await officeService.updateComplaint(c.id, { status: 'resolved', resolution: res }); toast.success('Complaint resolved.'); loadSection(); }
                    }}>Resolve</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Inward/Outward Register ─────────────────────────── */}
      {section === 'register' && (
        <div className={styles.sectionContent}>
          <div className={styles.sectionToolbar}>
            <div className={styles.regTypeTabs}>
              <button className={`${styles.regTypeBtn} ${regType === 'inward' ? styles.regTypeBtnActive : ''}`} onClick={() => setRegType('inward')}><Inbox size={13}/> Inward</button>
              <button className={`${styles.regTypeBtn} ${regType === 'outward' ? styles.regTypeBtnActive : ''}`} onClick={() => setRegType('outward')}><Send size={13}/> Outward</button>
            </div>
            <button className={styles.iconBtn} onClick={loadSection}><RefreshCw size={14}/></button>
            <PermissionGate permission="office.register.create">
              <button className={styles.addBtn} onClick={() => { setNewReg(p => ({ ...p, register_type: regType })); setShowRegModal(true); }}>
                <Plus size={15}/> Add Entry
              </button>
            </PermissionGate>
          </div>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead><tr><th>Reg. No.</th><th>Date</th><th>{regType === 'inward' ? 'From' : 'To'}</th><th>Subject</th><th>Ref. No.</th><th>Document Type</th><th>Remarks</th></tr></thead>
              <tbody>
                {loading ? Array.from({length:4}).map((_,i)=><tr key={i}>{Array.from({length:7}).map((_,j)=><td key={j}><div className={styles.skeletonLine}/></td>)}</tr>) :
                 registers.length === 0 ? <tr><td colSpan={7} className={styles.emptyCell}><div className={styles.emptyState}><Inbox size={48}/><p>No entries found</p></div></td></tr> :
                 registers.map(r => (
                  <tr key={r.id} className={styles.tr}>
                    <td className={styles.monoId}>{r.register_number}</td>
                    <td>{new Date(r.register_date).toLocaleDateString('en-IN')}</td>
                    <td>{r.from_to}</td>
                    <td className={styles.subjectCell}>{r.subject}</td>
                    <td>{r.reference_number || '-'}</td>
                    <td>{r.document_type || '-'}</td>
                    <td>{r.remarks || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ════════ MODALS ════════ */}

      {/* Notice Modal */}
      {showNoticeModal && (
        <div className={styles.overlay} onClick={() => setShowNoticeModal(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>{editNotice ? 'Edit Notice' : 'Publish Notice'}</h3>
              <button className={styles.modalClose} onClick={() => setShowNoticeModal(false)}><X size={16}/></button>
            </div>
            <div className={styles.modalBody}>
              {[
                { key: 'title', label: 'Title *', type: 'text', placeholder: 'Notice title' },
                { key: 'title_marathi', label: 'Title (Marathi)', type: 'text', placeholder: 'मराठीत शीर्षक' },
                { key: 'notice_number', label: 'Notice Number', type: 'text', placeholder: 'e.g. HMMV/2026/001' },
                { key: 'expiry_date', label: 'Expiry Date', type: 'date', placeholder: '' },
              ].map(f => (
                <div key={f.key} className={styles.mf}>
                  <label className={styles.ml}>{f.label}</label>
                  <input className={styles.mi} type={f.type} placeholder={f.placeholder}
                    value={(newNotice as any)[f.key]} onChange={e => setNewNotice(p => ({ ...p, [f.key]: e.target.value }))}/>
                </div>
              ))}
              <div className={styles.mfRow}>
                <div className={styles.mf}>
                  <label className={styles.ml}>Type</label>
                  <select className={styles.mi} value={newNotice.notice_type} onChange={e => setNewNotice(p => ({ ...p, notice_type: e.target.value }))}>
                    {NOTICE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div className={styles.mf}>
                  <label className={styles.ml}>Priority</label>
                  <select className={styles.mi} value={newNotice.priority} onChange={e => setNewNotice(p => ({ ...p, priority: e.target.value }))}>
                    {['low','normal','high','urgent'].map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div className={styles.mf}>
                  <label className={styles.ml}>Audience</label>
                  <select className={styles.mi} value={newNotice.target_audience} onChange={e => setNewNotice(p => ({ ...p, target_audience: e.target.value }))}>
                    {['all','students','parents','teachers','staff','management'].map(a => <option key={a} value={a}>{a}</option>)}
                  </select>
                </div>
              </div>
              <div className={styles.mf}>
                <label className={styles.ml}>Content</label>
                <textarea className={`${styles.mi} ${styles.mta}`} rows={4} placeholder="Notice content..."
                  value={newNotice.content} onChange={e => setNewNotice(p => ({ ...p, content: e.target.value }))}/>
              </div>
              <label className={styles.checkRow}>
                <input type="checkbox" checked={newNotice.is_pinned} onChange={e => setNewNotice(p => ({ ...p, is_pinned: e.target.checked }))}/>
                Pin to top of notice board
              </label>
            </div>
            <div className={styles.modalFooter}>
              <button className={styles.cancelBtn} onClick={() => setShowNoticeModal(false)}>Cancel</button>
              <button className={styles.submitBtn} onClick={saveNotice} disabled={saving}>
                {saving ? <span className={styles.spin}/> : <Check size={14}/>} {editNotice ? 'Update' : 'Publish'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Enquiry Modal */}
      {showEnqModal && (
        <div className={styles.overlay} onClick={() => setShowEnqModal(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>New Admission Enquiry</h3>
              <button className={styles.modalClose} onClick={() => setShowEnqModal(false)}><X size={16}/></button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.mfRow}>
                <div className={styles.mf}><label className={styles.ml}>Student Name *</label><input className={styles.mi} value={newEnq.student_name} onChange={e => setNewEnq(p => ({ ...p, student_name: e.target.value }))} placeholder="Full name"/></div>
                <div className={styles.mf}><label className={styles.ml}>Standard *</label>
                  <select className={styles.mi} value={newEnq.standard_applying_for} onChange={e => setNewEnq(p => ({ ...p, standard_applying_for: e.target.value }))}>
                    <option value="">Select</option>
                    {['1','2','3','4','5','6','7','8','9','10','11','12'].map(s=><option key={s}>Std {s}</option>)}
                  </select>
                </div>
              </div>
              <div className={styles.mfRow}>
                <div className={styles.mf}><label className={styles.ml}>Father's Name</label><input className={styles.mi} value={newEnq.father_name} onChange={e => setNewEnq(p => ({ ...p, father_name: e.target.value }))} placeholder="Father name"/></div>
                <div className={styles.mf}><label className={styles.ml}>Contact Mobile *</label><input className={styles.mi} value={newEnq.contact_mobile} onChange={e => setNewEnq(p => ({ ...p, contact_mobile: e.target.value }))} placeholder="Mobile number"/></div>
              </div>
              <div className={styles.mfRow}>
                <div className={styles.mf}><label className={styles.ml}>Gender</label>
                  <select className={styles.mi} value={newEnq.gender} onChange={e => setNewEnq(p => ({ ...p, gender: e.target.value }))}>
                    <option value="">Select</option><option value="male">Male</option><option value="female">Female</option>
                  </select>
                </div>
                <div className={styles.mf}><label className={styles.ml}>Source</label>
                  <select className={styles.mi} value={newEnq.source} onChange={e => setNewEnq(p => ({ ...p, source: e.target.value }))}>
                    {['walk_in','phone','website','referral','social_media'].map(s=><option key={s} value={s}>{s.replace('_',' ')}</option>)}
                  </select>
                </div>
              </div>
              <div className={styles.mf}><label className={styles.ml}>Previous School</label><input className={styles.mi} value={newEnq.previous_school} onChange={e => setNewEnq(p => ({ ...p, previous_school: e.target.value }))} placeholder="Previous school name"/></div>
              <div className={styles.mf}><label className={styles.ml}>Remarks</label><textarea className={`${styles.mi} ${styles.mta}`} rows={2} value={newEnq.remarks} onChange={e => setNewEnq(p => ({ ...p, remarks: e.target.value }))} placeholder="Any remarks..."/></div>
            </div>
            <div className={styles.modalFooter}>
              <button className={styles.cancelBtn} onClick={() => setShowEnqModal(false)}>Cancel</button>
              <button className={styles.submitBtn} onClick={saveEnquiry} disabled={saving}>{saving ? <span className={styles.spin}/> : <Check size={14}/>} Register</button>
            </div>
          </div>
        </div>
      )}

      {/* Visitor Modal */}
      {showVisitorModal && (
        <div className={styles.overlay} onClick={() => setShowVisitorModal(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Visitor Check-In</h3>
              <button className={styles.modalClose} onClick={() => setShowVisitorModal(false)}><X size={16}/></button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.mfRow}>
                <div className={styles.mf}><label className={styles.ml}>Visitor Name *</label><input className={styles.mi} value={newVisitor.visitor_name} onChange={e => setNewVisitor(p => ({ ...p, visitor_name: e.target.value }))} placeholder="Full name"/></div>
                <div className={styles.mf}><label className={styles.ml}>Mobile</label><input className={styles.mi} value={newVisitor.visitor_mobile} onChange={e => setNewVisitor(p => ({ ...p, visitor_mobile: e.target.value }))} placeholder="Mobile number"/></div>
              </div>
              <div className={styles.mf}><label className={styles.ml}>Purpose *</label><input className={styles.mi} value={newVisitor.purpose} onChange={e => setNewVisitor(p => ({ ...p, purpose: e.target.value }))} placeholder="Purpose of visit"/></div>
              <div className={styles.mfRow}>
                <div className={styles.mf}><label className={styles.ml}>Whom to Meet</label><input className={styles.mi} value={newVisitor.whom_to_meet} onChange={e => setNewVisitor(p => ({ ...p, whom_to_meet: e.target.value }))} placeholder="Teacher / Office"/></div>
                <div className={styles.mf}><label className={styles.ml}>ID Proof Type</label>
                  <select className={styles.mi} value={newVisitor.id_proof_type} onChange={e => setNewVisitor(p => ({ ...p, id_proof_type: e.target.value }))}>
                    <option value="">None</option>
                    {['Aadhaar','PAN','Voter ID','Driving License','Passport'].map(p=><option key={p}>{p}</option>)}
                  </select>
                </div>
              </div>
              <div className={styles.mf}><label className={styles.ml}>Remarks</label><input className={styles.mi} value={newVisitor.remarks} onChange={e => setNewVisitor(p => ({ ...p, remarks: e.target.value }))} placeholder="Optional remarks"/></div>
            </div>
            <div className={styles.modalFooter}>
              <button className={styles.cancelBtn} onClick={() => setShowVisitorModal(false)}>Cancel</button>
              <button className={styles.submitBtn} onClick={saveVisitor} disabled={saving}>{saving ? <span className={styles.spin}/> : <UserCheck size={14}/>} Check In</button>
            </div>
          </div>
        </div>
      )}

      {/* Event Modal */}
      {showEventModal && (
        <div className={styles.overlay} onClick={() => setShowEventModal(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Add Event / Holiday</h3>
              <button className={styles.modalClose} onClick={() => setShowEventModal(false)}><X size={16}/></button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.mf}><label className={styles.ml}>Event Title *</label><input className={styles.mi} value={newEvent.title} onChange={e => setNewEvent(p => ({ ...p, title: e.target.value }))} placeholder="Event name"/></div>
              <div className={styles.mfRow}>
                <div className={styles.mf}><label className={styles.ml}>Type</label>
                  <select className={styles.mi} value={newEvent.event_type} onChange={e => setNewEvent(p => ({ ...p, event_type: e.target.value }))}>
                    {EVENT_TYPES.map(t=><option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div className={styles.mf}><label className={styles.ml}>Color</label>
                  <input type="color" className={`${styles.mi} ${styles.miColor}`} value={newEvent.color} onChange={e => setNewEvent(p => ({ ...p, color: e.target.value }))}/>
                </div>
              </div>
              <div className={styles.mfRow}>
                <div className={styles.mf}><label className={styles.ml}>Start Date *</label><input type="date" className={styles.mi} value={newEvent.start_date} onChange={e => setNewEvent(p => ({ ...p, start_date: e.target.value }))}/></div>
                <div className={styles.mf}><label className={styles.ml}>End Date</label><input type="date" className={styles.mi} value={newEvent.end_date} onChange={e => setNewEvent(p => ({ ...p, end_date: e.target.value }))}/></div>
                <div className={styles.mf}><label className={styles.ml}>Start Time</label><input type="time" className={styles.mi} value={newEvent.start_time} onChange={e => setNewEvent(p => ({ ...p, start_time: e.target.value }))}/></div>
              </div>
              <div className={styles.mfRow}>
                <div className={styles.mf}><label className={styles.ml}>Venue</label><input className={styles.mi} value={newEvent.venue} onChange={e => setNewEvent(p => ({ ...p, venue: e.target.value }))} placeholder="Location"/></div>
                <div className={styles.mf}><label className={styles.ml}>Organizer</label><input className={styles.mi} value={newEvent.organizer} onChange={e => setNewEvent(p => ({ ...p, organizer: e.target.value }))} placeholder="Organizer name"/></div>
              </div>
              <label className={styles.checkRow}>
                <input type="checkbox" checked={newEvent.is_holiday} onChange={e => setNewEvent(p => ({ ...p, is_holiday: e.target.checked }))}/>
                Mark as Holiday (students and staff off)
              </label>
            </div>
            <div className={styles.modalFooter}>
              <button className={styles.cancelBtn} onClick={() => setShowEventModal(false)}>Cancel</button>
              <button className={styles.submitBtn} onClick={saveEvent} disabled={saving}>{saving ? <span className={styles.spin}/> : <Check size={14}/>} Add Event</button>
            </div>
          </div>
        </div>
      )}

      {/* Complaint Modal */}
      {showComplaintModal && (
        <div className={styles.overlay} onClick={() => setShowComplaintModal(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Register Complaint</h3>
              <button className={styles.modalClose} onClick={() => setShowComplaintModal(false)}><X size={16}/></button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.mfRow}>
                <div className={styles.mf}><label className={styles.ml}>Complainant Name *</label><input className={styles.mi} value={newComplaint.complainant_name} onChange={e => setNewComplaint(p => ({ ...p, complainant_name: e.target.value }))} placeholder="Name"/></div>
                <div className={styles.mf}><label className={styles.ml}>Mobile</label><input className={styles.mi} value={newComplaint.complainant_mobile} onChange={e => setNewComplaint(p => ({ ...p, complainant_mobile: e.target.value }))} placeholder="Mobile"/></div>
              </div>
              <div className={styles.mfRow}>
                <div className={styles.mf}><label className={styles.ml}>Type of Complainant</label>
                  <select className={styles.mi} value={newComplaint.complainant_type} onChange={e => setNewComplaint(p => ({ ...p, complainant_type: e.target.value }))}>
                    {['parent','student','teacher','staff','anonymous'].map(t=><option key={t}>{t}</option>)}
                  </select>
                </div>
                <div className={styles.mf}><label className={styles.ml}>Complaint Category</label>
                  <select className={styles.mi} value={newComplaint.complaint_type} onChange={e => setNewComplaint(p => ({ ...p, complaint_type: e.target.value }))}>
                    {['academic','fee','behavior','facility','teacher','staff','other'].map(t=><option key={t}>{t}</option>)}
                  </select>
                </div>
                <div className={styles.mf}><label className={styles.ml}>Priority</label>
                  <select className={styles.mi} value={newComplaint.priority} onChange={e => setNewComplaint(p => ({ ...p, priority: e.target.value }))}>
                    {['low','normal','high','urgent'].map(p=><option key={p}>{p}</option>)}
                  </select>
                </div>
              </div>
              <div className={styles.mf}><label className={styles.ml}>Subject *</label><input className={styles.mi} value={newComplaint.subject} onChange={e => setNewComplaint(p => ({ ...p, subject: e.target.value }))} placeholder="Brief subject"/></div>
              <div className={styles.mf}><label className={styles.ml}>Description *</label><textarea className={`${styles.mi} ${styles.mta}`} rows={4} value={newComplaint.description} onChange={e => setNewComplaint(p => ({ ...p, description: e.target.value }))} placeholder="Detailed description of the complaint..."/></div>
            </div>
            <div className={styles.modalFooter}>
              <button className={styles.cancelBtn} onClick={() => setShowComplaintModal(false)}>Cancel</button>
              <button className={styles.submitBtn} onClick={saveComplaint} disabled={saving}>{saving ? <span className={styles.spin}/> : <Check size={14}/>} Submit</button>
            </div>
          </div>
        </div>
      )}

      {/* Register Modal */}
      {showRegModal && (
        <div className={styles.overlay} onClick={() => setShowRegModal(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>{newReg.register_type === 'inward' ? '📥 Inward Entry' : '📤 Outward Entry'}</h3>
              <button className={styles.modalClose} onClick={() => setShowRegModal(false)}><X size={16}/></button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.mfRow}>
                <div className={styles.mf}><label className={styles.ml}>Register Type</label>
                  <select className={styles.mi} value={newReg.register_type} onChange={e => setNewReg(p => ({ ...p, register_type: e.target.value }))}>
                    <option value="inward">Inward</option><option value="outward">Outward</option>
                  </select>
                </div>
                <div className={styles.mf}><label className={styles.ml}>Date *</label><input type="date" className={styles.mi} value={newReg.register_date} onChange={e => setNewReg(p => ({ ...p, register_date: e.target.value }))}/></div>
              </div>
              <div className={styles.mf}><label className={styles.ml}>{newReg.register_type === 'inward' ? 'From *' : 'To *'}</label><input className={styles.mi} value={newReg.from_to} onChange={e => setNewReg(p => ({ ...p, from_to: e.target.value }))} placeholder="Sender / Recipient name and address"/></div>
              <div className={styles.mf}><label className={styles.ml}>Subject *</label><input className={styles.mi} value={newReg.subject} onChange={e => setNewReg(p => ({ ...p, subject: e.target.value }))} placeholder="Subject of the letter"/></div>
              <div className={styles.mfRow}>
                <div className={styles.mf}><label className={styles.ml}>Reference No.</label><input className={styles.mi} value={newReg.reference_number} onChange={e => setNewReg(p => ({ ...p, reference_number: e.target.value }))} placeholder="Ref no."/></div>
                <div className={styles.mf}><label className={styles.ml}>Document Type</label>
                  <select className={styles.mi} value={newReg.document_type} onChange={e => setNewReg(p => ({ ...p, document_type: e.target.value }))}>
                    <option value="">Select</option>
                    {['Letter','Notice','Circular','Order','Application','Report','Certificate','Other'].map(d=><option key={d}>{d}</option>)}
                  </select>
                </div>
              </div>
              <div className={styles.mf}><label className={styles.ml}>Remarks</label><input className={styles.mi} value={newReg.remarks} onChange={e => setNewReg(p => ({ ...p, remarks: e.target.value }))} placeholder="Optional remarks"/></div>
            </div>
            <div className={styles.modalFooter}>
              <button className={styles.cancelBtn} onClick={() => setShowRegModal(false)}>Cancel</button>
              <button className={styles.submitBtn} onClick={saveRegEntry} disabled={saving}>{saving ? <span className={styles.spin}/> : <Check size={14}/>} Add Entry</button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Bonafide Modal */}
      {showRejectModal && (
        <div className={styles.overlay} onClick={() => setShowRejectModal(null)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Reject Bonafide Application</h3>
              <button className={styles.modalClose} onClick={() => setShowRejectModal(null)}><X size={16}/></button>
            </div>
            <div className={styles.modalBody}>
              <p style={{ marginBottom: 12 }}>
                Rejecting application <strong>{showRejectModal.application_number}</strong> for student <strong>{showRejectModal.student_name}</strong>.
              </p>
              <div className={styles.mf}>
                <label className={styles.ml}>Reason for Rejection *</label>
                <textarea
                  className={styles.mi}
                  rows={3}
                  placeholder="Enter reason for rejecting this application..."
                  value={rejectionReasonInput}
                  onChange={e => setRejectionReasonInput(e.target.value)}
                />
              </div>
            </div>
            <div className={styles.modalFooter}>
              <button className={styles.cancelBtn} onClick={() => setShowRejectModal(null)}>Cancel</button>
              <button className={styles.submitBtn} style={{ backgroundColor: 'var(--color-danger)' }} onClick={handleRejectBonafide}>Confirm Rejection</button>
            </div>
          </div>
        </div>
      )}

      {/* Direct Issue Bonafide Modal */}
      {showDirectBonafideModal && (
        <div className={styles.overlay} onClick={() => setShowDirectBonafideModal(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Issue Bonafide Certificate Directly</h3>
              <button className={styles.modalClose} onClick={() => setShowDirectBonafideModal(false)}><X size={16}/></button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.mf}>
                <label className={styles.ml}>Student Database ID *</label>
                <input
                  type="number"
                  className={styles.mi}
                  placeholder="Enter student ID (e.g. 1)"
                  value={directBonafide.student_id}
                  onChange={e => setDirectBonafide(p => ({ ...p, student_id: e.target.value }))}
                />
              </div>
              <div className={styles.mf}>
                <label className={styles.ml}>Purpose *</label>
                <input
                  className={styles.mi}
                  placeholder="e.g. Bank Account / Bus Pass / Scholarship"
                  value={directBonafide.purpose}
                  onChange={e => setDirectBonafide(p => ({ ...p, purpose: e.target.value }))}
                />
              </div>
              <div className={styles.mf}>
                <label className={styles.ml}>Fee Amount (₹)</label>
                <input
                  type="number"
                  className={styles.mi}
                  value={directBonafide.fee_amount}
                  onChange={e => setDirectBonafide(p => ({ ...p, fee_amount: Number(e.target.value) }))}
                />
              </div>
            </div>
            <div className={styles.modalFooter}>
              <button className={styles.cancelBtn} onClick={() => setShowDirectBonafideModal(false)}>Cancel</button>
              <button className={styles.submitBtn} onClick={handleCreateDirectBonafide} disabled={saving}>
                {saving ? <span className={styles.spin}/> : <Check size={14}/>} Issue Certificate
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Printable Bonafide Modal */}
      {printCertData && (
        <BonafideCertificatePrint data={printCertData} onClose={() => setPrintCertData(null)} />
      )}
    </div>
  );
}
