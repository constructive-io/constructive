/**
 * L9, L10 and L18: what a view does *beyond* its SELECT.
 *
 * L8 models the read edge — a non-`security_invoker` view hands its readers
 * the owner's privileges on the relations its body names. Two write paths
 * escape that model entirely, and both were verified against PostgreSQL 18
 * rather than inferred:
 *
 *   - **L9, auto-update.** A simple view is updatable: Postgres rewrites an
 *     INSERT/UPDATE/DELETE on the view onto its single base relation. On a
 *     definer view that rewrite is permission-checked against the *owner*, so
 *     INSERT on the view is INSERT on the base table the caller cannot touch.
 *     `security_invoker = true` closes it (the write is then checked against
 *     the caller and denied). The body alone cannot prove the write lands:
 *     `pg_relation_is_updatable` is the catalog half of the proof.
 *
 *   - **L10, rewrite rules.** A rule other than the view's own `_RETURN` rule
 *     is invisible to `pg_get_viewdef`: `ON INSERT ... DO INSTEAD INSERT INTO
 *     audit` writes a relation the view body never names. Rule actions are
 *     checked against the rule's table owner, and — unlike the view's own base
 *     relations — `security_invoker` does **not** govern them. An invoker view
 *     with such a rule still writes `audit` as the view owner.
 *
 *   - **L18, an unchecked write.** `WITH CHECK OPTION` is not the default, so
 *     a view whose `WHERE` decides which rows a role may *see* says nothing
 *     about which rows it may *write*: `INSERT INTO tenant_rows VALUES (...)`
 *     through a `WHERE tenant_id = current_tenant()` view stores a row for
 *     another tenant, which the writer then cannot see. It is the write-side
 *     twin of L12 — the view's filter is a read filter, not a boundary.
 *
 * All three keep L8's conservatism. An `INSTEAD OF` trigger sends the write into a
 * function body whose target this analysis cannot prove, a multi-relation body
 * is not auto-updatable in a way we can pin to one target, and an unreadable
 * rule action is unknown — all three suppress rather than guess. And, as in
 * L8, the fix is never a revoke: the grant on the view is what the API serves.
 */

import { bodyFiltersRows, extractAccess, extractQuery } from '../callgraph/extract';
import type { ViewRule, ViewSnapshot } from '../pg/indexes';
import type { PgPrivilege, TableSnapshot } from '../pg/introspect';
import type { Finding } from '../types';
import {
  buildRelationIndex,
  type RelationIndex,
  resolveRelation,
  type SuppressedView
} from './definer-view';
import { effectiveGrants, type LatticeRoleOptions, type RoleGraph } from './lattice';
import { computeViewWriteReach, type ViewWriteEdge, type ViewWriteInput } from './role-reach';

/** How deep a chain of updatable views on views is followed before giving up. */
const MAX_VIEW_DEPTH = 8;

export interface ViewWriteAnalysis {
  /** Definer views whose writes are auto-rewritten onto a base relation. */
  autoUpdatable: ViewWriteInput[];
  /** Views carrying rewrite rules whose actions reach other relations. */
  ruleDriven: ViewWriteInput[];
  /**
   * The subset of {@link autoUpdatable} whose body filters rows and which
   * carries no `WITH CHECK OPTION` — L18 inputs.
   */
  unchecked: ViewWriteInput[];
  /** Views deliberately left out, with why. */
  suppressed: SuppressedView[];
}

/**
 * Resolve, for every view in the snapshot, the relations a write against it
 * actually lands on — through auto-update rewriting and through rewrite rules.
 */
