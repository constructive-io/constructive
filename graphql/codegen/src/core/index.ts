/**
 * Core module exports
 *
 * This module contains all the core business logic for graphql-codegen.
 * The CLI is a thin wrapper around these core functions.
 */

// Main generate function (orchestrates the entire pipeline)
export type { GenerateOptions, GenerateResult } from './generate';
export { generate } from './generate';

// Types
export * from './types';

// AST generation
export * from './ast';
export * from './custom-ast';

// Query builder
export { MetaObject,QueryBuilder } from './query-builder';

// Meta object utilities
export { convertFromMetaSchema,validateMetaObject } from './meta-object';

// Configuration loading and resolution
export * from './config';

// Code generation
export * from './codegen';

// Schema introspection
export * from './introspect';

// Codegen pipeline
export * from './pipeline';

// File output
export * from './output';

// Watch mode
export * from './watch';

// Database schema utilities
export * from './database';
