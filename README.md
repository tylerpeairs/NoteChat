# Joplin NoteChat Plugin

A Joplin plugin that enables you to chat with your notes using retrieval-augmented generation. This plugin can use Ollama for fully local embeddings and chat completion.

## Features

- In-memory semantic search over your Joplin notes using Ollama embeddings.
- Local chat completion via Ollama’s Llama-3.2:1b model.
- Automatic model download and caching via Ollama CLI.
- Incremental indexing and persistent cache for fast startup.

## Prerequisites

- **Joplin** desktop app (v2.8+)
- **Ollama** installed and running locally.

### Install Ollama

- **macOS (Homebrew):**

  ```bash
  brew install ollama
  ```

- **Windows / Linux:**

  Follow instructions at https://ollama.com/docs/installation

## Model Setup

Open a terminal and run:

```bash
# Pull the embedding model (all-MiniLM-L6-v2)
ollama pull all-minilm:22m-l6-v2-fp16

# Pull the chat model (Llama-3.2 1B parameters)
ollama pull llama3.2:1b
```

These commands download and cache the models in `~/.ollama`.

## Running the Plugin

1. Clone or install the plugin into Joplin’s `plugins` folder.
2. Launch Joplin and enable **NoteChat** in **Tools → Options → Plugins**.
3. Start the Ollama server:

   ```bash
   ollama serve
   ```

4. In Joplin, open the **Journal Assistant** panel (via **View → Toggle Plugin Panel**).
5. Ask a question and press **Send**. The plugin will:
   - Embed your query and notes using Ollama’s `/api/embed` endpoint.
   - Perform retrieval over your note index.
   - Send a RAG prompt to Ollama’s chat completion endpoint.
   - Display the response inline.

## Troubleshooting

- **No Response in Panel**  
  - Ensure `ollama serve` is running on `localhost:11434`.
  - Check panel WebView console for errors.
  - Verify models are pulled: `ollama list`.

- **Cache Issues**  
  - Remove plugin data directory:  
    ```bash
    rm -rf "$(joplin.plugins.dataDir)/index-cache.json"
    ```
  - Reload Joplin to trigger full reindex.

## Contributing

Feel free to open issues or pull requests on GitHub.

## Privacy

When you supply an `openaiApiKey` in the plugin settings, note content is transmitted to OpenAI for processing. Consider using the local model if you do not want your notes sent to OpenAI.

## License

MIT
