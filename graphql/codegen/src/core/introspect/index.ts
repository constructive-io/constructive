/**
 * Introspection module exports
 */

// Table inference from introspection
export type { InferTablesOptions } from './infer-tables';
export { inferTablesFromIntrospection } from './infer-tables';

// Pluralization utilities (from inflekt)
export { pluralize, singularize } from 'inflekt';

// Schema sources
export type {
  CreateSchemaSourceOptions,
  SchemaSource,
  SchemaSourceResult,
} from './source';
export {
  createSchemaSource,
  EndpointSchemaSource,
  FileSchemaSource,
  SchemaSourceError,
  validateSourceOptions,
} from './source';

// Schema fetching (still used by watch mode)
export type { FetchSchemaOptions, FetchSchemaResult } from './fetch-schema';
export { fetchSchema } from './fetch-schema';

// Transform utilities (only filterTables, getTableNames, findTable are still useful)
export { filterTables, findTable, getTableNames } from './transform';
