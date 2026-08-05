export type IntrospectionMode = 'stock' | 'scoped-required';
export type CacheAdmissionMode = 'evict-idle' | 'preserve-resident';
export type NodeV8Profile =
  | 'stock'
  | 'optimize-for-size'
  | 'baseline-optimize-for-size'
  | 'jitless-optimize-for-size';

export interface GraphqlResponseOracle {
  /** Every match must be present in the response for the operation to count. */
  requiredMatches: JsonPathMatch[];
  /** Any match is an isolation violation, even when required matches are present. */
  forbiddenMatches: JsonPathMatch[];
  /** Exhaustive assertions over every value selected by a wildcard-capable pointer. */
  invariants?: JsonPathInvariant[];
}

export interface GraphqlPostCoverageVerification extends GraphqlResponseOracle {
  query: string;
  variables?: Record<string, unknown>;
  /** GraphQL variable name -> JSON pointer in the primary operation response. */
  variablesFromResponse?: Record<string, string>;
}

export interface GraphqlOperation {
  name: string;
  capability: string;
  weight?: number;
  query: string;
  variables?: Record<string, unknown>;
  /** Optional fail-closed response oracle, evaluated for every invocation. */
  requiredMatches?: JsonPathMatch[];
  /** Must be configured together with requiredMatches. */
  forbiddenMatches?: JsonPathMatch[];
  /** Cardinality-bounded assertions evaluated for every invocation. */
  invariants?: JsonPathInvariant[];
  /**
   * An untimed verification query run after this operation during coverage.
   * This is for mutations whose production payload cannot echo a database-
   * stamped value; it is never injected into the production GraphQL API.
   */
  postCoverageVerification?: GraphqlPostCoverageVerification;
}

export type JsonValue =
  | null
  | boolean
  | number
  | string
  | JsonValue[]
  | { [key: string]: JsonValue };

/** RFC 6901 JSON pointer; `*` may select every array/object child. */
export interface JsonPathMatch {
  path: string;
  value: JsonValue;
}

/**
 * Every selected value must equal `everyEquals`, and the selection cardinality
 * must stay within the inclusive bounds. A positive `min` makes empty
 * collection responses fail closed instead of vacuously passing.
 */
export interface JsonPathInvariant {
  path: string;
  everyEquals: JsonValue;
  min: number;
  max?: number;
}

export interface IsolationCanary {
  name: string;
  query: string;
  variables?: Record<string, unknown>;
  forbiddenMatches: JsonPathMatch[];
  requiredMatches: JsonPathMatch[];
  invariants?: JsonPathInvariant[];
}

export interface RealtimeGraphqlOperation {
  query: string;
  variables?: Record<string, unknown>;
  /** Every match must be present for the response/event to be conclusive. */
  requiredMatches: JsonPathMatch[];
  /** Any match is an isolation failure. */
  forbiddenMatches: JsonPathMatch[];
}

export type RealtimeSubscriptionOperation = RealtimeGraphqlOperation;

export interface RealtimeRoundTripCorrelation {
  /** Top-level GraphQL variable replaced with a fresh opaque nonce per round. */
  primeVariable: string;
  /** Exact JSON pointer where the prime mutation must return that nonce. */
  primeResponsePath: string;
  /** Exact JSON pointer where the subscription event must return that nonce. */
  subscriptionEventPath: string;
}

export interface RealtimeProbe {
  subscription: RealtimeSubscriptionOperation;
  prime: RealtimeGraphqlOperation;
  /** Proves every delivery round was caused by its own fresh mutation. */
  correlation: RealtimeRoundTripCorrelation;
  /**
   * Header name -> environment variable name. This lets the driver authenticate
   * both the HTTP prime and WebSocket upgrade without serializing credentials
   * into a fleet or artifact.
   */
  headersFromEnvironment?: Record<string, string>;
}

export interface GraphqlSurface {
  name: string;
  /** Default opaque identity when every arm is expected to produce the same build. */
  buildContract: string;
  /**
   * Exact opaque identity by arm name. When present, every configured arm must
   * have an entry and the default is never used for that arm.
   */
  buildContracts?: Record<string, string>;
  url: string;
  headers?: Record<string, string>;
  warmup: GraphqlOperation;
  operations: GraphqlOperation[];
  canaries: IsolationCanary[];
  /** Driver-owned subscription used to prove this exact surface stays live. */
  realtime?: RealtimeProbe;
}

