/**
 * fleet drift — apply deliberate shape drift to seeded tenants so the fleet
 * spans multiple blueprints. Port of `scripts/scale-validate/drift-tenants.mjs`
 * (inline pg defaults/parser replaced with core config + args; --pg-* and --help
 * added; output written under --out-dir).
 *
 * The pooling shape-fingerprint hashes [logical schema, relname] pairs — only
 * ADDING A RELATION changes a tenant's blueprint.
 *
 *   --groups K --per-group N   assign K drift groups; group g (1-based) gets a
 *                              marker TABLE drift_marker_g<g> in app-public →
 *                              K distinct blueprints (group 0 = undrifted).
 *   --column-drift N           additionally give N tenants a benign EXTRA COLUMN
 *                              on categories (same relname set → SAME blueprint;
 *                              exercises the documented fingerprint limitation).
 *
 * Writes drifted.json describing the assignment. Idempotent (IF NOT EXISTS).
 *   perf-harness fleet drift --groups 6 --per-group 4 --column-drift 2
 */
import fs from 'node:fs';
import path from 'node:path';

import { Argv, asBool, asInt, usageExit } from '../core/args';
import { PgConfig, pgConfigFromArgv, resolveOutDir } from '../core/config';
import { withFreshClient } from '../core/pgc';

export const USAGE = `perf-harness fleet drift — apply deliberate shape drift so the fleet spans multiple blueprints

Options:
  --groups <K>         assign K table-drift groups (drift_marker_g<g> per group)
  --per-group <N>      tenants per group (default: 4)
  --column-drift <N>   give N tenants a benign extra column (same blueprint)
  --out <file>         write assignment JSON here (default: <out-dir>/drifted.json)
  --out-dir <dir>      artifact directory (default: ./perf-out)
  --pg-* / PG*         connection overrides
  --allow-hub          permit a constructive-hub port
  --help
`;

// Tenant app-public schemas, oldest first for stable assignment.
const TENANT_SCHEMAS_SQL = `
    SELECT db.name AS dbname, s.schema_name
    FROM metaschema_public.database db
    JOIN metaschema_public.schema s ON s.database_id = db.id
    WHERE db.name NOT IN ('constructive') AND s.schema_name LIKE '%-app-public'
    ORDER BY db.name`;

export async function run(argv: Argv): Promise<number> {
  if (asBool(argv.help)) return usageExit(USAGE, 0);

  const groups = asInt(argv.groups, 0);
  const perGroup = asInt(argv['per-group'], 4);
  const columnDrift = asInt(argv['column-drift'], 0);

  let cfg: PgConfig;
  try {
    cfg = pgConfigFromArgv(argv);
  } catch (err) {
    console.error(err);
    return 1;
  }

  const outFile =
    typeof argv.out === 'string' ? path.resolve(argv.out) : path.join(resolveOutDir(argv), 'drifted.json');

  try {
    await withFreshClient(cfg, async (client) => {
      const { rows } = await client.query(TENANT_SCHEMAS_SQL);

      const assignment: { groups: Record<string, string[]>; columnDrift: string[] } = { groups: {}, columnDrift: [] };
      let idx = 0;

      for (let g = 1; g <= groups; g++) {
        assignment.groups[g] = [];
        for (let n = 0; n < perGroup && idx < rows.length; n++, idx++) {
          const { dbname, schema_name } = rows[idx];
          await client.query(
            `CREATE TABLE IF NOT EXISTS "${schema_name.replace(/"/g, '""')}"."drift_marker_g${g}" (id serial PRIMARY KEY, note text)`
          );
          assignment.groups[g].push(dbname);
          console.error(`table-drift g${g}: ${dbname}`);
        }
      }

      for (let n = 0; n < columnDrift && idx < rows.length; n++, idx++) {
        const { dbname, schema_name } = rows[idx];
        await client.query(
          `ALTER TABLE "${schema_name.replace(/"/g, '""')}".categories ADD COLUMN IF NOT EXISTS drift_col_only text`
        );
        assignment.columnDrift.push(dbname);
        console.error(`column-drift (same blueprint, documents fingerprint limit): ${dbname}`);
      }

      fs.mkdirSync(path.dirname(outFile), { recursive: true });
      fs.writeFileSync(outFile, JSON.stringify(assignment, null, 2));
      console.error(
        `done: ${groups} table-drift groups × ${perGroup}, ${columnDrift} column-drift; assignment → ${outFile}`
      );
    });
    return 0;
  } catch (err) {
    console.error(err);
    return 1;
  }
}
