import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import type {
  AcceptanceGates,
  ArmPlan,
  DensityPlanV1,
  FleetV1,
  TenantTarget,
  WorkloadPlan
} from './types';

const RESERVED_PORTS = new Set([3000, 3001, 3002, 5432, 9000]);
const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);

export const DEFAULT_RUN_ORDER_SEED = 'graphile-density-v1';
export const DEFAULT_SOAK_ARM = 'scoped-introspection';

export const soakArmName = (
  plan: Pick<DensityPlanV1, 'soak'>
): string => plan.soak?.arm ?? DEFAULT_SOAK_ARM;

export const hasExactHostileValidationEvidence = (
  plan: Pick<DensityPlanV1, 'arms' | 'qualification'>
): boolean => {
  const evidence = plan.qualification?.hostileValidationEvidence;
  if (!evidence) return false;
  const expectedArms = plan.arms.map((arm) => arm.name).sort();
  if (JSON.stringify(Object.keys(evidence).sort()) !== JSON.stringify(expectedArms)) {
    return false;
  }
  return expectedArms.every((arm) => {
    const binding = evidence[arm];
    return binding?.version === 1
      && binding.kind === 'exact-runtime-hostile-validation-v1'
      && typeof binding.artifactFile === 'string'
      && binding.artifactFile.length > 0
      && /^[a-f0-9]{64}$/.test(binding.artifactSha256)
      && /^sha256:[a-f0-9]{64}$/.test(binding.runtimeArtifactFingerprint)
      && /^sha256:[a-f0-9]{64}$/.test(binding.configurationFingerprint);
  });
};

const requirePositive = (value: unknown, label: string): void => {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    throw new Error(`${label} must be positive`);
  }
};

const requireNonNegative = (value: unknown, label: string): void => {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    throw new Error(`${label} must be non-negative`);
  }
};

const requireBoolean = (value: unknown, label: string): void => {
  if (typeof value !== 'boolean') throw new Error(`${label} must be boolean`);
};

export const validateAcceptanceGates = (gates: AcceptanceGates): void => {
  if (!gates || typeof gates !== 'object' || Array.isArray(gates)) {
    throw new Error('plan.gates is missing');
  }
  requireNonNegative(gates.maxErrorRate, 'plan.gates.maxErrorRate');
  if (gates.maxErrorRate > 1) throw new Error('plan.gates.maxErrorRate must be at most 1');
  requirePositive(gates.maxP99Ms, 'plan.gates.maxP99Ms');
  requireNonNegative(
    gates.maxPostWarmupHeapGrowthMiBPerHour,
    'plan.gates.maxPostWarmupHeapGrowthMiBPerHour'
  );
  requireNonNegative(
    gates.minMedianDensityImprovement,
    'plan.gates.minMedianDensityImprovement'
  );
  requireNonNegative(
    gates.minAdditionalTenantsEveryRun,
    'plan.gates.minAdditionalTenantsEveryRun'
  );
  if (!Number.isSafeInteger(gates.minAdditionalTenantsEveryRun)) {
    throw new Error('plan.gates.minAdditionalTenantsEveryRun must be a safe integer');
  }
  if (gates.maxAlignedMemorySampleGapMs != null) {
    requirePositive(
      gates.maxAlignedMemorySampleGapMs,
      'plan.gates.maxAlignedMemorySampleGapMs'
    );
  }
  if (gates.minAlignedMemoryCoverageRatio != null) {
    requirePositive(
      gates.minAlignedMemoryCoverageRatio,
      'plan.gates.minAlignedMemoryCoverageRatio'
    );
    if (gates.minAlignedMemoryCoverageRatio > 1) {
      throw new Error('plan.gates.minAlignedMemoryCoverageRatio must be at most 1');
    }
  }
  const booleans: Array<keyof AcceptanceGates> = [
    'requireZeroBleed',
    'requireNoPostWarmupEvictions',
    'requireNoPostWarmupBuildRefusals',
    'requireNoPostWarmupBuilds',
    'requirePostgresMemoryTelemetry',
    'requireFreshPostgresRunAttestation',
    'requireRetainedMemoryCheckpoints',
    'requirePhysicalDatabaseTelemetry',
    'requireConclusiveCanaries',
    'requireCompletePeriodicCanaryCoverage',
    'requireConclusiveOperationOracles',
    'requireExplicitCustomerTopology'
  ];
  for (const key of booleans) requireBoolean(gates[key], `plan.gates.${key}`);
  if (
    gates.requiredCacheAdmissionMode !== null
    && gates.requiredCacheAdmissionMode !== 'evict-idle'
    && gates.requiredCacheAdmissionMode !== 'preserve-resident'
  ) {
    throw new Error(
      'plan.gates.requiredCacheAdmissionMode must be null, evict-idle, or preserve-resident'
    );
  }
};

const SHA256 = /^[a-f0-9]{64}$/i;
const NODE_V8_PROFILES = new Set([
  'stock',
  'optimize-for-size',
  'baseline-optimize-for-size',
  'jitless-optimize-for-size'
]);
const MANAGED_V8_FLAG =
  /^--(?:no[-_])?(?:jitless|optimize[-_]for[-_]size|max[-_]opt)(?:=.*)?$/;

const fileSha256 = (value: Buffer): string => createHash('sha256').update(value).digest('hex');

const validateCountRamp: (
  counts: unknown,
  label: string
) => asserts counts is number[] = (counts, label) => {
  if (!Array.isArray(counts) || counts.length === 0) {
    throw new Error(`${label} must be a nonempty array`);
  }
  let previous = 0;
  for (const count of counts) {
    requirePositive(count, label);
    if (!Number.isSafeInteger(count)) throw new Error(`${label} must contain safe integers`);
    if (count <= previous) throw new Error(`${label} must be strictly increasing`);
    previous = count;
  }
};

export const tenantCountsForHeap = (
  plan: Pick<DensityPlanV1, 'tenantCounts' | 'tenantCountsByHeapMiB'>,
  heapMiB: number
): number[] => {
  const specific = plan.tenantCountsByHeapMiB?.[String(heapMiB)];
  const counts = specific ?? plan.tenantCounts;
  if (!counts?.length) {
    throw new Error(`no tenant-count ramp is configured for heapMiB=${heapMiB}`);
  }
  return [...counts];
};

