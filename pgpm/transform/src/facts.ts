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
 * - `CREATE EXTENSION`: upstream identifies it but records no creates, so the
 *   granularity driver had no object to file the statement under and dropped
 *   it from the program.
 * - Schema objects upstream leaves unidentified — collations, aggregates,
 *   operators (`DefineStmt`), casts, extended statistics, rules, operator
 *   classes/families, publications, event triggers, foreign tables, foreign
 *   servers and FDWs. They create the object they name (naming-spec kind
 *   `other`, so they get their own unit, path and inverse instead of riding
 *   along with whatever statement preceded them).
 */
import type { StatementFacts } from '@pgsql/semantics';
import { classifyStatements as upstreamClassify } from '@pgsql/semantics';
import type { ObjectIdentity } from '@pgsql/transform';
import { identityOf as upstreamIdentityOf } from '@pgsql/transform';
import { parseSync } from 'plpgsql-parser';

import { sliceStatementBytes, sqlSourceBytes } from './byte-slice';
import { canonicalTypeNames } from './type-canon';

interface IntoRelation { schemaname?: string; relname?: string }
interface Completion { schema: string | null; name: string; kind: StatementFacts['kind']; identity: ObjectIdentityKind }

type ObjectIdentityKind = ObjectIdentity['kind'];

const strings = (items: unknown[] | undefined): string[] =>
  (items ?? []).map(n => (n as { String?: { sval?: string } }).String?.sval).filter((s): s is string => typeof s === 'string');

/** Operator symbols spelled out so their paths are distinct and filesystem-safe. */
const OPERATOR_CHARS: Record<string, string> = {
  '+': 'plus', '-': 'minus', '*': 'star', '/': 'slash', '<': 'lt', '>': 'gt', '=': 'eq', '~': 'tilde',
  '!': 'bang', '@': 'at', '#': 'hash', '%': 'pct', '^': 'caret', '&': 'amp', '|': 'pipe', '`': 'tick', '?': 'q'
};
const operatorName = (symbol: string): string =>
  `op_${[...symbol].map(c => OPERATOR_CHARS[c] ?? c).join('_')}`;

interface TypeNameNode { names?: { String?: { sval?: string } }[]; arrayBounds?: unknown[] }

/** `int4`, `text[]`, ...: a type as it names an overload, filesystem-safe. */
const typeLabel = (type: TypeNameNode): string => {
  const names = strings(canonicalTypeNames((type.names ?? []) as any) as any);
  const base = names[names.length - 1] ?? 'unknown';
  return `${base}${type.arrayBounds && type.arrayBounds.length > 0 ? '_array' : ''}`.replace(/[^a-zA-Z0-9_]/g, '_');
};

const qualified = (names: string[]): { schema: string | null; name: string } | null =>
  names.length === 0 ? null : { schema: names.length > 1 ? names[names.length - 2] : null, name: names[names.length - 1] };

const DEFINE_KINDS: Record<string, { kind: StatementFacts['kind']; identity: ObjectIdentityKind }> = {
  OBJECT_TYPE: { kind: 'type', identity: 'type' },
  OBJECT_COLLATION: { kind: 'other', identity: 'other' },
  OBJECT_AGGREGATE: { kind: 'other', identity: 'other' },
  OBJECT_OPERATOR: { kind: 'other', identity: 'other' },
  OBJECT_TSCONFIGURATION: { kind: 'other', identity: 'other' },
  OBJECT_TSDICTIONARY: { kind: 'other', identity: 'other' },
  OBJECT_TSPARSER: { kind: 'other', identity: 'other' },
  OBJECT_TSTEMPLATE: { kind: 'other', identity: 'other' }
};

const other = (target: { schema: string | null; name: string } | null, kind: StatementFacts['kind'] = 'other'): Completion | null =>
  target ? { ...target, kind, identity: 'other' } : null;

