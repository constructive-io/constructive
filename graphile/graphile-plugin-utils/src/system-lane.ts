/**
 * The system lane: server-owned reads and writes that are not a tenant
 * session — schema metadata, module registration, storage config.
 *
 * Grafast's `withPgClient(null, cb)` acquires a client with NO settings, so
 * `cb` runs with whatever role the pool connected as (in practice `postgres`,
 * a superuser that bypasses RLS) and each statement lands in its own implicit
 * transaction. This helper names the role instead: one transaction with a
 * transaction-local `role`, so the lane's reach is the grants of a named role
 * rather than the connection's. It is the server-owned counterpart to the
 * request lane's `withRequestPgClient`.
 */

/** The subset of grafast's PgClient the system lane needs. */
export interface SystemLanePgClient {
  query(opts: {
    text: string;
    values?: unknown[];
  }): Promise<{ rows: Array<Record<string, unknown>> }>;
  withTransaction<T>(cb: (tx: SystemLanePgClient) => Promise<T>): Promise<T>;
}

export type SystemLaneWithPgClient = <T>(
  pgSettings: Record<string, string> | null,
  cb: (client: SystemLanePgClient) => Promise<T>,
) => Promise<T>;

/**
 * Role the system lane runs as: a named role instead of whatever the pool
 * connected as.
 *
 * This is NOT an RLS-subject role. `ROLES.md` documents `administrator` as the
 * BYPASSRLS role, so the lane still bypasses RLS — what changes is that it no
 * longer inherits the connection's superuser and its work is one transaction.
 * Narrowing it further needs grants that do not exist yet.
 */
export const SYSTEM_LANE_ROLE = 'administrator';

export interface SystemLaneOptions {
  /** Role to run as. Defaults to {@link SYSTEM_LANE_ROLE}. */
  role?: string;
}

/**
 * Run `cb` in one transaction under the system lane's role.
 *
 * The role is set with a transaction-local `set_config`, so it is discarded
 * with the transaction and cannot leak to the next borrower of the pooled
 * connection the way a session-level `SET ROLE` would. The client's own
 * `withTransaction` owns commit and rollback.
 */
export function withSystemLaneClient<T>(
  withPgClient: SystemLaneWithPgClient,
  cb: (client: SystemLanePgClient) => Promise<T>,
  opts: SystemLaneOptions = {},
): Promise<T> {
  const role = opts.role ?? SYSTEM_LANE_ROLE;
  return withPgClient(null, (client) =>
    client.withTransaction(async (tx) => {
      await tx.query({
        text: 'SELECT set_config($1, $2, true)',
        values: ['role', role],
      });
      return cb(tx);
    }),
  );
}
