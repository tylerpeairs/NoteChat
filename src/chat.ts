import * as dotenv from "dotenv";
dotenv.config();

import { Ollama } from "ollama";
import { queryIndex } from "./embeddings";

const ollama = new Ollama();

export async function handleQuery(question: string): Promise<string> {

      // Query the in-memory index for the top 5 related notes
      const snippets = await queryIndex(question, 5);

      // Build full context string from retrieved note snippets
      const fullContext = snippets.join("\n---\n");

      // Use the full context without token-based truncation
      const context = fullContext;

      // Ask the LLM using RAG prompt
      const resp = await ollama.chat({
        model: "llama3.2:1b",
        messages: [
          { role: "system", content: "You are a helpful journal assistant. Use the notes provided to answer the question." },
          { role: "user", content: `Notes:\n${context}\n\nQuestion: ${question}` },
        ]
      });
      return resp.message.content;
}
