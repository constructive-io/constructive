import {
  getBucketConfig,
  getStorageModuleCacheScope,
  getStorageModuleConfig,
  getStorageModuleConfigForOwner,
  isS3BucketProvisioned,
  loadAllStorageModules,
  markS3BucketProvisioned,
  resolveStorageConfigFromCodec,
} from '../src/storage-module-cache';
import { resolveDownloadStorageTarget } from '../src/download-url-field';
import { mintPhysicalBucketName, resolveS3Config } from '../src/s3-config';
import {
  loadStorageModulesForBuild,
  snapshotPreloadedStorageModules,
  type StorageWithPgClient,
} from '../src/storage-module-source';
import type { WithPgClient } from '../src/request-pg-client';
import type {
  PresignedUrlPluginOptions,
  StorageModuleConfig,
} from '../src/types';

const DATABASE_ID = '00000000-0000-0000-0000-000000000001';
const MODULE_ID = '00000000-0000-0000-0000-000000000002';
const BUCKET_ID = '00000000-0000-0000-0000-000000000003';
type QueryOptions = { text: string; values?: unknown[] };

/**
 * Model Graphile's real request-client contract: acquire without settings,
 * open one explicit transaction, then apply every request GUC with set_config
 * before tenant-bound SQL is allowed to run.
 */
function requestPgHarness(
  pgSettings: Record<string, string>,
  requestQuery: (query: QueryOptions) => Promise<{ rows: any[] }>,
) {
  let transactionActive = false;
  let appliedSettings: Record<string, string> | null = null;
  const pgClient: any = {};

  const query = jest.fn(async (queryOptions: QueryOptions) => {
    if (queryOptions.text.includes('SELECT set_config')) {
      expect(transactionActive).toBe(true);
      const entries = JSON.parse(String(queryOptions.values?.[0])) as Array<[string, string]>;
      appliedSettings = Object.fromEntries(entries);
      expect(appliedSettings).toEqual(pgSettings);
      return { rows: [] };
    }

    expect(transactionActive).toBe(true);
    expect(appliedSettings).toEqual(pgSettings);
    return requestQuery(queryOptions);
  });
  const withTransaction = jest.fn(async (callback: (tx: any) => Promise<unknown>) => {
    expect(transactionActive).toBe(false);
    transactionActive = true;
    try {
      return await callback(pgClient);
    } finally {
      appliedSettings = null;
      transactionActive = false;
    }
  });
  pgClient.query = query;
  pgClient.withTransaction = withTransaction;

  const withPgClientMock = jest.fn(async (
    settings: Record<string, string> | null,
    callback: (client: any) => Promise<unknown>,
  ) => {
    expect(settings).toBeNull();
    return callback(pgClient);
  });

  return {
    withPgClient: withPgClientMock as unknown as WithPgClient & StorageWithPgClient,
    withPgClientMock,
    withTransaction,
    query,
  };
}

function storageRow(publicUrlPrefix: string, maxFileSize = 1024): Record<string, unknown> {
  return {
    id: MODULE_ID,
    database_id: DATABASE_ID,
    scope: 'app',
    entity_table_id: null,
    buckets_database_id: DATABASE_ID,
    buckets_schema: 'storage_public',
    buckets_schema_database_id: DATABASE_ID,
    buckets_table: 'app_buckets',
    files_database_id: DATABASE_ID,
    files_schema: 'storage_public',
    files_schema_database_id: DATABASE_ID,
    files_table: 'app_files',
    endpoint: null,
    public_url_prefix: publicUrlPrefix,
    provider: 's3',
    allowed_origins: null,
    upload_url_expiry_seconds: 900,
    download_url_expiry_seconds: 3600,
    default_max_file_size: maxFileSize,
    max_filename_length: 1024,
    cache_ttl_seconds: 3600,
    max_bulk_files: 100,
    max_bulk_total_size: 1073741824,
    has_path_shares: false,
    entity_database_id: null,
    entity_schema_database_id: null,
    entity_schema: null,
    entity_table: null,
  };
}

function bucketRow(maxFileSize: number): Record<string, unknown> {
  return {
    id: BUCKET_ID,
    key: 'private',
    type: 'private',
    is_public: false,
    owner_id: null,
    allowed_mime_types: ['application/pdf'],
    max_file_size: maxFileSize,
    allow_custom_keys: false,
    physical_name: 'persisted-test-bucket',
  };
}

