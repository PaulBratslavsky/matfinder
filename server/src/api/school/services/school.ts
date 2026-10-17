/**
 * school service: the directory and school-page reads behind the REST gate, and the draft writes the MCP tools
 * (M5) and the seed (M8) call. Controllers and tools stay thin; the rules live here.
 */

import { factories } from '@strapi/strapi';
import type { Core } from '@strapi/strapi';
import { blocksToText, textToBlocks } from '../../../lib/blocks';
import { draftStatus, pendingDrafts, type DraftStatus, type PendingDraft } from '../../../lib/drafts';
import { isUniqueViolation, ToolError } from '../../../lib/errors';
import { geocodeAddress, type MapBoxValue } from '../../../lib/geocode';
import { normalizeInstagram, normalizeWebsite } from '../../../document-middlewares/normalize-contact';
import { slugifyWithFallback } from '../../../lib/slugify';
import { statusOf } from '../../../lib/upsert';
import { cityNow, toHHmm, toMinutes, toStoredTime, WEEKDAYS, type Weekday } from '../../../lib/time';
import { hasCoords, nextSessionToday, num, toDirectoryItem, toTodaySessions, deriveStyles, derivePrograms, type Session } from '../../../lib/directory';
import { sameJson } from '../../../lib/equal';

// The derived fields (the spec's *Time rules*) and the directory item live in lib/directory.ts, free of Strapi.
export { deriveStyles, derivePrograms, nextSessionToday, toTodaySessions } from '../../../lib/directory';
export type { ApiSession } from '../../../lib/directory';

const SCHOOL = 'api::school.school';
const CITY = 'api::city.city';
const AFFILIATION = 'api::affiliation.affiliation';
const INSTRUCTOR = 'api::instructor.instructor';

const MEDIA_FIELDS = ['url', 'alternativeText', 'width', 'height', 'formats'];
const MAX_SESSIONS = 100;

// ---- Shaping ----

const media = (m: any) =>
  m ? { url: m.url, alternativeText: m.alternativeText ?? null, width: m.width ?? null, height: m.height ?? null, formats: m.formats ?? null } : null;

