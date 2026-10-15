import contentTypes from './content-types';
import controllers from './controllers';
import register from './register';
import routes from './routes';
import services from './services';

/** MatFinder: the MCP curation tools, the admin area for gyms (and, next, claims) and the homepage widgets. */
export default {
  register,
  bootstrap() {},
  destroy() {},
  config: { default: {}, validator() {} },
  controllers,
  routes,
  services,
  contentTypes,
  policies: {},
  middlewares: {},
};
