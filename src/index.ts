import joplin from 'api';
import { createJournalPanel, registerPanelHandlers } from './ui/panel/panel';
import registerSettings from './settings';
import { reindexAll, syncIndex } from './ai/embeddingService';

(joplin.plugins as any).register({
  onStart: async () => {
    // Register plugin settings
    await registerSettings();

    const openaiApiKey = await joplin.settings.value('openaiApiKey');
    const useLocalModel = await joplin.settings.value('useLocalModel');

    console.log('Settings:', { openaiApiKey: openaiApiKey ? '[REDACTED]' : '', useLocalModel });

    (globalThis as any).NOTECHAT_SETTINGS = { openaiApiKey, useLocalModel, };

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
        await syncIndex();
      },
    });

    const panel = await createJournalPanel('journalPanel');
    await joplin.views.panels.show(panel);
    await registerPanelHandlers(panel);
  },
});