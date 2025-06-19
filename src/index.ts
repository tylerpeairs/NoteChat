import joplin from 'api';
import { createJournalPanel, registerPanelHandlers } from './panel';
import { handleQuery } from "./chat";

// Expose handleQuery for interactive testing in the plugin console
(globalThis as any).handleQuery = handleQuery;

joplin.plugins.register({
  onStart: async () => {
    const panel = await createJournalPanel('journalPanel');
    await joplin.views.panels.show(panel);
    await registerPanelHandlers(panel);
  },
});