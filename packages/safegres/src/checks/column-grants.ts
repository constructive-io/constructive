/**
 * L13: reach that exists only in `pg_attribute.attacl`.
 *
 * `GRANT SELECT (secret) ON t TO anonymous` writes nothing to the relation's
 * ACL. Every grant query in this package read `relacl` alone, so a role whose
 * entire access to a table is column-scoped was reported as reaching *nothing*
 * — no A2, no R1, no L-series, and "0 relation(s) accessible" in the role
 * access report. The privilege is real: the role selects those columns, and
 * when the table has no RLS it selects every row of them.
 *
 * The finding is deliberately about the *invisibility* as much as the access.
 * A column grant is a legitimate and often good way to expose a projection;
 * what is not fine is that nothing else in the audit grades it. So L13 reports
 * the reach, states whether RLS mediates it, and — as everywhere else — never
 * recommends revoking the grant it cannot prove unused.
 */

import type { PgPrivilege, TableSnapshot } from '../pg/introspect';
import type { Finding } from '../types';
import {
  effectiveColumnGrants,
  type LatticeRoleOptions,
  type RoleGraph
} from './lattice';

/** SELECT/INSERT/UPDATE are the column privileges RLS has anything to say about. */
const MEDIATED: PgPrivilege[] = ['SELECT', 'INSERT', 'UPDATE'];

export function checkUntrustedColumnGrants(
  table: TableSnapshot,
  graph: RoleGraph,
  options: LatticeRoleOptions = {}
): Finding[] {
  const roles = options.roles ?? [];
  if (roles.length === 0 || table.columnGrants.length === 0) return [];

  const out: Finding[] = [];
  for (const role of roles) {
    const grants = effectiveColumnGrants(table, role, graph).filter((g) =>
      MEDIATED.includes(g.privilege)
    );
    if (grants.length === 0) continue;

    const attrs = graph.get(role);
    // Same exemption test the rest of the lattice uses: a role RLS does not
    // apply to reads every row of the columns it is granted.
    const rlsApplies =
      table.rlsEnabled
      && !attrs?.bypassRls
      && !attrs?.isSuper
      && !(role === table.owner && !table.rlsForced);

    const columns = [...new Set(grants.flatMap((g) => g.columns))].sort();
    const privileges = grants.map((g) => g.privilege).sort();
    const via = grants[0].via;

    out.push({
      code: 'L13',
      severity: 'info',
      category: 'anti-pattern',
      schema: table.schema,
      table: table.name,
      role,
      privilege: privileges.join(', '),
      message:
        `Untrusted role ${role} holds column-level ${privileges.join(', ')} on `
        + `${table.schema}.${table.name} (${columns.join(', ')})`
        + (via === 'direct' ? '' : ` via ${via}`)
        + (rlsApplies
          ? ' — mediated by RLS, but invisible to every rule that reads the relation ACL'
          : ' — with no RLS to mediate it, so every row of those columns is readable'),
      hint:
        `Column grants live in \`pg_attribute.attacl\`, not \`relacl\`: \`\\dp\` shows them in `
        + `the "Column privileges" column and nothing else in this audit graded them until now. `
        + (rlsApplies
          ? 'Confirm the policies that mediate this relation are the ones you would want applied '
            + 'to a projection of it.'
          : 'If the projection is meant to be public this is correct as written; if not, enable '
            + 'RLS on the relation — the column grant restricts *which columns*, never which rows.')
        + ' Do not revoke the grant on the strength of this finding alone: nothing here proves it '
        + 'unused.',
      context: {
        columns,
        via,
        rlsMediated: rlsApplies,
        rlsEnabled: table.rlsEnabled
      }
    });
  }

  return out;
}
