export default ({ env }) => [
  'strapi::logger',
  'global::auth-ip-probe',
  'strapi::errors',
  {
    name: 'strapi::security',
    config: {
      contentSecurityPolicy: {
        useDefaults: true,
        directives: {
          'script-src': ["'self'", "'unsafe-inline'", 'blob:'],
          'worker-src': ["'self'", 'blob:'],
          'connect-src': ["'self'", 'https:', 'blob:', 'https://api.mapbox.com', 'https://events.mapbox.com'],
          'img-src': ["'self'", 'data:', 'blob:', 'https://api.mapbox.com', 'https://*.mapbox.com'],
        },
      },
    },
  },
  {
    name: 'strapi::cors',
    config: {
      origin: env.array('WEB_ORIGINS', ['http://localhost:8083']),
      credentials: true,
      // Strapi's defaults, plus X-Run-Id, which TanStack AI's chat client sends with each gym chat question. The web
      // app only crosses origins in development (production goes through the same-origin /api rewrite).
      headers: ['Content-Type', 'Authorization', 'Origin', 'Accept', 'X-Run-Id'],
    },
  },
  'strapi::poweredBy',
  'strapi::query',
  'strapi::body',
  'strapi::session',
  'strapi::favicon',
  'strapi::public',
];
