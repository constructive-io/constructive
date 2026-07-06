/**
 * load/churn — drive schema-cache churn during a soak.
 *
 * Every --interval-notify-sec it issues a NOTIFY on channel "schema:update"
 * (via pg_notify) with a random tenant's databaseId as payload. The server
 * LISTENs on "schema:update" and flushes that database's cached PostGraphile
 * instance(s), forcing rebuilds — exercising eviction/drain/build paths.
 *
 * A provisioning hook fires every --provision-every-sec but only logs a marker;
 * actual tenant provisioning is handled separately by the orchestrator.
 *
 * Timeline events are emitted as JSON lines to stdout (start | notify |
 * notify-error | provision-marker | stop).
 *
 * Faithful port of `scripts/scale-validate/churn-driver.mjs`. Deviations (all
 * DESIGN-mandated): a fresh pg Client per NOTIFY comes from `core/pgc`
 * `withFreshClient`; the PG connection runs through the hub guardrail
 * (`pgConfigFromArgv`); and the script becomes a `run(argv): Promise<number>`
 * subcommand — on signal it emits the stop line and returns 0 (natural loop
 * drain) instead of calling `process.exit(0)`.
 */
import { Argv, asBool, asInt } from '../core/args';
import { pgConfigFromArgv } from '../core/config';
import { loadFleet } from '../core/fleetfile';
import { withFreshClient } from '../core/pgc';

const nowIso = (): string => new Date().toISOString();

const HELP = `perf-harness load churn — NOTIFY schema:update churn + provisioning markers

Options:
  --fleet <file>              fleet manifest (required)
  --interval-notify-sec <n>   NOTIFY period (default 20; 0 disables)
  --provision-every-sec <n>   provisioning-marker period (default 0 = off)
  --duration-sec <n>          run length (default 3600; 0 = until SIGINT)
  --channel <name>            notify channel (default schema:update)
  --seed <n>                  RNG seed
  --pg-* / PG*                connection overrides (pg-port default 5433, never 5432)
  --allow-hub                 permit a hub PG port (danger)
  --help
`;

export async function runChurn(argv: Argv): Promise<number> {
  if (asBool(argv.help) || !argv.fleet) {
    process.stderr.write(HELP);
    return (!argv.fleet && !asBool(argv.help)) ? 1 : 0;
  }

  try {
    const intervalNotifySec = asInt(argv['interval-notify-sec'], 20);
    const provisionEverySec = asInt(argv['provision-every-sec'], 0);
    const durationSec = asInt(argv['duration-sec'], 3600);
    const channel = typeof argv.channel === 'string' ? argv.channel : 'schema:update';
    let seed = asInt(argv.seed, (Date.now() & 0x7fffffff));
    const { tenants } = loadFleet(argv.fleet);
    const cfg = pgConfigFromArgv(argv);

    const emit = (obj: any): void => { process.stdout.write(`${JSON.stringify({ at: nowIso(), ...obj })}\n`); };
    // Same LCG the original used for churn selection — deliberately NOT the core
    // mulberry32; kept identical so a seeded churn timeline replays byte-for-byte.
    const rand = (): number => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
    const pickTenant = () => tenants[Math.floor(rand() * tenants.length)];

    let notifies = 0;
    let provisions = 0;
    let failures = 0;
    const timers: any[] = [];

    emit({ t: 'start', channel, intervalNotifySec, provisionEverySec, durationSec, tenants: tenants.length, pid: process.pid });

    if (intervalNotifySec > 0) {
      timers.push(setInterval(async () => {
        const tenant = pickTenant();
        try {
          // Fresh connection per query: with long NOTIFY intervals a persistent
          // client gets reaped by idle_session_timeout (57P05) and its socket
          // error would kill the driver mid-soak. Hourly connects are free. The
          // per-client 'error' listener swallows late socket errors on end().
          await withFreshClient(cfg, (client) => {
            client.on('error', () => {});
            return client.query('SELECT pg_notify($1, $2)', [channel, tenant.databaseId]);
          });
          notifies++;
          emit({ t: 'notify', channel, databaseId: tenant.databaseId, dbname: tenant.dbname, seq: notifies });
        } catch (err: any) {
          failures++;
          emit({ t: 'notify-error', databaseId: tenant.databaseId, dbname: tenant.dbname, error: String((err && err.message) || err) });
        }
      }, intervalNotifySec * 1000));
    }

    if (provisionEverySec > 0) {
      timers.push(setInterval(() => {
        provisions++;
        // Provisioning hook — the orchestrator performs the real provision; we
        // only mark the timeline so churn events can be correlated.
        emit({ t: 'provision-marker', seq: provisions, note: 'provisioning handled by orchestrator' });
      }, provisionEverySec * 1000));
    }

    let resolveDone: (code: number) => void;
    const done = new Promise<number>((res) => { resolveDone = res; });

    let stopped = false;
    const stop = (reason: string): void => {
      if (stopped) return;
      stopped = true;
      for (const t of timers) clearInterval(t);
      emit({ t: 'stop', reason, notifies, provisions, failures });
      // per-query connections — nothing persistent to close
    };

    let stopTimer: any = null;
    if (durationSec > 0) stopTimer = setTimeout(() => { stop('duration'); resolveDone(0); }, durationSec * 1000);
    const onSig = (): void => { if (stopTimer) clearTimeout(stopTimer); stop('signal'); resolveDone(0); };
    process.on('SIGINT', onSig);
    process.on('SIGTERM', onSig);

    const code = await done;
    process.removeListener('SIGINT', onSig);
    process.removeListener('SIGTERM', onSig);
    return code;
  } catch (err: any) {
    process.stderr.write(`[churn] FATAL: ${err && err.stack ? err.stack : err}\n`);
    return 1;
  }
}
