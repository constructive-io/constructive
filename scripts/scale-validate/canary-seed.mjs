/**
 * canary-seed.mjs — seed one CANARY-<dbname> row into each tenant's
 * app-public.categories table (superuser pg client). Idempotent.
 *
 * The harness bleed-sentinel reads a tenant's categories and FAILS HARD if it
 * ever sees a CANARY-<other-dbname> row — so these rows must exist for the
 * sentinel to have anything to detect cross-tenant bleed with.
 *
 * NOT NULL columns without a default are discovered via information_schema and
 * filled (name -> the canary name, slug/other text -> a canary slug).
 *
 * Usage:
 *   node scripts/scale-validate/canary-seed.mjs --fleet fleet.json
 *   node scripts/scale-validate/canary-seed.mjs --fleet fleet.json --cleanup
 */
import { asBool, canaryName, canaryToken, loadFleet, parseArgs, pgConfigFromArgs, resolvePg } from './_lib.mjs';

const HELP = `canary-seed.mjs — insert/remove CANARY-<dbname> rows in each tenant's categories

Options:
  --fleet <file>   fleet manifest from fleet.mjs (required)
  --table <name>   target table (default: categories)
  --cleanup        remove the canary rows instead of inserting
  --pg-* / PG*     connection overrides
  --help
`;

const REQUIRED_COLS_SQL = `
SELECT column_name, data_type, udt_name
FROM information_schema.columns
WHERE table_schema = $1 AND table_name = $2
  AND is_nullable = 'NO'
  AND column_default IS NULL
ORDER BY ordinal_position;
`;

const TABLE_EXISTS_SQL = `
SELECT 1 FROM information_schema.tables
WHERE table_schema = $1 AND table_name = $2 AND table_type = 'BASE TABLE';
`;

function valueForColumn(col, nameValue, slugValue) {
  if (col.column_name === 'name') return nameValue;
  if (col.column_name === 'slug') return slugValue;
  const t = (col.data_type || '').toLowerCase();
  const u = (col.udt_name || '').toLowerCase();
  if (t.includes('char') || t === 'text' || u === 'citext') return slugValue;
  if (t.includes('bool')) return true;
  if (t.includes('int') || t === 'numeric' || t.includes('double') || t.includes('real')) return 0;
  // Unknown required column type we cannot safely synthesize.
  return undefined;
}

async function main() {
  const { args } = parseArgs(process.argv.slice(2));
  if (asBool(args.help) || !args.fleet) {
    process.stdout.write(HELP);
    if (!args.fleet && !asBool(args.help)) process.exitCode = 1;
    return;
  }
  const table = typeof args.table === 'string' ? args.table : 'categories';
  const cleanup = asBool(args.cleanup);
  const { tenants } = loadFleet(args.fleet);
  const cfg = pgConfigFromArgs(args);
  const { Client } = resolvePg();
  const client = new Client(cfg);
  await client.connect();

  const report = { table, mode: cleanup ? 'cleanup' : 'seed', results: [] };
  try {
    for (const t of tenants) {
      const schema = t.appPublicSchema;
      const entry = { dbname: t.dbname, schema, status: 'ok' };
      if (!schema) {
        entry.status = 'skipped';
        entry.reason = 'no app-public schema';
        report.results.push(entry);
        continue;
      }
      const exists = await client.query(TABLE_EXISTS_SQL, [schema, table]);
      if (exists.rowCount === 0) {
        entry.status = 'skipped';
        entry.reason = `no ${table} table (blank tenant)`;
        report.results.push(entry);
        continue;
      }

      const name = canaryName(t);
      const slug = `canary-${canaryToken(t)}`.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      const qSchema = `"${schema}"`;
      const qTable = `"${table}"`;

      if (cleanup) {
        const del = await client.query(`DELETE FROM ${qSchema}.${qTable} WHERE name = $1`, [name]);
        entry.removed = del.rowCount;
        report.results.push(entry);
        continue;
      }

      // Idempotent: skip if a canary row already exists.
      const already = await client.query(
        `SELECT count(*)::int AS n FROM ${qSchema}.${qTable} WHERE name = $1`, [name]);
      if (already.rows[0].n > 0) {
        entry.status = 'exists';
        entry.inserted = 0;
        report.results.push(entry);
        continue;
      }

      const cols = await client.query(REQUIRED_COLS_SQL, [schema, table]);
      const colNames = [];
      const values = [];
      const placeholders = [];
      let bad = null;
      let idx = 1;
      const seen = new Set();
      for (const col of cols.rows) {
        const v = valueForColumn(col, name, slug);
        if (v === undefined) { bad = col.column_name; break; }
        colNames.push(`"${col.column_name}"`);
        values.push(v);
        placeholders.push(`$${idx++}`);
        seen.add(col.column_name);
      }
      // Ensure `name` is always written even if it was not flagged required.
      if (!seen.has('name')) {
        colNames.push('"name"');
        values.push(name);
        placeholders.push(`$${idx++}`);
      }
      if (bad) {
        entry.status = 'skipped';
        entry.reason = `unsupported required column: ${bad}`;
        report.results.push(entry);
        continue;
      }
      const ins = await client.query(
        `INSERT INTO ${qSchema}.${qTable} (${colNames.join(', ')}) VALUES (${placeholders.join(', ')})`,
        values);
      entry.inserted = ins.rowCount;
      entry.name = name;
      report.results.push(entry);
    }
  } finally {
    await client.end();
  }

  const seeded = report.results.filter((r) => r.inserted > 0).length;
  const existed = report.results.filter((r) => r.status === 'exists').length;
  const removed = report.results.reduce((a, r) => a + (r.removed || 0), 0);
  const skipped = report.results.filter((r) => r.status === 'skipped').length;
  report.summary = { seeded, existed, removed, skipped, tenants: tenants.length };
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}

main().catch((err) => {
  process.stderr.write(`[canary-seed] ERROR: ${err && err.stack ? err.stack : err}\n`);
  process.exitCode = 1;
});
