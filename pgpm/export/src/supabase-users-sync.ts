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

export const addSupabaseUsersSync = async (
  rows: PgpmRow[],
  { schema_name, table_name }: SupabaseUsersTable,
  categoryFiltered: boolean
): Promise<void> => {
  await loadModule();
  const matchesTable = (relation?: { schemaname?: string; relname?: string }) =>
    relation?.schemaname === schema_name && relation.relname === table_name;
  const isPrimaryKey = (node?: ConstraintNode) =>
    node?.Constraint?.contype === 'CONSTR_PRIMARY';

  // Constructive exports create an empty table and add its primary key
  // separately. Anchor the sync to the key, even when SQL is partitioned.
  const row = rows.find(row => parseSqlProgram(row.content).statements.some(({ stmt }) => {
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

  const table = `${escapeIdentifier(schema_name)}.${escapeIdentifier(table_name)}`;
  if (!row) {
    const reason = `no primary key migration for ${table}`;
    if (!categoryFiltered) throw new Error(`Cannot export Supabase user sync: ${reason}.`);
    console.warn(`Skipping Supabase user sync in category-filtered export: ${reason}.`);
    return;
  }
  row.content += `\nSELECT supabase_integration.sync_users(${escapeLiteral(table)}::regclass);`;
  row.revert = `DROP TRIGGER IF EXISTS supabase_sync_users ON auth.users;\n${row.revert ?? ''}`;
};
