import { ACTIONS, allow } from '../permissions';

/** Admin API, served at /matfinder/... for admin sessions holding the action. Static paths before parameterized ones. */
export default {
  admin: {
    type: 'admin',
    routes: [
      { method: 'GET', path: '/summary', handler: 'gyms.summary', config: { policies: allow(ACTIONS.read) } },
      { method: 'GET', path: '/gyms', handler: 'gyms.find', config: { policies: allow(ACTIONS.read) } },
      { method: 'GET', path: '/from-web', handler: 'gyms.fromWeb', config: { policies: allow(ACTIONS.read) } },
      { method: 'GET', path: '/claims', handler: 'claims.find', config: { policies: allow(ACTIONS.read) } },
      { method: 'POST', path: '/claims/:documentId/contacted', handler: 'claims.contacted', config: { policies: allow(ACTIONS.review) } },
      { method: 'POST', path: '/claims/:documentId/accept', handler: 'claims.accept', config: { policies: allow(ACTIONS.review) } },
      { method: 'POST', path: '/claims/:documentId/reject', handler: 'claims.reject', config: { policies: allow(ACTIONS.review) } },
      { method: 'POST', path: '/claims/:documentId/remove-owner', handler: 'claims.removeOwner', config: { policies: allow(ACTIONS.review) } },
      // The Assistant tab (plan 09, M19). Each tool is checked again against the admin's role inside the turn.
      { method: 'GET', path: '/assistant/status', handler: 'assistant.status', config: { policies: allow(ACTIONS.assistant) } },
      { method: 'POST', path: '/assistant/chat', handler: 'assistant.chat', config: { policies: allow(ACTIONS.assistant) } },
    ],
  },
  /**
   * Content API (the app), at /api/matfinder/...: signed-in users only. The Authenticated role's grants for
   * plugin::matfinder.claim.create and .mine, and gym-chat.ask and .status, are seeded by the app
   * (server/src/lib/permissions.ts).
   */
  'content-api': {
    type: 'content-api',
    routes: [
      { method: 'POST', path: '/claims', handler: 'claim.create' },
      { method: 'GET', path: '/claims/mine', handler: 'claim.mine' },
      // The gym chat (plan 09, M17): one question about one gym, streamed as server-sent events.
      { method: 'GET', path: '/chat/status', handler: 'gym-chat.status' },
      { method: 'POST', path: '/schools/:slug/chat', handler: 'gym-chat.ask' },
    ],
  },
};
