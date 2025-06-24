// panelScript.ts
declare const webviewApi: {
  postMessage: (msg: any) => Promise<any>;
  onMessage: (cb: (msg: any) => void) => void;
};

console.log('Journal Panel script: loaded');

const sendButton = document.getElementById('journal-send') as HTMLButtonElement;
const queryInput = document.getElementById('journal-query') as HTMLTextAreaElement;
const outputPre = document.getElementById('journal-output') as HTMLElement;

// Handle send button click
sendButton.addEventListener('click', async () => {
  const text: string = queryInput.value;
  console.log('Journal Panel: send clicked with text:', text);
  const response: any = await webviewApi.postMessage({ type: 'query', text });
  console.log('Journal Panel script: received response', response);
  outputPre.innerText = response;
});

// Handle asynchronous responses from the plugin
webviewApi.onMessage((msg: any) => {
  console.log('Journal Panel script: onMessage handler received', msg);
  outputPre.innerText = msg;
});