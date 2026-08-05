import { Logger } from '@pgpmjs/logger';
import { QuoteUtils } from '@pgsql/quotes';
import { LRUCache } from 'lru-cache';

import type { BucketConfig,StorageModuleConfig } from './types';

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

type StorageCacheEntry =
  | { kind: 'config'; value: StorageModuleConfig | null }
  | { kind: 'list'; value: StorageModuleConfig[] };

const CACHE_TTL_MS = process.env.NODE_ENV === 'development'
  ? FIVE_MINUTES_MS
  : ONE_HOUR_MS;

/**
 * Metadata owned by one exact Graphile build.
 *
 * Logical database/module identifiers are deliberately only keys inside this
 * scope. They never select the scope itself, because separate physical pools
 * may legitimately expose identical identifiers.
 */
export class StorageModuleCacheScope {
  readonly storageModuleCache = new LRUCache<string, StorageCacheEntry>({
    max: 100,
    ttl: CACHE_TTL_MS,
    updateAgeOnGet: false,
  });

  readonly bucketCache = new LRUCache<string, BucketConfig | null>({
    max: 500,
    ttl: CACHE_TTL_MS,
    updateAgeOnGet: false,
  });

  readonly provisionedBuckets = new Set<string>();

  clear(): void {
    this.storageModuleCache.clear();
    this.bucketCache.clear();
    this.provisionedBuckets.clear();
  }
}

/**
 * Weak ownership ties cached metadata to the exact Graphile build object.
 * Reusing a preset/plugin object for another build therefore cannot reuse the
 * first build's tenant metadata, and releasing the build releases its cache.
 */
const cacheScopesByBuild = new WeakMap<object, StorageModuleCacheScope>();

export function getStorageModuleCacheScope(build: object): StorageModuleCacheScope {
  if ((typeof build !== 'object' || build === null) && typeof build !== 'function') {
    throw new TypeError('A Graphile build object is required for storage cache isolation');
  }

  let scope = cacheScopesByBuild.get(build);
  if (!scope) {
    scope = new StorageModuleCacheScope();
    cacheScopesByBuild.set(build, scope);
  }
  return scope;
}

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
    sm.database_id,
    sm.scope,
    sm.entity_table_id,
    bt.database_id AS buckets_database_id,
    bs.schema_name AS buckets_schema,
    bs.database_id AS buckets_schema_database_id,
    bt.name AS buckets_table,
    ft.database_id AS files_database_id,
    fs.schema_name AS files_schema,
    fs.database_id AS files_schema_database_id,
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
    NULL AS entity_database_id,
    NULL AS entity_schema_database_id,
    NULL AS entity_schema,
    NULL AS entity_table
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
  WHERE sm.database_id = $1
    AND sm.scope = 'app'
  ORDER BY sm.id
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
    sm.database_id,
    sm.scope,
    sm.entity_table_id,
    bt.database_id AS buckets_database_id,
    bs.schema_name AS buckets_schema,
    bs.database_id AS buckets_schema_database_id,
    bt.name AS buckets_table,
    ft.database_id AS files_database_id,
    fs.schema_name AS files_schema,
    fs.database_id AS files_schema_database_id,
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
    et.database_id AS entity_database_id,
    es.database_id AS entity_schema_database_id,
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
  database_id: string;
  scope: string;
  entity_table_id: string | null;
  buckets_database_id: string;
  buckets_schema: string;
  buckets_schema_database_id: string;
  buckets_table: string;
  files_database_id: string;
  files_schema: string;
  files_schema_database_id: string;
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
  entity_database_id: string | null;
  entity_schema_database_id: string | null;
  entity_schema: string | null;
  entity_table: string | null;
}

/**
 * Build a StorageModuleConfig from a raw DB row.
 */
function quoteMetadataIdentifier(schema: string, objectName: string, label: string): string {
  if (
    typeof schema !== 'string' ||
    schema.length === 0 ||
    schema.includes('\0') ||
    Buffer.byteLength(schema, 'utf8') > 63 ||
    typeof objectName !== 'string' ||
    objectName.length === 0 ||
    objectName.includes('\0') ||
    Buffer.byteLength(objectName, 'utf8') > 63
  ) {
    throw new Error(`STORAGE_MODULE_METADATA_INVALID:${label}`);
  }
  return QuoteUtils.quoteQualifiedIdentifier(schema, objectName);
}

