/**
 * Custom school routes. The `01-` prefix loads this file before the core router; otherwise `/schools/directory`
 * matches core `GET /schools/:id`. Access comes from the api-permissions grants seeded in bootstrap().
 */

export default {
  routes: [
    { method: 'GET', path: '/schools/directory', handler: 'api::school.school.directory' },
    { method: 'GET', path: '/schools/slug/:slug', handler: 'api::school.school.bySlug' },
  ],
};
