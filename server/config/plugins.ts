export default ({ env }) => {
  // Optional: load a local strapi-plugin-map-box checkout instead of the npm package.
  const localMapBoxPath = env('MAP_BOX_PLUGIN_PATH');

  return {
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
    // strapi-plugin-map-box@0.0.4 on npm registers as "strapi-plugin-map-box", so with a local
    // checkout loaded it would register the map-box custom field twice. Remove after bumping to 0.0.5.
    ...(localMapBoxPath ? { 'strapi-plugin-map-box': { enabled: false } } : {}),
  };
};
