/** RBAC actions (Settings → Roles → Plugins → MatFinder); ids are `plugin::matfinder.<uid>`. */
export const ACTIONS = {
  read: 'plugin::matfinder.read',
  review: 'plugin::matfinder.claims.review',
  /** The Assistant tab and its routes (plan 09, M19). Each of its tools also needs that tool's own action. */
  assistant: 'plugin::matfinder.assistant.use',
} as const;

export const ACTION_DEFS = [
  { uid: 'read', displayName: 'See gyms, claims and the homepage widgets', subCategory: 'Admin area' },
  { uid: 'claims.review', displayName: 'Contact, accept and reject claims; remove owners', subCategory: 'Claims' },
  { uid: 'assistant.use', displayName: 'Use the MatFinder assistant', subCategory: 'Assistant' },
];

/** Admin route policies: an admin session holding `action`. */
export const allow = (action: string) => ['admin::isAuthenticatedAdmin', { name: 'admin::hasPermissions', config: { actions: [action] } }];
