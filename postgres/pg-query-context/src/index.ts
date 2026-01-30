import { ClientBase, Pool, PoolClient, QueryResult } from 'pg';

/**
 * Execute set_config calls using parameterized queries to prevent SQL injection.
 * Each config key-value pair is set using a parameterized query rather than
 * string interpolation for security hardening.
 */
async function execContext(client: ClientBase, ctx: Record<string, string>): Promise<void> {
  const keys = Object.keys(ctx || {});
  for (const key of keys) {
    const value = ctx[key];
    // Use parameterized query to prevent SQL injection via context values
    // The set_config function accepts: (setting_name, new_value, is_local)
    await client.query('SELECT set_config($1, $2, true)', [key, value]);
  }
}

interface ExecOptions {
  client: Pool | ClientBase;
  context?: Record<string, string>;
  query: string;
  variables?: any[];
}

export default async ({ client, context = {}, query = '', variables = [] }: ExecOptions): Promise<QueryResult> => {
  const isPool = 'connect' in client;
  const shouldRelease = isPool;
  let pgClient: ClientBase | PoolClient | null = null;

  try {
    pgClient = isPool ? await (client as Pool).connect() : client as ClientBase;

    await pgClient.query('BEGIN');
    await execContext(pgClient, context);
    const result = await pgClient.query(query, variables);
    await pgClient.query('COMMIT');

    return result;
  } catch (error) {
    if (pgClient) {
      await pgClient.query('ROLLBACK').catch(() => {});
    }
    throw error;
  } finally {
    if (shouldRelease && pgClient && 'release' in pgClient) {
      pgClient.release();
    }
  }
};
