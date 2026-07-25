import api from './api';

export interface Subject {
  id: number;
  name: string;
  name_marathi?: string;
  code?: string;
  subject_type: string;
  applicable_standards?: string;
  color?: string;
  is_active: boolean;
}

export interface PeriodConfig {
  id: number;
  academic_year_id: number;
  period_number: number;
  period_name: string;
  start_time: string;
  end_time: string;
  duration_minutes: number;
  period_type: string;
  sort_order: number;
  is_active: boolean;
}

export interface TimetableCell {
  entry_id?: number;
  period_id: number;
  period_name: string;
  period_number: number;
  start_time: string;
  end_time: string;
  period_type: string;
  subject_id?: number;
  subject_name?: string;
  subject_name_marathi?: string;
  subject_color?: string;
  teacher_id?: number;
  teacher_name?: string;
  room?: string;
}

export interface TimetableDay {
  day_number: number;
  day_name: string;
  periods: TimetableCell[];
}

export interface WeeklyTimetable {
  standard: string;
  division?: string;
  academic_year_id: number;
  days: TimetableDay[];
  periods: PeriodConfig[];
}

export interface TeacherTimetableCell {
  day_number: number;
  day_name: string;
  period_id: number;
  period_name: string;
  start_time: string;
  end_time: string;
  standard: string;
  division?: string;
  subject_name?: string;
  room?: string;
}

const timetableService = {
  // Subjects
  async getSubjects(): Promise<Subject[]> {
    const res = await api.get('/timetable/subjects');
    return res.data.data;
  },
  async createSubject(data: Partial<Subject>): Promise<Subject> {
    const res = await api.post('/timetable/subjects', data);
    return res.data.data;
  },
  async updateSubject(id: number, data: Partial<Subject>): Promise<Subject> {
    const res = await api.put(`/timetable/subjects/${id}`, data);
    return res.data.data;
  },
  async deleteSubject(id: number): Promise<void> {
    await api.delete(`/timetable/subjects/${id}`);
  },

  // Periods
  async getPeriods(academic_year_id: number): Promise<PeriodConfig[]> {
    const res = await api.get('/timetable/periods', { params: { academic_year_id } });
    return res.data.data;
  },
  async createPeriod(data: Partial<PeriodConfig>): Promise<PeriodConfig> {
    const res = await api.post('/timetable/periods', data);
    return res.data.data;
  },
  async seedPeriods(academic_year_id: number): Promise<number> {
    const res = await api.post('/timetable/periods/seed', {}, { params: { academic_year_id } });
    return res.data.data.created;
  },

  // Timetable
  async getClassTimetable(standard: string, division: string | undefined, academic_year_id: number): Promise<WeeklyTimetable> {
    const res = await api.get('/timetable/class', { params: { standard, division, academic_year_id } });
    return res.data.data;
  },
  async upsertEntry(data: {
    standard: string; division?: string; day_of_week: number; period_id: number;
    subject_id?: number; teacher_id?: number; room?: string; notes?: string; academic_year_id: number;
  }): Promise<any> {
    const res = await api.post('/timetable/entries', data);
    return res.data.data;
  },
  async deleteEntry(entryId: number): Promise<void> {
    await api.delete(`/timetable/entries/${entryId}`);
  },
  async getTeacherTimetable(teacherId: number, academic_year_id: number): Promise<TeacherTimetableCell[]> {
    const res = await api.get(`/timetable/teacher/${teacherId}`, { params: { academic_year_id } });
    return res.data.data;
  },
};

export default timetableService;
