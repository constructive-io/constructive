/**
 * report predict — capacity / sizing table.
 *
 * Given a per-instance retained-heap estimate (bytes) and a list of heap sizes
 * (`--max-old-space-size` MB values), print how many PostGraphile instances a
 * node of each size can safely keep resident (capacity R), using the SAME
 * two-constraint budget math the server ships with — `computeCapacityFromBudget`
 * from `graphile-cache`.
 *
 * `graphile-cache` is a workspace dependency, but importing it at module top
 * level drags the whole PostGraphile build chain into every `perf-harness`
 * start. It is therefore `require`d LAZILY inside `runPredict`, typed against a
 * minimal local declaration rather than the real module.
 */
import { Argv, asInt } from '../core/args';

// Server defaults (graphile-cache DEFAULT_BASE_RESERVE_BYTES / _BUILD_RESERVE_BYTES).
const DEFAULT_BASE_RESERVE_BYTES = 256 * 1024 * 1024;
const DEFAULT_BUILD_RESERVE_BYTES = 768 * 1024 * 1024;
const MB = 1024 * 1024;

const USAGE = `perf-harness report predict --instance-heap-bytes <n> [--heap-mb 1536,2048,3584] \\
  [--base-reserve-bytes <n>] [--build-reserve-bytes <n>]

Print a heapMB -> capacity(R) sizing table using the server's two-constraint
budget model (graphile-cache computeCapacityFromBudget).`;

// Minimal local shape of the lazily-required dependency (see file header).
interface GraphileCacheModule {
  computeCapacityFromBudget(
    heapLimit: number,
    perInstance: number,
    baseReserve?: number,
    buildReserve?: number
  ): number;
}

export interface SizingRow {
  heapMB: number;
  heapBytes: number;
  capacity: number;
}

// Pure table builder — `compute` is injected so this is testable without the
// heavy workspace dependency.
export function buildSizingTable(
  heapMbList: number[],
  instanceHeapBytes: number,
  baseReserve: number,
  buildReserve: number,
  compute: GraphileCacheModule['computeCapacityFromBudget']
): SizingRow[] {
  return heapMbList.map((heapMB) => {
    const heapBytes = heapMB * MB;
    return { heapMB, heapBytes, capacity: compute(heapBytes, instanceHeapBytes, baseReserve, buildReserve) };
  });
}

export async function runPredict(argv: Argv): Promise<number> {
  const instanceHeapBytes = asInt(argv['instance-heap-bytes'], undefined);
  if (!instanceHeapBytes || instanceHeapBytes <= 0) {
    console.error('report predict: --instance-heap-bytes <n> is required (measured per-instance retained heap)');
    console.error(USAGE);
    return 1;
  }
  const heapMbRaw = typeof argv['heap-mb'] === 'string' ? argv['heap-mb'] : String(argv['heap-mb'] ?? '');
  const heapMbList = heapMbRaw
    .split(',')
    .map((s) => Number.parseInt(s.trim(), 10))
    .filter((n) => Number.isFinite(n) && n > 0);
  if (heapMbList.length === 0) {
    heapMbList.push(1536, 2048, 2560, 3072, 3584, 4096);
  }
  const baseReserve = asInt(argv['base-reserve-bytes'], DEFAULT_BASE_RESERVE_BYTES);
  const buildReserve = asInt(argv['build-reserve-bytes'], DEFAULT_BUILD_RESERVE_BYTES);

  // Lazy — top-level import is FORBIDDEN (drags PostGraphile into CLI start).
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const gc = require('graphile-cache') as GraphileCacheModule;

  const rows = buildSizingTable(heapMbList, instanceHeapBytes, baseReserve, buildReserve, gc.computeCapacityFromBudget);

  console.log(
    `# capacity sizing  (I=${(instanceHeapBytes / MB).toFixed(0)}MB/instance, ` +
      `base=${(baseReserve / MB).toFixed(0)}MB, build=${(buildReserve / MB).toFixed(0)}MB)`
  );
  console.log('| heapMB | capacity R |');
  console.log('| --- | --- |');
  for (const row of rows) {
    console.log(`| ${row.heapMB} | ${row.capacity} |`);
  }
  console.log(
    '\nNote: heapMB is the --max-old-space-size value. V8 reports a heap_size_limit ' +
      'slightly ABOVE it (~3-5%, e.g. 3584 -> ~3777MB), so the server may compute a ' +
      'marginally more generous capacity at exact boundaries; this table is the ' +
      'conservative floor.'
  );
  return 0;
}
