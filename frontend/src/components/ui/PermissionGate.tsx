import { ReactNode } from 'react';
import { useAuth } from '../../contexts/AuthContext';

interface PermissionGateProps {
  permission?: string;
  role?: string;
  superAdminOnly?: boolean;
  children: ReactNode;
  fallback?: ReactNode;
}

/**
 * Permission Gate — conditionally renders children based on permissions.
 *
 * Usage:
 *   <PermissionGate permission="student.create">
 *     <AddStudentButton />
 *   </PermissionGate>
 *
 *   <PermissionGate role="principal" fallback={<AccessDenied />}>
 *     <PrincipalDashboard />
 *   </PermissionGate>
 */
export default function PermissionGate({
  permission,
  role,
  superAdminOnly,
  children,
  fallback = null,
}: PermissionGateProps) {
  const { hasPermission, hasRole, isSuperAdmin } = useAuth();

  if (superAdminOnly && !isSuperAdmin()) return <>{fallback}</>;
  if (permission && !hasPermission(permission)) return <>{fallback}</>;
  if (role && !hasRole(role)) return <>{fallback}</>;

  return <>{children}</>;
}
