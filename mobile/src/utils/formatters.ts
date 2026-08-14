/**
 * VidyaSetu Mobile — Utility Formatters
 */
import { getCleanErrorMessage } from '../services/apiError';

/** Format Indian Rupee currency */
export function formatCurrency(amount: number | string): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(num)) return '₹0';
  return `₹${num.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

/** Format date to DD/MM/YYYY */
export function formatDate(date: string | Date): string {
  if (!date) return '—';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

/** Format date to readable format: 15 Jan 2025 */
export function formatDateLong(date: string | Date): string {
  if (!date) return '—';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

/** Format datetime */
export function formatDateTime(date: string | Date): string {
  if (!date) return '—';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

/** Format time: 09:30 AM */
export function formatTime(time: string): string {
  if (!time) return '—';
  const [h, m] = time.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, '0')} ${period}`;
}

/** Format percentage */
export function formatPercentage(value: number | string, decimals = 1): string {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return '0%';
  return `${num.toFixed(decimals)}%`;
}

/** Get relative time: "2 hours ago" */
export function timeAgo(date: string | Date): string {
  if (!date) return '—';
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr  = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr  / 24);

  if (diffSec < 60)  return 'just now';
  if (diffMin < 60)  return `${diffMin}m ago`;
  if (diffHr  < 24)  return `${diffHr}h ago`;
  if (diffDay < 7)   return `${diffDay}d ago`;
  return formatDateLong(d);
}

/** Get today's date as YYYY-MM-DD */
export function today(): string {
  return new Date().toISOString().split('T')[0];
}

/** Get first name from full name */
export function firstName(fullName?: string | null, fallback = 'User'): string {
  return fullName?.split(' ')[0] ?? fallback;
}

/** Capitalize first letter */
export function capitalize(str: string): string {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

/** Format status label */
export function formatStatus(status: string): string {
  return status?.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) ?? '—';
}

/** Get status color */
export function statusColor(status: string): string {
  const map: Record<string, string> = {
    approved: '#059669',
    active:   '#059669',
    present:  '#059669',
    passed:   '#059669',
    pending:  '#d97706',
    late:     '#d97706',
    warning:  '#d97706',
    rejected: '#dc2626',
    absent:   '#dc2626',
    failed:   '#dc2626',
    overdue:  '#dc2626',
    cancelled: '#6b7280',
    inactive: '#6b7280',
    leave:    '#8b5cf6',
  };
  return map[status?.toLowerCase()] ?? '#6b7280';
}

/** Format file size */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024)       return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Truncate text */
export function truncate(text: string, maxLength = 60): string {
  if (!text) return '';
  return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
}

/** Check if date is today */
export function isToday(date: string | Date): boolean {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  return d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear();
}

/** Days until a date */
export function daysUntil(date: string | Date): number {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffMs = d.getTime() - now.getTime();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

/** Extract error message from API error */
export function getErrorMessage(error: any, fallback = 'Something went wrong'): string {
  return getCleanErrorMessage(error, fallback);
}
