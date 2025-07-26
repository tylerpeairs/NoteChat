

/**
 * Metadata for a Joplin note.
 */
export interface NoteMeta {
  id: string;
  title: string;
  body: string;
  updated_time: number;
  parent_id: string;
}

/**
 * Metadata for a Joplin folder/notebook.
 */
export interface FolderMeta {
  id: string;
  title: string;
}

/**
 * A single indexed entry: combines embedding vector and note context.
 */
export interface Entry {
  id: string;
  embedding: number[];
  text: string;
  updatedTime: number;
}

/**
 * Structure of the on-disk cache file.
 */
export interface CacheFile {
  provider: 'openai' | 'lambda';
  entries: Entry[];
}

/**
 * A single chat message in the in-session history.
 */
export interface ChatMessage {
  /** Who sent the message */
  role: 'user' | 'assistant';
  /** The message content */
  content: string;
  /** Unix timestamp in milliseconds when the message was added */
  timestamp: number;
}

/**
 * The chat history within a session.
 */
export type ChatHistory = ChatMessage[];
