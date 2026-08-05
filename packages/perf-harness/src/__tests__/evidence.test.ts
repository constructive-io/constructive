import { createHash } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import {
  readRealtimeCoverageEvidence,
  readScoreContextEvidence,
  scoreContextFromInput,
  writeScoreContext
} from '../evidence';
import { summarizeRealtimeReceiptEvidence } from '../realtime-evidence';
import type { ScoreInput } from '../score';
import type { RealtimeCorrelationReceipt } from '../types';

const hash = (value: string): string => createHash('sha256')
  .update(value)
  .digest('hex');

const artifactDir = (): string => fs.mkdtempSync(
  path.join(os.tmpdir(), 'cperf-evidence-test-')
);

const contextInput = (
  command: string[] = ['node', 'server.cjs', '--secrets', '/tmp/runtime-secrets.json'],
  executionErrors: string[] = []
): ScoreInput => ({
  arm: 'stock',
  evidenceMode: 'diagnostic',
  runKind: 'matrix',
  heapMiB: 2048,
  tenants: [{
    id: 'customer-secret-id',
    surfaces: [{
      name: 'api',
      buildContract: 'customer-secret-contract',
      url: 'http://127.0.0.1:3000/graphql',
      headers: { authorization: 'Bearer customer-secret-token' }
    }]
  }],
  repetition: 1,
  runOrderIndex: 1,
  startedAt: '2026-08-02T00:00:00.000Z',
  endedAt: '2026-08-02T00:00:05.000Z',
  configuredDurationSec: 5,
  serverExit: null,
  externalServer: false,
  executionErrors,
  provenance: { command },
  provenanceErrors: [],
  postgresRunAttestation: null
} as unknown as ScoreInput);

const metadata = (knownRuntimeSecretValues: readonly string[] = []) => ({
  planSha256: 'a'.repeat(64),
  fleetSha256: 'b'.repeat(64),
  campaignId: 'c'.repeat(64),
  scheduleSha256: 'd'.repeat(64),
  previousResultPayloadSha256: null as string | null,
  notBeforeEpochMs: Date.parse('2026-08-02T00:00:00.000Z'),
  knownRuntimeSecretValues
});

const receipt = (
  sequence: number,
  nonce: string,
  timed = true
): RealtimeCorrelationReceipt => {
  const sha256 = hash(nonce);
  return {
    sequence,
    timed,
    deadlineAt: '2026-08-02T00:02:00.000Z',
    issuedAt: '2026-08-02T00:01:00.000Z',
    issuedSha256: sha256,
    primeResponseAt: '2026-08-02T00:01:00.010Z',
    primeResponseSha256: sha256,
    eventAt: '2026-08-02T00:01:00.020Z',
    eventSha256: sha256
  };
};

const realtimeSurface = (
  tenantId: string,
  nonce: string
) => ({
  tenantId,
  surface: 'api',
  route: `/customer/${tenantId}/graphql`,
  active: true,
  verified: true,
  deliveryEvents: 1,
  deliveryRoundsStarted: 1,
  deliveryRoundsVerified: 1,
  deliveryRoundPending: false,
  timedRoundsExpected: 1,
  timedRoundsStarted: 1,
  timedRoundsVerified: 1,
  timedRoundsDeadlineLate: 0,
  correlationReceipts: [receipt(1, nonce)]
});

const realtimeSnapshot = (surfaces: ReturnType<typeof realtimeSurface>[]) => {
  const coverage = summarizeRealtimeReceiptEvidence({
    deliveryIntervalMs: 60_000,
    workloadStartedAt: '2026-08-02T00:00:00.000Z',
    workloadDeadlineAt: '2026-08-02T00:02:00.000Z',
    workloadEndedAt: '2026-08-02T00:02:00.000Z',
    surfaces: surfaces.map((surface) => ({
      tenantId: surface.tenantId,
      surface: surface.surface,
      route: surface.route,
      expectedRecurringRounds: surface.timedRoundsExpected,
      startedRecurringRounds: surface.timedRoundsStarted,
      verifiedRecurringRounds: surface.timedRoundsVerified,
      deadlineLateRecurringRounds: surface.timedRoundsDeadlineLate,
      receipts: surface.correlationReceipts
    }))
  }).coverage;
  return {
    expected: surfaces.length,
    active: surfaces.length,
    verified: surfaces.length,
    deliveryIntervalMs: 60_000,
    deliveryEvents: surfaces.length,
    deliveryRoundsStarted: 1,
    deliveryRoundsVerified: 1,
    deliveryRoundsPending: 0,
    timedCoverage: coverage,
    errors: [] as string[],
    surfaces
  };
};

