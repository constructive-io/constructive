/**
 * Storage Module Loader
 *
 * Resolves immutable storage-module routing metadata through the privileged
 * control-plane tenant pool. Graphile receives the normalized descriptors at
 * build time, so its least-privilege runtime pool never reads metaschema
 * configuration with `withPgClient(null)`.
 */

import { quoteQualifiedSqlIdentifier } from '../sql-identifiers';
import type { StorageConfig, StorageModuleConfig } from '../types';
import { createModuleLoader } from './create-loader';
import type { LoaderContext, ModuleLoader } from './types';

const DEFAULT_UPLOAD_URL_EXPIRY_SECONDS = 900;
const DEFAULT_DOWNLOAD_URL_EXPIRY_SECONDS = 3600;
const DEFAULT_MAX_FILE_SIZE = 200 * 1024 * 1024;
const DEFAULT_MAX_FILENAME_LENGTH = 1024;
const DEFAULT_CACHE_TTL_SECONDS = process.env.NODE_ENV === 'development' ? 300 : 3600;
const DEFAULT_MAX_BULK_FILES = 100;
const DEFAULT_MAX_BULK_TOTAL_SIZE = 1024 * 1024 * 1024;

export const STORAGE_MODULE_SQL = `
  SELECT
    sm.id,
    sm.scope,
    sm.entity_table_id,
    bs.schema_name AS buckets_schema,
    bt.name AS buckets_table,
    fs.schema_name AS files_schema,
    ft.name AS files_table,
    sm.endpoint,
    sm.public_url_prefix,
    sm.provider,
    sm.allowed_origins,
    sm.upload_url_expiry_seconds,
    sm.download_url_expiry_seconds,
    sm.default_max_file_size,
    sm.max_filename_length,
    sm.cache_ttl_seconds,
    sm.max_bulk_files,
    sm.max_bulk_total_size,
    sm.has_path_shares,
    es.schema_name AS entity_schema,
    et.name AS entity_table
  FROM metaschema_modules_public.storage_module sm
  JOIN metaschema_public.table bt
    ON bt.id = sm.buckets_table_id
   AND bt.database_id = sm.database_id
  JOIN metaschema_public.schema bs
    ON bs.id = bt.schema_id
   AND bs.database_id = sm.database_id
  JOIN metaschema_public.table ft
    ON ft.id = sm.files_table_id
   AND ft.database_id = sm.database_id
  JOIN metaschema_public.schema fs
    ON fs.id = ft.schema_id
   AND fs.database_id = sm.database_id
  LEFT JOIN metaschema_public.table et
    ON et.id = sm.entity_table_id
   AND et.database_id = sm.database_id
  LEFT JOIN metaschema_public.schema es
    ON es.id = et.schema_id
   AND es.database_id = sm.database_id
  WHERE sm.database_id = $1
  ORDER BY sm.scope, sm.id
`;

interface StorageModuleRow {
  id: string;
  scope: string;
  entity_table_id: string | null;
  buckets_schema: string;
  buckets_table: string;
  files_schema: string;
  files_table: string;
  endpoint: string | null;
  public_url_prefix: string | null;
  provider: string | null;
  allowed_origins: string[] | null;
  upload_url_expiry_seconds: number | string | null;
  download_url_expiry_seconds: number | string | null;
  default_max_file_size: number | string | null;
  max_filename_length: number | string | null;
  cache_ttl_seconds: number | string | null;
  max_bulk_files: number | string | null;
  max_bulk_total_size: number | string | null;
  has_path_shares: boolean | null;
  entity_schema: string | null;
  entity_table: string | null;
}

const numberOr = (value: number | string | null, fallback: number): number => {
  if (value == null) return fallback;
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 0) {
    throw new Error(`Invalid storage module numeric setting '${value}'`);
  }
  return parsed;
};

export const normalizeStorageModule = (row: StorageModuleRow): StorageModuleConfig => ({
  id: row.id,
  bucketsQualifiedName: quoteQualifiedSqlIdentifier(
    row.buckets_schema,
    row.buckets_table,
    'storage buckets table'
  ),
  filesQualifiedName: quoteQualifiedSqlIdentifier(
    row.files_schema,
    row.files_table,
    'storage files table'
  ),
  schemaName: row.buckets_schema,
  bucketsTableName: row.buckets_table,
  filesTableName: row.files_table,
  scope: row.scope,
  entityTableId: row.entity_table_id,
  entityQualifiedName: row.entity_schema && row.entity_table
    ? quoteQualifiedSqlIdentifier(
        row.entity_schema,
        row.entity_table,
        'storage entity table'
      )
    : null,
  endpoint: row.endpoint,
  publicUrlPrefix: row.public_url_prefix,
  provider: row.provider,
  allowedOrigins: row.allowed_origins,
  uploadUrlExpirySeconds: numberOr(
    row.upload_url_expiry_seconds,
    DEFAULT_UPLOAD_URL_EXPIRY_SECONDS
  ),
  downloadUrlExpirySeconds: numberOr(
    row.download_url_expiry_seconds,
    DEFAULT_DOWNLOAD_URL_EXPIRY_SECONDS
  ),
  defaultMaxFileSize: numberOr(row.default_max_file_size, DEFAULT_MAX_FILE_SIZE),
  maxFilenameLength: numberOr(row.max_filename_length, DEFAULT_MAX_FILENAME_LENGTH),
  cacheTtlSeconds: numberOr(row.cache_ttl_seconds, DEFAULT_CACHE_TTL_SECONDS),
  hasPathShares: row.has_path_shares ?? false,
  maxBulkFiles: numberOr(row.max_bulk_files, DEFAULT_MAX_BULK_FILES),
  maxBulkTotalSize: numberOr(row.max_bulk_total_size, DEFAULT_MAX_BULK_TOTAL_SIZE)
});

export const storageLoader: ModuleLoader<StorageConfig> = createModuleLoader<StorageConfig>({
  name: 'storage',
  ttlMs: 60_000,
  async resolve(ctx: LoaderContext) {
    const result = await ctx.tenantPool.query<StorageModuleRow>(
      STORAGE_MODULE_SQL,
      [ctx.databaseId]
    );
    if (result.rows.length === 0) return undefined;
    return { modules: result.rows.map(normalizeStorageModule) };
  }
});
