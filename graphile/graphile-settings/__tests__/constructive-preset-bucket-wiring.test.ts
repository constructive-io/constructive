/**
 * Unit test: ConstructivePreset wires the tenant-aware bucket-name resolver
 * into BucketProvisionerPreset (not just into the presigned URL plugin).
 *
 * Regression guard for the bug where eager `provisionBucket` fell back to the
 * bare logical bucket key because the provisioner preset was left without a
 * resolveBucketName — diverging from the lazy first-upload path and risking
 * cross-tenant bucket-name collisions.
 */

const captured: { bucketProvisionerOptions?: any } = {};

// Capture the options handed to BucketProvisionerPreset without pulling in the
// real plugin (and its S3 machinery).
jest.mock('graphile-bucket-provisioner-plugin', () => ({
  BucketProvisionerPreset: jest.fn((options: any) => {
    captured.bucketProvisionerOptions = options;
    return { plugins: [] as any[] };
  }),
}));

// The preset reads CDN config eagerly when building the presigned/provisioner
// plugin options; provide a prefix so name minting is deterministic.
const PREFIX = 'test-bucket';
jest.mock('@constructive-io/graphql-env', () => ({
  getEnvOptions: jest.fn(() => ({
    cdn: {
      bucketName: PREFIX,
      provider: 'minio',
      awsRegion: 'us-east-1',
      awsAccessKey: 'test',
      awsSecretKey: 'test',
      endpoint: 'http://localhost:9000',
    },
  })),
}));

import { createConstructivePreset } from '../src/presets/constructive-preset';

const DATABASE_ID = '80a2eaaf-f77e-4bfe-8506-df929ef1b8d9';

describe('ConstructivePreset bucket-provisioner wiring', () => {
  beforeEach(() => {
    captured.bucketProvisionerOptions = undefined;
  });

  it('passes a resolveBucketName into BucketProvisionerPreset when presigned uploads are enabled', () => {
    createConstructivePreset();

    const options = captured.bucketProvisionerOptions;
    expect(options).toBeDefined();
    expect(typeof options.resolveBucketName).toBe('function');
  });

  it('the wired resolver mints the tenant-aware {prefix}-{bucketKey}-{digest} name', () => {
    createConstructivePreset();

    const { resolveBucketName } = captured.bucketProvisionerOptions;
    // provisioner plugin signature: (bucketKey, databaseId)
    expect(resolveBucketName('public', DATABASE_ID)).toMatch(
      new RegExp(`^${PREFIX}-public-[a-f0-9]{12}$`),
    );
    expect(resolveBucketName('private', DATABASE_ID)).toMatch(
      new RegExp(`^${PREFIX}-private-[a-f0-9]{12}$`),
    );
    // The digest is what carries the tenant, so two databases cannot collide.
    expect(resolveBucketName('public', DATABASE_ID)).not.toBe(
      resolveBucketName('public', '11111111-2222-3333-4444-555555555555'),
    );
  });

  it('disables auto-provision-on-create so buckets are minted lazily / explicitly', () => {
    createConstructivePreset();
    expect(captured.bucketProvisionerOptions.autoProvision).toBe(false);
  });

  it('does not wire the provisioner preset when presigned uploads are disabled', () => {
    createConstructivePreset({ enablePresignedUploads: false });
    expect(captured.bucketProvisionerOptions).toBeUndefined();
  });
});
