import { useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Search, UserCheck, Clock, CalendarClock, UserX, Pencil } from 'lucide-react';
import { useApi } from '../hooks/useApi';
import { api } from '../lib/api';
import { useUiStore } from '../store/ui';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { Badge } from '../components/Badge';
import { EmptyState } from '../components/EmptyState';
import { Modal } from '../components/Modal';
import { formatDate } from '../utils/dates';
import type { Session, CalendarEvent, AttendanceRecord, EventAttendanceRecord, AttendanceStatus } from '../types';

type OccurrenceType = 'session' | 'event';
type DetailRecord = AttendanceRecord | EventAttendanceRecord;

interface SessionResponse {
  session: Session | null;
  records: AttendanceRecord[];
}
interface EventResponse {
  event: CalendarEvent | null;
  records: EventAttendanceRecord[];
}

const STATUS_TABS: { value: AttendanceStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'present', label: 'Present' },
  { value: 'late', label: 'Late' },
  { value: 'excused', label: 'Excused' },
  { value: 'absent', label: 'Absent' },
];

function scopeLabel(scope: string): string {
  if (scope === 'BOTH') return 'BY & JDY';
  return scope;
}

const AMEND_STATUS_OPTIONS: { value: AttendanceStatus; label: string }[] = [
  { value: 'present', label: 'Present' },
  { value: 'late', label: 'Late' },
  { value: 'excused', label: 'Excused' },
  { value: 'absent', label: 'Absent' },
];

