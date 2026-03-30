/**
 * PostGraphile v5 Plugins
 *
 * This module exports all custom plugins (consolidated from graphile-misc-plugins).
 */

// Minimal preset - PostGraphile without Node/Relay features
export { MinimalPreset } from './minimal-preset';

// Custom inflector using inflekt library
export {
  InflektPlugin,
  InflektPreset,
} from './custom-inflector';

// Conflict detector for multi-schema setups
export {
  ConflictDetectorPlugin,
  ConflictDetectorPreset,
} from './conflict-detector';

// Inflector logger for debugging
export {
  InflectorLoggerPlugin,
  InflectorLoggerPreset,
} from './inflector-logger';

// Enable filtering on all columns (not just indexed)
export {
  EnableAllFilterColumnsPlugin,
  EnableAllFilterColumnsPreset,
} from './enable-all-filter-columns';

// Many-to-many with opt-in behavior
export {
  ManyToManyOptInPlugin,
  ManyToManyOptInPreset,
} from './many-to-many-preset';

// Primary key only lookups (disable non-PK unique constraints)
export {
  createUniqueLookupPlugin,
  PrimaryKeyOnlyPlugin,
  NoUniqueLookupPlugin,
  PrimaryKeyOnlyPreset,
  NoUniqueLookupPreset,
} from './primary-key-only';
export type { UniqueLookupOptions } from './primary-key-only';

// Meta schema plugin for introspection (tables, fields, indexes, constraints)
export {
  MetaSchemaPlugin,
  MetaSchemaPreset,
} from './meta-schema';
export type {
  TableMeta,
  FieldMeta,
  TypeMeta,
  IndexMeta,
  ConstraintsMeta,
  PrimaryKeyConstraintMeta,
  UniqueConstraintMeta,
  ForeignKeyConstraintMeta,
  RelationsMeta,
  BelongsToRelation,
  HasRelation,
  ManyToManyRelation,
  InflectionMeta,
  QueryMeta,
} from './meta-schema/types';

// PG type mappings for custom PostgreSQL types (email, url, etc.)
export {
  PgTypeMappingsPlugin,
  PgTypeMappingsPreset,
} from './pg-type-mappings';
export type { TypeMapping } from './pg-type-mappings';

// Public key signature plugin for crypto authentication
export { PublicKeySignature } from './PublicKeySignature';
export type { PublicKeyChallengeConfig } from './PublicKeySignature';

// Internal exports for testing
export { _pgTypeToGqlType, _buildFieldMeta, _cachedTablesMeta } from './meta-schema';

// Required input plugin - makes @requiredInput tagged fields non-nullable in mutation inputs
export {
  RequiredInputPlugin,
  RequiredInputPreset,
} from './required-input-plugin';

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
