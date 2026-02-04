import type { DocumentNode, ExecutionResult, GraphQLSchema } from 'graphql';
import { parse } from 'graphql';
import type { GraphileConfig } from 'graphile-config';
import { execute } from 'grafast';
import { withPgClientFromPgService } from 'graphile-build-pg';
import { makePgService } from 'postgraphile/adaptors/pg';
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
  pgService: ReturnType<typeof makePgService>;
  schema: GraphQLSchema;
  resolvedPreset: GraphileConfig.ResolvedPreset;
  authRole: string;
  query: string | DocumentNode;
  // Use Record<string, any> to be compatible with grafast while allowing typed interfaces
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  variables?: Record<string, any>;
  reqOptions?: Record<string, unknown>;
}

/**
 * Execute a GraphQL query in the v5 context using grafast's execute function.
 *
 * This replaces the v4 withPostGraphileContext pattern with grafast execution.
 * Uses execute() with withPgClient to ensure proper connection handling and pgSettings.
 */
export const runGraphQLInContext = async <T = ExecutionResult>({
  input,
  conn,
  schema,
  resolvedPreset,
  pgService,
  authRole,
  query,
  variables,
  reqOptions = {},
}: RunGraphQLOptions): Promise<T> => {
  if (!conn.pg.client) {
    throw new Error('pgClient is required and must be provided externally.');
  }

  // Get the appropriate connection (root or database-specific)
  const pgConn = input.useRoot ? conn.pg : conn.db;
  const pgClient = pgConn.client;

  // Build pgSettings by merging:
  // 1. Context from db.setContext() (e.g., role, myapp.user_id)
  // 2. Settings from reqOptions.pgSettings (explicit overrides)
  // The role from getContext() takes precedence over authRole default
  const dbContext = pgConn.getContext();
  const reqPgSettings = (reqOptions.pgSettings as PgSettings) ?? {};

  // Start with authRole as default, then apply db context, then request overrides
  const pgSettings: PgSettings = {
    role: authRole,
    ...Object.fromEntries(
      Object.entries(dbContext).filter(([, v]) => v !== null) as [string, string][]
    ),
    ...reqPgSettings,
  };

  // Set role and context on the client for direct queries
  await setContextOnClient(pgClient, pgSettings, pgSettings.role);
  await pgConn.ctxQuery();

  // Convert query to DocumentNode if it's a string
  const document = typeof query === 'string' ? parse(query) : query;

  // Build context with pgSettings and withPgClient
  // This is the v5 pattern used by executor.ts and api.ts
  const contextValue: Record<string, unknown> = {
    pgSettings,
    // Include additional request options (excluding pgSettings to avoid duplication)
    ...Object.fromEntries(
      Object.entries(reqOptions).filter(([key]) => key !== 'pgSettings')
    ),
  };

  // Add withPgClient function using the pgService's configured key
  // This ensures grafast uses the pool with proper pgSettings applied
  const withPgClientKey = pgService.withPgClientKey ?? 'withPgClient';
  contextValue[withPgClientKey] = withPgClientFromPgService.bind(null, pgService);

  // Execute using grafast's execute function - the v5 execution engine
  const result = await execute({
    schema,
    document,
    variableValues: variables ?? undefined,
    contextValue,
    resolvedPreset,
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
