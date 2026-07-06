/**
 * `load` domain — workload drivers.
 *
 *   perf-harness load harness  paced GraphQL load + bleed sentinel (harness.mjs)
 *   perf-harness load churn    schema-cache NOTIFY churn        (churn-driver.mjs)
 *
 * Each subcommand handles its own `--help` and returns a numeric exit code
 * (harness: 0 ok / 1 fatal / 2 bleed-sentinel violation; churn: 0 / 1).
 */
import { Argv } from '../core/args';
import { runChurn } from '../load/churn';
import { runHarness } from '../load/harness';

export const domain = 'load';
export const summary = 'workload drivers — paced GraphQL load (bleed sentinel) and schema-cache churn';

export interface Subcommand {
  usage: string;
  run(argv: Argv): Promise<number>;
}

export const subcommands: Record<string, Subcommand> = {
  harness: {
    usage: 'load harness --fleet <file> [--port 3333 --duration-sec 60 --rps 20 --mix read:.7,write:.25,meta:.05 --shape zipf|uniform|burst --auth 0|1 --out results.json]',
    run: runHarness
  },
  churn: {
    usage: 'load churn --fleet <file> [--interval-notify-sec 20 --provision-every-sec 0 --duration-sec 3600 --channel schema:update --pg-* ...]',
    run: runChurn
  }
};
