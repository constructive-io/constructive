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

// pgvector — Vector scalar + codec + auto-discovered search/filter/orderBy
export { VectorCodecPlugin, VectorCodecPreset, VectorSearchPlugin, createVectorSearchPlugin } from 'graphile-pgvector';
export type { VectorSearchPluginOptions, VectorMetric } from 'graphile-pgvector';

// Search plugin (stays in graphile-tsvector, re-exported here for convenience)
export {
  PgSearchPlugin,
  PgSearchPreset,
  createPgSearchPlugin,
  TsvectorCodecPlugin,
  TsvectorCodecPreset,
} from 'graphile-tsvector';
export type { PgSearchPluginOptions } from 'graphile-tsvector';

// pg_textsearch — BM25 ranked search (auto-discovers BM25 indexes)
export {
  Bm25CodecPlugin,
  Bm25CodecPreset,
  Bm25SearchPlugin,
  createBm25SearchPlugin,
  Bm25SearchPreset,
} from 'graphile-bm25';
export type { Bm25SearchPluginOptions, Bm25IndexInfo } from 'graphile-bm25';
