import { createHash } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import {
  collectPostgresRunAttestation,
  normalizePostgresRunAttestation,
  postgresRunIdentityClaims,
  type RunAttestationContext
} from '../run-attestation';
import type { ArmPlan } from '../types';

const canonicalize = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (!value || typeof value !== 'object') return value;
  const record = value as Record<string, unknown>;
  return Object.fromEntries(Object.keys(record).sort().map((key) => [
    key,
    canonicalize(record[key])
  ]));
};

const sha256 = (value: unknown): string => `sha256:${createHash('sha256')
  .update(JSON.stringify(canonicalize(value)))
  .digest('hex')}`;

const contextFor = (artifactDir: string): RunAttestationContext => ({
  arm: 'candidate',
  heapMiB: 2048,
  tenantCount: 1,
  repetition: 2,
  runOrderIndex: 7,
  planSha256: 'a'.repeat(64),
  fleetSha256: 'b'.repeat(64),
  notBeforeEpochMs: Date.parse('2026-08-02T00:00:00.000Z'),
  artifactDir
});

const envelopeFor = (context: RunAttestationContext) => {
  const customerAudits = [{
    customerId: 'customer-1',
    databaseContractFingerprint: `sha256:${'c'.repeat(64)}`,
    structuralFingerprints: { combined: { sha256: `sha256:${'d'.repeat(64)}` } },
    cloneAttestationSha256: `sha256:${'e'.repeat(64)}`,
    cloneNonceSha256: `sha256:${'f'.repeat(64)}`
  }];
  const provisionClone = {
    version: 1,
    id: 'measurement-unique-clone',
    purpose: 'measurement',
    attestationSetSha256: `sha256:${'1'.repeat(64)}`
  };
  const container = {
    id: '2'.repeat(64),
    startedAt: '2026-08-02T00:00:00.010Z'
  };
  const cgroup = {
    version: 1,
    source: 'container-cgroup-v2',
    identitySha256: `sha256:${'3'.repeat(64)}`
  };
  const postgres = {
    systemIdentifier: '7421234567890123456',
    postmasterStartedAt: '2026-08-02T00:00:00.020Z'
  };
  const immutableEpoch = {
    dockerContainerId: container.id,
    dockerStartedAt: container.startedAt,
    containerConfigurationSha256: `sha256:${'4'.repeat(64)}`,
    cgroupIdentitySha256: cgroup.identitySha256,
    postgresSystemIdentifier: postgres.systemIdentifier,
    postgresStartedAt: postgres.postmasterStartedAt,
    cloneId: provisionClone.id,
    cloneAttestationSetSha256: provisionClone.attestationSetSha256,
    cloneNonceSetSha256: sha256(customerAudits.map((audit) => ({
      customerId: audit.customerId,
      cloneNonceSha256: audit.cloneNonceSha256
    }))),
    liveContractSetSha256: sha256(customerAudits.map((audit) => ({
      customerId: audit.customerId,
      databaseContractFingerprint: audit.databaseContractFingerprint,
      structuralFingerprint: audit.structuralFingerprints.combined.sha256
    })))
  };
  const payload = {
    observedAt: '2026-08-02T00:00:01.000Z',
    run: {
      arm: context.arm,
      heapMiB: context.heapMiB,
      customerCount: context.tenantCount,
      repetition: context.repetition,
      runOrderIndex: context.runOrderIndex,
      planSha256: `sha256:${context.planSha256}`,
      fleetSha256: `sha256:${context.fleetSha256}`
    },
    manifestSha256: `sha256:${'5'.repeat(64)}`,
    containerTemplateSha256: `sha256:${'6'.repeat(64)}`,
    canonicalDatabaseContractFingerprint: `sha256:${'7'.repeat(64)}`,
    provisionClone,
    container,
    cgroup,
    postgres,
    customerAudits,
    immutableEpoch,
    epochId: sha256(immutableEpoch),
    freshness: {
      freshContainerForRun: true,
      cgroupV2Verified: true,
      notBeforeEpochMs: context.notBeforeEpochMs,
      startToleranceMs: 0
    },
    catalogCacheState: 'warmed-by-live-contract-audit'
  };
  return {
    version: 1,
    kind: 'physical-density-measurement-attestation-v1',
    payload,
    payloadSha256: sha256(payload)
  };
};

describe('PostgreSQL run attestation', () => {
  it('binds every immutable container, cluster, clone, and live-contract identity', () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'cperf-attestation-'));
    const context = contextFor(directory);
    const envelope = envelopeFor(context);
    const artifact = path.join(directory, 'attestation.json');
    fs.writeFileSync(artifact, JSON.stringify(envelope));
    const evidence = normalizePostgresRunAttestation(envelope, context, artifact);
    expect(evidence.cloneId).toBe('measurement-unique-clone');
    expect(evidence.cloneAttestationSetSha256).toBe(`sha256:${'1'.repeat(64)}`);
    expect(postgresRunIdentityClaims(evidence)).toHaveLength(7);

    const tampered = structuredClone(envelope) as any;
    tampered.payload.immutableEpoch.cloneId = 'different-clone';
    tampered.payload.epochId = sha256(tampered.payload.immutableEpoch);
    tampered.payloadSha256 = sha256(tampered.payload);
    expect(() => normalizePostgresRunAttestation(tampered, context, artifact))
      .toThrow('failed exact validation');
  });

  it('refuses to overwrite a prior per-run attestation artifact', async () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'cperf-attestation-'));
    const context = contextFor(directory);
    fs.writeFileSync(
      path.join(directory, 'postgres-run-attestation.json'),
      '{}'
    );
    const arm = {
      name: 'candidate',
      port: 3345,
      readinessUrl: 'http://127.0.0.1:3345/healthz',
      memoryUrl: 'http://127.0.0.1:3345/debug/memory',
      introspectionMode: 'stock',
      postgresRunAttestation: {
        command: [process.execPath, '-e', 'process.exit(0)'],
        prepareCommand: [process.execPath, '-e', 'process.exit(0)']
      }
    } satisfies ArmPlan;
    await expect(collectPostgresRunAttestation(arm, context))
      .rejects.toThrow('artifact already exists');
  });
});
