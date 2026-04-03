/**
 * Tests for S3 client factory.
 */

import { createS3Client } from '../src/client';
import { ProvisionerError } from '../src/types';
import type { StorageConnectionConfig } from '../src/types';

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

  it('throws on missing accessKeyId', () => {
    expect(() =>
      createS3Client({ ...baseConfig, accessKeyId: '' }),
    ).toThrow(ProvisionerError);
  });

  it('throws on missing secretAccessKey', () => {
    expect(() =>
      createS3Client({ ...baseConfig, secretAccessKey: '' }),
    ).toThrow(ProvisionerError);
  });

  it('throws on missing region', () => {
    expect(() =>
      createS3Client({ ...baseConfig, region: '' }),
    ).toThrow(ProvisionerError);
  });

  it('throws on non-AWS provider without endpoint', () => {
    expect(() =>
      createS3Client({ ...baseConfig, provider: 'minio' }),
    ).toThrow(ProvisionerError);
    expect(() =>
      createS3Client({ ...baseConfig, provider: 'minio' }),
    ).toThrow("endpoint is required for provider 'minio'");
  });

  it('does not throw on AWS S3 without endpoint', () => {
    expect(() => createS3Client(baseConfig)).not.toThrow();
  });

  it('respects explicit forcePathStyle override', () => {
    // S3 normally uses virtual-hosted style, but user can force path-style
    const client = createS3Client({
      ...baseConfig,
      forcePathStyle: true,
    });
    expect(client).toBeDefined();
  });
});
