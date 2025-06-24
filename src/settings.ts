import joplin from 'api';
import { SettingItemType } from 'api/types';
import { reindexAll } from './embeddingService';

export default async function registerSettings() {
  // Create a new section for NoteChat settings
  await joplin.settings.registerSection('noteChatSection', {
    label: 'NoteChat',
    iconName: 'fas fa-brain',
  });

  // Register all plugin settings in one call
  await joplin.settings.registerSettings({
    openaiApiKey: {
      value: '',
      type: SettingItemType.String,
      section: 'noteChatSection',
      public: true,
      label: 'OpenAI API Key',
      description: 'Your secret OpenAI API key for remote chat completions.',
    },
    useLocalModel: {
      value: true,
      type: SettingItemType.Bool,
      section: 'noteChatSection',
      public: true,
      label: 'Use Local Model',
      description: 'If enabled and Ollama is running, use local Ollama models for embeddings and chat.',
    },
  });

  // Prevent enabling local model without an OpenAI key
  joplin.settings.onChange(async () => {
    const useLocal = await joplin.settings.value('useLocalModel');
    const key      = await joplin.settings.value('openaiApiKey');
    if (!useLocal && !key) {
      // Revert the toggle
      await joplin.settings.setValue('useLocalModel', true);
      // Inform the user
      await joplin.views.dialogs.showMessageBox(
        'Please enter an OpenAI API Key before disabling the local model.'
      );
    } else {
        console.log(`Settings changed: useLocalModel=${useLocal}`);
        await reindexAll();
        console.log('Reindexing all notes after settings change');
    }
  });
}
