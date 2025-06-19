import joplin from "api";
import { Ollama } from "ollama";
const ollama = new Ollama();

/**
 * Embed text via local Ollama all-minilm model.
 */
async function embedText(text: string): Promise<number[]> {
  const resp = await ollama.embed({
    model: "all-minilm:22m-l6-v2-fp16",
    input: text.slice(0, MAX_CHARS),
    truncate: true,
  });
  // Return the first embedding (for the single input)
  return (resp.embeddings as number[][])[0];
}

/**
 * Batch-embed an array of texts via Ollama.
 */
async function embedTextBatch(texts: string[]): Promise<number[][]> {
  const resp = await ollama.embed({
    model: "all-minilm:22m-l6-v2-fp16",
    input: texts.map(t => t.slice(0, MAX_CHARS)),
    truncate: true,
  });
  return resp.embeddings as number[][];
}

/**
 * In-memory vector index entry.
 */
interface Entry {
  id: string;
  embedding: number[];
  text: string;
  updatedTime: number;
}

const MAX_CHARS = 2000;
console.log(`Embeddings module loaded. MAX_CHARS =`, MAX_CHARS);

// In‐memory store for embeddings
const index: Entry[] = [];

/**
 * Normalize a vector to unit length.
 */
function normalize(v: number[]): number[] {
  const norm = Math.hypot(...v) || 1;
  return v.map(x => x / norm);
}

/**
 * Cosine similarity between two vectors.
 */
function cosine(a: number[], b: number[]): number {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return dot / (Math.sqrt(na) * Math.sqrt(nb) || 1);
}

/**
 * Full reindex: fetches all notes, embeds up to MAX_CHARS, and populates the index.
 */
export async function reindexAll() {
  index.length = 0;
  console.log('reindexAll: Clearing in-memory index and starting full reindex.');
  let page = 1;
  console.log(`Starting full reindex at ${new Date().toISOString()}`);
  while (true) {
    console.log(`reindexAll: current index size = ${index.length}`);
    console.log(`Fetching page ${page}`);
    const { items } = await joplin.data.get(["notes"], {
      page,
      limit: 50,
      fields: ["id", "body", "updated_time"],
    });
    if (!items.length) break;
    // Prepare page texts truncated to MAX_CHARS
    const texts = items.map(note => note.body.slice(0, MAX_CHARS));
    console.log(`reindexAll: batch embedding ${texts.length} notes on page ${page}`);
    const embeddings = await embedTextBatch(texts);
    // Upsert each note with its corresponding embedding
    embeddings.forEach((rawEmbedding, i) => {
      const note = items[i];
      console.log(`reindexAll: embedding received for note ${note.id}`);
      const vec = normalize(rawEmbedding);
      index.push({
        id: note.id,
        embedding: vec,
        text: note.body,
        updatedTime: note.updated_time,
      });
      console.log(`reindexAll: note ${note.id} indexed. Total entries = ${index.length}`);
    });
    console.log(`Indexed ${items.length} notes on page ${page}`);
    page++;
  }
  console.log(`Reindex complete: ${page - 1} pages processed`);
}

/**
 * Upsert a single note into the index on change.
 */
export async function upsertNote(id: string) {
  console.log(`upsertNote: received change event for note ${id}`);
  const respNote = await joplin.data.get(["notes", id], {
    fields: ["body", "updated_time"],
  });
  const text = respNote.body.slice(0, MAX_CHARS);
  const rawEmbedding = await embedText(text);
  const vec = normalize(rawEmbedding);
  console.log(`upsertNote: embedding for note ${id} computed.`);
  const idx = index.findIndex(e => e.id === id);
  const entry = {
    id,
    embedding: vec,
    text: respNote.body,
    updatedTime: respNote.updated_time,
  };
  if (idx >= 0) index[idx] = entry;
  else index.push(entry);
  console.log(`upsertNote: note ${id} upserted. Index size now = ${index.length}`);
}

/**
 * Query the in-memory index: returns top-k note texts.
 */
export async function queryIndex(query: string, k = 5): Promise<string[]> {
  console.log(`queryIndex: querying for "${query}", top k = ${k}`);
  const rawEmbedding = await embedText(query);
  const qv = normalize(rawEmbedding);
  console.log('queryIndex: query embedding normalized.');
  const scored = index.map(e => ({
    text: e.text,
    score: cosine(qv, e.embedding),
  }));
  scored.sort((a, b) => b.score - a.score);
  console.log(`queryIndex: returning ${Math.min(k, index.length)} results`);
  return scored.slice(0, k).map(s => s.text);
}