export async function analyzeViewWrites(
  views: ViewSnapshot[],
  tables: TableSnapshot[]
): Promise<ViewWriteAnalysis> {
  const queryable = views.filter((v) => !v.materialized);
  const index = buildRelationIndex(queryable, tables);

  const autoUpdatable: ViewWriteInput[] = [];
  const ruleDriven: ViewWriteInput[] = [];
  const unchecked: ViewWriteInput[] = [];
  const suppressed: SuppressedView[] = [];

  for (const view of queryable) {
    const name = `${view.schema}.${view.name}`;

    const auto = await autoUpdateEdges(view, index, suppressed);
    if (auto.length > 0) {
      const input: ViewWriteInput = {
        schema: view.schema,
        name: view.name,
        owner: view.owner,
        grants: view.grants,
        writeEdges: auto
      };
      autoUpdatable.push(input);

      if (view.checkOption === 'none') {
        // A view with no `WHERE` excludes no rows, so there is nothing a write
        // could land outside of; an unparseable body is unknown, not clean.
        const filters = await bodyFiltersRows(view.definition);
        if (filters === null) {
          suppressed.push({
            view: name,
            reason: 'body could not be parsed to look for a row filter'
          });
        } else if (filters) {
          // WITH CHECK OPTION constrains the rows a write *produces*, so only
          // the commands that produce rows can escape it.
          const writes = auto.filter((e) => e.privilege !== 'DELETE');
          if (writes.length > 0) unchecked.push({ ...input, writeEdges: writes });
        }
      }
    }

    const fromRules: ViewWriteEdge[] = [];
    for (const rule of view.rules) {
      if (rule.event === 'SELECT') continue;
      const edges = await ruleEdges(view, rule, index);
      if (edges === null) {
        suppressed.push({
          view: name,
          reason: `rule ${rule.name} has an action this analysis cannot follow`
        });
        continue;
      }
      fromRules.push(...edges);
    }
    if (fromRules.length > 0) {
      ruleDriven.push({
        schema: view.schema,
        name: view.name,
        owner: view.owner,
        grants: view.grants,
        writeEdges: fromRules
      });
    }
  }

  return { autoUpdatable, ruleDriven, unchecked, suppressed };
}

/**
 * The base relation an auto-updatable definer view's writes are rewritten
 * onto, if it can be proven.
 *
 * Auto-update only applies when nothing else has taken over the write path,
 * so a view with rules or `INSTEAD OF` triggers is not handled here — the
 * catalog's updatability bitmask counts those too, and attributing their
 * writes to the body's relation would be a guess.
 */
async function autoUpdateEdges(
  view: ViewSnapshot,
  index: RelationIndex,
  suppressed: SuppressedView[]
): Promise<ViewWriteEdge[]> {
  const name = `${view.schema}.${view.name}`;
  if (view.securityInvoker) return []; // the write is checked against the caller
  if (view.writable.length === 0) return [];
  if (view.insteadOfTriggers) {
    suppressed.push({
      view: name,
      reason: 'INSTEAD OF triggers decide where the write lands, in a body this analysis does not follow'
    });
    return [];
  }
  if (view.rules.some((r) => r.event !== 'SELECT')) return []; // rule path, see ruleEdges

  const hops: Array<{ view: string; owner: string }> = [{ view: name, owner: view.owner }];
  let current = view;

  for (;;) {
    if (hops.length > MAX_VIEW_DEPTH) {
      suppressed.push({ view: name, reason: `view chain deeper than ${MAX_VIEW_DEPTH} hops` });
      return [];
    }

    const body = await extractQuery(current.definition);
    if (body.opaque) {
      suppressed.push({ view: name, reason: body.opaqueReason ?? 'body could not be read' });
      return [];
    }

    const resolved = body.tables
      .map((ref) => resolveRelation(ref, current.schema, index))
      .filter((r): r is NonNullable<typeof r> => r !== null);
    // Auto-update needs exactly one target. Anything else — a join, a body
    // whose references we could not pin down — is not a write we can place.
    if (resolved.length !== 1) return [];

    const target = resolved[0];
    // A relation outside the audited schemas cannot be graded: its owner, its
    // ACL and its RLS are all unknown, so the write is not placeable here.
    if (target.kind === 'external') return [];
    if (target.kind === 'table') {
      return view.writable.map((privilege) => ({
        schema: target.schema,
        table: target.name,
        via: privilege,
        privilege,
        hops: [...hops]
      }));
    }

    const nested = target.view;
    if (`${nested.schema}.${nested.name}` === `${current.schema}.${current.name}`) return [];
    if (nested.materialized || nested.insteadOfTriggers) return [];
    // The inner view re-owns the write unless it defers to the caller, in
    // which case whichever owner is already in force stays in force.
    const owner = nested.securityInvoker ? hops[hops.length - 1].owner : nested.owner;
    hops.push({ view: `${nested.schema}.${nested.name}`, owner });
    current = nested;
  }
}

