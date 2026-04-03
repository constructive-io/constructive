/**
 * Tests for the bucket provisioner plugin.
 *
 * Covers:
 * - provisionBucket mutation (explicit provisioning)
 * - Auto-provisioning hook on bucket create mutations
 * - Error handling and graceful degradation
 * - Connection config resolution (lazy getter, static)
 * - Bucket name resolution (prefix, custom resolver)
 * - Storage module config reading
 */

// Mock @constructive-io/bucket-provisioner before any imports
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

// Mock grafast
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

// Mock graphile-utils
// The extendSchema mock must invoke the plan function so that `lambda` gets
// called and capturedLambdaCallback is set.
const mockGetRaw = jest.fn(() => 'mock-input');
jest.mock('graphile-utils', () => ({
  extendSchema: jest.fn((factory: any) => {
    const schema = factory();
    // Invoke the provisionBucket plan to trigger the lambda mock,
    // which captures the callback into capturedLambdaCallback.
    if (schema.plans?.Mutation?.provisionBucket) {
      schema.plans.Mutation.provisionBucket(
        null,
        { getRaw: mockGetRaw },
      );
    }
    return {
      name: 'ExtendSchemaPlugin',
      schema: {
        hooks: {},
      },
      _typeDefs: schema.typeDefs,
      _plans: schema.plans,
    };
  }),
  gql: jest.fn((strings: TemplateStringsArray) => strings.join('')),
}));

import { createBucketProvisionerPlugin } from '../src/plugin';
import type { BucketProvisionerPluginOptions } from '../src/types';

// --- Test helpers ---

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
        buckets_schema: 'app_public',
        buckets_table: 'buckets',
        endpoint: null,
        public_url_prefix: null,
        provider: null,
      }],
    },
    'app_public': {
      rows: [{
        id: 'bucket-uuid-789',
        key: 'public',
        type: 'public',
        is_public: true,
      }],
    },
  };

  return {
    query: jest.fn((sql: string, _params?: any[]) => {
      for (const [key, value] of Object.entries({ ...defaultQueries, ...overrides })) {
        if (sql.includes(key)) {
          return Promise.resolve(value);
        }
      }
      return Promise.resolve({ rows: [] });
    }),
  };
}

// --- Tests ---

