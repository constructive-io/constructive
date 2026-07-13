/**
 * fleet discover — print a JSON fleet manifest describing every tenant
 * database. Port of `scripts/scale-validate/fleet.mjs`.
 *
 * For each tenant database (metaschema_public.database where name like the
 * --like pattern) it resolves databaseId, the api/auth hosts (from
 * services_public.domains) and the physical schemas of the `api` API.
 *
 *   perf-harness fleet discover > fleet.json
 *   perf-harness fleet discover --like 'marketplace%' --pretty
 *   perf-harness fleet discover --pg-port 5433 --out fleet.json
 */
import fs from 'node:fs';

import { Argv, asBool, usageExit } from '../core/args';
import { pgConfigFromArgv } from '../core/config';
import { withFreshClient } from '../core/pgc';
import { ensureParentDir } from '../core/proc';
import { Tenant } from '../core/fleetfile';

export const USAGE = `perf-harness fleet discover — emit JSON fleet manifest from the control-plane DB

Options:
  --like <pattern>   database name filter (default: '%' — all databases; e.g. 'marketplace%' to narrow)
  --out <file>       write JSON here instead of stdout
  --pretty           pretty-print JSON
  --pg-host/--pg-port/--pg-user/--pg-password/--pg-database  connection overrides
  --allow-hub        permit a constructive-hub port (default refuses 5432/3000/3001/3002/9000)
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

export async function run(argv: Argv): Promise<number> {
  if (asBool(argv.help)) return usageExit(USAGE, 0);
  try {
    // Default widened from the original fleet.mjs 'marketplace%' to '%': the
    // canonical validation fleet (committed fleet.json, VALIDATION-REPORT.md)
    // and the tenants `fleet provision` creates (factory*) are only captured
    // by a match-all pattern. Pass --like to narrow (e.g. 'marketplace%').
    const like = typeof argv.like === 'string' ? argv.like : '%';
    const pretty = asBool(argv.pretty);
    const cfg = pgConfigFromArgv(argv);
    const rows = await withFreshClient(cfg, async (client) => {
      const res = await client.query(FLEET_SQL, [like]);
      return res.rows;
    });

    const tenants: Tenant[] = rows.map((r: any) => {
      const schemas: string[] = r.schemas || [];
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
      generatedAt: new Date().toISOString(),
      like,
      pg: { host: cfg.host, port: cfg.port, database: cfg.database },
      count: tenants.length,
      tenants
    };

    const json = JSON.stringify(manifest, null, pretty ? 2 : 0);
    if (typeof argv.out === 'string') {
      ensureParentDir(argv.out);
      fs.writeFileSync(argv.out, `${json}\n`, 'utf8');
      process.stderr.write(`[fleet] wrote ${tenants.length} tenants to ${argv.out}\n`);
    } else {
      process.stdout.write(`${json}\n`);
    }
    return 0;
  } catch (err: any) {
    process.stderr.write(`[fleet] ERROR: ${err && err.stack ? err.stack : err}\n`);
    return 1;
  }
}
