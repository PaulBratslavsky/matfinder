import { ACTIONS, allow } from '../permissions';

/** Admin API, served at /matfinder/... for admin sessions holding the action. Static paths before parameterized ones. */
export default {
  admin: {
    type: 'admin',
    routes: [
      { method: 'GET', path: '/summary', handler: 'gyms.summary', config: { policies: allow(ACTIONS.read) } },
      { method: 'GET', path: '/gyms', handler: 'gyms.find', config: { policies: allow(ACTIONS.read) } },
      { method: 'GET', path: '/from-web', handler: 'gyms.fromWeb', config: { policies: allow(ACTIONS.read) } },
    ],
  },
};
