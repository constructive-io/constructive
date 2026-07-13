#!/usr/bin/env node
// =============================================================================
// soak-ops.mjs — V3 soak operations churn: cycle tenant provisioning/teardown.
//
// Every --interval-sec: provision ONE new tenant (tenant-factory, own prefix),
// then drop the tenant created by the PREVIOUS cycle. Net effect: the soak
// continuously exercises the full provision + teardown paths (catalog writes,
// schema:update NOTIFY -> flush -> rebuild on next hit) WITHOUT net catalog
// growth — important because instance heap scales ~21KB/pg_class row, so
// unbounded provisioning would inflate the resident instance past a 2GB heap
// mid-soak and turn a longevity test into a slow OOM test.
//
// Usage:
//   node scripts/scale-validate/soak-ops.mjs --interval-sec 7200 \
//     --duration-sec 86400 [--prefix soak]
// Env: PGHOST PGPORT PGUSER PGPASSWORD PGDATABASE (defaults :5433 constructive)
// =============================================================================
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const arg = (name, dflt) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : dflt;
};
const INTERVAL_SEC = parseInt(arg('interval-sec', '7200'), 10);
const DURATION_SEC = parseInt(arg('duration-sec', '86400'), 10);
const PREFIX = arg('prefix', 'soak');

const run = (script, args) => {
  const res = spawnSync('node', [path.join(__dirname, script), ...args], {
    env: process.env,
    encoding: 'utf8',
    timeout: 30 * 60 * 1000
  });
  const out = `${res.stdout || ''}${res.stderr || ''}`;
  return { status: res.status, out, tail: out.split('\n').filter(Boolean).slice(-3).join(' | ') };
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const now = () => new Date().toISOString();

const main = async () => {
  const deadline = Date.now() + DURATION_SEC * 1000;
  let cycle = 0;
  let previousName = null;

  console.log(`[soak-ops] ${now()} start: interval=${INTERVAL_SEC}s duration=${DURATION_SEC}s prefix=${PREFIX}`);

  while (Date.now() < deadline) {
    cycle++;
    const t0 = Date.now();

    const create = run('tenant-factory.mjs', ['--count', '1', '--prefix', PREFIX, '--blueprint', 'marketplace']);
    // tenant-factory auto-picks the next free index; recover the name it made.
    const m = /\[(\w+)\] OK db=/.exec(create.out) || /indices=(\d+)\.\./.exec(create.out);
    const createdName = m ? (m[1].startsWith(PREFIX) ? m[1] : `${PREFIX}${m[1]}`) : null;
    console.log(
      `[soak-ops] ${now()} cycle=${cycle} provision status=${create.status} created=${createdName || '?'} :: ${create.tail}`
    );

    if (previousName) {
      const drop = run('drop-tenants.mjs', ['--only', previousName]);
      console.log(`[soak-ops] ${now()} cycle=${cycle} drop ${previousName} status=${drop.status} :: ${drop.tail}`);
    }
    previousName = createdName || previousName;

    const elapsed = Date.now() - t0;
    const wait = Math.max(0, INTERVAL_SEC * 1000 - elapsed);
    if (Date.now() + wait >= deadline) break;
    await sleep(wait);
  }

  // Final cleanup: drop the last soak tenant so the fleet is back to baseline.
  if (previousName) {
    const drop = run('drop-tenants.mjs', ['--only', previousName]);
    console.log(`[soak-ops] ${now()} final cleanup ${previousName} status=${drop.status}`);
  }
  console.log(`[soak-ops] ${now()} done after ${cycle} cycles`);
};

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
