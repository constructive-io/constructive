import type { PgTestClient } from 'pgsql-test';
import { ident } from '../core/identifiers';

export interface SprtRow {
  actor_id: string;
  is_admin: boolean;
  [key: string]: unknown;
}

/**
 * READ-ONLY: Resolve and query the SPRT (Shadow Permission Resolution Table)
 * for a given database + scope.
 *
 * ⚠️  DIAGNOSTIC ONLY — for asserting that trigger chains populated correctly.
 * Never INSERT or UPDATE SPRT rows directly. The SPRT is a materialized cache
 * populated automatically by the membership trigger chain:
 *   membership INSERT (is_active=TRUE) → SPRT INSERT
 *   membership UPDATE (is_admin changes) → SPRT UPDATE
 *
 * To populate the SPRT:
 *   1. setDatabaseAppMembershipDefaults(pg, db_id, { is_verified: true, is_approved: true })
 *   2. seedDatabaseUser(pg, db_id, { ... })   → triggers SPRT INSERT
 *   3. makeDatabaseAppAdmin(pg, db_id, actor_id) → triggers SPRT UPDATE (is_admin=true)
 */
export async function resolveSprt(
  pg: PgTestClient,
  database_id: string,
  scope: string = 'app'
): Promise<{ schema_name: string; table_name: string }> {
  return pg.one<{ schema_name: string; table_name: string }>(
    `SELECT s.schema_name, t.name AS table_name
     FROM metaschema_modules_public.memberships_module mm
     JOIN metaschema_public.table t ON t.id = mm.sprt_table_id
     JOIN metaschema_public.schema s ON s.id = t.schema_id
     WHERE mm.database_id = $1 AND mm.scope = $2`,
    [database_id, scope]
  );
}

/**
 * READ-ONLY: Get all SPRT rows for a database + scope.
 * Used to verify the trigger chain populated membership rows correctly.
 */
export async function getSprtRows(
  pg: PgTestClient,
  database_id: string,
  scope: string = 'app'
): Promise<SprtRow[]> {
  const sprt = await resolveSprt(pg, database_id, scope);
  return pg.any<SprtRow>(
    `SELECT * FROM ${ident(sprt.schema_name, sprt.table_name)}`
  );
}

/**
 * READ-ONLY: Get the SPRT row for a specific actor in a database.
 * Returns null if the user has no active membership (SPRT not populated).
 */
export async function getSprtRow(
  pg: PgTestClient,
  database_id: string,
  actor_id: string,
  scope: string = 'app'
): Promise<SprtRow | null> {
  const sprt = await resolveSprt(pg, database_id, scope);
  return pg.oneOrNone<SprtRow>(
    `SELECT * FROM ${ident(sprt.schema_name, sprt.table_name)}
     WHERE actor_id = $1`,
    [actor_id]
  );
}

/**
 * READ-ONLY: Assert that an actor has a populated SPRT row.
 * Throws a descriptive error if the SPRT row is missing.
 */
export async function assertSprtPopulated(
  pg: PgTestClient,
  database_id: string,
  actor_id: string,
  scope: string = 'app'
): Promise<SprtRow> {
  const row = await getSprtRow(pg, database_id, actor_id, scope);
  if (!row) {
    const sprt = await resolveSprt(pg, database_id, scope);
    throw new Error(
      `SPRT row not found for actor_id=${actor_id} in ` +
      `${sprt.schema_name}.${sprt.table_name}. ` +
      `Did you call setDatabaseAppMembershipDefaults() with ` +
      `{ is_verified: true, is_approved: true } BEFORE seedDatabaseUser()?`
    );
  }
  return row;
}
