/**
 * PostGraphile v5 Plugins
 *
 * This module re-exports all custom plugins.
 * Plugin implementations have been moved to graphile-misc-plugins.
 */

// Re-export all plugins from graphile-misc-plugins
export {
  MinimalPreset,
  InflektPlugin,
  InflektPreset,
  CustomInflectorPlugin,
  CustomInflectorPreset,
  ConflictDetectorPlugin,
  ConflictDetectorPreset,
  InflectorLoggerPlugin,
  InflectorLoggerPreset,
  EnableAllFilterColumnsPlugin,
  EnableAllFilterColumnsPreset,
  ManyToManyOptInPlugin,
  ManyToManyOptInPreset,
  createUniqueLookupPlugin,
  PrimaryKeyOnlyPlugin,
  NoUniqueLookupPlugin,
  PrimaryKeyOnlyPreset,
  NoUniqueLookupPreset,
  MetaSchemaPlugin,
  MetaSchemaPreset,
  PgTypeMappingsPlugin,
  PgTypeMappingsPreset,
  PublicKeySignature,
  _cachedTablesMeta,
  _pgTypeToGqlType,
  _buildFieldMeta,
} from 'graphile-misc-plugins';
export type { UniqueLookupOptions, TypeMapping, PublicKeyChallengeConfig } from 'graphile-misc-plugins';

// Unified search — tsvector + BM25 + pg_trgm + pgvector behind a single adapter architecture
export {
  // Core plugin + preset
  createUnifiedSearchPlugin,
  UnifiedSearchPreset,
  // Codec plugins (tree-shakable)
  TsvectorCodecPlugin,
  TsvectorCodecPreset,
  createTsvectorCodecPlugin,
  Bm25CodecPlugin,
  Bm25CodecPreset,
  bm25IndexStore,
  VectorCodecPlugin,
  VectorCodecPreset,
  // Adapters
  createTsvectorAdapter,
  createBm25Adapter,
  createTrgmAdapter,
  createPgvectorAdapter,
  // Operator factories for connection filter integration
  createMatchesOperatorFactory,
  createTrgmOperatorFactories,
} from 'graphile-search';
export type {
  SearchAdapter,
  SearchableColumn,
  UnifiedSearchOptions,
  UnifiedSearchPresetOptions,
  TsvectorCodecPluginOptions,
  Bm25IndexInfo,
  TsvectorAdapterOptions,
  Bm25AdapterOptions,
  TrgmAdapterOptions,
  PgvectorAdapterOptions,
} from 'graphile-search';
