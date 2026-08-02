/**
 * VidyaSetu — Student Portal API Service
 * ========================================
 * Calls /api/v1/student-portal/* endpoints.
 */
import api from './api';

export interface StudentProfile {
  id: number;
  gr_number: string;
  admission_number?: string;
  full_name: string;
  full_name_marathi?: string;
  standard: string;
  division?: string;
  roll_number?: number;
  dob?: string;
  gender?: string;
  blood_group?: string;
  photo_path?: string;
  father_name?: string;
  mother_name_full?: string;
  father_mobile?: string;
  mobile?: string;
  address_line1?: string;
  village?: string;
  district?: string;
  state?: string;
  religion?: string;
  category?: string;
  academic_year?: string;
  stats: {
    attendance_percentage: number;
    total_present: number;
    total_working_days: number;
    pending_fees: number;
    issued_books: number;
    upcoming_exams: number;
  };
}

export interface AttendanceDay {
  status: 'present' | 'absent' | 'late' | 'half_day' | 'leave' | 'medical_leave';
  remarks?: string;
  period?: string;
}

export interface MonthlySummary {
  working_days: number;
  present_days: number;
  absent_days: number;
  late_days: number;
  leave_days: number;
  percentage: number;
}

export interface YearlySummary extends MonthlySummary {
  year: number;
  month: number;
  month_name_mr: string;
  month_name_en: string;
}

export interface AttendanceData {
  year: number;
  month: number;
  month_name_mr: string;
  month_name_en: string;
  daily: Record<number, AttendanceDay>;
  holidays: Record<number, string>;
  summary: MonthlySummary;
  yearly: YearlySummary[];
}

export interface ExamSubjectResult {
  subject: string;
  subject_marathi?: string;
  marks_obtained?: number;
  max_marks: number;
  passing_marks: number;
  grade?: string;
  is_absent: boolean;
  is_pass: boolean;
}

export interface ExamResult {
  exam_id: number;
  exam_type: string;
  exam_type_marathi?: string;
  standard: string;
  division?: string;
  result_declared: boolean;
  result_date?: string;
  subjects: ExamSubjectResult[];
  total_marks: number;
  total_max: number;
  percentage: number;
  grade?: string;
  rank?: number;
  class_total_students?: number;
  remarks?: string;
  gpa?: string;
  all_pass: boolean;
}

export interface FeeRecord {
  id: number;
  category: string;
  category_marathi?: string;
  amount: number;
  amount_paid: number;
  amount_due: number;
  due_date?: string;
  status: string;
  late_fine: number;
}

export interface Payment {
  receipt_number?: string;
  amount: number;
  payment_date?: string;
  mode: string;
  status: string;
}

export interface IssuedBook {
  issue_id: number;
  title: string;
  author?: string;
  accession_number?: string;
  issue_date?: string;
  due_date?: string;
  overdue_days: number;
  fine: number;
  is_overdue: boolean;
}

export interface Notice {
  id: number;
  title: string;
  body?: string;
  type: string;
  is_pinned: boolean;
  expiry_date?: string;
  created_at?: string;
}

