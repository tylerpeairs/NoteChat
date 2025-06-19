import { queryIndex } from "./embeddings";
import { OpenAI } from "openai";

/**
 * Initialize the OpenAI client for chat interactions.
 */
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  dangerouslyAllowBrowser: true
});

export async function handleQuery(question: string): Promise<string> {

      // Query the in-memory index for the top 5 related notes
      const snippets = await queryIndex(question, 5);

      // Build full context string from retrieved note snippets
      const fullContext = snippets.join("\n---\n");

      // Use the full context without token-based truncation
      const context = fullContext;

      // Ask the LLM using RAG prompt
      const chatResp = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "You are a helpful journal assistant. Use the notes provided to answer the question." },
          { role: "user", content: `Notes:\n${context}\n\nQuestion: ${question}` },
        ],
      });
      
      return chatResp.choices[0].message.content;
}
