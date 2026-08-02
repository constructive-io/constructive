/**
 * The grant/RLS/policy lattice (L-series).
 *
 * The A/R rules reason from grants exactly as the catalog stores them, which
 * misses two ways access actually arrives: `GRANT TO PUBLIC` (one ACL row
 * that applies to every role) and role inheritance (zero ACL rows on the
 * member). The lattice rules evaluate the *effective* cell each
 * (relation, role, privilege) lands in:
 *
 *   | grant | RLS | policy | verdict                                   |
 *   |-------|-----|--------|-------------------------------------------|
 *   | yes   | on  | yes    | normal — policy-mediated access           |
 *   | yes   | on  | no     | dead grant (L1, indirect; A4/A5, direct)  |
 *   | yes   | off | —      | unmediated (L5 for untrusted, indirect)   |
 *   | no    | —   | yes    | dead policy (L2)                          |
 *
 * plus schema-USAGE composition: an object grant the grantee cannot reach
 * because USAGE is missing (L3), and USAGE that reaches no object (L4).
 *
 * Every L rule ships signal-only: L1–L3 are fail-closed (zero score weight by
 * default), L4/L5 default to `info`. Escalate via config once the findings
 * prove themselves.
 */

import type { RoleAttributes, SchemaAclInfo } from '../pg/acl';
import type { PgPrivilege, PolicyInfo, TableSnapshot } from '../pg/introspect';
import type { Finding } from '../types';
import { CLAUSE_REQUIRED, POLICY_CMDS } from './coverage';

export type RoleGraph = Map<string, RoleAttributes>;

/** How an effective privilege arrived at a role. */
export type GrantVia = 'direct' | 'PUBLIC' | `member of ${string}`;

export interface EffectiveGrant {
  privilege: PgPrivilege;
  via: GrantVia;
}

const RLS_PRIVILEGES: PgPrivilege[] = ['SELECT', 'INSERT', 'UPDATE', 'DELETE'];

/**
 * Every privilege `role` effectively holds on `table`: direct grants, grants
 * TO PUBLIC, and grants to roles it inherits from. Deduplicated per privilege
 * with the most direct provenance winning (direct > PUBLIC > inherited).
 */
export function effectiveGrants(
  table: TableSnapshot,
  role: string,
  graph: RoleGraph
): EffectiveGrant[] {
  const byPrivilege = new Map<PgPrivilege, GrantVia>();
  const rank = (via: GrantVia): number =>
    via === 'direct' ? 0 : via === 'PUBLIC' ? 1 : 2;
  const record = (privilege: PgPrivilege, via: GrantVia) => {
    const existing = byPrivilege.get(privilege);
    if (existing === undefined || rank(via) < rank(existing)) {
      byPrivilege.set(privilege, via);
    }
  };

  const ancestors = new Set(graph.get(role)?.inheritsFrom ?? []);
  for (const g of table.grants) {
    if (g.role === role) record(g.privilege, 'direct');
    else if (g.role === 'PUBLIC') record(g.privilege, 'PUBLIC');
    else if (ancestors.has(g.role)) record(g.privilege, `member of ${g.role}`);
  }

  return [...byPrivilege.entries()]
    .map(([privilege, via]) => ({ privilege, via }))
    .sort((a, b) => a.privilege.localeCompare(b.privilege));
}

/**
 * Whether a policy applies to `role` at runtime: named directly, via PUBLIC,
 * or via a role it inherits from (`pg_has_role(..., 'member')` semantics).
 */
function policyAppliesToRole(p: PolicyInfo, role: string, graph: RoleGraph): boolean {
  if (p.roles.includes('PUBLIC') || p.roles.includes(role)) return true;
  const ancestors = graph.get(role)?.inheritsFrom ?? [];
  return ancestors.some((a) => p.roles.includes(a));
}

function coveredForRole(
  table: TableSnapshot,
  role: string,
  privilege: PgPrivilege,
  graph: RoleGraph
): boolean {
  const clause = CLAUSE_REQUIRED[privilege];
  if (!clause) return true;
  return table.policies.some(
    (p) =>
      p.permissive
      && POLICY_CMDS[p.cmd].includes(privilege)
      && policyAppliesToRole(p, role, graph)
      && (clause === 'USING' ? p.using != null : p.withCheck != null)
  );
}

