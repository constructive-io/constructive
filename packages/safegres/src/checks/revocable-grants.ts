/**
 * L21: `granted − reachable`, the revocable-grant rule.
 *
 * For a role R, {@link analyzeRevocableGrants} computes the set of EXECUTE
 * grants R holds that no path can exercise, so a human never has to guess which
 * of R's grants are safe to drop. It is the reachability proof the rest of the
 * L-series only approximates: L1 asks whether an indirect *relation* grant is
 * admitted by current policy coverage, L3 asks whether an object grant is
 * blocked by missing schema USAGE, and L6 suppresses an unaddressable relation
 * finding whenever a policy predicate merely *names* the relation. L21 asks the
 * broader question — "can this grant be exercised at all?" — across object
 * kinds and every execution path a grant can travel, and only claims a grant
 * revocable when it can prove the answer is no.
 *
 * Reach(R) is closed over, at minimum:
 *
 *   1. **Direct call targets** — functions in an exposed schema R can EXECUTE
 *      and reach through schema USAGE.
 *   2. **RLS policy predicates.** For every policy on a relation R can address,
 *      the `USING`/`WITH CHECK` expressions and the functions and relations
 *      they name, closed over transitively. These evaluate as R.
 *   3. **Trigger bodies.** For every ordinary trigger on a relation R can
 *      write, the trigger function's body — when it is not SECURITY DEFINER,
 *      it runs as R. (EXECUTE on the trigger function itself is *not* reach:
 *      Postgres never checks it when firing a trigger, so such a grant is
 *      genuinely revocable, which is the whole point of the constructive-db
 *      audit.)
 *   4. **Write-time expressions** — column defaults, generated columns and
 *      CHECK constraints on relations R can insert into or update. They run as
 *      the writing role.
 *   5. **Views and their bodies**, so a grant exercised only through an
 *      `security_invoker` view survives.
 *
 * A SECURITY DEFINER boundary **stops** the closure: inside it the owner's
 * privileges apply, not R's, so R needs EXECUTE on the definer function
 * (retained) but not on anything the body goes on to call.
 *
 * **Fail-closed, bounded by USAGE.** Nothing is reported revocable that the
 * analysis cannot prove unused. If any node reached as R runs SQL this analysis
 * cannot read — dynamic `EXECUTE`, a body that fails to parse, a C/internal
 * function — the role's closure is incomplete: that opaque node, running as R,
 * could construct a call to any function R can *actually name and execute*. But
 * Postgres still enforces schema USAGE at call time, so an opaque node running
 * as R can only reach functions in schemas R holds USAGE on. A candidate whose
 * schema R cannot even name is therefore out of an opaque node's reach: it can
 * only be exercised through a reference this analysis *does* follow (a policy
 * predicate, trigger body, write-time expression or view), so if none landed on
 * it, it is revocable. Only unreached candidates in a USAGE-reachable schema are
 * moved from `revocable` to `suppressed`, with the reason recorded. This is what
 * lets the constructive-db audit prove the blanket EXECUTE on private-schema
 * functions revocable — anonymous cannot name those schemas — while never
 * revoking a grant an opaque node could plausibly exercise.
 */

import { extractBody, extractQuery } from '../callgraph/extract';
import type { SchemaAclInfo } from '../pg/acl';
import type { FunctionSnapshot } from '../pg/functions';
import type { ViewSnapshot } from '../pg/indexes';
import type { PgPrivilege, TableSnapshot } from '../pg/introspect';
import type { ReachInputs } from '../pg/reach-inputs';
import type { Finding } from '../types';
import { effectiveExecute, effectiveGrants, type GrantVia, type RoleGraph } from './lattice';

/** Which execution path retained a grant — the proof a human reviews. */
export type RetainReason =
  | 'direct-call'
  | 'policy-predicate'
  | 'trigger'
  | 'default-expression'
  | 'generated-column'
  | 'check-constraint'
  | 'view';

/** A `(role, object, kind)` grant, the machine-consumable unit of the rule. */
export interface GrantTuple {
  role: string;
  schema: string;
  object: string;
  /** Argument signature, for the function overload the grant is on. */
  args: string;
  kind: 'function';
  privilege: 'EXECUTE';
  /** How R comes to hold it — `direct` or `member of <role>` (never PUBLIC). */
  via: GrantVia;
}

