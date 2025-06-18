import joplin from 'api';
import { createJournalPanel, registerPanelHandlers } from './panel';

joplin.plugins.register({
  onStart: async () => {
    const panel = await createJournalPanel();
    await joplin.views.panels.show(panel);
    await registerPanelHandlers(panel);
  },
});