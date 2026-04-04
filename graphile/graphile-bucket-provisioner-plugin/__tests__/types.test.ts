/**
 * Tests for the bucket provisioner plugin types.
 *
 * Validates type definitions, interfaces, and re-exports are correct.
 */

import type {
  BucketProvisionerPluginOptions,
  ConnectionConfigOrGetter,
  BucketNameResolver,
  ProvisionBucketInput,
  ProvisionBucketPayload,
  StorageConnectionConfig,
  StorageProvider,
  BucketAccessType,
  ProvisionResult,
} from '../src/types';

describe('BucketProvisionerPluginOptions', () => {
  it('accepts static connection config', () => {
    const options: BucketProvisionerPluginOptions = {
      connection: {
        provider: 'minio',
        region: 'us-east-1',
        endpoint: 'http://minio:9000',
        accessKeyId: 'test',
        secretAccessKey: 'test',
      },
      allowedOrigins: ['https://app.example.com'],
    };

    expect(options.connection).toBeDefined();
    expect(options.allowedOrigins).toHaveLength(1);
  });

  it('accepts lazy getter connection config', () => {
    const options: BucketProvisionerPluginOptions = {
      connection: () => ({
        provider: 's3',
        region: 'us-west-2',
        accessKeyId: 'key',
        secretAccessKey: 'secret',
      }),
      allowedOrigins: ['https://app.example.com'],
    };

    expect(typeof options.connection).toBe('function');
  });

  it('accepts all optional fields', () => {
    const options: BucketProvisionerPluginOptions = {
      connection: {
        provider: 'r2',
        region: 'auto',
        endpoint: 'https://xxx.r2.cloudflarestorage.com',
        accessKeyId: 'key',
        secretAccessKey: 'secret',
      },
      allowedOrigins: ['https://app.example.com', 'http://localhost:3000'],
      bucketNamePrefix: 'myapp',
      resolveBucketName: (key, dbId) => `${dbId}-${key}`,
      versioning: true,
      autoProvision: false,
    };

    expect(options.bucketNamePrefix).toBe('myapp');
    expect(options.resolveBucketName).toBeDefined();
    expect(options.versioning).toBe(true);
    expect(options.autoProvision).toBe(false);
  });
});

describe('ConnectionConfigOrGetter', () => {
  it('can be a static StorageConnectionConfig', () => {
    const config: ConnectionConfigOrGetter = {
      provider: 'minio',
      region: 'us-east-1',
      endpoint: 'http://minio:9000',
      accessKeyId: 'test',
      secretAccessKey: 'test',
    };

    expect(typeof config).toBe('object');
  });

  it('can be a function returning StorageConnectionConfig', () => {
    const getter: ConnectionConfigOrGetter = () => ({
      provider: 's3',
      region: 'us-east-1',
      accessKeyId: 'key',
      secretAccessKey: 'secret',
    });

    expect(typeof getter).toBe('function');
    const result = getter();
    expect(result.provider).toBe('s3');
  });
});

describe('BucketNameResolver', () => {
  it('takes bucketKey and databaseId and returns a string', () => {
    const resolver: BucketNameResolver = (bucketKey, databaseId) =>
      `org-${databaseId}-${bucketKey}`;

    expect(resolver('public', 'db-123')).toBe('org-db-123-public');
    expect(resolver('private', 'db-456')).toBe('org-db-456-private');
  });
});

describe('ProvisionBucketInput', () => {
  it('has a bucketKey field', () => {
    const input: ProvisionBucketInput = {
      bucketKey: 'public',
    };

    expect(input.bucketKey).toBe('public');
  });
});

describe('ProvisionBucketPayload', () => {
  it('represents a successful provisioning result', () => {
    const payload: ProvisionBucketPayload = {
      success: true,
      bucketName: 'myapp-public',
      accessType: 'public',
      provider: 'minio',
      endpoint: 'http://minio:9000',
      error: null,
    };

    expect(payload.success).toBe(true);
    expect(payload.error).toBeNull();
  });

  it('represents a failed provisioning result', () => {
    const payload: ProvisionBucketPayload = {
      success: false,
      bucketName: 'myapp-public',
      accessType: 'public',
      provider: 'minio',
      endpoint: 'http://minio:9000',
      error: 'S3 connection refused',
    };

    expect(payload.success).toBe(false);
    expect(payload.error).toBe('S3 connection refused');
  });
});

describe('re-exported types from @constructive-io/bucket-provisioner', () => {
  it('StorageProvider includes all supported providers', () => {
    const providers: StorageProvider[] = ['s3', 'minio', 'r2', 'gcs', 'spaces'];
    expect(providers).toHaveLength(5);
  });

  it('BucketAccessType includes all access types', () => {
    const types: BucketAccessType[] = ['public', 'private', 'temp'];
    expect(types).toHaveLength(3);
  });

  it('StorageConnectionConfig has required fields', () => {
    const config: StorageConnectionConfig = {
      provider: 'minio',
      region: 'us-east-1',
      endpoint: 'http://minio:9000',
      accessKeyId: 'key',
      secretAccessKey: 'secret',
    };

    expect(config.provider).toBe('minio');
    expect(config.region).toBe('us-east-1');
    expect(config.endpoint).toBe('http://minio:9000');
  });

  it('ProvisionResult has all expected fields', () => {
    const result: ProvisionResult = {
      bucketName: 'test',
      accessType: 'private',
      endpoint: null,
      provider: 's3',
      region: 'us-east-1',
      publicUrlPrefix: null,
      blockPublicAccess: true,
      versioning: false,
      corsRules: [],
      lifecycleRules: [],
    };

    expect(result.blockPublicAccess).toBe(true);
    expect(result.corsRules).toEqual([]);
  });
});
