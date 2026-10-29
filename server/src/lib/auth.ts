import { betterAuth } from 'better-auth';
import { APIError, createAuthMiddleware } from 'better-auth/api';
import { jwt } from 'better-auth/plugins';
import { expo } from '@better-auth/expo';
import { dash } from '@better-auth/infra';
import { strapiAdapter } from '@strapi-community/plugin-better-auth';
import { ipAddressOptions } from './auth-ip';

const webOrigins = (process.env.WEB_ORIGINS ?? 'http://localhost:8083').split(',').map((s) => s.trim());

// The plugin loads this file itself (src/lib/auth). Export the INSTANCE, not a () => betterAuth() factory.
export const auth = betterAuth({
  database: strapiAdapter(),
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL ?? 'http://localhost:1339',
  trustedOrigins: [...webOrigins, 'matfinder://', ...(process.env.NODE_ENV === 'production' ? [] : ['exp://'])],
  emailAndPassword: { enabled: true, requireEmailVerification: false, minPasswordLength: 8 },
  session: { expiresIn: 60 * 60 * 24 * 30, updateAge: 60 * 60 * 24 }, // 30-day sliding session
  // Account deletion (C15): always with the password, and the user's claims are cleared first (see forgetUser).
  user: {
    deleteUser: {
      enabled: true,
      beforeDelete: async (user) => {
        const row = await strapi.documents('plugin::better-auth.user' as any).findFirst({ filters: { id: Number(user.id) }, fields: ['documentId'] });
        if (!row?.documentId) return;
        const { claims } = await strapi.plugin('matfinder').service('claims').forgetUser(row.documentId);
        strapi.log.info(`[matfinder] account deleted: ${claims} claim(s) cleared`);
      },
    },
  },
  hooks: {
    before: createAuthMiddleware(async (ctx) => {
      if (ctx.path === '/delete-user' && !(ctx.body as { password?: unknown } | undefined)?.password) {
        throw new APIError('BAD_REQUEST', { message: 'Enter your password to delete your account.' });
      }
    }),
  },
  plugins: [
    expo(),
    // Required by the admin's Better Auth dashboard (plugin-better-auth-dashboard). dash() reports to this Strapi
    // server (apiUrl), not Better Auth's hosted service. Its key must match the dashboard plugin's
    // BETTER_AUTH_DASHBOARD_SECRET; when that's unset the dashboard fails closed instead of using a default key.
    jwt(),
    dash({ apiUrl: process.env.BETTER_AUTH_URL ?? 'http://localhost:1339', apiKey: process.env.BETTER_AUTH_DASHBOARD_SECRET }),
  ],
  // REQUIRED: without generateId, foreign keys break on first sign-up. ipAddress: see src/lib/auth-ip.ts (B-9).
  advanced: { database: { generateId: 'serial' }, ipAddress: ipAddressOptions() },
});
export default auth;
