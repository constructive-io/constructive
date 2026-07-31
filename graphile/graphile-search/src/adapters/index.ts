/**
 * Search Adapter Exports
 *
 * Each adapter implements the SearchAdapter interface for a specific
 * search algorithm. They are plain objects — not Graphile plugins.
 */

export type { Bm25AdapterOptions, Bm25IndexInfo } from './bm25';
export { createBm25Adapter } from './bm25';
export type { ChunksInfo } from './chunks';
export { getChunksInfo } from './chunks';
export type { PgvectorAdapterOptions } from './pgvector';
export { createPgvectorAdapter } from './pgvector';
export type { TrgmAdapterOptions } from './trgm';
export { createTrgmAdapter } from './trgm';
export type { TsvectorAdapterOptions } from './tsvector';
export { createTsvectorAdapter } from './tsvector';