/** A grant the analysis proved reachable, with the path(s) that retained it. */
export interface RetainedGrant extends GrantTuple {
  reasons: RetainReason[];
  proof: string[];
}

/** A grant the analysis could not prove unused, and why. */
export interface SuppressedGrant extends GrantTuple {
  reason: string;
}

/** A node in R's closure that ran SQL the analysis could not read. */
export interface TaintNode {
  node: string;
  reason: string;
}

export interface RoleRevocable {
  role: string;
  summary: {
    candidates: number;
    revocable: number;
    retained: number;
    retainedByPolicy: number;
    retainedByTrigger: number;
    suppressed: number;
  };
  /** Grants that can be dropped without changing what R can do. */
  revocable: GrantTuple[];
  /** Grants that must be kept, each with the path(s) proving it load-bearing. */
  retained: RetainedGrant[];
  /** Grants left retained only because the closure was incomplete. */
  suppressed: SuppressedGrant[];
  /** The opaque nodes that forced the suppressions above. */
  taint: TaintNode[];
}

export interface RevocableGrantsReport {
  roles: RoleRevocable[];
}

export interface RevocableGrantsInput {
  roles: string[];
  functions: FunctionSnapshot[];
  tables: TableSnapshot[];
  views: ViewSnapshot[];
  graph: RoleGraph;
  schemaAcls: Map<string, SchemaAclInfo>;
  reachInputs: ReachInputs;
  /** Schemas the exposed API surface can reach; empty when the surface is unknown. */
  exposedSchemas: Set<string>;
  /** True when an exposure surface was resolved — otherwise all schemas are reachable. */
  exposureKnown: boolean;
  /** Relations the generated API declares it cannot address (`schema.table`). */
  unaddressable: Set<string>;
}

const WRITE_PRIVILEGES: PgPrivilege[] = ['INSERT', 'UPDATE', 'DELETE'];
const ACCESS_PRIVILEGES: PgPrivilege[] = ['SELECT', 'INSERT', 'UPDATE', 'DELETE'];
/** Languages whose bodies can be read; anything else is opaque for this rule. */
const READABLE_LANGUAGES = new Set(['sql', 'plpgsql']);

/**
 * The revocable, retained and suppressed EXECUTE grants for each configured
 * role. One reachability closure is walked per role; the candidate set is R's
 * own EXECUTE grants (direct or inherited — a grant TO PUBLIC is not R's to
 * revoke on its own, so it is never a candidate).
 */
export async function analyzeRevocableGrants(
  input: RevocableGrantsInput
): Promise<RevocableGrantsReport> {
  const functionsByName = new Map<string, FunctionSnapshot[]>();
  for (const fn of input.functions) {
    const key = `${fn.schema}.${fn.name}`;
    functionsByName.set(key, [...(functionsByName.get(key) ?? []), fn]);
  }
  const tablesByKey = new Map(input.tables.map((t) => [`${t.schema}.${t.name}`, t]));
  const viewsByKey = new Map(input.views.map((v) => [`${v.schema}.${v.name}`, v]));

  const roles: RoleRevocable[] = [];
  for (const role of input.roles) {
    roles.push(
      await analyzeRole(role, input, { functionsByName, tablesByKey, viewsByKey })
    );
  }
  return { roles };
}

interface Indexes {
  functionsByName: Map<string, FunctionSnapshot[]>;
  tablesByKey: Map<string, TableSnapshot>;
  viewsByKey: Map<string, ViewSnapshot>;
}

