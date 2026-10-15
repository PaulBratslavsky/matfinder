import type { Core } from '@strapi/strapi';
import { findDuplicates, type ExistingGym } from '../domain/duplicates';
import { ToolError } from '../domain/errors';

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

/** Gyms an agent found on the web: duplicate checks, adding them as drafts with their sources, and the review list. */
export default ({ strapi }: { strapi: Core.Strapi }) => {
  async function cityOrThrow(slug: string) {
    const city = await docs(strapi, CITY).findFirst({ filters: { slug }, fields: ['slug', 'name', 'center'] });
    if (!city) throw new ToolError('NOT_FOUND', `No city with the slug "${slug}". list_reference_data lists the cities.`, { citySlug: slug });
    return city;
  }

  /** Every gym in a city (draft versions), as duplicate-check signals. */
  async function cityGyms(citySlug: string): Promise<ExistingGym[]> {
    const rows = await docs(strapi, SCHOOL).findMany({
      status: 'draft',
      filters: { city: { slug: citySlug } },
      fields: ['slug', 'name', 'location'],
      populate: { contact: true },
      limit: 2000,
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
    }));
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

  async function possibleDuplicates(q: DuplicateQuery) {
    const city = await cityOrThrow(q.citySlug);
    const at = await locate(q, city.center);
    const candidates = findDuplicates({ ...q, latitude: at?.latitude, longitude: at?.longitude }, await cityGyms(q.citySlug));
    return { candidates, distanceChecked: !!at, at };
  }

  /** documentIds of gyms with a published version. */
  async function publishedIds(ids: string[]): Promise<Set<string>> {
    if (!ids.length) return new Set();
    const rows = await docs(strapi, SCHOOL).findMany({ status: 'published', filters: { documentId: { $in: ids } }, fields: ['slug'], limit: ids.length });
    return new Set(rows.map((r: any) => r.documentId));
  }

  return {
    async findPossibleDuplicates(q: DuplicateQuery) {
      const { candidates, distanceChecked } = await possibleDuplicates(q);
      return { candidates, distanceChecked };
    },

    /**
     * Adds a gym found on the web as a DRAFT with its sources. Refuses a likely duplicate (DUPLICATE_SUSPECTED, with the
     * candidates) unless the agent confirms it's a different gym.
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
      return strapi.db.transaction(async () => {
        const created = await schools(strapi).upsertDraft({
          name: input.name,
          citySlug: input.citySlug,
          address: input.address,
          // Geocoded once above; passing the coordinates saves upsertDraft a second lookup.
          ...(at ? { latitude: at.latitude, longitude: at.longitude } : {}),
          ...(input.shortDescription ? { shortDescription: input.shortDescription } : {}),
          ...(Object.keys(contact).length ? { contact } : {}),
        });
        await docs(strapi, SCHOOL).update({
          documentId: created.documentId,
          data: { origin: 'web-agent', sourceUrls, discoveredAt: new Date().toISOString() },
        });
        return { documentId: created.documentId, slug: created.slug, status: created.status, sourceUrls };
      });
    },

    /** Drafts the agent added that were never published: the From the web tab and the widget count. */
    async listFromWeb() {
      const rows = await docs(strapi, SCHOOL).findMany({
        status: 'draft',
        filters: { origin: 'web-agent' },
        fields: ['slug', 'name', 'neighborhood', 'sourceUrls', 'discoveredAt', 'location'],
        populate: { city: { fields: ['slug', 'name'] }, contact: true },
        sort: 'discoveredAt:desc',
        limit: 500,
      });
      const published = await publishedIds(rows.map((r: any) => r.documentId));
      const waiting = rows.filter((r: any) => !published.has(r.documentId));
      const byCity = new Map<string, ExistingGym[]>();
      const items = [];
      for (const r of waiting) {
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
          possibleDuplicates: dups.map((d) => ({ slug: d.slug, name: d.name, reasons: d.reasons })),
        });
      }
      return { items, total: items.length };
    },

    /** origin per documentId, for the Gyms table. */
    async origins(ids: string[]): Promise<Record<string, string>> {
      if (!ids.length) return {};
      const rows = await docs(strapi, SCHOOL).findMany({ status: 'draft', filters: { documentId: { $in: ids } }, fields: ['origin'], limit: ids.length });
      return Object.fromEntries(rows.map((r: any) => [r.documentId, r.origin ?? 'manual']));
    },
  };
};
