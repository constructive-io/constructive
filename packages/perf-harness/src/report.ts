import type {
  BenchmarkCaseDefinition,
  BenchmarkRun,
  CaseComparison,
  CaseSummary,
  MetricComparison,
  MetricSummary,
  SuccessfulWorkerResult,
} from './types';

const median = (values: readonly number[]): number => {
  if (values.length === 0) throw new Error('cannot summarize zero values');
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[middle - 1] + sorted[middle]) / 2
    : sorted[middle];
};

const metricSummary = (values: number[]): MetricSummary => ({
  median: median(values),
  min: Math.min(...values),
  max: Math.max(...values),
  samples: values,
});

const successfulResultsFor = (
  runs: readonly BenchmarkRun[],
  caseName: string
): SuccessfulWorkerResult[] =>
  runs
    .filter((run) => run.caseName === caseName && run.result.status === 'ok')
    .map((run) => run.result as SuccessfulWorkerResult);

export const summarizeCase = (
  runs: readonly BenchmarkRun[],
  caseName: string
): CaseSummary | undefined => {
  const results = successfulResultsFor(runs, caseName);
  if (results.length === 0) return undefined;
  return {
    sampleCount: results.length,
    buildMs: metricSummary(results.map((result) => result.buildMs)),
    heapUsedAfterBuild: metricSummary(
      results.map((result) => result.memory.afterBuild.heapUsed)
    ),
    heapUsedDelta: metricSummary(
      results.map((result) => result.memory.delta.heapUsed)
    ),
    rssAfterBuild: metricSummary(
      results.map((result) => result.memory.afterBuild.rss)
    ),
    rssDelta: metricSummary(results.map((result) => result.memory.delta.rss)),
    processPeakRss: metricSummary(
      results.map((result) => result.memory.processPeakRss)
    ),
  };
};

const compareMetric = (
  baseline: MetricSummary,
  candidate: MetricSummary
): MetricComparison => ({
  baseline: baseline.median,
  candidate: candidate.median,
  difference: candidate.median - baseline.median,
  percentChange:
    baseline.median === 0
      ? null
      : ((candidate.median - baseline.median) / Math.abs(baseline.median)) *
        100,
});

export const compareCases = (
  baselineCase: string,
  candidateCase: string,
  baseline: CaseSummary,
  candidate: CaseSummary
): CaseComparison => ({
  baselineCase,
  candidateCase,
  buildMs: compareMetric(baseline.buildMs, candidate.buildMs),
  heapUsedAfterBuild: compareMetric(
    baseline.heapUsedAfterBuild,
    candidate.heapUsedAfterBuild
  ),
  heapUsedDelta: compareMetric(baseline.heapUsedDelta, candidate.heapUsedDelta),
  rssAfterBuild: compareMetric(baseline.rssAfterBuild, candidate.rssAfterBuild),
  rssDelta: compareMetric(baseline.rssDelta, candidate.rssDelta),
  processPeakRss: compareMetric(
    baseline.processPeakRss,
    candidate.processPeakRss
  ),
});

export const validateSchemaGroups = (
  definitions: readonly BenchmarkCaseDefinition[],
  runs: readonly BenchmarkRun[]
): {
  equivalent: boolean;
  hashes: Record<string, string | null>;
  errors: string[];
} => {
  const groups = new Map<string, Set<string>>();
  for (const definition of definitions) {
    if (!definition.expectedSchemaGroup) continue;
    const hashes =
      groups.get(definition.expectedSchemaGroup) ?? new Set<string>();
    for (const result of successfulResultsFor(runs, definition.name)) {
      hashes.add(result.schemaHash);
    }
    groups.set(definition.expectedSchemaGroup, hashes);
  }
  const output: Record<string, string | null> = {};
  const errors: string[] = [];
  for (const [group, hashes] of groups) {
    output[group] = hashes.size === 1 ? [...hashes][0] : null;
    if (hashes.size !== 1) {
      errors.push(`schema group '${group}' did not produce one schema hash`);
    }
  }
  return { equivalent: errors.length === 0, hashes: output, errors };
};
