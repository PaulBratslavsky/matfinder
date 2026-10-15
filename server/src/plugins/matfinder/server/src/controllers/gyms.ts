import type { Core } from '@strapi/strapi';

const STATUSES = ['any', 'published', 'unpublished-changes', 'never-published'] as const;
const toInt = (v: unknown, fallback: number) => (Number.isFinite(Number(v)) ? Math.trunc(Number(v)) : fallback);

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async find(ctx) {
    const { search, status, page, limit } = ctx.query as Record<string, string | undefined>;
    if (status && !STATUSES.includes(status as (typeof STATUSES)[number])) return ctx.badRequest(`status must be one of ${STATUSES.join(', ')}`);
    ctx.body = await strapi
      .plugin('matfinder')
      .service('gyms')
      .list({
        search: typeof search === 'string' ? search : undefined,
        status: status as (typeof STATUSES)[number] | undefined,
        page: toInt(page, 1),
        limit: Math.min(Math.max(toInt(limit, 25), 1), 50),
      });
  },

  async summary(ctx) {
    ctx.body = await strapi.plugin('matfinder').service('gyms').summary();
  },

  /** Every gym the web agent added, with whether it's live. */
  async fromWeb(ctx) {
    ctx.body = await strapi.plugin('matfinder').service('discovery').listFromWeb();
  },
});
