/**
 * Integration tests for BucketProvisioner against a real MinIO instance.
 *
 * These tests exercise the full provisioning pipeline end-to-end:
 *   1. provision() — create bucket, set policies, CORS, versioning, lifecycle
 *   2. inspect() — read back all bucket config and verify it matches
 *   3. updateCors() — change CORS rules on an existing bucket
 *   4. bucketExists() — verify bucket existence checks
 *
 * Requires MinIO running on localhost:9000 (docker-compose or CI service).
 * Skips gracefully when MinIO is not reachable.
 */

import { BucketProvisioner } from '../src/provisioner';
import type { StorageConnectionConfig } from '../src/types';
import { ProvisionerError } from '../src/types';

// --- MinIO config (matches CI env) ---

const MINIO_ENDPOINT = process.env.CDN_ENDPOINT || 'http://localhost:9000';
const AWS_REGION = process.env.AWS_REGION || 'us-east-1';
const AWS_ACCESS_KEY = process.env.AWS_ACCESS_KEY || 'minioadmin';
const AWS_SECRET_KEY = process.env.AWS_SECRET_KEY || 'minioadmin';

const connection: StorageConnectionConfig = {
  provider: 'minio',
  region: AWS_REGION,
  endpoint: MINIO_ENDPOINT,
  accessKeyId: AWS_ACCESS_KEY,
  secretAccessKey: AWS_SECRET_KEY,
};

const TEST_ORIGINS = ['https://app.example.com'];

jest.setTimeout(30000);

// Unique prefix per test run to avoid bucket name collisions
const RUN_ID = Date.now().toString(36);

function testBucketName(suffix: string): string {
  return `bp-test-${RUN_ID}-${suffix}`;
}

/**
 * Check if MinIO is reachable. Skips the entire suite if not.
 */
async function isMinioReachable(): Promise<boolean> {
  try {
    const response = await fetch(`${MINIO_ENDPOINT}/minio/health/live`, {
      signal: AbortSignal.timeout(3000),
    });
    return response.ok;
  } catch {
    return false;
  }
}

// --- Conditional test runner ---
// If MinIO is not available, all tests in this file pass instantly (early return).

let minioAvailable = false;

beforeAll(async () => {
  minioAvailable = await isMinioReachable();
  if (!minioAvailable) {
    // eslint-disable-next-line no-console
    console.warn(
      'MinIO not reachable at %s — skipping bucket-provisioner integration tests',
      MINIO_ENDPOINT,
    );
  }
});

// --- Tests ---

