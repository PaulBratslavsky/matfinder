/**
 * The school page's week, in the city's local time: the next class (today or a later day), the week-at-a-glance
 * grid, the rest of the week, the "Can I train here tonight?" checklist and an "Add to calendar" link.
 */
import type { ClassType, SchoolPage, Weekday } from './api/schools';
import { money } from './explore';
import { classTypeLabel, styleLabel, toMinutes, type CityNow } from './time';

export type ScheduledSession = SchoolPage['schedule'][number];

export const WEEKDAYS: Weekday[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

export const DAY_NAMES: Record<Weekday, string> = {
  mon: 'Monday',
  tue: 'Tuesday',
  wed: 'Wednesday',
  thu: 'Thursday',
  fri: 'Friday',
  sat: 'Saturday',
  sun: 'Sunday',
};

export const dayShort = (d: Weekday) => DAY_NAMES[d].slice(0, 3);

const byStart = (a: ScheduledSession, b: ScheduledSession) => toMinutes(a.start) - toMinutes(b.start);
export const sessionsOn = (schedule: ScheduledSession[], day: Weekday) => schedule.filter((s) => s.day === day).sort(byStart);

export type NextClass = { session: ScheduledSession; daysAhead: number; onNow: boolean };

/** Today's first class that hasn't ended, else the first class on a following day (a week ahead at most). */
export function nextClass(schedule: ScheduledSession[], now: CityNow): NextClass | null {
  const today = WEEKDAYS.indexOf(now.weekday);
  for (let d = 0; d <= 7; d++) {
    const sessions = sessionsOn(schedule, WEEKDAYS[(today + d) % 7]).filter((s) => d > 0 || toMinutes(s.end) > now.minutes);
    if (sessions.length) return { session: sessions[0], daysAhead: d, onNow: d === 0 && toMinutes(sessions[0].start) <= now.minutes };
  }
  return null;
}

export type Slot = 'morning' | 'midday' | 'afternoon' | 'evening';

export const SLOTS: { key: Slot; label: string }[] = [
  { key: 'morning', label: 'Morning' },
  { key: 'midday', label: 'Midday' },
  { key: 'afternoon', label: 'Afternoon' },
  { key: 'evening', label: 'Evening' },
];

/** Before 11:00 morning, before 14:00 midday, before 17:00 afternoon, then evening (by start time). */
export function slotOf(start: string): Slot {
  const m = toMinutes(start);
  return m < 11 * 60 ? 'morning' : m < 14 * 60 ? 'midday' : m < 17 * 60 ? 'afternoon' : 'evening';
}

const SHORT: Partial<Record<ClassType, string>> = { fundamentals: 'Fund.', advanced: 'Adv.', competition: 'Comp.' };
/** Week-grid cell text: "Fund.", "Open mat", "Kids". */
export const shortClassLabel = (t: ClassType) => SHORT[t] ?? classTypeLabel(t);

export type CellState = 'empty' | 'class' | 'done' | 'live' | 'next';
export type WeekCell = { slot: Slot; sessions: ScheduledSession[]; state: CellState; label: string };
export type WeekRow = { day: Weekday; isToday: boolean; hasClasses: boolean; cells: WeekCell[] };

/** Monday to Sunday by time of day. Today's finished classes say "Done"; the next class is marked (today or later). */
export function weekGrid(schedule: ScheduledSession[], now: CityNow | null): WeekRow[] {
  const next = now ? nextClass(schedule, now) : null;
  return WEEKDAYS.map((day) => {
    const isToday = now?.weekday === day;
    const daySessions = sessionsOn(schedule, day);
    const cells = SLOTS.map(({ key }): WeekCell => {
      const sessions = daySessions.filter((s) => slotOf(s.start) === key);
      if (!sessions.length) return { slot: key, sessions, state: 'empty', label: '' };
      const base = shortClassLabel(sessions[0].classType) + (sessions.length > 1 ? ` +${sessions.length - 1}` : '');
      let state: CellState = 'class';
      if (next && next.session.day === day && sessions.includes(next.session) && next.daysAhead < 7) state = next.onNow ? 'live' : 'next';
      else if (isToday && now && sessions.every((s) => toMinutes(s.end) <= now.minutes)) state = 'done';
      return { slot: key, sessions, state, label: state === 'done' ? `${base} · Done` : base };
    });
    return { day, isToday, hasClasses: daySessions.length > 0, cells };
  });
}

/** The six days after today, in order: those with classes, and the ones without. */
export function restOfWeek(schedule: ScheduledSession[], now: CityNow): { days: { day: Weekday; sessions: ScheduledSession[] }[]; emptyDays: Weekday[] } {
  const today = WEEKDAYS.indexOf(now.weekday);
  const days: { day: Weekday; sessions: ScheduledSession[] }[] = [];
  const emptyDays: Weekday[] = [];
  for (let d = 1; d < 7; d++) {
    const day = WEEKDAYS[(today + d) % 7];
    const sessions = sessionsOn(schedule, day);
    if (sessions.length) days.push({ day, sessions });
    else emptyDays.push(day);
  }
  return { days, emptyDays };
}

/** `['fri', 'sun']` → "Friday or Sunday"; three or more → "Friday, Saturday or Sunday". */
export function dayList(days: Weekday[]): string {
  const names = days.map((d) => DAY_NAMES[d]);
  return names.length <= 1 ? (names[0] ?? '') : `${names.slice(0, -1).join(', ')} or ${names[names.length - 1]}`;
}

/** `2026-10-12` + 3 → `2026-10-15` (plain dates: no time zone shift). */
export function addDays(localDate: string, days: number): string {
  const [y, m, d] = localDate.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

/**
 * A Google Calendar "new event" link for one class, in the city's time zone (`ctz`), so it lands at the right
 * time wherever the phone is. Works on every platform without calendar permissions.
 */
export function calendarUrl(e: { title: string; date: string; start: string; end: string; timeZone: string; location?: string | null; details?: string }): string {
  const day = e.date.replaceAll('-', '');
  const t = (hhmm: string) => `${hhmm.slice(0, 2)}${hhmm.slice(3, 5)}00`;
  const params: Record<string, string> = { action: 'TEMPLATE', text: e.title, dates: `${day}T${t(e.start)}/${day}T${t(e.end)}`, ctz: e.timeZone };
  if (e.location) params.location = e.location;
  if (e.details) params.details = e.details;
  return `https://calendar.google.com/calendar/render?${Object.entries(params)
    .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
    .join('&')}`;
}

/** One line of "Can I train here tonight?": `ok` null means unknown (ask the gym). */
export type CheckItem = { ok: boolean | null; strong: string; rest?: string };

/** What a visitor needs to know before turning up, from the school's pricing, amenities and next class. */
export function visitChecklist(school: Pick<SchoolPage, 'pricing' | 'amenities'>, next: NextClass | null): CheckItem[] {
  const p = school.pricing;
  const a = school.amenities;
  const items: CheckItem[] = [];
  items.push(p?.visitorsWelcome ? { ok: true, strong: 'Visitors welcome' } : { ok: false, strong: 'Members only', rest: ': ask before you visit' });

  if (p?.dropInFee != null) {
    items.push({
      ok: true,
      strong: p.dropInFee === 0 ? 'Free drop-in' : `${money(p.dropInFee, p.currency)} drop-in`,
      rest: p.freeTrial && p.dropInFee !== 0 ? ', or your first class free' : undefined,
    });
  } else if (p?.freeTrial) {
    items.push({ ok: true, strong: 'First class free' });
  } else {
    items.push({ ok: null, strong: 'Drop-in price not listed', rest: ': ask the gym' });
  }

  if (next && next.daysAhead === 0) {
    const when = toMinutes(next.session.start) >= 17 * 60 ? 'tonight' : 'today';
    const what = `${when}'s ${classTypeLabel(next.session.classType).toLowerCase()}`;
    const style = next.session.style;
    items.push(
      style === 'both'
        ? { ok: true, strong: 'Gi or No-Gi', rest: `: ${what} is both` }
        : { ok: true, strong: styleLabel(style), rest: `: ${what} is ${style === 'gi' ? 'in the gi' : 'no-gi'}` },
    );
    if (style !== 'nogi' && a) {
      items.push(a.giRental ? { ok: true, strong: 'Gi rental', rest: " if you didn't bring one" } : { ok: false, strong: 'No gi rental', rest: ': bring your own' });
    }
  }

  const extras = [a?.showers && 'showers', a?.parking && 'parking'].filter(Boolean) as string[];
  if (extras.length) {
    const [first, ...rest] = extras;
    items.push({ ok: true, strong: first[0].toUpperCase() + first.slice(1), rest: rest.length ? ` and ${rest.join(' and ')}` : undefined });
  }
  return items;
}
