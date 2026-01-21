import type { GetConnectionOpts, GetConnectionResult } from 'pgsql-test';
import { getConnections as getPgConnections } from 'pgsql-test';
import type { SeedAdapter } from 'pgsql-test/seed/types';
import { getEnvOptions } from '@constructive-io/graphql-env';

import { createTestServer } from './server';
import {
  createSuperTestAgent,
  createQueryFn,
  createQueryFnObj,
  createQueryFnWithLogging,
  createQueryFnObjWithLogging,
  createQueryFnWithTiming,
  createQueryFnObjWithTiming
} from './supertest';
import type {
  GetConnectionsInput,
  GetConnectionsResult,
  GetConnectionsObjectResult,
  GetConnectionsUnwrappedResult,
  GetConnectionsObjectUnwrappedResult,
  GraphQLResponse,
  GraphQLQueryOptions,
  GraphQLQueryUnwrappedFn,
  GraphQLQueryUnwrappedFnObj
} from './types';

/**
 * Core unwrapping utility - throws on GraphQL errors
 */
const unwrap = <T>(res: GraphQLResponse<T>): T => {
  if (res.errors?.length) {
    throw new Error(JSON.stringify(res.errors, null, 2));
  }
  if (!res.data) {
    throw new Error('No data returned from GraphQL query');
  }
  return res.data;
};

/**
 * Base connection setup with HTTP server - shared across all variants
 */
const createConnectionsBase = async (
  input: GetConnectionsInput & GetConnectionOpts,
  seedAdapters?: SeedAdapter[]
) => {
  // Get database connections using pgsql-test
  const conn: GetConnectionResult = await getPgConnections(input, seedAdapters);
  const { pg, db, teardown: dbTeardown } = conn;

  // Build options for the HTTP server with enableServicesApi: false
  const serverOpts = getEnvOptions({
    pg: pg.config,
    api: {
      enableServicesApi: false,
      exposedSchemas: input.schemas,
      defaultDatabaseId: 'test-database',
      ...(input.authRole && { anonRole: input.authRole, roleName: input.authRole })
    },
    graphile: input.graphile
  });

  // Start the HTTP server
  const server = await createTestServer(serverOpts, input.server);

  // Create SuperTest agent
  const request = createSuperTestAgent(server);

  // Combined teardown function
  const teardown = async () => {
    await server.stop();
    await dbTeardown();
  };

  return {
    pg,
    db,
    server,
    request,
    teardown
  };
};

// ============================================================================
// POSITIONAL QUERY VERSIONS
// ============================================================================

/**
 * Creates connections with an HTTP server for SuperTest testing (positional API)
 * 
 * This is the main entry point for SuperTest-based GraphQL tests. It:
 * 1. Creates an isolated test database
 * 2. Starts an HTTP server with the GraphQL API
 * 3. Returns a SuperTest agent and query function for making HTTP requests
 * 4. Provides a teardown function to clean up everything
 * 
 * @example
 * ```typescript
 * const { db, server, query, request, teardown } = await getConnections({
 *   schemas: ['public', 'app_public'],
 *   authRole: 'anonymous'
 * });
 * 
 * // Use the query function for GraphQL requests
 * const res = await query(`query { allUsers { nodes { id } } }`);
 * 
 * // Or use SuperTest directly for more control
 * const res = await request
 *   .post('/graphql')
 *   .set('Authorization', 'Bearer token')
 *   .send({ query: '{ currentUser { id } }' });
 * 
 * // Clean up after tests
 * await teardown();
 * ```
 */
export const getConnections = async (
  input: GetConnectionsInput & GetConnectionOpts,
  seedAdapters?: SeedAdapter[]
): Promise<GetConnectionsResult> => {
  const { pg, db, server, request, teardown } = await createConnectionsBase(input, seedAdapters);

  return {
    pg,
    db,
    server,
    request,
    query: createQueryFn(request),
    teardown
  };
};

