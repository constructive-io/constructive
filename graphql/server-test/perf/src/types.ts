import type { GetConnectionsResult } from '../../src/types';

export const PERF_SCHEMA_VERSION = 1 as const;

export type SchemaVersion = typeof PERF_SCHEMA_VERSION;
export type RoutingMode = 'private' | 'public';
export type CacheMode = 'old' | 'new';
export type ConnectionPolicy = 'reuse' | 'per-case';
export type CaseStatus = 'passed' | 'failed' | 'skipped';
export type MemoryPhase = 'before' | 'after';

export interface ScaleProfile {
  name: string;
  k: number;
  durationSeconds: number;
  workers: number;
}

export interface WorkloadProfileSelection {
  private: string;
  public: string;
}

export interface PublicPreflightConfig {
  allowUnderProvisioned: boolean;
}

export interface PerfConfigSource {
  defaults: string;
  group: string;
  specPath?: string;
  envOverrides: Record<string, string>;
}

export interface PerfRunConfig {
  schemaVersion: SchemaVersion;
  runId: string;
  name: string;
  configGroup: string;
  specPath?: string;
  runDir: string;
  connectionPolicy: ConnectionPolicy;
  routingModes: RoutingMode[];
  cacheModes: CacheMode[];
  scaleProfile: ScaleProfile;
  workloadProfiles: WorkloadProfileSelection;
  publicPreflight: PublicPreflightConfig;
  failFast: boolean;
  captureMemory: boolean;
  routeProbeSampleSize: number;
  errorSampleLimit: number;
  testTimeoutMs: number;
  benchmarkOwnedPrefix: string;
  source: PerfConfigSource;
}

export type PerfRunConfigOverlay = Partial<
  Omit<
    PerfRunConfig,
    | 'schemaVersion'
    | 'runId'
    | 'source'
    | 'benchmarkOwnedPrefix'
    | 'scaleProfile'
    | 'workloadProfiles'
    | 'publicPreflight'
  >
> & {
  scaleProfile?: Partial<ScaleProfile> & { name?: string };
  workloadProfiles?: Partial<WorkloadProfileSelection>;
  publicPreflight?: Partial<PublicPreflightConfig>;
};

export interface MatrixCase {
  caseId: string;
  routingMode: RoutingMode;
  cacheMode: CacheMode;
  scaleProfile: ScaleProfile;
  workloadProfile: string;
  mutates: boolean;
}

export interface BenchmarkContext {
  id: string;
  compatibilityKey: string;
  reused: boolean;
  createdAt: string;
  serverUrl: string;
  graphqlUrl: string;
  conn: GetConnectionsResult;
}

export interface RequestProfile {
  id: string;
  routingMode: RoutingMode;
  routeKey: string;
  headers: Record<string, string>;
  description: string;
  benchmarkOwned: boolean;
  metadata: Record<string, unknown>;
}

export interface OperationProfile {
  id: string;
  name: string;
  weight: number;
  workloadProfile: string;
  description: string;
  mutates: boolean;
  compatibleRequestProfileIds?: string[];
  query: string;
  variables?: Record<string, unknown>;
}

export interface RuntimeOperationProfile extends OperationProfile {
  buildVariables?: (input: {
    sequence: number;
    requestProfile: RequestProfile;
    config: PerfRunConfig;
    matrixCase: MatrixCase;
  }) => Record<string, unknown> | undefined;
}

export interface RedactedErrorSample {
  at: string;
  operation?: string;
  requestProfileId?: string;
  message: string;
  status?: number;
  code?: string;
  details?: unknown;
}

export interface RouteProbeSummary {
  ok: boolean;
  attempted: number;
  succeeded: number;
  failed: number;
  unexpectedGraphqlErrors: number;
  errorSamples: RedactedErrorSample[];
}

export interface DbpmProvisionResult {
  ok: boolean;
  completed: boolean;
  source: 'fixture-preseeded' | 'graphql' | 'mixed' | 'unavailable';
  tenantCount: number;
  publicHostCount: number;
  apiCount: number;
  businessTableCount: number;
  requestProfiles: RequestProfile[];
  operationProfiles: RuntimeOperationProfile[];
  benchmarkOwnedObjectIds: string[];
  errors: RedactedErrorSample[];
  warnings: string[];
}

export interface PublicPreflightResult {
  ok: boolean;
  routingMode: 'public';
  scaleProfile: string;
  workloadProfile: string;
  k: number;
  provisionedTenantCount: number;
  publicHostCount: number;
  requestProfileCount: number;
  operationProfileCount: number;
  routeProbe: RouteProbeSummary;
  requestProfiles: RequestProfile[];
  operationProfiles: RuntimeOperationProfile[];
  artifactPath: string;
  hardGateFailures: string[];
}

