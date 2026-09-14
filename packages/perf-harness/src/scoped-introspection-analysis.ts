import type { PreparedScopedCatalogFixture } from './scoped-catalog-fixture';
import type {
  BenchmarkReport,
  BenchmarkRun,
  JsonValue,
  SuccessfulWorkerResult,
} from './types';

export interface DistributionSummary {
  sampleCount: number;
  p50: number;
  p95: number;
  min: number;
  max: number;
}

export interface PairedMetricAnalysis {
  status: 'ok' | 'unavailable' | 'insufficient';
  reason: string | null;
  stock: DistributionSummary | null;
  scoped: DistributionSummary | null;
  pairedDifferences: Array<{
    repetition: number;
    stock: number;
    scoped: number;
    difference: number;
    percentChange: number | null;
  }>;
  pairedMedianPercentChange: number | null;
}

type MetricExtractor = (result: SuccessfulWorkerResult) => number | undefined;

const percentile = (values: readonly number[], probability: number): number => {
  const sorted = [...values].sort((left, right) => left - right);
  const index = Math.max(0, Math.ceil(sorted.length * probability) - 1);
  return sorted[index];
};

const summary = (values: readonly number[]): DistributionSummary => ({
  sampleCount: values.length,
  p50: percentile(values, 0.5),
  p95: percentile(values, 0.95),
  min: Math.min(...values),
  max: Math.max(...values),
});

const successfulByCase = (
  runs: readonly BenchmarkRun[],
  caseName: string
): Map<number, SuccessfulWorkerResult> =>
  new Map(
    runs.flatMap((run) =>
      run.caseName === caseName && run.result.status === 'ok'
        ? [[run.repetition, run.result] as const]
        : []
    )
  );

export const analyzePairedMetric = (
  report: BenchmarkReport,
  extractor: MetricExtractor
): PairedMetricAnalysis => {
  const stockResults = successfulByCase(report.runs, 'stock');
  const scopedResults = successfulByCase(report.runs, 'scoped');
  const repetitions = Array.from(
    { length: report.config.repetitions },
    (_value, index) => index + 1
  );
  const pairs = repetitions.flatMap((repetition) => {
    const stockResult = stockResults.get(repetition);
    const scopedResult = scopedResults.get(repetition);
    if (!stockResult || !scopedResult) return [];
    const stock = extractor(stockResult);
    const scoped = extractor(scopedResult);
    if (stock === undefined || scoped === undefined) return [];
    return [
      {
        repetition,
        stock,
        scoped,
        difference: scoped - stock,
        percentChange:
          stock === 0 ? null : ((scoped - stock) / stock) * 100,
      },
    ];
  });
  const stockValues = pairs.map((pair) => pair.stock);
  const scopedValues = pairs.map((pair) => pair.scoped);
  const changes = pairs.flatMap((pair) =>
    pair.percentChange === null ? [] : [pair.percentChange]
  );
  if (pairs.length === 0) {
    return {
      status: 'unavailable',
      reason: 'no complete successful stock/scoped repetition contained this metric',
      stock: null,
      scoped: null,
      pairedDifferences: [],
      pairedMedianPercentChange: null,
    };
  }
  const complete = pairs.length === report.config.repetitions;
  return {
    status: complete ? 'ok' : 'insufficient',
    reason: complete
      ? null
      : `expected ${report.config.repetitions} paired samples, found ${pairs.length}`,
    stock: summary(stockValues),
    scoped: summary(scopedValues),
    pairedDifferences: pairs,
    pairedMedianPercentChange:
      changes.length === pairs.length ? percentile(changes, 0.5) : null,
  };
};

const metadataNumber = (path: readonly string[]): MetricExtractor =>
  (result) => {
    let value: JsonValue | undefined = result.metadata;
    for (const key of path) {
      if (
        typeof value !== 'object' ||
        value === null ||
        Array.isArray(value)
      ) {
        return undefined;
      }
      value = value[key];
    }
    return typeof value === 'number' && Number.isFinite(value)
      ? value
      : undefined;
  };

const buildMetricExtractors: Record<string, MetricExtractor> = {
  buildMs: (result) => result.buildMs,
  heapUsedAfterBuild: (result) => result.memory.afterBuild.heapUsed,
  heapUsedDelta: (result) => result.memory.delta.heapUsed,
  rssAfterBuild: (result) => result.memory.afterBuild.rss,
  rssDelta: (result) => result.memory.delta.rss,
  processPeakRss: (result) => result.memory.processPeakRss,
};

