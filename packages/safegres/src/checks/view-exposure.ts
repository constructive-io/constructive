/**
 * L11 and L12: the two things a *readable* view does that its owner and its
 * body, taken separately, do not explain.
 *
 * **L11 — a materialized view is a snapshot, not a query.** Its rows were
 * computed once, by whoever ran `REFRESH`, and are then handed to every reader
 * of the matview verbatim. The base relations are not consulted at read time,
 * so their ACLs never apply and — the part that matters — their RLS policies
 * never run. A matview cannot carry policies of its own either: RLS attaches
 * to tables, and `security_invoker` is a view-only reloption. So a SELECT
 * grant on a matview over an RLS-protected table is an unconditional grant on
 * the rows that were visible at refresh time.
 *
 * **L12 — a view's `WHERE` is a filter, not a boundary.** Without
 * `security_barrier` the planner may push the *caller's* qual below the view's
 * own, so a leaky operator or a `COST 0.0001` function evaluates against rows
 * the view was written to hide. The rows are not returned, but they are seen —
 * and a function that raises them, writes them, or times differently on them
 * exfiltrates them. This only matters where the view is the only path to the
 * relation; if the caller can read the base table directly there is nothing
 * for the view to hide.
 *
 * Both ship the same way as the rest of the L-series: `info`, score-neutral,
 * and never recommending a revoke. The remedies are properties of the view.
 */

import { bodyFiltersRows } from '../callgraph/extract';
import type { ViewSnapshot } from '../pg/indexes';
import type { TableSnapshot } from '../pg/introspect';
import type { Finding } from '../types';
import {
  buildRelationIndex,
  readBodies,
  resolveViewBases,
  type SuppressedView
} from './definer-view';
import { effectiveGrants, type LatticeRoleOptions, type RoleGraph } from './lattice';
import { computeViewReach, type ViewReachInput } from './role-reach';

export interface ViewExposureAnalysis {
  /** Materialized views whose bodies resolved — L11 inputs. */
  matviews: ViewReachInput[];
  /** Filtering definer views without `security_barrier` — L12 inputs. */
  leaky: ViewReachInput[];
  /** Views left out, with why. An unread body is not a clean bill. */
  suppressed: SuppressedView[];
}

/**
 * Resolve both populations in one pass over the view bodies.
 *
 * A materialized view is deliberately absent from the relation index: it is a
 * terminal relation for anything reading *through* it (its rows are stored),
 * so it must never be followed as a nested view. Its own body is still read,
 * to learn which relations the refresh copied from.
 */
export async function analyzeViewExposure(
  views: ViewSnapshot[],
  tables: TableSnapshot[]
): Promise<ViewExposureAnalysis> {
  const queryable = views.filter((v) => !v.materialized);
  const index = buildRelationIndex(queryable, tables);
  const bodies = await readBodies(views);

  const matviews: ViewReachInput[] = [];
  const leaky: ViewReachInput[] = [];
  const suppressed: SuppressedView[] = [];

  for (const view of views) {
    const label = `${view.schema}.${view.name}`;

    if (view.materialized) {
      const { bases, opaque } = resolveViewBases(view, index, bodies);
      if (opaque) {
        suppressed.push({ view: label, reason: opaque });
        continue;
      }
      // Relations outside the audited schemas carry no ACL or policy to
      // compare the stored rows against; L14 reports the reach instead.
      const graded = bases.filter((b) => !b.external);
      if (graded.length === 0) continue;
      matviews.push({
        schema: view.schema,
        name: view.name,
        owner: view.owner,
        grants: view.grants,
        baseRelations: graded,
        materialized: true
      });
      continue;
    }

    // An invoker view confers nothing, so its `WHERE` is never the only thing
    // standing between a caller and a relation: the caller needs its own
    // grant on the base to read the view at all.
    if (view.securityInvoker || view.securityBarrier) continue;

    const filters = await bodyFiltersRows(view.definition);
    if (filters === null) {
      suppressed.push({ view: label, reason: 'body could not be parsed to look for a row filter' });
      continue;
    }
    if (!filters) continue;

    const { bases, opaque } = resolveViewBases(view, index, bodies);
    if (opaque) {
      suppressed.push({ view: label, reason: opaque });
      continue;
    }
    const gradedBases = bases.filter((b) => !b.external);
    if (gradedBases.length === 0) continue;
    leaky.push({
      schema: view.schema,
      name: view.name,
      owner: view.owner,
      grants: view.grants,
      baseRelations: gradedBases
    });
  }

  return { matviews, leaky, suppressed };
}

/** Is `role` actually filtered by `table`'s policies? */
function subjectToRls(table: TableSnapshot, role: string, graph: RoleGraph): boolean {
  if (!table.rlsEnabled) return false;
  if (graph.get(role)?.bypassRls) return false;
  // The owner is exempt unless the table FORCEs policies on itself.
  return !(table.owner === role && !table.rlsForced);
}