const studentPortalService = {
  async getProfile(): Promise<StudentProfile> {
    const res = await api.get('/student-portal/me');
    return res.data.data;
  },

  async getAttendance(year?: number, month?: number): Promise<AttendanceData> {
    const params: Record<string, number> = {};
    if (year)  params.year  = year;
    if (month) params.month = month;
    const res = await api.get('/student-portal/attendance', { params });
    return res.data.data;
  },

  async getResults(): Promise<{ results: ExamResult[]; merit_list?: any[]; upcoming_exam?: any; class_name?: string; academic_year?: string }> {
    const res = await api.get('/student-portal/results');
    return res.data.data;
  },

  async getFees(): Promise<{
    academic_year?: string;
    standard?: string;
    summary: { total_due: number; total_paid: number; total_remaining: number; balance: number; paid_percentage: number };
    class_total_fee: number;
    class_fee_structure: Array<{
      id: number;
      category: string;
      category_marathi?: string;
      frequency: string;
      amount: number;
      due_date?: string;
      late_fine_per_day?: number;
    }>;
    installments: Array<{
      id: number;
      installment_name: string;
      amount: number;
      paid_amount: number;
      remaining_amount: number;
      due_date?: string;
      status: string;
      remarks?: string;
    }>;
    fee_records: FeeRecord[];
    payments: Payment[];
  }> {
    const res = await api.get('/student-portal/fees');
    return res.data.data;
  },

  async getLibrary(): Promise<{ issued: IssuedBook[]; history: any[]; total_issued: number }> {
    const res = await api.get('/student-portal/library');
    return res.data.data;
  },

  async getTimetable(): Promise<{ standard: string; division?: string; timetable: any[] }> {
    const res = await api.get('/student-portal/timetable');
    return res.data.data;
  },

  async getNotices(): Promise<{ notices: Notice[]; total: number }> {
    const res = await api.get('/student-portal/notices');
    return res.data.data;
  },

  async getIdCard(): Promise<Record<string, any>> {
    const res = await api.get('/student-portal/id-card');
    return res.data.data;
  },

  async getHomework(): Promise<{ homework: any[]; standard?: string }> {
    const res = await api.get('/student-portal/homework');
    return res.data.data;
  },

  async submitHomework(homework_id: number, submission_text?: string, attachment_url?: string) {
    const res = await api.post('/student-portal/homework/submit', { homework_id, submission_text, attachment_url });
    return res.data;
  },

  async getAssignments(): Promise<{ assignments: any[]; standard?: string }> {
    const res = await api.get('/student-portal/assignments');
    return res.data.data;
  },

  async submitAssignment(assignment_id: number, submission_text?: string, attachment_url?: string) {
    const res = await api.post('/student-portal/assignments/submit', { assignment_id, submission_text, attachment_url });
    return res.data;
  },

  async getStudyMaterials(): Promise<{ materials: any[]; standard?: string }> {
    const res = await api.get('/student-portal/study-materials');
    return res.data.data;
  },

  async getSubjectVideos(): Promise<{ videos: any[]; standard?: string }> {
    const res = await api.get('/student-portal/videos');
    return res.data.data;
  },

  async updateVideoProgress(video_id: number, watch_seconds: number, total_seconds: number, rating?: number) {
    const res = await api.post('/student-portal/videos/progress', { video_id, watch_seconds, total_seconds, rating });
    return res.data;
  },

  async getQRHistory(): Promise<{ scans: any[] }> {
    const res = await api.get('/student-portal/qr-learning');
    return res.data.data;
  },

  async scanQRCode(qr_code: string) {
    const res = await api.post('/student-portal/qr-learning/scan', { qr_code });
    return res.data;
  },

  async getHallTicket(): Promise<Record<string, any>> {
    const res = await api.get('/student-portal/hall-ticket');
    return res.data.data;
  },

  async getCertificates(): Promise<{ certificates: any[] }> {
    const res = await api.get('/student-portal/certificates');
    return res.data.data;
  },

  async getPortfolio(): Promise<Record<string, any>> {
    const res = await api.get('/student-portal/portfolio');
    return res.data.data;
  },

  async sendDoubtRequest(subject: string, question: string) {
    const res = await api.post('/student-portal/doubt-request', { subject, question });
    return res.data;
  },

  async getAnalytics(): Promise<Record<string, any>> {
    const res = await api.get('/student-portal/analytics');
    return res.data.data;
  },

  async requestProfileUpdate(field_name: string, proposed_value: string, reason: string) {
    const res = await api.post('/student-portal/profile-update-request', { field_name, proposed_value, reason });
    return res.data;
  },

  async changePassword(old_password: string, new_password: string) {
    const res = await api.post('/student-portal/settings/password', { old_password, new_password });
    return res.data;
  },

  async cancelLeave(leaveId?: number) {
    const url = leaveId ? `/student-portal/leaves/${leaveId}/cancel` : '/student-portal/leaves/cancel';
    const res = await api.post(url);
    return res.data;
  },

  async applyBonafide(data: { purpose: string; fee_amount?: number; payment_method?: string; payment_reference?: string; remarks?: string }) {
    const res = await api.post('/student-portal/bonafide/apply', data);
    return res.data;
  },

  async getMyBonafideApplications() {
    const res = await api.get('/student-portal/bonafide/my-applications');
    const data = res.data.data;
    if (Array.isArray(data)) return data;
    if (data && Array.isArray(data.items)) return data.items;
    return [];
  },

  async getAssessments(): Promise<{ assessments: any[]; total: number }> {
    const res = await api.get('/student-portal/assessments');
    return res.data.data;
  },

  async startAssessment(assessmentId: number): Promise<{
    assessment_id: number;
    title: string;
    subject: string;
    topic?: string;
    duration_minutes: number;
    total_marks: number;
    instructions?: string;
    total_questions: number;
    questions: Array<{
      id: number;
      question: string;
      options: string[];
      marks: number;
    }>;
    already_attempted: boolean;
    previous_result?: any;
  }> {
    const res = await api.get(`/student-portal/assessments/${assessmentId}/start`);
    return res.data.data;
  },

  async submitAssessment(assessmentId: number, answers: Record<string, number>): Promise<any> {
    const res = await api.post(`/student-portal/assessments/${assessmentId}/submit`, {
      assessment_id: assessmentId,
      answers,
    });
    return res.data.data;
  },
};

export default studentPortalService;


