import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { ChevronLeft, ChevronRight, Save, User, Users, MapPin, BookOpen, Heart, CheckCircle2 } from 'lucide-react';
import studentService from '../../services/studentService';
import styles from './AddStudentPage.module.css';

// ── Validation Schema ─────────────────────────────────────────
const schema = z.object({
  // Step 1 — Basic Info
  first_name: z.string().min(1, 'First name is required'),
  middle_name: z.string().optional(),
  last_name: z.string().min(1, 'Last name is required'),
  full_name_marathi: z.string().optional(),
  standard: z.string().min(1, 'Standard is required'),
  division: z.string().optional(),
  roll_number: z.number().optional(),
  dob: z.string().optional(),
  gender: z.string().optional(),
  blood_group: z.string().optional(),
  admission_date: z.string().optional(),

  // Step 2 — Parent Info
  father_name: z.string().optional(),
  father_name_marathi: z.string().optional(),
  father_occupation: z.string().optional(),
  father_mobile: z.string().optional(),
  father_email: z.string().optional(),
  mother_name_full: z.string().optional(),
  mother_name_marathi: z.string().optional(),
  mother_occupation: z.string().optional(),
  mother_mobile: z.string().optional(),
  guardian_name: z.string().optional(),
  guardian_mobile: z.string().optional(),
  guardian_relation: z.string().optional(),
  mobile: z.string().optional(),
  email: z.string().optional(),

  // Step 3 — Address
  address_line1: z.string().optional(),
  address_line2: z.string().optional(),
  village: z.string().optional(),
  taluka: z.string().optional(),
  district: z.string().optional(),
  state: z.string().optional(),
  pincode: z.string().optional(),

  // Step 4 — Academic / Govt
  nationality: z.string().optional(),
  religion: z.string().optional(),
  caste: z.string().optional(),
  sub_caste: z.string().optional(),
  category: z.string().optional(),
  mother_tongue: z.string().optional(),
  aadhaar_number: z.string().optional(),
  student_id_saral: z.string().optional(),
  pen_number: z.string().optional(),
  apaar_id: z.string().optional(),
  previous_school: z.string().optional(),
  previous_standard: z.string().optional(),

  // Step 5 — Medical
  medical_conditions: z.string().optional(),
  disability: z.string().optional(),
  is_differently_abled: z.boolean().optional(),
  uses_transport: z.boolean().optional(),
});

type FormData = z.infer<typeof schema>;

// ── Step Config ───────────────────────────────────────────────
const STEPS = [
  { id: 1, label: 'Basic Info',    icon: <User size={16} /> },
  { id: 2, label: 'Parent / Contact', icon: <Users size={16} /> },
  { id: 3, label: 'Address',       icon: <MapPin size={16} /> },
  { id: 4, label: 'Academic / Govt', icon: <BookOpen size={16} /> },
  { id: 5, label: 'Medical',       icon: <Heart size={16} /> },
];

const STANDARDS = ['1','2','3','4','5','6','7','8','9','10','11','12'];
const BLOOD_GROUPS = ['A+','A-','B+','B-','AB+','AB-','O+','O-'];
const CATEGORIES = ['SC','ST','OBC','NT','SBC','VJ','Open'];
const RELIGIONS = ['Hindu','Muslim','Christian','Buddhist','Jain','Sikh','Other'];
const CASTES_COMMON = ['Maratha','Brahmin','Mahar','Mang','Koli','Yadav','Teli','Lohar','Sonar','Other'];