describe('density score evidence', () => {
  it('persists only credential-free scoring context', () => {
    const dir = artifactDir();
    const knownSecret = 'known-runtime-secret-marker';
    writeScoreContext(dir, contextInput(), metadata([knownSecret]));

    const serialized = fs.readFileSync(path.join(dir, 'score-context.json'), 'utf8');
    expect(serialized).not.toContain(knownSecret);
    expect(serialized).not.toContain('customer-secret-id');
    expect(serialized).not.toContain('customer-secret-contract');
    expect(serialized).not.toContain('customer-secret-token');
    expect(serialized).not.toContain('authorization');
    expect(serialized).toContain('/tmp/runtime-secrets.json');
  });

  it.each([
    ['known runtime value', ['node', '--label=known-runtime-secret-marker'], ['known-runtime-secret-marker']],
    ['separate password', ['node', '--password', 'literal-password'], []],
    ['URL userinfo', ['node', 'postgres://runtime:literal-password@localhost/db'], []],
    ['URL token parameter', ['node', 'https://localhost/start?token=literal-token'], []],
    ['authorization header', ['node', 'Authorization: Bearer literal-token'], []]
  ])('rejects credential-bearing provenance: %s', (_label, command, knownSecrets) => {
    expect(() => scoreContextFromInput(
      contextInput(command),
      metadata(knownSecrets)
    )).toThrow('provenance command contains credential material');
  });

  it('requires execution failures to contain only a stable code and digest', () => {
    expect(() => scoreContextFromInput(
      contextInput(undefined, ['CAPACITY']),
      metadata()
    )).toThrow('code-and-SHA-256 evidence');

    const safe = `CAPACITY:sha256:${'c'.repeat(64)}`;
    expect(scoreContextFromInput(
      contextInput(undefined, [safe]),
      metadata()
    ).executionErrors).toEqual([safe]);
  });

  it('rejects credential material nested anywhere in provenance', () => {
    const input = contextInput(['node', 'server.cjs']);
    input.provenance = {
      ...input.provenance!,
      memoryPolicy: {
        nested: {
          password: 'nested-secret-value'
        }
      }
    } as unknown as ScoreInput['provenance'];
    expect(() => scoreContextFromInput(input, metadata())).toThrow(
      'provenance contains credential material at provenance.memoryPolicy.nested.password'
    );
  });

  it('rejects unversioned additions to the persisted context shape', () => {
    const dir = artifactDir();
    writeScoreContext(dir, contextInput(), metadata());
    const file = path.join(dir, 'score-context.json');
    const context = JSON.parse(fs.readFileSync(file, 'utf8'));
    context.tenants = ['customer-secret-id'];
    fs.writeFileSync(file, `${JSON.stringify(context)}\n`, 'utf8');

    expect(() => readScoreContextEvidence(dir)).toThrow(
      'unexpected=tenants'
    );
  });

  it('rejects a correlation digest reused across tenant routes', () => {
    const dir = artifactDir();
    const snapshot = realtimeSnapshot([
      realtimeSurface('customer-a', 'shared-nonce'),
      realtimeSurface('customer-b', 'shared-nonce')
    ]);
    fs.writeFileSync(path.join(dir, 'realtime-driver.json'), `${JSON.stringify([{
      phase: 'timed-coverage-complete',
      timestamp: '2026-08-02T00:02:00.000Z',
      snapshot
    }])}\n`, 'utf8');

    expect(() => readRealtimeCoverageEvidence(dir)).toThrow(
      'reused realtime receipt digest: customer-b/api'
    );
  });

  it('requires receipt and error histories to be append-only', () => {
    const dir = artifactDir();
    const surface = realtimeSurface('customer-a', 'nonce-a');
    const first = realtimeSnapshot([surface]);
    first.errors = ['delivery failed'];
    const second = realtimeSnapshot([surface]);
    fs.writeFileSync(path.join(dir, 'realtime-driver.json'), `${JSON.stringify([
      {
        phase: 'failed',
        timestamp: '2026-08-02T00:02:00.000Z',
        snapshot: first
      },
      {
        phase: 'disposed-after-failure',
        timestamp: '2026-08-02T00:02:01.000Z',
        snapshot: second
      }
    ])}\n`, 'utf8');

    expect(() => readRealtimeCoverageEvidence(dir)).toThrow(
      'realtime error history is not append-only'
    );
  });
});
