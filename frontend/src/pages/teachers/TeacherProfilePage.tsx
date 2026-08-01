import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ChevronLeft, Edit2, Upload, Plus, Trash2, Check, X,
  Phone, Mail, MapPin, Calendar, Award, CreditCard,
  BookOpen, Briefcase, CalendarOff, GraduationCap, Shield,
  Printer, Copy, Eye, EyeOff, ExternalLink, Crown,
  Sparkles, Clock, Building2, BadgeCheck, FileText,
  CheckCircle2, XCircle, AlertCircle, HeartHandshake, Trophy,
  MessageSquare, QrCode
} from 'lucide-react';
import toast from 'react-hot-toast';
import teacherService, {
  Teacher, Qualification, Experience, LeaveRecord,
} from '../../services/teacherService';
import PermissionGate from '../../components/ui/PermissionGate';
import styles from './TeacherProfilePage.module.css';

type Tab = 'profile' | 'qualifications' | 'experience' | 'leave' | 'schedule' | 'service' | 'idcard';

export default function TeacherProfilePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const photoRef = useRef<HTMLInputElement>(null);

  const [teacher, setTeacher] = useState<Teacher | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('profile');
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const [qualifications, setQualifications] = useState<Qualification[]>([]);
  const [experience, setExperience] = useState<Experience[]>([]);
  const [leaves, setLeaves] = useState<LeaveRecord[]>([]);

  // Mask toggles for sensitive info
  const [showAadhaar, setShowAadhaar] = useState(false);
  const [showBankAcc, setShowBankAcc] = useState(false);
  const [showPan, setShowPan] = useState(false);

  // Modals
  const [showQualModal, setShowQualModal] = useState(false);
  const [newQual, setNewQual] = useState({ degree: '', subject: '', university: '', year_of_passing: '', grade_percentage: '' });

  const [showExpModal, setShowExpModal] = useState(false);
  const [newExp, setNewExp] = useState({ organization: '', designation: '', from_date: '', to_date: '', is_current: false, description: '' });

  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [newLeave, setNewLeave] = useState({ leave_type: 'casual', from_date: '', to_date: '', reason: '' });

  const [showIDCardModal, setShowIDCardModal] = useState(false);

  useEffect(() => {
    if (!id) return;
    loadAll();
  }, [id]);

  const loadAll = async () => {
    setLoading(true);
    try {
      const t = await teacherService.getById(Number(id));
      setTeacher(t);
      const [quals, exps, lvs] = await Promise.all([
        teacherService.getQualifications(Number(id)).catch(() => []),
        teacherService.getExperience(Number(id)).catch(() => []),
        teacherService.getLeaves(Number(id)).catch(() => []),
      ]);
      setQualifications(quals);
      setExperience(exps);
      setLeaves(lvs);
    } catch {
      toast.error('Failed to load profile details.');
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !teacher) return;
    setUploadingPhoto(true);
    try {
      await teacherService.uploadPhoto(teacher.id, file);
      toast.success('Profile photo updated successfully!');
      loadAll();
    } catch {
      toast.error('Photo upload failed.');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const addQualification = async () => {
    if (!teacher || !newQual.degree) { toast.error('Degree name is required.'); return; }
    try {
      await teacherService.addQualification(teacher.id, {
        ...newQual,
        year_of_passing: newQual.year_of_passing ? Number(newQual.year_of_passing) : undefined,
      } as any);
      toast.success('Qualification added!');
      setShowQualModal(false);
      setNewQual({ degree: '', subject: '', university: '', year_of_passing: '', grade_percentage: '' });
      setQualifications(await teacherService.getQualifications(teacher.id));
    } catch {
      toast.error('Failed to add qualification.');
    }
  };

  const deleteQualification = async (qualId: number) => {
    if (!confirm('Are you sure you want to remove this qualification?')) return;
    try {
      await teacherService.deleteQualification(qualId);
      if (teacher) setQualifications(await teacherService.getQualifications(teacher.id));
      toast.success('Qualification removed.');
    } catch {
      toast.error('Failed to remove qualification.');
    }
  };

  const addExperience = async () => {
    if (!teacher || !newExp.organization) { toast.error('Organization name is required.'); return; }
    try {
      await teacherService.addExperience(teacher.id, newExp as any);
      toast.success('Experience added!');
      setShowExpModal(false);
      setNewExp({ organization: '', designation: '', from_date: '', to_date: '', is_current: false, description: '' });
      setExperience(await teacherService.getExperience(teacher.id));
    } catch {
      toast.error('Failed to add experience.');
    }
  };

  const applyLeave = async () => {
    if (!teacher || !newLeave.from_date || !newLeave.to_date) {
      toast.error('Please specify start and end dates.'); return;
    }
    try {
      await teacherService.applyLeave(teacher.id, newLeave);
      toast.success('Leave application submitted!');
      setShowLeaveModal(false);
      setNewLeave({ leave_type: 'casual', from_date: '', to_date: '', reason: '' });
      setLeaves(await teacherService.getLeaves(teacher.id));
    } catch {
      toast.error('Failed to apply leave.');
    }
  };

  const copyToClipboard = (text?: string, label?: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    toast.success(`${label || 'Copied'} copied to clipboard!`);
  };

  const photoUrl = teacher?.photo_path ? `${import.meta.env.VITE_STORAGE_URL}/${teacher.photo_path}` : null;

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loadingSpinner}></div>
        <p>Loading Employee Profile...</p>
      </div>
    );
  }

  if (!teacher) return null;

  // Role Theme & Badge details
  const getRoleBadgeConfig = () => {
    const desig = (teacher.designation || '').toLowerCase();
    const type = (teacher.employee_type || '').toLowerCase();

    if (desig.includes('head') || desig.includes('principal') || desig.includes('director')) {
      return { label: 'Executive Leadership', icon: <Crown size={14}/>, theme: styles.roleExecutive };
    }
    if (type === 'teaching' || desig.includes('teacher') || desig.includes('professor')) {
      return { label: 'Faculty / Educator', icon: <GraduationCap size={14}/>, theme: styles.roleFaculty };
    }
    if (desig.includes('librarian') || desig.includes('library')) {
      return { label: 'Library Department', icon: <BookOpen size={14}/>, theme: styles.roleLibrary };
    }
    if (desig.includes('clerk') || desig.includes('accountant') || desig.includes('office') || desig.includes('admin')) {
      return { label: 'Administration & Finance', icon: <Briefcase size={14}/>, theme: styles.roleAdmin };
    }
    if (desig.includes('sports') || desig.includes('pe') || desig.includes('physical')) {
      return { label: 'Sports & Athletics', icon: <Trophy size={14}/>, theme: styles.roleSports };
    }
    return { label: 'Staff Member', icon: <HeartHandshake size={14}/>, theme: styles.roleStaff };
  };

  const roleConfig = getRoleBadgeConfig();

  // Calculations
  const yearsService = teacher.date_of_joining
    ? (Math.max(0, (Date.now() - new Date(teacher.date_of_joining).getTime()) / (1000 * 60 * 60 * 24 * 365.25))).toFixed(1)
    : null;

  const yearsToRetirement = teacher.date_of_retirement
    ? Math.max(0, Math.floor((new Date(teacher.date_of_retirement).getTime() - Date.now()) / (1000 * 60 * 60 * 24 * 365.25)))
    : teacher.dob
    ? Math.max(0, 60 - Math.floor((Date.now() - new Date(teacher.dob).getTime()) / (1000 * 60 * 60 * 24 * 365.25)))
    : null;

  const leaveStatusClass = (s: string) => {
    const m: Record<string, string> = {
      pending: styles.tagWarning,
      approved: styles.tagSuccess,
      rejected: styles.tagDanger,
    };
    return m[s] || styles.tagMuted;
  };

  const InfoCard = ({ label, value, copyable, isMasked, onToggleMask }: {
    label: string;
    value?: string | number | null;
    copyable?: boolean;
    isMasked?: boolean;
    onToggleMask?: () => void;
  }) => {
    if (value == null || value === '') return null;

    let displayVal = String(value);
    if (isMasked) {
      displayVal = displayVal.length > 4 ? `•••• •••• ${displayVal.slice(-4)}` : '••••••••';
    }

    return (
      <div className={styles.infoCard}>
        <div className={styles.infoCardMeta}>
          <span className={styles.infoCardLabel}>{label}</span>
          <div className={styles.infoCardActions}>
            {onToggleMask && (
              <button className={styles.iconBtn} onClick={onToggleMask} title={isMasked ? "Show" : "Hide"}>
                {isMasked ? <Eye size={13}/> : <EyeOff size={13}/>}
              </button>
            )}
            {copyable && (
              <button className={styles.iconBtn} onClick={() => copyToClipboard(String(value), label)} title="Copy">
                <Copy size={13}/>
              </button>
            )}
          </div>
        </div>
        <span className={styles.infoCardValue}>{displayVal}</span>
      </div>
    );
  };

  const Section = ({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) => (
    <div className={styles.sectionCard}>
      <div className={styles.sectionHeader}>
        <div className={styles.sectionHeaderTitle}>
          <span className={styles.sectionIcon}>{icon}</span>
          <h3>{title}</h3>
        </div>
      </div>
      <div className={styles.sectionGrid}>{children}</div>
    </div>
  );

  return (
    <div className={styles.page}>
      {/* ── Top Bar ─────────────────────────────────────────── */}
      <div className={styles.topNav}>
        <button className={styles.backBtn} onClick={() => navigate('/teachers')}>
          <ChevronLeft size={16}/> <span>Back to Staff Directory</span>
        </button>

        <div className={styles.topNavActions}>
          <button className={styles.idCardBtn} onClick={() => setShowIDCardModal(true)}>
            <QrCode size={15}/> <span>Digital ID Card</span>
          </button>
          <PermissionGate permission="teacher.update">
            <button className={styles.editBtn} onClick={() => navigate(`/teachers/${teacher.id}/edit`)}>
              <Edit2 size={15}/> <span>Edit Profile</span>
            </button>
          </PermissionGate>
          <PermissionGate permission="teacher.leave.apply">
            <button className={styles.leaveBtn} onClick={() => setShowLeaveModal(true)}>
              <CalendarOff size={15}/> <span>Apply Leave</span>
            </button>
          </PermissionGate>
        </div>
      </div>

      {/* ── Hero Profile Card ─────────────────────────────────── */}
      <div className={`${styles.heroCard} ${roleConfig.theme}`}>
        <div className={styles.heroBackgroundPattern} />
        
        <div className={styles.heroContent}>
          <div className={styles.heroMain}>
            {/* Avatar */}
            <div className={styles.avatarWrapper}>
              <div className={styles.avatarImageContainer}>
                {photoUrl ? (
                  <img src={photoUrl} alt={teacher.full_name} className={styles.avatarImg}/>
                ) : (
                  <div className={styles.avatarFallback}>
                    {teacher.full_name.charAt(0)}
                  </div>
                )}
                <span className={`${styles.onlineDot} ${teacher.status === 'active' ? styles.online : styles.offline}`} />
              </div>

              <PermissionGate permission="teacher.update">
                <button
                  className={styles.photoUploadBtn}
                  onClick={() => photoRef.current?.click()}
                  disabled={uploadingPhoto}
                  title="Upload profile photo"
                >
                  {uploadingPhoto ? <span className={styles.miniSpinner}/> : <Upload size={13}/>}
                </button>
              </PermissionGate>
              <input ref={photoRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handlePhotoUpload}/>
            </div>

            {/* Main Info */}
            <div className={styles.heroText}>
              <div className={styles.roleTagRow}>
                <span className={styles.roleBadge}>
                  {roleConfig.icon} {roleConfig.label}
                </span>
                <span className={`${styles.statusBadge} ${teacher.status === 'active' ? styles.statusActive : styles.statusInactive}`}>
                  {teacher.status === 'active' && <BadgeCheck size={13}/>}
                  {teacher.status.replace('_',' ')}
                </span>
                {teacher.employee_type && (
                  <span className={styles.empTypeBadge}>
                    {teacher.employee_type.replace('_',' ')}
                  </span>
                )}
              </div>

              <h1 className={styles.heroName}>
                {teacher.salutation ? `${teacher.salutation} ` : ''}{teacher.full_name}
              </h1>

              {teacher.full_name_marathi && (
                <p className={styles.heroNameMarathi}>{teacher.full_name_marathi}</p>
              )}

              <div className={styles.designationRow}>
                <span className={styles.designationText}>{teacher.designation}</span>
                {teacher.department && <span className={styles.deptDivider}>•</span>}
                {teacher.department && <span className={styles.deptText}>{teacher.department}</span>}
              </div>

              {/* Quick Contact Chips */}
              <div className={styles.contactChipsRow}>
                <span className={styles.idChip}>
                  <CreditCard size={13}/> EMP ID: <strong>{teacher.employee_id}</strong>
                </span>

                {teacher.mobile && (
                  <a href={`tel:${teacher.mobile}`} className={styles.contactChip}>
                    <Phone size={13}/> {teacher.mobile}
                  </a>
                )}

                {teacher.email && (
                  <a href={`mailto:${teacher.email}`} className={styles.contactChip}>
                    <Mail size={13}/> {teacher.email}
                  </a>
                )}

                {teacher.district && (
                  <span className={styles.contactChip}>
                    <MapPin size={13}/> {teacher.district}, {teacher.state || 'MH'}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Quick Metrics Panel */}
          <div className={styles.metricsPanel}>
            <div className={styles.metricBox}>
              <span className={styles.metricValue}>{yearsService ? `${yearsService} yrs` : 'N/A'}</span>
              <span className={styles.metricLabel}>Total Service</span>
            </div>

            <div className={styles.metricBox}>
              <span className={styles.metricValue}>
                {teacher.casual_leave_balance != null ? teacher.casual_leave_balance : 12}
              </span>
              <span className={styles.metricLabel}>Casual Leaves</span>
            </div>

            <div className={styles.metricBox}>
              <span className={styles.metricValue}>
                {teacher.highest_qualification || 'Degree'}
              </span>
              <span className={styles.metricLabel}>Qualification</span>
            </div>

            <div className={styles.metricBox}>
              <span className={styles.metricValue}>
                {yearsToRetirement !== null ? `${yearsToRetirement} yrs` : 'Active'}
              </span>
              <span className={styles.metricLabel}>To Retirement</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Navigation Tabs ─────────────────────────────────── */}
      <div className={styles.tabContainer}>
        <div className={styles.tabBar}>
          {[
            { key: 'profile', label: 'Overview', icon: <Shield size={15}/> },
            { key: 'qualifications', label: `Qualifications (${qualifications.length})`, icon: <GraduationCap size={15}/> },
            { key: 'experience', label: `Experience (${experience.length})`, icon: <Briefcase size={15}/> },
            { key: 'leave', label: `Leaves & Balances (${leaves.length})`, icon: <CalendarOff size={15}/> },
            ...(teacher.employee_type === 'teaching' || teacher.subjects ? [{ key: 'schedule', label: 'Work & Schedule', icon: <Clock size={15}/> }] : []),
            { key: 'service', label: 'Service Book (सेवा पुस्तिका)', icon: <BookOpen size={15}/> },
            { key: 'idcard', label: 'Digital ID Card', icon: <QrCode size={15}/> },
          ].map(t => (
            <button
              key={t.key}
              className={`${styles.tabBtn} ${tab === t.key ? styles.tabActive : ''}`}
              onClick={() => setTab(t.key as Tab)}
            >
              {t.icon}
              <span>{t.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── TAB 1: OVERVIEW ─────────────────────────────────── */}
      {tab === 'profile' && (
        <div className={styles.tabContentGrid}>
          {/* Personal Information */}
          <Section title="Personal Information" icon={<Shield size={18}/>}>
            <InfoCard label="Full Name (English)" value={teacher.full_name}/>
            <InfoCard label="Full Name (Marathi)" value={teacher.full_name_marathi}/>
            <InfoCard label="Date of Birth" value={teacher.dob ? new Date(teacher.dob).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : null}/>
            <InfoCard label="Gender" value={teacher.gender}/>
            <InfoCard label="Blood Group" value={teacher.blood_group}/>
            <InfoCard label="Marital Status" value={teacher.marital_status}/>
            <InfoCard label="Nationality" value={teacher.nationality || 'Indian'}/>
            <InfoCard label="Religion" value={teacher.religion}/>
            <InfoCard label="Caste & Category" value={teacher.caste ? `${teacher.caste} (${teacher.category || 'GEN'})` : teacher.category}/>
            <InfoCard label="Mother Tongue" value={teacher.mother_tongue}/>
            <InfoCard
              label="Aadhaar Number"
              value={teacher.aadhaar_number}
              copyable
              isMasked={!showAadhaar}
              onToggleMask={() => setShowAadhaar(!showAadhaar)}
            />
            <InfoCard
              label="PAN Card Number"
              value={teacher.pan_number}
              copyable
              isMasked={!showPan}
              onToggleMask={() => setShowPan(!showPan)}
            />
          </Section>

          {/* Employment Details */}
          <Section title="Employment & Role" icon={<Briefcase size={18}/>}>
            <InfoCard label="Employee ID" value={teacher.employee_id} copyable/>
            <InfoCard label="Designation" value={teacher.designation}/>
            <InfoCard label="Employee Type" value={teacher.employee_type?.replace('_',' ')}/>
            <InfoCard label="Department" value={teacher.department}/>
            <InfoCard label="Date of Joining" value={teacher.date_of_joining ? new Date(teacher.date_of_joining).toLocaleDateString('en-IN') : null}/>
            <InfoCard label="Date of Confirmation" value={teacher.date_of_confirmation ? new Date(teacher.date_of_confirmation).toLocaleDateString('en-IN') : null}/>
            <InfoCard label="Highest Qualification" value={teacher.highest_qualification}/>
            <InfoCard label="Specialization" value={teacher.specialization}/>
            <InfoCard label="SARAL Teacher ID" value={teacher.teacher_saral_id} copyable/>
            <InfoCard label="Assigned Classes" value={teacher.classes_assigned}/>
            <InfoCard label="Assigned Subjects" value={teacher.subjects}/>
          </Section>

          {/* Contact Details */}
          <Section title="Contact & Address" icon={<MapPin size={18}/>}>
            <InfoCard label="Mobile Number" value={teacher.mobile} copyable/>
            <InfoCard label="Alternate Mobile" value={teacher.mobile_alt} copyable/>
            <InfoCard label="Personal Email" value={teacher.email} copyable/>
            <InfoCard label="Official Email" value={teacher.email_official} copyable/>
            <InfoCard label="Address Line 1" value={teacher.address_line1}/>
            <InfoCard label="Address Line 2" value={teacher.address_line2}/>
            <InfoCard label="Village / Taluka" value={[teacher.village, teacher.taluka].filter(Boolean).join(', ')}/>
            <InfoCard label="District & State" value={[teacher.district, teacher.state].filter(Boolean).join(', ')}/>
            <InfoCard label="Pincode" value={teacher.pincode}/>
            <InfoCard label="Emergency Contact" value={teacher.emergency_contact_name ? `${teacher.emergency_contact_name} (${teacher.emergency_contact_relation || 'Relative'}) - ${teacher.emergency_contact_mobile || ''}` : null}/>
          </Section>

          {/* Bank & Financial Accounts */}
          <Section title="Bank & Financial Accounts" icon={<CreditCard size={18}/>}>
            <InfoCard label="Bank Name" value={teacher.bank_name}/>
            <InfoCard
              label="Account Number"
              value={teacher.bank_account_number}
              copyable
              isMasked={!showBankAcc}
              onToggleMask={() => setShowBankAcc(!showBankAcc)}
            />
            <InfoCard label="IFSC Code" value={teacher.bank_ifsc} copyable/>
            <InfoCard label="Branch Name" value={teacher.bank_branch}/>
            <InfoCard label="Basic Salary" value={teacher.basic_salary ? `₹ ${Number(teacher.basic_salary).toLocaleString('en-IN')}` : null}/>
            <InfoCard label="Pay Scale" value={teacher.pay_scale}/>
            <InfoCard label="PF Account No." value={teacher.pf_number} copyable/>
            <InfoCard label="GPF Number" value={teacher.gpf_number} copyable/>
            <InfoCard label="DCPS Account" value={teacher.dcps_account} copyable/>
            <InfoCard label="PRAN Number" value={teacher.pran_number} copyable/>
          </Section>
        </div>
      )}

      {/* ── TAB 2: QUALIFICATIONS ────────────────────────────── */}
      {tab === 'qualifications' && (
        <div className={styles.tabContentCard}>
          <div className={styles.tabCardHeader}>
            <div>
              <h2>Academic & Professional Qualifications</h2>
              <p>Degrees, certificates, and academic credentials registered for this staff member.</p>
            </div>
            <PermissionGate permission="teacher.update">
              <button className={styles.primaryAddBtn} onClick={() => setShowQualModal(true)}>
                <Plus size={15}/> Add Qualification
              </button>
            </PermissionGate>
          </div>

          {qualifications.length === 0 ? (
            <div className={styles.emptyState}>
              <GraduationCap size={48}/>
              <h3>No qualifications added yet</h3>
              <p>Click "Add Qualification" to record degrees, diplomas, or certifications.</p>
            </div>
          ) : (
            <div className={styles.qualGrid}>
              {qualifications.map(q => (
                <div key={q.id} className={styles.qualCard}>
                  <div className={styles.qualCardTop}>
                    <div className={styles.qualIconBox}>
                      <GraduationCap size={20}/>
                    </div>
                    <div className={styles.qualCardHeader}>
                      <h4 className={styles.qualDegree}>{q.degree}</h4>
                      {q.subject && <p className={styles.qualSubject}>{q.subject}</p>}
                    </div>
                    <PermissionGate permission="teacher.update">
                      <button className={styles.deleteIconButton} onClick={() => deleteQualification(q.id)} title="Delete qualification">
                        <Trash2 size={14}/>
                      </button>
                    </PermissionGate>
                  </div>

                  <div className={styles.qualCardFooter}>
                    {q.university && (
                      <span className={styles.qualUniversity}>
                        <Building2 size={13}/> {q.university}
                      </span>
                    )}
                    <div className={styles.qualTags}>
                      {q.year_of_passing && <span className={styles.qualTag}>{q.year_of_passing}</span>}
                      {q.grade_percentage && <span className={`${styles.qualTag} ${styles.tagHighlight}`}>{q.grade_percentage}</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── TAB 3: EXPERIENCE ────────────────────────────────── */}
      {tab === 'experience' && (
        <div className={styles.tabContentCard}>
          <div className={styles.tabCardHeader}>
            <div>
              <h2>Work Experience & Career History</h2>
              <p>Previous roles, organizations, and tenure prior to joining.</p>
            </div>
            <PermissionGate permission="teacher.update">
              <button className={styles.primaryAddBtn} onClick={() => setShowExpModal(true)}>
                <Plus size={15}/> Add Experience
              </button>
            </PermissionGate>
          </div>

          {experience.length === 0 ? (
            <div className={styles.emptyState}>
              <Briefcase size={48}/>
              <h3>No previous work experience recorded</h3>
              <p>Add past work history to maintain complete service profiles.</p>
            </div>
          ) : (
            <div className={styles.timelineContainer}>
              {experience.map(exp => (
                <div key={exp.id} className={styles.timelineCard}>
                  <div className={styles.timelineDot} />
                  <div className={styles.timelineBody}>
                    <div className={styles.timelineHeader}>
                      <div>
                        <h4 className={styles.expOrgName}>{exp.organization}</h4>
                        {exp.designation && <p className={styles.expDesigTitle}>{exp.designation}</p>}
                      </div>
                      {exp.is_current ? (
                        <span className={styles.currentBadge}>Current Position</span>
                      ) : (
                        <span className={styles.expPeriodTag}>
                          <Calendar size={12}/>
                          {exp.from_date ? new Date(exp.from_date).toLocaleDateString('en-IN') : 'Start'}
                          {' → '}
                          {exp.to_date ? new Date(exp.to_date).toLocaleDateString('en-IN') : 'End'}
                        </span>
                      )}
                    </div>
                    {exp.description && <p className={styles.expDescriptionText}>{exp.description}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── TAB 4: LEAVE MANAGEMENT ─────────────────────────── */}
      {tab === 'leave' && (
        <div className={styles.leaveTabWrapper}>
          {/* Leave Balances Grid */}
          <div className={styles.leaveBalanceSection}>
            <h3>Current Leave Balances</h3>
            <div className={styles.balanceGrid}>
              {[
                { label: 'Casual Leave (CL)', val: teacher.casual_leave_balance ?? 12, max: 12, color: 'linear-gradient(135deg, #3b82f6, #1d4ed8)' },
                { label: 'Medical Leave (ML)', val: teacher.medical_leave_balance ?? 10, max: 10, color: 'linear-gradient(135deg, #10b981, #047857)' },
                { label: 'Earned Leave (EL)', val: teacher.earned_leave_balance ?? 0, max: 30, color: 'linear-gradient(135deg, #8b5cf6, #6d28d9)' },
                { label: 'Half Pay Leave (HPL)', val: teacher.half_pay_leave_balance ?? 20, max: 20, color: 'linear-gradient(135deg, #f59e0b, #b45309)' },
              ].map(b => (
                <div key={b.label} className={styles.balanceCard}>
                  <div className={styles.balanceHeader}>
                    <span className={styles.balanceTitle}>{b.label}</span>
                    <span className={styles.balanceNumber}>{b.val}</span>
                  </div>
                  <div className={styles.progressBarTrack}>
                    <div
                      className={styles.progressBarFill}
                      style={{
                        width: `${Math.min(100, (b.val / Math.max(1, b.max)) * 100)}%`,
                        background: b.color
                      }}
                    />
                  </div>
                  <span className={styles.balanceSubtext}>{b.val} days remaining of {b.max} allocated</span>
                </div>
              ))}
            </div>
          </div>

          {/* Leave History */}
          <div className={styles.tabContentCard}>
            <div className={styles.tabCardHeader}>
              <div>
                <h2>Leave Application History</h2>
                <p>Track applied, approved, or pending leave requests.</p>
              </div>
              <PermissionGate permission="teacher.leave.apply">
                <button className={styles.primaryAddBtn} onClick={() => setShowLeaveModal(true)}>
                  <CalendarOff size={15}/> Apply Leave
                </button>
              </PermissionGate>
            </div>

            {leaves.length === 0 ? (
              <div className={styles.emptyState}>
                <CalendarOff size={48}/>
                <h3>No leave records found</h3>
                <p>Applied leave history will appear here once submitted.</p>
              </div>
            ) : (
              <div className={styles.leaveHistoryList}>
                {leaves.map(l => (
                  <div key={l.id} className={styles.leaveHistoryRow}>
                    <div className={styles.leaveMainInfo}>
                      <div className={styles.leaveTypeHeader}>
                        <span className={styles.leaveTypeTitle}>{l.leave_type.replace('_',' ')} Leave</span>
                        <span className={`${styles.leaveStatusPill} ${leaveStatusClass(l.status)}`}>
                          {l.status === 'approved' && <CheckCircle2 size={12}/>}
                          {l.status === 'rejected' && <XCircle size={12}/>}
                          {l.status === 'pending' && <AlertCircle size={12}/>}
                          {l.status}
                        </span>
                      </div>
                      <div className={styles.leaveDatesRow}>
                        <span>
                          <Calendar size={13}/>
                          {new Date(l.from_date).toLocaleDateString('en-IN')} → {new Date(l.to_date).toLocaleDateString('en-IN')}
                        </span>
                        <span className={styles.leaveDaysPill}>{l.days} {l.days === 1 ? 'day' : 'days'}</span>
                      </div>
                      {l.reason && <p className={styles.leaveReasonText}>"{l.reason}"</p>}
                    </div>

                    {l.rejection_reason && (
                      <div className={styles.leaveRejectNote}>
                        <strong>Rejection Note:</strong> {l.rejection_reason}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── TAB 5: WORK & SCHEDULE ─────────────────────────── */}
      {tab === 'schedule' && (
        <div className={styles.tabContentCard}>
          <div className={styles.tabCardHeader}>
            <div>
              <h2>Workload & Academic Assignments</h2>
              <p>Assigned subjects, classes, timetable schedule, and academic duties.</p>
            </div>
            <button className={styles.secondaryActionBtn} onClick={() => navigate('/timetable')}>
              <Clock size={15}/> View Timetable Module
            </button>
          </div>

          <div className={styles.scheduleGrid}>
            <div className={styles.scheduleCard}>
              <h4><BookOpen size={16}/> Assigned Subjects</h4>
              <p className={styles.scheduleSubtitle}>Subjects mapped for teaching sessions:</p>
              {teacher.subjects ? (
                <div className={styles.chipCloud}>
                  {teacher.subjects.split(',').map((sub, i) => (
                    <span key={i} className={styles.subjectTag}>📚 {sub.trim()}</span>
                  ))}
                </div>
              ) : (
                <p className={styles.mutedText}>No subjects explicitly assigned.</p>
              )}
            </div>

            <div className={styles.scheduleCard}>
              <h4><GraduationCap size={16}/> Classes & Divisions</h4>
              <p className={styles.scheduleSubtitle}>Classroom responsibilities:</p>
              {teacher.classes_assigned ? (
                <div className={styles.chipCloud}>
                  {teacher.classes_assigned.split(',').map((cls, i) => (
                    <span key={i} className={styles.classTag}>🏫 Class {cls.trim()}</span>
                  ))}
                </div>
              ) : (
                <p className={styles.mutedText}>No classes explicitly assigned.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 6: SERVICE BOOK ─────────────────────────────── */}
      {tab === 'service' && (
        <div className={styles.tabContentCard}>
          <div className={styles.tabCardHeader}>
            <div>
              <h2>Service Book Summary (सेवा पुस्तिका)</h2>
              <p>Official government ledger records and service tenure details.</p>
            </div>
            <button className={styles.secondaryActionBtn} onClick={() => window.print()}>
              <Printer size={15}/> Print Service Record
            </button>
          </div>

          <div className={styles.serviceBookGrid}>
            <InfoCard label="Employee Unique ID" value={teacher.employee_id} copyable/>
            <InfoCard label="Designation & Cadre" value={teacher.designation}/>
            <InfoCard label="Employment Type" value={teacher.employee_type}/>
            <InfoCard label="Date of First Appointment" value={teacher.date_of_joining ? new Date(teacher.date_of_joining).toLocaleDateString('en-IN') : null}/>
            <InfoCard label="Date of Confirmation" value={teacher.date_of_confirmation ? new Date(teacher.date_of_confirmation).toLocaleDateString('en-IN') : null}/>
            <InfoCard label="Superannuation / Retirement Date" value={teacher.date_of_retirement ? new Date(teacher.date_of_retirement).toLocaleDateString('en-IN') : null}/>
            <InfoCard label="Years of Active Service" value={yearsService ? `${yearsService} Years` : null}/>
            <InfoCard label="Pay Scale Band" value={teacher.pay_scale}/>
            <InfoCard label="Basic Monthly Pay" value={teacher.basic_salary ? `₹ ${Number(teacher.basic_salary).toLocaleString('en-IN')}` : null}/>
            <InfoCard label="Provident Fund (PF) No." value={teacher.pf_number} copyable/>
            <InfoCard label="General PF (GPF) No." value={teacher.gpf_number} copyable/>
            <InfoCard label="DCPS Account No." value={teacher.dcps_account} copyable/>
            <InfoCard label="PRAN (NPS) Number" value={teacher.pran_number} copyable/>
            <InfoCard label="SARAL Portal ID" value={teacher.teacher_saral_id} copyable/>
          </div>
        </div>
      )}

      {/* ── TAB 7: DIGITAL ID CARD PREVIEW ──────────────────── */}
      {(tab === 'idcard' || showIDCardModal) && (
        <div className={styles.idCardModalOverlay} onClick={() => setShowIDCardModal(false)}>
          <div className={styles.idCardModalContent} onClick={e => e.stopPropagation()}>
            <div className={styles.idCardModalHeader}>
              <div>
                <h3>Official Employee ID Card</h3>
                <p>Digital preview & printable institutional credential card.</p>
              </div>
              <div className={styles.idCardHeaderBtns}>
                <button className={styles.printIDCardBtn} onClick={() => window.print()}>
                  <Printer size={15}/> Print ID Card
                </button>
                <button className={styles.closeModalBtn} onClick={() => setShowIDCardModal(false)}>
                  <X size={18}/>
                </button>
              </div>
            </div>

            <div className={styles.idCardPreviewContainer}>
              {/* Front Card */}
              <div className={styles.idCardFront}>
                <div className={styles.idCardHeaderBanner}>
                  <Building2 size={16}/>
                  <div>
                    <span className={styles.schoolName}>VIDYASETU ACADEMY</span>
                    <span className={styles.schoolSub}>Govt. Recognized Institution</span>
                  </div>
                </div>

                <div className={styles.idCardBody}>
                  <div className={styles.idCardPhotoBox}>
                    {photoUrl ? (
                      <img src={photoUrl} alt={teacher.full_name}/>
                    ) : (
                      <div className={styles.idCardPhotoFallback}>
                        {teacher.full_name.charAt(0)}
                      </div>
                    )}
                  </div>

                  <h3 className={styles.idCardEmpName}>{teacher.salutation ? `${teacher.salutation} ` : ''}{teacher.full_name}</h3>
                  <p className={styles.idCardEmpDesig}>{teacher.designation}</p>
                  <span className={styles.idCardEmpTypeTag}>{teacher.employee_type.replace('_',' ')}</span>

                  <div className={styles.idCardDetailsGrid}>
                    <div><span>EMP ID:</span> <strong>{teacher.employee_id}</strong></div>
                    <div><span>BLOOD:</span> <strong>{teacher.blood_group || 'O+'}</strong></div>
                    <div><span>MOBILE:</span> <strong>{teacher.mobile || 'N/A'}</strong></div>
                    <div><span>DEPT:</span> <strong>{teacher.department || 'General'}</strong></div>
                  </div>
                </div>

                <div className={styles.idCardFooter}>
                  <span className={styles.authorizedSig}>Authorized Signatory</span>
                </div>
              </div>

              {/* Back Card */}
              <div className={styles.idCardBack}>
                <div className={styles.idCardHeaderBannerBack}>
                  <span>TERMS & EMERGENCY CONTACT</span>
                </div>

                <div className={styles.idCardBackBody}>
                  <p className={styles.idCardAddress}>
                    <strong>Address:</strong> {[teacher.address_line1, teacher.district, teacher.state, teacher.pincode].filter(Boolean).join(', ') || 'School Campus Address'}
                  </p>

                  <div className={styles.idCardEmergencyRow}>
                    <span>Emergency Contact:</span>
                    <strong>{teacher.emergency_contact_mobile || teacher.mobile || 'School Desk'}</strong>
                  </div>

                  <div className={styles.idCardQRSection}>
                    <div className={styles.qrCodeGraphic}>
                      <QrCode size={48}/>
                    </div>
                    <span className={styles.qrCodeCaption}>Scan to Verify Credential</span>
                  </div>
                </div>

                <div className={styles.idCardFooterBack}>
                  <span>If found, please return to VidyaSetu Office</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: ADD QUALIFICATION ────────────────────────── */}
      {showQualModal && (
        <div className={styles.modalOverlay} onClick={() => setShowQualModal(false)}>
          <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>Add Qualification</h3>
              <button onClick={() => setShowQualModal(false)}><X size={18}/></button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.modalField}>
                <label>Degree / Certificate *</label>
                <input
                  type="text"
                  placeholder="e.g. B.Ed., M.A. Mathematics, Ph.D."
                  value={newQual.degree}
                  onChange={e => setNewQual(p => ({ ...p, degree: e.target.value }))}
                />
              </div>
              <div className={styles.modalField}>
                <label>Subject / Specialization</label>
                <input
                  type="text"
                  placeholder="e.g. Science, Marathi, Literature"
                  value={newQual.subject}
                  onChange={e => setNewQual(p => ({ ...p, subject: e.target.value }))}
                />
              </div>
              <div className={styles.modalField}>
                <label>University / Board</label>
                <input
                  type="text"
                  placeholder="e.g. Mumbai University, Pune Board"
                  value={newQual.university}
                  onChange={e => setNewQual(p => ({ ...p, university: e.target.value }))}
                />
              </div>
              <div className={styles.modalRow}>
                <div className={styles.modalField}>
                  <label>Year of Passing</label>
                  <input
                    type="number"
                    placeholder="e.g. 2018"
                    value={newQual.year_of_passing}
                    onChange={e => setNewQual(p => ({ ...p, year_of_passing: e.target.value }))}
                  />
                </div>
                <div className={styles.modalField}>
                  <label>Grade / Percentage</label>
                  <input
                    type="text"
                    placeholder="e.g. 78.5% or First Class"
                    value={newQual.grade_percentage}
                    onChange={e => setNewQual(p => ({ ...p, grade_percentage: e.target.value }))}
                  />
                </div>
              </div>
            </div>
            <div className={styles.modalFooter}>
              <button className={styles.cancelBtn} onClick={() => setShowQualModal(false)}>Cancel</button>
              <button className={styles.submitBtn} onClick={addQualification}><Check size={15}/> Save Qualification</button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: ADD EXPERIENCE ───────────────────────────── */}
      {showExpModal && (
        <div className={styles.modalOverlay} onClick={() => setShowExpModal(false)}>
          <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>Add Work Experience</h3>
              <button onClick={() => setShowExpModal(false)}><X size={18}/></button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.modalField}>
                <label>Organization / School Name *</label>
                <input
                  type="text"
                  placeholder="e.g. St. Xavier High School"
                  value={newExp.organization}
                  onChange={e => setNewExp(p => ({ ...p, organization: e.target.value }))}
                />
              </div>
              <div className={styles.modalField}>
                <label>Designation</label>
                <input
                  type="text"
                  placeholder="e.g. Assistant Teacher"
                  value={newExp.designation}
                  onChange={e => setNewExp(p => ({ ...p, designation: e.target.value }))}
                />
              </div>
              <div className={styles.modalRow}>
                <div className={styles.modalField}>
                  <label>From Date</label>
                  <input
                    type="date"
                    value={newExp.from_date}
                    onChange={e => setNewExp(p => ({ ...p, from_date: e.target.value }))}
                  />
                </div>
                <div className={styles.modalField}>
                  <label>To Date</label>
                  <input
                    type="date"
                    disabled={newExp.is_current}
                    value={newExp.to_date}
                    onChange={e => setNewExp(p => ({ ...p, to_date: e.target.value }))}
                  />
                </div>
              </div>
              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={newExp.is_current}
                  onChange={e => setNewExp(p => ({ ...p, is_current: e.target.checked, to_date: '' }))}
                />
                <span>Currently working in this role</span>
              </label>
              <div className={styles.modalField}>
                <label>Description / Key Responsibilities</label>
                <textarea
                  rows={3}
                  placeholder="Brief summary of duties..."
                  value={newExp.description}
                  onChange={e => setNewExp(p => ({ ...p, description: e.target.value }))}
                />
              </div>
            </div>
            <div className={styles.modalFooter}>
              <button className={styles.cancelBtn} onClick={() => setShowExpModal(false)}>Cancel</button>
              <button className={styles.submitBtn} onClick={addExperience}><Check size={15}/> Save Experience</button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: APPLY LEAVE ─────────────────────────────── */}
      {showLeaveModal && (
        <div className={styles.modalOverlay} onClick={() => setShowLeaveModal(false)}>
          <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>Apply for Leave</h3>
              <button onClick={() => setShowLeaveModal(false)}><X size={18}/></button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.modalField}>
                <label>Leave Category</label>
                <select
                  value={newLeave.leave_type}
                  onChange={e => setNewLeave(p => ({ ...p, leave_type: e.target.value }))}
                >
                  <option value="casual">Casual Leave (CL)</option>
                  <option value="medical">Medical Leave (ML)</option>
                  <option value="earned">Earned Leave (EL)</option>
                  <option value="half_pay">Half Pay Leave (HPL)</option>
                  <option value="maternity">Maternity Leave</option>
                  <option value="paternity">Paternity Leave</option>
                  <option value="special">Special Duty Leave</option>
                  <option value="unpaid">Unpaid Leave</option>
                </select>
              </div>
              <div className={styles.modalRow}>
                <div className={styles.modalField}>
                  <label>From Date *</label>
                  <input
                    type="date"
                    value={newLeave.from_date}
                    onChange={e => setNewLeave(p => ({ ...p, from_date: e.target.value }))}
                  />
                </div>
                <div className={styles.modalField}>
                  <label>To Date *</label>
                  <input
                    type="date"
                    value={newLeave.to_date}
                    onChange={e => setNewLeave(p => ({ ...p, to_date: e.target.value }))}
                  />
                </div>
              </div>
              <div className={styles.modalField}>
                <label>Reason for Leave</label>
                <textarea
                  rows={3}
                  placeholder="Explain reason for leave..."
                  value={newLeave.reason}
                  onChange={e => setNewLeave(p => ({ ...p, reason: e.target.value }))}
                />
              </div>
            </div>
            <div className={styles.modalFooter}>
              <button className={styles.cancelBtn} onClick={() => setShowLeaveModal(false)}>Cancel</button>
              <button className={styles.submitBtn} onClick={applyLeave}><Check size={15}/> Submit Leave Request</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
