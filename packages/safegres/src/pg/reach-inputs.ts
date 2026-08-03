/**
 * Extra catalog inputs the revocable-grant rule (L21) needs and no other rule
 * reads: the ordinary triggers on a relation, and the SQL expressions a write
 * to it evaluates — column defaults, generated columns and CHECK constraints.
 *
 * All three matter for one reason: they run as the *querying* role, not the
 * table owner. A function called from a column default or a trigger body is a
 * function the writing role must be able to EXECUTE, exactly as if it had
 * called it directly — so a grant reached only that way is load-bearing and
 * must not be reported revocable. The per-table policy predicates L21 also
 * closes over already live on {@link TableSnapshot.policies}; only these three
 * were missing.
 */

import type { QueryExecutor } from './introspect';

/** A non-internal trigger on a relation, and the function it fires. */
export interface RelationTrigger {
  name: string;
  /** The write commands that fire it (TRUNCATE is dropped — it grants nothing). */
  events: Array<'INSERT' | 'UPDATE' | 'DELETE'>;
  /** `INSTEAD OF` (view) vs an ordinary BEFORE/AFTER trigger. */
  instead: boolean;
  functionSchema: string;
  functionName: string;
}

/** A SQL expression a write to the relation evaluates, as the querying role. */
export interface RelationExpr {
  kind: 'default' | 'generated' | 'check';
  /** Column name for default/generated; constraint name for check. */
  name: string;
  expr: string;
}

export interface ReachInputs {
  /** Triggers per relation, keyed `schema.table`. */
  triggers: Map<string, RelationTrigger[]>;
  /** Write-time expressions per relation, keyed `schema.table`. */
  expressions: Map<string, RelationExpr[]>;
}

export interface ReachInputsOptions {
  schemas?: string[];
  excludeSchemas?: string[];
}

const DEFAULT_EXCLUDES = ['pg_catalog', 'information_schema', 'pg_toast'];

/**
 * The triggers and write-time expressions of every relation in scope, in two
 * cheap queries. Keyed the same way the table snapshot is (`schema.table`), so
 * the engine can look inputs up by the relation it is already iterating.
 */
export async function introspectReachInputs(
  exec: QueryExecutor,
  options: ReachInputsOptions = {}
): Promise<ReachInputs> {
  const excludes = [...DEFAULT_EXCLUDES, ...(options.excludeSchemas ?? [])];
  const include = options.schemas ?? [];
  // Both params are referenced unconditionally so the prepared statement's
  // parameter count never depends on which branch of the include/exclude
  // choice applies (`pg` binds by count, not by name).
  const schemaFilter =
    'AND CASE WHEN cardinality($1::text[]) > 0'
    + ' THEN n.nspname = ANY($1::text[])'
    + ' ELSE NOT (n.nspname = ANY($2::text[])) END';

  const triggers = await introspectTriggers(exec, schemaFilter, include, excludes);
  const expressions = await introspectExpressions(exec, schemaFilter, include, excludes);
  return { triggers, expressions };
}

async function introspectTriggers(
  exec: QueryExecutor,
  schemaFilter: string,
  include: string[],
  excludes: string[]
): Promise<Map<string, RelationTrigger[]>> {
  // tgtype bits (see access/tableam / commands/trigger.h): 1 ROW, 2 BEFORE,
  // 4 INSERT, 8 DELETE, 16 UPDATE, 32 TRUNCATE, 64 INSTEAD OF. Decoded here so
  // the engine gets event names, not a bitmask.
  const { rows } = await exec.query<{
    schema: string;
    relation: string;
    name: string;
    fires_insert: boolean;
    fires_update: boolean;
    fires_delete: boolean;
    instead: boolean;
    fn_schema: string;
    fn_name: string;
  }>(
    `
    SELECT
      n.nspname                      AS schema,
      c.relname                      AS relation,
      t.tgname                       AS name,
      (t.tgtype & 4)  <> 0           AS fires_insert,
      (t.tgtype & 16) <> 0           AS fires_update,
      (t.tgtype & 8)  <> 0           AS fires_delete,
      (t.tgtype & 64) <> 0           AS instead,
      fn.nspname                     AS fn_schema,
      p.proname                      AS fn_name
    FROM pg_trigger t
    JOIN pg_class c ON c.oid = t.tgrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    JOIN pg_proc p ON p.oid = t.tgfoid
    JOIN pg_namespace fn ON fn.oid = p.pronamespace
    WHERE NOT t.tgisinternal
      AND n.nspname NOT LIKE 'pg\\_%'
      ${schemaFilter}
    ORDER BY n.nspname, c.relname, t.tgname
    `,
    [include, excludes]
  );

  const out = new Map<string, RelationTrigger[]>();
  for (const r of rows) {
    const events: RelationTrigger['events'] = [];
    if (r.fires_insert) events.push('INSERT');
    if (r.fires_update) events.push('UPDATE');
    if (r.fires_delete) events.push('DELETE');
    const key = `${r.schema}.${r.relation}`;
    const list = out.get(key) ?? [];
    list.push({
      name: r.name,
      events,
      instead: r.instead,
      functionSchema: r.fn_schema,
      functionName: r.fn_name
    });
    out.set(key, list);
  }
  return out;
}

async function introspectExpressions(
  exec: QueryExecutor,
  schemaFilter: string,
  include: string[],
  excludes: string[]
): Promise<Map<string, RelationExpr[]>> {
  const out = new Map<string, RelationExpr[]>();
  const add = (key: string, expr: RelationExpr): void => {
    const list = out.get(key) ?? [];
    list.push(expr);
    out.set(key, list);
  };

  // Column defaults and generated-column expressions both live in pg_attrdef;
  // a generated column is flagged by pg_attribute.attgenerated.
  const { rows: defaults } = await exec.query<{
    schema: string;
    relation: string;
    column: string;
    generated: boolean;
    expr: string | null;
  }>(
    `
    SELECT
      n.nspname                              AS schema,
      c.relname                              AS relation,
      a.attname                              AS column,
      a.attgenerated <> ''                   AS generated,
      pg_get_expr(ad.adbin, ad.adrelid)      AS expr
    FROM pg_attrdef ad
    JOIN pg_class c ON c.oid = ad.adrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    JOIN pg_attribute a ON a.attrelid = ad.adrelid AND a.attnum = ad.adnum
    WHERE n.nspname NOT LIKE 'pg\\_%'
      ${schemaFilter}
    ORDER BY n.nspname, c.relname, a.attnum
    `,
    [include, excludes]
  );
  for (const r of defaults) {
    if (!r.expr) continue;
    add(`${r.schema}.${r.relation}`, {
      kind: r.generated ? 'generated' : 'default',
      name: r.column,
      expr: r.expr
    });
  }

  const { rows: checks } = await exec.query<{
    schema: string;
    relation: string;
    name: string;
    expr: string | null;
  }>(
    `
    SELECT
      n.nspname                              AS schema,
      c.relname                              AS relation,
      con.conname                            AS name,
      pg_get_expr(con.conbin, con.conrelid)  AS expr
    FROM pg_constraint con
    JOIN pg_class c ON c.oid = con.conrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE con.contype = 'c'
      AND n.nspname NOT LIKE 'pg\\_%'
      ${schemaFilter}
    ORDER BY n.nspname, c.relname, con.conname
    `,
    [include, excludes]
  );
  for (const r of checks) {
    if (!r.expr) continue;
    add(`${r.schema}.${r.relation}`, { kind: 'check', name: r.name, expr: r.expr });
  }

  return out;
}
