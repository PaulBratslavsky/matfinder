import { betterAuth } from 'better-auth';
import { jwt } from 'better-auth/plugins';
import { expo } from '@better-auth/expo';
import { dash } from '@better-auth/infra';
import { strapiAdapter } from '@strapi-community/plugin-better-auth';

const webOrigins = (process.env.WEB_ORIGINS ?? 'http://localhost:8083').split(',').map((s) => s.trim());

// The plugin loads this file itself (src/lib/auth). Export the INSTANCE, not a () => betterAuth() factory.
export const auth = betterAuth({
  database: strapiAdapter(),
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL ?? 'http://localhost:1339',
  trustedOrigins: [...webOrigins, 'matfinder://', ...(process.env.NODE_ENV === 'production' ? [] : ['exp://'])],
  emailAndPassword: { enabled: true, requireEmailVerification: false, minPasswordLength: 8 },
  session: { expiresIn: 60 * 60 * 24 * 30, updateAge: 60 * 60 * 24 }, // 30-day sliding session
  plugins: [
    expo(),
    // Required by the admin's Better Auth dashboard (plugin-better-auth-dashboard). dash() reports to this Strapi
    // server (apiUrl), not Better Auth's hosted service. Its key must match the dashboard plugin's
    // BETTER_AUTH_DASHBOARD_SECRET; when that's unset the dashboard fails closed instead of using a default key.
    jwt(),
    dash({ apiUrl: process.env.BETTER_AUTH_URL ?? 'http://localhost:1339', apiKey: process.env.BETTER_AUTH_DASHBOARD_SECRET }),
  ],
  advanced: { database: { generateId: 'serial' } }, // REQUIRED: without it, foreign keys break on first sign-up
});
export default auth;
