import { OpenAI } from "openai";
import { Ollama } from "ollama";
import { queryIndex, reindexAll, syncIndex } from "./embeddingService";
import { currentProvider } from "../cache/cache";
import { addMessage, serializeHistory, getHistory } from "./chatHelper";
import joplin from "api";
import { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import { ChatMessage } from "../models/interfaces";

const ollama = new Ollama();

export async function handleQuery(question: string): Promise<{ answer: string; history: ChatMessage[] }> {
  try {
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
    console.log('chatCompletion: sync complete, querying index');

    // Add the question to the chat history
    addMessage("user", question);
    console.log('chatCompletion: added user message to history', question);

    // Query the in-memory index for the top 5 related notes
    const snippets = await queryIndex(question, 5);
    console.log('chatCompletion: retrieved snippets', snippets);
    const context = snippets.join("\n---\n");
    console.log('chatCompletion: built context', context);

    let answer: string;

    if (useOpenAI && openaiClient) {
      // Build messages for OpenAI
      const messages: ChatCompletionMessageParam[] = [
        { role: "system", content: "You are a helpful journal assistant. Use the notes provided to answer the question." },
        ...serializeHistory(),
        { role: "user", content: `Notes:\n${context}\n\nQuestion: ${question}` },
      ];
      console.log('chatCompletion: OpenAI messages', messages);
      const chatResp = await openaiClient.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: messages,
      });
      answer = chatResp.choices[0].message.content;
      console.log('chatCompletion: OpenAI answer', answer);
    } else {
      // Build messages for Ollama (can be plain objects)
      const messages = [
        { role: "system", content: "You are a helpful journal assistant..." },
        ...serializeHistory(),
        { role: "user", content: `Notes:\n${context}\n\nQuestion: ${question}` },
      ];
      console.log('chatCompletion: Ollama messages', messages);
      const resp = await ollama.chat({
        model: "llama3.2:1b",
        messages: messages,
      });
      answer = resp.message.content;
      console.log('chatCompletion: Ollama answer', answer);
    }

    addMessage("assistant", answer);
    console.log('chatCompletion: added assistant message, history length now', serializeHistory().length);
    const fullHistory = getHistory();
    return { answer, history: fullHistory };
  } catch (error) {
    console.error('handleQuery: unexpected error', error);
    throw error;
  }
}
