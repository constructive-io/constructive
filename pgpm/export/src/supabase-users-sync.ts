import type { PgpmRow } from '@pgpmjs/core';
import { loadModule, parseSqlProgram } from '@pgpmjs/transform';
import { escapeIdentifier, escapeLiteral } from 'pg';

export interface SupabaseUsersTable {
  schema_name: string;
  table_name: string;
}

interface ConstraintNode {
  Constraint?: { contype: string };
}

const findUsersPrimaryKey = (
  rows: PgpmRow[],
  { schema_name, table_name }: SupabaseUsersTable
): PgpmRow | undefined => {
  const matchesTable = (relation?: { schemaname?: string; relname?: string }) =>
    relation?.schemaname === schema_name && relation.relname === table_name;
  const isPrimaryKey = (node?: ConstraintNode) =>
    node?.Constraint?.contype === 'CONSTR_PRIMARY';

  // Constructive exports create an empty table and add its primary key
  // separately. The sync trigger uses that key for ON CONFLICT.
  return rows.find(row => parseSqlProgram(row.content).statements.some(({ stmt }) => {
    const { CreateStmt, AlterTableStmt } = stmt;
    if (matchesTable(CreateStmt?.relation)) {
      return CreateStmt.tableElts?.some((element: ConstraintNode & { ColumnDef?: { constraints?: ConstraintNode[] } }) =>
        isPrimaryKey(element) || element.ColumnDef?.constraints?.some(isPrimaryKey)
      );
    }
    return matchesTable(AlterTableStmt?.relation) &&
      AlterTableStmt.cmds?.some(({ AlterTableCmd }: { AlterTableCmd?: { def?: ConstraintNode } }) =>
        isPrimaryKey(AlterTableCmd?.def)
      );
  }));
};

export const addSupabaseUsersSync = async (
  packages: PgpmRow[][],
  users: SupabaseUsersTable,
  getExcludedRows?: () => Promise<PgpmRow[]>
): Promise<void> => {
  await loadModule();
  const { schema_name, table_name } = users;
  const table = `${escapeIdentifier(schema_name)}.${escapeIdentifier(table_name)}`;
  const deploy = 'supabase/register_users';

  for (const rows of packages) {
    const key = findUsersPrimaryKey(rows, users);
    if (!key) continue;
    if (rows.some(row => row.deploy === deploy)) {
      throw new Error(`Cannot export Supabase user sync: migration ${deploy} already exists.`);
    }
    // Existing deployments skip recorded changes, so leave the key migration intact.
    rows.push({
      name: 'Supabase user sync',
      deploy,
      deps: [key.deploy],
      content: `SELECT supabase_integration.sync_users(${escapeLiteral(table)}::regclass);`,
      revert: 'DROP TRIGGER IF EXISTS supabase_sync_users ON auth.users;',
      verify: `DO $verify$
BEGIN
  IF NOT EXISTS (
    SELECT FROM pg_catalog.pg_trigger
    WHERE tgrelid = 'auth.users'::regclass
      AND tgname = 'supabase_sync_users'
      AND tgfoid = 'supabase_integration.tg_sync_users()'::regprocedure
  ) THEN
    RAISE EXCEPTION 'Supabase user sync trigger is not installed';
  END IF;
END;
$verify$;`
    });
    return;
  }

  if (getExcludedRows && findUsersPrimaryKey(await getExcludedRows(), users)) {
    console.warn(`Skipping Supabase user sync: category filter excluded the primary key migration for ${table}.`);
    return;
  }
  throw new Error(`Cannot export Supabase user sync: no primary key migration for ${table}.`);
};
