# Joplin NoteChat Plugin

Chat with your notes using AI, powered by local models and cloud services. NoteChat uses semantic search to find relevant notes and provides AI-generated responses based on your personal knowledge base.

## ✨ Features

- **Smart Note Retrieval**
  - Semantic search using embeddings
  - Fast in-memory index with persistent cache
  - Incremental updates - only process changed notes

- **Flexible Chat Interface**
  - Ask questions about your notes
  - Get contextual responses based on your personal knowledge
  - Maintains chat history for follow-up questions

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
```

These commands download and cache the models in `~/.ollama`.

## Running the Plugin

1. Clone or install the plugin into Joplin’s `plugins` folder.
2. Launch Joplin and enable **NoteChat** in **Tools → Options → Plugins**.
3. Open the plugin settings (**Tools → Options → NoteChat**) to configure model and retrieval options as needed.
4. Start the Ollama server:

  ```bash
  ollama serve
  ```

5. In Joplin, open the **Journal Assistant** panel (via **View → Toggle Plugin Panel**).
6. Ask a question and press **Send**. The plugin will:
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

## License

MIT