export const armEnvironmentForHeap = (
  arm: Pick<DensityPlanV1['arms'][number], 'env' | 'envByHeapMiB'>,
  heapMiB: number
): Record<string, string> => ({
  ...(arm.env ?? {}),
  ...(arm.envByHeapMiB?.[String(heapMiB)] ?? {})
});

/**
 * Resolve the arm-specific identities and route without copying credentials
 * into a benchmark artifact. The runner and semantic evidence replay must use
 * this same transformation or a result could be scored against a different
 * build/pool contract from the one that was exercised.
 */
export const resolveTenants = (
  tenants: TenantTarget[],
  arm: ArmPlan
): TenantTarget[] => tenants.map((tenant) => ({
  ...tenant,
  databases: tenant.databases?.map((database) => ({
    ...database,
    apis: database.apis.map((api) => ({
      ...api,
      runtimePoolIdentity:
        api.runtimePoolIdentities?.[arm.name] ?? api.runtimePoolIdentity
    }))
  })),
  surfaces: tenant.surfaces.map((surface) => ({
    ...surface,
    buildContract: surface.buildContracts?.[arm.name] ?? surface.buildContract,
    url: resolveTemplate(surface.url, {
      port: arm.port,
      mode: arm.introspectionMode
    })
  }))
}));

export const validateWorkloadPlan = (workload: WorkloadPlan): void => {
  if (!workload || typeof workload !== 'object') throw new Error('plan.workload is missing');
  requirePositive(workload.durationSec, 'workload.durationSec');
  const hasFixedRps = workload.rps != null;
  const hasPerTenantRps = workload.rpsPerTenant != null;
  if (hasFixedRps === hasPerTenantRps) {
    throw new Error('workload must define exactly one of rps or rpsPerTenant');
  }
  requirePositive(
    hasFixedRps ? workload.rps : workload.rpsPerTenant,
    hasFixedRps ? 'workload.rps' : 'workload.rpsPerTenant'
  );
  requirePositive(
    workload.minWorkloadRequestsPerSurface,
    'workload.minWorkloadRequestsPerSurface'
  );
  if (!Number.isSafeInteger(workload.minWorkloadRequestsPerSurface)) {
    throw new Error('workload.minWorkloadRequestsPerSurface must be a safe integer');
  }
  requirePositive(workload.maxInFlight, 'workload.maxInFlight');
  if (!Number.isSafeInteger(workload.maxInFlight)) {
    throw new Error('workload.maxInFlight must be a safe integer');
  }
  requirePositive(workload.canaryIntervalSec, 'workload.canaryIntervalSec');
  if (
    workload.periodicCanarySchedule != null
    && workload.periodicCanarySchedule !== 'full-sweep'
    && workload.periodicCanarySchedule !== 'rotating-one'
  ) {
    throw new Error(
      "workload.periodicCanarySchedule must be 'full-sweep' or 'rotating-one'"
    );
  }
  if (workload.canaryConcurrency != null) {
    requirePositive(workload.canaryConcurrency, 'workload.canaryConcurrency');
    if (!Number.isSafeInteger(workload.canaryConcurrency)) {
      throw new Error('workload.canaryConcurrency must be a safe integer');
    }
  }
  requirePositive(workload.requestTimeoutMs, 'workload.requestTimeoutMs');
  requirePositive(workload.warmupTimeoutMs, 'workload.warmupTimeoutMs');
  requirePositive(
    workload.warmupTimeoutPerSurfaceMs,
    'workload.warmupTimeoutPerSurfaceMs'
  );
  if (workload.warmupConcurrency != null) {
    requirePositive(workload.warmupConcurrency, 'workload.warmupConcurrency');
    if (!Number.isSafeInteger(workload.warmupConcurrency)) {
      throw new Error('workload.warmupConcurrency must be a safe integer');
    }
  }
};

const assertJsonPathMatches = (value: unknown, label: string): void => {
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error(`${label} must contain at least one typed JSON-path match`);
  }
  for (const [index, match] of value.entries()) {
    if (!match || typeof match !== 'object') {
      throw new Error(`${label}[${index}] must be an object`);
    }
    const record = match as Record<string, unknown>;
    if (typeof record.path !== 'string' || (record.path !== '' && !record.path.startsWith('/'))) {
      throw new Error(`${label}[${index}].path must be an RFC 6901 JSON pointer`);
    }
    if (!Object.prototype.hasOwnProperty.call(record, 'value')) {
      throw new Error(`${label}[${index}] must define value`);
    }
  }
};

const assertJsonPathInvariants = (value: unknown, label: string): void => {
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error(`${label} must contain at least one JSON-path invariant`);
  }
  for (const [index, invariant] of value.entries()) {
    if (!invariant || typeof invariant !== 'object') {
      throw new Error(`${label}[${index}] must be an object`);
    }
    const record = invariant as Record<string, unknown>;
    if (typeof record.path !== 'string' || (record.path !== '' && !record.path.startsWith('/'))) {
      throw new Error(`${label}[${index}].path must be an RFC 6901 JSON pointer`);
    }
    if (!Object.prototype.hasOwnProperty.call(record, 'everyEquals')) {
      throw new Error(`${label}[${index}] must define everyEquals`);
    }
    if (!Number.isSafeInteger(record.min) || (record.min as number) <= 0) {
      throw new Error(`${label}[${index}].min must be a positive safe integer`);
    }
    if (
      record.max != null
      && (
        !Number.isSafeInteger(record.max)
        || (record.max as number) < (record.min as number)
      )
    ) {
      throw new Error(`${label}[${index}].max must be a safe integer at least min`);
    }
  }
};

const GRAPHQL_VARIABLE_NAME = /^[_A-Za-z][_0-9A-Za-z]*$/;

