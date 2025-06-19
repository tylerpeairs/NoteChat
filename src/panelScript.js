

// panelScript.js
console.log('Journal Panel script: loaded');

// Handle send button click
document.getElementById('journal-send').addEventListener('click', async () => {
  const text = document.getElementById('journal-query').value;
  console.log('Journal Panel: send clicked with text:', text);
  // Send the query to the plugin and await the response
  const response = await webviewApi.postMessage({ type: 'query', text });
  console.log('Journal Panel script: received response', response);
  document.getElementById('journal-output').innerText = response;
});

// Handle asynchronous responses from the plugin
webviewApi.onMessage(msg => {
  console.log('Journal Panel script: onMessage handler received', msg);
  document.getElementById('journal-output').innerText = msg;
});