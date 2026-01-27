import type { Server } from 'http';
import type { PgTestClient } from 'pgsql-test/test-client';
import type { GetConnectionsInput, GraphQLQueryFn, GraphQLQueryFnObj } from '@constructive-io/graphql-test';

/**
 * Options for creating a Playwright test server
 */
export interface PlaywrightServerOptions {
  /** Port to run the server on (defaults to random available port) */
  port?: number;
  /** Host to bind the server to (defaults to localhost) */
  host?: string;
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
