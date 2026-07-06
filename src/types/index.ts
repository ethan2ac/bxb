export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

export type GroupName = 'BY' | 'JDY';

export const BY_LEVELS = ['P4', 'P5', 'P6', 'S1', 'S2', 'S3', 'S4'] as const;
export const JDY_LEVEL = 'JDY';

export interface Student {
  id: string;
  english_name: string | null;
  chinese_name: string | null;
  group_name: GroupName;
  level: string;
  age: number | null;
  gender: string;
  birthday: string | null;
  phone: string | null;
  description: string | null;
  active: number;
  created_at: string;
  updated_at: string;
}

export interface Session {
  id: string;
  session_date: string;
  start_time: string;
  late_threshold_minutes: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export type GroupScope = 'BY' | 'JDY' | 'BOTH';

export interface CalendarEvent {
  id: string;
  name: string;
  event_date: string;
  group_scope: GroupScope;
  start_time: string;
  late_threshold_minutes: number;
  notes: string | null;
  restricted_roster: number;
  invitee_student_ids: string[];
  created_at: string;
  updated_at: string;
}

export type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused';

export interface AttendanceRecord {
  id: string;
  student_id: string;
  session_id?: string;
  status: AttendanceStatus;
  check_in_timestamp: string | null;
  notes: string | null;
  student_name?: string;
  session_date?: string;
  start_time?: string;
  source?: 'session' | 'event';
  occurrence_name?: string | null;
  created_at: string;
  updated_at: string;
}

export interface AttendanceEntry {
  student_id: string;
  status: AttendanceStatus;
  check_in_timestamp?: string | null;
  notes?: string | null;
}

export interface EventAttendanceRecord {
  id: string;
  student_id: string;
  event_id: string;
  status: AttendanceStatus;
  check_in_timestamp: string | null;
  notes: string | null;
  student_name?: string;
  created_at: string;
  updated_at: string;
}

export interface EventAttendanceEntry {
  student_id: string;
  status: AttendanceStatus;
  check_in_timestamp?: string | null;
  notes?: string | null;
}

export type ForecastExpectation = 'yes' | 'no' | 'excused';

export interface Forecast {
  id: string;
  student_id: string;
  event_id: string;
  expected: ForecastExpectation;
  notes: string | null;
  student_name?: string;
  created_at: string;
  updated_at: string;
}

export interface ForecastEntry {
  student_id: string;
  expected: ForecastExpectation;
  notes?: string | null;
}

export interface TeamUser {
  id: string;
  name: string;
  email: string;
  role: string;
  active: number;
  created_at: string;
}

export interface AttendanceSummary {
  total: number;
  present: number;
  late: number;
  absent: number;
  excused: number;
  attendance_rate: number;
}

export interface WeeklyReport {
  occurrence_type: 'session' | 'event';
  occurrence_id: string;
  occurrence_date: string;
  occurrence_name: string | null;
  enrolled: number;
  present: number;
  late: number;
  absent: number;
  excused: number;
  total: number;
  attendance_rate: number;
}

export interface MonthlyTrend {
  month: string;
  present: number;
  late: number;
  absent: number;
  excused: number;
  total: number;
  attendance_rate: number;
}

export interface NoShowStudent {
  id: string;
  name: string;
  consecutive_absences: number;
  last_attended_date: string | null;
}

export interface StudentFormData {
  english_name: string;
  chinese_name: string;
  group_name: GroupName;
  level: string;
  age: number | '';
  gender: string;
  birthday: string;
  phone: string;
  description: string;
}

export interface AppSettings {
  no_show_threshold: string;
  default_start_time: string;
  default_late_threshold_minutes: string;
}

export interface AuditLog {
  id: string;
  actor_user_id: string | null;
  actor_name: string | null;
  entity_type: string;
  entity_id: string;
  action: string;
  metadata: string | null;
  created_at: string;
}

export interface ApiResponse<T> {
  ok: boolean;
  data?: T;
  error?: string;
}
