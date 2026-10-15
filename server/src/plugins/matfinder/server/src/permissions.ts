/** RBAC actions (Settings → Roles → Plugins → MatFinder); ids are `plugin::matfinder.<uid>`. */
export const ACTIONS = {
  read: 'plugin::matfinder.read',
  review: 'plugin::matfinder.claims.review',
} as const;

export const ACTION_DEFS = [
  { uid: 'read', displayName: 'See gyms, claims and the homepage widgets', subCategory: 'Admin area' },
  { uid: 'claims.review', displayName: 'Contact, accept and reject claims; remove owners', subCategory: 'Claims' },
];

/** Admin route policies: an admin session holding `action`. */
export const allow = (action: string) => ['admin::isAuthenticatedAdmin', { name: 'admin::hasPermissions', config: { actions: [action] } }];
