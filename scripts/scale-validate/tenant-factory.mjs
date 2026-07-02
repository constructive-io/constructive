#!/usr/bin/env node
// =============================================================================
// tenant-factory.mjs — the 200-tenant fast path (TASK D spike)
//
// Creates blueprint-identical marketplace tenants directly via SQL, reusing the
// SAME control-plane procedures the GraphQL seeder ultimately invokes, but
// WITHOUT the GraphQL/undici layer (and its 300s HTTP cap). Per tenant it runs,
// in one committed transaction:
//
//   1. metaschema_generators.provision_database(...)   — db + domains + apis +
//        site + ~40 modules + the app_public/app_private application schemas.
//   2. metaschema_private.bootstrap_owner_into_database(...) — copies the owner
//        user + primary email + password_hash from the control-plane ("source")
//        database into the new tenant so password sign-in works (this is what the
//        seeder's async provision trigger does when bootstrap_user = true).
//   3. INSERT metaschema_modules_public.blueprint (copy of the reference
//        marketplace definition) + metaschema_modules_public.construct_blueprint(
//        blueprint_id, app_public_schema_id) — builds the 5 marketplace tables
//        (categories, products, orders, order_items, reviews) into app_public.
//
// Session GUC: the module install triggers (events/function/config/agent/...) call
// metaschema_private.ensure_super_constructive(), which RAISES unless
// `constructive.allow_super_constructive = 'true'`. We set it per-transaction.
//
// Usage:
//   node scripts/scale-validate/tenant-factory.mjs --count 5 --prefix factory \
//        --blueprint marketplace [--concurrency 1] [--dry-run]
//   node scripts/scale-validate/tenant-factory.mjs --validate factory1   # shape check vs reference
//
// Env: PGHOST PGPORT PGUSER PGPASSWORD PGDATABASE (defaults target :5433 constructive)
// =============================================================================

import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import path from 'path';
import crypto from 'crypto';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WORKTREE = path.resolve(__dirname, '..', '..');

// `pg` is not a root dep; resolve it via the @dataplan/pg chain (same trick the
// other scale-spike scripts use).
const rootRequire = createRequire(path.join(WORKTREE, 'graphql', 'query', 'package.json'));
const requireDpAdaptor = createRequire(rootRequire.resolve('postgraphile/adaptors/pg'));
const requireDataplan = createRequire(requireDpAdaptor.resolve('@dataplan/pg'));
const { Pool } = requireDataplan('pg');

// ---------------------------------------------------------------------------
// args
// ---------------------------------------------------------------------------
function parseArgs(argv) {
  const out = {
    count: 1,
    prefix: 'factory',
    blueprint: 'marketplace',
    reference: 'marketplace_db_tenant1',
    sourceDb: 'constructive',
    domain: 'localhost',
    concurrency: 1,
    maxRetries: 3,
    dryRun: false,
    validate: null,
    startIndex: null
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const next = () => argv[++i];
    if (a === '--count') out.count = parseInt(next(), 10);
    else if (a === '--prefix') out.prefix = next();
    else if (a === '--blueprint') out.blueprint = next();
    else if (a === '--reference') out.reference = next();
    else if (a === '--source-db') out.sourceDb = next();
    else if (a === '--domain') out.domain = next();
    else if (a === '--concurrency') out.concurrency = parseInt(next(), 10);
    else if (a === '--max-retries') out.maxRetries = parseInt(next(), 10);
    else if (a === '--start-index') out.startIndex = parseInt(next(), 10);
    else if (a === '--dry-run') out.dryRun = true;
    else if (a === '--validate') out.validate = next();
    else throw new Error(`unknown arg: ${a}`);
  }
  return out;
}

const PG = {
  host: process.env.PGHOST || 'localhost',
  port: parseInt(process.env.PGPORT || '5433', 10),
  user: process.env.PGUSER || 'postgres',
  password: process.env.PGPASSWORD || 'password',
  database: process.env.PGDATABASE || 'constructive'
};

const ms = (t) => `${(Number(t) / 1e6).toFixed(0)}ms`;
const now = () => process.hrtime.bigint();

