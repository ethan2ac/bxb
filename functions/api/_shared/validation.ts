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
  const hasEnglishName = isNonEmptyString(body.english_name);
  const hasChineseName = isNonEmptyString(body.chinese_name);
  if (!hasEnglishName && !hasChineseName) {
    errors.push({ field: 'english_name', message: 'Either an English or Chinese name is required' });
  }
  if (body.chinese_name !== undefined && body.chinese_name !== null && typeof body.chinese_name !== 'string') {
    errors.push({ field: 'chinese_name', message: 'Chinese name must be a string' });
  }
  if (body.group_name !== 'BY' && body.group_name !== 'JDY') {
    errors.push({ field: 'group_name', message: 'Group must be BY or JDY' });
  }
  if (!isNonEmptyString(body.level)) {
    errors.push({ field: 'level', message: 'Level is required' });
  }
  if (body.age !== undefined && body.age !== null && body.age !== '' && body.age !== 0 && !isPositiveInteger(body.age)) {
    errors.push({ field: 'age', message: 'Age must be a positive integer' });
  }
  if (!isNonEmptyString(body.gender)) errors.push({ field: 'gender', message: 'Gender is required' });
  if (body.birthday !== undefined && body.birthday !== null && body.birthday !== '') {
    if (!isValidDate(body.birthday as string)) {
      errors.push({ field: 'birthday', message: 'Birthday must be a valid date (YYYY-MM-DD)' });
    } else if (isFutureDate(body.birthday as string)) {
      errors.push({ field: 'birthday', message: 'Birthday cannot be a future date' });
    }
  }
  if (body.phone !== undefined && body.phone !== null && typeof body.phone !== 'string') {
    errors.push({ field: 'phone', message: 'Phone must be a string' });
  }
  return errors;
}

export function validateSession(body: Record<string, unknown>): ValidationError[] {
  const errors: ValidationError[] = [];
  if (!isNonEmptyString(body.session_date)) {
    errors.push({ field: 'session_date', message: 'Session date is required' });
  } else if (!isValidDate(body.session_date as string)) {
    errors.push({ field: 'session_date', message: 'Invalid date format (YYYY-MM-DD)' });
  }
  if (body.start_time !== undefined && !isNonEmptyString(body.start_time)) {
    errors.push({ field: 'start_time', message: 'Start time must be a valid time string' });
  }
  if (body.late_threshold_minutes !== undefined && !isPositiveInteger(body.late_threshold_minutes)) {
    errors.push({ field: 'late_threshold_minutes', message: 'Late threshold must be a positive integer' });
  }
  return errors;
}

export function validateAttendanceStatus(
  status: unknown,
): status is 'present' | 'absent' | 'late' | 'excused' {
  return status === 'present' || status === 'absent' || status === 'late' || status === 'excused';
}

export function validateEvent(body: Record<string, unknown>): ValidationError[] {
  const errors: ValidationError[] = [];
  if (!isNonEmptyString(body.name)) {
    errors.push({ field: 'name', message: 'Event name is required' });
  }
  if (!isNonEmptyString(body.event_date)) {
    errors.push({ field: 'event_date', message: 'Event date is required' });
  } else if (!isValidDate(body.event_date as string)) {
    errors.push({ field: 'event_date', message: 'Invalid date format (YYYY-MM-DD)' });
  }
  if (body.group_scope !== 'BY' && body.group_scope !== 'JDY' && body.group_scope !== 'BOTH') {
    errors.push({ field: 'group_scope', message: 'Group scope must be BY, JDY, or BOTH' });
  }
  if (body.start_time !== undefined && !isNonEmptyString(body.start_time)) {
    errors.push({ field: 'start_time', message: 'Start time must be a valid time string' });
  }
  if (body.late_threshold_minutes !== undefined && !isPositiveInteger(body.late_threshold_minutes)) {
    errors.push({ field: 'late_threshold_minutes', message: 'Late threshold must be a positive integer' });
  }
  return errors;
}

export function validateForecast(expected: unknown): expected is 'yes' | 'no' | 'excused' {
  return expected === 'yes' || expected === 'no' || expected === 'excused';
}
