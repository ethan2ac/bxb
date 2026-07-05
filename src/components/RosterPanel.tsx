import { Check, X as XIcon, Clock, CalendarOff } from 'lucide-react';
import { Badge } from './Badge';
import { displayName } from '../utils/students';
import { formatTime } from '../utils/dates';
import type { Student, AttendanceStatus } from '../types';

export interface RosterPanelRow {
  student: Student;
  status: AttendanceStatus;
  check_in_timestamp: string | null;
}

interface RosterPanelProps {
  title?: string;
  rows: RosterPanelRow[];
  onCycle: (studentId: string) => void;
  emptyMessage?: string;
}

export function RosterPanel({ title, rows, onCycle, emptyMessage = 'No students match' }: RosterPanelProps) {
  return (
    <div className="min-w-0 flex-1 space-y-3">
      {title && (
        <div className="flex items-center justify-between px-1">
          <h3 className="text-sm font-semibold text-ink-700">{title}</h3>
          <span className="text-xs text-ink-400">{rows.length} students</span>
        </div>
      )}
      <div className="overflow-hidden rounded-card border border-ink-100 bg-white shadow-card">
        {rows.length === 0 ? (
          <div className="p-8 text-center text-sm text-ink-400">{emptyMessage}</div>
        ) : (
          <div className="divide-y divide-ink-100">
            {rows.map((entry) => (
              <div
                key={entry.student.id}
                className={`flex items-center justify-between px-6 py-4 transition-colors ${
                  entry.status === 'late' ? 'bg-accent-yellow-soft' : 'hover:bg-ink-50/50'
                }`}
              >
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => onCycle(entry.student.id)}
                    className={`flex h-10 w-10 items-center justify-center rounded-full transition-all ${
                      entry.status === 'present'
                        ? 'bg-status-success text-white shadow-sm'
                        : entry.status === 'late'
                          ? 'bg-accent-yellow text-white shadow-sm'
                          : entry.status === 'excused'
                            ? 'bg-status-info text-white shadow-sm'
                            : 'border-2 border-ink-200 text-ink-300 hover:border-ink-300'
                    }`}
                    aria-label={`Toggle attendance for ${displayName(entry.student)}`}
                  >
                    {entry.status === 'excused' ? (
                      <CalendarOff className="h-4 w-4" />
                    ) : entry.status !== 'absent' ? (
                      <Check className="h-5 w-5" />
                    ) : (
                      <XIcon className="h-4 w-4" />
                    )}
                  </button>
                  <div>
                    <p className={`text-sm font-medium ${entry.status === 'late' ? 'text-accent-yellow-text' : 'text-ink-800'}`}>
                      {displayName(entry.student)}
                    </p>
                    {entry.check_in_timestamp && (
                      <p className="text-xs text-ink-400">Checked in {formatTime(entry.check_in_timestamp)}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {entry.status === 'late' && (
                    <Badge variant="late">
                      <Clock className="mr-0.5 h-3 w-3" />
                      Late
                    </Badge>
                  )}
                  {entry.status === 'present' && <Badge variant="present">Present</Badge>}
                  {entry.status === 'absent' && <Badge variant="absent">Absent</Badge>}
                  {entry.status === 'excused' && <Badge variant="excused">Excused</Badge>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
