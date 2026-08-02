import type { PgPrivilege, TableSnapshot } from '../pg/introspect';
import type { Finding } from '../types';

/**
 * Role-trust rules (R-series): findings driven by *who* is granted access,
 * not just whether coverage exists. R1/R2 take a configurable list of
 * untrusted roles (e.g. `anonymous`) via rule options; with no roles
 * configured they are no-ops, so they cost nothing on databases without
 * such a role model.
 */

export interface RoleTrustOptions {
  /** Role names considered untrusted (exact match). */
  roles?: string[];
   /**
   * Take the untrusted roles from the resolved exposure surface instead of
   * naming them — their names are per-deployment (`myapp_visitor`, a
   * Constructive API's `anon_role`), so a preset cannot hardcode them.
   *
   * - `anon`: only the roles an *unauthenticated* caller arrives as. The right
   *   default for a stack whose signed-in role legitimately writes: flagging
   *   `authenticated` for holding an INSERT grant would flag the product.
   * - `exposure`: every role at the API edge, signed-in ones included. The
   *   stricter reading, for a surface where no role should write directly.
   *
   * Unions with `roles`.
   */
  rolesFrom?: 'exposure' | 'anon';
}

const WRITE_PRIVILEGES: PgPrivilege[] = ['INSERT', 'UPDATE', 'DELETE', 'TRUNCATE'];

/**
 * R1: an untrusted role holds a write privilege on a table. Even with
 * airtight policies, write access for e.g. `anonymous` is almost always a
 * grant mistake — unauthenticated actors can INSERT/UPDATE/DELETE.
 */
export function checkUntrustedRoleWrites(
  table: TableSnapshot,
  options: RoleTrustOptions = {}
): Finding[] {
  const untrusted = new Set(options.roles ?? []);
  if (untrusted.size === 0) return [];

  const out: Finding[] = [];
  for (const grant of table.grants) {
    if (!untrusted.has(grant.role)) continue;
    if (!WRITE_PRIVILEGES.includes(grant.privilege)) continue;
    out.push({
      code: 'R1',
      severity: 'critical',
      category: 'anti-pattern',
      schema: table.schema,
      table: table.name,
      role: grant.role,
      privilege: grant.privilege,
      message: `Untrusted role ${grant.role} has ${grant.privilege} grant on ${table.schema}.${table.name}`,
      hint: `Revoke ${grant.privilege} from ${grant.role} unless unauthenticated writes to this table are intentional (e.g. a public signup or event-ingest table).`
    });
  }
  return out;
}

/**
 * R2: a permissive policy makes write operations pass RLS for an untrusted
 * role (directly or via PUBLIC). Pairs with R1: the grant is the door, the
 * policy is the unlocked latch.
 */
export function checkUntrustedRolePolicies(
  table: TableSnapshot,
  options: RoleTrustOptions = {}
): Finding[] {
  const untrusted = new Set(options.roles ?? []);
  if (untrusted.size === 0 || !table.rlsEnabled) return [];

  const out: Finding[] = [];
  for (const policy of table.policies) {
    if (!policy.permissive) continue;
    if (policy.cmd === 'SELECT') continue;
    const applies = policy.roles.filter((r) => r === 'PUBLIC' || untrusted.has(r));
    if (applies.length === 0) continue;
    const via = policy.roles.includes('PUBLIC') ? 'PUBLIC (all roles)' : applies.join(', ');
    out.push({
      code: 'R2',
      severity: 'high',
      category: 'anti-pattern',
      schema: table.schema,
      table: table.name,
      policy: policy.name,
      message: `Permissive ${policy.cmd} policy ${policy.name} on ${table.schema}.${table.name} applies to untrusted role via ${via}`,
      hint: 'Scope the policy TO specific trusted roles instead of PUBLIC/untrusted roles, or verify unauthenticated writes are intended.'
    });
  }
  return out;
}

/**
 * R3: a table with RLS enabled has grants TO PUBLIC. PUBLIC includes every
 * present and future role, which silently widens access as roles are added
 * and defeats role-scoped policy reasoning.
 */
export function checkPublicGrants(table: TableSnapshot): Finding[] {
  if (!table.rlsEnabled) return [];
  const publicPrivs = table.grants.filter((g) => g.role === 'PUBLIC').map((g) => g.privilege);
  if (publicPrivs.length === 0) return [];
  return [
    {
      code: 'R3',
      severity: 'medium',
      category: 'anti-pattern',
      schema: table.schema,
      table: table.name,
      role: 'PUBLIC',
      message: `Table ${table.schema}.${table.name} has RLS enabled but grants ${publicPrivs.join(', ')} to PUBLIC`,
      hint: 'Grant to specific roles instead of PUBLIC — PUBLIC includes every current and future role, including untrusted ones.'
    }
  ];
}
