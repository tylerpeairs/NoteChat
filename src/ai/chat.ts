import { OpenAI } from "openai";
import { Ollama } from "ollama";
import { queryIndex, reindexAll, syncIndex } from "./embeddingService";
import { currentProvider } from "../cache/cache";
import joplin from "api";

const ollama = new Ollama();

export async function handleQuery(question: string): Promise<string> {

      // Fetch latest settings
      const { openaiApiKey, useLocalModel } = await joplin.settings.values(['openaiApiKey', 'useLocalModel']) as any;
      console.log(`handleQuery: settings openaiApiKeySet=${!!openaiApiKey}, useLocalModel=${useLocalModel}`);
      const openaiClient = openaiApiKey && !useLocalModel
        ? new OpenAI({ apiKey: openaiApiKey, dangerouslyAllowBrowser: true })
        : null;
      const useOpenAI = !!openaiClient;
      console.log(`handleQuery: using ${useOpenAI ? 'OpenAI' : 'Ollama'} for chat completion`);
      const desiredProvider = useOpenAI ? 'openai' : 'ollama';
      if (currentProvider && currentProvider !== desiredProvider) {
        console.log(`handleQuery: embedding provider changed from ${currentProvider} to ${desiredProvider}, running full reindex`);
        await reindexAll();
      }
      console.log('handleQuery: syncing changed notes before query');
      await syncIndex();
      // Query the in-memory index for the top 5 related notes
      const snippets = await queryIndex(question, 5);

      // Build full context string from retrieved note snippets
      const fullContext = snippets.join("\n---\n");

      // Use the full context without token-based truncation
      const context = fullContext;

      if (useOpenAI && openaiClient) {
        const chatResp = await openaiClient.chat.completions.create({
          model: "gpt-3.5-turbo",
          messages: [
            { role: "system", content: "You are a helpful journal assistant. Use the notes provided to answer the question." },
            { role: "user", content: `Notes:\n${context}\n\nQuestion: ${question}` },
          ],
        });
        return chatResp.choices[0].message.content;
      } else {
        const resp = await ollama.chat({
          model: "llama3.2:1b",
          messages: [
            { role: "system", content: "You are a helpful journal assistant. Use the notes provided to answer the question." },
            { role: "user", content: `Notes:\n${context}\n\nQuestion: ${question}` },
          ],
        });
        return resp.message.content;
      }
}
