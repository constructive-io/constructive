import type { TableSnapshot } from '../pg/introspect';
import type { Finding } from '../types';

/**
 * A1: RLS is enabled but there are zero policies on the table.
 *
 * Every non-owner query returns 0 rows. Usually a sign that someone ran
 * `ALTER TABLE … ENABLE ROW LEVEL SECURITY` but never wrote the policies.
 */
export function checkRlsEnabledNoPolicies(table: TableSnapshot): Finding | null {
  if (!table.rlsEnabled) return null;
  if (table.policies.length > 0) return null;
  return {
    code: 'A1',
    severity: 'critical',
    category: 'flags',
    schema: table.schema,
    table: table.name,
    message: `RLS is enabled on ${table.schema}.${table.name} but the table has zero policies`,
    hint: 'Either add policies or disable RLS; otherwise non-owner queries return 0 rows (and writes by non-owners fail).'
  };
}

/**
 * A2: The table has non-trivial grants but RLS is disabled.
 *
 * Intent: if a real role (not just the owner or PUBLIC) can SELECT/INSERT/UPDATE/DELETE,
 * we'd expect RLS to be on. Tables intentionally meant to be global (e.g. lookup tables)
 * may be false positives; callers can exclude them via `--schemas`.
 */
export function checkGrantsWithoutRls(table: TableSnapshot): Finding | null {
  if (table.rlsEnabled) return null;
  const nonTrivialGrants = table.grants.filter((g) =>
    g.role !== table.owner
    && g.role !== 'PUBLIC'
    && !g.bypassRls
    && isWriteOrReadPrivilege(g.privilege)
  );
  if (nonTrivialGrants.length === 0) return null;

  const roles = Array.from(new Set(nonTrivialGrants.map((g) => g.role))).sort();
  return {
    code: 'A2',
    severity: 'high',
    category: 'flags',
    schema: table.schema,
    table: table.name,
    message:
      `Roles [${roles.join(', ')}] have grants on ${table.schema}.${table.name} but RLS is disabled`,
    hint: 'Every grantee can read/write every row. Enable RLS and add policies, or document the table as intentionally global.',
    context: { roles }
  };
}

/**
 * A3: RLS is enabled but FORCE ROW LEVEL SECURITY is not set.
 *
 * Without FORCE, the table owner bypasses all policies. For anything with
 * tenant data, that usually isn't what you want. Medium severity — owners
 * bypassing policies is sometimes intentional (e.g. admin tooling).
 */
export function checkRlsNotForced(table: TableSnapshot): Finding | null {
  if (!table.rlsEnabled) return null;
  if (table.rlsForced) return null;
  return {
    code: 'A3',
    severity: 'medium',
    category: 'flags',
    schema: table.schema,
    table: table.name,
    message: `RLS enabled on ${table.schema}.${table.name} but FORCE ROW LEVEL SECURITY is not set`,
    hint: 'Without FORCE, the table owner bypasses all policies. Add `ALTER TABLE … FORCE ROW LEVEL SECURITY` unless you deliberately want owner bypass.'
  };
}

function isWriteOrReadPrivilege(privilege: string): boolean {
  return privilege === 'SELECT'
    || privilege === 'INSERT'
    || privilege === 'UPDATE'
    || privilege === 'DELETE';
}
