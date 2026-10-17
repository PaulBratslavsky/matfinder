import type { Core } from '@strapi/strapi';

type Status = 'any' | 'published' | 'unpublished-changes' | 'never-published';

/** The app's school service, which owns the content model (server/src/api/school). */
const schools = (strapi: Core.Strapi) => strapi.service('api::school.school') as any;

/** Gyms for the admin page and widgets, read through the app's school service (drafts, with their publish status). */
export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async list(query: { search?: string; status?: Status; page?: number; limit?: number }) {
    const page = await schools(strapi).findSchools({
      search: query.search?.trim() || undefined,
      status: query.status ?? 'any',
      page: query.page ?? 1,
      limit: query.limit ?? 25,
    });
    const ids = page.items.map((g: any) => g.documentId);
    // Where each gym came from (added by hand, or by the web agent), and who claimed it.
    const [origins, claims] = await Promise.all([
      strapi.plugin('matfinder').service('discovery').origins(ids),
      strapi.plugin('matfinder').service('claims').byGym(ids),
    ]);
    return {
      ...page,
      items: page.items.map((g: any) => ({
        ...g,
        origin: origins[g.documentId] ?? 'manual',
        claim: claims[g.documentId] ?? { owner: null, ownerClaim: null, open: 0 },
      })),
    };
  },

  /** Directory totals for the homepage widget. Each count is one status-filtered query; the directory is small. */
  async summary() {
    const count = async (status: Status) => (await schools(strapi).findSchools({ status, limit: 1 })).total as number;
    const [total, published, unpublishedChanges, neverPublished, fromWeb] = await Promise.all([
      count('any'),
      count('published'),
      count('unpublished-changes'),
      count('never-published'),
      strapi.plugin('matfinder').service('discovery').listFromWeb().then((r: { total: number }) => r.total),
    ]);
    const claims = await strapi.plugin('matfinder').service('claims').summary();
    return { gyms: { total, published, unpublishedChanges, neverPublished, fromWeb, claimed: claims.claimed }, claims };
  },
});
