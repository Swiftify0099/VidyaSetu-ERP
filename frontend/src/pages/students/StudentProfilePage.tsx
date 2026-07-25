import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ChevronLeft, Edit2, Upload, FileText, Award, CheckCircle,
  Phone, Mail, MapPin, Calendar, User, Shield, Download,
  BookOpen, Bus, Activity, GraduationCap,
} from 'lucide-react';
import toast from 'react-hot-toast';
import studentService, { Student, AttendanceSummary } from '../../services/studentService';
import PermissionGate from '../../components/ui/PermissionGate';
import styles from './StudentProfilePage.module.css';

type Tab = 'profile' | 'attendance' | 'documents' | 'certificates';

export default function StudentProfilePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const photoRef = useRef<HTMLInputElement>(null);

  const [student, setStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('profile');
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [attendance, setAttendance] = useState<AttendanceSummary | null>(null);
  const [leavingModal, setLeavingModal] = useState(false);
  const [bonafideModal, setBonafideModal] = useState(false);
  const [bonafidePurpose, setBonafidePurpose] = useState('General Purpose');

  useEffect(() => {
    if (!id) return;
    loadStudent();
  }, [id]);

  const loadStudent = async () => {
    setLoading(true);
    try {
      const s = await studentService.getById(Number(id));
      setStudent(s);
      // Load attendance summary for current year
      const now = new Date();
      const fromDate = `${now.getFullYear()}-06-01`;
      const toDate = now.toISOString().split('T')[0];
      try {
        const att = await studentService.getAttendanceSummary(Number(id), fromDate, toDate);
        setAttendance(att);
      } catch {}
    } catch {
      toast.error('Failed to load student profile.');
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !student) return;
    setUploadingPhoto(true);
    try {
      await studentService.uploadPhoto(student.id, file);
      toast.success('Photo updated!');
      loadStudent();
    } catch {
      toast.error('Photo upload failed.');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleTC = () => {
    if (!student) return;
    studentService.downloadTC(student.id);
    toast.success('TC generation started. Check downloads.');
  };

  const handleBonafide = () => {
    if (!student) return;
    studentService.downloadBonafide(student.id, bonafidePurpose);
    setBonafideModal(false);
    toast.success('Bonafide certificate generation started.');
  };

  const photoUrl = student?.photo_path
    ? `${import.meta.env.VITE_STORAGE_URL}/${student.photo_path}`
    : null;

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.skeletonHeader}>
          <div className={styles.skeletonCircle} />
          <div className={styles.skeletonLines}>
            <div className={styles.skeletonLine} />
            <div className={styles.skeletonLine} style={{ width: '60%' }} />
          </div>
        </div>
      </div>
    );
  }

  if (!student) return null;

  const InfoRow = ({ label, value }: { label: string; value?: string | number | null }) => (
    value ? (
      <div className={styles.infoRow}>
        <span className={styles.infoLabel}>{label}</span>
        <span className={styles.infoValue}>{value}</span>
      </div>
    ) : null
  );

  const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div className={styles.section}>
      <h3 className={styles.sectionTitle}>{title}</h3>
      <div className={styles.sectionBody}>{children}</div>
    </div>
  );

  return (
    <div className={styles.page}>
      {/* Back */}
      <button className={styles.backBtn} onClick={() => navigate('/students')}>
        <ChevronLeft size={16} /> Back to Students
      </button>

      {/* ── Profile Header ─────────────────────────────────── */}
      <div className={styles.profileCard}>
        <div className={styles.profileLeft}>
          {/* Photo */}
          <div className={styles.photoWrap}>
            <div className={styles.photo}>
              {photoUrl
                ? <img src={photoUrl} alt={student.full_name} />
                : <span>{student.full_name.charAt(0)}</span>
              }
            </div>
            <PermissionGate permission="student.update">
              <button
                className={styles.photoUploadBtn}
                onClick={() => photoRef.current?.click()}
                disabled={uploadingPhoto}
                title="Upload photo"
              >
                {uploadingPhoto ? <span className={styles.spinner} /> : <Upload size={12} />}
              </button>
            </PermissionGate>
            <input
              ref={photoRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handlePhotoUpload}
            />
          </div>

          {/* Core Info */}
          <div className={styles.profileInfo}>
            <div className={styles.statusRow}>
              <span className={`${styles.statusBadge} ${student.status === 'active' ? styles.statusActive : styles.statusInactive}`}>
                {student.status}
              </span>
              {student.category && <span className={styles.categoryBadge}>{student.category}</span>}
              {student.is_differently_abled && <span className={styles.divyangBadge}>दिव्यांग</span>}
            </div>
            <h1 className={styles.studentName}>{student.full_name}</h1>
            {student.full_name_marathi && (
              <p className={styles.studentNameMr}>{student.full_name_marathi}</p>
            )}
            <div className={styles.metaChips}>
              <span className={styles.chip}><GraduationCap size={13} /> Std {student.standard}{student.division ? `-${student.division}` : ''}</span>
              {student.roll_number && <span className={styles.chip}>Roll {student.roll_number}</span>}
              <span className={styles.chip}><FileText size={13} /> {student.gr_number}</span>
              {student.dob && <span className={styles.chip}><Calendar size={13} /> {new Date(student.dob).toLocaleDateString('en-IN')}</span>}
            </div>
            {student.father_name && (
              <p className={styles.fatherLine}><User size={13} /> Father: {student.father_name}</p>
            )}
            {(student.mobile || student.father_mobile) && (
              <p className={styles.mobileLine}><Phone size={13} /> {student.mobile || student.father_mobile}</p>
            )}
          </div>
        </div>

        {/* Right — Stats + Actions */}
        <div className={styles.profileRight}>
          {attendance && (
            <div className={styles.attendanceCircle}>
              <div className={styles.circleOuter}>
                <svg viewBox="0 0 36 36" className={styles.circleSvg}>
                  <path className={styles.circleTrack}
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  <path className={styles.circleFill}
                    strokeDasharray={`${attendance.attendance_percentage}, 100`}
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                </svg>
                <div className={styles.circleInner}>
                  <span className={styles.circleValue}>{attendance.attendance_percentage}%</span>
                  <span className={styles.circleLabel}>Attendance</span>
                </div>
              </div>
              <div className={styles.attStats}>
                <div className={styles.attStat}><span>{attendance.present_days}</span>Present</div>
                <div className={styles.attStat}><span>{attendance.absent_days}</span>Absent</div>
                <div className={styles.attStat}><span>{attendance.total_days}</span>Total</div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className={styles.actionBtns}>
            <PermissionGate permission="student.update">
              <button className={styles.actionBtn} onClick={() => navigate(`/students/${student.id}/edit`)}>
                <Edit2 size={15} /> Edit Profile
              </button>
            </PermissionGate>
            <PermissionGate permission="student.print">
              <button className={styles.actionBtn} onClick={() => setBonafideModal(true)}>
                <Award size={15} /> Bonafide
              </button>
              <button className={styles.actionBtn} onClick={handleTC}>
                <FileText size={15} /> Issue TC
              </button>
            </PermissionGate>
          </div>
        </div>
      </div>

      {/* ── Tabs ───────────────────────────────────────────── */}
      <div className={styles.tabBar}>
        {([
          { key: 'profile', label: 'Profile', icon: <User size={14}/> },
          { key: 'attendance', label: 'Attendance', icon: <Activity size={14}/> },
          { key: 'documents', label: 'Documents', icon: <FileText size={14}/> },
          { key: 'certificates', label: 'Certificates', icon: <Award size={14}/> },
        ] as const).map(t => (
          <button
            key={t.key}
            className={`${styles.tab} ${tab === t.key ? styles.tabActive : ''}`}
            onClick={() => setTab(t.key)}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* ── Tab Content ────────────────────────────────────── */}
      {tab === 'profile' && (
        <div className={styles.profileGrid}>
          <Section title="Personal Information">
            <InfoRow label="Full Name" value={student.full_name} />
            <InfoRow label="Full Name (Marathi)" value={student.full_name_marathi} />
            <InfoRow label="Date of Birth" value={student.dob ? new Date(student.dob).toLocaleDateString('en-IN') : undefined} />
            <InfoRow label="Date of Birth (Words)" value={student.dob_in_words} />
            <InfoRow label="Gender" value={student.gender} />
            <InfoRow label="Blood Group" value={student.blood_group} />
            <InfoRow label="Nationality" value={student.nationality} />
            <InfoRow label="Religion" value={student.religion} />
            <InfoRow label="Caste" value={student.caste} />
            <InfoRow label="Sub-Caste" value={student.sub_caste} />
            <InfoRow label="Category" value={student.category} />
            <InfoRow label="Mother Tongue" value={student.mother_tongue} />
            <InfoRow label="Aadhaar No." value={student.aadhaar_number ? '••••' + student.aadhaar_number.slice(-4) : undefined} />
          </Section>

          <Section title="Academic Details">
            <InfoRow label="GR Number" value={student.gr_number} />
            <InfoRow label="Standard" value={`${student.standard}${student.division ? `-${student.division}` : ''}`} />
            <InfoRow label="Roll Number" value={student.roll_number} />
            <InfoRow label="Admission Date" value={student.admission_date ? new Date(student.admission_date).toLocaleDateString('en-IN') : undefined} />
            <InfoRow label="Admitted in Std" value={student.admission_standard} />
            <InfoRow label="Previous School" value={student.previous_school} />
            <InfoRow label="SARAL ID" value={student.student_id_saral} />
            <InfoRow label="PEN Number" value={student.pen_number} />
            <InfoRow label="APAAR ID" value={student.apaar_id} />
          </Section>

          <Section title="Family Information">
            <InfoRow label="Father's Name" value={student.father_name} />
            <InfoRow label="Father (Marathi)" value={student.father_name_marathi} />
            <InfoRow label="Father's Mobile" value={student.father_mobile} />
            <InfoRow label="Mother's Name" value={student.mother_name_full} />
            <InfoRow label="Mother (Marathi)" value={student.mother_name_marathi} />
            <InfoRow label="Mother's Mobile" value={student.mother_mobile} />
            <InfoRow label="Guardian" value={student.guardian_name} />
            <InfoRow label="Guardian Mobile" value={student.guardian_mobile} />
          </Section>

          <Section title="Address">
            <InfoRow label="Address" value={[student.address_line1, student.address_line2].filter(Boolean).join(', ')} />
            <InfoRow label="Village/Locality" value={student.village} />
            <InfoRow label="Taluka" value={student.taluka} />
            <InfoRow label="District" value={student.district} />
            <InfoRow label="State" value={student.state} />
            <InfoRow label="PIN Code" value={student.pincode} />
          </Section>
        </div>
      )}

      {tab === 'attendance' && (
        <div className={styles.contentCard}>
          <h3 className={styles.cardTitle}>Attendance Records</h3>
          {attendance ? (
            <div className={styles.attGrid}>
              {[
                { label: 'Total Days', value: attendance.total_days, color: 'var(--color-primary)' },
                { label: 'Present', value: attendance.present_days, color: 'var(--color-success)' },
                { label: 'Absent', value: attendance.absent_days, color: 'var(--color-danger)' },
                { label: 'Late', value: attendance.late_days, color: 'var(--color-warning)' },
                { label: 'Half Day', value: attendance.half_day, color: 'var(--color-info)' },
                { label: 'Percentage', value: `${attendance.attendance_percentage}%`, color: attendance.attendance_percentage >= 75 ? 'var(--color-success)' : 'var(--color-danger)' },
              ].map(a => (
                <div key={a.label} className={styles.attCard} style={{ '--c': a.color } as React.CSSProperties}>
                  <div className={styles.attCardVal}>{a.value}</div>
                  <div className={styles.attCardLbl}>{a.label}</div>
                </div>
              ))}
            </div>
          ) : (
            <p className={styles.emptyMsg}>No attendance records found for current academic year.</p>
          )}
        </div>
      )}

      {tab === 'documents' && (
        <div className={styles.contentCard}>
          <h3 className={styles.cardTitle}>Documents</h3>
          <p className={styles.emptyMsg}>Document upload functionality available in the next phase.</p>
        </div>
      )}

      {tab === 'certificates' && (
        <div className={styles.contentCard}>
          <h3 className={styles.cardTitle}>Certificates</h3>
          <div className={styles.certBtns}>
            <PermissionGate permission="student.print">
              <button className={styles.certBtn} onClick={() => setBonafideModal(true)}>
                <Award size={20} />
                <div><strong>Bonafide Certificate</strong><span>बोनाफाइड प्रमाणपत्र</span></div>
                <Download size={16} />
              </button>
              <button className={styles.certBtn} onClick={handleTC}>
                <FileText size={20} />
                <div>
                  <strong>Transfer Certificate (TC)</strong>
                  <span>हस्तांतरण प्रमाणपत्र</span>
                  {student.tc_issued && <span className={styles.tcIssued}>TC #{student.tc_number}</span>}
                </div>
                <Download size={16} />
              </button>
            </PermissionGate>
          </div>
        </div>
      )}

      {/* ── Bonafide Purpose Modal ─────────────────────────── */}
      {bonafideModal && (
        <div className={styles.modalOverlay} onClick={() => setBonafideModal(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <h3 className={styles.modalTitle}>Bonafide Certificate Purpose</h3>
            <p className={styles.modalSub}>Specify the purpose for which this certificate is issued:</p>
            <select
              className={styles.modalSelect}
              value={bonafidePurpose}
              onChange={e => setBonafidePurpose(e.target.value)}
            >
              {[
                'General Purpose',
                'Bank Account Opening',
                'Passport Application',
                'Scholarship Application',
                'Sports Activity',
                'Competitive Exam',
                'Railway Concession',
              ].map(p => <option key={p}>{p}</option>)}
            </select>
            <div className={styles.modalBtns}>
              <button className={styles.modalCancel} onClick={() => setBonafideModal(false)}>Cancel</button>
              <button className={styles.modalSubmit} onClick={handleBonafide}>
                <Download size={14} /> Generate PDF
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
