import type { Core } from '@strapi/strapi';

const ROLE_UID = 'plugin::api-permissions.role';
const PERMISSION_UID = 'plugin::api-permissions.permission';
const USER_UID = 'plugin::better-auth.user';

/**
 * Content-API grants per api-permissions role `type`. Nothing else is granted: never core find/findOne/create/
 * update/delete on school, instructor or affiliation, and nothing on the Better Auth user type (the current user
 * comes only from /api/auth/get-session). The two school actions exist once M4 adds their routes. No city action
 * either: the app reads cities through the directory payload, and core find with populate could reach gym fields (B-2).
 */
export const GRANTS: Record<'public' | 'authenticated', string[]> = {
  public: ['api::school.school.directory', 'api::school.school.nearby'],
  authenticated: [
    'api::school.school.directory',
    'api::school.school.nearby',
    'api::school.school.bySlug',
    // The MatFinder plugin's claim routes (server/src/plugins/matfinder): claim a gym, see your claim's status.
    'plugin::matfinder.claim.create',
    'plugin::matfinder.claim.mine',
    // The gym chat ("Ask about this gym"): whether it's set up, and asking a question.
    'plugin::matfinder.gym-chat.status',
    'plugin::matfinder.gym-chat.ask',
    // Report a problem with a gym (MatFinder plugin).
    'plugin::matfinder.report.create',
  ],
};

// The plugin's types don't include its own content types, hence the casts.
const roles = (strapi: Core.Strapi) => strapi.documents(ROLE_UID as any);
const permissions = (strapi: Core.Strapi) => strapi.documents(PERMISSION_UID as any);

/** Adds each grant unless that action + role pair already exists; grants made in the admin are left alone. */
export async function seedPermissions(strapi: Core.Strapi) {
  for (const [type, actions] of Object.entries(GRANTS)) {
    const role = await roles(strapi).findFirst({ filters: { type } } as any);
    if (!role) {
      strapi.log.error(`[matfinder] api-permissions role "${type}" not found; grants not applied`);
      continue;
    }
    for (const action of actions) {
      const existing = await permissions(strapi).findFirst({ filters: { action, role: { id: role.id } } } as any);
      if (!existing) await permissions(strapi).create({ data: { action, role: role.documentId } } as any);
    }
  }
}

/**
 * Grants this app must not have. Removed on every boot, including ones made by hand in the admin, because
 * seedPermissions only ever adds (B-2).
 */
export const REVOKED: Record<'public' | 'authenticated', string[]> = {
  public: ['api::city.city.find'],
  authenticated: ['api::city.city.find'],
};

export async function revokePermissions(strapi: Core.Strapi) {
  for (const [type, actions] of Object.entries(REVOKED)) {
    const role = await roles(strapi).findFirst({ filters: { type } } as any);
    if (!role) continue;
    for (const action of actions) {
      const rows = await permissions(strapi).findMany({ filters: { action, role: { id: role.id } } } as any);
      for (const row of rows) {
        await permissions(strapi).delete({ documentId: row.documentId } as any);
        strapi.log.info(`[matfinder] revoked ${action} from the ${type} role`);
      }
    }
  }
}

/** documentId of the Authenticated role, cached after the first lookup. */
let authenticatedRoleId: string | null = null;
export async function authenticatedRoleDocumentId(strapi: Core.Strapi): Promise<string | null> {
  if (authenticatedRoleId) return authenticatedRoleId;
  const role = await roles(strapi).findFirst({ filters: { type: 'authenticated' } } as any);
  authenticatedRoleId = role?.documentId ?? null;
  return authenticatedRoleId;
}

/** Users created before the role-on-sign-up middleware existed get the Authenticated role. */
export async function backfillUserRoles(strapi: Core.Strapi) {
  const roleId = await authenticatedRoleDocumentId(strapi);
  if (!roleId) return;
  const users = strapi.documents(USER_UID as any);
  const withoutRole = await users.findMany({ filters: { roles: { id: { $null: true } } }, limit: 1000 } as any);
  for (const user of withoutRole) {
    await users.update({ documentId: user.documentId, data: { roles: [roleId] } } as any);
  }
}
