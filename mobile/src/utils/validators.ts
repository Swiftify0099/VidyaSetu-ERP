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

export function validatePhone(phone: string): ValidationResult {
  const re = /^[6-9]\d{9}$/;
  if (!phone.trim()) return { valid: false, error: 'Phone number is required' };
  if (!re.test(phone.replace(/\D/g, '')))
    return { valid: false, error: 'Invalid Indian mobile number (10 digits, starting with 6-9)' };
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
  if (!marks.trim()) return { valid: false, error: 'Marks is required' };
  const num = Number(marks);
  if (isNaN(num) || num < 0) return { valid: false, error: 'Marks must be a non-negative number' };
  if (num > maxMarks) return { valid: false, error: `Marks cannot exceed ${maxMarks}` };
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
