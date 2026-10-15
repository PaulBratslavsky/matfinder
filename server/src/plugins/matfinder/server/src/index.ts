import contentTypes from './content-types';
import controllers from './controllers';
import register from './register';
import routes from './routes';
import services from './services';

/** MatFinder: the MCP curation tools, the admin area for gyms and claims, and the homepage widgets. */
export default {
  register,
  bootstrap() {},
  destroy() {},
  config: {
    // Agent writes (the MCP tools) are published right away; false keeps them as drafts for review.
    default: { autoPublish: true },
    validator(config: { autoPublish?: unknown }) {
      if (typeof config.autoPublish !== 'boolean') throw new Error('matfinder: autoPublish must be true or false');
    },
  },
  controllers,
  routes,
  services,
  contentTypes,
  policies: {},
  middlewares: {},
};
