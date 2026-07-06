/**
 * `perf-harness report <sub>` — post-run analysis commands.
 *
 * Registration contract (consumed by src/index.ts): a domain name, a one-line
 * summary, a `Subcommand` shape, and a `subcommands` map.
 */
import { Argv } from '../core/args';
import { runMerge } from '../report/merge';
import { runPredict } from '../report/predict';
import { runSummarize } from '../report/summarize';

export const domain = 'report';
export const summary = 'analyze run artifacts: summarize step results, merge series, predict capacity';

export interface Subcommand {
  usage: string;
  run(argv: Argv): Promise<number>;
}

export const subcommands: Record<string, Subcommand> = {
  summarize: {
    usage: 'report summarize <results.jsonl> [more.jsonl ...]',
    run: runSummarize
  },
  merge: {
    usage:
      'report merge --metrics <m.jsonl> --harness-log <h.jsonl> [--churn-log <c.jsonl>] [--ops-log <o.log>] [--pg <pg.jsonl>] [--out-dir ./perf-out]',
    run: runMerge
  },
  predict: {
    usage: 'report predict --instance-heap-bytes <n> [--heap-mb 1536,2048,3584] [--base-reserve-bytes <n>] [--build-reserve-bytes <n>]',
    run: runPredict
  }
};
