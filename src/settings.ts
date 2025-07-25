import joplin from 'api';
import { SettingItemType } from 'api/types';
import { reindexAll } from './ai/embeddingService';

export default async function registerSettings() {
  // Create a new section for NoteChat settings
  await joplin.settings.registerSection('noteChatSection', {
    label: 'NoteChat',
    iconName: 'fas fa-brain',
  });

  // Register all plugin settings in one call
  await joplin.settings.registerSettings({
    provider: {
      value: 'openai',
      type: SettingItemType.String,
      section: 'noteChatSection',
      public: true,
      isEnum: true,
      label: 'AI Provider',
      description: 'Select which AI provider to use for chat completions.',
      options: {
        openai: 'OpenAI',
        lambda: 'Lambda Labs',
      },
    },
    openaiApiKey: {
      value: '',
      type: SettingItemType.String,
      section: 'noteChatSection',
      public: true,
      label: 'OpenAI API Key',
      description: 'Your secret OpenAI API key for remote chat completions.',
    },
    lambdaApiKey: {
      value: '',
      type: SettingItemType.String,
      section: 'noteChatSection',
      public: true,
      label: 'Lambda Labs API Key',
      description: 'Your Lambda Labs API key for remote LLama inference.',
    },
    systemPrompt: {
      value: 'You are a helpful journal assistant. Use the notes provided to answer the question. Cite which note you used to answer the question.',
      type: SettingItemType.String,
      section: 'noteChatSection',
      public: true,
      label: 'System Prompt',
      description: 'The system prompt to use for AI conversations.',
    },
    nearestNeighbors: {
      value: 5,
      type: SettingItemType.Int,
      section: 'noteChatSection',
      public: true,
      label: 'Nearest Neighbors',
      description: 'Number of nearest neighbor notes to retrieve for embeddings (higher values increase accuracy and cost).',
    },
  });

  // Validate settings on change
  joplin.settings.onChange(async () => {
    const openai = (await joplin.settings.value('openaiApiKey')) as string;
    const lambda = (await joplin.settings.value('lambdaApiKey')) as string;
    const provided = [openai.trim() !== '', lambda.trim() !== ''];
    const count = provided.filter(v => v).length;
    if (count !== 1) {
      await joplin.views.dialogs.showMessageBox(
        'Please configure exactly one: OpenAI API Key or Lambda API Key.'
      );
      return;
    }
    console.log(`Settings changed: openai=${openai!==''}, lambda=${lambda!==''}`);
    await reindexAll();
    console.log('Reindexing all notes after settings change');
  });
}
