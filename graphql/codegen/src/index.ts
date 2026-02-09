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
export type { GenerateOptions, GenerateResult } from './core/generate';
export { generate } from './core/generate';

// Config utilities
export { findConfigFile, loadConfigFile } from './core/config';

// CLI shared utilities (for packages/cli to import)
export type { CodegenAnswers } from './cli/shared';
export {
  buildDbConfig,
  buildGenerateOptions,
  camelizeArgv,
  codegenQuestions,
  filterDefined,
  flattenDbFields,
  hasResolvedCodegenSource,
  hyphenateKeys,
  normalizeCodegenListOptions,
  printResult,
  seedArgvFromConfig,
  splitCommas,
} from './cli/shared';

// Database schema utilities (re-exported from core for convenience)
export type {
  BuildSchemaFromDatabaseOptions,
  BuildSchemaFromDatabaseResult,
} from './core/database';
export {
  buildSchemaFromDatabase,
  buildSchemaSDLFromDatabase,
} from './core/database';