/**
 * The relations a rewrite rule's actions reach, or `null` when the action
 * cannot be followed.
 *
 * The rule's own view is dropped from the result: `pg_get_ruledef` names it in
 * the `ON ... TO <view>` clause, and that reference is the trigger, not a
 * target. `DO INSTEAD NOTHING` therefore yields nothing at all, which is the
 * correct answer for a read-only view — the commonest rule in the wild.
 */
async function ruleEdges(
  view: ViewSnapshot,
  rule: ViewRule,
  index: RelationIndex
): Promise<ViewWriteEdge[] | null> {
  const self = `${view.schema}.${view.name}`;
  const { accesses, opaque } = await extractAccess(rule.definition);
  if (opaque) return null;

  const edges: ViewWriteEdge[] = [];
  for (const access of accesses) {
    // Reads inside a rule action are the view's own SELECT path, which L8
    // already models; the escalation a rule adds is the write.
    if (access.privilege === 'SELECT') continue;

    const target = resolveRelation(access, view.schema, index);
    if (!target) continue;
    if (target.kind === 'external') continue;
    if (target.kind === 'view') {
      // The write recurses into another view's rewrite path; proving where it
      // finally lands is more than this analysis can do.
      return null;
    }
    if (`${target.schema}.${target.name}` === self) continue;

    edges.push({
      schema: target.schema,
      table: target.name,
      via: rule.event,
      privilege: access.privilege,
      hops: [{ view: self, owner: view.owner }],
      rule: rule.name
    });
  }

  return edges;
}

/**
 * L9: an untrusted role writes a base relation through an auto-updatable
 * definer view.
 *
 * Fires once per (role, view, base relation, command) where the role holds
 * the command on the view, the view executes as someone else, and the role
 * holds no such privilege on the relation the write lands on.
 */
export function checkDefinerViewWrite(
  views: ViewWriteInput[],
  tables: TableSnapshot[],
  graph: RoleGraph,
  options: LatticeRoleOptions = {}
): Finding[] {
  return writeFindings(views, tables, graph, options, 'L9', (ctx) => ({
    message:
      `Untrusted role ${ctx.role} can ${ctx.privilege} ${ctx.target} through view ${ctx.view}, `
      + `which executes as its owner ${ctx.owner} — ${ctx.role} holds no ${ctx.privilege} on the `
      + `base relation`
      + (ctx.rlsBypassed ? `, and ${ctx.owner} is not subject to its RLS policies` : ''),
    hint:
      `The view is auto-updatable, so Postgres rewrites the ${ctx.privilege} onto ${ctx.target} and `
      + `checks it against ${ctx.owner}, not ${ctx.role}. Recreate the view `
      + `\`WITH (security_invoker = true)\` so the caller's own grants and policies apply, give it an `
      + `owner whose reach matches what the view is meant to expose, or make it non-updatable. Do not `
      + `revoke the grant on the view — that grant is what the API serves.`
  }));
}

/**
 * L10: an untrusted role writes a relation through a rewrite rule on a view.
 *
 * Unlike L9 this fires on `security_invoker` views too: `security_invoker`
 * governs the view's own base relations, not the relations a rule's actions
 * name, which are checked against the rule's table owner either way.
 */
export function checkViewRuleBypass(
  views: ViewWriteInput[],
  tables: TableSnapshot[],
  graph: RoleGraph,
  options: LatticeRoleOptions = {}
): Finding[] {
  return writeFindings(views, tables, graph, options, 'L10', (ctx) => ({
    message:
      `Untrusted role ${ctx.role} can ${ctx.privilege} ${ctx.target} through rule ${ctx.rule} on view `
      + `${ctx.view} — the rule's action runs as the view owner ${ctx.owner}, and ${ctx.role} holds no `
      + `${ctx.privilege} on ${ctx.target}`
      + (ctx.rlsBypassed ? `, whose RLS policies ${ctx.owner} is not subject to` : ''),
    hint:
      `Rewrite rules are not shown by \`pg_get_viewdef\` and are not governed by \`security_invoker\`: `
      + `their actions are permission-checked against the owner of the relation the rule is on. Move `
      + `the action into a function the caller must be granted EXECUTE on, or give the view an owner `
      + `whose reach matches what the rule is meant to do. Do not revoke the grant on the view — that `
      + `grant is what the API serves.`
  }));
}