function buildConfig(row: StorageModuleRow, databaseId: string): StorageModuleConfig {
  const objectDatabaseIds = [
    row.database_id,
    row.buckets_database_id,
    row.buckets_schema_database_id,
    row.files_database_id,
    row.files_schema_database_id,
  ];
  if (objectDatabaseIds.some((id) => id !== databaseId)) {
    throw new Error(`STORAGE_MODULE_CROSS_DATABASE_METADATA:${row.id}`);
  }
  if (
    typeof row.id !== 'string' ||
    row.id.length === 0 ||
    typeof row.scope !== 'string' ||
    row.scope.length === 0
  ) {
    throw new Error('STORAGE_MODULE_METADATA_INVALID');
  }

  if (row.entity_table_id === null) {
    if (
      row.scope !== 'app' ||
      row.entity_database_id !== null ||
      row.entity_schema_database_id !== null ||
      row.entity_schema !== null ||
      row.entity_table !== null
    ) {
      throw new Error(`STORAGE_MODULE_METADATA_INVALID:${row.id}`);
    }
  } else if (
    row.scope === 'app' ||
    row.entity_database_id !== databaseId ||
    row.entity_schema_database_id !== databaseId ||
    !row.entity_schema ||
    !row.entity_table
  ) {
    throw new Error(`STORAGE_MODULE_CROSS_DATABASE_METADATA:${row.id}`);
  }

  const cacheTtlSeconds = row.cache_ttl_seconds ?? DEFAULT_CACHE_TTL_SECONDS;
  return {
    id: row.id,
    bucketsQualifiedName: quoteMetadataIdentifier(
      row.buckets_schema,
      row.buckets_table,
      `buckets:${row.id}`,
    ),
    filesQualifiedName: quoteMetadataIdentifier(
      row.files_schema,
      row.files_table,
      `files:${row.id}`,
    ),
    schemaName: row.buckets_schema,
    bucketsTableName: row.buckets_table,
    filesTableName: row.files_table,
    scope: row.scope,
    entityTableId: row.entity_table_id,
    entityQualifiedName: row.entity_schema && row.entity_table
      ? quoteMetadataIdentifier(row.entity_schema, row.entity_table, `entity:${row.id}`)
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

function assertUnambiguousModules(configs: readonly StorageModuleConfig[]): void {
  const ids = new Set<string>();
  const scopes = new Set<string>();
  const buckets = new Set<string>();
  const files = new Set<string>();

  for (const config of configs) {
    if (
      ids.has(config.id) ||
      scopes.has(config.scope) ||
      buckets.has(config.bucketsQualifiedName) ||
      files.has(config.filesQualifiedName)
    ) {
      throw new Error('STORAGE_MODULE_METADATA_AMBIGUOUS');
    }
    ids.add(config.id);
    scopes.add(config.scope);
    buckets.add(config.bucketsQualifiedName);
    files.add(config.filesQualifiedName);
  }
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
  cacheScope: StorageModuleCacheScope,
): Promise<StorageModuleConfig | null> {
  const { storageModuleCache } = cacheScope;
  const cacheKey = `storage:${databaseId}:app`;
  if (storageModuleCache.has(cacheKey)) {
    const cached = storageModuleCache.get(cacheKey);
    if (cached?.kind !== 'config') {
      throw new Error('STORAGE_CACHE_INTEGRITY_ERROR');
    }
    return cached.value;
  }

  log.debug(`Cache miss for app-level storage in database ${databaseId}, querying metaschema...`);

  const result = await pgClient.query({ text: APP_STORAGE_MODULE_QUERY, values: [databaseId] });

  if (result.rows.length === 0) {
    log.warn(`No app-level storage module found for database ${databaseId}`);
    storageModuleCache.set(cacheKey, { kind: 'config', value: null });
    return null;
  }
  if (result.rows.length !== 1) {
    throw new Error('STORAGE_MODULE_METADATA_AMBIGUOUS:app');
  }

  const config = buildConfig(result.rows[0] as StorageModuleRow, databaseId);
  storageModuleCache.set(cacheKey, { kind: 'config', value: config });
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
  cacheScope: StorageModuleCacheScope,
): Promise<StorageModuleConfig | null> {
  const allConfigs = await loadAllStorageModules(pgClient, databaseId, cacheScope);

  // The module list is build-local configuration, but owner visibility is
  // request/RLS-specific. Always probe it under the current pgClient instead
  // of caching one principal's authorization decision for another principal.
  const entityModules = allConfigs.filter((c) => c.entityQualifiedName !== null);

  const matches: StorageModuleConfig[] = [];
  for (const mod of entityModules) {
    const probeResult = await pgClient.query({
      text: `SELECT 1 FROM ${mod.entityQualifiedName} WHERE id = $1 LIMIT 1`,
      values: [ownerId],
    });
    if (probeResult.rows.length > 0) {
      log.debug(
        `Resolved ownerId ${ownerId} to storage module ${mod.id} ` +
        `(scope=${mod.scope}, table=${mod.bucketsQualifiedName})`,
      );
      matches.push(mod);
    }
  }

  if (matches.length > 1) {
    throw new Error('STORAGE_MODULE_AMBIGUOUS:owner');
  }
  if (matches.length === 1) return matches[0];

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
    (row: unknown) => buildConfig(row as StorageModuleRow, databaseId),
  );
  assertUnambiguousModules(allConfigs);

  // Probe each module's files table for the fileId
  const matches: Array<{
    storageConfig: StorageModuleConfig;
    file: { id: string; key: string; mime_type: string; bucket_id: string };
  }> = [];
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
      matches.push({ storageConfig: config, file });
    }
  }

  if (matches.length > 1) {
    throw new Error('STORAGE_MODULE_AMBIGUOUS:file');
  }
  if (matches.length === 1) return matches[0];

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
  cacheScope: StorageModuleCacheScope,
): Promise<StorageModuleConfig[]> {
  const { storageModuleCache } = cacheScope;
  const cacheKey = `storage:${databaseId}:all-list`;
  if (storageModuleCache.has(cacheKey)) {
    const cached = storageModuleCache.get(cacheKey);
    if (cached?.kind !== 'list') {
      throw new Error('STORAGE_CACHE_INTEGRITY_ERROR');
    }
    return cached.value;
  }

  log.debug(`Loading all storage modules for database ${databaseId}`);
  const result = await pgClient.query({ text: ALL_STORAGE_MODULES_QUERY, values: [databaseId] });
  const configs = (result.rows as StorageModuleRow[]).map((row) =>
    buildConfig(row, databaseId),
  );
  assertUnambiguousModules(configs);
  // Empty results are intentional negative cache entries. Query failures are
  // never cached, so a transient control-plane error cannot become a miss.
  storageModuleCache.set(cacheKey, { kind: 'list', value: configs });

  return configs;
}

