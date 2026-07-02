/**
 * fleet.mjs — print a JSON fleet manifest describing every marketplace tenant.
 *
 * For each tenant database (metaschema_public.database where name like the
 * --like pattern) it resolves:
 *   - databaseId
 *   - api host  (services_public.domains subdomain like 'api-%'  + '.' + domain)
 *   - auth host (services_public.domains subdomain like 'auth-%' + '.' + domain)
 *   - the physical schemas of the `api` API
 *       (services_public.apis JOIN api_schemas JOIN metaschema_public.schema)
 *
 * Usage:
 *   node scripts/scale-validate/fleet.mjs > fleet.json
 *   node scripts/scale-validate/fleet.mjs --like 'marketplace%' --pretty
 *   PGPORT=5433 node scripts/scale-validate/fleet.mjs --out fleet.json
 */
import fs from 'node:fs';
import { asBool, nowIso, parseArgs, pgConfigFromArgs, resolvePg } from './_lib.mjs';

const HELP = `fleet.mjs — emit JSON fleet manifest from the control-plane DB

Options:
  --like <pattern>   database name filter (default: 'marketplace%')
  --out <file>       write JSON here instead of stdout
  --pretty           pretty-print JSON
  --pg-host/--pg-port/--pg-user/--pg-password/--pg-database  connection overrides
  --help
`;

const FLEET_SQL = `
SELECT
  d.name AS dbname,
  d.id::text AS database_id,
  (SELECT dom.subdomain || '.' || dom.domain
     FROM services_public.domains dom
     WHERE dom.database_id = d.id AND dom.subdomain LIKE 'api-%'
     ORDER BY dom.subdomain LIMIT 1) AS api_host,
  (SELECT dom.subdomain || '.' || dom.domain
     FROM services_public.domains dom
     WHERE dom.database_id = d.id AND dom.subdomain LIKE 'auth-%'
     ORDER BY dom.subdomain LIMIT 1) AS auth_host,
  COALESCE((
    SELECT array_agg(s.schema_name ORDER BY s.schema_name)
      FROM services_public.apis a
      JOIN services_public.api_schemas aps ON aps.api_id = a.id AND aps.database_id = a.database_id
      JOIN metaschema_public.schema s ON s.id = aps.schema_id
     WHERE a.database_id = d.id AND a.name = 'api'
  ), ARRAY[]::text[]) AS schemas
FROM metaschema_public.database d
WHERE d.name LIKE $1
ORDER BY d.name;
`;

async function main() {
  const { args } = parseArgs(process.argv.slice(2));
  if (asBool(args.help)) {
    process.stdout.write(HELP);
    return;
  }
  const like = typeof args.like === 'string' ? args.like : 'marketplace%';
  const pretty = asBool(args.pretty);
  const cfg = pgConfigFromArgs(args);
  const { Client } = resolvePg();
  const client = new Client(cfg);
  await client.connect();
  let rows;
  try {
    const res = await client.query(FLEET_SQL, [like]);
    rows = res.rows;
  } finally {
    await client.end();
  }

  const tenants = rows.map((r) => {
    const schemas = r.schemas || [];
    const appPublicSchema = schemas.find((s) => /-app-public$/.test(s)) || schemas[0] || null;
    return {
      dbname: r.dbname,
      databaseId: r.database_id,
      apiHost: r.api_host,
      authHost: r.auth_host,
      schemas,
      appPublicSchema
    };
  });

  const manifest = {
    generatedAt: nowIso(),
    like,
    pg: { host: cfg.host, port: cfg.port, database: cfg.database },
    count: tenants.length,
    tenants
  };

  const json = JSON.stringify(manifest, null, pretty ? 2 : 0);
  if (typeof args.out === 'string') {
    fs.writeFileSync(args.out, `${json}\n`, 'utf8');
    process.stderr.write(`[fleet] wrote ${tenants.length} tenants to ${args.out}\n`);
  } else {
    process.stdout.write(`${json}\n`);
  }
}

main().catch((err) => {
  process.stderr.write(`[fleet] ERROR: ${err && err.stack ? err.stack : err}\n`);
  process.exitCode = 1;
});
