/**
 * `measure` domain — memory/heap measurement primitives.
 *
 *   measure collector      RSS sampler + server-metrics tailer (collector.mjs)
 *   measure pg             PG-side docker + pg_stat_activity sampler (pg-sampler.mjs)
 *   measure instance-heap  marginal per-class instance heap cost (measure-instance-heap.mjs)
 */
import { Argv } from '../core/args';
import { runCollector } from '../measure/collector';
import { runInstanceHeap } from '../measure/instanceHeap';
import { runPgSampler } from '../measure/pgSampler';

export const domain = 'measure';
export const summary = 'memory/heap measurement: RSS+metrics collector, PG sampler, per-class instance-heap';

export interface Subcommand {
  usage: string;
  run(argv: Argv): Promise<number>;
}

export const subcommands: Record<string, Subcommand> = {
  collector: {
    usage: 'measure collector --pid <n> [--metrics-file <f>] [--interval-sec 15] [--duration-sec 0] [--out collector.json]',
    run: runCollector
  },
  pg: {
    usage: 'measure pg [--out out/pg-soak.jsonl] [--interval-sec 30] [--duration-sec 0] [--container constructive-scale-pg] [--pg-* ...]',
    run: runPgSampler
  },
  'instance-heap': {
    usage: 'measure instance-heap --host <vhost> [--label <name>] [--port 3344] [--heap-mb 2048] [--cache-max 1] [--settle-sec 70] [--out-dir ./perf-out]',
    run: runInstanceHeap
  }
};
