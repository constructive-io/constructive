import { execFileSync, spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { performance } from 'node:perf_hooks';
import { getHeapStatistics } from 'node:v8';

import { execute, grafast } from 'grafast';
import { withPgClientFromPgService } from 'graphile-build-pg';
import {
  createGraphileInstance,
  type GraphileCacheEntry
} from 'graphile-cache';
import {
  ConstructivePreset,
  createGrafastCacheLimitsPreset,
  makePgService
} from 'graphile-settings';
import {
  type ExecutionResult,
  lexicographicSortSchema,
  parse,
  printSchema} from 'graphql';
import { Pool } from 'pg';
import { getPgEnvOptions } from 'pg-env';

import {
  nodeFlagsForV8Profile,
  replaceMaxOldSpaceSize,
  tokenizeNodeOptions
} from './process';
import type { IntrospectionMode, NodeV8Profile } from './types';

const BUILD_TRANSIENT_SAMPLE_INTERVAL_MS = 5;
const BACKEND_MEMORY_SAMPLE_INTERVAL_MS = 10;
const BACKEND_MEMORY_MAX_CONCLUSIVE_GAP_MS = 50;
const BACKEND_MEMORY_SAMPLER_START_TIMEOUT_MS = 5_000;
const BACKEND_MEMORY_SAMPLER_STOP_TIMEOUT_MS = 5_000;
const BACKEND_MEMORY_SAMPLER_TERM_TIMEOUT_MS = 1_000;
const BACKEND_MEMORY_SAMPLER_KILL_TIMEOUT_MS = 1_000;
const BACKEND_START_IDENTITY_TOLERANCE_MS = 1_500;
const BACKEND_RETIREMENT_POLL_INTERVAL_MS = 10;
const BACKEND_RETIREMENT_TIMEOUT_MS = 5_000;
const GIB = 1024 ** 3;
const MIB_PER_GIB = 1024;
const LINUX_CGROUP_V2_DENSITY_AUTHORITY = 'linux-cgroup-v2-memory.current';
const DESTROYED_BACKEND_LOWER_BOUND_LIMITATION =
  'Without a PostgreSQL pre-destroy acknowledgement, sampling may stop before the '
  + 'backend records its terminal VmHWM; every sampled peak is therefore a diagnostic '
  + 'lower bound, even when cadence and process identity are conclusive.';
const DOCKER_DESKTOP_BACKEND_SAMPLER_LIMITATION =
  'Docker Desktop transports procfs samples across a Linux VM boundary. The backend '
  + 'trace remains diagnostic, and service-density authority must come from a '
  + 'separately validated Linux cgroup-v2 memory.current measurement.';
const BACKEND_MEMORY_SAMPLER_SCRIPT = String.raw`set -eu
status_file=$1
stat_file=$2
proc_stat_file=$3
expected_pid=$4
expected_backend_start_epoch_ms=$5
start_tolerance_ms=$6
interval_seconds=$7

if [ -x /usr/bin/awk ]; then
  awk_command=/usr/bin/awk
elif [ -x /bin/awk ]; then
  awk_command=/bin/awk
else
  printf 'catalog backend sampler requires /usr/bin/awk or /bin/awk\n' >&2
  exit 43
fi
if [ -x /usr/bin/sleep ]; then
  sleep_command=/usr/bin/sleep
elif [ -x /bin/sleep ]; then
  sleep_command=/bin/sleep
else
  printf 'catalog backend sampler requires /usr/bin/sleep or /bin/sleep\n' >&2
  exit 43
fi
if [ -x /usr/bin/getconf ]; then
  getconf_command=/usr/bin/getconf
elif [ -x /bin/getconf ]; then
  getconf_command=/bin/getconf
else
  printf 'catalog backend sampler requires /usr/bin/getconf or /bin/getconf\n' >&2
  exit 43
fi

clock_ticks=$($getconf_command CLK_TCK)
case "$clock_ticks" in
  ''|*[!0-9]*) printf 'invalid CLK_TCK value\n' >&2; exit 43 ;;
esac

if [ ! -r "$stat_file" ] || [ ! -r "$proc_stat_file" ]; then
  printf 'PostgreSQL backend procfs identity files are unavailable\n' >&2
  exit 42
fi
initial_identity=$($awk_command -v stat_file="$stat_file" -v proc_stat_file="$proc_stat_file" '
  FILENAME == stat_file {
    line=$0
    sub(/^.*\) /, "", line)
    count=split(line, fields, / +/)
    if (count >= 20) start_ticks=fields[20]
  }
  FILENAME == proc_stat_file && $1 == "btime" { boot_time=$2 }
  END {
    if (start_ticks !~ /^[0-9]+$/ || boot_time !~ /^[0-9]+$/) exit 42
    printf "%s %s\n", start_ticks, boot_time
  }
' "$stat_file" "$proc_stat_file")
set -- $initial_identity
expected_start_ticks=$1
expected_boot_time_epoch_seconds=$2

sampler_pid=
cleanup_sampler() {
  trap - EXIT
  if [ -n "$sampler_pid" ]; then
    kill "$sampler_pid" 2>/dev/null || true
    wait "$sampler_pid" 2>/dev/null || true
    sampler_pid=
  fi
}
trap cleanup_sampler EXIT
trap 'exit 143' HUP INT TERM

report_gone() {
  IFS=' ' read -r uptime_seconds _ < /proc/uptime || uptime_seconds=0
  printf 'gone\t%s\n' "$uptime_seconds"
}

sample_backend() {
  if [ ! -r "$status_file" ] || [ ! -r "$stat_file" ]; then
    report_gone
    return 1
  fi
  IFS=' ' read -r uptime_seconds _ < /proc/uptime
  set +e
  $awk_command \
    -v uptime_seconds="$uptime_seconds" \
    -v expected_pid="$expected_pid" \
    -v expected_start_ticks="$expected_start_ticks" \
    -v expected_boot_time="$expected_boot_time_epoch_seconds" \
    -v expected_backend_start_epoch_ms="$expected_backend_start_epoch_ms" \
    -v start_tolerance_ms="$start_tolerance_ms" \
    -v clock_ticks="$clock_ticks" \
    -v status_file="$status_file" \
    -v stat_file="$stat_file" \
    -v proc_stat_file="$proc_stat_file" '
    FILENAME == status_file && /^Name:/ { process_name=$2 }
    FILENAME == status_file && /^NSpid:/ { namespace_pid=$NF }
    FILENAME == status_file && /^VmRSS:/ { rss=$2 }
    FILENAME == status_file && /^VmHWM:/ { hwm=$2 }
    FILENAME == stat_file {
      line=$0
      sub(/^.*\) /, "", line)
      count=split(line, fields, / +/)
      if (count >= 20) start_ticks=fields[20]
    }
    FILENAME == proc_stat_file && $1 == "btime" { boot_time=$2 }
    END {
      proc_start_epoch_ms=(boot_time + (start_ticks / clock_ticks)) * 1000
      start_delta_ms=proc_start_epoch_ms - expected_backend_start_epoch_ms
      if (start_delta_ms < 0) start_delta_ms=-start_delta_ms
      if (
        process_name !~ /^postgres/
        || namespace_pid != expected_pid
        || rss !~ /^[0-9]+$/
        || hwm !~ /^[0-9]+$/
        || start_ticks !~ /^[0-9]+$/
        || start_ticks != expected_start_ticks
        || boot_time != expected_boot_time
        || clock_ticks !~ /^[0-9]+$/
        || start_delta_ms > start_tolerance_ms
      ) exit 42
      printf "sample\t%s\t%s\t%s\t%s\t%.0f\t%s\t%s\n", \
        uptime_seconds, rss, hwm, start_ticks, proc_start_epoch_ms, \
        boot_time, clock_ticks
    }
  ' "$status_file" "$stat_file" "$proc_stat_file"
  sample_status=$?
  set -e
  if [ "$sample_status" -ne 0 ]; then
    if [ ! -r "$status_file" ] || [ ! -r "$stat_file" ]; then
      report_gone
      return 1
    fi
    printf 'immutable PostgreSQL backend procfs identity validation failed\n' >&2
    exit 42
  fi
}

sample_backend
(
  while "$sleep_command" "$interval_seconds"; do
    sample_backend || break
  done
) &
sampler_pid=$!
IFS= read -r _ || true
kill "$sampler_pid" 2>/dev/null || true
set +e
wait "$sampler_pid" 2>/dev/null
sampler_status=$?
set -e
sampler_pid=
if [ "$sampler_status" -ne 0 ] && [ "$sampler_status" -ne 143 ]; then
  exit "$sampler_status"
fi
set +e
sample_backend
final_sample_status=$?
set -e
if [ "$final_sample_status" -ne 0 ] && [ "$final_sample_status" -ne 1 ]; then
  exit "$final_sample_status"
fi
`;

export type CatalogScopedCatalogTypes = 'all' | 'dependency-closure';
export type CatalogIntrospectionClientReleaseMode = 'reuse' | 'destroy';
export type CatalogBackendSamplerMode = 'off' | 'diagnostic-lower-bound';

export interface CatalogBenchConfig {
  version: 1;
  database: string;
  mode: IntrospectionMode;
  scopedCatalogTypes: CatalogScopedCatalogTypes | null;
  introspectionClientReleaseMode: CatalogIntrospectionClientReleaseMode;
  postgresBackendSamplerMode: CatalogBackendSamplerMode;
  releaseBuildStateAfterValidation: boolean;
  schemas: string[];
  /** Ordered exposed schemas per instance; omitted for the legacy one-schema path. */
  schemaSets?: string[][];
  /** Explicit scoped-introspection dependency allowlist for schemaSets mode. */
  allowedDependencySchemas?: string[];
  checkpoints: number[];
  expectedTokens: string[] | null;
  heapMiB: number;
  repetition: number;
  settleMs: number;
  warmOperationsPerInstance: number;
  warmOperationReplayPasses: number;
  grafastCacheLimits: CatalogGrafastCacheLimits;
  postgresContainer: string | null;
  commit: string | null;
  worktreeDirty: boolean | null;
  sourceStateSha256: string | null;
  lockfileSha256: string | null;
  executedEntrySha256: string;
  v8Profile: NodeV8Profile;
  nodeOptions: string;
  nodeOptionsArgv: string[];
  nodeExecArgv: string[];
  effectiveNodeRuntimeFlags: string[];
}

export interface CatalogGrafastCacheLimits {
  queryCacheMaxLength: number | null;
  operationsCacheMaxLength: number | null;
  operationOperationPlansCacheMaxLength: number | null;
}

export interface CatalogMemorySnapshot {
  instances: number;
  heapUsedBytes: number;
  heapDeltaBytes: number;
  rssBytes: number;
  rssDeltaBytes: number;
  externalBytes: number;
  externalDeltaBytes: number;
  processPeakRssBytes: number;
  processPeakRssDeltaBytes: number;
  postgresBackendRssBytes: number | null;
  postgresBackendRssDeltaBytes: number | null;
  postgresBackendHighWaterBytes: number | null;
  postgresBackendHighWaterDeltaBytes: number | null;
}

export interface CatalogBenchProgress {
  version: 1;
  status: 'in-progress' | 'complete';
  mode: IntrospectionMode;
  scopedCatalogTypes: CatalogScopedCatalogTypes | null;
  introspectionClientReleaseMode: CatalogIntrospectionClientReleaseMode;
  postgresBackendSamplerMode: CatalogBackendSamplerMode;
  releaseBuildStateAfterValidation: boolean;
  repetition: number;
  heapMiB: number;
  v8Profile: NodeV8Profile;
  nodeOptions: string;
  nodeOptionsArgv: string[];
  nodeExecArgv: string[];
  effectiveNodeRuntimeFlags: string[];
  targetInstances: number;
  completedInstances: number;
  configuredCheckpoints: number[];
  completedCheckpoints: number[];
  buildsCompleted: number;
  canariesCompleted: number;
  mismatchViolations: number;
  crossTenantViolations: number;
  lastSnapshot: CatalogMemorySnapshot;
  updatedAt: string;
}

export interface CatalogTenantProxyDensityPoint {
  residentSurfaceInstances: number;
  fullTenantProxyGroups: number;
  remainderSurfaceInstances: number;
  configuredOldSpaceMiB: number;
  absolutePeakProcessRssBytes: number;
  groupsPerConfiguredOldSpaceGiB: number;
  groupsPerAbsolutePeakProcessRssGiB: number;
}

export interface CatalogBackendPidTransition {
  introspectionBackendPid: number;
  introspectionBackendStartEpochMs: number;
  steadyBackendPid: number;
  steadyBackendStartEpochMs: number;
  introspectionBackendRetired: boolean;
}

export interface CatalogBuildSample extends CatalogBackendPidTransition {
  instance: number;
  schema: string;
  buildMs: number;
  queryMs: number;
  token: string | null;
  sdlBytes: number;
  sdlSha256: string;
  queryFields: string[];
  warmOperations: number;
  warmOperationLatencyP50Ms: number | null;
  warmOperationLatencyP99Ms: number | null;
  warmOperationErrors: number;
  warmOperationReturnedStrings: number;
  warmOperationExactMatches: number;
  warmOperationMismatchViolations: number;
  warmOperationCrossTenantViolations: number;
  warmOperationCorrectnessConclusive: boolean;
  warmOperationCorrectnessPassed: boolean;
  warmOperationReplayPasses: number;
  warmOperationReplayExecutions: number;
  warmOperationReplayLatencyP50Ms: number | null;
  warmOperationReplayLatencyP99Ms: number | null;
  warmOperationReplayErrors: number;
  warmOperationReplayReturnedStrings: number;
  warmOperationReplayExactMatches: number;
  warmOperationReplayMismatchViolations: number;
  warmOperationReplayCrossTenantViolations: number;
  warmOperationReplayCorrectnessConclusive: boolean;
  warmOperationReplayCorrectnessPassed: boolean;
  buildBaselineHeapUsedBytes: number;
  buildBaselineRssBytes: number;
  sampledBuildPeakHeapUsedBytes: number;
  sampledBuildPeakHeapDeltaBytes: number;
  sampledBuildPeakRssBytes: number;
  sampledBuildPeakRssDeltaBytes: number;
  processBuildPeakRssBytes: number;
  processBuildPeakRssDeltaBytes: number;
  buildTransientSampleCount: number;
  postgresIntrospectionBackendMemoryLowerBound:
    CatalogBackendIntrospectionMemoryLowerBoundMeasurement | null;
}

export interface CatalogCanarySample {
  phase: 'initial' | 'checkpoint';
  residentInstances: number;
  instance: number;
  schema: string;
  expected: string;
  actual: string | null;
  returnedString: boolean;
  exactMatch: boolean;
  matchedOtherTenant: boolean;
}

export interface CatalogBenchResult {
  version: 1;
  status: 'performance-only';
  database: string;
  mode: IntrospectionMode;
  scopedCatalogTypes: CatalogScopedCatalogTypes | null;
  introspectionClientReleaseMode: CatalogIntrospectionClientReleaseMode;
  postgresBackendSamplerMode: CatalogBackendSamplerMode;
  releaseBuildStateAfterValidation: boolean;
  /** Present only for the explicit multi-schema surface mode. */
  schemaSets?: string[][];
  /** Present only for the explicit multi-schema surface mode. */
  allowedDependencySchemas?: string[];
  repetition: number;
  heapMiB: number;
  commit: string | null;
  worktreeDirty: boolean | null;
  sourceStateSha256: string | null;
  lockfileSha256: string | null;
  executedEntrySha256: string;
  v8Profile: NodeV8Profile;
  nodeOptions: string;
  nodeOptionsArgv: string[];
  nodeExecArgv: string[];
  effectiveNodeRuntimeFlags: string[];
  node: string;
  v8: string;
  effectiveV8HeapLimitBytes: number;
  platform: string;
  architecture: string;
  startedAt: string;
  endedAt: string;
  catalog: {
    classes: number;
    attributes: number;
    procs: number;
    types: number;
    namespaces: number;
  };
  runtimeRole: {
    name: string;
    superuser: boolean;
    bypassRls: boolean;
    createRole: boolean;
    ownsDatabase: boolean;
    canCreateInDatabase: boolean;
    ownsRequestedSchema: boolean;
    canCreateInRequestedSchema: boolean;
  };
  catalogWarmth: 'shared-server-not-reset';
  grafastCacheWarmth: {
    operationsPerInstance: number;
    cacheLimits: CatalogGrafastCacheLimits;
    sourceMode: 'grafast-source';
    sourceSetSha256: string | null;
    operationExecutions: number;
    latencyP50Ms: number | null;
    latencyP99Ms: number | null;
    errors: number;
    returnedStrings: number;
    exactMatches: number;
    mismatchViolations: number;
    crossTenantViolations: number;
    correctnessConclusive: boolean;
    correctnessPassed: boolean;
    replay: {
      passesPerInstance: number;
      operationExecutions: number;
      latencyP50Ms: number | null;
      latencyP99Ms: number | null;
      errors: number;
      returnedStrings: number;
      exactMatches: number;
      mismatchViolations: number;
      crossTenantViolations: number;
      correctnessConclusive: boolean;
      correctnessPassed: boolean;
    };
  };
  buildTransientSampling: {
    approximate: true;
    intervalMs: number;
    limitation: string;
    maxSampledHeapDeltaBytes: number;
    maxSampledRssDeltaBytes: number;
    maxProcessPeakRssDeltaBytes: number;
  };
  postgresBackendMeasurement: {
    initialBackendPid: number;
    initialBackendStartEpochMs: number;
    finalSteadyBackendPid: number;
    finalSteadyBackendStartEpochMs: number;
    expectedRetirementChecks: number;
    completedRetirementChecks: number;
    allExpectedRetirementsProven: boolean;
    steadyBackendRss: {
      measured: boolean;
      samplePhase: 'shared-introspection-and-steady' | 'post-introspection-replacement';
      deltaBasis: 'initial-backend' | 'replacement-acquisition';
    };
    introspectionBackendMemory: {
      sampledLowerBoundMeasured: boolean;
      sharedSnapshotMeasured: boolean;
      semantics:
        | 'diagnostic-lower-bound-without-pre-destroy-acknowledgement'
        | 'post-build-shared-backend-snapshot'
        | 'unavailable';
      measurementMethod:
        | 'dedicated-identity-bound-procfs-sampler'
        | 'post-build-shared-backend-procfs'
        | 'unavailable';
      expectedBuildMeasurements: number;
      completedBuildMeasurements: number;
      allBuildCadenceChecksConclusive: boolean;
      backendSamplerAuthority: 'diagnostic-only';
      serviceDensityMemoryAuthority:
        `separately-validated-${typeof LINUX_CGROUP_V2_DENSITY_AUTHORITY}`;
      limitation: string | null;
    };
  };
  fixtureFingerprint: string;
  builds: CatalogBuildSample[];
  canaries: CatalogCanarySample[];
  snapshots: CatalogMemorySnapshot[];
  heapSlopeBytesPerInstance: number;
  rssSlopeBytesPerInstance: number;
  allSdlHashesEqualWithinArm: boolean;
  tokenCanariesConclusive: boolean;
  tokenCanariesPassed: boolean;
  tokenMismatchViolations: number;
  crossTenantTokenViolations: number;
  bleedViolations: number;
}

export interface CatalogWarmthCliOptions {
  warmOperationsPerInstance: number;
  warmOperationReplayPasses: number;
  grafastCacheLimits: CatalogGrafastCacheLimits;
}

export interface CatalogSchemaLayout {
  /** Compatibility labels: one primary schema name per resident instance. */
  schemas: string[];
  /** Null preserves the legacy one-schema-per-instance configuration shape. */
  schemaSets: string[][] | null;
  /** Null preserves legacy makePgService behavior. */
  allowedDependencySchemas: string[] | null;
}

export interface CatalogWarmOperationResult {
  latenciesMs: number[];
  errors: number;
  returnedStrings: number;
  exactMatches: number;
  mismatchViolations: number;
  crossTenantViolations: number;
  correctnessConclusive: boolean;
  correctnessPassed: boolean;
}

export interface BuildTransientSample {
  baselineHeapUsedBytes: number;
  baselineRssBytes: number;
  sampledPeakHeapUsedBytes: number;
  sampledPeakHeapDeltaBytes: number;
  sampledPeakRssBytes: number;
  sampledPeakRssDeltaBytes: number;
  processPeakRssBytes: number;
  processPeakRssDeltaBytes: number;
  sampleCount: number;
}

export interface CatalogBackendMemoryPoint {
  monotonicMs: number;
  rssBytes: number;
  highWaterBytes: number;
  procStartTicks: number;
  procStartEpochMs: number;
  bootTimeEpochSeconds: number;
  clockTicksPerSecond: number;
}

interface BackendMemory {
  rssBytes: number;
  highWaterBytes: number;
}

export type CatalogBackendMemorySamplerSource =
  | 'linux-host-container-procfs'
  | 'docker-container-procfs-diagnostic'
  | 'local-linux-procfs';

export interface CatalogBackendIdentity {
  pid: number;
  backendStartEpochMs: number;
}

export interface CatalogDockerContainerIdentity {
  requestedName: string;
  immutableId: string;
  startedAt: string;
  initHostPid: number;
}

export interface CatalogBackendIntrospectionMemoryLowerBoundMeasurement {
  backendPid: number;
  backendStartEpochMs: number;
  baselineRssBytes: number;
  baselineHighWaterBytes: number;
  sampledPeakRssLowerBoundBytes: number;
  sampledHighWaterLowerBoundBytes: number;
  sampledPeakRssDeltaLowerBoundBytes: number;
  sampledHighWaterDeltaLowerBoundBytes: number;
  sampleCount: number;
  targetExitedBeforeStop: boolean;
  targetExitedAtMonotonicMs: number | null;
  timing: {
    configuredIntervalMs: number;
    maximumConclusiveGapMs: number;
    firstSampleMonotonicMs: number;
    lastSampleMonotonicMs: number;
    maximumObservedGapMs: number | null;
    samplerStartedAt: string;
    samplerReadyAt: string;
    buildStartedAt: string;
    buildCompletedAt: string;
    samplerStoppedAt: string;
    buildDurationMs: number;
    samplerDurationMs: number;
    coveredBuildWindow: boolean;
    cadenceConclusive: boolean;
    samplerLaunchToReadyMs: number;
    samplerStopRequestToCloseMs: number;
  };
  observerEffect: {
    samplerProcessCount: 1;
    correctionApplied: false;
    pairedComparisonSupported: true;
    pairedComparisonFlag: '--postgres-backend-sampler';
    measuredLaunchToReadyMs: number;
    measuredStopRequestToCloseMs: number;
    limitation: string;
  };
  provenance: {
    samplerProcess: 'dedicated-external-procfs-loop';
    samplerPid: number;
    source: CatalogBackendMemorySamplerSource;
    postgresContainer: string | null;
    containerIdentity: CatalogDockerContainerIdentity | null;
    clientPlatform: string;
    clientArchitecture: string;
    backendIdentity: {
      sqlBackendStartEpochMs: number;
      procStartTicks: number;
      procStartEpochMs: number;
      bootTimeEpochSeconds: number;
      clockTicksPerSecond: number;
      toleranceMs: number;
    };
    dockerInitialExecEnvironment:
      | 'not-applicable'
      | 'may-inherit-container-config-before-env-i';
    samplerShellEnvironment: 'env-i-path-only';
    hostEnvironmentVariableNames: string[];
    semantics: 'diagnostic-lower-bound-without-pre-destroy-acknowledgement';
    backendSamplerAuthority: 'diagnostic-only';
    serviceDensityMemoryAuthority:
      `separately-validated-${typeof LINUX_CGROUP_V2_DENSITY_AUTHORITY}`;
    limitation: string | null;
  };
}

export interface CatalogBackendMemorySamplerHandle {
  stop(input: {
    buildStartedAt: string;
    buildCompletedAt: string;
    buildDurationMs: number;
  }): Promise<CatalogBackendIntrospectionMemoryLowerBoundMeasurement>;
}

export interface CatalogBackendPidLifecycleDependencies {
  waitForRetirement(identity: CatalogBackendIdentity): Promise<void>;
  acquireBackendIdentity(): Promise<CatalogBackendIdentity>;
}

const flag = (args: string[], name: string): string | undefined => {
  const index = args.indexOf(`--${name}`);
  return index >= 0 ? args[index + 1] : undefined;
};

const requireFlag = (args: string[], name: string): string => {
  const value = flag(args, name);
  if (!value) throw new Error(`catalog-bench requires --${name}`);
  return value;
};

const parsePositiveInteger = (value: string, label: string): number => {
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) {
    throw new Error(`${label} must be a positive integer`);
  }
  return parsed;
};

