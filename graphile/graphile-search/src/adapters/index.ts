/**
 * Search Adapter Exports
 *
 * Each adapter implements the SearchAdapter interface for a specific
 * search algorithm. They are plain objects — not Graphile plugins.
 */

export { createTsvectorAdapter } from './tsvector';
export type { TsvectorAdapterOptions } from './tsvector';

export { createBm25Adapter } from './bm25';
export type { Bm25AdapterOptions, Bm25IndexInfo } from './bm25';

export { createTrgmAdapter } from './trgm';
export type { TrgmAdapterOptions } from './trgm';

export { createPgvectorAdapter } from './pgvector';
export type { PgvectorAdapterOptions } from './pgvector';
