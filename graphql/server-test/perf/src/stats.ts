import type { LoadReport, RequestOutcome } from './types';

export const percentile = (values: number[], p: number): number | null => {
  if (values.length === 0) return null;
  if (p <= 0) return Math.min(...values);
  if (p >= 1) return Math.max(...values);
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.max(0, Math.ceil(p * sorted.length) - 1);
  return sorted[index];
};

export const summarizeOutcomes = (input: {
  outcomes: RequestOutcome[];
  durationSeconds: number;
  workers: number;
  failFast?: { triggered: boolean; reason?: string };
  errorSampleLimit: number;
}): LoadReport => {
  const { outcomes, durationSeconds, workers, failFast, errorSampleLimit } = input;
  const latencies = outcomes.map((outcome) => outcome.latencyMs);
  const operations: LoadReport['operations'] = {};
  let failedRequests = 0;
  let unexpectedGraphqlErrors = 0;

  for (const outcome of outcomes) {
    operations[outcome.operation] ??= { total: 0, failed: 0 };
    operations[outcome.operation].total += 1;
    if (!outcome.ok) {
      failedRequests += 1;
      operations[outcome.operation].failed += 1;
    }
    unexpectedGraphqlErrors += outcome.unexpectedGraphqlErrors;
  }

  const totalRequests = outcomes.length;
  const effectiveDuration = durationSeconds > 0 ? durationSeconds : 1;

  return {
    ok: failedRequests === 0 && unexpectedGraphqlErrors === 0 && !failFast?.triggered,
    durationSeconds,
    workers,
    totalRequests,
    failedRequests,
    unexpectedGraphqlErrors,
    qps: totalRequests / effectiveDuration,
    latencyMs: {
      p50: percentile(latencies, 0.5),
      p90: percentile(latencies, 0.9),
      p95: percentile(latencies, 0.95),
      p99: percentile(latencies, 0.99),
      max: percentile(latencies, 1),
    },
    operations,
    failFast,
    errorSamples: outcomes
      .filter((outcome) => outcome.error)
      .slice(0, errorSampleLimit)
      .map((outcome) => outcome.error!),
  };
};
