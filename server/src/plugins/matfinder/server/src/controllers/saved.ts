import type { Core } from '@strapi/strapi';
import { reply } from '../domain/result';

const userOf = (ctx: any) => ctx.state.user ?? ctx.state.auth?.credentials?.user ?? null;

/** Content API (the app): the signed-in user's saved gyms. */
export default ({ strapi }: { strapi: Core.Strapi }) => {
  const service = () => strapi.plugin('matfinder').service('saved');
  const withUser = (fn: (ctx: any, user: any) => Promise<void>) => async (ctx: any) => {
    const user = userOf(ctx);
    if (!user?.documentId) return ctx.unauthorized('Sign in to save gyms');
    await fn(ctx, user);
  };
  return {
    find: withUser(async (ctx, user) => {
      ctx.body = await service().list(user);
    }),
    save: withUser(async (ctx, user) => reply(ctx, await service().save(user, ctx.params.slug))),
    remove: withUser(async (ctx, user) => reply(ctx, await service().remove(user, ctx.params.slug))),
  };
};
