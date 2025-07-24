import joplin from 'api';
import { handleQuery } from "../ai/chatCompletion";
import { reindexAll } from "../ai/embeddingService";

export async function createJournalPanel(panelId: string) {
  console.log('createJournalPanel: initializing panel creation');
  const panel = await joplin.views.panels.create(panelId);
  console.log('createJournalPanel: panel created with handle', panel);
  console.log('createJournalPanel: injecting HTML into panel');
  await joplin.views.panels.setHtml(panel, `
  <style>
    :root {
      --panel-spacing: 16px;
      --border-radius: 6px;
      --transition-speed: 0.2s;
    }

    /* Container spans full height and uses theme colors */
    #journal-panel {
      display: flex;
      flex-direction: column;
      height: 100%;
      background: var(--background-color);
      color: var(--text-color);
      font-family: var(--font-family);
    }

    /* Header bar with subtle gradient */
    #journal-panel-header {
      padding: var(--panel-spacing);
      font-weight: 600;
      border-bottom: 1px solid var(--margin-color);
      font-size: 1.1em;
      background: linear-gradient(
        to bottom,
        var(--background-color),
        var(--background-color-hover2)
      );
    }

    /* Body scrollable with padding */
    #journal-panel-body {
      flex: 1;
      overflow: auto;
      min-height: 0;
      padding: var(--panel-spacing);
      display: flex;
      flex-direction: column;
      gap: var(--panel-spacing);
    }

    /* Input container for better layout */
    .input-container {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    /* Input styling with focus effects */
    #journal-query {
      width: 100%;
      box-sizing: border-box;
      min-height: 100px;
      background: var(--background-color);
      color: var(--text-color);
      border: 1px solid var(--margin-color);
      border-radius: var(--border-radius);
      padding: 12px;
      font-family: inherit;
      font-size: 1em;
      resize: vertical;
      transition: border-color var(--transition-speed);
    }

    #journal-query:focus {
      outline: none;
      border-color: var(--primary-color);
      box-shadow: 0 0 0 2px var(--primary-color-10);
    }

    /* Send button with hover effects */
    #journal-send {
      align-self: flex-end;
      padding: 10px 20px;
      background: var(--joplin-background-color3);
      color: var(--joplin-color);
      border: 1px solid var(--joplin-border-color);
      border-radius: var(--border-radius);
      cursor: pointer;
      font-weight: 600;
      font-size: 0.95em;
      letter-spacing: 0.3px;
      transition: all var(--transition-speed);
      box-shadow: 0 1px 2px rgba(0,0,0,0.1);
    }

    #journal-send:hover {
      background: var(--joplin-selected-color);
      border-color: var(--joplin-selected-color);
      color: var(--joplin-background-color);
      transform: translateY(-1px);
      box-shadow: 0 2px 4px rgba(0,0,0,0.15);
    }

    #journal-send:active {
      transform: translateY(0);
      box-shadow: 0 1px 2px rgba(0,0,0,0.1);
    }

    #journal-send:disabled {
      opacity: 0.7;
      cursor: not-allowed;
      transform: none;
      box-shadow: none;
    }

    /* Loading indicator */
    #journal-loading {
      display: none;
      padding: 8px;
      color: var(--color-muted);
      font-style: italic;
      text-align: center;
    }

    /* Reindex loading indicator */
    #journal-reindex-loading {
      display: none;
      padding: 8px;
      color: var(--color-muted);
      font-style: italic;
      text-align: center;
    }

    /* Output area with better formatting */
    #journal-output {
      flex: 1;
      white-space: pre-wrap;
      background: var(--background-color-hover2);
      color: var(--text-color);
      border: 1px solid var(--margin-color);
      border-radius: var(--border-radius);
      padding: var(--panel-spacing);
      overflow-y: auto;
      min-height: 0;
      font-size: 0.95em;
      line-height: 1.5;
    }

    #journal-output:empty {
      display: none;
    }
  </style>
  <div id="journal-panel">
    <div id="journal-panel-header" style="display:flex; align-items:center; justify-content:space-between;">
      <span>Journal Assistant</span>
      <button id="journal-reindex" title="Reindex All"
        style="background:none; border:none; cursor:pointer; font-weight:bold; font-size:1.5em; line-height:1; color:white;"
        onclick="webviewApi.postMessage({ type: 'reindex' });">
        R
      </button>
    </div>
    <div id="journal-panel-body">
      <div class="input-container">
        <textarea 
          id="journal-query" 
          placeholder="Ask any question about your notes..."
          spellcheck="true"
        ></textarea>
        <button id="journal-send">
          Ask Assistant
        </button>
        <div id="journal-reindex-loading" style="display:none; padding:8px; color: var(--color-muted); font-style: italic; text-align: center;">
          Reindexing...
        </div>
      </div>
      <div id="journal-loading">
        Thinking...
      </div>
      <pre id="journal-output"></pre>
    </div>
  </div>
  `);
  // Load the panel interaction script
  await joplin.views.panels.addScript(panel, 'panelScript.js');
  console.log('createJournalPanel: HTML injection complete');
  return panel;
}

export async function registerPanelHandlers(panel: string) {
  console.log('registerPanelHandlers: attaching onMessage listener to panel', panel);
  // Delegate incoming messages to chat logic
  await joplin.views.panels.onMessage(panel, async message => {
    console.log('registerPanelHandlers: message received from panel', message);
    if (message.type === 'query') {
      const result = await handleQuery(message.text);
      console.log('registerPanelHandlers: returning result', result);
      return result;
    }
    if (message.type === 'reindex') {
      console.log('registerPanelHandlers: reindex request received');
      await reindexAll();
      // Optionally scroll after reindex feedback
      const outputPre = document.getElementById('journal-output');
      if (outputPre) {
        outputPre.scrollTop = outputPre.scrollHeight;
      }
      return { success: true };
    }
  });
}