function options(bucket: string): PresignedUrlPluginOptions {
  return {
    s3: {
      client: {} as any,
      bucket,
      publicUrlPrefix: `https://${bucket}.example`,
    },
  };
}

function preloadedConfig(publicUrlPrefix: string): StorageModuleConfig {
  return {
    id: MODULE_ID,
    bucketsQualifiedName: 'storage_public.app_buckets',
    filesQualifiedName: 'storage_public.app_files',
    schemaName: 'storage_public',
    bucketsTableName: 'app_buckets',
    filesTableName: 'app_files',
    scope: 'app',
    entityTableId: null,
    entityQualifiedName: null,
    endpoint: null,
    publicUrlPrefix,
    provider: 's3',
    allowedOrigins: ['https://app.example'],
    uploadUrlExpirySeconds: 900,
    downloadUrlExpirySeconds: 1234,
    defaultMaxFileSize: 1024,
    maxFilenameLength: 1024,
    cacheTtlSeconds: 3600,
    hasPathShares: false,
    maxBulkFiles: 100,
    maxBulkTotalSize: 1073741824,
  };
}

describe('build-local storage metadata caches', () => {
  it('uses fixed-expiry caches rather than extending metadata lifetime on reads', () => {
    const scope = getStorageModuleCacheScope({});
    expect(scope.storageModuleCache.updateAgeOnGet).toBe(false);
    expect(scope.bucketCache.updateAgeOnGet).toBe(false);
  });

  it('binds every legacy metadata join to the requested physical database', async () => {
    const scope = getStorageModuleCacheScope({});
    const client = {
      query: jest.fn(async (_query: QueryOptions) => ({
        rows: [storageRow('https://tenant.example')],
      })),
    };

    await getStorageModuleConfig(client, DATABASE_ID, scope);

    const query = client.query.mock.calls[0][0] as QueryOptions;
    expect(query.values).toEqual([DATABASE_ID]);
    expect(query.text).toContain('bt.database_id = sm.database_id');
    expect(query.text).toContain('bs.database_id = sm.database_id');
    expect(query.text).toContain('ft.database_id = sm.database_id');
    expect(query.text).toContain('fs.database_id = sm.database_id');
    expect(query.text).not.toContain('LIMIT 1');
  });

  it('rejects wrong-database metadata rows and never caches them', async () => {
    const scope = getStorageModuleCacheScope({});
    const client = {
      query: jest.fn(async () => ({
        rows: [{
          ...storageRow('https://tenant.example'),
          buckets_schema_database_id: '00000000-0000-0000-0000-000000000099',
        }],
      })),
    };

    await expect(getStorageModuleConfig(client, DATABASE_ID, scope))
      .rejects.toThrow(`STORAGE_MODULE_CROSS_DATABASE_METADATA:${MODULE_ID}`);
    await expect(getStorageModuleConfig(client, DATABASE_ID, scope))
      .rejects.toThrow(`STORAGE_MODULE_CROSS_DATABASE_METADATA:${MODULE_ID}`);
    expect(client.query).toHaveBeenCalledTimes(2);
  });

  it('rejects duplicate app metadata instead of selecting the first row', async () => {
    const scope = getStorageModuleCacheScope({});
    const client = {
      query: jest.fn(async () => ({
        rows: [
          storageRow('https://tenant-a.example'),
          { ...storageRow('https://tenant-b.example'), id: 'module-b' },
        ],
      })),
    };

    await expect(getStorageModuleConfig(client, DATABASE_ID, scope))
      .rejects.toThrow('STORAGE_MODULE_METADATA_AMBIGUOUS:app');
  });

  it('rejects a codec mapped by more than one preloaded module', () => {
    const first = preloadedConfig('https://tenant-a.example');
    const second = { ...preloadedConfig('https://tenant-b.example'), id: 'module-b' };

    expect(() => resolveStorageConfigFromCodec({
      name: 'app_files',
      extensions: { pg: { schemaName: 'storage_public', name: 'app_files' } },
    }, [first, second])).toThrow('STORAGE_MODULE_AMBIGUOUS:codec');
  });

  it('isolates identical logical IDs and object names by exact Graphile build', async () => {
    const firstBuild = {};
    const secondBuild = {};
    const firstScope = getStorageModuleCacheScope(firstBuild);
    const secondScope = getStorageModuleCacheScope(secondBuild);

    expect(getStorageModuleCacheScope(firstBuild)).toBe(firstScope);
    expect(secondScope).not.toBe(firstScope);

    const firstClient = {
      query: jest.fn(async ({ text }: { text: string }) => ({
        rows: text.includes('metaschema_modules_public.storage_module')
          ? [storageRow('https://tenant-a.example', 111)]
          : /SELECT id\s+FROM/.test(text)
            ? [{ id: BUCKET_ID }]
            : [bucketRow(111)],
      })),
    };
    const secondClient = {
      query: jest.fn(async ({ text }: { text: string }) => ({
        rows: text.includes('metaschema_modules_public.storage_module')
          ? [storageRow('https://tenant-b.example', 222)]
          : /SELECT id\s+FROM/.test(text)
            ? [{ id: BUCKET_ID }]
            : [bucketRow(222)],
      })),
    };

    const [firstModules, secondModules] = await Promise.all([
      loadAllStorageModules(firstClient, DATABASE_ID, firstScope),
      loadAllStorageModules(secondClient, DATABASE_ID, secondScope),
    ]);

    expect(firstModules[0]).toMatchObject({
      id: MODULE_ID,
      bucketsQualifiedName: 'storage_public.app_buckets',
      publicUrlPrefix: 'https://tenant-a.example',
      defaultMaxFileSize: 111,
    });
    expect(secondModules[0]).toMatchObject({
      id: MODULE_ID,
      bucketsQualifiedName: 'storage_public.app_buckets',
      publicUrlPrefix: 'https://tenant-b.example',
      defaultMaxFileSize: 222,
    });

    const firstBucket = await getBucketConfig(
      firstClient,
      firstModules[0],
      DATABASE_ID,
      'private',
      undefined,
      firstScope,
    );
    const secondBucket = await getBucketConfig(
      secondClient,
      secondModules[0],
      DATABASE_ID,
      'private',
      undefined,
      secondScope,
    );

    expect(firstBucket).toMatchObject({ id: BUCKET_ID, key: 'private', max_file_size: 111 });
    expect(secondBucket).toMatchObject({ id: BUCKET_ID, key: 'private', max_file_size: 222 });

    markS3BucketProvisioned('same-physical-bucket-name', firstScope);
    expect(isS3BucketProvisioned('same-physical-bucket-name', firstScope)).toBe(true);
    expect(isS3BucketProvisioned('same-physical-bucket-name', secondScope)).toBe(false);
  });

  it('negative-caches metadata inside one build without poisoning another build', async () => {
    const missingScope = getStorageModuleCacheScope({});
    const presentScope = getStorageModuleCacheScope({});
    const missingClient = {
      query: jest.fn(async (_opts: QueryOptions): Promise<{ rows: unknown[] }> => ({ rows: [] })),
    };
    const presentClient = {
      query: jest.fn(async () => ({ rows: [storageRow('https://present.example')] })),
    };

    await expect(getStorageModuleConfig(missingClient, DATABASE_ID, missingScope)).resolves.toBeNull();
    await expect(getStorageModuleConfig(missingClient, DATABASE_ID, missingScope)).resolves.toBeNull();
    expect(missingClient.query).toHaveBeenCalledTimes(1);

    await expect(getStorageModuleConfig(presentClient, DATABASE_ID, presentScope)).resolves.toMatchObject({
      id: MODULE_ID,
      publicUrlPrefix: 'https://present.example',
    });
    expect(presentClient.query).toHaveBeenCalledTimes(1);
  });

  it('negative-caches bucket metadata but rechecks RLS on every cache hit', async () => {
    const scope = getStorageModuleCacheScope({});
    const moduleClient = {
      query: jest.fn(async () => ({ rows: [storageRow('https://tenant.example')] })),
    };
    const [storageConfig] = await loadAllStorageModules(moduleClient, DATABASE_ID, scope);
    const bucketClient = {
      query: jest.fn(async (_opts: QueryOptions): Promise<{ rows: unknown[] }> => ({ rows: [] })),
    };

    await expect(
      getBucketConfig(bucketClient, storageConfig, DATABASE_ID, 'private', undefined, scope),
    ).resolves.toBeNull();
    await expect(
      getBucketConfig(bucketClient, storageConfig, DATABASE_ID, 'private', undefined, scope),
    ).resolves.toBeNull();

    expect(bucketClient.query).toHaveBeenCalledTimes(2);
    const calls = bucketClient.query.mock.calls as unknown as Array<[QueryOptions]>;
    expect(calls[0][0].text).toContain('allowed_mime_types');
    expect(calls[1][0].text).toMatch(/SELECT id\s+FROM/);
  });

  it('does not return a positive bucket cache hit when the current RLS context cannot see it', async () => {
    const scope = getStorageModuleCacheScope({});
    const moduleClient = {
      query: jest.fn(async () => ({ rows: [storageRow('https://tenant.example')] })),
    };
    const [storageConfig] = await loadAllStorageModules(moduleClient, DATABASE_ID, scope);
    const authorizedClient = {
      query: jest.fn(async () => ({ rows: [bucketRow(512)] })),
    };
    const unauthorizedClient = {
      query: jest.fn(async (_opts: QueryOptions): Promise<{ rows: unknown[] }> => ({ rows: [] })),
    };

    await expect(
      getBucketConfig(authorizedClient, storageConfig, DATABASE_ID, 'private', undefined, scope),
    ).resolves.toMatchObject({ id: BUCKET_ID, max_file_size: 512 });
    await expect(
      getBucketConfig(unauthorizedClient, storageConfig, DATABASE_ID, 'private', undefined, scope),
    ).resolves.toBeNull();

    const calls = unauthorizedClient.query.mock.calls as unknown as Array<[QueryOptions]>;
    expect(calls).toHaveLength(1);
    expect(calls[0][0].text).toMatch(/SELECT id\s+FROM/);
  });

  it('memoizes lazy S3 configuration per build instead of on shared preset options', () => {
    const firstScope = getStorageModuleCacheScope({});
    const secondScope = getStorageModuleCacheScope({});
    let activeBucket = 'tenant-a-bucket';
    const getter = jest.fn(() => ({
      client: {} as any,
      bucket: activeBucket,
    }));
    const sharedOptions: PresignedUrlPluginOptions = { s3: getter };

    const first = resolveS3Config(sharedOptions, firstScope);
    activeBucket = 'tenant-b-bucket';
    const second = resolveS3Config(sharedOptions, secondScope);
    activeBucket = 'unrelated-later-value';

    expect(resolveS3Config(sharedOptions, firstScope)).toBe(first);
    expect(resolveS3Config(sharedOptions, secondScope)).toBe(second);
    expect(first.bucket).toBe('tenant-a-bucket');
    expect(second.bucket).toBe('tenant-b-bucket');
    expect(getter).toHaveBeenCalledTimes(2);
    expect(typeof sharedOptions.s3).toBe('function');
  });

  it('matches the bucket provisioner resolver argument order on first provision', () => {
    const cacheScope = getStorageModuleCacheScope({});
    const resolver = jest.fn((bucketKey: string, databaseId: string) =>
      `physical-${bucketKey}-${databaseId}`,
    );

    expect(mintPhysicalBucketName(
      { ...options('fallback'), resolveBucketName: resolver },
      'private',
      DATABASE_ID,
      cacheScope,
    )).toBe(`physical-private-${DATABASE_ID}`);
    expect(resolver).toHaveBeenCalledWith('private', DATABASE_ID);
  });

  it('does not cache an owner lookup across RLS principals', async () => {
    const scope = getStorageModuleCacheScope({});
    const entityRow = {
      ...storageRow('https://tenant.example'),
      scope: 'team',
      entity_table_id: '00000000-0000-0000-0000-000000000004',
      entity_database_id: DATABASE_ID,
      entity_schema_database_id: DATABASE_ID,
      entity_schema: 'app_public',
      entity_table: 'teams',
    };
    const authorizedClient = {
      query: jest.fn(async ({ text }: QueryOptions) => ({
        rows: text.includes('metaschema_modules_public.storage_module')
          ? [entityRow]
          : [{ '?column?': 1 }],
      })),
    };
    const unauthorizedClient = {
      query: jest.fn(async (_opts: QueryOptions): Promise<{ rows: unknown[] }> => ({ rows: [] })),
    };

    await expect(
      getStorageModuleConfigForOwner(authorizedClient, DATABASE_ID, 'owner-id', scope),
    ).resolves.toMatchObject({ id: MODULE_ID, scope: 'team' });
    await expect(
      getStorageModuleConfigForOwner(unauthorizedClient, DATABASE_ID, 'owner-id', scope),
    ).resolves.toBeNull();

    expect(unauthorizedClient.query).toHaveBeenCalledTimes(1);
    const calls = unauthorizedClient.query.mock.calls as unknown as Array<[QueryOptions]>;
    expect(calls[0][0].text).toContain('WHERE id = $1');
  });
});

