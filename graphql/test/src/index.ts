// Re-export types and utilities from graphile-test (but not get-connections functions)
export {
  type GetConnectionsInput,
  type GraphQLQueryFn,
  type GraphQLQueryFnObj,
  type GraphQLQueryOptions,
  type GraphQLQueryUnwrappedFn,
  type GraphQLQueryUnwrappedFnObj,
  type GraphQLResponse,
  type GraphQLTestContext,
} from 'graphile-test';

// Override with our custom implementations that use graphile-settings
export * from './get-connections';
export { GraphQLTest } from './graphile-test';
export { seed, snapshot } from 'pgsql-test';

// Re-export low-level DB connection utilities for advanced two-phase patterns
// (e.g. provision first, then build GraphQL schema over dynamic tables).
export type { GetConnectionOpts,GetConnectionResult } from 'pgsql-test';
export { getConnections as getDbConnections } from 'pgsql-test';
export type { PgTestClient } from 'pgsql-test/test-client';

// Export GraphQL test adapter for SDK integration
export { GraphQLTestAdapter } from './adapter';

// Export codegen-at-test-time helper for dynamic table ORM generation
export type { CodegenResult } from './codegen-helper';
export { runCodegenAndLoad } from './codegen-helper';
