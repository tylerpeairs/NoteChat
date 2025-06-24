import joplin from 'api';
import { createJournalPanel, registerPanelHandlers } from './panel';
import { handleQuery } from "./chat";
import { reindexAll, upsertNote } from "./embeddings";

// Expose handleQuery for interactive testing in the plugin console
(globalThis as any).handleQuery = handleQuery;

joplin.plugins.register({
  onStart: async () => {
    // Perform an initial full index if the in-memory index is empty
    console.log('onStart: running initial reindexAll');
    await reindexAll();

    // Keep the in-memory index up to date on note changes
    joplin.workspace.onNoteChange(async (event) => {
      console.log('Event: note changed', event.id);
      await upsertNote(event.id);
    });

    const panel = await createJournalPanel('journalPanel');
    await joplin.views.panels.show(panel);
    await registerPanelHandlers(panel);
  },
});