export type JsonPrimitive = string | number | boolean | null;
export type JsonValue =
  JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };

export interface BenchmarkCaseDefinition {
  name: string;
  workerConfig: JsonValue;
  expectedSchemaGroup?: string;
}

export interface BenchmarkSuiteDefinition {
  name: string;
  cases: BenchmarkCaseDefinition[];
}

export interface BenchmarkCoordinate {
  repetition: number;
  position: number;
  caseName: string;
}

export interface WorkerConfigEnvelope {
  caseName: string;
  workerConfig: JsonValue;
}

export interface MemorySnapshot {
  rss: number;
  heapTotal: number;
  heapUsed: number;
  external: number;
  arrayBuffers: number;
}

export interface CaseValidation {
  passed: boolean;
  errors: string[];
}

export interface SuccessfulWorkerResult {
  status: 'ok';
  pid: number;
  caseName: string;
  buildMs: number;
  schemaHash: string;
  schemaTypeCount: number;
  runtimeVerified: true;
  caseValidation: CaseValidation;
  metadata?: Record<string, JsonValue>;
  memory: {
    baseline: MemorySnapshot;
    afterBuild: MemorySnapshot;
    delta: MemorySnapshot;
    processPeakRss: number;
  };
}

export interface FailedWorkerResult {
  status: 'error';
  pid: number;
  caseName: string;
  error: string;
}

export type WorkerResult = SuccessfulWorkerResult | FailedWorkerResult;

export interface BenchmarkRun extends BenchmarkCoordinate {
  result: WorkerResult;
}

export interface MetricSummary {
  median: number;
  min: number;
  max: number;
  samples: number[];
}

export interface CaseSummary {
  sampleCount: number;
  buildMs: MetricSummary;
  heapUsedAfterBuild: MetricSummary;
  heapUsedDelta: MetricSummary;
  rssAfterBuild: MetricSummary;
  rssDelta: MetricSummary;
  processPeakRss: MetricSummary;
}

export interface MetricComparison {
  baseline: number;
  candidate: number;
  difference: number;
  percentChange: number | null;
}

export interface CaseComparison {
  baselineCase: string;
  candidateCase: string;
  buildMs: MetricComparison;
  heapUsedAfterBuild: MetricComparison;
  heapUsedDelta: MetricComparison;
  rssAfterBuild: MetricComparison;
  rssDelta: MetricComparison;
  processPeakRss: MetricComparison;
}

export interface BenchmarkReport {
  format: 'constructive-performance-suite/v1';
  generatedAt: string;
  node: string;
  platform: string;
  architecture: string;
  suite: BenchmarkSuiteDefinition;
  config: {
    repetitions: number;
    seed: number;
    order: string[] | null;
  };
  schedule: BenchmarkCoordinate[];
  runs: BenchmarkRun[];
  validation: {
    allRunsSucceeded: boolean;
    freshProcessPerRun: boolean;
    caseValidationPassed: boolean;
    schemaGroupsEquivalent: boolean;
    schemaGroups: Record<string, string | null>;
    errors: string[];
  };
  summaries: Record<string, CaseSummary>;
}
