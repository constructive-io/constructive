/**
 * L8: a view that is not `security_invoker` hands its readers the owner's
 * privileges on every relation its body touches.
 *
 * A view executes as its owner unless it was created `WITH (security_invoker
 * = true)`. So a role holding nothing but SELECT on the view reads the base
 * relations under the *owner's* rights — including tables it has no grant on,
 * and, when the owner owns the base table or bypasses RLS, without the row
 * filter the base table's policies would have applied.
 *
 * Nothing in the catalog-only effective-access layer can see this:
 * `effectiveGrants` never names the calling role on the base relation, and
 * the base relation's ACL never names it either. The edge only exists in the
 * view's *body*, which makes this the first rule that reads SQL rather than
 * pure catalog — the `proof: 'ast'` edge of the reach model in `role-reach.ts`.
 *
 * Two conservatism rules the rest of the analysis depends on:
 *
 *   - **A body we cannot read is unknown, not empty.** Dynamic SQL or an
 *     unparseable body suppresses the view entirely rather than producing a
 *     partial (and therefore misleading) base-relation set.
 *   - **The fix is never a revoke.** The grant on the view is what the API
 *     serves; the defect is the view executing as its owner. L8 recommends
 *     `security_invoker = true` or a different owner, and nothing else.
 */

import { type ExtractedBody, extractQuery } from '../callgraph/extract';
import type { ViewSnapshot } from '../pg/indexes';
import type { TableSnapshot } from '../pg/introspect';
import type { Finding } from '../types';
import { effectiveGrants, type LatticeRoleOptions, type RoleGraph } from './lattice';
import { computeViewReach, type ViewBaseRelation, type ViewReachInput } from './role-reach';

/** How deep a chain of views on views is followed before giving up. */
const MAX_VIEW_DEPTH = 8;

/** A view whose body did not yield a usable base-relation set. */
export interface SuppressedView {
  view: string;
  reason: string;
}

export interface ViewBodyAnalysis {
  /** Definer views whose bodies were read, as reach inputs. */
  views: ViewReachInput[];
  /** Views deliberately left out, with why — an unread body is not a clean bill. */
  suppressed: SuppressedView[];
}

/**
 * Read every definer view's body and resolve the base relations it reaches.
 *
 * Nested views are followed: a definer view over an invoker view still
 * executes the inner body as the *outer* owner, while an inner definer view
 * switches the executing role again. Each resolved relation therefore carries
 * the hops it passed through and the owner of the last one.
 */
export async function analyzeViewBodies(
  views: ViewSnapshot[],
  tables: TableSnapshot[],
  auditedSchemas?: Iterable<string>
): Promise<ViewBodyAnalysis> {
  // A materialized view stores its rows: reading it touches no base relation,
  // so it is a leaf here, never an edge.
  const queryable = views.filter((v) => !v.materialized);
  const index = buildRelationIndex(queryable, tables, auditedSchemas);

  const bodies = await readBodies(queryable);

  const out: ViewReachInput[] = [];
  const suppressed: SuppressedView[] = [];

  for (const view of queryable) {
    if (view.securityInvoker) continue;

    const { bases, opaque } = resolveViewBases(view, index, bodies);
    if (opaque) {
      suppressed.push({ view: `${view.schema}.${view.name}`, reason: opaque });
      continue;
    }
    if (bases.length === 0) continue;

    out.push({
      schema: view.schema,
      name: view.name,
      owner: view.owner,
      grants: view.grants,
      baseRelations: bases
    });
  }

  return { views: out, suppressed };
}

/** Parsed bodies, keyed `schema.name`, as {@link resolveViewBases} expects. */
export type ViewBodies = Map<string, ExtractedBody>;

export async function readBodies(views: ViewSnapshot[]): Promise<ViewBodies> {
  const bodies: ViewBodies = new Map();
  for (const v of views) bodies.set(`${v.schema}.${v.name}`, await extractQuery(v.definition));
  return bodies;
}

/**
 * The base relations `root` reads, following nested views, with the owner in
 * force at each hop.
 *
 * `opaque` is set to the first reason the walk had to stop, and when it is set
 * the relation list is a fragment: the caller must discard it, because a body
 * we could only partly read under-reports what the view reaches.
 *
 * `root` itself need not be in `index` — a materialized view is not a
 * queryable relation for the purposes of resolving *other* bodies, but its own
 * body reads the same way.
 */
