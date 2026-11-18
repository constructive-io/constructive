import type { LiveMetaTable } from '../extensions/db-tools/live-meta';
import { MetaIndex, normalizeKey, sqlTableName } from '../extensions/db-tools/live-meta-index';

export const SEARCH_CHUNKS = 'search chunks';
export const STORAGE_INTERNALS = 'storage module internals';
export const ENTITY_TYPE = 'the blueprint manages this entity type';

type TableKey = { column: string; target: string };

/** A chunk table stores ordered embedded text and has the backend's key to its parent. */
export function isSearchChunkTable(name: string, columns: string[], keys: TableKey[]): boolean {
  const parent = /^(.+)_chunks$/.exec(name)?.[1];
  if (!parent) return false;
  const fields = new Set(columns.map(normalizeKey));
  return (
    ['chunkindex', 'metadata', 'embedding'].every((field) => fields.has(field)) &&
    (fields.has('content') || fields.has('body')) &&
    keys.some(
      ({ column, target }) =>
        normalizeKey(column) === normalizeKey(`${parent}_id`) &&
        normalizeKey(target) === normalizeKey(parent),
    )
  );
}

function metaKeys(table: LiveMetaTable): TableKey[] {
  return [
    ...(table.constraints?.foreignKey ?? []).flatMap((key) =>
      key.fields.length === 1 ? [{ column: key.fields[0].name, target: key.refTable.name }] : [],
    ),
    ...(table.relations?.belongsTo ?? []).flatMap((rel) =>
      rel.keys.length === 1 ? [{ column: rel.keys[0].name, target: rel.references.name }] : [],
    ),
  ];
}

/** The API tables whose lifecycle is handled by search or storage. */
export function generatedMetaTables(tables: readonly LiveMetaTable[]): Map<LiveMetaTable, string> {
  const index = new MetaIndex(tables);
  const generated = new Map<LiveMetaTable, string>();
  for (const table of tables) {
    const name = sqlTableName(table);
    if (!name) continue;
    const keys = metaKeys(table);
    const sqlKeys = keys.map(({ column, target }) => {
      const parent = index.find(target);
      return { column, target: (parent && sqlTableName(parent)) ?? target };
    });
    const columns = (table.fields ?? []).map((field) => field.columnName ?? field.name);
    if (isSearchChunkTable(name, columns, sqlKeys)) {
      generated.set(table, SEARCH_CHUNKS);
      continue;
    }
    const storage = /^(.*)file_(events|path_shares)$/.exec(name);
    if (!storage) continue;
    const bucketName = `${storage[1]}buckets`;
    if (
      keys.some(({ column, target }) => {
        if (normalizeKey(column) !== 'bucketid') return false;
        const parent = index.find(target);
        return parent?.storage?.isBucketsTable && sqlTableName(parent) === bucketName;
      })
    ) {
      generated.set(table, STORAGE_INTERNALS);
    }
  }
  return generated;
}
