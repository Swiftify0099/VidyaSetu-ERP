/**
 * VidyaSetu ERP — Role-Based Route Guards
 * =========================================
 * Only React components here — no utility exports.
 * Utility (getPortalPath, ROLE_PORTALS) is in utils/rolePortals.ts
 */
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { ROLE_PORTALS } from '../../utils/rolePortals';

/**
 * Redirect the logged-in user to their role-specific portal.
 * Used on the root "/" route after authentication.
 */
export default function RolePortalRedirect({ fallback = '/dashboard' }: { fallback?: string }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  const primaryRole = user.roles?.[0]?.code;
  const destination = primaryRole ? (ROLE_PORTALS[primaryRole] ?? fallback) : fallback;
  return <Navigate to={destination} replace />;
}

/**
 * Guard that restricts a route to users with specific roles.
 * Super Admin bypasses all restrictions.
 */
export function RoleGuard({
  allowedRoles,
  children,
}: {
  allowedRoles: string[];
  children: React.ReactNode;
}) {
  const { user, hasRole, isSuperAdmin } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (isSuperAdmin()) return <>{children}</>;
  if (allowedRoles.some(r => hasRole(r))) return <>{children}</>;
  return <Navigate to="/unauthorized" replace />;
}