const assertResponseVariableBindings = (
  value: unknown,
  staticVariables: unknown,
  label: string
): void => {
  if (value == null) return;
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${label} must be an object`);
  }
  const entries = Object.entries(value as Record<string, unknown>);
  if (entries.length === 0) throw new Error(`${label} must not be empty`);
  const configuredStaticVariables = staticVariables && typeof staticVariables === 'object'
    && !Array.isArray(staticVariables)
    ? staticVariables as Record<string, unknown>
    : {};
  for (const [name, pointer] of entries) {
    if (!GRAPHQL_VARIABLE_NAME.test(name)) {
      throw new Error(`${label} has invalid GraphQL variable '${name}'`);
    }
    if (Object.prototype.hasOwnProperty.call(configuredStaticVariables, name)) {
      throw new Error(`${label}.${name} collides with a static variable`);
    }
    if (typeof pointer !== 'string' || (pointer !== '' && !pointer.startsWith('/'))) {
      throw new Error(`${label}.${name} must be an RFC 6901 JSON pointer`);
    }
  }
};

const assertOptionalOperationOracle = (
  operation: TenantTarget['surfaces'][number]['warmup'],
  label: string
): void => {
  const hasRequired = operation.requiredMatches != null;
  const hasForbidden = operation.forbiddenMatches != null;
  if (hasRequired !== hasForbidden) {
    throw new Error(`${label} must configure requiredMatches and forbiddenMatches together`);
  }
  if (hasRequired) {
    assertJsonPathMatches(operation.requiredMatches, `${label}.requiredMatches`);
    assertJsonPathMatches(operation.forbiddenMatches, `${label}.forbiddenMatches`);
  }
  if (operation.invariants != null) {
    assertJsonPathInvariants(operation.invariants, `${label}.invariants`);
  }
  const verification = operation.postCoverageVerification;
  if (verification != null) {
    if (typeof verification.query !== 'string' || !verification.query.trim()) {
      throw new Error(`${label}.postCoverageVerification has no query`);
    }
    assertJsonPathMatches(
      verification.requiredMatches,
      `${label}.postCoverageVerification.requiredMatches`
    );
    assertJsonPathMatches(
      verification.forbiddenMatches,
      `${label}.postCoverageVerification.forbiddenMatches`
    );
    if (verification.invariants != null) {
      assertJsonPathInvariants(
        verification.invariants,
        `${label}.postCoverageVerification.invariants`
      );
    }
    assertResponseVariableBindings(
      verification.variablesFromResponse,
      verification.variables,
      `${label}.postCoverageVerification.variablesFromResponse`
    );
  }
};

const hasConclusiveOperationOracle = (
  operation: TenantTarget['surfaces'][number]['warmup']
): boolean => Boolean(
  (operation.requiredMatches?.length && operation.forbiddenMatches?.length)
  || (
    operation.postCoverageVerification?.requiredMatches.length
    && operation.postCoverageVerification.forbiddenMatches.length
  )
);

const ENVIRONMENT_NAME = /^[A-Za-z_][A-Za-z0-9_]*$/;
const isExactJsonPointer = (value: unknown): value is string =>
  typeof value === 'string'
  && value.startsWith('/')
  && value.split('/').slice(1).every((segment) =>
    segment !== '*' && !/~(?:[^01]|$)/.test(segment)
  );
const FORBIDDEN_DRIVER_HEADERS = new Set([
  'connection',
  'content-length',
  'host',
  'sec-websocket-accept',
  'sec-websocket-extensions',
  'sec-websocket-key',
  'sec-websocket-protocol',
  'sec-websocket-version',
  'transfer-encoding',
  'upgrade'
]);
const SENSITIVE_HEADERS = new Set(['authorization', 'cookie', 'proxy-authorization']);

const assertRealtimeProbe = (
  surface: TenantTarget['surfaces'][number],
  label: string
): void => {
  if (!surface.realtime || typeof surface.realtime !== 'object') {
    throw new Error(`${label} has no realtime probe`);
  }
  for (const operationName of ['subscription', 'prime'] as const) {
    const operation = surface.realtime[operationName];
    if (!operation || typeof operation.query !== 'string' || !operation.query.trim()) {
      throw new Error(`${label}.realtime.${operationName} has no query`);
    }
    assertJsonPathMatches(
      operation.requiredMatches,
      `${label}.realtime.${operationName}.requiredMatches`
    );
    assertJsonPathMatches(
      operation.forbiddenMatches,
      `${label}.realtime.${operationName}.forbiddenMatches`
    );
  }
  const correlation = surface.realtime.correlation;
  if (
    !correlation
    || typeof correlation !== 'object'
    || !/^[_A-Za-z][_0-9A-Za-z]*$/.test(correlation.primeVariable ?? '')
    || !isExactJsonPointer(correlation.primeResponsePath)
    || !isExactJsonPointer(correlation.subscriptionEventPath)
    || !Object.prototype.hasOwnProperty.call(
      surface.realtime.prime.variables ?? {},
      correlation.primeVariable
    )
  ) {
    throw new Error(`${label}.realtime.correlation is invalid`);
  }
  if (
    surface.realtime.prime.requiredMatches.some(
      (match) => match.path === correlation.primeResponsePath
    )
    || surface.realtime.subscription.requiredMatches.some(
      (match) => match.path === correlation.subscriptionEventPath
    )
  ) {
    throw new Error(
      `${label}.realtime.correlation paths must not carry a static required match`
    );
  }
  const inlineHeaders = new Set<string>();
  for (const [name, value] of Object.entries(surface.headers ?? {})) {
    const normalized = name.trim().toLowerCase();
    if (!normalized || typeof value !== 'string') {
      throw new Error(`${label}.headers must contain nonempty string values`);
    }
    if (FORBIDDEN_DRIVER_HEADERS.has(normalized)) {
      throw new Error(`${label}.headers cannot override '${normalized}'`);
    }
    if (SENSITIVE_HEADERS.has(normalized)) {
      throw new Error(
        `${label}.${normalized} must use realtime.headersFromEnvironment`
      );
    }
    if (inlineHeaders.has(normalized)) {
      throw new Error(`${label}.headers contains duplicate '${normalized}'`);
    }
    inlineHeaders.add(normalized);
  }
  const environmentHeaders = new Set<string>();
  const mappings = surface.realtime.headersFromEnvironment ?? {};
  if (!mappings || typeof mappings !== 'object' || Array.isArray(mappings)) {
    throw new Error(`${label}.realtime.headersFromEnvironment must be an object`);
  }
  for (const [name, environmentName] of Object.entries(mappings)) {
    const normalized = name.trim().toLowerCase();
    if (
      !normalized
      || FORBIDDEN_DRIVER_HEADERS.has(normalized)
      || typeof environmentName !== 'string'
      || !ENVIRONMENT_NAME.test(environmentName)
    ) {
      throw new Error(`${label}.realtime.headersFromEnvironment is invalid`);
    }
    if (inlineHeaders.has(normalized) || environmentHeaders.has(normalized)) {
      throw new Error(`${label} configures header '${normalized}' more than once`);
    }
    environmentHeaders.add(normalized);
  }
};

export const assertIsolatedPort = (port: number, allowReserved = false): void => {
  requirePositive(port, 'arm.port');
  if (!allowReserved && RESERVED_PORTS.has(port)) {
    throw new Error(`refusing reserved shared-workspace port ${port}`);
  }
};

export const assertLoopbackObservabilityUrl = (value: string, expectedPort: number): void => {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error(`memoryUrl is not a valid URL: ${value}`);
  }
  const valid = url.protocol === 'http:'
    && LOOPBACK_HOSTS.has(url.hostname.toLowerCase())
    && Number(url.port) === expectedPort
    && !url.username
    && !url.password
    && url.pathname === '/debug/memory'
    && !url.search
    && !url.hash;
  if (!valid) {
    throw new Error(
      `memoryUrl must be the credential-free URL http://127.0.0.1:${expectedPort}/debug/memory `
      + '(localhost and ::1 are also accepted)'
    );
  }
};

