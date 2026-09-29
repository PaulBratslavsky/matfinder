export default [
  'strapi::logger',
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
  'strapi::cors',
  'strapi::poweredBy',
  'strapi::query',
  'strapi::body',
  'strapi::session',
  'strapi::favicon',
  'strapi::public',
];
