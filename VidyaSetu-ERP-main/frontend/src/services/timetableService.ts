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
  notes?: string;
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

export interface TimetableStats {
  total_subjects: number;
  total_periods: number;
  total_entries: number;
  total_assignments: number;
  active_substitutes_today: number;
}

export interface ConflictCheck {
  has_conflict: boolean;
  conflicting_standard?: string;
  conflicting_division?: string;
  conflicting_period_name?: string;
}

export interface FreeTeacher {
  id: number;
  full_name: string;
  designation?: string;
  employee_code?: string;
}

export interface SubstituteEntry {
  id: number;
  timetable_entry_id: number;
  substitute_date: string;
  substitute_teacher_id: number;
  substitute_teacher_name?: string;
  original_teacher_name?: string;
  subject_name?: string;
  standard?: string;
  division?: string;
  period_name?: string;
  start_time?: string;
  end_time?: string;
  reason?: string;
}

export interface TeacherAssignment {
  id: number;
  teacher_id: number;
  subject_id: number;
  standard: string;
  division?: string;
  periods_per_week: number;
  is_class_teacher: boolean;
  subject?: Subject;
  teacher?: { id: number; full_name?: string; designation?: string };
}

const timetableService = {
  // Stats
  async getStats(academic_year_id: number = 1): Promise<TimetableStats> {
    const res = await api.get('/timetable/stats', { params: { academic_year_id } });
    return res.data.data;
  },

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
  async getPeriods(academic_year_id: number = 1): Promise<PeriodConfig[]> {
    const res = await api.get('/timetable/periods', { params: { academic_year_id } });
    return res.data.data;
  },
  async createPeriod(data: Partial<PeriodConfig>): Promise<PeriodConfig> {
    const res = await api.post('/timetable/periods', data);
    return res.data.data;
  },
  async updatePeriod(id: number, data: Partial<PeriodConfig>): Promise<PeriodConfig> {
    const res = await api.put(`/timetable/periods/${id}`, data);
    return res.data.data;
  },
  async deletePeriod(id: number): Promise<void> {
    await api.delete(`/timetable/periods/${id}`);
  },
  async seedPeriods(academic_year_id: number = 1): Promise<number> {
    const res = await api.post('/timetable/periods/seed', {}, { params: { academic_year_id } });
    return res.data.data.created;
  },

  // Timetable Entries & Grid
  async getClassTimetable(standard: string, division: string | undefined, academic_year_id: number = 1): Promise<WeeklyTimetable> {
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
  async getTeacherTimetable(teacherId: number, academic_year_id: number = 1): Promise<TeacherTimetableCell[]> {
    const res = await api.get(`/timetable/teacher/${teacherId}`, { params: { academic_year_id } });
    return res.data.data;
  },
  async checkTeacherConflict(params: {
    teacher_id: number; day_of_week: number; period_id: number; standard: string; division?: string; academic_year_id?: number;
  }): Promise<ConflictCheck> {
    const res = await api.get('/timetable/check-conflict', { params });
    return res.data.data;
  },
  async getFreeTeachers(day_of_week: number, period_id: number, academic_year_id: number = 1): Promise<FreeTeacher[]> {
    const res = await api.get('/timetable/free-teachers', { params: { day_of_week, period_id, academic_year_id } });
    return res.data.data;
  },
  async copyTimetable(data: {
    source_standard: string; source_division?: string; target_standard: string; target_division?: string; academic_year_id?: number;
  }): Promise<number> {
    const res = await api.post('/timetable/copy', data);
    return res.data.data.copied;
  },
  async autoGenerateTimetable(data: {
    standard: string; division?: string; academic_year_id?: number; overwrite?: boolean;
  }): Promise<number> {
    const res = await api.post('/timetable/auto-generate', data);
    return res.data.data.generated;
  },


  // Substitutes
  async getSubstitutes(substitute_date: string): Promise<SubstituteEntry[]> {
    const res = await api.get('/timetable/substitutes', { params: { substitute_date } });
    return res.data.data;
  },
  async createSubstitute(data: {
    timetable_entry_id: number; substitute_date: string; substitute_teacher_id: number; reason?: string;
  }): Promise<SubstituteEntry> {
    const res = await api.post('/timetable/substitutes', data);
    return res.data.data;
  },
  async deleteSubstitute(substituteId: number): Promise<void> {
    await api.delete(`/timetable/substitutes/${substituteId}`);
  },

  // Teacher Assignments
  async getAssignments(academic_year_id: number = 1): Promise<TeacherAssignment[]> {
    const res = await api.get('/timetable/assignments', { params: { academic_year_id } });
    return res.data.data;
  },
  async createAssignment(data: {
    teacher_id: number; subject_id: number; standard: string; division?: string; periods_per_week?: number; is_class_teacher?: boolean; academic_year_id?: number;
  }): Promise<TeacherAssignment> {
    const res = await api.post('/timetable/assignments', data);
    return res.data.data;
  },
  async updateAssignment(assignmentId: number, data: {
    teacher_id: number; subject_id: number; standard: string; division?: string; periods_per_week?: number; is_class_teacher?: boolean; academic_year_id?: number;
  }): Promise<TeacherAssignment> {
    const res = await api.put(`/timetable/assignments/${assignmentId}`, data);
    return res.data.data;
  },
  async bulkCreateAssignments(data: {
    standard: string; division?: string; academic_year_id?: number;
    allocations: Array<{ teacher_id: number; subject_id: number; periods_per_week?: number; is_class_teacher?: boolean }>;
  }): Promise<TeacherAssignment[]> {
    const res = await api.post('/timetable/assignments/bulk', data);
    return res.data.data;
  },
  async deleteAssignment(assignmentId: number): Promise<void> {
    await api.delete(`/timetable/assignments/${assignmentId}`);
  },
};

export default timetableService;

