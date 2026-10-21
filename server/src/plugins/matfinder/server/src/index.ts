import { DEFAULT_CONFIG, validateConfig } from './config';
import contentTypes from './content-types';
import controllers from './controllers';
import register from './register';
import routes from './routes';
import services from './services';

/** MatFinder: the MCP curation tools, the admin area for gyms and claims, the homepage widgets and the gym chat. */
export default {
  register,
  bootstrap() {},
  destroy() {},
  config: { default: DEFAULT_CONFIG, validator: validateConfig },
  controllers,
  routes,
  services,
  contentTypes,
  policies: {},
  middlewares: {},
};
