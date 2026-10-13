/**
 * The spec's *Time rules*, the app's copy. "Now" is always the city's local time, never the device's time zone,
 * so "Training today" and the next session are right for someone planning from another time zone.
 */
import type { ClassType, Session, Style, Weekday } from './api/schools';

export type CityNow = { localDate: string; weekday: Weekday; minutes: number };

/** City-local date, weekday and minutes since midnight. */
export function cityNow(timeZone: string, now: Date = new Date()): CityNow {
  const parts: Record<string, string> = {};
  for (const p of new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(now)) {
    parts[p.type] = p.value;
  }
  return {
    localDate: `${parts.year}-${parts.month}-${parts.day}`,
    weekday: parts.weekday.toLowerCase() as Weekday,
    minutes: Number(parts.hour) * 60 + Number(parts.minute),
  };
}

/** `HH:mm` (or `HH:mm:ss.SSS`) → minutes since midnight. */
export function toMinutes(hhmm: string): number {
  return Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5));
}

/** "Training today": at least one of today's sessions hasn't ended yet. */
export function isTrainingToday(today: Session[], now: CityNow): boolean {
  return today.some((s) => toMinutes(s.end) > now.minutes);
}

/** The first session today that hasn't ended; `onNow` when it has already started. */
export function nextSessionToday(today: Session[], now: CityNow): (Session & { onNow: boolean }) | null {
  const next = [...today].sort((a, b) => toMinutes(a.start) - toMinutes(b.start)).find((s) => toMinutes(s.end) > now.minutes);
  return next ? { ...next, onNow: toMinutes(next.start) <= now.minutes } : null;
}

const CLASS_TYPE_LABELS: Record<ClassType, string> = {
  fundamentals: 'Fundamentals',
  all_levels: 'All levels',
  advanced: 'Advanced',
  open_mat: 'Open mat',
  competition: 'Competition',
  kids: 'Kids',
  womens: "Women's",
};

export const classTypeLabel = (t: ClassType) => CLASS_TYPE_LABELS[t] ?? t;

const STYLE_LABELS: Record<Style, string> = { gi: 'Gi', nogi: 'No-Gi', both: 'Gi & No-Gi' };

export const styleLabel = (s: Style) => STYLE_LABELS[s] ?? s;

/** `19:00` → `7:00 pm`. */
export function formatTime(hhmm: string): string {
  const minutes = toMinutes(hhmm);
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h % 12 === 0 ? 12 : h % 12}:${String(m).padStart(2, '0')} ${h < 12 ? 'am' : 'pm'}`;
}

/** The preview card line: "On now", "Open mat · 7:00 pm", or "No more sessions today". */
export function nextSessionLabel(today: Session[], now: CityNow): string {
  const next = nextSessionToday(today, now);
  if (!next) return 'No more sessions today';
  return next.onNow ? 'On now' : `${classTypeLabel(next.classType)} · ${formatTime(next.start)}`;
}
