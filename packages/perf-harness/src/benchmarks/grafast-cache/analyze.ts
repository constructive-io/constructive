import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { gunzipSync } from 'node:zlib';

import { parseValueArgs } from '../../process';
import { metricSummary } from '../../report';
import { writeJsonAtomically } from '../../run';
import type { BenchmarkReport } from '../../types';

export type GrafastCacheReportName =
  'micro.json' | 'postgres.json' | 'variants.json';

export type GrafastCacheReports = Record<
  GrafastCacheReportName,
  BenchmarkReport
>;

interface MetricDescription {
  median: number;
  min: number;
  max: number;
}

interface CacheSummary {
  requestMeanMs: MetricDescription;
  requestP95Ms: MetricDescription;
  requestP99Ms: MetricDescription;
  cpuMsPerRequest: MetricDescription;
  retainedMiB: MetricDescription;
  newPlans: MetricDescription;
  requestsPerProcess: number;
  samples: number;
}

interface PostgresSampleSummary {
  mean_ms: MetricDescription;
  p95_ms: MetricDescription;
  p99_ms: MetricDescription;
  cpu_ms_per_request: MetricDescription;
  retained_mib: MetricDescription;
  new_plans: MetricDescription;
  samples: number;
}

interface PostgresComparison {
  mean_ms: MetricDescription;
  p95_ms: MetricDescription;
  cpu_ms_per_request: MetricDescription;
  retained_mib: MetricDescription;
}

export interface GrafastCacheSummary {
  finalFreshProcesses: number;
  reports: Record<GrafastCacheReportName, Record<string, CacheSummary>>;
}

export interface GrafastCachePostgresSummary {
  sampleSummary: Record<string, PostgresSampleSummary>;
  pairedPercentChangeVsDefaults: Record<string, PostgresComparison>;
}

export interface GrafastCacheAnalysis {
  summary: GrafastCacheSummary;
  postgresSummary: GrafastCachePostgresSummary;
}

interface CacheMetadata {
  configurationSource: string;
  workload?: string;
  distinct?: number;
  inputHash?: string;
  queryStreamHash?: string;
  requests: number;
  cpuMs: number;
  measuredPlans: number;
  retainedWorkloadHeapBytes: number;
  requestLatencyMs: {
    mean: number;
    p95: number;
    p99: number;
  };
}

interface CacheSample {
  caseName: string;
  repetition: number;
  pid: number;
  metadata: CacheMetadata;
}

type SamplesByCase = Map<string, CacheSample[]>;

const EXPECTED_REPETITIONS = 8;
const EXPECTED_CASES: Record<GrafastCacheReportName, number> = {
  'micro.json': 20,
  'postgres.json': 6,
  'variants.json': 3,
};
const BYTES_PER_MIB = 1048576;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

function fail(message: string): never {
  throw new Error(message);
}

const finiteNumber = (value: unknown, label: string): number => {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    fail(`${label} must be a finite number`);
  }
  return value;
};

const positiveNumber = (value: unknown, label: string): number => {
  const number = finiteNumber(value, label);
  if (number <= 0) fail(`${label} must be greater than zero`);
  return number;
};

const nonEmptyString = (value: unknown, label: string): string => {
  if (typeof value !== 'string' || value.length === 0) {
    fail(`${label} must be a non-empty string`);
  }
  return value;
};

const metadataNumber = (
  value: Record<string, unknown>,
  key: string,
  label: string
): number => finiteNumber(value[key], `${label}.${key}`);

