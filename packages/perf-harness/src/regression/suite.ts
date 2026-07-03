/**
 * regression run — the one-command regression suite.
 *
 * Re-runs the load-bearing checks from the 2026-07 validation program against a
 * fresh build and asserts they have not regressed past the chosen baseline's
 * thresholds. The heavy lifting (booting servers, driving load) is delegated to
 * OTHER `perf-harness` subcommands spawned as child processes — this file only
 * orchestrates:
 *
 *   preflight -> (standard) measure instance-heap -> run ramp <generated plan>
 *             -> aggregate step records -> compare to baseline -> verdict
 *
 * Suites:
 *   quick     healthy-single-bp, zero-marginal-tenants, bleed
 *   standard  + instance-heap, thrash-not-crash
 *
 * Exit: 0 pass / 1 fail / 2 bleed (a cross-tenant sentinel violation anywhere).
 *
 * NOTE: this path needs a live PG rig + a built server; it is exercised behind
 * PERF_E2E=1, not by the default `jest` run. The child CLI is invoked as
 * `node <this-cli-entry> ...`, so it assumes the built dist entry (the gate that
 * runs regression uses the compiled package).
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import net from 'node:net';
import path from 'node:path';

import { Argv, asBool, asInt } from '../core/args';
import { assertPortAllowed, findRepoRoot, pgConfigFromArgv, resolveOutDir, resolveServerCmd } from '../core/config';
import { buildSubset, loadFleet, Tenant } from '../core/fleetfile';
import { withFreshClient } from '../core/pgc';
import { readJsonl } from '../core/proc';
import { DEFAULT_BASELINE, getBaseline } from './baselines';
import { compareToBaseline, MeasuredRegression, verdictFromChecks } from './compare';

const USAGE = `perf-harness regression run --fleet <manifest> [--suite quick|standard] \\
  [--baseline ${DEFAULT_BASELINE}] [--port 3345] [--heap-mb 3584] [--out-dir ./perf-out] \\
  [--drifted <drifted.json>] [--same-bp-regex <re>] [--server-cmd "node ..."] [--allow-hub]

Re-run the regression suite against a fresh build and compare to a baseline.
Exit 0 pass / 1 fail / 2 bleed.`;

const err = (msg: string): void => console.error(`[regression] ${msg}`);

// True if something is already accepting connections on the port (either
// loopback family). Used to refuse a run when the target port is occupied.
function isPortBusy(port: number, timeoutMs = 800): Promise<boolean> {
  const probe = (host: string): Promise<boolean> =>
    new Promise((resolve) => {
      const sock = net.connect({ host, port });
      let done = false;
      const finish = (busy: boolean): void => {
        if (done) return;
        done = true;
        sock.destroy();
        resolve(busy);
      };
      sock.setTimeout(timeoutMs);
      sock.once('connect', () => finish(true));
      sock.once('timeout', () => finish(false));
      sock.once('error', () => finish(false));
    });
  return Promise.all([probe('127.0.0.1'), probe('::1')]).then((r) => r[0] || r[1]);
}

interface ChildResult {
  status: number | null;
  signal: string | null;
  stdout: string;
  stderr: string;
}

// Invoke THIS CLI (built dist entry) as a child, tee-ing its output to a log
// file under out-dir. PG credentials go via env (never argv — no `ps` leak).
function spawnCli(cliEntry: string, cliArgs: string[], env: Record<string, string>, logFile: string): ChildResult {
  const res = spawnSync(process.execPath, [cliEntry, ...cliArgs], {
    env: { ...process.env, ...env },
    encoding: 'utf8',
    timeout: 45 * 60 * 1000,
    maxBuffer: 64 * 1024 * 1024
  });
  const body = `$ ${cliArgs.join(' ')}\n${res.stdout || ''}${res.stderr || ''}\n`;
  try {
    fs.appendFileSync(logFile, body);
  } catch {
    /* log best-effort */
  }
  return { status: res.status, signal: res.signal, stdout: res.stdout || '', stderr: res.stderr || '' };
}

