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
import { checkUntrustedColumnGrants } from '../checks/column-grants';
import {
  checkCoverageGaps,
  checkUpdateWithCheckCoverage
} from '../checks/coverage';
import { analyzeViewBodies, checkDefinerViewBypass } from '../checks/definer-view';
import {
  checkMissingPrimaryKey,
  checkRedundantIndexes,
  checkUnindexedForeignKeys,
  checkUnindexedSearchColumns,
  checkUnindexedSortColumns
} from '../checks/indexes';
import {
  checkDeadPolicies,
  checkDeadSchemaUsage,
  checkIndirectCoverageGaps,
  checkUnaddressableGrant,
  checkUnreachableGrants,
  checkUntrustedIndirectAccess,
  computeRoleAccess,
  type LatticeRoleOptions
} from '../checks/lattice';
import {
  checkNonLeakproofPolicyFunctions,
  checkPolicyColumnCasts,
  checkUnhoistedPolicyFunctions,
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
import { checkSetRoleEscalation } from '../checks/set-role';
import { checkStats, DEFAULT_STATS_THRESHOLDS, type StatsThresholds } from '../checks/stats';
import {
  analyzeViewExposure,
  checkLeakyFilterView,
  checkMatviewSnapshot
} from '../checks/view-exposure';
import { analyzeViewWrites, checkDefinerViewWrite, checkViewRuleBypass } from '../checks/view-writes';
import { configFingerprint } from '../config/fingerprint';
import { allAstRulesDisabled, applyRulesToFindings, matchTablePattern, resolveRules, rulesForTable } from '../config/resolve';
import type { ExposureConfig, SafegresConfig } from '../config/types';
import { resolvePlaneReach, scorePlane, stampPlanes } from '../exposure/planes';
import { LINT_RULES, LINT_RULES_BY_ID, lintDefinition, type LintProblem, type SuppressedProblem } from '../lint';
import { type ExplainReport, proveFindings } from '../perf/explain';
import { introspectRoleGraph, introspectSchemaAcls } from '../pg/acl';
import type { ResolvedExposure } from '../pg/exposure';
import { resolveExposure, resolvePlanes, resolveReach } from '../pg/exposure';
import { type FunctionSnapshot, introspectFunctions } from '../pg/functions';
import { introspectIndexes, introspectViews, type TableIndexSnapshot } from '../pg/indexes';
import { asExecutor, type IntrospectOptions, introspectTables, type QueryExecutor, type TableSnapshot } from '../pg/introspect';
import { type AccessPath, classifyPaths } from '../pg/paths';
import { lookupVolatility, type ProcVolatility } from '../pg/proc';
import { listAuditableRoles, resolveRoles } from '../pg/roles';
import { introspectStats, type StatsSnapshot } from '../pg/stats';
import { dimensionOf, RULES_BY_CODE } from '../rules/registry';
import { computeScore } from '../score/score';
import type { ExposureReport, Finding, PerfReport, PerfStatsReport, Report, RoleAccessReport } from '../types';
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
  /**
   * Record the run as sealed: produced under configuration the caller
   * controls, with no local config file, rule overrides or baselines. The
   * audit behaves identically — sealing is enforced by whoever assembles the
   * config (the CLI's `--sealed`) — but the claim lands in
   * `report.provenance` so a harness can require it.
   */
  sealed?: boolean;
  /** The preset a sealed run was graded under, recorded in the provenance. */
  preset?: string;
}