const metadataFor = (sampleLabel: string, value: unknown): CacheMetadata => {
  if (!isRecord(value)) fail(`${sampleLabel} is missing metadata`);
  const configurationSource = nonEmptyString(
    value.configurationSource,
    `${sampleLabel}.configurationSource`
  );
  const requests = positiveNumber(value.requests, `${sampleLabel}.requests`);
  const cpuMs = metadataNumber(value, 'cpuMs', sampleLabel);
  const measuredPlans = metadataNumber(value, 'measuredPlans', sampleLabel);
  const retainedWorkloadHeapBytes = metadataNumber(
    value,
    'retainedWorkloadHeapBytes',
    sampleLabel
  );
  const latency = value.requestLatencyMs;
  if (!isRecord(latency)) {
    fail(`${sampleLabel}.requestLatencyMs must be an object`);
  }
  const requestLatencyMs = (key: 'mean' | 'p95' | 'p99'): number =>
    finiteNumber(
      latency[key],
      `${sampleLabel}.requestLatencyMs.${key}`
    );
  const inputHash =
    typeof value.inputHash === 'string' && value.inputHash.length > 0
      ? value.inputHash
      : undefined;
  const queryStreamHash =
    typeof value.queryStreamHash === 'string' &&
    value.queryStreamHash.length > 0
      ? value.queryStreamHash
      : undefined;
  if (inputHash === undefined && queryStreamHash === undefined) {
    fail(`${sampleLabel} is missing inputHash/queryStreamHash`);
  }
  if (value.workload !== undefined && typeof value.workload !== 'string') {
    fail(`${sampleLabel}.workload must be a string when present`);
  }
  if (value.distinct !== undefined) {
    finiteNumber(value.distinct, `${sampleLabel}.distinct`);
  }
  return {
    configurationSource,
    workload: typeof value.workload === 'string' ? value.workload : undefined,
    distinct: typeof value.distinct === 'number' ? value.distinct : undefined,
    inputHash,
    queryStreamHash,
    requests,
    cpuMs,
    measuredPlans,
    retainedWorkloadHeapBytes,
    requestLatencyMs: {
      mean: requestLatencyMs('mean'),
      p95: requestLatencyMs('p95'),
      p99: requestLatencyMs('p99'),
    },
  };
};

const metricDescription = (values: number[]): MetricDescription => {
  if (values.some((value) => !Number.isFinite(value))) {
    fail('derived metric must be a finite number');
  }
  const summary = metricSummary(values);
  return {
    median: summary.median,
    min: summary.min,
    max: summary.max,
  };
};

const workloadGroup = (metadata: CacheMetadata): string =>
  metadata.workload ??
  (metadata.distinct === undefined ? 'variants' : String(metadata.distinct));

