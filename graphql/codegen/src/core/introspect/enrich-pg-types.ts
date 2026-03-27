/**
 * PostgreSQL Type Enrichment
 *
 * Enriches Table objects with PostgreSQL-specific type metadata (pgType)
 * from _meta table metadata.
 *
 * Two sources of _meta data:
 * 1. Live from database mode — _cachedTablesMeta populated by MetaSchemaPlugin
 * 2. Static from metaFile — _meta.json sidecar loaded from disk (for file/schemaDir mode)
 *
 * When neither is available, codegen falls back to heuristic detection
 * (FullText → tsvector, name patterns, GQL type patterns).
 */
import * as fs from 'node:fs';
import path from 'node:path';

import type { Table } from '../../types/schema';
import type { MetaTableInfo } from './source/types';

/**
 * Enrich Table objects with pgType from _meta field metadata.
 * Mutates the tables array in-place (same pattern as enrichManyToManyRelations).
 *
 * Matches _meta fields to Table fields by name and copies pgType.
 * Does not overwrite gqlType, isArray, or other introspection-derived data.
 *
 * @returns Number of fields enriched (for logging)
 */
export function enrichPgTypesFromMeta(
  tables: Table[],
  tablesMeta: MetaTableInfo[],
): number {
  let enriched = 0;

  const metaByName = new Map(tablesMeta.map((m) => [m.name, m]));

  for (const table of tables) {
    const meta = metaByName.get(table.name);
    if (!meta?.fields?.length) continue;

    // Build a lookup of meta field name → pgType
    const pgTypeByField = new Map(
      meta.fields.map((f) => [f.name, f.type.pgType]),
    );

    for (const field of table.fields) {
      const pgType = pgTypeByField.get(field.name);
      if (pgType && pgType !== 'unknown' && !field.type.pgType) {
        field.type = { ...field.type, pgType };
        enriched++;
      }
    }
  }

  return enriched;
}

/**
 * Load a _meta.json sidecar file from disk.
 * Returns null if the file does not exist (optional file).
 * Throws on parse errors (malformed JSON should be reported).
 */
export function loadMetaFile(filePath: string): MetaTableInfo[] | null {
  const resolved = path.resolve(filePath);
  if (!fs.existsSync(resolved)) {
    return null;
  }

  const raw = fs.readFileSync(resolved, 'utf-8');
  const parsed = JSON.parse(raw) as MetaTableInfo[];

  // Basic validation: must be an array
  if (!Array.isArray(parsed)) {
    throw new Error(
      `Invalid meta file at ${resolved}: expected a JSON array of table metadata.`,
    );
  }

  return parsed;
}

/**
 * Convenience: load a metaFile and enrich tables in one step.
 * Returns the number of fields enriched, or 0 if the file was not found.
 */
export function enrichPgTypesFromMetaFile(
  tables: Table[],
  filePath: string,
): number {
  const meta = loadMetaFile(filePath);
  if (!meta) return 0;
  return enrichPgTypesFromMeta(tables, meta);
}
