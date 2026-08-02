import api from './api';

export interface Student {
  id: number;
  uuid: string;
  gr_number: string;
  full_name: string;
  full_name_marathi?: string;
  first_name: string;
  middle_name?: string;
  last_name: string;
  standard: string;
  division?: string;
  roll_number?: number;
  father_name?: string;
  mother_name?: string;
  mobile?: string;
  email?: string;
  photo_path?: string;
  status: string;
  is_active: boolean;
  dob?: string;
  gender?: string;
  category?: string;
  admission_date?: string;
  blood_group?: string;
  nationality?: string;
  religion?: string;
  caste?: string;
  sub_caste?: string;
  mother_tongue?: string;
  aadhaar_number?: string;
  address_line1?: string;
  address_line2?: string;
  village?: string;
  taluka?: string;
  district?: string;
  state?: string;
  pincode?: string;
  father_mobile?: string;
  father_name_marathi?: string;
  mother_name_full?: string;
  mother_name_marathi?: string;
  mother_mobile?: string;
  guardian_name?: string;
  guardian_mobile?: string;
  guardian_relation?: string;
  dob_in_words?: string;
  student_id_saral?: string;
  pen_number?: string;
  apaar_id?: string;
  uses_transport?: boolean;
  tc_issued?: boolean;
  tc_number?: string;
  date_of_leaving?: string;
  leaving_reason?: string;
  admission_standard?: string;
  previous_school?: string;
  is_differently_abled?: boolean;
  admission_number?: string;
  created_at?: string;
}

export interface StudentListMeta {
  page: number;
  per_page: number;
  total: number;
  total_pages: number;
  has_next: boolean;
  has_prev: boolean;
}

export interface StudentListResult {
  items: Student[];
  meta: StudentListMeta;
}

export interface StudentStats {
  total: number;
  active: number;
  boys: number;
  girls: number;
  left: number;
}

export interface AttendanceRecord {
  student_id: number;
  status: 'present' | 'absent' | 'late' | 'half_day' | 'leave' | 'holiday';
  reason?: string;
}

export interface AttendanceSummary {
  total_days: number;
  present_days: number;
  absent_days: number;
  late_days: number;
  half_day: number;
  attendance_percentage: number;
}

const studentService = {
  async getList(params: {
    page?: number;
    per_page?: number;
    search?: string;
    standard?: string;
    division?: string;
    status?: string;
    gender?: string;
    category?: string;
    academic_year_id?: number;
  }): Promise<StudentListResult> {
    const res = await api.get('/students', { params });
    return res.data.data;
  },

  async getById(id: number): Promise<Student> {
    const res = await api.get(`/students/${id}`);
    return res.data.data;
  },

  async getByGR(grNumber: string): Promise<Student> {
    const res = await api.get(`/students/gr/${grNumber}`);
    return res.data.data;
  },

  async create(data: Partial<Student>): Promise<{ id: number; gr_number: string; full_name: string }> {
    const res = await api.post('/students', data);
    return res.data.data;
  },

  async update(id: number, data: Partial<Student>): Promise<void> {
    await api.put(`/students/${id}`, data);
  },

  async uploadPhoto(id: number, file: File): Promise<string> {
    const form = new FormData();
    form.append('file', file);
    const res = await api.post(`/students/${id}/photo`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data.data.photo_path;
  },

  async markLeaving(id: number, data: { date_of_leaving: string; leaving_reason: string; status: string }): Promise<void> {
    await api.post(`/students/${id}/leaving`, data);
  },

  async delete(id: number): Promise<void> {
    await api.delete(`/students/${id}`);
  },

  async getStats(academic_year_id?: number): Promise<StudentStats> {
    const res = await api.get('/students/stats', {
      params: academic_year_id ? { academic_year_id } : {},
    });
    return res.data.data;
  },

  async markAttendanceBulk(data: {
    attendance_date: string;
    standard: string;
    division?: string;
    period?: string;
    records: AttendanceRecord[];
  }): Promise<number> {
    const res = await api.post('/students/attendance/bulk', data);
    return res.data.data.count;
  },

  async getAttendanceSummary(
    studentId: number,
    from_date: string,
    to_date: string,
  ): Promise<AttendanceSummary> {
    const res = await api.get(`/students/${studentId}/attendance/summary`, {
      params: { from_date, to_date },
    });
    return res.data.data;
  },

  downloadTC(studentId: number): void {
    window.open(`${import.meta.env.VITE_API_URL}/students/${studentId}/tc`, '_blank');
  },

  downloadBonafide(studentId: number, purpose: string = 'General Purpose'): void {
    window.open(
      `${import.meta.env.VITE_API_URL}/students/${studentId}/bonafide?purpose=${encodeURIComponent(purpose)}`,
      '_blank'
    );
  },
};

export default studentService;
