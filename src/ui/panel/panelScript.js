// panelScript.js
console.log('Journal Panel script: loaded');

// Cache DOM elements
const sendButton = document.getElementById('journal-send');
const queryInput = document.getElementById('journal-query');
const outputPre  = document.getElementById('journal-output');
const loadingDiv = document.getElementById('journal-loading');

console.log('Journal Panel script: DOM elements', {
  sendButton,
  queryInput,
  outputPre,
  loadingDiv,
});

// Check if webviewApi is available
console.log('Journal Panel script: typeof webviewApi', typeof webviewApi, webviewApi);

// Handle send button click
sendButton?.addEventListener('click', async () => {
  const text = queryInput?.value;
  console.log('Journal Panel: send clicked with text:', text);

  // Show loading indicator and disable button
  if (loadingDiv) loadingDiv.style.display = 'block';
  if (sendButton) sendButton.disabled = true;

  try {
    console.log('Journal Panel script: sending postMessage...');
    const response = await webviewApi.postMessage({ type: 'query', text });
    console.log('Journal Panel script: received response', response);
    outputPre.innerText = typeof response === 'string' ? response : JSON.stringify(response, null, 2);
  } catch (error) {
    console.error('Journal Panel script: error during postMessage', error);
    outputPre.innerText = 'Error: ' + error;
  } finally {
    // Hide loading indicator and re-enable button
    if (loadingDiv) loadingDiv.style.display = 'none';
    if (sendButton) sendButton.disabled = false;
    console.log('Journal Panel script: loading hidden, button enabled');
  }
});

// Handle asynchronous responses from the plugin
if (typeof webviewApi !== 'undefined' && webviewApi.onMessage) {
  webviewApi.onMessage(msg => {
    console.log('Journal Panel script: onMessage handler received', msg);
    outputPre.innerText = typeof msg === 'string' ? msg : JSON.stringify(msg, null, 2);

    // Ensure loading is hidden and button enabled
    if (loadingDiv) loadingDiv.style.display = 'none';
    if (sendButton) sendButton.disabled = false;
    console.log('Journal Panel script: onMessage loading hidden, button enabled');
  });
} else {
  console.warn('Journal Panel script: webviewApi.onMessage is not available');
}