describe('createBucketProvisionerPlugin', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockProvision.mockReset();
    mockBucketProvisionerConstructor.mockReset();
    capturedLambdaCallback = null;

    mockProvision.mockResolvedValue({
      bucketName: 'public',
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

  describe('plugin structure', () => {
    it('returns a plugin object with name and schema hooks', () => {
      const plugin = createBucketProvisionerPlugin(createDefaultOptions());

      expect(plugin).toBeDefined();
      expect(plugin.name).toBe('BucketProvisionerPlugin');
      expect(plugin.version).toBe('0.1.0');
      expect(plugin.schema).toBeDefined();
      expect(plugin.schema!.hooks).toBeDefined();
    });

    it('includes GraphQLObjectType_fields_field hook when autoProvision is true', () => {
      const plugin = createBucketProvisionerPlugin(createDefaultOptions());

      expect(plugin.schema!.hooks!.GraphQLObjectType_fields_field).toBeDefined();
      expect(typeof plugin.schema!.hooks!.GraphQLObjectType_fields_field).toBe('function');
    });

    it('does not include fields_field hook when autoProvision is false', () => {
      const plugin = createBucketProvisionerPlugin(
        createDefaultOptions({ autoProvision: false }),
      );

      // When autoProvision is false, the plugin is just the extendSchema result
      // which doesn't have the GraphQLObjectType_fields_field hook
      const hooks = plugin.schema?.hooks ?? {};
      expect(hooks.GraphQLObjectType_fields_field).toBeUndefined();
    });

    it('sets after dependencies for correct hook ordering', () => {
      const plugin = createBucketProvisionerPlugin(createDefaultOptions());

      expect(plugin.after).toContain('PgAttributesPlugin');
      expect(plugin.after).toContain('PgMutationCreatePlugin');
    });
  });

  describe('provisionBucket mutation (via lambda callback)', () => {
    it('provisions a public bucket successfully', async () => {
      createBucketProvisionerPlugin(createDefaultOptions());

      const pgClient = createMockPgClient();
      const mockWithPgClient = jest.fn((settings: any, callback: any) =>
        callback(pgClient),
      );

      const result = await capturedLambdaCallback!({
        input: { bucketKey: 'public' },
        withPgClient: mockWithPgClient,
        pgSettings: { role: 'admin' },
      });

      expect(result.success).toBe(true);
      expect(result.bucketName).toBe('public');
      expect(result.accessType).toBe('public');
      expect(result.provider).toBe('minio');
      expect(result.error).toBeNull();
    });

    it('provisions a private bucket', async () => {
      const privateBucketOverrides = {
        'app_public': {
          rows: [{
            id: 'bucket-uuid-private',
            key: 'private',
            type: 'private',
            is_public: false,
          }],
        },
      };

      mockProvision.mockResolvedValue({
        bucketName: 'private',
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

      const pgClient = createMockPgClient(privateBucketOverrides);
      const mockWithPgClient = jest.fn((_settings: any, callback: any) =>
        callback(pgClient),
      );

      const result = await capturedLambdaCallback!({
        input: { bucketKey: 'private' },
        withPgClient: mockWithPgClient,
        pgSettings: { role: 'admin' },
      });

      expect(result.success).toBe(true);
      expect(result.bucketName).toBe('private');
      expect(result.accessType).toBe('private');
    });

    it('uses bucketNamePrefix when set', async () => {
      createBucketProvisionerPlugin(
        createDefaultOptions({ bucketNamePrefix: 'myapp' }),
      );

      mockProvision.mockResolvedValue({
        bucketName: 'myapp-public',
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

      const pgClient = createMockPgClient();
      const mockWithPgClient = jest.fn((_settings: any, callback: any) =>
        callback(pgClient),
      );

      const result = await capturedLambdaCallback!({
        input: { bucketKey: 'public' },
        withPgClient: mockWithPgClient,
        pgSettings: { role: 'admin' },
      });

      // The provision call should have the prefixed name
      expect(mockProvision).toHaveBeenCalledWith(
        expect.objectContaining({ bucketName: 'myapp-public' }),
      );
      expect(result.success).toBe(true);
    });

    it('uses custom resolveBucketName when provided', async () => {
      const customResolver = jest.fn(
        (bucketKey: string, databaseId: string) => `org-${databaseId}-${bucketKey}`,
      );

      createBucketProvisionerPlugin(
        createDefaultOptions({ resolveBucketName: customResolver }),
      );

      mockProvision.mockResolvedValue({
        bucketName: 'org-db-uuid-123-public',
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

      const pgClient = createMockPgClient();
      const mockWithPgClient = jest.fn((_settings: any, callback: any) =>
        callback(pgClient),
      );

      await capturedLambdaCallback!({
        input: { bucketKey: 'public' },
        withPgClient: mockWithPgClient,
        pgSettings: { role: 'admin' },
      });

      expect(customResolver).toHaveBeenCalledWith('public', 'db-uuid-123');
      expect(mockProvision).toHaveBeenCalledWith(
        expect.objectContaining({ bucketName: 'org-db-uuid-123-public' }),
      );
    });

    it('throws INVALID_BUCKET_KEY for empty key', async () => {
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
      const mockWithPgClient = jest.fn((_settings: any, callback: any) =>
        callback(pgClient),
      );

      await expect(
        capturedLambdaCallback!({
          input: { bucketKey: 'public' },
          withPgClient: mockWithPgClient,
          pgSettings: {},
        }),
      ).rejects.toThrow('DATABASE_NOT_FOUND');
    });

    it('throws STORAGE_MODULE_NOT_PROVISIONED when no storage module exists', async () => {
      createBucketProvisionerPlugin(createDefaultOptions());

      const pgClient = createMockPgClient({
        'metaschema_modules_public.storage_module': { rows: [] },
      });
      const mockWithPgClient = jest.fn((_settings: any, callback: any) =>
        callback(pgClient),
      );

      await expect(
        capturedLambdaCallback!({
          input: { bucketKey: 'public' },
          withPgClient: mockWithPgClient,
          pgSettings: {},
        }),
      ).rejects.toThrow('STORAGE_MODULE_NOT_PROVISIONED');
    });

    it('throws BUCKET_NOT_FOUND when bucket does not exist', async () => {
      createBucketProvisionerPlugin(createDefaultOptions());

      const pgClient = createMockPgClient({
        'app_public': { rows: [] },
      });
      const mockWithPgClient = jest.fn((_settings: any, callback: any) =>
        callback(pgClient),
      );

      await expect(
        capturedLambdaCallback!({
          input: { bucketKey: 'nonexistent' },
          withPgClient: mockWithPgClient,
          pgSettings: {},
        }),
      ).rejects.toThrow('BUCKET_NOT_FOUND');
    });

    it('returns error payload when provisioning fails', async () => {
      mockProvision.mockRejectedValue(new Error('S3 connection refused'));

      createBucketProvisionerPlugin(createDefaultOptions());

      const pgClient = createMockPgClient();
      const mockWithPgClient = jest.fn((_settings: any, callback: any) =>
        callback(pgClient),
      );

      const result = await capturedLambdaCallback!({
        input: { bucketKey: 'public' },
        withPgClient: mockWithPgClient,
        pgSettings: {},
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('S3 connection refused');
      expect(result.bucketName).toBe('public');
    });

    it('applies per-database endpoint override from storage module', async () => {
      createBucketProvisionerPlugin(createDefaultOptions());

      const pgClient = createMockPgClient({
        'metaschema_modules_public.storage_module': {
          rows: [{
            id: 'sm-uuid-456',
            buckets_schema: 'app_public',
            buckets_table: 'buckets',
            endpoint: 'http://custom-minio:9000',
            public_url_prefix: 'https://cdn.example.com',
            provider: 'minio',
          }],
        },
      });
      const mockWithPgClient = jest.fn((_settings: any, callback: any) =>
        callback(pgClient),
      );

      await capturedLambdaCallback!({
        input: { bucketKey: 'public' },
        withPgClient: mockWithPgClient,
        pgSettings: {},
      });

      // Check that the provisioner was created with the overridden endpoint
      expect(mockBucketProvisionerConstructor).toHaveBeenCalledWith(
        expect.objectContaining({
          connection: expect.objectContaining({
            endpoint: 'http://custom-minio:9000',
            provider: 'minio',
          }),
        }),
      );
    });

    it('passes versioning option to provision call', async () => {
      createBucketProvisionerPlugin(
        createDefaultOptions({ versioning: true }),
      );

      const pgClient = createMockPgClient();
      const mockWithPgClient = jest.fn((_settings: any, callback: any) =>
        callback(pgClient),
      );

      await capturedLambdaCallback!({
        input: { bucketKey: 'public' },
        withPgClient: mockWithPgClient,
        pgSettings: {},
      });

      expect(mockProvision).toHaveBeenCalledWith(
        expect.objectContaining({ versioning: true }),
      );
    });

    it('passes publicUrlPrefix from storage module to provision call', async () => {
      createBucketProvisionerPlugin(createDefaultOptions());

      const pgClient = createMockPgClient({
        'metaschema_modules_public.storage_module': {
          rows: [{
            id: 'sm-uuid-456',
            buckets_schema: 'app_public',
            buckets_table: 'buckets',
            endpoint: null,
            public_url_prefix: 'https://cdn.example.com',
            provider: null,
          }],
        },
      });
      const mockWithPgClient = jest.fn((_settings: any, callback: any) =>
        callback(pgClient),
      );

      await capturedLambdaCallback!({
        input: { bucketKey: 'public' },
        withPgClient: mockWithPgClient,
        pgSettings: {},
      });

      expect(mockProvision).toHaveBeenCalledWith(
        expect.objectContaining({
          publicUrlPrefix: 'https://cdn.example.com',
        }),
      );
    });
  });

  describe('connection config resolution', () => {
    it('resolves static connection config', () => {
      const options = createDefaultOptions();
      createBucketProvisionerPlugin(options);

      // The connection should remain as-is (static object)
      expect(typeof options.connection).toBe('object');
    });

    it('resolves lazy getter connection config on first use', async () => {
      const connectionConfig = {
        provider: 'minio' as const,
        region: 'us-east-1',
        endpoint: 'http://minio:9000',
        accessKeyId: 'minioadmin',
        secretAccessKey: 'minioadmin',
      };
      const getter = jest.fn(() => connectionConfig);

      const options = createDefaultOptions({ connection: getter });
      createBucketProvisionerPlugin(options);

      const pgClient = createMockPgClient();
      const mockWithPgClient = jest.fn((_settings: any, callback: any) =>
        callback(pgClient),
      );

      await capturedLambdaCallback!({
        input: { bucketKey: 'public' },
        withPgClient: mockWithPgClient,
        pgSettings: {},
      });

      expect(getter).toHaveBeenCalledTimes(1);

      // Second call should use cached value
      await capturedLambdaCallback!({
        input: { bucketKey: 'public' },
        withPgClient: mockWithPgClient,
        pgSettings: {},
      });

      // Still only 1 call because it was cached
      expect(getter).toHaveBeenCalledTimes(1);
    });
  });

  describe('auto-provisioning hook (GraphQLObjectType_fields_field)', () => {
    function getFieldsFieldHook(options?: Partial<BucketProvisionerPluginOptions>) {
      const plugin = createBucketProvisionerPlugin(createDefaultOptions(options));
      return plugin.schema!.hooks!.GraphQLObjectType_fields_field as Function;
    }

    it('skips non-mutation fields', () => {
      const hook = getFieldsFieldHook();
      const field = { resolve: jest.fn() };
      const build = {};
      const context = {
        scope: {
          isRootMutation: false,
          fieldName: 'buckets',
          pgCodec: { name: 'Bucket', attributes: {} },
        },
      };

      const result = hook(field, build, context);
      expect(result).toBe(field);
    });

    it('skips when pgCodec is missing', () => {
      const hook = getFieldsFieldHook();
      const field = { resolve: jest.fn() };
      const build = {};
      const context = {
        scope: {
          isRootMutation: true,
          fieldName: 'createBucket',
          pgCodec: null as any,
        },
      };

      const result = hook(field, build, context);
      expect(result).toBe(field);
    });

    it('skips when pgCodec has no @storageBuckets tag', () => {
      const hook = getFieldsFieldHook();
      const field = { resolve: jest.fn() };
      const build = {};
      const context = {
        scope: {
          isRootMutation: true,
          fieldName: 'createBucket',
          pgCodec: {
            name: 'Bucket',
            attributes: { key: {} },
            extensions: { tags: {} },
          },
        },
      };

      const result = hook(field, build, context);
      expect(result).toBe(field);
    });

    it('skips non-create mutations (e.g., updateBucket, deleteBucket)', () => {
      const hook = getFieldsFieldHook();
      const field = { resolve: jest.fn() };
      const build = {};
      const context = {
        scope: {
          isRootMutation: true,
          fieldName: 'updateBucket',
          pgCodec: {
            name: 'Bucket',
            attributes: { key: {} },
            extensions: { tags: { storageBuckets: true } },
          },
        },
      };

      const result = hook(field, build, context);
      expect(result).toBe(field);
    });

    it('wraps create mutations on @storageBuckets-tagged tables', () => {
      const hook = getFieldsFieldHook();
      const originalResolve = jest.fn().mockResolvedValue({ data: { id: 'new-bucket' } });
      const field = { resolve: originalResolve };
      const build = {};
      const context = {
        scope: {
          isRootMutation: true,
          fieldName: 'createBucket',
          pgCodec: {
            name: 'Bucket',
            attributes: { key: {}, type: {} },
            extensions: { tags: { storageBuckets: true } },
          },
        },
      };

      const result = hook(field, build, context);

      expect(result).not.toBe(field);
      expect(result.resolve).toBeDefined();
      expect(typeof result.resolve).toBe('function');
    });

    it('calls original resolver first then provisions', async () => {
      const hook = getFieldsFieldHook();
      const mutationResult = { data: { id: 'new-bucket' } };
      const originalResolve = jest.fn().mockResolvedValue(mutationResult);
      const field = { resolve: originalResolve };
      const build = {};
      const context = {
        scope: {
          isRootMutation: true,
          fieldName: 'createBucket',
          pgCodec: {
            name: 'Bucket',
            attributes: { key: {}, type: {} },
            extensions: { tags: { storageBuckets: true } },
          },
        },
      };

      const wrapped = hook(field, build, context);

      const pgClient = createMockPgClient();
      const mockWithPgClient = jest.fn((_settings: any, callback: any) =>
        callback(pgClient),
      );

      const graphqlContext = {
        withPgClient: mockWithPgClient,
        pgSettings: { role: 'admin' },
      };

      const result = await wrapped.resolve(
        null,
        { input: { bucket: { key: 'public', type: 'public' } } },
        graphqlContext,
        {},
      );

      // Original resolver should be called
      expect(originalResolve).toHaveBeenCalled();
      // The mutation result should be returned
      expect(result).toBe(mutationResult);
      // Provisioning should have been called
      expect(mockProvision).toHaveBeenCalled();
    });

    it('returns mutation result even if provisioning fails', async () => {
      const hook = getFieldsFieldHook();
      const mutationResult = { data: { id: 'new-bucket' } };
      const originalResolve = jest.fn().mockResolvedValue(mutationResult);
      const field = { resolve: originalResolve };
      const build = {};
      const context = {
        scope: {
          isRootMutation: true,
          fieldName: 'createBucket',
          pgCodec: {
            name: 'Bucket',
            attributes: { key: {}, type: {} },
            extensions: { tags: { storageBuckets: true } },
          },
        },
      };

      mockProvision.mockRejectedValue(new Error('S3 connection refused'));

      const wrapped = hook(field, build, context);

      const pgClient = createMockPgClient();
      const mockWithPgClient = jest.fn((_settings: any, callback: any) =>
        callback(pgClient),
      );

      const graphqlContext = {
        withPgClient: mockWithPgClient,
        pgSettings: { role: 'admin' },
      };

      // Should NOT throw — provisioning errors are logged, not thrown
      const result = await wrapped.resolve(
        null,
        { input: { bucket: { key: 'public', type: 'public' } } },
        graphqlContext,
        {},
      );

      expect(result).toBe(mutationResult);
    });

    it('skips provisioning when key/type not in mutation input', async () => {
      const hook = getFieldsFieldHook();
      const mutationResult = { data: { id: 'new-bucket' } };
      const originalResolve = jest.fn().mockResolvedValue(mutationResult);
      const field = { resolve: originalResolve };
      const build = {};
      const context = {
        scope: {
          isRootMutation: true,
          fieldName: 'createBucket',
          pgCodec: {
            name: 'Bucket',
            attributes: { key: {}, type: {} },
            extensions: { tags: { storageBuckets: true } },
          },
        },
      };

      const wrapped = hook(field, build, context);

      const result = await wrapped.resolve(
        null,
        { input: { bucket: { name: 'test' } } }, // Missing key and type
        { withPgClient: jest.fn(), pgSettings: {} },
        {},
      );

      // Should still return the mutation result
      expect(result).toBe(mutationResult);
      // Should NOT call provision
      expect(mockProvision).not.toHaveBeenCalled();
    });

    it('skips provisioning when withPgClient not in context', async () => {
      const hook = getFieldsFieldHook();
      const mutationResult = { data: { id: 'new-bucket' } };
      const originalResolve = jest.fn().mockResolvedValue(mutationResult);
      const field = { resolve: originalResolve };
      const build = {};
      const context = {
        scope: {
          isRootMutation: true,
          fieldName: 'createBucket',
          pgCodec: {
            name: 'Bucket',
            attributes: { key: {}, type: {} },
            extensions: { tags: { storageBuckets: true } },
          },
        },
      };

      const wrapped = hook(field, build, context);

      const result = await wrapped.resolve(
        null,
        { input: { bucket: { key: 'public', type: 'public' } } },
        { pgSettings: {} }, // No withPgClient
        {},
      );

      expect(result).toBe(mutationResult);
      expect(mockProvision).not.toHaveBeenCalled();
    });

    it('uses default resolver when field has no resolve', () => {
      const hook = getFieldsFieldHook();
      const field = {}; // No resolve function
      const build = {};
      const context = {
        scope: {
          isRootMutation: true,
          fieldName: 'createBucket',
          pgCodec: {
            name: 'Bucket',
            attributes: { key: {}, type: {} },
            extensions: { tags: { storageBuckets: true } },
          },
        },
      };

      const wrapped = hook(field, build, context);
      expect(wrapped.resolve).toBeDefined();
    });
  });
});

describe('bucket name resolution', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockProvision.mockReset();
    mockBucketProvisionerConstructor.mockReset();
    capturedLambdaCallback = null;
  });

  it('uses plain bucket key when no prefix or resolver', async () => {
    mockProvision.mockResolvedValue({
      bucketName: 'private',
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

    createBucketProvisionerPlugin({
      connection: {
        provider: 'minio',
        region: 'us-east-1',
        endpoint: 'http://minio:9000',
        accessKeyId: 'test',
        secretAccessKey: 'test',
      },
      allowedOrigins: ['https://app.example.com'],
    });

    const pgClient = createMockPgClient({
      'app_public': {
        rows: [{
          id: 'bucket-uuid',
          key: 'private',
          type: 'private',
          is_public: false,
        }],
      },
    });
    const mockWithPgClient = jest.fn((_settings: any, callback: any) =>
      callback(pgClient),
    );

    await capturedLambdaCallback!({
      input: { bucketKey: 'private' },
      withPgClient: mockWithPgClient,
      pgSettings: {},
    });

    expect(mockProvision).toHaveBeenCalledWith(
      expect.objectContaining({ bucketName: 'private' }),
    );
  });

  it('resolveBucketName takes precedence over bucketNamePrefix', async () => {
    mockProvision.mockResolvedValue({
      bucketName: 'custom-public',
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

    const customResolver = jest.fn(
      (bucketKey: string) => `custom-${bucketKey}`,
    );

    createBucketProvisionerPlugin({
      connection: {
        provider: 'minio',
        region: 'us-east-1',
        endpoint: 'http://minio:9000',
        accessKeyId: 'test',
        secretAccessKey: 'test',
      },
      allowedOrigins: ['https://app.example.com'],
      bucketNamePrefix: 'should-be-ignored',
      resolveBucketName: customResolver,
    });

    const pgClient = createMockPgClient();
    const mockWithPgClient = jest.fn((_settings: any, callback: any) =>
      callback(pgClient),
    );

    await capturedLambdaCallback!({
      input: { bucketKey: 'public' },
      withPgClient: mockWithPgClient,
      pgSettings: {},
    });

    expect(customResolver).toHaveBeenCalled();
    expect(mockProvision).toHaveBeenCalledWith(
      expect.objectContaining({ bucketName: 'custom-public' }),
    );
  });
});
