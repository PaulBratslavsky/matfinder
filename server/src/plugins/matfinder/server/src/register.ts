import type { Core } from '@strapi/strapi';
import { registerMcp } from './mcp';
import { ACTION_DEFS } from './permissions';

/**
 * Admin actions and MCP tools are registered here, not in bootstrap(): the MCP server starts before bootstrap(), and
 * token grants for actions registered after it are dropped on every restart.
 */
export default async function register({ strapi }: { strapi: Core.Strapi }) {
  await strapi
    .service('admin::permission')
    .actionProvider.registerMany(ACTION_DEFS.map((a) => ({ section: 'plugins', pluginName: 'matfinder', ...a })));
  await registerMcp(strapi);
}
