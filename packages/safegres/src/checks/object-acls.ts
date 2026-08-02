/**
 * L16/L17: privileges on the relations that are not tables.
 *
 * Every rule in this package grades a table, a view or a schema, so two kinds
 * of object have carried real privileges past the audit untouched.
 *
 * **L16 — sequences.** `USAGE` or `UPDATE` on a sequence is the right to call
 * `nextval` and `setval`: an untrusted role can burn the identifier space of
 * whatever the sequence feeds, or reset the counter so the next insert
 * collides with an existing row. `SELECT` is the right to read `last_value`,
 * which is a live row-count estimate for the owning table and the classic way
 * an "how many customers do they have" question gets answered through an API
 * that exposes none of them. None of it is row-filterable: RLS does not apply
 * to sequences.
 *
 * **L17 — foreign tables.** A foreign table cannot carry RLS *at all* —
 * Postgres rejects `ALTER FOREIGN TABLE ... ENABLE ROW LEVEL SECURITY` (18) —
 * so a grant on one is unconditionally unfiltered. That makes it strictly
 * worse than the A2 shape it resembles: A2 says "grants and no RLS", and its
 * remedy is to add RLS, which here does not exist as an option.
 *
 * Both are `info` and score-neutral to start, and neither recommends a revoke
 * it cannot justify. That constraint has teeth on sequences in particular: a
 * role holding `INSERT` on a table with a `serial` column *must* hold `USAGE`
 * on its sequence, so the `OWNED BY` link is reported alongside the grant and
 * the remedy leads with identity columns rather than with `REVOKE`.
 */

import type { PgPrivilege } from '../pg/introspect';
import type { ObjectAclSnapshot } from '../pg/objects';
import type { Finding } from '../types';
import { effectiveGrants, type LatticeRoleOptions, type RoleGraph } from './lattice';

/** Advancing the counter, versus reading where it has got to. */
const WRITE_PRIVILEGES: PgPrivilege[] = ['USAGE', 'UPDATE'];

export function checkUntrustedSequenceGrants(
  objects: ObjectAclSnapshot[],
  graph: RoleGraph,
  options: LatticeRoleOptions = {}
): Finding[] {
  const roles = options.roles ?? [];
  const sequences = objects.filter((o) => o.kind === 'sequence');
  if (roles.length === 0 || sequences.length === 0) return [];

  const out: Finding[] = [];

  for (const seq of sequences) {
    for (const role of roles) {
      const grants = effectiveGrants(seq, role, graph);
      if (grants.length === 0) continue;

      const privileges = [...new Set(grants.map((g) => g.privilege))].sort();
      const advances = privileges.some((p) => WRITE_PRIVILEGES.includes(p));
      const reads = privileges.includes('SELECT');

      const effects: string[] = [];
      if (advances) {
        effects.push('call `nextval`/`setval` — consuming the identifier space, or resetting the '
          + 'counter so the next insert collides');
      }
      if (reads) {
        effects.push('read `last_value`, a live estimate of how many rows the owning table has '
          + 'taken');
      }

      out.push({
        code: 'L16',
        severity: 'info',
        category: 'anti-pattern',
        schema: seq.schema,
        table: seq.name,
        role,
        privilege: privileges[0],
        message:
          `Untrusted role ${role} holds ${privileges.join(', ')} on sequence `
          + `${seq.schema}.${seq.name} (${grants[0].via}), so it can ${effects.join(', and ')}`
          + (seq.ownedBy ? ` — the sequence feeds ${seq.ownedBy}` : ''),
        hint: seq.ownedBy
          ? `Check whether ${role} inserts into ${seq.ownedBy.slice(0, seq.ownedBy.lastIndexOf('.'))} `
            + 'before touching this: a role writing a `serial` column needs USAGE, and revoking it '
            + 'breaks the insert. `GENERATED ... AS IDENTITY` needs no grant on the sequence at '
            + 'all, which is the fix that does not trade one break for another. Drop SELECT '
            + 'separately — reading `last_value` is never needed to insert.'
          : 'Nothing row-filters a sequence: RLS does not apply to one. If the role does not '
            + 'insert into a table this sequence feeds, the grant confers only the ability to '
            + 'consume or read the counter — confirm that before revoking, since an `OWNED BY` '
            + 'link is not the only way an insert can depend on it (a DEFAULT can name it).',
        context: {
          objectKind: 'sequence',
          privileges,
          via: grants[0].via,
          ...(seq.ownedBy ? { ownedBy: seq.ownedBy } : {})
        }
      });
    }
  }

  return out;
}

export function checkUntrustedForeignTableGrants(
  objects: ObjectAclSnapshot[],
  graph: RoleGraph,
  options: LatticeRoleOptions = {}
): Finding[] {
  const roles = options.roles ?? [];
  const foreign = objects.filter((o) => o.kind === 'foreign table');
  if (roles.length === 0 || foreign.length === 0) return [];

  const out: Finding[] = [];

  for (const ft of foreign) {
    for (const role of roles) {
      const grants = effectiveGrants(ft, role, graph);
      if (grants.length === 0) continue;

      const privileges = [...new Set(grants.map((g) => g.privilege))].sort();

      out.push({
        code: 'L17',
        severity: 'info',
        category: 'anti-pattern',
        schema: ft.schema,
        table: ft.name,
        role,
        privilege: privileges[0],
        message:
          `Untrusted role ${role} holds ${privileges.join(', ')} on foreign table `
          + `${ft.schema}.${ft.name}${ft.server ? ` (server ${ft.server})` : ''} `
          + `(${grants[0].via}) — a foreign table cannot carry RLS, so every row the remote side `
          + 'returns is returned',
        hint:
          'Postgres rejects `ENABLE ROW LEVEL SECURITY` on a foreign table, so unlike an ordinary '
          + 'grant-without-RLS this one cannot be fixed by adding a policy. Expose it through a '
          + 'view that carries the filter (and grant on the view instead), or move the filter to '
          + 'the foreign table\'s own options/remote side. Confirm the API does not serve this '
          + 'relation before revoking.',
        context: {
          objectKind: 'foreign table',
          privileges,
          via: grants[0].via,
          ...(ft.server ? { server: ft.server } : {})
        }
      });
    }
  }

  return out;
}
