import { PLUGIN_ID } from './pluginId';
import { Initializer } from './components/Initializer';
import { AiSeoButton } from './components/AiSeoButton';

export default {
  register(app: any) {
    app.registerPlugin({
      id: PLUGIN_ID,
      name: PLUGIN_ID,
      initializer: Initializer,
      isReady: false,
    });
  },

  bootstrap(app: any) {
    // Inject button into edit view right-links (action buttons area)
    app.getPlugin('content-manager').injectComponent('editView', 'right-links', {
      name: `${PLUGIN_ID}.ai-seo-button`,
      Component: AiSeoButton,
    });
  },

  async registerTrads({ locales }: { locales: string[] }) {
    return Promise.all(
      locales.map(async (locale: string) => {
        return {
          data: {},
          locale,
        };
      })
    );
  },
};
