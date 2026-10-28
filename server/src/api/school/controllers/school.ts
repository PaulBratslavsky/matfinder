/**
 * school controller: thin ctx adapters over the school service.
 */

import { factories } from '@strapi/strapi';
import { clampRadius, parseCoords } from '../../../lib/radius';

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

    /** `GET /api/schools/nearby?lat&lng&radius`: published gyms within `radius` miles (default 25, 1–100). */
    async nearby(ctx) {
      const center = parseCoords(ctx.query.lat, ctx.query.lng);
      if (!center) return ctx.badRequest('lat and lng are required: latitude -90 to 90, longitude -180 to 180');
      const radius = clampRadius(ctx.query.radius);
      if (radius === null) return ctx.badRequest('radius must be a positive number of miles');
      const data = await service().getNearby(center, radius);
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
