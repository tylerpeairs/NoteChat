

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
  provider: 'openai' | 'ollama';
  entries: Entry[];
}