// Post-provision SQL fixups for a freshly provisioned database.
//
// Two things must happen at the Postgres level that the provisioning GraphQL API
// does not do for us:
//
//  1. Naming settings — `constructive.simple_schema_names` and
//     `schema_use_underscores` make later `provision_blueprint` calls create an
//     `app_public` schema (which resolveSchemaId looks for) instead of a
//     hyphenated `<db>-<hex>-app-public` one. These ALTER DATABASE settings
//     PERSIST, so we set them once here, before any blueprint construction.
//
//  2. Membership defaults — new sign-ups otherwise land with
//     is_approved=false/is_verified=false, the AuthzEntityMembership policy then
//     denies every insert/select, and CRUD rows silently never persist
//     (BLUEPRINT-PENDING-001). We flip the defaults (future sign-ups) AND any
//     memberships already created during provisioning.
//
// All SQL targets the PHYSICAL control-plane database (`constructive`), NOT the
// app's database name — that name is only a schema prefix (MEMBERSHIP-DB-001).
//
// Connection creds come from the ambient PG* env vars, falling back to sourcing
// `pgpm env` (the same mechanism the old `eval "$(pgpm env)"` shell step used).
// If neither yields a connection, provisioning still succeeded — we return a
// note so the tool can warn the user that sign-in/CRUD may need a manual fixup.

import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

export type FixupResult = { applied: boolean; note: string };

export type PgEnv = {
  host?: string;
  port?: string;
  user?: string;
  password?: string;
};

// Parse `pgpm env` output. It prints shell assignments (optionally `export`-
// prefixed), one per line: `export PGHOST=localhost`. Quotes are stripped.
export function parsePgpmEnv(stdout: string): PgEnv {
  const env: Record<string, string> = {};
  for (const rawLine of stdout.split('\n')) {
    const line = rawLine.trim().replace(/^export\s+/, '');
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    env[key] = value;
  }
  return {
    host: env.PGHOST,
    port: env.PGPORT,
    user: env.PGUSER,
    password: env.PGPASSWORD,
  };
}

export async function resolvePgEnv(): Promise<PgEnv | null> {
  if (process.env.PGHOST) {
    return {
      host: process.env.PGHOST,
      port: process.env.PGPORT,
      user: process.env.PGUSER,
      password: process.env.PGPASSWORD,
    };
  }
  try {
    const { stdout } = await execFileAsync('pgpm', ['env'], { timeout: 15_000 });
    const parsed = parsePgpmEnv(stdout);
    return parsed.host ? parsed : null;
  } catch {
    return null;
  }
}

// Find the memberships schema for this app. Schema names use hyphens locally
// (`<db>-<hex>-memberships-public`) but may use underscores when the naming
// settings are active — match both, scoped to this app's name prefix.
const MEMBERSHIPS_SCHEMA_QUERY = `
  SELECT schema_name FROM information_schema.schemata
   WHERE (schema_name LIKE '%memberships-public' OR schema_name LIKE '%memberships_public')
         AND (schema_name LIKE $1 OR schema_name LIKE $2)
   ORDER BY schema_name DESC LIMIT 1`;

export async function applySqlFixups(args: {
  databaseName: string;
  physicalDb: string;
}): Promise<FixupResult> {
  const pgEnv = await resolvePgEnv();
  if (!pgEnv) {
    return {
      applied: false,
      note: 'Could not reach Postgres (no PGHOST and `pgpm env` unavailable). Database provisioned, but membership defaults were not enabled — sign-in/CRUD may fail until the constructive DB is fixed up manually.',
    };
  }

  // pg is dynamically imported so the main bundle never loads it unless a
  // provision actually runs with Postgres access. The import lives inside the
  // try: fixups are best-effort, so even a broken pg module must degrade to a
  // note instead of failing the tool after the database is already provisioned.
  let pool: import('pg').Pool | undefined;
  try {
    const { Pool } = await import('pg');
    pool = new Pool({
      host: pgEnv.host,
      port: pgEnv.port ? Number(pgEnv.port) : undefined,
      user: pgEnv.user,
      password: pgEnv.password,
      database: args.physicalDb,
    });

    const db = args.physicalDb;
    // Persistent naming settings — so future provision_blueprint calls land an
    // `app_public` schema resolveSchemaId can find.
    await pool.query(`ALTER DATABASE "${db}" SET constructive.simple_schema_names = 'true'`);
    await pool.query(`ALTER DATABASE "${db}" SET constructive.schema_use_underscores = 'true'`);

    const schemaResult = await pool.query(MEMBERSHIPS_SCHEMA_QUERY, [
      `${args.databaseName}-%`,
      `${args.databaseName}\\_%`,
    ]);

    if (schemaResult.rows.length === 0) {
      return {
        applied: true,
        note: `Naming settings applied, but no memberships schema was found for "${args.databaseName}" — sign-in may need a manual membership fixup.`,
      };
    }

    const membershipsSchema = schemaResult.rows[0].schema_name as string;
    await pool.query(
      `UPDATE "${membershipsSchema}".app_membership_defaults SET is_approved = TRUE, is_verified = TRUE`,
    );
    await pool.query(
      `UPDATE "${membershipsSchema}".app_memberships
         SET is_approved = TRUE, is_verified = TRUE
       WHERE is_approved = FALSE OR is_verified = FALSE`,
    );

    return { applied: true, note: `Membership defaults enabled (schema: ${membershipsSchema}).` };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      applied: false,
      note: `Database provisioned, but SQL fixups failed (${message}). Sign-in/CRUD may fail until membership defaults are enabled manually.`,
    };
  } finally {
    await pool?.end().catch(() => {});
  }
}
