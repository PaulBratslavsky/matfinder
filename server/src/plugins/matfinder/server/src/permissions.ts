/** RBAC actions (Settings → Roles → Plugins → MatFinder); ids are `plugin::matfinder.<uid>`. */
export const ACTIONS = {
  read: 'plugin::matfinder.read',
} as const;

export const ACTION_DEFS = [{ uid: 'read', displayName: 'See gyms, claims and the homepage widgets', subCategory: 'Admin area' }];

/** Admin route policies: an admin session holding `action`. */
export const allow = (action: string) => ['admin::isAuthenticatedAdmin', { name: 'admin::hasPermissions', config: { actions: [action] } }];
