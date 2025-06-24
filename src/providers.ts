import joplin from "api";
import { OpenAI } from "openai";
import { Ollama } from "ollama";
import { normalize } from "./utils/math";

const ollama = new Ollama();

const MAX_CHARS = 2000;
console.log(`Embeddings module loaded. MAX_CHARS =`, MAX_CHARS);

/**
 * Determine whether to use OpenAI based on user settings.
 */
async function shouldUseOpenAI(): Promise<boolean> {
  const { openaiApiKey, useLocalModel } = (await joplin.settings.values([
    "openaiApiKey",
    "useLocalModel",
  ])) as any;
  return !!openaiApiKey && !useLocalModel;
}

export async function embedText(text: string): Promise<number[]> {
  // Fetch current settings
  const { openaiApiKey, useLocalModel } = (await joplin.settings.values(['openaiApiKey','useLocalModel'])) as any;
  console.log(`embedText: settings: openaiApiKeySet=${!!openaiApiKey}, useLocalModel=${useLocalModel}`);
  const openaiClient = openaiApiKey && !useLocalModel
    ? new OpenAI({ apiKey: openaiApiKey, dangerouslyAllowBrowser: true })
    : null;
  const useOpenAI = !!openaiClient;
  console.log('embedText: using', useOpenAI ? 'OpenAI' : 'Ollama', 'for embeddings');
  if (useOpenAI && openaiClient) {
    const resp = await openaiClient.embeddings.create({
      model: "text-embedding-3-small",
      input: text,
    });
    return normalize(resp.data[0].embedding);
  } else {
    const resp = await ollama.embed({
      model: "all-minilm:22m-l6-v2-fp16",
      input: text.slice(0, MAX_CHARS),
      truncate: true,
    });
    // Ollama returns embeddings array of arrays; single input gives [[...]]
    return normalize((resp.embeddings as number[][])[0]);
  }
}

/**
 * Batch-embed an array of texts via OpenAI if API key is set, otherwise via Ollama.
 */
export async function embedTextBatch(texts: string[]): Promise<number[][]> {
  const { openaiApiKey, useLocalModel } = (await joplin.settings.values(['openaiApiKey','useLocalModel'])) as any;
  console.log(`embedTextBatch: settings: openaiApiKeySet=${!!openaiApiKey}, useLocalModel=${useLocalModel}`);
  const openaiClient = openaiApiKey && !useLocalModel
    ? new OpenAI({ apiKey: openaiApiKey, dangerouslyAllowBrowser: true })
    : null;
  const useOpenAI = !!openaiClient;
  console.log('embedTextBatch: using', useOpenAI ? 'OpenAI' : 'Ollama', 'for batch embeddings');
  if (useOpenAI && openaiClient) {
    const resp = await openaiClient.embeddings.create({
      model: "text-embedding-3-small",
      input: texts,
    });
    return resp.data.map(e => normalize(e.embedding));
  } else {
    const resp = await ollama.embed({
      model: "all-minilm:22m-l6-v2-fp16",
      input: texts.map(t => t.slice(0, MAX_CHARS)),
      truncate: true,
    });
    return (resp.embeddings as number[][]).map(v => normalize(v));
  }
}