import api from './api';

export interface Teacher {
  id: number;
  uuid: string;
  employee_id: string;
  full_name: string;
  full_name_marathi?: string;
  salutation?: string;
  first_name: string;
  middle_name?: string;
  last_name: string;
  designation: string;
  employee_type: string;
  department?: string;
  subjects?: string;
  classes_assigned?: string;
  mobile?: string;
  mobile_alt?: string;
  email?: string;
  email_official?: string;
  photo_path?: string;
  status: string;
  is_active: boolean;
  date_of_joining?: string;
  dob?: string;
  gender?: string;
  blood_group?: string;
  nationality?: string;
  religion?: string;
  caste?: string;
  category?: string;
  marital_status?: string;
  mother_tongue?: string;
  aadhaar_number?: string;
  pan_number?: string;
  pf_number?: string;
  gpf_number?: string;
  dcps_account?: string;
  pran_number?: string;
  teacher_saral_id?: string;
  address_line1?: string;
  address_line2?: string;
  village?: string;
  taluka?: string;
  district?: string;
  state?: string;
  pincode?: string;
  highest_qualification?: string;
  specialization?: string;
  b_ed_year?: number;
  d_ed_year?: number;
  pay_scale?: string;
  basic_salary?: number;
  grade_pay?: number;
  bank_name?: string;
  bank_account_number?: string;
  bank_ifsc?: string;
  bank_branch?: string;
  spouse_name?: string;
  father_name?: string;
  mother_name?: string;
  emergency_contact_name?: string;
  emergency_contact_mobile?: string;
  emergency_contact_relation?: string;
  date_of_confirmation?: string;
  date_of_retirement?: string;
  date_of_leaving?: string;
  leaving_reason?: string;
  casual_leave_balance?: number;
  earned_leave_balance?: number;
  medical_leave_balance?: number;
  half_pay_leave_balance?: number;
  created_at?: string;
}

export interface TeacherStats {
  total: number;
  active: number;
  teaching: number;
  non_teaching: number;
  male: number;
  female: number;
  on_leave_today: number;
}

export interface Qualification {
  id: number;
  degree: string;
  subject?: string;
  university?: string;
  year_of_passing?: number;
  grade_percentage?: string;
}

export interface Experience {
  id: number;
  organization: string;
  designation?: string;
  from_date?: string;
  to_date?: string;
  is_current: boolean;
  description?: string;
}

export interface LeaveRecord {
  id: number;
  teacher_id: number;
  leave_type: string;
  from_date: string;
  to_date: string;
  days: number;
  reason?: string;
  status: string;
  approved_by?: number;
  approved_at?: string;
  rejection_reason?: string;
}

export interface TeacherListMeta {
  page: number;
  per_page: number;
  total: number;
  total_pages: number;
  has_next: boolean;
  has_prev: boolean;
}

const teacherService = {
  async getList(params: {
    page?: number;
    per_page?: number;
    search?: string;
    employee_type?: string;
    designation?: string;
    status?: string;
    department?: string;
    gender?: string;
    category?: string;
  }): Promise<{ items: Teacher[]; meta: TeacherListMeta }> {
    const res = await api.get('/teachers', { params });
    return res.data.data;
  },

  async getById(id: number): Promise<Teacher> {
    const res = await api.get(`/teachers/${id}`);
    return res.data.data;
  },

  async getByEmployeeId(empId: string): Promise<Teacher> {
    const res = await api.get(`/teachers/emp/${empId}`);
    return res.data.data;
  },

  async create(data: Partial<Teacher>): Promise<{ id: number; employee_id: string; full_name: string }> {
    const res = await api.post('/teachers', data);
    return res.data.data;
  },

  async update(id: number, data: Partial<Teacher>): Promise<void> {
    await api.put(`/teachers/${id}`, data);
  },

  async uploadPhoto(id: number, file: File): Promise<string> {
    const form = new FormData();
    form.append('file', file);
    const res = await api.post(`/teachers/${id}/photo`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data.data.photo_path;
  },

  async getStats(): Promise<TeacherStats> {
    const res = await api.get('/teachers/stats');
    return res.data.data;
  },

  async getQualifications(teacherId: number): Promise<Qualification[]> {
    const res = await api.get(`/teachers/${teacherId}/qualifications`);
    return res.data.data;
  },

  async addQualification(teacherId: number, data: Omit<Qualification, 'id'>): Promise<Qualification> {
    const res = await api.post(`/teachers/${teacherId}/qualifications`, data);
    return res.data.data;
  },

  async deleteQualification(qualId: number): Promise<void> {
    await api.delete(`/teachers/qualifications/${qualId}`);
  },

  async getExperience(teacherId: number): Promise<Experience[]> {
    const res = await api.get(`/teachers/${teacherId}/experience`);
    return res.data.data;
  },

  async addExperience(teacherId: number, data: Omit<Experience, 'id'>): Promise<Experience> {
    const res = await api.post(`/teachers/${teacherId}/experience`, data);
    return res.data.data;
  },

  async applyLeave(teacherId: number, data: {
    leave_type: string;
    from_date: string;
    to_date: string;
    reason?: string;
  }): Promise<LeaveRecord> {
    const res = await api.post(`/teachers/${teacherId}/leave`, data);
    return res.data.data;
  },

  async getLeaves(teacherId: number, status?: string): Promise<LeaveRecord[]> {
    const res = await api.get(`/teachers/${teacherId}/leave`, { params: status ? { status } : {} });
    return res.data.data;
  },

  async approveLeave(leaveId: number, action: 'approve' | 'reject', rejection_reason?: string): Promise<void> {
    await api.post(`/teachers/leave/${leaveId}/action`, { action, rejection_reason });
  },

  async markAttendanceBulk(data: {
    attendance_date: string;
    records: { teacher_id: number; status: string }[];
  }): Promise<number> {
    const res = await api.post('/teachers/attendance/bulk', data);
    return res.data.data.count;
  },

  async markLeaving(id: number, data: { date_of_leaving: string; leaving_reason: string; status: string }): Promise<void> {
    await api.post(`/teachers/${id}/leaving`, data);
  },

  async delete(id: number): Promise<void> {
    await api.delete(`/teachers/${id}`);
  },
};

export default teacherService;
