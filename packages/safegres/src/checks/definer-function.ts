/**
 * L19 and L20: privilege that arrives through a *function body*.
 *
 * L8 modelled the view half of "SQL bodies confer privilege". This is the
 * other half, and the larger one:
 *
 *   - **L19, SECURITY DEFINER functions.** A definer function executes as its
 *     owner, so every relation its body touches is touched with the owner's
 *     privileges — including tables the caller holds nothing on, and, when
 *     the owner owns the table or bypasses RLS, without the row filter the
 *     table's policies would have applied. EXECUTE on the function is the
 *     only grant the caller needs, and no ACL on the base relation names it.
 *     Verified on PostgreSQL 18: an anonymous role with EXECUTE read every
 *     row of an RLS-protected table it had no grant on, while the invoker
 *     twin of the same function was denied.
 *
 *   - **L20, `INSTEAD OF` triggers.** A write against a view carrying one
 *     never reaches a base relation: it *becomes* the trigger function's
 *     body. L9 suppressed those views because nothing followed that body —
 *     this rule follows it. The body is permission-checked against the
 *     function's effective user, so the escalation exists only when the
 *     trigger function is SECURITY DEFINER; the view's own owner and its
 *     `security_invoker` setting do not govern it. Both halves were probed on
 *     PG 18: the invoker trigger function was denied on the relation its body
 *     wrote, the definer one wrote it as its owner.
 *
 * The conservatism is L8's, unchanged. A body that cannot be read is unknown,
 * not empty: its fragmentary access list is discarded and the function is
 * reported as a coverage gap (L15) rather than scanned clean. And the fix is
 * never a revoke — EXECUTE on the function is what the API serves; the defect
 * is what the body does with the owner's rights.
 */

import { extractBody, extractFunctionAccess } from '../callgraph/extract';
import type { SchemaAclInfo } from '../pg/acl';
import type { FunctionSnapshot } from '../pg/functions';
import type { ViewSnapshot } from '../pg/indexes';
import type { PgPrivilege, TableSnapshot } from '../pg/introspect';
import type { Finding } from '../types';
import {
  buildRelationIndex,
  readBodies,
  type RelationIndex,
  resolveRelation,
  resolveViewBases,
  type SuppressedView,
  type ViewBodies
} from './definer-view';
import { effectiveGrants, type LatticeRoleOptions, type RoleGraph } from './lattice';
import {
  computeFunctionReach,
  computeTriggerWriteReach,
  type FunctionAccess,
  type FunctionHop,
  type FunctionReachInput,
  type RoleReachCell,
  type TriggerWriteInput
} from './role-reach';

/** How deep a chain of calls is followed before the walk gives up. */
const MAX_CALL_DEPTH = 8;

/** The commands an `INSTEAD OF` trigger can be defined for. */
const TRIGGER_EVENTS: PgPrivilege[] = ['INSERT', 'UPDATE', 'DELETE'];

export interface FunctionBodyAnalysis {
  /** Functions that execute as someone other than the caller, as reach inputs. */
  functions: FunctionReachInput[];
  /** `INSTEAD OF` triggers whose function re-owns the write. */
  triggers: TriggerWriteInput[];
  /** Bodies deliberately left out, with why — an unread body is not a clean bill. */
  suppressed: SuppressedView[];
}

/**
 * Read every SECURITY DEFINER function's body and resolve what it reaches.
 *
 * Calls are followed: an invoker function called from a definer still runs
 * with the definer's owner in force, while an inner definer switches the
 * executing role again — the same rule as nested views, because it is the
 * same rule. Views read from a body are followed too, through the existing
 * view walk, so a definer function selecting from a definer view reaches that
 * view's bases as well.
 */
