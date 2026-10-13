/**
 * school service: the directory and school-page reads behind the REST gate, and the draft writes the MCP tools
 * (M5) and the seed (M8) call. Controllers and tools stay thin; the rules live here.
 */

import { factories } from '@strapi/strapi';
import type { Core } from '@strapi/strapi';
import session from '../../../components/schedule/session.json';
import { textToBlocks } from '../../../lib/blocks';
import { draftStatus, pendingDrafts, type DraftStatus, type PendingDraft } from '../../../lib/drafts';
import { isUniqueViolation, ToolError } from '../../../lib/errors';
import { slugifyWithFallback } from '../../../lib/slugify';
import { cityNow, toHHmm, toMinutes, toStoredTime, WEEKDAYS, type CityNow, type Weekday } from '../../../lib/time';

const SCHOOL = 'api::school.school';
const CITY = 'api::city.city';
const AFFILIATION = 'api::affiliation.affiliation';
const INSTRUCTOR = 'api::instructor.instructor';

const CLASS_TYPES: string[] = session.attributes.classType.enum;
const MEDIA_FIELDS = ['url', 'alternativeText', 'width', 'height', 'formats'];
const MAX_SESSIONS = 100;

type Session = { day: Weekday; startTime: string; endTime: string; classType: string; style: string; notes?: string | null };
export type ApiSession = { start: string; end: string; classType: string; style: string };

// ---- Derived fields (the spec's *Time rules*) ----

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

// ---- Shaping ----

const num = (v: unknown) => (v === null || v === undefined || v === '' ? null : Number(v));

const media = (m: any) =>
  m ? { url: m.url, alternativeText: m.alternativeText ?? null, width: m.width ?? null, height: m.height ?? null, formats: m.formats ?? null } : null;

function withoutIds<T>(value: T): T {
  if (Array.isArray(value)) return value.map(withoutIds) as T;
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).filter(([k]) => k !== 'id').map(([k, v]) => [k, withoutIds(v)])) as T;
  }
  return value;
}

const hasCoords = (loc: any) => Number.isFinite(loc?.latitude) && Number.isFinite(loc?.longitude);

// ---- Draft-write inputs (the MCP tool contracts) ----

export type UpsertSchoolInput = {
  slug?: string;
  name?: string;
  citySlug?: string;
  shortDescription?: string | null;
  descriptionText?: string | null;
  address?: string;
  latitude?: number;
  longitude?: number;
  neighborhood?: string | null;
  postalCode?: string | null;
  affiliationSlug?: string | null;
  headInstructorSlugs?: string[];
  pricing?: Record<string, unknown>;
  contact?: Record<string, unknown>;
  amenities?: Record<string, unknown>;
  lastVerifiedAt?: string | null;
};

export type UpsertSchoolResult = { documentId: string; slug: string; created: boolean; changedFields: string[]; status: DraftStatus };

export type ScheduleInput = { day: string; start: string; end: string; classType: string; style: string; notes?: string | null };

const PENDING_TYPES = { school: SCHOOL, instructor: INSTRUCTOR, affiliation: AFFILIATION } as const;
export type PendingType = keyof typeof PENDING_TYPES;

const invalid = (message: string, path: (string | number)[]) => new ToolError('VALIDATION_ERROR', message, { path });

