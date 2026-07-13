/**
 * fleet teardown — tear down factory tenants above --keep (catalog-wall
 * remediation: the rig's PG cannot introspect a 100+-tenant catalog, so the
 * fleet is trimmed to a size the VM can serve). Port of
 * `scripts/scale-validate/drop-tenants.mjs` (inline pg defaults replaced with
 * core config + args; --pg-* and --help added).
 *
 * Per tenant, in one transaction:
 *   1. capture its physical schema names from metaschema_public.schema
 *   2. DELETE FROM metaschema_public.database (control-plane FKs CASCADE;
 *      metaschema delete triggers may drop physical objects — requires the
 *      constructive.allow_super_constructive GUC)
 *   3. DROP SCHEMA IF EXISTS ... CASCADE for any physical schema that survived
 * Then VACUUM ANALYZE the hot catalogs and report the new catalog size.
 *
 *   perf-harness fleet teardown --prefix factory --keep 40 [--dry-run] [--only factory101]
 */
import { Argv, asBool, asInt, usageExit } from '../core/args';
import { PgConfig, pgConfigFromArgv } from '../core/config';
import { getPg } from '../core/pgc';

export const USAGE = `perf-harness fleet teardown — drop factory tenants above --keep and reclaim catalog

Options:
  --prefix <name>   tenant name prefix (default: factory)
  --keep <n>        keep tenants with index <= n (default: 40)
  --only <db>       drop exactly this one tenant instead of prefix/keep
  --dry-run         ROLLBACK each drop (report only)
  --pg-* / PG*      connection overrides
  --allow-hub       permit a constructive-hub port
  --help
`;

// Hot catalogs to VACUUM ANALYZE after a drop batch so pg_class introspection
// stays fast at scale.
const VACUUM_CATALOGS = ['pg_class', 'pg_attribute', 'pg_proc', 'pg_constraint', 'pg_policy', 'pg_namespace', 'pg_depend', 'pg_type'];

export interface TeardownWhere {
  sql: string;
  params: any[];
}

// --only targets exactly one tenant; otherwise drop every `<prefix><n>` tenant
// whose numeric index exceeds --keep.
export function buildWhere(opts: { only?: string | null; prefix: string; keep: number }): TeardownWhere {
  if (opts.only) {
    return { sql: `name = $1`, params: [opts.only] };
  }
  return {
    sql: `name ~ ('^' || $1 || '[0-9]+$') AND (regexp_replace(name, '^' || $1, ''))::int > $2`,
    params: [opts.prefix, opts.keep]
  };
}

const qid = (s: string): string => `"${s.replace(/"/g, '""')}"`;

async function dropOne(pool: any, row: any, dry: boolean): Promise<{ ok: boolean; error?: string }> {
  const client = await pool.connect();
  const t0 = Date.now();
  try {
    await client.query('BEGIN');
    await client.query('SET LOCAL statement_timeout = 0');
    await client.query('SET LOCAL lock_timeout = 0');
    await client.query(`SET LOCAL constructive.allow_super_constructive = 'true'`);

    const schemas = (
      await client.query(`SELECT schema_name FROM metaschema_public.schema WHERE database_id=$1`, [row.id])
    ).rows.map((r: any) => r.schema_name);

    await client.query(`DELETE FROM metaschema_public.database WHERE id=$1`, [row.id]);

    let survivors = 0;
    for (const s of schemas) {
      const exists = await client.query(`SELECT 1 FROM pg_namespace WHERE nspname=$1`, [s]);
      if (exists.rows.length) {
        survivors++;
        await client.query(`DROP SCHEMA IF EXISTS ${qid(s)} CASCADE`);
      }
    }

    // pg_partman registers partitioned tables by NAME in partman.part_config —
    // not schema-scoped, not FK-cascaded — and schema hashes are deterministic
    // per dbname, so a leftover row blocks re-provisioning a reused tenant name
    // (unique_violation on parent_table). Clean them with the schemas.
    if (schemas.length) {
      const patterns = schemas.map((s: string) => `${s}.%`);
      try {
        await client.query(`DELETE FROM partman.part_config_sub WHERE sub_parent LIKE ANY($1)`, [patterns]);
      } catch {
        /* part_config_sub may not exist */
      }
      try {
        const del = await client.query(`DELETE FROM partman.part_config WHERE parent_table LIKE ANY($1)`, [patterns]);
        if (del.rowCount) console.error(`  [${row.name}] cleaned ${del.rowCount} partman.part_config row(s)`);
      } catch {
        /* partman may not be installed */
      }
    }

    if (dry) await client.query('ROLLBACK');
    else await client.query('COMMIT');
    console.error(
      `  [${row.name}] dropped (schemas=${schemas.length} survivors-dropped=${survivors}) ${Date.now() - t0}ms${dry ? ' [DRY]' : ''}`
    );
    return { ok: true };
  } catch (e: any) {
    try {
      await client.query('ROLLBACK');
    } catch {
      // rollback of an already-broken txn can throw — ignore
    }
    console.error(`  [${row.name}] FAILED: ${e.code || ''} ${e.message}`);
    return { ok: false, error: e.message };
  } finally {
    client.release();
  }
}

export async function run(argv: Argv): Promise<number> {
  if (asBool(argv.help)) return usageExit(USAGE, 0);

  const prefix = typeof argv.prefix === 'string' ? argv.prefix : 'factory';
  const keep = asInt(argv.keep, 40);
  const only = typeof argv.only === 'string' ? argv.only : null;
  const dry = asBool(argv['dry-run']);

  let cfg: PgConfig;
  try {
    cfg = pgConfigFromArgv(argv);
  } catch (err) {
    console.error(err);
    return 1;
  }

  const { Pool } = getPg();
  const pool = new Pool({ ...cfg, max: 2 });
  pool.on('error', (e: any) => console.error(`[pool] idle client error (continuing): ${e.message}`));

  try {
    const where = buildWhere({ only, prefix, keep });
    const { rows } = await pool.query(
      `SELECT id, name FROM metaschema_public.database WHERE ${where.sql}
     ORDER BY (regexp_replace(name, '[^0-9]', '', 'g'))::int NULLS LAST`,
      where.params
    );
    console.error(`drop-tenants: ${rows.length} tenant(s) to drop${dry ? ' [DRY-RUN]' : ''}`);

    let ok = 0;
    for (const row of rows) {
      const r = await dropOne(pool, row, dry);
      if (r.ok) ok++;
    }
    console.error(`dropped ${ok}/${rows.length}`);

    if (!dry && ok > 0) {
      console.error('VACUUM ANALYZE hot catalogs...');
      for (const cat of VACUUM_CATALOGS) {
        await pool.query(`VACUUM ANALYZE ${cat}`);
      }
    }

    const stats = await pool.query(`
    SELECT (SELECT count(*) FROM pg_class) AS classes,
           (SELECT count(*) FROM pg_attribute) AS attrs,
           (SELECT count(*) FROM pg_namespace) AS namespaces,
           (SELECT count(*) FROM metaschema_public.database) AS databases`);
    console.error(`catalog now: ${JSON.stringify(stats.rows[0])}`);
    return 0;
  } catch (err) {
    console.error(err);
    return 1;
  } finally {
    await pool.end();
  }
}
