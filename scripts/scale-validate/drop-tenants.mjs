#!/usr/bin/env node
// =============================================================================
// drop-tenants.mjs — tear down factory tenants above --keep (catalog-wall
// remediation: the rig's PG cannot introspect a 100+-tenant catalog, so the
// fleet is trimmed to a size the VM can serve).
//
// Per tenant, in one transaction:
//   1. capture its physical schema names from metaschema_public.schema
//   2. DELETE FROM metaschema_public.database (all control-plane FKs CASCADE;
//      metaschema delete triggers may drop physical objects as they go —
//      requires the constructive.allow_super_constructive GUC)
//   3. DROP SCHEMA IF EXISTS ... CASCADE for any physical schema that survived
// Then VACUUM ANALYZE the hot catalogs and report the new catalog size.
//
// Usage:
//   node scripts/scale-validate/drop-tenants.mjs --prefix factory --keep 40 [--dry-run] [--only factory101]
// Env: PGHOST PGPORT PGUSER PGPASSWORD PGDATABASE (defaults :5433 constructive)
// =============================================================================
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WORKTREE = path.resolve(__dirname, '..', '..');
const rootRequire = createRequire(path.join(WORKTREE, 'graphql', 'query', 'package.json'));
const requireDpAdaptor = createRequire(rootRequire.resolve('postgraphile/adaptors/pg'));
const requireDataplan = createRequire(requireDpAdaptor.resolve('@dataplan/pg'));
const { Pool } = requireDataplan('pg');

const arg = (name, dflt) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : dflt;
};
const has = (name) => process.argv.includes(`--${name}`);

const PREFIX = arg('prefix', 'factory');
const KEEP = parseInt(arg('keep', '40'), 10);
const ONLY = arg('only', null);
const DRY = has('dry-run');

const pool = new Pool({
  host: process.env.PGHOST || 'localhost',
  port: parseInt(process.env.PGPORT || '5433', 10),
  user: process.env.PGUSER || 'postgres',
  password: process.env.PGPASSWORD || 'password',
  database: process.env.PGDATABASE || 'constructive',
  max: 2
});
pool.on('error', (e) => console.error(`[pool] idle client error (continuing): ${e.message}`));

const qid = (s) => `"${s.replace(/"/g, '""')}"`;

async function dropOne(row) {
  const client = await pool.connect();
  const t0 = Date.now();
  try {
    await client.query('BEGIN');
    await client.query('SET LOCAL statement_timeout = 0');
    await client.query('SET LOCAL lock_timeout = 0');
    await client.query(`SET LOCAL constructive.allow_super_constructive = 'true'`);

    const schemas = (
      await client.query(`SELECT schema_name FROM metaschema_public.schema WHERE database_id=$1`, [row.id])
    ).rows.map((r) => r.schema_name);

    await client.query(`DELETE FROM metaschema_public.database WHERE id=$1`, [row.id]);

    let survivors = 0;
    for (const s of schemas) {
      const exists = await client.query(`SELECT 1 FROM pg_namespace WHERE nspname=$1`, [s]);
      if (exists.rows.length) {
        survivors++;
        await client.query(`DROP SCHEMA IF EXISTS ${qid(s)} CASCADE`);
      }
    }

    if (DRY) await client.query('ROLLBACK');
    else await client.query('COMMIT');
    console.log(
      `  [${row.name}] dropped (schemas=${schemas.length} survivors-dropped=${survivors}) ${Date.now() - t0}ms${DRY ? ' [DRY]' : ''}`
    );
    return { ok: true };
  } catch (e) {
    try {
      await client.query('ROLLBACK');
    } catch {}
    console.error(`  [${row.name}] FAILED: ${e.code || ''} ${e.message}`);
    return { ok: false, error: e.message };
  } finally {
    client.release();
  }
}

const main = async () => {
  const where = ONLY
    ? { sql: `name = $1`, params: [ONLY] }
    : {
        sql: `name ~ ('^' || $1 || '[0-9]+$') AND (regexp_replace(name, '^' || $1, ''))::int > $2`,
        params: [PREFIX, KEEP]
      };
  const { rows } = await pool.query(
    `SELECT id, name FROM metaschema_public.database WHERE ${where.sql}
     ORDER BY (regexp_replace(name, '[^0-9]', '', 'g'))::int NULLS LAST`,
    where.params
  );
  console.log(`drop-tenants: ${rows.length} tenant(s) to drop${DRY ? ' [DRY-RUN]' : ''}`);

  let ok = 0;
  for (const row of rows) {
    const r = await dropOne(row);
    if (r.ok) ok++;
  }
  console.log(`dropped ${ok}/${rows.length}`);

  if (!DRY && ok > 0) {
    console.log('VACUUM ANALYZE hot catalogs...');
    for (const cat of ['pg_class', 'pg_attribute', 'pg_proc', 'pg_constraint', 'pg_policy', 'pg_namespace', 'pg_depend', 'pg_type']) {
      await pool.query(`VACUUM ANALYZE ${cat}`);
    }
  }

  const stats = await pool.query(`
    SELECT (SELECT count(*) FROM pg_class) AS classes,
           (SELECT count(*) FROM pg_attribute) AS attrs,
           (SELECT count(*) FROM pg_namespace) AS namespaces,
           (SELECT count(*) FROM metaschema_public.database) AS databases`);
  console.log(`catalog now: ${JSON.stringify(stats.rows[0])}`);
  await pool.end();
};

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
