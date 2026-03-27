/**
 * Dump PostgreSQL Type Metadata
 *
 * Generates a pg-types.json file by running the codegen pipeline and
 * extracting the Table/Field metadata. When used with a database source
 * (which has access to PostGraphile's pg catalog), this captures pgType
 * information that isn't available from standard GraphQL introspection.
 *
 * For sources that don't provide pgType (endpoint, file), the output
 * serves as a template: fields are listed with `pgType: null` so the
 * user can fill in the correct values manually.
 */
import * as fs from 'node:fs';
import path from 'node:path';

import type { Table } from '../types/schema';
import type { PgTypesMap } from './introspect/enrich-pg-types';

/**
 * Build a PgTypesMap from an array of Table objects.
 * Includes all fields, even those without pgType, so the output
 * can serve as a template for manual editing.
 */
export function buildPgTypesMap(tables: Table[]): PgTypesMap {
  const result: PgTypesMap = {};

  for (const table of tables) {
    const fieldMap: Record<string, { pgType?: string | null; pgAlias?: string | null; typmod?: number | null }> = {};

    for (const field of table.fields) {
      const entry: { pgType?: string | null; pgAlias?: string | null; typmod?: number | null } = {};

      // Always include pgType (even if null — serves as template placeholder)
      entry.pgType = field.type.pgType ?? null;

      // Only include pgAlias and typmod if they have values
      if (field.type.pgAlias) entry.pgAlias = field.type.pgAlias;
      if (field.type.typmod != null) entry.typmod = field.type.typmod;

      fieldMap[field.name] = entry;
    }

    if (Object.keys(fieldMap).length > 0) {
      result[table.name] = fieldMap;
    }
  }

  return result;
}

/**
 * Write a PgTypesMap to a JSON file.
 */
export async function writePgTypesFile(
  pgTypes: PgTypesMap,
  outputPath: string,
): Promise<string> {
  const resolved = path.resolve(outputPath);
  const dir = path.dirname(resolved);
  await fs.promises.mkdir(dir, { recursive: true });
  await fs.promises.writeFile(resolved, JSON.stringify(pgTypes, null, 2) + '\n', 'utf-8');
  return resolved;
}
