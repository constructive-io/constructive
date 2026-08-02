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
 * edge kinds — passive grants and `SET ROLE` — and every fact is
 * catalog-proven (`proof: 'catalog'`). View-ownership and SECURITY DEFINER
 * edges (which need body analysis and carry `proof: 'ast' | 'opaque-tainted'`)
 * come in later stages; the types leave room for them without committing to
 * them now.
 */

import type { PgPrivilege, TableSnapshot } from '../pg/introspect';
import { effectiveGrants, type GrantVia, type RoleGraph } from './lattice';

/** One hop in the path by which a role reaches a relation. */
export type RoleReachEdge =
  /** A privilege held passively: directly, via PUBLIC, or via INHERIT. */
  | { kind: 'grant'; via: GrantVia; privilege: PgPrivilege }
  /** The caller assumed `to` with `SET ROLE` (`pg_auth_members.set_option`). */
  | { kind: 'setrole'; to: string };

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
