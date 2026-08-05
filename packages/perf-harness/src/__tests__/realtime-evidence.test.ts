import { createHash } from 'node:crypto';

import { summarizeRealtimeReceiptEvidence } from '../realtime-evidence';
import type { RealtimeCorrelationReceipt } from '../types';

const digest = (value: string): string => createHash('sha256')
  .update(value)
  .digest('hex');

const receipt = (
  sequence: number,
  issuedAt: string,
  primeResponseAt: string,
  eventAt: string,
  value = `nonce-${sequence}`
): RealtimeCorrelationReceipt => {
  const sha256 = digest(value);
  const deadlineAt = new Date(Date.parse(issuedAt) + 30_000).toISOString();
  return {
    sequence,
    timed: true,
    deadlineAt,
    issuedAt,
    issuedSha256: sha256,
    primeResponseAt,
    primeResponseSha256: sha256,
    eventAt,
    eventSha256: sha256
  };
};

const evidence = (receipts: RealtimeCorrelationReceipt[]) => ({
  deliveryIntervalMs: 60_000,
  workloadStartedAt: '2026-08-02T00:00:00.000Z',
  workloadDeadlineAt: '2026-08-02T00:03:00.000Z',
  workloadEndedAt: '2026-08-02T00:03:00.000Z',
  surfaces: [{
    tenantId: 'customer-a',
    surface: 'api-a',
    route: '/customer/customer-a/tenant/a/graphql',
    expectedRecurringRounds: receipts.length,
    startedRecurringRounds: receipts.length,
    verifiedRecurringRounds: receipts.length,
    deadlineLateRecurringRounds: 0,
    receipts
  }]
});

describe('realtime receipt evidence', () => {
  it('derives exact counts, digests, and latency from ordered receipts', () => {
    const summary = summarizeRealtimeReceiptEvidence(evidence([
      receipt(
        1,
        '2026-08-02T00:01:00.000Z',
        '2026-08-02T00:01:00.020Z',
        '2026-08-02T00:01:00.040Z'
      ),
      receipt(
        2,
        '2026-08-02T00:02:00.000Z',
        '2026-08-02T00:02:00.030Z',
        '2026-08-02T00:02:00.050Z'
      )
    ]));

    expect(summary.failures).toEqual([]);
    expect(summary.coverage).toMatchObject({
      version: 2,
      expectedRecurringRounds: 2,
      startedRecurringRounds: 2,
      verifiedRecurringRounds: 2,
      primeRequests: 2,
      primeResponseP99Ms: 30,
      deliveryP99Ms: 50,
      complete: true
    });
    expect(summary.coverage.surfaces[0].issuedCorrelationSha256).toBe(
      summary.coverage.surfaces[0].verifiedCorrelationSha256
    );
  });

  it('rejects one digest reused across exact routes', () => {
    const shared = receipt(
      1,
      '2026-08-02T00:01:00.000Z',
      '2026-08-02T00:01:00.020Z',
      '2026-08-02T00:01:00.040Z',
      'shared-nonce'
    );
    const input = evidence([shared]);
    input.surfaces.push({
      ...input.surfaces[0],
      tenantId: 'customer-b',
      surface: 'api-b',
      route: '/customer/customer-b/tenant/b/graphql',
      receipts: [{ ...shared }]
    });

    const summary = summarizeRealtimeReceiptEvidence(input);
    expect(summary.coverage.complete).toBe(false);
    expect(summary.failures).toContain(
      'reused realtime receipt digest: customer-b/api-b'
    );
  });

  it('rejects a response or event timestamp preceding nonce issue', () => {
    const summary = summarizeRealtimeReceiptEvidence(evidence([
      receipt(
        1,
        '2026-08-02T00:01:00.100Z',
        '2026-08-02T00:01:00.000Z',
        '2026-08-02T00:01:00.050Z'
      )
    ]));

    expect(summary.coverage.complete).toBe(false);
    expect(summary.failures).toContain(
      'realtime verified receipt count mismatch: customer-a/api-a'
    );
  });

  it('rejects a self-issued deadline after the externally scheduled slot', () => {
    const summary = summarizeRealtimeReceiptEvidence(evidence([
      receipt(
        1,
        '2026-08-02T00:02:00.000Z',
        '2026-08-02T00:02:00.020Z',
        '2026-08-02T00:02:00.040Z'
      )
    ]));

    expect(summary.coverage.complete).toBe(false);
    expect(summary.failures).toContain(
      'invalid realtime receipt schedule deadline: customer-a/api-a'
    );
  });
});
