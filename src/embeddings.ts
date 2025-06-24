import joplin from "api";
import { Ollama } from "ollama";
const ollama = new Ollama();

interface NoteMeta {
  id: string;
  title: string;
  body: string;
  updated_time: number;
  parent_id: string;
}

interface FolderMeta {
  id: string;
  title: string;
}

const fs = require('fs').promises;
const path = require('path');

// Path to cache file
const CACHE_FILENAME = "index-cache.json";

// Compute full cache path in plugin data directory
async function getCachePath(): Promise<string> {
  const dataDir = await joplin.plugins.dataDir();
  return `${dataDir}/${CACHE_FILENAME}`;
}

// Load cache into memory; return true if loaded, false otherwise
export async function loadCache(): Promise<boolean> {
  const cachePath = await getCachePath();
  try {
    const text = await fs.readFile(cachePath, "utf-8");
    const data = JSON.parse(text) as Entry[];
    index.length = 0;
    data.forEach(e => index.push(e));
    console.log(`Loaded index cache: ${index.length} entries`);
    return true;
  } catch {
    console.log("No cache found, full reindex needed");
    return false;
  }
}

// Save current in-memory index to cache
async function saveCache(): Promise<void> {
  const cachePath = await getCachePath();
  await fs.mkdir(path.dirname(cachePath), { recursive: true });
  await fs.writeFile(cachePath, JSON.stringify(index), "utf-8");
  console.log(`Saved index cache: ${index.length} entries`);
}

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
  if (await loadCache()) {
    console.log("reindexAll: using cached index");
    return;
  }
  index.length = 0;
  console.log('reindexAll: Clearing in-memory index and starting full reindex.');
  let page = 1;
  console.log(`Starting full reindex at ${new Date().toISOString()}`);
  while (true) {
    console.log(`reindexAll: current index size = ${index.length}`);
    console.log(`Fetching page ${page}`);
    const { items } = (await joplin.data.get(["notes"], {
      page,
      limit: 50,
      fields: ["id", "title", "body", "updated_time", "parent_id"],
    })) as { items: NoteMeta[] };
    if (!items.length) break;
    // Fetch folder titles for this page of notes
    const folderIds = Array.from(new Set(items.map(n => n.parent_id)));
    const folders = await Promise.all(folderIds.map(async id =>
      (await joplin.data.get(["folders", id], { fields: ["id", "title"] })) as FolderMeta
    ));
    const folderMap = new Map(
      folders.map(f => [String((f as any).id), String((f as any).title)])
    );
    // Prepare page texts truncated to MAX_CHARS, including folder title, title and body
    const texts = items.map(note => {
      const folderTitle = folderMap.get(note.parent_id) || "";
      const combined = `${folderTitle} > ${note.title}\n\n${note.body}`;
      return combined.slice(0, MAX_CHARS);
    });
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
        text: `${folderMap.get(note.parent_id) || ""} > ${note.title}\n\n${note.body}`,
        updatedTime: note.updated_time,
      });
      console.log(`reindexAll: note ${note.id} indexed. Total entries = ${index.length}`);
    });
    console.log(`Indexed ${items.length} notes on page ${page}`);
    page++;
  }
  console.log(`Reindex complete: ${page - 1} pages processed`);
  await saveCache();
}

/**
 * Upsert a single note into the index on change.
 */
export async function upsertNote(id: string) {
  console.log(`upsertNote: received change event for note ${id}`);
  const respNote = (await joplin.data.get(["notes", id], {
    fields: ["title", "body", "updated_time", "parent_id"],
  })) as NoteMeta;
  const folder = await joplin.data.get(["folders", respNote.parent_id], { fields: ["title"] });
  const folderTitle = folder.title;
  const combined = `${folderTitle} > ${respNote.title}\n\n${respNote.body}`;
  const text = combined.slice(0, MAX_CHARS);
  const rawEmbedding = await embedText(text);
  const vec = normalize(rawEmbedding);
  console.log(`upsertNote: embedding for note ${id} computed.`);
  const idx = index.findIndex(e => e.id === id);
  const entry = {
    id,
    embedding: vec,
    text: combined,
    updatedTime: respNote.updated_time,
  };
  if (idx >= 0) index[idx] = entry;
  else index.push(entry);
  console.log(`upsertNote: note ${id} upserted. Index size now = ${index.length}`);
  await saveCache();
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

/**
 * Reconcile the in-memory index against existing notes, removing entries for deleted notes.
 */
export async function reconcileIndex(): Promise<void> {
  console.log('reconcileIndex: fetching all note IDs from Joplin');
  const allIds = new Set<string>();
  let page = 1;
  while (true) {
    const { items } = (await joplin.data.get(['notes'], {
      page,
      limit: 100,
      fields: ['id'],
    })) as { items: { id: string }[] };
    if (!items.length) break;
    items.forEach(n => allIds.add(n.id));
    page++;
  }
  const beforeCount = index.length;
  // Filter out entries whose note no longer exists
  for (let i = index.length - 1; i >= 0; i--) {
    if (!allIds.has(index[i].id)) {
      console.log(`reconcileIndex: removing missing note ${index[i].id}`);
      index.splice(i, 1);
    }
  }
  const afterCount = index.length;
  console.log(`reconcileIndex: pruned ${beforeCount - afterCount} entries; ${afterCount} remain`);
  // Save updated index to cache
  await saveCache();
}