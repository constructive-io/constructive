import { ClientBase, Pool, PoolClient, QueryResult } from 'pg';

// --- Internal helpers ---

export const UNSAFE_POOLED_CONTEXT_ERROR_CODE =
  'PG_QUERY_CONTEXT_UNSAFE_POOLED_CONTEXT';

export class UnsafePooledContextError extends Error {
  readonly code = UNSAFE_POOLED_CONTEXT_ERROR_CODE;

  constructor() {
    super(
      'Transaction-local PostgreSQL context cannot be applied through a pool ' +
        'when skipTransaction is enabled'
    );
    this.name = 'UnsafePooledContextError';
  }
}

function assertContextHasTransaction(
  usesPool: boolean,
  skipTransaction: boolean,
  context: Record<string, string>
): void {
  if (usesPool && skipTransaction && Object.keys(context).length > 0) {
    throw new UnsafePooledContextError();
  }
}

function isPgPool(client: Pool | ClientBase): client is Pool {
  return (
    typeof (client as Pool).connect === 'function' &&
    typeof (client as Pool).totalCount === 'number'
  );
}

async function execContext(
  client: ClientBase,
  ctx: Record<string, string>
): Promise<void> {
  const entries = Object.entries(ctx || {});
  if (entries.length === 0) return;

  for (const [key, value] of entries) {
    if (typeof value !== 'string') {
      throw new TypeError(
        `PostgreSQL context setting '${key}' must be a string`
      );
    }
  }

  await client.query(
    'SELECT pg_catalog.set_config(setting->>0, setting->>1, true) ' +
      'FROM pg_catalog.json_array_elements($1::json) AS setting',
    [JSON.stringify(entries)]
  );
}

// --- Single-query API (original) ---

export interface ExecOptions {
  client: Pool | ClientBase;
  context?: Record<string, string>;
  query: string;
  variables?: any[];
  skipTransaction?: boolean;
}

async function pgQueryContext({ client, context = {}, query = '', variables = [], skipTransaction = false }: ExecOptions): Promise<QueryResult> {
  const isPool = isPgPool(client);
  const shouldRelease = isPool;
  let pgClient: ClientBase | PoolClient | null = null;

  assertContextHasTransaction(isPool, skipTransaction, context);

  try {
    pgClient = isPool ? await (client as Pool).connect() : client as ClientBase;

    if (!skipTransaction) {
      await pgClient.query('BEGIN');
    }
    await execContext(pgClient, context);
    const result = await pgClient.query(query, variables);
    if (!skipTransaction) {
      await pgClient.query('COMMIT');
    }

    return result;
  } catch (error) {
    if (pgClient && !skipTransaction) {
      await pgClient.query('ROLLBACK').catch(() => {});
    }
    throw error;
  } finally {
    if (shouldRelease && pgClient && 'release' in pgClient) {
      pgClient.release();
    }
  }
}

export default pgQueryContext;

// --- Callback-based API ---

export interface WithPgClientOptions {
  skipTransaction?: boolean;
}

/**
 * Execute a callback within a tenant-scoped RLS transaction.
 *
 * Acquires a client from the pool, applies pgSettings via set_config
 * (scoped to the transaction), calls the callback, then commits or
 * rolls back. The client is always released back to the pool.
 *
 * Use this when you need to run multiple queries within the same
 * RLS context (e.g., auth check + data mutation).
 */
export async function withPgClient<T>(
  pool: Pool,
  context: Record<string, string>,
  fn: (client: PoolClient) => Promise<T>,
  opts: WithPgClientOptions = {},
): Promise<T> {
  assertContextHasTransaction(true, opts.skipTransaction === true, context);
  const client = await pool.connect();
  try {
    if (!opts.skipTransaction) {
      await client.query('BEGIN');
    }
    await execContext(client, context);
    const result = await fn(client);
    if (!opts.skipTransaction) {
      await client.query('COMMIT');
    }
    return result;
  } catch (err) {
    if (!opts.skipTransaction) {
      await client.query('ROLLBACK').catch(() => {});
    }
    throw err;
  } finally {
    client.release();
  }
}
