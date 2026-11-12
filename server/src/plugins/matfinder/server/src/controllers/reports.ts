import type { Core } from '@strapi/strapi';
import { reply } from '../domain/result';
import type { ReportStatus } from '../domain/reports';

const STATUSES: ReportStatus[] = ['open', 'resolved'];

/** Admin API: the problem-report board and its one action. */
export default ({ strapi }: { strapi: Core.Strapi }) => {
  const service = () => strapi.plugin('matfinder').service('reports');
  return {
    async find(ctx) {
      const status = ctx.query.status as ReportStatus | undefined;
      if (status && !STATUSES.includes(status)) return ctx.badRequest(`status must be one of ${STATUSES.join(', ')}`);
      ctx.body = await service().list(status);
    },
    async resolve(ctx) {
      const note = typeof ctx.request.body?.note === 'string' ? ctx.request.body.note : undefined;
      reply(ctx, await service().resolve(ctx.params.documentId, { note, admin: ctx.state.user }));
    },
  };
};