const strictOptionalFlag = (args: string[], name: string): string | undefined => {
  const flagName = `--${name}`;
  const indexes = args.flatMap((value, index) => value === flagName ? [index] : []);
  if (indexes.length > 1) throw new Error(`${flagName} may only be specified once`);
  if (indexes.length === 0) return undefined;
  const value = args[indexes[0] + 1];
  if (value === undefined || value.startsWith('--')) {
    throw new Error(`${flagName} requires a value`);
  }
  return value;
};

export const validateCatalogV8Profile: (
  value: unknown
) => asserts value is NodeV8Profile = (value) => {
  if (
    value !== 'stock'
    && value !== 'optimize-for-size'
    && value !== 'baseline-optimize-for-size'
    && value !== 'jitless-optimize-for-size'
  ) {
    throw new Error(
      "v8Profile must be 'stock', 'optimize-for-size', "
      + "'baseline-optimize-for-size', or 'jitless-optimize-for-size'"
    );
  }
};

export const parseCatalogV8Profile = (args: string[]): NodeV8Profile => {
  const value = strictOptionalFlag(args, 'v8-profile') ?? 'stock';
  validateCatalogV8Profile(value);
  return value;
};

interface CatalogRuntimeFlags {
  nodeOptions: string;
  nodeOptionsArgv: string[];
  nodeExecArgv: string[];
  effectiveNodeRuntimeFlags: string[];
}

const CATALOG_MANAGED_V8_OPTION =
  /^--(?:no[-_])?(?:jitless|optimize[-_]for[-_]size|max[-_]opt)(?:=.*)?$/;
const CATALOG_MAX_OLD_SPACE_OPTION =
  /^--max(?:-|_)old(?:-|_)space(?:-|_)size(?:=.*)?$/;

export const validateCatalogRuntimeFlags = (
  config: Pick<
  CatalogBenchConfig,
  | 'heapMiB'
  | 'v8Profile'
  | 'nodeOptions'
  | 'nodeOptionsArgv'
  | 'nodeExecArgv'
  | 'effectiveNodeRuntimeFlags'
  >,
  actual: CatalogRuntimeFlags = {
    nodeOptions: process.env.NODE_OPTIONS ?? '',
    nodeOptionsArgv: tokenizeNodeOptions(process.env.NODE_OPTIONS ?? ''),
    nodeExecArgv: [...process.execArgv],
    effectiveNodeRuntimeFlags: [
      ...tokenizeNodeOptions(process.env.NODE_OPTIONS ?? ''),
      ...process.execArgv
    ]
  }
): void => {
  validateCatalogV8Profile(config.v8Profile);
  const expectedExecArgv = [
    ...nodeFlagsForV8Profile(config.v8Profile),
    '--expose-gc'
  ];
  const configuredNodeOptionsArgv = tokenizeNodeOptions(config.nodeOptions);
  const expectedEffective = [
    ...config.nodeOptionsArgv,
    ...config.nodeExecArgv
  ];
  const maxOldSpace = config.nodeOptionsArgv.filter((option) =>
    CATALOG_MAX_OLD_SPACE_OPTION.test(option)
  );
  const managedInNodeOptions = config.nodeOptionsArgv.some((option) =>
    CATALOG_MANAGED_V8_OPTION.test(option)
  );
  if (
    JSON.stringify(config.nodeOptionsArgv) !== JSON.stringify(configuredNodeOptionsArgv)
    || JSON.stringify(config.nodeExecArgv) !== JSON.stringify(expectedExecArgv)
    || JSON.stringify(config.effectiveNodeRuntimeFlags) !== JSON.stringify(expectedEffective)
    || maxOldSpace.length !== 1
    || maxOldSpace[0] !== `--max-old-space-size=${config.heapMiB}`
    || managedInNodeOptions
  ) {
    throw new Error('catalog-bench configured Node runtime flags are inconsistent');
  }
  for (const [label, configured, observed] of [
    ['NODE_OPTIONS', config.nodeOptions, actual.nodeOptions],
    ['NODE_OPTIONS argv', config.nodeOptionsArgv, actual.nodeOptionsArgv],
    ['process.execArgv', config.nodeExecArgv, actual.nodeExecArgv],
    [
      'effective Node runtime flags',
      config.effectiveNodeRuntimeFlags,
      actual.effectiveNodeRuntimeFlags
    ]
  ] as const) {
    if (JSON.stringify(configured) !== JSON.stringify(observed)) {
      throw new Error(`catalog-bench ${label} does not match the pinned worker config`);
    }
  }
};

const parseStrictInteger = (
  value: string,
  label: string,
  allowZero: boolean
): number => {
  if (!/^(0|[1-9][0-9]*)$/.test(value)) {
    throw new Error(`${label} must be ${allowZero ? 'a non-negative' : 'a positive'} integer`);
  }
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || (allowZero ? parsed < 0 : parsed <= 0)) {
    throw new Error(`${label} must be ${allowZero ? 'a non-negative' : 'a positive'} safe integer`);
  }
  return parsed;
};

export const validateCatalogScopedCatalogTypes = (
  mode: IntrospectionMode,
  value: CatalogScopedCatalogTypes | null
): void => {
  if (mode !== 'stock' && mode !== 'scoped-required') {
    throw new Error("catalog-bench mode must be 'stock' or 'scoped-required'");
  }
  if (mode === 'stock') {
    if (value !== null) {
      throw new Error('scopedCatalogTypes must be null for stock introspection');
    }
    return;
  }
  if (value !== 'all' && value !== 'dependency-closure') {
    throw new Error(
      "scopedCatalogTypes must be 'all' or 'dependency-closure' for scoped-required introspection"
    );
  }
};

export const parseCatalogScopedCatalogTypes = (
  args: string[],
  mode: IntrospectionMode
): CatalogScopedCatalogTypes | null => {
  const value = strictOptionalFlag(args, 'scoped-catalog-types');
  if (mode === 'stock') {
    if (value !== undefined) {
      throw new Error('--scoped-catalog-types requires --mode scoped-required');
    }
    return null;
  }
  const parsed = value ?? 'all';
  if (parsed !== 'all' && parsed !== 'dependency-closure') {
    throw new Error(
      "--scoped-catalog-types must be 'all' or 'dependency-closure'"
    );
  }
  return parsed;
};

export const validateCatalogIntrospectionClientReleaseMode: (
  value: unknown
) => asserts value is CatalogIntrospectionClientReleaseMode = (value) => {
  if (value !== 'reuse' && value !== 'destroy') {
    throw new Error(
      "introspectionClientReleaseMode must be 'reuse' or 'destroy'"
    );
  }
};

export const parseCatalogIntrospectionClientReleaseMode = (
  args: string[]
): CatalogIntrospectionClientReleaseMode => {
  const value = strictOptionalFlag(args, 'introspection-client-release-mode')
    ?? 'reuse';
  validateCatalogIntrospectionClientReleaseMode(value);
  return value;
};

export const validateCatalogBackendSamplerMode: (
  value: unknown
) => asserts value is CatalogBackendSamplerMode = (value) => {
  if (value !== 'off' && value !== 'diagnostic-lower-bound') {
    throw new Error(
      "postgresBackendSamplerMode must be 'off' or 'diagnostic-lower-bound'"
    );
  }
};

export const parseCatalogBackendSamplerMode = (
  args: string[]
): CatalogBackendSamplerMode => {
  const value = strictOptionalFlag(args, 'postgres-backend-sampler')
    ?? 'diagnostic-lower-bound';
  validateCatalogBackendSamplerMode(value);
  return value;
};

export const catalogIntrospectionBuildIdentity = (
  mode: IntrospectionMode,
  scopedCatalogTypes: CatalogScopedCatalogTypes | null,
  releaseBuildStateAfterValidation = false,
  introspectionClientReleaseMode: CatalogIntrospectionClientReleaseMode = 'reuse'
): string => {
  validateCatalogScopedCatalogTypes(mode, scopedCatalogTypes);
  validateCatalogIntrospectionClientReleaseMode(introspectionClientReleaseMode);
  return `${mode}:scoped-catalog-types=${scopedCatalogTypes ?? 'not-applicable'}`
    + `:release-build-state=${releaseBuildStateAfterValidation}`
    + `:introspection-client-release=${introspectionClientReleaseMode}`;
};

export const resolveCatalogBackendPidAfterBuild = async (
  introspectionClientReleaseMode: CatalogIntrospectionClientReleaseMode,
  introspectionBackendIdentity: CatalogBackendIdentity,
  dependencies: CatalogBackendPidLifecycleDependencies
): Promise<CatalogBackendPidTransition> => {
  validateCatalogIntrospectionClientReleaseMode(introspectionClientReleaseMode);
  validateCatalogBackendIdentity(introspectionBackendIdentity);
  if (introspectionClientReleaseMode === 'destroy') {
    await dependencies.waitForRetirement(introspectionBackendIdentity);
  }
  const steadyBackendIdentity = await dependencies.acquireBackendIdentity();
  validateCatalogBackendIdentity(steadyBackendIdentity);
  if (
    introspectionClientReleaseMode === 'destroy'
    && steadyBackendIdentity.pid === introspectionBackendIdentity.pid
  ) {
    throw new Error(
      `destroyed PostgreSQL introspection backend ${introspectionBackendIdentity.pid} was reused`
    );
  }
  if (
    introspectionClientReleaseMode === 'reuse'
    && (
      steadyBackendIdentity.pid !== introspectionBackendIdentity.pid
      || steadyBackendIdentity.backendStartEpochMs
        !== introspectionBackendIdentity.backendStartEpochMs
    )
  ) {
    throw new Error(
      `PostgreSQL benchmark backend identity changed from `
      + `${introspectionBackendIdentity.pid}@${introspectionBackendIdentity.backendStartEpochMs} `
      + `to ${steadyBackendIdentity.pid}@${steadyBackendIdentity.backendStartEpochMs}`
    );
  }
  return {
    introspectionBackendPid: introspectionBackendIdentity.pid,
    introspectionBackendStartEpochMs:
      introspectionBackendIdentity.backendStartEpochMs,
    steadyBackendPid: steadyBackendIdentity.pid,
    steadyBackendStartEpochMs: steadyBackendIdentity.backendStartEpochMs,
    introspectionBackendRetired: introspectionClientReleaseMode === 'destroy'
  };
};

export const parseCatalogBuildStateRetirement = (args: string[]): boolean => {
  const flagName = '--release-build-state-after-validation';
  const count = args.filter((value) => value === flagName).length;
  if (count > 1) throw new Error(`${flagName} may only be specified once`);
  return count === 1;
};

export const parseCatalogTenantProxySurfaces = (args: string[]): number | null => {
  const value = strictOptionalFlag(args, 'tenant-proxy-surfaces');
  return value === undefined
    ? null
    : parseStrictInteger(value, 'tenant-proxy-surfaces', false);
};

export const parseCatalogWarmthCliOptions = (
  args: string[]
): CatalogWarmthCliOptions => {
  const warmOperations = strictOptionalFlag(args, 'warm-operations-per-instance');
  const replayPasses = strictOptionalFlag(args, 'warm-operation-replay-passes');
  const queryCacheMax = strictOptionalFlag(args, 'grafast-query-cache-max');
  const operationsCacheMax = strictOptionalFlag(args, 'grafast-operations-cache-max');
  const operationPlansCacheMax = strictOptionalFlag(
    args,
    'grafast-operation-plans-cache-max'
  );
  const options: CatalogWarmthCliOptions = {
    warmOperationsPerInstance: warmOperations === undefined
      ? 0
      : parseStrictInteger(
        warmOperations,
        'warm-operations-per-instance',
        true
      ),
    warmOperationReplayPasses: replayPasses === undefined
      ? 0
      : parseStrictInteger(
        replayPasses,
        'warm-operation-replay-passes',
        true
      ),
    grafastCacheLimits: {
      queryCacheMaxLength: queryCacheMax === undefined
        ? null
        : parseStrictInteger(queryCacheMax, 'grafast-query-cache-max', false),
      operationsCacheMaxLength: operationsCacheMax === undefined
        ? null
        : parseStrictInteger(operationsCacheMax, 'grafast-operations-cache-max', false),
      operationOperationPlansCacheMaxLength: operationPlansCacheMax === undefined
        ? null
        : parseStrictInteger(
          operationPlansCacheMax,
          'grafast-operation-plans-cache-max',
          false
        )
    }
  };
  validateCatalogWarmthConfig(options);
  return options;
};

export const validateCatalogWarmthConfig = (
  options: CatalogWarmthCliOptions
): void => {
  if (
    !Number.isSafeInteger(options.warmOperationsPerInstance)
    || options.warmOperationsPerInstance < 0
  ) {
    throw new Error('warmOperationsPerInstance must be a non-negative safe integer');
  }
  if (
    !Number.isSafeInteger(options.warmOperationReplayPasses)
    || options.warmOperationReplayPasses < 0
  ) {
    throw new Error('warmOperationReplayPasses must be a non-negative safe integer');
  }
  if (
    options.warmOperationReplayPasses > 0
    && options.warmOperationsPerInstance === 0
  ) {
    throw new Error(
      'warmOperationReplayPasses requires warmOperationsPerInstance to be greater than zero'
    );
  }
  if (!Number.isSafeInteger(
    options.warmOperationsPerInstance * options.warmOperationReplayPasses
  )) {
    throw new Error('warm operation replay execution count must be a safe integer');
  }
  if (!options.grafastCacheLimits || typeof options.grafastCacheLimits !== 'object') {
    throw new Error('grafastCacheLimits must define all three cache limit fields');
  }
  for (const [key, value] of Object.entries(options.grafastCacheLimits)) {
    if (value !== null && (!Number.isSafeInteger(value) || value < 2)) {
      throw new Error(`grafastCacheLimits.${key} must be null or a safe integer of at least 2`);
    }
  }
  const requiredKeys: Array<keyof CatalogGrafastCacheLimits> = [
    'queryCacheMaxLength',
    'operationsCacheMaxLength',
    'operationOperationPlansCacheMaxLength'
  ];
  if (requiredKeys.some((key) => !(key in options.grafastCacheLimits))) {
    throw new Error('grafastCacheLimits must define all three cache limit fields');
  }
};