export const assertLoopbackRetainedHeapCheckpointUrl = (
  value: string,
  expectedPort: number
): void => {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error(`retainedHeapCheckpointUrl is not a valid URL: ${value}`);
  }
  const valid = url.protocol === 'http:'
    && LOOPBACK_HOSTS.has(url.hostname.toLowerCase())
    && Number(url.port) === expectedPort
    && !url.username
    && !url.password
    && url.pathname === '/__cperf/retained-memory-checkpoint'
    && !url.search
    && !url.hash;
  if (!valid) {
    throw new Error(
      'retainedHeapCheckpointUrl must be the credential-free URL '
      + `http://127.0.0.1:${expectedPort}/__cperf/retained-memory-checkpoint `
      + '(localhost and ::1 are also accepted)'
    );
  }
};

export const loadPlan = (file: string, allowReserved = false): DensityPlanV1 => {
  const planPath = path.resolve(file);
  const planBytes = fs.readFileSync(planPath);
  const plan = JSON.parse(planBytes.toString('utf8')) as DensityPlanV1;
  plan.sourceSha256 = fileSha256(planBytes);
  if (plan.version !== 1) throw new Error('density plan version must be 1');
  if (!Array.isArray(plan.arms) || plan.arms.length === 0) throw new Error('plan.arms is empty');
  if (!Array.isArray(plan.heapMiB) || plan.heapMiB.length === 0) throw new Error('plan.heapMiB is empty');
  requirePositive(plan.repetitions, 'plan.repetitions');
  if (!Number.isInteger(plan.repetitions)) throw new Error('plan.repetitions must be an integer');
  validateWorkloadPlan(plan.workload);
  validateAcceptanceGates(plan.gates);
  if (!Array.isArray(plan.requiredCapabilities) || plan.requiredCapabilities.length === 0) {
    throw new Error('plan.requiredCapabilities is empty');
  }
  if (!Array.isArray(plan.requiredCanaries) || plan.requiredCanaries.length === 0) {
    throw new Error('plan.requiredCanaries is empty');
  }
  if (new Set(plan.heapMiB).size !== plan.heapMiB.length) {
    throw new Error('heapMiB must not contain duplicates');
  }
  for (const heap of plan.heapMiB) {
    requirePositive(heap, 'heapMiB');
    if (!Number.isInteger(heap)) throw new Error('heapMiB must contain integers');
    validateCountRamp(tenantCountsForHeap(plan, heap), `tenant counts for heapMiB=${heap}`);
  }
  if (plan.qualification != null) {
    if (
      typeof plan.qualification !== 'object'
      || Array.isArray(plan.qualification)
      || typeof plan.qualification.baselineArm !== 'string'
      || !plan.qualification.baselineArm
    ) {
      throw new Error('plan.qualification.baselineArm must be a nonempty string');
    }
    if (!plan.arms.some((arm) => arm.name === plan.qualification!.baselineArm)) {
      throw new Error(
        `plan.qualification.baselineArm '${plan.qualification.baselineArm}' is not configured`
      );
    }
    validateCountRamp(
      plan.qualification.requiredHeapMiB,
      'plan.qualification.requiredHeapMiB'
    );
    for (const heap of plan.qualification.requiredHeapMiB) {
      if (!plan.heapMiB.includes(heap)) {
        throw new Error(`qualification heap ${heap}MiB is not configured in plan.heapMiB`);
      }
    }
    requirePositive(
      plan.qualification.minimumRepetitions,
      'plan.qualification.minimumRepetitions'
    );
    if (!Number.isSafeInteger(plan.qualification.minimumRepetitions)) {
      throw new Error('plan.qualification.minimumRepetitions must be a safe integer');
    }
    if (plan.repetitions < plan.qualification.minimumRepetitions) {
      throw new Error(
        `plan.repetitions=${plan.repetitions} is below qualification minimum=${plan.qualification.minimumRepetitions}`
      );
    }
    const hostileEvidence = plan.qualification.hostileValidationEvidence;
    if (hostileEvidence != null) {
      if (!hasExactHostileValidationEvidence(plan)) {
        throw new Error(
          'plan.qualification.hostileValidationEvidence must bind every exact arm'
        );
      }
      for (const arm of plan.arms) {
        const binding = hostileEvidence[arm.name];
        const artifactFile = path.resolve(path.dirname(planPath), binding.artifactFile);
        const stat = fs.lstatSync(artifactFile);
        if (stat.isSymbolicLink() || !stat.isFile()) {
          throw new Error(`hostile validation artifact for '${arm.name}' is not a regular file`);
        }
        const bytes = fs.readFileSync(artifactFile);
        if (fileSha256(bytes) !== binding.artifactSha256) {
          throw new Error(`hostile validation artifact for '${arm.name}' has the wrong SHA-256`);
        }
        const report = JSON.parse(bytes.toString('utf8')) as Record<string, unknown>;
        if (
          report.version !== 1
          || report.kind !== binding.kind
          || report.passed !== true
          || report.arm !== arm.name
          || report.runtimeArtifactFingerprint !== binding.runtimeArtifactFingerprint
          || report.configurationFingerprint !== binding.configurationFingerprint
        ) {
          throw new Error(
            `hostile validation artifact for '${arm.name}' does not bind its exact runtime/config`
          );
        }
        binding.artifactFile = artifactFile;
      }
    }
  }
  if (plan.soak != null) {
    if (typeof plan.soak !== 'object' || Array.isArray(plan.soak)) {
      throw new Error('plan.soak must be an object');
    }
    requireBoolean(plan.soak.enabled, 'plan.soak.enabled');
    if (plan.soak.enabled) {
      requirePositive(plan.soak.durationSec, 'plan.soak.durationSec');
      requirePositive(plan.soak.tenantCount, 'plan.soak.tenantCount');
      requirePositive(plan.soak.heapMiB, 'plan.soak.heapMiB');
      for (const [value, label] of [
        [plan.soak.durationSec, 'plan.soak.durationSec'],
        [plan.soak.tenantCount, 'plan.soak.tenantCount'],
        [plan.soak.heapMiB, 'plan.soak.heapMiB']
      ] as const) {
        if (!Number.isSafeInteger(value)) throw new Error(`${label} must be a safe integer`);
      }
      if (!plan.heapMiB.includes(plan.soak.heapMiB)) {
        throw new Error(`plan.soak.heapMiB=${plan.soak.heapMiB} is not configured`);
      }
      if (plan.soak.arm != null && (
        typeof plan.soak.arm !== 'string' || !plan.soak.arm.trim()
      )) {
        throw new Error('plan.soak.arm must be a nonempty string');
      }
      const armName = soakArmName(plan);
      if (!plan.arms.some((arm) => arm.name === armName)) {
        throw new Error(`plan.soak.arm '${armName}' is not configured`);
      }
    }
  }
  if (plan.tenantCountsByHeapMiB != null) {
    if (
      typeof plan.tenantCountsByHeapMiB !== 'object'
      || Array.isArray(plan.tenantCountsByHeapMiB)
    ) {
      throw new Error('tenantCountsByHeapMiB must be an object');
    }
    const configuredHeaps = new Set(plan.heapMiB.map(String));
    for (const [heap, counts] of Object.entries(plan.tenantCountsByHeapMiB)) {
      if (!configuredHeaps.has(heap)) {
        throw new Error(`tenantCountsByHeapMiB contains unconfigured heap '${heap}'`);
      }
      validateCountRamp(counts, `tenantCountsByHeapMiB.${heap}`);
    }
  }
  plan.runOrderSeed ??= DEFAULT_RUN_ORDER_SEED;
  if (!plan.runOrderSeed.trim()) throw new Error('runOrderSeed must not be empty');
  const armNames = new Set<string>();
  const armPorts = new Set<number>();
  for (const arm of plan.arms) {
    if (!arm.name || armNames.has(arm.name)) throw new Error(`duplicate or empty arm name '${arm.name}'`);
    if (armPorts.has(arm.port)) throw new Error(`duplicate arm port ${arm.port}`);
    armNames.add(arm.name);
    armPorts.add(arm.port);
    arm.v8Profile ??= 'stock';
    if (!NODE_V8_PROFILES.has(arm.v8Profile)) {
      throw new Error(`arm '${arm.name}' has unknown v8Profile '${arm.v8Profile}'`);
    }
    if (arm.command?.some((argument) => MANAGED_V8_FLAG.test(argument))) {
      throw new Error(
        `arm '${arm.name}' must configure managed V8 flags through v8Profile`
      );
    }
    for (const [heap, environment] of [
      ['default', arm.env],
      ...Object.entries(arm.envByHeapMiB ?? {})
    ] as Array<[string, Record<string, string> | undefined]>) {
      const nodeOptions = environment?.NODE_OPTIONS?.split(/\s+/) ?? [];
      if (nodeOptions.some((argument) => MANAGED_V8_FLAG.test(argument))) {
        throw new Error(
          `arm '${arm.name}' NODE_OPTIONS for ${heap} must configure managed V8 flags through v8Profile`
        );
      }
    }
    if (
      arm.v8Profile !== 'stock'
      && arm.command?.length
      && !['node', 'node.exe'].includes(path.basename(arm.command[0]).toLowerCase())
    ) {
      throw new Error(`arm '${arm.name}' non-stock v8Profile requires a Node command`);
    }
    assertIsolatedPort(arm.port, allowReserved);
    if (!Array.isArray(arm.command) && !arm.readinessUrl) {
      throw new Error(`arm '${arm.name}' needs command or readinessUrl`);
    }
    if (arm.command?.length && !arm.commit) {
      throw new Error(`arm '${arm.name}' must pin commit for a spawned run`);
    }
    if (arm.command?.length && plan.gates.requireRetainedMemoryCheckpoints) {
      if (!arm.command.includes('--expose-gc')) {
        throw new Error(`arm '${arm.name}' must launch Node with --expose-gc`);
      }
      if (!arm.retainedHeapCheckpointUrl) {
        throw new Error(`arm '${arm.name}' needs retainedHeapCheckpointUrl`);
      }
      const checkpointUrl = resolveTemplate(arm.retainedHeapCheckpointUrl!, {
        heapMiB: plan.heapMiB[0],
        port: arm.port,
        artifactDir: plan.artifactDir,
        mode: arm.introspectionMode,
        tenantCount: tenantCountsForHeap(plan, plan.heapMiB[0])[0]
      });
      assertLoopbackRetainedHeapCheckpointUrl(checkpointUrl, arm.port);
      for (const heapMiB of plan.heapMiB) {
        if (
          armEnvironmentForHeap(arm, heapMiB)
            .GRAPHQL_CPERF_RETAINED_HEAP_ENABLED !== 'true'
        ) {
          throw new Error(
            `arm '${arm.name}' must set GRAPHQL_CPERF_RETAINED_HEAP_ENABLED=true for heap ${heapMiB}`
          );
        }
      }
    }
    if (arm.entrySha256 && !SHA256.test(arm.entrySha256)) {
      throw new Error(`arm '${arm.name}' entrySha256 must be a SHA-256 hex digest`);
    }
    if (arm.lockfileSha256 && !SHA256.test(arm.lockfileSha256)) {
      throw new Error(`arm '${arm.name}' lockfileSha256 must be a SHA-256 hex digest`);
    }
    if (arm.envByHeapMiB != null) {
      if (typeof arm.envByHeapMiB !== 'object' || Array.isArray(arm.envByHeapMiB)) {
        throw new Error(`arm '${arm.name}' envByHeapMiB must be an object`);
      }
      const configuredHeaps = new Set(plan.heapMiB.map(String));
      for (const heap of configuredHeaps) {
        if (!Object.prototype.hasOwnProperty.call(arm.envByHeapMiB, heap)) {
          throw new Error(`arm '${arm.name}' envByHeapMiB is missing heap '${heap}'`);
        }
      }
      for (const [heap, environment] of Object.entries(arm.envByHeapMiB)) {
        if (!configuredHeaps.has(heap)) {
          throw new Error(`arm '${arm.name}' envByHeapMiB contains unconfigured heap '${heap}'`);
        }
        if (
          !environment
          || typeof environment !== 'object'
          || Array.isArray(environment)
          || Object.entries(environment).some(([key, value]) =>
            !key || typeof value !== 'string'
          )
        ) {
          throw new Error(`arm '${arm.name}' envByHeapMiB.${heap} must contain string values`);
        }
      }
    }
    if (plan.gates.requirePostgresMemoryTelemetry && !arm.postgresContainer) {
      throw new Error(`arm '${arm.name}' needs postgresContainer for required PostgreSQL telemetry`);
    }
    if (plan.gates.requireFreshPostgresRunAttestation) {
      const attestation = arm.postgresRunAttestation;
      if (!attestation || !Array.isArray(attestation.command) || attestation.command.length === 0) {
        throw new Error(
          `arm '${arm.name}' needs postgresRunAttestation.command for fresh PostgreSQL evidence`
        );
      }
      if (
        attestation.command.some((part) => typeof part !== 'string' || !part)
        || !Array.isArray(attestation.prepareCommand)
        || attestation.prepareCommand.length === 0
        || attestation.prepareCommand.some((part) => typeof part !== 'string' || !part)
        || (
          attestation.timeoutMs != null
          && (
            !Number.isSafeInteger(attestation.timeoutMs)
            || attestation.timeoutMs <= 0
          )
        )
      ) {
        throw new Error(`arm '${arm.name}' has invalid postgresRunAttestation config`);
      }
      const requiredServerTemplates = [
        '{postgresManifestFile}',
        '{postgresSecretsFile}',
        '{postgresManifestSha256}',
        '{postgresCloneId}'
      ];
      const requiredPrepareTemplates = [
        '{postgresFixtureDir}',
        '{arm}',
        '{heapMiB}',
        '{tenantCount}',
        '{repetition}',
        '{runOrderIndex}'
      ];
      const requiredAuditTemplates = [
        '{postgresManifestFile}',
        '{postgresSecretsFile}',
        '{attestationFile}',
        '{planSha256}',
        '{fleetSha256}',
        '{notBeforeEpochMs}'
      ];
      if (
        !arm.command?.length
        || requiredServerTemplates.some((template) => !arm.command!.includes(template))
        || requiredPrepareTemplates.some((template) =>
          !attestation.prepareCommand.includes(template)
        )
        || requiredAuditTemplates.some((template) =>
          !attestation.command.includes(template)
        )
      ) {
        throw new Error(
          `arm '${arm.name}' does not bind the fresh PostgreSQL fixture into its server command`
        );
      }
    }
  }
  plan.fleetFile = path.resolve(path.dirname(planPath), plan.fleetFile);
  plan.artifactDir = path.resolve(path.dirname(planPath), plan.artifactDir);
  return plan;
};

