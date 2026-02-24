/**
 * graphile-misc-plugins
 *
 * Miscellaneous PostGraphile v5 plugins: inflection, conflict detection,
 * meta-schema, type mappings, public-key signature, and more.
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

// Public key signature plugin for crypto authentication
export { PublicKeySignature } from './PublicKeySignature';
export type { PublicKeyChallengeConfig } from './PublicKeySignature';

// Internal exports for testing
export { _pgTypeToGqlType, _buildFieldMeta, _cachedTablesMeta } from './meta-schema';