const queryMetricExtractors: Record<string, MetricExtractor> = {
  queryMs: (result) => result.buildMs,
  payloadBytes: metadataNumber(['payloadBytes']),
  bindParameterCount: metadataNumber(['bindParameterCount']),
  namespaces: metadataNumber(['introspectionEntityCounts', 'namespaces']),
  classes: metadataNumber(['introspectionEntityCounts', 'classes']),
  attributes: metadataNumber(['introspectionEntityCounts', 'attributes']),
  procedures: metadataNumber(['introspectionEntityCounts', 'procedures']),
  types: metadataNumber(['introspectionEntityCounts', 'types']),
  constraints: metadataNumber(['introspectionEntityCounts', 'constraints']),
  indexes: metadataNumber(['introspectionEntityCounts', 'indexes']),
  ranges: metadataNumber(['introspectionEntityCounts', 'ranges']),
  extensions: metadataNumber(['introspectionEntityCounts', 'extensions']),
};

const analyzeMetrics = (
  report: BenchmarkReport,
  extractors: Record<string, MetricExtractor>
): Record<string, PairedMetricAnalysis> =>
  Object.fromEntries(
    Object.entries(extractors).map(([name, extractor]) => [
      name,
      analyzePairedMetric(report, extractor),
    ])
  );

const successfulResults = (
  report: BenchmarkReport
): SuccessfulWorkerResult[] =>
  report.runs.flatMap((run) =>
    run.result.status === 'ok' ? [run.result] : []
  );

const metadataStrings = (
  report: BenchmarkReport,
  key: string
): string[] =>
  [
    ...new Set(
      successfulResults(report).flatMap((result) => {
        const value = result.metadata?.[key];
        return typeof value === 'string' ? [value] : [];
      })
    ),
  ];

const validationErrors = (
  build: BenchmarkReport,
  query: BenchmarkReport
): string[] => {
  const errors = [
    ...build.validation.errors.map((error) => `build: ${error}`),
    ...query.validation.errors.map((error) => `query: ${error}`),
  ];
  if (!build.validation.allRunsSucceeded) errors.push('build runs did not all succeed');
  if (!query.validation.allRunsSucceeded) errors.push('query runs did not all succeed');
  if (!build.validation.freshProcessPerRun) errors.push('build PIDs were not all unique');
  if (!query.validation.freshProcessPerRun) errors.push('query PIDs were not all unique');
  if (!build.validation.schemaGroupsEquivalent) errors.push('schema hashes differ');
  if (!successfulResults(build).every((result) => result.runtimeVerified)) {
    errors.push('one or more build runtime validations did not pass');
  }
  return [...new Set(errors)];
};

export const analyzeScopedIntrospectionReports = (input: {
  fixture: PreparedScopedCatalogFixture;
  buildReports: Record<'off' | 'on', BenchmarkReport>;
  queryReports: Record<'off' | 'on', BenchmarkReport>;
  rawReportSha256?: Record<string, string>;
}) => {
  const reports = [
    input.buildReports.off,
    input.queryReports.off,
    input.buildReports.on,
    input.queryReports.on,
  ];
  const pids = reports.flatMap((report) =>
    successfulResults(report).map((result) => result.pid)
  );
  const matrixValidationErrors =
    new Set(pids).size === pids.length
      ? []
      : ['worker PIDs were not unique across the complete build/query matrix'];
  const jitAnalysis = Object.fromEntries(
    (['off', 'on'] as const).map((jit) => {
      const build = input.buildReports[jit];
      const query = input.queryReports[jit];
      return [
        jit,
        {
          expectedJit: jit,
          observedBuildJit: metadataStrings(build, 'actualJit'),
          observedQueryJit: metadataStrings(query, 'actualJit'),
          sampleCount: {
            build: {
              stock: build.runs.filter(
                (run) => run.caseName === 'stock' && run.result.status === 'ok'
              ).length,
              scoped: build.runs.filter(
                (run) => run.caseName === 'scoped' && run.result.status === 'ok'
              ).length,
            },
            query: {
              stock: query.runs.filter(
                (run) => run.caseName === 'stock' && run.result.status === 'ok'
              ).length,
              scoped: query.runs.filter(
                (run) => run.caseName === 'scoped' && run.result.status === 'ok'
              ).length,
            },
          },
          schemaHash:
            build.validation.schemaGroups['introspection-equivalence'] ?? null,
          runtimeValidationPassed: successfulResults(build).every(
            (result) => result.runtimeVerified && result.caseValidation.passed
          ),
          validationErrors: validationErrors(build, query),
          build: analyzeMetrics(build, buildMetricExtractors),
          query: analyzeMetrics(query, queryMetricExtractors),
        },
      ];
    })
  );
  return {
    format: 'constructive-scoped-introspection-analysis/v1' as const,
    generatedAt: new Date().toISOString(),
    catalogWarmth: 'shared-server-not-reset' as const,
    fixture: input.fixture,
    environment: {
      node: input.buildReports.off.node,
      platform: input.buildReports.off.platform,
      architecture: input.buildReports.off.architecture,
      postgres: input.fixture.serverVersion,
    },
    rawReportSha256: input.rawReportSha256 ?? {},
    validation: {
      allWorkerPidsUnique: matrixValidationErrors.length === 0,
      errors: matrixValidationErrors,
    },
    jit: jitAnalysis,
  };
};