/**
 * L1: an *indirect* grant (TO PUBLIC, or inherited from a granted role) on an
 * RLS-enabled table with no applicable permissive policy — a dead grant that
 * A4/A5 cannot see because no direct ACL row names the role. Default-deny
 * admits nothing today; the risk is the grant silently activating the day a
 * broad policy is added.
 */
export function checkIndirectCoverageGaps(
  table: TableSnapshot,
  graph: RoleGraph
): Finding[] {
  if (!table.rlsEnabled) return [];
  const out: Finding[] = [];

  // PUBLIC grants: dead if no permissive policy provides the clause for anyone.
  for (const g of table.grants) {
    if (g.role !== 'PUBLIC') continue;
    const clause = CLAUSE_REQUIRED[g.privilege];
    if (!clause) continue;
    const covered = table.policies.some(
      (p) =>
        p.permissive
        && POLICY_CMDS[p.cmd].includes(g.privilege)
        && (clause === 'USING' ? p.using != null : p.withCheck != null)
    );
    if (covered) continue;
    out.push({
      code: 'L1',
      severity: 'low',
      category: 'coverage',
      schema: table.schema,
      table: table.name,
      role: 'PUBLIC',
      privilege: g.privilege,
      message: `${g.privilege} is granted TO PUBLIC on ${table.schema}.${table.name} but no permissive policy can admit it — a dead grant under RLS default-deny`,
      hint: 'Revoke the PUBLIC grant: it admits nothing today, and it silently activates for every role the day a broad policy is added.'
    });
  }

  // Inherited grants: evaluate roles that inherit from anything, skipping
  // bypass roles (policies don't apply) and privileges the role also holds
  // directly (A4/A5 own that report).
  for (const [role, attrs] of graph) {
    if (attrs.inheritsFrom.length === 0 || attrs.bypassRls) continue;
    if (role === table.owner) continue;
    const direct = new Set(
      table.grants.filter((g) => g.role === role).map((g) => g.privilege)
    );
    for (const eff of effectiveGrants(table, role, graph)) {
      if (eff.via === 'direct' || eff.via === 'PUBLIC') continue;
      if (direct.has(eff.privilege)) continue;
      if (!CLAUSE_REQUIRED[eff.privilege]) continue;
      if (coveredForRole(table, role, eff.privilege, graph)) continue;
      out.push({
        code: 'L1',
        severity: 'low',
        category: 'coverage',
        schema: table.schema,
        table: table.name,
        role,
        privilege: eff.privilege,
        message: `Role ${role} holds ${eff.privilege} on ${table.schema}.${table.name} (${eff.via}) but no applicable permissive policy can admit it — a dead inherited grant`,
        hint: `Either add a policy covering ${role} (or the granted role) or revoke ${eff.privilege} from the granted role — today the grant admits nothing.`
      });
    }
  }

  return out;
}

/**
 * L2: a permissive policy names a role that holds no grant the policy could
 * mediate — authorization written for a role that cannot reach the table.
 * Either the grant was forgotten (a broken feature) or the policy is stale.
 */
export function checkDeadPolicies(table: TableSnapshot, graph: RoleGraph): Finding[] {
  if (!table.rlsEnabled) return [];
  const out: Finding[] = [];

  const anyGrantee = table.grants.some((g) => g.role !== table.owner);

  for (const policy of table.policies) {
    if (!policy.permissive) continue;
    const privileges = POLICY_CMDS[policy.cmd];

    if (policy.roles.includes('PUBLIC')) {
      if (!anyGrantee) {
        out.push(deadPolicyFinding(table, policy, 'PUBLIC',
          `Permissive policy ${policy.name} on ${table.schema}.${table.name} applies to PUBLIC but no role holds any grant on the table`));
      }
      continue;
    }

    for (const role of policy.roles) {
      const attrs = graph.get(role);
      if (attrs?.bypassRls) continue; // policies never apply to it anyway
      const held = effectiveGrants(table, role, graph).map((e) => e.privilege);
      if (privileges.some((p) => held.includes(p))) continue;
      out.push(deadPolicyFinding(table, policy, role,
        `Permissive ${policy.cmd} policy ${policy.name} on ${table.schema}.${table.name} applies to ${role}, but ${role} holds no ${privileges.join('/')} grant (directly, via PUBLIC, or by inheritance)`));
    }
  }

  return out;
}