export async function analyzeFunctionBodies(
  functions: FunctionSnapshot[],
  views: ViewSnapshot[],
  tables: TableSnapshot[],
  auditedSchemas?: Iterable<string>
): Promise<FunctionBodyAnalysis> {
  const queryableViews = views.filter((v) => !v.materialized);
  const index = buildRelationIndex(queryableViews, tables, auditedSchemas);
  const viewBodies = await readBodies(queryableViews);

  const byName = new Map<string, FunctionSnapshot[]>();
  for (const fn of functions) {
    const key = `${fn.schema}.${fn.name}`;
    byName.set(key, [...(byName.get(key) ?? []), fn]);
  }

  const out: FunctionReachInput[] = [];
  const suppressed: SuppressedView[] = [];

  for (const fn of functions) {
    if (!fn.isSecurityDefiner) continue;
    // A trigger function is not callable: Postgres refuses a direct call
    // however wide its EXECUTE ACL is, so EXECUTE on one is not reach. It is
    // reachable only by firing the trigger, which is what L20 grades.
    if (fn.returnsTrigger) continue;
    const id = `${fn.schema}.${fn.name}(${fn.args})`;

    const walk = await walkFunction(fn, byName, index, viewBodies);
    if (walk.opaque) suppressed.push({ view: id, reason: walk.opaque });
    const unreadable = walk.opaque ?? walk.tainted;
    if (!unreadable && walk.accesses.length === 0) continue;

    out.push({
      schema: fn.schema,
      name: fn.name,
      args: fn.args,
      owner: fn.owner,
      grants: fn.grants,
      defaultAcl: fn.defaultAcl,
      accesses: walk.opaque ? [] : walk.accesses,
      ...(unreadable ? { unreadable } : {})
    });
  }

  const triggers = await analyzeInsteadOfTriggers(
    queryableViews,
    byName,
    index,
    viewBodies,
    suppressed
  );

  return { functions: out, triggers, suppressed };
}

/**
 * The relations a write against a view carrying `INSTEAD OF` triggers lands
 * on, for the triggers whose function re-owns the write.
 *
 * An invoker trigger function is not an edge: its body runs as the caller and
 * Postgres denies exactly what it would have denied on a direct write. A
 * trigger function that is missing from the snapshot, or whose body cannot be
 * read, is suppressed — the write goes *somewhere*, and guessing where is the
 * one thing this analysis must not do.
 */
async function analyzeInsteadOfTriggers(
  views: ViewSnapshot[],
  byName: Map<string, FunctionSnapshot[]>,
  index: RelationIndex,
  viewBodies: ViewBodies,
  suppressed: SuppressedView[]
): Promise<TriggerWriteInput[]> {
  const out: TriggerWriteInput[] = [];

  for (const view of views) {
    for (const trigger of view.insteadOf) {
      const name = `${view.schema}.${view.name}`;
      const fnId = `${trigger.functionSchema}.${trigger.functionName}`;
      const group = byName.get(fnId);
      if (!group || group.length === 0) {
        suppressed.push({ view: name, reason: `trigger function ${fnId} is outside the audited schemas` });
        continue;
      }

      for (const fn of group) {
        if (!fn.isSecurityDefiner) continue; // the body runs as the caller: no edge

        const walk = await walkFunction(fn, byName, index, viewBodies);
        if (walk.opaque) {
          suppressed.push({
            view: name,
            reason: `trigger ${trigger.name} runs ${fnId}, whose body could not be read: ${walk.opaque}`
          });
          continue;
        }
        if (walk.accesses.length === 0) continue;

        out.push({
          schema: view.schema,
          name: view.name,
          grants: view.grants,
          trigger: trigger.name,
          events: trigger.events.filter((e) => TRIGGER_EVENTS.includes(e)),
          fn: fnId,
          fnOwner: fn.owner,
          accesses: walk.accesses.map((a) => ({
            schema: a.schema,
            table: a.table,
            privilege: a.privilege,
            ...(a.external ? { external: true } : {})
          }))
        });
      }
    }
  }

  return out;
}

interface FunctionWalk {
  accesses: FunctionAccess[];
  /** The body could not be read at all: `accesses` is a fragment, discard it. */
  opaque?: string;
  /** The body was read but runs SQL of its own: `accesses` is a lower bound. */
  tainted?: string;
}

/**
 * The relations `root`'s body reaches, with the role in force at each one.
 *
 * Overloads collapse when resolving a call, as they do in the call graph:
 * a body naming `f(...)` is followed into every `f` in scope, because the
 * argument types the call actually binds are not in the reference.
 */
