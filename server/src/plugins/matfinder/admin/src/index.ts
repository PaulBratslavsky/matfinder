import { PinMap } from '@strapi/icons';
import { PERMISSIONS } from './permissions';
import { PLUGIN_ID } from './pluginId';

export default {
  register(app: any) {
    app.addMenuLink({
      to: `plugins/${PLUGIN_ID}`,
      icon: PinMap,
      intlLabel: { id: `${PLUGIN_ID}.menu`, defaultMessage: 'MatFinder' },
      Component: () => import('./pages/MatFinderPage'),
      permissions: PERMISSIONS.read,
    });

    // Homepage widgets. The body is a fixed height (~260 px), so content stays compact.
    app.widgets.register({
      id: 'directory',
      pluginId: PLUGIN_ID,
      icon: PinMap,
      title: { id: `${PLUGIN_ID}.widget.directory.title`, defaultMessage: 'Gym directory' },
      link: { label: { id: `${PLUGIN_ID}.widget.directory.link`, defaultMessage: 'Open MatFinder' }, href: `/plugins/${PLUGIN_ID}` },
      permissions: PERMISSIONS.read,
      component: async () => (await import('./components/DirectoryWidget')).default,
    });

    app.registerPlugin({ id: PLUGIN_ID, name: 'MatFinder' });
  },
};