async function analyzeRole(
  role: string,
  input: RevocableGrantsInput,
  idx: Indexes
): Promise<RoleRevocable> {
  const { graph, schemaAcls, reachInputs, functions, tables, views } = input;

  const fnId = (fn: FunctionSnapshot): string => `${fn.schema}.${fn.name}(${fn.args})`;

  const reached = new Map<string, { reasons: Set<RetainReason>; proof: string }>();
  const taint: TaintNode[] = [];
  const framesWalked = new Set<string>();
  const viewsWalked = new Set<string>();
  const relationsClosed = new Set<string>();

  const resolve = (ref: { schema?: string; name: string }, contextSchema: string): FunctionSnapshot[] =>
    idx.functionsByName.get(`${ref.schema ?? contextSchema}.${ref.name}`) ?? [];

  const hasUsage = (schema: string): boolean => {
    const acl = schemaAcls.get(schema);
    if (!acl) return true; // schema not introspected — assume reachable, never revoke on a guess
    if (role === acl.owner) return true;
    const usage = new Set(acl.grants.filter((g) => g.privilege === 'USAGE').map((g) => g.role));
    if (usage.has('PUBLIC') || usage.has(role)) return true;
    const ancestors = graph.get(role)?.inheritsFrom ?? [];
    return ancestors.some((a) => usage.has(a) || a === acl.owner);
  };

  const markReached = (fn: FunctionSnapshot, reason: RetainReason, proof: string): void => {
    const id = fnId(fn);
    const entry = reached.get(id);
    if (entry) entry.reasons.add(reason);
    else reached.set(id, { reasons: new Set([reason]), proof });
  };

  // `readBody` re-classifies C/internal (and any other non-SQL) function as
  // opaque. `extractBody` treats those as known-empty for the call graph,
  // which is safe there but would let this rule prove a grant unused off a
  // body it never read — the one thing it must not do.
  const readBody = async (fn: FunctionSnapshot): ReturnType<typeof extractBody> => {
    if (!READABLE_LANGUAGES.has(fn.language)) {
      return {
        calls: [],
        tables: [],
        settings: [],
        opaque: true,
        opaqueReason: `language "${fn.language}" is not statically analyzable`
      };
    }
    return extractBody(fn);
  };

  // A function body running as R: its callees run as R too, so each is a grant
  // R must hold. The function itself is marked reached by its caller, not here.
  const walkFrame = async (fn: FunctionSnapshot, reason: RetainReason, proof: string): Promise<void> => {
    const id = fnId(fn);
    if (framesWalked.has(id)) return;
    framesWalked.add(id);
    const body = await readBody(fn);
    if (body.opaque) {
      taint.push({ node: id, reason: body.opaqueReason ?? 'body could not be read' });
      return;
    }
    if (body.tainted) taint.push({ node: id, reason: body.tainted });
    for (const call of body.calls) {
      for (const callee of resolve(call, fn.schema)) {
        await seedFunction(callee, reason, `${proof} → ${fnId(callee)}`);
      }
    }
  };

  // R invokes `fn` as itself: R needs EXECUTE on it (retained). Follow the body
  // only when it runs as R — a SECURITY DEFINER boundary stops the closure.
  const seedFunction = async (fn: FunctionSnapshot, reason: RetainReason, proof: string): Promise<void> => {
    markReached(fn, reason, proof);
    if (!fn.isSecurityDefiner) await walkFrame(fn, reason, proof);
  };

  // A standalone SQL expression evaluated as R: a policy predicate, a column
  // default, a CHECK. Wrapped in `SELECT` so the parser accepts a bare
  // expression; the functions it calls and the relations it reads close over.
  const seedExpr = async (
    exprSql: string,
    reason: RetainReason,
    contextSchema: string,
    proof: string
  ): Promise<void> => {
    const parsed = await extractQuery(`SELECT ${exprSql}`);
    if (parsed.opaque) {
      taint.push({ node: proof, reason: parsed.opaqueReason ?? 'expression could not be read' });
      return;
    }
    if (parsed.tainted) taint.push({ node: proof, reason: parsed.tainted });
    for (const call of parsed.calls) {
      for (const callee of resolve(call, contextSchema)) {
        await seedFunction(callee, reason, `${proof} → ${fnId(callee)}`);
      }
    }
    for (const t of parsed.tables) {
      await closeRelationPolicies(`${t.schema ?? contextSchema}.${t.name}`, reason);
    }
  };

  // The policies of a relation read within a running-as-R context also run as
  // R, so their predicates close over too — this is the load-bearing path the
  // constructive-db audit is about.
  const closeRelationPolicies = async (relKey: string, reason: RetainReason): Promise<void> => {
    if (relationsClosed.has(relKey)) return;
    relationsClosed.add(relKey);
    const table = idx.tablesByKey.get(relKey);
    if (!table) return;
    for (const p of table.policies) {
      if (p.using) await seedExpr(p.using, reason, table.schema, `policy ${p.name} USING on ${relKey}`);
      if (p.withCheck) {
        await seedExpr(p.withCheck, reason, table.schema, `policy ${p.name} WITH CHECK on ${relKey}`);
      }
    }
  };

  const walkView = async (view: ViewSnapshot, reason: RetainReason): Promise<void> => {
    const key = `${view.schema}.${view.name}`;
    if (viewsWalked.has(key)) return;
    viewsWalked.add(key);
    if (!view.securityInvoker) return; // definer view: body runs as the owner
    const parsed = await extractQuery(view.definition);
    if (parsed.opaque) {
      taint.push({ node: key, reason: parsed.opaqueReason ?? 'view body could not be read' });
      return;
    }
    if (parsed.tainted) taint.push({ node: key, reason: parsed.tainted });
    for (const call of parsed.calls) {
      for (const callee of resolve(call, view.schema)) {
        await seedFunction(callee, reason, `view ${key} → ${fnId(callee)}`);
      }
    }
    for (const t of parsed.tables) {
      const tk = `${t.schema ?? view.schema}.${t.name}`;
      await closeRelationPolicies(tk, reason);
      const nested = idx.viewsByKey.get(tk);
      if (nested) await walkView(nested, reason);
    }
  };

  const reachable = (schema: string): boolean =>
    !input.exposureKnown || input.exposedSchemas.has(schema);

  // 1. Direct call entrypoints.
  for (const fn of functions) {
    if (fn.returnsTrigger) continue; // not directly callable, whatever its ACL
    if (!reachable(fn.schema)) continue;
    if (effectiveExecute(fn, role, graph) === null) continue;
    if (!hasUsage(fn.schema)) continue;
    await seedFunction(fn, 'direct-call', `direct EXECUTE entrypoint ${fnId(fn)}`);
  }

  // 2/3/4. Per-relation closures: policy predicates, trigger bodies and
  // write-time expressions, for the relations R can actually address.
  for (const table of tables) {
    const key = `${table.schema}.${table.name}`;
    if (input.exposureKnown && input.unaddressable.has(key)) continue;
    if (!hasUsage(table.schema)) continue;
    const held = new Set(effectiveGrants(table, role, graph).map((g) => g.privilege));
    if (!ACCESS_PRIVILEGES.some((p) => held.has(p))) continue;

    await closeRelationPolicies(key, 'policy-predicate');

    const writes = WRITE_PRIVILEGES.filter((p) => held.has(p));
    if (writes.length === 0) continue;

    for (const trig of reachInputs.triggers.get(key) ?? []) {
      if (trig.instead) continue; // INSTEAD OF is a view trigger, reached via walkView
      if (!trig.events.some((e) => writes.includes(e))) continue;
      for (const fn of resolve({ schema: trig.functionSchema, name: trig.functionName }, trig.functionSchema)) {
        // EXECUTE on the trigger function is never needed; only what its body
        // calls, and only when the body runs as R (not SECURITY DEFINER).
        if (!fn.isSecurityDefiner) {
          await walkFrame(fn, 'trigger', `trigger ${trig.name} on ${key} → ${fnId(fn)}`);
        }
      }
    }

    for (const expr of reachInputs.expressions.get(key) ?? []) {
      const reason: RetainReason =
        expr.kind === 'check' ? 'check-constraint'
          : expr.kind === 'generated' ? 'generated-column'
            : 'default-expression';
      await seedExpr(expr.expr, reason, table.schema, `${reason} ${expr.name} on ${key}`);
    }
  }

  // 5. Views R can read (or write): an invoker view's body runs as R.
  for (const view of views) {
    if (view.materialized) continue;
    if (!reachable(view.schema)) continue;
    if (!hasUsage(view.schema)) continue;
    const held = new Set(effectiveGrants({ grants: view.grants }, role, graph).map((g) => g.privilege));
    if (!ACCESS_PRIVILEGES.some((p) => held.has(p))) continue;
    await walkView(view, 'view');
  }

  return classify(role, functions, graph, fnId, reached, taint, hasUsage);
}

