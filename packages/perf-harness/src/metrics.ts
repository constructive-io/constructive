import { performance } from 'node:perf_hooks';

import type {
  CaseValidation,
  JsonValue,
  MemorySnapshot,
  SuccessfulWorkerResult,
} from './types';

export interface MeasuredCaseResult {
  schemaHash: string;
  schemaTypeCount: number;
  runtimeVerified: true;
  caseValidation?: CaseValidation;
  metadata?: Record<string, JsonValue>;
}

const collectGarbage = (): void => {
  if (typeof global.gc !== 'function') {
    throw new Error('benchmark worker requires Node --expose-gc');
  }
  global.gc();
  global.gc();
  global.gc();
};

const memorySnapshot = (): MemorySnapshot => {
  const memory = process.memoryUsage();
  return {
    rss: memory.rss,
    heapTotal: memory.heapTotal,
    heapUsed: memory.heapUsed,
    external: memory.external,
    arrayBuffers: memory.arrayBuffers,
  };
};

const memoryDelta = (
  baseline: MemorySnapshot,
  afterBuild: MemorySnapshot
): MemorySnapshot => ({
  rss: afterBuild.rss - baseline.rss,
  heapTotal: afterBuild.heapTotal - baseline.heapTotal,
  heapUsed: afterBuild.heapUsed - baseline.heapUsed,
  external: afterBuild.external - baseline.external,
  arrayBuffers: afterBuild.arrayBuffers - baseline.arrayBuffers,
});

export const measureBenchmarkCase = async <Built>(
  caseName: string,
  build: () => Promise<Built>,
  validate: (built: Built) => Promise<MeasuredCaseResult>
): Promise<SuccessfulWorkerResult> => {
  collectGarbage();
  const baseline = memorySnapshot();
  const startedAt = performance.now();
  const built = await build();
  const buildMs = performance.now() - startedAt;
  const measured = await validate(built);
  collectGarbage();
  const afterBuild = memorySnapshot();
  return {
    status: 'ok',
    pid: process.pid,
    caseName,
    buildMs,
    schemaHash: measured.schemaHash,
    schemaTypeCount: measured.schemaTypeCount,
    runtimeVerified: measured.runtimeVerified,
    caseValidation: measured.caseValidation ?? { passed: true, errors: [] },
    ...(measured.metadata ? { metadata: measured.metadata } : {}),
    memory: {
      baseline,
      afterBuild,
      delta: memoryDelta(baseline, afterBuild),
      processPeakRss: process.resourceUsage().maxRSS * 1024,
    },
  };
};