export default function AddStudentPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);

  const { register, handleSubmit, watch, control, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      state: 'Maharashtra',
      nationality: 'Indian',
      is_differently_abled: false,
      uses_transport: false,
    },
  });

  const isLastStep = step === STEPS.length;

  const onSubmit = async (data: FormData) => {
    if (!isLastStep) { setStep(s => s + 1); return; }
    setSaving(true);
    try {
      const payload = {
        ...data,
        roll_number: data.roll_number ? Number(data.roll_number) : undefined,
        admission_date: data.admission_date || new Date().toISOString().split('T')[0],
      };
      const result = await studentService.create(payload);
      toast.success(`Student admitted! GR: ${result.gr_number}`);
      navigate(`/students/${result.id}`);
    } catch (err: any) {
      const msg = err?.response?.data?.detail || err?.response?.data?.message || 'Admission failed. Please try again.';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const F = ({ label, id, error, required, children }: {
    label: string; id: string; error?: string; required?: boolean; children: React.ReactNode;
  }) => (
    <div className={styles.field}>
      <label className={styles.label} htmlFor={id}>
        {label}{required && <span className={styles.req}>*</span>}
      </label>
      {children}
      {error && <span className={styles.err}>{error}</span>}
    </div>
  );

  const Inp = ({ id, placeholder, type = 'text', ...props }: any) => (
    <input id={id} type={type} placeholder={placeholder}
      className={`${styles.input} ${errors[id as keyof FormData] ? styles.inputErr : ''}`}
      {...register(id as keyof FormData, { valueAsNumber: type === 'number' })} {...props} />
  );

  const Sel = ({ id, children }: { id: keyof FormData; children: React.ReactNode }) => (
    <select id={id as string} className={styles.input} {...register(id)}>
      {children}
    </select>
  );

  const Txt = ({ id, rows = 3 }: { id: keyof FormData; rows?: number }) => (
    <textarea id={id as string} rows={rows} className={styles.input}
      {...register(id)} />
  );

  return (
    <div className={styles.page}>
      {/* Page Header */}
      <div className={styles.pageHeader}>
        <button className={styles.backBtn} onClick={() => navigate('/students')}>
          <ChevronLeft size={16} /> Back to Students
        </button>
        <div>
          <h1 className={styles.pageTitle}>New Student Admission</h1>
          <p className={styles.pageSub}>नवीन विद्यार्थी प्रवेश · Hindkesri Maruti Mane Vidyalay</p>
        </div>
      </div>

      {/* Step Indicator */}
      <div className={styles.stepBar}>
        {STEPS.map((s, i) => (
          <div key={s.id} className={styles.stepItem}>
            <div className={`${styles.stepDot} ${step > s.id ? styles.stepDone : step === s.id ? styles.stepActive : ''}`}>
              {step > s.id ? '✓' : s.icon}
            </div>
            <span className={`${styles.stepLabel} ${step === s.id ? styles.stepLabelActive : ''}`}>
              {s.label}
            </span>
            {i < STEPS.length - 1 && (
              <div className={`${styles.stepLine} ${step > s.id ? styles.stepLineDone : ''}`} />
            )}
          </div>
        ))}
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <div className={styles.card}>

          {/* ── Step 1: Basic Info ──────────────────────────── */}
          {step === 1 && (
            <div className={styles.stepContent}>
              <h2 className={styles.stepTitle}>Basic Information</h2>
              <div className={styles.grid3}>
                <F label="First Name" id="first_name" required error={errors.first_name?.message}>
                  <Inp id="first_name" placeholder="e.g. Arjun" />
                </F>
                <F label="Middle Name" id="middle_name">
                  <Inp id="middle_name" placeholder="e.g. Manoj" />
                </F>
                <F label="Last Name / Surname" id="last_name" required error={errors.last_name?.message}>
                  <Inp id="last_name" placeholder="e.g. Patil" />
                </F>
              </div>
              <div className={styles.grid2}>
                <F label="Full Name in Marathi" id="full_name_marathi">
                  <Inp id="full_name_marathi" placeholder="अर्जुन मनोज पाटील" />
                </F>
                <F label="Mother's Name (Surname)" id="mother_name">
                  <Inp id="mother_name" placeholder="Mother's maiden surname" />
                </F>
              </div>
              <div className={styles.grid4}>
                <F label="Standard" id="standard" required error={errors.standard?.message}>
                  <Sel id="standard">
                    <option value="">Select Std</option>
                    {STANDARDS.map(s => <option key={s} value={s}>Std {s}</option>)}
                  </Sel>
                </F>
                <F label="Division" id="division">
                  <Inp id="division" placeholder="A / B / C" maxLength={2} />
                </F>
                <F label="Roll Number" id="roll_number">
                  <Inp id="roll_number" type="number" placeholder="e.g. 15" min={1} />
                </F>
                <F label="Gender" id="gender">
                  <Sel id="gender">
                    <option value="">Select</option>
                    <option value="male">Male (मुलगा)</option>
                    <option value="female">Female (मुलगी)</option>
                    <option value="other">Other</option>
                  </Sel>
                </F>
              </div>
              <div className={styles.grid3}>
                <F label="Date of Birth" id="dob">
                  <Inp id="dob" type="date" />
                </F>
                <F label="Blood Group" id="blood_group">
                  <Sel id="blood_group">
                    <option value="">Select</option>
                    {BLOOD_GROUPS.map(b => <option key={b}>{b}</option>)}
                  </Sel>
                </F>
                <F label="Admission Date" id="admission_date">
                  <Inp id="admission_date" type="date" />
                </F>
              </div>
            </div>
          )}

          {/* ── Step 2: Parent / Contact ────────────────────── */}
          {step === 2 && (
            <div className={styles.stepContent}>
              <h2 className={styles.stepTitle}>Parent & Contact Information</h2>
              <div className={styles.sectionTitle}>Father's Details</div>
              <div className={styles.grid3}>
                <F label="Father's Full Name" id="father_name">
                  <Inp id="father_name" placeholder="e.g. Manoj Ramesh Patil" />
                </F>
                <F label="Father's Name in Marathi" id="father_name_marathi">
                  <Inp id="father_name_marathi" placeholder="मनोज रमेश पाटील" />
                </F>
                <F label="Father's Occupation" id="father_occupation">
                  <Inp id="father_occupation" placeholder="e.g. Farmer, Teacher" />
                </F>
              </div>
              <div className={styles.grid2}>
                <F label="Father's Mobile" id="father_mobile">
                  <Inp id="father_mobile" placeholder="10-digit mobile number" maxLength={15} />
                </F>
                <F label="Father's Email" id="father_email">
                  <Inp id="father_email" type="email" placeholder="father@email.com" />
                </F>
              </div>

              <div className={styles.sectionTitle}>Mother's Details</div>
              <div className={styles.grid3}>
                <F label="Mother's Full Name" id="mother_name_full">
                  <Inp id="mother_name_full" placeholder="e.g. Sunita Manoj Patil" />
                </F>
                <F label="Mother's Name in Marathi" id="mother_name_marathi">
                  <Inp id="mother_name_marathi" placeholder="सुनिता मनोज पाटील" />
                </F>
                <F label="Mother's Occupation" id="mother_occupation">
                  <Inp id="mother_occupation" placeholder="e.g. Homemaker" />
                </F>
              </div>
              <div className={styles.grid2}>
                <F label="Mother's Mobile" id="mother_mobile">
                  <Inp id="mother_mobile" placeholder="10-digit mobile number" />
                </F>
                <F label="Student Mobile" id="mobile">
                  <Inp id="mobile" placeholder="Student's own mobile (if any)" />
                </F>
              </div>

              <div className={styles.sectionTitle}>Guardian (if different from parents)</div>
              <div className={styles.grid3}>
                <F label="Guardian Name" id="guardian_name">
                  <Inp id="guardian_name" placeholder="Full name" />
                </F>
                <F label="Guardian Mobile" id="guardian_mobile">
                  <Inp id="guardian_mobile" placeholder="Mobile" />
                </F>
                <F label="Relation to Student" id="guardian_relation">
                  <Inp id="guardian_relation" placeholder="e.g. Uncle, Grandparent" />
                </F>
              </div>
            </div>
          )}

          {/* ── Step 3: Address ─────────────────────────────── */}
          {step === 3 && (
            <div className={styles.stepContent}>
              <h2 className={styles.stepTitle}>Address</h2>
              <div className={styles.grid1}>
                <F label="Address Line 1" id="address_line1">
                  <Inp id="address_line1" placeholder="House No., Street, Area..." />
                </F>
                <F label="Address Line 2" id="address_line2">
                  <Inp id="address_line2" placeholder="Landmark (optional)" />
                </F>
              </div>
              <div className={styles.grid3}>
                <F label="Village / Area" id="village">
                  <Inp id="village" placeholder="Village or locality" />
                </F>
                <F label="Taluka" id="taluka">
                  <Inp id="taluka" placeholder="e.g. Daund" />
                </F>
                <F label="District" id="district">
                  <Inp id="district" placeholder="e.g. Pune" />
                </F>
              </div>
              <div className={styles.grid2}>
                <F label="State" id="state">
                  <Inp id="state" placeholder="Maharashtra" />
                </F>
                <F label="PIN Code" id="pincode">
                  <Inp id="pincode" placeholder="6-digit PIN" maxLength={6} />
                </F>
              </div>
            </div>
          )}

          {/* ── Step 4: Academic / Govt ─────────────────────── */}
          {step === 4 && (
            <div className={styles.stepContent}>
              <h2 className={styles.stepTitle}>Academic & Government Details</h2>
              <div className={styles.grid3}>
                <F label="Nationality" id="nationality">
                  <Inp id="nationality" placeholder="Indian" />
                </F>
                <F label="Mother Tongue" id="mother_tongue">
                  <Inp id="mother_tongue" placeholder="e.g. Marathi, Hindi" />
                </F>
                <F label="Religion" id="religion">
                  <Sel id="religion">
                    <option value="">Select</option>
                    {RELIGIONS.map(r => <option key={r}>{r}</option>)}
                  </Sel>
                </F>
              </div>
              <div className={styles.grid3}>
                <F label="Caste" id="caste">
                  <Sel id="caste">
                    <option value="">Select</option>
                    {CASTES_COMMON.map(c => <option key={c}>{c}</option>)}
                  </Sel>
                </F>
                <F label="Sub-Caste" id="sub_caste">
                  <Inp id="sub_caste" placeholder="Sub-caste (if any)" />
                </F>
                <F label="Category" id="category">
                  <Sel id="category">
                    <option value="">Select</option>
                    {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                  </Sel>
                </F>
              </div>
              <div className={styles.grid3}>
                <F label="Aadhaar Number" id="aadhaar_number">
                  <Inp id="aadhaar_number" placeholder="12-digit Aadhaar" maxLength={12} />
                </F>
                <F label="SARAL Student ID" id="student_id_saral">
                  <Inp id="student_id_saral" placeholder="Maharashtra SARAL ID" />
                </F>
                <F label="PEN Number" id="pen_number">
                  <Inp id="pen_number" placeholder="Permanent Education Number" />
                </F>
              </div>
              <div className={styles.grid3}>
                <F label="APAAR ID" id="apaar_id">
                  <Inp id="apaar_id" placeholder="Academic Bank of Credits ID" />
                </F>
                <F label="Previous School" id="previous_school">
                  <Inp id="previous_school" placeholder="Name of previous school" />
                </F>
                <F label="Previous Standard" id="previous_standard">
                  <Sel id="previous_standard">
                    <option value="">Select</option>
                    {STANDARDS.map(s => <option key={s} value={s}>Std {s}</option>)}
                  </Sel>
                </F>
              </div>
            </div>
          )}

          {/* ── Step 5: Medical ─────────────────────────────── */}
          {step === 5 && (
            <div className={styles.stepContent}>
              <h2 className={styles.stepTitle}>Medical & Additional Details</h2>
              <div className={styles.grid1}>
                <F label="Medical Conditions / Allergies" id="medical_conditions">
                  <Txt id="medical_conditions" rows={4} />
                </F>
              </div>
              <div className={styles.grid2}>
                <F label="Disability (if any)" id="disability">
                  <Inp id="disability" placeholder="Describe any disability" />
                </F>
              </div>
              <div className={styles.checkboxGroup}>
                <label className={styles.checkboxLabel}>
                  <input type="checkbox" {...register('is_differently_abled')} className={styles.checkbox} />
                  <span>Is Differently Abled (दिव्यांग विद्यार्थी)</span>
                </label>
                <label className={styles.checkboxLabel}>
                  <input type="checkbox" {...register('uses_transport')} className={styles.checkbox} />
                  <span>Uses School Transport (शालेय वाहतूक)</span>
                </label>
              </div>

              <div className={styles.reviewBox}>
                <div className={styles.reviewTitle}><CheckCircle2 size={16} className="inline mr-1 text-emerald-500" /> Ready to Submit</div>
                <p className={styles.reviewText}>
                  A GR number will be automatically assigned. Review all details before submitting.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Navigation Buttons */}
        <div className={styles.formNav}>
          <button
            type="button"
            className={styles.prevBtn}
            onClick={() => setStep(s => Math.max(1, s - 1))}
            disabled={step === 1}
          >
            <ChevronLeft size={16} /> Previous
          </button>

          <div className={styles.stepDots}>
            {STEPS.map(s => (
              <div
                key={s.id}
                className={`${styles.dot} ${step === s.id ? styles.dotActive : step > s.id ? styles.dotDone : ''}`}
              />
            ))}
          </div>

          <button
            type="submit"
            className={styles.nextBtn}
            disabled={saving}
            id="student-form-next"
          >
            {saving ? <span className={styles.spinner} /> : null}
            {isLastStep
              ? saving ? 'Saving...' : <><Save size={16} /> Submit Admission</>
              : <>Next <ChevronRight size={16} /></>
            }
          </button>
        </div>
      </form>
    </div>
  );
}
