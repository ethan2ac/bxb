export function isSunday(dateStr: string): boolean {
  const d = new Date(dateStr + 'T00:00:00Z');
  return d.getUTCDay() === 0;
}

export function isValidDate(dateStr: string): boolean {
  const d = new Date(dateStr + 'T00:00:00Z');
  return !isNaN(d.getTime()) && dateStr === d.toISOString().split('T')[0];
}

export function isFutureDate(dateStr: string): boolean {
  return new Date(dateStr + 'T00:00:00Z') > new Date();
}

export function isPositiveInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value > 0;
}

export function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

export interface ValidationError {
  field: string;
  message: string;
}

export function validateStudent(body: Record<string, unknown>): ValidationError[] {
  const errors: ValidationError[] = [];
  if (!isNonEmptyString(body.name)) errors.push({ field: 'name', message: 'Name is required' });
  if (!isPositiveInteger(body.age)) errors.push({ field: 'age', message: 'Age must be a positive integer' });
  if (!isNonEmptyString(body.gender)) errors.push({ field: 'gender', message: 'Gender is required' });
  if (!isNonEmptyString(body.birthday)) {
    errors.push({ field: 'birthday', message: 'Birthday is required' });
  } else if (!isValidDate(body.birthday as string)) {
    errors.push({ field: 'birthday', message: 'Birthday must be a valid date (YYYY-MM-DD)' });
  } else if (isFutureDate(body.birthday as string)) {
    errors.push({ field: 'birthday', message: 'Birthday cannot be a future date' });
  }
  return errors;
}

export function validateSession(body: Record<string, unknown>): ValidationError[] {
  const errors: ValidationError[] = [];
  if (!isNonEmptyString(body.session_date)) {
    errors.push({ field: 'session_date', message: 'Session date is required' });
  } else if (!isValidDate(body.session_date as string)) {
    errors.push({ field: 'session_date', message: 'Invalid date format (YYYY-MM-DD)' });
  } else if (!isSunday(body.session_date as string)) {
    errors.push({ field: 'session_date', message: 'Sessions can only be created on Sundays' });
  }
  if (body.start_time !== undefined && !isNonEmptyString(body.start_time)) {
    errors.push({ field: 'start_time', message: 'Start time must be a valid time string' });
  }
  if (body.late_threshold_minutes !== undefined && !isPositiveInteger(body.late_threshold_minutes)) {
    errors.push({ field: 'late_threshold_minutes', message: 'Late threshold must be a positive integer' });
  }
  return errors;
}

export function validateAttendanceStatus(status: unknown): status is 'present' | 'absent' | 'late' {
  return status === 'present' || status === 'absent' || status === 'late';
}