async function walkFunction(
  root: FunctionSnapshot,
  byName: Map<string, FunctionSnapshot[]>,
  index: RelationIndex,
  viewBodies: ViewBodies
): Promise<FunctionWalk> {
  const accesses: FunctionAccess[] = [];
  const seen = new Set<string>();
  let opaque: string | undefined;
  let tainted: string | undefined;

  const visit = async (fn: FunctionSnapshot, hops: FunctionHop[], stack: Set<string>): Promise<void> => {
    const id = `${fn.schema}.${fn.name}`;
    if (hops.length > MAX_CALL_DEPTH) {
      opaque ??= `call chain deeper than ${MAX_CALL_DEPTH} hops`;
      return;
    }

    const body = await extractFunctionAccess(fn);
    if (body.opaque) {
      // Only the entry function's opacity discards the walk; a callee we
      // cannot read leaves what we *did* read standing, and taints the rest.
      if (hops.length === 1) opaque ??= body.opaqueReason ?? 'body could not be read';
      else tainted ??= `${id}: ${body.opaqueReason ?? 'body could not be read'}`;
      return;
    }

    const owner = hops[hops.length - 1].owner;

    for (const access of body.accesses) {
      const relation = resolveRelation(access, fn.schema, index);
      if (!relation) continue; // a CTE, an alias, or a name we cannot pin down

      if (relation.kind === 'view') {
        // Only reads through a view are placeable: where a *write* against a
        // view lands is the view-writes question, not this one.
        if (access.privilege !== 'SELECT') continue;
        const view = relation.view;
        const { bases, opaque: viewOpaque, tainted: viewTainted } =
          resolveViewBases(view, index, viewBodies);
        if (viewOpaque) {
          tainted ??= `${view.schema}.${view.name}: ${viewOpaque}`;
          continue;
        }
        if (viewTainted) tainted ??= viewTainted;

        for (const base of bases) {
          // The view's own hops re-own the read only where the view is a
          // definer; an invoker view keeps whichever owner is already in
          // force, which here is the function's.
          const viewHops = base.hops.map((h) => ({
            view: h.view,
            owner: h.view === `${view.schema}.${view.name}` && view.securityInvoker ? owner : h.owner
          }));
          push({
            schema: base.schema,
            table: base.table,
            privilege: 'SELECT',
            hops: [...hops],
            viewHops,
            ...(base.external ? { external: true } : {})
          });
        }
        continue;
      }

      push({
        schema: relation.schema,
        table: relation.name,
        privilege: access.privilege,
        hops: [...hops],
        ...(relation.kind === 'external' ? { external: true } : {})
      });
    }

    // Calls. `extractFunctionAccess` answers "which relation, which
    // privilege"; the call list is the read/write walk's answer, and both
    // read the same body.
    const called = await extractBody(fn);
    if (called.tainted) tainted ??= `${id}: ${called.tainted}`;
    for (const ref of called.calls) {
      const candidates = ref.schema
        ? byName.get(`${ref.schema}.${ref.name}`) ?? []
        : byName.get(`${fn.schema}.${ref.name}`) ?? [];
      for (const callee of candidates) {
        const calleeId = `${callee.schema}.${callee.name}(${callee.args})`;
        if (stack.has(calleeId)) continue; // recursion: the reach is already counted
        // An inner definer re-owns the execution; an invoker runs under
        // whichever owner is already in force.
        const nextOwner = callee.isSecurityDefiner ? callee.owner : owner;
        await visit(
          callee,
          [...hops, { fn: `${callee.schema}.${callee.name}`, owner: nextOwner }],
          new Set([...stack, calleeId])
        );
      }
    }
  };

  const push = (access: FunctionAccess): void => {
    const last = access.viewHops?.[access.viewHops.length - 1]?.owner
      ?? access.hops[access.hops.length - 1].owner;
    const key = `${access.schema}.${access.table}::${access.privilege}::${last}`;
    if (seen.has(key)) return;
    seen.add(key);
    accesses.push(access);
  };

  const rootId = `${root.schema}.${root.name}(${root.args})`;
  await visit(root, [{ fn: `${root.schema}.${root.name}`, owner: root.owner }], new Set([rootId]));

  return { accesses, ...(opaque ? { opaque } : {}), ...(tainted ? { tainted } : {}) };
}

/**
 * L19: an untrusted role reaches a relation by executing a SECURITY DEFINER
 * function.
 *
 * Fires once per (role, function, relation, privilege) where the role can
 * EXECUTE the function, the body touches the relation as someone else, and
 * the role holds no such privilege on the relation itself. The invoker twin
 * of the same function produces nothing: its body runs as the caller, so the
 * relation's own ACL and policies apply and there is no edge to report.
 */
