/**
 * Statement facts and identities as pgpm sees them: `@pgsql/semantics`'
 * `classifyStatements` and `@pgsql/transform`'s `identityOf`, completed for
 * the statement shapes upstream leaves unidentified. Every pgpm driver
 * imports these instead of the upstream functions so one patch covers
 * import, transform, partition and diff alike.
 *
 * Completed here:
 * - `CREATE MATERIALIZED VIEW` / `CREATE TABLE .. AS` (`CreateTableAsStmt`):
 *   upstream classifies them as `other` with no creates, so they fell into
 *   `misc/statements` and nothing could depend on them. They now create the
 *   relation they name (kind `view` for materialized views, `table` for CTAS).
 */
import type { StatementFacts } from '@pgsql/semantics';
import { classifyStatements as upstreamClassify } from '@pgsql/semantics';
import type { ObjectIdentity } from '@pgsql/transform';
import { identityOf as upstreamIdentityOf } from '@pgsql/transform';
import { parseSync } from 'plpgsql-parser';

import { sliceStatementBytes, sqlSourceBytes } from './byte-slice';

interface IntoRelation { schemaname?: string; relname?: string }

/** The relation a `CreateTableAsStmt` creates, and the kind pgpm files it under. */
function createTableAsTarget(text: string): { schema: string | null; name: string; kind: 'view' | 'table' } | null {
  let stmts;
  try {
    stmts = parseSync(text).sql.stmts;
  } catch {
    return null;
  }
  if (stmts.length !== 1) return null;
  const stmt = stmts[0].stmt as unknown as { CreateTableAsStmt?: { into?: { rel?: IntoRelation }; objtype?: string } };
  const rel = stmt.CreateTableAsStmt?.into?.rel;
  if (!rel?.relname) return null;
  return {
    schema: rel.schemaname ?? null,
    name: rel.relname,
    kind: stmt.CreateTableAsStmt?.objtype === 'OBJECT_MATVIEW' ? 'view' : 'table'
  };
}

/** `classifyStatements` with pgpm's completions applied. */
export function classifyStatements(sql: string): StatementFacts[] {
  const facts = upstreamClassify(sql);
  let bytes: Buffer | null = null;
  return facts.map(f => {
    if (f.nodeTag !== 'CreateTableAsStmt' || f.creates.length > 0) return f;
    bytes ??= sqlSourceBytes(sql);
    const target = createTableAsTarget(sliceStatementBytes(bytes, f.span.start, f.span.len));
    if (!target) return f;
    return { ...f, kind: target.kind, creates: [{ schema: target.schema, name: target.name }] };
  });
}

/** `identityOf` with pgpm's completions applied. */
export function identityOf(f: StatementFacts): ObjectIdentity | null {
  const upstream = upstreamIdentityOf(f);
  if (upstream) return upstream;
  if (f.nodeTag === 'CreateTableAsStmt' && f.creates.length > 0) {
    return { kind: f.kind === 'view' ? 'view' : 'table', schema: f.creates[0].schema, name: f.creates[0].name };
  }
  return null;
}
