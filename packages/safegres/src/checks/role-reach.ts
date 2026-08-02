/**
 * Role reachability: what a role can *actually* reach, not just what the ACL
 * rows name.
 *
 * `effectiveGrants` (see `lattice.ts`) already folds the three ways a
 * privilege arrives passively — a direct grant, a grant TO PUBLIC, and a grant
 * to a role the caller INHERITs from. That closure answers "what privileges
 * does this role hold?" but not "what can this role make Postgres do?", and on
 * PG16+ the two diverge: a membership can confer `SET ROLE` (`set_option`)
 * *without* inheritance, so a role that passively holds nothing can still
 * execute with a target role's full privileges by assuming it.
 *
 * This module is the first step of the reachability lattice (planning
 * #1358/#1361): it projects a role's reach into each relation as a set of
 * cells, each carrying the role the access actually *executes as*
 * (`effectiveRole`) and how that reach arrived (`path`). Stage 1 models two
 * edge kinds — passive grants and `SET ROLE` — both catalog-proven
 * (`proof: 'catalog'`). Stage 2 adds the view-ownership edge: a read through a
 * non-`security_invoker` view executes as the view's owner, and the base
 * relations it touches are read out of the view body, so those cells carry
 * `proof: 'ast'`. SECURITY DEFINER function edges come later.
 */

import type { GrantInfo, PgPrivilege, TableSnapshot } from '../pg/introspect';
import { effectiveGrants, type GrantVia, type RoleGraph } from './lattice';

/** One hop in the path by which a role reaches a relation. */
export type RoleReachEdge =
  /** A privilege held passively: directly, via PUBLIC, or via INHERIT. */
  | { kind: 'grant'; via: GrantVia; privilege: PgPrivilege }
  /** The caller assumed `to` with `SET ROLE` (`pg_auth_members.set_option`). */
  | { kind: 'setrole'; to: string }
  /**
   * The caller read through a view that executes as `owner` — every relation
   * the body names is read under the owner's privileges, not the caller's.
   */
  | { kind: 'view'; view: string; owner: string }
  /**
   * The caller read a materialized view whose rows were computed as `owner`
   * at REFRESH time. Unlike the view edge this holds whatever the reader's
   * privileges are: the rows are stored, so the bases are never consulted and
   * their policies never run.
   */
  | { kind: 'matview'; view: string; owner: string }
  /**
   * The caller's command fired a rewrite rule on `view`. The rule's actions
   * are permission-checked against the rule's table owner, and unlike the
   * view edge this is *not* governed by `security_invoker`.
   */
  | { kind: 'rule'; view: string; rule: string; owner: string };

/**
 * How well-founded a reach cell is. Stage 1 is entirely `catalog` — every
 * edge is a row in `pg_auth_members` or an ACL entry. Later edges derived from
 * parsing function/view bodies are `ast`; a body safegres cannot follow
 * (dynamic SQL) taints everything downstream as `opaque-tainted`, which callers
 * must treat as *unknown*, never as *safe*.
 */
export type ReachProof = 'catalog' | 'ast' | 'opaque-tainted';

/** One relation a role reaches, under one effective role, by one path. */
export interface RoleReachCell {
  schema: string;
  table: string;
  privileges: PgPrivilege[];
  /**
   * The role the access executes as. Equal to the querying role for passive
   * grants; the assumed role once a `setrole` edge is on the path. Postgres
   * checks the relation's ACLs and RLS policies against *this* role, which is
   * why it has to be retained rather than collapsed back onto the caller.
   */
  effectiveRole: string;
  /** The edges, caller-first, by which the reach arrived. */
  path: RoleReachEdge[];
  proof: ReachProof;
  /**
   * The relation was not introspected: it is outside the audited schemas.
   * `privileges` is what the path exercises, not what the relation permits.
   */
  external?: boolean;
  /** The columns of the relation the path reaches, where they are known. */
  columns?: string[];
  /**
   * Why the path is only a lower bound, on a `opaque-tainted` cell: the body
   * that produced it executes SQL this analysis cannot follow, so the relation
   * it names is the *view itself* and what lies beyond it is unknown.
   */
  taint?: string;
}

