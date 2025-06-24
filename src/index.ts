import joplin from 'api';
import { createJournalPanel, registerPanelHandlers } from './panel';
import { reindexAll, upsertNote, reconcileIndex } from "./embeddings";
import registerSettings from './settings';

joplin.plugins.register({
  onStart: async () => {
    // Register plugin settings
    await registerSettings();

    const openaiApiKey = await joplin.settings.value('openaiApiKey');
    const useLocalModel = await joplin.settings.value('useLocalModel');

    console.log('Settings:', { openaiApiKey: openaiApiKey ? '[REDACTED]' : '', useLocalModel });

    (globalThis as any).NOTECHAT_SETTINGS = { openaiApiKey, useLocalModel, };

    // Perform an initial full index if the in-memory index is empty
    console.log('onStart: running initial reindexAll');
    await reindexAll();
    console.log('onStart: reconciling index with current notes');
    await reconcileIndex();

    // Keep the in-memory index up to date on note changes
    joplin.workspace.onNoteChange(async (event) => {
      console.log('Event: note changed', event.id);
      await upsertNote(event.id);
    });

    // Register power-user commands
    await joplin.commands.register({
      name: 'notechat.reindexAllNotes',
      label: 'NoteChat: Reindex All Notes',
      execute: async () => {
        console.log('Command: Reindex All Notes invoked');
        await reindexAll();
      },
    });
    await joplin.commands.register({
      name: 'notechat.reconcileIndex',
      label: 'NoteChat: Reconcile Index',
      execute: async () => {
        console.log('Command: Reconcile Index invoked');
        await reconcileIndex();
      },
    });

    const panel = await createJournalPanel('journalPanel');
    await joplin.views.panels.show(panel);
    await registerPanelHandlers(panel);
  },
});