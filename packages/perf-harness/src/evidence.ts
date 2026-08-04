import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { isDeepStrictEqual } from 'node:util';

import {
  DEFAULT_RUN_ORDER_SEED,
  resolveTenants
} from './config';
import { resolveOfferedLoad, resolveWarmupTimeoutMs } from './http';
import { normalizeRetainedMemoryCheckpoint } from './memory';
import { summarizeRealtimeReceiptEvidence } from './realtime-evidence';
import { normalizePostgresRunAttestation } from './run-attestation';
import { scoreRun, type ScoreInput } from './score';
import type { RealtimeDriverSnapshot } from './realtime';
import type {
  ArmProvenance,
  CanaryResult,
  CanaryScheduleSummary,
  DensityPlanV1,
  DensityRunResult,
  FleetV1,
  MemorySnapshot,
  NodeRssSnapshot,
  PostgresMemorySnapshot,
  PostgresRunAttestationEvidence,
  RealtimeDeliveryCoverage,
  ResolvedOfferedLoad,
  RetainedMemoryCheckpointPair,
  RequestSample
} from './types';

const SHA256 = /^[a-f0-9]{64}$/;
const SANITIZED_EXECUTION_ERROR = /^[A-Z][A-Z0-9_]*:sha256:[a-f0-9]{64}$/;

/**
 * These files contain every variable input to scoreRun that is not supplied by
 * the exact plan and fleet bytes. score-context.json deliberately contains no
 * fleet, operation, header, environment, or tenant credential material.
 */
export const RESULT_RAW_EVIDENCE_FILES = [
  'memory.json',
  'postgres-memory.json',
  'canaries.json',
  'canary-schedule.json',
  'requests.ndjson',
  'workload-progress.json',
  'retained-memory.json',
  'realtime-driver.json',
  'score-context.json'
] as const;

const SCORE_CONTEXT_KEYS = [
  'version',
  'planSha256',
  'fleetSha256',
  'campaignId',
  'scheduleSha256',
  'previousResultPayloadSha256',
  'evidenceMode',
  'runKind',
  'arm',
  'heapMiB',
  'configuredCustomers',
  'repetition',
  'runOrderIndex',
  'notBeforeEpochMs',
  'startedAt',
  'endedAt',
  'configuredDurationSec',
  'serverExit',
  'externalServer',
  'executionErrors',
  'provenance',
  'provenanceErrors',
  'postgresRunAttestation'
] as const;

export interface DensityScoreContextV1 {
  version: 1;
  planSha256: string;
  fleetSha256: string;
  campaignId: string;
  scheduleSha256: string;
  previousResultPayloadSha256: string | null;
  evidenceMode: 'qualification' | 'diagnostic';
  runKind: 'matrix' | 'soak';
  arm: string;
  heapMiB: number;
  configuredCustomers: number;
  repetition: number;
  runOrderIndex: number;
  notBeforeEpochMs: number;
  startedAt: string;
  endedAt: string;
  configuredDurationSec: number;
  serverExit: DensityRunResult['serverExit'];
  externalServer: boolean;
  executionErrors: string[];
  provenance: ArmProvenance | null;
  provenanceErrors: string[];
  postgresRunAttestation: PostgresRunAttestationEvidence | null;
}

export interface DensityScoreContextMetadata {
  planSha256: string;
  fleetSha256: string;
  campaignId: string;
  scheduleSha256: string;
  previousResultPayloadSha256: string | null;
  notBeforeEpochMs: number;
  /** Compared in-memory only and never serialized into score-context.json. */
  knownRuntimeSecretValues?: readonly string[];
}

interface MemoryEvidence {
  snapshots: MemorySnapshot[];
  osSnapshots: NodeRssSnapshot[];
  errors: string[];
  warmupIndex: number;
  osWarmupIndex: number;
  osPeakRssBytes: number | null;
}

interface PostgresMemoryEvidence {
  snapshots: PostgresMemorySnapshot[];
  errors: string[];
}

interface WorkloadProgressEvidence {
  warmedSurfaces: Array<{ tenantId: string; surfaces: string[] }>;
  warmupLatencies: number[];
  samples: number;
  canaries: number;
  canarySchedule: CanaryScheduleSummary | null;
  offeredLoad: ResolvedOfferedLoad | null;
  resolvedWarmupTimeoutMs: number | null;
  workloadDurationMs: number | null;
}

interface RealtimeEvidenceEntry {
  phase: string;
  timestamp: string;
  snapshot: RealtimeDriverSnapshot;
}

const sha256 = (value: string | Buffer): string => createHash('sha256')
  .update(value)
  .digest('hex');

const sourceSha256 = (value: DensityPlanV1 | FleetV1): string =>
  value.sourceSha256 ?? sha256(JSON.stringify(value));

