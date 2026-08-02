import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import toast from 'react-hot-toast';
import { ChevronLeft, ChevronRight, Save, User, Briefcase, MapPin, BookOpen, CreditCard } from 'lucide-react';
import teacherService from '../../services/teacherService';
import styles from '../../pages/students/AddStudentPage.module.css'; // reuse same CSS

const schema = z.object({
  first_name: z.string().min(1, 'First name required'),
  middle_name: z.string().optional(),
  last_name: z.string().min(1, 'Last name required'),
  full_name_marathi: z.string().optional(),
  salutation: z.string().optional(),
  employee_type: z.string().min(1, 'Employee type required'),
  designation: z.string().min(1, 'Designation required'),
  department: z.string().optional(),
  subjects: z.string().optional(),
  classes_assigned: z.string().optional(),
  date_of_joining: z.string().optional(),
  dob: z.string().optional(),
  gender: z.string().optional(),
  blood_group: z.string().optional(),
  nationality: z.string().optional(),
  religion: z.string().optional(),
  caste: z.string().optional(),
  category: z.string().optional(),
  marital_status: z.string().optional(),
  mother_tongue: z.string().optional(),
  aadhaar_number: z.string().optional(),
  pan_number: z.string().optional(),
  pf_number: z.string().optional(),
  gpf_number: z.string().optional(),
  dcps_account: z.string().optional(),
  pran_number: z.string().optional(),
  teacher_saral_id: z.string().optional(),
  mobile: z.string().optional(),
  mobile_alt: z.string().optional(),
  email: z.string().optional(),
  email_official: z.string().optional(),
  address_line1: z.string().optional(),
  address_line2: z.string().optional(),
  village: z.string().optional(),
  taluka: z.string().optional(),
  district: z.string().optional(),
  state: z.string().optional(),
  pincode: z.string().optional(),
  highest_qualification: z.string().optional(),
  specialization: z.string().optional(),
  b_ed_year: z.union([z.number(), z.string(), z.undefined()]).optional(),
  d_ed_year: z.union([z.number(), z.string(), z.undefined()]).optional(),
  pay_scale: z.string().optional(),
  basic_salary: z.union([z.number(), z.string(), z.undefined()]).optional(),
  grade_pay: z.union([z.number(), z.string(), z.undefined()]).optional(),
  bank_name: z.string().optional(),
  bank_account_number: z.string().optional(),
  bank_ifsc: z.string().optional(),
  bank_branch: z.string().optional(),
  father_name: z.string().optional(),
  mother_name: z.string().optional(),
  spouse_name: z.string().optional(),
  emergency_contact_name: z.string().optional(),
  emergency_contact_mobile: z.string().optional(),
  emergency_contact_relation: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

const STEPS = [
  { id: 1, label: 'Basic Info',     icon: <User size={16}/> },
  { id: 2, label: 'Employment',     icon: <Briefcase size={16}/> },
  { id: 3, label: 'Address',        icon: <MapPin size={16}/> },
  { id: 4, label: 'Qualifications', icon: <BookOpen size={16}/> },
  { id: 5, label: 'Bank / Govt',    icon: <CreditCard size={16}/> },
];

const BLOOD_GROUPS = ['A+','A-','B+','B-','AB+','AB-','O+','O-'];
const CATEGORIES   = ['SC','ST','OBC','NT','SBC','VJ','Open'];
const RELIGIONS    = ['Hindu','Muslim','Christian','Buddhist','Jain','Sikh','Other'];
const EMP_TYPES    = ['teaching','non_teaching','contract','part_time','visiting'];
const DESIGNATIONS = ['Assistant Teacher','Head Master','Senior Teacher','Lab Assistant','Clerk','Librarian','Peon','Computer Teacher','PT Teacher','Art Teacher','Music Teacher','Other'];
const QUALIFS      = ['B.A.','M.A.','B.Sc.','M.Sc.','B.Com.','M.Com.','B.Ed.','M.Ed.','D.Ed.','Ph.D.','Diploma','Other'];

export default function AddTeacherPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const isLast = step === STEPS.length;

  const { register, handleSubmit, trigger, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      state: 'Maharashtra',
      nationality: 'Indian',
      employee_type: 'teaching',
      designation: 'Assistant Teacher',
    },
  });

  const handleNext = async () => {
    if (step === 1) {
      const isValid = await trigger(['first_name', 'last_name']);
      if (isValid) setStep(2);
      else toast.error('First Name and Last Name are required.');
    } else if (step === 2) {
      const isValid = await trigger(['employee_type', 'designation']);
      if (isValid) setStep(3);
      else toast.error('Employee Type and Designation are required.');
    } else if (step < STEPS.length) {
      setStep(s => s + 1);
    }
  };

  const onSubmit = async (data: FormData) => {
    setSaving(true);
    try {
      const payload: any = {};
      Object.entries(data).forEach(([key, val]) => {
        if (val !== '' && val !== null && val !== undefined && !Number.isNaN(val)) {
          payload[key] = val;
        }
      });

      if (payload.b_ed_year) payload.b_ed_year = Number(payload.b_ed_year);
      if (payload.d_ed_year) payload.d_ed_year = Number(payload.d_ed_year);
      if (payload.basic_salary) payload.basic_salary = Number(payload.basic_salary);
      if (payload.grade_pay) payload.grade_pay = Number(payload.grade_pay);

      const result = await teacherService.create(payload);
      toast.success(`✅ Staff added! Employee ID: ${result.employee_id}`);
      navigate(`/teachers/${result.id}`);
    } catch (err: any) {
      const resp = err?.response?.data;
      let errMsg = 'Failed to add staff.';
      if (resp) {
        if (resp.message) {
          errMsg = resp.message;
        } else if (resp.detail) {
          errMsg = typeof resp.detail === 'string' ? resp.detail : JSON.stringify(resp.detail);
        }
        if (Array.isArray(resp.errors) && resp.errors.length > 0) {
          const errList = resp.errors.map((e: any) => `${e.field || 'field'}: ${e.message || e.msg}`).join(', ');
          errMsg += ` (${errList})`;
        }
      }
      toast.error(errMsg);
    } finally { setSaving(false); }
  };

  const F = ({ label, id, error, required, children }: any) => (
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
    <select id={id as string} className={styles.input} {...register(id)}>{children}</select>
  );

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <button className={styles.backBtn} onClick={() => navigate('/teachers')}>
          <ChevronLeft size={16}/> Back to Staff
        </button>
        <div>
          <h1 className={styles.pageTitle}>Add New Staff Member</h1>
          <p className={styles.pageSub}>नवीन शिक्षक / कर्मचारी नोंद · Employee ID will be auto-generated</p>
        </div>
      </div>

      {/* Step Bar */}
      <div className={styles.stepBar}>
        {STEPS.map((s, i) => (
          <div key={s.id} className={styles.stepItem} onClick={() => setStep(s.id)} style={{ cursor: 'pointer' }}>
            <div className={`${styles.stepDot} ${step > s.id ? styles.stepDone : step === s.id ? styles.stepActive : ''}`}>
              {step > s.id ? '✓' : s.icon}
            </div>
            <span className={`${styles.stepLabel} ${step === s.id ? styles.stepLabelActive : ''}`}>{s.label}</span>
            {i < STEPS.length - 1 && <div className={`${styles.stepLine} ${step > s.id ? styles.stepLineDone : ''}`} />}
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <div className={styles.card}>

          {/* Step 1 — Basic Info */}
          {step === 1 && (
            <div className={styles.stepContent}>
              <h2 className={styles.stepTitle}>Personal Information</h2>
              <div className={styles.grid4}>
                <F label="Salutation" id="salutation"><Sel id="salutation"><option value="">-</option>{['Mr.','Mrs.','Ms.','Dr.','Prof.'].map(s=><option key={s}>{s}</option>)}</Sel></F>
                <F label="First Name" id="first_name" required error={errors.first_name?.message}><Inp id="first_name" placeholder="First name"/></F>
                <F label="Middle Name" id="middle_name"><Inp id="middle_name" placeholder="Father's name"/></F>
                <F label="Surname" id="last_name" required error={errors.last_name?.message}><Inp id="last_name" placeholder="Last name"/></F>
              </div>
              <div className={styles.grid2}>
                <F label="Full Name in Marathi" id="full_name_marathi"><Inp id="full_name_marathi" placeholder="मराठीत पूर्ण नाव"/></F>
                <F label="Gender" id="gender"><Sel id="gender"><option value="">Select</option><option value="male">Male (पुरुष)</option><option value="female">Female (महिला)</option><option value="other">Other</option></Sel></F>
              </div>
              <div className={styles.grid3}>
                <F label="Date of Birth" id="dob"><Inp id="dob" type="date"/></F>
                <F label="Blood Group" id="blood_group"><Sel id="blood_group"><option value="">Select</option>{BLOOD_GROUPS.map(b=><option key={b}>{b}</option>)}</Sel></F>
                <F label="Marital Status" id="marital_status"><Sel id="marital_status"><option value="">Select</option>{['Single','Married','Divorced','Widowed'].map(m=><option key={m}>{m}</option>)}</Sel></F>
              </div>
              <div className={styles.grid3}>
                <F label="Religion" id="religion"><Sel id="religion"><option value="">Select</option>{RELIGIONS.map(r=><option key={r}>{r}</option>)}</Sel></F>
                <F label="Caste" id="caste"><Inp id="caste" placeholder="Caste"/></F>
                <F label="Category" id="category"><Sel id="category"><option value="">Select</option>{CATEGORIES.map(c=><option key={c}>{c}</option>)}</Sel></F>
              </div>
              <div className={styles.grid2}>
                <F label="Mobile" id="mobile"><Inp id="mobile" placeholder="Mobile number" maxLength={15}/></F>
                <F label="Email" id="email"><Inp id="email" type="email" placeholder="Personal email"/></F>
              </div>
            </div>
          )}

          {/* Step 2 — Employment */}
          {step === 2 && (
            <div className={styles.stepContent}>
              <h2 className={styles.stepTitle}>Employment Details</h2>
              <div className={styles.grid3}>
                <F label="Employee Type" id="employee_type" required error={errors.employee_type?.message}><Sel id="employee_type"><option value="">Select</option>{EMP_TYPES.map(t=><option key={t} value={t}>{t.replace('_',' ')}</option>)}</Sel></F>
                <F label="Designation" id="designation" required error={errors.designation?.message}><Sel id="designation"><option value="">Select</option>{DESIGNATIONS.map(d=><option key={d}>{d}</option>)}</Sel></F>
                <F label="Department" id="department"><Inp id="department" placeholder="e.g. Science, Commerce"/></F>
              </div>
              <div className={styles.grid2}>
                <F label="Subjects (comma-separated)" id="subjects"><Inp id="subjects" placeholder="e.g. Maths, Science, English"/></F>
                <F label="Classes Assigned" id="classes_assigned"><Inp id="classes_assigned" placeholder="e.g. 5A, 6B, 7A"/></F>
              </div>
              <div className={styles.grid3}>
                <F label="Date of Joining" id="date_of_joining"><Inp id="date_of_joining" type="date"/></F>
                <F label="SARAL Employee ID" id="teacher_saral_id"><Inp id="teacher_saral_id" placeholder="Maharashtra SARAL ID"/></F>
                <F label="Alt Mobile" id="mobile_alt"><Inp id="mobile_alt" placeholder="Alternative mobile"/></F>
              </div>
              <div className={styles.grid2}>
                <F label="Official Email" id="email_official"><Inp id="email_official" type="email" placeholder="school.gov.in email"/></F>
              </div>
              <div className={styles.sectionTitle}>Family Details</div>
              <div className={styles.grid3}>
                <F label="Father's Name" id="father_name"><Inp id="father_name" placeholder="Father's name"/></F>
                <F label="Mother's Name" id="mother_name"><Inp id="mother_name" placeholder="Mother's name"/></F>
                <F label="Spouse Name" id="spouse_name"><Inp id="spouse_name" placeholder="Spouse name (if married)"/></F>
              </div>
              <div className={styles.sectionTitle}>Emergency Contact</div>
              <div className={styles.grid3}>
                <F label="Contact Name" id="emergency_contact_name"><Inp id="emergency_contact_name" placeholder="Name"/></F>
                <F label="Contact Mobile" id="emergency_contact_mobile"><Inp id="emergency_contact_mobile" placeholder="Mobile"/></F>
                <F label="Relation" id="emergency_contact_relation"><Inp id="emergency_contact_relation" placeholder="e.g. Spouse, Brother"/></F>
              </div>
            </div>
          )}

          {/* Step 3 — Address */}
          {step === 3 && (
            <div className={styles.stepContent}>
              <h2 className={styles.stepTitle}>Address</h2>
              <div className={styles.grid1}>
                <F label="Address Line 1" id="address_line1"><Inp id="address_line1" placeholder="House No., Street, Area..."/></F>
                <F label="Address Line 2 (Landmark)" id="address_line2"><Inp id="address_line2" placeholder="Optional"/></F>
              </div>
              <div className={styles.grid3}>
                <F label="Village / Locality" id="village"><Inp id="village" placeholder="Village or area"/></F>
                <F label="Taluka" id="taluka"><Inp id="taluka" placeholder="Taluka"/></F>
                <F label="District" id="district"><Inp id="district" placeholder="District"/></F>
              </div>
              <div className={styles.grid2}>
                <F label="State" id="state"><Inp id="state" placeholder="Maharashtra"/></F>
                <F label="PIN Code" id="pincode"><Inp id="pincode" placeholder="6-digit PIN" maxLength={6}/></F>
              </div>
            </div>
          )}

          {/* Step 4 — Qualifications */}
          {step === 4 && (
            <div className={styles.stepContent}>
              <h2 className={styles.stepTitle}>Qualifications</h2>
              <div className={styles.grid3}>
                <F label="Highest Qualification" id="highest_qualification"><Sel id="highest_qualification"><option value="">Select</option>{QUALIFS.map(q=><option key={q}>{q}</option>)}</Sel></F>
                <F label="Specialization / Subject" id="specialization"><Inp id="specialization" placeholder="e.g. Mathematics, Hindi Lit."/></F>
                <F label="Mother Tongue" id="mother_tongue"><Inp id="mother_tongue" placeholder="e.g. Marathi, Hindi"/></F>
              </div>
              <div className={styles.grid2}>
                <F label="B.Ed. Year of Passing" id="b_ed_year"><Inp id="b_ed_year" type="number" placeholder="e.g. 2015" min={1970} max={2030}/></F>
                <F label="D.Ed. Year of Passing" id="d_ed_year"><Inp id="d_ed_year" type="number" placeholder="e.g. 2010" min={1970} max={2030}/></F>
              </div>
              <div className={styles.reviewBox}>
                <div className={styles.reviewTitle}>💡 Additional qualifications can be added from the teacher profile after saving.</div>
              </div>
            </div>
          )}

          {/* Step 5 — Bank / Govt IDs */}
          {step === 5 && (
            <div className={styles.stepContent}>
              <h2 className={styles.stepTitle}>Bank &amp; Government Details</h2>
              <div className={styles.sectionTitle}>Government IDs</div>
              <div className={styles.grid3}>
                <F label="Aadhaar Number" id="aadhaar_number"><Inp id="aadhaar_number" placeholder="12-digit Aadhaar" maxLength={12}/></F>
                <F label="PAN Number" id="pan_number"><Inp id="pan_number" placeholder="10-digit PAN" maxLength={10}/></F>
                <F label="PF / EPF Number" id="pf_number"><Inp id="pf_number" placeholder="PF account number"/></F>
              </div>
              <div className={styles.grid3}>
                <F label="GPF Number" id="gpf_number"><Inp id="gpf_number" placeholder="GPF account"/></F>
                <F label="DCPS / NPS Account" id="dcps_account"><Inp id="dcps_account" placeholder="DCPS account"/></F>
                <F label="PRAN Number" id="pran_number"><Inp id="pran_number" placeholder="Pension PRAN"/></F>
              </div>
              <div className={styles.sectionTitle}>Salary &amp; Bank</div>
              <div className={styles.grid3}>
                <F label="Pay Scale" id="pay_scale"><Inp id="pay_scale" placeholder="e.g. Level 7, PB-2"/></F>
                <F label="Basic Salary (₹)" id="basic_salary"><Inp id="basic_salary" type="number" placeholder="Monthly basic"/></F>
                <F label="Grade Pay (₹)" id="grade_pay"><Inp id="grade_pay" type="number" placeholder="Grade pay"/></F>
              </div>
              <div className={styles.grid2}>
                <F label="Bank Name" id="bank_name"><Inp id="bank_name" placeholder="Bank name"/></F>
                <F label="Account Number" id="bank_account_number"><Inp id="bank_account_number" placeholder="Bank account number"/></F>
              </div>
              <div className={styles.grid2}>
                <F label="IFSC Code" id="bank_ifsc"><Inp id="bank_ifsc" placeholder="IFSC code" maxLength={11}/></F>
                <F label="Branch Name" id="bank_branch"><Inp id="bank_branch" placeholder="Branch name and location"/></F>
              </div>
              <div className={styles.reviewBox}>
                <div className={styles.reviewTitle}>✅ Ready to Submit</div>
                <p className={styles.reviewText}>An Employee ID will be auto-assigned. All details can be updated from the profile.</p>
              </div>
            </div>
          )}
        </div>

        <div className={styles.formNav}>
          <button type="button" className={styles.prevBtn} onClick={() => setStep(s => Math.max(1, s - 1))} disabled={step === 1}>
            <ChevronLeft size={16}/> Previous
          </button>
          <div className={styles.stepDots}>
            {STEPS.map(s => <div key={s.id} className={`${styles.dot} ${step === s.id ? styles.dotActive : step > s.id ? styles.dotDone : ''}`} />)}
          </div>
          {isLast ? (
            <button type="submit" className={styles.nextBtn} disabled={saving} id="teacher-form-next">
              {saving ? <span className={styles.spinner}/> : <><Save size={16}/> Save Staff</>}
            </button>
          ) : (
            <button type="button" className={styles.nextBtn} onClick={handleNext} id="teacher-form-next">
              Next <ChevronRight size={16}/>
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
