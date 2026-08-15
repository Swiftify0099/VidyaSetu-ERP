/**
 * VidyaSetu ERP — Analytics Service (TypeScript)
 * Typed API wrappers for all analytics endpoints.
 * All data is real — sourced from the VidyaSetu backend.
 */
import api from './api';

// ── Types ──────────────────────────────────────────────────────────────────

export interface MasterDashboard {
  total_students: number;
  active_students: number;
  total_teachers: number;
  today_attendance_pct: number;
  fee_collection_pct: number;
  fee_collected: number;
  fee_pending: number;
  books_issued: number;
  pending_assets_repair: number;
  active_notices: number;
  low_stock_alerts: number;
  monthly_revenue: { month: number; month_name: string; amount: number }[];
}

export interface StudentReport {
  total_students: number;
  active_students: number;
  inactive_students: number;
  boys: number;
  girls: number;
  other_gender: number;
  by_standard: { standard: string; boys: number; girls: number; other: number; total: number }[];
  by_division: { standard: string; division: string; total: number }[];
  new_admissions_this_year: number;
  transfers_out: number;
  students_left: number;
}

export interface AttendanceReport {
  overall_pct: number;
  school_working_days: number;
  avg_daily_attendance: number;
  by_standard: { standard: string; present_pct: number; total: number; present: number; absent: number }[];
  defaulters_count: number;
}

export interface AttendanceTrendReport {
  trend: { year: number; month: number; month_name: string; pct: number; present: number; working: number }[];
  by_day_of_week: { day: string; avg_pct: number }[];
}

export interface LowAttendanceReport {
  threshold_pct: number;
  total_count: number;
  students: {
    student_id: number; full_name: string; standard: string; division: string;
    gr_number: string; present_days: number; working_days: number;
    attendance_pct: number; risk: 'critical' | 'warning' | 'normal';
  }[];
}

export interface FeeReport {
  academic_year_id: number;
  total_demanded: number;
  total_collected: number;
  total_pending: number;
  total_concession: number;
  collection_pct: number;
  by_month: { month: number; month_name: string; collected: number; count: number; avg: number }[];
  by_fee_type: { category: string; demanded: number; paid: number }[];
  top_defaulters: { student_id: number; name: string; standard: string; division: string; pending: number }[];
}

export interface FeeClassReport {
  by_class: { standard: string; expected: number; collected: number; concession: number; pending: number; collection_pct: number }[];
}

export interface FeeOutstandingReport {
  total_count: number;
  total_pending: number;
  students: {
    student_id: number; name: string; standard: string; division: string; gr_number: string;
    total_due: number; paid: number; pending: number; due_date: string | null;
    days_overdue: number; status: string;
  }[];
}

export interface PaymentMethodReport {
  total_amount: number;
  by_method: { mode: string; amount: number; count: number; pct: number }[];
}

export interface AcademicReport {
  status: 'ok' | 'no_data';
  total_students: number;
  students_appeared: number;
  passed: number;
  failed: number;
  pass_pct: number;
  avg_percentage: number;
  by_grade: { grade: string; count: number }[];
  by_subject: { subject: string; appeared: number; avg_marks: number; max_marks: number; avg_pct: number; passed: number; failed: number; pass_pct: number }[];
  by_class: { standard: string; students: number; avg_pct: number; pass_pct: number }[];
  weak_subjects: { subject: string; avg_pct: number; pass_pct: number }[];
  top_performers: { rank: number; standard: string; percentage: number }[];
}

export interface ClassAnalyticsReport {
  by_class: {
    standard: string; division: string; students: number;
    attendance_pct: number; fee_pct: number; fee_pending: number; academic_pct: number;
  }[];
}

export interface TeacherAnalyticsReport {
  total_teachers: number;
  active_teachers: number;
  teaching_staff: number;
  non_teaching_staff: number;
  by_type: { type: string; count: number }[];
  by_department: { department: string; count: number }[];
  attendance_pct: number;
  workload: { teacher_id: number; name: string; designation: string; classes: number; subjects: number; periods_per_week: number }[];
}

export interface RiskReport {
  attendance_risk: number;
  fee_risk: number;
  academic_risk: number;
  multi_risk: number;
  students: { student_id: number; name: string; standard: string; division: string; risk_categories: string[]; risk_count: number }[];
}

export interface InsightsReport {
  insights: { type: string; icon: string; title: string; body: string; severity: 'info' | 'warning' | 'critical' }[];
}

export interface LibraryReport {
  total_books: number; books_issued: number; books_available: number; overdue_books: number;
}

export interface InventoryReport {
  total_assets: number; asset_value: number; low_stock_items: number;
  stock_value: number; maintenance_cost_ytd: number;
  by_status: { status: string; count: number }[];
}

// ── API Calls ──────────────────────────────────────────────────────────────

const get = async <T>(endpoint: string, params?: Record<string, any>): Promise<T> => {
  const res = await api.get(endpoint, { params });
  return res.data?.data as T;
};

export const analyticsService = {
  getDashboard: (params?: { academic_year_id?: number }) =>
    get<MasterDashboard>('/analytics/dashboard', params),

  getStudents: (params?: { academic_year_id?: number }) =>
    get<StudentReport>('/analytics/students', params),

  getAttendance: (params?: { academic_year_id?: number; standard?: string; division?: string }) =>
    get<AttendanceReport>('/analytics/attendance', params),

  getAttendanceTrend: (params?: { academic_year_id?: number; standard?: string; division?: string }) =>
    get<AttendanceTrendReport>('/analytics/attendance/trend', params),

  getLowAttendance: (params?: { academic_year_id?: number; threshold_pct?: number; standard?: string; division?: string; limit?: number }) =>
    get<LowAttendanceReport>('/analytics/attendance/low', params),

  getFees: (params?: { academic_year_id?: number }) =>
    get<FeeReport>('/analytics/fees', params),

  getFeeClasses: (params?: { academic_year_id?: number; standard?: string }) =>
    get<FeeClassReport>('/analytics/fees/classes', params),

  getFeeOutstanding: (params?: { academic_year_id?: number; standard?: string; limit?: number }) =>
    get<FeeOutstandingReport>('/analytics/fees/outstanding', params),

  getPaymentModes: (params?: { academic_year_id?: number }) =>
    get<PaymentMethodReport>('/analytics/fees/payment-modes', params),

  getAcademic: (params?: { academic_year_id?: number; standard?: string; exam_type_id?: number }) =>
    get<AcademicReport>('/analytics/academic', params),

  getClasses: (params?: { academic_year_id?: number; standard?: string; division?: string }) =>
    get<ClassAnalyticsReport>('/analytics/classes', params),

  getTeachers: (params?: { academic_year_id?: number }) =>
    get<TeacherAnalyticsReport>('/analytics/teachers', params),

  getRisk: (params?: { academic_year_id?: number; standard?: string }) =>
    get<RiskReport>('/analytics/risk', params),

  getInsights: (params?: { academic_year_id?: number }) =>
    get<InsightsReport>('/analytics/insights', params),

  getLibrary: () =>
    get<LibraryReport>('/analytics/library'),

  getInventory: () =>
    get<InventoryReport>('/analytics/inventory'),
};
