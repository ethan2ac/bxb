export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

export interface Student {
  id: string;
  english_name: string;
  chinese_name: string | null;
  age: number;
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

export type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused';

export interface AttendanceRecord {
  id: string;
  student_id: string;
  session_id: string;
  status: AttendanceStatus;
  check_in_timestamp: string | null;
  notes: string | null;
  student_name?: string;
  session_date?: string;
  start_time?: string;
  created_at: string;
  updated_at: string;
}

export interface AttendanceEntry {
  student_id: string;
  status: AttendanceStatus;
  check_in_timestamp?: string | null;
  notes?: string | null;
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
  session: Session;
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
  age: number;
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