function deadPolicyFinding(
  table: TableSnapshot,
  policy: PolicyInfo,
  role: string,
  message: string
): Finding {
  return {
    code: 'L2',
    severity: 'low',
    category: 'coverage',
    schema: table.schema,
    table: table.name,
    policy: policy.name,
    role,
    message,
    hint: 'A policy is not a grant: without the underlying privilege the role gets nothing. Grant the privilege if the access is intended, or drop the stale policy.'
  };
}

/**
 * L3: an object grant the grantee cannot use because it lacks USAGE on the
 * schema — direct, via PUBLIC, or inherited. The grant is unreachable today
 * and activates silently the day USAGE is granted.
 */
export function checkUnreachableGrants(
  table: TableSnapshot,
  schemaAcls: Map<string, SchemaAclInfo>,
  graph: RoleGraph
): Finding[] {
  const acl = schemaAcls.get(table.schema);
  if (!acl) return [];

  const usageRoles = new Set(
    acl.grants.filter((g) => g.privilege === 'USAGE').map((g) => g.role)
  );

  const byRole = new Map<string, PgPrivilege[]>();
  for (const g of table.grants) {
    if (g.role === 'PUBLIC') continue; // per-role USAGE cannot be asserted for PUBLIC grantees
    const attrs = graph.get(g.role);
    if (!attrs || attrs.isSuper) continue; // superusers skip ACL checks entirely
    if (g.role === acl.owner) continue;
    if (usageRoles.has('PUBLIC') || usageRoles.has(g.role)) continue;
    if (attrs.inheritsFrom.some((a) => usageRoles.has(a) || a === acl.owner)) continue;
    byRole.set(g.role, [...(byRole.get(g.role) ?? []), g.privilege]);
  }

  return [...byRole.entries()].map(([role, privileges]) => ({
    code: 'L3',
    severity: 'low',
    category: 'coverage',
    schema: table.schema,
    table: table.name,
    role,
    privilege: [...new Set(privileges)].sort().join(', '),
    message: `Role ${role} is granted ${[...new Set(privileges)].sort().join(', ')} on ${table.schema}.${table.name} but has no USAGE on schema ${table.schema} — the grant is unreachable`,
    hint: 'Grant USAGE on the schema if the access is intended, or revoke the unreachable object grant so it cannot activate silently later.'
  }));
}

/**
 * L4: schema USAGE that opens the door to nothing — the role reaches no
 * relation (directly, via PUBLIC, or by inheritance) and can EXECUTE no
 * function in the schema. Advisory only: sequences, types and future objects
 * are not modeled, so this is a review candidate, not a proof.
 */
export function checkDeadSchemaUsage(
  schemaAcls: SchemaAclInfo[],
  tables: TableSnapshot[],
  graph: RoleGraph
): Finding[] {
  const tablesBySchema = new Map<string, TableSnapshot[]>();
  for (const t of tables) {
    tablesBySchema.set(t.schema, [...(tablesBySchema.get(t.schema) ?? []), t]);
  }

  const out: Finding[] = [];
  for (const acl of schemaAcls) {
    const schemaTables = tablesBySchema.get(acl.schema) ?? [];
    const executes = new Set(acl.executeRoles);

    for (const g of acl.grants) {
      if (g.privilege !== 'USAGE' || g.role === 'PUBLIC') continue;
      const attrs = graph.get(g.role);
      if (!attrs || attrs.isSuper) continue;
      if (g.role === acl.owner) continue;

      const reachesRelation = schemaTables.some(
        (t) => effectiveGrants(t, g.role, graph).length > 0
      );
      if (reachesRelation) continue;

      const reachesFunction =
        executes.has('PUBLIC')
        || executes.has(g.role)
        || attrs.inheritsFrom.some((a) => executes.has(a));
      if (reachesFunction) continue;

      out.push({
        code: 'L4',
        severity: 'info',
        category: 'coverage',
        schema: acl.schema,
        role: g.role,
        privilege: 'USAGE',
        message: `Role ${g.role} has USAGE on schema ${acl.schema} but reaches no relation and can execute no function in it — dead schema USAGE`,
        hint: 'Advisory: sequences, types and default privileges are not modeled. If nothing in the schema is meant for this role, revoke USAGE to keep the surface airtight.'
      });
    }
  }
  return out;
}

