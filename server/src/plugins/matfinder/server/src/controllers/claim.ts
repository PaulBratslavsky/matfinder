import type { Core } from '@strapi/strapi';
import { z } from '@strapi/utils';
import { reply } from '../domain/result';

const NewClaim = z.object({
  schoolSlug: z.string().min(1).max(255),
  role: z.enum(['owner', 'manager', 'head_instructor', 'staff']),
  phone: z
    .string()
    .trim()
    .min(7)
    .max(40)
    .regex(/^[0-9+().\-\s]+$/, 'digits, spaces and + ( ) - only'),
  message: z.string().max(1000).optional(),
  name: z.string().max(120).optional(),
});

/** The signed-in Better Auth user (api-permissions puts it on ctx.state.user). */
const userOf = (ctx: any) => ctx.state.user ?? ctx.state.auth?.credentials?.user ?? null;

/** Content API (the app): a signed-in owner claims a gym, and checks on their claim. */
export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async create(ctx) {
    const user = userOf(ctx);
    if (!user?.documentId) return ctx.unauthorized('Sign in to claim a gym');
    const parsed = NewClaim.safeParse(ctx.request.body ?? {});
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      ctx.status = 422;
      ctx.body = { data: null, error: { status: 422, name: 'VALIDATION_ERROR', message: `${issue.path.join('.')}: ${issue.message}` } };
      return;
    }
    reply(ctx, await strapi.plugin('matfinder').service('claims').create(user, parsed.data), true);
  },

  async mine(ctx) {
    const user = userOf(ctx);
    if (!user?.documentId) return ctx.unauthorized('Sign in to see your claims');
    const school = ctx.query.school;
    if (typeof school !== 'string' || !school) return ctx.badRequest('The school query parameter is required');
    ctx.body = await strapi.plugin('matfinder').service('claims').mine(user, school);
  },
});
