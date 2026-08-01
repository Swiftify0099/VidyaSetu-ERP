import api from './api';

export interface Notice {
  id: number;
  title: string;
  title_marathi?: string;
  content: string;
  content_marathi?: string;
  notice_type: string;
  audience: string;
  is_urgent: boolean;
  is_published: boolean;
  publish_date?: string;
  expiry_date?: string;
  view_count: number;
  is_active: boolean;
  created_at?: string;
}

export interface MessageTemplate {
  id: number;
  name: string;
  template_type: string;
  category: string;
  subject?: string;
  body_english: string;
  body_marathi?: string;
  variables?: string;
  is_active: boolean;
}

export interface CommLog {
  id: number;
  channel: string;
  recipient_type: string;
  recipient_id?: number;
  recipient_name?: string;
  recipient_phone?: string;
  subject?: string;
  message_body: string;
  status: string;
  is_read?: boolean;
  sent_at?: string;
  error_message?: string;
}

export interface RecipientOption {
  id: number;
  full_name: string;
  gr_number?: string;
  employee_id?: string;
  standard?: string;
  division?: string;
  designation?: string;
  department?: string;
  fcm_token?: string;
  label: string;
}

export interface Announcement {
  id: number;
  title: string;
  body?: string;
  announcement_type: string;
  target_roles: string;
  is_pinned: boolean;
  expiry_date?: string;
  is_active: boolean;
  created_at?: string;
}

export interface CommStats {
  total_notices: number;
  published_notices: number;
  urgent_notices: number;
  total_messages_sent: number;
  messages_delivered: number;
  messages_failed: number;
  active_announcements: number;
  total_templates: number;
}

const communicationService = {
  async getStats(): Promise<CommStats> {
    const res = await api.get('/communication/stats');
    return res.data.data;
  },

  // Notices
  async getNotices(params?: { notice_type?: string; audience?: string; published_only?: boolean; academic_year_id?: number }): Promise<Notice[]> {
    const res = await api.get('/communication/notices', { params });
    return res.data.data;
  },
  async getNotice(id: number): Promise<Notice> {
    const res = await api.get(`/communication/notices/${id}`);
    return res.data.data;
  },
  async createNotice(data: Partial<Notice>): Promise<Notice> {
    const res = await api.post('/communication/notices', data);
    return res.data.data;
  },
  async updateNotice(id: number, data: Partial<Notice>): Promise<Notice> {
    const res = await api.put(`/communication/notices/${id}`, data);
    return res.data.data;
  },
  async publishNotice(id: number): Promise<Notice> {
    const res = await api.post(`/communication/notices/${id}/publish`, {});
    return res.data.data;
  },
  async deleteNotice(id: number): Promise<void> {
    await api.delete(`/communication/notices/${id}`);
  },

  // Templates
  async getTemplates(params?: { category?: string; template_type?: string }): Promise<MessageTemplate[]> {
    const res = await api.get('/communication/templates', { params });
    return res.data.data;
  },
  async createTemplate(data: Partial<MessageTemplate>): Promise<MessageTemplate> {
    const res = await api.post('/communication/templates', data);
    return res.data.data;
  },
  async updateTemplate(id: number, data: Partial<MessageTemplate>): Promise<MessageTemplate> {
    const res = await api.put(`/communication/templates/${id}`, data);
    return res.data.data;
  },
  async deleteTemplate(id: number): Promise<void> {
    await api.delete(`/communication/templates/${id}`);
  },

  // Send
  async sendMessage(data: {
    channel: string;
    recipient_type: string;
    recipient_id?: number;
    recipient_name?: string;
    fcm_token?: string;
    recipient_ids?: number[];
    recipient_phones?: string[];
    subject?: string;
    message_body: string;
    image_url?: string;
    template_id?: number;
    notice_id?: number;
  }): Promise<number> {
    const res = await api.post('/communication/send', data);
    return res.data.data.sent;
  },
  async getLogs(params?: { channel?: string; status?: string; limit?: number }): Promise<CommLog[]> {
    const res = await api.get('/communication/logs', { params });
    return res.data.data;
  },

  // Target Recipients
  async getStudentRecipients(): Promise<RecipientOption[]> {
    const res = await api.get('/communication/recipients/students');
    return res.data.data;
  },
  async getTeacherRecipients(): Promise<RecipientOption[]> {
    const res = await api.get('/communication/recipients/teachers');
    return res.data.data;
  },
  async getStaffRecipients(): Promise<RecipientOption[]> {
    const res = await api.get('/communication/recipients/staff');
    return res.data.data;
  },
  async getAllFcmTokens(): Promise<Array<{ role: string; id: number; name: string; identifier: string; fcm_token: string | null; topic: string }>> {
    const res = await api.get('/communication/fcm-tokens');
    return res.data.data;
  },

  // My Notifications (Navbar Center)
  async getMyNotifications(): Promise<CommLog[]> {
    const res = await api.get('/communication/my-notifications');
    return res.data.data;
  },
  async markNotificationRead(id: number): Promise<void> {
    await api.post(`/communication/my-notifications/${id}/read`);
  },
  async markAllNotificationsRead(): Promise<void> {
    await api.post('/communication/my-notifications/read-all');
  },

  // Announcements
  async getAnnouncements(): Promise<Announcement[]> {
    const res = await api.get('/communication/announcements');
    return res.data.data;
  },
  async createAnnouncement(data: Partial<Announcement>): Promise<Announcement> {
    const res = await api.post('/communication/announcements', data);
    return res.data.data;
  },
  async updateAnnouncement(id: number, data: Partial<Announcement>): Promise<Announcement> {
    const res = await api.put(`/communication/announcements/${id}`, data);
    return res.data.data;
  },
  async deleteAnnouncement(id: number): Promise<void> {
    await api.delete(`/communication/announcements/${id}`);
  },
};

export default communicationService;
