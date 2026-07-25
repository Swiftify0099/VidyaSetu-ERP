import { useState, useEffect, useCallback } from 'react';
import {
  Bell, Plus, RefreshCw, Check, X, Send, Megaphone,
  FileText, MessageSquare, BarChart3, Eye, Pin, Trash2,
  Pencil, BookOpen, AlertCircle, Info, AlertTriangle,
  ChevronDown, ChevronUp, ArrowRight,
} from 'lucide-react';
import toast from 'react-hot-toast';
import communicationService, {
  Notice, MessageTemplate, CommLog, Announcement, CommStats,
} from '../../services/communicationService';
import PermissionGate from '../../components/ui/PermissionGate';
import styles from './CommunicationPage.module.css';

type Section = 'dashboard' | 'notices' | 'send' | 'logs' | 'templates' | 'announcements';

const TODAY = new Date().toISOString().split('T')[0];
const NOTICE_TYPES = ['general','exam','fee','holiday','event','emergency','circular'];
const AUDIENCES   = ['all','students','teachers','parents','staff'];
const CHANNELS    = ['sms','whatsapp','email','in_app'];
const TMPL_TYPES  = ['sms','whatsapp','email','push'];
const TMPL_CATS   = ['general','attendance','fee','exam','notice','admission'];
const ANN_TYPES   = ['info','warning','success','danger'];

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

