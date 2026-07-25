import api from './api';

export interface Notice {
  id: number;
  uuid: string;
  title: string;
  title_marathi?: string;
  content?: string;
  content_marathi?: string;
  notice_type: string;
  priority: string;
  target_audience: string;
  publish_date?: string;
  expiry_date?: string;
  is_pinned: boolean;
  is_published: boolean;
  views: number;
  notice_number?: string;
  attachment_path?: string;
  created_at?: string;
  is_active: boolean;
}

export interface Enquiry {
  id: number;
  uuid: string;
  enquiry_number: string;
  enquiry_date: string;
  student_name: string;
  student_name_marathi?: string;
  standard_applying_for: string;
  dob?: string;
  gender?: string;
  category?: string;
  father_name?: string;
  mother_name?: string;
  contact_mobile: string;
  contact_email?: string;
  previous_school?: string;
  source?: string;
  status: string;
  follow_up_date?: string;
  remarks?: string;
  converted_student_id?: number;
  is_active: boolean;
  created_at?: string;
}

export interface Visitor {
  id: number;
  visitor_date: string;
  visitor_name: string;
  visitor_mobile?: string;
  purpose: string;
  whom_to_meet?: string;
  check_in_time?: string;
  check_out_time?: string;
  badge_number?: string;
  id_proof_type?: string;
  remarks?: string;
  created_at?: string;
}

export interface SchoolEvent {
  id: number;
  uuid: string;
  title: string;
  title_marathi?: string;
  description?: string;
  event_type: string;
  start_date: string;
  end_date?: string;
  start_time?: string;
  end_time?: string;
  venue?: string;
  organizer?: string;
  target_audience: string;
  is_holiday: boolean;
  is_published: boolean;
  color?: string;
  academic_year_id?: number;
  created_at?: string;
}

export interface Complaint {
  id: number;
  uuid: string;
  complaint_number: string;
  complaint_date: string;
  complainant_name: string;
  complainant_type: string;
  complainant_mobile?: string;
  subject: string;
  description: string;
  complaint_type: string;
  priority: string;
  status: string;
  resolution?: string;
  resolved_at?: string;
  created_at?: string;
}

export interface RegisterEntry {
  id: number;
  uuid: string;
  register_number: string;
  register_date: string;
  register_type: string;
  from_to: string;
  subject: string;
  reference_number?: string;
  reference_date?: string;
  document_type?: string;
  remarks?: string;
  action_taken?: string;
  action_date?: string;
  created_at?: string;
}

export interface OfficeStats {
  total_notices: number;
  active_notices: number;
  total_enquiries: number;
  pending_enquiries: number;
  today_visitors: number;
  upcoming_events: number;
  open_complaints: number;
}

const officeService = {
  // Stats
  async getStats(): Promise<OfficeStats> {
    const res = await api.get('/office/stats');
    return res.data.data;
  },

  // Notices
  async getNotices(params?: {
    page?: number; per_page?: number; notice_type?: string;
    audience?: string; search?: string; priority?: string;
  }): Promise<{ items: Notice[]; meta: any }> {
    const res = await api.get('/office/notices', { params });
    return res.data.data;
  },
  async createNotice(data: Partial<Notice>): Promise<Notice> {
    const res = await api.post('/office/notices', data);
    return res.data.data;
  },
  async updateNotice(id: number, data: Partial<Notice>): Promise<Notice> {
    const res = await api.put(`/office/notices/${id}`, data);
    return res.data.data;
  },
  async deleteNotice(id: number): Promise<void> {
    await api.delete(`/office/notices/${id}`);
  },

  // Enquiries
  async getEnquiries(params?: {
    page?: number; per_page?: number; status?: string;
    standard?: string; search?: string;
  }): Promise<{ items: Enquiry[]; meta: any }> {
    const res = await api.get('/office/enquiries', { params });
    return res.data.data;
  },
  async createEnquiry(data: Partial<Enquiry> & { contact_mobile: string; student_name: string; standard_applying_for: string }): Promise<Enquiry> {
    const res = await api.post('/office/enquiries', data);
    return res.data.data;
  },
  async updateEnquiry(id: number, data: { status?: string; follow_up_date?: string; remarks?: string }): Promise<Enquiry> {
    const res = await api.put(`/office/enquiries/${id}`, data);
    return res.data.data;
  },
  async deleteEnquiry(id: number): Promise<void> {
    await api.delete(`/office/enquiries/${id}`);
  },

  // Visitors
  async getTodayVisitors(visitor_date?: string): Promise<{ items: Visitor[]; meta: any }> {
    const res = await api.get('/office/visitors', { params: visitor_date ? { visitor_date } : {} });
    return res.data.data;
  },
  async visitorCheckin(data: {
    visitor_name: string; visitor_mobile?: string; purpose: string;
    whom_to_meet?: string; id_proof_type?: string; id_proof_number?: string; remarks?: string;
  }): Promise<Visitor> {
    const res = await api.post('/office/visitors/checkin', data);
    return res.data.data;
  },
  async visitorCheckout(id: number, check_out_time: string): Promise<Visitor> {
    const res = await api.put(`/office/visitors/${id}/checkout`, { check_out_time });
    return res.data.data;
  },

  // Events
  async getEvents(params?: {
    from_date?: string; to_date?: string; event_type?: string; academic_year_id?: number;
  }): Promise<{ items: SchoolEvent[]; meta: any }> {
    const res = await api.get('/office/events', { params });
    return res.data.data;
  },
  async createEvent(data: Partial<SchoolEvent>): Promise<SchoolEvent> {
    const res = await api.post('/office/events', data);
    return res.data.data;
  },
  async deleteEvent(id: number): Promise<void> {
    await api.delete(`/office/events/${id}`);
  },

  // Complaints
  async getComplaints(params?: { status?: string; complaint_type?: string; page?: number }): Promise<{ items: Complaint[]; meta: any }> {
    const res = await api.get('/office/complaints', { params });
    return res.data.data;
  },
  async createComplaint(data: { complainant_name: string; subject: string; description: string; complaint_type: string; complainant_type?: string; complainant_mobile?: string; priority?: string; }): Promise<Complaint> {
    const res = await api.post('/office/complaints', data);
    return res.data.data;
  },
  async updateComplaint(id: number, data: { status?: string; resolution?: string }): Promise<Complaint> {
    const res = await api.put(`/office/complaints/${id}`, data);
    return res.data.data;
  },

  // Inward/Outward Register
  async getRegister(params?: { register_type?: string; from_date?: string; to_date?: string; page?: number }): Promise<{ items: RegisterEntry[]; meta: any }> {
    const res = await api.get('/office/register', { params });
    return res.data.data;
  },
  async createRegisterEntry(data: { register_type: string; from_to: string; subject: string; register_date: string; reference_number?: string; document_type?: string; remarks?: string; }): Promise<RegisterEntry> {
    const res = await api.post('/office/register', data);
    return res.data.data;
  },
};

export default officeService;
