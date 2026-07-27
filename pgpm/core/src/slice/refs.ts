import { walk as walkSql } from '@pgsql/traverse';
import { transformSync, walk as walkPlpgsql } from 'plpgsql-parser';

/**
 * The parser runs on a WASM build of the real PostgreSQL parser; callers must
 * `await loadModule()` once before any synchronous extraction/slicing call.
 */
export { loadModule } from 'plpgsql-parser';

/**
 * A (possibly schema-qualified) database object name extracted from SQL.
 */
export interface SqlObjectRef {
  schema: string | null;
  name: string;
}

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

function ref(schema: string | null | undefined, name: string): SqlObjectRef {
  return { schema: schema ?? null, name };
}

function nameListToRef(names: any[] | undefined): SqlObjectRef | null {
  if (!Array.isArray(names) || names.length === 0) return null;
  const parts = names
    .map((n: any) => n?.String?.sval)
    .filter((s: any) => typeof s === 'string');
  if (parts.length === 0) return null;
  if (parts.length === 1) return ref(null, parts[0]);
  return ref(parts[parts.length - 2], parts[parts.length - 1]);
}

function isCatalogSchema(schema: string | null): boolean {
  return schema === 'pg_catalog' || schema === 'information_schema';
}

function pushRef(refs: SqlObjectRef[], r: SqlObjectRef | null): void {
  if (!r || !r.schema || isCatalogSchema(r.schema)) return;
  if (refs.some(x => x.schema === r.schema && x.name === r.name)) return;
  refs.push(r);
}

function pushCreate(creates: SqlObjectRef[], r: SqlObjectRef | null): void {
  if (!r) return;
  if (creates.some(x => x.schema === r.schema && x.name === r.name)) return;
  creates.push(r);
}

function createReferencesVisitor(facts: ChangeSqlFacts) {
  return {
    RangeVar: (path: any) => {
      const node = path.node;
      if (node.schemaname) {
        pushRef(facts.references, ref(node.schemaname, node.relname));
      }
    },
    FuncCall: (path: any) => {
      pushRef(facts.references, nameListToRef(path.node.funcname));
    },
    TypeName: (path: any) => {
      pushRef(facts.references, nameListToRef(path.node.names));
    },
    Constraint: (path: any) => {
      const node = path.node;
      if (node.contype === 'CONSTR_FOREIGN' && node.pktable?.schemaname) {
        pushRef(facts.references, ref(node.pktable.schemaname, node.pktable.relname));
      }
    }
  };
}

function collectCreates(nodeTag: string, node: any, facts: ChangeSqlFacts): void {
  switch (nodeTag) {
    case 'CreateSchemaStmt':
      pushCreate(facts.creates, ref(null, node.schemaname));
      break;
    case 'CreateStmt':
    case 'ViewStmt': {
      const rel = nodeTag === 'ViewStmt' ? node.view : node.relation;
      if (rel) pushCreate(facts.creates, ref(rel.schemaname ?? null, rel.relname));
      break;
    }
    case 'CreateFunctionStmt':
      pushCreate(facts.creates, nameListToRef(node.funcname));
      break;
    case 'CreateTrigStmt':
      if (node.relation) {
        pushCreate(
          facts.creates,
          ref(node.relation.schemaname ?? null, `${node.relation.relname}.${node.trigname}`)
        );
      }
      pushRef(facts.references, nameListToRef(node.funcname));
      break;
    case 'CreateSeqStmt':
      if (node.sequence) {
        pushCreate(facts.creates, ref(node.sequence.schemaname ?? null, node.sequence.relname));
      }
      break;
    case 'CompositeTypeStmt':
      if (node.typevar) {
        pushCreate(facts.creates, ref(node.typevar.schemaname ?? null, node.typevar.relname));
      }
      break;
    case 'CreateEnumStmt':
    case 'CreateDomainStmt':
    case 'CreateRangeStmt':
      pushCreate(facts.creates, nameListToRef(node.typeName ?? node.domainname));
      break;
    case 'IndexStmt':
      if (node.relation) {
        pushCreate(
          facts.creates,
          ref(node.relation.schemaname ?? null, node.idxname ?? node.relation.relname)
        );
      }
      break;
    default:
      break;
  }
}

/**
 * Extract created objects and schema-qualified references from a SQL script,
 * including references reached inside PL/pgSQL function bodies (which are
 * opaque strings in `CREATE FUNCTION` and invisible to a plain SQL parse).
 */
export function extractSqlFacts(sql: string): ChangeSqlFacts {
  const facts: ChangeSqlFacts = { creates: [], references: [], dynamicSql: false };

  transformSync(sql, (ctx: any) => {
    const stmts: any[] = ctx.sql?.stmts ?? [];
    for (const stmt of stmts) {
      const stmtNode = stmt?.stmt;
      if (!stmtNode) continue;
      const nodeTag = Object.keys(stmtNode)[0];
      collectCreates(nodeTag, stmtNode[nodeTag] ?? {}, facts);
      walkSql(stmtNode, createReferencesVisitor(facts));
    }

    for (const fn of ctx.functions ?? []) {
      if (!fn.plpgsql?.hydrated) continue;
      walkPlpgsql(fn.plpgsql.hydrated, {
        PLpgSQL_stmt_dynexecute: () => { facts.dynamicSql = true; },
        PLpgSQL_stmt_dynfors: () => { facts.dynamicSql = true; }
      }, {
        walkSqlExpressions: true,
        sqlVisitor: createReferencesVisitor(facts)
      });
    }
  }, { hydrate: true });

  // A change does not depend on objects it creates itself.
  facts.references = facts.references.filter(
    r => !facts.creates.some(c => c.schema === r.schema && c.name === r.name)
  );

  return facts;
}
