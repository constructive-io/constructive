import { Logger } from '@pgpmjs/logger';

/**
 * The system lane: server-owned reads and writes that are not a tenant
 * session — schema metadata, module registration, storage config.
 *
 * Grafast's `withPgClient(null, cb)` acquires a client with NO settings, so
 * `cb` runs with whatever role the pool connected as (in practice `postgres`,
 * a superuser that bypasses RLS) and each statement lands in its own implicit
 * transaction. This helper names the role instead: one explicit transaction
 * with a transaction-local `role`, so the lane's reach is the grants of a
 * named role rather than the connection's.
 */

const log = new Logger('pg-query-context');

/**
 * Role the system lane runs as: a named role instead of whatever the pool
 * connected as.
 *
 * This is NOT an RLS-subject role. `ROLES.md` documents `administrator` as the
 * BYPASSRLS role, so the lane still bypasses RLS — what changes is that it no
 * longer inherits the connection's superuser and its work is one explicit
 * transaction. Narrowing it further needs grants that do not exist yet.
 */
export const SYSTEM_LANE_ROLE = 'administrator';

/** The subset of grafast's PgClient this module needs. */
export interface GrafastPgClient {
  query(opts: {
    text: string;
    values?: unknown[];
  }): Promise<{ rows: Array<Record<string, unknown>> }>;
}

export type GrafastWithPgClient = <T>(
  pgSettings: Record<string, string> | null,
  cb: (client: GrafastPgClient) => Promise<T>,
) => Promise<T>;

export interface SystemLaneOptions {
  /** Role to run as. Defaults to {@link SYSTEM_LANE_ROLE}. */
  role?: string;
}

/**
 * Run `cb` in one explicit transaction under the system lane's role.
 *
 * The role is set with a transaction-local `set_config`, so it is discarded
 * with the transaction and cannot leak to the next borrower of the pooled
 * connection the way a session-level `SET ROLE` would. Commits when `cb`
 * resolves; rolls back and rethrows when it throws.
 */
export function withSystemLaneClient<T>(
  withPgClient: GrafastWithPgClient,
  cb: (client: GrafastPgClient) => Promise<T>,
  opts: SystemLaneOptions = {},
): Promise<T> {
  const role = opts.role ?? SYSTEM_LANE_ROLE;
  return withPgClient(null, async (client) => {
    await client.query({ text: 'BEGIN' });
    try {
      await client.query({
        text: 'SELECT set_config($1, $2, true)',
        values: ['role', role],
      });
      const result = await cb(client);
      await client.query({ text: 'COMMIT' });
      return result;
    } catch (err) {
      // A broken connection makes ROLLBACK throw too; that failure must not
      // become what the caller sees in place of the real one.
      try {
        await client.query({ text: 'ROLLBACK' });
      } catch (rollbackErr) {
        log.error(
          `[system-lane] ROLLBACK failed: ${
            rollbackErr instanceof Error ? rollbackErr.message : String(rollbackErr)
          }`,
        );
      }
      throw err;
    }
  });
}