const configuredGrafastCacheLimits = (
  limits: CatalogGrafastCacheLimits
): {
  queryCacheMaxLength?: number;
  operationsCacheMaxLength?: number;
  operationOperationPlansCacheMaxLength?: number;
} => ({
  ...(limits.queryCacheMaxLength === null
    ? {}
    : { queryCacheMaxLength: limits.queryCacheMaxLength }),
  ...(limits.operationsCacheMaxLength === null
    ? {}
    : { operationsCacheMaxLength: limits.operationsCacheMaxLength }),
  ...(limits.operationOperationPlansCacheMaxLength === null
    ? {}
    : {
      operationOperationPlansCacheMaxLength:
        limits.operationOperationPlansCacheMaxLength
    })
});

const parseList = (value: string): string[] => value
  .split(',')
  .map((item) => item.trim())
  .filter(Boolean);

const validateSchemaNames = (
  value: unknown,
  label: string,
  allowEmpty = false
): string[] => {
  if (!Array.isArray(value) || (!allowEmpty && value.length === 0)) {
    throw new Error(`${label} must contain at least one schema name`);
  }
  if (value.length === 0) return [];
  const names = value.map((name, index) => {
    if (
      typeof name !== 'string'
      || name.length === 0
      || name.trim() !== name
      || name.includes('\0')
    ) {
      throw new Error(`${label}[${index}] must be a nonempty exact schema name`);
    }
    return name;
  });
  if (new Set(names).size !== names.length) {
    throw new Error(`${label} must contain unique schema names`);
  }
  return names;
};

const parseStrictSchemaList = (
  value: string,
  label: string,
  allowEmpty = false
): string[] => {
  if (allowEmpty && value.length === 0) return [];
  const raw = value.split(',');
  if (raw.some((name) => name.trim().length === 0)) {
    throw new Error(`${label} must not contain empty schema names`);
  }
  return validateSchemaNames(raw.map((name) => name.trim()), label);
};

export const parseCatalogSchemaLayout = (
  args: string[],
  maxInstances: number
): CatalogSchemaLayout => {
  const legacyValue = strictOptionalFlag(args, 'schemas');
  const surfaceValue = strictOptionalFlag(args, 'surface-schemas');
  const dependencyValue = strictOptionalFlag(args, 'allowed-dependency-schemas');
  if (legacyValue !== undefined && surfaceValue !== undefined) {
    throw new Error('--schemas and --surface-schemas are mutually exclusive');
  }
  if (surfaceValue === undefined) {
    if (dependencyValue !== undefined) {
      throw new Error('--allowed-dependency-schemas requires --surface-schemas');
    }
    if (legacyValue === undefined) {
      throw new Error('catalog-bench requires --schemas or --surface-schemas');
    }
    const schemas = parseList(legacyValue);
    if (schemas.length !== maxInstances || new Set(schemas).size !== schemas.length) {
      throw new Error(`--schemas must contain exactly ${maxInstances} unique entries`);
    }
    return { schemas, schemaSets: null, allowedDependencySchemas: null };
  }
  if (maxInstances !== 1) {
    throw new Error('--surface-schemas requires exactly one resident instance');
  }
  if (dependencyValue === undefined) {
    throw new Error('--surface-schemas requires --allowed-dependency-schemas');
  }
  const surfaceSchemas = parseStrictSchemaList(surfaceValue, '--surface-schemas');
  const allowedDependencySchemas = parseStrictSchemaList(
    dependencyValue,
    '--allowed-dependency-schemas',
    true
  );
  const overlap = surfaceSchemas.filter((schema) =>
    allowedDependencySchemas.includes(schema)
  );
  if (overlap.length > 0) {
    throw new Error(
      `surface and dependency schema lists must not overlap: ${overlap.join(', ')}`
    );
  }
  return {
    schemas: [surfaceSchemas[0]],
    schemaSets: [surfaceSchemas],
    allowedDependencySchemas
  };
};

export const resolveCatalogSchemaLayout = (
  config: Pick<
    CatalogBenchConfig,
    'schemas' | 'schemaSets' | 'allowedDependencySchemas' | 'checkpoints'
  >
): CatalogSchemaLayout => {
  const maxInstances = Math.max(...config.checkpoints);
  if (!Number.isSafeInteger(maxInstances) || maxInstances <= 0) {
    throw new Error('checkpoints must contain a positive resident instance count');
  }
  const schemas = validateSchemaNames(config.schemas, 'schemas');
  if (config.schemaSets === undefined) {
    if (config.allowedDependencySchemas !== undefined) {
      throw new Error('allowedDependencySchemas requires schemaSets');
    }
    if (schemas.length !== maxInstances) {
      throw new Error(`schemas must contain exactly ${maxInstances} entries`);
    }
    return { schemas, schemaSets: null, allowedDependencySchemas: null };
  }
  if (
    !Array.isArray(config.schemaSets)
    || maxInstances !== 1
    || config.schemaSets.length !== 1
    || schemas.length !== 1
  ) {
    throw new Error('schemaSets mode requires exactly one resident instance');
  }
  const schemaSet = validateSchemaNames(config.schemaSets[0], 'schemaSets[0]');
  if (schemas[0] !== schemaSet[0]) {
    throw new Error('schemas[0] must equal the first ordered schemaSets[0] entry');
  }
  const allowedDependencySchemas = validateSchemaNames(
    config.allowedDependencySchemas,
    'allowedDependencySchemas',
    true
  );
  const overlap = schemaSet.filter((schema) => allowedDependencySchemas.includes(schema));
  if (overlap.length > 0) {
    throw new Error(
      `schemaSets and allowedDependencySchemas must not overlap: ${overlap.join(', ')}`
    );
  }
  return {
    schemas,
    schemaSets: [schemaSet],
    allowedDependencySchemas
  };
};

export const catalogSchemaContractIdentity = (
  schemas: string[],
  allowedDependencySchemas: string[]
): string => {
  const exposed = validateSchemaNames(schemas, 'schemas');
  const dependencies = validateSchemaNames(
    allowedDependencySchemas,
    'allowedDependencySchemas',
    true
  );
  const overlap = exposed.filter((schema) => dependencies.includes(schema));
  if (overlap.length > 0) {
    throw new Error(`schema contract lists must not overlap: ${overlap.join(', ')}`);
  }
  return createHash('sha256').update(JSON.stringify({
    schemas: exposed,
    allowedDependencySchemas: dependencies
  })).digest('hex');
};

const parseCheckpoints = (value: string): number[] => {
  const parsed = parseList(value).map((item) => parsePositiveInteger(item, 'instances'));
  return [...new Set(parsed)].sort((a, b) => a - b);
};

const median = (values: number[]): number => {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[middle - 1] + sorted[middle]) / 2
    : sorted[middle];
};

export const catalogPercentile = (
  values: readonly number[],
  probability: number
): number | null => {
  if (values.length === 0) return null;
  if (!Number.isFinite(probability) || probability <= 0 || probability > 1) {
    throw new Error('percentile probability must be greater than zero and at most one');
  }
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * probability) - 1)];
};

export const makeCatalogWarmOperationSource = (operationIndex: number): string => {
  if (!Number.isSafeInteger(operationIndex) || operationIndex <= 0) {
    throw new Error('operationIndex must be a positive safe integer');
  }
  return `query CatalogWarm${operationIndex} { warmTenantToken: tenantToken }`;
};

export const projectCatalogTenantDensity = (input: {
  tenantProxySurfaces: number;
  configuredOldSpaceMiB: number;
  snapshot: Pick<
    CatalogMemorySnapshot,
    'instances' | 'processPeakRssBytes' | 'processPeakRssDeltaBytes'
  >;
}): CatalogTenantProxyDensityPoint => {
  const {
    tenantProxySurfaces,
    configuredOldSpaceMiB,
    snapshot
  } = input;
  if (!Number.isSafeInteger(tenantProxySurfaces) || tenantProxySurfaces <= 0) {
    throw new Error('tenantProxySurfaces must be a positive safe integer');
  }
  if (!Number.isSafeInteger(configuredOldSpaceMiB) || configuredOldSpaceMiB <= 0) {
    throw new Error('configuredOldSpaceMiB must be a positive safe integer');
  }
  if (!Number.isSafeInteger(snapshot.instances) || snapshot.instances < 0) {
    throw new Error('snapshot.instances must be a non-negative safe integer');
  }
  if (!Number.isFinite(snapshot.processPeakRssBytes) || snapshot.processPeakRssBytes <= 0) {
    throw new Error('snapshot.processPeakRssBytes must be a positive finite number');
  }
  const fullTenantProxyGroups = Math.floor(snapshot.instances / tenantProxySurfaces);
  return {
    residentSurfaceInstances: snapshot.instances,
    fullTenantProxyGroups,
    remainderSurfaceInstances: snapshot.instances % tenantProxySurfaces,
    configuredOldSpaceMiB,
    absolutePeakProcessRssBytes: snapshot.processPeakRssBytes,
    groupsPerConfiguredOldSpaceGiB:
      fullTenantProxyGroups / (configuredOldSpaceMiB / MIB_PER_GIB),
    groupsPerAbsolutePeakProcessRssGiB:
      fullTenantProxyGroups / (snapshot.processPeakRssBytes / GIB)
  };
};

export const catalogProgressPath = (resultFile: string): string =>
  path.join(path.dirname(resultFile), 'progress.json');

/**
 * Persist a small checkpoint without serializing resident schemas or build
 * samples. The same-directory rename is atomic, so an OOM can leave either the
 * preceding valid checkpoint or the new one, never a truncated JSON artifact.
 */
export const writeCatalogProgress = (
  resultFile: string,
  progress: CatalogBenchProgress
): void => {
  const progressFile = catalogProgressPath(resultFile);
  const temporaryFile = `${progressFile}.${process.pid}.tmp`;
  fs.mkdirSync(path.dirname(progressFile), { recursive: true });
  fs.writeFileSync(temporaryFile, `${JSON.stringify(progress, null, 2)}\n`, 'utf8');
  fs.renameSync(temporaryFile, progressFile);
};

const maxOrNull = (values: Array<number | null>): number | null => {
  const measured = values.filter((value): value is number => value !== null);
  return measured.length > 0 ? Math.max(...measured) : null;
};

const medianOrNull = (values: Array<number | null>): number | null => {
  const measured = values.filter((value): value is number => value !== null);
  return measured.length > 0 ? median(measured) : null;
};

const sha256File = (file: string): string =>
  createHash('sha256').update(fs.readFileSync(file)).digest('hex');

const GIT_PROVENANCE_MAX_BUFFER_BYTES = 64 * 1024 ** 2;

const readGitProvenance = (): {
  commit: string | null;
  worktreeDirty: boolean | null;
  sourceStateSha256: string | null;
} => {
  try {
    const commit = execFileSync('git', ['rev-parse', 'HEAD'], {
      encoding: 'utf8',
      maxBuffer: GIT_PROVENANCE_MAX_BUFFER_BYTES
    }).trim();
    const status = execFileSync(
      'git',
      ['status', '--porcelain=v1', '--untracked-files=all'],
      {
        encoding: 'utf8',
        maxBuffer: GIT_PROVENANCE_MAX_BUFFER_BYTES
      }
    );
    const hash = createHash('sha256').update(commit).update('\0').update(status);
    hash.update(execFileSync('git', ['diff', '--binary', 'HEAD'], {
      encoding: 'buffer',
      maxBuffer: GIT_PROVENANCE_MAX_BUFFER_BYTES
    }));
    const untracked = execFileSync(
      'git',
      ['ls-files', '--others', '--exclude-standard', '-z'],
      {
        encoding: 'buffer',
        maxBuffer: GIT_PROVENANCE_MAX_BUFFER_BYTES
      }
    ).toString('utf8').split('\0').filter(Boolean).sort();
    for (const relativeFile of untracked) {
      hash.update('\0').update(relativeFile).update('\0');
      hash.update(fs.readFileSync(path.resolve(relativeFile)));
    }
    return {
      commit,
      worktreeDirty: status.length > 0,
      sourceStateSha256: hash.digest('hex')
    };
  } catch {
    return { commit: null, worktreeDirty: null, sourceStateSha256: null };
  }
};

const slope = (points: { x: number; y: number }[]): number => {
  if (points.length < 2) return 0;
  const meanX = points.reduce((sum, point) => sum + point.x, 0) / points.length;
  const meanY = points.reduce((sum, point) => sum + point.y, 0) / points.length;
  const numerator = points.reduce(
    (sum, point) => sum + (point.x - meanX) * (point.y - meanY),
    0
  );
  const denominator = points.reduce(
    (sum, point) => sum + (point.x - meanX) ** 2,
    0
  );
  return denominator === 0 ? 0 : numerator / denominator;
};

const forceGc = async (settleMs: number): Promise<void> => {
  if (typeof global.gc !== 'function') {
    throw new Error('catalog-bench worker requires Node --expose-gc');
  }
  for (let index = 0; index < 3; index++) {
    global.gc();
    await new Promise<void>((resolve) => setImmediate(resolve));
  }
  if (settleMs > 0) {
    await new Promise<void>((resolve) => setTimeout(resolve, settleMs));
    global.gc();
  }
};

interface TransientMemoryPoint {
  heapUsedBytes: number;
  rssBytes: number;
  processPeakRssBytes: number;
}

export const summarizeBuildTransientSamples = (
  baseline: TransientMemoryPoint,
  samples: readonly TransientMemoryPoint[]
): BuildTransientSample => {
  if (samples.length === 0) throw new Error('build transient sampling requires a sample');
  const sampledPeakHeapUsedBytes = Math.max(...samples.map((sample) => sample.heapUsedBytes));
  const sampledPeakRssBytes = Math.max(...samples.map((sample) => sample.rssBytes));
  const processPeakRssBytes = Math.max(...samples.map((sample) => sample.processPeakRssBytes));
  return {
    baselineHeapUsedBytes: baseline.heapUsedBytes,
    baselineRssBytes: baseline.rssBytes,
    sampledPeakHeapUsedBytes,
    sampledPeakHeapDeltaBytes: Math.max(
      0,
      sampledPeakHeapUsedBytes - baseline.heapUsedBytes
    ),
    sampledPeakRssBytes,
    sampledPeakRssDeltaBytes: Math.max(0, sampledPeakRssBytes - baseline.rssBytes),
    processPeakRssBytes,
    processPeakRssDeltaBytes: Math.max(
      0,
      processPeakRssBytes - baseline.processPeakRssBytes
    ),
    sampleCount: samples.length
  };
};

const readTransientMemoryPoint = (): TransientMemoryPoint => {
  const memory = process.memoryUsage();
  return {
    heapUsedBytes: memory.heapUsed,
    rssBytes: memory.rss,
    processPeakRssBytes: process.resourceUsage().maxRSS * 1024
  };
};

const measureBuildTransient = async <T>(
  operation: () => Promise<T>
): Promise<{ value: T; transient: BuildTransientSample }> => {
  const baseline = readTransientMemoryPoint();
  const samples: TransientMemoryPoint[] = [baseline];
  const sample = () => samples.push(readTransientMemoryPoint());
  const timer = setInterval(sample, BUILD_TRANSIENT_SAMPLE_INTERVAL_MS);
  timer.unref();
  try {
    const value = await operation();
    sample();
    return {
      value,
      transient: summarizeBuildTransientSamples(baseline, samples)
    };
  } finally {
    clearInterval(timer);
  }
};

const validateCatalogBackendPid = (backendPid: number): void => {
  if (!Number.isSafeInteger(backendPid) || backendPid <= 0) {
    throw new Error('PostgreSQL backend PID must be a positive safe integer');
  }
};

export const validateCatalogBackendIdentity = (
  identity: CatalogBackendIdentity
): void => {
  validateCatalogBackendPid(identity.pid);
  if (
    !Number.isSafeInteger(identity.backendStartEpochMs)
    || identity.backendStartEpochMs <= 0
  ) {
    throw new Error(
      'PostgreSQL backend start timestamp must be a positive safe epoch millisecond'
    );
  }
};

export const validateCatalogPostgresContainer = (container: string): void => {
  if (!/^[a-zA-Z0-9][a-zA-Z0-9_.-]*$/.test(container)) {
    throw new Error(`invalid PostgreSQL container name '${container}'`);
  }
};

export const parseCatalogDockerContainerIdentity = (
  output: string,
  requestedName: string
): CatalogDockerContainerIdentity => {
  validateCatalogPostgresContainer(requestedName);
  const fields = output.trim().split('\t');
  if (fields.length !== 3 || !/^[a-f0-9]{64}$/i.test(fields[0])) {
    throw new Error('Docker inspect did not return an immutable container ID');
  }
  if (!Number.isFinite(Date.parse(fields[1]))) {
    throw new Error('Docker inspect did not return a valid container start timestamp');
  }
  const initHostPid = Number(fields[2]);
  if (!Number.isSafeInteger(initHostPid) || initHostPid <= 0) {
    throw new Error('Docker inspect did not return a positive container init PID');
  }
  return {
    requestedName,
    immutableId: fields[0].toLowerCase(),
    startedAt: new Date(fields[1]).toISOString(),
    initHostPid
  };
};

export const assertCatalogDockerContainerIdentity = (
  expected: CatalogDockerContainerIdentity,
  actual: CatalogDockerContainerIdentity
): void => {
  if (
    actual.requestedName !== expected.requestedName
    || actual.immutableId !== expected.immutableId
    || actual.startedAt !== expected.startedAt
    || actual.initHostPid !== expected.initHostPid
  ) {
    throw new Error(
      `PostgreSQL container '${expected.requestedName}' changed immutable identity `
      + 'during backend sampling'
    );
  }
};

const parseProcStatusKiB = (value: string | undefined, label: string): number => {
  if (value === undefined || !/^\d+$/.test(value)) {
    throw new Error(`PostgreSQL backend status did not contain a valid ${label}`);
  }
  const bytes = Number(value) * 1024;
  if (!Number.isSafeInteger(bytes)) {
    throw new Error(`PostgreSQL backend ${label} exceeds the safe integer range`);
  }
  return bytes;
};

export const parseCatalogBackendProcStatus = (
  status: string,
  expectedPid: number
): BackendMemory => {
  validateCatalogBackendPid(expectedPid);
  const fields = new Map<string, string>();
  for (const line of status.split(/\r?\n/)) {
    const match = /^([A-Za-z]+):\s*(.*?)\s*$/.exec(line);
    if (match) fields.set(match[1], match[2]);
  }
  const processName = fields.get('Name')?.split(/\s+/)[0];
  const namespacePids = fields.get('NSpid')?.split(/\s+/).filter(Boolean) ?? [];
  const namespacePid = Number(namespacePids.at(-1));
  if (!processName?.startsWith('postgres') || namespacePid !== expectedPid) {
    throw new Error(
      `PostgreSQL backend status identity did not match exact PID ${expectedPid}`
    );
  }
  return {
    rssBytes: parseProcStatusKiB(fields.get('VmRSS')?.split(/\s+/)[0], 'VmRSS'),
    highWaterBytes: parseProcStatusKiB(fields.get('VmHWM')?.split(/\s+/)[0], 'VmHWM')
  };
};

