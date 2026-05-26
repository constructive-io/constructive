export type ChunkStrategy = 'fixed' | 'sentence' | 'paragraph' | 'semantic';

export interface ChunkJobPayload {
  table: string;
  schema: string;
  id: string;
  chunks_table: string;
  chunk_size: string;
  chunk_overlap: string;
  chunk_strategy: string;
}

export interface Chunk {
  content: string;
  chunk_index: number;
  metadata: Record<string, unknown>;
}

export interface EmbedderConfig {
  provider: string;
  model: string;
  baseUrl: string;
}