// ---------------------------------------------------------------------------
// reference loading
// ---------------------------------------------------------------------------
async function loadReference(pool, opts) {
  const ref = await pool.query(
    `SELECT d.id AS db_id, d.owner_id
       FROM metaschema_public.database d
      WHERE d.name = $1`,
    [opts.reference]
  );
  if (ref.rows.length === 0) throw new Error(`reference database "${opts.reference}" not found`);
  const { db_id: refDbId, owner_id: ownerId } = ref.rows[0];

  const prov = await pool.query(
    `SELECT modules, options, domain
       FROM metaschema_modules_public.database_provision_module
      WHERE database_id = $1
      ORDER BY created_at
      LIMIT 1`,
    [refDbId]
  );
  if (prov.rows.length === 0)
    throw new Error(`no database_provision_module row for reference "${opts.reference}"`);
  const modules = prov.rows[0].modules;
  const options = prov.rows[0].options;

  const bp = await pool.query(
    `SELECT name, display_name, definition
       FROM metaschema_modules_public.blueprint
      WHERE database_id = $1 AND name = $2`,
    [refDbId, opts.blueprint]
  );
  if (bp.rows.length === 0)
    throw new Error(`reference blueprint "${opts.blueprint}" not found on "${opts.reference}"`);
  const blueprint = bp.rows[0];

  const src = await pool.query(
    `SELECT id FROM metaschema_public.database WHERE name = $1`,
    [opts.sourceDb]
  );
  if (src.rows.length === 0) throw new Error(`source database "${opts.sourceDb}" not found`);
  const sourceDbId = src.rows[0].id;

  return { refDbId, ownerId, modules, options, blueprint, sourceDbId };
}

async function nextStartIndex(pool, prefix) {
  const r = await pool.query(
    `SELECT COALESCE(MAX((regexp_replace(name, '^' || $1, ''))::int), 0) AS mx
       FROM metaschema_public.database
      WHERE name ~ ('^' || $1 || '[0-9]+$')`,
    [prefix]
  );
  return (r.rows[0].mx || 0) + 1;
}

// ---------------------------------------------------------------------------
// per-tenant provisioning (one committed transaction)
// ---------------------------------------------------------------------------
async function createTenant(pool, ref, opts, index) {
  const name = `${opts.prefix}${index}`;
  const subdomain = `${name}-${crypto.randomBytes(4).toString('hex')}`;

  let attempt = 0;
  for (;;) {
    attempt++;
    const client = await pool.connect();
    const t = {};
    try {
      await client.query('BEGIN');
      await client.query('SET LOCAL statement_timeout = 0');
      await client.query('SET LOCAL idle_in_transaction_session_timeout = 0');
      await client.query('SET LOCAL lock_timeout = 0');
      await client.query(`SET LOCAL constructive.allow_super_constructive = 'true'`);

      // Phase 1: provision_database
      let s = now();
      const provRes = await client.query(
        `SELECT metaschema_generators.provision_database($1,$2,$3,$4,$5::jsonb,$6::jsonb) AS db_id`,
        [name, ref.ownerId, subdomain, opts.domain, JSON.stringify(ref.modules), JSON.stringify(ref.options)]
      );
      const dbId = provRes.rows[0].db_id;
      t.provision = now() - s;

      // Phase 2: bootstrap owner (password sign-in path)
      s = now();
      await client.query(
        `SELECT metaschema_private.bootstrap_owner_into_database($1,$2,$3,false)`,
        [dbId, ref.sourceDbId, ref.ownerId]
      );
      t.bootstrap = now() - s;

      // Phase 3: blueprint copy + construct
      s = now();
      const bpRes = await client.query(
        `INSERT INTO metaschema_modules_public.blueprint
           (owner_id, database_id, name, display_name, definition)
         VALUES ($1,$2,$3,$4,$5::jsonb)
         RETURNING id`,
        [ref.ownerId, dbId, ref.blueprint.name, ref.blueprint.display_name, JSON.stringify(ref.blueprint.definition)]
      );
      const blueprintId = bpRes.rows[0].id;
      const schemaRes = await client.query(
        `SELECT id, schema_name FROM metaschema_public.schema
          WHERE database_id = $1 AND name = 'app_public'`,
        [dbId]
      );
      if (schemaRes.rows.length === 0) throw new Error('app_public schema not found after provision');
      const appPublicSchemaId = schemaRes.rows[0].id;
      const appPublicPhysical = schemaRes.rows[0].schema_name;
      await client.query(`SELECT metaschema_modules_public.construct_blueprint($1,$2)`, [
        blueprintId,
        appPublicSchemaId
      ]);
      t.blueprint = now() - s;

      // Phase 4: in-txn verification
      const verify = {};
      verify.schemaCount = (
        await client.query(
          `SELECT count(*)::int AS c FROM metaschema_public.schema WHERE database_id=$1`,
          [dbId]
        )
      ).rows[0].c;
      verify.appTables = (
        await client.query(
          `SELECT array_agg(c.relname::text ORDER BY c.relname) AS tables
             FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
            WHERE n.nspname=$1 AND c.relkind='r'`,
          [appPublicPhysical]
        )
      ).rows[0].tables;
      verify.domains = (
        await client.query(
          `SELECT array_agg(d.subdomain || '.' || d.domain ORDER BY d.subdomain) AS hosts
             FROM services_public.domains d WHERE d.database_id=$1
              AND (d.subdomain LIKE 'api-%' OR d.subdomain LIKE 'auth-%')`,
          [dbId]
        )
      ).rows[0].hosts;

      if (opts.dryRun) await client.query('ROLLBACK');
      else await client.query('COMMIT');

      return {
        ok: true,
        name,
        subdomain,
        dbId,
        appPublicPhysical,
        apiHost: `api-${subdomain}.${opts.domain}`,
        authHost: `auth-${subdomain}.${opts.domain}`,
        timings: t,
        verify,
        attempt,
        rolledBack: opts.dryRun
      };
    } catch (err) {
      try {
        await client.query('ROLLBACK');
      } catch {}
      const retriable = err && (err.code === '40P01' || err.code === '40001');
      if (retriable && attempt <= opts.maxRetries) {
        const backoff = 100 * attempt + Math.floor(Math.random() * 100);
        console.error(`  [${name}] ${err.code} (attempt ${attempt}) — retrying in ${backoff}ms`);
        await new Promise((r) => setTimeout(r, backoff));
        continue;
      }
      return { ok: false, name, subdomain, error: err.message, code: err.code, attempt };
    } finally {
      client.release();
    }
  }
}