/**
 * L18: an untrusted role writes rows a filtering view will not show it.
 *
 * Fires on the L9 population narrowed to filtering views with no `WITH CHECK
 * OPTION`, minus DELETE — which removes rows the view already showed rather
 * than producing new ones. It overlaps L9 by design and answers a different
 * question: L9 is *whether* the role can write the relation at all, L18 is
 * whether the view's own condition constrains what it writes.
 */
export function checkUncheckedViewWrite(
  views: ViewWriteInput[],
  tables: TableSnapshot[],
  graph: RoleGraph,
  options: LatticeRoleOptions = {}
): Finding[] {
  return writeFindings(views, tables, graph, options, 'L18', (ctx) => ({
    message:
      `Untrusted role ${ctx.role} can ${ctx.privilege} rows into ${ctx.target} through view `
      + `${ctx.view} that the view's own row filter excludes — the view has no WITH CHECK OPTION, `
      + `so its \`WHERE\` governs reads only`,
    hint:
      `Recreate the view \`WITH LOCAL CHECK OPTION\` (or \`CASCADED\`, to enforce every underlying `
      + `view's condition too) so a row written through it must satisfy the condition it is served `
      + `under. Where the filter is per-caller, an RLS policy with a \`WITH CHECK\` clause on `
      + `${ctx.target} is the stronger form — it applies however the row arrives. Do not revoke the `
      + `${ctx.privilege} on the view; that grant is what the API serves.`
  }));
}

interface WriteContext {
  role: string;
  view: string;
  owner: string;
  target: string;
  privilege: PgPrivilege;
  rule?: string;
  rlsBypassed: boolean;
}

function writeFindings(
  views: ViewWriteInput[],
  tables: TableSnapshot[],
  graph: RoleGraph,
  options: LatticeRoleOptions,
  code: 'L9' | 'L10' | 'L18',
  render: (ctx: WriteContext) => { message: string; hint: string }
): Finding[] {
  const untrusted = options.roles ?? [];
  if (untrusted.length === 0 || views.length === 0) return [];

  const byKey = new Map(tables.map((t) => [`${t.schema}.${t.name}`, t]));
  const out: Finding[] = [];

  for (const { role, cells } of computeViewWriteReach(views, graph, untrusted)) {
    for (const cell of cells) {
      if (cell.effectiveRole === role) continue;

      const base = byKey.get(`${cell.schema}.${cell.table}`);
      if (!base) continue;
      const privilege = cell.privileges[0];
      // Already writable in its own right: the view launders nothing.
      if (effectiveGrants(base, role, graph).some((g) => g.privilege === privilege)) continue;

      const viewHops = cell.path.filter((e) => e.kind === 'view');
      const ruleEdge = cell.path.find((e) => e.kind === 'rule');
      const grantEdge = cell.path.find((e) => e.kind === 'grant');
      const owner = cell.effectiveRole;
      const ownerAttrs = graph.get(owner);
      const rlsBypassed =
        base.rlsEnabled
        && (!!ownerAttrs?.bypassRls || (base.owner === owner && !base.rlsForced));

      const target = `${base.schema}.${base.name}`;
      const { message, hint } = render({
        role,
        view: viewHops[0].view,
        owner,
        target,
        privilege,
        ...(ruleEdge ? { rule: ruleEdge.rule } : {}),
        rlsBypassed
      });

      out.push({
        code,
        severity: 'info',
        category: 'anti-pattern',
        schema: base.schema,
        table: base.name,
        role,
        privilege,
        message,
        hint,
        context: {
          view: viewHops[0].view,
          effectiveRole: owner,
          viaViews: viewHops.map((h) => h.view),
          ...(ruleEdge ? { rule: ruleEdge.rule } : {}),
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
