// Re-export types and utilities from graphile-test (but not get-connections functions)
export {
  type GraphQLQueryOptions,
  type GraphQLTestContext,
  type GetConnectionsInput,
  type GraphQLResponse,
  type GraphQLQueryFn,
  type GraphQLQueryFnObj,
  type GraphQLQueryUnwrappedFn,
  type GraphQLQueryUnwrappedFnObj,
} from 'graphile-test';

// Override with our custom implementations that use graphile-settings
export { GraphQLTest } from './graphile-test';
export * from './get-connections';
export { seed, snapshot } from 'pgsql-test';

// Re-export low-level DB connection utilities for advanced two-phase patterns
// (e.g. provision first, then build GraphQL schema over dynamic tables).
export { getConnections as getDbConnections } from 'pgsql-test';
export type { GetConnectionResult, GetConnectionOpts } from 'pgsql-test';
export type { PgTestClient } from 'pgsql-test/test-client';

// Export GraphQL test adapter for SDK integration
export { GraphQLTestAdapter } from './adapter';

// Export codegen-at-test-time helper for dynamic table ORM generation
export { runCodegenAndLoad } from './codegen-helper';
export type { CodegenResult } from './codegen-helper';