describe('download target fail-closed resolution', () => {
  const codec = {
    name: 'app_files',
    extensions: { pg: { schemaName: 'storage_public', name: 'app_files' } },
  };

  it('keeps identical logical tenants on their own build configuration', async () => {
    async function resolveForBuild(
      build: object,
      publicUrlPrefix: string,
      s3Bucket: string,
    ) {
      const pgSettings = {
        role: 'member',
        'jwt.claims.api_id': 'api-a',
        'jwt.claims.database_id': DATABASE_ID,
        'jwt.claims.user_id': '',
      };
      const requestQuery = jest.fn(async ({ text }: QueryOptions) => {
        if (text.includes('current_database_id')) return { rows: [{ id: DATABASE_ID }] };
        if (text.includes('metaschema_modules_public.storage_module')) {
          return { rows: [storageRow(publicUrlPrefix)] };
        }
        if (text.includes('SELECT key, physical_name FROM')) {
          return { rows: [{ key: 'private', physical_name: s3Bucket }] };
        }
        throw new Error(`Unexpected query: ${text}`);
      });
      const { withPgClient } = requestPgHarness(pgSettings, requestQuery);

      return resolveDownloadStorageTarget({
        options: options(s3Bucket),
        preloadedStorageModules: undefined,
        cacheScope: getStorageModuleCacheScope(build),
        codec,
        withPgClient,
        pgSettings,
        bucketId: BUCKET_ID,
      });
    }

    const [first, second] = await Promise.all([
      resolveForBuild({}, 'https://tenant-a.example', 'tenant-a-bucket'),
      resolveForBuild({}, 'https://tenant-b.example', 'tenant-b-bucket'),
    ]);

    expect(first.s3).toMatchObject({
      bucket: 'tenant-a-bucket',
      publicUrlPrefix: 'https://tenant-a.example',
    });
    expect(second.s3).toMatchObject({
      bucket: 'tenant-b-bucket',
      publicUrlPrefix: 'https://tenant-b.example',
    });
  });

  it('propagates lookup failures and never resolves fallback signing config', async () => {
    const pgSettings = {
      role: 'member',
      'jwt.claims.api_id': 'api-a',
      'jwt.claims.database_id': DATABASE_ID,
      'jwt.claims.user_id': '',
    };
    const s3Getter = jest.fn(() => ({
      client: {} as any,
      bucket: 'unsafe-global-fallback',
    }));
    const requestQuery = jest.fn(async ({ text }: QueryOptions) => {
      if (text.includes('current_database_id')) return { rows: [{ id: DATABASE_ID }] };
      throw new Error('tenant metadata lookup failed');
    });
    const { withPgClient } = requestPgHarness(pgSettings, requestQuery);

    await expect(resolveDownloadStorageTarget({
      options: { s3: s3Getter },
      preloadedStorageModules: undefined,
      cacheScope: getStorageModuleCacheScope({}),
      codec,
      withPgClient,
      pgSettings,
      bucketId: BUCKET_ID,
    })).rejects.toThrow('tenant metadata lookup failed');
    expect(s3Getter).not.toHaveBeenCalled();
  });

  it('does not consult global signing config when tenant metadata is absent', async () => {
    const pgSettings = {
      role: 'member',
      'jwt.claims.api_id': 'api-a',
      'jwt.claims.database_id': DATABASE_ID,
      'jwt.claims.user_id': '',
    };
    const s3Getter = jest.fn(() => ({
      client: {} as any,
      bucket: 'unsafe-global-fallback',
    }));
    const requestQuery = jest.fn(async ({ text }: QueryOptions) => {
      if (text.includes('current_database_id')) return { rows: [{ id: DATABASE_ID }] };
      if (text.includes('metaschema_modules_public.storage_module')) return { rows: [] };
      throw new Error(`Unexpected query: ${text}`);
    });
    const { withPgClient } = requestPgHarness(pgSettings, requestQuery);

    await expect(resolveDownloadStorageTarget({
      options: { s3: s3Getter },
      preloadedStorageModules: undefined,
      cacheScope: getStorageModuleCacheScope({}),
      codec,
      withPgClient,
      pgSettings,
      bucketId: BUCKET_ID,
    })).rejects.toThrow('STORAGE_MODULE_NOT_FOUND');
    expect(s3Getter).not.toHaveBeenCalled();
  });

  it('rejects missing request settings before acquiring a metadata client or signing', async () => {
    const s3Getter = jest.fn(() => ({
      client: {} as any,
      bucket: 'unsafe-global-fallback',
    }));
    const withPgClient = jest.fn();

    await expect(resolveDownloadStorageTarget({
      options: { s3: s3Getter },
      preloadedStorageModules: undefined,
      cacheScope: getStorageModuleCacheScope({}),
      codec,
      withPgClient,
      pgSettings: null,
      bucketId: BUCKET_ID,
    })).rejects.toThrow('STORAGE_REQUEST_SETTINGS_UNAVAILABLE');
    expect(withPgClient).not.toHaveBeenCalled();
    expect(s3Getter).not.toHaveBeenCalled();
  });

  it('uses persisted physical_name verbatim without consulting the naming resolver', async () => {
    const resolver = jest.fn(() => 'recomputed-and-wrong');
    const pgSettings = { role: 'member' };
    const requestQuery = jest.fn(async ({ text }: QueryOptions) => {
      if (text.includes('current_database_id')) return { rows: [{ id: DATABASE_ID }] };
      if (text.includes('SELECT key, physical_name FROM')) {
        return { rows: [{ key: 'private', physical_name: 'persisted-physical-bucket' }] };
      }
      throw new Error(`Unexpected query: ${text}`);
    });
    const { withPgClient } = requestPgHarness(pgSettings, requestQuery);

    await expect(resolveDownloadStorageTarget({
      options: {
        ...options('global-fallback'),
        resolveBucketName: resolver,
      },
      preloadedStorageModules: snapshotPreloadedStorageModules([
        preloadedConfig('https://tenant.example'),
      ]),
      cacheScope: getStorageModuleCacheScope({}),
      codec,
      withPgClient,
      pgSettings,
      bucketId: BUCKET_ID,
    })).resolves.toMatchObject({
      s3: { bucket: 'persisted-physical-bucket' },
    });
    expect(resolver).not.toHaveBeenCalled();
  });
});

