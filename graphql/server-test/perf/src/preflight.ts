import { preflightReportPath, writeJsonArtifact } from './artifacts';
import { provisionDbpmPublic } from './dbpm-provision';
import { compatibleOperationsFor, executeOperation } from './operations';
import { buildPublicProfilesFromProvision } from './profiles';
import { preparePublicBusinessWorkload } from './setup';
import type {
  BenchmarkContext,
  MatrixCase,
  PerfRunConfig,
  PreflightReport,
  PublicPreflightResult,
  RedactedErrorSample,
  RequestProfile,
  RouteProbeSummary,
  RunArtifactPaths,
  RuntimeOperationProfile,
} from './types';
import { PERF_SCHEMA_VERSION } from './types';

export const probeProfiles = async (input: {
  context: BenchmarkContext;
  matrixCase: MatrixCase;
  config: PerfRunConfig;
  requestProfiles: RequestProfile[];
  operationProfiles: RuntimeOperationProfile[];
}): Promise<RouteProbeSummary> => {
  const { context, matrixCase, config, operationProfiles } = input;
  const sampleSize = config.routeProbeSampleSize;
  const profiles = sampleSize === 0
    ? input.requestProfiles
    : input.requestProfiles.slice(0, Math.max(1, sampleSize));

  const errors: RedactedErrorSample[] = [];
  let succeeded = 0;
  let unexpectedGraphqlErrors = 0;

  for (const [index, requestProfile] of profiles.entries()) {
    const compatible = compatibleOperationsFor(requestProfile, operationProfiles);
    const operation =
      compatible.find((candidate) => !candidate.mutates && !candidate.requiresExistingRow) ||
      compatible.find((candidate) => !candidate.mutates) ||
      compatible[0];
    if (!operation) {
      errors.push({
        at: new Date().toISOString(),
        operation: 'routeProbe.selectOperation',
        requestProfileId: requestProfile.id,
        message: `No compatible operation for request profile ${requestProfile.id}`,
      });
      continue;
    }
    const outcome = await executeOperation({
      context,
      requestProfile,
      operation,
      sequence: index,
      config,
      matrixCase,
    });
    unexpectedGraphqlErrors += outcome.unexpectedGraphqlErrors;
    if (outcome.ok) succeeded += 1;
    else if (outcome.error && errors.length < config.errorSampleLimit) errors.push(outcome.error);
  }

  const attempted = profiles.length;
  const failed = attempted - succeeded;
  return {
    ok: attempted > 0 && failed === 0 && unexpectedGraphqlErrors === 0,
    attempted,
    succeeded,
    failed,
    unexpectedGraphqlErrors,
    errorSamples: errors,
  };
};

export const runPublicPreflight = async (input: {
  context: BenchmarkContext;
  matrixCase: MatrixCase;
  config: PerfRunConfig;
  artifacts: RunArtifactPaths;
}): Promise<PublicPreflightResult> => {
  const { context, matrixCase, config, artifacts } = input;
  const startedAt = new Date().toISOString();
  const artifactPath = preflightReportPath(artifacts, matrixCase.caseId);
  const hardGateFailures: string[] = [];

  const provision = await provisionDbpmPublic({ context, matrixCase, config });
  const generated = buildPublicProfilesFromProvision(provision, matrixCase);
  const setup = await preparePublicBusinessWorkload({
    context,
    matrixCase,
    config,
    requestProfiles: generated.requestProfiles,
  });
  const requestProfiles = setup.requestProfiles;
  const operationProfiles = generated.operationProfiles;

  const routeProbe = await probeProfiles({
    context,
    matrixCase,
    config,
    requestProfiles,
    operationProfiles,
  });

  if (!provision.completed || !provision.ok) hardGateFailures.push('DBPM provision did not complete without unexpected errors');
  if (
    requestProfiles.length < matrixCase.scaleProfile.k &&
    !config.publicPreflight.allowUnderProvisioned
  ) {
    hardGateFailures.push(
      `provisioned public profile count ${requestProfiles.length} is below k=${matrixCase.scaleProfile.k}`
    );
  }
  if (
    provision.businessTableCount < matrixCase.scaleProfile.k &&
    !config.publicPreflight.allowUnderProvisioned
  ) {
    hardGateFailures.push(
      `provisioned business table count ${provision.businessTableCount} is below k=${matrixCase.scaleProfile.k}`
    );
  }
  if (requestProfiles.length === 0) hardGateFailures.push('request profiles are empty');
  if (operationProfiles.length === 0) hardGateFailures.push('operation profiles are empty');
  if (setup.touchedNonBenchmarkObjects) hardGateFailures.push('access/setup touched non-benchmark objects');
  if (!setup.ok) hardGateFailures.push('business workload preparation failed');
  if (!routeProbe.ok) hardGateFailures.push('route probes failed');
  if (routeProbe.unexpectedGraphqlErrors !== 0) hardGateFailures.push('route probes returned unexpected GraphQL errors');

  const report: PreflightReport = {
    schemaVersion: PERF_SCHEMA_VERSION,
    runId: config.runId,
    caseId: matrixCase.caseId,
    startedAt,
    finishedAt: new Date().toISOString(),
    ok: hardGateFailures.length === 0,
    configSnapshot: {
      routingMode: matrixCase.routingMode,
      cacheMode: matrixCase.cacheMode,
      scaleProfile: matrixCase.scaleProfile,
      workloadProfile: matrixCase.workloadProfile,
      publicPreflight: config.publicPreflight,
      serverUrl: context.serverUrl,
      contextId: context.id,
      provisionWarnings: provision.warnings,
      benchmarkOwnedPrefix: config.benchmarkOwnedPrefix,
      cacheSizes: config.cacheSizes,
      effectiveCacheEnv: config.effectiveCacheEnv,
    },
    provision: {
      ok: provision.ok,
      tenantCount: provision.tenantCount,
      publicHostCount: provision.publicHostCount,
      apiCount: provision.apiCount,
      businessTableCount: provision.businessTableCount,
      errors: [...provision.errors, ...setup.errors],
      source: provision.source,
      warnings: provision.warnings,
    },
    profiles: {
      requestProfileCount: requestProfiles.length,
      operationProfileCount: operationProfiles.length,
      routeKeyCount: new Set(requestProfiles.map((profile) => profile.routeKey)).size,
    },
    routeProbe,
    hardGateFailures,
  };

  try {
    await writeJsonArtifact(artifactPath, report);
  } catch (error) {
    hardGateFailures.push(`preflight artifact write failed: ${error instanceof Error ? error.message : String(error)}`);
  }

  return {
    ok: hardGateFailures.length === 0,
    routingMode: 'public',
    scaleProfile: matrixCase.scaleProfile.name,
    workloadProfile: matrixCase.workloadProfile,
    k: matrixCase.scaleProfile.k,
    provisionedTenantCount: provision.tenantCount,
    publicHostCount: provision.publicHostCount,
    requestProfileCount: requestProfiles.length,
    operationProfileCount: operationProfiles.length,
    routeProbe,
    requestProfiles,
    operationProfiles,
    artifactPath,
    hardGateFailures,
    errorSamples: [...provision.errors, ...setup.errors, ...routeProbe.errorSamples],
  };
};
