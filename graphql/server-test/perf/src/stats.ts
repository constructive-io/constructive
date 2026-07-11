import type { LoadReport, RequestOutcome } from './types';

const percentile = (sorted: number[], p: number): number | null => {
  if (sorted.length === 0) return null;
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1));
  return sorted[index];
};

const maxOf = (values: number[]): number | null => {
  if (values.length === 0) return null;
  let max = values[0];
  for (let i = 1; i < values.length; i += 1) {
    if (values[i] > max) max = values[i];
  }
  return max;
};

export const summarizeOutcomes = (input: {
  outcomes: RequestOutcome[];
  durationMs: number;
  durationSeconds: number;
  workers: number;
  failFast?: LoadReport['failFast'];
  errorSampleLimit: number;
}): LoadReport => {
  const { outcomes, durationMs, durationSeconds, workers, failFast, errorSampleLimit } = input;
  const latencies = outcomes.map((outcome) => outcome.latencyMs).sort((a, b) => a - b);
  const failedRequests = outcomes.filter((outcome) => !outcome.ok).length;
  const unexpectedGraphqlErrors = outcomes.reduce((sum, outcome) => sum + outcome.unexpectedGraphqlErrors, 0);
  const operations: LoadReport['operations'] = {};

  for (const outcome of outcomes) {
    operations[outcome.operation] ||= { total: 0, failed: 0 };
    operations[outcome.operation].total += 1;
    if (!outcome.ok) operations[outcome.operation].failed += 1;
  }

  return {
    ok: failedRequests === 0 && unexpectedGraphqlErrors === 0 && !failFast?.triggered,
    durationSeconds,
    workers,
    totalRequests: outcomes.length,
    failedRequests,
    unexpectedGraphqlErrors,
    qps: durationMs > 0 ? outcomes.length / (durationMs / 1000) : 0,
    latencyMs: {
      p50: percentile(latencies, 50),
      p90: percentile(latencies, 90),
      p95: percentile(latencies, 95),
      p99: percentile(latencies, 99),
      max: maxOf(latencies),
    },
    operations,
    ...(failFast && { failFast }),
    errorSamples: outcomes
      .map((outcome) => outcome.error)
      .filter((sample): sample is NonNullable<typeof sample> => Boolean(sample))
      .slice(0, errorSampleLimit),
  };
};
