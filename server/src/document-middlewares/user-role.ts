import type { Core } from '@strapi/strapi';
import { authenticatedRoleDocumentId } from '../lib/permissions';
import type { DocumentMiddleware } from './utils';

/**
 * plugin-better-auth creates users with no role, and api-permissions treats a signed-in user without roles as
 * Public. New users get the Authenticated role so the Authenticated grants (e.g. `school.bySlug`) apply to them.
 */
export const userRole =
  (strapi: Core.Strapi): DocumentMiddleware =>
  async (ctx, next) => {
    if ((ctx.uid as string) === 'plugin::better-auth.user' && ctx.action === 'create') {
      const data = (ctx.params as { data?: Record<string, any> }).data;
      if (data && !data.roles) {
        const roleId = await authenticatedRoleDocumentId(strapi);
        if (roleId) data.roles = [roleId];
      }
    }
    return next();
  };
