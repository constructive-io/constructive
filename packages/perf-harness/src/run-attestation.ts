import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import { resolveTemplate } from './config';
import type {
  ArmPlan,
  PostgresRunAttestationEvidence
} from './types';

const SHA256 = /^sha256:[a-f0-9]{64}$/;
const CONTAINER_ID = /^[a-f0-9]{64}$/;
const KIND = 'physical-density-measurement-attestation-v1';
const COMMAND_KILL_GRACE_MS = 2_000;

export interface RunAttestationContext {
  arm: string;
  heapMiB: number;
  tenantCount: number;
  repetition: number;
  runOrderIndex: number;
  planSha256: string;
  fleetSha256: string;
  notBeforeEpochMs: number;
  artifactDir: string;
}

export const postgresRunIdentityClaims = (
  evidence: PostgresRunAttestationEvidence
): string[] => [
  `epoch:${evidence.epochId}`,
  `container:${evidence.containerId}`,
  `cgroup:${evidence.cgroupIdentitySha256}`,
  `postgres-system:${evidence.postgresSystemIdentifier}`,
  `clone:${evidence.cloneId}`,
  `clone-attestation-set:${evidence.cloneAttestationSetSha256}`,
  `clone-nonce-set:${evidence.cloneNonceSetSha256}`
];

const canonicalize = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (!value || typeof value !== 'object') return value;
  const record = value as Record<string, unknown>;
  return Object.fromEntries(Object.keys(record).sort().map((key) => [
    key,
    canonicalize(record[key])
  ]));
};

const canonicalSha256 = (value: unknown): string => `sha256:${createHash('sha256')
  .update(JSON.stringify(canonicalize(value)))
  .digest('hex')}`;

const readRegularFile = (file: string): Buffer => {
  const before = fs.lstatSync(file);
  if (before.isSymbolicLink() || !before.isFile()) {
    throw new Error('PostgreSQL run evidence must be a regular non-symlink file');
  }
  const descriptor = fs.openSync(
    file,
    fs.constants.O_RDONLY | (fs.constants.O_NOFOLLOW ?? 0)
  );
  try {
    const opened = fs.fstatSync(descriptor);
    if (
      !opened.isFile()
      || opened.dev !== before.dev
      || opened.ino !== before.ino
    ) {
      throw new Error('PostgreSQL run evidence changed while it was opened');
    }
    return fs.readFileSync(descriptor);
  } finally {
    fs.closeSync(descriptor);
  }
};

const fileSha256 = (file: string): string => `sha256:${createHash('sha256')
  .update(readRegularFile(file))
  .digest('hex')}`;

const runCommand = async (
  command: string[],
  cwd: string,
  timeoutMs: number
): Promise<void> => {
  if (command.length === 0) throw new Error('PostgreSQL run command is empty');
  await new Promise<void>((resolve, reject) => {
    const child = spawn(command[0], command.slice(1), {
      cwd,
      env: process.env,
      detached: process.platform !== 'win32',
      stdio: 'ignore'
    });
    let settled = false;
    let timedOut = false;
    let forceTimer: NodeJS.Timeout | null = null;
    const signalTree = (signal: NodeJS.Signals): void => {
      if (child.pid && process.platform !== 'win32') {
        try {
          process.kill(-child.pid, signal);
          return;
        } catch {
          // Fall through to the direct child as a best-effort Windows/fork
          // fallback. The child exit remains the completion boundary.
        }
      }
      child.kill(signal);
    };
    const clearTimers = (): void => {
      clearTimeout(timer);
      if (forceTimer) clearTimeout(forceTimer);
    };
    const timer = setTimeout(() => {
      if (settled) return;
      timedOut = true;
      signalTree('SIGTERM');
      forceTimer = setTimeout(() => signalTree('SIGKILL'), COMMAND_KILL_GRACE_MS);
    }, timeoutMs);
    child.once('error', (error) => {
      if (settled) return;
      settled = true;
      clearTimers();
      reject(error);
    });
    child.once('exit', (code, signal) => {
      if (settled) return;
      settled = true;
      clearTimers();
      if (timedOut) reject(new Error('PostgreSQL run command timed out'));
      else if (code === 0 && signal == null) resolve();
      else reject(new Error(
        `PostgreSQL run command failed: code=${code ?? 'null'} signal=${signal ?? 'null'}`
      ));
    });
  });
};

const requireRecord = (value: unknown, label: string): Record<string, any> => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`PostgreSQL run attestation ${label} is invalid`);
  }
  return value as Record<string, any>;
};

