import { format, nextSunday, isSunday, parse, addMinutes } from 'date-fns';

export function getDefaultSessionDate(): string {
  const today = new Date();
  if (isSunday(today)) return format(today, 'yyyy-MM-dd');
  return format(nextSunday(today), 'yyyy-MM-dd');
}

export function getTodayDateString(): string {
  return format(new Date(), 'yyyy-MM-dd');
}

export function formatDate(dateStr: string): string {
  const d = parse(dateStr, 'yyyy-MM-dd', new Date());
  return format(d, 'MMM d, yyyy');
}

export function formatDateTime(isoStr: string): string {
  return format(new Date(isoStr), 'MMM d, yyyy h:mm a');
}

export function formatTime(isoStr: string): string {
  return format(new Date(isoStr), 'h:mm a');
}

export function getSundaysBetween(startDate: Date, endDate: Date): string[] {
  const sundays: string[] = [];
  let current = isSunday(startDate) ? startDate : nextSunday(startDate);
  while (current <= endDate) {
    sundays.push(format(current, 'yyyy-MM-dd'));
    current = nextSunday(current);
  }
  return sundays;
}

export function isLate(
  checkInTimestamp: string,
  sessionStartTime: string,
  sessionDate: string,
  lateThresholdMinutes: number,
): boolean {
  const checkIn = new Date(checkInTimestamp);
  const [hours, minutes] = sessionStartTime.split(':').map(Number);
  const start = new Date(`${sessionDate}T${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00.000Z`);
  const threshold = addMinutes(start, lateThresholdMinutes);
  return checkIn > threshold;
}
