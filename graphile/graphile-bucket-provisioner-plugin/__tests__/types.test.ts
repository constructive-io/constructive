/**
 * Tests for the bucket reconciliation mutation types.
 */

import type {
  BucketProvisionerPluginOptions,
  ProvisionBucketInput,
  ProvisionBucketPayload,
} from '../src/types';

describe('BucketProvisionerPluginOptions', () => {
  it('does not require S3 or naming configuration', () => {
    const options: BucketProvisionerPluginOptions = {};
    expect(options).toEqual({});
  });
});

describe('ProvisionBucketInput', () => {
  it('has a bucket key and optional owner id', () => {
    const input: ProvisionBucketInput = {
      bucketKey: 'public',
      ownerId: 'owner-123',
    };

    expect(input).toEqual({
      bucketKey: 'public',
      ownerId: 'owner-123',
    });
  });
});

describe('ProvisionBucketPayload', () => {
  it('represents a queued reconciliation job', () => {
    const payload: ProvisionBucketPayload = {
      bucketId: 'bucket-123',
      bucketKey: 'public',
      physicalName: null,
      jobId: 'job-123',
    };

    expect(payload.physicalName).toBeNull();
    expect(payload.jobId).toBe('job-123');
  });
});