export const loadFleet = (file: string): FleetV1 => {
  const fleetBytes = fs.readFileSync(path.resolve(file));
  const fleet = JSON.parse(fleetBytes.toString('utf8')) as FleetV1;
  fleet.sourceSha256 = fileSha256(fleetBytes);
  if (fleet.version !== 1) throw new Error('fleet version must be 1');
  if (!Array.isArray(fleet.tenants) || fleet.tenants.length === 0) {
    throw new Error('fleet.tenants is empty');
  }
  const tenantIds = new Set<string>();
  for (const tenant of fleet.tenants) {
    if (!tenant.id || tenantIds.has(tenant.id)) throw new Error(`duplicate or empty tenant id '${tenant.id}'`);
    tenantIds.add(tenant.id);
    if (!Array.isArray(tenant.surfaces) || tenant.surfaces.length === 0) {
      throw new Error(`tenant '${tenant.id}' has no surfaces`);
    }
    const surfaceNames = new Set<string>();
    for (const surface of tenant.surfaces) {
      if (!surface.name || surfaceNames.has(surface.name)) {
        throw new Error(`tenant '${tenant.id}' has duplicate or empty surface '${surface.name}'`);
      }
      surfaceNames.add(surface.name);
      const armContracts = surface.buildContracts;
      if (!surface.buildContract && !armContracts) {
        throw new Error(
          `tenant '${tenant.id}' surface '${surface.name}' has no buildContract or buildContracts`
        );
      }
      if (armContracts && (
        Object.keys(armContracts).length === 0
        || Object.values(armContracts).some((contract) => !contract)
      )) {
        throw new Error(
          `tenant '${tenant.id}' surface '${surface.name}' has incomplete buildContracts`
        );
      }
      if (!surface.url || !surface.warmup || surface.operations.length === 0) {
        throw new Error(`tenant '${tenant.id}' surface '${surface.name}' is incomplete`);
      }
      if (!surface.warmup.name || !surface.warmup.capability || !surface.warmup.query) {
        throw new Error(`tenant '${tenant.id}' surface '${surface.name}' has an incomplete warmup`);
      }
      assertOptionalOperationOracle(
        surface.warmup,
        `tenant '${tenant.id}' surface '${surface.name}'.warmup`
      );
      const operationNames = new Set<string>();
      for (const operation of surface.operations) {
        if (!operation.name || operationNames.has(operation.name)) {
          throw new Error(`tenant '${tenant.id}' surface '${surface.name}' has duplicate or empty operation '${operation.name}'`);
        }
        operationNames.add(operation.name);
        if (!operation.capability || !operation.query) {
          throw new Error(`operation '${operation.name}' is incomplete`);
        }
        if (operation.weight != null && (!Number.isFinite(operation.weight) || operation.weight <= 0)) {
          throw new Error(`operation '${operation.name}' weight must be positive`);
        }
        assertOptionalOperationOracle(
          operation,
          `tenant '${tenant.id}' surface '${surface.name}' operation '${operation.name}'`
        );
      }
      if (!Array.isArray(surface.canaries) || surface.canaries.length === 0) {
        throw new Error(`tenant '${tenant.id}' surface '${surface.name}' has no isolation canaries`);
      }
      const canaryNames = new Set<string>();
      for (const canary of surface.canaries) {
        if (!canary.name || canaryNames.has(canary.name)) {
          throw new Error(`tenant '${tenant.id}' surface '${surface.name}' has duplicate or empty canary '${canary.name}'`);
        }
        canaryNames.add(canary.name);
        if (!canary.query) throw new Error(`canary '${canary.name}' has no query`);
        assertJsonPathMatches(
          canary.forbiddenMatches,
          `canary '${canary.name}'.forbiddenMatches`
        );
        assertJsonPathMatches(
          canary.requiredMatches,
          `canary '${canary.name}'.requiredMatches`
        );
        if (canary.invariants != null) {
          assertJsonPathInvariants(
            canary.invariants,
            `canary '${canary.name}'.invariants`
          );
        }
      }
      if (surface.realtime) {
        assertRealtimeProbe(
          surface,
          `tenant '${tenant.id}' surface '${surface.name}'`
        );
      }
    }
    validateCustomerTopology(tenant);
  }
  return fleet;
};

