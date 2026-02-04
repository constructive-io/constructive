import type { DocumentNode, ExecutionResult, GraphQLSchema } from 'graphql';
import type { GraphileConfig } from 'graphile-config';
import { grafast } from 'grafast';
import { print } from 'graphql';
import type { Client, Pool } from 'pg';
import type { GetConnectionOpts, GetConnectionResult } from 'pgsql-test';

import type { GetConnectionsInput } from './types.js';

interface PgSettings {
  [key: string]: string;
}

interface RunGraphQLOptions {
  input: GetConnectionsInput & GetConnectionOpts;
  conn: GetConnectionResult;
  pgPool: Pool;
  schema: GraphQLSchema;
  resolvedPreset: GraphileConfig.ResolvedPreset;
  authRole: string;
  query: string | DocumentNode;
  variables?: Record<string, unknown>;
  reqOptions?: Record<string, unknown>;
}

/**
 * Execute a GraphQL query in the v5 context using grafast.
 *
 * This replaces the v4 withPostGraphileContext pattern with grafast execution.
 */
export const runGraphQLInContext = async <T = ExecutionResult>({
  input,
  conn,
  schema,
  resolvedPreset,
  authRole,
  query,
  variables,
  reqOptions = {},
}: RunGraphQLOptions): Promise<T> => {
  if (!conn.pg.client) {
    throw new Error('pgClient is required and must be provided externally.');
  }

  // Get the pg settings from request options if provided
  const pgSettings: PgSettings = (reqOptions.pgSettings as PgSettings) ?? {};

  // Get the appropriate connection (root or database-specific)
  const pgConn = input.useRoot ? conn.pg : conn.db;
  const pgClient = pgConn.client;

  // Set role and context on the client
  await setContextOnClient(pgClient, pgSettings, authRole);
  await pgConn.ctxQuery();

  // Convert query to string if it's a DocumentNode
  const source = typeof query === 'string' ? query : print(query);

  // Execute using grafast - the v5 execution engine
  // grafast provides the context including withPgClient for database access
  // Note: pgSettings should only be passed in requestContext, NOT contextValue,
  // to avoid "Key 'pgSettings' already set on the context" error from PgContextPlugin
  const result = await grafast({
    schema,
    source,
    variableValues: variables ?? undefined,
    resolvedPreset,
    requestContext: {
      // Provide the pg settings for database context
      pgSettings,
      // Additional context from request options (excluding pgSettings to avoid duplication)
      ...Object.fromEntries(
        Object.entries(reqOptions).filter(([key]) => key !== 'pgSettings')
      ),
    },
    contextValue: {
      // withPgClient is handled by grafast/grafserv automatically
      // but for testing we can provide direct access
      pgClient,
    },
  });

  return result as T;
};

/**
 * Set the PostgreSQL role and session settings on a client connection.
 */
export async function setContextOnClient(
  pgClient: Client,
  pgSettings: Record<string, string>,
  role: string
): Promise<void> {
  await pgClient.query('SELECT set_config($1, $2, true)', ['role', role]);

  for (const [key, value] of Object.entries(pgSettings)) {
    await pgClient.query('SELECT set_config($1, $2, true)', [key, String(value)]);
  }
}
