/**
 * pgSampler — PG-side time series for perf runs.
 *
 * Port of `scripts/scale-validate/pg-sampler.mjs`. The node side is covered by
 * the server's GRAPHILE_DEBUG_METRICS JSONL; this captures the Postgres half.
 *
 * Every --interval-sec appends one JSONL line to --out with:
 *   - docker container memory (usage/limit bytes) for --container
 *   - pg_stat_activity backend counts by state (+ total)
 *   - pg_class row count (catalog size proxy) and current database size
 *
 * Connection: standard PG* env vars (or --pg-* flags via pgConfigFromArgv, which
 * also runs the hub-port guardrail). A FRESH client per sample (the rig runs
 * idle_session_timeout=120s; a persistent idle client would be reaped mid-run).
 * Sampling errors are recorded on the line ({err}) and never kill the sampler —
 * a PG crash/recovery window is exactly the data we want to keep collecting
 * through.
 *
 * Exit: --duration-sec elapsed, or SIGINT/SIGTERM (JSONL is append-per-line,
 * nothing to flush).
 */
import { execFile } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

import { Argv, asInt, usageExit } from '../core/args';
import { PgConfig, pgConfigFromArgv } from '../core/config';
import { withFreshClient } from '../core/pgc';

const nowIso = (): string => new Date().toISOString();
const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

const USAGE = `measure pg — docker + pg_stat_activity/pg_class/db-size sampler

Options:
  --out <file>         JSONL output (default out/pg-soak.jsonl)
  --interval-sec <n>   sample period (default 30)
  --duration-sec <n>   run length (default 0 = until SIGINT/SIGTERM)
  --container <name>   docker container to stat (default constructive-scale-pg)
  --pg-host/--pg-port/--pg-user/--pg-password/--pg-database   connection overrides
                       (PG* env otherwise; PG port defaults to 5433, never 5432)
  --allow-hub          permit a reserved constructive-hub port (danger)
  --help
`;

// Parse a docker `MemUsage` value like "1.234GiB" into bytes. Exported for unit
// tests. Returns null when the input does not match a known unit.
export function toBytes(s: string): number | null {
  const mm = /([\d.]+)\s*(B|KiB|MiB|GiB)/.exec(s);
  if (!mm) return null;
  const mult: Record<string, number> = { B: 1, KiB: 1024, MiB: 1024 ** 2, GiB: 1024 ** 3 };
  return Math.round(parseFloat(mm[1]) * mult[mm[2]]);
}

function dockerMem(name: string): Promise<any> {
  return new Promise((resolve) => {
    execFile(
      'docker',
      ['stats', '--no-stream', '--format', '{{.MemUsage}}', name],
      { timeout: 10000 },
      (err, stdout) => {
        if (err) return resolve({ err: String(err.message || err).slice(0, 200) });
        // e.g. "1.234GiB / 4GiB"
        const m = String(stdout).trim();
        const [used, limit] = m.split('/').map((s) => toBytes(s));
        resolve({ raw: m, usedBytes: used, limitBytes: limit });
      }
    );
  });
}

async function pgSample(pg: PgConfig): Promise<any> {
  return withFreshClient(pg, async (client) => {
    // sequential on purpose: pg queues concurrent query() on one client (deprecated)
    const act = await client.query("SELECT COALESCE(state, 'null') AS state, count(*)::int AS n FROM pg_stat_activity GROUP BY 1");
    const cls = await client.query('SELECT count(*)::int AS n FROM pg_class');
    const size = await client.query('SELECT pg_database_size(current_database())::bigint AS b, (SELECT sum(numbackends)::int FROM pg_stat_database) AS backends');
    const byState: Record<string, number> = {};
    let total = 0;
    for (const r of act.rows) {
      byState[r.state] = r.n;
      total += r.n;
    }
    return {
      backendsByState: byState,
      backendsTotal: total,
      backendsAllDbs: size.rows[0].backends,
      pgClassRows: cls.rows[0].n,
      dbSizeBytes: Number(size.rows[0].b)
    };
  });
}

export async function runPgSampler(argv: Argv): Promise<number> {
  if (argv.help) return usageExit(USAGE, 0);

  const outFile = typeof argv.out === 'string' ? argv.out : 'out/pg-soak.jsonl';
  const intervalSec = asInt(argv['interval-sec'], 30);
  const durationSec = asInt(argv['duration-sec'], 0);
  const container = typeof argv.container === 'string' ? argv.container : 'constructive-scale-pg';

  let pg: PgConfig;
  try {
    pg = pgConfigFromArgv(argv);
  } catch (e: any) {
    console.error(`[pg-sampler] ${e && e.message ? e.message : e}`);
    return 1;
  }

  fs.mkdirSync(path.dirname(outFile), { recursive: true });

  let stopping = false;
  const onSig = (): void => {
    stopping = true;
  };
  process.on('SIGINT', onSig);
  process.on('SIGTERM', onSig);

  const startMs = Date.now();
  console.error(
    `[pg-sampler] out=${outFile} interval=${intervalSec}s duration=${durationSec || 'until-signal'}s ` +
      `container=${container} pg=${pg.host}:${pg.port}/${pg.database}`
  );

  for (;;) {
    if (stopping) break;
    if (durationSec && (Date.now() - startMs) / 1000 >= durationSec) break;
    const line: any = { t: nowIso() };
    try {
      line.docker = await dockerMem(container);
    } catch (e: any) {
      line.docker = { err: String(e.message || e).slice(0, 200) };
    }
    try {
      Object.assign(line, await pgSample(pg));
    } catch (e: any) {
      line.err = String(e.message || e).slice(0, 200);
    }
    fs.appendFileSync(outFile, `${JSON.stringify(line)}\n`);
    // sleep in small slices so signals stay responsive
    const until = Date.now() + intervalSec * 1000;
    while (Date.now() < until && !stopping) await sleep(500);
  }
  console.error('[pg-sampler] done');
  return 0;
}
