export default ({ env }) => {
  // Optional, for plugin development: load a local strapi-plugin-map-box checkout instead of the npm package.
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
  };
};
