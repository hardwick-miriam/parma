import { toZonedTime, format } from 'date-fns-tz'

const DEFAULT_TZ = 'Europe/London'

/** Returns YYYY-MM-DD in the user's timezone (default: Europe/London) */
export function getLocalDate(tz: string = DEFAULT_TZ, now: Date = new Date()): string {
  return format(toZonedTime(now, tz), 'yyyy-MM-dd', { timeZone: tz })
}

/** Returns the full weekday name (Monday, Tuesday…) for a YYYY-MM-DD string */
export function getWeekdayName(dateStr: string): string {
  return format(new Date(dateStr + 'T12:00:00'), 'EEEE')
}

/** Returns the current hour (0-23) in the user's timezone (default: Europe/London) */
export function getLocalHour(tz: string = DEFAULT_TZ, now: Date = new Date()): number {
  return Number(format(toZonedTime(now, tz), 'H', { timeZone: tz }))
}

/** One calendar day before a YYYY-MM-DD string (Europe/London terms, DST-safe via noon anchor) */
export function subtractDay(dateStr: string, tz: string = DEFAULT_TZ): string {
  const d = new Date(dateStr + 'T12:00:00Z')
  d.setUTCDate(d.getUTCDate() - 1)
  return getLocalDate(tz, d)
}

/** Format a date for display — e.g. "Friday 4 July 2025" */
export function formatDisplayDate(tz: string = DEFAULT_TZ, now: Date = new Date()): string {
  return format(toZonedTime(now, tz), 'EEEE d MMMM yyyy', { timeZone: tz })
}

/** Parse a YYYY-MM-DD string to a Date at noon UTC (avoids off-by-one from timezone boundaries) */
export function parseDateString(dateStr: string): Date {
  return new Date(dateStr + 'T12:00:00Z')
}