const maxCatalogBackendSampleGapMs = (
  samples: readonly CatalogBackendMemoryPoint[]
): number | null => {
  if (samples.length < 2) return null;
  let maximum = 0;
  for (let index = 1; index < samples.length; index++) {
    const gap = samples[index].monotonicMs - samples[index - 1].monotonicMs;
    if (!Number.isFinite(gap) || gap < 0) {
      throw new Error('PostgreSQL backend sampler timestamps must be monotonic');
    }
    maximum = Math.max(maximum, gap);
  }
  return maximum;
};

export const summarizeCatalogBackendMemorySamples = (input: {
  backendIdentity: CatalogBackendIdentity;
  samplerPid: number;
  source: CatalogBackendMemorySamplerSource;
  postgresContainer: string | null;
  containerIdentity?: CatalogDockerContainerIdentity | null;
  hostEnvironmentVariableNames?: string[];
  samples: readonly CatalogBackendMemoryPoint[];
  targetExitedBeforeStop: boolean;
  targetExitedAtMonotonicMs?: number | null;
  samplerStartedAt: string;
  samplerReadyAt: string;
  buildStartedAt: string;
  buildCompletedAt: string;
  samplerStopRequestedAt: string;
  samplerStoppedAt: string;
  buildDurationMs: number;
  clientPlatform?: string;
  clientArchitecture?: string;
}): CatalogBackendIntrospectionMemoryLowerBoundMeasurement => {
  validateCatalogBackendIdentity(input.backendIdentity);
  if (!Number.isSafeInteger(input.samplerPid) || input.samplerPid <= 0) {
    throw new Error('PostgreSQL backend sampler PID must be a positive safe integer');
  }
  if (input.samples.length === 0) {
    throw new Error('PostgreSQL backend sampler produced no memory samples');
  }
  for (const sample of input.samples) {
    if (
      !Number.isFinite(sample.monotonicMs)
      || sample.monotonicMs < 0
      || !Number.isSafeInteger(sample.rssBytes)
      || sample.rssBytes <= 0
      || !Number.isSafeInteger(sample.highWaterBytes)
      || sample.highWaterBytes < sample.rssBytes
      || !Number.isSafeInteger(sample.procStartTicks)
      || sample.procStartTicks <= 0
      || !Number.isSafeInteger(sample.procStartEpochMs)
      || sample.procStartEpochMs <= 0
      || !Number.isSafeInteger(sample.bootTimeEpochSeconds)
      || sample.bootTimeEpochSeconds <= 0
      || !Number.isSafeInteger(sample.clockTicksPerSecond)
      || sample.clockTicksPerSecond <= 0
    ) {
      throw new Error('PostgreSQL backend sampler produced an invalid memory sample');
    }
  }
  if (!Number.isFinite(input.buildDurationMs) || input.buildDurationMs < 0) {
    throw new Error('PostgreSQL backend sampler requires a finite build duration');
  }
  const baseline = input.samples[0];
  for (const sample of input.samples) {
    if (
      sample.procStartTicks !== baseline.procStartTicks
      || sample.bootTimeEpochSeconds !== baseline.bootTimeEpochSeconds
      || sample.clockTicksPerSecond !== baseline.clockTicksPerSecond
      || Math.abs(
        sample.procStartEpochMs - input.backendIdentity.backendStartEpochMs
      ) > BACKEND_START_IDENTITY_TOLERANCE_MS
    ) {
      throw new Error(
        'PostgreSQL backend sampler observed a changed or mismatched process start identity'
      );
    }
  }
  const timestamps = {
    samplerStarted: Date.parse(input.samplerStartedAt),
    samplerReady: Date.parse(input.samplerReadyAt),
    buildStarted: Date.parse(input.buildStartedAt),
    buildCompleted: Date.parse(input.buildCompletedAt),
    samplerStopRequested: Date.parse(input.samplerStopRequestedAt),
    samplerStopped: Date.parse(input.samplerStoppedAt)
  };
  if (Object.values(timestamps).some((value) => !Number.isFinite(value))) {
    throw new Error('PostgreSQL backend sampler timing contains an invalid timestamp');
  }
  const coveredBuildWindow =
    timestamps.samplerStarted <= timestamps.samplerReady
    && timestamps.samplerReady <= timestamps.buildStarted
    && timestamps.buildStarted <= timestamps.buildCompleted
    && timestamps.buildCompleted <= timestamps.samplerStopRequested
    && timestamps.samplerStopRequested <= timestamps.samplerStopped
    && timestamps.buildCompleted <= timestamps.samplerStopped;
  if (input.targetExitedBeforeStop !== (input.targetExitedAtMonotonicMs != null)) {
    throw new Error('PostgreSQL backend sampler target-exit provenance is inconsistent');
  }
  if (
    input.targetExitedAtMonotonicMs !== undefined
    && input.targetExitedAtMonotonicMs !== null
    && (
      !Number.isFinite(input.targetExitedAtMonotonicMs)
      || input.targetExitedAtMonotonicMs < input.samples.at(-1)!.monotonicMs
    )
  ) {
    throw new Error('PostgreSQL backend sampler target-exit time is invalid');
  }
  const observedTimingPoints = input.targetExitedAtMonotonicMs === undefined
    || input.targetExitedAtMonotonicMs === null
    ? input.samples
    : [
      ...input.samples,
      {
        ...input.samples.at(-1)!,
        monotonicMs: input.targetExitedAtMonotonicMs
      }
    ];
  const maximumObservedGapMs = maxCatalogBackendSampleGapMs(observedTimingPoints);
  const cadenceConclusive = input.samples.length >= 2
    && coveredBuildWindow
    && maximumObservedGapMs !== null
    && maximumObservedGapMs <= BACKEND_MEMORY_MAX_CONCLUSIVE_GAP_MS;
  const limitations: string[] = [];
  limitations.push(DESTROYED_BACKEND_LOWER_BOUND_LIMITATION);
  if (!cadenceConclusive) {
    limitations.push(
      'The identity-bound sampler did not cover the build with at least two samples '
      + `and a maximum observed gap of ${BACKEND_MEMORY_MAX_CONCLUSIVE_GAP_MS}ms.`
    );
  }
  if (input.source === 'docker-container-procfs-diagnostic') {
    limitations.push(DOCKER_DESKTOP_BACKEND_SAMPLER_LIMITATION);
  }
  const sampledPeakRssLowerBoundBytes = Math.max(
    ...input.samples.map((sample) => sample.rssBytes)
  );
  const sampledHighWaterLowerBoundBytes = Math.max(
    ...input.samples.map((sample) => sample.highWaterBytes)
  );
  const samplerLaunchToReadyMs = Math.max(
    0,
    timestamps.samplerReady - timestamps.samplerStarted
  );
  const samplerStopRequestToCloseMs = Math.max(
    0,
    timestamps.samplerStopped - timestamps.samplerStopRequested
  );
  return {
    backendPid: input.backendIdentity.pid,
    backendStartEpochMs: input.backendIdentity.backendStartEpochMs,
    baselineRssBytes: baseline.rssBytes,
    baselineHighWaterBytes: baseline.highWaterBytes,
    sampledPeakRssLowerBoundBytes,
    sampledHighWaterLowerBoundBytes,
    sampledPeakRssDeltaLowerBoundBytes: Math.max(
      0,
      sampledPeakRssLowerBoundBytes - baseline.rssBytes
    ),
    sampledHighWaterDeltaLowerBoundBytes: Math.max(
      0,
      sampledHighWaterLowerBoundBytes - baseline.highWaterBytes
    ),
    sampleCount: input.samples.length,
    targetExitedBeforeStop: input.targetExitedBeforeStop,
    targetExitedAtMonotonicMs: input.targetExitedAtMonotonicMs ?? null,
    timing: {
      configuredIntervalMs: BACKEND_MEMORY_SAMPLE_INTERVAL_MS,
      maximumConclusiveGapMs: BACKEND_MEMORY_MAX_CONCLUSIVE_GAP_MS,
      firstSampleMonotonicMs: baseline.monotonicMs,
      lastSampleMonotonicMs: input.samples.at(-1)!.monotonicMs,
      maximumObservedGapMs,
      samplerStartedAt: input.samplerStartedAt,
      samplerReadyAt: input.samplerReadyAt,
      buildStartedAt: input.buildStartedAt,
      buildCompletedAt: input.buildCompletedAt,
      samplerStoppedAt: input.samplerStoppedAt,
      buildDurationMs: input.buildDurationMs,
      samplerDurationMs: Math.max(
        0,
        timestamps.samplerStopped - timestamps.samplerStarted
      ),
      coveredBuildWindow,
      cadenceConclusive,
      samplerLaunchToReadyMs,
      samplerStopRequestToCloseMs
    },
    observerEffect: {
      samplerProcessCount: 1,
      correctionApplied: false,
      pairedComparisonSupported: true,
      pairedComparisonFlag: '--postgres-backend-sampler',
      measuredLaunchToReadyMs: samplerLaunchToReadyMs,
      measuredStopRequestToCloseMs: samplerStopRequestToCloseMs,
      limitation: 'Only sampler launch and shutdown wall time is measured; sampling '
        + 'CPU/I/O interference is not corrected. Compare paired runs using '
        + "'--postgres-backend-sampler off' and "
        + "'--postgres-backend-sampler diagnostic-lower-bound'."
    },
    provenance: {
      samplerProcess: 'dedicated-external-procfs-loop',
      samplerPid: input.samplerPid,
      source: input.source,
      postgresContainer: input.postgresContainer,
      containerIdentity: input.containerIdentity ?? null,
      clientPlatform: input.clientPlatform ?? os.platform(),
      clientArchitecture: input.clientArchitecture ?? os.arch(),
      backendIdentity: {
        sqlBackendStartEpochMs: input.backendIdentity.backendStartEpochMs,
        procStartTicks: baseline.procStartTicks,
        procStartEpochMs: baseline.procStartEpochMs,
        bootTimeEpochSeconds: baseline.bootTimeEpochSeconds,
        clockTicksPerSecond: baseline.clockTicksPerSecond,
        toleranceMs: BACKEND_START_IDENTITY_TOLERANCE_MS
      },
      dockerInitialExecEnvironment:
        input.source === 'docker-container-procfs-diagnostic'
          ? 'may-inherit-container-config-before-env-i'
          : 'not-applicable',
      samplerShellEnvironment: 'env-i-path-only',
      hostEnvironmentVariableNames:
        [...(input.hostEnvironmentVariableNames ?? [])].sort(),
      semantics: 'diagnostic-lower-bound-without-pre-destroy-acknowledgement',
      backendSamplerAuthority: 'diagnostic-only',
      serviceDensityMemoryAuthority:
        `separately-validated-${LINUX_CGROUP_V2_DENSITY_AUTHORITY}`,
      limitation: limitations.length === 0 ? null : limitations.join(' ')
    }
  };
};

export const catalogBackendSamplerEnvironment = (
  environment: NodeJS.ProcessEnv = process.env
): NodeJS.ProcessEnv => {
  const allowed = [
    'PATH',
    'HOME',
    'LANG',
    'LC_ALL',
    'TZ',
    'TMPDIR',
    'DOCKER_HOST',
    'DOCKER_CONTEXT',
    'DOCKER_TLS_VERIFY',
    'DOCKER_CERT_PATH',
    'DOCKER_CONFIG',
    'XDG_RUNTIME_DIR'
  ];
  return Object.fromEntries(allowed.flatMap((name) => {
    const value = environment[name];
    return value === undefined ? [] : [[name, value]];
  }));
};

const readCatalogDockerContainerIdentity = (
  requestedName: string
): CatalogDockerContainerIdentity => {
  validateCatalogPostgresContainer(requestedName);
  const output = execFileSync(
    'docker',
    [
      'inspect',
      '--format',
      '{{.Id}}\t{{.State.StartedAt}}\t{{.State.Pid}}',
      requestedName
    ],
    {
      encoding: 'utf8',
      env: catalogBackendSamplerEnvironment()
    }
  );
  return parseCatalogDockerContainerIdentity(output, requestedName);
};

export interface CatalogBackendSamplerLaunchSpec {
  command: string;
  args: string[];
  environment: NodeJS.ProcessEnv;
  hostEnvironmentVariableNames: string[];
  source: CatalogBackendMemorySamplerSource;
  statusPath: string;
  statPath: string;
  procStatPath: string;
}

const catalogSamplerShellArgs = (
  statusPath: string,
  statPath: string,
  procStatPath: string,
  backendIdentity: CatalogBackendIdentity
): string[] => [
  '/bin/sh',
  '-c',
  BACKEND_MEMORY_SAMPLER_SCRIPT,
  'catalog-backend-sampler',
  statusPath,
  statPath,
  procStatPath,
  String(backendIdentity.pid),
  String(backendIdentity.backendStartEpochMs),
  String(BACKEND_START_IDENTITY_TOLERANCE_MS),
  String(BACKEND_MEMORY_SAMPLE_INTERVAL_MS / 1000)
];

export const makeCatalogBackendSamplerLaunchSpec = (input: {
  backendIdentity: CatalogBackendIdentity;
  containerIdentity?: CatalogDockerContainerIdentity | null;
  clientPlatform?: string;
  environment?: NodeJS.ProcessEnv;
}): CatalogBackendSamplerLaunchSpec | null => {
  validateCatalogBackendIdentity(input.backendIdentity);
  const clientPlatform = input.clientPlatform ?? os.platform();
  const environment = catalogBackendSamplerEnvironment(input.environment);
  const hostEnvironmentVariableNames = Object.keys(environment).sort();
  const containerIdentity = input.containerIdentity ?? null;
  if (containerIdentity) {
    const containerProcRoot = `/proc/${containerIdentity.initHostPid}/root/proc`;
    const hostStatusPath = `${containerProcRoot}/${input.backendIdentity.pid}/status`;
    const hostStatPath = `${containerProcRoot}/${input.backendIdentity.pid}/stat`;
    const hostProcStatPath = `${containerProcRoot}/stat`;
    if (
      clientPlatform === 'linux'
      && fs.existsSync(hostStatusPath)
      && fs.existsSync(hostStatPath)
      && fs.existsSync(hostProcStatPath)
    ) {
      return {
        command: fs.existsSync('/usr/bin/env') ? '/usr/bin/env' : '/bin/env',
        args: [
          '-i',
          'PATH=/usr/bin:/bin',
          ...catalogSamplerShellArgs(
            hostStatusPath,
            hostStatPath,
            hostProcStatPath,
            input.backendIdentity
          )
        ],
        environment,
        hostEnvironmentVariableNames,
        source: 'linux-host-container-procfs',
        statusPath: hostStatusPath,
        statPath: hostStatPath,
        procStatPath: hostProcStatPath
      };
    }
    const statusPath = `/proc/${input.backendIdentity.pid}/status`;
    const statPath = `/proc/${input.backendIdentity.pid}/stat`;
    return {
      command: 'docker',
      args: [
        'exec',
        '-i',
        containerIdentity.immutableId,
        '/usr/bin/env',
        '-i',
        'PATH=/usr/bin:/bin',
        ...catalogSamplerShellArgs(
          statusPath,
          statPath,
          '/proc/stat',
          input.backendIdentity
        )
      ],
      environment,
      hostEnvironmentVariableNames,
      source: 'docker-container-procfs-diagnostic',
      statusPath,
      statPath,
      procStatPath: '/proc/stat'
    };
  }
  const statusPath = `/proc/${input.backendIdentity.pid}/status`;
  const statPath = `/proc/${input.backendIdentity.pid}/stat`;
  if (
    clientPlatform !== 'linux'
    || !fs.existsSync(statusPath)
    || !fs.existsSync(statPath)
    || !fs.existsSync('/proc/stat')
  ) return null;
  return {
    command: fs.existsSync('/usr/bin/env') ? '/usr/bin/env' : '/bin/env',
    args: [
      '-i',
      'PATH=/usr/bin:/bin',
      ...catalogSamplerShellArgs(
        statusPath,
        statPath,
        '/proc/stat',
        input.backendIdentity
      )
    ],
    environment,
    hostEnvironmentVariableNames,
    source: 'local-linux-procfs',
    statusPath,
    statPath,
    procStatPath: '/proc/stat'
  };
};

const parseBackendSamplerOutputLine = (
  line: string,
  expectedBackendIdentity: CatalogBackendIdentity
): CatalogBackendMemoryPoint | { targetExitedAtMonotonicMs: number } => {
  const fields = line.split('\t');
  if (fields[0] === 'gone' && fields.length === 2) {
    const targetExitedAtMonotonicMs = Number(fields[1]) * 1000;
    if (!Number.isFinite(targetExitedAtMonotonicMs) || targetExitedAtMonotonicMs < 0) {
      throw new Error(`invalid PostgreSQL backend sampler output '${line}'`);
    }
    return { targetExitedAtMonotonicMs };
  }
  if (fields[0] !== 'sample' || fields.length !== 8) {
    throw new Error(`unexpected PostgreSQL backend sampler output '${line}'`);
  }
  const monotonicMs = Number(fields[1]) * 1000;
  const rssBytes = Number(fields[2]) * 1024;
  const highWaterBytes = Number(fields[3]) * 1024;
  const procStartTicks = Number(fields[4]);
  const procStartEpochMs = Number(fields[5]);
  const bootTimeEpochSeconds = Number(fields[6]);
  const clockTicksPerSecond = Number(fields[7]);
  if (
    !Number.isFinite(monotonicMs)
    || monotonicMs < 0
    || !Number.isSafeInteger(rssBytes)
    || rssBytes <= 0
    || !Number.isSafeInteger(highWaterBytes)
    || highWaterBytes < rssBytes
    || !Number.isSafeInteger(procStartTicks)
    || procStartTicks <= 0
    || !Number.isSafeInteger(procStartEpochMs)
    || procStartEpochMs <= 0
    || !Number.isSafeInteger(bootTimeEpochSeconds)
    || bootTimeEpochSeconds <= 0
    || !Number.isSafeInteger(clockTicksPerSecond)
    || clockTicksPerSecond <= 0
    || Math.abs(procStartEpochMs - expectedBackendIdentity.backendStartEpochMs)
      > BACKEND_START_IDENTITY_TOLERANCE_MS
  ) {
    throw new Error(`invalid PostgreSQL backend sampler output '${line}'`);
  }
  return {
    monotonicMs,
    rssBytes,
    highWaterBytes,
    procStartTicks,
    procStartEpochMs,
    bootTimeEpochSeconds,
    clockTicksPerSecond
  };
};

const withCatalogBackendSamplerTimeout = async <T>(
  operation: Promise<T>,
  timeoutMs: number,
  message: string
): Promise<T> => new Promise<T>((resolve, reject) => {
  const timer = setTimeout(() => reject(new Error(message)), timeoutMs);
  operation.then((value) => {
    clearTimeout(timer);
    resolve(value);
  }, (error) => {
    clearTimeout(timer);
    reject(error);
  });
});

export type CatalogBackendSamplerStopOutcome =
  | 'already-exited'
  | 'graceful'
  | 'sigterm'
  | 'sigkill';