export interface CustomerApiTopology {
  /** Stable control-plane API identity, never a host/service routing label. */
  id: string;
  /** Opaque credential-sensitive runtime pool identity. */
  runtimePoolIdentity: string;
  /** Exact opaque pool identity by arm when arms use different credentials. */
  runtimePoolIdentities?: Record<string, string>;
  /** Ordered physical schemas compiled into this exact API build. */
  physicalSchemas: string[];
  /** Host/service labels are reported for routing coverage, never isolation. */
  routingLabels: string[];
  /** Whether qualification must keep a realtime transport resident for this API. */
  realtime: boolean;
  /** Names from TenantTarget.surfaces served by this API. */
  surfaces: string[];
}

export interface CustomerDatabaseTopology {
  /** Stable logical database identity used by the Graphile build contract. */
  id: string;
  /** Credential-free physical database label for fleet-shape accounting. */
  physicalDatabase: string;
  apis: CustomerApiTopology[];
}

export interface TenantTarget {
  id: string;
  /**
   * Explicit customer -> logical database -> API mapping. Legacy diagnostic
   * fleets may omit it, but a qualifying plan can require it fail-closed.
   */
  databases?: CustomerDatabaseTopology[];
  surfaces: GraphqlSurface[];
}

export interface FleetV1 {
  version: 1;
  tenants: TenantTarget[];
  /** Populated by loadFleet; not part of the fleet JSON contract. */
  sourceSha256?: string;
}

export interface CustomerFleetShape {
  topologyComplete: boolean;
  customers: number;
  logicalDatabases: number;
  physicalDatabases: number;
  apis: number;
  realtimeApis: number;
  surfaces: number;
  physicalSchemaBindings: number;
  routingLabels: number;
  uniqueBuildContracts: number;
  uniqueRuntimePoolIdentities: number;
}

export interface ArmPlan {
  name: 'origin-main' | 'runtime-boundary-stock' | 'cache-governor-stock' | 'scoped-introspection' | string;
  commit?: string;
  cwd?: string;
  command?: string[];
  port: number;
  readinessUrl: string;
  memoryUrl: string;
  /**
   * Authenticated loopback endpoint that performs a benchmark-only full-GC
   * checkpoint. Spawned qualification arms must expose this explicitly.
   */
  retainedHeapCheckpointUrl?: string;
  /**
   * Optional authenticated loopback hook invoked after every configured
   * surface has warmed, but before post-warmup memory accounting starts.
   * Physical-density fixtures use this to assert server-side realtime residency.
   */
  postWarmupUrl?: string;
  /** Dedicated PostgreSQL container used for cold-build memory telemetry. */
  postgresContainer?: string;
  /**
   * Outside-process live database/ACL audit bound to one fresh container and
   * full matrix coordinate. An optional prepare command must create that run's
   * container/clone after the harness establishes its not-before boundary.
   */
  postgresRunAttestation?: {
    command: string[];
    prepareCommand: string[];
    timeoutMs?: number;
  };
  /** Fail the run unless raw cgroup-v2 PostgreSQL memory telemetry is present. */
  requirePostgresCgroupV2?: boolean;
  introspectionMode: IntrospectionMode;
  /** Closed set of benchmarked V8 flag combinations; defaults to stock. */
  v8Profile?: NodeV8Profile;
  env?: Record<string, string>;
  /**
   * Heap-specific environment overrides. This is intentionally explicit in
   * the plan so governor calibration cannot silently reuse one reserve across
   * materially different V8 pressure points.
   */
  envByHeapMiB?: Record<string, Record<string, string>>;
  startupTimeoutMs?: number;
  /** Optional pin for the built JavaScript entry executed by command. */
  entrySha256?: string;
  /** Optional pin for the workspace pnpm-lock.yaml. */
  lockfileSha256?: string;
}

