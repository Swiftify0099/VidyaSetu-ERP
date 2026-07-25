import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ChevronLeft, Edit2, Upload, Plus, Trash2, Check, X,
  Phone, Mail, MapPin, Calendar, Award, CreditCard,
  BookOpen, Briefcase, CalendarOff, GraduationCap, Shield,
} from 'lucide-react';
import toast from 'react-hot-toast';
import teacherService, {
  Teacher, Qualification, Experience, LeaveRecord,
} from '../../services/teacherService';
import PermissionGate from '../../components/ui/PermissionGate';
import styles from './TeacherProfilePage.module.css';

type Tab = 'profile' | 'qualifications' | 'experience' | 'leave' | 'service';

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

  // Add Qualification modal
  const [showQualModal, setShowQualModal] = useState(false);
  const [newQual, setNewQual] = useState({ degree: '', subject: '', university: '', year_of_passing: '', grade_percentage: '' });

  // Add Experience modal
  const [showExpModal, setShowExpModal] = useState(false);
  const [newExp, setNewExp] = useState({ organization: '', designation: '', from_date: '', to_date: '', is_current: false, description: '' });

  // Leave modal
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [newLeave, setNewLeave] = useState({ leave_type: 'casual', from_date: '', to_date: '', reason: '' });

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
        teacherService.getQualifications(Number(id)),
        teacherService.getExperience(Number(id)),
        teacherService.getLeaves(Number(id)),
      ]);
      setQualifications(quals);
      setExperience(exps);
      setLeaves(lvs);
    } catch { toast.error('Failed to load profile.'); }
    finally { setLoading(false); }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !teacher) return;
    setUploadingPhoto(true);
    try {
      await teacherService.uploadPhoto(teacher.id, file);
      toast.success('Photo updated!');
      loadAll();
    } catch { toast.error('Upload failed.'); }
    finally { setUploadingPhoto(false); }
  };

  const addQualification = async () => {
    if (!teacher || !newQual.degree) { toast.error('Degree is required.'); return; }
    try {
      await teacherService.addQualification(teacher.id, {
        ...newQual,
        year_of_passing: newQual.year_of_passing ? Number(newQual.year_of_passing) : undefined,
        is_current: false,
      } as any);
      toast.success('Qualification added.');
      setShowQualModal(false);
      setNewQual({ degree: '', subject: '', university: '', year_of_passing: '', grade_percentage: '' });
      setQualifications(await teacherService.getQualifications(teacher.id));
    } catch { toast.error('Failed to add qualification.'); }
  };

  const deleteQualification = async (qualId: number) => {
    if (!confirm('Remove this qualification?')) return;
    try {
      await teacherService.deleteQualification(qualId);
      if (teacher) setQualifications(await teacherService.getQualifications(teacher.id));
      toast.success('Removed.');
    } catch { toast.error('Failed to remove.'); }
  };

  const addExperience = async () => {
    if (!teacher || !newExp.organization) { toast.error('Organization is required.'); return; }
    try {
      await teacherService.addExperience(teacher.id, newExp as any);
      toast.success('Experience added.');
      setShowExpModal(false);
      setNewExp({ organization: '', designation: '', from_date: '', to_date: '', is_current: false, description: '' });
      setExperience(await teacherService.getExperience(teacher.id));
    } catch { toast.error('Failed to add experience.'); }
  };

  const applyLeave = async () => {
    if (!teacher || !newLeave.from_date || !newLeave.to_date) {
      toast.error('Please fill all required leave fields.'); return;
    }
    try {
      await teacherService.applyLeave(teacher.id, newLeave);
      toast.success('Leave applied! Awaiting approval.');
      setShowLeaveModal(false);
      setNewLeave({ leave_type: 'casual', from_date: '', to_date: '', reason: '' });
      setLeaves(await teacherService.getLeaves(teacher.id));
    } catch { toast.error('Failed to apply leave.'); }
  };

  const photoUrl = teacher?.photo_path ? `${import.meta.env.VITE_STORAGE_URL}/${teacher.photo_path}` : null;

  const InfoRow = ({ label, value }: { label: string; value?: string | number | null }) =>
    value != null && value !== '' ? (
      <div className={styles.infoRow}>
        <span className={styles.infoLabel}>{label}</span>
        <span className={styles.infoValue}>{value}</span>
      </div>
    ) : null;

  const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div className={styles.section}>
      <h3 className={styles.sectionTitle}>{title}</h3>
      <div className={styles.sectionBody}>{children}</div>
    </div>
  );

  const leaveStatusClass = (s: string) => {
    const m: Record<string, string> = {
      pending: styles.tagWarning,
      approved: styles.tagSuccess,
      rejected: styles.tagDanger,
    };
    return m[s] || styles.tagMuted;
  };

  if (loading) return <div className={styles.loadingShell}><div className={styles.loadingPulse} /></div>;
  if (!teacher) return null;

  const yearsService = teacher.date_of_joining
    ? Math.floor((Date.now() - new Date(teacher.date_of_joining).getTime()) / (1000 * 60 * 60 * 24 * 365))
    : null;

  return (
    <div className={styles.page}>
      <button className={styles.backBtn} onClick={() => navigate('/teachers')}>
        <ChevronLeft size={16}/> Back to Staff
      </button>

      {/* ── Profile Header ─────────────────────────────────── */}
      <div className={styles.profileCard}>
        <div className={styles.profileLeft}>
          <div className={styles.photoWrap}>
            <div className={styles.photo}>
              {photoUrl ? <img src={photoUrl} alt={teacher.full_name}/> : <span>{teacher.full_name.charAt(0)}</span>}
            </div>
            <PermissionGate permission="teacher.update">
              <button className={styles.photoBtn} onClick={() => photoRef.current?.click()} disabled={uploadingPhoto} title="Upload photo">
                {uploadingPhoto ? <span className={styles.miniSpinner}/> : <Upload size={12}/>}
              </button>
            </PermissionGate>
            <input ref={photoRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handlePhotoUpload}/>
          </div>

          <div className={styles.profileInfo}>
            <div className={styles.badges}>
              <span className={`${styles.badge} ${teacher.status === 'active' ? styles.badgeActive : styles.badgeInactive}`}>{teacher.status.replace('_',' ')}</span>
              <span className={`${styles.badge} ${styles.badgeType}`}>{teacher.employee_type.replace('_',' ')}</span>
              {teacher.category && <span className={`${styles.badge} ${styles.badgeCategory}`}>{teacher.category}</span>}
            </div>
            <h1 className={styles.name}>
              {teacher.salutation ? `${teacher.salutation} ` : ''}{teacher.full_name}
            </h1>
            {teacher.full_name_marathi && <p className={styles.nameMr}>{teacher.full_name_marathi}</p>}
            <p className={styles.designation}>{teacher.designation}{teacher.department ? ` · ${teacher.department}` : ''}</p>

            <div className={styles.chips}>
              <span className={styles.chip}><Briefcase size={13}/> {teacher.employee_id}</span>
              {teacher.dob && <span className={styles.chip}><Calendar size={13}/> {new Date(teacher.dob).toLocaleDateString('en-IN')}</span>}
              {yearsService !== null && <span className={styles.chip}><Award size={13}/> {yearsService} yrs service</span>}
              {teacher.highest_qualification && <span className={styles.chip}><GraduationCap size={13}/> {teacher.highest_qualification}</span>}
            </div>
            {teacher.subjects && <p className={styles.subjects}>📚 {teacher.subjects}</p>}
            {teacher.mobile && <p className={styles.contact}><Phone size={13}/> {teacher.mobile}</p>}
            {teacher.email && <p className={styles.contact}><Mail size={13}/> {teacher.email}</p>}
          </div>
        </div>

        <div className={styles.profileRight}>
          {/* Leave Balances */}
          <div className={styles.leaveBalances}>
            <div className={styles.leaveTitle}>Leave Balances</div>
            {[
              { label: 'Casual', value: teacher.casual_leave_balance ?? 12, color: 'var(--color-info)' },
              { label: 'Medical', value: teacher.medical_leave_balance ?? 10, color: 'var(--color-success)' },
              { label: 'Earned', value: teacher.earned_leave_balance ?? 0, color: 'var(--color-primary)' },
              { label: 'Half Pay', value: teacher.half_pay_leave_balance ?? 20, color: 'var(--color-warning)' },
            ].map(l => (
              <div key={l.label} className={styles.leaveItem} style={{ '--lc': l.color } as React.CSSProperties}>
                <span className={styles.leaveLabel}>{l.label}</span>
                <span className={styles.leaveValue}>{l.value}</span>
              </div>
            ))}
          </div>

          <div className={styles.actionBtns}>
            <PermissionGate permission="teacher.update">
              <button className={styles.actionBtn} onClick={() => navigate(`/teachers/${teacher.id}/edit`)}>
                <Edit2 size={15}/> Edit Profile
              </button>
            </PermissionGate>
            <PermissionGate permission="teacher.leave.apply">
              <button className={styles.actionBtn} onClick={() => setShowLeaveModal(true)}>
                <CalendarOff size={15}/> Apply Leave
              </button>
            </PermissionGate>
          </div>
        </div>
      </div>

      {/* ── Tabs ───────────────────────────────────────────── */}
      <div className={styles.tabBar}>
        {([
          { key: 'profile', label: 'Profile', icon: <Shield size={14}/> },
          { key: 'qualifications', label: `Qualifications (${qualifications.length})`, icon: <GraduationCap size={14}/> },
          { key: 'experience', label: `Experience (${experience.length})`, icon: <Briefcase size={14}/> },
          { key: 'leave', label: `Leaves (${leaves.length})`, icon: <CalendarOff size={14}/> },
          { key: 'service', label: 'Service Book', icon: <BookOpen size={14}/> },
        ] as const).map(t => (
          <button key={t.key} className={`${styles.tab} ${tab === t.key ? styles.tabActive : ''}`} onClick={() => setTab(t.key as Tab)}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* ── Profile Tab ───────────────────────────────────── */}
      {tab === 'profile' && (
        <div className={styles.profileGrid}>
          <Section title="Personal Information">
            <InfoRow label="Full Name" value={teacher.full_name}/>
            <InfoRow label="Full Name (Marathi)" value={teacher.full_name_marathi}/>
            <InfoRow label="Date of Birth" value={teacher.dob ? new Date(teacher.dob).toLocaleDateString('en-IN') : null}/>
            <InfoRow label="Gender" value={teacher.gender}/>
            <InfoRow label="Blood Group" value={teacher.blood_group}/>
            <InfoRow label="Marital Status" value={teacher.marital_status}/>
            <InfoRow label="Nationality" value={teacher.nationality}/>
            <InfoRow label="Religion" value={teacher.religion}/>
            <InfoRow label="Caste / Category" value={teacher.caste ? `${teacher.caste} / ${teacher.category || '-'}` : null}/>
            <InfoRow label="Mother Tongue" value={teacher.mother_tongue}/>
            <InfoRow label="Aadhaar" value={teacher.aadhaar_number ? `••••${teacher.aadhaar_number.slice(-4)}` : null}/>
            <InfoRow label="PAN" value={teacher.pan_number}/>
          </Section>

          <Section title="Employment Details">
            <InfoRow label="Employee ID" value={teacher.employee_id}/>
            <InfoRow label="Designation" value={teacher.designation}/>
            <InfoRow label="Type" value={teacher.employee_type}/>
            <InfoRow label="Department" value={teacher.department}/>
            <InfoRow label="Subjects" value={teacher.subjects}/>
            <InfoRow label="Classes" value={teacher.classes_assigned}/>
            <InfoRow label="Date of Joining" value={teacher.date_of_joining ? new Date(teacher.date_of_joining).toLocaleDateString('en-IN') : null}/>
            <InfoRow label="Qualification" value={teacher.highest_qualification}/>
            <InfoRow label="Specialization" value={teacher.specialization}/>
            <InfoRow label="SARAL ID" value={teacher.teacher_saral_id}/>
          </Section>

          <Section title="Contact & Address">
            <InfoRow label="Mobile" value={teacher.mobile}/>
            <InfoRow label="Alt Mobile" value={teacher.mobile_alt}/>
            <InfoRow label="Email" value={teacher.email}/>
            <InfoRow label="Official Email" value={teacher.email_official}/>
            <InfoRow label="Address" value={[teacher.address_line1, teacher.address_line2].filter(Boolean).join(', ')}/>
            <InfoRow label="Village / Taluka" value={[teacher.village, teacher.taluka].filter(Boolean).join(', ')}/>
            <InfoRow label="District / State" value={[teacher.district, teacher.state].filter(Boolean).join(', ')}/>
            <InfoRow label="PIN" value={teacher.pincode}/>
          </Section>

          <Section title="Bank & Govt IDs">
            <InfoRow label="Bank" value={teacher.bank_name}/>
            <InfoRow label="Account No." value={teacher.bank_account_number ? `••••${teacher.bank_account_number.slice(-4)}` : null}/>
            <InfoRow label="IFSC" value={teacher.bank_ifsc}/>
            <InfoRow label="PF No." value={teacher.pf_number}/>
            <InfoRow label="GPF No." value={teacher.gpf_number}/>
            <InfoRow label="DCPS" value={teacher.dcps_account}/>
            <InfoRow label="PRAN" value={teacher.pran_number}/>
            <InfoRow label="Pay Scale" value={teacher.pay_scale}/>
            <InfoRow label="Basic Salary" value={teacher.basic_salary ? `₹${teacher.basic_salary.toLocaleString('en-IN')}` : null}/>
          </Section>
        </div>
      )}

      {/* ── Qualifications Tab ─────────────────────────────── */}
      {tab === 'qualifications' && (
        <div className={styles.contentCard}>
          <div className={styles.cardHeader}>
            <h3 className={styles.cardTitle}>Academic Qualifications</h3>
            <PermissionGate permission="teacher.update">
              <button className={styles.addRowBtn} onClick={() => setShowQualModal(true)}><Plus size={14}/> Add</button>
            </PermissionGate>
          </div>
          {qualifications.length === 0 ? (
            <p className={styles.emptyMsg}>No qualifications added yet.</p>
          ) : (
            <div className={styles.qualGrid}>
              {qualifications.map(q => (
                <div key={q.id} className={styles.qualCard}>
                  <div className={styles.qualDegree}>{q.degree}</div>
                  {q.subject && <div className={styles.qualSub}>{q.subject}</div>}
                  {q.university && <div className={styles.qualUni}>{q.university}</div>}
                  <div className={styles.qualMeta}>
                    {q.year_of_passing && <span>{q.year_of_passing}</span>}
                    {q.grade_percentage && <span>{q.grade_percentage}</span>}
                  </div>
                  <PermissionGate permission="teacher.update">
                    <button className={styles.deleteBtn} onClick={() => deleteQualification(q.id)}><Trash2 size={12}/></button>
                  </PermissionGate>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Experience Tab ─────────────────────────────────── */}
      {tab === 'experience' && (
        <div className={styles.contentCard}>
          <div className={styles.cardHeader}>
            <h3 className={styles.cardTitle}>Work Experience</h3>
            <PermissionGate permission="teacher.update">
              <button className={styles.addRowBtn} onClick={() => setShowExpModal(true)}><Plus size={14}/> Add</button>
            </PermissionGate>
          </div>
          {experience.length === 0 ? (
            <p className={styles.emptyMsg}>No experience records added yet.</p>
          ) : (
            <div className={styles.timeline}>
              {experience.map(exp => (
                <div key={exp.id} className={styles.timelineItem}>
                  <div className={styles.timelineDot}/>
                  <div className={styles.timelineContent}>
                    <div className={styles.expOrg}>{exp.organization}</div>
                    {exp.designation && <div className={styles.expDesig}>{exp.designation}</div>}
                    <div className={styles.expPeriod}>
                      {exp.from_date && new Date(exp.from_date).toLocaleDateString('en-IN')}
                      {' → '}
                      {exp.is_current ? <span className={styles.currentTag}>Current</span> : exp.to_date ? new Date(exp.to_date).toLocaleDateString('en-IN') : '-'}
                    </div>
                    {exp.description && <div className={styles.expDesc}>{exp.description}</div>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Leave Tab ──────────────────────────────────────── */}
      {tab === 'leave' && (
        <div className={styles.contentCard}>
          <div className={styles.cardHeader}>
            <h3 className={styles.cardTitle}>Leave History</h3>
            <PermissionGate permission="teacher.leave.apply">
              <button className={styles.addRowBtn} onClick={() => setShowLeaveModal(true)}><Plus size={14}/> Apply Leave</button>
            </PermissionGate>
          </div>
          {leaves.length === 0 ? (
            <p className={styles.emptyMsg}>No leave records found.</p>
          ) : (
            <div className={styles.leaveList}>
              {leaves.map(l => (
                <div key={l.id} className={styles.leaveCard}>
                  <div className={styles.leaveCardLeft}>
                    <span className={styles.leaveType}>{l.leave_type.replace('_',' ')}</span>
                    <span className={styles.leavePeriod}>
                      {new Date(l.from_date).toLocaleDateString('en-IN')} → {new Date(l.to_date).toLocaleDateString('en-IN')}
                      <strong> ({l.days} day{l.days > 1 ? 's' : ''})</strong>
                    </span>
                    {l.reason && <span className={styles.leaveReason}>{l.reason}</span>}
                  </div>
                  <span className={`${styles.leaveStatus} ${leaveStatusClass(l.status)}`}>{l.status}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Service Book Tab ───────────────────────────────── */}
      {tab === 'service' && (
        <div className={styles.contentCard}>
          <h3 className={styles.cardTitle}>Service Book Summary (सेवा पुस्तिका)</h3>
          <div className={styles.serviceGrid}>
            <InfoRow label="Employee ID" value={teacher.employee_id}/>
            <InfoRow label="Designation" value={teacher.designation}/>
            <InfoRow label="Date of Joining" value={teacher.date_of_joining ? new Date(teacher.date_of_joining).toLocaleDateString('en-IN') : null}/>
            <InfoRow label="Date of Confirmation" value={teacher.date_of_confirmation ? new Date(teacher.date_of_confirmation).toLocaleDateString('en-IN') : null}/>
            <InfoRow label="Date of Retirement" value={teacher.date_of_retirement ? new Date(teacher.date_of_retirement).toLocaleDateString('en-IN') : null}/>
            <InfoRow label="Years of Service" value={yearsService !== null ? `${yearsService} years` : null}/>
            <InfoRow label="PF Number" value={teacher.pf_number}/>
            <InfoRow label="GPF Number" value={teacher.gpf_number}/>
            <InfoRow label="PRAN Number" value={teacher.pran_number}/>
            <InfoRow label="Pay Scale" value={teacher.pay_scale}/>
            <InfoRow label="Basic Salary" value={teacher.basic_salary ? `₹${Number(teacher.basic_salary).toLocaleString('en-IN')}` : null}/>
          </div>
        </div>
      )}

      {/* ── Add Qualification Modal ─────────────────────── */}
      {showQualModal && (
        <div className={styles.overlay} onClick={() => setShowQualModal(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <h3 className={styles.modalTitle}>Add Qualification</h3>
            {[
              { key: 'degree', label: 'Degree *', placeholder: 'e.g. B.Ed., M.A.' },
              { key: 'subject', label: 'Subject', placeholder: 'e.g. Mathematics' },
              { key: 'university', label: 'University / Board', placeholder: 'University name' },
              { key: 'year_of_passing', label: 'Year of Passing', placeholder: 'e.g. 2015' },
              { key: 'grade_percentage', label: 'Grade / %', placeholder: 'e.g. 72%' },
            ].map(f => (
              <div key={f.key} className={styles.modalField}>
                <label className={styles.modalLabel}>{f.label}</label>
                <input className={styles.modalInput} placeholder={f.placeholder}
                  value={(newQual as any)[f.key]} onChange={e => setNewQual(p => ({ ...p, [f.key]: e.target.value }))}/>
              </div>
            ))}
            <div className={styles.modalBtns}>
              <button className={styles.modalCancel} onClick={() => setShowQualModal(false)}>Cancel</button>
              <button className={styles.modalSubmit} onClick={addQualification}><Check size={14}/> Add</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Add Experience Modal ─────────────────────────── */}
      {showExpModal && (
        <div className={styles.overlay} onClick={() => setShowExpModal(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <h3 className={styles.modalTitle}>Add Experience</h3>
            {[
              { key: 'organization', label: 'Organization *', placeholder: 'School / Institution name' },
              { key: 'designation', label: 'Designation', placeholder: 'e.g. Teacher' },
              { key: 'from_date', label: 'From Date', type: 'date' },
              { key: 'to_date', label: 'To Date', type: 'date' },
              { key: 'description', label: 'Description', placeholder: 'Brief role description' },
            ].map(f => (
              <div key={f.key} className={styles.modalField}>
                <label className={styles.modalLabel}>{f.label}</label>
                <input className={styles.modalInput} type={f.type || 'text'} placeholder={f.placeholder || ''}
                  value={(newExp as any)[f.key]} onChange={e => setNewExp(p => ({ ...p, [f.key]: e.target.value }))}/>
              </div>
            ))}
            <label className={styles.modalCheckLabel}>
              <input type="checkbox" checked={newExp.is_current} onChange={e => setNewExp(p => ({ ...p, is_current: e.target.checked, to_date: '' }))}/>
              Currently working here
            </label>
            <div className={styles.modalBtns}>
              <button className={styles.modalCancel} onClick={() => setShowExpModal(false)}>Cancel</button>
              <button className={styles.modalSubmit} onClick={addExperience}><Check size={14}/> Add</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Apply Leave Modal ────────────────────────────── */}
      {showLeaveModal && (
        <div className={styles.overlay} onClick={() => setShowLeaveModal(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <h3 className={styles.modalTitle}>Apply for Leave</h3>
            <div className={styles.modalField}>
              <label className={styles.modalLabel}>Leave Type</label>
              <select className={styles.modalInput} value={newLeave.leave_type} onChange={e => setNewLeave(p => ({ ...p, leave_type: e.target.value }))}>
                {['casual','earned','medical','half_pay','maternity','paternity','special','unpaid'].map(t => <option key={t} value={t}>{t.replace('_',' ')}</option>)}
              </select>
            </div>
            <div className={styles.modalField}>
              <label className={styles.modalLabel}>From Date *</label>
              <input type="date" className={styles.modalInput} value={newLeave.from_date} onChange={e => setNewLeave(p => ({ ...p, from_date: e.target.value }))}/>
            </div>
            <div className={styles.modalField}>
              <label className={styles.modalLabel}>To Date *</label>
              <input type="date" className={styles.modalInput} value={newLeave.to_date} onChange={e => setNewLeave(p => ({ ...p, to_date: e.target.value }))}/>
            </div>
            <div className={styles.modalField}>
              <label className={styles.modalLabel}>Reason</label>
              <textarea className={`${styles.modalInput} ${styles.modalTextarea}`} rows={3} value={newLeave.reason} onChange={e => setNewLeave(p => ({ ...p, reason: e.target.value }))} placeholder="Reason for leave..."/>
            </div>
            <div className={styles.modalBtns}>
              <button className={styles.modalCancel} onClick={() => setShowLeaveModal(false)}>Cancel</button>
              <button className={styles.modalSubmit} onClick={applyLeave}><Check size={14}/> Submit</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
