/**
 * PostGraphile v5 Plugins
 *
 * This module exports all custom plugins for PostGraphile v5.
 * Each plugin can be used individually or combined via the presets.
 */

// Minimal preset - PostGraphile without Node/Relay features
export { MinimalPreset } from './minimal-preset';

// Custom inflector using inflekt library
export {
  InflektPlugin,
  InflektPreset,
  CustomInflectorPlugin,
  CustomInflectorPreset,
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

// PG type mappings for custom PostgreSQL types (email, url, etc.)
export {
  PgTypeMappingsPlugin,
  PgTypeMappingsPreset,
} from './pg-type-mappings';
export type { TypeMapping } from './pg-type-mappings';

// Uppercase enum values to match v4 CONSTANT_CASE convention
export {
  UppercaseEnumsPlugin,
  UppercaseEnumsPreset,
} from './uppercase-enums';

// Search plugin for tsvector full-text search conditions (includes TsvectorCodec)
export {
  PgSearchPlugin,
  PgSearchPreset,
  createPgSearchPlugin,
  TsvectorCodecPlugin,
  TsvectorCodecPreset,
} from 'graphile-search-plugin';
export type { PgSearchPluginOptions } from 'graphile-search-plugin';
