import { Logger } from '@pgpmjs/logger';
import { LRUCache } from 'lru-cache';
import type { StorageModuleConfig, BucketConfig } from './types';

const log = new Logger('graphile-presigned-url:cache');

// --- Defaults ---
const DEFAULT_UPLOAD_URL_EXPIRY_SECONDS = 900; // 15 minutes
const DEFAULT_DOWNLOAD_URL_EXPIRY_SECONDS = 3600; // 1 hour
const DEFAULT_MAX_FILE_SIZE = 200 * 1024 * 1024; // 200MB
const DEFAULT_MAX_FILENAME_LENGTH = 1024;
const DEFAULT_CACHE_TTL_SECONDS = process.env.NODE_ENV === 'development' ? 300 : 3600;

const FIVE_MINUTES_MS = 1000 * 60 * 5;
const ONE_HOUR_MS = 1000 * 60 * 60;

/**
 * LRU cache for per-database StorageModuleConfig.
 *
 * Each PostGraphile instance serves a single database, but the presigned URL
 * plugin needs to know the generated table names (buckets, files,
 * upload_requests) and their schemas. This cache avoids re-querying metaschema
 * on every request.
 *
 * Pattern: same as graphile-cache's LRU with TTL-based eviction.
 */
const storageModuleCache = new LRUCache<string, StorageModuleConfig>({
  max: 50,
  ttl: process.env.NODE_ENV === 'development' ? FIVE_MINUTES_MS : ONE_HOUR_MS,
  updateAgeOnGet: true,
});

/**
 * SQL query to resolve storage module config for a database.
 *
 * Joins storage_module → table → schema to get fully-qualified table names.
 */
const STORAGE_MODULE_QUERY = `
  SELECT
    sm.id,
    bs.schema_name AS buckets_schema,
    bt.name AS buckets_table,
    fs.schema_name AS files_schema,
    ft.name AS files_table,
    urs.schema_name AS upload_requests_schema,
    urt.name AS upload_requests_table,
    sm.upload_url_expiry_seconds,
    sm.download_url_expiry_seconds,
    sm.default_max_file_size,
    sm.max_filename_length,
    sm.cache_ttl_seconds
  FROM metaschema_modules_public.storage_module sm
  JOIN metaschema_public.table bt ON bt.id = sm.buckets_table_id
  JOIN metaschema_public.schema bs ON bs.id = bt.schema_id
  JOIN metaschema_public.table ft ON ft.id = sm.files_table_id
  JOIN metaschema_public.schema fs ON fs.id = ft.schema_id
  JOIN metaschema_public.table urt ON urt.id = sm.upload_requests_table_id
  JOIN metaschema_public.schema urs ON urs.id = urt.schema_id
  WHERE sm.database_id = $1
  LIMIT 1
`;

interface StorageModuleRow {
  id: string;
  buckets_schema: string;
  buckets_table: string;
  files_schema: string;
  files_table: string;
  upload_requests_schema: string;
  upload_requests_table: string;
  upload_url_expiry_seconds: number | null;
  download_url_expiry_seconds: number | null;
  default_max_file_size: number | null;
  max_filename_length: number | null;
  cache_ttl_seconds: number | null;
}

/**
 * Resolve the storage module config for a database, using the LRU cache.
 *
 * @param pgClient - A pg client from the Graphile context (withPgClient or pgClient)
 * @param databaseId - The metaschema database UUID
 * @returns StorageModuleConfig or null if no storage module is provisioned
 */
export async function getStorageModuleConfig(
  pgClient: { query: (sql: string, params: unknown[]) => Promise<{ rows: unknown[] }> },
  databaseId: string,
): Promise<StorageModuleConfig | null> {
  const cacheKey = `storage:${databaseId}`;
  const cached = storageModuleCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  log.debug(`Cache miss for database ${databaseId}, querying metaschema...`);

  const result = await pgClient.query(STORAGE_MODULE_QUERY, [databaseId]);
  if (result.rows.length === 0) {
    log.warn(`No storage module found for database ${databaseId}`);
    return null;
  }

  const row = result.rows[0] as StorageModuleRow;
  const cacheTtlSeconds = row.cache_ttl_seconds ?? DEFAULT_CACHE_TTL_SECONDS;

  const config: StorageModuleConfig = {
    id: row.id,
    bucketsQualifiedName: `"${row.buckets_schema}"."${row.buckets_table}"`,
    filesQualifiedName: `"${row.files_schema}"."${row.files_table}"`,
    uploadRequestsQualifiedName: `"${row.upload_requests_schema}"."${row.upload_requests_table}"`,
    schemaName: row.buckets_schema,
    bucketsTableName: row.buckets_table,
    filesTableName: row.files_table,
    uploadRequestsTableName: row.upload_requests_table,
    uploadUrlExpirySeconds: row.upload_url_expiry_seconds ?? DEFAULT_UPLOAD_URL_EXPIRY_SECONDS,
    downloadUrlExpirySeconds: row.download_url_expiry_seconds ?? DEFAULT_DOWNLOAD_URL_EXPIRY_SECONDS,
    defaultMaxFileSize: row.default_max_file_size ?? DEFAULT_MAX_FILE_SIZE,
    maxFilenameLength: row.max_filename_length ?? DEFAULT_MAX_FILENAME_LENGTH,
    cacheTtlSeconds,
  };

  storageModuleCache.set(cacheKey, config);
  log.debug(`Cached storage config for database ${databaseId}: ${config.bucketsQualifiedName}`);

  return config;
}

