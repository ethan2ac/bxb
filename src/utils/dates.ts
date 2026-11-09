import { format, nextSunday, isSunday, parse } from 'date-fns';

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