export interface PreflightReport {
  schemaVersion: SchemaVersion;
  runId: string;
  caseId: string;
  startedAt: string;
  finishedAt: string;
  ok: boolean;
  configSnapshot: Record<string, unknown>;
  provision: {
    ok: boolean;
    tenantCount: number;
    publicHostCount: number;
    apiCount: number;
    businessTableCount: number;
    reportPath?: string;
    errors: RedactedErrorSample[];
    source?: DbpmProvisionResult['source'];
    warnings?: string[];
  };
  profiles: {
    requestProfileCount: number;
    operationProfileCount: number;
    routeKeyCount: number;
  };
  routeProbe: RouteProbeSummary;
  hardGateFailures: string[];
}

export interface RequestOutcome {
  ok: boolean;
  latencyMs: number;
  operation: string;
  requestProfileId: string;
  status?: number;
  unexpectedGraphqlErrors: number;
  error?: RedactedErrorSample;
}

export interface LoadReport {
  ok: boolean;
  durationSeconds: number;
  workers: number;
  totalRequests: number;
  failedRequests: number;
  unexpectedGraphqlErrors: number;
  qps: number;
  latencyMs: {
    p50: number | null;
    p90: number | null;
    p95: number | null;
    p99: number | null;
    max: number | null;
  };
  operations: Record<string, {
    total: number;
    failed: number;
  }>;
  failFast?: {
    triggered: boolean;
    reason?: string;
  };
  errorSamples: RedactedErrorSample[];
}

export interface MemorySnapshotArtifact {
  schemaVersion: SchemaVersion;
  runId: string;
  caseId: string;
  phase: MemoryPhase;
  capturedAt: string;
  ok: boolean;
  status: 'captured' | 'disabled' | 'unavailable' | 'failed';
  serverUrl: string;
  httpStatus?: number;
  snapshot?: unknown;
  error?: RedactedErrorSample;
}

export interface MemoryCaptureResult {
  ok: boolean;
  status: MemorySnapshotArtifact['status'];
  path?: string;
  error?: RedactedErrorSample;
}

export interface CaseReport {
  schemaVersion: SchemaVersion;
  runId: string;
  caseId: string;
  startedAt: string;
  finishedAt: string;
  ok: boolean;
  status: CaseStatus;
  matrix: {
    routingMode: RoutingMode;
    cacheMode: CacheMode;
    scaleProfile: ScaleProfile;
    workloadProfile: string;
  };
  lifecycle: {
    connectionPolicy: ConnectionPolicy;
    contextId: string;
    contextReused: boolean;
    compatibilityKey: string;
    serverUrl: string;
  };
  preflight?: {
    ok: boolean;
    artifactPath: string;
    provisionedTenantCount?: number;
    publicHostCount?: number;
    requestProfileCount: number;
    operationProfileCount: number;
    hardGateFailures: string[];
  };
  routeProbe: RouteProbeSummary;
  load?: LoadReport;
  memory?: {
    beforePath?: string;
    afterPath?: string;
    beforeOk: boolean;
    afterOk: boolean;
    beforeStatus?: MemoryCaptureResult['status'];
    afterStatus?: MemoryCaptureResult['status'];
  };
  gates: {
    hardGateFailures: string[];
    observations: Record<string, unknown>;
  };
  artifacts: {
    caseReportPath: string;
    preflightPath?: string;
    memoryBeforePath?: string;
    memoryAfterPath?: string;
    errorsPath?: string;
  };
}

export interface CaseSummary {
  caseId: string;
  ok: boolean;
  status: CaseStatus;
  routingMode: RoutingMode;
  cacheMode: CacheMode;
  scaleProfile: string;
  workloadProfile: string;
  contextId?: string;
  reportPath?: string;
  hardGateFailures: string[];
  totalRequests?: number;
  qps?: number;
}

export interface PerfRunSummary {
  schemaVersion: SchemaVersion;
  runId: string;
  runDir: string;
  configGroup: string;
  specPath?: string;
  startedAt: string;
  finishedAt: string;
  pass: boolean;
  config: PerfRunConfig;
  totals: {
    caseCount: number;
    passed: number;
    failed: number;
    skipped: number;
  };
  cases: CaseSummary[];
  artifacts: {
    summaryPath: string;
    casesDir: string;
    preflightDir: string;
    memoryDir: string;
    errorsDir: string;
  };
}

export interface RunArtifactPaths {
  runDir: string;
  summaryPath: string;
  casesDir: string;
  preflightDir: string;
  memoryDir: string;
  errorsDir: string;
}
