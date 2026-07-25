/**
 * VidyaSetu ERP — Export Utility (Frontend)
 * ==========================================
 * Triggers PDF/Excel downloads from the backend exports API.
 * Uses browser's native fetch + blob URL trick for forced download.
 */
import api from './api';

/**
 * Generic file download from an API endpoint.
 * Opens a save dialog using hidden <a> element.
 */
async function downloadFile(url: string, filename: string, params?: Record<string, string>): Promise<void> {
  const response = await api.get(url, {
    params,
    responseType: 'blob',
  });

  const blob = new Blob([response.data], {
    type: (response.headers['content-type'] as string | undefined) ?? 'application/octet-stream',
  });

  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  // Revoke object URL after a short delay
  setTimeout(() => URL.revokeObjectURL(objectUrl), 2000);
}

// ── Fee Receipt PDF ───────────────────────────────────────────
export async function downloadFeeReceiptPDF(receiptId: number, receiptNumber: string): Promise<void> {
  await downloadFile(`/exports/fee-receipt/${receiptId}/pdf`, `receipt_${receiptNumber}.pdf`);
}

// ── Students Excel ────────────────────────────────────────────
export async function downloadStudentsExcel(options?: {
  standard?: string;
  division?: string;
  academic_year?: string;
}): Promise<void> {
  const params: Record<string, string> = {};
  if (options?.standard)     params.standard = options.standard;
  if (options?.division)     params.division = options.division;
  if (options?.academic_year) params.academic_year = options.academic_year;

  const label = [options?.standard, options?.division].filter(Boolean).join('') || 'all';
  await downloadFile('/exports/students/excel', `students_${label}_${options?.academic_year ?? ''}.xlsx`, params);
}

// ── Fee Collection Excel ──────────────────────────────────────
export async function downloadFeeCollectionExcel(options?: {
  date_from?: string;
  date_to?: string;
  academic_year?: string;
}): Promise<void> {
  const params: Record<string, string> = {};
  if (options?.date_from)     params.date_from = options.date_from;
  if (options?.date_to)       params.date_to = options.date_to;
  if (options?.academic_year) params.academic_year = options.academic_year;

  await downloadFile('/exports/fee-collection/excel', `fee_collection_${options?.academic_year ?? ''}.xlsx`, params);
}

// ── Attendance PDF ────────────────────────────────────────────
export async function downloadAttendancePDF(options: {
  standard: string;
  division: string;
  academic_year?: string;
  month?: number;
}): Promise<void> {
  const params: Record<string, string> = {
    standard: options.standard,
    division: options.division,
  };
  if (options.academic_year) params.academic_year = options.academic_year;
  if (options.month)         params.month = String(options.month);

  await downloadFile(
    '/exports/attendance/pdf',
    `attendance_${options.standard}${options.division}.pdf`,
    params,
  );
}