/**
 * Resolve the storage module config from a PostGraphile pgCodec.
 *
 * Matches the codec's schema + table name against cached storage modules.
 * Works for both files codecs (@storageFiles) and buckets codecs (@storageBuckets).
 *
 * @param pgCodec - The PostGraphile codec (has extensions.pg.schemaName, name)
 * @param allConfigs - All storage module configs for this database
 * @returns The matching StorageModuleConfig or null
 */
export function resolveStorageConfigFromCodec(
  pgCodec: { name: string; extensions?: { pg?: { schemaName?: string; name?: string } }; sqlType?: string },
  allConfigs: readonly StorageModuleConfig[],
): StorageModuleConfig | null {
  const schemaName = pgCodec.extensions?.pg?.schemaName;
  const tableName = pgCodec.extensions?.pg?.name ?? pgCodec.name;

  if (!schemaName || !tableName) return null;

  const matches = allConfigs.filter((c) =>
    (c.filesTableName === tableName && c.schemaName === schemaName) ||
    (c.bucketsTableName === tableName && c.schemaName === schemaName),
  );
  if (matches.length > 1) {
    throw new Error('STORAGE_MODULE_AMBIGUOUS:codec');
  }
  return matches[0] ?? null;
}

// --- Bucket metadata cache ---

/**
 * LRU cache for per-database bucket metadata.
 *
 * Buckets are essentially static config — created once and rarely changed.
 * Cache hits still execute an exact ID lookup through the request's RLS
 * context. The cached metadata is returned only when that authorized ID
 * matches, so cached data never substitutes for row authorization.
 *
 * Keys are local to the exact build scope; database/module identifiers never
 * select cache entries belonging to another physical Graphile build.
 */

