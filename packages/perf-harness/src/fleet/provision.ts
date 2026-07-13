/**
 * fleet provision — the fast-path tenant factory. Port of
 * `scripts/scale-validate/tenant-factory.mjs`.
 *
 * Creates blueprint-identical marketplace tenants directly via SQL, reusing the
 * SAME control-plane procedures the GraphQL seeder ultimately invokes, but
 * WITHOUT the GraphQL/undici layer (and its 300s HTTP cap). Per tenant, in one
 * committed transaction:
 *
 *   1. metaschema_generators.provision_database(...)   — db + domains + apis +
 *        site + modules + the app_public/app_private application schemas.
 *   2. metaschema_private.bootstrap_owner_into_database(...) — copies the owner
 *        user + primary email + password_hash from the control-plane source
 *        database so password sign-in works.
 *   3. INSERT metaschema_modules_public.blueprint (copy of the reference
 *        definition) + metaschema_modules_public.construct_blueprint(
 *        blueprint_id, app_public_schema_id) — builds the marketplace tables.
 *
 * Session GUC: the module install triggers call
 * metaschema_private.ensure_super_constructive(), which RAISES unless
 * `constructive.allow_super_constructive = 'true'`. We set it per-transaction.
 *
 *   perf-harness fleet provision --count 5 --prefix factory --blueprint marketplace
 *   perf-harness fleet provision --validate factory1   # shape check vs reference
 */
import { createHash, randomBytes } from 'node:crypto';

import { Argv, asBool, asInt, usageExit } from '../core/args';
import { PgConfig, pgConfigFromArgv } from '../core/config';
import { getPg, isConnLoss, isRetryableTxn } from '../core/pgc';

export const USAGE = `perf-harness fleet provision — create blueprint-identical marketplace tenants via SQL

Options:
  --count <n>          number of tenants to create (default: 1)
  --prefix <name>      tenant name prefix (default: factory)
  --blueprint <name>   reference blueprint name (default: marketplace)
  --reference <db>     reference tenant database (default: marketplace_db_tenant1)
  --source-db <db>     control-plane source database (default: constructive)
  --domain <domain>    subdomain suffix (default: localhost)
  --concurrency <n>    parallel workers (default: 1)
  --max-retries <n>    retries on connection loss / deadlock (default: 3)
  --start-index <n>    first tenant index (default: next free after prefix)
  --dry-run            ROLLBACK each tenant transaction (shape check only)
  --validate <db>      compare a tenant's api shape-fingerprint to the reference
  --pg-* / PG*         connection overrides
  --allow-hub          permit a constructive-hub port
  --help
`;

interface ProvisionOpts {
  count: number;
  prefix: string;
  blueprint: string;
  reference: string;
  sourceDb: string;
  domain: string;
  concurrency: number;
  maxRetries: number;
  dryRun: boolean;
  validate: string | null;
  startIndex: number | null;
}

function readOpts(argv: Argv): ProvisionOpts {
  return {
    count: asInt(argv.count, 1),
    prefix: typeof argv.prefix === 'string' ? argv.prefix : 'factory',
    blueprint: typeof argv.blueprint === 'string' ? argv.blueprint : 'marketplace',
    reference: typeof argv.reference === 'string' ? argv.reference : 'marketplace_db_tenant1',
    sourceDb: typeof argv['source-db'] === 'string' ? argv['source-db'] : 'constructive',
    domain: typeof argv.domain === 'string' ? argv.domain : 'localhost',
    concurrency: asInt(argv.concurrency, 1),
    maxRetries: asInt(argv['max-retries'], 3),
    dryRun: asBool(argv['dry-run']),
    validate: typeof argv.validate === 'string' ? argv.validate : null,
    startIndex: argv['start-index'] !== undefined ? asInt(argv['start-index'], null) : null
  };
}

const now = (): bigint => process.hrtime.bigint();
const ms = (t: bigint): string => `${(Number(t) / 1e6).toFixed(0)}ms`;

// ---------------------------------------------------------------------------
// retry classification (deadlock/serialization vs connection-class failures)
// ---------------------------------------------------------------------------
// 40P01/40001: deadlock/serialization -> short backoff. 57P0x/08006/08003/53300
// + message sniff: connection-class (e.g. PG crash recovery) -> long backoff so
// the run survives a server restart. Classifiers live in core/pgc.
export function classifyRetry(err: any): { connLost: boolean; retriable: boolean } {
  const connLost = isConnLoss(err);
  return { connLost, retriable: connLost || isRetryableTxn(err) };
}