/**
 * Creates connections with unwrapped GraphQL responses (positional API, throws on errors)
 */
export const getConnectionsUnwrapped = async (
  input: GetConnectionsInput & GetConnectionOpts,
  seedAdapters?: SeedAdapter[]
): Promise<GetConnectionsUnwrappedResult> => {
  const { pg, db, server, request, teardown } = await createConnectionsBase(input, seedAdapters);
  const baseQuery = createQueryFn(request);

  const query: GraphQLQueryUnwrappedFn = async (q, variables, headers) =>
    unwrap(await baseQuery(q, variables, headers));

  return {
    pg,
    db,
    server,
    request,
    query,
    teardown
  };
};

/**
 * Creates connections with logging for GraphQL queries (positional API)
 */
export const getConnectionsWithLogging = async (
  input: GetConnectionsInput & GetConnectionOpts,
  seedAdapters?: SeedAdapter[]
): Promise<GetConnectionsResult> => {
  const { pg, db, server, request, teardown } = await createConnectionsBase(input, seedAdapters);

  return {
    pg,
    db,
    server,
    request,
    query: createQueryFnWithLogging(request),
    teardown
  };
};

/**
 * Creates connections with timing for GraphQL queries (positional API)
 */
export const getConnectionsWithTiming = async (
  input: GetConnectionsInput & GetConnectionOpts,
  seedAdapters?: SeedAdapter[]
): Promise<GetConnectionsResult> => {
  const { pg, db, server, request, teardown } = await createConnectionsBase(input, seedAdapters);

  return {
    pg,
    db,
    server,
    request,
    query: createQueryFnWithTiming(request),
    teardown
  };
};

// ============================================================================
// OBJECT-BASED QUERY VERSIONS
// ============================================================================

/**
 * Creates connections with raw GraphQL responses (object-based API)
 */
export const getConnectionsObject = async (
  input: GetConnectionsInput & GetConnectionOpts,
  seedAdapters?: SeedAdapter[]
): Promise<GetConnectionsObjectResult> => {
  const { pg, db, server, request, teardown } = await createConnectionsBase(input, seedAdapters);

  return {
    pg,
    db,
    server,
    request,
    query: createQueryFnObj(request),
    teardown
  };
};

/**
 * Creates connections with unwrapped GraphQL responses (object-based API, throws on errors)
 */
export const getConnectionsObjectUnwrapped = async (
  input: GetConnectionsInput & GetConnectionOpts,
  seedAdapters?: SeedAdapter[]
): Promise<GetConnectionsObjectUnwrappedResult> => {
  const { pg, db, server, request, teardown } = await createConnectionsBase(input, seedAdapters);
  const baseQuery = createQueryFnObj(request);

  const query: GraphQLQueryUnwrappedFnObj = async (opts: GraphQLQueryOptions) =>
    unwrap(await baseQuery(opts));

  return {
    pg,
    db,
    server,
    request,
    query,
    teardown
  };
};

/**
 * Creates connections with logging for GraphQL queries (object-based API)
 */
export const getConnectionsObjectWithLogging = async (
  input: GetConnectionsInput & GetConnectionOpts,
  seedAdapters?: SeedAdapter[]
): Promise<GetConnectionsObjectResult> => {
  const { pg, db, server, request, teardown } = await createConnectionsBase(input, seedAdapters);

  return {
    pg,
    db,
    server,
    request,
    query: createQueryFnObjWithLogging(request),
    teardown
  };
};

/**
 * Creates connections with timing for GraphQL queries (object-based API)
 */
export const getConnectionsObjectWithTiming = async (
  input: GetConnectionsInput & GetConnectionOpts,
  seedAdapters?: SeedAdapter[]
): Promise<GetConnectionsObjectResult> => {
  const { pg, db, server, request, teardown } = await createConnectionsBase(input, seedAdapters);

  return {
    pg,
    db,
    server,
    request,
    query: createQueryFnObjWithTiming(request),
    teardown
  };
};
