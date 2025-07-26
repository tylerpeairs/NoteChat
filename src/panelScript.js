// panelScript.js
console.log('Journal Panel script: loaded');

// Cache DOM elements
const sendButton = document.getElementById('journal-send');
const queryInput = document.getElementById('journal-query');
const outputPre  = document.getElementById('journal-output');
const loadingDiv = document.getElementById('journal-loading');
const reindexBtn = document.getElementById('journal-reindex');
const reindexLoading = document.getElementById('journal-reindex-loading');

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

// Handle reindex button click
if (reindexBtn && reindexLoading) {
  reindexBtn.addEventListener('click', async () => {
    console.log('Journal Panel: reindex clicked');
    reindexLoading.style.display = 'block';
    reindexBtn.disabled = true;
    try {
      const result = await webviewApi.postMessage({ type: 'reindex' });
      console.log('Journal Panel script: reindex result', result);
    } catch (error) {
      console.error('Journal Panel script: error during reindex', error);
    } finally {
      reindexLoading.style.display = 'none';
      reindexBtn.disabled = false;
    }
  });
}

// Handle asynchronous responses from the plugin
webviewApi.onMessage(msg => {
  console.log('Journal Panel script: onMessage handler received', msg);
  outputPre.innerText = msg;

  // Ensure loading is hidden and button enabled
  if (loadingDiv) loadingDiv.style.display = 'none';
  if (sendButton) sendButton.disabled = false;
});
