import {
  caseReportPath,
  createRunArtifacts,
  errorsReportPath,
  writeJsonArtifact,
} from './artifacts';
import { BenchmarkContextManager } from './context';
import { evaluateCaseGates } from './gates';
import { runLoad } from './load';
import { captureMemorySnapshot } from './memory';
import { buildPrivateProfiles } from './profiles';
import { probeProfiles, runPublicPreflight } from './preflight';
import { resetBenchmarkOwnedData, type ResetResult } from './reset';
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

const routeOrder: Record<string, number> = { private: 0, public: 1 };
const cacheOrder: Record<string, number> = { old: 0, new: 1 };

const safeCasePart = (value: string): string => value.replace(/[^a-zA-Z0-9-]+/g, '-').replace(/^-|-$/g, '');

const caseIdFor = (matrixCase: Omit<MatrixCase, 'caseId' | 'mutates'>): string =>
  [
    matrixCase.routingMode,
    matrixCase.cacheMode,
    matrixCase.scaleProfile.name,
    matrixCase.workloadProfile,
  ].map(safeCasePart).join('__');

export const expandMatrixCases = (config: PerfRunConfig): MatrixCase[] => {
  const cases: MatrixCase[] = [];
  const routingModes = [...config.routingModes].sort((a, b) => routeOrder[a] - routeOrder[b]);
  const cacheModes = [...config.cacheModes].sort((a, b) => cacheOrder[a] - cacheOrder[b]);

  for (const routingMode of routingModes) {
    for (const cacheMode of cacheModes) {
      const workloadProfile = config.workloadProfiles[routingMode];
      const base = {
        routingMode,
        cacheMode,
        scaleProfile: config.scaleProfile,
        workloadProfile,
      };
      cases.push({
        ...base,
        caseId: caseIdFor(base),
        mutates: routingMode === 'public' && /write|mutat/i.test(workloadProfile),
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
  errorSamples: [
    {
      at: new Date().toISOString(),
      operation: 'routeProbe',
      message,
    },
  ],
});

const writeErrorsIfAny = async (input: {
  artifacts: RunArtifactPaths;
  config: PerfRunConfig;
  caseId: string;
  routeProbe?: RouteProbeSummary;
  loadErrors?: unknown[];
  preflight?: PublicPreflightResult;
}): Promise<string | undefined> => {
  const errors = [
    ...(input.preflight?.errorSamples || []),
    ...(input.preflight?.routeProbe.errorSamples || []),
    ...(input.routeProbe?.errorSamples || []),
    ...(input.loadErrors || []),
  ].slice(0, input.config.errorSampleLimit);

  const path = errorsReportPath(input.artifacts, input.caseId);
  await writeJsonArtifact(path, {
    schemaVersion: PERF_SCHEMA_VERSION,
    runId: input.config.runId,
    caseId: input.caseId,
    writtenAt: new Date().toISOString(),
    errors,
  });
  return path;
};

const toCaseSummary = (report: CaseReport): CaseSummary => ({
  caseId: report.caseId,
  ok: report.ok,
  status: report.status,
  routingMode: report.matrix.routingMode,
  cacheMode: report.matrix.cacheMode,
  scaleProfile: report.matrix.scaleProfile.name,
  workloadProfile: report.matrix.workloadProfile,
  contextId: report.lifecycle.contextId,
  reportPath: report.artifacts.caseReportPath,
  hardGateFailures: report.gates.hardGateFailures,
  totalRequests: report.load?.totalRequests,
  qps: report.load?.qps,
});

const executeCase = async (input: {
  config: PerfRunConfig;
  matrixCase: MatrixCase;
  contextManager: BenchmarkContextManager;
  artifacts: RunArtifactPaths;
}): Promise<CaseReport> => {
  const { config, matrixCase, contextManager, artifacts } = input;
  const startedAt = new Date().toISOString();
  let context: BenchmarkContext | undefined;
  let requestProfiles: RequestProfile[] = [];
  let operationProfiles: RuntimeOperationProfile[] = [];
  let preflight: PublicPreflightResult | undefined;
  let routeProbe: RouteProbeSummary = emptyRouteProbe('case did not reach route probing');
  let resetBefore: ResetResult | undefined;
  let resetAfter: ResetResult | undefined;
  let memoryBefore;
  let memoryAfter;
  let load;
  let reportWritten = false;
  let caseReportFile = caseReportPath(artifacts, matrixCase.caseId);
  let errorsPath: string | undefined;
  let thrownFailure: string | undefined;
  const recordThrownFailure = (prefix: string, error: unknown): void => {
    const message = `${prefix}: ${error instanceof Error ? error.message : String(error)}`;
    thrownFailure = thrownFailure ? `${thrownFailure}; ${message}` : message;
  };

  try {
    context = await contextManager.acquire(matrixCase);
    resetBefore = await resetBenchmarkOwnedData({ context, matrixCase, config });

    if (matrixCase.routingMode === 'public') {
      preflight = await runPublicPreflight({ context, matrixCase, config, artifacts });
      requestProfiles = preflight.requestProfiles;
      operationProfiles = preflight.operationProfiles;
      if (!preflight.ok) {
        routeProbe = preflight.routeProbe;
      }
    } else {
      const privateProfiles = buildPrivateProfiles(matrixCase, config);
      requestProfiles = privateProfiles.requestProfiles;
      operationProfiles = privateProfiles.operationProfiles;
    }

    if (!preflight || preflight.ok) {
      memoryBefore = await captureMemorySnapshot({
        context,
        config,
        artifacts,
        caseId: matrixCase.caseId,
        phase: 'before',
      });
      routeProbe = await probeProfiles({ context, matrixCase, config, requestProfiles, operationProfiles });
      if (routeProbe.ok) {
        load = await runLoad({ context, matrixCase, config, requestProfiles, operationProfiles });
      }
      memoryAfter = await captureMemorySnapshot({
        context,
        config,
        artifacts,
        caseId: matrixCase.caseId,
        phase: 'after',
      });
    }
  } catch (error) {
    thrownFailure = error instanceof Error ? error.message : String(error);
    routeProbe = routeProbe.ok ? routeProbe : emptyRouteProbe(thrownFailure);
  } finally {
    if (context) {
      try {
        resetAfter = await resetBenchmarkOwnedData({ context, matrixCase, config });
      } catch (error) {
        recordThrownFailure('post-case benchmark-owned reset threw', error);
      }
      try {
        await contextManager.releaseCase(context);
      } catch (error) {
        recordThrownFailure('context release threw', error);
      }
    }
  }

  const gates = evaluateCaseGates({
    preflight,
    routeProbe,
    load,
    memoryBefore,
    memoryAfter,
    resetBefore,
    resetAfter,
    reportWritten: true,
    captureMemory: config.captureMemory,
  });
  if (thrownFailure) gates.hardGateFailures.unshift(`case threw before completion: ${thrownFailure}`);

  errorsPath = await writeErrorsIfAny({
    artifacts,
    config,
    caseId: matrixCase.caseId,
    routeProbe,
    loadErrors: load?.errorSamples,
    preflight,
  });

  const report: CaseReport = {
    schemaVersion: PERF_SCHEMA_VERSION,
    runId: config.runId,
    caseId: matrixCase.caseId,
    startedAt,
    finishedAt: new Date().toISOString(),
    ok: gates.hardGateFailures.length === 0,
    status: gates.hardGateFailures.length === 0 ? 'passed' : 'failed',
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
      compatibilityKey: context?.compatibilityKey || contextManager.compatibilityKeyFor(matrixCase),
      serverUrl: context?.serverUrl || 'unavailable',
    },
    preflight: preflight
      ? {
          ok: preflight.ok,
          artifactPath: preflight.artifactPath,
          provisionedTenantCount: preflight.provisionedTenantCount,
          publicHostCount: preflight.publicHostCount,
          requestProfileCount: preflight.requestProfileCount,
          operationProfileCount: preflight.operationProfileCount,
          hardGateFailures: preflight.hardGateFailures,
        }
      : undefined,
    routeProbe,
    load,
    memory: memoryBefore || memoryAfter || !config.captureMemory
      ? {
          beforePath: memoryBefore?.path,
          afterPath: memoryAfter?.path,
          beforeOk: memoryBefore?.ok ?? !config.captureMemory,
          afterOk: memoryAfter?.ok ?? !config.captureMemory,
          beforeStatus: memoryBefore?.status,
          afterStatus: memoryAfter?.status,
        }
      : undefined,
    gates,
    artifacts: {
      caseReportPath: caseReportFile,
      preflightPath: preflight?.artifactPath,
      memoryBeforePath: memoryBefore?.path,
      memoryAfterPath: memoryAfter?.path,
      errorsPath,
    },
  };

  await writeJsonArtifact(caseReportFile, report);
  reportWritten = true;
  void reportWritten;
  return report;
};

export const runPerfMatrix = async (config: PerfRunConfig): Promise<PerfRunSummary> => {
  const startedAt = new Date().toISOString();
  const artifacts = await createRunArtifacts(config);
  const cases = expandMatrixCases(config);
  const contextManager = new BenchmarkContextManager(config);
  const caseSummaries: CaseSummary[] = [];

  try {
    for (const matrixCase of cases) {
      const report = await executeCase({ config, matrixCase, contextManager, artifacts });
      caseSummaries.push(toCaseSummary(report));
    }
  } finally {
    await contextManager.teardownAll();
  }

  const passed = caseSummaries.filter((item) => item.status === 'passed').length;
  const failed = caseSummaries.filter((item) => item.status === 'failed').length;
  const skipped = caseSummaries.filter((item) => item.status === 'skipped').length;
  const summary: PerfRunSummary = {
    schemaVersion: PERF_SCHEMA_VERSION,
    runId: config.runId,
    runDir: artifacts.runDir,
    configGroup: config.configGroup,
    specPath: config.specPath,
    startedAt,
    finishedAt: new Date().toISOString(),
    pass: failed === 0,
    config,
    totals: {
      caseCount: caseSummaries.length,
      passed,
      failed,
      skipped,
    },
    cases: caseSummaries,
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
