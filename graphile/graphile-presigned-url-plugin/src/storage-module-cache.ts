import { Logger } from '@pgpmjs/logger';
import { LRUCache } from 'lru-cache';
import { QuoteUtils } from '@pgsql/quotes';
import type { StorageModuleConfig, BucketConfig } from './types';

const log = new Logger('graphile-presigned-url:cache');

// --- Defaults ---
const DEFAULT_UPLOAD_URL_EXPIRY_SECONDS = 900; // 15 minutes
const DEFAULT_DOWNLOAD_URL_EXPIRY_SECONDS = 3600; // 1 hour
const DEFAULT_MAX_FILE_SIZE = 200 * 1024 * 1024; // 200MB
const DEFAULT_MAX_FILENAME_LENGTH = 1024;
const DEFAULT_CACHE_TTL_SECONDS = process.env.NODE_ENV === 'development' ? 300 : 3600;
const DEFAULT_MAX_BULK_FILES = 100;
const DEFAULT_MAX_BULK_TOTAL_SIZE = 1073741824; // 1GB

const FIVE_MINUTES_MS = 1000 * 60 * 5;
const ONE_HOUR_MS = 1000 * 60 * 60;

/**
 * LRU cache for per-database StorageModuleConfig.
 *
 * Each PostGraphile instance serves a single database, but the presigned URL
 * plugin needs to know the generated table names (buckets, files)
 * and their schemas. This cache avoids re-querying metaschema
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
 * SQL query to resolve the app-level storage module config for a database.
 *
 * Joins storage_module → table → schema to get fully-qualified table names.
 * Filters to app-level (scope = 'app') by default.
 *
 * Requires the multi-scope schema (scope column on storage_module).
 */
const APP_STORAGE_MODULE_QUERY = `
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
    NULL AS entity_schema,
    NULL AS entity_table
  FROM metaschema_modules_public.storage_module sm
  JOIN metaschema_public.table bt ON bt.id = sm.buckets_table_id
  JOIN metaschema_public.schema bs ON bs.id = bt.schema_id
  JOIN metaschema_public.table ft ON ft.id = sm.files_table_id
  JOIN metaschema_public.schema fs ON fs.id = ft.schema_id
  WHERE sm.database_id = $1
    AND sm.scope = 'app'
  LIMIT 1
`;

/**
 * SQL query to resolve ALL storage modules for a database (app-level + entity-scoped).
 *
 * Returns all storage modules with their entity table names for ownerId resolution.
 * Requires the multi-scope schema.
 */
