import joplin from 'api';
import { handleQuery } from "../../ai/chatCompletion";

export async function createJournalPanel(panelId: string) {
  console.log('createJournalPanel: initializing panel creation');
  const panel = await joplin.views.panels.create(panelId);
  console.log('createJournalPanel: panel created with handle', panel);
  console.log('createJournalPanel: injecting HTML into panel');
  await joplin.views.panels.setHtml(panel, `
  <style>
    /* Container spans full height and uses theme colors */
    #journal-panel {
      display: flex;
      flex-direction: column;
      height: 100%;
      background: var(--background-color);
      color: var(--text-color);
    }
    /* Header bar */
    #journal-panel-header {
      padding: 8px;
      font-weight: bold;
      border-bottom: 1px solid var(--margin-color);
      font-size: 1.1em;
    }
    /* Body scrollable */
    #journal-panel-body {
      flex: 1;
      overflow: auto;
      padding: 8px;
    }
    /* Input styling */
    #journal-query {
      width: 100%;
      box-sizing: border-box;
      height: 80px;
      margin-bottom: 8px;
      background: var(--background-color);
      color: var(--text-color);
      border: 1px solid var(--margin-color);
      padding: 4px;
    }
    /* Send button */
    #journal-send {
      padding: 6px 12px;
      margin-bottom: 8px;
      background: var(--button-background-color);
      color: var(--button-text-color);
      border: none;
      cursor: pointer;
    }
    /* Output area */
    #journal-output {
      white-space: pre-wrap;
      background: var(--background-color-highlight);
      color: var(--text-color);
      border: 1px solid var(--margin-color);
      padding: 4px;
      overflow-y: auto;
    }
  </style>
  <div id="journal-panel">
    <div id="journal-panel-header">Journal Assistant</div>
    <div id="journal-panel-body">
      <textarea id="journal-query" placeholder="Ask a question..."></textarea>
      <button id="journal-send">Send</button>
      <div id="journal-loading" style="display:none; padding:4px; font-style:italic;">
        Loading…
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
      // Pass the query text to the chat module and return its response
      const result = await handleQuery(message.text);
      console.log('registerPanelHandlers: handleQuery returned', result);
      return result;
    }
  });
}