import { createHash } from 'node:crypto';

import type {
  RealtimeCorrelationReceipt,
  RealtimeDeliveryCoverage,
  RealtimeDeliverySurfaceCoverage
} from './types';

const SHA256 = /^[a-f0-9]{64}$/;
const EMPTY_SHA256 = createHash('sha256').update('').digest('hex');

const timestamp = (value: string | null): number => {
  if (value == null) return Number.NaN;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) && new Date(parsed).toISOString() === value
    ? parsed
    : Number.NaN;
};

const orderedDigestSha256 = (digests: string[]): string => digests.length === 0
  ? EMPTY_SHA256
  : createHash('sha256').update(digests.join('\n')).digest('hex');

export interface RealtimeReceiptSurfaceEvidence {
  tenantId: string;
  surface: string;
  route: string;
  expectedRecurringRounds: number;
  startedRecurringRounds: number;
  verifiedRecurringRounds: number;
  deadlineLateRecurringRounds: number;
  receipts: RealtimeCorrelationReceipt[];
}

export interface RealtimeReceiptEvidenceInput {
  deliveryIntervalMs: number;
  workloadStartedAt: string;
  workloadDeadlineAt: string;
  workloadEndedAt: string | null;
  surfaces: RealtimeReceiptSurfaceEvidence[];
}

export interface RealtimeReceiptEvidenceSummary {
  coverage: RealtimeDeliveryCoverage;
  failures: string[];
}

const receiptIsVerified = (receipt: RealtimeCorrelationReceipt): boolean => {
  const deadlineAt = timestamp(receipt.deadlineAt);
  const issuedAt = timestamp(receipt.issuedAt);
  const primeAt = timestamp(receipt.primeResponseAt);
  const eventAt = timestamp(receipt.eventAt);
  return Number.isSafeInteger(receipt.sequence)
    && receipt.sequence > 0
    && SHA256.test(receipt.issuedSha256)
    && receipt.primeResponseSha256 === receipt.issuedSha256
    && receipt.eventSha256 === receipt.issuedSha256
    && Number.isFinite(deadlineAt)
    && Number.isFinite(issuedAt)
    && Number.isFinite(primeAt)
    && Number.isFinite(eventAt)
    && issuedAt <= primeAt
    && issuedAt <= eventAt
    && primeAt <= deadlineAt
    && eventAt <= deadlineAt;
};

const percentile = (values: number[], fraction: number): number => {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((left, right) => left - right);
  return sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * fraction) - 1)];
};

