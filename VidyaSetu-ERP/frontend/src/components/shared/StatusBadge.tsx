/**
 * VidyaSetu ERP — Shared StatusBadge Component
 * ===============================================
 * Reusable colored badge for status fields.
 * Usage:
 *   <StatusBadge status="active" />
 *   <StatusBadge status="pending" variant="warning" />
 */
import React from 'react';
import styles from './StatusBadge.module.css';

type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'primary';

interface StatusBadgeProps {
  status: string;
  variant?: BadgeVariant;
  size?: 'sm' | 'md';
  dot?: boolean;
}

// Auto-map common status strings to variants
const STATUS_MAP: Record<string, BadgeVariant> = {
  // Active states
  active: 'success',
  present: 'success',
  approved: 'success',
  paid: 'success',
  completed: 'success',
  passed: 'success',
  available: 'success',
  running: 'success',
  open: 'success',
  returned: 'success',
  resolved: 'success',
  published: 'success',
  issued: 'info',

  // Warning states
  pending: 'warning',
  draft: 'warning',
  in_progress: 'warning',
  partial: 'warning',
  under_maintenance: 'warning',
  overdue: 'warning',
  leave: 'warning',
  blocked: 'warning',

  // Danger states
  inactive: 'danger',
  absent: 'danger',
  rejected: 'danger',
  cancelled: 'danger',
  failed: 'danger',
  lost: 'danger',
  damaged: 'danger',
  expired: 'danger',
  dropped: 'danger',
  transferred: 'danger',
  closed: 'danger',

  // Info states
  transferred_in: 'info',
  part_time: 'info',
  contract: 'info',
  guest: 'info',

  // Neutral
  default: 'neutral',
};

const STATUS_LABELS: Record<string, string> = {
  active: 'Active',
  inactive: 'Inactive',
  present: 'Present',
  absent: 'Absent',
  leave: 'Leave',
  approved: 'Approved',
  pending: 'Pending',
  rejected: 'Rejected',
  draft: 'Draft',
  published: 'Published',
  completed: 'Completed',
  cancelled: 'Cancelled',
  in_progress: 'In Progress',
  resolved: 'Resolved',
  closed: 'Closed',
  paid: 'Paid',
  overdue: 'Overdue',
  available: 'Available',
  issued: 'Issued',
  returned: 'Returned',
  lost: 'Lost',
  damaged: 'Damaged',
  passed: 'Passed',
  failed: 'Failed',
  blocked: 'Blocked',
  running: 'Running',
  open: 'Open',
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  variant,
  size = 'md',
  dot = false,
}) => {
  const normalizedStatus = status?.toLowerCase().replace(/\s+/g, '_') ?? 'default';
  const resolvedVariant = variant ?? STATUS_MAP[normalizedStatus] ?? 'neutral';
  const label = STATUS_LABELS[normalizedStatus] ?? status;

  return (
    <span
      className={`${styles.badge} ${styles[resolvedVariant]} ${styles[size]}`}
      title={label}
    >
      {dot && <span className={styles.dot} />}
      {label}
    </span>
  );
};