export const stopCatalogBackendSamplerProcessTree = async (input: {
  requestGracefulStop(): void;
  waitForTreeExit(timeoutMs: number): Promise<boolean>;
  signalProcessGroup(signal: 'SIGTERM' | 'SIGKILL'): void;
  gracefulTimeoutMs?: number;
  termTimeoutMs?: number;
  killTimeoutMs?: number;
}): Promise<CatalogBackendSamplerStopOutcome> => {
  if (await input.waitForTreeExit(0)) return 'already-exited';
  let gracefulStopError: unknown;
  try {
    input.requestGracefulStop();
  } catch (error) {
    gracefulStopError = error;
  }
  const finish = (outcome: CatalogBackendSamplerStopOutcome) => {
    if (gracefulStopError !== undefined) throw gracefulStopError;
    return outcome;
  };
  if (await input.waitForTreeExit(
    input.gracefulTimeoutMs ?? BACKEND_MEMORY_SAMPLER_STOP_TIMEOUT_MS
  )) return finish('graceful');
  input.signalProcessGroup('SIGTERM');
  if (await input.waitForTreeExit(
    input.termTimeoutMs ?? BACKEND_MEMORY_SAMPLER_TERM_TIMEOUT_MS
  )) return finish('sigterm');
  input.signalProcessGroup('SIGKILL');
  if (await input.waitForTreeExit(
    input.killTimeoutMs ?? BACKEND_MEMORY_SAMPLER_KILL_TIMEOUT_MS
  )) return finish('sigkill');
  throw new Error('PostgreSQL backend sampler process tree survived SIGKILL');
};

const startCatalogBackendMemorySampler = async (
  container: string | null,
  backendIdentity: CatalogBackendIdentity
): Promise<CatalogBackendMemorySamplerHandle | null> => {
  validateCatalogBackendIdentity(backendIdentity);
  const containerIdentity = container === null
    ? null
    : readCatalogDockerContainerIdentity(container);
  const launch = makeCatalogBackendSamplerLaunchSpec({
    backendIdentity,
    containerIdentity
  });
  if (!launch) return null;

  const samplerStartedAt = new Date().toISOString();
  const detached = process.platform !== 'win32';
  const child = spawn(launch.command, launch.args, {
    detached,
    env: launch.environment,
    stdio: ['pipe', 'pipe', 'pipe']
  });
  const samplerPid = child.pid;
  if (!samplerPid) {
    child.kill('SIGKILL');
    throw new Error('PostgreSQL backend sampler did not receive a process PID');
  }
  const samples: CatalogBackendMemoryPoint[] = [];
  let targetExitedBeforeStop = false;
  let targetExitedAtMonotonicMs: number | null = null;
  let stdoutBuffer = '';
  let stderr = '';
  let stopRequested = false;
  let stdinEnded = false;
  let childClosed = false;
  let exitCode: number | null = null;
  let exitSignal: NodeJS.Signals | null = null;
  let processError: Error | null = null;
  let protocolError: Error | null = null;
  let resolveReady!: () => void;
  let rejectReady!: (error: Error) => void;
  const ready = new Promise<void>((resolve, reject) => {
    resolveReady = resolve;
    rejectReady = reject;
  });
  let resolveClosed!: () => void;
  const closed = new Promise<void>((resolve) => {
    resolveClosed = resolve;
  });
  const requestGracefulStop = (): void => {
    stopRequested = true;
    if (!stdinEnded) {
      stdinEnded = true;
      child.stdin.end('stop\n');
    }
  };
  const signalProcessGroup = (signal: 'SIGTERM' | 'SIGKILL'): void => {
    try {
      if (detached) process.kill(-samplerPid, signal);
      else child.kill(signal);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ESRCH') throw error;
    }
  };
  const processGroupExists = (): boolean => {
    if (!detached) return !childClosed;
    try {
      process.kill(-samplerPid, 0);
      return true;
    } catch (error) {
      return (error as NodeJS.ErrnoException).code !== 'ESRCH';
    }
  };
  const waitForTreeExit = async (timeoutMs: number): Promise<boolean> => {
    const deadline = performance.now() + timeoutMs;
    while (true) {
      if (childClosed && !processGroupExists()) return true;
      if (performance.now() >= deadline) return false;
      await Promise.race([
        closed,
        new Promise<void>((resolve) => {
          const timer = setTimeout(resolve, Math.min(10, timeoutMs));
          timer.unref();
        })
      ]);
    }
  };
  let cleanupPromise: Promise<CatalogBackendSamplerStopOutcome> | null = null;
  const cleanupTree = (): Promise<CatalogBackendSamplerStopOutcome> => {
    cleanupPromise ??= stopCatalogBackendSamplerProcessTree({
      requestGracefulStop,
      waitForTreeExit,
      signalProcessGroup
    });
    return cleanupPromise;
  };
  const failProtocol = (error: Error): void => {
    protocolError ??= error;
    rejectReady(error);
    requestGracefulStop();
  };
  const consumeLine = (rawLine: string): void => {
    const line = rawLine.trim();
    if (!line) return;
    try {
      const parsed = parseBackendSamplerOutputLine(line, backendIdentity);
      if ('targetExitedAtMonotonicMs' in parsed) {
        targetExitedBeforeStop = true;
        targetExitedAtMonotonicMs ??= parsed.targetExitedAtMonotonicMs;
      } else {
        const baseline = samples[0];
        if (baseline && (
          parsed.procStartTicks !== baseline.procStartTicks
          || parsed.bootTimeEpochSeconds !== baseline.bootTimeEpochSeconds
          || parsed.clockTicksPerSecond !== baseline.clockTicksPerSecond
        )) {
          throw new Error('PostgreSQL backend procfs start identity changed mid-sample');
        }
        samples.push(parsed);
        if (samples.length === 1) resolveReady();
      }
    } catch (error) {
      failProtocol(error instanceof Error ? error : new Error(String(error)));
    }
  };
  child.stdout.on('data', (chunk: Buffer | string) => {
    stdoutBuffer += chunk.toString();
    const lines = stdoutBuffer.split('\n');
    stdoutBuffer = lines.pop() ?? '';
    lines.forEach(consumeLine);
  });
  child.stderr.on('data', (chunk: Buffer | string) => {
    if (stderr.length < 4_096) stderr += chunk.toString().slice(0, 4_096 - stderr.length);
  });
  child.stdin.on('error', (error) => {
    if (!stopRequested) failProtocol(error);
  });
  child.once('error', (error) => {
    processError = error;
    rejectReady(error);
  });
  child.once('close', (code, signal) => {
    if (stdoutBuffer.trim()) consumeLine(stdoutBuffer);
    childClosed = true;
    exitCode = code;
    exitSignal = signal;
    if (samples.length === 0 && !processError && !protocolError) {
      const detail = stderr.trim() ? `: ${stderr.trim()}` : '';
      rejectReady(new Error(
        `PostgreSQL backend sampler exited code=${code} signal=${signal}${detail}`
      ));
    }
    resolveClosed();
  });
  try {
    await withCatalogBackendSamplerTimeout(
      ready,
      BACKEND_MEMORY_SAMPLER_START_TIMEOUT_MS,
      `PostgreSQL backend sampler for PID ${backendIdentity.pid} did not produce a baseline`
    );
  } catch (error) {
    try {
      await cleanupTree();
    } catch (cleanupError) {
      throw new AggregateError(
        [error, cleanupError],
        'PostgreSQL backend sampler startup and cleanup both failed'
      );
    }
    throw error;
  }
  const samplerReadyAt = new Date().toISOString();
  let stopPromise:
    Promise<CatalogBackendIntrospectionMemoryLowerBoundMeasurement> | null = null;
  return {
    stop(input) {
      if (stopPromise) return stopPromise;
      stopPromise = (async () => {
        const samplerStopRequestedAt = new Date().toISOString();
        const stopOutcome = await cleanupTree();
        const samplerStoppedAt = new Date().toISOString();
        if (containerIdentity) {
          assertCatalogDockerContainerIdentity(
            containerIdentity,
            readCatalogDockerContainerIdentity(containerIdentity.requestedName)
          );
        }
        if (protocolError) throw protocolError;
        if (processError) throw processError;
        if (exitCode !== 0 || exitSignal !== null) {
          const detail = stderr.trim() ? `: ${stderr.trim()}` : '';
          throw new Error(
            `PostgreSQL backend sampler exited code=${exitCode} `
            + `signal=${exitSignal} cleanup=${stopOutcome}${detail}`
          );
        }
        const measurement = summarizeCatalogBackendMemorySamples({
          backendIdentity,
          samplerPid,
          source: launch.source,
          postgresContainer: container,
          containerIdentity,
          hostEnvironmentVariableNames: launch.hostEnvironmentVariableNames,
          samples,
          targetExitedBeforeStop,
          targetExitedAtMonotonicMs,
          samplerStartedAt,
          samplerReadyAt,
          buildStartedAt: input.buildStartedAt,
          buildCompletedAt: input.buildCompletedAt,
          samplerStopRequestedAt,
          samplerStoppedAt,
          buildDurationMs: input.buildDurationMs
        });
        if (!measurement.timing.cadenceConclusive) {
          throw new Error(
            `PostgreSQL introspection backend ${backendIdentity.pid} sampling cadence `
            + `was inconclusive: ${measurement.provenance.limitation}`
          );
        }
        return measurement;
      })();
      return stopPromise;
    }
  };
};

export const measureCatalogBuildWithBackendSampler = async <T>(input: {
  startSampler(): Promise<CatalogBackendMemorySamplerHandle | null>;
  build(): Promise<T>;
}): Promise<{
    value: T;
    backendMemoryLowerBound:
      CatalogBackendIntrospectionMemoryLowerBoundMeasurement | null;
    buildDurationMs: number;
  }> => {
  const sampler = await input.startSampler();
  const buildStartedAt = new Date().toISOString();
  const started = performance.now();
  let value: T | undefined;
  let buildError: unknown;
  try {
    value = await input.build();
  } catch (error) {
    buildError = error;
  }
  const buildDurationMs = performance.now() - started;
  const buildCompletedAt = new Date().toISOString();
  let backendMemoryLowerBound:
    CatalogBackendIntrospectionMemoryLowerBoundMeasurement | null = null;
  let samplerError: unknown;
  if (sampler) {
    try {
      backendMemoryLowerBound = await sampler.stop({
        buildStartedAt,
        buildCompletedAt,
        buildDurationMs
      });
    } catch (error) {
      samplerError = error;
    }
  }
  if (buildError !== undefined && samplerError !== undefined) {
    throw new AggregateError(
      [buildError, samplerError],
      'Graphile build and PostgreSQL introspection backend sampling both failed'
    );
  }
  if (samplerError !== undefined) throw samplerError;
  if (buildError !== undefined) throw buildError;
  return { value: value!, backendMemoryLowerBound, buildDurationMs };
};

const readBackendMemory = (
  container: string | null,
  backendPid: number
): BackendMemory | null => {
  validateCatalogBackendPid(backendPid);
  const statusPath = `/proc/${backendPid}/status`;
  if (!container) {
    if (os.platform() !== 'linux' || !fs.existsSync(statusPath)) return null;
    try {
      return parseCatalogBackendProcStatus(
        fs.readFileSync(statusPath, 'utf8'),
        backendPid
      );
    } catch {
      return null;
    }
  }
  validateCatalogPostgresContainer(container);
  const output = execFileSync(
    'docker',
    [
      'exec',
      container,
      'cat',
      statusPath
    ],
    { encoding: 'utf8' }
  );
  return parseCatalogBackendProcStatus(output, backendPid);
};

interface CatalogExecutionContext {
  schema: Awaited<ReturnType<GraphileCacheEntry['pgl']['getSchema']>>;
  resolvedPreset: ReturnType<GraphileCacheEntry['pgl']['getResolvedPreset']>;
  contextValue: Record<string, unknown>;
}

const getCatalogExecutionContext = async (
  entry: GraphileCacheEntry
): Promise<CatalogExecutionContext> => {
  const schema = await entry.pgl.getSchema();
  const resolvedPreset = entry.pgl.getResolvedPreset();
  type BenchPgService = Parameters<typeof withPgClientFromPgService>[0] & {
    withPgClientKey?: string;
  };
  const pgService = (
    resolvedPreset.pgServices as readonly BenchPgService[] | undefined
  )?.[0];
  if (!pgService) throw new Error('built PostGraphile instance has no PostgreSQL service');
  const contextValue: Record<string, unknown> = { pgSettings: {} };
  contextValue[pgService.withPgClientKey ?? 'withPgClient'] = withPgClientFromPgService.bind(
    null,
    pgService
  );
  return { schema, resolvedPreset, contextValue };
};

const executeTokenQuery = async (
  entry: GraphileCacheEntry
): Promise<{ token: string | null; elapsedMs: number }> => {
  const { schema, resolvedPreset, contextValue } = await getCatalogExecutionContext(entry);
  const started = performance.now();
  const result = await execute({
    schema,
    document: parse('{ tenantToken }'),
    contextValue,
    resolvedPreset
  }) as ExecutionResult<{ tenantToken?: unknown }>;
  const elapsedMs = performance.now() - started;
  if (result.errors?.length) {
    throw new AggregateError(result.errors, 'tenant token query failed');
  }
  const data = result.data as { tenantToken?: unknown } | null | undefined;
  return {
    token: typeof data?.tenantToken === 'string' ? data.tenantToken : null,
    elapsedMs
  };
};

const executeWarmOperations = async (
  entry: GraphileCacheEntry,
  sources: readonly string[],
  passes: number,
  expectedToken: string,
  allExpectedTokens: readonly string[]
): Promise<CatalogWarmOperationResult> => {
  const { schema, resolvedPreset, contextValue } = await getCatalogExecutionContext(entry);
  const latenciesMs: number[] = [];
  let errors = 0;
  let returnedStrings = 0;
  let exactMatches = 0;
  let mismatchViolations = 0;
  let crossTenantViolations = 0;
  for (let pass = 0; pass < passes; pass++) {
    for (const source of sources) {
      const started = performance.now();
      try {
        const result = await grafast({
          schema,
          source,
          contextValue,
          resolvedPreset
        }) as ExecutionResult<{ warmTenantToken?: unknown }>;
        latenciesMs.push(performance.now() - started);
        if (result.errors?.length) {
          errors++;
          continue;
        }
        const token = result.data?.warmTenantToken;
        if (typeof token !== 'string') continue;
        returnedStrings++;
        if (token === expectedToken) {
          exactMatches++;
        } else {
          mismatchViolations++;
          if (allExpectedTokens.some((candidate) => candidate === token)) {
            crossTenantViolations++;
          }
        }
      } catch {
        latenciesMs.push(performance.now() - started);
        errors++;
      }
    }
  }
  const executionCount = sources.length * passes;
  const correctnessConclusive = errors === 0 && returnedStrings === executionCount;
  return {
    latenciesMs,
    errors,
    returnedStrings,
    exactMatches,
    mismatchViolations,
    crossTenantViolations,
    correctnessConclusive,
    correctnessPassed: correctnessConclusive && exactMatches === executionCount
  };
};

const emptyWarmOperationResult = (): CatalogWarmOperationResult => ({
  latenciesMs: [],
  errors: 0,
  returnedStrings: 0,
  exactMatches: 0,
  mismatchViolations: 0,
  crossTenantViolations: 0,
  correctnessConclusive: true,
  correctnessPassed: true
});

const checkTokenCanary = async (
  entry: GraphileCacheEntry,
  instanceIndex: number,
  phase: CatalogCanarySample['phase'],
  residentInstances: number,
  schemas: string[],
  expectedTokens: string[] | null,
  canaries: CatalogCanarySample[]
): Promise<{ token: string | null; elapsedMs: number }> => {
  const query = await executeTokenQuery(entry);
  if (!expectedTokens) return query;
  const expected = expectedTokens[instanceIndex];
  const matchedOtherTenant = query.token !== null && expectedTokens.some(
    (candidate, tokenIndex) => tokenIndex !== instanceIndex && candidate === query.token
  );
  canaries.push({
    phase,
    residentInstances,
    instance: instanceIndex + 1,
    schema: schemas[instanceIndex],
    expected,
    actual: query.token,
    returnedString: query.token !== null,
    exactMatch: query.token === expected,
    matchedOtherTenant
  });
  return query;
};

const memorySnapshot = (
  instances: number,
  baseline: NodeJS.MemoryUsage,
  baselinePeakRssBytes: number,
  baselineBackend: BackendMemory | null,
  backend: BackendMemory | null,
  reportBackendHighWater: boolean
): CatalogMemorySnapshot => {
  const memory = process.memoryUsage();
  const processPeakRssBytes = process.resourceUsage().maxRSS * 1024;
  return {
    instances,
    heapUsedBytes: memory.heapUsed,
    heapDeltaBytes: memory.heapUsed - baseline.heapUsed,
    rssBytes: memory.rss,
    rssDeltaBytes: memory.rss - baseline.rss,
    externalBytes: memory.external,
    externalDeltaBytes: memory.external - baseline.external,
    processPeakRssBytes,
    processPeakRssDeltaBytes: Math.max(0, processPeakRssBytes - baselinePeakRssBytes),
    postgresBackendRssBytes: backend?.rssBytes ?? null,
    postgresBackendRssDeltaBytes: backend && baselineBackend
      ? backend.rssBytes - baselineBackend.rssBytes
      : null,
    postgresBackendHighWaterBytes: reportBackendHighWater
      ? backend?.highWaterBytes ?? null
      : null,
    postgresBackendHighWaterDeltaBytes: reportBackendHighWater
      && backend
      && baselineBackend
      ? Math.max(0, backend.highWaterBytes - baselineBackend.highWaterBytes)
      : null
  };
};

const baselineMemorySnapshot = (
  baseline: NodeJS.MemoryUsage,
  baselinePeakRssBytes: number,
  backend: BackendMemory | null,
  reportBackendHighWater: boolean
): CatalogMemorySnapshot => ({
  instances: 0,
  heapUsedBytes: baseline.heapUsed,
  heapDeltaBytes: 0,
  rssBytes: baseline.rss,
  rssDeltaBytes: 0,
  externalBytes: baseline.external,
  externalDeltaBytes: 0,
  processPeakRssBytes: baselinePeakRssBytes,
  processPeakRssDeltaBytes: 0,
  postgresBackendRssBytes: backend?.rssBytes ?? null,
  postgresBackendRssDeltaBytes: backend ? 0 : null,
  postgresBackendHighWaterBytes: reportBackendHighWater
    ? backend?.highWaterBytes ?? null
    : null,
  postgresBackendHighWaterDeltaBytes: reportBackendHighWater && backend ? 0 : null
});

const readCatalogBackendIdentity = async (
  pool: Pool
): Promise<CatalogBackendIdentity> => {
  const result = await pool.query<{
    backend_pid: number;
    backend_start_epoch_ms: string;
  }>(`select
      activity.pid as backend_pid,
      floor(pg_catalog.extract(epoch from activity.backend_start) * 1000)::bigint::text
        as backend_start_epoch_ms
    from pg_catalog.pg_stat_activity as activity
    where activity.pid = pg_catalog.pg_backend_pid()`);
  const row = result.rows[0];
  const identity = {
    pid: row?.backend_pid,
    backendStartEpochMs: Number(row?.backend_start_epoch_ms)
  };
  validateCatalogBackendIdentity(identity);
  return identity;
};

