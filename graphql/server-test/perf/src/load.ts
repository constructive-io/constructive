import { toRedactedErrorSample } from './artifacts';
import { buildOperationBag, compatibleOperationsFor, executeOperation } from './operations';
import { summarizeOutcomes } from './stats';
import type {
  BenchmarkContext,
  LoadReport,
  MatrixCase,
  PerfRunConfig,
  RequestOutcome,
  RequestProfile,
  RuntimeOperationProfile,
} from './types';

export const runMeasuredLoad = async (input: {
  context: BenchmarkContext;
  matrixCase: MatrixCase;
  config: PerfRunConfig;
  requestProfiles: RequestProfile[];
  operationProfiles: RuntimeOperationProfile[];
}): Promise<LoadReport> => {
  const { context, matrixCase, config, requestProfiles, operationProfiles } = input;
  const durationMs = Math.max(0, matrixCase.scaleProfile.durationSeconds * 1000);
  const workers = Math.max(1, matrixCase.scaleProfile.workers);
  const endAt = performance.now() + durationMs;
  const outcomes: RequestOutcome[] = [];
  const operationBag = buildOperationBag(operationProfiles);
  const rowIdsByProfile = new Map<string, string[]>();
  let sequence = 0;
  let stopReason: string | undefined;
  let consecutiveFailures = 0;

  const nextSequence = (): number => sequence++;

  const rowBucketFor = (requestProfile: RequestProfile): string[] => {
    let bucket = rowIdsByProfile.get(requestProfile.id);
    if (!bucket) {
      bucket = [];
      rowIdsByProfile.set(requestProfile.id, bucket);
    }
    return bucket;
  };

  const maybeFailFast = (): void => {
    if (!config.failFast || stopReason) return;
    const total = outcomes.length;
    const failed = outcomes.filter((outcome) => !outcome.ok).length;
    if (consecutiveFailures >= 10) {
      stopReason = `fail-fast: ${consecutiveFailures} consecutive request failures`;
      return;
    }
    if (total >= 20 && failed / total > 0.5) {
      stopReason = `fail-fast: request failure rate ${(failed / total).toFixed(2)} after ${total} requests`;
    }
  };

  const worker = async (): Promise<void> => {
    while (!stopReason && performance.now() < endAt) {
      const seq = nextSequence();
      const requestProfile = requestProfiles[seq % requestProfiles.length];
      const compatible = compatibleOperationsFor(requestProfile, operationBag);
      const rowBucket = rowBucketFor(requestProfile);
      let operation = compatible[seq % Math.max(1, compatible.length)];
      if (operation?.requiresExistingRow && rowBucket.length === 0) {
        operation = compatible.find((candidate) => candidate.producesRowId && !candidate.requiresExistingRow) || operation;
      }
      const rowId = rowBucket.length > 0 ? rowBucket[seq % rowBucket.length] : undefined;
      let outcome: RequestOutcome;
      if (!operation) {
        outcome = {
          ok: false,
          latencyMs: 0,
          operation: 'load.selectOperation',
          requestProfileId: requestProfile.id,
          unexpectedGraphqlErrors: 0,
          error: toRedactedErrorSample(`No compatible operation for ${requestProfile.id}`, {
            operation: 'load.selectOperation',
            requestProfileId: requestProfile.id,
          }),
        };
      } else {
        outcome = await executeOperation({
          context,
          requestProfile,
          operation,
          sequence: seq,
          rowId,
          config,
          matrixCase,
        });
      }
      if (outcome.ok && outcome.rowId && !rowBucket.includes(outcome.rowId)) {
        rowBucket.push(outcome.rowId);
      }
      outcomes.push(outcome);
      consecutiveFailures = outcome.ok ? 0 : consecutiveFailures + 1;
      maybeFailFast();
    }
  };

  const started = performance.now();
  await Promise.all(Array.from({ length: workers }, () => worker()));
  const elapsed = performance.now() - started;
  const report = summarizeOutcomes({
    outcomes,
    durationMs: elapsed,
    durationSeconds: matrixCase.scaleProfile.durationSeconds,
    workers,
    failFast: stopReason ? { triggered: true, reason: stopReason } : { triggered: false },
    errorSampleLimit: config.errorSampleLimit,
  });

  if (report.totalRequests === 0) {
    return {
      ...report,
      ok: false,
      failFast: {
        triggered: true,
        reason: 'measured load completed without issuing any requests',
      },
    };
  }

  return report;
};
