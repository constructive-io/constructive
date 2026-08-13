import {
  ARM_DEFINITIONS,
  ARM_NAMES,
  type ArmComparison,
  type ArmName,
  type ArmSummary,
  type MatrixCoordinate,
  type MatrixRun,
  type MetricComparison,
  type MetricSummary,
  type SuccessfulWorkerResult,
} from './types';

const seededRandom = (seed: number): (() => number) => {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
};

const shuffledArms = (seed: number, repetition: number): ArmName[] => {
  const result = [...ARM_NAMES];
  const random = seededRandom((seed ^ Math.imul(repetition, 0x9e3779b1)) >>> 0);
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
  }
  return result;
};

export const makeSchedule = (
  repetitions: number,
  seed: number,
  exactOrder: readonly ArmName[] | null = null
): MatrixCoordinate[] => {
  if (!Number.isSafeInteger(repetitions) || repetitions < 1) {
    throw new Error('repetitions must be a positive safe integer');
  }
  const schedule: MatrixCoordinate[] = [];
  for (let repetition = 1; repetition <= repetitions; repetition += 1) {
    const order = exactOrder ? [...exactOrder] : shuffledArms(seed, repetition);
    if (
      order.length !== ARM_NAMES.length ||
      new Set(order).size !== ARM_NAMES.length ||
      order.some((arm) => !(arm in ARM_DEFINITIONS))
    ) {
      throw new Error('exact order must contain each benchmark arm exactly once');
    }
    order.forEach((arm, index) => {
      schedule.push({ repetition, position: index + 1, arm });
    });
  }
  return schedule;
};

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
  runs: readonly MatrixRun[],
  arm: ArmName
): SuccessfulWorkerResult[] =>
  runs
    .filter((run) => run.arm === arm && run.result.status === 'ok')
    .map((run) => run.result as SuccessfulWorkerResult);

export const summarizeArm = (
  runs: readonly MatrixRun[],
  arm: ArmName
): ArmSummary | undefined => {
  const results = successfulResultsFor(runs, arm);
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

export const compareArms = (
  baselineArm: ArmName,
  candidateArm: ArmName,
  baseline: ArmSummary,
  candidate: ArmSummary
): ArmComparison => ({
  baselineArm,
  candidateArm,
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