export const normalizePostgresRunAttestation = (
  raw: unknown,
  context: RunAttestationContext,
  artifactPath: string,
  artifactSha256 = fileSha256(artifactPath)
): PostgresRunAttestationEvidence => {
  const envelope = requireRecord(raw, 'envelope');
  const payload = requireRecord(envelope.payload, 'payload');
  const run = requireRecord(payload.run, 'run binding');
  const freshness = requireRecord(payload.freshness, 'freshness');
  const immutableEpoch = requireRecord(payload.immutableEpoch, 'immutable epoch');
  const container = requireRecord(payload.container, 'container');
  const cgroup = requireRecord(payload.cgroup, 'cgroup');
  const postgres = requireRecord(payload.postgres, 'PostgreSQL cluster');
  const customerAudits = payload.customerAudits;
  const provisionClone = requireRecord(payload.provisionClone, 'provision clone');
  const orderedCustomerAudits = Array.isArray(customerAudits)
    ? [...customerAudits].sort((left, right) =>
      String(left?.customerId).localeCompare(String(right?.customerId)))
    : [];
  const cloneNonceSetSha256 = canonicalSha256(orderedCustomerAudits.map((audit) => ({
    customerId: audit.customerId,
    cloneNonceSha256: audit.cloneNonceSha256
  })));
  const liveContractSetSha256 = canonicalSha256(orderedCustomerAudits.map((audit) => ({
    customerId: audit.customerId,
    databaseContractFingerprint: audit.databaseContractFingerprint,
    structuralFingerprint: audit.structuralFingerprints?.combined?.sha256
  })));
  const observedAtMs = Date.parse(payload.observedAt ?? '');
  const containerStartedAtMs = Date.parse(container.startedAt ?? '');
  const postgresStartedAtMs = Date.parse(postgres.postmasterStartedAt ?? '');
  if (
    envelope.version !== 1
    || envelope.kind !== KIND
    || !SHA256.test(envelope.payloadSha256 ?? '')
    || canonicalSha256(payload) !== envelope.payloadSha256
    || run.arm !== context.arm
    || run.heapMiB !== context.heapMiB
    || run.customerCount !== context.tenantCount
    || run.repetition !== context.repetition
    || run.runOrderIndex !== context.runOrderIndex
    || run.planSha256 !== `sha256:${context.planSha256}`
    || run.fleetSha256 !== `sha256:${context.fleetSha256}`
    || !SHA256.test(payload.epochId ?? '')
    || payload.epochId !== canonicalSha256(immutableEpoch)
    || !CONTAINER_ID.test(container.id ?? '')
    || typeof container.startedAt !== 'string'
    || !Number.isSafeInteger(observedAtMs)
    || !Number.isSafeInteger(containerStartedAtMs)
    || !Number.isSafeInteger(postgresStartedAtMs)
    || observedAtMs < context.notBeforeEpochMs
    || containerStartedAtMs > observedAtMs
    || postgresStartedAtMs > observedAtMs
    || !SHA256.test(cgroup.identitySha256 ?? '')
    || cgroup.version !== 1
    || cgroup.source !== 'container-cgroup-v2'
    || typeof freshness.freshContainerForRun !== 'boolean'
    || freshness.freshContainerForRun
      !== (containerStartedAtMs >= context.notBeforeEpochMs)
    || freshness.cgroupV2Verified !== true
    || freshness.notBeforeEpochMs !== context.notBeforeEpochMs
    || freshness.startToleranceMs !== 0
    || payload.catalogCacheState !== 'warmed-by-live-contract-audit'
    || provisionClone.purpose !== 'measurement'
    || provisionClone.version !== 1
    || typeof provisionClone.id !== 'string'
    || !provisionClone.id
    || !SHA256.test(provisionClone.attestationSetSha256 ?? '')
    || !SHA256.test(payload.manifestSha256 ?? '')
    || !SHA256.test(payload.containerTemplateSha256 ?? '')
    || !SHA256.test(payload.canonicalDatabaseContractFingerprint ?? '')
    || !/^\d+$/.test(postgres.systemIdentifier ?? '')
    || !Array.isArray(customerAudits)
    || customerAudits.length !== context.tenantCount
    || new Set(customerAudits.map((audit: any) => audit?.customerId)).size
      !== context.tenantCount
    || customerAudits.some((audit: any) =>
      typeof audit?.customerId !== 'string'
      || !audit.customerId
      || !SHA256.test(audit?.databaseContractFingerprint ?? '')
      || !SHA256.test(audit?.structuralFingerprints?.combined?.sha256 ?? '')
      || !SHA256.test(audit?.cloneAttestationSha256 ?? '')
      || !SHA256.test(audit?.cloneNonceSha256 ?? '')
    )
    || immutableEpoch.dockerContainerId !== container.id
    || immutableEpoch.dockerStartedAt !== container.startedAt
    || !SHA256.test(immutableEpoch.containerConfigurationSha256 ?? '')
    || immutableEpoch.cgroupIdentitySha256 !== cgroup.identitySha256
    || immutableEpoch.postgresSystemIdentifier !== postgres.systemIdentifier
    || immutableEpoch.postgresStartedAt !== postgres.postmasterStartedAt
    || immutableEpoch.cloneId !== provisionClone.id
    || immutableEpoch.cloneAttestationSetSha256
      !== provisionClone.attestationSetSha256
    || immutableEpoch.cloneNonceSetSha256 !== cloneNonceSetSha256
    || immutableEpoch.liveContractSetSha256 !== liveContractSetSha256
    || !SHA256.test(immutableEpoch.cloneNonceSetSha256 ?? '')
    || !SHA256.test(immutableEpoch.liveContractSetSha256 ?? '')
  ) {
    throw new Error('PostgreSQL run attestation failed exact validation');
  }
  return {
    version: 1,
    kind: KIND,
    artifactPath,
    artifactSha256,
    payloadSha256: envelope.payloadSha256,
    epochId: payload.epochId,
    arm: run.arm,
    heapMiB: run.heapMiB,
    tenantCount: run.customerCount,
    repetition: run.repetition,
    runOrderIndex: run.runOrderIndex,
    planSha256: run.planSha256,
    fleetSha256: run.fleetSha256,
    containerId: container.id,
    containerStartedAt: container.startedAt,
    cgroupIdentitySha256: cgroup.identitySha256,
    containerConfigurationSha256:
      immutableEpoch.containerConfigurationSha256,
    postgresSystemIdentifier: immutableEpoch.postgresSystemIdentifier,
    postgresStartedAt: immutableEpoch.postgresStartedAt,
    cloneId: provisionClone.id,
    cloneAttestationSetSha256: immutableEpoch.cloneAttestationSetSha256,
    cloneNonceSetSha256: immutableEpoch.cloneNonceSetSha256,
    liveContractSetSha256: immutableEpoch.liveContractSetSha256,
    manifestSha256: payload.manifestSha256,
    containerTemplateSha256: payload.containerTemplateSha256,
    canonicalDatabaseContractFingerprint:
      payload.canonicalDatabaseContractFingerprint,
    freshContainerForRun: freshness.freshContainerForRun,
    cgroupV2Verified: freshness.cgroupV2Verified,
    liveCustomerContractsAudited: customerAudits.length,
    catalogCacheState: payload.catalogCacheState
  };
};

