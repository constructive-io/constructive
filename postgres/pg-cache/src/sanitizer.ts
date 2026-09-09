import type pg from 'pg';

type PgConnectionWithPreparedState = {
  parsedStatements?: Record<string, string>;
  _graphilePreparedStatementCache?: unknown;
};

type PgClientWithPreparedState = pg.PoolClient & {
  connection?: PgConnectionWithPreparedState;
};

const checkoutSanitizedPools = new WeakSet<pg.Pool>();

/**
 * Forget prepared statements that PostgreSQL removed during `DISCARD ALL`.
 *
 * Graphile's cache is deliberately deleted rather than disposed: its disposer
 * issues asynchronous `DEALLOCATE` queries, which would duplicate `DISCARD ALL`
 * and could race with the next owner of the checked-out client.
 */
export function clearPreparedStatementBookkeeping(client: pg.PoolClient): void {
  const connection = (client as PgClientWithPreparedState).connection;
  if (!connection) return;

  if (connection.parsedStatements) {
    for (const statementName of Object.keys(connection.parsedStatements)) {
      delete connection.parsedStatements[statementName];
    }
  }

  delete connection._graphilePreparedStatementCache;
}

/**
 * Restore a checked-out PostgreSQL client to server defaults before reuse.
 * A client that cannot be sanitized is destroyed instead of being returned to
 * application code with unknown session state.
 */
export async function sanitizePgClient(client: pg.PoolClient): Promise<pg.PoolClient> {
  try {
    await client.query('DISCARD ALL');
    clearPreparedStatementBookkeeping(client);
    return client;
  } catch (error) {
    client.release(true);
    throw error;
  }
}

/**
 * Sanitize every client obtained from a node-postgres pool. `pool.query()` also
 * goes through `connect()`, so both checkout APIs share the same boundary.
 */
export function installCheckoutSanitizer(pool: pg.Pool): pg.Pool {
  if (checkoutSanitizedPools.has(pool)) return pool;

  const connect = pool.connect.bind(pool);
  const sanitizedConnect = async (): Promise<pg.PoolClient> => {
    const client = await connect();
    return sanitizePgClient(client);
  };

  pool.connect = ((callback?: (
    err: Error | undefined,
    client: pg.PoolClient | undefined,
    done: (release?: boolean | Error) => void
  ) => void): Promise<pg.PoolClient> | void => {
    const pendingClient = sanitizedConnect();
    if (!callback) return pendingClient;

    pendingClient.then(
      (client) => callback(undefined, client, client.release.bind(client)),
      (error: Error) => callback(error, undefined, () => undefined)
    );
  }) as typeof pool.connect;

  checkoutSanitizedPools.add(pool);
  return pool;
}
