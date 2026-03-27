/**
 * Dump _meta Table Metadata
 *
 * Generates a _meta.json file by running the codegen pipeline and
 * extracting table/field metadata in MetaTableInfo[] format.
 *
 * When used with a database source (which has MetaSchemaPlugin),
 * this captures the full _meta data including pgType for every field.
 *
 * For sources without _meta (endpoint, file), the output captures
 * whatever metadata is available from introspection alone.
 *
 * The output file can be used as a metaFile sidecar for file/schemaDir
 * modes, giving them the same metadata that database mode gets automatically.
 */
import * as fs from 'node:fs';
import path from 'node:path';

import type { Table } from '../types/schema';
import type { MetaTableInfo } from './introspect/source/types';

/**
 * Build a MetaTableInfo[] from an array of Table objects.
 * Captures field-level pgType info in the same shape as _cachedTablesMeta.
 */
export function buildMetaFromTables(tables: Table[]): MetaTableInfo[] {
  return tables.map((table) => ({
    name: table.name,
    schemaName: 'public', // Default; overridden if _meta provides actual schema
    fields: table.fields.map((field) => ({
      name: field.name,
      type: {
        pgType: field.type.pgType ?? 'unknown',
        gqlType: field.type.gqlType,
        isArray: field.type.isArray,
      },
    })),
    relations: {
      manyToMany: table.relations.manyToMany.map((rel) => ({
        fieldName: rel.fieldName ?? null,
        type: rel.type ?? null,
        junctionTable: { name: rel.junctionTable ?? '' },
        junctionLeftKeyAttributes: (rel.junctionLeftKeyFields ?? []).map((k) => ({ name: k })),
        junctionRightKeyAttributes: (rel.junctionRightKeyFields ?? []).map((k) => ({ name: k })),
        leftKeyAttributes: (rel.leftKeyFields ?? []).map((k) => ({ name: k })),
        rightKeyAttributes: (rel.rightKeyFields ?? []).map((k) => ({ name: k })),
        rightTable: { name: rel.rightTable ?? '' },
      })),
    },
  }));
}

/**
 * Write MetaTableInfo[] to a JSON file.
 */
export async function writeMetaFile(
  meta: MetaTableInfo[],
  outputPath: string,
): Promise<string> {
  const resolved = path.resolve(outputPath);
  const dir = path.dirname(resolved);
  await fs.promises.mkdir(dir, { recursive: true });
  await fs.promises.writeFile(resolved, JSON.stringify(meta, null, 2) + '\n', 'utf-8');
  return resolved;
}