export function resolveViewBases(
  root: ViewSnapshot,
  index: RelationIndex,
  bodies: ViewBodies
): { bases: ViewBaseRelation[]; opaque?: string } {
  const bases: ViewBaseRelation[] = [];
  const seen = new Set<string>();
  let opaque: string | undefined;

  const walk = (current: ViewSnapshot, hops: Array<{ view: string; owner: string }>): void => {
    const key = `${current.schema}.${current.name}`;
    if (hops.length > MAX_VIEW_DEPTH) {
      opaque ??= `view chain deeper than ${MAX_VIEW_DEPTH} hops`;
      return;
    }
    const body = bodies.get(key);
    if (!body) return;
    if (body.opaque) {
      opaque ??= body.opaqueReason ?? 'body could not be read';
      return;
    }

    for (const ref of body.tables) {
      const relation = resolveRelation(ref, current.schema, index);
      if (!relation) continue; // a CTE, an alias, or a name we cannot pin down

      if (relation.kind === 'view') {
        const nested = relation.view;
        if (`${nested.schema}.${nested.name}` === key) continue;
        // An inner definer view re-owns the read; an inner invoker view runs
        // under whichever owner is already in force.
        const owner = nested.securityInvoker ? hops[hops.length - 1].owner : nested.owner;
        walk(nested, [...hops, { view: `${nested.schema}.${nested.name}`, owner }]);
        continue;
      }

      const relKey = `${relation.schema}.${relation.name}`;
      const dedupe = `${relKey}::${hops[hops.length - 1].owner}`;
      if (seen.has(dedupe)) continue;
      seen.add(dedupe);
      bases.push({
        schema: relation.schema,
        table: relation.name,
        hops: [...hops],
        ...(relation.kind === 'external' ? { external: true } : {})
      });
    }
  };

  walk(root, [{ view: `${root.schema}.${root.name}`, owner: root.owner }]);

  return { bases, ...(opaque ? { opaque } : {}) };
}

export type Resolved =
  | { kind: 'table'; schema: string; name: string }
  | { kind: 'view'; view: ViewSnapshot }
  /**
   * A schema-qualified relation in a schema the audit did not introspect —
   * excluded by config, owned by an extension, or a system catalog. The
   * reference is unambiguous, so dropping it would under-report the view's
   * reach; nothing about the relation itself is known.
   */
  | { kind: 'external'; schema: string; name: string };

/** The lookup tables {@link resolveRelation} needs, built once per snapshot. */
export interface RelationIndex {
  tableKeys: Set<string>;
  viewKeys: Map<string, ViewSnapshot>;
  viewsByName: Map<string, ViewSnapshot[]>;
  /**
   * The schemas the snapshot covers. A qualified reference into a schema
   * *not* in this set is external rather than unresolvable; a miss inside it
   * is a name the audit genuinely could not pin down.
   */
  auditedSchemas: Set<string>;
}

export function buildRelationIndex(
  views: ViewSnapshot[],
  tables: TableSnapshot[],
  auditedSchemas?: Iterable<string>
): RelationIndex {
  const viewsByName = new Map<string, ViewSnapshot[]>();
  for (const v of views) viewsByName.set(v.name, [...(viewsByName.get(v.name) ?? []), v]);
  return {
    tableKeys: new Set(tables.map((t) => `${t.schema}.${t.name}`)),
    viewKeys: new Map(views.map((v) => [`${v.schema}.${v.name}`, v])),
    viewsByName,
    auditedSchemas: new Set(
      auditedSchemas ?? [...tables.map((t) => t.schema), ...views.map((v) => v.schema)]
    )
  };
}

/**
 * Pin a body reference to a relation in the snapshot.
 *
 * `pg_get_viewdef` qualifies anything outside the creating `search_path` but
 * leaves the rest bare, so an unqualified name is resolved against the view's
 * own schema first and then against the snapshot as a whole — and only when
 * exactly one relation answers to it. An ambiguous or unknown name (a CTE, a
 * table alias, a relation outside the audited schemas) resolves to nothing:
 * over-approximating here would attribute a read to a relation nobody named.
 */
export function resolveRelation(
  ref: { schema?: string; name: string },
  viewSchema: string,
  { tableKeys, viewKeys, viewsByName, auditedSchemas }: RelationIndex
): Resolved | null {
  const candidates = ref.schema ? [ref.schema] : [viewSchema];
  for (const schema of candidates) {
    const key = `${schema}.${ref.name}`;
    const view = viewKeys.get(key);
    if (view) return { kind: 'view', view };
    if (tableKeys.has(key)) return { kind: 'table', schema, name: ref.name };
  }
  // Qualified and unknown: either a relation the audit skipped (external, and
  // the reach is still real) or a genuine miss inside a schema it did read.
  if (ref.schema) {
    return auditedSchemas.has(ref.schema)
      ? null
      : { kind: 'external', schema: ref.schema, name: ref.name };
  }

  const matches = [
    ...[...tableKeys]
      .filter((k) => k.endsWith(`.${ref.name}`))
      .map((k): Resolved => ({ kind: 'table', schema: k.slice(0, -(ref.name.length + 1)), name: ref.name })),
    ...(viewsByName.get(ref.name) ?? []).map((v): Resolved => ({ kind: 'view', view: v }))
  ];
  return matches.length === 1 ? matches[0] : null;
}

/**
 * L8: an untrusted role reads a base relation through a definer view.
 *
 * Fires once per (role, view, base relation) where the role can SELECT the
 * view, the view executes as someone else, and the role holds no SELECT of
 * its own on the relation the view reads. A `security_invoker` view over the
 * same shape produces nothing — it executes as the caller, so the base
 * relation's own ACL and policies apply and there is no edge to report.
 */