describe('BucketProvisioner integration (MinIO)', () => {
  let provisioner: BucketProvisioner;

  beforeAll(() => {
    if (!minioAvailable) return;
    provisioner = new BucketProvisioner({
      connection,
      allowedOrigins: TEST_ORIGINS,
    });
  });

  describe('provision — private bucket', () => {
    const bucketName = testBucketName('private');

    it('should provision a private bucket with all settings applied', async () => {
      if (!minioAvailable) return;

      const result = await provisioner.provision({
        bucketName,
        accessType: 'private',
      });

      expect(result.bucketName).toBe(bucketName);
      expect(result.accessType).toBe('private');
      expect(result.provider).toBe('minio');
      expect(result.region).toBe(AWS_REGION);
      expect(result.endpoint).toBe(MINIO_ENDPOINT);
      expect(result.blockPublicAccess).toBe(true);
      expect(result.versioning).toBe(false);
      expect(result.publicUrlPrefix).toBeNull();
      expect(result.lifecycleRules).toHaveLength(0);
      expect(result.corsRules).toHaveLength(1);
      expect(result.corsRules[0].allowedOrigins).toEqual(TEST_ORIGINS);
      expect(result.corsRules[0].allowedMethods).toContain('PUT');
      expect(result.corsRules[0].allowedMethods).toContain('HEAD');
      expect(result.corsRules[0].allowedMethods).not.toContain('GET');
    });

    it('should be inspectable after provisioning', async () => {
      if (!minioAvailable) return;

      const inspected = await provisioner.inspect(bucketName, 'private');

      expect(inspected.bucketName).toBe(bucketName);
      expect(inspected.accessType).toBe('private');
      expect(inspected.blockPublicAccess).toBe(true);
      expect(inspected.versioning).toBe(false);
      expect(inspected.corsRules).toHaveLength(1);
      expect(inspected.corsRules[0].allowedOrigins).toEqual(TEST_ORIGINS);
      expect(inspected.corsRules[0].allowedMethods).toContain('PUT');
      expect(inspected.corsRules[0].allowedMethods).toContain('HEAD');
    });

    it('should survive re-provisioning (idempotent)', async () => {
      if (!minioAvailable) return;

      const result = await provisioner.provision({
        bucketName,
        accessType: 'private',
      });

      expect(result.bucketName).toBe(bucketName);
      expect(result.accessType).toBe('private');
    });
  });

  describe('provision — public bucket', () => {
    const bucketName = testBucketName('public');

    it('should provision a public bucket with correct policy and CORS', async () => {
      if (!minioAvailable) return;

      const result = await provisioner.provision({
        bucketName,
        accessType: 'public',
        publicUrlPrefix: 'https://cdn.example.com',
      });

      expect(result.bucketName).toBe(bucketName);
      expect(result.accessType).toBe('public');
      expect(result.blockPublicAccess).toBe(false);
      expect(result.publicUrlPrefix).toBe('https://cdn.example.com');
      expect(result.corsRules).toHaveLength(1);
      expect(result.corsRules[0].allowedMethods).toContain('PUT');
      expect(result.corsRules[0].allowedMethods).toContain('GET');
      expect(result.corsRules[0].allowedMethods).toContain('HEAD');
    });

    it('should be inspectable with public policy visible', async () => {
      if (!minioAvailable) return;

      const inspected = await provisioner.inspect(bucketName, 'public');

      expect(inspected.bucketName).toBe(bucketName);
      expect(inspected.accessType).toBe('public');
      // MinIO may not fully enforce public access blocks the same way as AWS,
      // so we check CORS and the fact that the bucket exists
      expect(inspected.corsRules).toHaveLength(1);
      expect(inspected.corsRules[0].allowedMethods).toContain('GET');
    });
  });

  describe('provision — temp bucket', () => {
    const bucketName = testBucketName('temp');

    it('should provision a temp bucket with lifecycle rules', async () => {
      if (!minioAvailable) return;

      const result = await provisioner.provision({
        bucketName,
        accessType: 'temp',
      });

      expect(result.bucketName).toBe(bucketName);
      expect(result.accessType).toBe('temp');
      expect(result.blockPublicAccess).toBe(true);
      expect(result.publicUrlPrefix).toBeNull();
      expect(result.lifecycleRules).toHaveLength(1);
      expect(result.lifecycleRules[0].id).toBe('temp-cleanup');
      expect(result.lifecycleRules[0].expirationDays).toBe(1);
      expect(result.lifecycleRules[0].enabled).toBe(true);
    });

    it('should be inspectable with lifecycle rules visible', async () => {
      if (!minioAvailable) return;

      const inspected = await provisioner.inspect(bucketName, 'temp');

      expect(inspected.bucketName).toBe(bucketName);
      expect(inspected.lifecycleRules).toHaveLength(1);
      expect(inspected.lifecycleRules[0].expirationDays).toBe(1);
    });
  });

  describe('provision — versioning', () => {
    const bucketName = testBucketName('versioned');

    it('should enable versioning when requested', async () => {
      if (!minioAvailable) return;

      const result = await provisioner.provision({
        bucketName,
        accessType: 'private',
        versioning: true,
      });

      expect(result.versioning).toBe(true);
    });

    it('should report versioning enabled on inspect', async () => {
      if (!minioAvailable) return;

      const inspected = await provisioner.inspect(bucketName, 'private');
      expect(inspected.versioning).toBe(true);
    });
  });

  describe('provision — per-bucket CORS override', () => {
    const bucketName = testBucketName('custom-cors');
    const customOrigins = ['https://custom.example.com', 'https://other.example.com'];

    it('should use per-bucket allowedOrigins when provided', async () => {
      if (!minioAvailable) return;

      const result = await provisioner.provision({
        bucketName,
        accessType: 'private',
        allowedOrigins: customOrigins,
      });

      expect(result.corsRules).toHaveLength(1);
      expect(result.corsRules[0].allowedOrigins).toEqual(customOrigins);
    });

    it('should show custom origins on inspect', async () => {
      if (!minioAvailable) return;

      const inspected = await provisioner.inspect(bucketName, 'private');
      expect(inspected.corsRules[0].allowedOrigins).toEqual(customOrigins);
    });
  });

  describe('updateCors', () => {
    const bucketName = testBucketName('cors-update');

    beforeAll(async () => {
      if (!minioAvailable) return;
      await provisioner.provision({
        bucketName,
        accessType: 'private',
      });
    });

    it('should update CORS rules on an existing bucket', async () => {
      if (!minioAvailable) return;

      const newOrigins = ['https://new-app.example.com'];
      const rules = await provisioner.updateCors({
        bucketName,
        accessType: 'private',
        allowedOrigins: newOrigins,
      });

      expect(rules).toHaveLength(1);
      expect(rules[0].allowedOrigins).toEqual(newOrigins);
      expect(rules[0].allowedMethods).toContain('PUT');
      expect(rules[0].allowedMethods).toContain('HEAD');
    });

    it('should reflect updated CORS on inspect', async () => {
      if (!minioAvailable) return;

      const inspected = await provisioner.inspect(bucketName, 'private');
      expect(inspected.corsRules[0].allowedOrigins).toEqual(['https://new-app.example.com']);
    });

    it('should switch from private to public CORS methods on access type change', async () => {
      if (!minioAvailable) return;

      const rules = await provisioner.updateCors({
        bucketName,
        accessType: 'public',
        allowedOrigins: ['https://cdn.example.com'],
      });

      expect(rules[0].allowedMethods).toContain('GET');
      expect(rules[0].allowedMethods).toContain('PUT');
      expect(rules[0].allowedMethods).toContain('HEAD');
    });
  });

  describe('bucketExists', () => {
    const bucketName = testBucketName('exists-check');

    beforeAll(async () => {
      if (!minioAvailable) return;
      await provisioner.provision({
        bucketName,
        accessType: 'private',
      });
    });

    it('should return true for an existing bucket', async () => {
      if (!minioAvailable) return;

      const exists = await provisioner.bucketExists(bucketName);
      expect(exists).toBe(true);
    });

    it('should return false for a non-existent bucket', async () => {
      if (!minioAvailable) return;

      const exists = await provisioner.bucketExists('does-not-exist-' + RUN_ID);
      expect(exists).toBe(false);
    });
  });

  describe('inspect — error handling', () => {
    it('should throw BUCKET_NOT_FOUND for non-existent bucket', async () => {
      if (!minioAvailable) return;

      await expect(
        provisioner.inspect('no-such-bucket-' + RUN_ID, 'private'),
      ).rejects.toThrow(ProvisionerError);

      await expect(
        provisioner.inspect('no-such-bucket-' + RUN_ID, 'private'),
      ).rejects.toThrow('does not exist');
    });
  });

  describe('full round-trip: provision → inspect → updateCors → inspect', () => {
    const bucketName = testBucketName('roundtrip');

    it('should provision, inspect, update CORS, and re-inspect correctly', async () => {
      if (!minioAvailable) return;

      // 1. Provision a private bucket
      const provisionResult = await provisioner.provision({
        bucketName,
        accessType: 'private',
        versioning: true,
      });

      expect(provisionResult.bucketName).toBe(bucketName);
      expect(provisionResult.accessType).toBe('private');
      expect(provisionResult.versioning).toBe(true);
      expect(provisionResult.corsRules[0].allowedOrigins).toEqual(TEST_ORIGINS);

      // 2. Inspect — should match provision result
      const inspected1 = await provisioner.inspect(bucketName, 'private');
      expect(inspected1.versioning).toBe(true);
      expect(inspected1.corsRules[0].allowedOrigins).toEqual(TEST_ORIGINS);

      // 3. Update CORS to new origins
      const newOrigins = ['https://staging.example.com'];
      await provisioner.updateCors({
        bucketName,
        accessType: 'private',
        allowedOrigins: newOrigins,
      });

      // 4. Re-inspect — CORS should reflect the update
      const inspected2 = await provisioner.inspect(bucketName, 'private');
      expect(inspected2.corsRules[0].allowedOrigins).toEqual(newOrigins);
      // Versioning should still be enabled
      expect(inspected2.versioning).toBe(true);
    });
  });
});
