/**
 * graphile-search — Unified PostGraphile v5 Search Plugin
 *
 * Abstracts tsvector, BM25, pg_trgm, and pgvector behind a single
 * adapter-based architecture with a composite `searchScore` field.
 *
 * @example
 * ```typescript
 * import { UnifiedSearchPreset } from 'graphile-search';
 *
 * // Use all 4 adapters with defaults:
 * const preset = {
 *   extends: [
 *     UnifiedSearchPreset(),
 *   ],
 * };
 *
 * // Or customize per-adapter:
 * const preset = {
 *   extends: [
 *     UnifiedSearchPreset({
 *       tsvector: { filterPrefix: 'fullText', tsConfig: 'english' },
 *       bm25: true,
 *       trgm: { defaultThreshold: 0.2 },
 *       pgvector: { defaultMetric: 'L2' },
 *       searchScoreWeights: { bm25: 0.5, trgm: 0.3, tsv: 0.2 },
 *     }),
 *   ],
 * };
 * ```
 */

// Core plugin
export { createUnifiedSearchPlugin } from './plugin';

// Preset
export { UnifiedSearchPreset } from './preset';
export type { UnifiedSearchPresetOptions } from './preset';

// Types
export type {
  SearchAdapter,
  SearchableColumn,
  ScoreSemantics,
  FilterApplyResult,
  UnifiedSearchOptions,
} from './types';

// Adapters
export {
  createTsvectorAdapter,
  createBm25Adapter,
  createTrgmAdapter,
  createPgvectorAdapter,
} from './adapters';
export type {
  TsvectorAdapterOptions,
  Bm25AdapterOptions,
  Bm25IndexInfo,
  TrgmAdapterOptions,
  PgvectorAdapterOptions,
} from './adapters';
