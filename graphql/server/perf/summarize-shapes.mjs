#!/usr/bin/env node

/**
 * summarize-shapes.mjs — Perf-local structural shape diagnostic.
 *
 * Reads the business-table-manifest.json produced by phase1-tech-validate-dbpm
 * and queries information_schema.columns for each tenant's physical schema to
 * build a **name-stripped structural fingerprint**.
 *
 * The fingerprint ignores:
 *   - schema names
 *   - table names
 *   - column names
 *
 * It retains:
 *   - per-table column count
 *   - per-column data_type and is_nullable (ordered by ordinal_position)
 *   - number of tables per schema
 *
 * Tenants are grouped by fingerprint so that structurally identical schemas
 * (even with different tenant-specific names) collapse into one group, while
 * genuinely different shapes (e.g. extra variant tables) form separate groups.
 *
 * Usage:
 *   node summarize-shapes.mjs --manifest <path-to-manifest.json> [pg options]
 *
 * Output:
 *   - number of distinct structural groups
 *   - tenant count per group
 *   - column layout summary per group
 */

import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { Pool } from 'pg';

import { getArgValue } from './common.mjs';

const args = process.argv.slice(2);

const manifestPath = getArgValue(args, '--manifest', null);
if (!manifestPath) {
  console.error('Usage: node summarize-shapes.mjs --manifest <path-to-manifest.json>');
  process.exit(1);
}

const pgConfig = {
  host: getArgValue(args, '--pg-host', process.env.PGHOST || 'localhost'),
  port: Number.parseInt(getArgValue(args, '--pg-port', process.env.PGPORT || '5432'), 10),
  database: getArgValue(args, '--pg-database', process.env.PGDATABASE || 'constructive'),
  user: getArgValue(args, '--pg-user', process.env.PGUSER || 'postgres'),
  password: getArgValue(args, '--pg-password', process.env.PGPASSWORD || 'password'),
};

// ---------------------------------------------------------------------------
// Structural fingerprinting
// ---------------------------------------------------------------------------

/**
 * Build a name-stripped structural signature for one table.
 *
 * Returns an array of [data_type, is_nullable] tuples ordered by
 * ordinal_position.  The table name and column names are NOT included.
 */
const buildTableSignature = (columns) =>
  columns
    .sort((a, b) => a.ordinal_position - b.ordinal_position)
    .map((c) => `${c.data_type}:${c.is_nullable}`);

/**
 * Build a name-stripped structural fingerprint for an entire schema.
 *
 * 1. Group columns by table
 * 2. Build per-table signature (column types + nullability, ordered)
 * 3. Sort tables by their signature (lexicographic on the stringified tuple list)
 * 4. Hash the sorted result → structural fingerprint
 *
 * Two schemas with identical column layouts but different table/column names
 * will produce the same fingerprint.
 */
const buildSchemaFingerprint = (rows) => {
  // Group by table_name
  const tables = new Map();
  for (const row of rows) {
    if (!tables.has(row.table_name)) {
      tables.set(row.table_name, []);
    }
    tables.get(row.table_name).push(row);
  }

  // Build per-table signatures and sort tables by signature
  const tableSignatures = [];
  for (const [, columns] of tables) {
    tableSignatures.push(buildTableSignature(columns));
  }

  // Sort tables by their stringified signature so table order is deterministic
  tableSignatures.sort((a, b) => {
    const sa = JSON.stringify(a);
    const sb = JSON.stringify(b);
    return sa < sb ? -1 : sa > sb ? 1 : 0;
  });

  const canonical = JSON.stringify(tableSignatures);
  const fingerprint = createHash('sha256').update(canonical).digest('hex').slice(0, 16);

  return {
    fingerprint,
    tableCount: tableSignatures.length,
    tableSummaries: tableSignatures.map((sig) => ({
      columnCount: sig.length,
      columns: sig,
    })),
  };
};

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

const main = async () => {
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'));
  if (!Array.isArray(manifest) || manifest.length === 0) {
    console.error('Manifest is empty or not an array');
    process.exit(1);
  }

  const pool = new Pool(pgConfig);

  try {
    /** @type {Map<string, { tenants: string[], tableCount: number, tableSummaries: any[] }>} */
    const groups = new Map();

    for (const entry of manifest) {
      const schema = entry.physicalSchema;
      if (!schema) {
        console.warn(`Skipping tenant ${entry.tenantKey}: no physicalSchema`);
        continue;
      }

      const result = await pool.query(
        `
        SELECT table_name, column_name, data_type, is_nullable, ordinal_position
        FROM information_schema.columns
        WHERE table_schema = $1
        ORDER BY table_name, ordinal_position
        `,
        [schema],
      );

      if (result.rows.length === 0) {
        console.warn(`Skipping tenant ${entry.tenantKey}: no columns found in schema ${schema}`);
        continue;
      }

      const { fingerprint, tableCount, tableSummaries } = buildSchemaFingerprint(result.rows);

      if (!groups.has(fingerprint)) {
        groups.set(fingerprint, {
          tenants: [],
          tableCount,
          tableSummaries,
        });
      }
      groups.get(fingerprint).tenants.push(entry.tenantKey);
    }

    // ---------------------------------------------------------------------------
    // Output
    // ---------------------------------------------------------------------------

    console.log('\n=== Structural Shape Summary ===\n');
    console.log(`Total tenants analyzed: ${manifest.length}`);
    console.log(`Distinct structural groups: ${groups.size}\n`);

    let groupIndex = 0;
    for (const [fp, group] of groups) {
      groupIndex += 1;
      console.log(`--- Group ${groupIndex} (fingerprint: ${fp}) ---`);
      console.log(`  Tenants: ${group.tenants.length}`);
      console.log(`  Tables:  ${group.tableCount}`);
      for (let t = 0; t < group.tableSummaries.length; t++) {
        const ts = group.tableSummaries[t];
        console.log(`    Table ${t + 1}: ${ts.columnCount} columns`);
        for (const col of ts.columns) {
          console.log(`      - ${col}`);
        }
      }
      if (group.tenants.length <= 10) {
        console.log(`  Tenant keys: ${group.tenants.join(', ')}`);
      } else {
        console.log(`  Tenant keys (first 10): ${group.tenants.slice(0, 10).join(', ')} ...`);
      }
      console.log('');
    }

    // Machine-readable summary to stdout
    const summary = {
      totalTenants: manifest.length,
      distinctGroups: groups.size,
      groups: [...groups.entries()].map(([fp, g]) => ({
        fingerprint: fp,
        tenantCount: g.tenants.length,
        tableCount: g.tableCount,
        columnLayouts: g.tableSummaries.map((ts) => ({
          columnCount: ts.columnCount,
          columns: ts.columns,
        })),
      })),
    };

    console.log('--- JSON Summary ---');
    console.log(JSON.stringify(summary, null, 2));
  } finally {
    await pool.end();
  }
};

main().catch((error) => {
  console.error(error instanceof Error ? error.stack : String(error));
  process.exit(1);
});