// ---------------------------------------------------------------------------
// shape validation (step 3.i): compare the logical [schema,relname] set of a
// tenant's `api` API to the reference tenant's — same set => same fingerprint =>
// same bp: key. Mirrors graphql/server/src/middleware/blueprint.ts:
// stripSchemaHashPrefix + fingerprintFromRelations.
// ---------------------------------------------------------------------------
const SHAPE_SQL = `
  WITH api_schema AS (
    SELECT s.schema_name
      FROM metaschema_public.database d
      JOIN services_public.apis a ON a.database_id = d.id AND a.name = 'api'
      JOIN services_public.api_schemas x ON x.api_id = a.id
      JOIN metaschema_public.schema s ON s.id = x.schema_id
     WHERE d.name = $1
  )
  SELECT regexp_replace(n.nspname, '^.*?-[0-9a-f]{8}-', '') AS logical_schema, c.relname
    FROM api_schema aps
    JOIN pg_namespace n ON n.nspname = aps.schema_name
    JOIN pg_class c ON c.relnamespace = n.oid AND c.relkind IN ('r','v','m','p')
   ORDER BY 1, 2`;

function sha256(str) {
  return crypto.createHash('sha256').update(str).digest('hex');
}

async function shapeOf(pool, dbName) {
  const r = await pool.query(SHAPE_SQL, [dbName]);
  const pairs = r.rows.map((row) => [row.logical_schema, row.relname]);
  // fingerprintFromRelations sorts then sha256(JSON.stringify(pairs))
  pairs.sort((a, b) => (a[0] !== b[0] ? (a[0] < b[0] ? -1 : 1) : a[1] < b[1] ? -1 : a[1] > b[1] ? 1 : 0));
  return { pairs, fingerprint: sha256(JSON.stringify(pairs)) };
}

