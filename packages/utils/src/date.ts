import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc.js';
import timezone from 'dayjs/plugin/timezone.js';

dayjs.extend(utc);
dayjs.extend(timezone);

export { dayjs };

export function formatDate(date: Date | string, format = 'MMMM D, YYYY'): string {
  return dayjs(date).format(format);
}

export function formatDateTime(date: Date | string, tz?: string): string {
  const d = tz ? dayjs(date).tz(tz) : dayjs(date);
  return d.format('MMMM D, YYYY [at] h:mm A');
}

export function addHours(date: Date, hours: number): Date {
  return dayjs(date).add(hours, 'hour').toDate();
}

export function isInPast(date: Date | string): boolean {
  return dayjs(date).isBefore(dayjs());
}

export function hoursUntil(date: Date | string): number {
  return dayjs(date).diff(dayjs(), 'hour');
}