export interface AcceptanceGates {
  maxErrorRate: number;
  maxP99Ms: number;
  maxPostWarmupHeapGrowthMiBPerHour: number;
  minMedianDensityImprovement: number;
  minAdditionalTenantsEveryRun: number;
  /** Maximum uncovered boundary or internal gap in aligned service-memory telemetry. */
  maxAlignedMemorySampleGapMs?: number;
  /** Minimum fraction of the post-warm workload covered by aligned samples. */
  minAlignedMemoryCoverageRatio?: number;
  requireZeroBleed: boolean;
  requireNoPostWarmupEvictions: boolean;
  requireNoPostWarmupBuildRefusals: boolean;
  requireNoPostWarmupBuilds: boolean;
  requirePostgresMemoryTelemetry: boolean;
  /** Require a unique, fresh, live-audited PostgreSQL epoch for every run. */
  requireFreshPostgresRunAttestation: boolean;
  /** Require authenticated forced-GC bookends for retained-memory gating. */
  requireRetainedMemoryCheckpoints: boolean;
  /** Require physical database, backend, and concrete pg.Pool client counts. */
  requirePhysicalDatabaseTelemetry: boolean;
  requireConclusiveCanaries: boolean;
  /**
   * Require exact initial/final sweeps plus complete, deadline-bounded
   * periodic coverage of every configured canary.
   */
  requireCompletePeriodicCanaryCoverage: boolean;
  /** Require exact response or post-coverage evidence for every operation. */
  requireConclusiveOperationOracles: boolean;
  requireExplicitCustomerTopology: boolean;
  /** Require the live cache and pinned process environment to use this mode. */
  requiredCacheAdmissionMode: CacheAdmissionMode | null;
}

export interface DensityQualificationPlan {
  /** Arm used as the denominator for every configured candidate comparison. */
  baselineArm: string;
  /** Mandatory curve checkpoints; extra configured checkpoints are permitted. */
  requiredHeapMiB: number[];
  /** Every configured matrix point must contain at least this many repetitions. */
  minimumRepetitions: number;
  /**
   * One real induced-hostile report for every exact arm runtime/configuration.
   * Passive GraphQL identity probes do not satisfy this publication boundary.
   */
  hostileValidationEvidence?: Record<string, ExactHostileValidationBinding>;
}

export interface ExactHostileValidationBinding {
  version: 1;
  kind: 'exact-runtime-hostile-validation-v1';
  artifactFile: string;
  /** SHA-256 over the exact artifact bytes, without a prefix. */
  artifactSha256: string;
  runtimeArtifactFingerprint: string;
  configurationFingerprint: string;
}

export type PeriodicCanarySchedule = 'full-sweep' | 'rotating-one';

export interface WorkloadPlan {
  durationSec: number;
  /** Fixed process-wide offered load. Mutually exclusive with rpsPerTenant. */
  rps?: number;
  /** Offered load multiplied by the number of tenants in this run. */
  rpsPerTenant?: number;
  /** Every surface must receive at least this many workload-phase requests. */
  minWorkloadRequestsPerSurface: number;
  requestTimeoutMs: number;
  maxInFlight: number;
  canaryIntervalSec: number;
  /** Defaults to the legacy full-fleet/full-canary periodic sweep. */
  periodicCanarySchedule?: PeriodicCanarySchedule;
  /** Parallelism across surfaces; probes within one surface stay sequential. */
  canaryConcurrency?: number;
  /** Minimum whole-fleet warmup allowance. */
  warmupTimeoutMs: number;
  /** Additional scaling budget, applied once per warmup-concurrency wave. */
  warmupTimeoutPerSurfaceMs: number;
  /** Maximum simultaneous schema warmups; defaults to one. */
  warmupConcurrency?: number;
}

export interface DensityPlanV1 {
  version: 1;
  fleetFile: string;
  artifactDir: string;
  arms: ArmPlan[];
  heapMiB: number[];
  /** Legacy count ramp used for every heap unless a heap-specific ramp exists. */
  tenantCounts?: number[];
  /** Heap-specific ramps, keyed by configured old-space MiB. */
  tenantCountsByHeapMiB?: Record<string, number[]>;
  repetitions: number;
  /** Reproducible arm interleaving seed. */
  runOrderSeed?: string;
  requiredCapabilities: string[];
  requiredCanaries: string[];
  workload: WorkloadPlan;
  gates: AcceptanceGates;
  /** Omit for diagnostic-only plans that cannot make a qualification claim. */
  qualification?: DensityQualificationPlan;
  soak?: {
    enabled: boolean;
    /** Candidate arm to soak; defaults to scoped-introspection for compatibility. */
    arm?: string;
    durationSec: number;
    tenantCount: number;
    heapMiB: number;
  };
  /** Populated by loadPlan; not part of the plan JSON contract. */
  sourceSha256?: string;
}

export interface RequestSample {
  tenantId: string;
  surface: string;
  operation: string;
  capability: string;
  latencyMs: number;
  status: number;
  ok: boolean;
  phase: 'coverage' | 'workload';
  scheduledAtMs?: number;
  errorCode?: string;
  /** True when this request was checked against a configured response oracle. */
  oracleConfigured?: boolean;
  /** True only when every required match was observed. */
  oracleConclusive?: boolean;
  /** True when at least one forbidden match was observed. */
  oracleViolation?: boolean;
  /** Transport/HTTP/GraphQL failure prevented evidence evaluation. */
  oracleUnavailable?: boolean;
  /** Whether an untimed post-coverage side-effect verification was used. */
  postCoverageVerification?: boolean;
}

