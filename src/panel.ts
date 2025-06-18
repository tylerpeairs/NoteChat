import joplin from 'api';
import { handleQuery } from "./chat";

export async function createJournalPanel() {
  const panel = await joplin.views.panels.create('journalPanel');
  await joplin.views.panels.setHtml(panel, `
    <div>
      <textarea id="query" style="width:100%;height:80px;"></textarea>
      <button id="send">Send</button>
      <pre id="output"></pre>
    </div>
    <script>
      document.getElementById('send').addEventListener('click', async () => {
        const text = (document.getElementById('query') as HTMLTextAreaElement).value;
        const response = await webviewApi.postMessage({ type: 'query', text });
        document.getElementById('output').innerText = response;
      });
      webviewApi.onMessage(msg => {
        // handle plugin-initiated messages if needed
      });
    </script>
  `);
  return panel;
}

export async function registerPanelHandlers(panel: string) {
  // Delegate incoming messages to chat logic
  await joplin.views.panels.onMessage(panel, async message => {
    if (message.type === 'query') {
      // Pass the query text to the chat module and return its response
      return await handleQuery(message.text);
    }
  });
}