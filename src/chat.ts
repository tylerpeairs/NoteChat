import { getCollection } from "./embeddings";
import { OpenAI } from "openai";

/**
 * Initialize the OpenAI client for chat interactions.
 */
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  dangerouslyAllowBrowser: true
});

export async function handleQuery(question: string): Promise<string> {

      // Retrieve or create the embeddings collection
      const col = await getCollection();

      // Embed the user's question
      const qEmResp = await openai.embeddings.create({
        model: "text-embedding-3-small",
        input: question,
      });
      const qEmbedding = qEmResp.data[0].embedding;

      // Query Chroma for the top 5 related notes
      const results = await col.query({
        queryEmbeddings: [qEmbedding],
        nResults: 5,
      });

      // Build full context string from retrieved note snippets
      const fullContext = results.documents.flat().join("\n---\n");

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