/** The object a statement upstream leaves unidentified creates, and the kind pgpm files it under. */
function completionFor(text: string): Completion | null {
  let stmts;
  try {
    stmts = parseSync(text).sql.stmts;
  } catch {
    return null;
  }
  if (stmts.length !== 1) return null;
  const stmt = stmts[0].stmt as unknown as Record<string, any>;
  const [tag] = Object.keys(stmt);
  const node = stmt[tag];
  switch (tag) {
  case 'CreateTableAsStmt': {
    const rel = node.into?.rel as IntoRelation | undefined;
    if (!rel?.relname) return null;
    const kind = node.objtype === 'OBJECT_MATVIEW' ? 'view' : 'table';
    return { schema: rel.schemaname ?? null, name: rel.relname, kind, identity: kind };
  }
  case 'CreateExtensionStmt':
    return node.extname ? { schema: null, name: node.extname, kind: 'extension', identity: 'extension' } : null;
  case 'DefineStmt': {
    const spec = DEFINE_KINDS[node.kind];
    const target = qualified(strings(node.defnames));
    if (!spec || !target) return null;
    // Operators and aggregates overload on their argument types, so the
    // types are part of the identity (and the path).
    if (node.kind === 'OBJECT_OPERATOR') {
      const operand = (which: string): string => {
        const def = (node.definition ?? []).find((d: any) => d.DefElem?.defname?.toLowerCase() === which)?.DefElem;
        return def?.arg?.TypeName ? typeLabel(def.arg.TypeName) : 'none';
      };
      target.name = `${operatorName(target.name)}__${operand('leftarg')}_${operand('rightarg')}`;
    } else if (node.kind === 'OBJECT_AGGREGATE') {
      const params = (node.args?.[0]?.List?.items ?? []) as { FunctionParameter?: { argType?: TypeNameNode } }[];
      const labels = params.map(p => p.FunctionParameter?.argType).filter((t): t is TypeNameNode => !!t).map(typeLabel);
      target.name = `${target.name}__${labels.length > 0 ? labels.join('_') : 'star'}`;
    }
    return { ...target, ...spec };
  }
  case 'CreateCastStmt': {
    const src = qualified(strings(node.sourcetype?.names));
    const tgt = qualified(strings(node.targettype?.names));
    return src && tgt ? other({ schema: null, name: `cast_${src.name}_as_${tgt.name}` }) : null;
  }
  case 'CreateStatsStmt':
    return other(qualified(strings(node.defnames)));
  case 'RuleStmt': {
    const rel = node.relation as IntoRelation | undefined;
    return rel?.relname && node.rulename
      ? other({ schema: rel.schemaname ?? null, name: `${rel.relname}.rule.${node.rulename}` })
      : null;
  }
  case 'CreateOpClassStmt': {
    const target = qualified(strings(node.opclassname));
    return target ? other({ schema: target.schema, name: `opclass_${node.amname}_${target.name}` }) : null;
  }
  case 'CreateOpFamilyStmt': {
    const target = qualified(strings(node.opfamilyname));
    return target ? other({ schema: target.schema, name: `opfamily_${node.amname}_${target.name}` }) : null;
  }
  case 'CreatePublicationStmt':
    return node.pubname ? other({ schema: null, name: `publication_${node.pubname}` }) : null;
  case 'CreateSubscriptionStmt':
    return node.subname ? other({ schema: null, name: `subscription_${node.subname}` }) : null;
  case 'CreateEventTrigStmt':
    return node.trigname ? other({ schema: null, name: `event_trigger_${node.trigname}` }) : null;
  case 'CreateForeignTableStmt': {
    const rel = node.base?.relation as IntoRelation | undefined;
    return rel?.relname ? other({ schema: rel.schemaname ?? null, name: rel.relname }) : null;
  }
  case 'CreateForeignServerStmt':
    return node.servername ? other({ schema: null, name: `server_${node.servername}` }) : null;
  case 'CreateFdwStmt':
    return node.fdwname ? other({ schema: null, name: `fdw_${node.fdwname}` }) : null;
  default:
    return null;
  }
}

/** Node tags `completionFor` identifies; others never need a parse. */
const COMPLETED_TAGS = new Set([
  'CreateTableAsStmt', 'CreateExtensionStmt', 'DefineStmt', 'CreateCastStmt', 'CreateStatsStmt', 'RuleStmt',
  'CreateOpClassStmt', 'CreateOpFamilyStmt', 'CreatePublicationStmt', 'CreateSubscriptionStmt', 'CreateEventTrigStmt',
  'CreateForeignTableStmt', 'CreateForeignServerStmt', 'CreateFdwStmt'
]);

/** Identity kind of a completed statement, from its (completed) facts. */
function completedIdentityKind(f: StatementFacts): ObjectIdentityKind | null {
  if (!COMPLETED_TAGS.has(f.nodeTag) || f.creates.length === 0) return null;
  switch (f.nodeTag) {
  case 'CreateTableAsStmt': return f.kind === 'view' ? 'view' : 'table';
  case 'CreateExtensionStmt': return 'extension';
  case 'DefineStmt': return f.kind === 'type' ? 'type' : 'other';
  default: return 'other';
  }
}

/** `classifyStatements` with pgpm's completions applied. */
export function classifyStatements(sql: string): StatementFacts[] {
  const facts = upstreamClassify(sql);
  let bytes: Buffer | null = null;
  return facts.map(f => {
    if (!COMPLETED_TAGS.has(f.nodeTag) || f.creates.length > 0) return f;
    bytes ??= sqlSourceBytes(sql);
    const target = completionFor(sliceStatementBytes(bytes, f.span.start, f.span.len));
    if (!target) return f;
    return { ...f, kind: target.kind, creates: [{ schema: target.schema, name: target.name }] };
  });
}

/** `identityOf` with pgpm's completions applied. */
export function identityOf(f: StatementFacts): ObjectIdentity | null {
  const upstream = upstreamIdentityOf(f);
  if (upstream) return upstream;
  const kind = completedIdentityKind(f);
  if (!kind) return null;
  return { kind, schema: f.creates[0].schema, name: f.creates[0].name };
}