describe('preloaded storage-module configuration', () => {
  const codec = {
    name: 'app_files',
    extensions: { pg: { schemaName: 'storage_public', name: 'app_files' } },
  };

  it('takes an immutable snapshot and performs zero metadata SQL', async () => {
    const source = [preloadedConfig('https://tenant.example')];
    const snapshot = snapshotPreloadedStorageModules(source)!;
    source[0].publicUrlPrefix = 'https://mutated.example';
    source[0].allowedOrigins!.push('https://mutated.example');
    const withPgClient = jest.fn(async () => {
      throw new Error('preloaded configuration must not acquire a metadata client');
    });

    await expect(loadStorageModulesForBuild(
      snapshot,
      withPgClient,
      { role: 'tenant_member' },
      DATABASE_ID,
      getStorageModuleCacheScope({}),
    )).resolves.toBe(snapshot);

    expect(withPgClient).not.toHaveBeenCalled();
    expect(Object.isFrozen(snapshot)).toBe(true);
    expect(Object.isFrozen(snapshot[0])).toBe(true);
    expect(Object.isFrozen(snapshot[0].allowedOrigins)).toBe(true);
    expect(snapshotPreloadedStorageModules(snapshot)).toBe(snapshot);
    expect(snapshot[0].publicUrlPrefix).toBe('https://tenant.example');
    expect(snapshot[0].allowedOrigins).toEqual(['https://app.example']);
  });

  it('rejects executable SQL and inconsistent object names in a preload', () => {
    expect(() => snapshotPreloadedStorageModules([{
      ...preloadedConfig('https://tenant.example'),
      bucketsQualifiedName: 'storage_public.app_buckets; SELECT pg_sleep(10)',
    }])).toThrow(`STORAGE_MODULE_METADATA_INVALID:buckets:${MODULE_ID}`);

    expect(() => snapshotPreloadedStorageModules([{
      ...preloadedConfig('https://tenant.example'),
      bucketsQualifiedName: 'other_schema.app_buckets',
    }])).toThrow(`STORAGE_MODULE_METADATA_INCONSISTENT:${MODULE_ID}`);
  });

  it('rejects duplicate scope metadata in a preload', () => {
    expect(() => snapshotPreloadedStorageModules([
      preloadedConfig('https://tenant-a.example'),
      { ...preloadedConfig('https://tenant-b.example'), id: 'module-b' },
    ])).toThrow('STORAGE_MODULE_METADATA_AMBIGUOUS');
  });

  it('treats an empty preloaded list as authoritative instead of falling back', async () => {
    const snapshot = snapshotPreloadedStorageModules([])!;
    const withPgClient = jest.fn(async () => {
      throw new Error('empty preload must not fall back');
    });

    await expect(loadStorageModulesForBuild(
      snapshot,
      withPgClient,
      { role: 'tenant_member' },
      DATABASE_ID,
      getStorageModuleCacheScope({}),
    )).resolves.toEqual([]);
    expect(withPgClient).not.toHaveBeenCalled();
  });

  it('keeps request identity and bucket authorization under pgSettings', async () => {
    const pgSettings = { role: 'tenant_member' };
    const requestQuery = jest.fn(async ({ text }: QueryOptions) => {
      if (text.includes('current_database_id')) {
        return { rows: [{ id: DATABASE_ID }] };
      }
      if (text.includes('SELECT key, physical_name FROM storage_public.app_buckets')) {
        return { rows: [{ key: 'private', physical_name: 'tenant-bucket' }] };
      }
      if (text.includes('metaschema_')) {
        throw new Error('metadata SQL must not run');
      }
      throw new Error(`Unexpected query: ${text}`);
    });
    const {
      withPgClient,
      withPgClientMock,
      withTransaction,
      query,
    } = requestPgHarness(pgSettings, requestQuery);
    const preloaded = snapshotPreloadedStorageModules([
      preloadedConfig('https://tenant.example'),
    ]);

    await expect(resolveDownloadStorageTarget({
      options: options('tenant-bucket'),
      preloadedStorageModules: preloaded,
      cacheScope: getStorageModuleCacheScope({}),
      codec,
      withPgClient,
      pgSettings,
      bucketId: BUCKET_ID,
    })).resolves.toMatchObject({
      s3: {
        bucket: 'tenant-bucket',
        publicUrlPrefix: 'https://tenant.example',
      },
      downloadUrlExpirySeconds: 1234,
    });

    expect(withPgClientMock).toHaveBeenCalledTimes(1);
    expect(withTransaction).toHaveBeenCalledTimes(1);
    expect(query).toHaveBeenCalledTimes(3);
    expect(requestQuery).toHaveBeenCalledTimes(2);
    expect(requestQuery.mock.calls.map(([arg]) => arg.text).join('\n')).not.toContain('metaschema_');
  });

  it('retains the metadata SQL fallback only when preloaded modules are undefined and applies request settings', async () => {
    const pgSettings = {
      role: 'tenant_member',
      'jwt.claims.api_id': 'api-a',
      'jwt.claims.database_id': DATABASE_ID,
      'jwt.claims.user_id': '',
      'transaction_read_only': 'off',
      'row_security': 'on',
    };
    const pgClient = {
      query: jest.fn(async () => ({ rows: [storageRow('https://generic.example')] })),
    };
    const withPgClient = jest.fn(async (
      settings: unknown,
      callback: (client: typeof pgClient) => Promise<unknown> | unknown,
    ) => {
      expect(settings).toBe(pgSettings);
      return callback(pgClient);
    }) as unknown as StorageWithPgClient;

    await expect(loadStorageModulesForBuild(
      undefined,
      withPgClient,
      pgSettings,
      DATABASE_ID,
      getStorageModuleCacheScope({}),
    )).resolves.toHaveLength(1);

    expect(withPgClient).toHaveBeenCalledTimes(1);
    expect(pgClient.query).toHaveBeenCalledTimes(1);
  });
});
