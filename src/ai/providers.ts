import joplin from "api";
import { Ollama } from "ollama";
import { normalize } from "../models/math";

const ollama = new Ollama();
const MAX_CHARS = 2000;

console.log(`Embeddings module loaded. MAX_CHARS =`, MAX_CHARS);

export async function embedText(text: string): Promise<number[]> {
  console.log('embedText: using Ollama for embeddings');
  
  const resp = await ollama.embed({
    model: "all-minilm:22m-l6-v2-fp16",
    input: text.slice(0, MAX_CHARS),
    truncate: true,
  });
  
  const vec = (resp.embeddings as number[][])[0];
  return normalize(vec);
}

/**
 * Batch-embed an array of texts via Ollama.
 */
export async function embedTextBatch(texts: string[]): Promise<number[][]> {
  const resp = await ollama.embed({
    model: "all-minilm:22m-l6-v2-fp16",
    input: texts.map(t => t.slice(0, MAX_CHARS)),
    truncate: true,
  });
  return (resp.embeddings as number[][]).map(v => normalize(v));
}