async function validateShape(pool, opts) {
  const ref = await shapeOf(pool, opts.reference);
  const cand = await shapeOf(pool, opts.validate);
  const same = ref.fingerprint === cand.fingerprint;
  console.log(`\n=== SHAPE CHECK: "${opts.validate}" vs reference "${opts.reference}" ===`);
  console.log(`reference api relations (${ref.pairs.length}):`);
  for (const [s, r] of ref.pairs) console.log(`    ${s}.${r}`);
  console.log(`candidate api relations (${cand.pairs.length}):`);
  for (const [s, r] of cand.pairs) console.log(`    ${s}.${r}`);
  console.log(`reference shapeFingerprint: ${ref.fingerprint}`);
  console.log(`candidate shapeFingerprint: ${cand.fingerprint}`);
  console.log(`IDENTICAL SHAPE => same bp: key expected: ${same ? 'YES' : 'NO'}`);
  return same;
}

// ---------------------------------------------------------------------------
// main
// ---------------------------------------------------------------------------
async function main() {
  const opts = parseArgs(process.argv.slice(2));
  const pool = new Pool({ ...PG, max: Math.max(2, opts.concurrency + 1) });

  try {
    if (opts.validate) {
      const ok = await validateShape(pool, opts);
      process.exitCode = ok ? 0 : 1;
      return;
    }

    const ref = await loadReference(pool, opts);
    const start = opts.startIndex ?? (await nextStartIndex(pool, opts.prefix));
    const indices = Array.from({ length: opts.count }, (_, k) => start + k);

    console.log(
      `tenant-factory: creating ${opts.count} tenant(s) prefix=${opts.prefix} indices=${start}..${
        start + opts.count - 1
      } blueprint=${opts.blueprint} concurrency=${opts.concurrency}${opts.dryRun ? ' [DRY-RUN]' : ''}`
    );
    console.log(
      `  owner=${ref.ownerId} source-db=${ref.sourceDbId} modules=${ref.modules.length} items`
    );

    const results = [];
    const wallStart = now();

    // simple concurrency pool
    let cursor = 0;
    async function worker() {
      for (;;) {
        const i = cursor++;
        if (i >= indices.length) return;
        const idx = indices[i];
        const tStart = now();
        const res = await createTenant(pool, ref, opts, idx);
        const wall = now() - tStart;
        res.wall = wall;
        results.push(res);
        if (res.ok) {
          const okTables =
            Array.isArray(res.verify.appTables) && res.verify.appTables.length === 5;
          console.log(
            `  [${res.name}] OK db=${res.dbId} schemas=${res.verify.schemaCount} ` +
              `appTables=${(res.verify.appTables || []).join(',')} ${okTables ? '✓' : '✗5'} ` +
              `(prov ${ms(res.timings.provision)} boot ${ms(res.timings.bootstrap)} ` +
              `bp ${ms(res.timings.blueprint)} wall ${ms(wall)}${
                res.attempt > 1 ? ` retries=${res.attempt - 1}` : ''
              })`
          );
        } else {
          console.error(`  [${res.name}] FAILED code=${res.code} ${res.error}`);
        }
      }
    }
    await Promise.all(Array.from({ length: opts.concurrency }, () => worker()));

    const wall = now() - wallStart;
    const ok = results.filter((r) => r.ok);
    const failed = results.filter((r) => !r.ok);
    const totalSec = Number(wall) / 1e9;
    const perMin = ok.length > 0 ? (ok.length / totalSec) * 60 : 0;

    console.log(`\n=== SUMMARY ===`);
    console.log(`created ${ok.length}/${opts.count} tenants in ${totalSec.toFixed(1)}s`);
    if (ok.length) {
      const avg = (sel) => ok.reduce((a, r) => a + Number(sel(r)), 0) / ok.length / 1e6;
      console.log(
        `  avg per-tenant: provision ${avg((r) => r.timings.provision).toFixed(0)}ms ` +
          `bootstrap ${avg((r) => r.timings.bootstrap).toFixed(0)}ms ` +
          `blueprint ${avg((r) => r.timings.blueprint).toFixed(0)}ms ` +
          `wall ${avg((r) => r.wall).toFixed(0)}ms`
      );
      console.log(`  throughput: ${perMin.toFixed(2)} tenants/minute (concurrency=${opts.concurrency})`);
      console.log(`  api hosts:`);
      for (const r of ok) console.log(`    ${r.name}: ${r.apiHost}  (auth: ${r.authHost})`);
    }
    if (failed.length) {
      console.log(`  FAILURES:`);
      for (const r of failed) console.log(`    ${r.name}: [${r.code}] ${r.error}`);
      process.exitCode = 1;
    }
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
