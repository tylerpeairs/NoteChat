// panelScript.js
console.log('Journal Panel script: loaded');

// Cache DOM elements
const sendButton = document.getElementById('journal-send');
const queryInput = document.getElementById('journal-query');
const outputPre  = document.getElementById('journal-output');
const loadingDiv = document.getElementById('journal-loading');

// Handle send button click
sendButton.addEventListener('click', async () => {
  const text = queryInput.value;
  console.log('Journal Panel: send clicked with text:', text);

  // Show loading indicator and disable button
  if (loadingDiv) loadingDiv.style.display = 'block';
  if (sendButton) sendButton.disabled = true;

  try {
    const response = await webviewApi.postMessage({ type: 'query', text });
    console.log('Journal Panel script: received response', response);
    outputPre.innerText = response;
  } catch (error) {
    console.error('Journal Panel script: error during postMessage', error);
  } finally {
    // Hide loading indicator and re-enable button
    if (loadingDiv) loadingDiv.style.display = 'none';
    if (sendButton) sendButton.disabled = false;
  }
});

// Handle asynchronous responses from the plugin
webviewApi.onMessage(msg => {
  console.log('Journal Panel script: onMessage handler received', msg);
  outputPre.innerText = msg;

  // Ensure loading is hidden and button enabled
  if (loadingDiv) loadingDiv.style.display = 'none';
  if (sendButton) sendButton.disabled = false;
});