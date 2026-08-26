/**
 * Tests for the explicit bucket provisioning mutation.
 */

const mockProvision = jest.fn();
const mockBucketProvisionerConstructor = jest.fn();

jest.mock('@constructive-io/bucket-provisioner', () => ({
  BucketProvisioner: jest.fn().mockImplementation((opts: any) => {
    mockBucketProvisionerConstructor(opts);
    return { provision: mockProvision };
  }),
}));

jest.mock('@pgpmjs/logger', () => ({
  Logger: jest.fn().mockImplementation(() => ({
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  })),
}));

let capturedLambdaCallback: Function | null = null;
jest.mock('grafast', () => ({
  context: jest.fn(() => ({
    get: jest.fn((key: string) => `mock-${key}`),
  })),
  lambda: jest.fn((_combined: any, callback: any) => {
    capturedLambdaCallback = callback;
    return 'lambda-step';
  }),
  object: jest.fn((obj: any) => obj),
}));

const mockGetRaw = jest.fn(() => 'mock-input');
jest.mock('graphile-utils', () => ({
  extendSchema: jest.fn((factory: any) => {
    const schema = factory();
    if (schema.plans?.Mutation?.provisionBucket) {
      schema.plans.Mutation.provisionBucket(null, { getRaw: mockGetRaw });
    }
    return {
      name: 'ExtendSchemaPlugin',
      schema: { hooks: {} },
      _typeDefs: schema.typeDefs,
      _plans: schema.plans,
    };
  }),
  gql: jest.fn((strings: TemplateStringsArray) => strings.join('')),
}));

import { createBucketProvisionerPlugin } from '../src/plugin';
import type { BucketProvisionerPluginOptions } from '../src/types';

function createDefaultOptions(
  overrides: Partial<BucketProvisionerPluginOptions> = {},
): BucketProvisionerPluginOptions {
  return {
    connection: {
      provider: 'minio',
      region: 'us-east-1',
      endpoint: 'http://minio:9000',
      accessKeyId: 'minioadmin',
      secretAccessKey: 'minioadmin',
    },
    allowedOrigins: ['https://app.example.com'],
    resolveBucketName: (databaseId, bucketKey) => `tenant-${databaseId}-${bucketKey}`,
    ...overrides,
  };
}

function createMockPgClient(overrides: Record<string, any> = {}) {
  const defaultQueries: Record<string, any> = {
    'jwt_private.current_database_id': {
      rows: [{ id: 'db-uuid-123' }],
    },
    'metaschema_modules_public.storage_module': {
      rows: [{
        id: 'sm-uuid-456',
        scope: 'app',
        entity_table_id: null,
        buckets_schema: 'app_public',
        buckets_table: 'buckets',
        endpoint: null,
        public_url_prefix: null,
        provider: null,
        allowed_origins: null,
        entity_schema: null,
        entity_table: null,
      }],
    },
    app_public: {
      rows: [{
        id: 'bucket-uuid-789',
        key: 'public',
        type: 'public',
        is_public: true,
        allowed_origins: null,
        physical_name: null,
      }],
    },
  };

  return {
    query: jest.fn((arg: any) => {
      const sql: string = typeof arg === 'string' ? arg : arg.text;
      for (const [key, value] of Object.entries({ ...defaultQueries, ...overrides })) {
        if (sql.includes(key)) return Promise.resolve(value);
      }
      return Promise.resolve({ rows: [] });
    }),
  };
}

