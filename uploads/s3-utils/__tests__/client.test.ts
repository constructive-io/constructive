/**
 * Tests for the unified S3 client factory.
 */

import { createS3Client, S3ConfigError } from '../src/client';
import type { StorageConnectionConfig } from '../src/client';

describe('createS3Client', () => {
  const baseConfig: StorageConnectionConfig = {
    provider: 's3',
    region: 'us-east-1',
    accessKeyId: 'AKIATEST',
    secretAccessKey: 'secrettest',
  };

  it('creates client for AWS S3', () => {
    const client = createS3Client(baseConfig);
    expect(client).toBeDefined();
    expect(typeof client.send).toBe('function');
  });

  it('creates client for MinIO with endpoint', () => {
    const client = createS3Client({
      ...baseConfig,
      provider: 'minio',
      endpoint: 'http://minio:9000',
    });
    expect(client).toBeDefined();
  });

  it('creates client for R2 with endpoint', () => {
    const client = createS3Client({
      ...baseConfig,
      provider: 'r2',
      endpoint: 'https://account.r2.cloudflarestorage.com',
    });
    expect(client).toBeDefined();
  });

  it('creates client for GCS with endpoint', () => {
    const client = createS3Client({
      ...baseConfig,
      provider: 'gcs',
      endpoint: 'https://storage.googleapis.com',
    });
    expect(client).toBeDefined();
  });

  it('creates client for DO Spaces with endpoint', () => {
    const client = createS3Client({
      ...baseConfig,
      provider: 'spaces',
      endpoint: 'https://nyc3.digitaloceanspaces.com',
    });
    expect(client).toBeDefined();
  });

  it('throws S3ConfigError on missing accessKeyId', () => {
    expect(() =>
      createS3Client({ ...baseConfig, accessKeyId: '' }),
    ).toThrow(S3ConfigError);
  });

  it('throws S3ConfigError on missing secretAccessKey', () => {
    expect(() =>
      createS3Client({ ...baseConfig, secretAccessKey: '' }),
    ).toThrow(S3ConfigError);
  });

  it('throws S3ConfigError on missing region', () => {
    expect(() =>
      createS3Client({ ...baseConfig, region: '' }),
    ).toThrow(S3ConfigError);
  });

  it('throws on non-AWS provider without endpoint', () => {
    expect(() =>
      createS3Client({ ...baseConfig, provider: 'minio' }),
    ).toThrow(S3ConfigError);
    expect(() =>
      createS3Client({ ...baseConfig, provider: 'minio' }),
    ).toThrow("endpoint is required for provider 'minio'");
  });

  it('does not throw on AWS S3 without endpoint', () => {
    expect(() => createS3Client(baseConfig)).not.toThrow();
  });

  it('respects explicit forcePathStyle override', () => {
    const client = createS3Client({
      ...baseConfig,
      forcePathStyle: true,
    });
    expect(client).toBeDefined();
  });
});

describe('S3ConfigError', () => {
  it('has correct name and code', () => {
    const err = new S3ConfigError('INVALID_CONFIG', 'test message');
    expect(err.name).toBe('S3ConfigError');
    expect(err.code).toBe('INVALID_CONFIG');
    expect(err.message).toBe('test message');
    expect(err).toBeInstanceOf(Error);
  });
});