export function AttendanceDetailPage() {
  const { type, id } = useParams<{ type: OccurrenceType; id: string }>();
  const navigate = useNavigate();
  const { addToast } = useUiStore();
  const isEvent = type === 'event';
  const url = id ? (isEvent ? `/api/event-attendance?eventId=${id}` : `/api/attendance?sessionId=${id}`) : null;
  const { data, loading, refetch } = useApi<SessionResponse | EventResponse>(url);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<AttendanceStatus | 'all'>('all');

  const [amending, setAmending] = useState<DetailRecord | null>(null);
  const [amendStatus, setAmendStatus] = useState<AttendanceStatus>('present');
  const [amendReason, setAmendReason] = useState('');
  const [submittingAmend, setSubmittingAmend] = useState(false);

  const openAmend = (record: DetailRecord) => {
    setAmending(record);
    setAmendStatus(record.status);
    setAmendReason('');
  };

  const submitAmend = async () => {
    if (!amending || !amendReason.trim()) return;
    setSubmittingAmend(true);
    try {
      const endpoint = isEvent ? `/api/event-attendance/${amending.id}` : `/api/attendance/${amending.id}`;
      await api.put(endpoint, { status: amendStatus, reason: amendReason.trim() });
      addToast('Attendance amended', 'success');
      setAmending(null);
      await refetch();
    } catch (e) {
      addToast(e instanceof Error ? e.message : 'Failed to amend attendance', 'error');
    } finally {
      setSubmittingAmend(false);
    }
  };

  const occurrence = isEvent ? (data as EventResponse | null)?.event : (data as SessionResponse | null)?.session;
  const records: DetailRecord[] = data?.records ?? [];

  const counts = useMemo(() => {
    const c = { present: 0, late: 0, excused: 0, absent: 0 };
    for (const r of records) c[r.status as keyof typeof c]++;
    return c;
  }, [records]);
  const total = records.length;
  const attendanceRate = total > 0 ? Math.round(((counts.present + counts.late) / total) * 100) : 0;

  const filteredRecords = records.filter((r) => {
    const matchesStatus = statusFilter === 'all' || r.status === statusFilter;
    const matchesSearch = (r.student_name || '').toLowerCase().includes(search.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  if (loading) return <LoadingSpinner />;

  if (!occurrence) {
    return (
      <div className="space-y-8">
        <BackButton onClick={() => navigate(-1)} />
        <EmptyState title="Not found" description="This attendance record no longer exists." />
      </div>
    );
  }

  const date = isEvent ? (occurrence as CalendarEvent).event_date : (occurrence as Session).session_date;
  const name = isEvent ? (occurrence as CalendarEvent).name : 'Attendance';
  const scope = isEvent ? (occurrence as CalendarEvent).group_scope : null;
  const notes = occurrence.notes;

  return (
    <div className="space-y-8">
      <BackButton onClick={() => navigate(-1)} />

      {/* Header */}
      <div className="rounded-card border border-ink-100 bg-white p-5 shadow-card sm:p-8">
        <div className="flex flex-wrap items-center gap-2.5">
          <h1 className="text-xl font-bold tracking-tight-lg text-ink-900 sm:text-2xl">{name}</h1>
          {scope && <Badge variant={scope === 'JDY' ? 'JDY' : 'BY'}>{scopeLabel(scope)}</Badge>}
        </div>
        <p className="mt-1.5 text-sm text-ink-400">{formatDate(date)}</p>
        {notes && <p className="mt-3 text-sm text-ink-500">{notes}</p>}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        <div className="rounded-card border border-ink-100 bg-white p-4 shadow-card sm:p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-ink-400">Attendance Rate</p>
              <p className="mt-2 text-2xl font-bold tracking-tight-lg text-status-success sm:text-3xl">
                {attendanceRate}%
              </p>
            </div>
            <UserCheck className="h-5 w-5 text-ink-300" />
          </div>
        </div>
        <div className="rounded-card border border-ink-100 bg-white p-4 shadow-card sm:p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-ink-400">Present</p>
              <p className="mt-2 text-2xl font-bold tracking-tight-lg text-ink-900 sm:text-3xl">{counts.present}</p>
            </div>
            <UserCheck className="h-5 w-5 text-ink-300" />
          </div>
        </div>
        <div className="rounded-card border border-ink-100 bg-white p-4 shadow-card sm:p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-ink-400">Late</p>
              <p className="mt-2 text-2xl font-bold tracking-tight-lg text-accent-yellow-text sm:text-3xl">
                {counts.late}
              </p>
            </div>
            <Clock className="h-5 w-5 text-ink-300" />
          </div>
        </div>
        <div className="rounded-card border border-ink-100 bg-white p-4 shadow-card sm:p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-ink-400">Excused</p>
              <p className="mt-2 text-2xl font-bold tracking-tight-lg text-status-info sm:text-3xl">
                {counts.excused}
              </p>
            </div>
            <CalendarClock className="h-5 w-5 text-ink-300" />
          </div>
        </div>
        <div className="rounded-card bg-accent-charcoal p-4 shadow-dark-card sm:p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-ink-400">Absent</p>
              <p className="mt-2 text-2xl font-bold tracking-tight-lg text-white sm:text-3xl">{counts.absent}</p>
            </div>
            <UserX className="h-5 w-5 text-ink-500" />
          </div>
        </div>
      </div>

      {/* Roster */}
      <div className="overflow-hidden rounded-card border border-ink-100 bg-white shadow-card">
        <div className="space-y-3 border-b border-ink-100 px-5 py-4 sm:px-7">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-300" />
            <input
              type="text"
              placeholder="Search students..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-card-sm border border-ink-200 bg-white py-2.5 pl-11 pr-4 text-sm text-ink-700 shadow-sm placeholder:text-ink-300 focus:border-ink-400 focus:outline-none focus:ring-1 focus:ring-ink-400"
            />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {STATUS_TABS.map((tab) => (
              <button
                key={tab.value}
                onClick={() => setStatusFilter(tab.value)}
                className={`rounded-pill px-3.5 py-1.5 text-xs font-medium transition-colors ${
                  statusFilter === tab.value
                    ? 'bg-accent-charcoal text-white'
                    : 'bg-ink-100 text-ink-500 hover:bg-ink-200'
                }`}
              >
                {tab.label}
                {tab.value !== 'all' && ` (${counts[tab.value]})`}
              </button>
            ))}
          </div>
        </div>
        {filteredRecords.length === 0 ? (
          <div className="p-12 text-center text-sm text-ink-400">
            {total === 0 ? 'No attendance records for this occurrence' : 'No students match the current filters'}
          </div>
        ) : (
          <div className="divide-y divide-ink-100">
            {filteredRecords.map((record) => (
              <div
                key={record.id}
                className={`flex items-center justify-between gap-3 px-5 py-3.5 transition-colors sm:px-7 ${
                  record.status === 'late' ? 'bg-accent-yellow-soft' : 'hover:bg-ink-50/50'
                }`}
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-ink-700">{record.student_name}</p>
                  {record.notes && <p className="mt-0.5 whitespace-pre-line text-xs text-ink-400">{record.notes}</p>}
                </div>
                <div className="flex flex-shrink-0 items-center gap-2">
                  <Badge variant={record.status}>{record.status}</Badge>
                  <button
                    onClick={() => openAmend(record)}
                    className="flex items-center gap-1 rounded-pill border border-ink-200 px-2.5 py-1 text-xs font-medium text-ink-500 transition-colors hover:border-ink-300 hover:text-ink-700"
                  >
                    <Pencil className="h-3 w-3" />
                    Amend
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Modal open={!!amending} onClose={() => !submittingAmend && setAmending(null)} title="Amend Attendance">
        {amending && (
          <div className="space-y-5">
            <div>
              <p className="text-sm font-medium text-ink-700">{amending.student_name}</p>
              <p className="mt-0.5 text-xs text-ink-400">Currently marked as {amending.status}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-ink-600">New status</label>
              <select
                value={amendStatus}
                onChange={(e) => setAmendStatus(e.target.value as AttendanceStatus)}
                className="mt-1.5 block w-full rounded-card-sm border border-ink-200 bg-ink-50/50 px-4 py-2.5 text-sm text-ink-800 shadow-sm focus:border-ink-400 focus:outline-none focus:ring-1 focus:ring-ink-400"
              >
                {AMEND_STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-ink-600">
                Reason for amendment <span className="font-normal text-ink-300">(required)</span>
              </label>
              <textarea
                value={amendReason}
                onChange={(e) => setAmendReason(e.target.value)}
                rows={3}
                placeholder="Why is this attendance record being changed?"
                className="mt-1.5 block w-full rounded-card-sm border border-ink-200 bg-ink-50/50 px-4 py-2.5 text-sm text-ink-800 shadow-sm placeholder:text-ink-300 focus:border-ink-400 focus:outline-none focus:ring-1 focus:ring-ink-400"
              />
              <p className="mt-1.5 text-xs text-ink-400">
                This is recorded permanently on the attendance record and in the audit log.
              </p>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setAmending(null)}
                disabled={submittingAmend}
                className="rounded-pill border border-ink-200 bg-white px-5 py-2.5 text-sm font-medium text-ink-600 transition-colors hover:bg-ink-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={submitAmend}
                disabled={submittingAmend || !amendReason.trim()}
                className="rounded-pill bg-accent-charcoal px-6 py-2.5 text-sm font-medium text-white shadow-pill transition-all hover:bg-accent-dark disabled:opacity-50"
              >
                {submittingAmend ? 'Saving...' : 'Save Amendment'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-400 transition-colors hover:text-ink-700"
    >
      <ArrowLeft className="h-4 w-4" />
      Back
    </button>
  );
}