function classify(
  role: string,
  functions: FunctionSnapshot[],
  graph: RoleGraph,
  fnId: (fn: FunctionSnapshot) => string,
  reached: Map<string, { reasons: Set<RetainReason>; proof: string }>,
  taint: TaintNode[],
  hasUsage: (schema: string) => boolean
): RoleRevocable {
  const revocable: GrantTuple[] = [];
  const retained: RetainedGrant[] = [];
  const suppressed: SuppressedGrant[] = [];
  // An opaque node reached as R can construct a dynamic call to any function R
  // can name — but only in a schema R holds USAGE on. Candidates outside those
  // schemas are beyond its reach, so opacity does not protect them.
  const opaqueReached = taint.length > 0;

  for (const fn of functions) {
    const via = effectiveExecute(fn, role, graph);
    if (via === null || via === 'PUBLIC') continue; // not a grant R can revoke on its own
    const tuple: GrantTuple = {
      role,
      schema: fn.schema,
      object: fn.name,
      args: fn.args,
      kind: 'function',
      privilege: 'EXECUTE',
      via
    };
    const hit = reached.get(fnId(fn));
    if (hit) {
      retained.push({ ...tuple, reasons: [...hit.reasons].sort(), proof: [hit.proof] });
    } else if (opaqueReached && hasUsage(fn.schema)) {
      suppressed.push({
        ...tuple,
        reason:
          'analysis incomplete — an opaque node reached as this role could construct a dynamic call '
          + 'to any function in a schema the role holds USAGE on, including this one, so the grant '
          + 'cannot be proven unused'
      });
    } else {
      revocable.push(tuple);
    }
  }

  const byReason = (r: RetainReason): number =>
    retained.filter((g) => g.reasons.includes(r)).length;

  return {
    role,
    summary: {
      candidates: revocable.length + retained.length + suppressed.length,
      revocable: revocable.length,
      retained: retained.length,
      retainedByPolicy: byReason('policy-predicate'),
      retainedByTrigger: byReason('trigger'),
      suppressed: suppressed.length
    },
    revocable: sortTuples(revocable),
    retained: sortTuples(retained),
    suppressed: sortTuples(suppressed),
    taint
  };
}

