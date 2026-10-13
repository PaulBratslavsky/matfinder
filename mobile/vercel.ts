import { routes, type VercelConfig } from '@vercel/config/v1';

/**
 * Vercel (root directory `mobile`). The `/api` rewrite keeps the API on the app's own origin, so Better Auth's session
 * cookie is first-party: cross-site cookies between *.vercel.app and *.strapiapp.com are blocked by Safari and by
 * third-party-cookie restrictions. Order matters: /api first, then the SPA fallback (static files are served first).
 * STRAPI_ORIGIN is a Vercel-only env var, e.g. https://<project>.strapiapp.com.
 */
const STRAPI = process.env.STRAPI_ORIGIN!;

export const config: VercelConfig = {
  framework: null,
  buildCommand: 'npx expo export -p web',
  outputDirectory: 'dist',
  rewrites: [
    routes.rewrite('/api/(.*)', `${STRAPI}/api/$1`), // same-origin API → first-party auth cookies
    routes.rewrite('/(.*)', '/index.html'), // SPA fallback (static files are served first)
  ],
};
