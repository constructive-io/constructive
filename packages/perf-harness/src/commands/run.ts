/**
 * `run` domain — server lifecycle + ramp / soak orchestration.
 *
 * Subcommands:
 *   run ramp                     V2 limits-discovery executor (fresh server per step)
 *   run soak <start|status|stop> long-running soak orchestrator
 *   run soak-ops                 provision/drop cycles during a soak
 *
 * `run soak` routes on the next positional (argv._[2]) inside runSoak.
 */
import { Argv } from '../core/args';
import { RAMP_USAGE, runRamp } from '../run/ramp';
import { runSoak, SOAK_USAGE } from '../run/soak';
import { runSoakOps, SOAK_OPS_USAGE } from '../run/soakOps';

export const domain = 'run';
export const summary = 'server lifecycle + ramp / soak orchestration';

export interface Subcommand {
  usage: string;
  run(argv: Argv): Promise<number>;
}

export const subcommands: Record<string, Subcommand> = {
  ramp: { usage: RAMP_USAGE, run: (argv: Argv) => runRamp(argv) },
  soak: { usage: SOAK_USAGE, run: (argv: Argv) => runSoak(argv) },
  'soak-ops': { usage: SOAK_OPS_USAGE, run: (argv: Argv) => runSoakOps(argv) }
};