export const collectPostgresRunAttestation = async (
  arm: ArmPlan,
  context: RunAttestationContext
): Promise<PostgresRunAttestationEvidence | null> => {
  const configured = arm.postgresRunAttestation;
  if (!configured) return null;
  const artifactPath = path.join(
    context.artifactDir,
    'postgres-run-attestation.json'
  );
  const postgresFixtureDir = path.join(context.artifactDir, 'postgres-fixture');
  const postgresManifestFile = path.join(postgresFixtureDir, 'provision.json');
  const postgresSecretsFile = path.join(postgresFixtureDir, 'runtime-secrets.json');
  if (fs.existsSync(artifactPath)) {
    throw new Error('PostgreSQL run attestation artifact already exists');
  }
  const variables = {
    arm: context.arm,
    heapMiB: context.heapMiB,
    tenantCount: context.tenantCount,
    repetition: context.repetition,
    runOrderIndex: context.runOrderIndex,
    planSha256: `sha256:${context.planSha256}`,
    fleetSha256: `sha256:${context.fleetSha256}`,
    notBeforeEpochMs: context.notBeforeEpochMs,
    artifactDir: context.artifactDir,
    attestationFile: artifactPath,
    postgresFixtureDir,
    postgresManifestFile,
    postgresSecretsFile,
    port: arm.port,
    mode: arm.introspectionMode
  };
  const cwd = path.resolve(arm.cwd
    ? resolveTemplate(arm.cwd, variables)
    : process.cwd());
  const timeoutMs = configured.timeoutMs ?? 900_000;
  if (configured.prepareCommand?.length) {
    await runCommand(
      configured.prepareCommand.map((part) => resolveTemplate(part, variables)),
      cwd,
      timeoutMs
    );
  }
  await runCommand(
    configured.command.map((part) => resolveTemplate(part, variables)),
    cwd,
    timeoutMs
  );
  const stat = fs.lstatSync(artifactPath);
  if (stat.isSymbolicLink() || !stat.isFile()) {
    throw new Error('PostgreSQL run attestation must be a regular non-symlink file');
  }
  const manifestStat = fs.lstatSync(postgresManifestFile);
  const secretsStat = fs.lstatSync(postgresSecretsFile);
  if (
    manifestStat.isSymbolicLink()
    || !manifestStat.isFile()
    || secretsStat.isSymbolicLink()
    || !secretsStat.isFile()
    || (secretsStat.mode & 0o777) !== 0o600
  ) {
    throw new Error('PostgreSQL run fixture inputs failed private-file validation');
  }
  const artifactBytes = readRegularFile(artifactPath);
  const artifactSha256 = `sha256:${createHash('sha256')
    .update(artifactBytes)
    .digest('hex')}`;
  const raw = JSON.parse(artifactBytes.toString('utf8')) as unknown;
  const evidence = normalizePostgresRunAttestation(
    raw,
    context,
    artifactPath,
    artifactSha256
  );
  const manifestSha256 = fileSha256(postgresManifestFile);
  if (manifestSha256 !== evidence.manifestSha256) {
    throw new Error('PostgreSQL run manifest does not match its attestation');
  }
  return evidence;
};
