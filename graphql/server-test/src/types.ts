import type { Server } from 'http';
import type { DocumentNode, GraphQLError } from 'graphql';
import type { PgTestClient } from 'pgsql-test/test-client';
import type { GraphileOptions, ApiOptions } from '@constructive-io/graphql-types';
import type supertest from 'supertest';

/**
 * Options for creating a test server
 */
export interface ServerOptions {
  /** Port to run the server on (defaults to random available port) */
  port?: number;
  /** Host to bind the server to (defaults to localhost) */
  host?: string;
  /**
   * API configuration options for the GraphQL server.
   * These options control how the server handles requests and which features are enabled.
   * 
   * @example
   * ```typescript
   * const { query } = await getConnections({
   *   schemas: ['app_public'],
   *   server: {
   *     port: 5555,
   *     api: {
   *       enableServicesApi: false,
   *       isPublic: false,
   *       defaultDatabaseId: 'my-database'
   *     }
   *   }
   * });
   * ```
   */
  api?: Partial<ApiOptions>;
}

/**
 * Server information returned by createTestServer
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
 * Input options for getConnections
 */
export interface GetConnectionsInput {
  /** Use root/superuser for queries (bypasses RLS) */
  useRoot?: boolean;
  /** PostgreSQL schemas to expose in GraphQL */
  schemas: string[];
  /** Default role for anonymous requests */
  authRole?: string;
  /** Graphile/PostGraphile configuration options */
  graphile?: GraphileOptions;
  /** Server configuration options (port, host, and API configuration) */
  server?: ServerOptions;
}

/**
 * GraphQL response structure
 */
export interface GraphQLResponse<T> {
  data?: T;
  errors?: readonly GraphQLError[];
}

/**
 * GraphQL query function type
 */
export type GraphQLQueryFn = <TResult = any, TVariables = Record<string, any>>(
  query: string | DocumentNode,
  variables?: TVariables,
  headers?: Record<string, string>
) => Promise<GraphQLResponse<TResult>>;

/**
 * Result from getConnections
 */
export interface GetConnectionsResult {
  /** PostgreSQL client for superuser operations (bypasses RLS) */
  pg: PgTestClient;
  /** PostgreSQL client for app-level operations (respects RLS) */
  db: PgTestClient;
  /** Server information including URL and stop function */
  server: ServerInfo;
  /** Raw SuperTest agent for custom HTTP requests */
  request: supertest.Agent;
  /** GraphQL query function */
  query: GraphQLQueryFn;
  /** Teardown function to clean up database and server */
  teardown: () => Promise<void>;
}
