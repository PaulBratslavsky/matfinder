import type { Core } from '@strapi/strapi';
import { guard, toErrorResult } from './guard';
import { findSchools } from './tools/find-schools';
import { getSchool } from './tools/get-school';
import { listPendingDrafts } from './tools/list-pending-drafts';
import { listReferenceData } from './tools/list-reference-data';
import { setSchoolSchedule } from './tools/set-school-schedule';
import { upsertAffiliation } from './tools/upsert-affiliation';
import { upsertInstructor } from './tools/upsert-instructor';
import { upsertSchool } from './tools/upsert-school';
import { addGymFromWeb } from './tools/add-gym-from-web';
import { findPossibleDuplicates } from './tools/find-possible-duplicates';
import { findNewGymsArgs, findNewGymsText } from './prompts/find-new-gyms';
import type { ToolDef } from './types';

/**
 * The 10 MatFinder tools. Writes go live: each write tool publishes what it changed (services/publishing.ts; off with
 * MATFINDER_AUTO_PUBLISH=false). No tool unpublishes, deletes or uploads media.
 */
export const TOOLS: ToolDef[] = [
  listReferenceData,
  findSchools,
  getSchool,
  upsertSchool,
  setSchoolSchedule,
  upsertInstructor,
  upsertAffiliation,
  listPendingDrafts,
  findPossibleDuplicates,
  addGymFromWeb,
];

/** Admin action uids allow only lowercase letters, dots and hyphens: upsert_school → mcp.upsert-school. */
export const actionUid = (tool: string) => `mcp.${tool.replace(/_/g, '-')}`;
/** The action an Admin token must hold to call the tool (Settings → Admin Tokens → Plugins → MatFinder). */
export const actionId = (tool: string) => `plugin::matfinder.${actionUid(tool)}`;

/**
 * Registers one admin action per tool (so the curator token grants exactly these tools, never the generic
 * content-manager CRUD tools) and the tools themselves. Called from register(): bootstrap() runs after the MCP
 * server starts and would drop token grants for actions registered there on every restart.
 */
export async function registerMcp(strapi: Core.Strapi) {
  await strapi.service('admin::permission').actionProvider.registerMany(
    TOOLS.map((t) => ({
      section: 'plugins',
      pluginName: 'matfinder',
      subCategory: 'MCP tools',
      uid: actionUid(t.name),
      displayName: t.write ? `${t.title} (write)` : t.title,
    })),
  );
  const mcp = (strapi as any).ai?.mcp;
  if (!mcp) {
    strapi.log.warn('[matfinder] strapi.ai.mcp is unavailable; MCP tools not registered');
    return;
  }
  for (const t of TOOLS) {
    mcp.registerTool({
      name: t.name,
      title: t.title,
      description: t.description,
      auth: { policies: [{ action: actionId(t.name) }] },
      resolveInputSchema: () => t.input,
      resolveOutputSchema: () => t.output,
      createHandler: (s: Core.Strapi) => async ({ args }: { args: any }) => {
        try {
          const data = await t.run(s, args ?? {});
          const live = t.publishes ? await s.plugin('matfinder').service('publishing').afterWrite(t.publishes, data.slug as string) : {};
          return guard({ ...data, ...live }, t.shrinkHint);
        } catch (e) {
          return toErrorResult(e, t.mapPath);
        }
      },
    });
  }

  // The search-and-add loop as a prompt. Anyone allowed to add gyms from the web can use it.
  mcp.registerPrompt({
    name: 'find_new_gyms',
    title: 'Find new gyms on the web',
    description:
      'Search the web for BJJ gyms in a city that MatFinder does not list yet, skip duplicates, and add the rest to the directory with their source pages.',
    argsSchema: findNewGymsArgs,
    auth: { policies: [{ action: actionId('add_gym_from_web') }] },
    createHandler: () => async (args: { city: string; area?: string }) => ({
      messages: [{ role: 'user', content: { type: 'text', text: findNewGymsText(args) } }],
    }),
  });
}