export default function CommunicationPage() {
  const [section, setSection] = useState<Section>('dashboard');
  const [stats, setStats] = useState<CommStats | null>(null);

  // Notices
  const [notices, setNotices] = useState<Notice[]>([]);
  const [noticeFilter, setNoticeFilter] = useState('');
  const [loadingNotices, setLoadingNotices] = useState(false);
  const [showNoticeModal, setShowNoticeModal] = useState(false);
  const [editNotice, setEditNotice] = useState<Notice | null>(null);
  const [expandedNotice, setExpandedNotice] = useState<number | null>(null);
  const [newNotice, setNewNotice] = useState({
    title:'', title_marathi:'', content:'', content_marathi:'',
    notice_type:'general', audience:'all', is_urgent:false,
    is_published:false, expiry_date:'', academic_year_id:1,
  });
  const [savingNotice, setSavingNotice] = useState(false);

  // Send
  const [sendChannel, setSendChannel] = useState('sms');
  const [sendAudience, setSendAudience] = useState('all');
  const [sendSubject, setSendSubject] = useState('');
  const [sendBody, setSendBody] = useState('');
  const [sendPhones, setSendPhones] = useState('');
  const [sending, setSending] = useState(false);
  const [charCount, setCharCount] = useState(0);

  // Logs
  const [logs, setLogs] = useState<CommLog[]>([]);
  const [logFilter, setLogFilter] = useState('');
  const [loadingLogs, setLoadingLogs] = useState(false);

  // Templates
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [showTmplModal, setShowTmplModal] = useState(false);
  const [newTmpl, setNewTmpl] = useState({ name:'', template_type:'sms', category:'general', subject:'', body_english:'', body_marathi:'', variables:'' });
  const [savingTmpl, setSavingTmpl] = useState(false);

  // Announcements
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [showAnnModal, setShowAnnModal] = useState(false);
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
    if (!newNotice.title || !newNotice.content) { toast.error('Title and content required.'); return; }
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

  const sendMessage = async () => {
    if (!sendBody) { toast.error('Message body is required.'); return; }
    setSending(true);
    try {
      const phones = sendPhones ? sendPhones.split(',').map(p => p.trim()).filter(Boolean) : undefined;
      const count = await communicationService.sendMessage({
        channel: sendChannel, recipient_type: sendAudience,
        recipient_phones: phones,
        subject: sendSubject || undefined, message_body: sendBody,
      });
      toast.success(`${count} message(s) dispatched via ${sendChannel}! 📤`);
      setSendBody(''); setSendSubject(''); setSendPhones(''); setCharCount(0);
      loadStats();
    } catch { toast.error('Send failed.'); }
    finally { setSending(false); }
  };

  const saveTmpl = async () => {
    if (!newTmpl.name || !newTmpl.body_english) { toast.error('Name and body required.'); return; }
    setSavingTmpl(true);
    try {
      await communicationService.createTemplate(newTmpl); toast.success('Template saved!');
      setShowTmplModal(false);
      setNewTmpl({ name:'', template_type:'sms', category:'general', subject:'', body_english:'', body_marathi:'', variables:'' });
      loadTemplates();
    } catch { toast.error('Failed.'); }
    finally { setSavingTmpl(false); }
  };

  const saveAnn = async () => {
    if (!newAnn.title) { toast.error('Title required.'); return; }
    setSavingAnn(true);
    try {
      await communicationService.createAnnouncement(newAnn); toast.success('Announcement posted!');
      setShowAnnModal(false);
      setNewAnn({ title:'', body:'', announcement_type:'info', target_roles:'all', is_pinned:false, expiry_date:'', academic_year_id:1 });
      loadAnnouncements(); loadStats();
    } catch { toast.error('Failed.'); }
    finally { setSavingAnn(false); }
  };

  const filteredNotices = notices.filter(n =>
    !noticeFilter || n.notice_type === noticeFilter
  );
  const filteredLogs = logs.filter(l =>
    !logFilter || l.channel === logFilter || l.status === logFilter
  );

  const charLimit = sendChannel === 'sms' ? 160 : 1000;

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Communication Hub</h1>
          <p className={styles.pageSub}>संवाद केंद्र · Notices, SMS, WhatsApp & Announcements</p>
        </div>
      </div>

      {/* Tabs */}
      <div className={styles.tabBar}>
        {([
          { id:'dashboard',     label:'Dashboard',     icon:<BarChart3 size={14}/> },
          { id:'notices',       label:'Notices',       icon:<FileText size={14}/> },
          { id:'send',          label:'Send Message',  icon:<Send size={14}/> },
          { id:'logs',          label:'Message Logs',  icon:<MessageSquare size={14}/> },
          { id:'templates',     label:'Templates',     icon:<BookOpen size={14}/> },
          { id:'announcements', label:'Announcements', icon:<Megaphone size={14}/> },
        ] as const).map(t => (
          <button key={t.id} className={`${styles.tab} ${section===t.id?styles.tabActive:''}`}
            onClick={() => setSection(t.id as Section)}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* ── DASHBOARD ──────────────────────────────────────── */}
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
                  { label:'Delivered',        value:stats.messages_delivered,  icon:<Check size={20}/>,       color:'var(--color-success)' },
                  { label:'Failed',           value:stats.messages_failed,     icon:<X size={20}/>,           color:'var(--color-danger)' },
                  { label:'Announcements',    value:stats.active_announcements,icon:<Megaphone size={20}/>,   color:'var(--color-warning)', action:()=>setSection('announcements') },
                  { label:'Templates',        value:stats.total_templates,     icon:<BookOpen size={20}/>,    color:'var(--color-primary)', action:()=>setSection('templates') },
                ].map(k => (
                  <div key={k.label} className={`${styles.kpiCard} ${k.action?styles.kpiClickable:''}`}
                       style={{'--kc':k.color} as React.CSSProperties} onClick={k.action}>
                    <div className={styles.kpiIcon} style={{color:k.color}}>{k.icon}</div>
                    <div className={styles.kpiVal}>{k.value}</div>
                    <div className={styles.kpiLabel}>{k.label}</div>
                    {k.action && <ArrowRight size={13} className={styles.kpiArrow}/>}
                  </div>
                ))}
              </div>
              {/* Quick send */}
              <div className={styles.quickSendCard}>
                <div className={styles.qsTitle}><Send size={16}/> Quick Broadcast</div>
                <div className={styles.qsBody}>
                  <select className={styles.qsSel} value={sendChannel} onChange={e=>setSendChannel(e.target.value)}>
                    {CHANNELS.map(c=><option key={c}>{c}</option>)}
                  </select>
                  <input className={styles.qsInput} placeholder="Message..." value={sendBody}
                    onChange={e=>{setSendBody(e.target.value);setCharCount(e.target.value.length);}}/>
                  <button className={styles.qsBtn} onClick={sendMessage} disabled={sending||!sendBody}>
                    {sending?<span className={styles.spin}/>:<Send size={14}/>} Send All
                  </button>
                </div>
                {sendChannel==='sms' && <div className={styles.charCount}>{charCount}/{charLimit} chars</div>}
              </div>
            </>
          )}
        </div>
      )}

      {/* ── NOTICES ──────────────────────────────────────── */}
      {section==='notices' && (
        <div className={styles.noticesContent}>
          <div className={styles.toolbar}>
            <div className={styles.filterTabs}>
              <button className={`${styles.filterTab} ${!noticeFilter?styles.filterTabActive:''}`} onClick={()=>setNoticeFilter('')}>All</button>
              {NOTICE_TYPES.map(t=>(
                <button key={t} className={`${styles.filterTab} ${noticeFilter===t?styles.filterTabActive:''}`} onClick={()=>setNoticeFilter(t)}>{t}</button>
              ))}
            </div>
            <button className={styles.iconBtn} onClick={loadNotices}><RefreshCw size={14}/></button>
            <PermissionGate permission="communication.manage">
              <button className={styles.addBtn} onClick={openNewNotice}><Plus size={15}/> New Notice</button>
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
                        {n.notice_type}
                      </div>
                      {n.is_urgent && <span className={styles.urgentBadge}>🚨 URGENT</span>}
                      {!n.is_published && <span className={styles.draftBadge}>Draft</span>}
                    </div>
                    <div className={styles.noticeActions}>
                      <span className={styles.viewCount}><Eye size={11}/> {n.view_count}</span>
                      <PermissionGate permission="communication.manage">
                        <button className={styles.miniBtn} onClick={()=>openEditNotice(n)}><Pencil size={11}/></button>
                        {!n.is_published && (
                          <PermissionGate permission="communication.publish">
                            <button className={`${styles.miniBtn} ${styles.publishBtn}`} onClick={()=>publishNotice(n.id)}><Bell size={11}/> Publish</button>
                          </PermissionGate>
                        )}
                        <button className={`${styles.miniBtn} ${styles.miniBtnDanger}`} onClick={()=>deleteNotice(n.id)}><Trash2 size={11}/></button>
                      </PermissionGate>
                    </div>
                  </div>
                  <div className={styles.noticeTitle}>{n.title}</div>
                  {n.title_marathi && <div className={styles.noticeTitleMr}>{n.title_marathi}</div>}
                  <div className={styles.noticePreview} onClick={()=>setExpandedNotice(expandedNotice===n.id?null:n.id)}>
                    {expandedNotice===n.id ? n.content : `${n.content.substring(0,200)}${n.content.length>200?'…':''}`}
                    {n.content.length>200 && <button className={styles.expandBtn}>{expandedNotice===n.id?<ChevronUp size={12}/>:<ChevronDown size={12}/>}</button>}
                  </div>
                  <div className={styles.noticeFooter}>
                    <span className={styles.noticeAudience}><Bell size={11}/> {n.audience}</span>
                    {n.publish_date && <span className={styles.noticeDate}>{new Date(n.publish_date).toLocaleDateString('en-IN')}</span>}
                    {n.expiry_date && <span className={styles.noticeDate}>Expires: {new Date(n.expiry_date).toLocaleDateString('en-IN')}</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── SEND MESSAGE ─────────────────────────────────── */}
      {section==='send' && (
        <div className={styles.sendContent}>
          <div className={styles.sendCard}>
            <div className={styles.sendTitle}><Send size={18}/> Compose & Send</div>
            <div className={styles.sendForm}>
              <div className={styles.sendRow}>
                <div className={styles.sendField}>
                  <label className={styles.sendLabel}>Channel</label>
                  <div className={styles.channelBtns}>
                    {CHANNELS.map(c=>(
                      <button key={c} className={`${styles.channelBtn} ${sendChannel===c?styles.channelBtnActive:''}`}
                        onClick={()=>setSendChannel(c)}>
                        {c==='sms'?'📱':c==='whatsapp'?'💬':c==='email'?'📧':'🔔'} {c.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>
                <div className={styles.sendField}>
                  <label className={styles.sendLabel}>Audience</label>
                  <select className={styles.sendSel} value={sendAudience} onChange={e=>setSendAudience(e.target.value)}>
                    {AUDIENCES.map(a=><option key={a} value={a}>{a}</option>)}
                  </select>
                </div>
              </div>
              {(sendChannel==='email'||sendChannel==='whatsapp') && (
                <div className={styles.sendField}>
                  <label className={styles.sendLabel}>Subject</label>
                  <input className={styles.sendInput} value={sendSubject} onChange={e=>setSendSubject(e.target.value)} placeholder="Subject line..."/>
                </div>
              )}
              <div className={styles.sendField}>
                <label className={styles.sendLabel}>Phone Numbers (optional, comma-separated)</label>
                <input className={styles.sendInput} value={sendPhones} onChange={e=>setSendPhones(e.target.value)} placeholder="91XXXXXXXXXX, 91XXXXXXXXXX"/>
              </div>
              <div className={styles.sendField}>
                <div className={styles.bodyLabelRow}>
                  <label className={styles.sendLabel}>Message Body *</label>
                  {sendChannel==='sms' && <span className={`${styles.charCounter} ${charCount>charLimit?styles.charCounterOver:''}`}>{charCount}/{charLimit}</span>}
                </div>
                <textarea className={`${styles.sendTextarea} ${charCount>charLimit?styles.textareaOver:''}`}
                  rows={6} value={sendBody}
                  onChange={e=>{setSendBody(e.target.value);setCharCount(e.target.value.length);}}
                  placeholder="Type your message here... Use {student_name}, {amount}, {date} for dynamic variables."/>
              </div>

              {/* Template picker */}
              {templates.length > 0 && (
                <div className={styles.sendField}>
                  <label className={styles.sendLabel}>Or pick a template</label>
                  <div className={styles.templatePills}>
                    {templates.filter(t=>t.template_type===sendChannel).map(t=>(
                      <button key={t.id} className={styles.tmplPill} onClick={()=>{setSendBody(t.body_english);setCharCount(t.body_english.length);setSendSubject(t.subject||'');}}>
                        {t.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <button className={styles.bigSendBtn} onClick={sendMessage} disabled={sending||!sendBody||charCount>charLimit}>
                {sending?<span className={styles.spin}/>:<Send size={18}/>}
                {sending?'Sending...':`Send via ${sendChannel.toUpperCase()}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MESSAGE LOGS ─────────────────────────────────── */}
      {section==='logs' && (
        <div className={styles.logsContent}>
          <div className={styles.toolbar}>
            <div className={styles.filterTabs}>
              <button className={`${styles.filterTab} ${!logFilter?styles.filterTabActive:''}`} onClick={()=>setLogFilter('')}>All</button>
              {CHANNELS.map(c=><button key={c} className={`${styles.filterTab} ${logFilter===c?styles.filterTabActive:''}`} onClick={()=>setLogFilter(c)}>{c}</button>)}
              {['sent','delivered','failed','pending'].map(s=><button key={s} className={`${styles.filterTab} ${logFilter===s?styles.filterTabActive:''}`} onClick={()=>setLogFilter(s)}>{s}</button>)}
            </div>
            <button className={styles.iconBtn} onClick={loadLogs}><RefreshCw size={14}/></button>
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
                      <td><span className={styles.channelTag}>{l.channel==='sms'?'📱':l.channel==='whatsapp'?'💬':l.channel==='email'?'📧':'🔔'} {l.channel}</span></td>
                      <td><span className={styles.recipientTag}>{l.recipient_phone||l.recipient_id||l.recipient_type}</span></td>
                      <td className={styles.subjectCell}>{l.subject||'—'}</td>
                      <td className={styles.msgCell}>{l.message_body.substring(0,80)}{l.message_body.length>80?'…':''}</td>
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

      {/* ── TEMPLATES ────────────────────────────────────── */}
      {section==='templates' && (
        <div className={styles.templatesContent}>
          <div className={styles.toolbar}>
            <span className={styles.muted}>{templates.length} templates</span>
            <button className={styles.iconBtn} onClick={loadTemplates}><RefreshCw size={14}/></button>
            <PermissionGate permission="communication.manage">
              <button className={styles.addBtn} onClick={()=>setShowTmplModal(true)}><Plus size={15}/> Add Template</button>
            </PermissionGate>
          </div>
          <div className={styles.tmplGrid}>
            {templates.length===0 ? (
              <div className={styles.emptyState}><BookOpen size={64}/><p>No templates yet. Add reusable SMS/WhatsApp templates.</p></div>
            ) : templates.map(t=>(
              <div key={t.id} className={styles.tmplCard}>
                <div className={styles.tmplTop}>
                  <div className={styles.tmplName}>{t.name}</div>
                  <div className={styles.tmplTags}>
                    <span className={styles.tmplType}>{t.template_type}</span>
                    <span className={styles.tmplCat}>{t.category}</span>
                  </div>
                </div>
                {t.subject && <div className={styles.tmplSubject}>{t.subject}</div>}
                <div className={styles.tmplBody}>{t.body_english}</div>
                {t.body_marathi && <div className={styles.tmplBodyMr}>{t.body_marathi}</div>}
                {t.variables && <div className={styles.tmplVars}>Variables: <code>{t.variables}</code></div>}
                <PermissionGate permission="communication.manage">
                  <button className={`${styles.miniBtn} ${styles.miniBtnDanger}`} onClick={async()=>{await communicationService.deleteTemplate(t.id);toast.success('Deleted.');loadTemplates();}}><Trash2 size={11}/> Delete</button>
                </PermissionGate>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── ANNOUNCEMENTS ────────────────────────────────── */}
      {section==='announcements' && (
        <div className={styles.announcementsContent}>
          <div className={styles.toolbar}>
            <span className={styles.muted}>{announcements.length} active</span>
            <button className={styles.iconBtn} onClick={loadAnnouncements}><RefreshCw size={14}/></button>
            <PermissionGate permission="communication.manage">
              <button className={styles.addBtn} onClick={()=>setShowAnnModal(true)}><Plus size={15}/> Post Announcement</button>
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
                    <div className={styles.annTitle}>{a.is_pinned && <Pin size={12} className={styles.pinIcon}/>}{a.title}</div>
                    {a.body && <div className={styles.annBody}>{a.body}</div>}
                    <div className={styles.annMeta}>
                      {a.target_roles} · {a.created_at ? new Date(a.created_at).toLocaleDateString('en-IN') : ''}
                      {a.expiry_date && ` · Expires: ${new Date(a.expiry_date).toLocaleDateString('en-IN')}`}
                    </div>
                  </div>
                </div>
                <PermissionGate permission="communication.manage">
                  <button className={styles.annDel} onClick={async()=>{await communicationService.deleteAnnouncement(a.id);toast.success('Removed.');loadAnnouncements();loadStats();}}><X size={14}/></button>
                </PermissionGate>
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
              <button className={styles.modalClose} onClick={()=>setShowNoticeModal(false)}><X size={16}/></button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.mfRow}>
                <div className={styles.mf}><label className={styles.ml}>Type</label><select className={styles.mi} value={newNotice.notice_type} onChange={e=>setNewNotice(p=>({...p,notice_type:e.target.value}))}>{NOTICE_TYPES.map(t=><option key={t}>{t}</option>)}</select></div>
                <div className={styles.mf}><label className={styles.ml}>Audience</label><select className={styles.mi} value={newNotice.audience} onChange={e=>setNewNotice(p=>({...p,audience:e.target.value}))}>{AUDIENCES.map(a=><option key={a}>{a}</option>)}</select></div>
              </div>
              <div className={styles.mf}><label className={styles.ml}>Title (English) *</label><input className={styles.mi} value={newNotice.title} onChange={e=>setNewNotice(p=>({...p,title:e.target.value}))} placeholder="Notice title"/></div>
              <div className={styles.mf}><label className={styles.ml}>Title (Marathi)</label><input className={styles.mi} value={newNotice.title_marathi} onChange={e=>setNewNotice(p=>({...p,title_marathi:e.target.value}))} placeholder="सूचना शीर्षक"/></div>
              <div className={styles.mf}><label className={styles.ml}>Content (English) *</label><textarea className={styles.mta} rows={5} value={newNotice.content} onChange={e=>setNewNotice(p=>({...p,content:e.target.value}))} placeholder="Notice content..."/></div>
              <div className={styles.mf}><label className={styles.ml}>Content (Marathi)</label><textarea className={styles.mta} rows={4} value={newNotice.content_marathi} onChange={e=>setNewNotice(p=>({...p,content_marathi:e.target.value}))} placeholder="सूचना आशय..."/></div>
              <div className={styles.mfRow}>
                <div className={styles.mf}><label className={styles.ml}>Expiry Date</label><input type="date" className={styles.mi} value={newNotice.expiry_date} min={TODAY} onChange={e=>setNewNotice(p=>({...p,expiry_date:e.target.value}))}/></div>
                <div className={styles.mf} style={{justifyContent:'flex-end', paddingTop:'28px'}}>
                  <label className={styles.checkRow}><input type="checkbox" checked={newNotice.is_urgent} onChange={e=>setNewNotice(p=>({...p,is_urgent:e.target.checked}))}/>  Mark as Urgent 🚨</label>
                  <label className={styles.checkRow}><input type="checkbox" checked={newNotice.is_published} onChange={e=>setNewNotice(p=>({...p,is_published:e.target.checked}))}/>  Publish immediately</label>
                </div>
              </div>
            </div>
            <div className={styles.modalFooter}>
              <button className={styles.cancelBtn} onClick={()=>setShowNoticeModal(false)}>Cancel</button>
              <button className={styles.submitBtn} onClick={saveNotice} disabled={savingNotice}>{savingNotice?<span className={styles.spin}/>:<Check size={14}/>} {editNotice?'Update':'Create'}</button>
            </div>
          </div>
        </div>
      )}

      {/* ════ Template Modal ════ */}
      {showTmplModal && (
        <div className={styles.overlay} onClick={()=>setShowTmplModal(false)}>
          <div className={styles.modal} onClick={e=>e.stopPropagation()}>
            <div className={styles.modalHeader}><h3 className={styles.modalTitle}>Add Template</h3><button className={styles.modalClose} onClick={()=>setShowTmplModal(false)}><X size={16}/></button></div>
            <div className={styles.modalBody}>
              <div className={styles.mf}><label className={styles.ml}>Name *</label><input className={styles.mi} value={newTmpl.name} onChange={e=>setNewTmpl(p=>({...p,name:e.target.value}))} placeholder="Template name"/></div>
              <div className={styles.mfRow}>
                <div className={styles.mf}><label className={styles.ml}>Type</label><select className={styles.mi} value={newTmpl.template_type} onChange={e=>setNewTmpl(p=>({...p,template_type:e.target.value}))}>{TMPL_TYPES.map(t=><option key={t}>{t}</option>)}</select></div>
                <div className={styles.mf}><label className={styles.ml}>Category</label><select className={styles.mi} value={newTmpl.category} onChange={e=>setNewTmpl(p=>({...p,category:e.target.value}))}>{TMPL_CATS.map(c=><option key={c}>{c}</option>)}</select></div>
              </div>
              <div className={styles.mf}><label className={styles.ml}>Subject</label><input className={styles.mi} value={newTmpl.subject} onChange={e=>setNewTmpl(p=>({...p,subject:e.target.value}))} placeholder="For email/push"/></div>
              <div className={styles.mf}><label className={styles.ml}>Body (English) *</label><textarea className={styles.mta} rows={4} value={newTmpl.body_english} onChange={e=>setNewTmpl(p=>({...p,body_english:e.target.value}))} placeholder="Dear {student_name}, ..."/></div>
              <div className={styles.mf}><label className={styles.ml}>Body (Marathi)</label><textarea className={styles.mta} rows={3} value={newTmpl.body_marathi} onChange={e=>setNewTmpl(p=>({...p,body_marathi:e.target.value}))} placeholder="प्रिय {student_name}, ..."/></div>
              <div className={styles.mf}><label className={styles.ml}>Variables (JSON array)</label><input className={styles.mi} value={newTmpl.variables} onChange={e=>setNewTmpl(p=>({...p,variables:e.target.value}))} placeholder='["student_name","amount","date"]'/></div>
            </div>
            <div className={styles.modalFooter}><button className={styles.cancelBtn} onClick={()=>setShowTmplModal(false)}>Cancel</button><button className={styles.submitBtn} onClick={saveTmpl} disabled={savingTmpl}>{savingTmpl?<span className={styles.spin}/>:<Check size={14}/>} Save</button></div>
          </div>
        </div>
      )}

      {/* ════ Announcement Modal ════ */}
      {showAnnModal && (
        <div className={styles.overlay} onClick={()=>setShowAnnModal(false)}>
          <div className={styles.modal} onClick={e=>e.stopPropagation()}>
            <div className={styles.modalHeader}><h3 className={styles.modalTitle}>Post Announcement</h3><button className={styles.modalClose} onClick={()=>setShowAnnModal(false)}><X size={16}/></button></div>
            <div className={styles.modalBody}>
              <div className={styles.mf}><label className={styles.ml}>Title *</label><input className={styles.mi} value={newAnn.title} onChange={e=>setNewAnn(p=>({...p,title:e.target.value}))} placeholder="Announcement title"/></div>
              <div className={styles.mf}><label className={styles.ml}>Body</label><textarea className={styles.mta} rows={3} value={newAnn.body} onChange={e=>setNewAnn(p=>({...p,body:e.target.value}))} placeholder="Optional body..."/></div>
              <div className={styles.mfRow}>
                <div className={styles.mf}><label className={styles.ml}>Type</label><select className={styles.mi} value={newAnn.announcement_type} onChange={e=>setNewAnn(p=>({...p,announcement_type:e.target.value}))}>{ANN_TYPES.map(t=><option key={t}>{t}</option>)}</select></div>
                <div className={styles.mf}><label className={styles.ml}>Target Roles</label><input className={styles.mi} value={newAnn.target_roles} onChange={e=>setNewAnn(p=>({...p,target_roles:e.target.value}))} placeholder="all / admin / teacher"/></div>
                <div className={styles.mf}><label className={styles.ml}>Expiry Date</label><input type="date" className={styles.mi} value={newAnn.expiry_date} min={TODAY} onChange={e=>setNewAnn(p=>({...p,expiry_date:e.target.value}))}/></div>
              </div>
              <label className={styles.checkRow}><input type="checkbox" checked={newAnn.is_pinned} onChange={e=>setNewAnn(p=>({...p,is_pinned:e.target.checked}))}/>  📌 Pin this announcement</label>
            </div>
            <div className={styles.modalFooter}><button className={styles.cancelBtn} onClick={()=>setShowAnnModal(false)}>Cancel</button><button className={styles.submitBtn} onClick={saveAnn} disabled={savingAnn}>{savingAnn?<span className={styles.spin}/>:<Check size={14}/>} Post</button></div>
          </div>
        </div>
      )}
    </div>
  );
}
