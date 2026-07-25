/**
 * Role portal path utility — pure function, no React components.
 * Kept separate to avoid breaking Vite Fast Refresh.
 */
export const ROLE_PORTALS: Record<string, string> = {
  super_admin:       '/dashboard',
  admin:             '/dashboard',
  principal:         '/dashboard',
  vice_principal:    '/dashboard',
  teacher:           '/teacher-portal',
  class_teacher:     '/teacher-portal',
  student:           '/student-portal',
  parent:            '/parent-portal',
  clerk:             '/office',
  receptionist:      '/office',
  office_staff:      '/office',
  accountant:        '/finance',
  librarian:         '/library',
  exam_coordinator:  '/exams',
  transport_incharge:'/dashboard',
  support_staff:     '/dashboard',
};

export function getPortalPath(roleCode: string): string {
  return ROLE_PORTALS[roleCode] ?? '/dashboard';
}
