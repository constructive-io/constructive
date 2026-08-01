/**
 * Script A driver: pure-Postgres RLS audit.
 *
 * Ingests a catalog snapshot, runs every check, and returns a structured report.
 */

import { buildCallGraph } from '../callgraph/graph';
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
  checkMissingPrimaryKey,
  checkRedundantIndexes,
  checkUnindexedForeignKeys,
  checkUnindexedSearchColumns,
  checkUnindexedSortColumns
} from '../checks/indexes';
import {
  checkNonLeakproofPolicyFunctions,
  checkPolicyColumnCasts,
  checkUnindexedPolicyColumns,
  collectPredicateColumns,
  type PredicateColumn
} from '../checks/policy-index';
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
import { checkStats, DEFAULT_STATS_THRESHOLDS, type StatsThresholds } from '../checks/stats';
import { allAstRulesDisabled, applyRulesToFindings, matchTablePattern, resolveRules, rulesForTable } from '../config/resolve';
import type { ExposureConfig, SafegresConfig } from '../config/types';
import { type ExplainReport, proveFindings } from '../perf/explain';
import { resolveExposure } from '../pg/exposure';
import { introspectFunctions } from '../pg/functions';
import { introspectIndexes, introspectViewBodies, type TableIndexSnapshot } from '../pg/indexes';
import { asExecutor, type IntrospectOptions, introspectTables, type QueryExecutor, type TableSnapshot } from '../pg/introspect';
import { type AccessPath, classifyPaths } from '../pg/paths';
import { lookupVolatility, type ProcVolatility } from '../pg/proc';
import { listAuditableRoles, resolveRoles } from '../pg/roles';
import { introspectStats, type StatsSnapshot } from '../pg/stats';
import { dimensionOf, RULES_BY_CODE } from '../rules/registry';
import { computeScore } from '../score/score';
import type { ExposureReport, Finding, PerfReport, PerfStatsReport, Report } from '../types';
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
   * Build the unscored call-graph audit: trust boundaries (SECURITY DEFINER
   * hops, RLS-bypass paths, auth-context mutations) reachable from the
   * exposed entry points. Adds `report.callGraph`.
   */
  callGraph?: boolean;
  /**
   * Collect and score the performance dimension: index-hygiene rules (`X*`)
   * on top of the policy-cost rules (P1/P1b) the audit already runs. Adds
   * `report.perf` with its own score. Overrides `config.perf.enabled`.
   */
  perf?: boolean;
  /**
   * Collect runtime statistics (`pg_stat_user_tables`, `pg_stat_statements`)
   * and run the `S*` rules. Implies `perf`. Overrides `config.perf.stats.enabled`.
   */
  stats?: boolean;
  /**
   * Probe perf findings with `EXPLAIN (GENERIC_PLAN)` and attach the plan as
   * evidence, acknowledging findings the planner refutes. Implies `perf`.
   * Overrides `config.perf.explain.enabled`.
   */
  explain?: boolean;
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
  const statsEnabled = options.stats ?? config.perf?.stats?.enabled ?? false;
  const explainEnabled = options.explain ?? config.perf?.explain?.enabled ?? false;
  // Both tiers are refinements of the perf dimension: asking for either turns
  // it on, but neither is reachable without opting into perf in the first place.
  const perfEnabled =
    (options.perf ?? config.perf?.enabled ?? false) || statsEnabled || explainEnabled;
  const skipAst =
    options.skipAstChecks || allAstRulesDisabled(resolved, { perf: perfEnabled });

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

  // --- Performance dimension (opt-in): index hygiene ---
  const indexSnapshot = perfEnabled
    ? await introspectIndexes(exec, {
      schemas: options.schemas ?? config.schemas,
      excludeSchemas: options.excludeSchemas ?? config.excludeSchemas
    })
    : [];
  const indexesByTable = new Map<string, TableIndexSnapshot>(
    indexSnapshot.map((t) => [`${t.schema}.${t.name}`, t])
  );

  // Which foreign keys are query paths. Without this X1 demands an index for
  // every key, including write-once provisioning pointers nothing reads —
  // where the index is a write on every insert in exchange for nothing.
  const paths: Map<string, AccessPath> = perfEnabled && config.perf?.paths?.infer !== false
    ? classifyPaths(
      indexSnapshot,
      snapshot,
      await introspectViewBodies(exec, {
        schemas: options.schemas ?? config.schemas,
        excludeSchemas: options.excludeSchemas ?? config.excludeSchemas
      }),
      { minPointers: config.perf?.paths?.minPointers }
    )
    : new Map();

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

    // --- AST-level anti-patterns (and, with perf on, policy-aware index rules) ---
    if (!skipAst) {
      findings.push(
        ...(await auditTableAst(
          exec,
          table,
          perfEnabled ? indexesByTable.get(`${table.schema}.${table.name}`) : undefined
        ))
      );
    }
  }

  const statsSnapshot: StatsSnapshot | null = statsEnabled
    ? await introspectStats(exec, {
      schemas: options.schemas ?? config.schemas,
      excludeSchemas: options.excludeSchemas ?? config.excludeSchemas,
      statementLimit: config.perf?.stats?.topStatements
    })
    : null;

  if (perfEnabled) {
    for (const table of indexSnapshot) {
      findings.push(...checkUnindexedForeignKeys(table, paths));
      findings.push(...checkRedundantIndexes(table));
      findings.push(...checkUnindexedSearchColumns(table));
      findings.push(...checkUnindexedSortColumns(table));
      const x6 = checkMissingPrimaryKey(table);
      if (x6) findings.push(x6);
    }
  }

  if (statsSnapshot) {
    findings.push(...checkStats(statsSnapshot, statsThresholds(config)));
  }

  findings = applyRulesToFindings(resolved, findings);

  // Stamp direction (from the registry) and exposure on every finding.
  const publicRead = config.public?.read ?? [];
  const perfIgnore = config.perf?.ignore ?? [];
  for (const f of findings) {
    const meta = RULES_BY_CODE.get(f.code);
    if (meta && f.direction === undefined) f.direction = meta.direction;
    if (meta && f.dimension === undefined) f.dimension = dimensionOf(meta);
    if (exposure.known && f.schema) f.exposed = exposedSchemas.has(f.schema);

    // Declared-intentional perf debt: cold tables, tiny lookups, anything the
    // planner will seq-scan regardless. Reported, but off the perf score.
    if (
      f.dimension === 'perf' && f.schema && f.table
      && perfIgnore.some((p) => matchTablePattern(p, `${f.schema}.${f.table}`))
    ) {
      f.acknowledged = true;
      f.severity = 'info';
      f.message += ' — acknowledged (perf.ignore)';
      f.hint = 'This table is declared in `perf.ignore`, so the finding is treated as intentional and does not affect the perf score.';
    }

    // Declared-public reads: an open SELECT on a table listed in
    // `public.read` is intent, not a finding — acknowledge it (info,
    // excluded from the score). Undeclared open reads stay scored.
    if (
      f.code === 'A8' && f.schema && f.table
      && publicRead.some((p) => matchTablePattern(p, `${f.schema}.${f.table}`))
    ) {
      f.acknowledged = true;
      f.severity = 'info';
      f.message += ' — declared public read (public.read)';
      f.hint = 'This table is declared in `public.read`, so the open read is treated as intentional and does not affect the score.';
    }
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

  // Planner proof runs last: it reads the findings the rules produced and
  // acknowledges the ones the planner disagrees with, before scoring.
  let explainReport: ExplainReport | undefined;
  if (explainEnabled) {
    explainReport = await proveFindings(
      exec,
      findings.filter((f) => f.dimension === 'perf' && !f.acknowledged),
      indexesByTable,
      { minRows: config.perf?.explain?.minRows }
    );
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

  const securityFindings = findings.filter((f) => f.dimension !== 'perf');
  const perfFindings = findings.filter((f) => f.dimension === 'perf');

  const report: Report = {
    version: PKG_VERSION,
    generatedAt: new Date().toISOString(),
    summary: summarize(findings),
    findings,
    score: computeScore(securityFindings, config.scoring, {
      exposedTables,
      exposureKnown: exposure.known
    }),
    exposure: exposureReport
  };

  if (perfEnabled) {
    // `S*` findings are scored by default — opting into `--stats` is the
    // opt-in — but can be demoted to advisories for a deterministic grade.
    const includeStats = config.perf?.scoring?.includeStats ?? true;
    const scorable = includeStats
      ? perfFindings
      : perfFindings.filter((f) => !f.code.startsWith('S'));

    const perf: PerfReport = {
      findings: perfFindings,
      summary: summarize(perfFindings),
      score: computeScore(scorable, config.perf?.scoring, {
        exposedTables,
        exposureKnown: exposure.known
      })
    };

    if (paths.size > 0) {
      const cold = [...paths.values()].filter((p) => p.state === 'cold');
      perf.paths = {
        total: paths.size,
        cold: cold.length,
        tables: new Set(cold.map((p) => `${p.schema}.${p.table}`)).size
      };
    }

    if (statsSnapshot) {
      const stats: PerfStatsReport = {
        source: 'live',
        tables: statsSnapshot.tables.length,
        statsReset: statsSnapshot.statsReset,
        scored: includeStats
      };
      if (statsSnapshot.statementsUnavailable) {
        stats.notes = [statsSnapshot.statementsUnavailable];
      }
      perf.stats = stats;
    }
    if (explainReport) perf.explain = explainReport;

    report.perf = perf;
  }

  if (options.callGraph) {
    const functions = await introspectFunctions(exec, {
      schemas: options.schemas ?? config.schemas,
      excludeSchemas: options.excludeSchemas ?? config.excludeSchemas
    });
    report.callGraph = await buildCallGraph({
      functions,
      tables: snapshot,
      exposedSchemas: exposure.known ? exposure.schemas : undefined,
      apiRoles: exposure.roles && exposure.roles.length > 0
        ? exposure.roles
        : ['anonymous', 'authenticated']
    });
  }

  return report;
}

/** Stats floors, config over defaults. */
function statsThresholds(config: SafegresConfig): StatsThresholds {
  const stats = config.perf?.stats ?? {};
  return {
    minRows: stats.minRows ?? DEFAULT_STATS_THRESHOLDS.minRows,
    seqScanRatio: stats.seqScanRatio ?? DEFAULT_STATS_THRESHOLDS.seqScanRatio,
    minIndexBytes: stats.minIndexBytes ?? DEFAULT_STATS_THRESHOLDS.minIndexBytes,
    deadTupleRatio: stats.deadTupleRatio ?? DEFAULT_STATS_THRESHOLDS.deadTupleRatio,
    minTimeShare: stats.minTimeShare ?? DEFAULT_STATS_THRESHOLDS.minTimeShare,
    topStatements: stats.topStatements ?? DEFAULT_STATS_THRESHOLDS.topStatements
  };
}

async function auditTableAst(
  exec: QueryExecutor,
  table: TableSnapshot,
  indexes?: TableIndexSnapshot
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
  const predicateColumns = new Map<string, PredicateColumn[]>();

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

    if (!indexes) continue;

    // --- Policy-aware perf rules (X2/X3/X4) ---
    const cols: PredicateColumn[] = [];
    if (using) {
      cols.push(...collectPredicateColumns(using, 'USING', table.name));
      findings.push(...checkNonLeakproofPolicyFunctions(table, using, volatility, policy.name));
    }
    if (withCheck) {
      cols.push(...collectPredicateColumns(withCheck, 'WITH CHECK', table.name));
      findings.push(...checkNonLeakproofPolicyFunctions(table, withCheck, volatility, policy.name));
    }
    if (cols.length > 0) predicateColumns.set(policy.name, cols);
  }

  if (indexes && predicateColumns.size > 0) {
    findings.push(...checkUnindexedPolicyColumns(table, indexes, predicateColumns));
    findings.push(...checkPolicyColumnCasts(table, indexes, predicateColumns));
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