function sortTuples<T extends GrantTuple>(tuples: T[]): T[] {
  return [...tuples].sort((a, b) =>
    `${a.schema}.${a.object}(${a.args})`.localeCompare(`${b.schema}.${b.object}(${b.args})`)
  );
}

/**
 * L21 findings: one per revocable grant. The proof of every *retained* grant
 * lives in `report.revocableGrants`, not in the finding stream — a retained
 * grant is not a problem, and the finding stream is problems. The revocable
 * recommendation carries its own tuple in `context` so a caller can act on it
 * without re-deriving it.
 */
export function revocableGrantFindings(report: RevocableGrantsReport): Finding[] {
  const out: Finding[] = [];
  for (const role of report.roles) {
    for (const g of role.revocable) {
      const object = `${g.schema}.${g.object}(${g.args})`;
      out.push({
        code: 'L21',
        severity: 'info',
        category: 'coverage',
        schema: g.schema,
        table: g.object,
        role: g.role,
        privilege: 'EXECUTE',
        message:
          `Role ${g.role} holds EXECUTE on ${object} (${g.via}) but no reachable path exercises it — `
          + 'the grant is revocable',
        hint:
          'The reachability closure — direct calls, RLS policy predicates, trigger bodies, write-time '
          + 'expressions and the views this role can reach — never lands on this function, so revoking '
          + 'EXECUTE from the role changes nothing it can do. Review `report.revocableGrants` for the '
          + 'retained grants and their proof paths before applying a batch revoke.',
        context: {
          object,
          kind: g.kind,
          via: g.via,
          revocable: true
        }
      });
    }
  }
  return out;
}