const validateReport = (
  reportName: GrafastCacheReportName,
  report: BenchmarkReport
): SamplesByCase => {
  const raw = report as unknown as Record<string, unknown>;
  if (
    !isRecord(raw.config) ||
    raw.config.repetitions !== EXPECTED_REPETITIONS
  ) {
    fail(
      `${reportName} must contain exactly ${EXPECTED_REPETITIONS} repetitions`
    );
  }
  if (!isRecord(raw.validation)) fail(`${reportName} is missing validation`);
  for (const flag of [
    'allRunsSucceeded',
    'freshProcessPerRun',
    'caseValidationPassed',
    'schemaGroupsEquivalent',
  ]) {
    if (raw.validation[flag] !== true) {
      fail(`${reportName} validation.${flag} must be true`);
    }
  }
  if (
    !Array.isArray(raw.validation.errors) ||
    raw.validation.errors.length !== 0
  ) {
    fail(`${reportName} validation.errors must be empty`);
  }
  const runs = raw.runs;
  const expectedRunCount = EXPECTED_CASES[reportName] * EXPECTED_REPETITIONS;
  if (!Array.isArray(runs) || runs.length !== expectedRunCount) {
    fail(`${reportName} must contain ${expectedRunCount} runs`);
  }
  const runValues: readonly unknown[] = runs;
  const cases = new Map<string, CacheSample[]>();
  const pairs = new Set<string>();
  const hashes = new Map<string, string>();
  for (const [index, value] of runValues.entries()) {
    if (!isRecord(value)) fail(`${reportName} run ${index} must be an object`);
    const caseName = nonEmptyString(
      value.caseName,
      `${reportName} run ${index}.caseName`
    );
    const repetition = value.repetition;
    if (
      typeof repetition !== 'number' ||
      !Number.isSafeInteger(repetition) ||
      repetition < 1 ||
      repetition > EXPECTED_REPETITIONS
    ) {
      fail(
        `${reportName} run ${index}.repetition must be between 1 and ${EXPECTED_REPETITIONS}`
      );
    }
    const pair = `${caseName}\u0000${repetition}`;
    if (pairs.has(pair)) {
      fail(
        `${reportName} contains a duplicate case/repetition pair: ${caseName}/${repetition}`
      );
    }
    pairs.add(pair);
    if (!isRecord(value.result) || value.result.status !== 'ok') {
      fail(`${reportName} run ${index} did not succeed`);
    }
    const result = value.result;
    if (result.caseName !== caseName) {
      fail(
        `${reportName} run ${index} result.caseName does not match its coordinate`
      );
    }
    const pid = finiteNumber(
      result.pid,
      `${reportName} run ${index}.result.pid`
    );
    if (!Number.isSafeInteger(pid) || pid <= 0) {
      fail(`${reportName} run ${index}.result.pid must be a positive integer`);
    }
    const metadata = metadataFor(
      `${reportName} run ${index}.result`,
      result.metadata
    );
    if (metadata.configurationSource !== 'grafast-schema-extensions') {
      fail(`${reportName} run ${index} has an unexpected configurationSource`);
    }
    const hash = metadata.inputHash ?? metadata.queryStreamHash;
    if (hash === undefined) {
      fail(`${reportName} run ${index} is missing an input hash`);
    }
    const group = workloadGroup(metadata);
    const previousHash = hashes.get(group);
    if (previousHash !== undefined && previousHash !== hash) {
      fail(`${reportName} workload ${group} has mismatched input hashes`);
    }
    hashes.set(group, hash);
    const sample = { caseName, repetition, pid, metadata };
    const caseSamples = cases.get(caseName) ?? [];
    caseSamples.push(sample);
    cases.set(caseName, caseSamples);
  }
  if (cases.size !== EXPECTED_CASES[reportName]) {
    fail(
      `${reportName} must contain ${EXPECTED_CASES[reportName]} cases; found ${cases.size}`
    );
  }
  for (const [caseName, caseSamples] of cases) {
    if (caseSamples.length !== EXPECTED_REPETITIONS) {
      fail(`${reportName} case ${caseName} must contain 8 samples`);
    }
    if (
      new Set(caseSamples.map((sample) => sample.repetition)).size !==
      EXPECTED_REPETITIONS
    ) {
      fail(
        `${reportName} case ${caseName} must contain one sample for each repetition`
      );
    }
  }
  return cases;
};

const summarizeMicroReport = (
  cases: SamplesByCase
): Record<string, CacheSummary> => {
  const summary: Record<string, CacheSummary> = {};
  for (const caseName of [...cases.keys()].sort()) {
    const caseSamples = cases.get(caseName)!;
    const metrics = caseSamples.map((sample) => sample.metadata);
    summary[caseName] = {
      requestMeanMs: metricDescription(
        metrics.map((metadata) => metadata.requestLatencyMs.mean)
      ),
      requestP95Ms: metricDescription(
        metrics.map((metadata) => metadata.requestLatencyMs.p95)
      ),
      requestP99Ms: metricDescription(
        metrics.map((metadata) => metadata.requestLatencyMs.p99)
      ),
      cpuMsPerRequest: metricDescription(
        metrics.map((metadata) => metadata.cpuMs / metadata.requests)
      ),
      retainedMiB: metricDescription(
        metrics.map(
          (metadata) => metadata.retainedWorkloadHeapBytes / BYTES_PER_MIB
        )
      ),
      newPlans: metricDescription(
        metrics.map((metadata) => metadata.measuredPlans)
      ),
      requestsPerProcess: metrics[0].requests,
      samples: metrics.length,
    };
  }
  return summary;
};

