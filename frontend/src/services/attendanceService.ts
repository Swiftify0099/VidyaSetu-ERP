import api from './api';

export interface Holiday {
  id: number;
  date: string;
  name: string;
  name_marathi?: string;
  holiday_type: string;
  is_active: boolean;
}

export interface AttendanceRecord {
  id: number;
  student_id: number;
  date: string;
  standard: string;
  division?: string;
  period: string;
  status: string;
  remarks?: string;
}

export interface ClassSession {
  id: number;
  date: string;
  standard: string;
  division?: string;
  period: string;
  total_students: number;
  present_count: number;
  absent_count: number;
  late_count: number;
  leave_count: number;
  is_holiday: boolean;
}

export interface TeacherAttendanceRecord {
  id: number;
  teacher_id: number;
  date: string;
  status: string;
  check_in?: string;
  check_out?: string;
  remarks?: string;
}

export interface StudentAttendanceSummary {
  student_id: number;
  student_name: string;
  gr_number: string;
  standard: string;
  division?: string;
  working_days: number;
  present_days: number;
  absent_days: number;
  late_days: number;
  leave_days: number;
  attendance_percentage: number;
  status: string;
}

export interface AttendanceStats {
  today_total: number;
  today_present: number;
  today_absent: number;
  today_attendance_pct: number;
  monthly_avg_pct: number;
  defaulters_count: number;
  classes_marked_today: number;
  classes_total: number;
  teacher_present_today: number;
  teacher_total: number;
}

export type AttendanceStatus = 'present' | 'absent' | 'late' | 'half_day' | 'leave' | 'medical_leave';

const attendanceService = {
  async getStats(academic_year_id: number): Promise<AttendanceStats> {
    const res = await api.get('/attendance/stats', { params: { academic_year_id } });
    return res.data.data;
  },

  // Holidays
  async getHolidays(year: number, month: number): Promise<Holiday[]> {
    const res = await api.get('/attendance/holidays', { params: { year, month } });
    return res.data.data;
  },
  async createHoliday(data: { date: string; name: string; name_marathi?: string; holiday_type?: string; academic_year_id?: number }): Promise<Holiday> {
    const res = await api.post('/attendance/holidays', data);
    return res.data.data;
  },

  // Student attendance
  async markStudentAttendance(data: {
    date: string; standard: string; division?: string;
    academic_year_id: number; period?: string;
    rows: Array<{ student_id: number; status: AttendanceStatus; remarks?: string }>;
  }): Promise<number> {
    const res = await api.post('/attendance/student/bulk', data);
    return res.data.data.saved;
  },

  async getDayAttendance(params: {
    att_date: string; standard: string; division?: string;
    academic_year_id: number; period?: string;
  }): Promise<AttendanceRecord[]> {
    const res = await api.get('/attendance/student/day', { params });
    return res.data.data;
  },

  async getStudentMonthAttendance(studentId: number, year: number, month: number): Promise<AttendanceRecord[]> {
    const res = await api.get(`/attendance/student/${studentId}/month`, { params: { year, month } });
    return res.data.data;
  },

  async getClassSessions(standard: string, academic_year_id: number, year: number, month: number): Promise<ClassSession[]> {
    const res = await api.get('/attendance/class/sessions', { params: { standard, academic_year_id, year, month } });
    return res.data.data;
  },

  async getDefaulters(params: { academic_year_id: number; year: number; month: number; standard?: string; threshold?: number }): Promise<StudentAttendanceSummary[]> {
    const res = await api.get('/attendance/defaulters', { params });
    return res.data.data;
  },

  // Teacher attendance
  async markTeacherAttendance(data: {
    date: string; academic_year_id: number;
    rows: Array<{ teacher_id: number; status: string; check_in?: string; check_out?: string; remarks?: string }>;
  }): Promise<number> {
    const res = await api.post('/attendance/teacher/bulk', data);
    return res.data.data.saved;
  },

  async getTeacherDayAttendance(att_date: string, academic_year_id: number): Promise<TeacherAttendanceRecord[]> {
    const res = await api.get('/attendance/teacher/day', { params: { att_date, academic_year_id } });
    return res.data.data;
  },
};

export default attendanceService;
