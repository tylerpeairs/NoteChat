import joplin from "api";
import { embedText, embedTextBatch } from "./providers";
import { normalize, cosineSimilarity } from "../models/math";
const fs = require("fs").promises;
const path = require("path");

import { NoteMeta, FolderMeta, Entry, CacheFile } from "../models/interfaces";
import { loadCache, saveCache, currentProvider, lastIndexedMap } from "../cache/cache";

// Constants and in-memory state
let index: Entry[] = [];

// Full rebuild of the index
export async function reindexAll(): Promise<void> {
  if (await loadCache()) {
    console.log("reindexAll: using cached index");
    return;
  }
  index = [];
  lastIndexedMap.clear();
  console.log("reindexAll: starting full rebuild");
  let page = 1;
  while (true) {
    const { items } = (await joplin.data.get(["notes"], {
      page,
      limit: 50,
      fields: ["id", "title", "body", "updated_time", "parent_id"],
    })) as { items: NoteMeta[] };
    if (!items.length) break;
    const folderIds = Array.from(new Set(items.map(n => n.parent_id)));
    const folders = await Promise.all(
      folderIds.map(id => joplin.data.get(["folders", id], { fields: ["id", "title"] }) as Promise<FolderMeta>)
    );
    const folderMap = new Map(folders.map(f => [f.id, f.title]));
    const texts = items.map(n => {
      const folder = folderMap.get(n.parent_id) || "";
      return `${folder} > ${n.title}\n\n${n.body}`.slice(0, 2000);
    });
    console.log(`reindexAll: embedding page ${page} (${items.length} notes)`);
    const embeddings = await embedTextBatch(texts);
    embeddings.forEach((vec, i) => {
      const note = items[i];
      const combined = `${folderMap.get(note.parent_id) || ""} > ${note.title}\n\n${note.body}`;
      const entry: Entry = {
        id: note.id,
        embedding: normalize(vec),
        text: combined,
        updatedTime: note.updated_time,
      };
      index.push(entry);
      lastIndexedMap.set(note.id, note.updated_time);
    });
    page++;
  }
  console.log(`reindexAll: completed ${page - 1} pages`);
  await saveCache(index);
}

// Query top-k similar notes
export async function queryIndex(query: string, k = 5): Promise<string[]> {
  console.log(`queryIndex: querying "${query}", k=${k}`);
  const qVec = normalize(await embedText(query));
  const scored = index.map(e => ({ text: e.text, score: cosineSimilarity(qVec, e.embedding) }));
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, Math.min(k, scored.length)).map(s => s.text);
}

// Upsert a single note
export async function upsertNote(id: string): Promise<void> {
  const { openaiApiKey, lambdaApiKey } = await joplin.settings.values([
    'openaiApiKey',
    'lambdaApiKey',
  ]) as any;
  const desired = !!openaiApiKey ? "openai" : "lambda";
  if (currentProvider && currentProvider !== desired) {
    console.log(`upsertNote: provider changed, reindexing all`);
    await reindexAll();
    return;
  }
  const note = (await joplin.data.get(["notes", id], { fields: ["id","title","body","updated_time","parent_id"] })) as NoteMeta;
  const folder = (await joplin.data.get(["folders", note.parent_id], { fields: ["title"] })) as FolderMeta;
  const combined = `${folder.title} > ${note.title}\n\n${note.body}`.slice(0, 2000);
  const vec = normalize(await embedText(combined));
  const idx = index.findIndex(e => e.id === id);
  const entry: Entry = { id, embedding: vec, text: combined, updatedTime: note.updated_time };
  if (idx >= 0) index[idx] = entry;
  else index.push(entry);
  lastIndexedMap.set(id, note.updated_time);
  console.log(`upsertNote: upserted note ${id}`);
  await saveCache(index);
}

// Sync index: prune deleted & upsert changed
export async function syncIndex(): Promise<void> {
  console.log("syncIndex: reconciling missing notes");
  // Prune deleted
  const allIds = new Set<string>();
  let page = 1;
  while (true) {
    const { items } = (await joplin.data.get(["notes"], {
      page,
      limit: 100,
      fields: ["id"],
    })) as { items: { id: string }[] };
    if (!items.length) break;
    items.forEach(n => allIds.add(n.id));
    page++;
  }
  const before = index.length;
  for (let i = index.length - 1; i >= 0; i--) {
    if (!allIds.has(index[i].id)) {
      console.log(`syncIndex: removing ${index[i].id}`);
      lastIndexedMap.delete(index[i].id);
      index.splice(i, 1);
    }
  }
  console.log(`syncIndex: pruned ${before - index.length} entries`);

  // Upsert changed
  console.log("syncIndex: upserting changed notes");
  const changed: string[] = [];
  page = 1;
  while (true) {
    const { items } = (await joplin.data.get(["notes"], {
      page,
      limit: 100,
      fields: ["id","updated_time"],
    })) as { items: NoteMeta[] };
    if (!items.length) break;
    items.forEach(n => {
      const last = lastIndexedMap.get(n.id) || 0;
      if (n.updated_time > last) changed.push(n.id);
    });
    page++;
  }
  if (changed.length) {
    console.log(`syncIndex: ${changed.length} notes changed`);
    // Batch fetch and embed, reuse upsert logic
    for (const id of changed) await upsertNote(id);
  }
  await saveCache(index);
  console.log("syncIndex: complete");
}