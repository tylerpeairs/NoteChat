

import * as dotenv from "dotenv";
dotenv.config();

import { OpenAI } from "openai";
import { ChromaClient, EmbeddingFunction } from "chromadb";
import joplin from "api";

// Initialize the OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  dangerouslyAllowBrowser: true
});

// Connect to the local Chroma vector store endpoint
const chroma = new ChromaClient({
  host: "localhost",
  port: 8001,
  ssl: false,
});

// Custom EmbeddingFunction implementation using OpenAI
const embeddingFunction: EmbeddingFunction = {
  generate: async (texts: string[]) => {
    const response = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: texts,
    });
    return response.data.map(d => d.embedding);
  },
};

/**
 * Returns the Chroma collection, creating it if necessary.
 */
export async function getCollection() {
  return await chroma.getOrCreateCollection({
    name: "joplin-journal",
    embeddingFunction,
  });
}

/**
 * Fetches all notes from Joplin in pages, generates embeddings,
 * and upserts them into the Chroma collection.
 */
export async function reindexAll() {
  console.log(`Starting full reindex at ${new Date().toISOString()}`);
  const col = await getCollection();
  let page = 1;

  // Paginate through all notes in Joplin, 50 at a time
  while (true) {
    console.log(`Fetching page ${page}…`);
    const { items } = await joplin.data.get(["notes"], {
      page,
      limit: 50,
      fields: ["id", "body", "updated_time"]
    });
    if (!items.length) break;

    // Embed and upsert each note concurrently for efficiency
    await Promise.all(items.map(async note => {
      const text = note.body.slice(0, 6000);
      const em = await openai.embeddings.create({
        model: "text-embedding-3-small",
        input: text,
      });
      await col.upsert({
        ids: [note.id],
        embeddings: [em.data[0].embedding],
        documents: [text],
        metadatas: [{ updated_time: note.updated_time }],
      });
    }));

    console.log(`Indexed ${items.length} notes on page ${page}`);
    page++;
  }

  console.log(`Reindex complete: ${page - 1} pages processed`);
}