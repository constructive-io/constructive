import {
  caseReportPath,
  createRunArtifactPaths,
  ensureRunDirs,
  errorsReportPath,
  writeJsonArtifact,
} from './artifacts';
import { BenchmarkContextManager } from './context';
import { collectHardGateFailures } from './gates';
import { runMeasuredLoad } from './load';
import { captureMemorySnapshot } from './memory';
import { buildPrivateProfiles } from './profiles';
import { probeProfiles, runPublicPreflight } from './preflight';
import type {
  BenchmarkContext,
  CaseReport,
  CaseSummary,
  MatrixCase,
  PerfRunConfig,
  PerfRunSummary,
  PublicPreflightResult,
  RequestProfile,
  RouteProbeSummary,
  RunArtifactPaths,
  RuntimeOperationProfile,
} from './types';
import { PERF_SCHEMA_VERSION } from './types';

const sanitizeCaseId = (value: string): string =>
  value.replace(/[^a-zA-Z0-9_-]+/g, '-').replace(/^-+|-+$/g, '').toLowerCase();

export const expandMatrix = (config: PerfRunConfig): MatrixCase[] => {
  const cases: MatrixCase[] = [];
  for (const routingMode of config.routingModes) {
    for (const cacheMode of config.cacheModes) {
      const workloadProfile = config.workloadProfiles[routingMode];
      const caseId = sanitizeCaseId(`${routingMode}-${cacheMode}-${config.scaleProfile.name}-${workloadProfile}`);
      cases.push({
        caseId,
        routingMode,
        cacheMode,
        scaleProfile: config.scaleProfile,
        workloadProfile,
        mutates: false,
      });
    }
  }
  return cases;
};

const emptyRouteProbe = (message: string): RouteProbeSummary => ({
  ok: false,
  attempted: 0,
  succeeded: 0,
  failed: 0,
  unexpectedGraphqlErrors: 0,
  errorSamples: [{ at: new Date().toISOString(), operation: 'routeProbe', message }],
});

const reportToSummary = (report: CaseReport): CaseSummary => ({
  caseId: report.caseId,
  status: report.status,
  ok: report.ok,
  routingMode: report.matrix.routingMode,
  cacheMode: report.matrix.cacheMode,
  workloadProfile: report.matrix.workloadProfile,
  contextId: report.lifecycle.contextId,
  totalRequests: report.load?.totalRequests,
  failedRequests: report.load?.failedRequests,
  unexpectedGraphqlErrors: report.load?.unexpectedGraphqlErrors,
  qps: report.load?.qps,
  hardGateFailures: report.gates.hardGateFailures,
  caseReportPath: report.artifacts.caseReportPath,
});

const countDistinctMetadata = (profiles: RequestProfile[], key: string): number =>
  new Set(
    profiles
      .map((profile) => profile.metadata[key])
      .filter((value): value is string => typeof value === 'string' && value.length > 0)
  ).size;

const writeErrorArtifact = async (input: {
  artifacts: RunArtifactPaths;
  matrixCase: MatrixCase;
  hardGateFailures: string[];
  routeProbe?: RouteProbeSummary;
  preflight?: PublicPreflightResult;
  load?: CaseReport['load'];
  caughtError?: unknown;
}): Promise<string> => {
  const targetPath = errorsReportPath(input.artifacts, input.matrixCase.caseId);
  await writeJsonArtifact(targetPath, {
    schemaVersion: PERF_SCHEMA_VERSION,
    caseId: input.matrixCase.caseId,
    writtenAt: new Date().toISOString(),
    hardGateFailures: input.hardGateFailures,
    routeProbeErrors: input.routeProbe?.errorSamples || [],
    preflightErrors: input.preflight?.errorSamples || [],
    loadErrors: input.load?.errorSamples || [],
    caughtError: input.caughtError
      ? {
          message: input.caughtError instanceof Error ? input.caughtError.message : String(input.caughtError),
          stack: input.caughtError instanceof Error ? input.caughtError.stack : undefined,
        }
      : undefined,
  });
  return targetPath;
};

