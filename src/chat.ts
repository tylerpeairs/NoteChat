import { getCollection } from "./embeddings";
import { OpenAI } from "openai";
import { init, Tiktoken } from "@dqbd/tiktoken/init";
// @ts-ignore: import WASM via CommonJS require
const wasm = require("@dqbd/tiktoken/tiktoken_bg.wasm");
// @ts-ignore: import JSON encoder via CommonJS require
const modelJson = require("@dqbd/tiktoken/encoders/cl100k_base.json");

/**
 * Initialize the OpenAI client for chat interactions.
 */
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  dangerouslyAllowBrowser: true
});

// Maximum tokens allowed in context
const MAX_CONTEXT_TOKENS = 1500;

// Initialize tiktoken WASM
(async () => {
  await init((imports) => WebAssembly.instantiate(wasm, imports));
})();

/**
 * Registers plugin commands: reindex all notes and chat with the journal.
 */
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

      // Token-aware truncation using Tiktoken
      const encoder = new Tiktoken(modelJson.bpe_ranks, modelJson.special_tokens, modelJson.pat_str);
      const tokens = encoder.encode(fullContext);
      console.log(`Context token count = ${tokens.length}`);
      let context = fullContext;
      if (tokens.length > MAX_CONTEXT_TOKENS) {
        console.log(`Context truncated: original token count = ${tokens.length}, max allowed = ${MAX_CONTEXT_TOKENS}`);
        const truncatedTokens = tokens.slice(0, MAX_CONTEXT_TOKENS);
        context = encoder.decode(truncatedTokens) + "\n...(truncated)...";
      }
      encoder.free();


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
