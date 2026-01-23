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

// CLI command exports (for packages/cli consumption)
export { generate } from './cli';
export type { GenerateOptions, GenerateResult, GenerateTargetResult } from './cli';

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
