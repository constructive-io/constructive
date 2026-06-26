import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { Pool } from 'pg';
import { getStringFlag, parseArgs } from '../lib/args';
import { pgConfigFromEnv } from '../lib/pg';
import type { CommandContext } from '../types';

interface ManifestEntry {
  tenantKey?: string;
  physicalSchema?: string;
}

interface ColumnRow {
  table_name: string;
  column_name: string;
  data_type: string;
  is_nullable: string;
  ordinal_position: number;
}

interface TableSummary {
  columnCount: number;
  columns: string[];
}

interface ShapeGroup {
  tenants: string[];
  tableCount: number;
  tableSummaries: TableSummary[];
}

function buildTableSignature(columns: ColumnRow[]): string[] {
  return [...columns]
    .sort((a, b) => Number(a.ordinal_position) - Number(b.ordinal_position))
    .map((column) => `${column.data_type}:${column.is_nullable}`);
}

function buildSchemaFingerprint(rows: ColumnRow[]): {
  fingerprint: string;
  tableCount: number;
  tableSummaries: TableSummary[];
} {
  const tables = new Map<string, ColumnRow[]>();
  for (const row of rows) {
    const existing = tables.get(row.table_name) ?? [];
    existing.push(row);
    tables.set(row.table_name, existing);
  }

  const tableSignatures = [...tables.values()].map((columns) => buildTableSignature(columns));
  tableSignatures.sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));

  const canonical = JSON.stringify(tableSignatures);
  const fingerprint = createHash('sha256').update(canonical).digest('hex').slice(0, 16);

  return {
    fingerprint,
    tableCount: tableSignatures.length,
    tableSummaries: tableSignatures.map((signature) => ({
      columnCount: signature.length,
      columns: signature,
    })),
  };
}

export async function summarizeShapes(ctx: CommandContext): Promise<void> {
  const parsed = parseArgs(ctx.args);
  const manifestPath = getStringFlag(parsed.flags, '--manifest');
  if (!manifestPath) {
    throw new Error('Usage: perf summarize-shapes --manifest <path-to-manifest.json>');
  }

  const pgConfig = {
    ...pgConfigFromEnv(),
    host: getStringFlag(parsed.flags, '--pg-host') || process.env.PGHOST || 'localhost',
    port: Number.parseInt(getStringFlag(parsed.flags, '--pg-port') || process.env.PGPORT || '5432', 10),
    database: getStringFlag(parsed.flags, '--pg-database') || process.env.PGDATABASE || 'constructive',
    user: getStringFlag(parsed.flags, '--pg-user') || process.env.PGUSER || 'postgres',
    password: getStringFlag(parsed.flags, '--pg-password') || process.env.PGPASSWORD || 'password',
  };

  if (ctx.dryRun) {
    console.log(`[summarize-shapes] would read ${manifestPath} and query ${pgConfig.host}:${pgConfig.port}/${pgConfig.database}`);
    return;
  }

  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as ManifestEntry[];
  if (!Array.isArray(manifest) || manifest.length === 0) {
    throw new Error('Manifest is empty or not an array');
  }

  const pool = new Pool(pgConfig);
  try {
    const groups = new Map<string, ShapeGroup>();

    for (const entry of manifest) {
      const schema = entry.physicalSchema;
      const tenantKey = entry.tenantKey || '<unknown-tenant>';
      if (!schema) {
        console.warn(`Skipping tenant ${tenantKey}: no physicalSchema`);
        continue;
      }

      const result = await pool.query<ColumnRow>(
        `
        SELECT table_name, column_name, data_type, is_nullable, ordinal_position
        FROM information_schema.columns
        WHERE table_schema = $1
        ORDER BY table_name, ordinal_position
        `,
        [schema],
      );

      if (result.rows.length === 0) {
        console.warn(`Skipping tenant ${tenantKey}: no columns found in schema ${schema}`);
        continue;
      }

      const { fingerprint, tableCount, tableSummaries } = buildSchemaFingerprint(result.rows);
      const group = groups.get(fingerprint) ?? { tenants: [], tableCount, tableSummaries };
      group.tenants.push(tenantKey);
      groups.set(fingerprint, group);
    }

    console.log('\n=== Structural Shape Summary ===\n');
    console.log(`Total tenants analyzed: ${manifest.length}`);
    console.log(`Distinct structural groups: ${groups.size}\n`);

    let groupIndex = 0;
    for (const [fingerprint, group] of groups) {
      groupIndex += 1;
      console.log(`--- Group ${groupIndex} (fingerprint: ${fingerprint}) ---`);
      console.log(`  Tenants: ${group.tenants.length}`);
      console.log(`  Tables:  ${group.tableCount}`);
      for (let tableIndex = 0; tableIndex < group.tableSummaries.length; tableIndex += 1) {
        const tableSummary = group.tableSummaries[tableIndex];
        console.log(`    Table ${tableIndex + 1}: ${tableSummary.columnCount} columns`);
        for (const column of tableSummary.columns) {
          console.log(`      - ${column}`);
        }
      }
      if (group.tenants.length <= 10) {
        console.log(`  Tenant keys: ${group.tenants.join(', ')}`);
      } else {
        console.log(`  Tenant keys (first 10): ${group.tenants.slice(0, 10).join(', ')} ...`);
      }
      console.log('');
    }

    const summary = {
      totalTenants: manifest.length,
      distinctGroups: groups.size,
      groups: [...groups.entries()].map(([fingerprint, group]) => ({
        fingerprint,
        tenantCount: group.tenants.length,
        tableCount: group.tableCount,
        columnLayouts: group.tableSummaries.map((tableSummary) => ({
          columnCount: tableSummary.columnCount,
          columns: tableSummary.columns,
        })),
      })),
    };

    console.log('--- JSON Summary ---');
    console.log(JSON.stringify(summary, null, 2));
  } finally {
    await pool.end();
  }
}
