/**
 * VidyaSetu ERP — Shared TypeScript Types
 * =========================================
 * Central types directory. Import from here in all pages & services.
 * Never duplicate these types across files.
 */

// ── API Response Shape ────────────────────────────────────────
export interface APIResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  errors?: Array<{ field: string; message: string }>;
  code?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
  has_next: boolean;
  has_prev: boolean;
}

// ── Auth ──────────────────────────────────────────────────────
export interface LoginRequest {
  username: string;
  password: string;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
}

export interface UserProfile {
  user_id: number;
  username: string;
  full_name: string;
  mobile?: string;
  employee_id?: string;
  gr_number?: string;
  preferred_language: string;
  is_active: boolean;
  roles: Role[];
  permissions: string[];
}

export interface Role {
  id: number;
  name: string;
  code: string;
  color: string;
  is_system: boolean;
}

export interface Permission {
  id: number;
  module: string;
  action: string;
  code: string;
  description: string;
  category: string;
}

// ── Student ───────────────────────────────────────────────────
export interface Student {
  id: number;
  uuid: string;
  gr_number: string;
  admission_number: string;
  full_name: string;
  full_name_marathi?: string;
  first_name: string;
  middle_name?: string;
  last_name: string;
  dob?: string;
  gender: 'male' | 'female' | 'other';
  blood_group?: string;
  mobile?: string;
  email?: string;
  father_name?: string;
  mother_name_full?: string;
  standard: string;
  division: string;
  roll_number?: number;
  category?: string;
  religion?: string;
  nationality?: string;
  address_line1?: string;
  village?: string;
  taluka?: string;
  district?: string;
  state?: string;
  pincode?: string;
  photo_path?: string;
  status: 'active' | 'inactive' | 'passed' | 'transferred' | 'dropped';
  admission_date?: string;
  academic_year_id?: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface StudentCreate {
  gr_number?: string;
  admission_number?: string;
  full_name: string;
  full_name_marathi?: string;
  first_name: string;
  middle_name?: string;
  last_name: string;
  dob?: string;
  gender: 'male' | 'female' | 'other';
  blood_group?: string;
  mobile?: string;
  father_name?: string;
  mother_name_full?: string;
  standard: string;
  division: string;
  category?: string;
  religion?: string;
  nationality?: string;
  address_line1?: string;
  village?: string;
  district?: string;
  state?: string;
  pincode?: string;
  academic_year_id: number;
  admission_date?: string;
}

// ── Teacher ───────────────────────────────────────────────────
export interface Teacher {
  id: number;
  uuid: string;
  employee_id: string;
  full_name: string;
  full_name_marathi?: string;
  first_name: string;
  last_name: string;
  dob?: string;
  gender: 'male' | 'female' | 'other';
  mobile?: string;
  email?: string;
  designation?: string;
  department?: string;
  qualification?: string;
  subjects?: string;
  date_of_joining?: string;
  employee_type: 'permanent' | 'contract' | 'part_time' | 'guest';
  photo_path?: string;
  is_active: boolean;
  created_at: string;
}

// ── Finance ───────────────────────────────────────────────────
export interface FeeHead {
  id: number;
  name: string;
  code: string;
  description?: string;
  is_active: boolean;
}

export interface FeeStructure {
  id: number;
  academic_year_id: number;
  standard: string;
  category?: string;
  fee_head_id: number;
  amount: string;
  installments: number;
  due_date?: string;
  is_active: boolean;
}

export interface FeeReceipt {
  id: number;
  receipt_number: string;
  student_id: number;
  student_name: string;
  gr_number: string;
  total_amount: string;
  payment_mode: 'cash' | 'upi' | 'cheque' | 'bank_transfer';
  receipt_date: string;
  collected_by_name: string;
  status: 'active' | 'cancelled';
}

export interface FinanceSummary {
  today_collection: number;
  today_expense: number;
  monthly_collection: number;
  monthly_expense: number;
  total_outstanding: number;
  total_receipts: number;
  total_transactions: number;
}

// ── Library ───────────────────────────────────────────────────
export interface Book {
  id: number;
  isbn?: string;
  accession_number?: string;
  title: string;
  title_marathi?: string;
  author_id?: number;
  publisher_id?: number;
  category_id?: number;
  edition?: string;
  publication_year?: number;
  language: string;
  total_copies: number;
  available_copies: number;
  location_shelf?: string;
  is_active: boolean;
}

export interface LibraryMember {
  id: number;
  member_id: string;
  member_type: 'student' | 'teacher' | 'staff';
  full_name: string;
  standard?: string;
  books_currently_issued: number;
  max_books_allowed: number;
  total_fine_due: string;
  is_blocked: boolean;
}

export interface BookIssue {
  id: number;
  issue_number: string;
  book_id: number;
  member_id: number;
  issue_date: string;
  due_date: string;
  return_date?: string;
  status: 'issued' | 'returned' | 'overdue' | 'lost';
  fine_amount: string;
  fine_paid: boolean;
}

// ── Attendance ────────────────────────────────────────────────
export type AttendanceStatus = 'present' | 'absent' | 'leave' | 'holiday';

export interface AttendanceRecord {
  id: number;
  student_id: number;
  date: string;
  status: AttendanceStatus;
  remarks?: string;
}

export interface AttendanceSummary {
  total_days: number;
  present: number;
  absent: number;
  leave: number;
  percentage: number;
}

// ── Exam ──────────────────────────────────────────────────────
export interface ExamType {
  id: number;
  name: string;
  name_marathi?: string;
  max_marks: number;
  passing_marks: number;
  sequence: number;
  is_active: boolean;
}

export interface Exam {
  id: number;
  exam_type_id: number;
  academic_year_id: number;
  standard: string;
  exam_date_from?: string;
  exam_date_to?: string;
  result_declared: boolean;
}

export interface StudentResult {
  student_id: number;
  total_marks: number;
  max_marks: number;
  percentage: number;
  grade?: string;
  result: 'pass' | 'fail' | 'absent' | 'pending';
  rank?: number;
}

// ── Common ────────────────────────────────────────────────────
export interface SelectOption {
  value: string | number;
  label: string;
  disabled?: boolean;
}

export interface TableColumn<T = object> {
  key: keyof T | string;
  header: string;
  render?: (value: unknown, row: T) => React.ReactNode;
  sortable?: boolean;
  width?: string;
  align?: 'left' | 'center' | 'right';
}

export type SortDirection = 'asc' | 'desc';

export interface SortConfig {
  key: string;
  direction: SortDirection;
}

export interface FilterConfig {
  search?: string;
  status?: string;
  standard?: string;
  division?: string;
  academic_year_id?: number;
  date_from?: string;
  date_to?: string;
  [key: string]: string | number | undefined;
}

export interface AcademicYear {
  id: number;
  name: string;
  code: string;
  start_date: string;
  end_date: string;
  is_current: boolean;
  status: 'open' | 'closed' | 'archived';
}

export interface SystemSetting {
  id: number;
  key: string;
  value?: string;
  label: string;
  category: string;
  data_type: string;
  is_public: boolean;
}

// ── Notification ──────────────────────────────────────────────
export interface Notification {
  id: number;
  title: string;
  message: string;
  type: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  is_read: boolean;
  created_at: string;
}

// ── Office ────────────────────────────────────────────────────
export interface Visitor {
  id: number;
  visitor_id: string;
  visitor_name: string;
  mobile?: string;
  purpose?: string;
  person_to_meet?: string;
  entry_time: string;
  exit_time?: string;
  status: 'inside' | 'exited' | 'cancelled';
}

export interface Complaint {
  id: number;
  complaint_number: string;
  category: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'pending' | 'in_progress' | 'resolved' | 'closed';
  created_at: string;
}
