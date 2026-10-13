/**
 * What the Explore sheet and map show about a school's day, in the city's local time: on now, starting soon,
 * later today or not today, plus the pin tag and sort order.
 */
import type { DirectorySchool, Session } from './api/schools';
import { nextSessionToday, toMinutes, type CityNow } from './time';

/** A class starting within this many minutes is "starting soon". */
export const SOON_MINUTES = 90;

export type SessionState =
  | { kind: 'live'; session: Session; minutesLeft: number; progress: number }
  | { kind: 'upcoming'; session: Session; minutesUntil: number }
  /** Classes today, all over. */
  | { kind: 'done' }
  /** No classes today. */
  | { kind: 'none' };

export function sessionState(today: Session[], now: CityNow): SessionState {
  if (!today.length) return { kind: 'none' };
  const next = nextSessionToday(today, now);
  if (!next) return { kind: 'done' };
  const start = toMinutes(next.start);
  const end = toMinutes(next.end);
  const session: Session = { start: next.start, end: next.end, classType: next.classType, style: next.style };
  if (next.onNow) {
    return { kind: 'live', session, minutesLeft: end - now.minutes, progress: Math.min(1, Math.max(0, (now.minutes - start) / (end - start))) };
  }
  return { kind: 'upcoming', session, minutesUntil: start - now.minutes };
}

/** Classes today that haven't ended (the one on now included): the stripes on a card's rank bar. */
export const sessionsLeftToday = (today: Session[], now: CityNow) => today.filter((s) => toMinutes(s.end) > now.minutes).length;

export type Group = 'live' | 'soon' | 'later' | 'none';

export const GROUPS: { key: Group; label: string }[] = [
  { key: 'live', label: 'On now' },
  { key: 'soon', label: 'Starting soon' },
  { key: 'later', label: 'Later today' },
  { key: 'none', label: 'Not today' },
];

export function groupOf(state: SessionState): Group {
  if (state.kind === 'live') return 'live';
  if (state.kind === 'upcoming') return state.minutesUntil <= SOON_MINUTES ? 'soon' : 'later';
  return 'none';
}

export type SortKey = 'time' | 'distance';

export type ExploreItem = { school: DirectorySchool; state: SessionState; distance: number | null };

const startOf = (s: SessionState) => (s.kind === 'live' || s.kind === 'upcoming' ? toMinutes(s.session.start) : Infinity);
const byDistanceThenName = (a: ExploreItem, b: ExploreItem) =>
  (a.distance ?? Infinity) - (b.distance ?? Infinity) || a.school.name.localeCompare(b.school.name);

/**
 * "Start time": grouped On now → Starting soon → Later today → Not today, earliest first within a group.
 * "Distance": one list, nearest first (by name when the device location isn't known).
 */
export function sortItems(items: ExploreItem[], sort: SortKey): { group: Group | null; items: ExploreItem[] }[] {
  if (sort === 'distance') return items.length ? [{ group: null, items: [...items].sort(byDistanceThenName) }] : [];
  const order = GROUPS.map((g) => g.key);
  const sorted = [...items].sort(
    (a, b) => order.indexOf(groupOf(a.state)) - order.indexOf(groupOf(b.state)) || startOf(a.state) - startOf(b.state) || byDistanceThenName(a, b),
  );
  return order.map((group) => ({ group, items: sorted.filter((i) => groupOf(i.state) === group) })).filter((g) => g.items.length);
}

/** The pin for a school: green-tagged when on now, tagged with the start time when it has a class later, else muted. */
export type PinTone = 'live' | 'today' | 'muted';
export function pinTone(state: SessionState): PinTone {
  return state.kind === 'live' ? 'live' : state.kind === 'upcoming' ? 'today' : 'muted';
}

/** `75` → `1 h 15 min`, `45` → `45 min`, `120` → `2 h`. */
export function formatDuration(minutes: number): string {
  const m = Math.max(0, Math.round(minutes));
  if (m < 60) return `${m} min`;
  return `${Math.floor(m / 60)} h${m % 60 ? ` ${m % 60} min` : ''}`;
}

/** `$25` for USD, `EUR 25` otherwise; whole amounts without decimals. */
export const money = (n: number, currency: string) => `${currency === 'USD' ? '$' : `${currency} `}${Number.isInteger(n) ? n : n.toFixed(2)}`;

/** "$25 drop-in", "Free drop-in", or null when the school hasn't published a fee. */
export function dropInLabel(s: Pick<DirectorySchool, 'dropInFee' | 'currency'>): string | null {
  if (s.dropInFee == null) return null;
  return s.dropInFee === 0 ? 'Free drop-in' : `${money(s.dropInFee, s.currency)} drop-in`;
}

/** `2.4` + `mi` (feet under a tenth of a mile), for the big distance on a card. */
export function distanceParts(miles: number): { value: string; unit: string } {
  return miles < 0.1 ? { value: String(Math.round(miles * 5280)), unit: 'ft' } : { value: miles.toFixed(1), unit: 'mi' };
}

export const formatDistance = (miles: number) => {
  const d = distanceParts(miles);
  return `${d.value} ${d.unit}`;
};
