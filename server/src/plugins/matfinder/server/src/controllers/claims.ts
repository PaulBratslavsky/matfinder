import type { Core } from '@strapi/strapi';
import { reply } from '../domain/result';
import type { ClaimAction, ClaimStatus } from '../domain/claims';

const STATUSES: ClaimStatus[] = ['pending', 'contacted', 'accepted', 'rejected', 'withdrawn'];

/** Admin API: the claims board and its actions (the admin user is recorded as handledBy). */
export default ({ strapi }: { strapi: Core.Strapi }) => {
  const service = () => strapi.plugin('matfinder').service('claims');
  const act = (action: ClaimAction) => async (ctx) => {
    const note = typeof ctx.request.body?.note === 'string' ? ctx.request.body.note : undefined;
    reply(ctx, await service().act(ctx.params.documentId, action, { note, admin: ctx.state.user }));
  };

  return {
    async find(ctx) {
      const status = ctx.query.status as ClaimStatus | undefined;
      if (status && !STATUSES.includes(status)) return ctx.badRequest(`status must be one of ${STATUSES.join(', ')}`);
      ctx.body = await service().list(status);
    },
    contacted: act('contacted'),
    accept: act('accept'),
    reject: act('reject'),
    removeOwner: act('remove-owner'),
  };
};
