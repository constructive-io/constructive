// Re-export everything from pgsql-test
export * from 'pgsql-test';

// Export Constructive-specific getConnections with defaults baked in
export { getConnections } from './connect';
export type { GetConnectionOpts, GetConnectionResult } from './connect';

// Re-export snapshot utility
export { snapshot } from 'pgsql-test';

// Table client (uses AST-backed QueryBuilder)
export { TableClient, ident } from './table-client';

// Re-export QueryBuilder and types for direct use
export { QueryBuilder } from '@constructive-io/query-builder';
export type { QueryOutput, SqlValue } from '@constructive-io/query-builder';

// TestUtils — dynamically-resolved test utility class
export {
  TestUtils,
  UsersClient,
  MembershipsClient,
  ProfilesClient,
  PermissionsClient,
} from './test-utils';

// Helpers
export * from './helpers';

// Provision
export * from './provision';

// Metaschema
export * from './metaschema';

// Context
export * from './context';

// Membership (resolution helpers, no hardcoded schemas)
export * from './membership';

// Blueprint
export * from './blueprint';