/** Everything one role reaches, across the relations examined. */
export interface RoleReach {
  role: string;
  cells: RoleReachCell[];
}

const RLS_PRIVILEGES: PgPrivilege[] = ['SELECT', 'INSERT', 'UPDATE', 'DELETE'];

/**
 * Project each role's reach into `tables`. Stage 1 emits, per (role, table):
 *
 *   - one `effectiveRole === role` cell for the passive `effectiveGrants`
 *     closure, when non-empty; and
 *   - one cell per role in the caller's transitive `SET ROLE` closure that
 *     itself holds privileges on the table — the access it gains by assuming
 *     that role.
 *
 * A relation the role cannot reach at all produces no cell.
 */
export function computeRoleReach(
  tables: TableSnapshot[],
  graph: RoleGraph,
  roles: string[]
): RoleReach[] {
  return roles.map((role) => {
    const attrs = graph.get(role);
    const cells: RoleReachCell[] = [];

    for (const table of tables) {
      const direct = effectiveGrants(table, role, graph).filter((g) =>
        RLS_PRIVILEGES.includes(g.privilege)
      );
      if (direct.length > 0) {
        cells.push({
          schema: table.schema,
          table: table.name,
          privileges: direct.map((g) => g.privilege),
          effectiveRole: role,
          path: direct.map((g) => ({ kind: 'grant', via: g.via, privilege: g.privilege })),
          proof: 'catalog'
        });
      }

      for (const target of attrs?.canSetRole ?? []) {
        const assumed = effectiveGrants(table, target, graph).filter((g) =>
          RLS_PRIVILEGES.includes(g.privilege)
        );
        if (assumed.length === 0) continue;
        cells.push({
          schema: table.schema,
          table: table.name,
          privileges: assumed.map((g) => g.privilege),
          effectiveRole: target,
          path: [
            { kind: 'setrole', to: target },
            ...assumed.map((g) => ({ kind: 'grant' as const, via: g.via, privilege: g.privilege }))
          ],
          proof: 'catalog'
        });
      }
    }

    return { role, cells };
  });
}

/** One relation a view body reads, with the roles the hops execute as. */
export interface ViewBaseRelation {
  schema: string;
  table: string;
  /**
   * The view hops the read passes through, outermost first. The last hop's
   * owner is the role the base relation is actually read as.
   */
  hops: Array<{ view: string; owner: string }>;
  /**
   * The relation lives outside the audited schemas, so nothing is known about
   * its ACL, its RLS or its owner. The read is proven; its consequences are
   * not, and a consumer must not grade it as if the relation were in scope.
   */
  external?: boolean;
  /**
   * The columns of the relation that actually escape through the view, from
   * the catalog's own dependency rows. Absent means unknown — never "none".
   */
  columns?: string[];
}

/** A view, its own ACL, and the base relations its body was found to read. */
export interface ViewReachInput {
  schema: string;
  name: string;
  owner: string;
  /** ACL rows on the view itself — who can SELECT the view at all. */
  grants: GrantInfo[];
  baseRelations: ViewBaseRelation[];
  /**
   * The outermost relation is a materialized view, so its first hop is a
   * `matview` edge: the rows were computed at REFRESH time rather than read
   * through on demand.
   */
  materialized?: boolean;
  /**
   * The body was wholly or partly unreadable, and why. `baseRelations` is
   * then a *lower bound*: everything in it is proven, but the body reaches
   * relations this analysis cannot name.
   */
  unreadable?: string;
}

/**
 * Project the view-ownership edge into the same reach model: for every role
 * that can SELECT a view, one cell per base relation the view body reads,
 * under the owner the hop executes as.
 *
 * Only SELECT is modelled here; the write half is
 * {@link computeViewWriteReach}, which needs the catalog's updatability
 * answer on top of the body's relation set.
 *
 * A view whose body could not be read (dynamic SQL, an unparseable body)
 * still belongs in `views`, carrying {@link ViewReachInput.unreadable}: an
 * unreadable body is unknown, not empty, and it yields one extra cell naming
 * the *view* with `proof: 'opaque-tainted'` — the reach is real, its far end
 * is not knowable here. Grading rules must skip those cells; only a coverage
 * rule should report them.
 */
