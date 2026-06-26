export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

export interface Student {
  id: string;
  name: string;
  age: number;
  gender: string;
  birthday: string;
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

export interface AttendanceRecord {
  id: string;
  student_id: string;
  session_id: string;
  status: 'present' | 'absent' | 'late';
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
  status: 'present' | 'absent' | 'late';
  check_in_timestamp?: string | null;
  notes?: string | null;
}

export interface AttendanceSummary {
  total: number;
  present: number;
  late: number;
  absent: number;
  attendance_rate: number;
}

export interface WeeklyReport {
  session: Session;
  enrolled: number;
  present: number;
  late: number;
  absent: number;
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
  name: string;
  age: number;
  gender: string;
  birthday: string;
  description: string;
}

export interface ApiResponse<T> {
  ok: boolean;
  data?: T;
  error?: string;
}
