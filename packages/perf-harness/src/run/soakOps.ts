/**
 * `run soak-ops` — V3 soak operations churn (port of soak-ops.mjs).
 *
 * Every --interval-sec: provision ONE new tenant (`fleet provision`, own
 * prefix), then drop the tenant created by the PREVIOUS cycle (`fleet
 * teardown`). Net effect: the soak continuously exercises the full provision +
 * teardown paths (catalog writes, schema:update NOTIFY -> flush -> rebuild on
 * next hit) WITHOUT net catalog growth — important because instance heap scales
 * ~21KB/pg_class row, so unbounded provisioning would inflate the resident
 * instance past the heap mid-soak and turn a longevity test into a slow OOM.
 *
 * Both provision and teardown are child invocations of THIS CLI. The created
 * tenant name is recovered from the provision child's stdout.
 *
 * FIX vs the original: a SIGINT/SIGTERM now stops AFTER the in-flight cycle's
 * child processes exit, performs the final drop, and exits cleanly — the
 * original had no signal handler, so a stop mid-soak could leak the last tenant.
 */
import { spawnSync } from 'node:child_process';

import { Argv, asBool, asInt } from '../core/args';
import { pgConfigFromArgv } from '../core/config';

export const SOAK_OPS_USAGE = `perf-harness run soak-ops — cycle tenant provision/teardown during a soak

Options:
  --interval-sec <n>          cycle period (default 7200)
  --duration-sec <n>          total run length (default 86400)
  --prefix <name>             provision prefix (default soak)
  --blueprint <name>          blueprint to provision (default marketplace)
  --pg-* / PG*                Postgres connection overrides (default :5433 constructive)
  --allow-hub                 permit reserved hub ports (danger)
  --help

Provision/teardown run as child invocations of this CLI; credentials flow via
the inherited environment (PERF_PASSWORD), PG connection via injected PG* env.`;

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));
const now = (): string => new Date().toISOString();

// ---------------------------------------------------------------------------
// Pure helpers (exported for tests)
// ---------------------------------------------------------------------------
export interface CycleTiming {
  waitMs: number;
  stop: boolean;
}

// Cycle-pacing math ported verbatim from soak-ops.mjs:
//   wait = max(0, interval - elapsed); stop if now + wait would cross deadline.
export function computeCycleTiming(opts: { intervalSec: number; elapsedMs: number; now: number; deadline: number }): CycleTiming {
  const waitMs = Math.max(0, opts.intervalSec * 1000 - opts.elapsedMs);
  const stop = opts.now + waitMs >= opts.deadline;
  return { waitMs, stop };
}

// tenant-factory / `fleet provision` auto-picks the next free index; recover the
// name it made from its stdout ("[<name>] OK db=" or "indices=<n>..").
export function recoverCreatedName(out: string, prefix: string): string | null {
  const m = /\[(\w+)\] OK db=/.exec(out) || /indices=(\d+)\.\./.exec(out);
  if (!m) return null;
  return m[1].startsWith(prefix) ? m[1] : `${prefix}${m[1]}`;
}

// ---------------------------------------------------------------------------
// Runner
// ---------------------------------------------------------------------------
export async function runSoakOps(argv: Argv): Promise<number> {
  if (asBool(argv.help)) {
    console.log(SOAK_OPS_USAGE);
    return 0;
  }
  const intervalSec = asInt(argv['interval-sec'], 7200);
  const durationSec = asInt(argv['duration-sec'], 86400);
  const prefix = typeof argv.prefix === 'string' ? argv.prefix : 'soak';
  const blueprint = typeof argv.blueprint === 'string' ? argv.blueprint : 'marketplace';

  // Resolve PG once (this also runs the hub-port guardrail) and inject it into
  // the child env so provision/teardown hit the same DB without creds on argv.
  const pg = pgConfigFromArgv(argv);
  const childEnv: Record<string, string> = {
    ...process.env,
    PGHOST: pg.host,
    PGPORT: String(pg.port),
    PGUSER: pg.user,
    PGPASSWORD: pg.password,
    PGDATABASE: pg.database
  };

  const runCli = (args: string[]): { status: number | null; out: string; tail: string } => {
    const res = spawnSync(process.execPath, [process.argv[1], ...args], {
      env: childEnv,
      encoding: 'utf8',
      timeout: 30 * 60 * 1000
    });
    const out = `${res.stdout || ''}${res.stderr || ''}`;
    return { status: res.status, out, tail: out.split('\n').filter(Boolean).slice(-3).join(' | ') };
  };

  const deadline = Date.now() + durationSec * 1000;
  let cycle = 0;
  let previousName: string | null = null;
  let stopping = false;
  let stopReason: string | null = null;
  const onSig = (sig: string): void => {
    stopping = true;
    stopReason = stopReason || sig;
  };
  process.on('SIGINT', () => onSig('SIGINT'));
  process.on('SIGTERM', () => onSig('SIGTERM'));

  console.log(`[soak-ops] ${now()} start: interval=${intervalSec}s duration=${durationSec}s prefix=${prefix}`);

  while (!stopping && Date.now() < deadline) {
    cycle++;
    const t0 = Date.now();

    const create = runCli(['fleet', 'provision', '--count', '1', '--prefix', prefix, '--blueprint', blueprint]);
    const createdName = recoverCreatedName(create.out, prefix);
    console.log(
      `[soak-ops] ${now()} cycle=${cycle} provision status=${create.status} created=${createdName || '?'} :: ${create.tail}`
    );

    if (previousName) {
      const drop = runCli(['fleet', 'teardown', '--only', previousName]);
      console.log(`[soak-ops] ${now()} cycle=${cycle} drop ${previousName} status=${drop.status} :: ${drop.tail}`);
    }
    previousName = createdName || previousName;

    // A signal that landed during the (synchronous) child runs is delivered
    // now — stop before starting the next cycle's provision.
    if (stopping) break;

    const timing = computeCycleTiming({ intervalSec, elapsedMs: Date.now() - t0, now: Date.now(), deadline });
    if (timing.stop) break;
    // Interruptible wait so a signal during the long idle breaks promptly.
    const until = Date.now() + timing.waitMs;
    while (!stopping && Date.now() < until) await sleep(500);
  }

  // Final cleanup: drop the last soak tenant so the fleet is back to baseline.
  // This runs on normal completion AND on signal (the fix).
  if (previousName) {
    const drop = runCli(['fleet', 'teardown', '--only', previousName]);
    console.log(`[soak-ops] ${now()} final cleanup ${previousName} status=${drop.status} :: ${drop.tail}`);
  }
  console.log(`[soak-ops] ${now()} done after ${cycle} cycles${stopReason ? ` (${stopReason})` : ''}`);
  return 0;
}
