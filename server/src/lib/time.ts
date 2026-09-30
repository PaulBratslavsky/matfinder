/**
 * The spec's *Time rules*: one definition used by the directory, the school page and the MCP tools.
 * "Now" is always the server clock converted with the CITY's time zone, never the server's local zone.
 */

export const WEEKDAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;
export type Weekday = (typeof WEEKDAYS)[number];

/**
 * Strapi stores `time` fields as `HH:mm:ss.SSS`; the APIs emit `HH:mm`. Compare as minutes since midnight,
 * so both forms give the same answer. Returns null for anything that isn't a valid time of day.
 */
export function toMinutes(value: unknown): number | null {
  if (typeof value !== 'string') return null;
  const m = /^(\d{2}):(\d{2})(?::(\d{2})(?:\.\d{1,3})?)?$/.exec(value.trim());
  if (!m) return null;
  const hours = Number(m[1]);
  const minutes = Number(m[2]);
  if (hours > 23 || minutes > 59 || (m[3] !== undefined && Number(m[3]) > 59)) return null;
  return hours * 60 + minutes;
}

/** `HH:mm:ss.SSS` (or `HH:mm`) → `HH:mm`, the form the APIs emit. */
export function toHHmm(value: string): string {
  return value.slice(0, 5);
}

/** Strict `HH:mm` (what the MCP schedule tool accepts) → Strapi's stored `HH:mm:ss.SSS`, or null. */
export function toStoredTime(value: unknown): string | null {
  if (typeof value !== 'string' || !/^\d{2}:\d{2}$/.test(value) || toMinutes(value) === null) return null;
  return `${value}:00.000`;
}

export type CityNow = { localDate: string; weekday: Weekday; minutes: number };

/** City-local date, weekday and minutes since midnight for `now`, in `timeZone`. */
export function cityNow(timeZone: string, now: Date = new Date()): CityNow {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      weekday: 'short',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    })
      .formatToParts(now)
      .map((p) => [p.type, p.value]),
  );
  return {
    localDate: `${parts.year}-${parts.month}-${parts.day}`,
    weekday: parts.weekday.toLowerCase() as Weekday,
    minutes: Number(parts.hour) * 60 + Number(parts.minute),
  };
}
