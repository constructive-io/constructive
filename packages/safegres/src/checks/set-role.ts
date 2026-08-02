/**
 * L7: an untrusted role can `SET ROLE` to a role with materially greater
 * reach.
 *
 * The A/R/L rules all reason about privileges a role holds *passively* — a
 * direct grant, a grant TO PUBLIC, or one it INHERITs. On PG16+ a membership
 * can also confer the ability to `SET ROLE` to a role *without* inheriting its
 * privileges (`pg_auth_members.set_option = true`, `inherit_option = false`),
 * and that path is invisible to every passive-grant check: nothing the catalog
 * shows for the untrusted role names the relation, yet an unauthenticated
 * caller can assume the target role and execute with its full privileges.
 *
 * This flags, per relation, the privileges an untrusted role gains only by
 * assuming another role. It is catalog-proven and, at its shipping severity
 * (`info`), signal-only — see the registry entry for the intended severity
 * once the rule has proven itself in the field.
 */

import type { TableSnapshot } from '../pg/introspect';
import type { Finding } from '../types';
import type { LatticeRoleOptions, RoleGraph } from './lattice';
import { computeRoleReach } from './role-reach';

export function checkSetRoleEscalation(
  table: TableSnapshot,
  graph: RoleGraph,
  options: LatticeRoleOptions = {}
): Finding[] {
  const untrusted = options.roles ?? [];
  if (untrusted.length === 0) return [];

  const out: Finding[] = [];
  for (const { role, cells } of computeRoleReach([table], graph, untrusted)) {
    const passive = new Set(
      cells.filter((c) => c.effectiveRole === role).flatMap((c) => c.privileges)
    );

    // One finding per (untrusted role, assumed role) that adds reach: collapse
    // the per-target cells so a role reachable by two SET ROLE hops is reported
    // once, on the most privilege it grants.
    for (const cell of cells) {
      if (cell.effectiveRole === role) continue;
      const gained = cell.privileges.filter((p) => !passive.has(p));
      if (gained.length === 0) continue;

      const target = cell.effectiveRole;
      const attrs = graph.get(target);
      const bypassesRls = !!attrs?.bypassRls && !graph.get(role)?.bypassRls;
      const privileges = gained.join(', ');

      out.push({
        code: 'L7',
        severity: 'info',
        category: 'anti-pattern',
        schema: table.schema,
        table: table.name,
        role,
        privilege: privileges,
        message:
          `Untrusted role ${role} can SET ROLE to ${target}, gaining ${privileges} on `
          + `${table.schema}.${table.name} that it holds no passive grant for`
          + (bypassesRls ? ` (and ${target} bypasses RLS)` : ''),
        hint:
          `SET ROLE grants ${role} the full privileges of ${target} on demand — passive-grant `
          + `checks (A2/R1/L5) cannot see it. Revoke the membership, or set it \`WITH SET FALSE\` `
          + `so ${role} inherits only what is intended and cannot assume ${target}.`,
        context: {
          effectiveRole: target,
          targetBypassesRls: bypassesRls,
          targetIsSuperuser: !!attrs?.isSuper,
          gained
        }
      });
    }
  }
  return out;
}
