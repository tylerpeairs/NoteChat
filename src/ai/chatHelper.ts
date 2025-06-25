// src/ai/chatHistory.ts

import { ChatMessage } from "../models/interfaces";

const history: ChatMessage[] = [];

// How many *exchanges* (user+assistant) to keep
const MAX_EXCHANGES = 5;

/**
 * Add a new message to history and trim old messages.
 */
export function addMessage(role: ChatMessage["role"], content: string) {
  history.push({ role, content, timestamp: Date.now() });
  console.log('chatHistory: added message', { role, content, timestamp: Date.now() });
  // Keep at most MAX_EXCHANGES*2 messages
  const maxMsgs = MAX_EXCHANGES * 2;
  if (history.length > maxMsgs) {
    history.splice(0, history.length - maxMsgs);
  }
}

/**
 * Serialize the last messages into the shape expected by the LLM API.
 * Always places them *after* the system prompt.
 */
export function serializeHistory(): { role: ChatMessage["role"]; content: string }[] {
  const result = history.map(m => ({ role: m.role, content: m.content }));
  console.log('chatHistory: serialized history', history);
  return result;
}

/** Optional: wipe the history (e.g. on “Reset conversation”). */
export function clearHistory() {
  console.log('chatHistory: clearing history');
  history.length = 0;
}

/** Peek at current messages (for debugging or UI). */
export function getHistory(): ChatMessage[] {
  console.log('chatHistory: getHistory called, current history', history);
  return [...history];
}

/**
 * Format the current chat history into a human-readable string.
 * Each message is prefixed by its role and timestamp.
 */
export function formatHistory(): string {
  return history
    .map(m => {
      const time = new Date(m.timestamp).toLocaleTimeString();
      const prefix = m.role === "user" ? "You" : "Assistant";
      return `[${time}] ${prefix}: ${m.content}`;
    })
    .join("\n");
}