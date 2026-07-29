/**
 * Script A driver: pure-Postgres RLS audit.
 *
 * Ingests a catalog snapshot, runs every check, and returns a structured report.
 */

import {
  checkSessionUserGating,
  checkTriviallyPermissive,
  checkVolatileFunctions,
  collectFunctionNames,
  parseOrNull
} from '../checks/anti-patterns';
import {
  checkCoverageGaps,
  checkUpdateWithCheckCoverage
} from '../checks/coverage';
import {
  checkGrantsWithoutRls,
  checkRlsEnabledNoPolicies,
  checkRlsNotForced
} from '../checks/rls-flags';
import {
  checkPublicGrants,
  checkUntrustedRolePolicies,
  checkUntrustedRoleWrites,
  type RoleTrustOptions
} from '../checks/role-trust';
import { allAstRulesDisabled, applyRulesToFindings, resolveRules, rulesForTable } from '../config/resolve';
import type { ExposureConfig, SafegresConfig } from '../config/types';
import { resolveExposure } from '../pg/exposure';
import { asExecutor, type IntrospectOptions, introspectTables, type QueryExecutor, type TableSnapshot } from '../pg/introspect';
import { lookupVolatility, type ProcVolatility } from '../pg/proc';
import { listAuditableRoles, resolveRoles } from '../pg/roles';
import { RULES_BY_CODE } from '../rules/registry';
import { computeScore } from '../score/score';
import type { ExposureReport, Finding, Report } from '../types';
import { summarize } from '../types';
import { version as PKG_VERSION } from '../version';

export interface AuditOptions extends IntrospectOptions {
  /** If provided, bypass `pg_roles` enumeration. Otherwise enumerate roles dynamically. */
  includeRoles?: string[];
  /** Roles to drop after enumeration. */
  excludeRoles?: string[];
  /**
   * Skip AST-level anti-pattern checks (P1, P5). Useful for very fast audits
   * that only want grants + RLS-flag + coverage findings.
   */
  skipAstChecks?: boolean;
  /**
   * The exposed API surface. Overrides `config.exposure` when provided.
   * Findings on non-exposed schemas contribute nothing to the score.
   */
  exposure?: ExposureConfig;
  /**
   * Merged safegres configuration (rules, overrides, scoring). Rule settings
   * filter and retune findings; scoring settings drive the report score.
   * Connection-independent option fields (`schemas`, `roles`, …) present on
   * the config are used as fallbacks for the corresponding AuditOptions.
   */
  config?: SafegresConfig;
}

export async function audit(
  client: QueryExecutor,
  options: AuditOptions = {}
): Promise<Report> {
  const exec = asExecutor(client);
  const config = options.config ?? {};
  const resolved = resolveRules(config);
  const skipAst = options.skipAstChecks || allAstRulesDisabled(resolved);

  // Resolve role set.
  const allRoles = await listAuditableRoles(exec);
  const resolution = resolveRoles(
    allRoles,
    options.includeRoles ?? config.roles,
    options.excludeRoles ?? config.excludeRoles
  );

  const exposure = await resolveExposure(exec, options.exposure ?? config.exposure);
  const exposedSchemas = new Set(exposure.schemas);

  const snapshot = await introspectTables(exec, {
    schemas: options.schemas ?? config.schemas,
    excludeSchemas: options.excludeSchemas ?? config.excludeSchemas,
    roles: resolution.roles
  });

  const exposedTables = exposure.known
    ? snapshot.filter((t) => exposedSchemas.has(t.schema)).length
    : snapshot.length;

  let findings: Finding[] = [];

  for (const table of snapshot) {
    // --- RLS flags (structural) ---
    const a1 = checkRlsEnabledNoPolicies(table);
    if (a1) findings.push(a1);

    const a2 = checkGrantsWithoutRls(table);
    if (a2) findings.push(a2);

    const a3 = checkRlsNotForced(table);
    if (a3) findings.push(a3);

    // --- Grant-vs-policy coverage ---
    findings.push(...checkCoverageGaps(table));
    findings.push(...checkUpdateWithCheckCoverage(table));

    // --- Role-trust (options-driven; per-table overrides can retune roles) ---
    const tableRules = rulesForTable(resolved, table.schema, table.name);
    findings.push(
      ...checkUntrustedRoleWrites(table, tableRules.get('R1')?.options as RoleTrustOptions)
    );
    findings.push(
      ...checkUntrustedRolePolicies(table, tableRules.get('R2')?.options as RoleTrustOptions)
    );
    findings.push(...checkPublicGrants(table));

    // --- AST-level anti-patterns ---
    if (!skipAst) {
      findings.push(...(await auditTableAst(exec, table)));
    }
  }

  findings = applyRulesToFindings(resolved, findings);

  // Stamp direction (from the registry) and exposure on every finding.
  for (const f of findings) {
    const meta = RULES_BY_CODE.get(f.code);
    if (meta && f.direction === undefined) f.direction = meta.direction;
    if (exposure.known && f.schema) f.exposed = exposedSchemas.has(f.schema);
  }

  // W1: no exposure surface — the whole database is assumed reachable.
  if (!exposure.known && resolved.rules.get('W1')?.enabled !== false) {
    findings.push({
      code: 'W1',
      severity: resolved.rules.get('W1')?.severity ?? 'medium',
      category: 'meta',
      direction: 'neutral',
      message:
        'No exposure surface configured — the audit assumes the entire database is reachable and the score is capped',
      hint:
        'Declare `exposure.schemas` (or use `exposure.resolver: "constructive"` on a Constructive database) so the score reflects what the exposed APIs can actually reach.'
    });
  }

  findings.sort(compareFindings);

  const exposureReport: ExposureReport = {
    known: exposure.known,
    source: exposure.source,
    schemas: exposure.schemas,
    ...(exposure.roles ? { roles: exposure.roles } : {}),
    exposedTables,
    totalTables: snapshot.length
  };

  return {
    version: PKG_VERSION,
    generatedAt: new Date().toISOString(),
    summary: summarize(findings),
    findings,
    score: computeScore(findings, config.scoring, {
      exposedTables,
      exposureKnown: exposure.known
    }),
    exposure: exposureReport
  };
}