export const validateCustomerTopology = (customer: TenantTarget): void => {
  if (customer.databases == null) return;
  if (!Array.isArray(customer.databases) || customer.databases.length === 0) {
    throw new Error(`customer '${customer.id}' has an empty database topology`);
  }
  const configuredSurfaces = new Set(customer.surfaces.map((surface) => surface.name));
  const mappedSurfaces = new Set<string>();
  const databaseIds = new Set<string>();
  const apiIds = new Set<string>();
  for (const database of customer.databases) {
    if (!database.id || databaseIds.has(database.id)) {
      throw new Error(`customer '${customer.id}' has duplicate or empty database id '${database.id}'`);
    }
    databaseIds.add(database.id);
    if (!database.physicalDatabase?.trim()) {
      throw new Error(`customer '${customer.id}' database '${database.id}' has no physical database`);
    }
    if (!Array.isArray(database.apis) || database.apis.length === 0) {
      throw new Error(`customer '${customer.id}' database '${database.id}' has no APIs`);
    }
    for (const api of database.apis) {
      if (!api.id || apiIds.has(api.id)) {
        throw new Error(`customer '${customer.id}' has duplicate or empty API id '${api.id}'`);
      }
      apiIds.add(api.id);
      if (!api.runtimePoolIdentity && !api.runtimePoolIdentities) {
        throw new Error(`customer '${customer.id}' API '${api.id}' has no runtime pool identity`);
      }
      if (api.runtimePoolIdentities && (
        Object.keys(api.runtimePoolIdentities).length === 0
        || Object.values(api.runtimePoolIdentities).some((identity) => !identity)
      )) {
        throw new Error(`customer '${customer.id}' API '${api.id}' has incomplete runtime pool identities`);
      }
      if (
        !Array.isArray(api.physicalSchemas)
        || api.physicalSchemas.length === 0
        || api.physicalSchemas.some((schema) => typeof schema !== 'string' || !schema)
        || new Set(api.physicalSchemas).size !== api.physicalSchemas.length
      ) {
        throw new Error(`customer '${customer.id}' API '${api.id}' has invalid physical schemas`);
      }
      if (
        !Array.isArray(api.routingLabels)
        || api.routingLabels.length === 0
        || api.routingLabels.some((label) => typeof label !== 'string' || !label)
        || new Set(api.routingLabels).size !== api.routingLabels.length
      ) {
        throw new Error(`customer '${customer.id}' API '${api.id}' has invalid routing labels`);
      }
      if (typeof api.realtime !== 'boolean') {
        throw new Error(`customer '${customer.id}' API '${api.id}' has no explicit realtime flag`);
      }
      if (
        !Array.isArray(api.surfaces)
        || api.surfaces.length === 0
        || new Set(api.surfaces).size !== api.surfaces.length
      ) {
        throw new Error(`customer '${customer.id}' API '${api.id}' has invalid surfaces`);
      }
      for (const surface of api.surfaces) {
        if (!configuredSurfaces.has(surface)) {
          throw new Error(`customer '${customer.id}' API '${api.id}' maps unknown surface '${surface}'`);
        }
        if (mappedSurfaces.has(surface)) {
          throw new Error(`customer '${customer.id}' maps surface '${surface}' more than once`);
        }
        const configuredSurface = customer.surfaces.find((candidate) =>
          candidate.name === surface
        );
        if (api.realtime !== Boolean(configuredSurface?.realtime)) {
          throw new Error(
            `customer '${customer.id}' API '${api.id}' realtime topology disagrees with surface '${surface}'`
          );
        }
        mappedSurfaces.add(surface);
      }
    }
  }
  const missingSurfaces = [...configuredSurfaces].filter((surface) => !mappedSurfaces.has(surface));
  if (missingSurfaces.length > 0) {
    throw new Error(
      `customer '${customer.id}' topology omits surfaces: ${missingSurfaces.join(', ')}`
    );
  }
};

