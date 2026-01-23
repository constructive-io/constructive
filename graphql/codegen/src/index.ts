/**
 * @constructive-io/graphql-codegen
 *
 * GraphQL SDK generator for Constructive databases.
 * Introspects via _meta query and generates typed queries, mutations,
 * and React Query v5 hooks.
 */

// Core types
export * from './types';

// Core query building
export * from './core';

// Generators
export * from './generators';

// Client utilities
export * from './client';

// Config definition helper
export { defineConfig } from './types/config';

// Main generate function (orchestrates the entire pipeline)
export { generate } from './core/generate';
export type { GenerateOptions, GenerateResult } from './core/generate';

// Config utilities
export { findConfigFile, loadConfigFile } from './core/config';

// Database schema utilities (re-exported from core for convenience)
export {
  buildSchemaFromDatabase,
  buildSchemaSDLFromDatabase,
} from './core/database';
export type {
  BuildSchemaFromDatabaseOptions,
  BuildSchemaFromDatabaseResult,
} from './core/database';
