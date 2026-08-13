export const ARM_NAMES = [
  'stock',
  'scoped',
  'retire',
  'scoped-retire',
] as const;

export type ArmName = (typeof ARM_NAMES)[number];

export interface ArmDefinition {
  name: ArmName;
  scopedIntrospection: boolean;
  retireBuildState: boolean;
  introspectionMode: 'stock' | 'scoped-required';
  scopedCatalogTypes: 'dependency-closure' | null;
  introspectionClientReleaseMode: 'reuse' | 'destroy';
}

export const ARM_DEFINITIONS: Record<ArmName, ArmDefinition> = {
  stock: {
    name: 'stock',
    scopedIntrospection: false,
    retireBuildState: false,
    introspectionMode: 'stock',
    scopedCatalogTypes: null,
    introspectionClientReleaseMode: 'reuse',
  },
  scoped: {
    name: 'scoped',
    scopedIntrospection: true,
    retireBuildState: false,
    introspectionMode: 'scoped-required',
    scopedCatalogTypes: 'dependency-closure',
    introspectionClientReleaseMode: 'destroy',
  },
  retire: {
    name: 'retire',
    scopedIntrospection: false,
    retireBuildState: true,
    introspectionMode: 'stock',
    scopedCatalogTypes: null,
    introspectionClientReleaseMode: 'reuse',
  },
  'scoped-retire': {
    name: 'scoped-retire',
    scopedIntrospection: true,
    retireBuildState: true,
    introspectionMode: 'scoped-required',
    scopedCatalogTypes: 'dependency-closure',
    introspectionClientReleaseMode: 'destroy',
  },
};

export interface MatrixCoordinate {
  repetition: number;
  position: number;
  arm: ArmName;
}

export interface WorkerConfig {
  arm: ArmName;
  schemas: string[];
  allowedDependencySchemas: string[];
}

export interface MemorySnapshot {
  rss: number;
  heapTotal: number;
  heapUsed: number;
  external: number;
  arrayBuffers: number;
}

export interface SuccessfulWorkerResult {
  status: 'ok';
  pid: number;
  arm: ArmName;
  definition: ArmDefinition;
  buildMs: number;
  schemaHash: string;
  schemaTypeCount: number;
  queryVerified: true;
  buildStateReleased: boolean;
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
  arm: ArmName;
  error: string;
}

export type WorkerResult = SuccessfulWorkerResult | FailedWorkerResult;

export interface MatrixRun extends MatrixCoordinate {
  result: WorkerResult;
}

export interface MetricSummary {
  median: number;
  min: number;
  max: number;
  samples: number[];
}

export interface ArmSummary {
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

export interface ArmComparison {
  baselineArm: ArmName;
  candidateArm: ArmName;
  buildMs: MetricComparison;
  heapUsedAfterBuild: MetricComparison;
  heapUsedDelta: MetricComparison;
  rssAfterBuild: MetricComparison;
  rssDelta: MetricComparison;
  processPeakRss: MetricComparison;
}

export interface MatrixReport {
  format: 'constructive-scoped-retirement-matrix/v1';
  generatedAt: string;
  node: string;
  platform: string;
  architecture: string;
  config: {
    schemas: string[];
    allowedDependencySchemas: string[];
    repetitions: number;
    seed: number;
    order: ArmName[] | null;
  };
  arms: ArmDefinition[];
  schedule: MatrixCoordinate[];
  runs: MatrixRun[];
  validation: {
    allRunsSucceeded: boolean;
    freshProcessPerRun: boolean;
    schemaEquivalent: boolean;
    schemaHash: string | null;
    errors: string[];
  };
  summaries: Partial<Record<ArmName, ArmSummary>>;
  comparisons: {
    scopedVsStock?: ArmComparison;
    retireVsStock?: ArmComparison;
    combinedVsStock?: ArmComparison;
    retireWithinScoped?: ArmComparison;
    scopedWithinRetire?: ArmComparison;
  };
}
