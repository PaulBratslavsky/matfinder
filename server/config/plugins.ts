export default ({ env }) => {
  // Optional, for plugin development: load a local strapi-plugin-map-box checkout instead of the npm package.
  const localMapBoxPath = env('MAP_BOX_PLUGIN_PATH');

  return {
    // End-user auth: Better Auth (config in src/lib/auth.ts). Users & Permissions is uninstalled.
    'better-auth': { enabled: true },
    'better-auth-dashboard': { enabled: true },
    // Content-API roles and permissions (Public, Authenticated), seeded in bootstrap().
    'api-permissions': { enabled: true },
    // MatFinder's own plugin: the MCP curation tools, the admin area and the homepage widgets (src/plugins/matfinder).
    // Built to its dist/ by `npm run build:plugin`, which develop, build and postinstall run first.
    matfinder: { enabled: true, resolve: './src/plugins/matfinder' },
    'map-box': {
      enabled: true,
      ...(localMapBoxPath ? { resolve: localMapBoxPath } : {}),
      config: {
        public: {
          accessToken: env('MAPBOX_ACCESS_TOKEN'),
          debugMode: env.bool('MAPBOX_DEBUG_MODE', false),
        },
      },
    },
  };
};
