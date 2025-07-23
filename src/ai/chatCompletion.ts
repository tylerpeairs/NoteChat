import { OpenAI } from "openai";
import { queryIndex, reindexAll, syncIndex } from "./embeddingService";
import { currentProvider } from "../cache/cache";
import { addMessage, serializeHistory, formatHistory } from "./chatHelper";
import joplin from "api";
import { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import { ChatMessage } from "../models/interfaces";

export async function handleQuery(question: string): Promise<string> {
  try {
    // Fetch latest settings
    const { openaiApiKey, lambdaApiKey } =
      await joplin.settings.values(['openaiApiKey', 'lambdaApiKey']) as any;
    console.log(`handleQuery: settings openaiApiKeySet=${!!openaiApiKey}, lambdaApiKeySet=${!!lambdaApiKey}`);
    const desiredProvider = !!openaiApiKey ? 'openai' : 'lambda';
    if (currentProvider && currentProvider !== desiredProvider) {
      console.log(`handleQuery: embedding provider changed from ${currentProvider} to ${desiredProvider}, running full reindex`);
      await reindexAll();
    }
    console.log('handleQuery: syncing changed notes before query');
    await syncIndex();
    console.log('chatCompletion: sync complete, querying index');


    console.log('chatCompletion: added user message to history', question);

    // Query the in-memory index for the top 5 related notes
    const snippets = await queryIndex(question, 5);
    console.log('chatCompletion: retrieved snippets', snippets);
    const context = snippets.join("\n---\n");
    console.log('chatCompletion: built context', context);

    let answer: string;

    // Lambda Inference API branch
    if (lambdaApiKey) {
      console.log('chatCompletion: using Lambda Inference API for chat completion');
      const lambdaClient = new OpenAI({
        apiKey: lambdaApiKey,
        baseURL: 'https://api.lambda.ai/v1',
        dangerouslyAllowBrowser: true,
      });
      const messages = [
        { role: 'system', content: 'You are a helpful journal assistant. Use the notes provided to answer the question.' },
        ...serializeHistory(),
        { role: 'user', content: `Notes:\n${context}\n\nQuestion: ${question}` },
      ];
      console.log('chatCompletion: Lambda messages', messages);
      const chatResp = await lambdaClient.chat.completions.create({
        model: 'llama3.1-8b-instruct',
        messages: messages as ChatCompletionMessageParam[],
      });
      answer = chatResp.choices[0].message.content;
      console.log('chatCompletion: Lambda answer', answer);
    } else if (openaiApiKey) {
      // Build messages for OpenAI
      const openaiClient = new OpenAI({ apiKey: openaiApiKey, dangerouslyAllowBrowser: true });
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
      throw new Error('Please configure either Lambda API key or OpenAI API key.');
    }
    // Add the question & answer to the chat history
    addMessage("user", question);
    addMessage("assistant", answer);
    console.log('chatCompletion: added user & assistant message, history length now', serializeHistory().length);

    const formatted = formatHistory();
    console.log('chatCompletion: returning string-formatted history', formatted);
    return formatted;
  } catch (error) {
    console.error('handleQuery: unexpected error', error);
    throw error;
  }
}
