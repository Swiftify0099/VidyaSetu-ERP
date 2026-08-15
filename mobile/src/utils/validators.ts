/**
 * VidyaSetu Mobile — Form Validators
 */

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

export function validateRequired(value: any, fieldName = 'This field'): ValidationResult {
  if (value === null || value === undefined || String(value).trim() === '') {
    return { valid: false, error: `${fieldName} is required` };
  }
  return { valid: true };
}

export function validateEmail(email: string): ValidationResult {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email.trim()) return { valid: false, error: 'Email is required' };
  if (!re.test(email)) return { valid: false, error: 'Invalid email address' };
  return { valid: true };
}

export function validatePhone(phone: string, required = true): ValidationResult {
  if (!phone || !phone.trim()) {
    if (!required) return { valid: true };
    return { valid: false, error: 'Phone number is required' };
  }
  const digits = phone.replace(/\D/g, '');
  const re = /^[6-9]\d{9}$/;
  const normalized = digits.length > 10 ? digits.slice(-10) : digits;
  if (!re.test(normalized)) {
    return { valid: false, error: 'Invalid Indian mobile number (10 digits, starting with 6-9)' };
  }
  return { valid: true };
}

export function validatePersonName(name: string, fieldName = 'Name'): ValidationResult {
  if (!name || !name.trim()) return { valid: false, error: `${fieldName} is required` };
  const trimmed = name.trim();
  if (trimmed.length < 2) return { valid: false, error: `${fieldName} must be at least 2 characters` };
  if (trimmed.length > 100) return { valid: false, error: `${fieldName} cannot exceed 100 characters` };
  const re = /^[A-Za-z\u0900-\u097F\s\.'\-]+$/;
  if (!re.test(trimmed)) return { valid: false, error: `${fieldName} contains invalid characters` };
  return { valid: true };
}

export function validateAadhaar(aadhaar: string, required = false): ValidationResult {
  const cleaned = aadhaar ? aadhaar.trim().replace(/[\s-]/g, '') : '';
  if (!cleaned) {
    if (!required) return { valid: true };
    return { valid: false, error: 'Aadhaar number is required' };
  }
  if (!/^\d{12}$/.test(cleaned)) {
    return { valid: false, error: 'Aadhaar number must be exactly 12 digits' };
  }
  return { valid: true };
}

export function validatePassword(password: string): ValidationResult {
  if (!password) return { valid: false, error: 'Password is required' };
  if (password.length < 6) return { valid: false, error: 'Password must be at least 6 characters' };
  return { valid: true };
}

export function validatePasswordMatch(password: string, confirm: string): ValidationResult {
  if (!confirm) return { valid: false, error: 'Please confirm your password' };
  if (password !== confirm) return { valid: false, error: 'Passwords do not match' };
  return { valid: true };
}

export function validateAmount(amount: string): ValidationResult {
  if (!amount.trim()) return { valid: false, error: 'Amount is required' };
  const num = Number(amount);
  if (isNaN(num) || num <= 0) return { valid: false, error: 'Enter a valid positive amount' };
  return { valid: true };
}

export function validateDateRange(startDate: string, endDate: string): ValidationResult {
  if (!startDate) return { valid: false, error: 'Start date is required' };
  if (!endDate)   return { valid: false, error: 'End date is required' };
  if (new Date(startDate) > new Date(endDate))
    return { valid: false, error: 'End date must be after start date' };
  return { valid: true };
}

export function validateMarks(marks: string, maxMarks: number): ValidationResult {
  if (marks === undefined || marks === null || !marks.trim()) return { valid: false, error: 'Marks is required' };
  const num = Number(marks);
  if (isNaN(num) || num < 0) return { valid: false, error: 'Marks must be a non-negative number' };
  if (num > maxMarks) return { valid: false, error: `Marks obtained (${num}) cannot exceed max marks (${maxMarks})` };
  return { valid: true };
}

export function validateGRNumber(gr: string): ValidationResult {
  if (!gr.trim()) return { valid: false, error: 'GR Number is required' };
  return { valid: true };
}

export function validateForm(
  rules: Array<() => ValidationResult>
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  for (const rule of rules) {
    const result = rule();
    if (!result.valid && result.error) {
      errors.push(result.error);
    }
  }
  return { valid: errors.length === 0, errors };
}
