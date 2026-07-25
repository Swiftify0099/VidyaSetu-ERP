/**
 * VidyaSetu ERP — RBAC Permissions Registry
 * ============================================
 * Single source of truth for all role → permission mappings.
 * Used by: Sidebar, PermissionGate, RolePortalRedirect, DashboardRouter
 *
 * Matches backend ROLE_PERMISSIONS exactly.
 */

// ── Role codes (must match backend seed) ─────────────────────
export type RoleCode =
  | 'super_admin'
  | 'admin'
  | 'principal'
  | 'vice_principal'
  | 'teacher'
  | 'class_teacher'
  | 'clerk'
  | 'accountant'
  | 'librarian'
  | 'receptionist'
  | 'office_staff'
  | 'student'
  | 'parent'
  | 'exam_coordinator'
  | 'transport_incharge'
  | 'support_staff';

// ── Permission string type ───────────────────────────────────
export type Permission = string;

// ── Role → Dashboard route mapping ───────────────────────────
export const ROLE_DASHBOARD: Record<string, string> = {
  super_admin:       '/dashboard',
  admin:             '/dashboard',
  principal:         '/dashboard',
  vice_principal:    '/dashboard',
  teacher:           '/teacher-portal',
  class_teacher:     '/teacher-portal',
  clerk:             '/office',
  accountant:        '/finance',
  librarian:         '/library',
  receptionist:      '/office',
  office_staff:      '/office',
  student:           '/student-portal',
  parent:            '/parent-portal',
  exam_coordinator:  '/exams',
  transport_incharge:'/office',
  support_staff:     '/office',
};

// ── Role → Display label ──────────────────────────────────────
export const ROLE_LABELS: Record<string, string> = {
  super_admin:       'Super Admin',
  admin:             'Admin',
  principal:         'Principal',
  vice_principal:    'Vice Principal',
  teacher:           'Teacher',
  class_teacher:     'Class Teacher',
  clerk:             'Clerk',
  accountant:        'Accountant',
  librarian:         'Librarian',
  receptionist:      'Receptionist',
  office_staff:      'Office Staff',
  student:           'Student',
  parent:            'Parent',
  exam_coordinator:  'Exam Coordinator',
  transport_incharge:'Transport Incharge',
  support_staff:     'Support Staff',
};

// ── Role → Allowed permissions (mirrors backend seed) ────────
export const ROLE_PERMISSIONS: Record<string, string[] | '*'> = {
  super_admin: '*',
  admin:       '*',

  principal: [
    'student.read', 'student.export',
    'teacher.read',
    'attendance.read',
    'examination.read', 'examination.approve',
    'finance.read', 'finance.export',
    'communication.create',
    'analytics.view_analytics',
    'office.read', 'office.approve',
    'leave.read', 'leave.approve',
    'lesson_plan.read',
    'behaviour.read',
  ],

  vice_principal: [
    'student.read', 'teacher.read',
    'attendance.read',
    'examination.read',
    'communication.create',
    'analytics.view_analytics',
    'office.read',
    'timetable.read',
    'leave.read',
    'lesson_plan.read',
  ],

  teacher: [
    'student.read',
    'attendance.create', 'attendance.read', 'attendance.update',
    'examination.create', 'examination.update', 'examination.read',
    'communication.create', 'communication.read',
    'timetable.read',
    'library.read',
    'leave.read', 'leave.create',
    'lesson_plan.create', 'lesson_plan.read', 'lesson_plan.update',
    'behaviour.create', 'behaviour.read',
  ],

  class_teacher: [
    'student.read',
    'attendance.create', 'attendance.read', 'attendance.update',
    'examination.create', 'examination.update', 'examination.read',
    'communication.create', 'communication.read',
    'timetable.read',
    'library.read',
    'admission.read',
    'leave.read', 'leave.create',
    'lesson_plan.create', 'lesson_plan.read', 'lesson_plan.update',
    'behaviour.create', 'behaviour.read', 'behaviour.update',
  ],

  clerk: [
    'student.read', 'student.create', 'student.update',
    'admission.create', 'admission.read', 'admission.update',
    'office.create', 'office.read', 'office.update',
    'communication.create', 'communication.read',
    'library.read',
  ],

  accountant: [
    'finance.create', 'finance.read', 'finance.update',
    'finance.export', 'finance.print',
    'student.read',
    'analytics.view_analytics',
  ],

  librarian: [
    'library.create', 'library.read', 'library.update', 'library.delete',
    'library.export',
    'student.read', 'teacher.read',
  ],

  receptionist: [
    'office.create', 'office.read',
    'student.read', 'teacher.read',
    'communication.read',
  ],

  office_staff: [
    'office.read',
    'student.read',
    'communication.read',
  ],

  student: [
    'student.read',
    'attendance.read',
    'examination.read',
    'library.read',
    'timetable.read',
    'communication.read',
    'finance.read',
  ],

  parent: [
    'student.read',
    'attendance.read',
    'examination.read',
    'finance.read',
    'communication.read',
  ],

  exam_coordinator: [
    'examination.create', 'examination.read', 'examination.update',
    'examination.export',
    'student.read',
    'analytics.view_analytics',
  ],

  transport_incharge: [
    'student.read',
    'office.read',
  ],

  support_staff: [
    'office.read',
  ],
};

