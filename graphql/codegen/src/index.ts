/**
 * @constructive-io/graphql-codegen
 *
 * CLI-based GraphQL SDK generator for PostGraphile endpoints.
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
export {
  generateReactQuery,
  generateOrm,
  findConfigFile,
  loadConfigFile,
} from './cli/commands';

export type {
  GenerateOptions,
  GenerateResult,
  GenerateTargetResult,
  GenerateOrmOptions,
  GenerateOrmResult,
  GenerateOrmTargetResult,
  InitOptions,
  InitResult,
} from './cli/commands';
