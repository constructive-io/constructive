import type { PgPrivilege, PolicyCmd, PolicyInfo, TableSnapshot } from '../pg/introspect';
import type { Finding } from '../types';

/**
 * Coverage rules for row-level security.
 *
 * The security posture of a table is determined per `(role, privilege)` — not
 * per individual policy. A grant is "covered" iff at least one applicable
 * *permissive* policy supplies the clause that privilege requires:
 *
 *   - INSERT  → a `WITH CHECK` clause (USING is not valid on FOR INSERT).
 *   - SELECT  → a `USING` clause.
 *   - UPDATE  → a `USING` clause (the FOR UPDATE visibility gate). If absent,
 *               writes against the row are impossible and the grant is dead.
 *   - DELETE  → a `USING` clause.
 *
 * Postgres fails writes at runtime when the required clause is missing across
 * *every* applicable permissive policy, so that's the only bar this check
 * holds us to. Whether an UPDATE policy also pairs a WITH CHECK (defense in
 * depth against row smuggling) is a separate, weaker concern that is
 * covered by `checkUpdateWithCheckCoverage` below as an INFO-level finding.
 */

/** What clause kind satisfies coverage for a given privilege. */
type ClauseKind = 'USING' | 'WITH CHECK';

const CLAUSE_REQUIRED: Partial<Record<PgPrivilege, ClauseKind>> = {
  SELECT: 'USING',
  INSERT: 'WITH CHECK',
  UPDATE: 'USING',
  DELETE: 'USING'
};

/** `polcmd` → the single verb the policy can satisfy (`ALL` satisfies every verb). */
const POLICY_CMDS: Record<PolicyCmd, PgPrivilege[]> = {
  SELECT: ['SELECT'],
  INSERT: ['INSERT'],
  UPDATE: ['UPDATE'],
  DELETE: ['DELETE'],
  ALL: ['SELECT', 'INSERT', 'UPDATE', 'DELETE']
};

/**
 * A4 / A5: Grant of INSERT/UPDATE/DELETE (A4, high) or SELECT (A5, medium) to
 * a role but no applicable permissive policy supplies the clause that verb
 * needs. A4 means "writes silently fail at runtime". A5 means "queries
 * silently return 0 rows".
 */
export function checkCoverageGaps(table: TableSnapshot): Finding[] {
  if (!table.rlsEnabled) return []; // A2 covers the "RLS off entirely" case.
  const out: Finding[] = [];

  for (const grant of table.grants) {
    if (grant.role === table.owner) continue;
    if (grant.role === 'PUBLIC') continue;
    if (grant.bypassRls) continue; // Superusers and BYPASSRLS roles aren't subject to policies.

    const requiredClause = CLAUSE_REQUIRED[grant.privilege];
    if (!requiredClause) continue; // TRUNCATE / REFERENCES / TRIGGER don't participate in RLS.

    const covered = table.policies.some((p) =>
      policyProvidesClause(p, grant.role, grant.privilege, requiredClause)
    );
    if (covered) continue;

    const [code, severity]: [string, Finding['severity']] = grant.privilege === 'SELECT'
      ? ['A5', 'medium']
      : ['A4', 'high'];

    out.push({
      code,
      severity,
      category: 'coverage',
      schema: table.schema,
      table: table.name,
      role: grant.role,
      privilege: grant.privilege,
      message:
        `Role ${grant.role} has ${grant.privilege} grant on ${table.schema}.${table.name} but no permissive policy supplies ${requiredClause} for ${grant.privilege}`,
      hint: grant.privilege === 'SELECT'
        ? 'Queries by this role will silently return 0 rows. Add a permissive policy FOR SELECT TO that role, or revoke the grant.'
        : `${grant.privilege} by this role will fail at runtime. Add a permissive policy FOR ${grant.privilege} TO that role supplying ${requiredClause}, or revoke the grant.`
    });
  }

  return out;
}

/**
 * A6 (informational): UPDATE coverage exists for a role but no applicable
 * permissive UPDATE policy pairs a `WITH CHECK`. This is defense-in-depth —
 * without WITH CHECK, updates can move rows out of the visible scope (a
 * "row smuggling" pattern). Low severity because it does not cause runtime
 * failures and in many designs is by construction safe (e.g. the columns
 * that define scope are not writable, or a trigger re-asserts scope).
 */
export function checkUpdateWithCheckCoverage(table: TableSnapshot): Finding[] {
  if (!table.rlsEnabled) return [];
  const out: Finding[] = [];

  const updateGrants = table.grants.filter(
    (g) =>
      g.privilege === 'UPDATE'
      && g.role !== table.owner
      && g.role !== 'PUBLIC'
      && !g.bypassRls
  );
  if (updateGrants.length === 0) return [];

  for (const grant of updateGrants) {
    const usingCovered = table.policies.some((p) =>
      policyProvidesClause(p, grant.role, 'UPDATE', 'USING')
    );
    if (!usingCovered) continue; // already reported as A4.

    const withCheckCovered = table.policies.some((p) =>
      policyProvidesClause(p, grant.role, 'UPDATE', 'WITH CHECK')
    );
    if (withCheckCovered) continue;

    out.push({
      code: 'A6',
      severity: 'info',
      category: 'coverage',
      schema: table.schema,
      table: table.name,
      role: grant.role,
      privilege: 'UPDATE',
      message:
        `Role ${grant.role} has UPDATE on ${table.schema}.${table.name}; USING is supplied but no applicable permissive policy provides WITH CHECK`,
      hint: 'Without a WITH CHECK on UPDATE, rows can be updated to values that move them outside the role\'s visible set. Add WITH CHECK if the scoped columns are writable by this role.'
    });
  }

  return out;
}

function policyProvidesClause(
  p: PolicyInfo,
  role: string,
  privilege: PgPrivilege,
  clause: ClauseKind
): boolean {
  if (!p.permissive) return false;
  if (!POLICY_CMDS[p.cmd].includes(privilege)) return false;
  if (!p.roles.includes('PUBLIC') && !p.roles.includes(role)) return false;
  return clause === 'USING' ? p.using != null : p.withCheck != null;
}
