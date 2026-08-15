/**
 * VidyaSetu Mobile — App Constants
 */

export const ACADEMIC_YEARS = [
  '2025-2026',
  '2024-2025',
  '2023-2024',
];

export const CURRENT_ACADEMIC_YEAR = '2025-2026';

export const CLASSES = ['1','2','3','4','5','6','7','8','9','10','11','12'];
export const DIVISIONS = ['A','B','C','D','E'];

export const DAYS_OF_WEEK = [
  'Monday','Tuesday','Wednesday','Thursday','Friday','Saturday',
];

export const LEAVE_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  CANCELLED: 'cancelled',
} as const;

export const EXAM_STATUS = {
  SCHEDULED: 'scheduled',
  ONGOING: 'ongoing',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
} as const;

export const HOMEWORK_STATUS = {
  ASSIGNED: 'assigned',
  SUBMITTED: 'submitted',
  GRADED: 'graded',
  OVERDUE: 'overdue',
} as const;

export const ATTENDANCE_STATUS = {
  PRESENT: 'present',
  ABSENT: 'absent',
  LATE: 'late',
  LEAVE: 'leave',
} as const;

export const PAYMENT_MODES = [
  { value: 'cash',          label: 'Cash',          icon: 'money-bill-wave' },
  { value: 'upi',           label: 'UPI',            icon: 'mobile-alt' },
  { value: 'cheque',        label: 'Cheque',         icon: 'money-check' },
  { value: 'bank_transfer', label: 'Bank Transfer',  icon: 'university' },
  { value: 'dd',            label: 'DD',             icon: 'file-invoice' },
];

export const ANNOUNCEMENT_PRIORITY = {
  LOW:    'low',
  NORMAL: 'normal',
  HIGH:   'high',
  URGENT: 'urgent',
} as const;

export const BOOK_CATEGORIES = [
  'Textbook', 'Reference', 'Fiction', 'Non-Fiction', 'Science',
  'Mathematics', 'History', 'Geography', 'Language', 'Other',
];

export const GENDER_OPTIONS = [
  { value: 'male',   label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'other',  label: 'Other' },
];

export const BLOOD_GROUPS = ['A+','A-','B+','B-','AB+','AB-','O+','O-'];

export const GRADES = {
  'A+': { min: 90, label: 'Outstanding', color: '#059669' },
  'A':  { min: 80, label: 'Excellent',   color: '#10b981' },
  'B+': { min: 70, label: 'Very Good',   color: '#3b82f6' },
  'B':  { min: 60, label: 'Good',        color: '#6366f1' },
  'C':  { min: 50, label: 'Average',     color: '#f59e0b' },
  'D':  { min: 40, label: 'Below Average', color: '#f97316' },
  'F':  { min: 0,  label: 'Fail',        color: '#ef4444' },
} as const;

export function getGrade(percentage: number): keyof typeof GRADES {
  if (percentage >= 90) return 'A+';
  if (percentage >= 80) return 'A';
  if (percentage >= 70) return 'B+';
  if (percentage >= 60) return 'B';
  if (percentage >= 50) return 'C';
  if (percentage >= 40) return 'D';
  return 'F';
}

export const ROLES = {
  SUPER_ADMIN:       'super_admin',
  ADMIN:             'admin',
  PRINCIPAL:         'principal',
  VICE_PRINCIPAL:    'vice_principal',
  TEACHER:           'teacher',
  CLASS_TEACHER:     'class_teacher',
  STUDENT:           'student',
  PARENT:            'parent',
  ACCOUNTANT:        'accountant',
  LIBRARIAN:         'librarian',
  CLERK:             'clerk',
  RECEPTIONIST:      'receptionist',
  OFFICE_STAFF:      'office_staff',
  TRANSPORT:         'transport_incharge',
  EXAM_COORDINATOR:  'exam_coordinator',
  SUPPORT_STAFF:     'support_staff',
} as const;

export const ADMIN_ROLES = [
  ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.PRINCIPAL, ROLES.VICE_PRINCIPAL,
];

export const TEACHER_ROLES = [ROLES.TEACHER, ROLES.CLASS_TEACHER];

export const OFFICE_ROLES = [
  ROLES.CLERK, ROLES.RECEPTIONIST, ROLES.OFFICE_STAFF,
  ROLES.TRANSPORT, ROLES.SUPPORT_STAFF,
];