async function auditTableAst(
  exec: QueryExecutor,
  table: TableSnapshot
): Promise<Finding[]> {
  if (table.policies.length === 0) return [];

  // Collect all function names referenced across this table's policies so we
  // can resolve volatility in one round-trip.
  const funcNames: Array<{ schema?: string; name: string }> = [];
  const parsed: Array<{
    policy: (typeof table.policies)[number];
    using: Awaited<ReturnType<typeof parseOrNull>>;
    withCheck: Awaited<ReturnType<typeof parseOrNull>>;
  }> = [];

  for (const p of table.policies) {
    const using = await parseOrNull(p.using, `${table.schema}.${table.name}.${p.name} USING`);
    const withCheck = await parseOrNull(p.withCheck, `${table.schema}.${table.name}.${p.name} WITH CHECK`);
    parsed.push({ policy: p, using, withCheck });
    if (using) funcNames.push(...collectFunctionNames(using));
    if (withCheck) funcNames.push(...collectFunctionNames(withCheck));
  }

  let volatility: Map<string, ProcVolatility>;
  try {
    volatility = await lookupVolatility(exec, funcNames);
  } catch {
    volatility = new Map();
  }

  const findings: Finding[] = [];
  for (const { policy, using, withCheck } of parsed) {
    const trivial = checkTriviallyPermissive(table, policy, using, withCheck);
    if (trivial) findings.push(trivial);
    if (using) {
      findings.push(...checkVolatileFunctions(table, using, volatility, policy.name));
      findings.push(...checkSessionUserGating(table, using, policy.name));
    }
    if (withCheck) {
      findings.push(...checkVolatileFunctions(table, withCheck, volatility, policy.name));
      findings.push(...checkSessionUserGating(table, withCheck, policy.name));
    }
  }

  return dedupe(findings);
}

function compareFindings(a: Finding, b: Finding): number {
  const order: Record<Finding['severity'], number> = { critical: 0, high: 1, medium: 2, low: 3, info: 4 };
  if (order[a.severity] !== order[b.severity]) return order[a.severity] - order[b.severity];
  if (a.schema !== b.schema) return (a.schema ?? '').localeCompare(b.schema ?? '');
  if (a.table !== b.table) return (a.table ?? '').localeCompare(b.table ?? '');
  return a.code.localeCompare(b.code);
}

function dedupe(findings: Finding[]): Finding[] {
  const seen = new Set<string>();
  const out: Finding[] = [];
  for (const f of findings) {
    const key = [f.code, f.schema, f.table, f.policy, f.message].join('::');
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(f);
  }
  return out;
}
