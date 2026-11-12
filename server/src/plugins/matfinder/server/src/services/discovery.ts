import type { Core } from '@strapi/strapi';
import { findDuplicates, type ExistingGym } from '../domain/duplicates';
import { ToolError } from '../domain/errors';
import { draftStatus } from '../domain/status';

const SCHOOL = 'api::school.school';
const CITY = 'api::city.city';

type Located = { latitude: number; longitude: number } | null;

export type DuplicateQuery = {
  citySlug: string;
  name: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  phone?: string;
  website?: string;
  instagram?: string;
};

export type WebGymInput = DuplicateQuery & {
  address: string;
  sourceUrls: string[];
  email?: string;
  shortDescription?: string;
  confirmNotDuplicate?: boolean;
};

const docs = (strapi: Core.Strapi, uid: string) => strapi.documents(uid as any) as any;
const schools = (strapi: Core.Strapi) => strapi.service('api::school.school') as any;

/** Gyms an agent found on the web: duplicate checks, adding them with their sources, and the admin's list of them. */
export default ({ strapi }: { strapi: Core.Strapi }) => {
  async function cityOrThrow(slug: string) {
    const city = await docs(strapi, CITY).findFirst({ filters: { slug }, fields: ['slug', 'name', 'center'] });
    if (!city) throw new ToolError('NOT_FOUND', `No city with the slug "${slug}". list_reference_data lists the cities.`, { citySlug: slug });
    return city;
  }

  type GymWithCity = ExistingGym & { citySlug: string | null };

  /** Every gym (draft versions) with its city, as duplicate-check signals. */
  async function allGyms(): Promise<GymWithCity[]> {
    const rows = await docs(strapi, SCHOOL).findMany({
      status: 'draft',
      fields: ['slug', 'name', 'location'],
      populate: { contact: true, city: { fields: ['slug'] } },
      limit: 10000,
    });
    return rows.map((r: any) => ({
      documentId: r.documentId,
      slug: r.slug,
      name: r.name,
      phone: r.contact?.phone,
      website: r.contact?.website,
      instagram: r.contact?.instagram,
      latitude: r.location?.latitude,
      longitude: r.location?.longitude,
      citySlug: r.city?.slug ?? null,
    }));
  }

  /** Every gym in a city (draft versions), as duplicate-check signals. */
  async function cityGyms(citySlug: string): Promise<ExistingGym[]> {
    return (await allGyms()).filter((g) => g.citySlug === citySlug);
  }

  /** Coordinates for the distance check: the ones given, else a geocode of the address; null if neither works. */
  async function locate(q: DuplicateQuery, center?: { longitude: number; latitude: number } | null): Promise<Located> {
    if (Number.isFinite(q.latitude) && Number.isFinite(q.longitude)) return { latitude: q.latitude!, longitude: q.longitude! };
    if (!q.address) return null;
    try {
      // The app's Mapbox geocoding, the same lookup upsert_school uses.
      const g = await schools(strapi).geocodeAddress(q.address, center);
      return { latitude: g.latitude, longitude: g.longitude };
    } catch {
      return null;
    }
  }

  /**
   * Same city: every signal. Other cities: phone, website, Instagram and distance only, since chains share names
   * across cities (and add_gym_from_web never overwrites, so a shared name is harmless).
   */
  async function possibleDuplicates(q: DuplicateQuery) {
    const city = await cityOrThrow(q.citySlug);
    const at = await locate(q, city.center);
    const signals = { ...q, latitude: at?.latitude, longitude: at?.longitude };
    const gyms = await allGyms();
    const sameCity = findDuplicates(signals, gyms.filter((g) => g.citySlug === q.citySlug));
    const cityOf = new Map(gyms.map((g) => [g.documentId, g.citySlug]));
    const elsewhere = findDuplicates(signals, gyms.filter((g) => g.citySlug !== q.citySlug), { names: false }).map((d) => ({
      ...d,
      reasons: [...d.reasons, `in another city (${cityOf.get(d.documentId) ?? 'none'})`],
    }));
    const candidates = [...sameCity, ...elsewhere].sort((a, b) => b.reasons.length - a.reasons.length || a.name.localeCompare(b.name));
    return { candidates, distanceChecked: !!at, at };
  }

  /** The published version's updatedAt per documentId (gyms without one are missing). */
  async function publishedAt(ids: string[]): Promise<Map<string, string>> {
    if (!ids.length) return new Map();
    const rows = await docs(strapi, SCHOOL).findMany({ status: 'published', filters: { documentId: { $in: ids } }, fields: ['updatedAt'], limit: ids.length });
    return new Map(rows.map((r: any) => [r.documentId, r.updatedAt]));
  }

  return {
    async findPossibleDuplicates(q: DuplicateQuery) {
      const { candidates, distanceChecked } = await possibleDuplicates(q);
      return { candidates, distanceChecked };
    },

    /**
     * Adds a NEW gym found on the web with its sources (never updates an existing one; a taken name gets a free slug
     * such as `name-city`). Refuses a likely duplicate (DUPLICATE_SUSPECTED, with the candidates) unless the agent
     * confirms it's a different gym.
     */
    async addGymFromWeb(input: WebGymInput) {
      const { candidates, at } = await possibleDuplicates(input);
      if (candidates.length && !input.confirmNotDuplicate) {
        throw new ToolError(
          'DUPLICATE_SUSPECTED',
          "This looks like a gym that's already listed. Check the candidates with get_school_draft; if it's really a different gym, call again with confirmNotDuplicate: true.",
          { candidates },
        );
      }
      const sourceUrls = [...new Set(input.sourceUrls.map((u) => u.trim()))];
      const contact = Object.fromEntries(
        Object.entries({ phone: input.phone, website: input.website, instagram: input.instagram, email: input.email }).filter(([, v]) => v),
      );
      // Always a new gym (never an update of a same-named one), with its provenance in the same write.
      const created = await schools(strapi).createDraft(
        {
          name: input.name,
          citySlug: input.citySlug,
          address: input.address,
          // Geocoded once above; passing the coordinates saves createDraft a second lookup.
          ...(at ? { latitude: at.latitude, longitude: at.longitude } : {}),
          ...(input.shortDescription ? { shortDescription: input.shortDescription } : {}),
          ...(Object.keys(contact).length ? { contact } : {}),
        },
        { origin: 'web-agent', sourceUrls, discoveredAt: new Date().toISOString() },
      );
      return { documentId: created.documentId, slug: created.slug, sourceUrls };
    },

    /**
     * Every gym the agent added, newest first, with whether it's live: the From the web tab. `notLive` (the tab's badge)
     * counts the ones that aren't published, `thisWeek` (the widget) the ones added in the last 7 days.
     */
    async listFromWeb() {
      const rows = await docs(strapi, SCHOOL).findMany({
        status: 'draft',
        filters: { origin: 'web-agent' },
        fields: ['slug', 'name', 'neighborhood', 'sourceUrls', 'discoveredAt', 'location', 'updatedAt'],
        populate: { city: { fields: ['slug', 'name'] }, contact: true },
        sort: 'discoveredAt:desc',
        limit: 500,
      });
      const published = await publishedAt(rows.map((r: any) => r.documentId));
      const byCity = new Map<string, ExistingGym[]>();
      const items = [];
      for (const r of rows) {
        const citySlug = r.city?.slug;
        if (citySlug && !byCity.has(citySlug)) byCity.set(citySlug, await cityGyms(citySlug));
        const others = (byCity.get(citySlug) ?? []).filter((g) => g.documentId !== r.documentId);
        const dups = findDuplicates(
          { name: r.name, phone: r.contact?.phone, website: r.contact?.website, instagram: r.contact?.instagram, latitude: r.location?.latitude, longitude: r.location?.longitude },
          others,
        );
        items.push({
          documentId: r.documentId,
          slug: r.slug,
          name: r.name,
          neighborhood: r.neighborhood ?? null,
          city: r.city ? { slug: r.city.slug, name: r.city.name } : null,
          sourceUrls: Array.isArray(r.sourceUrls) ? r.sourceUrls : [],
          discoveredAt: r.discoveredAt ?? null,
          status: draftStatus(r, published.has(r.documentId) ? { updatedAt: published.get(r.documentId)! } : null),
          possibleDuplicates: dups.map((d) => ({ slug: d.slug, name: d.name, reasons: d.reasons })),
        });
      }
      const weekAgo = Date.now() - 7 * 24 * 3600_000;
      return {
        items,
        total: items.length,
        notLive: items.filter((g) => g.status !== 'published').length,
        thisWeek: items.filter((g) => g.discoveredAt && new Date(g.discoveredAt).getTime() >= weekAgo).length,
      };
    },

    /** origin per documentId, for the Gyms table. */
    async origins(ids: string[]): Promise<Record<string, string>> {
      if (!ids.length) return {};
      const rows = await docs(strapi, SCHOOL).findMany({ status: 'draft', filters: { documentId: { $in: ids } }, fields: ['origin'], limit: ids.length });
      return Object.fromEntries(rows.map((r: any) => [r.documentId, r.origin ?? 'manual']));
    },
  };
};
