/**
 * Pure shaping for the school endpoints: the spec's *Time rules* derived fields and the public directory item.
 * Kept free of Strapi so the trimming and the time rules can be unit-tested.
 */
import session from '../components/schedule/session.json';
import { toHHmm, toMinutes, type CityNow, type Weekday } from './time';

const CLASS_TYPES: string[] = session.attributes.classType.enum;

export type Session = { day: Weekday; startTime: string; endTime: string; classType: string; style: string; notes?: string | null };
export type ApiSession = { start: string; end: string; classType: string; style: string };

/** Sessions on the city-local weekday, sorted by start, with times as `HH:mm`. */
export function toTodaySessions(schedule: Session[] | null | undefined, now: CityNow): ApiSession[] {
  return (schedule ?? [])
    .filter((s) => s.day === now.weekday)
    .sort((a, b) => toMinutes(a.startTime)! - toMinutes(b.startTime)!)
    .map((s) => ({ start: toHHmm(s.startTime), end: toHHmm(s.endTime), classType: s.classType, style: s.style }));
}

/** The first session today that hasn't ended; `onNow` when it has already started ("On now" in the app). */
export function nextSessionToday(today: ApiSession[], now: CityNow): (ApiSession & { onNow: boolean }) | null {
  const next = today.find((s) => toMinutes(s.end)! > now.minutes);
  return next ? { ...next, onNow: toMinutes(next.start)! <= now.minutes } : null;
}

/** Distinct `gi` / `nogi` from the schedule; a `both` session counts as both. */
export function deriveStyles(schedule: Session[] | null | undefined): ('gi' | 'nogi')[] {
  const styles = new Set((schedule ?? []).flatMap((s) => (s.style === 'both' ? ['gi', 'nogi'] : [s.style])));
  return (['gi', 'nogi'] as const).filter((s) => styles.has(s));
}

/** Distinct class types from the schedule, in the schema's order. */
export function derivePrograms(schedule: Session[] | null | undefined): string[] {
  const types = new Set((schedule ?? []).map((s) => s.classType));
  return CLASS_TYPES.filter((t) => types.has(t));
}

export const num = (v: unknown) => (v === null || v === undefined || v === '' ? null : Number(v));

/** A school can only be placed on the map with coordinates. */
export const hasCoords = (loc: any) => Number.isFinite(loc?.latitude) && Number.isFinite(loc?.longitude);

/** The public directory fields, in order. Anything else on a school (schedule beyond today, instructors, contact…) stays out. */
export const DIRECTORY_FIELDS = [
  'documentId',
  'slug',
  'name',
  'logo',
  'latitude',
  'longitude',
  'neighborhood',
  'postalCode',
  'affiliation',
  'styles',
  'programs',
  'visitorsWelcome',
  'dropInFee',
  'currency',
  'todaySessions',
  'claimed',
] as const;

/**
 * One public directory item, built from an explicit list: the full schedule is read to compute today's sessions,
 * styles and programs, but only today's sessions go out.
 */
export function toDirectoryItem(s: any, now: CityNow, claimed = false) {
  return {
    documentId: s.documentId,
    slug: s.slug,
    name: s.name,
    logo: s.logo ? { url: s.logo.formats?.thumbnail?.url ?? s.logo.url } : null,
    latitude: s.location.latitude,
    longitude: s.location.longitude,
    neighborhood: s.neighborhood ?? null,
    postalCode: s.postalCode ?? null,
    affiliation: s.affiliation?.name ?? null,
    styles: deriveStyles(s.schedule),
    programs: derivePrograms(s.schedule),
    visitorsWelcome: s.pricing?.visitorsWelcome ?? false,
    dropInFee: num(s.pricing?.dropInFee),
    currency: s.pricing?.currency ?? 'USD',
    todaySessions: toTodaySessions(s.schedule, now),
    // An owner's claim was accepted (the MatFinder plugin's claims); who claimed it is never public.
    claimed,
  };
}
