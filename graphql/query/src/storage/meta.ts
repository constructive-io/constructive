/**
 * Storage-surface discovery from the `_meta` root query.
 *
 * `_meta` is the semantic storage contract: graphile-meta reports each storage
 * plane's paired tables and upload surface from the registry's own FK facts,
 * so resolving here can never disagree with the emitted schema.
 */

import type {
  StorageSurface,
  StorageSurfaceSelector,
  StorageTableRef,
  StorageUploadSurface,
} from './types';

/** The `_meta` selection a dynamic storage client needs. */
export const STORAGE_META_QUERY = `
query StorageMeta {
  _meta {
    tables {
      name
      tableName
      schemaName
      query {
        one
      }
      storage {
        isFilesTable
        isBucketsTable
        filesType
        bucketsType
        downloadUrlField
        upload {
          mutation
          inputType
          payloadType
          bulkMutation
          bulkInputType
          bulkPayloadType
          bulkFileInputType
          bulkFilePayloadType
          requiresOwnerId
        }
      }
    }
  }
}
`.trim();

interface StorageMetaTable {
  name: string;
  tableName: string;
  schemaName: string;
  query?: { one: string | null } | null;
  storage: {
    isFilesTable: boolean;
    isBucketsTable: boolean;
    filesType: string;
    bucketsType: string;
    downloadUrlField: string | null;
    upload: StorageUploadSurface;
  } | null;
}

export interface StorageMetaResult {
  _meta: { tables: StorageMetaTable[] };
}

/**
 * Resolve every storage plane from a `_meta` response. Both sides of a plane
 * (files and buckets tables) report the same surface; this pairs them back up
 * and fails loudly on any inconsistency rather than returning a partial plane.
 */
export function resolveStorageSurfaces(result: StorageMetaResult): StorageSurface[] {
  const tables = result?._meta?.tables;
  if (!Array.isArray(tables)) {
    throw new Error('STORAGE_META_MALFORMED: _meta.tables missing from response');
  }

  const filesByType = new Map<string, StorageMetaTable>();
  const bucketsByType = new Map<string, StorageMetaTable>();

  for (const table of tables) {
    if (!table.storage) continue;
    const { isFilesTable, isBucketsTable, filesType } = table.storage;
    if (isFilesTable) {
      const existing = filesByType.get(filesType);
      if (existing) {
        throw new Error(
          `STORAGE_META_MALFORMED: two files tables (${existing.schemaName}.${existing.tableName}, ` +
          `${table.schemaName}.${table.tableName}) report the same plane ${filesType}`,
        );
      }
      filesByType.set(filesType, table);
    } else if (isBucketsTable) {
      const existing = bucketsByType.get(filesType);
      if (existing) {
        throw new Error(
          `STORAGE_META_MALFORMED: two buckets tables (${existing.schemaName}.${existing.tableName}, ` +
          `${table.schemaName}.${table.tableName}) report the same plane ${filesType}`,
        );
      }
      bucketsByType.set(filesType, table);
    } else {
      throw new Error(
        `STORAGE_META_MALFORMED: table ${table.schemaName}.${table.tableName} carries storage ` +
        `metadata but is neither a files nor a buckets table`,
      );
    }
  }

  for (const [filesType, bucketsTable] of bucketsByType) {
    if (!filesByType.has(filesType)) {
      throw new Error(
        `STORAGE_META_MALFORMED: buckets table ${bucketsTable.schemaName}.${bucketsTable.tableName} ` +
        `reports plane ${filesType} but no files table does`,
      );
    }
  }

  const surfaces: StorageSurface[] = [];
  for (const [filesType, filesTable] of filesByType) {
    const storage = filesTable.storage!;
    const bucketsTable = bucketsByType.get(filesType) ?? null;
    surfaces.push({
      filesType,
      bucketsType: storage.bucketsType,
      filesTable: tableRef(filesTable),
      bucketsTable: bucketsTable ? tableRef(bucketsTable) : null,
      filesNodeField: filesTable.query?.one ?? null,
      downloadUrlField: storage.downloadUrlField,
      upload: storage.upload,
    });
  }
  return surfaces;
}

/**
 * Find exactly one storage plane by semantic coordinates. Throws when the
 * selector matches nothing or more than one plane.
 */
export function findStorageSurface(
  surfaces: StorageSurface[],
  selector: StorageSurfaceSelector,
): StorageSurface {
  if (!selector.filesTable && !selector.filesType && !selector.schemaName) {
    throw new Error('STORAGE_SURFACE_SELECTOR_EMPTY: provide filesTable, filesType, and/or schemaName');
  }

  const matches = surfaces.filter(
    (surface) =>
      (selector.filesTable === undefined || surface.filesTable.tableName === selector.filesTable) &&
      (selector.schemaName === undefined || surface.filesTable.schemaName === selector.schemaName) &&
      (selector.filesType === undefined || surface.filesType === selector.filesType),
  );

  if (matches.length === 0) {
    throw new Error(
      `STORAGE_SURFACE_NOT_FOUND: no storage plane matches ${JSON.stringify(selector)}; ` +
      `known planes: ${surfaces.map((s) => `${s.filesTable.schemaName}.${s.filesTable.tableName}`).join(', ') || '(none)'}`,
    );
  }
  if (matches.length > 1) {
    throw new Error(
      `STORAGE_SURFACE_AMBIGUOUS: ${matches.length} storage planes match ${JSON.stringify(selector)}: ` +
      matches.map((s) => `${s.filesTable.schemaName}.${s.filesTable.tableName}`).join(', '),
    );
  }
  return matches[0];
}

function tableRef(table: StorageMetaTable): StorageTableRef {
  return { name: table.name, tableName: table.tableName, schemaName: table.schemaName };
}
