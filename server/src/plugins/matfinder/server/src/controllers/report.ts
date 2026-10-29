import type { Core } from '@strapi/strapi';
import { z } from '@strapi/utils';
import { REPORT_KINDS } from '../domain/reports';
import { reply } from '../domain/result';

const NewReport = z.object({
  schoolSlug: z.string().min(1).max(255),
  kind: z.enum(REPORT_KINDS as [string, ...string[]]),
  message: z.string().max(1000).optional(),
});

const userOf = (ctx: any) => ctx.state.user ?? ctx.state.auth?.credentials?.user ?? null;

/** Content API (the app): a signed-in user reports a problem with a gym's listing. */
export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async create(ctx) {
    const user = userOf(ctx);
    if (!user?.documentId) return ctx.unauthorized('Sign in to report a problem');
    const parsed = NewReport.safeParse(ctx.request.body ?? {});
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      ctx.status = 422;
      ctx.body = { data: null, error: { status: 422, name: 'VALIDATION_ERROR', message: `${issue.path.join('.')}: ${issue.message}` } };
      return;
    }
    reply(ctx, await strapi.plugin('matfinder').service('reports').create(user, parsed.data as any), true);
  },
});
