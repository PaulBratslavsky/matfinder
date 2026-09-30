/**
 * school controller: thin ctx adapters over the school service.
 */

import { factories } from '@strapi/strapi';

export default factories.createCoreController('api::school.school', ({ strapi }) => {
  const service = () => strapi.service('api::school.school') as any;

  return {
    async directory(ctx) {
      const city = ctx.query.city;
      if (typeof city !== 'string' || !city) return ctx.badRequest('The city query parameter is required');
      const data = await service().getDirectory(city);
      if (!data) return ctx.notFound('No city with that slug');
      ctx.set('Cache-Control', 'public, max-age=60');
      ctx.body = { data };
    },

    async bySlug(ctx) {
      const data = await service().getBySlug(ctx.params.slug);
      if (!data) return ctx.notFound('No published school with that slug');
      ctx.body = { data };
    },
  };
});
