#!/usr/bin/env node
/**
 * Apply deliberate shape drift to seeded tenants so the fleet spans multiple
 * blueprints (the pooling shape-fingerprint hashes [logical schema, relname]
 * pairs — only ADDING A RELATION changes a tenant's blueprint).
 *
 * Modes:
 *   --groups K --per-group N   assign K drift groups; group g (1-based) gets a
 *                              marker TABLE drift_marker_g<g> in app-public →
 *                              K distinct blueprints (group 0 = undrifted).
 *   --column-drift N           additionally give N tenants a benign EXTRA COLUMN
 *                              on categories (same relname set → SAME blueprint;
 *                              exercises the documented fingerprint limitation).
 *
 * Writes drifted.json describing the assignment. Idempotent (IF NOT EXISTS).
 * Usage: node scripts/scale-validate/drift-tenants.mjs --groups 6 --per-group 4 --column-drift 2
 */
import { writeFileSync } from 'node:fs';

import { resolvePg } from './_lib.mjs';

const { Pool } = resolvePg();

const arg = (name, dflt) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : dflt;
};
const GROUPS = parseInt(arg('groups', '0'), 10);
const PER_GROUP = parseInt(arg('per-group', '4'), 10);
const COLUMN_DRIFT = parseInt(arg('column-drift', '0'), 10);

const pool = new Pool({
  host: process.env.PGHOST || 'localhost',
  port: parseInt(process.env.PGPORT || '5433', 10),
  user: process.env.PGUSER || 'postgres',
  password: process.env.PGPASSWORD || 'password',
  database: process.env.PGDATABASE || 'constructive'
});

const main = async () => {
  // Tenant app-public schemas, oldest first for stable assignment.
  const { rows } = await pool.query(`
    SELECT db.name AS dbname, s.schema_name
    FROM metaschema_public.database db
    JOIN metaschema_public.schema s ON s.database_id = db.id
    WHERE db.name NOT IN ('constructive') AND s.schema_name LIKE '%-app-public'
    ORDER BY db.name`);

  const assignment = { groups: {}, columnDrift: [] };
  let idx = 0;

  for (let g = 1; g <= GROUPS; g++) {
    assignment.groups[g] = [];
    for (let n = 0; n < PER_GROUP && idx < rows.length; n++, idx++) {
      const { dbname, schema_name } = rows[idx];
      await pool.query(
        `CREATE TABLE IF NOT EXISTS "${schema_name.replace(/"/g, '""')}"."drift_marker_g${g}" (id serial PRIMARY KEY, note text)`
      );
      assignment.groups[g].push(dbname);
      console.log(`table-drift g${g}: ${dbname}`);
    }
  }

  for (let n = 0; n < COLUMN_DRIFT && idx < rows.length; n++, idx++) {
    const { dbname, schema_name } = rows[idx];
    await pool.query(
      `ALTER TABLE "${schema_name.replace(/"/g, '""')}".categories ADD COLUMN IF NOT EXISTS drift_col_only text`
    );
    assignment.columnDrift.push(dbname);
    console.log(`column-drift (same blueprint, documents fingerprint limit): ${dbname}`);
  }

  writeFileSync(new URL('./drifted.json', import.meta.url), JSON.stringify(assignment, null, 2));
  console.log(`done: ${GROUPS} table-drift groups × ${PER_GROUP}, ${COLUMN_DRIFT} column-drift; assignment → drifted.json`);
  await pool.end();
};

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