/**
 * Normalize the recorded physical coordinate at the DB boundary.
 *
 * A bucket row either carries a recorded coordinate or it does not; SQL nulls
 * and absent columns both mean "never provisioned". Collapsing them here is
 * the single place that shape is interpreted — callers branch on `string`
 * vs `null` and never coalesce a bucket name into existence.
 */
export function storedPhysicalName(row: { physical_name?: string | null }): string | null {
  return row.physical_name == null ? null : row.physical_name;
}

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
  ownerId: string | undefined,
  cacheScope: StorageModuleCacheScope,
): Promise<BucketConfig | null> {
  const { bucketCache } = cacheScope;
  const cacheKey = `bucket:${databaseId}:${storageConfig.id}:${bucketKey}${ownerId ? `:${ownerId}` : ''}`;
  // Entity-scoped buckets use (owner_id, key) composite lookup;
  // app-level buckets just use key.
  const isEntityScoped = storageConfig.scope !== 'app';
  if (isEntityScoped && !ownerId) {
    throw new Error('STORAGE_OWNER_REQUIRED');
  }
  const hasOwner = Boolean(ownerId && isEntityScoped);
  const whereSql = hasOwner
    ? 'key = $1 AND owner_id = $2'
    : 'key = $1';
  const values = hasOwner ? [bucketKey, ownerId] : [bucketKey];

  if (bucketCache.has(cacheKey)) {
    // This query runs with the current request's pgSettings/RLS context. Do
    // not return even immutable cached metadata without reauthorizing it.
    const authorized = await pgClient.query({
      text: `SELECT id
         FROM ${storageConfig.bucketsQualifiedName}
         WHERE ${whereSql}
         LIMIT 2`,
      values,
    });
    const authorizedId = (authorized.rows[0] as { id?: string } | undefined)?.id;
    if (authorized.rows.length > 1) {
      throw new Error('STORAGE_BUCKET_AMBIGUOUS');
    }
    if (!authorizedId) {
      return null;
    }

    const cached = bucketCache.get(cacheKey);
    if (cached?.id === authorizedId) {
      return cached;
    }
    // A formerly missing bucket may now exist, or a bucket may have been
    // replaced under the same key. Reload its immutable metadata below.
  }

  log.debug(`Bucket cache miss for ${databaseId}:${bucketKey}${ownerId ? ` (owner=${ownerId})` : ''}, querying DB...`);

  const result = await pgClient.query({
    text: hasOwner
      ? `SELECT id, key, type, is_public, owner_id, allowed_mime_types, max_file_size, allow_custom_keys, physical_name
         FROM ${storageConfig.bucketsQualifiedName}
         WHERE ${whereSql}
         LIMIT 2`
      : `SELECT id, key, type, is_public, ${isEntityScoped ? 'owner_id,' : ''} allowed_mime_types, max_file_size, allow_custom_keys, physical_name
         FROM ${storageConfig.bucketsQualifiedName}
         WHERE ${whereSql}
         LIMIT 2`,
    values,
  });

  if (result.rows.length === 0) {
    bucketCache.set(cacheKey, null);
    return null;
  }
  if (result.rows.length > 1) {
    throw new Error('STORAGE_BUCKET_AMBIGUOUS');
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
    physical_name: string | null;
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
    physical_name: storedPhysicalName(row),
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
/**
 * Check whether an S3 bucket has already been provisioned (cached).
 */
export function isS3BucketProvisioned(
  s3BucketName: string,
  cacheScope: StorageModuleCacheScope,
): boolean {
  return cacheScope.provisionedBuckets.has(s3BucketName);
}

/**
 * Mark an S3 bucket as provisioned in the in-memory cache.
 */
export function markS3BucketProvisioned(
  s3BucketName: string,
  cacheScope: StorageModuleCacheScope,
): void {
  cacheScope.provisionedBuckets.add(s3BucketName);
  log.debug(`Marked S3 bucket "${s3BucketName}" as provisioned`);
}

/**
 * Clear the storage module cache AND bucket cache.
 * Useful for testing or schema changes.
 */
export function clearStorageModuleCache(cacheScope: StorageModuleCacheScope): void {
  cacheScope.clear();
}

/**
 * Clear cached bucket entries for a specific database.
 * Useful when bucket config changes are detected.
 */
export function clearBucketCache(
  databaseId: string | undefined,
  cacheScope: StorageModuleCacheScope,
): void {
  const { bucketCache } = cacheScope;
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
