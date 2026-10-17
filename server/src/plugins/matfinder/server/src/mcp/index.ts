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
import type { ToolDef } from './types';

/** The 8 MatFinder tools. All writes are drafts: no tool publishes, unpublishes, deletes or uploads media. */
export const TOOLS: ToolDef[] = [
  listReferenceData,
  findSchools,
  getSchool,
  upsertSchool,
  setSchoolSchedule,
  upsertInstructor,
  upsertAffiliation,
  listPendingDrafts,
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
          return guard(await t.run(s, args ?? {}), t.shrinkHint);
        } catch (e) {
          return toErrorResult(e, t.mapPath);
        }
      },
    });
  }
}