export const validateCoverage = (plan: DensityPlanV1, fleet: FleetV1): void => {
  const failures: string[] = [];
  const databaseOwners = new Map<string, string>();
  const apiOwners = new Map<string, string>();
  const matrixCounts = plan.heapMiB?.flatMap((heap) => tenantCountsForHeap(plan, heap))
    ?? plan.tenantCounts
    ?? [];
  const maxTenantCount = Math.max(0, ...matrixCounts, plan.soak?.tenantCount ?? 0);
  if (fleet.tenants.length < maxTenantCount) {
    failures.push(`fleet has ${fleet.tenants.length} tenants but the matrix requests ${maxTenantCount}`);
  }
  if (
    plan.gates?.requireCompletePeriodicCanaryCoverage
    && (plan.workload.periodicCanarySchedule ?? 'full-sweep') === 'rotating-one'
  ) {
    const timedRounds = Math.max(
      0,
      Math.ceil(plan.workload.durationSec / plan.workload.canaryIntervalSec) - 1
    );
    const selectedFleet = fleet.tenants.slice(0, maxTenantCount || fleet.tenants.length);
    const maxConfiguredCanaries = Math.max(
      0,
      ...selectedFleet.flatMap((tenant) =>
        tenant.surfaces.map((surface) => surface.canaries.length)
      )
    );
    if (timedRounds < maxConfiguredCanaries) {
      failures.push(
        `rotating periodic canary schedule has ${timedRounds} timed rounds but `
        + `a qualifying surface configures ${maxConfiguredCanaries} canaries`
      );
    }
  }
  for (const tenant of fleet.tenants) {
    if (plan.gates?.requireExplicitCustomerTopology && !tenant.databases) {
      failures.push(`${tenant.id} has no explicit customer -> database -> API topology`);
    }
    const capabilities = new Set(tenant.surfaces.flatMap((surface) =>
      surface.operations.map((operation) => operation.capability)
    ));
    const missingCapabilities = plan.requiredCapabilities.filter((capability) =>
      !capabilities.has(capability)
    );
    if (missingCapabilities.length > 0) {
      failures.push(`${tenant.id} has no operations for capabilities: ${missingCapabilities.join(', ')}`);
    }
    for (const surface of tenant.surfaces) {
      if (plan.gates?.requireConclusiveOperationOracles) {
        if (!hasConclusiveOperationOracle(surface.warmup)) {
          failures.push(
            `${tenant.id}/${surface.name} warmup has no conclusive response oracle`
          );
        }
        const missingOperationOracles = surface.operations
          .filter((operation) => !hasConclusiveOperationOracle(operation))
          .map((operation) => operation.name);
        if (missingOperationOracles.length > 0) {
          failures.push(
            `${tenant.id}/${surface.name} operations lack conclusive response oracles: `
            + missingOperationOracles.join(', ')
          );
        }
      }
      if (surface.buildContracts) {
        const missingArms = (plan.arms ?? [])
          .filter((arm) => !surface.buildContracts?.[arm.name])
          .map((arm) => arm.name);
        if (missingArms.length > 0) {
          failures.push(
            `${tenant.id}/${surface.name} lacks exact build contracts for arms: ${missingArms.join(', ')}`
          );
        }
      }
      const canaries = new Set(surface.canaries.map((canary) => canary.name));
      const missing = plan.requiredCanaries.filter((canary) => !canaries.has(canary));
      if (missing.length > 0) {
        failures.push(`${tenant.id}/${surface.name} lacks canaries: ${missing.join(', ')}`);
      }
    }
    for (const database of tenant.databases ?? []) {
      const databaseOwner = databaseOwners.get(database.id);
      if (databaseOwner && databaseOwner !== tenant.id) {
        failures.push(
          `logical database id '${database.id}' is reused across customers '${databaseOwner}' and '${tenant.id}'`
        );
      } else {
        databaseOwners.set(database.id, tenant.id);
      }
      for (const api of database.apis) {
        const apiOwner = apiOwners.get(api.id);
        if (apiOwner && apiOwner !== tenant.id) {
          failures.push(
            `API id '${api.id}' is reused across customers '${apiOwner}' and '${tenant.id}'`
          );
        } else {
          apiOwners.set(api.id, tenant.id);
        }
        if (api.runtimePoolIdentities) {
          const missingArms = (plan.arms ?? [])
            .filter((arm) => !api.runtimePoolIdentities?.[arm.name])
            .map((arm) => arm.name);
          if (missingArms.length > 0) {
            failures.push(
              `${tenant.id}/${database.id}/${api.id} lacks exact runtime pool identities for arms: ${missingArms.join(', ')}`
            );
          }
        }
      }
    }
  }
  const arms = plan.arms?.length
    ? plan.arms.map((arm) => arm.name)
    : ['default'];
  for (const armName of arms) {
    const owners = new Map<string, string>();
    const poolOwners = new Map<string, string>();
    for (const tenant of fleet.tenants) {
      for (const surface of tenant.surfaces) {
        const identity = armName === 'default'
          ? surface.buildContract
          : surface.buildContracts?.[armName] ?? surface.buildContract;
        if (!identity) continue;
        const owner = owners.get(identity);
        if (owner && owner !== tenant.id) {
          failures.push(
            `build contract '${identity}' for arm '${armName}' is reused across tenants '${owner}' and '${tenant.id}'`
          );
        } else {
          owners.set(identity, tenant.id);
        }
      }
      for (const database of tenant.databases ?? []) {
        for (const api of database.apis) {
          const identity = armName === 'default'
            ? api.runtimePoolIdentity
            : api.runtimePoolIdentities?.[armName] ?? api.runtimePoolIdentity;
          if (!identity) continue;
          const owner = poolOwners.get(identity);
          if (owner && owner !== tenant.id) {
            failures.push(
              `runtime pool identity '${identity}' for arm '${armName}' is reused across customers '${owner}' and '${tenant.id}'`
            );
          } else {
            poolOwners.set(identity, tenant.id);
          }
        }
      }
    }
  }
  if (failures.length > 0) {
    throw new Error(`density fixture is not qualification-complete:\n- ${failures.join('\n- ')}`);
  }
};

export const resolveTemplate = (
  value: string,
  vars: Record<string, string | number>
): string => value.replace(/\{([a-zA-Z][a-zA-Z0-9]*)\}/g, (_match, key: string) => {
  if (!(key in vars)) throw new Error(`unknown template variable '${key}'`);
  return String(vars[key]);
});