function withoutIds<T>(value: T): T {
  if (Array.isArray(value)) return value.map(withoutIds) as T;
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).filter(([k]) => k !== 'id').map(([k, v]) => [k, withoutIds(v)])) as T;
  }
  return value;
}

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
  /** Gyms with an accepted owner claim (the MatFinder plugin); none when the plugin isn't loaded. */
  const claimedSchoolIds = async (): Promise<Set<string>> =>
    ((await (strapi.plugin('matfinder')?.service('claims') as any)?.claimedSchoolIds()) as Set<string> | undefined) ?? new Set<string>();

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

  async function bySlugOrThrow(uid: string, slug: string, what: string) {
    const doc = await docs(uid).findFirst({ filters: { slug }, status: uid === CITY ? undefined : 'draft', fields: ['slug'] });
    if (!doc) throw new ToolError('NOT_FOUND', `No ${what} with slug "${slug}"`, { type: what, slug });
    return doc;
  }

  /**
   * An address without coordinates is geocoded with Mapbox, biased to the school's city center (the agent is never
   * trusted to invent coordinates). Runs before the transaction so a network call never holds one open.
   */
  async function geocodeIfNeeded(input: UpsertSchoolInput): Promise<MapBoxValue | undefined> {
    if (!input.address || input.latitude !== undefined || input.longitude !== undefined) return undefined;
    const citySlug =
      input.citySlug ||
      (input.slug
        ? (await docs(SCHOOL).findFirst({ filters: { slug: input.slug }, status: 'draft', populate: { city: { fields: ['slug'] } } }))?.city?.slug
        : undefined);
    const city = citySlug ? await docs(CITY).findFirst({ filters: { slug: citySlug }, fields: ['center'] }) : null;
    return geocodeAddress(input.address, city?.center);
  }

  /** The `map-box` location from the given coordinates, or the geocoded address. */
  function resolveLocation(input: UpsertSchoolInput, before: MapBoxValue | undefined, geocoded: MapBoxValue | undefined): MapBoxValue {
    const hasLat = input.latitude !== undefined;
    const hasLng = input.longitude !== undefined;
    if (hasLat !== hasLng) throw invalid('send latitude and longitude together', [hasLat ? 'longitude' : 'latitude']);
    if (hasLat) {
      if (!(Math.abs(input.latitude!) <= 90)) throw invalid('must be between -90 and 90', ['latitude']);
      if (!(Math.abs(input.longitude!) <= 180)) throw invalid('must be between -180 and 180', ['longitude']);
      const address = input.address ?? before?.address ?? '';
      return { longitude: input.longitude!, latitude: input.latitude!, address, zoom: before?.zoom ?? 15, pitch: before?.pitch ?? 0, bearing: before?.bearing ?? 0 };
    }
    if (!geocoded) throw invalid('send an address (the server geocodes it) or latitude and longitude', ['address']);
    return geocoded;
  }

  async function upsertOnce(input: UpsertSchoolInput, geocoded: MapBoxValue | undefined): Promise<UpsertSchoolResult> {
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
      if (sameJson(value, before)) return;
      data[field] = value;
      changedFields.push(field);
    };

    for (const field of ['name', 'shortDescription', 'neighborhood', 'postalCode', 'lastVerifiedAt'] as const) {
      if (input[field] !== undefined) write(field, input[field], existing?.[field]);
    }
    if (input.descriptionText !== undefined) {
      write('description', input.descriptionText ? textToBlocks(input.descriptionText) : null, existing?.description);
    }
    if (input.citySlug !== undefined) {
      if (!input.citySlug) throw invalid('a school needs a city', ['citySlug']);
      const city = await bySlugOrThrow(CITY, input.citySlug, 'city');
      write('city', city.documentId, existing?.city?.documentId);
    }
    if (input.address !== undefined || input.latitude !== undefined || input.longitude !== undefined) {
      write('location', resolveLocation(input, existing?.location, geocoded), existing?.location);
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
      const merged: Record<string, unknown> = { ...(before ?? {}), ...input[component] };
      // Compare in the form the normalize-contact middleware stores, so `@handle` vs `handle` isn't a change.
      if (component === 'contact') {
        if ('instagram' in merged) merged.instagram = normalizeInstagram(merged.instagram);
        if ('website' in merged) merged.website = normalizeWebsite(merged.website);
      }
      write(component, merged, before);
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
      status: await statusOf(strapi, SCHOOL, doc.documentId),
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
      const claimed = await claimedSchoolIds();
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
        // Each item comes from an explicit field list (lib/directory.ts). A school without coordinates can't be
        // placed on the map, so it's left out.
        schools: schools.filter((s) => hasCoords(s.location)).map((s) => toDirectoryItem(s, now, claimed.has(s.documentId))),
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
      const claimed = (await claimedSchoolIds()).has(s.documentId);
      const now = s.city?.timezone ? cityNow(s.city.timezone) : null;
      const today = now ? toTodaySessions(s.schedule, now) : [];
      const dayIndex = (d: string) => WEEKDAYS.indexOf(d as Weekday);
      const pricing = s.pricing ? withoutIds(s.pricing) : null;
      return {
        documentId: s.documentId,
        slug: s.slug,
        name: s.name,
        claimed,
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
      const geocoded = await geocodeIfNeeded(input);
      const run = () => strapi.db.transaction(() => upsertOnce(input, geocoded));
      try {
        return await run();
      } catch (e) {
        if (isUniqueViolation(e)) return run();
        throw e;
      }
    },

    /**
     * Geocode an address with Mapbox, biased to a point (e.g. the city center). Throws GEOCODE_FAILED. Used by the
     * MatFinder plugin's duplicate check, which can't import the app's lib directly.
     */
    async geocodeAddress(address: string, proximity?: { longitude: number; latitude: number } | null) {
      return geocodeAddress(address, proximity);
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

    /** Cities, affiliations and instructors as names and slugs (the `list_reference_data` tool). Drafts included. */
    async referenceData() {
      const [cities, affiliations, instructors] = await Promise.all([
        docs(CITY).findMany({ fields: ['slug', 'name'], sort: 'name:asc', limit: 1000 }),
        docs(AFFILIATION).findMany({ status: 'draft', fields: ['slug', 'name'], sort: 'name:asc', limit: 1000 }),
        docs(INSTRUCTOR).findMany({ status: 'draft', fields: ['slug', 'name', 'beltRank'], sort: 'name:asc', limit: 1000 }),
      ]);
      return {
        cities: cities.map((c: any) => ({ slug: c.slug, name: c.name })),
        affiliations: affiliations.map((a: any) => ({ slug: a.slug, name: a.name })),
        instructors: instructors.map((i: any) => ({ slug: i.slug, name: i.name, beltRank: i.beltRank })),
      };
    },

    /** Search school drafts with their publish status (the `find_schools` tool). */
    async findSchools(opts: {
      search?: string;
      city?: string;
      status?: 'any' | DraftStatus;
      staleDays?: number;
      page?: number;
      limit?: number;
    }) {
      const page = Math.max(1, Math.trunc(opts.page ?? 1));
      const limit = Math.min(Math.max(Math.trunc(opts.limit ?? 20), 1), 50);
      const and: Record<string, unknown>[] = [];
      if (opts.search) {
        const q = { $containsi: opts.search };
        and.push({ $or: [{ name: q }, { neighborhood: q }, { postalCode: q }] });
      }
      if (opts.city) and.push({ city: { slug: opts.city } });
      if (opts.staleDays !== undefined) {
        const cutoff = new Date(Date.now() - opts.staleDays * 86_400_000).toISOString().slice(0, 10);
        and.push({ $or: [{ lastVerifiedAt: { $null: true } }, { lastVerifiedAt: { $lt: cutoff } }] });
      }
      const drafts: any[] = [];
      for (let start = 0; ; start += 500) {
        const rows = await docs(SCHOOL).findMany({
          status: 'draft',
          filters: and.length ? { $and: and } : {},
          fields: ['slug', 'name', 'neighborhood', 'updatedAt', 'lastVerifiedAt'],
          populate: { city: { fields: ['slug', 'name'] }, affiliation: { fields: ['slug', 'name'] } },
          sort: 'name:asc',
          limit: 500,
          start,
        });
        drafts.push(...rows);
        if (rows.length < 500) break;
      }
      const ids = drafts.map((d) => d.documentId);
      const published: any[] = ids.length
        ? await docs(SCHOOL).findMany({ status: 'published', filters: { documentId: { $in: ids } }, fields: ['updatedAt'], limit: ids.length })
        : [];
      const pub = new Map(published.map((p) => [p.documentId, p]));
      const rows = drafts
        .map((d) => ({
          documentId: d.documentId,
          slug: d.slug,
          name: d.name,
          neighborhood: d.neighborhood ?? null,
          city: d.city ? { slug: d.city.slug, name: d.city.name } : null,
          affiliation: d.affiliation ? { slug: d.affiliation.slug, name: d.affiliation.name } : null,
          status: draftStatus(d, pub.get(d.documentId)),
          updatedAt: new Date(d.updatedAt).toISOString(),
          lastVerifiedAt: d.lastVerifiedAt ?? null,
        }))
        .filter((r) => !opts.status || opts.status === 'any' || r.status === opts.status);
      return {
        items: rows.slice((page - 1) * limit, page * limit),
        page,
        limit,
        total: rows.length,
        hasMore: page * limit < rows.length,
      };
    },

    /** The DRAFT version of a school, relations as names and slugs (the `get_school` tool). */
    async getDraft(slug: string, excerptChars = 600) {
      const s = await docs(SCHOOL).findFirst({
        filters: { slug },
        status: 'draft',
        populate: {
          city: { fields: ['slug', 'name'] },
          affiliation: { fields: ['slug', 'name'] },
          headInstructors: { fields: ['slug', 'name', 'beltRank'] },
          pricing: true,
          contact: true,
          amenities: true,
          schedule: true,
        },
      });
      if (!s) throw new ToolError('NOT_FOUND', `No school with slug "${slug}"`, { type: 'school', slug });
      const text = blocksToText(s.description);
      const truncated = text.length > excerptChars;
      const dayIndex = (d: string) => WEEKDAYS.indexOf(d as Weekday);
      const pricing = s.pricing ? withoutIds(s.pricing) : null;
      return {
        documentId: s.documentId,
        slug: s.slug,
        name: s.name,
        status: await statusOf(strapi, SCHOOL, s.documentId),
        shortDescription: s.shortDescription ?? null,
        descriptionText: truncated ? `${text.slice(0, excerptChars)}…` : text,
        descriptionTruncated: truncated,
        city: s.city ? { slug: s.city.slug, name: s.city.name } : null,
        location: s.location ? { address: s.location.address ?? '', latitude: s.location.latitude, longitude: s.location.longitude } : null,
        neighborhood: s.neighborhood ?? null,
        postalCode: s.postalCode ?? null,
        affiliation: s.affiliation ? { slug: s.affiliation.slug, name: s.affiliation.name } : null,
        headInstructors: (s.headInstructors ?? []).map((i: any) => ({ slug: i.slug, name: i.name, beltRank: i.beltRank })),
        pricing: pricing && { ...pricing, dropInFee: num(pricing.dropInFee), monthlyMin: num(pricing.monthlyMin), monthlyMax: num(pricing.monthlyMax) },
        contact: s.contact ? withoutIds(s.contact) : null,
        amenities: s.amenities ? withoutIds(s.amenities) : null,
        schedule: [...(s.schedule ?? [])]
          .sort((a: Session, b: Session) => dayIndex(a.day) - dayIndex(b.day) || toMinutes(a.startTime)! - toMinutes(b.startTime)!)
          .map((x: Session) => ({ day: x.day, start: toHHmm(x.startTime), end: toHHmm(x.endTime), classType: x.classType, style: x.style, notes: x.notes ?? null })),
        lastVerifiedAt: s.lastVerifiedAt ?? null,
        updatedAt: new Date(s.updatedAt).toISOString(),
      };
    },
  };
});
