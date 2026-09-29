export default () => ({
  'map-box': {
    enabled: true,
    resolve: '../plugins/strapi-plugin-map-box',
    config: {
      public: {
        accessToken: process.env.MAPBOX_ACCESS_TOKEN,
        debugMode: process.env.MAPBOX_DEBUG_MODE === 'true',
      },
    },
  },
});
