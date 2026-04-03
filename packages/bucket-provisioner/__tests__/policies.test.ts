/**
 * Tests for bucket policy builders.
 */

import {
  getPublicAccessBlock,
  buildPublicReadPolicy,
  buildCloudFrontOacPolicy,
  buildPresignedUrlIamPolicy,
} from '../src/policies';

describe('getPublicAccessBlock', () => {
  it('returns full lockdown for private buckets', () => {
    const config = getPublicAccessBlock('private');
    expect(config).toEqual({
      BlockPublicAcls: true,
      IgnorePublicAcls: true,
      BlockPublicPolicy: true,
      RestrictPublicBuckets: true,
    });
  });

  it('returns full lockdown for temp buckets', () => {
    const config = getPublicAccessBlock('temp');
    expect(config).toEqual({
      BlockPublicAcls: true,
      IgnorePublicAcls: true,
      BlockPublicPolicy: true,
      RestrictPublicBuckets: true,
    });
  });

  it('relaxes policy blocks for public buckets', () => {
    const config = getPublicAccessBlock('public');
    expect(config.BlockPublicAcls).toBe(true);
    expect(config.IgnorePublicAcls).toBe(true);
    expect(config.BlockPublicPolicy).toBe(false);
    expect(config.RestrictPublicBuckets).toBe(false);
  });
});

describe('buildPublicReadPolicy', () => {
  it('builds policy for entire bucket', () => {
    const policy = buildPublicReadPolicy('my-bucket');
    expect(policy.Version).toBe('2012-10-17');
    expect(policy.Statement).toHaveLength(1);

    const stmt = policy.Statement[0];
    expect(stmt.Sid).toBe('PublicReadAccess');
    expect(stmt.Effect).toBe('Allow');
    expect(stmt.Principal).toBe('*');
    expect(stmt.Action).toBe('s3:GetObject');
    expect(stmt.Resource).toBe('arn:aws:s3:::my-bucket/*');
  });

  it('builds policy with key prefix restriction', () => {
    const policy = buildPublicReadPolicy('my-bucket', 'public/');
    const stmt = policy.Statement[0];
    expect(stmt.Resource).toBe('arn:aws:s3:::my-bucket/public/*');
  });

  it('handles empty prefix same as no prefix', () => {
    const noPrefix = buildPublicReadPolicy('my-bucket');
    const emptyPrefix = buildPublicReadPolicy('my-bucket', '');
    // Empty string is falsy, so treated same as undefined
    expect(noPrefix.Statement[0].Resource).toBe(emptyPrefix.Statement[0].Resource);
  });
});

describe('buildCloudFrontOacPolicy', () => {
  const distArn = 'arn:aws:cloudfront::123456789012:distribution/E1234567890';

  it('builds CloudFront OAC policy for entire bucket', () => {
    const policy = buildCloudFrontOacPolicy('my-bucket', distArn);
    expect(policy.Version).toBe('2012-10-17');
    expect(policy.Statement).toHaveLength(1);

    const stmt = policy.Statement[0];
    expect(stmt.Sid).toBe('AllowCloudFrontOACRead');
    expect(stmt.Effect).toBe('Allow');
    expect(stmt.Principal).toEqual({ Service: 'cloudfront.amazonaws.com' });
    expect(stmt.Action).toBe('s3:GetObject');
    expect(stmt.Resource).toBe('arn:aws:s3:::my-bucket/*');
    expect(stmt.Condition).toEqual({
      StringEquals: { 'AWS:SourceArn': distArn },
    });
  });

  it('builds CloudFront OAC policy with key prefix', () => {
    const policy = buildCloudFrontOacPolicy('my-bucket', distArn, 'public/');
    const stmt = policy.Statement[0];
    expect(stmt.Resource).toBe('arn:aws:s3:::my-bucket/public/*');
  });
});

describe('buildPresignedUrlIamPolicy', () => {
  it('builds minimum-permission IAM policy', () => {
    const policy = buildPresignedUrlIamPolicy('my-bucket');
    expect(policy.Version).toBe('2012-10-17');
    expect(policy.Statement).toHaveLength(1);

    const stmt = policy.Statement[0];
    expect(stmt.Sid).toBe('PresignedUrlPluginAccess');
    expect(stmt.Effect).toBe('Allow');
    expect(stmt.Action).toEqual(['s3:PutObject', 's3:GetObject', 's3:HeadObject']);
    expect(stmt.Resource).toBe('arn:aws:s3:::my-bucket/*');
  });

  it('does not include DeleteObject', () => {
    const policy = buildPresignedUrlIamPolicy('my-bucket');
    const actions = policy.Statement[0].Action;
    expect(actions).not.toContain('s3:DeleteObject');
  });

  it('does not include ListBucket', () => {
    const policy = buildPresignedUrlIamPolicy('my-bucket');
    const actions = policy.Statement[0].Action;
    expect(actions).not.toContain('s3:ListBucket');
  });
});