export function checkDefinerViewBypass(
  views: ViewReachInput[],
  tables: TableSnapshot[],
  graph: RoleGraph,
  options: LatticeRoleOptions = {}
): Finding[] {
  const untrusted = options.roles ?? [];
  if (untrusted.length === 0 || views.length === 0) return [];

  const byKey = new Map(tables.map((t) => [`${t.schema}.${t.name}`, t]));
  const out: Finding[] = [];

  for (const { role, cells } of computeViewReach(views, graph, untrusted)) {
    for (const cell of cells) {
      if (cell.effectiveRole === role) continue;

      const base = byKey.get(`${cell.schema}.${cell.table}`);
      if (!base) continue;
      // Already reachable in its own right: the view launders nothing.
      if (effectiveGrants(base, role, graph).some((g) => g.privilege === 'SELECT')) continue;

      const hops = cell.path.filter((e): e is { kind: 'view'; view: string; owner: string } =>
        e.kind === 'view'
      );
      const outermost = hops[0];
      const owner = cell.effectiveRole;
      const ownerAttrs = graph.get(owner);
      // The owner is exempt from the base table's policies — either because
      // it owns the table and FORCE is off, or because it bypasses RLS
      // outright — so the rows the policies would have filtered come back.
      const rlsBypassed =
        base.rlsEnabled
        && (!!ownerAttrs?.bypassRls || (base.owner === owner && !base.rlsForced));

      out.push({
        code: 'L8',
        severity: 'info',
        category: 'anti-pattern',
        schema: base.schema,
        table: base.name,
        role,
        privilege: 'SELECT',
        message:
          `Untrusted role ${role} reads ${base.schema}.${base.name} through view ${outermost.view}, `
          + `which executes as its owner ${owner} — ${role} holds no SELECT on the base relation`
          + (rlsBypassed ? `, and ${owner} is not subject to its RLS policies` : ''),
        hint:
          `The view is not \`security_invoker\`, so Postgres checks ${owner}'s privileges on the base `
          + `relation, not ${role}'s. Recreate it \`WITH (security_invoker = true)\` so the caller's `
          + `own grants and policies apply, or give it an owner whose reach matches what the view is `
          + `meant to expose. Do not revoke the SELECT on the view — that grant is what the API serves.`,
        context: {
          view: outermost.view,
          effectiveRole: owner,
          viaViews: hops.map((h) => h.view),
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
 * L14: a definer view hands an untrusted role a relation the audit never
 * looked at.
 *
 * Excluding a schema is a statement about what is *graded*, not about what is
 * *reachable*. A view in an audited schema can read `information_schema`,
 * `pg_catalog`, an extension's tables, or any schema left out of
 * `exposure.schemas` — and because that relation is not in the snapshot,
 * every rule that grades a base relation silently drops the edge. The view
 * looked clean because the audit could not see the far end.
 *
 * This is the one L-rule that reports an *absence of knowledge*. It says the
 * read happens and that nothing was graded on the other side; it does not
 * claim the relation is sensitive, and it recommends no revoke — the remedy
 * is to bring the schema into scope, or to satisfy yourself that the
 * projection is safe and leave it.
 */
export function checkUnauditedViewReach(
  views: ViewReachInput[],
  graph: RoleGraph,
  options: LatticeRoleOptions = {}
): Finding[] {
  const untrusted = options.roles ?? [];
  if (untrusted.length === 0 || views.length === 0) return [];

  const out: Finding[] = [];

  for (const { role, cells } of computeViewReach(views, graph, untrusted)) {
    for (const cell of cells) {
      if (!cell.external) continue;

      const hops = cell.path.filter((e): e is { kind: 'view'; view: string; owner: string } =>
        e.kind === 'view'
      );
      const outermost = hops[0];
      if (!outermost) continue;
      const owner = cell.effectiveRole;

      out.push({
        code: 'L14',
        severity: 'info',
        category: 'coverage',
        schema: cell.schema,
        table: cell.table,
        role,
        privilege: 'SELECT',
        message:
          `Untrusted role ${role} reads ${cell.schema}.${cell.table} through view ${outermost.view} `
          + `as its owner ${owner}, and ${cell.schema} is outside the audited schemas — nothing `
          + 'graded what that relation exposes',
        hint:
          `The read is proven from the view body; its consequences are not, because ${cell.schema} `
          + 'was never introspected. Add the schema to the audit (`schemas`, or remove it from '
          + '`excludeSchemas`) to grade the far end, or confirm the projection is safe to serve. '
          + 'This is a gap in coverage, not a proven leak: do not revoke anything on its strength.',
        context: {
          view: outermost.view,
          effectiveRole: owner,
          viaViews: hops.map((h) => h.view),
          unauditedSchema: cell.schema,
          proof: cell.proof
        }
      });
    }
  }

  return out;
}
