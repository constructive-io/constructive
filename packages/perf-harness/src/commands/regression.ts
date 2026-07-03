/**
 * `perf-harness regression <sub>` — the one-command regression suite + catalog.
 *
 * Registration contract (consumed by src/index.ts): a domain name, a one-line
 * summary, a `Subcommand` shape, and a `subcommands` map.
 */
import { Argv } from '../core/args';
import { DEFAULT_BASELINE, listBaselines } from '../regression/baselines';
import { runRegression } from '../regression/suite';

export const domain = 'regression';
export const summary = 'run the regression suite against a baseline, or list known baselines';

export interface Subcommand {
  usage: string;
  run(argv: Argv): Promise<number>;
}

async function runBaselines(_argv: Argv): Promise<number> {
  const rows = listBaselines();
  console.log(`known baselines (default: ${DEFAULT_BASELINE}):`);
  for (const b of rows) {
    console.log(
      `  ${b.name}  (captured ${b.capturedAt})  catalog=${b.catalogPgClassRows} rows  ` +
        `I=${b.instanceHeapKBPerRow}KB/row  minViable=${b.minViableHeapMB}MB  ` +
        `thresholds: errRate<=${b.thresholds.maxHealthyErrRate} p99<=${b.thresholds.maxHealthyP99Ms}ms ` +
        `zmDelta<=${b.thresholds.maxZeroMarginalDeltaMB}MB heapKB/row<=${b.thresholds.maxInstanceHeapKBPerRow} ` +
        `slope<=${b.thresholds.maxHeapSlopeMBPerHour}MB/h`
    );
  }
  return 0;
}

export const subcommands: Record<string, Subcommand> = {
  run: {
    usage:
      'regression run --fleet <manifest> [--suite quick|standard|deep] [--baseline <name>] [--port 3345] [--heap-mb 3584] [--deep-heap-mb 7168] [--out-dir ./perf-out] [--drifted <f>] [--same-bp-regex <re>] [--only <scenario,...>] [--skip <scenario,...>] [--server-cmd "..."] [--allow-hub]',
    run: runRegression
  },
  baselines: {
    usage: 'regression baselines',
    run: runBaselines
  }
};