const postgresMetrics = (metadata: CacheMetadata) => ({
  mean_ms: metadata.requestLatencyMs.mean,
  p95_ms: metadata.requestLatencyMs.p95,
  p99_ms: metadata.requestLatencyMs.p99,
  cpu_ms_per_request: metadata.cpuMs / metadata.requests,
  retained_mib: metadata.retainedWorkloadHeapBytes / BYTES_PER_MIB,
  new_plans: metadata.measuredPlans,
});

const summarizePostgres = (
  cases: SamplesByCase
): GrafastCachePostgresSummary => {
  const byCase = new Map<string, Map<number, CacheSample>>();
  for (const [caseName, caseSamples] of cases) {
    const byRepetition = new Map(
      caseSamples.map((sample) => [sample.repetition, sample])
    );
    byCase.set(caseName, byRepetition);
  }
  const sampleSummary: Record<string, PostgresSampleSummary> = {};
  for (const [caseName, byRepetition] of byCase) {
    const metrics = [...byRepetition.values()].map((sample) =>
      postgresMetrics(sample.metadata)
    );
    sampleSummary[caseName] = {
      mean_ms: metricDescription(metrics.map((value) => value.mean_ms)),
      p95_ms: metricDescription(metrics.map((value) => value.p95_ms)),
      p99_ms: metricDescription(metrics.map((value) => value.p99_ms)),
      cpu_ms_per_request: metricDescription(
        metrics.map((value) => value.cpu_ms_per_request)
      ),
      retained_mib: metricDescription(
        metrics.map((value) => value.retained_mib)
      ),
      new_plans: metricDescription(metrics.map((value) => value.new_plans)),
      samples: metrics.length,
    };
  }

  const describeChange = (
    candidate: readonly number[],
    baseline: readonly number[]
  ): MetricDescription =>
    metricDescription(
      candidate.map((value, index) => 100 * (value / baseline[index] - 1))
    );
  const pairedPercentChangeVsDefaults: Record<string, PostgresComparison> = {};
  for (const size of [32, 600]) {
    const baselineName = `pg-${size}-defaults`;
    const baseline = byCase.get(baselineName);
    if (baseline === undefined)
      fail(`postgres report is missing ${baselineName}`);
    for (const arm of ['example', 'large']) {
      const candidateName = `pg-${size}-${arm}`;
      const candidate = byCase.get(candidateName);
      if (candidate === undefined) {
        fail(`postgres report is missing ${candidateName}`);
      }
      const baselineRepetitions = [...baseline.keys()].sort(
        (left, right) => left - right
      );
      const candidateRepetitions = [...candidate.keys()].sort(
        (left, right) => left - right
      );
      if (
        baselineRepetitions.length !== candidateRepetitions.length ||
        baselineRepetitions.some(
          (repetition, index) => repetition !== candidateRepetitions[index]
        )
      ) {
        fail(
          `${candidateName} and ${baselineName} have mismatched repetitions`
        );
      }
      const baselineMetrics = baselineRepetitions.map((repetition) => {
        const sample = baseline.get(repetition)!;
        if (sample.metadata.queryStreamHash === undefined) {
          fail(
            `${baselineName} repetition ${repetition} is missing queryStreamHash`
          );
        }
        return postgresMetrics(sample.metadata);
      });
      const candidateMetrics = baselineRepetitions.map((repetition) => {
        const sample = candidate.get(repetition)!;
        if (sample.metadata.queryStreamHash === undefined) {
          fail(
            `${candidateName} repetition ${repetition} is missing queryStreamHash`
          );
        }
        const baselineSample = baseline.get(repetition)!;
        if (
          sample.metadata.queryStreamHash !==
          baselineSample.metadata.queryStreamHash
        ) {
          fail(
            `${candidateName} and ${baselineName} have mismatched query hashes`
          );
        }
        return postgresMetrics(sample.metadata);
      });
      pairedPercentChangeVsDefaults[candidateName] = {
        mean_ms: describeChange(
          candidateMetrics.map((value) => value.mean_ms),
          baselineMetrics.map((value) => value.mean_ms)
        ),
        p95_ms: describeChange(
          candidateMetrics.map((value) => value.p95_ms),
          baselineMetrics.map((value) => value.p95_ms)
        ),
        cpu_ms_per_request: describeChange(
          candidateMetrics.map((value) => value.cpu_ms_per_request),
          baselineMetrics.map((value) => value.cpu_ms_per_request)
        ),
        retained_mib: describeChange(
          candidateMetrics.map((value) => value.retained_mib),
          baselineMetrics.map((value) => value.retained_mib)
        ),
      };
    }
  }
  return { sampleSummary, pairedPercentChangeVsDefaults };
};

