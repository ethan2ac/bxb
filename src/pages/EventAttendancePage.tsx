import { useParams, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { EventAttendanceView } from '../components/EventAttendanceView';

export function EventAttendancePage() {
  const { eventId } = useParams<{ eventId: string }>();

  if (!eventId) return null;

  return (
    <div className="space-y-8">
      <Link
        to="/schedule"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-400 transition-colors hover:text-ink-700"
      >
        <ArrowLeft className="h-4 w-4" />
        Schedule
      </Link>
      <EventAttendanceView eventId={eventId} />
    </div>
  );
}
