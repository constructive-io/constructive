/**
 * churn-driver.mjs — drive schema-cache churn during a soak.
 *
 * Every --interval-notify-sec it issues a NOTIFY on channel "schema:update"
 * (via pg_notify) with a random tenant's databaseId as payload. The server
 * LISTENs on "schema:update" and flushes that database's cached PostGraphile
 * instance(s), forcing rebuilds — exercising eviction/drain/build paths.
 *
 * A provisioning hook fires every --provision-every-sec but only logs a marker;
 * actual tenant provisioning is handled separately by the orchestrator.
 *
 * Timeline events are emitted as JSON lines to stdout.
 *
 * Usage:
 *   node scripts/scale-validate/churn-driver.mjs --fleet fleet.json \
 *     --interval-notify-sec 20 --provision-every-sec 300 --duration-sec 3600
 */
import { asBool, asInt, loadFleet, nowIso, parseArgs, pgConfigFromArgs, resolvePg } from './_lib.mjs';

const HELP = `churn-driver.mjs — NOTIFY schema:update churn + provisioning markers

Options:
  --fleet <file>              fleet manifest (required)
  --interval-notify-sec <n>   NOTIFY period (default 20; 0 disables)
  --provision-every-sec <n>   provisioning-marker period (default 0 = off)
  --duration-sec <n>          run length (default 3600; 0 = until SIGINT)
  --channel <name>            notify channel (default schema:update)
  --seed <n>                  RNG seed
  --pg-* / PG*                connection overrides
  --help
`;

async function main() {
  const { args } = parseArgs(process.argv.slice(2));
  if (asBool(args.help) || !args.fleet) {
    process.stdout.write(HELP);
    if (!args.fleet && !asBool(args.help)) process.exitCode = 1;
    return;
  }
  const intervalNotifySec = asInt(args['interval-notify-sec'], 20);
  const provisionEverySec = asInt(args['provision-every-sec'], 0);
  const durationSec = asInt(args['duration-sec'], 3600);
  const channel = typeof args.channel === 'string' ? args.channel : 'schema:update';
  let seed = asInt(args.seed, (Date.now() & 0x7fffffff));
  const { tenants } = loadFleet(args.fleet);
  const cfg = pgConfigFromArgs(args);
  const { Client } = resolvePg();
  const client = new Client(cfg);
  await client.connect();

  const emit = (obj) => process.stdout.write(`${JSON.stringify({ at: nowIso(), ...obj })}\n`);
  const rand = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
  const pickTenant = () => tenants[Math.floor(rand() * tenants.length)];

  let notifies = 0;
  let provisions = 0;
  let failures = 0;
  const timers = [];

  emit({ t: 'start', channel, intervalNotifySec, provisionEverySec, durationSec, tenants: tenants.length, pid: process.pid });

  if (intervalNotifySec > 0) {
    timers.push(setInterval(async () => {
      const tenant = pickTenant();
      try {
        await client.query('SELECT pg_notify($1, $2)', [channel, tenant.databaseId]);
        notifies++;
        emit({ t: 'notify', channel, databaseId: tenant.databaseId, dbname: tenant.dbname, seq: notifies });
      } catch (err) {
        failures++;
        emit({ t: 'notify-error', databaseId: tenant.databaseId, dbname: tenant.dbname, error: String(err && err.message || err) });
      }
    }, intervalNotifySec * 1000));
  }

  if (provisionEverySec > 0) {
    timers.push(setInterval(() => {
      provisions++;
      // Provisioning hook — the orchestrator performs the real provision; we only
      // mark the timeline so churn events can be correlated.
      emit({ t: 'provision-marker', seq: provisions, note: 'provisioning handled by orchestrator' });
    }, provisionEverySec * 1000));
  }

  const stop = async (reason) => {
    for (const t of timers) clearInterval(t);
    emit({ t: 'stop', reason, notifies, provisions, failures });
    try { await client.end(); } catch { /* ignore */ }
  };

  let stopTimer = null;
  if (durationSec > 0) stopTimer = setTimeout(() => stop('duration'), durationSec * 1000);
  const onSig = async () => { if (stopTimer) clearTimeout(stopTimer); await stop('signal'); process.exit(0); };
  process.on('SIGINT', onSig);
  process.on('SIGTERM', onSig);
}

main().catch((err) => {
  process.stderr.write(`[churn] FATAL: ${err && err.stack ? err.stack : err}\n`);
  process.exitCode = 1;
});
