import type { PgTestClient } from 'pgsql-test';
import { setUserContext } from './context/set-context';

/**
 * Assert that a query results in an RLS permission denied error.
 *
 * RLS denials manifest as "new row violates row-level security policy"
 * for INSERT/UPDATE/DELETE, or silently return empty for SELECT.
 * This helper checks both cases.
 *
 * @param db - PgTestClient configured with the actor's JWT context
 * @param query - SQL query to execute
 * @param params - optional query parameters
 *
 * @example
 * setUserContext(db, BOB_ID, database_id);
 * await expectRlsDenied(db, `INSERT INTO "schema"."table" (name) VALUES ($1)`, ['test']);
 */
export async function expectRlsDenied(
  db: PgTestClient,
  query: string,
  params?: unknown[]
): Promise<void> {
  try {
    await db.query(query, params);
    throw new Error(
      'Expected RLS denial but query succeeded. ' +
      'The current role + context may bypass RLS (e.g. administrator has BYPASSRLS).'
    );
  } catch (err: any) {
    const msg = err.message || '';
    const isRlsError =
      msg.includes('row-level security') ||
      msg.includes('permission denied') ||
      msg.includes('new row violates') ||
      msg.includes('insufficient_privilege');

    if (!isRlsError) {
      throw new Error(
        `Expected RLS denial error but got a different error:\n${msg}\n\n` +
        `If this is a "relation does not exist" error, ensure you resolved ` +
        `the table via metaschema before querying.`
      );
    }
  }
}

/**
 * Assert that a SELECT query returns zero rows due to RLS filtering.
 *
 * SELECT policies silently filter rows rather than throwing errors.
 * This helper verifies that the result set is empty for the given context.
 *
 * @example
 * setUserContext(db, BOB_ID, database_id);
 * await expectRlsHidden(db, `SELECT * FROM "schema"."table" WHERE id = $1`, [rowId]);
 */
export async function expectRlsHidden(
  db: PgTestClient,
  query: string,
  params?: unknown[]
): Promise<void> {
  const result = await db.query(query, params);
  if (result.rows.length > 0) {
    throw new Error(
      `Expected RLS to hide all rows but got ${result.rows.length} row(s). ` +
      `The current role + context may have SELECT access to these rows.`
    );
  }
}

/**
 * Assert that a query succeeds under the given user context.
 * Useful for positive RLS tests — confirming access is granted.
 *
 * @returns The query result rows.
 */
export async function expectRlsAllowed<T = Record<string, unknown>>(
  db: PgTestClient,
  query: string,
  params?: unknown[]
): Promise<T[]> {
  try {
    const result = await db.query<T>(query, params);
    return result.rows;
  } catch (err: any) {
    const msg = err.message || '';
    if (msg.includes('row-level security') || msg.includes('permission denied')) {
      throw new Error(
        `Expected query to be allowed but got RLS denial:\n${msg}\n\n` +
        `Verify the actor has the required SPRT membership + permissions.`
      );
    }
    throw err;
  }
}

/**
 * Run a callback as a specific user context, automatically resetting afterwards.
 * Combined with RLS assertion helpers for clean RLS test blocks.
 *
 * @example
 * await withUserContext(db, ALICE_ID, database_id, async () => {
 *   await expectRlsAllowed(db, `SELECT * FROM my_table`);
 * });
 * await withUserContext(db, BOB_ID, database_id, async () => {
 *   await expectRlsHidden(db, `SELECT * FROM my_table WHERE ...`);
 * });
 */
export async function withUserContext<T>(
  db: PgTestClient,
  user_id: string,
  database_id: string | undefined,
  fn: () => Promise<T>
): Promise<T> {
  setUserContext(db, user_id, database_id);
  try {
    return await fn();
  } finally {
    db.setContext({});
  }
}