export default factories.createCoreService(SCHOOL, ({ strapi }: { strapi: Core.Strapi }) => {
  // The generated types don't know these custom query shapes; the payloads below are built field by field.
  const docs = (uid: string) => strapi.documents(uid as any) as any;

  /** Every published school matching `query`, paged with top-level limit/start. */
  async function findAllPublished(query: Record<string, unknown>) {
    const rows: any[] = [];
    for (let start = 0; ; start += 200) {
      const page = await docs(SCHOOL).findMany({ ...query, status: 'published', limit: 200, start });
      rows.push(...page);
      if (page.length < 200) return rows;
    }
  }

  async function statusOf(uid: string, documentId: string): Promise<DraftStatus> {
    const draft = await docs(uid).findOne({ documentId, status: 'draft', fields: ['updatedAt'] });
    const published = await docs(uid).findOne({ documentId, status: 'published', fields: ['updatedAt'] });
    return draftStatus(draft, published);
  }

  async function bySlugOrThrow(uid: string, slug: string, what: string) {
    const doc = await docs(uid).findFirst({ filters: { slug }, status: uid === CITY ? undefined : 'draft', fields: ['slug'] });
    if (!doc) throw new ToolError('NOT_FOUND', `No ${what} with slug "${slug}"`, { type: what, slug });
    return doc;
  }

  /** Coordinates from the input, or from geocoding the address. Geocoding is wired in M5 (src/lib/geocode.ts). */
  async function resolveCoordinates(input: UpsertSchoolInput): Promise<{ latitude: number; longitude: number }> {
    const hasLat = input.latitude !== undefined;
    const hasLng = input.longitude !== undefined;
    if (hasLat !== hasLng) throw invalid('send latitude and longitude together', [hasLat ? 'longitude' : 'latitude']);
    if (hasLat) {
      if (!(Math.abs(input.latitude!) <= 90)) throw invalid('must be between -90 and 90', ['latitude']);
      if (!(Math.abs(input.longitude!) <= 180)) throw invalid('must be between -180 and 180', ['longitude']);
      return { latitude: input.latitude!, longitude: input.longitude! };
    }
    throw new ToolError('GEOCODE_FAILED', 'Geocoding is not available yet; send latitude and longitude with the address', {
      address: input.address,
    });
  }

  async function upsertOnce(input: UpsertSchoolInput): Promise<UpsertSchoolResult> {
    const slug = input.slug ?? (input.name ? slugifyWithFallback(input.name, 'school') : undefined);
    if (!slug) throw invalid('send the slug of an existing school, or a name to create one', ['name']);

    const existing = await docs(SCHOOL).findFirst({
      filters: { slug },
      status: 'draft',
      populate: {
        city: { fields: ['slug'] },
        affiliation: { fields: ['slug'] },
        headInstructors: { fields: ['slug'] },
        pricing: true,
        contact: true,
        amenities: true,
      },
    });
    if (!existing) {
      // city is required at the service level (relations can't be required in the schema).
      for (const field of ['name', 'citySlug', 'address'] as const) {
        if (!input[field]) throw invalid(`required to create a school`, [field]);
      }
    }

    const data: Record<string, unknown> = {};
    const changedFields: string[] = [];
    const write = (field: string, value: unknown, before: unknown) => {
      if (JSON.stringify(value ?? null) === JSON.stringify(before ?? null)) return;
      data[field] = value;
      changedFields.push(field);
    };

    for (const field of ['name', 'shortDescription', 'neighborhood', 'postalCode', 'lastVerifiedAt'] as const) {
      if (input[field] !== undefined) write(field, input[field], existing?.[field]);
    }
    if (input.descriptionText !== undefined) {
      write('description', input.descriptionText ? textToBlocks(input.descriptionText) : null, existing?.description);
    }
    if (input.address !== undefined || input.latitude !== undefined || input.longitude !== undefined) {
      const { latitude, longitude } = await resolveCoordinates(input);
      const before = existing?.location;
      const address = input.address ?? before?.address ?? '';
      write('location', { longitude, latitude, address, zoom: before?.zoom ?? 15, pitch: before?.pitch ?? 0, bearing: before?.bearing ?? 0 }, before);
    }
    if (input.citySlug !== undefined) {
      if (!input.citySlug) throw invalid('a school needs a city', ['citySlug']);
      const city = await bySlugOrThrow(CITY, input.citySlug, 'city');
      write('city', city.documentId, existing?.city?.documentId);
    }
    if (input.affiliationSlug !== undefined) {
      const affiliation = input.affiliationSlug ? await bySlugOrThrow(AFFILIATION, input.affiliationSlug, 'affiliation') : null;
      write('affiliation', affiliation?.documentId ?? null, existing?.affiliation?.documentId);
    }
    if (input.headInstructorSlugs !== undefined) {
      const ids: string[] = [];
      for (const s of input.headInstructorSlugs) ids.push((await bySlugOrThrow(INSTRUCTOR, s, 'instructor')).documentId);
      write('headInstructors', ids, (existing?.headInstructors ?? []).map((i: any) => i.documentId));
    }
    for (const component of ['pricing', 'contact', 'amenities'] as const) {
      if (input[component] === undefined) continue;
      const before = existing?.[component] ? withoutIds(existing[component]) : null;
      write(component, { ...(before ?? {}), ...input[component] }, before);
    }

    const doc = existing
      ? changedFields.length
        ? await docs(SCHOOL).update({ documentId: existing.documentId, data })
        : existing
      : await docs(SCHOOL).create({ data: { ...data, slug } });
    return {
      documentId: doc.documentId,
      slug: doc.slug,
      created: !existing,
      changedFields,
      status: await statusOf(SCHOOL, doc.documentId),
    };
  }

  return {
    /** Public map payload: published schools in the city, trimmed to preview fields (see *API surface*). */
    async getDirectory(citySlug: string) {
      const city = await docs(CITY).findFirst({
        filters: { slug: citySlug },
        fields: ['slug', 'name', 'timezone', 'center', 'defaultZoom'],
      });
      if (!city) return null;
      const now = cityNow(city.timezone);
      const schools = await findAllPublished({
        filters: { city: { slug: citySlug } },
        fields: ['slug', 'name', 'location', 'neighborhood', 'postalCode'],
        populate: {
          logo: { fields: ['url', 'formats'] },
          affiliation: { fields: ['name'] },
          pricing: { fields: ['visitorsWelcome', 'dropInFee', 'currency'] },
          schedule: { fields: ['day', 'startTime', 'endTime', 'classType', 'style'] },
        },
        sort: 'name:asc',
      });
      return {
        city: {
          slug: city.slug,
          name: city.name,
          timezone: city.timezone,
          center: { latitude: city.center?.latitude ?? null, longitude: city.center?.longitude ?? null },
          defaultZoom: num(city.defaultZoom),
        },
        localDate: now.localDate,
        weekday: now.weekday,
        generatedAt: new Date().toISOString(),
        // Built from an explicit list: the schedule is loaded to compute today's sessions, but only those go out.
        // A school without coordinates can't be placed on the map, so it's left out.
        schools: schools.filter((s) => hasCoords(s.location)).map((s) => ({
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
        })),
      };
    },

    /** Full published school page (account-only), or null when there's no published school with that slug. */
    async getBySlug(slug: string) {
      const s = await docs(SCHOOL).findFirst({
        filters: { slug },
        status: 'published',
        populate: {
          city: { fields: ['slug', 'name', 'timezone'] },
          logo: { fields: MEDIA_FIELDS },
          gallery: { fields: MEDIA_FIELDS },
          affiliation: { fields: ['name', 'slug', 'website'], populate: { logo: { fields: MEDIA_FIELDS } } },
          headInstructors: { fields: ['name', 'slug', 'beltRank', 'degree', 'bio'], populate: { photo: { fields: MEDIA_FIELDS } } },
          pricing: true,
          contact: true,
          amenities: true,
          schedule: true,
        },
      });
      if (!s) return null;
      const now = s.city?.timezone ? cityNow(s.city.timezone) : null;
      const today = now ? toTodaySessions(s.schedule, now) : [];
      const dayIndex = (d: string) => WEEKDAYS.indexOf(d as Weekday);
      const pricing = s.pricing ? withoutIds(s.pricing) : null;
      return {
        documentId: s.documentId,
        slug: s.slug,
        name: s.name,
        shortDescription: s.shortDescription ?? null,
        description: s.description ?? null,
        city: s.city ? { slug: s.city.slug, name: s.city.name, timezone: s.city.timezone } : null,
        location: s.location,
        neighborhood: s.neighborhood ?? null,
        postalCode: s.postalCode ?? null,
        logo: media(s.logo),
        gallery: (s.gallery ?? []).map(media),
        affiliation: s.affiliation
          ? { name: s.affiliation.name, slug: s.affiliation.slug, website: s.affiliation.website ?? null, logo: media(s.affiliation.logo) }
          : null,
        headInstructors: (s.headInstructors ?? []).map((i: any) => ({
          name: i.name,
          slug: i.slug,
          beltRank: i.beltRank,
          degree: i.degree ?? null,
          photo: media(i.photo),
          bio: i.bio ?? null,
        })),
        pricing: pricing && {
          ...pricing,
          dropInFee: num(pricing.dropInFee),
          monthlyMin: num(pricing.monthlyMin),
          monthlyMax: num(pricing.monthlyMax),
        },
        contact: s.contact ? withoutIds(s.contact) : null,
        amenities: s.amenities ? withoutIds(s.amenities) : null,
        schedule: [...(s.schedule ?? [])]
          .sort((a: Session, b: Session) => dayIndex(a.day) - dayIndex(b.day) || toMinutes(a.startTime)! - toMinutes(b.startTime)!)
          .map((x: Session) => ({
            day: x.day,
            start: toHHmm(x.startTime),
            end: toHHmm(x.endTime),
            classType: x.classType,
            style: x.style,
            notes: x.notes ?? null,
          })),
        styles: deriveStyles(s.schedule),
        programs: derivePrograms(s.schedule),
        todaySessions: today,
        nextSessionToday: now ? nextSessionToday(today, now) : null,
        lastVerifiedAt: s.lastVerifiedAt ?? null,
      };
    },

    /**
     * Create or partially update a school DRAFT (the `upsert_school` tool). Only provided fields are written;
     * components merge per field; `headInstructorSlugs` replaces the ordered list. Create, catch, refetch: if a
     * concurrent create wins the slug, the retry finds that document by slug and updates it instead.
     */
    async upsertDraft(input: UpsertSchoolInput): Promise<UpsertSchoolResult> {
      const run = () => strapi.db.transaction(() => upsertOnce(input));
      try {
        return await run();
      } catch (e) {
        if (isUniqueViolation(e)) return run();
        throw e;
      }
    },

    /** Replace the whole weekly schedule on a school DRAFT (the `set_school_schedule` tool). */
    async setScheduleDraft(slug: string, sessions: ScheduleInput[]) {
      if (!Array.isArray(sessions)) throw invalid('must be a list of sessions', ['sessions']);
      if (sessions.length > MAX_SESSIONS) throw invalid(`at most ${MAX_SESSIONS} sessions`, ['sessions']);
      const rows = sessions.map((s, i) => {
        const startTime = toStoredTime(s.start);
        if (!startTime) throw invalid('must be HH:mm', ['sessions', i, 'start']);
        const endTime = toStoredTime(s.end);
        if (!endTime) throw invalid('must be HH:mm', ['sessions', i, 'end']);
        return { day: s.day, startTime, endTime, classType: s.classType, style: s.style, notes: s.notes ?? null };
      });
      return strapi.db.transaction(async () => {
        const school = await bySlugOrThrow(SCHOOL, slug, 'school');
        // The schedule-validate middleware checks enums and end > start.
        await docs(SCHOOL).update({ documentId: school.documentId, data: { schedule: rows } });
        const byDay = Object.fromEntries(WEEKDAYS.map((d) => [d, rows.filter((r) => r.day === d).length]));
        return { slug, sessionCount: rows.length, byDay };
      });
    },

    /** Never-published documents and documents with unpublished changes (the `list_pending_drafts` tool). */
    async listPendingDrafts(opts: { type?: PendingType; limit?: number } = {}) {
      const limit = Math.min(Math.max(Math.trunc(opts.limit ?? 25), 1), 100);
      if (opts.type && !(opts.type in PENDING_TYPES)) throw invalid('must be school, instructor or affiliation', ['type']);
      const types = opts.type ? [opts.type] : (Object.keys(PENDING_TYPES) as PendingType[]);
      const perType = await Promise.all(
        types.map(async (type) => (await pendingDrafts(strapi, PENDING_TYPES[type], limit)).map((d: PendingDraft) => ({ type, ...d }))),
      );
      return perType
        .flat()
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
        .slice(0, limit);
    },
  };
});
