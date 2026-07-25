/**
 * VidyaSetu ERP — PermissionGate Component
 * ==========================================
 * Wraps any component/page with role + permission enforcement.
 * If user lacks permission → redirect to /unauthorized.
 *
 * Usage:
 *   <PermissionGate permission="finance.read">
 *     <FinancePage />
 *   </PermissionGate>
 *
 *   <PermissionGate roles={['admin', 'principal']}>
 *     <ReportsPage />
 *   </PermissionGate>
 */
import React, { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

interface PermissionGateProps {
  children: ReactNode;
  /** Single permission code required, e.g. "finance.read" */
  permission?: string;
  /** Any one of these roles is sufficient */
  roles?: string[];
  /** Custom redirect path (default: /unauthorized) */
  redirectTo?: string;
  /** If true, renders null instead of redirecting (for conditional rendering) */
  fallbackNull?: boolean;
}

export default function PermissionGate({
  children,
  permission,
  roles,
  redirectTo = '/unauthorized',
  fallbackNull = false,
}: PermissionGateProps) {
  const { user, hasPermission: ctxHasPermission, hasRole: ctxHasRole, isSuperAdmin } = useAuth();

  if (!user) return <Navigate to="/login" replace />;

  // Super admin bypasses all checks
  if (isSuperAdmin()) return <>{children}</>;

  // Role check — any one role is sufficient
  if (roles && roles.length > 0) {
    const hasMatchingRole = roles.some(r => ctxHasRole(r));
    if (!hasMatchingRole) {
      if (fallbackNull) return null;
      return <Navigate to={redirectTo} replace />;
    }
  }

  // Permission check
  if (permission) {
    if (!ctxHasPermission(permission)) {
      if (fallbackNull) return null;
      return <Navigate to={redirectTo} replace />;
    }
  }

  return <>{children}</>;
}
