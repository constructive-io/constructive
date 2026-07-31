import type { GetConnectionsInput, GraphQLQueryFn, GraphQLQueryFnObj } from '@constructive-io/graphql-test';
import type { ApiOptions } from '@constructive-io/graphql-types';
import type { Server } from 'http';
import type { PgTestClient } from 'pgsql-test/test-client';

/**
 * Options for creating a Playwright test server
 */
export interface PlaywrightServerOptions {
  /** Port to run the server on (defaults to random available port) */
  port?: number;
  /** Host to bind the server to (defaults to localhost) */
  host?: string;
  /**
   * Which server to run this suite against:
   * - `false` (default): the single-tenant `@constructive-io/graphql-dev-server`
   *   (pure PostGraphile, no routing, no database id) exposing the configured
   *   schemas directly. Best for UI/local suites that don't need routing.
   * - `true`: the production `@constructive-io/graphql-server`, which resolves
   *   every request through the scoped-routing plane. Suites must seed real
   *   routing/database records so `resolve_route()` returns a real database id.
   */
  useRouting?: boolean;
  /**
   * API configuration forwarded to the production scoped server (e.g.
   * `metaSchemas`, `isPublic`). Only used when `useRouting` is `true`.
   */
  api?: Partial<ApiOptions>;
}

/**
 * Input options for getConnectionsWithServer
 */
export interface GetConnectionsWithServerInput extends GetConnectionsInput {
  /** Server configuration options */
  server?: PlaywrightServerOptions;
}

/**
 * Server information returned by getConnectionsWithServer
 */
export interface ServerInfo {
  /** The HTTP server instance */
  httpServer: Server;
  /** The base URL of the server (e.g., http://localhost:5555) */
  url: string;
  /** The GraphQL endpoint URL (e.g., http://localhost:5555/graphql) */
  graphqlUrl: string;
  /** The port the server is running on */
  port: number;
  /** The host the server is bound to */
  host: string;
  /** Stop the server */
  stop: () => Promise<void>;
}

/**
 * Result from getConnectionsWithServer
 */
export interface GetConnectionsWithServerResult {
  /** PostgreSQL client for direct database access */
  pg: PgTestClient;
  /** Database client for test operations */
  db: PgTestClient;
  /** Server information including URL and stop function */
  server: ServerInfo;
  /** GraphQL query function (positional API) */
  query: GraphQLQueryFn;
  /** Teardown function to clean up database and server */
  teardown: () => Promise<void>;
}

/**
 * Result from getConnectionsWithServerObject (object-based query API)
 */
export interface GetConnectionsWithServerObjectResult {
  /** PostgreSQL client for direct database access */
  pg: PgTestClient;
  /** Database client for test operations */
  db: PgTestClient;
  /** Server information including URL and stop function */
  server: ServerInfo;
  /** GraphQL query function (object API) */
  query: GraphQLQueryFnObj;
  /** Teardown function to clean up database and server */
  teardown: () => Promise<void>;
}
