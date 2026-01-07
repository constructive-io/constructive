/**
 * Introspection module exports
 */

// Table inference from introspection
export { inferTablesFromIntrospection } from './infer-tables';
export type { InferTablesOptions } from './infer-tables';

// Pluralization utilities
export { singularize, pluralize } from './pluralize';

// Schema sources
export {
  createSchemaSource,
  validateSourceOptions,
  EndpointSchemaSource,
  FileSchemaSource,
  SchemaSourceError,
} from './source';
export type {
  SchemaSource,
  SchemaSourceResult,
  CreateSchemaSourceOptions,
} from './source';

// Schema fetching (still used by watch mode)
export { fetchSchema } from './fetch-schema';
export type { FetchSchemaOptions, FetchSchemaResult } from './fetch-schema';

// Transform utilities (only filterTables, getTableNames, findTable are still useful)
export { getTableNames, findTable, filterTables } from './transform';