export function checkDefinerFunctionReach(
  functions: FunctionReachInput[],
  tables: TableSnapshot[],
  graph: RoleGraph,
  schemaAcls: Map<string, SchemaAclInfo>,
  options: LatticeRoleOptions = {}
): Finding[] {
  const untrusted = options.roles ?? [];
  if (untrusted.length === 0 || functions.length === 0) return [];

  const byKey = new Map(tables.map((t) => [`${t.schema}.${t.name}`, t]));
  const byFn = new Map(functions.map((f) => [`${f.schema}.${f.name}`, f]));
  const out: Finding[] = [];

  for (const { role, cells } of computeFunctionReach(functions, graph, untrusted)) {
    for (const cell of cells) {
      if (cell.effectiveRole === role) continue;
      // A tainted cell names the function, not a relation: L15 reports it.
      if (cell.proof === 'opaque-tainted') continue;

      const base = byKey.get(`${cell.schema}.${cell.table}`);
      if (!base) continue;
      const privilege = cell.privileges[0];
      // Already reachable in its own right: the function launders nothing.
      if (effectiveGrants(base, role, graph).some((g) => g.privilege === privilege)) continue;

      const hops = functionHops(cell);
      const entry = hops[0];
      if (!entry) continue;
      if (!canEnterSchema(entry.fn.split('.')[0], role, graph, schemaAcls)) continue;
      const owner = cell.effectiveRole;
      const rlsBypassed = ownerBypassesRls(base, owner, graph);
      const target = `${base.schema}.${base.name}`;
      const viewHops = cell.path.filter((e): e is { kind: 'view'; view: string; owner: string } =>
        e.kind === 'view'
      );
      const defaultAcl = byFn.get(entry.fn)?.defaultAcl === true;

      out.push({
        code: 'L19',
        severity: 'info',
        category: 'anti-pattern',
        schema: base.schema,
        table: base.name,
        role,
        privilege,
        message:
          `Untrusted role ${role} can ${privilege} ${target} by executing SECURITY DEFINER function `
          + `${entry.fn}, which runs as its owner ${owner} — ${role} holds no ${privilege} on the `
          + 'relation'
          + (rlsBypassed ? `, and ${owner} is not subject to its RLS policies` : ''),
        hint:
          `A SECURITY DEFINER function is a deliberate hand-off of ${owner}'s privileges: everything `
          + `its body touches, it touches as ${owner}, and EXECUTE is the only grant ${role} needed. `
          + `Narrow the body to what the function is meant to expose, authorize the caller inside it, `
          + `or give the function an owner whose reach matches its job. Make it \`SECURITY INVOKER\` `
          + `if the hand-off was not intended. Do not revoke EXECUTE — that grant is what the API `
          + 'serves'
          + (defaultAcl
            ? `, though note the EXECUTE here is Postgres's default function ACL (EXECUTE TO PUBLIC), `
              + 'not a grant anyone wrote: confirm it was intended.'
            : '.'),
        context: {
          function: entry.fn,
          effectiveRole: owner,
          viaFunctions: hops.map((h) => h.fn),
          ...(viewHops.length > 0 ? { viaViews: viewHops.map((h) => h.view) } : {}),
          baseRlsEnabled: base.rlsEnabled,
          rlsBypassed,
          defaultAcl,
          proof: cell.proof
        }
      });
    }
  }

  return out;
}

/**
 * L20: an untrusted role writes a relation through an `INSTEAD OF` trigger
 * whose function is SECURITY DEFINER.
 *
 * This is the suppression L9 has carried since it shipped. A write against a
 * view with `INSTEAD OF` triggers never reaches a base relation — Postgres
 * runs the trigger function instead — and where that write lands is in the
 * body. Following it makes the edge provable; where the body is unreadable,
 * or the trigger function runs as the caller, the suppression stands.
 */
export function checkInsteadOfTriggerWrite(
  triggers: TriggerWriteInput[],
  tables: TableSnapshot[],
  graph: RoleGraph,
  options: LatticeRoleOptions = {}
): Finding[] {
  const untrusted = options.roles ?? [];
  if (untrusted.length === 0 || triggers.length === 0) return [];

  const byKey = new Map(tables.map((t) => [`${t.schema}.${t.name}`, t]));
  const out: Finding[] = [];

  for (const { role, cells } of computeTriggerWriteReach(triggers, graph, untrusted)) {
    for (const cell of cells) {
      if (cell.effectiveRole === role) continue;

      const base = byKey.get(`${cell.schema}.${cell.table}`);
      if (!base) continue;
      const privilege = cell.privileges[0];
      if (effectiveGrants(base, role, graph).some((g) => g.privilege === privilege)) continue;

      const edge = cell.path.find(
        (e): e is { kind: 'trigger'; view: string; trigger: string; fn: string; owner: string } =>
          e.kind === 'trigger'
      );
      if (!edge) continue;
      const grantEdge = cell.path.find((e) => e.kind === 'grant');
      const owner = cell.effectiveRole;
      const rlsBypassed = ownerBypassesRls(base, owner, graph);
      const target = `${base.schema}.${base.name}`;

      out.push({
        code: 'L20',
        severity: 'info',
        category: 'anti-pattern',
        schema: base.schema,
        table: base.name,
        role,
        privilege,
        message:
          `Untrusted role ${role} can ${privilege} ${target} by writing to view ${edge.view}, whose `
          + `INSTEAD OF trigger ${edge.trigger} runs SECURITY DEFINER function ${edge.fn} as its `
          + `owner ${owner} — ${role} holds no ${privilege} on the relation`
          + (rlsBypassed ? `, whose RLS policies ${owner} is not subject to` : ''),
        hint:
          `The write never reaches a base relation directly: Postgres replaces it with the trigger `
          + `function's body, which is permission-checked against ${owner} because the function is `
          + `SECURITY DEFINER. Make the trigger function \`SECURITY INVOKER\` so the caller's own `
          + `grants apply, authorize the caller inside the body, or give the function an owner whose `
          + `reach matches what the view is meant to accept. Do not revoke the grant on the view — `
          + 'that grant is what the API serves.',
        context: {
          view: edge.view,
          trigger: edge.trigger,
          function: edge.fn,
          effectiveRole: owner,
          viewPrivilege: grantEdge?.privilege,
          baseRlsEnabled: base.rlsEnabled,
          rlsBypassed,
          proof: cell.proof
        }
      });
    }
  }

  return out;
}

