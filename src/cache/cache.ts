import joplin from "api";
import { Entry, CacheFile } from "../models/interfaces";
const fs = require("fs").promises;
const path = require("path");


// In-memory state
export let currentProvider: "openai" | "lambda" | null = null;
export const lastIndexedMap: Map<string, number> = new Map();

// Constants
const CACHE_FILENAME = "index-cache.json";

// Compute full cache path in plugin data directory
export async function getCachePath(): Promise<string> {
  const dataDir = await joplin.plugins.dataDir();
  return `${dataDir}/${CACHE_FILENAME}`;
}

// Load cache into memory; return true if loaded and valid, false otherwise
export async function loadCache(): Promise<boolean> {
  const cachePath = await getCachePath();
  try {
    const text = await fs.readFile(cachePath, "utf-8");
    const cacheObj = JSON.parse(text) as CacheFile;

    // Determine desired provider from settings
    const { openaiApiKey, lambdaApiKey } = (await joplin.settings.values([
      "openaiApiKey",
      "lambdaApiKey",
    ])) as any;
    const useOpenAI = !!openaiApiKey;
    const desired = useOpenAI ? "openai" : "lambda";

    if (cacheObj.provider !== desired) {
      console.log("cache: provider changed, invalidating cache");
      return false;
    }

    // Populate lastIndexedMap and set currentProvider
    lastIndexedMap.clear();
    cacheObj.entries.forEach(e => lastIndexedMap.set(e.id, e.updatedTime));
    currentProvider = cacheObj.provider;
    console.log(`cache: loaded ${cacheObj.entries.length} entries using ${currentProvider}`);
    return true;
  } catch (e) {
    console.log("cache: no valid cache found, need full reindex");
    return false;
  }
}

// Save in-memory index to disk
export async function saveCache(entries: Entry[]): Promise<void> {
  const cachePath = await getCachePath();
  await fs.mkdir(path.dirname(cachePath), { recursive: true });

  // Determine provider
  const { openaiApiKey, lambdaApiKey } = (await joplin.settings.values([
    "openaiApiKey",
    "lambdaApiKey",
  ])) as any;
  const useOpenAI = !!openaiApiKey;
  const provider: CacheFile["provider"] = useOpenAI ? "openai" : "lambda";

  const cacheObj: CacheFile = {
    provider,
    entries,
  };

  await fs.writeFile(cachePath, JSON.stringify(cacheObj), "utf-8");
  currentProvider = provider;
  console.log(`cache: saved ${entries.length} entries with provider=${provider}`);
}