// --- Bucket metadata cache ---

/**
 * LRU cache for per-database bucket metadata.
 *
 * Buckets are essentially static config — created once and rarely changed.
 * Caching avoids a DB query on every requestUploadUrl call. The bucket
 * lookup in the plugin runs under RLS, but since AuthzEntityMembership
 * grants all org members access to all org buckets, and the cached data
 * is just config (mime types, size limits), bypassing RLS on cache hits
 * is safe. The important RLS is on the files table (INSERT/UPDATE),
 * which is never cached.
 *
 * Keys: `bucket:${databaseId}:${bucketKey}`
 * TTL: same as storage module cache (5min dev / 1hr prod)
 */
const bucketCache = new LRUCache<string, BucketConfig>({
  max: 500, // many buckets across many databases
  ttl: process.env.NODE_ENV === 'development' ? FIVE_MINUTES_MS : ONE_HOUR_MS,
  updateAgeOnGet: true,
});

/**
 * Resolve bucket metadata for a given database + bucket key, using the LRU cache.
 *
 * On cache miss, queries the bucket table (RLS-enforced via pgSettings on
 * the pgClient). On cache hit, returns the cached metadata directly.
 *
 * @param pgClient - A pg client from the Graphile context
 * @param storageConfig - The resolved StorageModuleConfig for this database
 * @param databaseId - The metaschema database UUID (used as cache key prefix)
 * @param bucketKey - The bucket key (e.g., "public", "private")
 * @returns BucketConfig or null if the bucket doesn't exist / isn't accessible
 */
export async function getBucketConfig(
  pgClient: { query: (sql: string, params: unknown[]) => Promise<{ rows: unknown[] }> },
  storageConfig: StorageModuleConfig,
  databaseId: string,
  bucketKey: string,
): Promise<BucketConfig | null> {
  const cacheKey = `bucket:${databaseId}:${bucketKey}`;
  const cached = bucketCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  log.debug(`Bucket cache miss for ${databaseId}:${bucketKey}, querying DB...`);

  const result = await pgClient.query(
    `SELECT id, key, type, is_public, owner_id, allowed_mime_types, max_file_size
     FROM ${storageConfig.bucketsQualifiedName}
     WHERE key = $1
     LIMIT 1`,
    [bucketKey],
  );

  if (result.rows.length === 0) {
    return null;
  }

  const row = result.rows[0] as {
    id: string;
    key: string;
    type: string;
    is_public: boolean;
    owner_id: string;
    allowed_mime_types: string[] | null;
    max_file_size: number | null;
  };

  const config: BucketConfig = {
    id: row.id,
    key: row.key,
    type: row.type as BucketConfig['type'],
    is_public: row.is_public,
    owner_id: row.owner_id,
    allowed_mime_types: row.allowed_mime_types,
    max_file_size: row.max_file_size,
  };

  bucketCache.set(cacheKey, config);
  log.debug(`Cached bucket config for ${databaseId}:${bucketKey} (id=${config.id})`);

  return config;
}

/**
 * Clear the storage module cache AND bucket cache.
 * Useful for testing or schema changes.
 */
export function clearStorageModuleCache(): void {
  storageModuleCache.clear();
  bucketCache.clear();
}

/**
 * Clear cached bucket entries for a specific database.
 * Useful when bucket config changes are detected.
 */
export function clearBucketCache(databaseId?: string): void {
  if (!databaseId) {
    bucketCache.clear();
    return;
  }
  // Evict all entries for this database
  const prefix = `bucket:${databaseId}:`;
  for (const key of bucketCache.keys()) {
    if (key.startsWith(prefix)) {
      bucketCache.delete(key);
    }
  }
}
