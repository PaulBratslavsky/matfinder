import fs from 'node:fs';
import path from 'node:path';

const MATFINDER = './src/plugins/matfinder';

/**
 * Strapi silently skips a plugin whose server build is missing (a failed or half-done `npm run build:plugin`), and
 * booting without MatFinder deletes its data: the claims table and every Admin token grant for its MCP tools. Refuse to
 * start instead. (`strapi develop` restarts on plugin source edits, so this happens mid-rebuild too.)
 */
function assertMatFinderBuilt() {
  const entry = path.resolve(MATFINDER, 'dist/server/index.js');
  if (!fs.existsSync(entry)) {
    throw new Error(`The MatFinder plugin isn't built (${entry} is missing). Run \`npm run build:plugin\` in server/, then start Strapi again.`);
  }
}

export default ({ env }) => {
  assertMatFinderBuilt();

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
    // Agent writes (its MCP tools) go live right away; MATFINDER_AUTO_PUBLISH=false keeps them as drafts for review.
    // The gym chat (plan 09) uses one Anthropic key and a model per chat; without AI_API_KEY the chats are off. Empty
    // values count as not set. MATFINDER_AI_SCRIPTED is for the test server only (scripted answers, no model).
    matfinder: {
      enabled: true,
      resolve: MATFINDER,
      config: {
        autoPublish: env.bool('MATFINDER_AUTO_PUBLISH', true),
        aiApiKey: env('AI_API_KEY', '') || null,
        gymChatModel: env('AI_GYM_CHAT_MODEL', '') || 'claude-opus-5-5',
        adminChatModel: env('AI_ADMIN_CHAT_MODEL', '') || 'claude-opus-5-5',
        aiScripted: env.bool('MATFINDER_AI_SCRIPTED', false),
      },
    },
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