// ── Helper: check if role has permission ─────────────────────
export function roleHasPermission(roleCode: string, permission: string): boolean {
  const perms = ROLE_PERMISSIONS[roleCode];
  if (!perms) return false;
  if (perms === '*') return true;
  return perms.includes(permission);
}

// ── Helper: get dashboard route for primary role ──────────────
export function getDashboardForRole(roleCodes: string[]): string {
  for (const role of roleCodes) {
    const route = ROLE_DASHBOARD[role];
    if (route) return route;
  }
  return '/dashboard';
}

// ── Helper: resolve permission from user's role list ─────────
export function userHasPermission(roleCodes: string[], permission: string): boolean {
  return roleCodes.some(rc => roleHasPermission(rc, permission));
}

// ── Sidebar Nav Items with required permissions ───────────────
export interface NavItem {
  label: string;
  path: string;
  icon: string;
  permission: string;
  roles?: string[];  // if set, only these roles see this item (overrides permission)
  children?: NavItem[];
}

export const ALL_NAV_ITEMS: NavItem[] = [
  // ── Admin / Principal group ──────────────────────────────
  { label: 'Dashboard',       path: '/dashboard',      icon: '🏠', permission: 'analytics.view_analytics', roles: ['super_admin','admin','principal','vice_principal'] },
  { label: 'Students',        path: '/students',       icon: '🎓', permission: 'student.read' },
  { label: 'Teachers',        path: '/teachers',       icon: '👨‍🏫', permission: 'teacher.read' },
  { label: 'Attendance',      path: '/attendance',     icon: '📅', permission: 'attendance.read' },
  { label: 'Examinations',    path: '/exams',          icon: '📝', permission: 'examination.read' },
  { label: 'Finance',         path: '/finance',        icon: '💰', permission: 'finance.read' },
  { label: 'Library',         path: '/library',        icon: '📚', permission: 'library.read' },
  { label: 'Inventory',       path: '/inventory',      icon: '📦', permission: 'inventory.read' },
  { label: 'Office',          path: '/office',         icon: '🏢', permission: 'office.read' },
  { label: 'Communication',   path: '/communication',  icon: '📢', permission: 'communication.read' },
  { label: 'Timetable',       path: '/timetable',      icon: '🕐', permission: 'timetable.read' },
  { label: 'Leave',           path: '/leave',          icon: '🏖️', permission: 'leave.read' },
  { label: 'Lesson Plans',    path: '/lesson-plans',   icon: '📖', permission: 'lesson_plan.read' },
  { label: 'Behaviour Log',   path: '/behaviour',      icon: '🛡️', permission: 'behaviour.read' },
  { label: 'QR Scan Center',  path: '/qr-center',      icon: '📷', permission: 'qr.read', roles: ['super_admin','admin','principal','librarian'] },
  { label: 'Analytics',       path: '/analytics',      icon: '📊', permission: 'analytics.view_analytics' },
  // ── Admin only ───────────────────────────────────────────
  { label: 'User Management', path: '/admin/users',    icon: '👥', permission: 'admin.manage_users' },
  { label: 'Role Management', path: '/admin/roles',    icon: '🔐', permission: 'admin.manage_users' },
  { label: 'Settings',        path: '/settings',       icon: '⚙️', permission: 'admin.manage_settings' },
];
