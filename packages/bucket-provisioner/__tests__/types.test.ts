/**
 * Tests for types and error classes.
 */

import { ProvisionerError } from '../src/types';
import type {
  StorageProvider,
  StorageConnectionConfig,
  BucketAccessType,
  CreateBucketOptions,
  CorsRule,
  LifecycleRule,
  ProvisionResult,
  ProvisionerErrorCode,
} from '../src/types';

describe('ProvisionerError', () => {
  it('creates error with code and message', () => {
    const err = new ProvisionerError('INVALID_CONFIG', 'bad config');
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(ProvisionerError);
    expect(err.name).toBe('ProvisionerError');
    expect(err.code).toBe('INVALID_CONFIG');
    expect(err.message).toBe('bad config');
    expect(err.cause).toBeUndefined();
  });

  it('creates error with cause', () => {
    const original = new Error('original');
    const err = new ProvisionerError('PROVIDER_ERROR', 'wrapped', original);
    expect(err.code).toBe('PROVIDER_ERROR');
    expect(err.cause).toBe(original);
  });

  it('supports all error codes', () => {
    const codes: ProvisionerErrorCode[] = [
      'CONNECTION_FAILED',
      'BUCKET_ALREADY_EXISTS',
      'BUCKET_NOT_FOUND',
      'INVALID_CONFIG',
      'POLICY_FAILED',
      'CORS_FAILED',
      'LIFECYCLE_FAILED',
      'VERSIONING_FAILED',
      'ACCESS_DENIED',
      'PROVIDER_ERROR',
    ];
    for (const code of codes) {
      const err = new ProvisionerError(code, `test ${code}`);
      expect(err.code).toBe(code);
    }
  });
});

describe('Type definitions', () => {
  it('StorageProvider accepts valid values', () => {
    const providers: StorageProvider[] = ['s3', 'minio', 'r2', 'gcs', 'spaces'];
    expect(providers).toHaveLength(5);
  });

  it('BucketAccessType accepts valid values', () => {
    const types: BucketAccessType[] = ['public', 'private', 'temp'];
    expect(types).toHaveLength(3);
  });

  it('StorageConnectionConfig has required fields', () => {
    const config: StorageConnectionConfig = {
      provider: 'minio',
      region: 'us-east-1',
      endpoint: 'http://minio:9000',
      accessKeyId: 'test',
      secretAccessKey: 'test',
      forcePathStyle: true,
    };
    expect(config.provider).toBe('minio');
    expect(config.endpoint).toBe('http://minio:9000');
  });

  it('CreateBucketOptions has required and optional fields', () => {
    const opts: CreateBucketOptions = {
      bucketName: 'test-bucket',
      accessType: 'private',
      region: 'us-east-1',
      versioning: true,
      publicUrlPrefix: undefined,
    };
    expect(opts.bucketName).toBe('test-bucket');
    expect(opts.versioning).toBe(true);
  });

  it('CorsRule has all fields', () => {
    const rule: CorsRule = {
      allowedOrigins: ['https://example.com'],
      allowedMethods: ['PUT', 'GET'],
      allowedHeaders: ['Content-Type'],
      exposedHeaders: ['ETag'],
      maxAgeSeconds: 3600,
    };
    expect(rule.allowedMethods).toContain('PUT');
  });

  it('LifecycleRule has all fields', () => {
    const rule: LifecycleRule = {
      id: 'temp-cleanup',
      prefix: '',
      expirationDays: 1,
      enabled: true,
    };
    expect(rule.id).toBe('temp-cleanup');
  });

  it('ProvisionResult has all fields', () => {
    const result: ProvisionResult = {
      bucketName: 'test',
      accessType: 'private',
      endpoint: 'http://minio:9000',
      provider: 'minio',
      region: 'us-east-1',
      publicUrlPrefix: null,
      blockPublicAccess: true,
      versioning: false,
      corsRules: [],
      lifecycleRules: [],
    };
    expect(result.blockPublicAccess).toBe(true);
    expect(result.publicUrlPrefix).toBeNull();
  });
});
