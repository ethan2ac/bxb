import { Check, X as XIcon, Clock, CalendarOff } from 'lucide-react';
import { Badge } from './Badge';
import { displayName } from '../utils/students';
import { formatTime } from '../utils/dates';
import type { Student, AttendanceStatus } from '../types';

export interface RosterPanelRow {
  student: Student;
  status: AttendanceStatus;
  check_in_timestamp: string | null;
  notes: string;
}

interface RosterPanelProps {
  title?: string;
  rows: RosterPanelRow[];
  onCycle: (studentId: string) => void;
  onNotesChange: (studentId: string, value: string) => void;
  emptyMessage?: string;
  locked?: boolean;
}

export function RosterPanel({ title, rows, onCycle, onNotesChange, emptyMessage = 'No students match', locked = false }: RosterPanelProps) {
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
            {rows.map((entry) => {
              const needsReason = entry.status === 'absent' || entry.status === 'excused';
              return (
                <div
                  key={entry.student.id}
                  className={`px-6 py-4 transition-colors ${
                    entry.status === 'late' ? 'bg-accent-yellow-soft' : 'hover:bg-ink-50/50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <button
                        onClick={() => onCycle(entry.student.id)}
                        disabled={locked}
                        className={`flex h-10 w-10 items-center justify-center rounded-full transition-all ${
                          locked ? 'cursor-not-allowed opacity-60' : ''
                        } ${
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
                        <div className="mt-0.5 flex items-center gap-2">
                          {entry.student.level && <span className="text-xs text-ink-400">{entry.student.level}</span>}
                          {entry.check_in_timestamp && (
                            <span className="text-xs text-ink-400">Checked in {formatTime(entry.check_in_timestamp)}</span>
                          )}
                        </div>
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
                  {needsReason && (
                    <input
                      type="text"
                      value={entry.notes}
                      onChange={(e) => onNotesChange(entry.student.id, e.target.value)}
                      readOnly={locked}
                      placeholder={entry.status === 'excused' ? 'Reason for excused (optional)' : 'Reason for absence (optional)'}
                      className="mt-3 w-full rounded-card-sm border border-ink-200 bg-ink-50/50 px-3 py-1.5 text-xs text-ink-700 placeholder:text-ink-300 focus:border-ink-400 focus:outline-none focus:ring-1 focus:ring-ink-400 disabled:opacity-60"
                    />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