export function retryBackoffMs(connLost: boolean, attempt: number, rand: number = Math.random()): number {
  return (connLost ? 10000 : 100) * attempt + Math.floor(rand * 100);
}

// ---------------------------------------------------------------------------
// shape fingerprint (step 3.i): compare the logical [schema, relname] set of a
// tenant's `api` API to the reference tenant's — same set => same fingerprint =>
// same bp: key. Mirrors graphql/server/src/middleware/blueprint.ts:
// stripSchemaHashPrefix + fingerprintFromRelations. The physical-schema hash
// prefix is stripped in JS (not SQL) so the property is unit-testable.
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
  SELECT n.nspname, c.relname
    FROM api_schema aps
    JOIN pg_namespace n ON n.nspname = aps.schema_name
    JOIN pg_class c ON c.relnamespace = n.oid AND c.relkind IN ('r','v','m','p')
   ORDER BY 1, 2`;

export interface ShapeRelation {
  nspname: string;
  relname: string;
}

// Strip the tenant hash prefix from a physical schema name (mirror of the
// server's stripSchemaHashPrefix): `<dashed-dbname>-<8hex>-<logical>` ->
// `<logical>`; control-plane schemas without the segment are unchanged.
export function stripSchemaHashPrefix(name: string): string {
  const match = /-[0-9a-f]{8}-/.exec(name);
  if (!match) return name;
  return name.slice(match.index + match[0].length);
}

// sha256 over the sorted [logicalSchema, relname] pairs (same algorithm as the
// server's fingerprintFromRelations). Returns the pairs too, for reporting.
export function computeShape(rows: ShapeRelation[]): { pairs: [string, string][]; fingerprint: string } {
  const pairs: [string, string][] = rows.map((row) => [stripSchemaHashPrefix(row.nspname), row.relname]);
  pairs.sort((a, b) => (a[0] !== b[0] ? (a[0] < b[0] ? -1 : 1) : a[1] < b[1] ? -1 : a[1] > b[1] ? 1 : 0));
  return { pairs, fingerprint: createHash('sha256').update(JSON.stringify(pairs)).digest('hex') };
}

async function shapeOf(pool: any, dbName: string): Promise<{ pairs: [string, string][]; fingerprint: string }> {
  const r = await pool.query(SHAPE_SQL, [dbName]);
  return computeShape(r.rows);
}

async function validateShape(pool: any, opts: ProvisionOpts): Promise<boolean> {
  const ref = await shapeOf(pool, opts.reference);
  const cand = await shapeOf(pool, opts.validate);
  const same = ref.fingerprint === cand.fingerprint;
  console.error(`\n=== SHAPE CHECK: "${opts.validate}" vs reference "${opts.reference}" ===`);
  console.error(`reference api relations (${ref.pairs.length}):`);
  for (const [s, r] of ref.pairs) console.error(`    ${s}.${r}`);
  console.error(`candidate api relations (${cand.pairs.length}):`);
  for (const [s, r] of cand.pairs) console.error(`    ${s}.${r}`);
  console.error(`reference shapeFingerprint: ${ref.fingerprint}`);
  console.error(`candidate shapeFingerprint: ${cand.fingerprint}`);
  console.error(`IDENTICAL SHAPE => same bp: key expected: ${same ? 'YES' : 'NO'}`);
  return same;
}

// ---------------------------------------------------------------------------
// reference loading
// ---------------------------------------------------------------------------
async function loadReference(pool: any, opts: ProvisionOpts): Promise<any> {
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

  const src = await pool.query(`SELECT id FROM metaschema_public.database WHERE name = $1`, [opts.sourceDb]);
  if (src.rows.length === 0) throw new Error(`source database "${opts.sourceDb}" not found`);
  const sourceDbId = src.rows[0].id;

  return { refDbId, ownerId, modules, options, blueprint, sourceDbId };
}

async function nextStartIndex(pool: any, prefix: string): Promise<number> {
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
async function createTenant(pool: any, ref: any, opts: ProvisionOpts, index: number): Promise<any> {
  const name = `${opts.prefix}${index}`;
  const subdomain = `${name}-${randomBytes(4).toString('hex')}`;

  let attempt = 0;
  for (;;) {
    attempt++;
    const client = await pool.connect();
    const t: any = {};
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
      await client.query(`SELECT metaschema_private.bootstrap_owner_into_database($1,$2,$3,false)`, [
        dbId,
        ref.sourceDbId,
        ref.ownerId
      ]);
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
      const verify: any = {};
      verify.schemaCount = (
        await client.query(`SELECT count(*)::int AS c FROM metaschema_public.schema WHERE database_id=$1`, [dbId])
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
    } catch (err: any) {
      try {
        await client.query('ROLLBACK');
      } catch {
        // rollback of an already-broken txn can throw — ignore
      }
      const { connLost, retriable } = classifyRetry(err);
      if (retriable && attempt <= opts.maxRetries) {
        const backoff = retryBackoffMs(connLost, attempt);
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

export async function run(argv: Argv): Promise<number> {
  if (asBool(argv.help)) return usageExit(USAGE, 0);
  const opts = readOpts(argv);

  let cfg: PgConfig;
  try {
    cfg = pgConfigFromArgv(argv);
  } catch (err) {
    console.error(err);
    return 1;
  }

  const { Pool } = getPg();
  const pool = new Pool({ ...cfg, max: Math.max(2, opts.concurrency + 1) });
  // An idle pooled client dying (PG crash/restart) must not take down the run.
  pool.on('error', (e: any) => console.error(`  [pool] idle client error (continuing): ${e.message}`));

  try {
    if (opts.validate) {
      const ok = await validateShape(pool, opts);
      return ok ? 0 : 1;
    }

    const ref = await loadReference(pool, opts);
    const start = opts.startIndex ?? (await nextStartIndex(pool, opts.prefix));
    const indices = Array.from({ length: opts.count }, (_, k) => start + k);

    console.error(
      `tenant-factory: creating ${opts.count} tenant(s) prefix=${opts.prefix} indices=${start}..${
        start + opts.count - 1
      } blueprint=${opts.blueprint} concurrency=${opts.concurrency}${opts.dryRun ? ' [DRY-RUN]' : ''}`
    );
    console.error(`  owner=${ref.ownerId} source-db=${ref.sourceDbId} modules=${ref.modules.length} items`);

    const results: any[] = [];
    const wallStart = now();

    // simple concurrency pool
    let cursor = 0;
    const worker = async (): Promise<void> => {
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
          const okTables = Array.isArray(res.verify.appTables) && res.verify.appTables.length === 5;
          console.error(
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
    };
    await Promise.all(Array.from({ length: opts.concurrency }, () => worker()));

    const wall = now() - wallStart;
    const ok = results.filter((r) => r.ok);
    const failed = results.filter((r) => !r.ok);
    const totalSec = Number(wall) / 1e9;
    const perMin = ok.length > 0 ? (ok.length / totalSec) * 60 : 0;

    console.error(`\n=== SUMMARY ===`);
    console.error(`created ${ok.length}/${opts.count} tenants in ${totalSec.toFixed(1)}s`);
    if (ok.length) {
      const avg = (sel: (r: any) => any): number => ok.reduce((a, r) => a + Number(sel(r)), 0) / ok.length / 1e6;
      console.error(
        `  avg per-tenant: provision ${avg((r) => r.timings.provision).toFixed(0)}ms ` +
          `bootstrap ${avg((r) => r.timings.bootstrap).toFixed(0)}ms ` +
          `blueprint ${avg((r) => r.timings.blueprint).toFixed(0)}ms ` +
          `wall ${avg((r) => r.wall).toFixed(0)}ms`
      );
      console.error(`  throughput: ${perMin.toFixed(2)} tenants/minute (concurrency=${opts.concurrency})`);
      console.error(`  api hosts:`);
      for (const r of ok) console.error(`    ${r.name}: ${r.apiHost}  (auth: ${r.authHost})`);
    }
    if (failed.length) {
      console.error(`  FAILURES:`);
      for (const r of failed) console.error(`    ${r.name}: [${r.code}] ${r.error}`);
      return 1;
    }
    return 0;
  } catch (err) {
    console.error(err);
    return 1;
  } finally {
    await pool.end();
  }
}
