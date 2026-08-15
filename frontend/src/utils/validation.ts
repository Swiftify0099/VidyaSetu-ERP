/**
 * VidyaSetu ERP — Centralized Frontend Validation Utilities
 * ==========================================================
 * Provides consistent validation functions for Web forms and components.
 */

// ── Phone Validation (10-digit Indian Mobile) ────────────────
const INDIAN_PHONE_REGEX = /^(?:\+?91|0)?[6-9]\d{9}$/;

export function validateIndianPhone(phone: string, required = false): { isValid: boolean; message?: string } {
  const trimmed = phone ? phone.trim().replace(/[\s-]/g, '') : '';
  if (!trimmed) {
    if (required) return { isValid: false, message: 'Phone number is required.' };
    return { isValid: true };
  }
  if (!INDIAN_PHONE_REGEX.test(trimmed)) {
    return { isValid: false, message: 'Enter a valid 10-digit Indian mobile number (starts with 6-9).' };
  }
  return { isValid: true };
}

// ── Email Validation ──────────────────────────────────────────
const EMAIL_REGEX = /^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$/;

export function validateEmail(email: string, required = false): { isValid: boolean; message?: string } {
  const trimmed = email ? email.trim().toLowerCase() : '';
  if (!trimmed) {
    if (required) return { isValid: false, message: 'Email address is required.' };
    return { isValid: true };
  }
  if (!EMAIL_REGEX.test(trimmed) || trimmed.length > 254) {
    return { isValid: false, message: 'Enter a valid email address (e.g., example@school.edu).' };
  }
  return { isValid: true };
}

// ── Name Validation (English/Hindi/Marathi Unicode) ──────────
const NAME_REGEX = /^[A-Za-z\u0900-\u097F\s\.'\-]+$/;

export function validatePersonName(name: string, fieldName = 'Name', required = true): { isValid: boolean; message?: string } {
  const trimmed = name ? name.trim() : '';
  if (!trimmed) {
    if (required) return { isValid: false, message: `${fieldName} is required.` };
    return { isValid: true };
  }
  if (trimmed.length < 2) {
    return { isValid: false, message: `${fieldName} must be at least 2 characters.` };
  }
  if (trimmed.length > 100) {
    return { isValid: false, message: `${fieldName} cannot exceed 100 characters.` };
  }
  if (!NAME_REGEX.test(trimmed)) {
    return { isValid: false, message: `${fieldName} contains invalid characters.` };
  }
  return { isValid: true };
}

// ── Numeric Range & Boundary Validation ──────────────────────
export function validateNumericRange(
  val: number | string,
  min: number,
  max: number,
  fieldName = 'Value',
  required = true
): { isValid: boolean; message?: string } {
  if (val === '' || val === null || val === undefined) {
    if (required) return { isValid: false, message: `${fieldName} is required.` };
    return { isValid: true };
  }
  const num = typeof val === 'number' ? val : Number(val);
  if (isNaN(num)) {
    return { isValid: false, message: `${fieldName} must be a valid number.` };
  }
  if (num < min) {
    return { isValid: false, message: `${fieldName} cannot be less than ${min}.` };
  }
  if (num > max) {
    return { isValid: false, message: `${fieldName} cannot exceed ${max}.` };
  }
  return { isValid: true };
}

// ── Exam Marks Validation BVA ─────────────────────────────────
export function validateMarks(obtained: number | string, maxMarks: number): { isValid: boolean; message?: string } {
  if (obtained === '' || obtained === null || obtained === undefined) {
    return { isValid: true };
  }
  const num = Number(obtained);
  if (isNaN(num)) {
    return { isValid: false, message: 'Marks must be a valid number.' };
  }
  if (num < 0) {
    return { isValid: false, message: 'Marks cannot be negative.' };
  }
  if (num > maxMarks) {
    return { isValid: false, message: `Marks obtained (${num}) cannot exceed max marks (${maxMarks}).` };
  }
  return { isValid: true };
}

// ── Date Range Validation ─────────────────────────────────────
export function validateDateRange(startDateStr: string, endDateStr: string, label = 'Date Range'): { isValid: boolean; message?: string } {
  if (!startDateStr || !endDateStr) return { isValid: true };
  const start = new Date(startDateStr);
  const end = new Date(endDateStr);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return { isValid: false, message: `Invalid ${label}.` };
  }
  if (start > end) {
    return { isValid: false, message: `Start date cannot be after end date.` };
  }
  return { isValid: true };
}

// ── Aadhaar Card Validation ───────────────────────────────────
export function validateAadhaar(aadhaar: string, required = false): { isValid: boolean; message?: string } {
  const cleaned = aadhaar ? aadhaar.trim().replace(/[\s-]/g, '') : '';
  if (!cleaned) {
    if (required) return { isValid: false, message: 'Aadhaar number is required.' };
    return { isValid: true };
  }
  if (!/^\d{12}$/.test(cleaned)) {
    return { isValid: false, message: 'Aadhaar number must be exactly 12 digits.' };
  }
  return { isValid: true };
}

// ── File Upload Validation ────────────────────────────────────
export function validateFileUpload(
  file: File,
  maxSizeMB = 10,
  allowedMimes: string[] = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
): { isValid: boolean; message?: string } {
  if (!file) return { isValid: false, message: 'No file selected.' };
  if (file.size > maxSizeMB * 1024 * 1024) {
    return { isValid: false, message: `File size exceeds maximum allowed limit of ${maxSizeMB} MB.` };
  }
  if (allowedMimes.length > 0 && !allowedMimes.includes(file.type.toLowerCase())) {
    const ext = file.name.split('.').pop()?.toLowerCase();
    const isExtValid = ['jpg', 'jpeg', 'png', 'webp', 'pdf', 'doc', 'docx', 'mp4'].includes(ext || '');
    if (!isExtValid) {
      return { isValid: false, message: `File format '${file.type || ext}' is not supported.` };
    }
  }
  return { isValid: true };
}

// ── Input Sanitizer (XSS Neutralizer) ─────────────────────────
export function sanitizeInputString(val: string): string {
  if (!val) return '';
  return val
    .trim()
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+=/gi, '');
}