/**
 * L15, asked of a function instead of a view: an untrusted role can execute a
 * definer function whose body this analysis could not fully read.
 *
 * The same coverage statement the view producer makes, for the same reason —
 * the execution is proven and the far end is unknown, so no grading rule saw
 * it. Reporting the gap is the alternative to a silent clean bill; it is
 * `info`, score-neutral, and recommends no revoke.
 */
export function checkUnreadableFunctionReach(
  functions: FunctionReachInput[],
  graph: RoleGraph,
  schemaAcls: Map<string, SchemaAclInfo>,
  options: LatticeRoleOptions = {}
): Finding[] {
  const untrusted = options.roles ?? [];
  if (untrusted.length === 0 || functions.length === 0) return [];

  const out: Finding[] = [];

  for (const { role, cells } of computeFunctionReach(functions, graph, untrusted)) {
    for (const cell of cells) {
      if (cell.proof !== 'opaque-tainted') continue;
      if (!canEnterSchema(cell.schema, role, graph, schemaAcls)) continue;

      out.push({
        code: 'L15',
        severity: 'info',
        category: 'coverage',
        schema: cell.schema,
        table: cell.table,
        role,
        privilege: 'EXECUTE',
        message:
          `Untrusted role ${role} can execute ${cell.schema}.${cell.table}, which runs as its owner `
          + `${cell.effectiveRole} and whose body this analysis could not fully read (${cell.taint}) `
          + '— what it reaches under that owner was never graded',
        hint:
          'The execution is proven; what the body reaches is not, so no function rule graded this '
          + 'path. Rewrite the body so the relations it touches are visible statically, or satisfy '
          + 'yourself that what it does is safe to expose to this role. Reporting stayed silent '
          + 'rather than guessing, and nothing here justifies a revoke.',
        context: {
          function: `${cell.schema}.${cell.table}`,
          effectiveRole: cell.effectiveRole,
          taint: cell.taint,
          proof: cell.proof
        }
      });
    }
  }

  return out;
}

/**
 * The role can enter the schema, so a grant on something inside it is reach.
 *
 * The same gate L3 applies to a table grant, applied to EXECUTE: without
 * `USAGE` the function cannot be named, and Postgres's default
 * EXECUTE-to-PUBLIC would otherwise make every definer function in an
 * internal schema look reachable by every role in the database.
 */
function canEnterSchema(
  schema: string,
  role: string,
  graph: RoleGraph,
  schemaAcls: Map<string, SchemaAclInfo>
): boolean {
  const acl = schemaAcls.get(schema);
  if (!acl) return true; // not introspected: assume reachable rather than silently drop
  const attrs = graph.get(role);
  if (attrs?.isSuper) return true;
  if (role === acl.owner) return true;
  const usage = new Set(acl.grants.filter((g) => g.privilege === 'USAGE').map((g) => g.role));
  if (usage.has('PUBLIC') || usage.has(role)) return true;
  return (attrs?.inheritsFrom ?? []).some((a) => usage.has(a) || a === acl.owner);
}

/** The owner is exempt from the relation's policies on this path. */
function ownerBypassesRls(base: TableSnapshot, owner: string, graph: RoleGraph): boolean {
  if (!base.rlsEnabled) return false;
  return !!graph.get(owner)?.bypassRls || (base.owner === owner && !base.rlsForced);
}

function functionHops(cell: RoleReachCell): Array<{ fn: string; owner: string }> {
  return cell.path.filter((e): e is { kind: 'function'; fn: string; owner: string } =>
    e.kind === 'function'
  );
}