export interface CanaryResult {
  tenantId: string;
  surface: string;
  canary: string;
  phase: 'initial' | 'periodic' | 'final';
  /** One-based planned round number, present only for periodic probes. */
  periodicRound?: number;
  scheduledAt: string;
  startedAt: string;
  completedAt: string;
  latencyMs: number;
  conclusive: boolean;
  violation: boolean;
  detail?: string;
}

export interface CanaryRoundSummary {
  /** One-based planned round number. */
  periodicRound: number;
  plannedAt: string;
  startedAt: string | null;
  completedAt: string | null;
  targetsPlanned: number;
  targetsStarted: number;
  targetsCompleted: number;
  checksPlanned: number;
  checksStarted: number;
  checksCompleted: number;
  /** The preceding serialized round was still running at this round's slot. */
  overlapped: boolean;
  /** This round completed after the workload deadline. */
  deadlineLate: boolean;
  startDelayMs: number | null;
  durationMs: number | null;
}

export interface CanaryScheduleSummary {
  schedule: PeriodicCanarySchedule;
  intervalMs: number;
  durationMs: number;
  canaryConcurrency: number;
  startedAt: string;
  deadlineAt: string;
  /** Round counts. */
  planned: number;
  started: number;
  completed: number;
  missed: number;
  overlapped: number;
  deadlineLate: number;
  /** Probe counts across periodic rounds only. */
  checksPlanned: number;
  checksStarted: number;
  checksCompleted: number;
  rounds: CanaryRoundSummary[];
}

export interface MemorySnapshot {
  timestamp: string;
  pid: number | null;
  nodeEnv: string | null;
  heapLimitBytes: number | null;
  heapUsedBytes: number | null;
  rssBytes: number | null;
  processPeakRssBytes: number | null;
  cacheSize: number | null;
  cacheConfiguredMax?: number | null;
  cacheBudgetCapacity?: number | null;
  cacheInstanceHeapBytes?: number | null;
  cacheCalibrationId?: string | null;
  cacheAdmissionMode?: CacheAdmissionMode | null;
  /** Stable credential-free evidence for cross-process fleet comparison. */
  residentBuildContractFingerprints?: string[] | null;
  /** Process-local keyed identities used only for same-process accounting. */
  residentBuildContracts: string[] | null;
  evictions: number | null;
  buildRefusals: number | null;
  buildsStarted: number | null;
  buildsSucceeded: number | null;
  buildMaxMs: number | null;
  pgPoolCacheSize: number | null;
  pgPoolLeasedPools: number | null;
  pgPoolActiveLeases: number | null;
  pgPoolCapacityEvictions: number | null;
  pgPoolCapacityRefusals: number | null;
  pgPoolDisposalFailures: number | null;
  pgPoolTotalClients?: number | null;
  pgPoolIdleClients?: number | null;
  pgPoolWaitingClients?: number | null;
  runtimePoolTelemetryScope?: 'runtime-only-exact-identities' | null;
  runtimePoolTelemetryAvailable?: boolean | null;
  runtimePoolRequestedMaxUses?: number | null;
  runtimePoolEffectiveMaxUses?: number | null;
  runtimePoolEffectiveMaxUsesKnown?: boolean | null;
  runtimePoolMaxUsesExact?: boolean | null;
  runtimePoolExpectedPools?: number | null;
  runtimePoolObservedPools?: number | null;
  runtimePoolTotalClients?: number | null;
  runtimePoolIdleClients?: number | null;
  runtimePoolWaitingClients?: number | null;
  postgresBackendTotal?: number | null;
  postgresBackendActive?: number | null;
  postgresBackendIdle?: number | null;
  postgresBackendIdleInTransaction?: number | null;
  physicalDatabases?: number | null;
  postgresContainerDedicated?: boolean | null;
  unexpectedPostgresDatabases?: number | null;
  realtimeManagersExpected?: number | null;
  realtimeManagersActive?: number | null;
  realtimeTransportsExpected?: number | null;
  realtimeTransportsActive?: number | null;
  realtimeNotificationMode?: 'dedicated' | 'shared-exact' | null;
  notificationBrokers?: number | null;
  notificationListenerConnections?: number | null;
  notificationBrokerLeases?: number | null;
  notificationBrokerTopics?: number | null;
  notificationBrokerSubscribers?: number | null;
  notificationBrokerQueueOverflows?: number | null;
  notificationBrokerFatalFailures?: number | null;
  notificationAuditIdentities?: number | null;
  notificationAuditsHealthy?: number | null;
  notificationAuditsFailed?: number | null;
  notificationAuditsStale?: number | null;
  notificationAuditAttempts?: number | null;
  notificationAuditFailures?: number | null;
  notificationAuditActiveDatabaseTargets?: number | null;
  notificationAuditDatabaseConflicts?: number | null;
  cacheCountersAvailable: boolean;
  buildCountersAvailable: boolean;
  raw?: unknown;
}