function writeFleetFile(dir: string, name: string, subset: any): string {
  const file = path.join(dir, `regression-fleet-${name}.json`);
  fs.writeFileSync(file, JSON.stringify(subset, null, 2) + '\n');
  return file;
}

export async function runRegression(argv: Argv): Promise<number> {
  const fleetFile = typeof argv.fleet === 'string' ? argv.fleet : null;
  if (!fleetFile) {
    console.error(USAGE);
    return 1;
  }
  const suite = argv.suite === 'standard' ? 'standard' : 'quick';
  const baselineName = typeof argv.baseline === 'string' ? argv.baseline : DEFAULT_BASELINE;
  const port = asInt(argv.port, 3345);
  const heapMb = asInt(argv['heap-mb'], 3584);
  const allowHub = asBool(argv['allow-hub']);

  let baseline;
  try {
    baseline = getBaseline(baselineName);
  } catch (e: any) {
    err(e.message);
    return 1;
  }

  // --- preflight ------------------------------------------------------------
  try {
    assertPortAllowed(port, allowHub, 'server-port');
  } catch (e: any) {
    err(e.message);
    return 1;
  }

  const repoRoot = findRepoRoot();
  const outDir = resolveOutDir(argv);
  const pg = pgConfigFromArgv(argv); // also asserts pg-port hub safety
  const serverCmd = resolveServerCmd(argv, repoRoot);
  const cliEntry = process.argv[1];
  const logFile = path.join(outDir, 'regression.log');
  const warnings: string[] = [];

  // server dist must exist (unless a custom --server-cmd points elsewhere).
  const jsEntry = serverCmd.find((a) => a.endsWith('.js'));
  if (jsEntry && !fs.existsSync(jsEntry)) {
    err(`server entry not found: ${jsEntry} (build it, or pass --server-cmd). ` + `default is <repo>/packages/cli/dist/index.js`);
    return 1;
  }

  // port must be free.
  if (await isPortBusy(port)) {
    err(`port ${port} is already in use; pick a free --port or stop the listener`);
    return 1;
  }

  // PG reachable + catalog size.
  let catalogRows: number;
  try {
    catalogRows = await withFreshClient(pg, async (c) => {
      const r = await c.query('SELECT count(*)::int AS n FROM pg_class');
      return r.rows[0].n as number;
    });
  } catch (e: any) {
    err(`PG not reachable at ${pg.host}:${pg.port}/${pg.database}: ${e.message || e}`);
    return 1;
  }
  err(`preflight ok: catalog=${catalogRows} pg_class rows, port ${port} free, baseline ${baselineName}, suite ${suite}`);

  // --- build subsets + ramp plan -------------------------------------------
  let fleet: Tenant[];
  try {
    fleet = loadFleet(fleetFile).tenants;
  } catch (e: any) {
    err(`bad fleet ${fleetFile}: ${e.message || e}`);
    return 1;
  }
  const drifted = typeof argv.drifted === 'string' && fs.existsSync(argv.drifted) ? JSON.parse(fs.readFileSync(argv.drifted, 'utf8')) : {};
  const sameBpRegex = typeof argv['same-bp-regex'] === 'string' ? argv['same-bp-regex'] : undefined;

  // group-0 size (single known-identical blueprint pool).
  let maxAvail = 0;
  try {
    maxAvail = buildSubset(fleet, drifted, { tenants: 1_000_000, sameBpRegex }).tenants.length;
  } catch (e: any) {
    err(`could not derive single-blueprint pool from fleet: ${e.message || e}`);
    return 1;
  }
  if (maxAvail === 0) {
    err('no single-blueprint tenants matched (check --same-bp-regex); cannot run healthy/zero-marginal checks');
    return 1;
  }
  const lowN = Math.min(10, maxAvail);

  const mix = 'read:0.7,write:0.25,meta:0.05';
  const steps: any[] = [];

  // healthy-single-bp doubles as the zero-marginal LOW step.
  const healthySub = buildSubset(fleet, drifted, { tenants: lowN, sameBpRegex });
  warnings.push(...healthySub.warnings);
  const healthyFleet = writeFleetFile(outDir, 'healthy', healthySub.subset);
  steps.push({ name: 'healthy-single-bp', fleet: healthyFleet, shape: 'uniform', rps: 25, durationSec: 120 });

  // zero-marginal HIGH step (only if it adds tenants over the low step).
  let haveZmHigh = false;
  if (maxAvail > lowN) {
    const zmHighSub = buildSubset(fleet, drifted, { tenants: maxAvail, sameBpRegex });
    warnings.push(...zmHighSub.warnings);
    const zmHighFleet = writeFleetFile(outDir, 'zm-high', zmHighSub.subset);
    steps.push({ name: 'zm-high', fleet: zmHighFleet, shape: 'zipf', rps: 25, durationSec: 120 });
    haveZmHigh = true;
  } else {
    warnings.push(`zero-marginal: only ${maxAvail} single-blueprint tenants; high step == low step (delta forced 0)`);
  }

  // thrash-not-crash (standard) needs multiple distinct blueprint shapes.
  let haveThrash = false;
  if (suite === 'standard') {
    try {
      const thrashSub = buildSubset(fleet, drifted, { blueprints: 3, perBlueprint: 2, sameBpRegex });
      warnings.push(...thrashSub.warnings);
      const thrashFleet = writeFleetFile(outDir, 'thrash', thrashSub.subset);
      steps.push({ name: 'thrash-not-crash', fleet: thrashFleet, shape: 'uniform', rps: 25, durationSec: 120 });
      haveThrash = true;
    } catch (e: any) {
      warnings.push(`thrash-not-crash skipped: ${e.message || e} (needs --drifted with >=1 drift group)`);
    }
  }

  const plan = {
    port,
    defaults: { heapMb, rps: 25, durationSec: 120, shape: 'uniform', auth: 1, mix },
    steps
  };
  const planFile = path.join(outDir, 'regression-plan.json');
  fs.writeFileSync(planFile, JSON.stringify(plan, null, 2) + '\n');

  // Common PG env for children (creds via env, not argv).
  const childEnv: Record<string, string> = {
    PGHOST: pg.host,
    PGPORT: String(pg.port),
    PGUSER: pg.user,
    PGPASSWORD: pg.password,
    PGDATABASE: pg.database
  };
  const passthrough: string[] = [];
  if (allowHub) passthrough.push('--allow-hub');
  if (typeof argv['server-cmd'] === 'string') passthrough.push('--server-cmd', argv['server-cmd']);

  const measured: MeasuredRegression = {};

  // --- (standard) measure instance-heap ------------------------------------
  if (suite === 'standard') {
    const hostTenant = fleet.find((t) => t.apiHost);
    const host = hostTenant ? hostTenant.apiHost : null;
    if (!host) {
      warnings.push('instance-heap skipped: no tenant with an apiHost in the fleet');
    } else {
      const ihOut = path.join(outDir, 'regression-instance-heap.jsonl');
      if (fs.existsSync(ihOut)) fs.rmSync(ihOut);
      err(`measuring instance heap on ${host} (heap ${heapMb}MB, port ${port})...`);
      spawnCli(
        cliEntry,
        ['measure', 'instance-heap', '--label', 'regression-api', '--host', host, '--port', String(port), '--heap-mb', String(heapMb), '--out', ihOut, ...passthrough],
        childEnv,
        logFile
      );
      const ihRows = readJsonl(ihOut);
      const ih = ihRows[ihRows.length - 1];
      if (ih && typeof ih.deltaHeapMB === 'number') {
        measured.instanceHeapKBPerRow = Math.round(((ih.deltaHeapMB * 1024) / catalogRows) * 100) / 100;
      } else {
        warnings.push('instance-heap produced no usable delta (see regression.log)');
      }
    }
  }

  // --- run ramp (all workload steps) ---------------------------------------
  const rampOut = path.join(outDir, 'regression-ramp-results.jsonl');
  if (fs.existsSync(rampOut)) fs.rmSync(rampOut);
  err(`running ${steps.length} ramp step(s): ${steps.map((s) => s.name).join(', ')}...`);
  const ramp = spawnCli(cliEntry, ['run', 'ramp', '--plan', planFile, '--out', rampOut, '--out-dir', outDir, ...passthrough], childEnv, logFile);
  if (ramp.status !== 0) {
    warnings.push(`run ramp exited ${ramp.status ?? `signal ${ramp.signal}`} (steps may be partial; see regression.log)`);
  }

  const rampRows = readJsonl(rampOut);
  const byName = new Map<string, any>();
  for (const rec of rampRows) if (rec && rec.name) byName.set(rec.name, rec);

  // healthy-single-bp: errRate + p99.
  const healthyRec = byName.get('healthy-single-bp');
  if (healthyRec) {
    const s = healthyRec.summary || {};
    measured.healthy = {
      errRate: s.errRate,
      p99Ms: s.latency?.p99
    };
  } else {
    warnings.push('healthy-single-bp: no ramp record produced');
  }

  // zero-marginal: heapMax(low) from healthy step, heapMax(high) from zm-high.
  const lowHeap = healthyRec?.metrics?.heapUsedMaxMB;
  const highHeap = haveZmHigh ? byName.get('zm-high')?.metrics?.heapUsedMaxMB : lowHeap;
  if (typeof lowHeap === 'number' && typeof highHeap === 'number') {
    measured.zeroMarginalDeltaMB = Math.round(Math.abs(highHeap - lowHeap) * 10) / 10;
  } else {
    warnings.push('zero-marginal: missing heapUsedMaxMB in one of the steps');
  }

  // thrash-not-crash: server must survive.
  if (haveThrash) {
    const thrashRec = byName.get('thrash-not-crash');
    if (thrashRec) {
      measured.thrashCrashed = thrashRec.serverCrashed === true;
    } else {
      warnings.push('thrash-not-crash: no ramp record produced');
    }
  }

  // bleed: sentinel violations across ALL steps (+ any harness exit 2).
  let bleed = 0;
  for (const rec of rampRows) {
    bleed += rec?.summary?.verdict?.bleedViolations ?? 0;
    if (rec?.harnessExit === 2 && (rec?.summary?.verdict?.bleedViolations ?? 0) === 0) bleed += 1;
  }
  measured.bleedViolations = bleed;

  // --- compare + verdict ----------------------------------------------------
  const checks = compareToBaseline(measured, baseline);
  const verdict = verdictFromChecks(checks);

  const results = {
    generatedAt: new Date().toISOString(),
    baseline: baselineName,
    suite,
    port,
    heapMb,
    catalogPgClassRows: catalogRows,
    fleet: fleetFile,
    measured,
    checks,
    verdict,
    warnings,
    artifacts: { plan: planFile, rampResults: rampOut, log: logFile }
  };
  const resultsFile = path.join(outDir, 'regression-results.json');
  fs.writeFileSync(resultsFile, JSON.stringify(results, null, 2) + '\n');
  err(`wrote ${resultsFile}`);

  // Human verdict table (stdout).
  console.log(`\n== regression ${baselineName} (${suite}) — catalog ${catalogRows} rows`);
  for (const c of checks) {
    const mark = c.pass ? 'PASS' : 'FAIL';
    console.log(`  [${mark}] ${c.name}: value=${c.value} threshold=${c.threshold}  — ${c.note}`);
  }
  for (const w of warnings) console.log(`  (warn) ${w}`);
  console.log(`  verdict: ${verdict.pass ? 'PASS' : verdict.bleed ? 'BLEED' : 'FAIL'} (exit ${verdict.exitCode})`);

  return verdict.exitCode;
}
