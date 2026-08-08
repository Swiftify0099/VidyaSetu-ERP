import api from './api';

export interface HomeworkItem {
  id: number;
  standard: string;
  division?: string;
  subject: string;
  title: string;
  description: string;
  instructions?: string;
  teacher: string;
  teacher_id?: number;
  assigned_date: string;
  due_date: string;
  priority?: 'High' | 'Medium' | 'Normal' | 'Low';
  max_marks?: number;
  status: 'pending' | 'submitted' | 'evaluated' | 'overdue';
  marks?: string;
  attachment_url?: string;
  teacher_remarks?: string;
  submitted_at?: string;
  submission_text?: string;
  submission_attachment_url?: string;
  is_active?: boolean;
}

export interface HomeworkSubmission {
  id: number;
  homework_id: number;
  student_id: number;
  student_name: string;
  gr_number: string;
  roll_number: string;
  submitted_at?: string;
  submission_text?: string;
  attachment_url?: string;
  status: 'pending' | 'submitted' | 'evaluated';
  marks_obtained?: number;
  max_marks?: number;
  teacher_remarks?: string;
}

export interface CreateHomeworkPayload {
  standard: string;
  division?: string;
  subject: string;
  title: string;
  description: string;
  instructions?: string;
  due_date: string;
  priority?: string;
  max_marks?: number;
  attachment_url?: string;
}

export const homeworkService = {
  /** Fetch homework list for current student or teacher */
  async getStudentHomework(): Promise<{ homework: HomeworkItem[]; standard?: string }> {
    const res = await api.get('/student-portal/homework');
    return res.data?.data || { homework: [] };
  },

  async getTeacherHomework(): Promise<{ homework: HomeworkItem[]; total: number }> {
    const res = await api.get('/teacher-portal/homework');
    return res.data?.data || { homework: [], total: 0 };
  },

  /** Submit homework as a student */
  async submitHomework(homework_id: number, submission_text?: string, attachment_url?: string) {
    const res = await api.post('/student-portal/homework/submit', {
      homework_id,
      submission_text,
      attachment_url,
    });
    return res.data;
  },

  /** Assign new homework as a teacher */
  async createHomework(data: CreateHomeworkPayload) {
    const res = await api.post('/teacher-portal/homework', data);
    return res.data;
  },

  /** Delete/deactivate homework */
  async deleteHomework(id: number) {
    const res = await api.delete(`/teacher-portal/homework/${id}`);
    return res.data;
  },

  /** Get student submissions for a specific homework assignment */
  async getSubmissions(homework_id: number): Promise<{ homework: HomeworkItem; submissions: HomeworkSubmission[]; total: number }> {
    const res = await api.get(`/teacher-portal/homework/${homework_id}/submissions`);
    return res.data?.data || { homework: {} as any, submissions: [], total: 0 };
  },

  /** Grade a student's submission */
  async gradeSubmission(homework_id: number, payload: { student_id: number; marks_obtained: number; max_marks?: number; teacher_remarks?: string }) {
    const res = await api.post(`/teacher-portal/homework/${homework_id}/grade`, payload);
    return res.data;
  },

  /** Generate AI Homework questions using backend AI module */
  async generateAIQuestions(params: { subject: string; topic: string; class_level?: string; num_questions?: number; language?: string }) {
    const res = await api.post('/ai/homework', {
      subject: params.subject,
      topic: params.topic,
      class_level: params.class_level || '9',
      num_questions: params.num_questions || 5,
      language: params.language || 'en',
    });
    return res.data?.data || res.data;
  },
};

export default homeworkService;