export const analyzeReports = (
  reports: GrafastCacheReports
): GrafastCacheAnalysis => {
  const samplesByReport = {
    'micro.json': validateReport('micro.json', reports['micro.json']),
    'postgres.json': validateReport('postgres.json', reports['postgres.json']),
    'variants.json': validateReport('variants.json', reports['variants.json']),
  };
  const allPids = Object.values(samplesByReport).flatMap((cases) =>
    [...cases.values()].flatMap((samples) =>
      samples.map((sample) => sample.pid)
    )
  );
  if (allPids.length !== 232 || new Set(allPids).size !== allPids.length) {
    fail('worker PID validation failed: expected 232 distinct worker PIDs');
  }
  return {
    summary: {
      finalFreshProcesses: allPids.length,
      reports: {
        'micro.json': summarizeMicroReport(samplesByReport['micro.json']),
        'postgres.json': summarizeMicroReport(samplesByReport['postgres.json']),
        'variants.json': summarizeMicroReport(samplesByReport['variants.json']),
      },
    },
    postgresSummary: summarizePostgres(samplesByReport['postgres.json']),
  };
};

const readReport = (
  directory: string,
  filename: GrafastCacheReportName
): BenchmarkReport => {
  const compressed = readFileSync(resolve(directory, `${filename}.gz`));
  const text = gunzipSync(compressed).toString('utf8');
  const parsed: unknown = JSON.parse(text);
  if (!isRecord(parsed)) fail(`${filename} did not contain a JSON object`);
  return parsed as unknown as BenchmarkReport;
};

export const analyzeCli = async (
  args: readonly string[] = process.argv.slice(2)
): Promise<void> => {
  const parsed = parseValueArgs(args);
  for (const name of parsed.values.keys()) {
    if (name !== 'results-dir') {
      fail(`unsupported analyzer argument '--${name}'`);
    }
  }
  const directory = resolve(
    parsed.values.get('results-dir') ??
      resolve(__dirname, '../../../', 'benchmarks/grafast-cache/results')
  );
  const reports: GrafastCacheReports = {
    'micro.json': readReport(directory, 'micro.json'),
    'postgres.json': readReport(directory, 'postgres.json'),
    'variants.json': readReport(directory, 'variants.json'),
  };
  const analysis = analyzeReports(reports);
  const summaryPath = await writeJsonAtomically(
    resolve(directory, 'summary.json'),
    analysis.summary
  );
  const postgresSummaryPath = await writeJsonAtomically(
    resolve(directory, 'postgres-summary.json'),
    analysis.postgresSummary
  );
  process.stdout.write(
    `${JSON.stringify({ summary: summaryPath, postgresSummary: postgresSummaryPath })}\n`
  );
};

if (
  typeof require !== 'undefined' &&
  typeof module !== 'undefined' &&
  require.main === module
) {
  void analyzeCli().catch((error: unknown) => {
    process.stderr.write(
      `${error instanceof Error ? error.message : String(error)}\n`
    );
    process.exitCode = 1;
  });
}