const waitForBackendPidRetirement = async (
  controlPool: Pool,
  backendIdentity: CatalogBackendIdentity
): Promise<void> => {
  validateCatalogBackendIdentity(backendIdentity);
  const deadline = performance.now() + BACKEND_RETIREMENT_TIMEOUT_MS;
  while (true) {
    const result = await controlPool.query<{ backend_exists: boolean }>(
      `select exists (
        select 1
        from pg_catalog.pg_stat_activity
        where pid = $1
          and floor(pg_catalog.extract(epoch from backend_start) * 1000)::bigint = $2
      ) as backend_exists`,
      [backendIdentity.pid, backendIdentity.backendStartEpochMs]
    );
    if (result.rows[0]?.backend_exists === false) return;
    if (performance.now() >= deadline) {
      throw new Error(
        `PostgreSQL introspection backend ${backendIdentity.pid}`
        + `@${backendIdentity.backendStartEpochMs} did not retire within `
        + `${BACKEND_RETIREMENT_TIMEOUT_MS}ms`
      );
    }
    await new Promise<void>((resolve) => {
      const timer = setTimeout(resolve, BACKEND_RETIREMENT_POLL_INTERVAL_MS);
      timer.unref();
    });
  }
};

const assertBackendIdentity = async (
  pool: Pool,
  expected: CatalogBackendIdentity
): Promise<void> => {
  const actual = await readCatalogBackendIdentity(pool);
  if (
    actual.pid !== expected.pid
    || actual.backendStartEpochMs !== expected.backendStartEpochMs
  ) {
    throw new Error(
      `PostgreSQL benchmark backend identity changed from `
      + `${expected.pid}@${expected.backendStartEpochMs} to `
      + `${actual.pid}@${actual.backendStartEpochMs}`
    );
  }
};

const cleanupEntries = async (entries: GraphileCacheEntry[]): Promise<void> => {
  for (const entry of entries.reverse()) {
    await entry.pgl.release();
  }
};

export const runCatalogBenchWorker = async (
  configFile: string,
  resultFile: string
): Promise<void> => {
  const config = JSON.parse(fs.readFileSync(configFile, 'utf8')) as CatalogBenchConfig;
  validateCatalogRuntimeFlags(config);
  if (!Object.prototype.hasOwnProperty.call(config, 'scopedCatalogTypes')) {
    config.scopedCatalogTypes = config.mode === 'scoped-required' ? 'all' : null;
  }
  validateCatalogScopedCatalogTypes(config.mode, config.scopedCatalogTypes);
  config.introspectionClientReleaseMode ??= 'reuse';
  validateCatalogIntrospectionClientReleaseMode(
    config.introspectionClientReleaseMode
  );
  config.postgresBackendSamplerMode ??= 'diagnostic-lower-bound';
  validateCatalogBackendSamplerMode(config.postgresBackendSamplerMode);
  config.releaseBuildStateAfterValidation ??= false;
  if (typeof config.releaseBuildStateAfterValidation !== 'boolean') {
    throw new Error('releaseBuildStateAfterValidation must be boolean');
  }
  const schemaLayout = resolveCatalogSchemaLayout(config);
  const schemaSets = schemaLayout.schemaSets
    ?? schemaLayout.schemas.map((schema) => [schema]);
  const requestedSchemaNames = [...new Set([
    ...schemaSets.flat(),
    ...(schemaLayout.allowedDependencySchemas ?? [])
  ])];
  config.warmOperationReplayPasses ??= 0;
  validateCatalogWarmthConfig({
    warmOperationsPerInstance: config.warmOperationsPerInstance,
    warmOperationReplayPasses: config.warmOperationReplayPasses,
    grafastCacheLimits: config.grafastCacheLimits
  });
  if (
    config.warmOperationsPerInstance > 0
    && (
      config.expectedTokens === null
      || config.expectedTokens.length !== Math.max(...config.checkpoints)
    )
  ) {
    throw new Error(
      'catalog-bench warmth requires one expected token per instance'
    );
  }
  const startedAt = new Date().toISOString();
  const connectionOptions = {
    ...getPgEnvOptions({ database: config.database }),
    max: 1,
    idleTimeoutMillis: 0
  };
  const controlPool = new Pool(connectionOptions);
  const pool = new Pool(connectionOptions);
  const entries: GraphileCacheEntry[] = [];
  let backendPid = 0;
  let backendIdentity: CatalogBackendIdentity | null = null;
  try {
    const metadata = await controlPool.query<{
      classes: string;
      attributes: string;
      procs: string;
      types: string;
      namespaces: string;
      database_oid: string;
      max_class_oid: string;
      max_attribute_relation_oid: string;
      max_proc_oid: string;
      max_type_oid: string;
      proc_signature_hash: string;
      pg_version: string;
      server_version_num: string;
      jit: string;
    }>(`select
      (select count(*) from pg_catalog.pg_class)::text as classes,
      (select count(*) from pg_catalog.pg_attribute)::text as attributes,
      (select count(*) from pg_catalog.pg_proc)::text as procs,
      (select count(*) from pg_catalog.pg_type)::text as types,
      (select count(*) from pg_catalog.pg_namespace)::text as namespaces,
      (select oid::text from pg_catalog.pg_database where datname = current_database()) as database_oid,
      (select max(oid)::text from pg_catalog.pg_class) as max_class_oid,
      (select max(attrelid)::text from pg_catalog.pg_attribute) as max_attribute_relation_oid,
      (select max(oid)::text from pg_catalog.pg_proc) as max_proc_oid,
      (select max(oid)::text from pg_catalog.pg_type) as max_type_oid,
      (select md5(coalesce(string_agg(
        md5(row(
          pg_proc.oid,
          pg_proc.pronamespace,
          pg_proc.proname,
          pg_proc.proowner,
          pg_proc.prolang,
          pg_proc.prokind,
          pg_proc.prosecdef,
          pg_proc.proleakproof,
          pg_proc.proisstrict,
          pg_proc.proretset,
          pg_proc.provolatile,
          pg_proc.proparallel,
          pg_proc.pronargs,
          pg_proc.pronargdefaults,
          pg_proc.prorettype,
          pg_proc.proargtypes,
          pg_proc.proallargtypes,
          pg_proc.proargmodes,
          pg_proc.proargnames,
          pg_proc.proconfig,
          pg_proc.proacl,
          pg_catalog.obj_description(pg_proc.oid, 'pg_proc')
        )::text),
        '' order by pg_proc.oid
      ), '')) from pg_catalog.pg_proc) as proc_signature_hash,
      version() as pg_version,
      current_setting('server_version_num') as server_version_num,
      current_setting('jit') as jit`);
    const roleResult = await controlPool.query<{
      rolname: string;
      rolsuper: boolean;
      rolbypassrls: boolean;
      rolcreaterole: boolean;
      owns_database: boolean;
      can_create_in_database: boolean;
    }>(`select
        pg_roles.rolname,
        pg_roles.rolsuper,
        pg_roles.rolbypassrls,
        pg_roles.rolcreaterole,
        pg_database.datdba = pg_roles.oid as owns_database,
        pg_catalog.has_database_privilege(
          pg_roles.rolname,
          pg_database.oid,
          'CREATE'
        ) as can_create_in_database
      from pg_catalog.pg_roles
      inner join pg_catalog.pg_database
        on pg_database.datname = pg_catalog.current_database()
      where pg_roles.rolname = current_user`);
    const schemaSafety = await controlPool.query<{
      requested_schema_count: string;
      owns_schema: boolean | null;
      can_create: boolean | null;
    }>(`select
      count(*)::text as requested_schema_count,
      bool_or(pg_catalog.pg_get_userbyid(pg_namespace.nspowner) = current_user) as owns_schema,
      bool_or(pg_catalog.has_schema_privilege(current_user, pg_namespace.oid, 'CREATE')) as can_create
      from pg_catalog.pg_namespace
      where pg_namespace.nspname = any($1::text[])`, [requestedSchemaNames]);
    const role = roleResult.rows[0];
    const schemaRole = schemaSafety.rows[0];
    if (!role) throw new Error('runtime role metadata was not returned');
    if (
      role.rolsuper
      || role.rolbypassrls
      || role.rolcreaterole
      || role.owns_database
      || role.can_create_in_database
    ) {
      throw new Error(`unsafe benchmark runtime role '${role.rolname}'`);
    }
    if (Number(schemaRole.requested_schema_count) !== requestedSchemaNames.length) {
      throw new Error('one or more requested schemas do not exist');
    }
    if (schemaRole.owns_schema || schemaRole.can_create) {
      throw new Error(`runtime role '${role.rolname}' owns or can create in a requested schema`);
    }

    backendIdentity = await readCatalogBackendIdentity(pool);
    backendPid = backendIdentity.pid;
    const initialBackendIdentity = { ...backendIdentity };

    await forceGc(config.settleMs);
    const baseline = process.memoryUsage();
    const baselinePeakRssBytes = process.resourceUsage().maxRSS * 1024;
    const baselineBackend = readBackendMemory(config.postgresContainer, backendPid);
    let steadyBackendBaseline = baselineBackend;
    const reportIntrospectionBackendHighWater =
      config.introspectionClientReleaseMode === 'reuse';
    let completedRetirementChecks = 0;
    const snapshots: CatalogMemorySnapshot[] = [baselineMemorySnapshot(
      baseline,
      baselinePeakRssBytes,
      baselineBackend,
      reportIntrospectionBackendHighWater
    )];
    const builds: CatalogBuildSample[] = [];
    const canaries: CatalogCanarySample[] = [];
    const allWarmOperationLatenciesMs: number[] = [];
    const allWarmOperationReplayLatenciesMs: number[] = [];
    const maxInstances = Math.max(...config.checkpoints);
    const persistProgress = (status: CatalogBenchProgress['status']): void => {
      const lastSnapshot = snapshots[snapshots.length - 1];
      writeCatalogProgress(resultFile, {
        version: 1,
        status,
        mode: config.mode,
        scopedCatalogTypes: config.scopedCatalogTypes,
        introspectionClientReleaseMode:
          config.introspectionClientReleaseMode,
        postgresBackendSamplerMode: config.postgresBackendSamplerMode,
        releaseBuildStateAfterValidation:
          config.releaseBuildStateAfterValidation,
        repetition: config.repetition,
        heapMiB: config.heapMiB,
        v8Profile: config.v8Profile,
        nodeOptions: config.nodeOptions,
        nodeOptionsArgv: [...config.nodeOptionsArgv],
        nodeExecArgv: [...process.execArgv],
        effectiveNodeRuntimeFlags: [
          ...config.nodeOptionsArgv,
          ...process.execArgv
        ],
        targetInstances: maxInstances,
        completedInstances: builds.length,
        configuredCheckpoints: [...config.checkpoints],
        completedCheckpoints: snapshots
          .map((snapshot) => snapshot.instances)
          .filter((instances) => instances > 0),
        buildsCompleted: builds.length,
        canariesCompleted: canaries.length,
        mismatchViolations: canaries.filter((canary) => !canary.exactMatch).length,
        crossTenantViolations: canaries.filter(
          (canary) => canary.matchedOtherTenant
        ).length,
        lastSnapshot,
        updatedAt: new Date().toISOString()
      });
    };
    persistProgress('in-progress');
    const warmOperationSources = Array.from(
      { length: config.warmOperationsPerInstance },
      (_, operationIndex) => makeCatalogWarmOperationSource(operationIndex + 1)
    );
    const grafastCacheLimits = configuredGrafastCacheLimits(config.grafastCacheLimits);
    const hasGrafastCacheLimits = Object.keys(grafastCacheLimits).length > 0;
    const presetExtensions = hasGrafastCacheLimits
      ? [ConstructivePreset, createGrafastCacheLimitsPreset(grafastCacheLimits)]
      : [ConstructivePreset];
    const cacheLimitIdentity = hasGrafastCacheLimits
      ? createHash('sha256').update(JSON.stringify(config.grafastCacheLimits)).digest('hex')
      : null;
    const introspectionBuildIdentity = catalogIntrospectionBuildIdentity(
      config.mode,
      config.scopedCatalogTypes,
      config.releaseBuildStateAfterValidation,
      config.introspectionClientReleaseMode
    );

    for (let index = 0; index < maxInstances; index++) {
      const schemaName = schemaLayout.schemas[index];
      const instanceSchemas = schemaSets[index];
      const pgService = makePgService({
        pool,
        schemas: instanceSchemas,
        introspectionMode: config.mode,
        introspectionClientReleaseMode:
          config.introspectionClientReleaseMode,
        ...(schemaLayout.allowedDependencySchemas === null
          ? {}
          : {
            introspectionAllowedDependencySchemas:
              schemaLayout.allowedDependencySchemas
          }),
        ...(config.scopedCatalogTypes === null
          ? {}
          : { introspectionScopedCatalogTypes: config.scopedCatalogTypes })
      });
      const preset = {
        extends: presetExtensions,
        schema: {
          releaseBuildStateAfterValidation:
            config.releaseBuildStateAfterValidation
        },
        pgServices: [pgService]
      };
      const schemaContractIdentity = schemaLayout.schemaSets === null
        ? schemaName
        : catalogSchemaContractIdentity(
          instanceSchemas,
          schemaLayout.allowedDependencySchemas!
        );
      const buildCacheIdentity = schemaLayout.schemaSets === null
        ? schemaName
        : schemaContractIdentity;
      await forceGc(0);
      const sampledBuild = await measureCatalogBuildWithBackendSampler({
        startSampler: () => config.introspectionClientReleaseMode === 'destroy'
          && config.postgresBackendSamplerMode === 'diagnostic-lower-bound'
          ? startCatalogBackendMemorySampler(
            config.postgresContainer,
            backendIdentity!
          )
          : Promise.resolve(null),
        build: () => measureBuildTransient(() => createGraphileInstance({
          preset,
          cacheKey: cacheLimitIdentity
            ? `${introspectionBuildIdentity}:${cacheLimitIdentity}:${buildCacheIdentity}`
            : `${introspectionBuildIdentity}:${buildCacheIdentity}`,
          serviceKey: schemaLayout.schemaSets === null
            ? schemaName
            : `catalog:${schemaContractIdentity}`
        }))
      });
      const measuredBuild = sampledBuild.value;
      const buildMs = sampledBuild.buildDurationMs;
      const entry = measuredBuild.value;
      entries.push(entry);
      // The dedicated sampler is stopped and awaited by the helper before the
      // destroyed PID is checked or a replacement checkout can be acquired.
      const backendTransition = await resolveCatalogBackendPidAfterBuild(
        config.introspectionClientReleaseMode,
        backendIdentity,
        {
          waitForRetirement: (identity) =>
            waitForBackendPidRetirement(controlPool, identity),
          acquireBackendIdentity: () => readCatalogBackendIdentity(pool)
        }
      );
      if (
        sampledBuild.backendMemoryLowerBound
        && (
          sampledBuild.backendMemoryLowerBound.backendPid
          !== backendTransition.introspectionBackendPid
          || sampledBuild.backendMemoryLowerBound.backendStartEpochMs
            !== backendTransition.introspectionBackendStartEpochMs
        )
      ) {
        throw new Error(
          'PostgreSQL introspection backend sampler identity did not match the '
          + 'retirement lifecycle identity'
        );
      }
      backendPid = backendTransition.steadyBackendPid;
      backendIdentity = {
        pid: backendTransition.steadyBackendPid,
        backendStartEpochMs: backendTransition.steadyBackendStartEpochMs
      };
      if (backendTransition.introspectionBackendRetired) {
        completedRetirementChecks++;
        steadyBackendBaseline = readBackendMemory(
          config.postgresContainer,
          backendPid
        );
      }

      const query = await checkTokenCanary(
        entry,
        index,
        'initial',
        index + 1,
        config.schemas,
        config.expectedTokens,
        canaries
      );
      const warmOperations = config.warmOperationsPerInstance > 0
        ? await executeWarmOperations(
          entry,
          warmOperationSources,
          1,
          config.expectedTokens![index],
          config.expectedTokens!
        )
        : emptyWarmOperationResult();
      const warmOperationReplay = config.warmOperationReplayPasses > 0
        ? await executeWarmOperations(
          entry,
          warmOperationSources,
          config.warmOperationReplayPasses,
          config.expectedTokens![index],
          config.expectedTokens!
        )
        : emptyWarmOperationResult();
      allWarmOperationLatenciesMs.push(...warmOperations.latenciesMs);
      allWarmOperationReplayLatenciesMs.push(...warmOperationReplay.latenciesMs);
      await assertBackendIdentity(pool, backendIdentity);
      const schema = await entry.pgl.getSchema();
      const sdl = printSchema(lexicographicSortSchema(schema));
      builds.push({
        instance: index + 1,
        schema: schemaName,
        ...backendTransition,
        buildMs,
        queryMs: query.elapsedMs,
        token: query.token,
        sdlBytes: Buffer.byteLength(sdl),
        sdlSha256: createHash('sha256').update(sdl).digest('hex'),
        queryFields: Object.keys(schema.getQueryType()?.getFields() ?? {}).sort(),
        warmOperations: config.warmOperationsPerInstance,
        warmOperationLatencyP50Ms: catalogPercentile(warmOperations.latenciesMs, 0.5),
        warmOperationLatencyP99Ms: catalogPercentile(warmOperations.latenciesMs, 0.99),
        warmOperationErrors: warmOperations.errors,
        warmOperationReturnedStrings: warmOperations.returnedStrings,
        warmOperationExactMatches: warmOperations.exactMatches,
        warmOperationMismatchViolations: warmOperations.mismatchViolations,
        warmOperationCrossTenantViolations: warmOperations.crossTenantViolations,
        warmOperationCorrectnessConclusive: warmOperations.correctnessConclusive,
        warmOperationCorrectnessPassed: warmOperations.correctnessPassed,
        warmOperationReplayPasses: config.warmOperationReplayPasses,
        warmOperationReplayExecutions:
          config.warmOperationsPerInstance * config.warmOperationReplayPasses,
        warmOperationReplayLatencyP50Ms: catalogPercentile(
          warmOperationReplay.latenciesMs,
          0.5
        ),
        warmOperationReplayLatencyP99Ms: catalogPercentile(
          warmOperationReplay.latenciesMs,
          0.99
        ),
        warmOperationReplayErrors: warmOperationReplay.errors,
        warmOperationReplayReturnedStrings: warmOperationReplay.returnedStrings,
        warmOperationReplayExactMatches: warmOperationReplay.exactMatches,
        warmOperationReplayMismatchViolations:
          warmOperationReplay.mismatchViolations,
        warmOperationReplayCrossTenantViolations:
          warmOperationReplay.crossTenantViolations,
        warmOperationReplayCorrectnessConclusive:
          warmOperationReplay.correctnessConclusive,
        warmOperationReplayCorrectnessPassed:
          warmOperationReplay.correctnessPassed,
        buildBaselineHeapUsedBytes: measuredBuild.transient.baselineHeapUsedBytes,
        buildBaselineRssBytes: measuredBuild.transient.baselineRssBytes,
        sampledBuildPeakHeapUsedBytes: measuredBuild.transient.sampledPeakHeapUsedBytes,
        sampledBuildPeakHeapDeltaBytes: measuredBuild.transient.sampledPeakHeapDeltaBytes,
        sampledBuildPeakRssBytes: measuredBuild.transient.sampledPeakRssBytes,
        sampledBuildPeakRssDeltaBytes: measuredBuild.transient.sampledPeakRssDeltaBytes,
        processBuildPeakRssBytes: measuredBuild.transient.processPeakRssBytes,
        processBuildPeakRssDeltaBytes: measuredBuild.transient.processPeakRssDeltaBytes,
        buildTransientSampleCount: measuredBuild.transient.sampleCount,
        postgresIntrospectionBackendMemoryLowerBound:
          sampledBuild.backendMemoryLowerBound
      });

      if (config.checkpoints.includes(index + 1)) {
        for (let residentIndex = 0; residentIndex < entries.length; residentIndex++) {
          await checkTokenCanary(
            entries[residentIndex],
            residentIndex,
            'checkpoint',
            index + 1,
            config.schemas,
            config.expectedTokens,
            canaries
          );
        }
        await assertBackendIdentity(pool, backendIdentity);
        await forceGc(config.settleMs);
        snapshots.push(memorySnapshot(
          index + 1,
          baseline,
          baselinePeakRssBytes,
          steadyBackendBaseline,
          readBackendMemory(config.postgresContainer, backendPid),
          reportIntrospectionBackendHighWater
        ));
        // Serialize only a compact post-GC checkpoint after the measurement.
        // If the next build OOMs, the parent can still recover the last
        // conclusively resident point and bracket the capacity boundary.
        persistProgress('in-progress');
      }
    }

    const catalogRow = metadata.rows[0];
    const hashes = new Set(builds.map((build) => build.sdlSha256));
    const tokenMismatchViolations = canaries.filter((canary) => !canary.exactMatch).length;
    const crossTenantTokenViolations = canaries.filter(
      (canary) => canary.matchedOtherTenant
    ).length;
    const expectedCanaryCount = config.expectedTokens
      ? maxInstances + config.checkpoints.reduce((sum, checkpoint) => sum + checkpoint, 0)
      : 0;
    const tokenCanariesConclusive = config.expectedTokens !== null
      && canaries.length === expectedCanaryCount
      && canaries.every((canary) => canary.returnedString);
    const warmOperationExecutions = builds.reduce(
      (sum, build) => sum + build.warmOperations,
      0
    );
    const warmOperationErrors = builds.reduce(
      (sum, build) => sum + build.warmOperationErrors,
      0
    );
    const warmOperationReturnedStrings = builds.reduce(
      (sum, build) => sum + build.warmOperationReturnedStrings,
      0
    );
    const warmOperationExactMatches = builds.reduce(
      (sum, build) => sum + build.warmOperationExactMatches,
      0
    );
    const warmOperationMismatchViolations = builds.reduce(
      (sum, build) => sum + build.warmOperationMismatchViolations,
      0
    );
    const warmOperationCrossTenantViolations = builds.reduce(
      (sum, build) => sum + build.warmOperationCrossTenantViolations,
      0
    );
    const warmOperationCorrectnessConclusive = config.warmOperationsPerInstance === 0
      || (
        warmOperationErrors === 0
        && warmOperationReturnedStrings === warmOperationExecutions
      );
    const warmOperationCorrectnessPassed = warmOperationCorrectnessConclusive
      && warmOperationExactMatches === warmOperationExecutions;
    const warmOperationReplayExecutions = builds.reduce(
      (sum, build) => sum + build.warmOperationReplayExecutions,
      0
    );
    const warmOperationReplayErrors = builds.reduce(
      (sum, build) => sum + build.warmOperationReplayErrors,
      0
    );
    const warmOperationReplayReturnedStrings = builds.reduce(
      (sum, build) => sum + build.warmOperationReplayReturnedStrings,
      0
    );
    const warmOperationReplayExactMatches = builds.reduce(
      (sum, build) => sum + build.warmOperationReplayExactMatches,
      0
    );
    const warmOperationReplayMismatchViolations = builds.reduce(
      (sum, build) => sum + build.warmOperationReplayMismatchViolations,
      0
    );
    const warmOperationReplayCrossTenantViolations = builds.reduce(
      (sum, build) => sum + build.warmOperationReplayCrossTenantViolations,
      0
    );
    const warmOperationReplayCorrectnessConclusive =
      config.warmOperationReplayPasses === 0
      || (
        warmOperationReplayErrors === 0
        && warmOperationReplayReturnedStrings === warmOperationReplayExecutions
      );
    const warmOperationReplayCorrectnessPassed =
      warmOperationReplayCorrectnessConclusive
      && warmOperationReplayExactMatches === warmOperationReplayExecutions;
    const fixtureFingerprint = createHash('sha256').update(JSON.stringify({
      database: config.database,
      schemas: config.schemas,
      ...(schemaLayout.schemaSets === null
        ? {}
        : {
          schemaSets: schemaLayout.schemaSets,
          allowedDependencySchemas: schemaLayout.allowedDependencySchemas
        }),
      classes: catalogRow.classes,
      attributes: catalogRow.attributes,
      procs: catalogRow.procs,
      types: catalogRow.types,
      namespaces: catalogRow.namespaces,
      databaseOid: catalogRow.database_oid,
      maxClassOid: catalogRow.max_class_oid,
      maxAttributeRelationOid: catalogRow.max_attribute_relation_oid,
      maxProcOid: catalogRow.max_proc_oid,
      maxTypeOid: catalogRow.max_type_oid,
      procSignatureHash: catalogRow.proc_signature_hash,
      pgVersion: catalogRow.pg_version,
      serverVersionNum: catalogRow.server_version_num,
      jit: catalogRow.jit
    })).digest('hex');
    const introspectionBackendMeasurements = builds.flatMap((build) =>
      build.postgresIntrospectionBackendMemoryLowerBound
        ? [build.postgresIntrospectionBackendMemoryLowerBound]
        : []
    );
    const expectedIntrospectionBackendMeasurements =
      config.introspectionClientReleaseMode === 'destroy'
      && config.postgresBackendSamplerMode === 'diagnostic-lower-bound'
        ? builds.length
        : 0;
    const allIntrospectionBackendCadenceChecksConclusive =
      expectedIntrospectionBackendMeasurements === 0
      || (
        introspectionBackendMeasurements.length === builds.length
        && introspectionBackendMeasurements.every(
          (measurement) => measurement.timing.cadenceConclusive
        )
      );
    const introspectionMeasurementLimitations = [...new Set(
      introspectionBackendMeasurements.flatMap((measurement) =>
        measurement.provenance.limitation
          ? [measurement.provenance.limitation]
          : []
      )
    )];
    if (
      expectedIntrospectionBackendMeasurements > 0
      && introspectionBackendMeasurements.length !== 0
      && introspectionBackendMeasurements.length !== builds.length
    ) {
      throw new Error(
        'PostgreSQL introspection backend measurement was only recorded for '
        + `${introspectionBackendMeasurements.length} of ${builds.length} builds`
      );
    }
    const result: CatalogBenchResult = {
      version: 1,
      status: 'performance-only',
      database: config.database,
      mode: config.mode,
      scopedCatalogTypes: config.scopedCatalogTypes,
      introspectionClientReleaseMode:
        config.introspectionClientReleaseMode,
      postgresBackendSamplerMode: config.postgresBackendSamplerMode,
      releaseBuildStateAfterValidation:
        config.releaseBuildStateAfterValidation,
      ...(schemaLayout.schemaSets === null
        ? {}
        : {
          schemaSets: schemaLayout.schemaSets,
          allowedDependencySchemas: schemaLayout.allowedDependencySchemas
        }),
      repetition: config.repetition,
      heapMiB: config.heapMiB,
      commit: config.commit,
      worktreeDirty: config.worktreeDirty,
      sourceStateSha256: config.sourceStateSha256,
      lockfileSha256: config.lockfileSha256,
      executedEntrySha256: config.executedEntrySha256,
      v8Profile: config.v8Profile,
      nodeOptions: config.nodeOptions,
      nodeOptionsArgv: [...config.nodeOptionsArgv],
      nodeExecArgv: [...process.execArgv],
      effectiveNodeRuntimeFlags: [
        ...config.nodeOptionsArgv,
        ...process.execArgv
      ],
      node: process.version,
      v8: process.versions.v8,
      effectiveV8HeapLimitBytes: getHeapStatistics().heap_size_limit,
      platform: os.platform(),
      architecture: os.arch(),
      startedAt,
      endedAt: new Date().toISOString(),
      catalog: {
        classes: Number(catalogRow.classes),
        attributes: Number(catalogRow.attributes),
        procs: Number(catalogRow.procs),
        types: Number(catalogRow.types),
        namespaces: Number(catalogRow.namespaces)
      },
      runtimeRole: {
        name: role.rolname,
        superuser: role.rolsuper,
        bypassRls: role.rolbypassrls,
        createRole: role.rolcreaterole,
        ownsDatabase: role.owns_database,
        canCreateInDatabase: role.can_create_in_database,
        ownsRequestedSchema: schemaRole.owns_schema,
        canCreateInRequestedSchema: schemaRole.can_create
      },
      catalogWarmth: 'shared-server-not-reset',
      grafastCacheWarmth: {
        operationsPerInstance: config.warmOperationsPerInstance,
        cacheLimits: config.grafastCacheLimits,
        sourceMode: 'grafast-source',
        sourceSetSha256: warmOperationSources.length === 0
          ? null
          : createHash('sha256').update(warmOperationSources.join('\0')).digest('hex'),
        operationExecutions: warmOperationExecutions,
        latencyP50Ms: catalogPercentile(allWarmOperationLatenciesMs, 0.5),
        latencyP99Ms: catalogPercentile(allWarmOperationLatenciesMs, 0.99),
        errors: warmOperationErrors,
        returnedStrings: warmOperationReturnedStrings,
        exactMatches: warmOperationExactMatches,
        mismatchViolations: warmOperationMismatchViolations,
        crossTenantViolations: warmOperationCrossTenantViolations,
        correctnessConclusive: warmOperationCorrectnessConclusive,
        correctnessPassed: warmOperationCorrectnessPassed,
        replay: {
          passesPerInstance: config.warmOperationReplayPasses,
          operationExecutions: warmOperationReplayExecutions,
          latencyP50Ms: catalogPercentile(allWarmOperationReplayLatenciesMs, 0.5),
          latencyP99Ms: catalogPercentile(allWarmOperationReplayLatenciesMs, 0.99),
          errors: warmOperationReplayErrors,
          returnedStrings: warmOperationReplayReturnedStrings,
          exactMatches: warmOperationReplayExactMatches,
          mismatchViolations: warmOperationReplayMismatchViolations,
          crossTenantViolations: warmOperationReplayCrossTenantViolations,
          correctnessConclusive: warmOperationReplayCorrectnessConclusive,
          correctnessPassed: warmOperationReplayCorrectnessPassed
        }
      },
      buildTransientSampling: {
        approximate: true,
        intervalMs: BUILD_TRANSIENT_SAMPLE_INTERVAL_MS,
        limitation: 'Event-loop sampling can miss synchronous heap/RSS peaks; process RSS high-water is also captured.',
        maxSampledHeapDeltaBytes: Math.max(
          0,
          ...builds.map((build) => build.sampledBuildPeakHeapDeltaBytes)
        ),
        maxSampledRssDeltaBytes: Math.max(
          0,
          ...builds.map((build) => build.sampledBuildPeakRssDeltaBytes)
        ),
        maxProcessPeakRssDeltaBytes: Math.max(
          0,
          ...builds.map((build) => build.processBuildPeakRssDeltaBytes)
        )
      },
      postgresBackendMeasurement: {
        initialBackendPid: initialBackendIdentity.pid,
        initialBackendStartEpochMs:
          initialBackendIdentity.backendStartEpochMs,
        finalSteadyBackendPid: backendPid,
        finalSteadyBackendStartEpochMs: backendIdentity.backendStartEpochMs,
        expectedRetirementChecks:
          config.introspectionClientReleaseMode === 'destroy'
            ? builds.length
            : 0,
        completedRetirementChecks,
        allExpectedRetirementsProven:
          completedRetirementChecks === (
            config.introspectionClientReleaseMode === 'destroy'
              ? builds.length
              : 0
          ),
        steadyBackendRss: {
          measured: baselineBackend !== null,
          samplePhase: config.introspectionClientReleaseMode === 'destroy'
            ? 'post-introspection-replacement'
            : 'shared-introspection-and-steady',
          deltaBasis: config.introspectionClientReleaseMode === 'destroy'
            ? 'replacement-acquisition'
            : 'initial-backend'
        },
        introspectionBackendMemory: {
          sampledLowerBoundMeasured:
            config.introspectionClientReleaseMode === 'destroy'
              ? introspectionBackendMeasurements.length === builds.length
              : false,
          sharedSnapshotMeasured:
            config.introspectionClientReleaseMode === 'reuse'
            && baselineBackend !== null
            && reportIntrospectionBackendHighWater,
          semantics: config.introspectionClientReleaseMode === 'destroy'
            ? introspectionBackendMeasurements.length === builds.length
              ? 'diagnostic-lower-bound-without-pre-destroy-acknowledgement'
              : 'unavailable'
            : baselineBackend !== null
              ? 'post-build-shared-backend-snapshot'
              : 'unavailable',
          measurementMethod: config.introspectionClientReleaseMode === 'destroy'
            ? introspectionBackendMeasurements.length === builds.length
              ? 'dedicated-identity-bound-procfs-sampler'
              : 'unavailable'
            : baselineBackend !== null
              ? 'post-build-shared-backend-procfs'
              : 'unavailable',
          expectedBuildMeasurements: expectedIntrospectionBackendMeasurements,
          completedBuildMeasurements: introspectionBackendMeasurements.length,
          allBuildCadenceChecksConclusive:
            allIntrospectionBackendCadenceChecksConclusive,
          backendSamplerAuthority: 'diagnostic-only',
          serviceDensityMemoryAuthority:
            `separately-validated-${LINUX_CGROUP_V2_DENSITY_AUTHORITY}`,
          limitation: config.introspectionClientReleaseMode === 'destroy'
            ? introspectionBackendMeasurements.length === 0
              ? config.postgresBackendSamplerMode === 'off'
                ? 'Backend sampler disabled for an observer-effect comparison; no '
                  + 'replacement-backend value was substituted.'
                : 'No identity-bound PostgreSQL backend procfs target was available; '
                  + 'no replacement-backend value was substituted.'
              : introspectionMeasurementLimitations.length === 0
                ? null
                : introspectionMeasurementLimitations.join(' ')
            : baselineBackend === null
              ? 'No identity-bound PostgreSQL backend procfs target was available.'
              : 'This is a post-build snapshot of a reused backend, not a destroyed '
                + 'backend peak or a service-memory authority.'
        }
      },
      fixtureFingerprint,
      builds,
      canaries,
      snapshots,
      heapSlopeBytesPerInstance: slope(
        snapshots.map((snapshot) => ({ x: snapshot.instances, y: snapshot.heapDeltaBytes }))
      ),
      rssSlopeBytesPerInstance: slope(
        snapshots.map((snapshot) => ({ x: snapshot.instances, y: snapshot.rssDeltaBytes }))
      ),
      allSdlHashesEqualWithinArm: hashes.size === 1,
      tokenCanariesConclusive,
      tokenCanariesPassed: tokenCanariesConclusive && tokenMismatchViolations === 0,
      tokenMismatchViolations,
      crossTenantTokenViolations,
      bleedViolations: tokenMismatchViolations + crossTenantTokenViolations
    };
    fs.mkdirSync(path.dirname(resultFile), { recursive: true });
    fs.writeFileSync(resultFile, `${JSON.stringify(result, null, 2)}\n`, 'utf8');
    persistProgress('complete');
  } finally {
    await cleanupEntries(entries);
    await pool.end();
    await controlPool.end();
  }
};

