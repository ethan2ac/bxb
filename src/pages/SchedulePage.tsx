import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trash2, ArrowRight, Plus, TrendingUp, ClipboardCheck } from 'lucide-react';
import { api } from '../lib/api';
import { useApi } from '../hooks/useApi';
import { useUiStore } from '../store/ui';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { Badge } from '../components/Badge';
import { Modal } from '../components/Modal';
import { MonthCalendar } from '../components/MonthCalendar';
import { EventForm, eventFormDataFrom, type EventFormData } from '../components/EventForm';
import { formatDate } from '../utils/dates';
import type { CalendarEvent } from '../types';

type ModalState =
  | { type: 'closed' }
  | { type: 'day'; date: string; events: CalendarEvent[] }
  | { type: 'create'; date: string }
  | { type: 'edit'; event: CalendarEvent };

const SCOPE_BADGE = (scope: CalendarEvent['group_scope']) =>
  scope === 'JDY' ? 'JDY' : scope === 'BOTH' ? 'active' : 'BY';

export function SchedulePage() {
  const navigate = useNavigate();
  const { addToast } = useUiStore();
  const [month, setMonth] = useState(new Date());
  const [modal, setModal] = useState<ModalState>({ type: 'closed' });
  const { data: events, loading, refetch } = useApi<CalendarEvent[]>('/api/events?limit=500');

  const handleDayClick = (date: string) => {
    const dayEvents = (events || []).filter((e) => e.event_date === date);
    if (dayEvents.length === 0) {
      setModal({ type: 'create', date });
    } else {
      setModal({ type: 'day', date, events: dayEvents });
    }
  };

  const handleCreate = async (data: EventFormData) => {
    await api.post('/api/events', data);
    addToast('Event created', 'success');
    setModal({ type: 'closed' });
    await refetch();
  };

  const handleUpdate = async (eventId: string, data: EventFormData) => {
    await api.put(`/api/events/${eventId}`, data);
    addToast('Event updated', 'success');
    setModal({ type: 'closed' });
    await refetch();
  };

  const handleDelete = async (event: CalendarEvent) => {
    if (!window.confirm(`Delete "${event.name}"? This also removes its attendance and forecast records. This cannot be undone.`)) {
      return;
    }
    await api.delete(`/api/events/${event.id}`);
    addToast('Event deleted', 'success');
    setModal({ type: 'closed' });
    await refetch();
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold tracking-tight-lg text-ink-900 md:text-5xl">Schedule</h1>
        <p className="mt-2 text-base text-ink-400">
          Click any day to create an event, or click an existing one to view, edit, or remove it
        </p>
      </div>

      <MonthCalendar month={month} events={events || []} onMonthChange={setMonth} onDayClick={handleDayClick} />

      {/* Day panel: list of events on the selected date */}
      <Modal
        open={modal.type === 'day'}
        onClose={() => setModal({ type: 'closed' })}
        title={modal.type === 'day' ? formatDate(modal.date) : ''}
      >
        {modal.type === 'day' && (
          <div className="space-y-3">
            {modal.events.map((event) => {
              const isFuture = event.event_date > new Date().toISOString().split('T')[0];
              return (
                <div
                  key={event.id}
                  className="flex items-center justify-between rounded-card-sm border border-ink-100 bg-ink-50/50 px-4 py-3"
                >
                  <div>
                    <p className="text-sm font-medium text-ink-800">{event.name}</p>
                    <Badge variant={SCOPE_BADGE(event.group_scope)}>
                      {event.group_scope === 'BOTH' ? 'BY & JDY' : event.group_scope}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setModal({ type: 'edit', event })}
                      className="rounded-pill px-3 py-1.5 text-xs font-medium text-ink-500 transition-colors hover:bg-ink-100 hover:text-ink-700"
                    >
                      Edit
                    </button>
                    {isFuture ? (
                      <button
                        onClick={() => navigate(`/forecast/${event.id}`)}
                        className="flex items-center gap-1 rounded-pill bg-accent-charcoal px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-accent-dark"
                      >
                        <TrendingUp className="h-3 w-3" />
                        Forecast
                        <ArrowRight className="h-3 w-3" />
                      </button>
                    ) : (
                      <button
                        onClick={() => navigate(`/schedule/${event.id}`)}
                        className="flex items-center gap-1 rounded-pill bg-accent-charcoal px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-accent-dark"
                      >
                        <ClipboardCheck className="h-3 w-3" />
                        Attendance
                        <ArrowRight className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
            <button
              onClick={() => setModal({ type: 'create', date: modal.date })}
              className="flex w-full items-center justify-center gap-2 rounded-pill border border-dashed border-ink-200 px-4 py-2.5 text-sm font-medium text-ink-500 transition-colors hover:bg-ink-50"
            >
              <Plus className="h-4 w-4" />
              Add another event on this day
            </button>
          </div>
        )}
      </Modal>

      {/* Create form */}
      <Modal open={modal.type === 'create'} onClose={() => setModal({ type: 'closed' })} title="Create Event">
        {modal.type === 'create' && (
          <EventForm
            initial={{ event_date: modal.date }}
            onSubmit={handleCreate}
            onCancel={() => setModal({ type: 'closed' })}
            submitLabel="Create Event"
          />
        )}
      </Modal>

      {/* Edit form */}
      <Modal open={modal.type === 'edit'} onClose={() => setModal({ type: 'closed' })} title="Edit Event">
        {modal.type === 'edit' && (
          <div className="space-y-5">
            <EventForm
              initial={eventFormDataFrom(modal.event)}
              onSubmit={(data) => handleUpdate(modal.event.id, data)}
              onCancel={() => setModal({ type: 'closed' })}
              submitLabel="Save Changes"
            />
            <div className="border-t border-ink-100 pt-4">
              <button
                onClick={() => handleDelete(modal.event)}
                className="flex items-center gap-2 rounded-pill border border-status-danger/30 px-4 py-2 text-sm font-medium text-status-danger transition-colors hover:bg-status-danger-soft"
              >
                <Trash2 className="h-4 w-4" />
                Delete Event
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
