# Joplin NoteChat Plugin

Chat with your notes using AI, powered by local embeddings and cloud chat providers. NoteChat uses semantic search to find relevant notes and provides AI-generated responses based on your personal knowledge base.

## ✨ Features

- **Smart Note Retrieval**
  - Semantic search using embeddings
  - Fast in-memory index with persistent cache
  - Incremental updates - only process changed notes

- **Flexible Chat Interface**
  - Ask questions about your notes
  - Get contextual responses based on your personal knowledge
  - Maintains chat history for follow-up questions
  - Choose chat provider: OpenAI or Lambda Labs

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
3. Open the plugin settings (**Tools → Options → NoteChat**) to configure the provider, API keys, system prompt, and retrieval options.
4. Start the Ollama server:

  ```bash
  ollama serve
  ```

5. In Joplin, open the **Journal Assistant** panel (via **View → Toggle Plugin Panel**).
6. Ask a question and press **Send**. The plugin will:
  - Embed your query and notes using Ollama’s `/api/embed` endpoint (local embeddings).
  - Perform retrieval over your note index.
  - Send a RAG prompt to your selected chat provider (OpenAI or Lambda Labs).
  - Display the response inline.

## Configuration

- **AI Provider:** Select `OpenAI` or `Lambda Labs` in `Tools → Options → NoteChat` under “AI Provider”. Configure exactly one API key (leave the other blank):
  - OpenAI API keys: https://platform.openai.com/api-keys
  - Lambda Labs API keys: https://cloud.lambdalabs.com/api-keys
  - Note: Ollama is used for embeddings only and does not provide chat completions for this plugin.

- **API Keys:**
  - Set `OpenAI API Key` if using OpenAI chat completions.
  - Set `Lambda Labs API Key` if using Lambda Inference API chat completions.
  - Configure exactly one key; the plugin enforces that only one provider is active at a time.

- **System Prompt:** Customize the assistant’s behavior using the `System Prompt` field in settings. The default encourages helpful answers grounded in your notes and citing which note was used.

- **Nearest Neighbors (RAG):** Controls how many top-matching notes are retrieved to build context for each question. Increase for broader context (potentially higher token usage), decrease for tighter focus. Default: `5`.

- **Embeddings via Ollama:** Ensure Ollama is running and the embedding model is pulled. The plugin calls the local `/api/embed` to generate vectors for your notes and queries.

## Troubleshooting

- **No Response in Panel**  
  - Ensure `ollama serve` is running on `localhost:11434`.
  - Check panel WebView console for errors.
  - Verify models are pulled: `ollama list`.
  - In plugin settings, ensure exactly one API key is configured (OpenAI or Lambda Labs) and the other is left blank.

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