export const summarizeRealtimeReceiptEvidence = (
  input: RealtimeReceiptEvidenceInput
): RealtimeReceiptEvidenceSummary => {
  const failures: string[] = [];
  const workloadStartedAtMs = timestamp(input.workloadStartedAt);
  const workloadDeadlineAtMs = timestamp(input.workloadDeadlineAt);
  const workloadEndedAtMs = timestamp(input.workloadEndedAt);
  const globalDigests = new Set<string>();
  const surfaceKeys = new Set<string>();
  const allPrimeLatencies: number[] = [];
  const allDeliveryLatencies: number[] = [];
  const surfaces: RealtimeDeliverySurfaceCoverage[] = input.surfaces.map((surface) => {
    const key = `${surface.tenantId}\0${surface.surface}`;
    if (surfaceKeys.has(key)) failures.push(`duplicate realtime surface: ${surface.tenantId}/${surface.surface}`);
    surfaceKeys.add(key);
    const sequences = new Set<number>();
    for (let index = 0; index < surface.receipts.length; index += 1) {
      const receipt = surface.receipts[index];
      if (
        !Number.isSafeInteger(receipt.sequence)
        || receipt.sequence !== index + 1
        || sequences.has(receipt.sequence)
      ) failures.push(`invalid realtime receipt sequence: ${surface.tenantId}/${surface.surface}`);
      sequences.add(receipt.sequence);
      if (!SHA256.test(receipt.issuedSha256)) {
        failures.push(`invalid realtime receipt digest: ${surface.tenantId}/${surface.surface}`);
      } else if (globalDigests.has(receipt.issuedSha256)) {
        failures.push(`reused realtime receipt digest: ${surface.tenantId}/${surface.surface}`);
      }
      if (
        receipt.primeResponseSha256 != null
        && !SHA256.test(receipt.primeResponseSha256)
      ) failures.push(`invalid realtime prime digest: ${surface.tenantId}/${surface.surface}`);
      if (receipt.eventSha256 != null && !SHA256.test(receipt.eventSha256)) {
        failures.push(`invalid realtime event digest: ${surface.tenantId}/${surface.surface}`);
      }
      globalDigests.add(receipt.issuedSha256);
    }
    const timed = surface.receipts.filter((receipt) => receipt.timed);
    const verified = timed.filter((receipt, index) => {
      const scheduledAt = workloadStartedAtMs + (index + 1) * input.deliveryIntervalMs;
      const slotDeadline = Math.min(
        workloadDeadlineAtMs,
        scheduledAt + input.deliveryIntervalMs
      );
      const issuedAt = timestamp(receipt.issuedAt);
      const receiptDeadline = timestamp(receipt.deadlineAt);
      const scheduleBound = Number.isFinite(scheduledAt)
        && Number.isFinite(slotDeadline)
        && Number.isFinite(issuedAt)
        && Number.isFinite(receiptDeadline)
        // Node timers and wall-clock serialization can differ by a few
        // milliseconds. This tolerance cannot extend the externally derived
        // slot deadline and therefore cannot bless a late delivery.
        && issuedAt >= scheduledAt - 5
        && issuedAt < slotDeadline
        && receiptDeadline >= issuedAt
        && receiptDeadline <= slotDeadline
        && receiptDeadline <= workloadDeadlineAtMs;
      if (!scheduleBound) {
        failures.push(
          `invalid realtime receipt schedule deadline: ${surface.tenantId}/${surface.surface}`
        );
      }
      return scheduleBound && receiptIsVerified(receipt);
    });
    if (timed.length !== surface.startedRecurringRounds) {
      failures.push(`realtime receipt count mismatch: ${surface.tenantId}/${surface.surface}`);
    }
    if (verified.length !== surface.verifiedRecurringRounds) {
      failures.push(`realtime verified receipt count mismatch: ${surface.tenantId}/${surface.surface}`);
    }
    if (
      !Number.isSafeInteger(surface.expectedRecurringRounds)
      || !Number.isSafeInteger(surface.startedRecurringRounds)
      || !Number.isSafeInteger(surface.verifiedRecurringRounds)
      || !Number.isSafeInteger(surface.deadlineLateRecurringRounds)
      || surface.expectedRecurringRounds < 0
      || surface.startedRecurringRounds < 0
      || surface.verifiedRecurringRounds < 0
      || surface.deadlineLateRecurringRounds < 0
    ) failures.push(`invalid realtime counters: ${surface.tenantId}/${surface.surface}`);
    const primeLatencies = verified.map((receipt) =>
      timestamp(receipt.primeResponseAt) - timestamp(receipt.issuedAt)
    );
    const deliveryLatencies = verified.map((receipt) =>
      timestamp(receipt.eventAt) - timestamp(receipt.issuedAt)
    );
    allPrimeLatencies.push(...primeLatencies);
    allDeliveryLatencies.push(...deliveryLatencies);
    return {
      tenantId: surface.tenantId,
      surface: surface.surface,
      route: surface.route,
      expectedRecurringRounds: surface.expectedRecurringRounds,
      startedRecurringRounds: surface.startedRecurringRounds,
      verifiedRecurringRounds: surface.verifiedRecurringRounds,
      issuedCorrelationSha256: orderedDigestSha256(
        timed.map((receipt) => receipt.issuedSha256)
      ),
      verifiedCorrelationSha256: orderedDigestSha256(
        verified.map((receipt) => receipt.issuedSha256)
      ),
      primeRequests: timed.length,
      primeResponseP99Ms: percentile(primeLatencies, 0.99),
      deliveryP99Ms: percentile(deliveryLatencies, 0.99)
    };
  });
  const expectedRecurringRounds = surfaces.reduce(
    (sum, surface) => sum + surface.expectedRecurringRounds,
    0
  );
  const startedRecurringRounds = surfaces.reduce(
    (sum, surface) => sum + surface.startedRecurringRounds,
    0
  );
  const verifiedRecurringRounds = surfaces.reduce(
    (sum, surface) => sum + surface.verifiedRecurringRounds,
    0
  );
  const deadlineLateRecurringRounds = input.surfaces.reduce(
    (sum, surface) => sum + surface.deadlineLateRecurringRounds,
    0
  );
  const primeRequests = surfaces.reduce(
    (sum, surface) => sum + surface.primeRequests,
    0
  );
  if (
    !Number.isSafeInteger(input.deliveryIntervalMs)
    || input.deliveryIntervalMs <= 0
    || !Number.isFinite(workloadStartedAtMs)
    || !Number.isFinite(workloadDeadlineAtMs)
    || (
      input.workloadEndedAt != null
      && !Number.isFinite(workloadEndedAtMs)
    )
  ) failures.push('invalid realtime coverage window');
  if (surfaces.length > 0 && expectedRecurringRounds === 0) {
    failures.push('realtime coverage has no recurring rounds');
  }
  const complete = failures.length === 0
    && input.workloadEndedAt != null
    && workloadEndedAtMs >= workloadDeadlineAtMs
    && startedRecurringRounds === expectedRecurringRounds
    && verifiedRecurringRounds === expectedRecurringRounds
    && deadlineLateRecurringRounds === 0
    && surfaces.every((surface) =>
      surface.issuedCorrelationSha256 === surface.verifiedCorrelationSha256
    );
  return {
    coverage: {
      version: 2,
      deliveryIntervalMs: input.deliveryIntervalMs,
      workloadStartedAt: input.workloadStartedAt,
      workloadDeadlineAt: input.workloadDeadlineAt,
      workloadEndedAt: input.workloadEndedAt,
      expectedRecurringRounds,
      startedRecurringRounds,
      verifiedRecurringRounds,
      deadlineLateRecurringRounds,
      primeRequests,
      primeResponseP99Ms: percentile(allPrimeLatencies, 0.99),
      deliveryP99Ms: percentile(allDeliveryLatencies, 0.99),
      complete,
      surfaces
    },
    failures
  };
};
