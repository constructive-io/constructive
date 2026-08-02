import { buildStatementGraph, classifyStatements, QualifiedName } from '@pgpmjs/transform';

/**
 * The parser runs on a WASM build of the real PostgreSQL parser; callers must
 * `await loadModule()` once before any synchronous extraction/slicing call.
 */
export { loadModule } from 'plpgsql-parser';

/**
 * A (possibly schema-qualified) database object name extracted from SQL.
 * Alias of `@pgsql/semantics`'s `QualifiedName` — one name type across the
 * facts substrate and the slice layer.
 */
export type SqlObjectRef = QualifiedName;

/**
 * AST-derived facts about a change's deploy SQL, used to discover
 * dependencies that are not declared in plan `requires` headers.
 */
export interface ChangeSqlFacts {
  /** Objects the SQL creates (tables, views, functions, types, triggers, ...). */
  creates: SqlObjectRef[];
  /**
   * Schema-qualified objects the SQL references — tables, functions and types
   * reached anywhere in the statements, including PL/pgSQL function bodies.
   * Unqualified references are omitted (they resolve via search_path and
   * cannot be mapped to a producer without catalog knowledge).
   */
  references: SqlObjectRef[];
  /**
   * True when a PL/pgSQL body executes dynamic SQL (EXECUTE ...). References
   * inside the dynamic string are invisible to the AST, so the extracted
   * references are incomplete for this change.
   */
  dynamicSql: boolean;
}

function pushUnique(list: SqlObjectRef[], r: SqlObjectRef): void {
  if (list.some(x => x.schema === r.schema && x.name === r.name)) return;
  list.push(r);
}

/**
 * Extract created objects and schema-qualified references from a SQL script,
 * including references reached inside PL/pgSQL function bodies (which are
 * opaque strings in `CREATE FUNCTION` and invisible to a plain SQL parse).
 *
 * A thin change-level adapter over the facts layer: `classifyStatements`
 * produces the per-statement facts and `buildStatementGraph`'s producer index
 * decides which references are internal — a reference with an in-script
 * producer is satisfied by the change itself, so only external references
 * (the statement graph's non-edges) surface as change-level dependencies.
 */
export function extractSqlFacts(sql: string): ChangeSqlFacts {
  const statements = classifyStatements(sql);
  const graph = buildStatementGraph(statements);
  const facts: ChangeSqlFacts = { creates: [], references: [], dynamicSql: false };

  for (const stmt of statements) {
    for (const c of stmt.creates) {
      pushUnique(facts.creates, { schema: c.schema, name: c.name });
    }
    for (const r of stmt.references) {
      if (graph.producers.has(`${r.schema ?? ''}.${r.name}`)) continue;
      pushUnique(facts.references, { schema: r.schema, name: r.name });
    }
    if (stmt.dynamicSql) facts.dynamicSql = true;
  }

  return facts;
}
