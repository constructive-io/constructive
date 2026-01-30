import type { DocumentNode, ExecutionResult } from 'graphql';
import { print } from 'graphql';
import type { Pool, PoolClient } from 'pg';
import { grafast } from 'grafast';
import type { GraphQLSchema } from 'graphql';
import type { GraphileConfig } from 'graphile-config';
import type { GetConnectionsInput } from './types.js';

interface PgSettings {
  [key: string]: string;
}

export interface RunGraphQLOptions {
  input: GetConnectionsInput;
  schema: GraphQLSchema;
  resolvedPreset: GraphileConfig.ResolvedPreset;
  pgPool: Pool;
  pgClient: PoolClient;
  authRole: string;
  query: string | DocumentNode;
  variables?: Record<string, unknown>;
  reqOptions?: Record<string, unknown>;
}

/**
 * Creates a withPgClient function for the grafast context.
 * In PostGraphile v5, this function is used by resolvers to execute database queries.
 * For testing, we use the test's pgClient to maintain transaction isolation.
 */
const createWithPgClient = (pgClient: PoolClient, pgPool: Pool) => {
  // withPgClient signature: (pgSettings, callback) => Promise<result>
  // The callback receives the pgClient and should return the result
  return async <T>(
    pgSettings: Record<string, string> | null,
    callback: (client: PoolClient) => Promise<T>
  ): Promise<T> => {
    // For test context, we use the provided test client
    // Settings are already applied via setContextOnClient
    return callback(pgClient);
  };
};

export const runGraphQLInContext = async <T = ExecutionResult>(
  options: RunGraphQLOptions
): Promise<T> => {
  const {
    schema,
    resolvedPreset,
    pgPool,
    pgClient,
    query,
    variables,
  } = options;

  // Note: We no longer set context here - it's the test's responsibility
  // to set context via db.setContext() before running queries.
  // This allows tests to dynamically change roles and settings between queries.

  const printed = typeof query === 'string' ? query : print(query);

  // Create the withPgClient function that grafast resolvers need
  const withPgClient = createWithPgClient(pgClient, pgPool);

  const result = await grafast({
    schema,
    source: printed,
    variableValues: variables ?? undefined,
    resolvedPreset,
    contextValue: {
      pgClient,
      withPgClient,
      // Also provide pgPool for any resolvers that need it
      pgPool,
    },
  });

  return result as T;
};

export async function setContextOnClient(
  pgClient: PoolClient,
  pgSettings: Record<string, string>,
  role: string
): Promise<void> {
  await pgClient.query(`SELECT set_config('role', $1, true)`, [role]);

  for (const [key, value] of Object.entries(pgSettings)) {
    await pgClient.query(`SELECT set_config($1, $2, true)`, [
      key,
      String(value),
    ]);
  }
}