/**
 * High-frequency, harness-timestamped current RSS sample for the exact server
 * PID. Linux reads /proc; other hosts use the authenticated memory endpoint.
 */
export interface NodeRssSnapshot {
  timestamp: string;
  /** Exact child PID read by the harness. */
  pid: number;
  source: 'proc' | 'authenticated-endpoint';
  rssBytes: number;
}

export interface RetainedMemorySample {
  timestamp: string;
  /** Monotonic process time serialized as decimal nanoseconds. */
  monotonicNs: string;
  heapUsedBytes: number;
  externalBytes: number;
  arrayBuffersBytes: number;
  rssBytes: number;
}

export interface RetainedMemoryGuard {
  pid: number;
  graphileInFlight: number;
  residentBuildContracts: string[];
  stateSha256: string;
  /** Credential-free residency and monotonic process-counter state. */
  state: Record<string, unknown>;
}

export interface RetainedMemoryCheckpoint {
  version: 1;
  fixture: string;
  pid: number;
  gcRounds: number;
  stableSampleCount: number;
  stable: boolean;
  samples: RetainedMemorySample[];
  guardBefore: RetainedMemoryGuard;
  guardAfter: RetainedMemoryGuard;
  errors: string[];
}

export interface RetainedMemoryCheckpointPair {
  baseline: RetainedMemoryCheckpoint | null;
  final: RetainedMemoryCheckpoint | null;
  errors: string[];
}

export interface PostgresMemorySnapshot {
  timestamp: string;
  /** Immutable 64-character Docker ID sampled for this record. */
  containerId?: string;
  /** Attested container cgroup identity revalidated by the sampler. */
  cgroupIdentitySha256?: string;
  /** Raw cgroup-v2 charge when available; Docker working set otherwise. */
  usedBytes: number;
  limitBytes: number;
  source?: 'cgroup-v2' | 'docker-stats';
  workingSetBytes?: number;
  sampleStartedAt?: string;
  sampleEndedAt?: string;
  sampleDurationMs?: number;
  cgroupV2?: {
    currentBytes: number;
    peakBytes: number | null;
    maxBytes: number | null;
    stat: Record<string, number>;
    events: Record<string, number>;
  };
  raw: string;
}

export interface SurfaceResult {
  surface: string;
  warmed: boolean;
  workloadRequests: number;
  successfulWorkloadRequests: number;
  errors: number;
  errorRate: number;
  p99Ms: number;
  operationsConfigured: number;
  operationsExercised: number;
  canaryChecks: number;
  canaryInconclusive: number;
  bleedViolations: number;
  operationOracleChecks: number;
  operationOracleInconclusive: number;
  operationOracleViolations: number;
  missingOperations: string[];
  missingCapabilities: string[];
  missingOperationOracles: string[];
  qualified: boolean;
}

export interface TenantResult {
  tenantId: string;
  surfacesConfigured: number;
  surfacesWarmed: number;
  surfacesWithTraffic: number;
  operationsConfigured: number;
  operationsExercised: number;
  requests: number;
  errors: number;
  errorRate: number;
  p99Ms: number;
  canaryChecks: number;
  canaryInconclusive: number;
  bleedViolations: number;
  operationOracleChecks: number;
  operationOracleInconclusive: number;
  operationOracleViolations: number;
  missingSurfaces: string[];
  missingOperations: string[];
  missingCapabilities: string[];
  missingOperationOracles: string[];
  surfaces: SurfaceResult[];
  qualified: boolean;
}

export interface ResolvedOfferedLoad {
  mode: 'fixed-total' | 'per-tenant';
  configuredRps: number;
  tenantCount: number;
  totalRps: number;
  rpsPerTenant: number;
}

