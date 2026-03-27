/**
 * PostgreSQL Type Enrichment
 *
 * Enriches Table objects with PostgreSQL-specific type metadata (pgType, pgAlias, etc.)
 * from an optional introspection JSON file.
 *
 * The JSON file format maps table names to field-level pg type overrides:
 * ```json
 * {
 *   "Document": {
 *     "vectorEmbedding": { "pgType": "vector" },
 *     "tsvContent": { "pgType": "tsvector" },
 *     "geom": { "pgType": "geometry" }
 *   },
 *   "Article": {
 *     "bodyEmbedding": { "pgType": "vector", "typmod": 768 }
 *   }
 * }
 * ```
 *
 * When the file is absent, codegen continues with heuristic-based detection
 * (name patterns, GQL type inference). When present, fields get exact pgType
 * metadata, enabling precise detection of pgvector, tsvector, PostGIS, etc.
 */
import * as fs from 'node:fs';
import path from 'node:path';

import type { FieldType, Table } from '../../types/schema';

/**
 * Per-field PostgreSQL type overrides.
 * Only the fields present in FieldType that are pg-specific.
 */
export interface PgTypeOverride {
  /** PostgreSQL native type (e.g., "vector", "tsvector", "geometry", "text") */
  pgType?: string;
  /** PostgreSQL type alias / domain name */
  pgAlias?: string;
  /** Type modifier from PostgreSQL (e.g., vector dimension) */
  typmod?: number;
}

/**
 * Top-level structure: table name → field name → pg type overrides
 */
export type PgTypesMap = Record<string, Record<string, PgTypeOverride>>;

/**
 * Load a pg-types JSON file from disk.
 * Returns null if the file does not exist (optional file).
 * Throws on parse errors (malformed JSON should be reported).
 */
export function loadPgTypesFile(filePath: string): PgTypesMap | null {
  const resolved = path.resolve(filePath);
  if (!fs.existsSync(resolved)) {
    return null;
  }

  const raw = fs.readFileSync(resolved, 'utf-8');
  const parsed = JSON.parse(raw) as PgTypesMap;

  // Basic validation: must be an object
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new Error(
      `Invalid pg-types file at ${resolved}: expected a JSON object mapping table names to field overrides.`,
    );
  }

  return parsed;
}

/**
 * Enrich Table objects with PostgreSQL type metadata from a PgTypesMap.
 * Mutates the tables array in-place (same pattern as enrichManyToManyRelations).
 *
 * Only merges pg-specific fields (pgType, pgAlias, typmod) — does not overwrite
 * gqlType, isArray, or other introspection-derived data.
 *
 * @returns Number of fields enriched (for logging)
 */
export function enrichPgTypes(tables: Table[], pgTypes: PgTypesMap): number {
  let enriched = 0;

  for (const table of tables) {
    const fieldOverrides = pgTypes[table.name];
    if (!fieldOverrides) continue;

    for (const field of table.fields) {
      const override = fieldOverrides[field.name];
      if (!override) continue;

      const updates: Partial<FieldType> = {};
      if (override.pgType !== undefined) updates.pgType = override.pgType;
      if (override.pgAlias !== undefined) updates.pgAlias = override.pgAlias;
      if (override.typmod !== undefined) updates.typmod = override.typmod;

      if (Object.keys(updates).length > 0) {
        field.type = { ...field.type, ...updates };
        enriched++;
      }
    }
  }

  return enriched;
}

/**
 * Convenience: load a pg-types file and enrich tables in one step.
 * Returns the number of fields enriched, or 0 if the file was not found.
 */
export function enrichPgTypesFromFile(
  tables: Table[],
  filePath: string,
): number {
  const pgTypes = loadPgTypesFile(filePath);
  if (!pgTypes) return 0;
  return enrichPgTypes(tables, pgTypes);
}
