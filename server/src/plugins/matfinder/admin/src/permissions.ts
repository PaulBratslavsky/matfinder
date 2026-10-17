/** Admin RBAC, mirrored from server/src/permissions.ts. */
export const PERMISSIONS = {
  read: [{ action: 'plugin::matfinder.read', subject: null }],
  /** useRBAC → allowedActions.canReview */
  review: [{ action: 'plugin::matfinder.claims.review', subject: null }],
};