export interface RealtimeDeliverySurfaceCoverage {
  tenantId: string;
  surface: string;
  route: string;
  expectedRecurringRounds: number;
  startedRecurringRounds: number;
  verifiedRecurringRounds: number;
  issuedCorrelationSha256: string;
  verifiedCorrelationSha256: string;
  primeRequests: number;
  primeResponseP99Ms: number;
  deliveryP99Ms: number;
}

export interface RealtimeDeliveryCoverage {
  version: 2;
  deliveryIntervalMs: number;
  workloadStartedAt: string;
  workloadDeadlineAt: string;
  workloadEndedAt: string | null;
  expectedRecurringRounds: number;
  startedRecurringRounds: number;
  verifiedRecurringRounds: number;
  deadlineLateRecurringRounds: number;
  primeRequests: number;
  primeResponseP99Ms: number;
  deliveryP99Ms: number;
  complete: boolean;
  surfaces: RealtimeDeliverySurfaceCoverage[];
}

/** Credential-free proof that one fresh prime nonce reached one subscription. */
export interface RealtimeCorrelationReceipt {
  sequence: number;
  timed: boolean;
  deadlineAt: string;
  issuedAt: string;
  issuedSha256: string;
  primeResponseAt: string | null;
  primeResponseSha256: string | null;
  eventAt: string | null;
  eventSha256: string | null;
}

export interface DensityResultEvidenceBinding {
  version: 2;
  algorithm: 'sha256';
  resultPayloadSha256: string;
  artifacts: Array<{
    name: string;
    sha256: string;
  }>;
}

export interface ResolvedMemoryPolicy {
  configuredMaxOldSpaceMiB: number;
  expectedV8HeapLimitBytes: number | null;
  graphileCacheMax: string | null;
  graphileCacheInstanceHeapBytes: string | null;
  graphileCacheServerReserveBytes: string | null;
  graphileCacheBuildReserveBytes: string | null;
  graphileCacheRssLimitBytes: string | null;
  graphileCacheRssBuildReserveBytes: string | null;
  graphileCacheCalibrationId: string | null;
  graphileCacheAdmissionMode: string | null;
  graphileBuildMaxConcurrency: string | null;
}

export interface ArmProvenance {
  cwd: string | null;
  command: string[];
  gitHead: string | null;
  worktreeDirty: boolean | null;
  gitStatusSha256: string | null;
  lockfilePath: string | null;
  lockfileSha256: string | null;
  entryPath: string | null;
  entrySha256: string | null;
  serverPid: number | null;
  /** Named allowlisted profile from the plan. */
  v8Profile: NodeV8Profile;
  /** Exact sanitized NODE_OPTIONS string installed for the child. */
  nodeOptions: string | null;
  /** Exact tokenization of nodeOptions. */
  nodeOptionsArgv: string[];
  /** Exact direct Node flags before the executed entry file. */
  nodeExecArgv: string[];
  /** NODE_OPTIONS followed by direct flags, in effective precedence order. */
  effectiveNodeRuntimeFlags: string[];
  planSha256: string | null;
  fleetSha256: string | null;
  node: string;
  v8: string;
  platform: NodeJS.Platform;
  architecture: string;
  runOrderSeed: string | null;
  runOrderIndex: number | null;
  memoryPolicy: ResolvedMemoryPolicy | null;
}

export interface PostgresRunAttestationEvidence {
  version: 1;
  kind: 'physical-density-measurement-attestation-v1';
  artifactPath: string;
  artifactSha256: string;
  payloadSha256: string;
  epochId: string;
  arm: string;
  heapMiB: number;
  tenantCount: number;
  repetition: number;
  runOrderIndex: number;
  planSha256: string;
  fleetSha256: string;
  containerId: string;
  containerStartedAt: string;
  cgroupIdentitySha256: string;
  containerConfigurationSha256: string;
  postgresSystemIdentifier: string;
  postgresStartedAt: string;
  cloneId: string;
  cloneAttestationSetSha256: string;
  cloneNonceSetSha256: string;
  liveContractSetSha256: string;
  manifestSha256: string;
  containerTemplateSha256: string;
  canonicalDatabaseContractFingerprint: string;
  freshContainerForRun: boolean;
  cgroupV2Verified: boolean;
  liveCustomerContractsAudited: number;
  /** Full pre-run audit intentionally warms PostgreSQL's catalogs. */
  catalogCacheState: 'warmed-by-live-contract-audit';
}

