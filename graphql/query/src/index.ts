/**
 * @constructive-io/graphql-query
 *
 * Browser-safe GraphQL query generation core.
 * Contains the pure-function query builders, AST generators, naming helpers,
 * introspection utilities, and client execution layer.
 *
 * This package is the canonical source for runtime query generation logic.
 * @constructive-io/graphql-codegen depends on this for the core and adds
 * Node.js-only build-time features (CLI, file output, watch mode, etc.).
 */

// QueryBuilder class (runtime query builder)
export { QueryBuilder } from './query-builder';

// QueryExecutor (server-side execution via PostGraphile)
export { QueryExecutor, createExecutor } from './executor';

// AST builders (getAll, getMany, getOne, createOne, patchOne, deleteOne)
export * from './ast';

// Custom AST (geometry, interval, etc.)
export * from './custom-ast';

// All types (core + codegen-style schema/introspection/query/mutation/selection)
export * from './types';

// Meta object utilities (convert, validate)
export * as MetaObject from './meta-object';
export { convertFromMetaSchema } from './meta-object/convert';
export { validateMetaObject, type ValidationResult } from './meta-object/validate';

// Generators (buildSelect, buildFindOne, buildCount, mutations, field-selector, naming-helpers)
export * from './generators';

// Client utilities (TypedDocumentString, error handling, execute)
export * from './client';

// Introspection utilities (infer-tables, transform, transform-schema, schema-query)
export * from './introspect';

// Utility functions
export { stripSmartComments } from './utils';