const requireRecord = (value: unknown, label: string): Record<string, unknown> => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${label} must be an object`);
  }
  return value as Record<string, unknown>;
};

const requireExactKeys = (
  value: Record<string, unknown>,
  expected: readonly string[],
  label: string
): void => {
  const actual = Object.keys(value);
  const missing = expected.filter((key) => !Object.prototype.hasOwnProperty.call(value, key));
  const unexpected = actual.filter((key) => !expected.includes(key));
  if (missing.length > 0 || unexpected.length > 0) {
    throw new Error(
      `${label} has an invalid shape; missing=${missing.join(',') || 'none'}; `
      + `unexpected=${unexpected.join(',') || 'none'}`
    );
  }
};

const requireStringArray = (value: unknown, label: string): string[] => {
  if (!Array.isArray(value) || value.some((item) => typeof item !== 'string')) {
    throw new Error(`${label} must be a string array`);
  }
  return value;
};

const requireSanitizedExecutionErrors = (value: unknown, label: string): string[] => {
  const errors = requireStringArray(value, label);
  if (errors.some((error) => !SANITIZED_EXECUTION_ERROR.test(error))) {
    throw new Error(`${label} must contain only code-and-SHA-256 evidence`);
  }
  return errors;
};

const requireFinite = (value: unknown, label: string): number => {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(`${label} must be finite`);
  }
  return value;
};

const requireSafeInteger = (
  value: unknown,
  label: string,
  minimum = 0
): number => {
  if (!Number.isSafeInteger(value) || (value as number) < minimum) {
    throw new Error(`${label} must be a safe integer >= ${minimum}`);
  }
  return value as number;
};

const requireCanonicalTimestamp = (value: unknown, label: string): string => {
  if (typeof value !== 'string') throw new Error(`${label} must be a timestamp`);
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed) || new Date(parsed).toISOString() !== value) {
    throw new Error(`${label} must be a canonical ISO timestamp`);
  }
  return value;
};

const requireBoolean = (value: unknown, label: string): boolean => {
  if (typeof value !== 'boolean') throw new Error(`${label} must be boolean`);
  return value;
};

const requireNonEmptyString = (value: unknown, label: string): string => {
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`${label} must be a nonempty string`);
  }
  return value;
};

const requireAllowedKeys = (
  value: Record<string, unknown>,
  allowed: readonly string[],
  label: string
): void => {
  const unexpected = Object.keys(value).filter((key) => !allowed.includes(key));
  if (unexpected.length > 0) {
    throw new Error(`${label} has unexpected fields: ${unexpected.join(',')}`);
  }
};

const requireNullableNonNegativeFinite = (value: unknown, label: string): void => {
  if (value == null) return;
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    throw new Error(`${label} must be null or a finite non-negative number`);
  }
};

/** Read one immutable regular file without following a final symlink. */
export const readRegularEvidenceFile = (file: string): Buffer => {
  const before = fs.lstatSync(file);
  if (before.isSymbolicLink() || !before.isFile()) {
    throw new Error(`evidence is not a regular non-symlink file: ${path.basename(file)}`);
  }
  const descriptor = fs.openSync(
    file,
    fs.constants.O_RDONLY | (fs.constants.O_NOFOLLOW ?? 0)
  );
  try {
    const opened = fs.fstatSync(descriptor);
    if (!opened.isFile() || opened.dev !== before.dev || opened.ino !== before.ino) {
      throw new Error(`evidence changed while opening: ${path.basename(file)}`);
    }
    const bytes = fs.readFileSync(descriptor);
    const after = fs.fstatSync(descriptor);
    if (
      after.dev !== opened.dev
      || after.ino !== opened.ino
      || after.size !== opened.size
      || after.mtimeMs !== opened.mtimeMs
      || after.ctimeMs !== opened.ctimeMs
    ) {
      throw new Error(`evidence changed while reading: ${path.basename(file)}`);
    }
    return bytes;
  } finally {
    fs.closeSync(descriptor);
  }
};

const parseJsonEvidence = (artifactDir: string, name: string): unknown => {
  try {
    return JSON.parse(readRegularEvidenceFile(path.join(artifactDir, name)).toString('utf8'));
  } catch (error) {
    throw new Error(
      `invalid ${name}: ${error instanceof Error ? error.message : String(error)}`
    );
  }
};

const artifactNamesForResult = (result: DensityRunResult): string[] => [
  ...RESULT_RAW_EVIDENCE_FILES,
  ...(result.postgresRunAttestation ? ['postgres-run-attestation.json'] : [])
];

const resultPayload = (result: DensityRunResult): Omit<DensityRunResult, 'evidenceBinding'> => {
  const payload = { ...result };
  delete payload.evidenceBinding;
  return payload;
};

const resultPayloadSha256 = (result: DensityRunResult): string =>
  sha256(JSON.stringify(resultPayload(result)));

export const bindResultEvidence = (result: DensityRunResult): void => {
  const artifacts = artifactNamesForResult(result).map((name) => ({
    name,
    sha256: sha256(readRegularEvidenceFile(path.join(result.artifactDir, name)))
  }));
  result.evidenceBinding = {
    version: 2,
    algorithm: 'sha256',
    resultPayloadSha256: resultPayloadSha256(result),
    artifacts
  };
};

export const validateResultEvidenceBinding = (
  result: DensityRunResult,
  label: string
): void => {
  const binding = result.evidenceBinding;
  if (
    !binding
    || binding.version !== 2
    || binding.algorithm !== 'sha256'
    || !SHA256.test(binding.resultPayloadSha256)
    || !Array.isArray(binding.artifacts)
  ) {
    throw new Error(`${label} evidence binding is missing or invalid`);
  }
  if (binding.resultPayloadSha256 !== resultPayloadSha256(result)) {
    throw new Error(`${label} result payload does not match its evidence binding`);
  }
  const expectedNames = artifactNamesForResult(result);
  const byName = new Map(binding.artifacts.map((artifact) => [artifact.name, artifact]));
  if (byName.size !== expectedNames.length || binding.artifacts.length !== expectedNames.length) {
    throw new Error(`${label} raw evidence binding is incomplete or duplicated`);
  }
  for (const name of expectedNames) {
    const artifact = byName.get(name);
    if (!artifact || !SHA256.test(artifact.sha256)) {
      throw new Error(`${label} raw evidence binding is missing ${name}`);
    }
    let bytes: Buffer;
    try {
      bytes = readRegularEvidenceFile(path.join(result.artifactDir, name));
    } catch {
      throw new Error(`${label} raw evidence file is unavailable or unsafe: ${name}`);
    }
    if (sha256(bytes) !== artifact.sha256) {
      throw new Error(`${label} raw evidence file does not match: ${name}`);
    }
  }
};

const SENSITIVE_ENVIRONMENT_NAME = /(?:^|_)(?:API_KEY|AUTHORIZATION|COOKIE|DATABASE_URL|DSN|PASSWORD|PASSWD|PGURL|PRIVATE_KEY|SECRET|TOKEN)$/i;
const SENSITIVE_COMMAND_FLAG = /^--(?:[a-z0-9]+[-_])*(?:api[-_]?key|authorization|cookie|database[-_]?url|dsn|password|passwd|private[-_]?key|secret|token)(?:[-_][a-z0-9]+)*(?:=|$)/i;
const SAFE_SECRET_FILE_FLAG = /^--(?:[a-z0-9]+[-_])*(?:credential|secret)s?(?:[-_]file)?$/i;
const SENSITIVE_ASSIGNMENT = /^(?:DATABASE_URL|PGPASSWORD|PGURL|[^=]*(?:PASSWORD|PASSWD|PRIVATE_KEY|SECRET|TOKEN))=/i;
const USERINFO_URL = /\b(?:https?|postgres(?:ql)?|wss?):\/\/[^\s/:@]+:[^\s/@]+@/i;
const BEARER_VALUE = /^Bearer\s+\S+/i;
const SENSITIVE_QUERY_PARAMETER = /[?&](?:api[-_]?key|authorization|cookie|password|passwd|private[-_]?key|secret|token)=[^&#\s]+/i;
const SENSITIVE_HEADER_VALUE = /^(?:authorization|cookie|proxy-authorization)\s*:\s*\S+/i;
const SENSITIVE_PROVENANCE_KEY = /(?:^|[-_])(?:api[-_]?key|authorization|cookie|database[-_]?url|dsn|password|passwd|pgurl|private[-_]?key|secret|token)(?:$|[-_])/i;
const SAFE_SECRET_REFERENCE_KEY = /(?:file|path)$/i;

const knownRuntimeSecrets = (
  environment: Readonly<Record<string, string | undefined>> = process.env
): string[] => [...new Set(Object.entries(environment)
  .filter(([name, value]) => SENSITIVE_ENVIRONMENT_NAME.test(name) && Boolean(value))
  .map(([_name, value]) => value!))];

/**
 * Provenance must describe how the process was started, but it must never turn
 * into a second credential store. Secret files and environment-variable names
 * are safe; literal credential arguments and URL userinfo are rejected.
 */
export const assertScoreContextCredentialSafe = (
  context: DensityScoreContextV1,
  secretValues: readonly string[] = knownRuntimeSecrets()
): void => {
  const command = context.provenance?.command ?? [];
  const sensitiveString = (value: string): boolean =>
    USERINFO_URL.test(value)
    || BEARER_VALUE.test(value)
    || SENSITIVE_QUERY_PARAMETER.test(value)
    || SENSITIVE_HEADER_VALUE.test(value)
    || SENSITIVE_ASSIGNMENT.test(value)
    || secretValues.some((secret) => secret.length > 0 && value.includes(secret));
  const inspectStrings = (value: unknown, pathValue: string, ancestors = new Set<object>()): void => {
    if (typeof value === 'string') {
      if (sensitiveString(value)) {
        throw new Error(`score-context provenance contains credential material at ${pathValue}`);
      }
      return;
    }
    if (!value || typeof value !== 'object') return;
    if (ancestors.has(value)) throw new Error('score-context provenance contains a cycle');
    ancestors.add(value);
    if (Array.isArray(value)) {
      value.forEach((item, index) => inspectStrings(item, `${pathValue}[${index}]`, ancestors));
    } else {
      for (const [key, item] of Object.entries(value)) {
        const normalizedKey = key.replace(/([a-z0-9])([A-Z])/g, '$1-$2');
        if (
          typeof item === 'string'
          && item.length > 0
          && SENSITIVE_PROVENANCE_KEY.test(normalizedKey)
          && !SAFE_SECRET_REFERENCE_KEY.test(normalizedKey)
        ) {
          throw new Error(
            `score-context provenance contains credential material at ${pathValue}.${key}`
          );
        }
        inspectStrings(item, `${pathValue}.${key}`, ancestors);
      }
    }
    ancestors.delete(value);
  };
  inspectStrings(
    context.provenance == null
      ? null
      : { ...context.provenance, command: [] },
    'provenance'
  );
  for (let index = 0; index < command.length; index += 1) {
    const argument = command[index];
    const sensitiveFlag = SENSITIVE_COMMAND_FLAG.test(argument)
      && !SAFE_SECRET_FILE_FLAG.test(argument);
    if (
      sensitiveString(argument)
      || (sensitiveFlag && argument.includes('='))
      || (sensitiveFlag && command[index + 1] != null)
    ) {
      throw new Error('score-context provenance command contains credential material');
    }
  }
};

export const scoreContextFromInput = (
  input: ScoreInput,
  metadata: DensityScoreContextMetadata
): DensityScoreContextV1 => {
  requireSanitizedExecutionErrors(input.executionErrors, 'ScoreInput.executionErrors');
  const context: DensityScoreContextV1 = {
    version: 1,
    planSha256: metadata.planSha256,
    fleetSha256: metadata.fleetSha256,
    campaignId: metadata.campaignId,
    scheduleSha256: metadata.scheduleSha256,
    previousResultPayloadSha256: metadata.previousResultPayloadSha256,
    evidenceMode: input.evidenceMode,
    runKind: input.runKind,
    arm: input.arm,
    heapMiB: input.heapMiB,
    configuredCustomers: input.tenants.length,
    repetition: input.repetition,
    runOrderIndex: input.runOrderIndex,
    notBeforeEpochMs: metadata.notBeforeEpochMs,
    startedAt: input.startedAt,
    endedAt: input.endedAt,
    configuredDurationSec: input.configuredDurationSec,
    serverExit: input.serverExit ? { ...input.serverExit } : null,
    externalServer: input.externalServer,
    executionErrors: [...input.executionErrors],
    provenance: input.provenance == null ? null : { ...input.provenance },
    provenanceErrors: [...input.provenanceErrors],
    postgresRunAttestation: input.postgresRunAttestation == null
      ? null
      : { ...input.postgresRunAttestation }
  };
  assertScoreContextCredentialSafe(
    context,
    metadata.knownRuntimeSecretValues ?? knownRuntimeSecrets()
  );
  return context;
};

export const writeScoreContext = (
  artifactDir: string,
  input: ScoreInput,
  metadata: DensityScoreContextMetadata
): DensityScoreContextV1 => {
  const context = scoreContextFromInput(input, metadata);
  fs.writeFileSync(
    path.join(artifactDir, 'score-context.json'),
    `${JSON.stringify(context, null, 2)}\n`,
    { encoding: 'utf8', flag: 'wx' }
  );
  return context;
};

export const readScoreContextEvidence = (artifactDir: string): DensityScoreContextV1 => {
  const record = requireRecord(
    parseJsonEvidence(artifactDir, 'score-context.json'),
    'score-context.json'
  );
  requireExactKeys(record, SCORE_CONTEXT_KEYS, 'score-context.json');
  if (record.version !== 1) throw new Error('score-context.json version must be 1');
  if (typeof record.planSha256 !== 'string' || !SHA256.test(record.planSha256)) {
    throw new Error('score-context.json planSha256 is invalid');
  }
  if (typeof record.fleetSha256 !== 'string' || !SHA256.test(record.fleetSha256)) {
    throw new Error('score-context.json fleetSha256 is invalid');
  }
  for (const key of ['campaignId', 'scheduleSha256'] as const) {
    if (typeof record[key] !== 'string' || !SHA256.test(record[key] as string)) {
      throw new Error(`score-context.json ${key} is invalid`);
    }
  }
  if (
    record.previousResultPayloadSha256 != null
    && (
      typeof record.previousResultPayloadSha256 !== 'string'
      || !SHA256.test(record.previousResultPayloadSha256)
    )
  ) {
    throw new Error('score-context.json previousResultPayloadSha256 is invalid');
  }
  if (!['qualification', 'diagnostic'].includes(String(record.evidenceMode))) {
    throw new Error('score-context.json evidenceMode is invalid');
  }
  if (!['matrix', 'soak'].includes(String(record.runKind))) {
    throw new Error('score-context.json runKind is invalid');
  }
  if (typeof record.arm !== 'string' || record.arm.length === 0) {
    throw new Error('score-context.json arm is invalid');
  }
  requireSafeInteger(record.heapMiB, 'score-context.json heapMiB', 1);
  requireSafeInteger(
    record.configuredCustomers,
    'score-context.json configuredCustomers',
    1
  );
  requireSafeInteger(record.repetition, 'score-context.json repetition', 1);
  requireSafeInteger(record.runOrderIndex, 'score-context.json runOrderIndex', 1);
  requireSafeInteger(record.notBeforeEpochMs, 'score-context.json notBeforeEpochMs', 1);
  for (const key of ['startedAt', 'endedAt'] as const) {
    requireCanonicalTimestamp(record[key], `score-context.json ${key}`);
  }
  if (Date.parse(record.endedAt as string) < Date.parse(record.startedAt as string)) {
    throw new Error('score-context.json endedAt precedes startedAt');
  }
  requireFinite(record.configuredDurationSec, 'score-context.json configuredDurationSec');
  if (typeof record.externalServer !== 'boolean') {
    throw new Error('score-context.json externalServer is invalid');
  }
  requireSanitizedExecutionErrors(
    record.executionErrors,
    'score-context.json executionErrors'
  );
  requireStringArray(record.provenanceErrors, 'score-context.json provenanceErrors');
  if (record.provenance != null) requireRecord(record.provenance, 'score-context.json provenance');
  if (record.postgresRunAttestation != null) {
    requireRecord(
      record.postgresRunAttestation,
      'score-context.json postgresRunAttestation'
    );
  }
  if (record.serverExit != null) {
    const exit = requireRecord(record.serverExit, 'score-context.json serverExit');
    requireExactKeys(exit, ['code', 'signal'], 'score-context.json serverExit');
    if (exit.code != null && !Number.isSafeInteger(exit.code)) {
      throw new Error('score-context.json serverExit.code is invalid');
    }
    if (exit.signal != null && typeof exit.signal !== 'string') {
      throw new Error('score-context.json serverExit.signal is invalid');
    }
  }
  const context = record as unknown as DensityScoreContextV1;
  assertScoreContextCredentialSafe(context);
  return context;
};

const parseMemoryEvidence = (artifactDir: string): MemoryEvidence => {
  const record = requireRecord(parseJsonEvidence(artifactDir, 'memory.json'), 'memory.json');
  requireExactKeys(
    record,
    ['snapshots', 'osSnapshots', 'errors', 'warmupIndex', 'osWarmupIndex', 'osPeakRssBytes'],
    'memory.json'
  );
  if (!Array.isArray(record.snapshots) || !Array.isArray(record.osSnapshots)) {
    throw new Error('memory.json snapshots are invalid');
  }
  const memoryRequiredKeys = [
    'timestamp',
    'pid',
    'nodeEnv',
    'heapLimitBytes',
    'heapUsedBytes',
    'rssBytes',
    'processPeakRssBytes',
    'cacheSize',
    'residentBuildContracts',
    'evictions',
    'buildRefusals',
    'buildsStarted',
    'buildsSucceeded',
    'buildMaxMs',
    'pgPoolCacheSize',
    'pgPoolLeasedPools',
    'pgPoolActiveLeases',
    'pgPoolCapacityEvictions',
    'pgPoolCapacityRefusals',
    'pgPoolDisposalFailures',
    'cacheCountersAvailable',
    'buildCountersAvailable'
  ] as const;
  const optionalNumericKeys = [
    'cacheConfiguredMax',
    'cacheBudgetCapacity',
    'cacheInstanceHeapBytes',
    'pgPoolTotalClients',
    'pgPoolIdleClients',
    'pgPoolWaitingClients',
    'runtimePoolRequestedMaxUses',
    'runtimePoolEffectiveMaxUses',
    'runtimePoolExpectedPools',
    'runtimePoolObservedPools',
    'runtimePoolTotalClients',
    'runtimePoolIdleClients',
    'runtimePoolWaitingClients',
    'postgresBackendTotal',
    'postgresBackendActive',
    'postgresBackendIdle',
    'postgresBackendIdleInTransaction',
    'physicalDatabases',
    'unexpectedPostgresDatabases',
    'realtimeManagersExpected',
    'realtimeManagersActive',
    'realtimeTransportsExpected',
    'realtimeTransportsActive',
    'notificationBrokers',
    'notificationListenerConnections',
    'notificationBrokerLeases',
    'notificationBrokerTopics',
    'notificationBrokerSubscribers',
    'notificationBrokerQueueOverflows',
    'notificationBrokerFatalFailures',
    'notificationAuditIdentities',
    'notificationAuditsHealthy',
    'notificationAuditsFailed',
    'notificationAuditsStale',
    'notificationAuditAttempts',
    'notificationAuditFailures',
    'notificationAuditActiveDatabaseTargets',
    'notificationAuditDatabaseConflicts'
  ] as const;
  const requiredNumericKeys = [
    'heapLimitBytes',
    'heapUsedBytes',
    'rssBytes',
    'processPeakRssBytes',
    'cacheSize',
    'evictions',
    'buildRefusals',
    'buildsStarted',
    'buildsSucceeded',
    'buildMaxMs',
    'pgPoolCacheSize',
    'pgPoolLeasedPools',
    'pgPoolActiveLeases',
    'pgPoolCapacityEvictions',
    'pgPoolCapacityRefusals',
    'pgPoolDisposalFailures'
  ] as const;
  const optionalBooleanKeys = [
    'runtimePoolTelemetryAvailable',
    'runtimePoolEffectiveMaxUsesKnown',
    'runtimePoolMaxUsesExact',
    'postgresContainerDedicated'
  ] as const;
  const allowedMemoryKeys = [
    ...memoryRequiredKeys,
    ...optionalNumericKeys,
    ...optionalBooleanKeys,
    'cacheCalibrationId',
    'cacheAdmissionMode',
    'residentBuildContractFingerprints',
    'runtimePoolTelemetryScope',
    'realtimeNotificationMode',
    'raw'
  ];
  const snapshots = record.snapshots.map((raw, index): MemorySnapshot => {
    const label = `memory.json snapshots[${index}]`;
    const snapshot = requireRecord(raw, label);
    requireAllowedKeys(snapshot, allowedMemoryKeys, label);
    for (const key of memoryRequiredKeys) {
      if (!Object.prototype.hasOwnProperty.call(snapshot, key)) {
        throw new Error(`${label} is missing ${key}`);
      }
    }
    requireCanonicalTimestamp(snapshot.timestamp, `${label}.timestamp`);
    if (snapshot.pid != null) requireSafeInteger(snapshot.pid, `${label}.pid`, 1);
    if (snapshot.nodeEnv != null && typeof snapshot.nodeEnv !== 'string') {
      throw new Error(`${label}.nodeEnv is invalid`);
    }
    for (const key of [...requiredNumericKeys, ...optionalNumericKeys]) {
      requireNullableNonNegativeFinite(snapshot[key], `${label}.${key}`);
    }
    if (
      snapshot.residentBuildContracts != null
      && (
        !Array.isArray(snapshot.residentBuildContracts)
        || snapshot.residentBuildContracts.some((item) =>
          typeof item !== 'string' || item.length === 0)
        || new Set(snapshot.residentBuildContracts).size
          !== snapshot.residentBuildContracts.length
      )
    ) {
      throw new Error(`${label}.residentBuildContracts is invalid`);
    }
    if (
      snapshot.residentBuildContractFingerprints != null
      && (
        !Array.isArray(snapshot.residentBuildContractFingerprints)
        || snapshot.residentBuildContractFingerprints.some((item) =>
          typeof item !== 'string' || item.length === 0)
        || new Set(snapshot.residentBuildContractFingerprints).size
          !== snapshot.residentBuildContractFingerprints.length
      )
    ) {
      throw new Error(`${label}.residentBuildContractFingerprints is invalid`);
    }
    requireBoolean(snapshot.cacheCountersAvailable, `${label}.cacheCountersAvailable`);
    requireBoolean(snapshot.buildCountersAvailable, `${label}.buildCountersAvailable`);
    for (const key of optionalBooleanKeys) {
      if (snapshot[key] != null && typeof snapshot[key] !== 'boolean') {
        throw new Error(`${label}.${key} is invalid`);
      }
    }
    if (
      snapshot.cacheCalibrationId != null
      && typeof snapshot.cacheCalibrationId !== 'string'
    ) {
      throw new Error(`${label}.cacheCalibrationId is invalid`);
    }
    if (
      snapshot.cacheAdmissionMode != null
      && !['evict-idle', 'preserve-resident'].includes(String(snapshot.cacheAdmissionMode))
    ) {
      throw new Error(`${label}.cacheAdmissionMode is invalid`);
    }
    if (
      snapshot.runtimePoolTelemetryScope != null
      && snapshot.runtimePoolTelemetryScope !== 'runtime-only-exact-identities'
    ) {
      throw new Error(`${label}.runtimePoolTelemetryScope is invalid`);
    }
    if (
      snapshot.realtimeNotificationMode != null
      && !['dedicated', 'shared-exact'].includes(String(snapshot.realtimeNotificationMode))
    ) {
      throw new Error(`${label}.realtimeNotificationMode is invalid`);
    }
    return snapshot as unknown as MemorySnapshot;
  });
  const osSnapshots = record.osSnapshots.map((raw, index): NodeRssSnapshot => {
    const label = `memory.json osSnapshots[${index}]`;
    const snapshot = requireRecord(raw, label);
    requireExactKeys(snapshot, ['timestamp', 'pid', 'source', 'rssBytes'], label);
    requireCanonicalTimestamp(snapshot.timestamp, `${label}.timestamp`);
    requireSafeInteger(snapshot.pid, `${label}.pid`, 1);
    requireSafeInteger(snapshot.rssBytes, `${label}.rssBytes`, 1);
    if (!['proc', 'authenticated-endpoint'].includes(String(snapshot.source))) {
      throw new Error(`${label}.source is invalid`);
    }
    return snapshot as unknown as NodeRssSnapshot;
  });
  const errors = requireStringArray(record.errors, 'memory.json errors');
  const warmupIndex = requireSafeInteger(record.warmupIndex, 'memory.json warmupIndex', -1);
  const osWarmupIndex = requireSafeInteger(
    record.osWarmupIndex,
    'memory.json osWarmupIndex',
    -1
  );
  if (warmupIndex > snapshots.length || osWarmupIndex > osSnapshots.length) {
    throw new Error('memory.json warmup index is out of range');
  }
  if (record.osPeakRssBytes != null) {
    requireSafeInteger(record.osPeakRssBytes, 'memory.json osPeakRssBytes', 1);
    if (
      osSnapshots.length > 0
      && record.osPeakRssBytes !== Math.max(...osSnapshots.map((snapshot) => snapshot.rssBytes))
    ) {
      throw new Error('memory.json osPeakRssBytes does not match its raw snapshots');
    }
  }
  return {
    snapshots,
    osSnapshots,
    errors,
    warmupIndex,
    osWarmupIndex,
    osPeakRssBytes: record.osPeakRssBytes as number | null
  };
};

const parsePostgresMemoryEvidence = (artifactDir: string): PostgresMemoryEvidence => {
  const record = requireRecord(
    parseJsonEvidence(artifactDir, 'postgres-memory.json'),
    'postgres-memory.json'
  );
  requireExactKeys(record, ['snapshots', 'errors'], 'postgres-memory.json');
  if (!Array.isArray(record.snapshots)) {
    throw new Error('postgres-memory.json snapshots are invalid');
  }
  const snapshots = record.snapshots.map((raw, index): PostgresMemorySnapshot => {
    const label = `postgres-memory.json snapshots[${index}]`;
    const snapshot = requireRecord(raw, label);
    requireAllowedKeys(snapshot, [
      'timestamp',
      'containerId',
      'cgroupIdentitySha256',
      'usedBytes',
      'limitBytes',
      'source',
      'workingSetBytes',
      'sampleStartedAt',
      'sampleEndedAt',
      'sampleDurationMs',
      'cgroupV2',
      'raw'
    ], label);
    for (const key of ['timestamp', 'usedBytes', 'limitBytes', 'raw']) {
      if (!Object.prototype.hasOwnProperty.call(snapshot, key)) {
        throw new Error(`${label} is missing ${key}`);
      }
    }
    requireCanonicalTimestamp(snapshot.timestamp, `${label}.timestamp`);
    requireSafeInteger(snapshot.usedBytes, `${label}.usedBytes`);
    requireSafeInteger(snapshot.limitBytes, `${label}.limitBytes`);
    if (typeof snapshot.raw !== 'string') throw new Error(`${label}.raw is invalid`);
    if (snapshot.containerId != null && (
      typeof snapshot.containerId !== 'string' || !/^[a-f0-9]{64}$/.test(snapshot.containerId)
    )) {
      throw new Error(`${label}.containerId is invalid`);
    }
    if (snapshot.cgroupIdentitySha256 != null && (
      typeof snapshot.cgroupIdentitySha256 !== 'string'
      || !/^sha256:[a-f0-9]{64}$/.test(snapshot.cgroupIdentitySha256)
    )) {
      throw new Error(`${label}.cgroupIdentitySha256 is invalid`);
    }
    if (snapshot.source != null && !['cgroup-v2', 'docker-stats'].includes(String(snapshot.source))) {
      throw new Error(`${label}.source is invalid`);
    }
    if (snapshot.workingSetBytes != null) {
      requireSafeInteger(snapshot.workingSetBytes, `${label}.workingSetBytes`);
    }
    if (
      snapshot.sampleStartedAt != null
      || snapshot.sampleEndedAt != null
      || snapshot.sampleDurationMs != null
    ) {
      const startedAt = requireCanonicalTimestamp(
        snapshot.sampleStartedAt,
        `${label}.sampleStartedAt`
      );
      const endedAt = requireCanonicalTimestamp(
        snapshot.sampleEndedAt,
        `${label}.sampleEndedAt`
      );
      const durationMs = requireSafeInteger(
        snapshot.sampleDurationMs,
        `${label}.sampleDurationMs`
      );
      if (Date.parse(endedAt) < Date.parse(startedAt)) {
        throw new Error(`${label} sample chronology is invalid`);
      }
      if (Math.abs((Date.parse(endedAt) - Date.parse(startedAt)) - durationMs) > 1) {
        throw new Error(`${label}.sampleDurationMs is inconsistent`);
      }
    }
    if (snapshot.cgroupV2 != null) {
      const cgroup = requireRecord(snapshot.cgroupV2, `${label}.cgroupV2`);
      requireExactKeys(
        cgroup,
        ['currentBytes', 'peakBytes', 'maxBytes', 'stat', 'events'],
        `${label}.cgroupV2`
      );
      requireSafeInteger(cgroup.currentBytes, `${label}.cgroupV2.currentBytes`);
      if (cgroup.peakBytes != null) {
        requireSafeInteger(cgroup.peakBytes, `${label}.cgroupV2.peakBytes`);
      }
      if (cgroup.maxBytes != null) {
        requireSafeInteger(cgroup.maxBytes, `${label}.cgroupV2.maxBytes`);
      }
      for (const field of ['stat', 'events'] as const) {
        const values = requireRecord(cgroup[field], `${label}.cgroupV2.${field}`);
        for (const [key, value] of Object.entries(values)) {
          if (!key) throw new Error(`${label}.cgroupV2.${field} has an empty key`);
          requireSafeInteger(value, `${label}.cgroupV2.${field}.${key}`);
        }
      }
      if (snapshot.source !== 'cgroup-v2' || snapshot.usedBytes !== cgroup.currentBytes) {
        throw new Error(`${label} cgroup-v2 source does not match current bytes`);
      }
    } else if (snapshot.source === 'cgroup-v2') {
      throw new Error(`${label} cgroup-v2 source has no cgroup payload`);
    }
    return snapshot as unknown as PostgresMemorySnapshot;
  });
  return {
    snapshots,
    errors: requireStringArray(record.errors, 'postgres-memory.json errors')
  };
};

function parseCanarySchedule(
  raw: unknown,
  label: string
): CanaryScheduleSummary | null {
  if (raw == null) return null;
  const schedule = requireRecord(raw, label);
  requireExactKeys(schedule, [
    'schedule',
    'intervalMs',
    'durationMs',
    'canaryConcurrency',
    'startedAt',
    'deadlineAt',
    'planned',
    'started',
    'completed',
    'missed',
    'overlapped',
    'deadlineLate',
    'checksPlanned',
    'checksStarted',
    'checksCompleted',
    'rounds'
  ], label);
  if (!['full-sweep', 'rotating-one'].includes(String(schedule.schedule))) {
    throw new Error(`${label}.schedule is invalid`);
  }
  const intervalMs = requireSafeInteger(schedule.intervalMs, `${label}.intervalMs`, 1);
  const durationMs = requireSafeInteger(schedule.durationMs, `${label}.durationMs`, 1);
  requireSafeInteger(schedule.canaryConcurrency, `${label}.canaryConcurrency`, 1);
  const startedAt = requireCanonicalTimestamp(schedule.startedAt, `${label}.startedAt`);
  const deadlineAt = requireCanonicalTimestamp(schedule.deadlineAt, `${label}.deadlineAt`);
  if (Date.parse(deadlineAt) - Date.parse(startedAt) !== durationMs) {
    throw new Error(`${label}.deadlineAt does not match durationMs`);
  }
  const counterKeys = [
    'planned',
    'started',
    'completed',
    'missed',
    'overlapped',
    'deadlineLate',
    'checksPlanned',
    'checksStarted',
    'checksCompleted'
  ] as const;
  for (const key of counterKeys) requireSafeInteger(schedule[key], `${label}.${key}`);
  if (!Array.isArray(schedule.rounds)) throw new Error(`${label}.rounds must be an array`);
  const rounds = schedule.rounds.map((rawRound, index) => {
    const roundLabel = `${label}.rounds[${index}]`;
    const round = requireRecord(rawRound, roundLabel);
    requireExactKeys(round, [
      'periodicRound',
      'plannedAt',
      'startedAt',
      'completedAt',
      'targetsPlanned',
      'targetsStarted',
      'targetsCompleted',
      'checksPlanned',
      'checksStarted',
      'checksCompleted',
      'overlapped',
      'deadlineLate',
      'startDelayMs',
      'durationMs'
    ], roundLabel);
    const periodicRound = requireSafeInteger(
      round.periodicRound,
      `${roundLabel}.periodicRound`,
      1
    );
    if (periodicRound !== index + 1) {
      throw new Error(`${roundLabel}.periodicRound is not contiguous`);
    }
    const plannedAt = requireCanonicalTimestamp(round.plannedAt, `${roundLabel}.plannedAt`);
    if (Date.parse(plannedAt) !== Date.parse(startedAt) + periodicRound * intervalMs) {
      throw new Error(`${roundLabel}.plannedAt does not match its schedule slot`);
    }
    for (const key of [
      'targetsPlanned',
      'targetsStarted',
      'targetsCompleted',
      'checksPlanned',
      'checksStarted',
      'checksCompleted'
    ] as const) {
      requireSafeInteger(round[key], `${roundLabel}.${key}`);
    }
    requireBoolean(round.overlapped, `${roundLabel}.overlapped`);
    requireBoolean(round.deadlineLate, `${roundLabel}.deadlineLate`);
    const roundStartedAt = round.startedAt == null
      ? null
      : requireCanonicalTimestamp(round.startedAt, `${roundLabel}.startedAt`);
    const roundCompletedAt = round.completedAt == null
      ? null
      : requireCanonicalTimestamp(round.completedAt, `${roundLabel}.completedAt`);
    if (round.startDelayMs != null) {
      requireFinite(round.startDelayMs, `${roundLabel}.startDelayMs`);
      if ((round.startDelayMs as number) < 0) {
        throw new Error(`${roundLabel}.startDelayMs must be non-negative`);
      }
    }
    if (round.durationMs != null) {
      requireFinite(round.durationMs, `${roundLabel}.durationMs`);
      if ((round.durationMs as number) < 0) {
        throw new Error(`${roundLabel}.durationMs must be non-negative`);
      }
    }
    if (
      (roundStartedAt == null) !== (round.startDelayMs == null)
      || (roundCompletedAt == null) !== (round.durationMs == null)
      || (roundCompletedAt != null && roundStartedAt == null)
      || (
        roundStartedAt != null
        && Date.parse(roundStartedAt) < Date.parse(plannedAt)
      )
      || (
        roundCompletedAt != null
        && Date.parse(roundCompletedAt) < Date.parse(roundStartedAt!)
      )
    ) {
      throw new Error(`${roundLabel} chronology is invalid`);
    }
    return round;
  });
  const aggregate = rounds.reduce<{
    started: number;
    completed: number;
    overlapped: number;
    deadlineLate: number;
    checksPlanned: number;
    checksStarted: number;
    checksCompleted: number;
  }>((summary, round) => ({
    started: summary.started + (round.startedAt == null ? 0 : 1),
    completed: summary.completed + (round.completedAt == null ? 0 : 1),
    overlapped: summary.overlapped + (round.overlapped ? 1 : 0),
    deadlineLate: summary.deadlineLate + (round.deadlineLate ? 1 : 0),
    checksPlanned: summary.checksPlanned + Number(round.checksPlanned),
    checksStarted: summary.checksStarted + Number(round.checksStarted),
    checksCompleted: summary.checksCompleted + Number(round.checksCompleted)
  }), {
    started: 0,
    completed: 0,
    overlapped: 0,
    deadlineLate: 0,
    checksPlanned: 0,
    checksStarted: 0,
    checksCompleted: 0
  });
  if (
    Number(schedule.planned) !== rounds.length
    || Number(schedule.started) !== aggregate.started
    || Number(schedule.completed) !== aggregate.completed
    || Number(schedule.missed) !== rounds.length - aggregate.completed
    || Number(schedule.overlapped) !== aggregate.overlapped
    || Number(schedule.deadlineLate) !== aggregate.deadlineLate
    || Number(schedule.checksPlanned) !== aggregate.checksPlanned
    || Number(schedule.checksStarted) !== aggregate.checksStarted
    || Number(schedule.checksCompleted) !== aggregate.checksCompleted
  ) {
    throw new Error(`${label} aggregate counters do not match its rounds`);
  }
  return schedule as unknown as CanaryScheduleSummary;
}

const parseWorkloadProgress = (artifactDir: string): WorkloadProgressEvidence => {
  const record = requireRecord(
    parseJsonEvidence(artifactDir, 'workload-progress.json'),
    'workload-progress.json'
  );
  requireExactKeys(record, [
    'warmedSurfaces',
    'warmupLatencies',
    'samples',
    'canaries',
    'canarySchedule',
    'offeredLoad',
    'resolvedWarmupTimeoutMs',
    'workloadDurationMs'
  ], 'workload-progress.json');
  if (!Array.isArray(record.warmedSurfaces)) {
    throw new Error('workload-progress.json warmedSurfaces is invalid');
  }
  const warmedSurfaces = record.warmedSurfaces.map((raw, index) => {
    const entry = requireRecord(raw, `workload-progress.json warmedSurfaces[${index}]`);
    requireExactKeys(
      entry,
      ['tenantId', 'surfaces'],
      `workload-progress.json warmedSurfaces[${index}]`
    );
    if (typeof entry.tenantId !== 'string' || !entry.tenantId) {
      throw new Error(`workload-progress.json warmedSurfaces[${index}].tenantId is invalid`);
    }
    const surfaces = requireStringArray(
      entry.surfaces,
      `workload-progress.json warmedSurfaces[${index}].surfaces`
    );
    if (new Set(surfaces).size !== surfaces.length) {
      throw new Error(`workload-progress.json warmedSurfaces[${index}] is duplicated`);
    }
    return { tenantId: entry.tenantId, surfaces };
  });
  if (new Set(warmedSurfaces.map((entry) => entry.tenantId)).size !== warmedSurfaces.length) {
    throw new Error('workload-progress.json contains duplicate tenant warmup entries');
  }
  if (!Array.isArray(record.warmupLatencies)) {
    throw new Error('workload-progress.json warmupLatencies is invalid');
  }
  const warmupLatencies = record.warmupLatencies.map((value, index) =>
    requireFinite(value, `workload-progress.json warmupLatencies[${index}]`));
  const samples = requireSafeInteger(record.samples, 'workload-progress.json samples');
  const canaries = requireSafeInteger(record.canaries, 'workload-progress.json canaries');
  let offeredLoad: ResolvedOfferedLoad | null = null;
  if (record.offeredLoad != null) {
    const resolved = requireRecord(
      record.offeredLoad,
      'workload-progress.json offeredLoad'
    );
    requireExactKeys(resolved, [
      'mode',
      'configuredRps',
      'tenantCount',
      'totalRps',
      'rpsPerTenant'
    ], 'workload-progress.json offeredLoad');
    if (!['fixed-total', 'per-tenant'].includes(String(resolved.mode))) {
      throw new Error('workload-progress.json offeredLoad.mode is invalid');
    }
    requireFinite(resolved.configuredRps, 'workload-progress.json offeredLoad.configuredRps');
    requireSafeInteger(resolved.tenantCount, 'workload-progress.json offeredLoad.tenantCount', 1);
    requireFinite(resolved.totalRps, 'workload-progress.json offeredLoad.totalRps');
    requireFinite(resolved.rpsPerTenant, 'workload-progress.json offeredLoad.rpsPerTenant');
    if (
      (resolved.configuredRps as number) <= 0
      || (resolved.totalRps as number) <= 0
      || (resolved.rpsPerTenant as number) <= 0
    ) {
      throw new Error('workload-progress.json offeredLoad rates must be positive');
    }
    offeredLoad = resolved as unknown as ResolvedOfferedLoad;
  }
  if (record.resolvedWarmupTimeoutMs != null) {
    requireSafeInteger(
      record.resolvedWarmupTimeoutMs,
      'workload-progress.json resolvedWarmupTimeoutMs',
      1
    );
  }
  if (record.workloadDurationMs != null) {
    requireFinite(record.workloadDurationMs, 'workload-progress.json workloadDurationMs');
  }
  return {
    warmedSurfaces,
    warmupLatencies,
    samples,
    canaries,
    canarySchedule: parseCanarySchedule(
      record.canarySchedule,
      'workload-progress.json canarySchedule'
    ),
    offeredLoad,
    resolvedWarmupTimeoutMs: record.resolvedWarmupTimeoutMs as number | null,
    workloadDurationMs: record.workloadDurationMs as number | null
  };
};

const parseRequestSample = (raw: unknown, label: string): RequestSample => {
  const sample = requireRecord(raw, label);
  requireAllowedKeys(sample, [
    'tenantId',
    'surface',
    'operation',
    'capability',
    'latencyMs',
    'status',
    'ok',
    'phase',
    'scheduledAtMs',
    'errorCode',
    'oracleConfigured',
    'oracleConclusive',
    'oracleViolation',
    'oracleUnavailable',
    'postCoverageVerification'
  ], label);
  for (const key of [
    'tenantId',
    'surface',
    'operation',
    'capability',
    'latencyMs',
    'status',
    'ok',
    'phase'
  ]) {
    if (!Object.prototype.hasOwnProperty.call(sample, key)) {
      throw new Error(`${label} is missing ${key}`);
    }
  }
  for (const key of ['tenantId', 'surface', 'operation', 'capability'] as const) {
    requireNonEmptyString(sample[key], `${label}.${key}`);
  }
  const latencyMs = requireFinite(sample.latencyMs, `${label}.latencyMs`);
  if (latencyMs < 0) throw new Error(`${label}.latencyMs must be non-negative`);
  const status = requireSafeInteger(sample.status, `${label}.status`);
  if (status > 599) throw new Error(`${label}.status is invalid`);
  requireBoolean(sample.ok, `${label}.ok`);
  if (!['coverage', 'workload'].includes(String(sample.phase))) {
    throw new Error(`${label}.phase is invalid`);
  }
  if (sample.scheduledAtMs != null) {
    requireFinite(sample.scheduledAtMs, `${label}.scheduledAtMs`);
  }
  if (sample.errorCode != null && typeof sample.errorCode !== 'string') {
    throw new Error(`${label}.errorCode is invalid`);
  }
  for (const key of [
    'oracleConfigured',
    'oracleConclusive',
    'oracleViolation',
    'oracleUnavailable',
    'postCoverageVerification'
  ] as const) {
    if (sample[key] != null && typeof sample[key] !== 'boolean') {
      throw new Error(`${label}.${key} is invalid`);
    }
  }
  return sample as unknown as RequestSample;
};

const parseCanaryResult = (raw: unknown, label: string): CanaryResult => {
  const canary = requireRecord(raw, label);
  requireAllowedKeys(canary, [
    'tenantId',
    'surface',
    'canary',
    'phase',
    'periodicRound',
    'scheduledAt',
    'startedAt',
    'completedAt',
    'latencyMs',
    'conclusive',
    'violation',
    'detail'
  ], label);
  for (const key of [
    'tenantId',
    'surface',
    'canary',
    'phase',
    'scheduledAt',
    'startedAt',
    'completedAt',
    'latencyMs',
    'conclusive',
    'violation'
  ]) {
    if (!Object.prototype.hasOwnProperty.call(canary, key)) {
      throw new Error(`${label} is missing ${key}`);
    }
  }
  for (const key of ['tenantId', 'surface', 'canary'] as const) {
    requireNonEmptyString(canary[key], `${label}.${key}`);
  }
  if (!['initial', 'periodic', 'final'].includes(String(canary.phase))) {
    throw new Error(`${label}.phase is invalid`);
  }
  if (canary.phase === 'periodic') {
    requireSafeInteger(canary.periodicRound, `${label}.periodicRound`, 1);
  } else if (canary.periodicRound != null) {
    throw new Error(`${label}.periodicRound is only valid for periodic canaries`);
  }
  const scheduledAt = requireCanonicalTimestamp(canary.scheduledAt, `${label}.scheduledAt`);
  const startedAt = requireCanonicalTimestamp(canary.startedAt, `${label}.startedAt`);
  const completedAt = requireCanonicalTimestamp(canary.completedAt, `${label}.completedAt`);
  if (
    Date.parse(startedAt) < Date.parse(scheduledAt)
    || Date.parse(completedAt) < Date.parse(startedAt)
  ) {
    throw new Error(`${label} chronology is invalid`);
  }
  const latencyMs = requireFinite(canary.latencyMs, `${label}.latencyMs`);
  if (latencyMs < 0) throw new Error(`${label}.latencyMs must be non-negative`);
  requireBoolean(canary.conclusive, `${label}.conclusive`);
  requireBoolean(canary.violation, `${label}.violation`);
  if (canary.detail != null && typeof canary.detail !== 'string') {
    throw new Error(`${label}.detail is invalid`);
  }
  return canary as unknown as CanaryResult;
};

const parseRequests = (artifactDir: string): RequestSample[] => {
  const text = readRegularEvidenceFile(path.join(artifactDir, 'requests.ndjson'))
    .toString('utf8');
  return text.split('\n').map((line) => line.trim()).filter(Boolean).map((line, index) => {
    try {
      return parseRequestSample(
        JSON.parse(line),
        `requests.ndjson line ${index + 1}`
      );
    } catch (error) {
      throw new Error(
        `invalid requests.ndjson line ${index + 1}: `
        + `${error instanceof Error ? error.message : String(error)}`
      );
    }
  });
};

const realtimeSurfaceKey = (surface: RealtimeDriverSnapshot['surfaces'][number]): string =>
  `${surface.tenantId}\0${surface.surface}\0${surface.route}`;

const deriveRealtimeCoverage = (
  snapshot: RealtimeDriverSnapshot,
  label: string
): RealtimeDeliveryCoverage | null => {
  const reported = snapshot.timedCoverage;
  if (reported == null) return null;
  const summary = summarizeRealtimeReceiptEvidence({
    deliveryIntervalMs: snapshot.deliveryIntervalMs,
    workloadStartedAt: reported.workloadStartedAt,
    workloadDeadlineAt: reported.workloadDeadlineAt,
    workloadEndedAt: reported.workloadEndedAt,
    surfaces: snapshot.surfaces.map((surface) => ({
      tenantId: surface.tenantId,
      surface: surface.surface,
      route: surface.route,
      expectedRecurringRounds: surface.timedRoundsExpected,
      startedRecurringRounds: surface.timedRoundsStarted,
      verifiedRecurringRounds: surface.timedRoundsVerified,
      deadlineLateRecurringRounds: surface.timedRoundsDeadlineLate,
      receipts: surface.correlationReceipts
    }))
  });
  const structurallyInvalid = summary.failures.find((failure) =>
    failure.startsWith('duplicate realtime surface:')
    || failure.startsWith('invalid realtime receipt sequence:')
    || failure.startsWith('invalid realtime receipt digest:')
    || failure.startsWith('reused realtime receipt digest:')
    || failure.startsWith('invalid realtime prime digest:')
    || failure.startsWith('invalid realtime event digest:'));
  if (structurallyInvalid) {
    throw new Error(`${label} contains invalid receipt evidence: ${structurallyInvalid}`);
  }
  if (!isDeepStrictEqual(summary.coverage, reported)) {
    throw new Error(`${label} reported coverage does not match its raw receipts`);
  }
  return summary.coverage;
};

const assertRealtimeHistoryAppendOnly = (
  previous: RealtimeDriverSnapshot,
  current: RealtimeDriverSnapshot,
  label: string
): void => {
  const previousBySurface = new Map(previous.surfaces.map((surface) => [
    realtimeSurfaceKey(surface),
    surface
  ]));
  const currentBySurface = new Map(current.surfaces.map((surface) => [
    realtimeSurfaceKey(surface),
    surface
  ]));
  if (
    previousBySurface.size !== previous.surfaces.length
    || currentBySurface.size !== current.surfaces.length
    || previousBySurface.size !== currentBySurface.size
    || [...previousBySurface.keys()].some((key) => !currentBySurface.has(key))
  ) {
    throw new Error(`${label} realtime surface set changed`);
  }
  const monotonicSnapshotCounters: Array<keyof RealtimeDriverSnapshot> = [
    'deliveryEvents',
    'deliveryRoundsStarted',
    'deliveryRoundsVerified'
  ];
  for (const key of monotonicSnapshotCounters) {
    if ((current[key] as number) < (previous[key] as number)) {
      throw new Error(`${label} realtime aggregate counter regressed: ${key}`);
    }
  }
  if (current.deliveryIntervalMs !== previous.deliveryIntervalMs) {
    throw new Error(`${label} realtime delivery interval changed`);
  }
  for (const [key, prior] of previousBySurface) {
    const next = currentBySurface.get(key)!;
    for (const counter of [
      'deliveryEvents',
      'deliveryRoundsStarted',
      'deliveryRoundsVerified',
      'timedRoundsExpected',
      'timedRoundsStarted',
      'timedRoundsVerified',
      'timedRoundsDeadlineLate'
    ] as const) {
      if (next[counter] < prior[counter]) {
        throw new Error(`${label} realtime surface counter regressed: ${counter}`);
      }
    }
    if (
      prior.correlationReceipts.length > next.correlationReceipts.length
      || !prior.correlationReceipts.every((receipt, index) =>
        isDeepStrictEqual(receipt, next.correlationReceipts[index]))
    ) {
      throw new Error(`${label} realtime receipt history is not append-only`);
    }
  }
  if (
    previous.errors.length > current.errors.length
    || !previous.errors.every((error, index) => error === current.errors[index])
  ) {
    throw new Error(`${label} realtime error history is not append-only`);
  }
};

export const readRealtimeCoverageEvidence = (
  artifactDir: string
): RealtimeDeliveryCoverage | null => {
  const raw = parseJsonEvidence(artifactDir, 'realtime-driver.json');
  if (!Array.isArray(raw)) throw new Error('realtime-driver.json must be an array');
  const entries = raw.map((value, index) => {
    const entry = requireRecord(value, `realtime-driver.json[${index}]`);
    requireExactKeys(entry, ['phase', 'timestamp', 'snapshot'], `realtime-driver.json[${index}]`);
    if (typeof entry.phase !== 'string' || typeof entry.timestamp !== 'string') {
      throw new Error(`realtime-driver.json[${index}] metadata is invalid`);
    }
    if (
      !Number.isFinite(Date.parse(entry.timestamp))
      || new Date(Date.parse(entry.timestamp)).toISOString() !== entry.timestamp
    ) {
      throw new Error(`realtime-driver.json[${index}] timestamp is invalid`);
    }
    const snapshot = requireRecord(entry.snapshot, `realtime-driver.json[${index}].snapshot`);
    if (!Object.prototype.hasOwnProperty.call(snapshot, 'timedCoverage')) {
      throw new Error(`realtime-driver.json[${index}].snapshot has no timedCoverage`);
    }
    return entry as unknown as RealtimeEvidenceEntry;
  });
  const completed = entries.filter((entry) => entry.phase === 'timed-coverage-complete');
  if (completed.length > 1) {
    throw new Error('realtime-driver.json has duplicate timed-coverage-complete records');
  }
  for (let index = 0; index < entries.length; index += 1) {
    const entry = entries[index];
    deriveRealtimeCoverage(entry.snapshot, `realtime-driver.json[${index}]`);
    if (index > 0) {
      if (Date.parse(entry.timestamp) < Date.parse(entries[index - 1].timestamp)) {
        throw new Error('realtime-driver.json timestamps regressed');
      }
      assertRealtimeHistoryAppendOnly(
        entries[index - 1].snapshot,
        entry.snapshot,
        `realtime-driver.json[${index}]`
      );
    }
  }
  if (completed.length === 0) return null;
  const completedIndex = entries.indexOf(completed[0]);
  const coverage = deriveRealtimeCoverage(
    completed[0].snapshot,
    `realtime-driver.json[${completedIndex}]`
  );
  if (!coverage || coverage.workloadEndedAt == null) {
    throw new Error('timed-coverage-complete is not a terminal coverage transition');
  }
  for (const [index, entry] of entries.entries()) {
    if (index <= completedIndex || entry.snapshot.timedCoverage == null) continue;
    const later = deriveRealtimeCoverage(entry.snapshot, `realtime-driver.json[${index}]`);
    if (!isDeepStrictEqual(later, coverage)) {
      throw new Error('timed realtime evidence changed after terminal coverage transition');
    }
  }
  return coverage;
};

const assertArtifactDirectory = (artifactDir: string, plan: DensityPlanV1): void => {
  const root = fs.realpathSync(plan.artifactDir);
  const stat = fs.lstatSync(artifactDir);
  if (stat.isSymbolicLink() || !stat.isDirectory()) {
    throw new Error('result artifactDir is not a regular directory');
  }
  const realArtifactDir = fs.realpathSync(artifactDir);
  const relative = path.relative(root, realArtifactDir);
  if (!relative || relative.startsWith('..') || path.isAbsolute(relative) || path.dirname(relative) !== '.') {
    throw new Error('result artifactDir is outside the configured artifact root');
  }
};

const assertContextMatchesResult = (
  context: DensityScoreContextV1,
  result: DensityRunResult,
  plan: DensityPlanV1,
  fleet: FleetV1
): void => {
  const planSha256 = sourceSha256(plan);
  const fleetSha256 = sourceSha256(fleet);
  const pairs: Array<[unknown, unknown, string]> = [
    [context.planSha256, planSha256, 'plan SHA-256'],
    [context.fleetSha256, fleetSha256, 'fleet SHA-256'],
    [context.campaignId, result.campaignId, 'campaign identity'],
    [context.scheduleSha256, result.scheduleSha256, 'schedule SHA-256'],
    [
      context.previousResultPayloadSha256,
      result.previousResultPayloadSha256,
      'previous result payload SHA-256'
    ],
    [context.evidenceMode, result.evidenceMode, 'evidence mode'],
    [context.runKind, result.runKind, 'run kind'],
    [context.arm, result.arm, 'arm'],
    [context.heapMiB, result.heapMiB, 'heap'],
    [context.configuredCustomers, result.configuredCustomers, 'configured customers'],
    [context.repetition, result.repetition, 'repetition'],
    [context.runOrderIndex, result.runOrderIndex, 'run order'],
    [context.startedAt, result.startedAt, 'start timestamp'],
    [context.endedAt, result.endedAt, 'end timestamp'],
    [context.serverExit, result.serverExit, 'server exit'],
    [context.provenance, result.provenance, 'provenance'],
    [context.provenanceErrors, result.provenanceErrors, 'provenance errors'],
    [
      context.postgresRunAttestation,
      result.postgresRunAttestation ?? null,
      'PostgreSQL run attestation'
    ]
  ];
  for (const [left, right, label] of pairs) {
    if (!isDeepStrictEqual(left, right)) {
      throw new Error(`score-context.json ${label} does not match the result/plan`);
    }
  }
};

const validatePostgresAttestation = (
  context: DensityScoreContextV1,
  artifactDir: string
): void => {
  const evidence = context.postgresRunAttestation;
  if (!evidence) return;
  const artifactPath = path.join(artifactDir, 'postgres-run-attestation.json');
  if (path.resolve(evidence.artifactPath) !== path.resolve(artifactPath)) {
    throw new Error('PostgreSQL run attestation points outside the result artifact');
  }
  const raw = parseJsonEvidence(artifactDir, 'postgres-run-attestation.json');
  const normalized = normalizePostgresRunAttestation(raw, {
    arm: context.arm,
    heapMiB: context.heapMiB,
    tenantCount: context.configuredCustomers,
    repetition: context.repetition,
    runOrderIndex: context.runOrderIndex,
    planSha256: context.planSha256,
    fleetSha256: context.fleetSha256,
    notBeforeEpochMs: context.notBeforeEpochMs,
    artifactDir
  }, artifactPath);
  if (!isDeepStrictEqual(normalized, evidence)) {
    throw new Error('PostgreSQL run attestation does not normalize to score-context evidence');
  }
};

export const reconstructScoreInput = (
  result: DensityRunResult,
  plan: DensityPlanV1,
  fleet: FleetV1
): ScoreInput => {
  assertArtifactDirectory(result.artifactDir, plan);
  const context = readScoreContextEvidence(result.artifactDir);
  assertContextMatchesResult(context, result, plan, fleet);
  validatePostgresAttestation(context, result.artifactDir);
  const arm = plan.arms.find((candidate) => candidate.name === context.arm);
  if (!arm) throw new Error(`score-context.json uses unknown arm '${context.arm}'`);
  if (context.externalServer !== !arm.command?.length) {
    throw new Error('score-context.json external-server state contradicts the arm plan');
  }
  if (context.evidenceMode === 'qualification') {
    const configuredDurationSec = context.runKind === 'soak'
      ? plan.soak?.durationSec
      : plan.workload.durationSec;
    if (configuredDurationSec == null || context.configuredDurationSec !== configuredDurationSec) {
      throw new Error('score-context.json qualification duration contradicts the plan');
    }
  }
  if (context.configuredCustomers > fleet.tenants.length) {
    throw new Error('score-context.json configured customer count exceeds the fleet');
  }
  const memory = parseMemoryEvidence(result.artifactDir);
  const postgres = parsePostgresMemoryEvidence(result.artifactDir);
  const samples = parseRequests(result.artifactDir);
  const canariesRaw = parseJsonEvidence(result.artifactDir, 'canaries.json');
  if (!Array.isArray(canariesRaw)) throw new Error('canaries.json must be an array');
  const canaries = canariesRaw.map((canary, index) =>
    parseCanaryResult(canary, `canaries.json[${index}]`));
  const canarySchedule = parseCanarySchedule(
    parseJsonEvidence(result.artifactDir, 'canary-schedule.json'),
    'canary-schedule.json'
  );
  const workload = parseWorkloadProgress(result.artifactDir);
  const retainedRaw = requireRecord(
    parseJsonEvidence(result.artifactDir, 'retained-memory.json'),
    'retained-memory.json'
  );
  requireExactKeys(retainedRaw, ['baseline', 'final', 'errors'], 'retained-memory.json');
  requireStringArray(retainedRaw.errors, 'retained-memory.json errors');
  const retainedMemory: RetainedMemoryCheckpointPair = {
    baseline: retainedRaw.baseline == null
      ? null
      : normalizeRetainedMemoryCheckpoint(retainedRaw.baseline),
    final: retainedRaw.final == null
      ? null
      : normalizeRetainedMemoryCheckpoint(retainedRaw.final),
    errors: retainedRaw.errors as string[]
  };
  if (
    (retainedRaw.baseline != null && retainedMemory.baseline == null)
    || (retainedRaw.final != null && retainedMemory.final == null)
    || (
      retainedMemory.baseline != null
      && !isDeepStrictEqual(retainedMemory.baseline, retainedRaw.baseline)
    )
    || (
      retainedMemory.final != null
      && !isDeepStrictEqual(retainedMemory.final, retainedRaw.final)
    )
  ) {
    throw new Error('retained-memory.json checkpoint shape is invalid');
  }
  if (
    workload.samples !== samples.length
    || workload.canaries !== canaries.length
    || !isDeepStrictEqual(workload.canarySchedule, canarySchedule)
  ) {
    throw new Error('workload-progress.json counters or canary schedule are inconsistent');
  }
  if (
    context.executionErrors.length === 0
    && (
      workload.offeredLoad == null
      || workload.resolvedWarmupTimeoutMs == null
      || workload.workloadDurationMs == null
    )
  ) {
    throw new Error('successful run evidence has incomplete workload progress');
  }
  const tenants = resolveTenants(
    fleet.tenants.slice(0, context.configuredCustomers),
    arm
  );
  const selectedWorkload = context.evidenceMode === 'diagnostic'
    && context.configuredDurationSec === 5
    ? {
      ...plan.workload,
      durationSec: 5,
      ...(plan.workload.rps != null
        ? { rps: Math.min(plan.workload.rps, 5), rpsPerTenant: undefined }
        : {
          rps: undefined,
          rpsPerTenant: Math.min(
            plan.workload.rpsPerTenant!,
            5 / context.configuredCustomers
          )
        })
    }
    : { ...plan.workload, durationSec: context.configuredDurationSec };
  const offeredLoad = resolveOfferedLoad(selectedWorkload, context.configuredCustomers);
  const surfaceCount = tenants.reduce((sum, tenant) => sum + tenant.surfaces.length, 0);
  const resolvedWarmupTimeoutMs = resolveWarmupTimeoutMs(plan.workload, surfaceCount);
  if (
    workload.offeredLoad != null
    && !isDeepStrictEqual(workload.offeredLoad, offeredLoad)
  ) {
    throw new Error('workload-progress.json offered load contradicts the plan/fleet');
  }
  if (
    workload.resolvedWarmupTimeoutMs != null
    && workload.resolvedWarmupTimeoutMs !== resolvedWarmupTimeoutMs
  ) {
    throw new Error('workload-progress.json warmup timeout contradicts the plan/fleet');
  }
  const tenantById = new Map(tenants.map((tenant) => [tenant.id, tenant]));
  const warmedSurfaces = new Map<string, Set<string>>();
  for (const entry of workload.warmedSurfaces) {
    const tenant = tenantById.get(entry.tenantId);
    if (!tenant) throw new Error(`warmup evidence contains unknown tenant '${entry.tenantId}'`);
    const configured = new Set(tenant.surfaces.map((surface) => surface.name));
    if (entry.surfaces.some((surface) => !configured.has(surface))) {
      throw new Error(`warmup evidence contains an unknown surface for '${entry.tenantId}'`);
    }
    warmedSurfaces.set(entry.tenantId, new Set(entry.surfaces));
  }
  const planSha256 = sourceSha256(plan);
  const fleetSha256 = sourceSha256(fleet);
  const realtimeDeliveryCoverage = readRealtimeCoverageEvidence(result.artifactDir);
  if (context.executionErrors.length === 0 && realtimeDeliveryCoverage == null) {
    throw new Error('successful run evidence has no timed realtime terminal transition');
  }
  return {
    arm: arm.name,
    evidenceMode: context.evidenceMode,
    campaignId: context.campaignId,
    scheduleSha256: context.scheduleSha256,
    previousResultPayloadSha256: context.previousResultPayloadSha256,
    qualificationCohortSha256: sha256(`${planSha256}\0${fleetSha256}`),
    commit: arm.commit,
    introspectionMode: arm.introspectionMode,
    heapMiB: context.heapMiB,
    repetition: context.repetition,
    expectedMatrixRepetitions: plan.repetitions,
    runKind: context.runKind,
    runOrderSeed: plan.runOrderSeed ?? DEFAULT_RUN_ORDER_SEED,
    runOrderIndex: context.runOrderIndex,
    startedAt: context.startedAt,
    endedAt: context.endedAt,
    configuredDurationSec: context.configuredDurationSec,
    workloadDurationMs: workload.workloadDurationMs ?? 0,
    artifactDir: result.artifactDir,
    tenants,
    warmedSurfaces,
    warmupLatencies: workload.warmupLatencies,
    resolvedWarmupTimeoutMs,
    offeredLoad,
    canaryIntervalSec: plan.workload.canaryIntervalSec,
    periodicCanarySchedule: plan.workload.periodicCanarySchedule ?? 'full-sweep',
    canarySchedule,
    minWorkloadRequestsPerSurface: plan.workload.minWorkloadRequestsPerSurface,
    samples,
    canaries,
    memorySnapshots: memory.snapshots,
    postWarmupSnapshots: memory.snapshots.slice(Math.max(0, memory.warmupIndex)),
    postWarmupNodeRssSnapshots: memory.osSnapshots.slice(
      Math.max(0, memory.osWarmupIndex)
    ),
    retainedMemory,
    memorySampleErrors: memory.errors,
    postgresSnapshots: postgres.snapshots,
    postgresSampleErrors: postgres.errors,
    missedArrivals: samples.filter(
      (sample) => sample.errorCode === 'LOAD_GENERATOR_MISSED_ARRIVAL'
    ).length,
    requiredCapabilities: [...plan.requiredCapabilities],
    requiredCanaries: [...plan.requiredCanaries],
    gates: plan.gates,
    serverExit: context.serverExit,
    provenance: context.provenance,
    provenanceErrors: context.provenanceErrors,
    postgresRunAttestation: context.postgresRunAttestation,
    realtimeDeliveryCoverage,
    externalServer: context.externalServer,
    executionErrors: context.executionErrors
  };
};

export const assertResultSemanticReplay = (
  result: DensityRunResult,
  plan: DensityPlanV1,
  fleet: FleetV1,
  label: string
): void => {
  let replayed: DensityRunResult;
  try {
    replayed = scoreRun(reconstructScoreInput(result, plan, fleet));
  } catch (error) {
    throw new Error(
      `${label} semantic replay failed: `
      + `${error instanceof Error ? error.message : String(error)}`
    );
  }
  if (!isDeepStrictEqual(resultPayload(result), replayed)) {
    throw new Error(`${label} result does not match semantic replay of raw evidence`);
  }
};
