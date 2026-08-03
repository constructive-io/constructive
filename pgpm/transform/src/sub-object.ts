/**
 * Sub-object identities: the column or constraint a single `ALTER TABLE`
 * statement adds.
 *
 * `identityOf` summarizes an ALTER TABLE by the table it targets — the right
 * grouping key for object-level changes, but lossy one level down: the added
 * column's `colname` and the added constraint's `conname` stay behind in the
 * raw parse node (`facts.stmt`). This module recovers them, giving the
 * change-granularity pipeline a stable identity (and naming-spec path) for
 * every alteration.
 */
import type { ObjectIdentity } from '@pgpmjs/naming-spec';
import type { StatementFacts } from '@pgsql/semantics';
import { Deparser, parseSync } from 'plpgsql-parser';

import { sliceStatementBytes, sqlSourceBytes } from './byte-slice';
import { ConstraintNode, defaultConstraintName } from './constraint-names';

interface AlterTableCmdNode {
  subtype?: string;
  def?: {
    ColumnDef?: { colname?: string };
    Constraint?: ConstraintNode;
  };
}

interface AlterTableStmtNode {
  relation?: { schemaname?: string; relname?: string };
  cmds?: { AlterTableCmd?: AlterTableCmdNode }[];
}

/** The single AlterTableCmd of a one-command ALTER TABLE, or null. */
function singleCmd(stmt: AlterTableStmtNode): AlterTableCmdNode | null {
  const cmds = stmt.cmds ?? [];
  if (cmds.length !== 1) return null;
  return cmds[0].AlterTableCmd ?? null;
}

/**
 * The column or constraint a one-command `ALTER TABLE .. ADD COLUMN` /
 * `ADD CONSTRAINT` statement adds, as a naming-spec identity
 * (`kind: 'column' | 'constraint'`, `table` set). Unnamed constraints get
 * their Postgres default name. Returns `null` for anything else — multi-
 * command ALTERs, other subtypes, non-ALTER statements — so callers fall
 * back to object-level grouping.
 */
export function subObjectIdentityOf(facts: StatementFacts): ObjectIdentity | null {
  const stmt = facts.stmt?.AlterTableStmt as AlterTableStmtNode | undefined;
  if (!stmt?.relation?.relname) return null;
  const cmd = singleCmd(stmt);
  if (!cmd) return null;

  const schema = stmt.relation.schemaname ?? null;
  const table = stmt.relation.relname;

  if (cmd.subtype === 'AT_AddColumn' && cmd.def?.ColumnDef?.colname) {
    return { kind: 'column', schema, name: cmd.def.ColumnDef.colname, table };
  }
  if (cmd.subtype === 'AT_AddConstraint' && cmd.def?.Constraint) {
    const constraint = cmd.def.Constraint;
    const name = constraint.conname ?? defaultConstraintName(table, constraint);
    if (!name) return null;
    return { kind: 'constraint', schema, name, table };
  }
  return null;
}

/**
 * Rewrite a script so every unnamed `ALTER TABLE .. ADD <constraint>` carries
 * its Postgres default name (`ADD PRIMARY KEY (id)` becomes `ADD CONSTRAINT
 * {table}_pkey PRIMARY KEY (id)`) — the exact name the catalog would assign
 * anyway. Naming them makes each constraint change independently revertible
 * (`DROP CONSTRAINT <name>`) and verifiable. Statements that need no rewrite
 * keep their original text.
 */
export function nameUnnamedConstraints(sql: string): string {
  const parsed = parseSync(sql);
  const sqlBytes = sqlSourceBytes(sql);
  const pieces: string[] = [];
  for (const raw of parsed.sql.stmts) {
    const node = raw.stmt as Record<string, unknown>;
    const stmt = node.AlterTableStmt as AlterTableStmtNode | undefined;
    const table = stmt?.relation?.relname;
    let rewritten = false;
    if (stmt && table) {
      for (const cmd of stmt.cmds ?? []) {
        const at = cmd.AlterTableCmd;
        const constraint = at?.subtype === 'AT_AddConstraint' ? at.def?.Constraint : undefined;
        if (constraint && !constraint.conname) {
          const name = defaultConstraintName(table, constraint);
          if (name) {
            constraint.conname = name;
            rewritten = true;
          }
        }
      }
    }
    if (rewritten) {
      pieces.push(`${Deparser.deparse(node, { pretty: true })};`);
    } else {
      const start = (raw as { stmt_location?: number }).stmt_location ?? 0;
      const len = (raw as { stmt_len?: number }).stmt_len;
      const text = sliceStatementBytes(sqlBytes, start, len);
      const trimmed = text.trim();
      pieces.push(trimmed.endsWith(';') ? trimmed : `${trimmed};`);
    }
  }
  return pieces.join('\n\n');
}