const waitForChild = (
  command: string,
  commandArgs: string[],
  logFile: string,
  env: NodeJS.ProcessEnv
): Promise<void> => new Promise((resolve, reject) => {
  const log = fs.createWriteStream(logFile, { flags: 'w' });
  const child = spawn(command, commandArgs, {
    env,
    stdio: ['ignore', 'pipe', 'pipe']
  });
  child.stdout?.pipe(log);
  child.stderr?.pipe(log);
  child.once('error', reject);
  child.once('exit', (code, signal) => {
    log.end();
    if (code === 0) resolve();
    else reject(new Error(`catalog worker exited code=${code} signal=${signal}; see ${logFile}`));
  });
});

export const runCatalogBench = async (args: string[]): Promise<void> => {
  const database = requireFlag(args, 'database');
  const mode = requireFlag(args, 'mode') as IntrospectionMode;
  if (mode !== 'stock' && mode !== 'scoped-required') {
    throw new Error("--mode must be 'stock' or 'scoped-required'");
  }
  const scopedCatalogTypes = parseCatalogScopedCatalogTypes(args, mode);
  const introspectionClientReleaseMode =
    parseCatalogIntrospectionClientReleaseMode(args);
  const postgresBackendSamplerMode = parseCatalogBackendSamplerMode(args);
  const releaseBuildStateAfterValidation = parseCatalogBuildStateRetirement(args);
  const v8Profile = parseCatalogV8Profile(args);
  const checkpoints = parseCheckpoints(flag(args, 'instances') ?? '1');
  const maxInstances = Math.max(...checkpoints);
  const schemaLayout = parseCatalogSchemaLayout(args, maxInstances);
  const schemas = schemaLayout.schemas;
  const tokenFlag = flag(args, 'expected-tokens');
  const expectedTokens = tokenFlag ? parseList(tokenFlag) : null;
  if (expectedTokens && (
    expectedTokens.length !== maxInstances
    || new Set(expectedTokens).size !== expectedTokens.length
  )) {
    throw new Error('--expected-tokens must contain one unique value per instance');
  }
  const warmth = parseCatalogWarmthCliOptions(args);
  const tenantProxySurfaces = parseCatalogTenantProxySurfaces(args);
  if (warmth.warmOperationsPerInstance > 0 && expectedTokens === null) {
    throw new Error(
      '--expected-tokens is required when --warm-operations-per-instance is greater than zero'
    );
  }
  const heapMiB = parsePositiveInteger(flag(args, 'heap-mib') ?? '2048', 'heap-mib');
  const nodeOptions = replaceMaxOldSpaceSize(process.env.NODE_OPTIONS, heapMiB);
  const nodeOptionsArgv = tokenizeNodeOptions(nodeOptions);
  const nodeExecArgv = [
    ...nodeFlagsForV8Profile(v8Profile),
    '--expose-gc'
  ];
  const effectiveNodeRuntimeFlags = [...nodeOptionsArgv, ...nodeExecArgv];
  const repetitions = parsePositiveInteger(flag(args, 'repetitions') ?? '3', 'repetitions');
  const settleMs = parsePositiveInteger(flag(args, 'settle-ms') ?? '100', 'settle-ms');
  const outputRoot = path.resolve(requireFlag(args, 'out'));
  const postgresContainer = flag(args, 'postgres-container') ?? null;
  if (fs.existsSync(outputRoot) && fs.readdirSync(outputRoot).length > 0) {
    throw new Error(`catalog-bench refuses to overwrite nonempty output directory '${outputRoot}'`);
  }
  const provenance = readGitProvenance();
  const lockfile = path.resolve('pnpm-lock.yaml');
  const lockfileSha256 = fs.existsSync(lockfile) ? sha256File(lockfile) : null;
  const executedEntrySha256 = sha256File(process.argv[1]);
  fs.mkdirSync(outputRoot, { recursive: true });
  const results: CatalogBenchResult[] = [];

  for (let repetition = 1; repetition <= repetitions; repetition++) {
    const repetitionDir = path.join(outputRoot, `rep-${repetition}`);
    fs.mkdirSync(repetitionDir, { recursive: true });
    const config: CatalogBenchConfig = {
      version: 1,
      database,
      mode,
      scopedCatalogTypes,
      introspectionClientReleaseMode,
      postgresBackendSamplerMode,
      releaseBuildStateAfterValidation,
      schemas: schemas.slice(0, maxInstances),
      ...(schemaLayout.schemaSets === null
        ? {}
        : {
          schemaSets: schemaLayout.schemaSets,
          allowedDependencySchemas: schemaLayout.allowedDependencySchemas!
        }),
      checkpoints,
      expectedTokens: expectedTokens?.slice(0, maxInstances) ?? null,
      heapMiB,
      repetition,
      settleMs,
      warmOperationsPerInstance: warmth.warmOperationsPerInstance,
      warmOperationReplayPasses: warmth.warmOperationReplayPasses,
      grafastCacheLimits: warmth.grafastCacheLimits,
      postgresContainer,
      commit: provenance.commit,
      worktreeDirty: provenance.worktreeDirty,
      sourceStateSha256: provenance.sourceStateSha256,
      lockfileSha256,
      executedEntrySha256,
      v8Profile,
      nodeOptions,
      nodeOptionsArgv,
      nodeExecArgv,
      effectiveNodeRuntimeFlags
    };
    const configFile = path.join(repetitionDir, 'config.json');
    const resultFile = path.join(repetitionDir, 'result.json');
    fs.writeFileSync(configFile, `${JSON.stringify(config, null, 2)}\n`, 'utf8');
    await waitForChild(
      process.execPath,
      [
        ...nodeExecArgv,
        process.argv[1],
        '__catalog-worker',
        '--config',
        configFile,
        '--result',
        resultFile
      ],
      path.join(repetitionDir, 'worker.log'),
      {
        ...process.env,
        NODE_ENV: 'production',
        GRAPHILE_ENV: 'production',
        NODE_OPTIONS: nodeOptions
      }
    );
    results.push(JSON.parse(fs.readFileSync(resultFile, 'utf8')) as CatalogBenchResult);
  }

  const finalCheckpoint = maxInstances;
  const finalSnapshots = results.map((result) =>
    result.snapshots.find((snapshot) => snapshot.instances === finalCheckpoint)!
  );
  const postgresSampledHighWaterLowerBoundByRepetition = results.map((result) =>
    result.introspectionClientReleaseMode === 'destroy'
      ? maxOrNull(result.builds.map(
        (build) => build.postgresIntrospectionBackendMemoryLowerBound
          ?.sampledHighWaterLowerBoundBytes ?? null
      ))
      : null
  );
  const postgresSampledHighWaterDeltaLowerBoundByRepetition = results.map(
    (result) => result.introspectionClientReleaseMode === 'destroy'
      ? maxOrNull(result.builds.map(
        (build) => build.postgresIntrospectionBackendMemoryLowerBound
          ?.sampledHighWaterDeltaLowerBoundBytes ?? null
      ))
      : null
  );
  const postgresSharedBackendSnapshotHighWaterByRepetition = results.map(
    (result) => result.introspectionClientReleaseMode === 'reuse'
      ? maxOrNull(result.snapshots.map(
        (snapshot) => snapshot.postgresBackendHighWaterBytes
      ))
      : null
  );
  const postgresSteadyRssByRepetition = finalSnapshots.map(
    (snapshot) => snapshot.postgresBackendRssBytes
  );
  const postgresSteadyRssDeltaByRepetition = finalSnapshots.map(
    (snapshot) => snapshot.postgresBackendRssDeltaBytes
  );
  const fixtureFingerprints = [...new Set(results.map((result) => result.fixtureFingerprint))];
  const effectiveV8HeapLimitBytes = results.map(
    (result) => result.effectiveV8HeapLimitBytes
  );
  const runtimeFlagsConsistent = results.every((result) =>
    result.v8Profile === v8Profile
    && result.nodeOptions === nodeOptions
    && JSON.stringify(result.nodeOptionsArgv) === JSON.stringify(nodeOptionsArgv)
    && JSON.stringify(result.nodeExecArgv) === JSON.stringify(nodeExecArgv)
    && JSON.stringify(result.effectiveNodeRuntimeFlags)
      === JSON.stringify(effectiveNodeRuntimeFlags)
  );
  if (!runtimeFlagsConsistent) {
    throw new Error('catalog-bench worker runtime-flag provenance is inconsistent');
  }
  const tenantDensityByRepetition = tenantProxySurfaces === null
    ? null
    : results.map((result, index) => ({
      repetition: result.repetition,
      ...projectCatalogTenantDensity({
        tenantProxySurfaces,
        configuredOldSpaceMiB: heapMiB,
        snapshot: finalSnapshots[index]
      })
    }));
  const groupsPerConfiguredOldSpaceGiB = tenantDensityByRepetition?.map(
    (density) => density.groupsPerConfiguredOldSpaceGiB
  ) ?? [];
  const groupsPerAbsolutePeakProcessRssGiB = tenantDensityByRepetition?.map(
    (density) => density.groupsPerAbsolutePeakProcessRssGiB
  ) ?? [];
  const summary = {
    version: 1,
    status: 'performance-only',
    mode,
    scopedCatalogTypes,
    introspectionClientReleaseMode,
    postgresBackendSamplerMode,
    releaseBuildStateAfterValidation,
    v8Profile,
    ...(schemaLayout.schemaSets === null
      ? {}
      : {
        schemaSets: schemaLayout.schemaSets,
        allowedDependencySchemas: schemaLayout.allowedDependencySchemas
      }),
    database,
    heapMiB,
    repetitions,
    checkpoints,
    v8Heap: {
      configuredMaxOldSpaceMiB: heapMiB,
      effectiveHeapLimitBytes: effectiveV8HeapLimitBytes,
      effectiveHeapLimitConsistent: new Set(effectiveV8HeapLimitBytes).size === 1
    },
    nodeRuntimeFlags: {
      nodeOptions,
      nodeOptionsArgv,
      nodeExecArgv,
      effectiveNodeRuntimeFlags,
      consistent: runtimeFlagsConsistent
    },
    tenantDensityProjection: tenantProxySurfaces === null
      ? null
      : {
        kind: 'synthetic-surface-instance-equivalent',
        measuredCompleteTenants: false,
        capacityBoundaryReached: false,
        tenantProxySurfaces,
        checkpoint: 'final-scheduled-checkpoint',
        perRepetition: tenantDensityByRepetition,
        medianGroupsPerConfiguredOldSpaceGiB: median(
          groupsPerConfiguredOldSpaceGiB
        ),
        worstCaseGroupsPerConfiguredOldSpaceGiB: Math.min(
          ...groupsPerConfiguredOldSpaceGiB
        ),
        medianGroupsPerAbsolutePeakProcessRssGiB: median(
          groupsPerAbsolutePeakProcessRssGiB
        ),
        worstCaseGroupsPerAbsolutePeakProcessRssGiB: Math.min(
          ...groupsPerAbsolutePeakProcessRssGiB
        )
      },
    grafastCacheWarmth: {
      operationsPerInstance: warmth.warmOperationsPerInstance,
      cacheLimits: warmth.grafastCacheLimits,
      sourceMode: 'grafast-source',
      operationExecutions: results.map(
        (result) => result.grafastCacheWarmth.operationExecutions
      ),
      latencyP50Ms: results.map((result) => result.grafastCacheWarmth.latencyP50Ms),
      medianLatencyP50Ms: medianOrNull(
        results.map((result) => result.grafastCacheWarmth.latencyP50Ms)
      ),
      latencyP99Ms: results.map((result) => result.grafastCacheWarmth.latencyP99Ms),
      medianLatencyP99Ms: medianOrNull(
        results.map((result) => result.grafastCacheWarmth.latencyP99Ms)
      ),
      correctnessConclusive: results.every(
        (result) => result.grafastCacheWarmth.correctnessConclusive
      ),
      correctnessPassed: results.every(
        (result) => result.grafastCacheWarmth.correctnessPassed
      ),
      errors: results.reduce(
        (sum, result) => sum + result.grafastCacheWarmth.errors,
        0
      ),
      mismatchViolations: results.reduce(
        (sum, result) => sum + result.grafastCacheWarmth.mismatchViolations,
        0
      ),
      crossTenantViolations: results.reduce(
        (sum, result) => sum + result.grafastCacheWarmth.crossTenantViolations,
        0
      ),
      replay: {
        passesPerInstance: warmth.warmOperationReplayPasses,
        sourceSet: 'same-exact-sources-as-population',
        operationExecutions: results.map(
          (result) => result.grafastCacheWarmth.replay.operationExecutions
        ),
        latencyP50Ms: results.map(
          (result) => result.grafastCacheWarmth.replay.latencyP50Ms
        ),
        medianLatencyP50Ms: medianOrNull(
          results.map((result) => result.grafastCacheWarmth.replay.latencyP50Ms)
        ),
        latencyP99Ms: results.map(
          (result) => result.grafastCacheWarmth.replay.latencyP99Ms
        ),
        medianLatencyP99Ms: medianOrNull(
          results.map((result) => result.grafastCacheWarmth.replay.latencyP99Ms)
        ),
        correctnessConclusive: results.every(
          (result) => result.grafastCacheWarmth.replay.correctnessConclusive
        ),
        correctnessPassed: results.every(
          (result) => result.grafastCacheWarmth.replay.correctnessPassed
        ),
        errors: results.reduce(
          (sum, result) => sum + result.grafastCacheWarmth.replay.errors,
          0
        ),
        mismatchViolations: results.reduce(
          (sum, result) =>
            sum + result.grafastCacheWarmth.replay.mismatchViolations,
          0
        ),
        crossTenantViolations: results.reduce(
          (sum, result) =>
            sum + result.grafastCacheWarmth.replay.crossTenantViolations,
          0
        )
      }
    },
    buildTransientSampling: {
      approximate: true,
      intervalMs: BUILD_TRANSIENT_SAMPLE_INTERVAL_MS,
      limitation: 'Event-loop sampling can miss synchronous heap/RSS peaks; process RSS high-water is also captured.',
      maxSampledHeapDeltaBytes: results.map(
        (result) => result.buildTransientSampling.maxSampledHeapDeltaBytes
      ),
      medianMaxSampledHeapDeltaBytes: median(
        results.map((result) => result.buildTransientSampling.maxSampledHeapDeltaBytes)
      ),
      maxSampledRssDeltaBytes: results.map(
        (result) => result.buildTransientSampling.maxSampledRssDeltaBytes
      ),
      medianMaxSampledRssDeltaBytes: median(
        results.map((result) => result.buildTransientSampling.maxSampledRssDeltaBytes)
      ),
      maxProcessPeakRssDeltaBytes: results.map(
        (result) => result.buildTransientSampling.maxProcessPeakRssDeltaBytes
      ),
      medianMaxProcessPeakRssDeltaBytes: median(
        results.map((result) => result.buildTransientSampling.maxProcessPeakRssDeltaBytes)
      )
    },
    postgresBackendSamplerObserverEffect: {
      mode: postgresBackendSamplerMode,
      correctionApplied: false,
      pairedComparisonSupported: true,
      comparisonValues: ['off', 'diagnostic-lower-bound'],
      measuredLaunchToReadyMs: results.map((result) => result.builds.flatMap(
        (build) => build.postgresIntrospectionBackendMemoryLowerBound
          ? [build.postgresIntrospectionBackendMemoryLowerBound
            .observerEffect.measuredLaunchToReadyMs]
          : []
      )),
      measuredStopRequestToCloseMs: results.map((result) => result.builds.flatMap(
        (build) => build.postgresIntrospectionBackendMemoryLowerBound
          ? [build.postgresIntrospectionBackendMemoryLowerBound
            .observerEffect.measuredStopRequestToCloseMs]
          : []
      )),
      limitation: 'Only sampler launch and shutdown wall time is recorded; sampling '
        + 'CPU/I/O interference is not corrected. Use paired runs with '
        + "'--postgres-backend-sampler off' and "
        + "'--postgres-backend-sampler diagnostic-lower-bound'."
    },
    measurementProtocol: {
      process: 'fresh-node-process-per-repetition',
      heap: 'three-forced-gc-cycles-after-resident-reprobe',
      build: 'forced-gc-resident-baseline-then-createGraphileInstance-through-schema-readiness',
      buildTransient: 'approximate-five-millisecond-event-loop-sampling-plus-process-rss-high-water',
      operationWarmth: warmth.warmOperationsPerInstance > 0
        ? 'distinct-named-source-queries-through-grafast'
        : 'disabled',
      operationReplay: warmth.warmOperationReplayPasses > 0
        ? 'exact-population-source-set-replayed-through-grafast'
        : 'disabled',
      postgres: results.every(
        (result) => (
          result.postgresBackendMeasurement.introspectionBackendMemory
            .sampledLowerBoundMeasured
          || result.postgresBackendMeasurement.introspectionBackendMemory
            .sharedSnapshotMeasured
        )
      )
        ? introspectionClientReleaseMode === 'destroy'
          ? 'dedicated-identity-bound-procfs-diagnostic-lower-bound-before-retirement'
          : 'shared-introspection-backend-post-build-procfs-baseline-relative'
        : 'not-measured-no-replacement-backend-substitution',
      postgresBackendSamplerAuthority: 'diagnostic-only',
      postgresDensityMemoryAuthority:
        `separately-validated-${LINUX_CGROUP_V2_DENSITY_AUTHORITY}`,
      catalogWarmth: 'shared-server-not-reset',
      historicalMethodologyComparable: false
    },
    provenance: {
      commit: provenance.commit,
      worktreeDirty: provenance.worktreeDirty,
      sourceStateSha256: provenance.sourceStateSha256,
      lockfileSha256,
      executedEntrySha256,
      v8Profile,
      nodeOptions,
      nodeOptionsArgv,
      nodeExecArgv,
      effectiveNodeRuntimeFlags,
      benchmarkConfiguration: {
        scopedCatalogTypes,
        introspectionClientReleaseMode,
        postgresBackendSamplerMode,
        releaseBuildStateAfterValidation,
        ...(schemaLayout.schemaSets === null
          ? {}
          : {
            schemaSets: schemaLayout.schemaSets,
            allowedDependencySchemas: schemaLayout.allowedDependencySchemas
          }),
        warmOperationsPerInstance: warmth.warmOperationsPerInstance,
        warmOperationReplayPasses: warmth.warmOperationReplayPasses,
        grafastCacheLimits: warmth.grafastCacheLimits,
        tenantProxySurfaces,
        v8Profile
      }
    },
    catalog: results[0].catalog,
    fixtureFingerprint: fixtureFingerprints.length === 1 ? fixtureFingerprints[0] : null,
    fixtureFingerprintConsistent: fixtureFingerprints.length === 1,
    freshProcessFirstBuildReadyMs: results.map((result) => result.builds[0].buildMs),
    medianFreshProcessFirstBuildReadyMs: median(
      results.map((result) => result.builds[0].buildMs)
    ),
    freshProcessFirstQueryMs: results.map((result) => result.builds[0].queryMs),
    medianFreshProcessFirstQueryMs: median(results.map((result) => result.builds[0].queryMs)),
    finalForcedGcHeapDeltaBytes: finalSnapshots.map((snapshot) => snapshot.heapDeltaBytes),
    medianFinalForcedGcHeapDeltaBytes: median(
      finalSnapshots.map((snapshot) => snapshot.heapDeltaBytes)
    ),
    finalRssDeltaBytes: finalSnapshots.map((snapshot) => snapshot.rssDeltaBytes),
    medianFinalRssDeltaBytes: median(finalSnapshots.map((snapshot) => snapshot.rssDeltaBytes)),
    medianHeapSlopeBytesPerInstance: median(
      results.map((result) => result.heapSlopeBytesPerInstance)
    ),
    medianRssSlopeBytesPerInstance: median(
      results.map((result) => result.rssSlopeBytesPerInstance)
    ),
    peakProcessRssBytes: Math.max(...results.flatMap((result) =>
      result.snapshots.map((snapshot) => snapshot.processPeakRssBytes)
    )),
    medianPeakProcessRssDeltaBytes: median(results.map((result) =>
      Math.max(...result.snapshots.map((snapshot) => snapshot.processPeakRssDeltaBytes))
    )),
    peakProcessRssDeltaBytes: Math.max(...results.flatMap((result) =>
      result.snapshots.map((snapshot) => snapshot.processPeakRssDeltaBytes)
    )),
    postgresMemoryMeasured: postgresSteadyRssByRepetition.every(
      (value) => value !== null
    ),
    postgresSteadyBackendRssBytes: postgresSteadyRssByRepetition,
    medianPostgresSteadyBackendRssBytes: medianOrNull(
      postgresSteadyRssByRepetition
    ),
    peakPostgresSteadyBackendRssBytes: maxOrNull(
      postgresSteadyRssByRepetition
    ),
    postgresSteadyBackendRssDeltaBytes:
      postgresSteadyRssDeltaByRepetition,
    medianPostgresSteadyBackendRssDeltaBytes: medianOrNull(
      postgresSteadyRssDeltaByRepetition
    ),
    postgresIntrospectionBackendSampledLowerBoundMeasured:
      postgresSampledHighWaterLowerBoundByRepetition.every(
        (value) => value !== null
      ),
    postgresIntrospectionBackendSampledLowerBoundSemantics:
      'diagnostic-lower-bound-without-pre-destroy-acknowledgement',
    postgresIntrospectionBackendSampledLowerBoundLimitation: [...new Set(
      results.flatMap((result) => {
        const limitation =
          result.postgresBackendMeasurement.introspectionBackendMemory.limitation;
        return limitation ? [limitation] : [];
      })
    )].join(' ') || null,
    postgresBackendLifecycle: results.map(
      (result) => result.postgresBackendMeasurement
    ),
    postgresIntrospectionBackendSampledHighWaterLowerBoundBytes:
      postgresSampledHighWaterLowerBoundByRepetition,
    peakPostgresIntrospectionBackendSampledHighWaterLowerBoundBytes: maxOrNull(
      postgresSampledHighWaterLowerBoundByRepetition
    ),
    postgresIntrospectionBackendSampledHighWaterDeltaLowerBoundBytes:
      postgresSampledHighWaterDeltaLowerBoundByRepetition,
    medianPostgresIntrospectionBackendSampledHighWaterDeltaLowerBoundBytes:
      medianOrNull(postgresSampledHighWaterDeltaLowerBoundByRepetition),
    peakPostgresIntrospectionBackendSampledHighWaterDeltaLowerBoundBytes:
      maxOrNull(postgresSampledHighWaterDeltaLowerBoundByRepetition),
    postgresSharedBackendSnapshotHighWaterBytes:
      postgresSharedBackendSnapshotHighWaterByRepetition,
    peakPostgresSharedBackendSnapshotHighWaterBytes: maxOrNull(
      postgresSharedBackendSnapshotHighWaterByRepetition
    ),
    allSdlHashesEqualWithinArm: results.every(
      (result) => result.allSdlHashesEqualWithinArm
    ),
    tokenCanariesConclusive: results.every((result) => result.tokenCanariesConclusive),
    tokenCanariesPassed: results.every((result) => result.tokenCanariesPassed),
    tokenMismatchViolations: results.reduce(
      (sum, result) => sum + result.tokenMismatchViolations,
      0
    ),
    crossTenantTokenViolations: results.reduce(
      (sum, result) => sum + result.crossTenantTokenViolations,
      0
    ),
    bleedViolations: results.reduce((sum, result) => sum + result.bleedViolations, 0),
    resultFiles: results.map((_, index) => `rep-${index + 1}/result.json`)
  };
  fs.writeFileSync(
    path.join(outputRoot, 'summary.json'),
    `${JSON.stringify(summary, null, 2)}\n`,
    'utf8'
  );
  process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
};