export interface LatticeRoleOptions {
  /** Role names considered untrusted (exact match). */
  roles?: string[];
}

/**
 * L5: an untrusted role reaches an RLS-disabled table *indirectly* — through
 * a grant TO PUBLIC or by inheriting from a granted role. Direct grants are
 * A2/R1 territory; the indirect paths are exactly the ones that slip past
 * exact-name matching (e.g. a world-readable table reached by `anonymous`
 * through PUBLIC).
 */
export function checkUntrustedIndirectAccess(
  table: TableSnapshot,
  graph: RoleGraph,
  options: LatticeRoleOptions = {}
): Finding[] {
  const untrusted = options.roles ?? [];
  if (untrusted.length === 0 || table.rlsEnabled) return [];

  const out: Finding[] = [];
  for (const role of untrusted) {
    const indirect = effectiveGrants(table, role, graph).filter(
      (e) => e.via !== 'direct' && RLS_PRIVILEGES.includes(e.privilege)
    );
    if (indirect.length === 0) continue;
    const privileges = indirect.map((e) => e.privilege).join(', ');
    const vias = [...new Set(indirect.map((e) => e.via))].join(', ');
    out.push({
      code: 'L5',
      severity: 'info',
      category: 'anti-pattern',
      schema: table.schema,
      table: table.name,
      role,
      privilege: privileges,
      message: `Untrusted role ${role} reaches ${table.schema}.${table.name} (${privileges}) via ${vias} — RLS is disabled, so every row is visible`,
      hint: 'Narrow the grant to the trusted roles that need it, or enable RLS. PUBLIC and inherited grants apply to untrusted roles even though no ACL row names them.'
    });
  }
  return out;
}

/** One role's effective reach into one relation. */
export interface RoleAccessRelation {
  schema: string;
  table: string;
  privileges: PgPrivilege[];
  /** Most direct provenance across the privileges. */
  via: GrantVia;
  /** `unmediated` = RLS off or bypassed; `mediated` = at least one applicable policy; `dead` = RLS default-deny. */
  access: 'unmediated' | 'mediated' | 'dead';
}

export interface RoleAccessEntry {
  role: string;
  /** Relations where at least one privilege is usable (mediated or unmediated). */
  accessibleTables: number;
  /** Relations readable/writable with no RLS mediation at all. */
  unmediated: RoleAccessRelation[];
  /** Relations reachable only through policies. */
  mediated: number;
  /** Relations where every effective privilege is dead (RLS default-deny). */
  dead: number;
}

/**
 * The direct answer to "what can role X see?": every relation the role
 * effectively reaches, classified by whether RLS mediates the access.
 */
export function computeRoleAccess(
  tables: TableSnapshot[],
  graph: RoleGraph,
  roles: string[]
): RoleAccessEntry[] {
  const out: RoleAccessEntry[] = [];
  for (const role of roles) {
    const attrs = graph.get(role);
    const entry: RoleAccessEntry = {
      role,
      accessibleTables: 0,
      unmediated: [],
      mediated: 0,
      dead: 0
    };

    for (const table of tables) {
      const grants = effectiveGrants(table, role, graph).filter((e) =>
        RLS_PRIVILEGES.includes(e.privilege)
      );
      if (grants.length === 0) continue;

      const privileges = grants.map((g) => g.privilege);
      const via = grants.reduce<GrantVia>(
        (best, g) => (rankVia(g.via) < rankVia(best) ? g.via : best),
        grants[0].via
      );

      if (!table.rlsEnabled || attrs?.bypassRls || (role === table.owner && !table.rlsForced)) {
        entry.accessibleTables += 1;
        entry.unmediated.push({ schema: table.schema, table: table.name, privileges, via, access: 'unmediated' });
        continue;
      }

      const usable = privileges.some((p) => coveredForRole(table, role, p, graph));
      if (usable) {
        entry.accessibleTables += 1;
        entry.mediated += 1;
      } else {
        entry.dead += 1;
      }
    }

    entry.unmediated.sort((a, b) =>
      a.schema === b.schema ? a.table.localeCompare(b.table) : a.schema.localeCompare(b.schema)
    );
    out.push(entry);
  }
  return out;
}

function rankVia(via: GrantVia): number {
  return via === 'direct' ? 0 : via === 'PUBLIC' ? 1 : 2;
}