export interface DensityRunResult {
  schemaVersion: 6;
  runKind: 'matrix' | 'soak';
  /** Only a full, unmodified configured matrix may carry qualification evidence. */
  evidenceMode: 'qualification' | 'diagnostic';
  /** Random per-invocation campaign identity; never derived from plan bytes. */
  campaignId: string;
  /** Hash of the exact ordered schedule manifest for this invocation. */
  scheduleSha256: string;
  /** Hash-chain pointer to the prior result payload in exact run order. */
  previousResultPayloadSha256: string | null;
  /** SHA-256 over the exact plan and fleet byte identities. */
  qualificationCohortSha256: string;
  arm: string;
  commit: string | null;
  introspectionMode: IntrospectionMode;
  heapMiB: number;
  /** Complete customer bundles selected from the explicit fleet manifest. */
  configuredCustomers: number;
  /** @deprecated Compatibility alias for configuredCustomers. */
  configuredTenants: number;
  fleetShape: CustomerFleetShape;
  repetition: number;
  expectedMatrixRepetitions: number;
  runOrderSeed: string;
  runOrderIndex: number;
  startedAt: string;
  endedAt: string;
  durationSec: number;
  warmupMaxMs: number;
  resolvedWarmupTimeoutMs: number;
  offeredLoad: ResolvedOfferedLoad;
  requests: number;
  coverageRequests: number;
  workloadRequests: number;
  errors: number;
  /** Dispatched customer workload requests divided by measured load duration. */
  customerWorkloadRps: number;
  /** Completed periodic isolation probes divided by measured load duration. */
  periodicValidationRps: number;
  /** Timed realtime prime mutations divided by measured load duration. */
  realtimeValidationRps: number;
  /** Customer workload plus periodic and realtime validation HTTP requests per second. */
  combinedHttpRps: number;
  /** @deprecated Compatibility alias for customerWorkloadRps. */
  achievedRps: number;
  missedArrivals: number;
  errorRate: number;
  p50Ms: number;
  p95Ms: number;
  p99Ms: number;
  peakHeapBytes: number | null;
  peakRssBytes: number | null;
  observedHeapLimitBytes: number | null;
  residentInstances: number | null;
  expectedResidentInstances: number;
  cacheConfiguredMax: number | null;
  cacheBudgetCapacity: number | null;
  cacheInstanceHeapBytes: number | null;
  cacheCalibrationId: string | null;
  cacheAdmissionMode: CacheAdmissionMode | null;
  warmObservedHeapDeltaPerInstanceBytes: number | null;
  /** Raw heapUsed OLS trend; diagnostic only because normal GC is sawtoothed. */
  postWarmupHeapGrowthMiBPerHour: number | null;
  rawPostWarmupHeapGrowthMiBPerHour: number | null;
  retainedHeapGrowthMiBPerHour: number | null;
  retainedExternalGrowthMiBPerHour: number | null;
  retainedMemoryDurationSec: number | null;
  retainedHeapBaselineBytes: number | null;
  retainedHeapFinalBytes: number | null;
  retainedExternalBaselineBytes: number | null;
  retainedExternalFinalBytes: number | null;
  retainedMemoryCheckpointErrors: string[];
  postWarmupEvictions: number | null;
  postWarmupBuildRefusals: number | null;
  postWarmupBuilds: number | null;
  pgPoolCacheSize: number | null;
  pgPoolLeasedPools: number | null;
  pgPoolActiveLeases: number | null;
  postWarmupPgPoolCapacityEvictions: number | null;
  postWarmupPgPoolCapacityRefusals: number | null;
  postWarmupPgPoolDisposalFailures: number | null;
  coldBuildMaxMs: number | null;
  memorySampleErrors: string[];
  postgresBaselineBytes: number | null;
  postgresWarmBoundaryBytes: number | null;
  postgresPeakBytes: number | null;
  postgresWorkingSetPeakBytes: number | null;
  postgresCgroupV2PeakBytes: number | null;
  postgresCgroupV2Samples: number;
  postgresOomEvents: number | null;
  postgresBackendPeak: number | null;
  residentPhysicalDatabases: number | null;
  postgresContainerDedicated: boolean | null;
  unexpectedPostgresDatabases: number | null;
  pgPoolTotalClients: number | null;
  pgPoolIdleClients: number | null;
  pgPoolWaitingClients: number | null;
  runtimePoolRequestedMaxUses: number | null;
  runtimePoolEffectiveMaxUses: number | null;
  runtimePoolExpectedPools: number | null;
  runtimePoolObservedPools: number | null;
  runtimePoolTotalClients: number | null;
  runtimePoolIdleClients: number | null;
  runtimePoolWaitingClients: number | null;
  residentRealtimeManagers: number | null;
  residentRealtimeTransports: number | null;
  realtimeNotificationMode: 'dedicated' | 'shared-exact' | null;
  /** Deadline-bounded fresh-event coverage during the timed workload. */
  realtimeDeliveryCoverage?: RealtimeDeliveryCoverage | null;
  notificationBrokers: number | null;
  notificationListenerConnections: number | null;
  notificationBrokerLeases: number | null;
  notificationBrokerTopics: number | null;
  notificationBrokerSubscribers: number | null;
  notificationBrokerQueueOverflows: number | null;
  notificationBrokerFatalFailures: number | null;
  notificationAuditIdentities: number | null;
  notificationAuditsHealthy: number | null;
  notificationAuditsFailed: number | null;
  notificationAuditsStale: number | null;
  notificationAuditAttempts: number | null;
  notificationAuditFailures: number | null;
  notificationAuditActiveDatabaseTargets: number | null;
  notificationAuditDatabaseConflicts: number | null;
  postgresColdBuildSpikeBytes: number | null;
  postgresSampleErrors: string[];
  /** Maximum near-simultaneous Node current RSS + PostgreSQL cgroup usage. */
  alignedServicePeakBytes: number | null;
  alignedServicePeakNodeRssBytes: number | null;
  alignedServicePeakPostgresBytes: number | null;
  alignedServicePeakTimestamp: string | null;
  alignedServiceMemorySamples: number;
  alignedServiceMemoryMaxSkewMs: number | null;
  alignedServiceMemoryCoverageRatio?: number | null;
  alignedServiceMemoryCoveredDurationMs?: number | null;
  alignedServiceMemoryExpectedDurationMs?: number | null;
  alignedServiceMemoryMaxGapMs?: number | null;
  /** Conservative non-simultaneous upper bound: Node RSS HWM + PostgreSQL peak. */
  serviceMemoryUpperBoundBytes: number | null;
  serviceMemoryUpperBoundPostgresSource?:
    | 'cgroup-v2-memory.peak'
    | 'sampled-current-diagnostic'
    | null;
  capabilitiesExercised: string[];
  missingCapabilities: string[];
  missingCanaries: string[];
  canarySchedule: CanaryScheduleSummary | null;
  canaryChecks: number;
  canaryInconclusive: number;
  bleedViolations: number;
  operationOracleChecks: number;
  operationOracleInconclusive: number;
  operationOracleViolations: number;
  missingOperationOracles: string[];
  tenants: TenantResult[];
  qualifiedCustomers: number;
  /** @deprecated Compatibility alias for qualifiedCustomers. */
  qualifiedTenants: number;
  tenantsPerConfiguredOldSpaceGiB: number;
  tenantsPerPeakRssGiB: number | null;
  customersPerAlignedServiceGiB: number | null;
  customersPerServiceMemoryUpperBoundGiB: number | null;
  /** Diagnostic only: configured customers divided by aligned service memory. */
  configuredCustomersPerAlignedServiceGiB: number | null;
  /** Diagnostic only: configured customers divided by the service upper bound. */
  configuredCustomersPerServiceMemoryUpperBoundGiB: number | null;
  accepted: boolean;
  failures: string[];
  serverExit: { code: number | null; signal: NodeJS.Signals | null } | null;
  provenance: ArmProvenance | null;
  provenanceErrors: string[];
  postgresRunAttestation?: PostgresRunAttestationEvidence | null;
  /** Hash binding over the complete result payload and persisted raw evidence. */
  evidenceBinding?: DensityResultEvidenceBinding;
  artifactDir: string;
}

export interface DensityCapacityBoundary {
  arm: string;
  heapMiB: number;
  expectedRepetitions: number;
  testedTenantCounts: number[];
  incompleteTenantCounts: number[];
  highestAllRepetitionsPass: number | null;
  lowestGreaterFail: number | null;
  /** False when a lower tenant count failed but a higher count passed. */
  monotonicQualification: boolean;
  capacityBoundaryReached: boolean;
  medianTenantsPerConfiguredOldSpaceGiB: number | null;
  medianTenantsPerPeakRssGiB: number | null;
  medianCustomersPerAlignedServiceGiB: number | null;
  medianCustomersPerServiceMemoryUpperBoundGiB: number | null;
}
