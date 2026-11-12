import type { Core } from '@strapi/strapi';

/** The plugin's settings, which `config/plugins.ts` maps from the environment. */
export type MatFinderConfig = {
  /** Agent writes (the MCP tools) are published right away; false keeps them as drafts for review. */
  autoPublish: boolean;
  /** The Anthropic API key of both chats (AI_API_KEY). Null: the chats are off. Never logged or sent to a browser. */
  aiApiKey: string | null;
  /** The model of the gym chat (AI_GYM_CHAT_MODEL), an Anthropic model ID. */
  gymChatModel: string;
  /** The model of the admin assistant (AI_ADMIN_CHAT_MODEL, plan 09 M19). */
  adminChatModel: string;
  /** Gym chat questions per UTC day from everyone together (AI_GYM_CHAT_DAILY_TOTAL), counted in memory. */
  gymChatDailyTotal: number;
  /**
   * Tests only (MATFINDER_AI_SCRIPTED): the chats answer from a script, with no model and no key. scripts/test-server.sh
   * turns it on; production never does.
   */
  aiScripted: boolean;
};

/** Claude Opus 5.5 for both chats: the user's decision (plan 09, D2, 2026-10-21). */
export const DEFAULT_MODEL = 'claude-opus-5-5';

export const DEFAULT_CONFIG: MatFinderConfig = {
  autoPublish: true,
  aiApiKey: null,
  gymChatModel: DEFAULT_MODEL,
  adminChatModel: DEFAULT_MODEL,
  gymChatDailyTotal: 200,
  aiScripted: false,
};

export function validateConfig(config: Partial<Record<keyof MatFinderConfig, unknown>>) {
  if (typeof config.autoPublish !== 'boolean') throw new Error('matfinder: autoPublish must be true or false');
  if (config.aiApiKey !== null && typeof config.aiApiKey !== 'string') throw new Error('matfinder: aiApiKey must be a string or null');
  for (const key of ['gymChatModel', 'adminChatModel'] as const) {
    if (typeof config[key] !== 'string' || !config[key]) throw new Error(`matfinder: ${key} must be a model ID`);
  }
  if (!Number.isInteger(config.gymChatDailyTotal) || (config.gymChatDailyTotal as number) < 1) {
    throw new Error('matfinder: gymChatDailyTotal must be a whole number of at least 1');
  }
  if (typeof config.aiScripted !== 'boolean') throw new Error('matfinder: aiScripted must be true or false');
}

/** The plugin's settings as Strapi merged them. An empty key counts as none. */
export function getConfig(strapi: Core.Strapi): MatFinderConfig {
  const plugin = strapi.plugin('matfinder');
  const read = <K extends keyof MatFinderConfig>(key: K) => plugin.config(key, DEFAULT_CONFIG[key]) as MatFinderConfig[K];
  return {
    autoPublish: read('autoPublish'),
    aiApiKey: read('aiApiKey') || null,
    gymChatModel: read('gymChatModel') || DEFAULT_MODEL,
    adminChatModel: read('adminChatModel') || DEFAULT_MODEL,
    gymChatDailyTotal: read('gymChatDailyTotal'),
    aiScripted: read('aiScripted') === true,
  };
}