export async function audit(
  client: QueryExecutor,
  options: AuditOptions = {}
): Promise<Report> {
  const exec = asExecutor(client);
  const config = options.config ?? {};
  const resolved = resolveRules(config);

  // Function definitions are read by two independent features (the convention
  // linter and the call graph); introspect them at most once.
  let functionsCache: FunctionSnapshot[] | undefined;
  const getFunctions = async (): Promise<FunctionSnapshot[]> => {
    if (!functionsCache) {
      functionsCache = await introspectFunctions(exec, {
        schemas: options.schemas ?? config.schemas,
        excludeSchemas: options.excludeSchemas ?? config.excludeSchemas
      });
    }
    return functionsCache;
  };
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

  const exposureConfig = options.exposure ?? config.exposure;
  const exposure = await resolveExposure(exec, exposureConfig);
  const exposedSchemas = new Set(exposure.schemas);
  const planes = await resolvePlanes(exec, exposureConfig, exposure);
  // Relation-level precision within those schemas: what the generated API can
  // actually name. Schema membership is the coarse answer; this is the fine
  // one, and only an adapter that can prove it contributes.
  const apiReach = exposure.known
    ? await resolveReach(exec, exposureConfig, {
      schemas: exposure.schemas,
      excludeSchemas: options.excludeSchemas ?? config.excludeSchemas
    })
    : undefined;
  const unaddressable = new Set(
    (apiReach?.unreachable ?? []).map((r) => `${r.schema}.${r.table}`)
  );

  const extensions = options.extensions ?? config.extensions;

  const snapshot = await introspectTables(exec, {
    schemas: options.schemas ?? config.schemas,
    excludeSchemas: options.excludeSchemas ?? config.excludeSchemas,
    roles: resolution.roles,
    extensions
  });

  const isExposed = (schema: string, table?: string): boolean => {
    if (!exposedSchemas.has(schema)) return false;
    return table === undefined || !unaddressable.has(`${schema}.${table}`);
  };

  const exposedTables = exposure.known
    ? snapshot.filter((t) => isExposed(t.schema, t.name)).length
    : snapshot.length;

  // Effective-access inputs for the lattice rules: the INHERIT-following
  // role graph and the schema USAGE ACLs. Both are single cheap queries.
  const roleGraph = await introspectRoleGraph(exec);
  const schemaAcls = await introspectSchemaAcls(exec, {
    schemas: options.schemas ?? config.schemas,
    excludeSchemas: options.excludeSchemas ?? config.excludeSchemas
  });
  const schemaAclsByName = new Map(schemaAcls.map((a) => [a.schema, a]));

  // Roles requests arrive as, and the relations some policy predicate names.
  // L6 needs both: the first is whose grants it is talking about, the second
  // is the veto that stops it recommending a revoke of a load-bearing grant.
  const apiRoles = exposure.roles ?? [];
  const policyReferenced = policyReferencedRelations(snapshot);

  let findings: Finding[] = [];

  // --- Performance dimension (opt-in): index hygiene ---
  const indexSnapshot = perfEnabled
    ? await introspectIndexes(exec, {
      schemas: options.schemas ?? config.schemas,
      excludeSchemas: options.excludeSchemas ?? config.excludeSchemas,
      extensions
    })
    : [];
  const indexesByTable = new Map<string, TableIndexSnapshot>(
    indexSnapshot.map((t) => [`${t.schema}.${t.name}`, t])
  );

  // Views are read for three independent reasons: their bodies refute "nothing
  // queries this column" for the perf paths, their owners carry the L8 reach
  // edge, and their ACLs keep L4 from calling schema USAGE dead when a view is
  // the only thing in the schema the role can reach. One introspection serves
  // all three.
  const definerViewRoles = withExposedRoles(
    resolved.rules.get('L8')?.options as LatticeRoleOptions,
    exposure
  )?.roles ?? [];
  const viewWriteRoles = withExposedRoles(
    resolved.rules.get('L9')?.options as LatticeRoleOptions,
    exposure
  )?.roles ?? [];
  const ruleBypassRoles = withExposedRoles(
    resolved.rules.get('L10')?.options as LatticeRoleOptions,
    exposure
  )?.roles ?? [];
  const matviewRoles = withExposedRoles(
    resolved.rules.get('L11')?.options as LatticeRoleOptions,
    exposure
  )?.roles ?? [];
  const leakyViewRoles = withExposedRoles(
    resolved.rules.get('L12')?.options as LatticeRoleOptions,
    exposure
  )?.roles ?? [];
  const viewExposureEnabled =
    !skipAst
    && ((matviewRoles.length > 0 && resolved.rules.get('L11')?.enabled !== false)
      || (leakyViewRoles.length > 0 && resolved.rules.get('L12')?.enabled !== false));
  const viewWritesEnabled =
    !skipAst
    && ((viewWriteRoles.length > 0 && resolved.rules.get('L9')?.enabled !== false)
      || (ruleBypassRoles.length > 0 && resolved.rules.get('L10')?.enabled !== false));
  const needsViews =
    (perfEnabled && config.perf?.paths?.infer !== false)
    || resolved.rules.get('L4')?.enabled !== false
    || (!skipAst && definerViewRoles.length > 0 && resolved.rules.get('L8')?.enabled !== false)
    || viewWritesEnabled
    || viewExposureEnabled;
  const viewSnapshot = needsViews
    ? await introspectViews(exec, {
      schemas: options.schemas ?? config.schemas,
      excludeSchemas: options.excludeSchemas ?? config.excludeSchemas
    })
    : [];

  // Evidence about which foreign keys anything reads. Reported alongside the
  // findings; by default it changes neither, because no signal available on an
  // empty database proves a path is unreachable.
  const onWriteOncePointer = config.perf?.paths?.onWriteOncePointer ?? 'report';
  const paths: Map<string, AccessPath> = perfEnabled && config.perf?.paths?.infer !== false
    ? classifyPaths(
      indexSnapshot,
      snapshot,
      viewSnapshot.map((v) => v.definition),
      {
        minPointers: config.perf?.paths?.minPointers,
        hiddenBackwardRelations: new Set(apiReach?.hiddenBackwardRelations ?? [])
      }
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
      ...checkUntrustedRoleWrites(
        table,
        withExposedRoles(tableRules.get('R1')?.options as RoleTrustOptions, exposure)
      )
    );
    findings.push(
      ...checkUntrustedRolePolicies(
        table,
        withExposedRoles(tableRules.get('R2')?.options as RoleTrustOptions, exposure)
      )
    );
    findings.push(...checkPublicGrants(table));

    // --- Grant/RLS/policy lattice (effective access: PUBLIC + inheritance) ---
    findings.push(...checkIndirectCoverageGaps(table, roleGraph));
    findings.push(...checkDeadPolicies(table, roleGraph));
    findings.push(...checkUnreachableGrants(table, schemaAclsByName, roleGraph));
    findings.push(
      ...checkUntrustedIndirectAccess(
        table,
        roleGraph,
        withExposedRoles(tableRules.get('L5')?.options as LatticeRoleOptions, exposure)
      )
    );
    if (unaddressable.size > 0 && apiRoles.length > 0) {
      findings.push(
        ...checkUnaddressableGrant(table, roleGraph, unaddressable, {
          roles: apiRoles,
          policyReferenced
        })
      );
    }
    findings.push(
      ...checkSetRoleEscalation(
        table,
        roleGraph,
        withExposedRoles(tableRules.get('L7')?.options as LatticeRoleOptions, exposure)
      )
    );
    findings.push(
      ...checkUntrustedColumnGrants(
        table,
        roleGraph,
        withExposedRoles(tableRules.get('L13')?.options as LatticeRoleOptions, exposure)
      )
    );

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

  findings.push(...checkDeadSchemaUsage(schemaAcls, snapshot, roleGraph, viewSnapshot));

  // L8 is per-view, not per-table: a view body names its own base relations.
  if (!skipAst && definerViewRoles.length > 0 && resolved.rules.get('L8')?.enabled !== false) {
    const viewBodies = await analyzeViewBodies(viewSnapshot, snapshot);
    findings.push(
      ...checkDefinerViewBypass(viewBodies.views, snapshot, roleGraph, { roles: definerViewRoles })
    );
  }

  // L9/L10 are the write half of the same question, and share one analysis.
  if (viewWritesEnabled) {
    const writes = await analyzeViewWrites(viewSnapshot, snapshot);
    if (viewWriteRoles.length > 0 && resolved.rules.get('L9')?.enabled !== false) {
      findings.push(
        ...checkDefinerViewWrite(writes.autoUpdatable, snapshot, roleGraph, { roles: viewWriteRoles })
      );
    }
    if (ruleBypassRoles.length > 0 && resolved.rules.get('L10')?.enabled !== false) {
      findings.push(
        ...checkViewRuleBypass(writes.ruleDriven, snapshot, roleGraph, { roles: ruleBypassRoles })
      );
    }
  }

  // L11/L12 are the other two things a readable view does: store rows, and
  // filter them without being a boundary. One body pass serves both.
  if (viewExposureEnabled) {
    const exposureViews = await analyzeViewExposure(viewSnapshot, snapshot);
    if (matviewRoles.length > 0 && resolved.rules.get('L11')?.enabled !== false) {
      findings.push(
        ...checkMatviewSnapshot(exposureViews.matviews, snapshot, roleGraph, { roles: matviewRoles })
      );
    }
    if (leakyViewRoles.length > 0 && resolved.rules.get('L12')?.enabled !== false) {
      findings.push(
        ...checkLeakyFilterView(exposureViews.leaky, snapshot, roleGraph, { roles: leakyViewRoles })
      );
    }
  }

  const statsSnapshot: StatsSnapshot | null = statsEnabled
    ? await introspectStats(exec, {
      schemas: options.schemas ?? config.schemas,
      excludeSchemas: options.excludeSchemas ?? config.excludeSchemas,
      extensions,
      statementLimit: config.perf?.stats?.topStatements
    })
    : null;

  if (perfEnabled) {
    for (const table of indexSnapshot) {
      findings.push(...checkUnindexedForeignKeys(table, paths, onWriteOncePointer));
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

  // --- Convention linter (C*): source-level rules over function definitions ---
  const enabledLintRules = LINT_RULES.filter(
    (r) => resolved.rules.get(r.code)?.enabled !== false
  );
  if (enabledLintRules.length > 0) {
    const lintRuleIds = enabledLintRules.map((r) => r.id);
    for (const fn of await getFunctions()) {
      if (!fn.definition) continue;
      const subject = `${fn.schema}.${fn.name}(${fn.args})`;
      const { problems, suppressed } = await lintDefinition(
        fn.definition,
        fn.language,
        subject,
        { rules: lintRuleIds }
      );
      for (const p of problems) findings.push(lintFinding(fn, subject, p));
      for (const s of suppressed) findings.push(lintFinding(fn, subject, s, true));
    }
  }

  findings = applyRulesToFindings(resolved, findings);

  // Stamp direction (from the registry) and exposure on every finding.
  const publicRead = config.public?.read ?? [];
  const perfIgnore = config.perf?.ignore ?? [];
  for (const f of findings) {
    const meta = RULES_BY_CODE.get(f.code);
    if (meta && f.direction === undefined) f.direction = meta.direction;
    if (meta && f.dimension === undefined) f.dimension = dimensionOf(meta);
    if (exposure.known && f.schema) f.exposed = isExposed(f.schema, f.table);

    // A key that looks like a write-once provisioning pointer, where the
    // reviewer has chosen to read the finding rather than gate on it. Applied
    // here because severities are restamped from the rule registry above.
    if (
      onWriteOncePointer === 'demote' && f.code === 'X1'
      && (f.context as { pathAssessment?: string } | undefined)?.pathAssessment === 'write-once-shaped'
    ) {
      f.acknowledged = true;
      f.severity = 'info';
      f.message += ' — write-once-shaped (perf.paths.onWriteOncePointer)';
    }

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
    plane: planes[0].name,
    schemas: exposure.schemas,
    ...(exposure.roles ? { roles: exposure.roles } : {}),
    ...(exposure.anonRoles && exposure.anonRoles.length > 0
      ? { anonRoles: exposure.anonRoles }
      : {}),
    exposedTables,
    totalTables: snapshot.length,
    ...(apiReach && apiReach.unreachable.length > 0
      ? { unaddressable: apiReach.unreachable.filter((r) => exposedSchemas.has(r.schema)) }
      : {})
  };

  const securityFindings = findings.filter((f) => f.dimension !== 'perf');
  const perfFindings = findings.filter((f) => f.dimension === 'perf');

  const report: Report = {
    version: PKG_VERSION,
    generatedAt: new Date().toISOString(),
    provenance: {
      version: PKG_VERSION,
      fingerprint: configFingerprint(config, PKG_VERSION),
      sealed: options.sealed === true,
      ...(options.preset ? { preset: options.preset } : {})
    },
    summary: summarize(findings),
    findings,
    score: computeScore(securityFindings, config.scoring, {
      exposedTables,
      exposureKnown: exposure.known
    }),
    exposure: exposureReport
  };

  // Access planes. The primary plane's score is `report.score` — computed
  // above, against the exposure surface — so declaring planes can never move
  // the headline number; the secondaries answer what the headline cannot.
  const reaches = resolvePlaneReach(planes, snapshot, roleGraph, apiReach);
  stampPlanes(findings, reaches);
  if (reaches.length > 1) {
    report.planes = reaches.map((reach) => {
      if (reach.skipped) {
        return {
          ...scorePlane(reach, [], config.scoring, exposure.known),
          skipped: reach.skipped
        };
      }
      if (reach.plane.primary) {
        return {
          ...scorePlane(reach, securityFindings, config.scoring, exposure.known),
          exposedTables,
          score: report.score!,
          summary: summarize(securityFindings.filter((f) => f.exposed !== false))
        };
      }
      return scorePlane(reach, securityFindings, config.scoring, exposure.known);
    });
  }

  // Per-role exposure: computed for the configured untrusted roles (L5/R1
  // options), so the report answers "what can anonymous access?" directly
  // even when no finding fires.
  const untrustedRoles = [...new Set([
    ...(withExposedRoles(
      resolved.rules.get('L5')?.options as LatticeRoleOptions | undefined,
      exposure
    )?.roles ?? []),
    ...(withExposedRoles(
      resolved.rules.get('R1')?.options as RoleTrustOptions | undefined,
      exposure
    )?.roles ?? [])
  ])].sort();
  if (untrustedRoles.length > 0) {
    const roleAccess: RoleAccessReport = {
      roles: computeRoleAccess(snapshot, roleGraph, untrustedRoles)
    };
    report.roleAccess = roleAccess;
  }

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
      const all = [...paths.values()];
      const shaped = all.filter((p) => p.assessment === 'write-once-shaped');
      const declaredHidden = all.filter((p) =>
        p.signals.some((s) => s.name === 'behavior-hidden')
      ).length;
      perf.paths = {
        total: paths.size,
        read: all.filter((p) => p.assessment === 'read').length,
        writeOnceShaped: shaped.length,
        tables: new Set(shaped.map((p) => `${p.schema}.${p.table}`)).size,
        onWriteOncePointer,
        ...(declaredHidden > 0 ? { declaredHidden } : {})
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
    const functions = await getFunctions();
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

/**
 * Materializes `rolesFrom: 'exposure'` into concrete role names. An adapter
 * resolves the API-edge roles from the catalog (a Constructive API's
 * `anon_role`, PostgREST's `pgrst.db_anon_role`, the role a graphile
 * authenticator can `SET ROLE` to); those roles are exactly the untrusted
 * ones, and their names are per-deployment, so a preset names the *source*
 * instead of the roles. Explicit `roles` still apply — the two union.
 */
function withExposedRoles<T extends { roles?: string[]; rolesFrom?: 'exposure' | 'anon' }>(
  options: T | undefined,
  exposure: ResolvedExposure
): T | undefined {
  if (!options?.rolesFrom) return options;
  const resolved = options.rolesFrom === 'anon' ? exposure.anonRoles : exposure.roles;
  const roles = [...new Set([...(options.roles ?? []), ...(resolved ?? [])])].sort();
  return { ...options, roles };
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

    // --- Policy-aware perf rules (X2/X3/X4/X9) ---
    const cols: PredicateColumn[] = [];
    if (using) {
      cols.push(...collectPredicateColumns(using, 'USING', table.name));
      findings.push(...checkNonLeakproofPolicyFunctions(table, using, volatility, policy.name));
      findings.push(...checkUnhoistedPolicyFunctions(table, using, volatility, policy.name, 'USING'));
    }
    if (withCheck) {
      cols.push(...collectPredicateColumns(withCheck, 'WITH CHECK', table.name));
      findings.push(...checkNonLeakproofPolicyFunctions(table, withCheck, volatility, policy.name));
      findings.push(
        ...checkUnhoistedPolicyFunctions(table, withCheck, volatility, policy.name, 'WITH CHECK')
      );
    }
    if (cols.length > 0) predicateColumns.set(policy.name, cols);
  }

  if (indexes && predicateColumns.size > 0) {
    findings.push(...checkUnindexedPolicyColumns(table, indexes, predicateColumns));
    findings.push(...checkPolicyColumnCasts(table, indexes, predicateColumns));
  }

  return dedupe(findings);
}

/**
 * Relations named by any RLS policy predicate in the snapshot.
 *
 * Whole-word token matching over the predicate text, matching both the bare
 * and the schema-qualified name. Deliberately over-eager: a spurious match
 * costs one unreported L6, a missed one costs a recommendation to revoke a
 * grant that authorization depends on.
 */
function policyReferencedRelations(tables: TableSnapshot[]): Set<string> {
  const tokens = new Set<string>();
  for (const table of tables) {
    for (const policy of table.policies) {
      for (const clause of [policy.using, policy.withCheck]) {
        if (!clause) continue;
        for (const match of clause.matchAll(/[A-Za-z_][A-Za-z0-9_$]*(?:\.[A-Za-z_][A-Za-z0-9_$]*)?/g)) {
          tokens.add(match[0].toLowerCase());
        }
      }
    }
  }

  const referenced = new Set<string>();
  for (const table of tables) {
    const key = `${table.schema}.${table.name}`;
    if (tokens.has(key.toLowerCase()) || tokens.has(table.name.toLowerCase())) {
      referenced.add(key);
    }
  }
  return referenced;
}

/**
 * Map a source-level lint problem onto a `Finding`. The function's name rides
 * in the `table` slot so overrides, exposure and sorting key on it the same
 * way they do for table findings. Suppressed problems are emitted as
 * acknowledged findings — visible as accepted risk, off the score — carrying
 * their waiver reason and scope in `context`.
 */
function lintFinding(
  fn: FunctionSnapshot,
  subject: string,
  problem: LintProblem | SuppressedProblem,
  suppressed = false
): Finding {
  const meta = LINT_RULES_BY_ID.get(problem.ruleId)!;
  return {
    code: meta.code,
    severity: RULES_BY_CODE.get(meta.code)!.defaultSeverity,
    category: 'convention',
    schema: fn.schema,
    table: fn.name,
    message: `${problem.message} in ${subject}`,
    ...(problem.hint ? { hint: problem.hint } : {}),
    ...(suppressed ? { acknowledged: true } : {}),
    context: {
      ...problem.context,
      function: subject,
      line: problem.line,
      ...(suppressed
        ? {
          suppressed: true,
          reason: (problem as SuppressedProblem).reason,
          suppressionScope: (problem as SuppressedProblem).scope
        }
        : {})
    }
  };
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