/**
 * L11: an untrusted role reads a table's rows out of a materialized view.
 *
 * Fires where the role can SELECT the matview and either holds no SELECT on
 * the relation the refresh read, or holds one but is subject to policies the
 * stored rows never passed through. The second case is the one catalog-only
 * analysis is worst at: the ACL says the role may read the table, RLS says it
 * may read three rows of it, and the matview hands it all of them.
 */
export function checkMatviewSnapshot(
  matviews: ViewReachInput[],
  tables: TableSnapshot[],
  graph: RoleGraph,
  options: LatticeRoleOptions = {}
): Finding[] {
  const untrusted = options.roles ?? [];
  if (untrusted.length === 0 || matviews.length === 0) return [];

  const byKey = new Map(tables.map((t) => [`${t.schema}.${t.name}`, t]));
  const out: Finding[] = [];

  for (const { role, cells } of computeViewReach(matviews, graph, untrusted)) {
    for (const cell of cells) {
      const base = byKey.get(`${cell.schema}.${cell.table}`);
      if (!base) continue;

      const hasSelect = effectiveGrants(base, role, graph).some((g) => g.privilege === 'SELECT');
      const filtered = subjectToRls(base, role, graph);
      // Reachable in its own right and not row-filtered: the snapshot shows
      // the role nothing it could not select from the table itself.
      if (hasSelect && !filtered) continue;

      const matview = cell.path.find((e) => e.kind === 'matview');
      if (!matview) continue;
      const refresher = cell.effectiveRole;

      out.push({
        code: 'L11',
        severity: 'info',
        category: 'anti-pattern',
        schema: base.schema,
        table: base.name,
        role,
        privilege: 'SELECT',
        message: hasSelect
          ? `Untrusted role ${role} reads ${base.schema}.${base.name} through materialized view `
            + `${matview.view} without the row filter its policies apply — the rows were stored by `
            + `${refresher} at REFRESH time`
          : `Untrusted role ${role} reads ${base.schema}.${base.name} through materialized view `
            + `${matview.view}, which stores rows computed as ${refresher} — ${role} holds no SELECT `
            + `on the base relation`,
        hint:
          `A materialized view is a stored copy: reading it never consults ${base.schema}.`
          + `${base.name}, so neither its grants nor its RLS policies apply, and the matview cannot `
          + `carry policies or \`security_invoker\` of its own. Replace it with a plain `
          + `\`security_invoker\` view if the freshness is not what it is for, materialize only the `
          + `columns and rows that are safe to hand out unconditionally, or keep it in a schema the `
          + `API does not expose and serve a filtered view from it. Do not revoke the SELECT on the `
          + `matview — that grant is what the API serves.`,
        context: {
          matview: matview.view,
          effectiveRole: refresher,
          baseRlsEnabled: base.rlsEnabled,
          rlsBypassed: filtered,
          holdsBaseSelect: hasSelect,
          proof: cell.proof
        }
      });
    }
  }

  return out;
}

/**
 * L12: a definer view filters rows for an untrusted role but is not a barrier.
 *
 * Fires where the role reaches a relation *only* through a view whose body has
 * a `WHERE`, and the view is not `security_barrier`. The finding is about the
 * rows the view excludes: they are the ones the author meant to withhold, and
 * without the barrier a cheap leaky qual supplied by the caller is evaluated
 * against them.
 */
export function checkLeakyFilterView(
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
      // The caller can read the relation directly, so the view's WHERE is a
      // convenience, not a boundary, and pushing a qual past it reveals
      // nothing new.
      if (effectiveGrants(base, role, graph).some((g) => g.privilege === 'SELECT')) continue;

      const hops = cell.path.filter((e) => e.kind === 'view');
      const outermost = hops[0];
      if (!outermost) continue;

      out.push({
        code: 'L12',
        severity: 'info',
        category: 'anti-pattern',
        schema: base.schema,
        table: base.name,
        role,
        privilege: 'SELECT',
        message:
          `View ${outermost.view} is the only path untrusted role ${role} has to `
          + `${base.schema}.${base.name}, and its row filter is not a security barrier — a leaky `
          + `qual from ${role} can be evaluated against the rows the view excludes`,
        hint:
          `Recreate the view \`WITH (security_barrier = true)\` so the planner cannot push a `
          + `caller-supplied qual below its own \`WHERE\`. A cheap function or a leaky operator is `
          + `otherwise evaluated on every row of ${base.schema}.${base.name}, including the hidden `
          + `ones, which is enough to read them out through errors, notices or timing. Where the `
          + `filter is per-caller, an RLS policy on the base relation is the stronger form — policy `
          + `quals already get barrier treatment. Do not revoke the SELECT on the view.`,
        context: {
          view: outermost.view,
          effectiveRole: cell.effectiveRole,
          viaViews: hops.map((h) => h.view),
          baseRlsEnabled: base.rlsEnabled,
          proof: cell.proof
        }
      });
    }
  }

  return out;
}