export function computeViewReach(
  views: ViewReachInput[],
  graph: RoleGraph,
  roles: string[]
): RoleReach[] {
  return roles.map((role) => {
    const cells: RoleReachCell[] = [];

    for (const view of views) {
      const select = effectiveGrants(view, role, graph).find((g) => g.privilege === 'SELECT');
      if (!select) continue;

      for (const base of view.baseRelations) {
        if (base.hops.length === 0) continue;
        cells.push({
          schema: base.schema,
          table: base.table,
          privileges: ['SELECT'],
          effectiveRole: base.hops[base.hops.length - 1].owner,
          path: [
            { kind: 'grant', via: select.via, privilege: 'SELECT' },
            ...base.hops.map((h, i) => ({
              kind: view.materialized && i === 0 ? ('matview' as const) : ('view' as const),
              view: h.view,
              owner: h.owner
            }))
          ],
          proof: 'ast',
          ...(base.external ? { external: true } : {}),
          ...(base.columns ? { columns: base.columns } : {})
        });
      }

      if (view.unreadable) {
        cells.push({
          schema: view.schema,
          table: view.name,
          privileges: ['SELECT'],
          effectiveRole: view.owner,
          path: [
            { kind: 'grant', via: select.via, privilege: 'SELECT' },
            { kind: 'view', view: `${view.schema}.${view.name}`, owner: view.owner }
          ],
          proof: 'opaque-tainted',
          taint: view.unreadable
        });
      }
    }

    return { role, cells };
  });
}

/**
 * One relation a *write* against a view lands on.
 *
 * The two privileges are distinct on purpose. `via` is what the caller must
 * hold on the view to issue the command; `privilege` is what the rewritten
 * command exercises on the target. They coincide for an auto-updatable view
 * (an INSERT on the view is an INSERT on its base relation) and routinely
 * differ for a rewrite rule, where `ON INSERT ... DO INSTEAD UPDATE other`
 * turns one into the other.
 */
export interface ViewWriteEdge {
  schema: string;
  table: string;
  via: PgPrivilege;
  privilege: PgPrivilege;
  /** View hops, outermost first; the last hop's owner executes the write. */
  hops: Array<{ view: string; owner: string }>;
  /** Set when the edge exists because of a rewrite rule, not auto-update. */
  rule?: string;
}

/** A view, its own ACL, and the relations writes against it reach. */
export interface ViewWriteInput {
  schema: string;
  name: string;
  owner: string;
  grants: GrantInfo[];
  writeEdges: ViewWriteEdge[];
}

/**
 * Project write edges through views into the reach model: for every role that
 * holds the triggering command on the view, one cell per relation that write
 * lands on, under the role the landing executes as.
 *
 * As with {@link computeViewReach}, a view whose write target could not be
 * proven must not appear in `views` — an `INSTEAD OF` trigger's body, a
 * multi-relation body, or an unreadable rule action is unknown, not empty.
 */
export function computeViewWriteReach(
  views: ViewWriteInput[],
  graph: RoleGraph,
  roles: string[]
): RoleReach[] {
  return roles.map((role) => {
    const cells: RoleReachCell[] = [];

    for (const view of views) {
      const held = effectiveGrants(view, role, graph);
      for (const edge of view.writeEdges) {
        if (edge.hops.length === 0) continue;
        const grant = held.find((g) => g.privilege === edge.via);
        if (!grant) continue;

        const last = edge.hops[edge.hops.length - 1];
        cells.push({
          schema: edge.schema,
          table: edge.table,
          privileges: [edge.privilege],
          effectiveRole: last.owner,
          path: [
            { kind: 'grant', via: grant.via, privilege: edge.via },
            ...edge.hops.map((h) => ({ kind: 'view' as const, view: h.view, owner: h.owner })),
            ...(edge.rule
              ? [{ kind: 'rule' as const, view: last.view, rule: edge.rule, owner: last.owner }]
              : [])
          ],
          proof: 'ast'
        });
      }
    }

    return { role, cells };
  });
}