describe('createBucketProvisionerPlugin', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockProvision.mockReset();
    mockBucketProvisionerConstructor.mockReset();
    capturedLambdaCallback = null;
    mockProvision.mockResolvedValue({
      bucketName: 'tenant-db-uuid-123-public',
      accessType: 'public',
      endpoint: 'http://minio:9000',
      provider: 'minio',
      region: 'us-east-1',
      publicUrlPrefix: null,
      blockPublicAccess: false,
      versioning: false,
      corsRules: [],
      lifecycleRules: [],
    });
  });

  it('returns a mutation-only plugin', () => {
    const plugin = createBucketProvisionerPlugin(createDefaultOptions());

    expect(plugin).toBeDefined();
    expect(plugin.name).toBe('ExtendSchemaPlugin');
    expect(plugin.schema).toBeDefined();
    expect(plugin.schema!.hooks).toEqual({});
  });

  it('provisions a public bucket successfully', async () => {
    createBucketProvisionerPlugin(createDefaultOptions());
    const pgClient = createMockPgClient();
    const mockWithPgClient = jest.fn((_settings: any, callback: any) => callback(pgClient));

    const result = await capturedLambdaCallback!({
      input: { bucketKey: 'public' },
      withPgClient: mockWithPgClient,
      pgSettings: { role: 'admin' },
    });

    expect(result.success).toBe(true);
    expect(result.bucketName).toBe('tenant-db-uuid-123-public');
    expect(result.accessType).toBe('public');
    expect(result.provider).toBe('minio');
    expect(result.error).toBeNull();
    expect(mockProvision).toHaveBeenCalledWith(
      expect.objectContaining({ bucketName: 'tenant-db-uuid-123-public' }),
    );
  });

  it('uses the database-first resolver order and never passes the bare key', async () => {
    const resolveBucketName = jest.fn(
      (databaseId: string, bucketKey: string) => `physical-${databaseId}-${bucketKey}`,
    );
    createBucketProvisionerPlugin(createDefaultOptions({ resolveBucketName }));
    const pgClient = createMockPgClient();
    const mockWithPgClient = jest.fn((_settings: any, callback: any) => callback(pgClient));

    await capturedLambdaCallback!({
      input: { bucketKey: 'public' },
      withPgClient: mockWithPgClient,
      pgSettings: {},
    });

    expect(resolveBucketName).toHaveBeenCalledWith('db-uuid-123', 'public');
    expect(mockProvision).toHaveBeenCalledWith(
      expect.objectContaining({ bucketName: 'physical-db-uuid-123-public' }),
    );
    expect(mockProvision).not.toHaveBeenCalledWith(
      expect.objectContaining({ bucketName: 'public' }),
    );
  });

  it('throws when no physical bucket naming policy is configured', async () => {
    createBucketProvisionerPlugin(createDefaultOptions({ resolveBucketName: undefined }));
    const pgClient = createMockPgClient();
    const mockWithPgClient = jest.fn((_settings: any, callback: any) => callback(pgClient));

    await expect(
      capturedLambdaCallback!({
        input: { bucketKey: 'public' },
        withPgClient: mockWithPgClient,
        pgSettings: {},
      }),
    ).rejects.toThrow('STORAGE_BUCKET_NAME_POLICY_MISSING');
    expect(mockProvision).not.toHaveBeenCalled();
  });

  it('provisions a private bucket', async () => {
    mockProvision.mockResolvedValue({
      bucketName: 'tenant-db-uuid-123-private',
      accessType: 'private',
      endpoint: 'http://minio:9000',
      provider: 'minio',
      region: 'us-east-1',
      publicUrlPrefix: null,
      blockPublicAccess: true,
      versioning: false,
      corsRules: [],
      lifecycleRules: [],
    });
    createBucketProvisionerPlugin(createDefaultOptions());
    const pgClient = createMockPgClient({
      app_public: {
        rows: [{
          id: 'bucket-uuid-private',
          key: 'private',
          type: 'private',
          is_public: false,
          allowed_origins: null,
          physical_name: null,
        }],
      },
    });
    const mockWithPgClient = jest.fn((_settings: any, callback: any) => callback(pgClient));

    const result = await capturedLambdaCallback!({
      input: { bucketKey: 'private' },
      withPgClient: mockWithPgClient,
      pgSettings: {},
    });

    expect(result.success).toBe(true);
    expect(result.accessType).toBe('private');
  });

  it('throws INVALID_BUCKET_KEY for an empty key', async () => {
    createBucketProvisionerPlugin(createDefaultOptions());

    await expect(
      capturedLambdaCallback!({
        input: { bucketKey: '' },
        withPgClient: jest.fn(),
        pgSettings: {},
      }),
    ).rejects.toThrow('INVALID_BUCKET_KEY');
  });

  it('throws DATABASE_NOT_FOUND when database_id is null', async () => {
    createBucketProvisionerPlugin(createDefaultOptions());
    const pgClient = createMockPgClient({
      'jwt_private.current_database_id': { rows: [{ id: null }] },
    });
    const mockWithPgClient = jest.fn((_settings: any, callback: any) => callback(pgClient));

    await expect(
      capturedLambdaCallback!({
        input: { bucketKey: 'public' },
        withPgClient: mockWithPgClient,
        pgSettings: {},
      }),
    ).rejects.toThrow('DATABASE_NOT_FOUND');
  });

  it('throws STORAGE_MODULE_NOT_PROVISIONED when no storage modules exist', async () => {
    createBucketProvisionerPlugin(createDefaultOptions());
    const pgClient = createMockPgClient({
      'metaschema_modules_public.storage_module': { rows: [] },
    });
    const mockWithPgClient = jest.fn((_settings: any, callback: any) => callback(pgClient));

    await expect(
      capturedLambdaCallback!({
        input: { bucketKey: 'public' },
        withPgClient: mockWithPgClient,
        pgSettings: {},
      }),
    ).rejects.toThrow('STORAGE_MODULE_NOT_PROVISIONED');
  });

  it('throws BUCKET_NOT_FOUND when the bucket does not exist', async () => {
    createBucketProvisionerPlugin(createDefaultOptions());
    const pgClient = createMockPgClient({ app_public: { rows: [] } });
    const mockWithPgClient = jest.fn((_settings: any, callback: any) => callback(pgClient));

    await expect(
      capturedLambdaCallback!({
        input: { bucketKey: 'missing' },
        withPgClient: mockWithPgClient,
        pgSettings: {},
      }),
    ).rejects.toThrow('BUCKET_NOT_FOUND');
  });

  it('returns an error payload when provisioning fails', async () => {
    mockProvision.mockRejectedValue(new Error('S3 connection refused'));
    createBucketProvisionerPlugin(createDefaultOptions());
    const pgClient = createMockPgClient();
    const mockWithPgClient = jest.fn((_settings: any, callback: any) => callback(pgClient));

    const result = await capturedLambdaCallback!({
      input: { bucketKey: 'public' },
      withPgClient: mockWithPgClient,
      pgSettings: {},
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('S3 connection refused');
    expect(result.bucketName).toBe('tenant-db-uuid-123-public');
  });

  it('records the physical name with the record-once guard', async () => {
    createBucketProvisionerPlugin(createDefaultOptions());
    const pgClient = createMockPgClient();
    const mockWithPgClient = jest.fn((_settings: any, callback: any) => callback(pgClient));

    await capturedLambdaCallback!({
      input: { bucketKey: 'public' },
      withPgClient: mockWithPgClient,
      pgSettings: { role: 'admin' },
    });

    const update = pgClient.query.mock.calls.find(
      (call: any[]) => call[0]?.text?.includes('SET physical_name'),
    );
    expect(update).toBeDefined();
    expect(update![0].text).toContain('physical_name IS NULL');
    expect(update![0].values).toEqual(['tenant-db-uuid-123-public', 'bucket-uuid-789']);
    expect(mockWithPgClient).toHaveBeenCalledWith(null, expect.any(Function));
  });

  it('provisions the stored physical name verbatim', async () => {
    createBucketProvisionerPlugin(createDefaultOptions());
    const pgClient = createMockPgClient({
      app_public: {
        rows: [{
          id: 'bucket-uuid-789',
          key: 'public',
          type: 'public',
          is_public: true,
          allowed_origins: null,
          physical_name: 'preexisting-cdn-bucket',
        }],
      },
    });
    mockProvision.mockResolvedValue({
      bucketName: 'preexisting-cdn-bucket',
      accessType: 'public',
      endpoint: 'http://minio:9000',
      provider: 'minio',
      region: 'us-east-1',
      publicUrlPrefix: null,
      blockPublicAccess: false,
      versioning: false,
      corsRules: [],
      lifecycleRules: [],
    });
    const mockWithPgClient = jest.fn((_settings: any, callback: any) => callback(pgClient));

    const result = await capturedLambdaCallback!({
      input: { bucketKey: 'public' },
      withPgClient: mockWithPgClient,
      pgSettings: {},
    });

    expect(result.success).toBe(true);
    expect(mockProvision).toHaveBeenCalledWith(
      expect.objectContaining({ bucketName: 'preexisting-cdn-bucket' }),
    );
    const update = pgClient.query.mock.calls.find(
      (call: any[]) => call[0]?.text?.includes('SET physical_name'),
    );
    expect(update).toBeDefined();
    expect(update![0].text).toContain('physical_name IS NULL');
  });

  it('does not record a name when provisioning fails', async () => {
    mockProvision.mockRejectedValue(new Error('S3 connection refused'));
    createBucketProvisionerPlugin(createDefaultOptions());
    const pgClient = createMockPgClient();
    const mockWithPgClient = jest.fn((_settings: any, callback: any) => callback(pgClient));

    await capturedLambdaCallback!({
      input: { bucketKey: 'public' },
      withPgClient: mockWithPgClient,
      pgSettings: {},
    });

    const update = pgClient.query.mock.calls.find(
      (call: any[]) => call[0]?.text?.includes('SET physical_name'),
    );
    expect(update).toBeUndefined();
  });

  it('applies storage-module endpoint and public URL overrides', async () => {
    createBucketProvisionerPlugin(createDefaultOptions());
    const pgClient = createMockPgClient({
      'metaschema_modules_public.storage_module': {
        rows: [{
          id: 'sm-uuid-456',
          scope: 'app',
          entity_table_id: null,
          buckets_schema: 'app_public',
          buckets_table: 'buckets',
          endpoint: 'http://custom-minio:9000',
          public_url_prefix: 'https://cdn.example.com',
          provider: 'minio',
          allowed_origins: null,
          entity_schema: null,
          entity_table: null,
        }],
      },
    });
    const mockWithPgClient = jest.fn((_settings: any, callback: any) => callback(pgClient));

    await capturedLambdaCallback!({
      input: { bucketKey: 'public' },
      withPgClient: mockWithPgClient,
      pgSettings: {},
    });

    expect(mockBucketProvisionerConstructor).toHaveBeenCalledWith(
      expect.objectContaining({
        connection: expect.objectContaining({
          endpoint: 'http://custom-minio:9000',
          provider: 'minio',
        }),
      }),
    );
    expect(mockProvision).toHaveBeenCalledWith(
      expect.objectContaining({ publicUrlPrefix: 'https://cdn.example.com' }),
    );
  });

  it('passes the versioning option to the provisioner', async () => {
    createBucketProvisionerPlugin(createDefaultOptions({ versioning: true }));
    const pgClient = createMockPgClient();
    const mockWithPgClient = jest.fn((_settings: any, callback: any) => callback(pgClient));

    await capturedLambdaCallback!({
      input: { bucketKey: 'public' },
      withPgClient: mockWithPgClient,
      pgSettings: {},
    });

    expect(mockProvision).toHaveBeenCalledWith(
      expect.objectContaining({ versioning: true }),
    );
  });

  it('caches a lazy connection getter', async () => {
    const connection = {
      provider: 'minio' as const,
      region: 'us-east-1',
      endpoint: 'http://minio:9000',
      accessKeyId: 'minioadmin',
      secretAccessKey: 'minioadmin',
    };
    const getter = jest.fn(() => connection);
    const options = createDefaultOptions({ connection: getter });
    createBucketProvisionerPlugin(options);
    const pgClient = createMockPgClient();
    const mockWithPgClient = jest.fn((_settings: any, callback: any) => callback(pgClient));

    await capturedLambdaCallback!({
      input: { bucketKey: 'public' },
      withPgClient: mockWithPgClient,
      pgSettings: {},
    });
    await capturedLambdaCallback!({
      input: { bucketKey: 'public' },
      withPgClient: mockWithPgClient,
      pgSettings: {},
    });

    expect(getter).toHaveBeenCalledTimes(1);
  });
});