const runCase = async (input: {
  manager: BenchmarkContextManager;
  config: PerfRunConfig;
  artifacts: RunArtifactPaths;
  matrixCase: MatrixCase;
}): Promise<CaseReport> => {
  const { manager, config, artifacts, matrixCase } = input;
  const startedAt = new Date().toISOString();
  const reportPath = caseReportPath(artifacts, matrixCase.caseId);
  let context: BenchmarkContext | undefined;
  let routeProbe: RouteProbeSummary = emptyRouteProbe('case did not reach route probe');
  let preflight: PublicPreflightResult | undefined;
  let requestProfiles: RequestProfile[] = [];
  let operationProfiles: RuntimeOperationProfile[] = [];
  let load: CaseReport['load'];
  let memory: CaseReport['memory'] = { beforeOk: false, afterOk: false };
  let caughtError: unknown;
  const setupFailures: string[] = [];

  try {
    context = await manager.acquire(matrixCase);

    if (matrixCase.routingMode === 'public') {
      preflight = await runPublicPreflight({ context, matrixCase, config, artifacts });
      requestProfiles = preflight.requestProfiles;
      operationProfiles = preflight.operationProfiles;
      routeProbe = preflight.routeProbe;
      setupFailures.push(...preflight.hardGateFailures);
    } else {
      const built = buildPrivateProfiles(matrixCase, config);
      requestProfiles = built.requestProfiles;
      operationProfiles = built.operationProfiles;
      routeProbe = await probeProfiles({ context, matrixCase, config, requestProfiles, operationProfiles });
    }

    const before = await captureMemorySnapshot({ context, config, artifacts, caseId: matrixCase.caseId, phase: 'before' });
    memory = { ...memory, beforePath: before.path, beforeOk: before.ok };

    const readyForLoad = setupFailures.length === 0 && routeProbe.ok && requestProfiles.length > 0 && operationProfiles.length > 0;
    if (readyForLoad) {
      const finalProbe = await probeProfiles({ context, matrixCase, config, requestProfiles, operationProfiles });
      routeProbe = finalProbe;
      if (finalProbe.ok) {
        load = await runMeasuredLoad({ context, matrixCase, config, requestProfiles, operationProfiles });
      }
    }

    const after = await captureMemorySnapshot({ context, config, artifacts, caseId: matrixCase.caseId, phase: 'after' });
    memory = { ...memory, afterPath: after.path, afterOk: after.ok };
  } catch (error) {
    caughtError = error;
    setupFailures.push(error instanceof Error ? error.message : String(error));
  }

  const hardGateFailures = collectHardGateFailures({
    setupFailures,
    routeProbe,
    load,
    memory,
    captureMemory: config.captureMemory,
  });

  const errorsPath = await writeErrorArtifact({
    artifacts,
    matrixCase,
    hardGateFailures,
    routeProbe,
    preflight,
    load,
    caughtError,
  });

  const ok = hardGateFailures.length === 0;
  const report: CaseReport = {
    schemaVersion: PERF_SCHEMA_VERSION,
    runId: config.runId,
    caseId: matrixCase.caseId,
    startedAt,
    finishedAt: new Date().toISOString(),
    ok,
    status: ok ? 'passed' : 'failed',
    matrix: {
      routingMode: matrixCase.routingMode,
      cacheMode: matrixCase.cacheMode,
      scaleProfile: matrixCase.scaleProfile,
      workloadProfile: matrixCase.workloadProfile,
    },
    lifecycle: {
      connectionPolicy: config.connectionPolicy,
      contextId: context?.id || 'unavailable',
      contextReused: context?.reused || false,
      compatibilityKey: context?.compatibilityKey || manager.compatibilityKeyFor(matrixCase),
      serverUrl: context?.serverUrl || '',
    },
    ...(preflight && {
      preflight: {
        ok: preflight.ok,
        artifactPath: preflight.artifactPath,
        provisionedTenantCount: preflight.provisionedTenantCount,
        publicHostCount: preflight.publicHostCount,
        requestProfileCount: preflight.requestProfileCount,
        operationProfileCount: preflight.operationProfileCount,
        hardGateFailures: preflight.hardGateFailures,
      },
    }),
    routeProbe,
    ...(load && { load }),
    memory,
    gates: {
      hardGateFailures,
      observations: {
        qps: load?.qps,
        latencyMs: load?.latencyMs,
        requestProfileCount: requestProfiles.length,
        operationProfileCount: operationProfiles.length,
        routeKeyCount: new Set(requestProfiles.map((profile) => profile.routeKey)).size,
        expectedBuildKeyGroupCount: countDistinctMetadata(requestProfiles, 'expectedBuildKeyGroup'),
        cacheKeyModes: [...new Set(requestProfiles.map((profile) => profile.metadata.cacheKeyMode).filter(Boolean))],
        cacheSizes: config.cacheSizes,
        effectiveCacheEnv: config.effectiveCacheEnv,
      },
    },
    artifacts: {
      caseReportPath: reportPath,
      preflightPath: preflight?.artifactPath,
      memoryBeforePath: memory.beforePath,
      memoryAfterPath: memory.afterPath,
      errorsPath,
    },
  };

  await writeJsonArtifact(reportPath, report);
  if (context) await manager.releaseCase(context);
  return report;
};

export const runPerfMatrix = async (config: PerfRunConfig): Promise<PerfRunSummary> => {
  const startedAt = new Date().toISOString();
  const artifacts = createRunArtifactPaths(config.runDir);
  await ensureRunDirs(artifacts);
  const manager = new BenchmarkContextManager(config);
  const cases = expandMatrix(config);
  const caseReports: CaseReport[] = [];

  try {
    for (const matrixCase of cases) {
      caseReports.push(await runCase({ manager, config, artifacts, matrixCase }));
    }
  } finally {
    await manager.teardownAll();
  }

  const summaries = caseReports.map(reportToSummary);
  const passed = summaries.filter((summary) => summary.status === 'passed').length;
  const failed = summaries.filter((summary) => summary.status === 'failed').length;
  const skipped = summaries.filter((summary) => summary.status === 'skipped').length;
  const summary: PerfRunSummary = {
    schemaVersion: PERF_SCHEMA_VERSION,
    runId: config.runId,
    runDir: artifacts.runDir,
    configGroup: config.configGroup,
    configPath: config.configPath,
    startedAt,
    finishedAt: new Date().toISOString(),
    pass: failed === 0 && skipped === 0,
    config,
    totals: {
      caseCount: cases.length,
      passed,
      failed,
      skipped,
    },
    cases: summaries,
    artifacts: {
      summaryPath: artifacts.summaryPath,
      casesDir: artifacts.casesDir,
      preflightDir: artifacts.preflightDir,
      memoryDir: artifacts.memoryDir,
      errorsDir: artifacts.errorsDir,
    },
  };

  await writeJsonArtifact(artifacts.summaryPath, summary);
  return summary;
};
