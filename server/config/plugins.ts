export default ({ env }) => ({
  'map-box': {
    enabled: true,
    config: {
      public: {
        accessToken: env('MAPBOX_ACCESS_TOKEN'),
        debugMode: env.bool('MAPBOX_DEBUG_MODE', false),
      },
    },
  },
});