const ALL_STORAGE_MODULES_QUERY = `
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
  JOIN metaschema_public.table bt ON bt.id = sm.buckets_table_id
  JOIN metaschema_public.schema bs ON bs.id = bt.schema_id
  JOIN metaschema_public.table ft ON ft.id = sm.files_table_id
  JOIN metaschema_public.schema fs ON fs.id = ft.schema_id
  LEFT JOIN metaschema_public.table et ON et.id = sm.entity_table_id
  LEFT JOIN metaschema_public.schema es ON es.id = et.schema_id
  WHERE sm.database_id = $1
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
  upload_url_expiry_seconds: number | null;
  download_url_expiry_seconds: number | null;
  default_max_file_size: number | null;
  max_filename_length: number | null;
  cache_ttl_seconds: number | null;
  max_bulk_files: number | null;
  max_bulk_total_size: number | null;
  has_path_shares: boolean;
  entity_schema: string | null;
  entity_table: string | null;
}

/**
 * Build a StorageModuleConfig from a raw DB row.
 */
function buildConfig(row: StorageModuleRow): StorageModuleConfig {
  const cacheTtlSeconds = row.cache_ttl_seconds ?? DEFAULT_CACHE_TTL_SECONDS;
  return {
    id: row.id,
    bucketsQualifiedName: QuoteUtils.quoteQualifiedIdentifier(row.buckets_schema, row.buckets_table),
    filesQualifiedName: QuoteUtils.quoteQualifiedIdentifier(row.files_schema, row.files_table),
    schemaName: row.buckets_schema,
    bucketsTableName: row.buckets_table,
    filesTableName: row.files_table,
    scope: row.scope,
    entityTableId: row.entity_table_id,
    entityQualifiedName: row.entity_schema && row.entity_table
      ? QuoteUtils.quoteQualifiedIdentifier(row.entity_schema, row.entity_table)
      : null,
    endpoint: row.endpoint,
    publicUrlPrefix: row.public_url_prefix,
    provider: row.provider,
    allowedOrigins: row.allowed_origins,
    uploadUrlExpirySeconds: row.upload_url_expiry_seconds ?? DEFAULT_UPLOAD_URL_EXPIRY_SECONDS,
    downloadUrlExpirySeconds: row.download_url_expiry_seconds ?? DEFAULT_DOWNLOAD_URL_EXPIRY_SECONDS,
    defaultMaxFileSize: row.default_max_file_size ?? DEFAULT_MAX_FILE_SIZE,
    maxFilenameLength: row.max_filename_length ?? DEFAULT_MAX_FILENAME_LENGTH,
    cacheTtlSeconds,
    hasPathShares: row.has_path_shares ?? false,
    maxBulkFiles: row.max_bulk_files ?? DEFAULT_MAX_BULK_FILES,
    maxBulkTotalSize: row.max_bulk_total_size ?? DEFAULT_MAX_BULK_TOTAL_SIZE,
  };
}

/**
 * Resolve the app-level storage module config for a database, using the LRU cache.
 *
 * This is the default path when no ownerId is provided. It returns the
 * storage module with scope = 'app' (app-level / database-wide).
 *
 * @param pgClient - A pg client from the Graphile context (withPgClient or pgClient)
 * @param databaseId - The metaschema database UUID
 * @returns StorageModuleConfig or null if no storage module is provisioned
 */
export async function getStorageModuleConfig(
  pgClient: { query: (opts: { text: string; values?: unknown[] }) => Promise<{ rows: unknown[] }> },
  databaseId: string,
): Promise<StorageModuleConfig | null> {
  const cacheKey = `storage:${databaseId}:app`;
  const cached = storageModuleCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  log.debug(`Cache miss for app-level storage in database ${databaseId}, querying metaschema...`);

  const result = await pgClient.query({ text: APP_STORAGE_MODULE_QUERY, values: [databaseId] });

  if (result.rows.length === 0) {
    log.warn(`No app-level storage module found for database ${databaseId}`);
    return null;
  }

  const config = buildConfig(result.rows[0] as StorageModuleRow);
  storageModuleCache.set(cacheKey, config);
  log.debug(`Cached app-level storage config for database ${databaseId}: ${config.bucketsQualifiedName}`);

  return config;
}

/**
 * Resolve the storage module config for a specific owner entity.
 *
 * When ownerId is provided, this function:
 * 1. Loads ALL storage modules for the database (cached)
 * 2. Finds which entity-scoped module contains the ownerId in its entity table
 * 3. Returns that module's config
 *
 * This is the core of Option C — the ownerId tells us which scope to use.
 *
 * @param pgClient - A pg client from the Graphile context
 * @param databaseId - The metaschema database UUID
 * @param ownerId - The entity instance UUID (e.g., a data room ID, team ID)
 * @returns StorageModuleConfig or null if no matching module found
 */
export async function getStorageModuleConfigForOwner(
  pgClient: { query: (opts: { text: string; values?: unknown[] }) => Promise<{ rows: unknown[] }> },
  databaseId: string,
  ownerId: string,
): Promise<StorageModuleConfig | null> {
  // Check if we already have a cached mapping for this ownerId
  const ownerCacheKey = `storage:${databaseId}:owner:${ownerId}`;
  const cachedOwner = storageModuleCache.get(ownerCacheKey);
  if (cachedOwner) {
    return cachedOwner;
  }

  // Load all storage modules for this database
  const allModulesCacheKey = `storage:${databaseId}:all`;
  let allConfigs: StorageModuleConfig[];
  const cachedAll = storageModuleCache.get(allModulesCacheKey);
  if (cachedAll) {
    // We stored a sentinel; re-derive from individual caches
    // Actually, let's just query fresh — this is the cache-miss path
    allConfigs = [];
  } else {
    allConfigs = [];
  }

  if (allConfigs.length === 0) {
    log.debug(`Loading all storage modules for database ${databaseId} to resolve ownerId ${ownerId}`);
    const result = await pgClient.query({ text: ALL_STORAGE_MODULES_QUERY, values: [databaseId] });
    allConfigs = (result.rows as StorageModuleRow[]).map(buildConfig);

    // Cache each individual config by its scope
    for (const config of allConfigs) {
      const key = `storage:${databaseId}:scope:${config.scope}`;
      storageModuleCache.set(key, config);
    }
  }

  // Find entity-scoped modules and probe their entity tables for the ownerId
  const entityModules = allConfigs.filter((c) => c.entityQualifiedName !== null);

  for (const mod of entityModules) {
    const probeResult = await pgClient.query({
      text: `SELECT 1 FROM ${mod.entityQualifiedName} WHERE id = $1 LIMIT 1`,
      values: [ownerId],
    });
    if (probeResult.rows.length > 0) {
      // Found the matching module — cache the ownerId→module mapping
      storageModuleCache.set(ownerCacheKey, mod);
      log.debug(
        `Resolved ownerId ${ownerId} to storage module ${mod.id} ` +
        `(scope=${mod.scope}, table=${mod.bucketsQualifiedName})`,
      );
      return mod;
    }
  }

  log.warn(`No entity-scoped storage module found for ownerId ${ownerId} in database ${databaseId}`);
  return null;
}

/**
 * Resolve the storage module that owns a specific file by probing all file tables.
 *
 * Since UUIDs are globally unique, exactly one table will contain the file.
 *
 * @param pgClient - A pg client from the Graphile context
 * @param databaseId - The metaschema database UUID
 * @param fileId - The file UUID to look up
 * @returns Object with the storage config and file row, or null if not found
 */
export async function resolveStorageModuleByFileId(
  pgClient: { query: (opts: { text: string; values?: unknown[] }) => Promise<{ rows: unknown[] }> },
  databaseId: string,
  fileId: string,
): Promise<{ storageConfig: StorageModuleConfig; file: { id: string; key: string; mime_type: string; bucket_id: string } } | null> {
  // Load all storage modules for this database
  log.debug(`Resolving file ${fileId} across all storage modules for database ${databaseId}`);

  const allConfigs = (await pgClient.query({ text: ALL_STORAGE_MODULES_QUERY, values: [databaseId] })).rows.map(
    (row: unknown) => buildConfig(row as StorageModuleRow),
  );

  // Probe each module's files table for the fileId
  for (const config of allConfigs) {
    const fileResult = await pgClient.query({
      text: `SELECT id, key, mime_type, bucket_id
       FROM ${config.filesQualifiedName}
       WHERE id = $1
       LIMIT 1`,
      values: [fileId],
    });
    if (fileResult.rows.length > 0) {
      const file = fileResult.rows[0] as { id: string; key: string; mime_type: string; bucket_id: string };
      return { storageConfig: config, file };
    }
  }

  return null;
}

/**
 * Load all storage modules for a database, using the LRU cache.
 *
 * Returns an array of all StorageModuleConfig entries (app-level + entity-scoped).
 * The result is cached per-database so subsequent calls avoid the DB query.
 */
export async function loadAllStorageModules(
  pgClient: { query: (opts: { text: string; values?: unknown[] }) => Promise<{ rows: unknown[] }> },
  databaseId: string,
): Promise<StorageModuleConfig[]> {
  const cacheKey = `storage:${databaseId}:all-list`;
  const cached = storageModuleCache.get(cacheKey);
  if (cached) {
    return (cached as any)._allConfigs as StorageModuleConfig[];
  }

  log.debug(`Loading all storage modules for database ${databaseId}`);
  const result = await pgClient.query({ text: ALL_STORAGE_MODULES_QUERY, values: [databaseId] });
  const configs = (result.rows as StorageModuleRow[]).map(buildConfig);

  // Cache each individual config by its scope
  for (const config of configs) {
    const key = `storage:${databaseId}:scope:${config.scope}`;
    storageModuleCache.set(key, config);
  }

  // Store the full list under a sentinel key (only if non-empty to avoid caching failed lookups)
  if (configs.length > 0) {
    const sentinel = { ...configs[0], _allConfigs: configs } as any;
    storageModuleCache.set(cacheKey, sentinel);
  }

  return configs;
}

/**
 * Strip a tenant hash prefix from a physical schema name, returning the
 * logical schema name.
 *
 * Hashed multi-tenant schemas are named like
 * `marketplace-db-tenant1-5e6b13b2-app-public`, where `-5e6b13b2-` is an
 * 8-hex-char tenant hash separating the tenant prefix from the logical schema
 * suffix (`app-public`). This removes everything up to and including the first
 * such hash segment. If no hash segment is present (e.g. a plain schema like
 * `app_public` or a control-plane schema like `metaschema_public`), the name
 * is returned unchanged.
 *
 * (Duplicated locally rather than imported to avoid a cross-package dependency
 * for a one-line helper.)
 */
function stripSchemaHashPrefix(name: string): string {
  const match = /-[0-9a-f]{8}-/.exec(name);
  return match ? name.slice(match.index + match[0].length) : name;
}

/**
 * Resolve the storage module config from a PostGraphile pgCodec.
 *
 * Matches the codec's schema + table name against cached storage modules.
 * Works for both files codecs (@storageFiles) and buckets codecs (@storageBuckets).
 *
 * Matching is two-tier:
 *   1. Exact physical schema match — used for single-tenant / non-pooled
 *      instances where the codec's build-time schema equals the request
 *      tenant's actual schema. Keeps existing behavior unchanged.
 *   2. Logical schema match — strip the tenant hash prefix from BOTH the
 *      codec's schema and each config's schema before comparing. Under
 *      blueprint pooling a single shared instance serves every tenant of a
 *      given schema-shape, so the codec's build-time `schemaName` belongs to
 *      the representative tenant while `allConfigs` carry the request tenant's
 *      actual (differently-hashed) schema. Both share the same logical suffix
 *      (e.g. `app-public`). Safe because `allConfigs` is already filtered to a
 *      single databaseId, so (tableName, logicalSchema) uniquely identifies a
 *      module.
 *
 * @param pgCodec - The PostGraphile codec (has extensions.pg.schemaName, name)
 * @param allConfigs - All storage module configs for this database
 * @returns The matching StorageModuleConfig or null
 */
export function resolveStorageConfigFromCodec(
  pgCodec: { name: string; extensions?: { pg?: { schemaName?: string; name?: string } }; sqlType?: string },
  allConfigs: StorageModuleConfig[],
): StorageModuleConfig | null {
  const schemaName = pgCodec.extensions?.pg?.schemaName;
  const tableName = pgCodec.extensions?.pg?.name ?? pgCodec.name;

  if (!schemaName || !tableName) return null;

  // Priority 1: exact physical schema match (non-pooled / single-tenant).
  const exact = allConfigs.find((c) =>
    (c.filesTableName === tableName && c.schemaName === schemaName) ||
    (c.bucketsTableName === tableName && c.schemaName === schemaName),
  );
  if (exact) return exact;

  // Priority 2: logical schema match (blueprint pooling — the codec's
  // build-time schema belongs to the representative tenant; strip the tenant
  // hash from both sides so the shared logical suffix lines up).
  const logicalSchema = stripSchemaHashPrefix(schemaName);
  return allConfigs.find((c) => {
    const configLogicalSchema = stripSchemaHashPrefix(c.schemaName);
    return (
      (c.filesTableName === tableName && configLogicalSchema === logicalSchema) ||
      (c.bucketsTableName === tableName && configLogicalSchema === logicalSchema)
    );
  }) || null;
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
 * Keys: `bucket:${databaseId}:${storageModuleId}:${bucketKey}`
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
 * @param storageConfig - The resolved StorageModuleConfig for this database/scope
 * @param databaseId - The metaschema database UUID (used as cache key prefix)
 * @param bucketKey - The bucket key (e.g., "public", "private")
 * @param ownerId - Optional owner entity ID for entity-scoped bucket lookup
 * @returns BucketConfig or null if the bucket doesn't exist / isn't accessible
 */
export async function getBucketConfig(
  pgClient: { query: (opts: { text: string; values?: unknown[] }) => Promise<{ rows: unknown[] }> },
  storageConfig: StorageModuleConfig,
  databaseId: string,
  bucketKey: string,
  ownerId?: string,
): Promise<BucketConfig | null> {
  const cacheKey = `bucket:${databaseId}:${storageConfig.id}:${bucketKey}${ownerId ? `:${ownerId}` : ''}`;
  const cached = bucketCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  log.debug(`Bucket cache miss for ${databaseId}:${bucketKey}${ownerId ? ` (owner=${ownerId})` : ''}, querying DB...`);

  // Entity-scoped buckets use (owner_id, key) composite lookup;
  // app-level buckets just use key.
  const isEntityScoped = storageConfig.scope !== 'app';
  const hasOwner = ownerId && isEntityScoped;
  const result = await pgClient.query({
    text: hasOwner
      ? `SELECT id, key, type, is_public, owner_id, allowed_mime_types, max_file_size, allow_custom_keys
         FROM ${storageConfig.bucketsQualifiedName}
         WHERE key = $1 AND owner_id = $2
         LIMIT 1`
      : `SELECT id, key, type, is_public, ${isEntityScoped ? 'owner_id,' : ''} allowed_mime_types, max_file_size, allow_custom_keys
         FROM ${storageConfig.bucketsQualifiedName}
         WHERE key = $1
         LIMIT 1`,
    values: hasOwner ? [bucketKey, ownerId] : [bucketKey],
  });

  if (result.rows.length === 0) {
    return null;
  }

  const row = result.rows[0] as {
    id: string;
    key: string;
    type: string;
    is_public: boolean;
    owner_id: string | null;
    allowed_mime_types: string[] | null;
    max_file_size: number | null;
    allow_custom_keys: boolean;
  };

  const config: BucketConfig = {
    id: row.id,
    key: row.key,
    type: row.type as BucketConfig['type'],
    is_public: row.is_public,
    owner_id: row.owner_id ?? null,
    allowed_mime_types: row.allowed_mime_types,
    max_file_size: row.max_file_size,
    allow_custom_keys: row.allow_custom_keys ?? false,
  };

  bucketCache.set(cacheKey, config);
  log.debug(`Cached bucket config for ${databaseId}:${bucketKey} (id=${config.id}, scope=${storageConfig.scope})`);

  return config;
}

// --- S3 bucket existence cache ---

/**
 * In-memory set of S3 bucket names that are known to exist.
 *
 * Used by the lazy provisioning logic in the presigned URL plugin:
 * before generating a presigned PUT URL, the plugin checks this set.
 * If the bucket name is absent, it calls `ensureBucketProvisioned`
 * to create the S3 bucket, then adds the name here. Subsequent
 * requests for the same bucket skip the provisioning entirely.
 *
 * No TTL needed — S3 buckets are never deleted during normal operation.
 * The set resets on server restart, which is fine because the
 * provisioner's createBucket is idempotent (handles "already exists").
 */
const provisionedBuckets = new Set<string>();

/**
 * Check whether an S3 bucket has already been provisioned (cached).
 */
export function isS3BucketProvisioned(s3BucketName: string): boolean {
  return provisionedBuckets.has(s3BucketName);
}

/**
 * Mark an S3 bucket as provisioned in the in-memory cache.
 */
export function markS3BucketProvisioned(s3BucketName: string): void {
  provisionedBuckets.add(s3BucketName);
  log.debug(`Marked S3 bucket "${s3BucketName}" as provisioned`);
}

/**
 * Clear the storage module cache AND bucket cache.
 * Useful for testing or schema changes.
 */
export function clearStorageModuleCache(): void {
  storageModuleCache.clear();
  bucketCache.clear();
  provisionedBuckets.clear();
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
