/**
 * VidyaSetu ERP — Enterprise Admission Module
 * =============================================
 * Handles:
 *   /admission/new        → Multi-step new admission wizard
 *   /admission/gr         → GR Register (General Register)
 *   /admission/promotions → Year-end bulk student promotion
 *
 * Uses: tokens.css design system, Lucide icons, api.ts, PermissionGate
 * Zero hardcoded colors. Zero duplicate components.
 */
import { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  UserPlus, BookOpen, ArrowUpCircle, Search, RefreshCw,
  ChevronRight, ChevronLeft, Check, Download, Printer,
  GraduationCap, Users, AlertCircle, FileText, Plus,
  ChevronLeft as PrevIcon, ChevronRight as NextIcon,
  CheckCircle2, Trophy, AlertTriangle, X,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import PermissionGate from '../../components/ui/PermissionGate';
import styles from './AdmissionPage.module.css';

// ── Types ──────────────────────────────────────────────────────────────────

type Section = 'new' | 'gr' | 'promotions';

interface AdmissionStats {
  total_admissions_this_year: number;
  new_this_month: number;
  pending_gr: number;
  promotions_pending: number;
}

// ── Wizard Form Data ───────────────────────────────────────────────────────

interface WizardData {
  // Step 1: Personal Info
  full_name: string;
  full_name_marathi: string;
  date_of_birth: string;
  gender: string;
  blood_group: string;
  religion: string;
  caste: string;
  category: string;
  mother_tongue: string;
  nationality: string;
  aadhaar_number: string;

  // Step 2: Parent/Guardian Info
  father_name: string;
  father_mobile: string;
  father_occupation: string;
  mother_name: string;
  mother_mobile: string;
  mother_occupation: string;
  guardian_name: string;
  guardian_relation: string;
  guardian_mobile: string;

  // Step 3: Address & School Info
  address_line1: string;
  address_city: string;
  address_district: string;
  address_state: string;
  address_pincode: string;
  previous_school: string;
  previous_standard: string;
  transfer_certificate_no: string;

  // Step 4: Admission Details
  standard: string;
  division: string;
  admission_date: string;
  academic_year_id: string;
  house: string;
  transport_required: boolean;
  hostel_required: boolean;

  // Step 5: Documents (just flags for UI)
  doc_birth_certificate: boolean;
  doc_tc: boolean;
  doc_aadhaar: boolean;
  doc_photo: boolean;
  doc_caste_certificate: boolean;
}

const DEFAULT_WIZARD: WizardData = {
  full_name: '', full_name_marathi: '', date_of_birth: '', gender: '', blood_group: '',
  religion: '', caste: '', category: 'general', mother_tongue: 'marathi', nationality: 'Indian',
  aadhaar_number: '',
  father_name: '', father_mobile: '', father_occupation: '',
  mother_name: '', mother_mobile: '', mother_occupation: '',
  guardian_name: '', guardian_relation: '', guardian_mobile: '',
  address_line1: '', address_city: '', address_district: 'Satara', address_state: 'Maharashtra',
  address_pincode: '', previous_school: '', previous_standard: '', transfer_certificate_no: '',
  standard: '', division: 'A', admission_date: new Date().toISOString().split('T')[0],
  academic_year_id: '1', house: '', transport_required: false, hostel_required: false,
  doc_birth_certificate: false, doc_tc: false, doc_aadhaar: false, doc_photo: false,
  doc_caste_certificate: false,
};

const WIZARD_STEPS = [
  { label: 'Personal Info',   icon: <Users size={14} /> },
  { label: 'Parents',         icon: <Users size={14} /> },
  { label: 'Address & School',icon: <FileText size={14} /> },
  { label: 'Admission Details', icon: <GraduationCap size={14} /> },
  { label: 'Documents',       icon: <FileText size={14} /> },
  { label: 'Review & Submit', icon: <Check size={14} /> },
];

const STANDARDS = ['1','2','3','4','5','6','7','8','9','10','11','12'];
const DIVISIONS  = ['A','B','C','D','E'];
const GENDERS    = ['male','female','other'];
const BLOOD_GROUPS = ['A+','A-','B+','B-','O+','O-','AB+','AB-'];
const CATEGORIES   = ['general','obc','sc','st','nt','vjnt','sbc'];
const HOUSES       = ['Red','Blue','Green','Yellow'];

// ── GR Register Types ──────────────────────────────────────────────────────

interface GREntry {
  id: number;
  gr_number: string;
  admission_number: string;
  full_name: string;
  standard: string;
  division?: string;
  gender: string;
  category: string;
  admission_date: string;
  date_of_birth: string;
  status: string;
  father_name?: string;
}

// ── Promotion Types ────────────────────────────────────────────────────────

interface PromoStudent {
  id: number;
  gr_number: string;
  full_name: string;
  standard: string;
  division?: string;
  roll_number?: number;
  result: 'pass' | 'fail' | 'detained' | '';
  promoted_to?: string;
  remarks: string;
}

// ══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════════════════════════════════════════

export default function AdmissionPage() {
  const location = useLocation();
  const navigate = useNavigate();

  // Derive section from path
  const pathSection = (): Section => {
    if (location.pathname.includes('/gr')) return 'gr';
    if (location.pathname.includes('/promotions')) return 'promotions';
    return 'new';
  };
  const [section, setSection] = useState<Section>(pathSection());

  // Sync section with URL
  useEffect(() => { setSection(pathSection()); }, [location.pathname]);

  const handleTabChange = (s: Section) => {
    setSection(s);
    if (s === 'new') navigate('/admission/new');
    else if (s === 'gr') navigate('/admission/gr');
    else navigate('/admission/promotions');
  };

  const [stats, setStats] = useState<AdmissionStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);

  const loadStats = useCallback(async () => {
    try {
      const res = await api.get('/students/admission-stats');
      if (res.data?.success) setStats(res.data.data);
    } catch {
      // Stats are optional — continue without
    } finally { setLoadingStats(false); }
  }, []);

  useEffect(() => { loadStats(); }, [loadStats]);

  return (
    <div className={styles.page}>
      {/* Page Header */}
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Admission Management</h1>
          <p className={styles.pageSub}>New Admission · GR Register · Year-End Promotions</p>
        </div>
        <button className={styles.iconBtn} onClick={loadStats} title="Refresh">
          <RefreshCw size={16} className={loadingStats ? styles.spinning : ''} />
        </button>
      </div>

      {/* Stats Row */}
      <div className={styles.statsRow}>
        {[
          { label: 'Admissions This Year', val: stats?.total_admissions_this_year ?? '—', icon: <GraduationCap size={20}/>, color: 'var(--color-primary)' },
          { label: 'New This Month',       val: stats?.new_this_month ?? '—',             icon: <UserPlus size={20}/>,    color: 'var(--color-success)' },
          { label: 'GR Pending',           val: stats?.pending_gr ?? '—',                 icon: <BookOpen size={20}/>,    color: 'var(--color-warning)' },
          { label: 'Promotions Pending',   val: stats?.promotions_pending ?? '—',         icon: <ArrowUpCircle size={20}/>, color: 'var(--color-info)' },
        ].map(s => (
          <div key={s.label} className={styles.statCard} style={{ '--c': s.color } as React.CSSProperties}>
            <div className={styles.statIcon}>{s.icon}</div>
            <div className={styles.statVal}>{s.val}</div>
            <div className={styles.statLbl}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Tab Bar */}
      <div className={styles.tabBar}>
        {[
          { id: 'new' as Section,        label: 'New Admission',  icon: <UserPlus size={15}/> },
          { id: 'gr' as Section,         label: 'GR Register',    icon: <BookOpen size={15}/> },
          { id: 'promotions' as Section, label: 'Promotions',     icon: <ArrowUpCircle size={15}/> },
        ].map(t => (
          <button
            key={t.id}
            className={`${styles.tab} ${section === t.id ? styles.tabActive : ''}`}
            onClick={() => handleTabChange(t.id)}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* Section Content */}
      {section === 'new'         && <NewAdmissionWizard />}
      {section === 'gr'          && <GRRegister />}
      {section === 'promotions'  && <PromotionSection />}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// NEW ADMISSION WIZARD
// ══════════════════════════════════════════════════════════════════════════

function NewAdmissionWizard() {
  const [step, setStep] = useState(0);
  const [data, setData] = useState<WizardData>({ ...DEFAULT_WIZARD });
  const [saving, setSaving] = useState(false);
  const [successGR, setSuccessGR] = useState<string | null>(null);
  const [successAdmNo, setSuccessAdmNo] = useState<string | null>(null);

  const update = (key: keyof WizardData, val: any) =>
    setData(prev => ({ ...prev, [key]: val }));

  const canNext = () => {
    if (step === 0) return data.full_name.trim() && data.date_of_birth && data.gender;
    if (step === 1) return data.father_name.trim() && data.father_mobile.trim();
    if (step === 2) return data.address_line1.trim() && data.address_city.trim();
    if (step === 3) return data.standard && data.admission_date;
    return true;
  };

  const handleSubmit = async () => {
    setSaving(true);
    try {
      const nameParts = data.full_name.trim().split(/\s+/);
      const firstName = nameParts[0] || 'Student';
      const middleName = nameParts.length > 2 ? nameParts.slice(1, -1).join(' ') : null;
      const lastName = nameParts.length > 1 ? nameParts[nameParts.length - 1] : '.';

      const payload = {
        full_name: data.full_name.trim(),
        first_name: firstName,
        middle_name: middleName,
        last_name: lastName,
        full_name_marathi: data.full_name_marathi.trim() || null,
        dob: data.date_of_birth || null,
        date_of_birth: data.date_of_birth || null,
        gender: data.gender,
        blood_group: data.blood_group || null,
        religion: data.religion || null,
        caste: data.caste || null,
        category: data.category || 'general',
        mother_tongue: data.mother_tongue || 'marathi',
        nationality: data.nationality || 'Indian',
        aadhaar_number: data.aadhaar_number || null,
        father_name: data.father_name.trim(),
        father_mobile: data.father_mobile.trim(),
        father_occupation: data.father_occupation || null,
        mother_name: data.mother_name.trim() || null,
        mother_name_full: data.mother_name.trim() || null,
        mother_mobile: data.mother_mobile.trim() || null,
        mother_occupation: data.mother_occupation || null,
        guardian_name: data.guardian_name.trim() || null,
        guardian_relation: data.guardian_relation || null,
        guardian_mobile: data.guardian_mobile.trim() || null,
        address: data.address_line1.trim(),
        address_line1: data.address_line1.trim(),
        city: data.address_city.trim(),
        village: data.address_city.trim(),
        district: data.address_district.trim(),
        state: data.address_state.trim(),
        pincode: data.address_pincode.trim() || null,
        previous_school: data.previous_school.trim() || null,
        previous_standard: data.previous_standard || null,
        transfer_certificate_no: data.transfer_certificate_no.trim() || null,
        standard: data.standard,
        division: data.division || null,
        admission_date: data.admission_date,
        academic_year_id: parseInt(data.academic_year_id) || 1,
        house: data.house || null,
        transport_required: data.transport_required,
        uses_transport: data.transport_required,
        hostel_required: data.hostel_required,
      };

      const res = await api.post('/students', payload);
      if (res.data?.success) {
        const student = res.data.data;
        setSuccessGR(student.gr_number || 'Auto-generated');
        setSuccessAdmNo(student.admission_number || student.id?.toString() || '');
        toast.success(`Admission successful! GR: ${student.gr_number}`);
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Admission failed. Please check all fields.');
    } finally { setSaving(false); }
  };

  if (successGR) {
    return (
      <div className={styles.successBanner}>
        <div className={styles.successIcon}><CheckCircle2 size={36} /></div>
        <h2 className={styles.successTitle}>Admission Successful! 🎉</h2>
        <p className={styles.successSub}>Student has been registered in the system.</p>
        <div className={styles.successGr}>GR Number: {successGR}</div>
        {successAdmNo && <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)' }}>Admission No: {successAdmNo}</div>}
        <div className={styles.successActions}>
          <button className={styles.primaryBtn} onClick={() => { setData({ ...DEFAULT_WIZARD }); setStep(0); setSuccessGR(null); }}>
            <UserPlus size={15} /> <span>New Admission</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.wizardWrap}>
      {/* Step Progress */}
      <div className={styles.stepBar}>
        {WIZARD_STEPS.map((s, i) => (
          <div key={i} className={`${styles.stepItem} ${i < step ? styles.stepDone : ''} ${i === step ? styles.stepActive : ''}`}>
            <div className={styles.stepCircle}>
              {i < step ? <Check size={14} /> : i + 1}
            </div>
            <span className={styles.stepLabel}>{s.label}</span>
          </div>
        ))}
      </div>

      {/* Step Card */}
      <div className={styles.stepCard}>
        {step === 0 && <Step1PersonalInfo data={data} update={update} />}
        {step === 1 && <Step2Parents data={data} update={update} />}
        {step === 2 && <Step3Address data={data} update={update} />}
        {step === 3 && <Step4Admission data={data} update={update} />}
        {step === 4 && <Step5Documents data={data} update={update} />}
        {step === 5 && <Step6Review data={data} />}
      </div>

      {/* Navigation */}
      <div className={styles.wizardNav}>
        <div className={styles.navLeft}>
          <span className={styles.stepInfo}>Step {step + 1} of {WIZARD_STEPS.length}</span>
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
          {step > 0 && (
            <button className={styles.backBtn} onClick={() => setStep(s => s - 1)}>
              <ChevronLeft size={16} /> <span>Back</span>
            </button>
          )}
          {step < WIZARD_STEPS.length - 1 ? (
            <button className={styles.nextBtn} onClick={() => setStep(s => s + 1)} disabled={!canNext()}>
              <span>Next</span> <ChevronRight size={16} />
            </button>
          ) : (
            <PermissionGate permission="student.create">
              <button className={styles.submitBtn} onClick={handleSubmit} disabled={saving}>
                {saving ? <span>Submitting...</span> : <><Check size={16} /> <span>Submit Admission</span></>}
              </button>
            </PermissionGate>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Wizard Steps ───────────────────────────────────────────────────────────

function Step1PersonalInfo({ data, update }: { data: WizardData; update: (k: keyof WizardData, v: any) => void }) {
  return (
    <>
      <div className={styles.stepTitle}><Users size={20} /> Student Personal Information</div>
      <div className={styles.formGrid}>
        <div className={styles.formGroup}>
          <label className={`${styles.label} ${styles.required}`}>Full Name (English)</label>
          <input className={styles.input} value={data.full_name} onChange={e => update('full_name', e.target.value)} placeholder="e.g. Rahul Sharma" />
        </div>
        <div className={styles.formGroup}>
          <label className={styles.label}>Full Name (Marathi)</label>
          <input className={styles.input} value={data.full_name_marathi} onChange={e => update('full_name_marathi', e.target.value)} placeholder="राहुल शर्मा" />
        </div>
        <div className={styles.formGroup}>
          <label className={`${styles.label} ${styles.required}`}>Date of Birth</label>
          <input type="date" className={styles.input} value={data.date_of_birth} onChange={e => update('date_of_birth', e.target.value)} />
        </div>
        <div className={styles.formGroup}>
          <label className={`${styles.label} ${styles.required}`}>Gender</label>
          <select className={styles.select} value={data.gender} onChange={e => update('gender', e.target.value)}>
            <option value="">Select Gender</option>
            {GENDERS.map(g => <option key={g} value={g}>{g.charAt(0).toUpperCase() + g.slice(1)}</option>)}
          </select>
        </div>
        <div className={styles.formGroup}>
          <label className={styles.label}>Blood Group</label>
          <select className={styles.select} value={data.blood_group} onChange={e => update('blood_group', e.target.value)}>
            <option value="">Select Blood Group</option>
            {BLOOD_GROUPS.map(b => <option key={b} value={b}>{b}</option>)}
          </select>
        </div>
        <div className={styles.formGroup}>
          <label className={styles.label}>Category</label>
          <select className={styles.select} value={data.category} onChange={e => update('category', e.target.value)}>
            {CATEGORIES.map(c => <option key={c} value={c}>{c.toUpperCase()}</option>)}
          </select>
        </div>
        <div className={styles.formGroup}>
          <label className={styles.label}>Religion</label>
          <input className={styles.input} value={data.religion} onChange={e => update('religion', e.target.value)} placeholder="e.g. Hindu" />
        </div>
        <div className={styles.formGroup}>
          <label className={styles.label}>Caste</label>
          <input className={styles.input} value={data.caste} onChange={e => update('caste', e.target.value)} placeholder="e.g. Maratha" />
        </div>
        <div className={styles.formGroup}>
          <label className={styles.label}>Mother Tongue</label>
          <input className={styles.input} value={data.mother_tongue} onChange={e => update('mother_tongue', e.target.value)} placeholder="e.g. Marathi" />
        </div>
        <div className={styles.formGroup}>
          <label className={styles.label}>Aadhaar Number</label>
          <input className={styles.input} value={data.aadhaar_number} onChange={e => update('aadhaar_number', e.target.value)} placeholder="12-digit number" maxLength={12} />
        </div>
      </div>
    </>
  );
}

function Step2Parents({ data, update }: { data: WizardData; update: (k: keyof WizardData, v: any) => void }) {
  return (
    <>
      <div className={styles.stepTitle}><Users size={20} /> Parent / Guardian Information</div>
      <div className={styles.formGrid}>
        <div className={styles.formGroup}>
          <label className={`${styles.label} ${styles.required}`}>Father's Name</label>
          <input className={styles.input} value={data.father_name} onChange={e => update('father_name', e.target.value)} placeholder="e.g. Rajesh Sharma" />
        </div>
        <div className={styles.formGroup}>
          <label className={`${styles.label} ${styles.required}`}>Father's Mobile</label>
          <input className={styles.input} type="tel" value={data.father_mobile} onChange={e => update('father_mobile', e.target.value)} placeholder="10-digit number" maxLength={10} />
        </div>
        <div className={styles.formGroup}>
          <label className={styles.label}>Father's Occupation</label>
          <input className={styles.input} value={data.father_occupation} onChange={e => update('father_occupation', e.target.value)} placeholder="e.g. Farmer" />
        </div>
        <div className={styles.formGroup}>
          <label className={styles.label}>Mother's Name</label>
          <input className={styles.input} value={data.mother_name} onChange={e => update('mother_name', e.target.value)} placeholder="e.g. Sunita Sharma" />
        </div>
        <div className={styles.formGroup}>
          <label className={styles.label}>Mother's Mobile</label>
          <input className={styles.input} type="tel" value={data.mother_mobile} onChange={e => update('mother_mobile', e.target.value)} placeholder="10-digit number" maxLength={10} />
        </div>
        <div className={styles.formGroup}>
          <label className={styles.label}>Mother's Occupation</label>
          <input className={styles.input} value={data.mother_occupation} onChange={e => update('mother_occupation', e.target.value)} placeholder="e.g. Housewife" />
        </div>
        <div className={styles.formGroup}>
          <label className={styles.label}>Guardian Name (if different)</label>
          <input className={styles.input} value={data.guardian_name} onChange={e => update('guardian_name', e.target.value)} />
        </div>
        <div className={styles.formGroup}>
          <label className={styles.label}>Guardian Relation</label>
          <input className={styles.input} value={data.guardian_relation} onChange={e => update('guardian_relation', e.target.value)} placeholder="e.g. Uncle" />
        </div>
        <div className={styles.formGroup}>
          <label className={styles.label}>Guardian Mobile</label>
          <input className={styles.input} type="tel" value={data.guardian_mobile} onChange={e => update('guardian_mobile', e.target.value)} maxLength={10} />
        </div>
      </div>
    </>
  );
}

function Step3Address({ data, update }: { data: WizardData; update: (k: keyof WizardData, v: any) => void }) {
  return (
    <>
      <div className={styles.stepTitle}><FileText size={20} /> Address & Previous School</div>
      <div className={styles.formGrid}>
        <div className={`${styles.formGroup} ${styles.fullWidth}`}>
          <label className={`${styles.label} ${styles.required}`}>Address</label>
          <textarea className={styles.textarea} value={data.address_line1} onChange={e => update('address_line1', e.target.value)} placeholder="House/Village/Ward No., Street Name..." />
        </div>
        <div className={styles.formGroup}>
          <label className={`${styles.label} ${styles.required}`}>City / Village</label>
          <input className={styles.input} value={data.address_city} onChange={e => update('address_city', e.target.value)} placeholder="e.g. Satara" />
        </div>
        <div className={styles.formGroup}>
          <label className={styles.label}>District</label>
          <input className={styles.input} value={data.address_district} onChange={e => update('address_district', e.target.value)} />
        </div>
        <div className={styles.formGroup}>
          <label className={styles.label}>State</label>
          <input className={styles.input} value={data.address_state} onChange={e => update('address_state', e.target.value)} />
        </div>
        <div className={styles.formGroup}>
          <label className={styles.label}>PIN Code</label>
          <input className={styles.input} value={data.address_pincode} onChange={e => update('address_pincode', e.target.value)} maxLength={6} />
        </div>
        <div className={styles.formGroup}>
          <label className={styles.label}>Previous School Name</label>
          <input className={styles.input} value={data.previous_school} onChange={e => update('previous_school', e.target.value)} placeholder="Leave blank if new admission" />
        </div>
        <div className={styles.formGroup}>
          <label className={styles.label}>Previous Standard</label>
          <select className={styles.select} value={data.previous_standard} onChange={e => update('previous_standard', e.target.value)}>
            <option value="">Select Standard</option>
            {STANDARDS.map(s => <option key={s} value={s}>Std {s}</option>)}
          </select>
        </div>
        <div className={styles.formGroup}>
          <label className={styles.label}>Transfer Certificate No.</label>
          <input className={styles.input} value={data.transfer_certificate_no} onChange={e => update('transfer_certificate_no', e.target.value)} placeholder="TC Number (if applicable)" />
        </div>
      </div>
    </>
  );
}

function Step4Admission({ data, update }: { data: WizardData; update: (k: keyof WizardData, v: any) => void }) {
  return (
    <>
      <div className={styles.stepTitle}><GraduationCap size={20} /> Admission Details</div>
      <div className={styles.formGrid}>
        <div className={styles.formGroup}>
          <label className={`${styles.label} ${styles.required}`}>Admission to Standard</label>
          <select className={styles.select} value={data.standard} onChange={e => update('standard', e.target.value)}>
            <option value="">Select Standard</option>
            {STANDARDS.map(s => <option key={s} value={s}>Std {s}</option>)}
          </select>
        </div>
        <div className={styles.formGroup}>
          <label className={styles.label}>Division</label>
          <select className={styles.select} value={data.division} onChange={e => update('division', e.target.value)}>
            {DIVISIONS.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
        <div className={styles.formGroup}>
          <label className={`${styles.label} ${styles.required}`}>Admission Date</label>
          <input type="date" className={styles.input} value={data.admission_date} onChange={e => update('admission_date', e.target.value)} />
        </div>
        <div className={styles.formGroup}>
          <label className={styles.label}>House</label>
          <select className={styles.select} value={data.house} onChange={e => update('house', e.target.value)}>
            <option value="">Select House</option>
            {HOUSES.map(h => <option key={h} value={h.toLowerCase()}>{h}</option>)}
          </select>
        </div>
        <div className={styles.formGroup}>
          <label className={styles.label}>Transport Required?</label>
          <select className={styles.select} value={data.transport_required ? 'yes' : 'no'} onChange={e => update('transport_required', e.target.value === 'yes')}>
            <option value="no">No</option>
            <option value="yes">Yes</option>
          </select>
        </div>
        <div className={styles.formGroup}>
          <label className={styles.label}>Hostel Required?</label>
          <select className={styles.select} value={data.hostel_required ? 'yes' : 'no'} onChange={e => update('hostel_required', e.target.value === 'yes')}>
            <option value="no">No</option>
            <option value="yes">Yes</option>
          </select>
        </div>
      </div>
    </>
  );
}

function Step5Documents({ data, update }: { data: WizardData; update: (k: keyof WizardData, v: any) => void }) {
  const docs: { key: keyof WizardData; label: string; required: boolean }[] = [
    { key: 'doc_birth_certificate', label: 'Birth Certificate',    required: true },
    { key: 'doc_tc',                label: 'Transfer Certificate', required: false },
    { key: 'doc_aadhaar',           label: 'Aadhaar Card',         required: false },
    { key: 'doc_photo',             label: 'Passport Photo',       required: true },
    { key: 'doc_caste_certificate', label: 'Caste Certificate',    required: false },
  ];

  return (
    <>
      <div className={styles.stepTitle}><FileText size={20} /> Document Checklist</div>
      <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)', marginBottom: 'var(--space-5)' }}>
        Check the documents you have received. Required documents must be collected before admission.
      </p>
      <div className={styles.formGrid}>
        {docs.map(d => (
          <div key={d.key as string} className={styles.formGroup} style={{ flexDirection: 'row', alignItems: 'center', gap: 'var(--space-3)' }}>
            <input
              type="checkbox"
              id={d.key as string}
              className={styles.checkbox}
              checked={!!data[d.key]}
              onChange={e => update(d.key, e.target.checked)}
            />
            <label htmlFor={d.key as string} className={styles.label} style={{ marginBottom: 0, cursor: 'pointer' }}>
              {d.label} {d.required && <span style={{ color: 'var(--color-danger)' }}>*</span>}
            </label>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 'var(--space-5)', padding: 'var(--space-4)', background: 'var(--color-warning-light)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-warning)' }}>
        <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-warning-dark)', display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <AlertTriangle size={16} /> Document verification is mandatory. Original documents must be verified by the clerk.
        </p>
      </div>
    </>
  );
}

function Step6Review({ data }: { data: WizardData }) {
  const sections = [
    {
      title: 'Personal Information',
      rows: [
        { key: 'Name (English)', val: data.full_name },
        { key: 'Name (Marathi)', val: data.full_name_marathi || '—' },
        { key: 'Date of Birth', val: data.date_of_birth ? new Date(data.date_of_birth).toLocaleDateString('en-IN') : '—' },
        { key: 'Gender', val: data.gender },
        { key: 'Blood Group', val: data.blood_group || '—' },
        { key: 'Category', val: data.category?.toUpperCase() || '—' },
      ]
    },
    {
      title: 'Parent Information',
      rows: [
        { key: "Father's Name", val: data.father_name },
        { key: "Father's Mobile", val: data.father_mobile },
        { key: "Mother's Name", val: data.mother_name || '—' },
      ]
    },
    {
      title: 'Address',
      rows: [
        { key: 'Address', val: data.address_line1 },
        { key: 'City/Village', val: data.address_city },
        { key: 'District', val: data.address_district },
        { key: 'PIN Code', val: data.address_pincode || '—' },
      ]
    },
    {
      title: 'Admission Details',
      rows: [
        { key: 'Standard', val: `Std ${data.standard}` },
        { key: 'Division', val: data.division },
        { key: 'Admission Date', val: data.admission_date ? new Date(data.admission_date).toLocaleDateString('en-IN') : '—' },
        { key: 'Transport', val: data.transport_required ? 'Yes' : 'No' },
        { key: 'Hostel', val: data.hostel_required ? 'Yes' : 'No' },
        { key: 'Previous School', val: data.previous_school || '—' },
      ]
    }
  ];

  return (
    <>
      <div className={styles.stepTitle}><Check size={20} /> Review & Confirm</div>
      <div className={styles.previewGrid}>
        {sections.map(s => (
          <div key={s.title} className={styles.previewSection}>
            <div className={styles.previewSectionTitle}>{s.title}</div>
            {s.rows.map(r => (
              <div key={r.key} className={styles.previewRow}>
                <span className={styles.previewKey}>{r.key}</span>
                <span className={styles.previewVal}>{r.val || '—'}</span>
              </div>
            ))}
          </div>
        ))}
      </div>
      <div style={{ marginTop: 'var(--space-5)', padding: 'var(--space-4)', background: 'var(--color-primary-light)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-primary)' }}>
        <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-primary)', fontWeight: 'var(--font-weight-medium)' }}>
          ✓ GR Number and Admission Number will be auto-generated by the system. A login account will be created for the student.
        </p>
      </div>
    </>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// GR REGISTER
// ══════════════════════════════════════════════════════════════════════════

function GRRegister() {
  const navigate = useNavigate();
  const [entries, setEntries] = useState<GREntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [stdFilter, setStdFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const PER_PAGE = 25;

  const loadEntries = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/students', {
        params: {
          search: search || undefined,
          standard: stdFilter || undefined,
          status: statusFilter || undefined,
          page,
          per_page: PER_PAGE,
          academic_year_id: 1,
        }
      });
      const raw = res.data?.data;
      const list = Array.isArray(raw?.students)
        ? raw.students
        : Array.isArray(raw?.items)
        ? raw.items
        : Array.isArray(raw)
        ? raw
        : [];
      setEntries(list);
      setTotal(raw?.total || list.length || 0);
    } catch {
      setEntries([]);
      toast.error('Failed to load GR entries');
    } finally { setLoading(false); }
  }, [search, stdFilter, statusFilter, page]);

  useEffect(() => { loadEntries(); }, [loadEntries]);

  const totalPages = Math.ceil(total / PER_PAGE);

  return (
    <div className={styles.grContent}>
      {/* Summary Bar */}
      <div className={styles.grSummary}>
        <div className={styles.grSummaryItem}>
          <span className={styles.grSummaryVal}>{loading ? '—' : total}</span>
          <span className={styles.grSummaryLabel}>Total Students</span>
        </div>
        <div className={styles.grDivider} />
        <div className={styles.grSummaryItem}>
          <span className={styles.grSummaryVal}>Std 1-5</span>
          <span className={styles.grSummaryLabel}>Primary Section</span>
        </div>
        <div className={styles.grDivider} />
        <div className={styles.grSummaryItem}>
          <span className={styles.grSummaryVal}>Std 6-8</span>
          <span className={styles.grSummaryLabel}>Middle Section</span>
        </div>
        <div className={styles.grDivider} />
        <div className={styles.grSummaryItem}>
          <span className={styles.grSummaryVal}>Std 9-12</span>
          <span className={styles.grSummaryLabel}>Secondary Section</span>
        </div>
      </div>

      {/* Toolbar */}
      <div className={styles.toolbar}>
        <div className={styles.toolbarLeft}>
          <div className={styles.searchWrap}>
            <Search size={15} className={styles.searchIcon} />
            <input
              className={styles.searchInput}
              placeholder="Search by name, GR number, father's name..."
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
            />
          </div>
          <select className={styles.sel} value={stdFilter} onChange={e => { setStdFilter(e.target.value); setPage(1); }}>
            <option value="">All Standards</option>
            {STANDARDS.map(s => <option key={s} value={s}>Std {s}</option>)}
          </select>
          <select className={styles.sel} value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}>
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="transferred">Transferred</option>
            <option value="graduated">Graduated</option>
          </select>
        </div>
        <div className={styles.toolbarRight}>
          <button className={styles.iconBtn} onClick={loadEntries} title="Refresh">
            <RefreshCw size={15} className={loading ? styles.spinning : ''} />
          </button>
          <button className={styles.iconBtn} title="Export Excel">
            <Download size={15} />
          </button>
          <button className={styles.iconBtn} title="Print GR Register">
            <Printer size={15} />
          </button>
          <PermissionGate permission="student.create">
            <button className={styles.primaryBtn} onClick={() => navigate('/students/add')}>
              <Plus size={15} /> Add Student
            </button>
          </PermissionGate>
        </div>
      </div>

      {/* Table */}
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>GR No.</th>
              <th>Adm. No.</th>
              <th>Student Name</th>
              <th>Father's Name</th>
              <th>Class</th>
              <th>Gender</th>
              <th>Category</th>
              <th>Admission Date</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array(8).fill(0).map((_, i) => (
                <tr key={i} className={styles.skeletonRow}>
                  {Array(10).fill(0).map((__, j) => (
                    <td key={j}><div className={styles.skeleton} style={{ width: j === 2 ? 140 : 80 }} /></td>
                  ))}
                </tr>
              ))
            ) : entries.length === 0 ? (
              <tr>
                <td colSpan={10} className={styles.emptyCell}>
                  <div className={styles.emptyState}>
                    <BookOpen size={40} />
                    <p>No students found in GR Register</p>
                    <span>Try changing your filters or add a new student</span>
                  </div>
                </td>
              </tr>
            ) : entries.map(e => (
              <tr key={e.id} className={styles.row}>
                <td><span className={styles.grNum}>{e.gr_number || '—'}</span></td>
                <td style={{ fontFamily: 'monospace', fontSize: 'var(--font-size-sm)' }}>{e.admission_number || '—'}</td>
                <td>
                  <div className={styles.nameCell}>
                    <span className={styles.fullName}>{e.full_name}</span>
                    <span className={styles.subText}>{e.date_of_birth ? new Date(e.date_of_birth).toLocaleDateString('en-IN') : ''}</span>
                  </div>
                </td>
                <td>{e.father_name || '—'}</td>
                <td>
                  <span className={styles.badge} style={{ background: 'var(--color-primary-light)', color: 'var(--color-primary)' }}>
                    Std {e.standard}{e.division ? `-${e.division}` : ''}
                  </span>
                </td>
                <td style={{ textTransform: 'capitalize' }}>{e.gender}</td>
                <td><span className={styles.badge} style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-secondary)' }}>{e.category?.toUpperCase() || 'GEN'}</span></td>
                <td style={{ fontSize: 'var(--font-size-sm)' }}>{e.admission_date ? new Date(e.admission_date).toLocaleDateString('en-IN') : '—'}</td>
                <td>
                  <span className={`${styles.badge} ${e.status === 'active' ? styles.badgeSuccess : e.status === 'transferred' ? styles.badgeWarning : styles.badgeMuted}`}>
                    {e.status || 'Active'}
                  </span>
                </td>
                <td>
                  <div className={styles.actions}>
                    <button className={styles.actionBtn} title="View Profile" onClick={() => navigate(`/students/${e.id}`)}>
                      <FileText size={13} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Pagination */}
        {!loading && total > PER_PAGE && (
          <div className={styles.pagination}>
            <span className={styles.paginInfo}>Showing {(page - 1) * PER_PAGE + 1}–{Math.min(page * PER_PAGE, total)} of {total} entries</span>
            <div className={styles.paginBtns}>
              <button className={styles.paginBtn} onClick={() => setPage(p => p - 1)} disabled={page === 1}><PrevIcon size={14} /></button>
              {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => i + 1).map(p => (
                <button key={p} className={`${styles.paginBtn} ${page === p ? styles.paginBtnActive : ''}`} onClick={() => setPage(p)}>{p}</button>
              ))}
              <button className={styles.paginBtn} onClick={() => setPage(p => p + 1)} disabled={page === totalPages}><NextIcon size={14} /></button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// PROMOTION SECTION
// ══════════════════════════════════════════════════════════════════════════

function PromotionSection() {
  const [fromStd, setFromStd] = useState('9');
  const [fromDiv, setFromDiv] = useState('');
  const [loading, setLoading] = useState(false);
  const [students, setStudents] = useState<PromoStudent[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [promoting, setPromoting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const loadStudents = async () => {
    setLoading(true);
    setStudents([]);
    setSelected(new Set());
    try {
      const res = await api.get('/students', {
        params: { standard: fromStd, division: fromDiv || undefined, per_page: 200, academic_year_id: 1 }
      });
      const raw = res.data?.data;
      const list = Array.isArray(raw?.students)
        ? raw.students
        : Array.isArray(raw?.items)
        ? raw.items
        : Array.isArray(raw)
        ? raw
        : [];
      setStudents(list.map((s: any) => ({
        id: s.id, gr_number: s.gr_number, full_name: s.full_name,
        standard: s.standard, division: s.division,
        roll_number: s.roll_number, result: '', remarks: '',
        promoted_to: String(parseInt(fromStd) + 1),
      })));
    } catch { toast.error('Failed to load students'); }
    finally { setLoading(false); }
  };

  const setResult = (id: number, result: PromoStudent['result']) =>
    setStudents(prev => prev.map(s => s.id === id ? { ...s, result } : s));

  const toggleAll = (checked: boolean) =>
    setSelected(checked ? new Set(students.map(s => s.id)) : new Set());

  const toggleOne = (id: number) =>
    setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const bulkSetResult = (result: PromoStudent['result']) =>
    setStudents(prev => prev.map(s => selected.has(s.id) ? { ...s, result } : s));

  const summary = {
    pass:     students.filter(s => s.result === 'pass').length,
    fail:     students.filter(s => s.result === 'fail').length,
    detained: students.filter(s => s.result === 'detained').length,
    pending:  students.filter(s => !s.result).length,
  };

  const handlePromote = async () => {
    setPromoting(true);
    setShowConfirm(false);
    try {
      const payload = students
        .filter(s => s.result === 'pass')
        .map(s => ({ student_id: s.id, result: s.result, promoted_to_standard: s.promoted_to }));

      await api.post('/students/bulk-promote', { promotions: payload, academic_year_id: 2 });
      toast.success(`${payload.length} students promoted successfully!`);
      loadStudents();
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Promotion failed');
    } finally { setPromoting(false); }
  };

  return (
    <div className={styles.promoContent}>
      {/* Controls */}
      <div className={styles.promoControls}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
          <label style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-text-primary)' }}>From Standard</label>
          <select className={styles.sel} value={fromStd} onChange={e => setFromStd(e.target.value)}>
            {STANDARDS.filter(s => parseInt(s) < 12).map(s => <option key={s} value={s}>Std {s}</option>)}
          </select>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
          <label style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-text-primary)' }}>Division</label>
          <select className={styles.sel} value={fromDiv} onChange={e => setFromDiv(e.target.value)}>
            <option value="">All Divisions</option>
            {DIVISIONS.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
        <button className={styles.primaryBtn} onClick={loadStudents} disabled={loading} style={{ alignSelf: 'flex-end' }}>
          {loading ? <RefreshCw size={15} className={styles.spinning} /> : <Search size={15} />}
          <span>Load Students</span>
        </button>
      </div>

      {students.length > 0 && (
        <>
          {/* Summary */}
          <div className={styles.promoSummary}>
            {[
              { label: 'Total', val: students.length, color: 'var(--color-primary)' },
              { label: 'Pass', val: summary.pass, color: 'var(--color-success)' },
              { label: 'Fail', val: summary.fail, color: 'var(--color-danger)' },
              { label: 'Detained', val: summary.detained, color: 'var(--color-warning)' },
              { label: 'Pending', val: summary.pending, color: 'var(--color-text-muted)' },
            ].map(s => (
              <div key={s.label} className={styles.promoSummCard} style={{ '--c': s.color } as React.CSSProperties}>
                <div className={styles.promoSummVal}>{s.val}</div>
                <div className={styles.promoSummLabel}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Bulk Bar */}
          {selected.size > 0 && (
            <div className={styles.promoBulkBar}>
              <span className={styles.promoBulkInfo}>{selected.size} students selected</span>
              <div className={styles.promoBulkActions}>
                {(['pass','fail','detained'] as const).map(r => (
                  <button key={r} onClick={() => bulkSetResult(r)}
                    className={styles.primaryBtn}
                    style={{
                      background: r === 'pass' ? 'var(--color-success)' : r === 'fail' ? 'var(--color-danger)' : 'var(--color-warning)',
                      height: 32, padding: '0 var(--space-4)', fontSize: 'var(--font-size-xs)'
                    }}>
                    Mark All {r.charAt(0).toUpperCase() + r.slice(1)}
                  </button>
                ))}
                <button onClick={() => setSelected(new Set())} className={styles.iconBtn}><X size={14} /></button>
              </div>
            </div>
          )}

          {/* Table */}
          <div className={styles.promoTable}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th><input type="checkbox" className={styles.checkbox} onChange={e => toggleAll(e.target.checked)} checked={selected.size === students.length && students.length > 0} /></th>
                  <th>#</th>
                  <th>GR No.</th>
                  <th>Student Name</th>
                  <th>Class</th>
                  <th>Result</th>
                  <th>Promote To</th>
                </tr>
              </thead>
              <tbody>
                {students.map((s, i) => (
                  <tr key={s.id} className={styles.row}>
                    <td><input type="checkbox" className={styles.checkbox} checked={selected.has(s.id)} onChange={() => toggleOne(s.id)} /></td>
                    <td style={{ color: 'var(--color-text-muted)', fontSize: 'var(--font-size-sm)' }}>{i + 1}</td>
                    <td><span className={styles.grNum}>{s.gr_number}</span></td>
                    <td className={styles.fullName}>{s.full_name}</td>
                    <td><span className={styles.badge} style={{ background: 'var(--color-primary-light)', color: 'var(--color-primary)' }}>Std {s.standard}{s.division ? `-${s.division}` : ''}</span></td>
                    <td>
                      <div className={styles.resultBtnWrap}>
                        {(['pass','fail','detained'] as const).map(r => (
                          <button key={r}
                            className={`${styles.resultBtn} ${s.result === r ? styles.resultBtnActive : ''}`}
                            style={{ '--rc': r === 'pass' ? 'var(--color-success)' : r === 'fail' ? 'var(--color-danger)' : 'var(--color-warning)' } as React.CSSProperties}
                            onClick={() => setResult(s.id, r)}>
                            {r.charAt(0).toUpperCase() + r.slice(1)}
                          </button>
                        ))}
                      </div>
                    </td>
                    <td style={{ fontSize: 'var(--font-size-sm)', color: s.result === 'pass' ? 'var(--color-success)' : s.result === 'fail' ? 'var(--color-danger)' : 'var(--color-text-muted)' }}>
                      {s.result === 'pass' ? `→ Std ${s.promoted_to}` : s.result === 'fail' ? 'Repeat Std ' + s.standard : s.result === 'detained' ? 'Detained' : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Promote Button */}
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <PermissionGate permission="student.update">
              <button className={styles.promoteBtnLarge} onClick={() => setShowConfirm(true)} disabled={summary.pass === 0 || promoting}>
                <Trophy size={20} />
                {promoting ? 'Promoting...' : `Promote ${summary.pass} Students to Std ${parseInt(fromStd) + 1}`}
              </button>
            </PermissionGate>
          </div>
        </>
      )}

      {/* Confirm Dialog */}
      {showConfirm && (
        <div className={styles.confirmDialog} onClick={() => setShowConfirm(false)}>
          <div className={styles.confirmCard} onClick={e => e.stopPropagation()}>
            <div className={styles.confirmTitle}>Confirm Bulk Promotion</div>
            <p className={styles.confirmText}>
              You are about to promote <strong>{summary.pass} students</strong> from Std {fromStd} to Std {parseInt(fromStd) + 1}.<br /><br />
              This action creates a new student record for the next academic year. This cannot be undone without admin intervention.
            </p>
            <div className={styles.confirmActions}>
              <button className={styles.backBtn} onClick={() => setShowConfirm(false)}>Cancel</button>
              <button className={styles.dangerBtn} onClick={handlePromote}>Confirm Promotion</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
