import type { PgTestClient } from 'pgsql-test';
import { resolveTableInfo, TableInfo } from './resolve';

export interface StorageModuleInfo {
  buckets: TableInfo & { table_id: string };
  files: TableInfo & { table_id: string };
  path_shares?: TableInfo & { table_id: string };
}

/**
 * Resolve storage_module schema + table names for a database.
 *
 * Returns the qualified names for buckets, files, and optionally path_shares tables.
 * All resolved dynamically from metaschema_modules_public.storage_module.
 */
export async function resolveStorageModule(
  client: PgTestClient,
  database_id: string,
  scope: string = 'app'
): Promise<StorageModuleInfo> {
  const row = await client.one<{
    buckets_table_id: string;
    files_table_id: string;
    path_shares_table_id: string | null;
  }>(
    `SELECT buckets_table_id, files_table_id, path_shares_table_id
     FROM metaschema_modules_public.storage_module
     WHERE database_id = $1 AND scope = $2`,
    [database_id, scope]
  );

  const [buckets_info, files_info] = await Promise.all([
    resolveTableInfo(client, row.buckets_table_id),
    resolveTableInfo(client, row.files_table_id),
  ]);

  const result: StorageModuleInfo = {
    buckets: { ...buckets_info, table_id: row.buckets_table_id },
    files: { ...files_info, table_id: row.files_table_id },
  };

  if (row.path_shares_table_id) {
    const ps_info = await resolveTableInfo(client, row.path_shares_table_id);
    result.path_shares = { ...ps_info, table_id: row.path_shares_table_id };
  }

  return result;
}
