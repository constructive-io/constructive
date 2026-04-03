/**
 * S3 bucket policy builders.
 *
 * Generates the JSON policy documents for private and public bucket
 * configurations. These are the actual S3 bucket policies that control
 * who can access objects in the bucket.
 *
 * Privacy model:
 * - Private buckets: Block All Public Access enabled, no bucket policy needed.
 *   All access goes through presigned URLs generated server-side.
 * - Public buckets: Block Public Access disabled for GetObject only.
 *   A bucket policy grants public read access (optionally restricted to a key prefix).
 */

import type { BucketAccessType } from './types';

/**
 * S3 Block Public Access configuration.
 *
 * For private/temp buckets: all four flags are true (maximum lockdown).
 * For public buckets: BlockPublicPolicy and RestrictPublicBuckets are false
 * so that a public-read bucket policy can be applied.
 */
export interface PublicAccessBlockConfig {
  BlockPublicAcls: boolean;
  IgnorePublicAcls: boolean;
  BlockPublicPolicy: boolean;
  RestrictPublicBuckets: boolean;
}

/**
 * Get the Block Public Access configuration for a bucket access type.
 *
 * - private/temp: all blocks enabled (maximum security)
 * - public: ACL blocks enabled (ACLs are deprecated), but policy blocks
 *   disabled so a public-read bucket policy can be attached
 */
export function getPublicAccessBlock(accessType: BucketAccessType): PublicAccessBlockConfig {
  if (accessType === 'public') {
    return {
      BlockPublicAcls: true,
      IgnorePublicAcls: true,
      BlockPublicPolicy: false,
      RestrictPublicBuckets: false,
    };
  }

  // private and temp: full lockdown
  return {
    BlockPublicAcls: true,
    IgnorePublicAcls: true,
    BlockPublicPolicy: true,
    RestrictPublicBuckets: true,
  };
}

/**
 * AWS IAM-style policy document for S3 bucket policies.
 */
export interface BucketPolicyDocument {
  Version: string;
  Statement: BucketPolicyStatement[];
}

export interface BucketPolicyStatement {
  Sid: string;
  Effect: 'Allow' | 'Deny';
  Principal: string | { AWS: string } | { Service: string };
  Action: string | string[];
  Resource: string | string[];
  Condition?: Record<string, Record<string, string>>;
}

/**
 * Build a public-read bucket policy.
 *
 * Grants anonymous GetObject access to the entire bucket or a specific prefix.
 * This is the standard way to serve public files via direct URL or CDN.
 *
 * @param bucketName - S3 bucket name
 * @param keyPrefix - Optional key prefix to restrict public reads (e.g., "public/").
 *                     If provided, only objects under this prefix are publicly readable.
 *                     If omitted, the entire bucket is publicly readable.
 */
export function buildPublicReadPolicy(
  bucketName: string,
  keyPrefix?: string,
): BucketPolicyDocument {
  const resource = keyPrefix
    ? `arn:aws:s3:::${bucketName}/${keyPrefix}*`
    : `arn:aws:s3:::${bucketName}/*`;

  return {
    Version: '2012-10-17',
    Statement: [
      {
        Sid: 'PublicReadAccess',
        Effect: 'Allow',
        Principal: '*',
        Action: 's3:GetObject',
        Resource: resource,
      },
    ],
  };
}

/**
 * Build a CloudFront Origin Access Control (OAC) bucket policy.
 *
 * This is the recommended way to serve public files through CloudFront
 * without making the S3 bucket itself public. CloudFront authenticates
 * to S3 using the OAC, and the bucket policy only allows CloudFront.
 *
 * @param bucketName - S3 bucket name
 * @param cloudFrontDistributionArn - The CloudFront distribution ARN
 * @param keyPrefix - Optional key prefix to restrict access
 */
export function buildCloudFrontOacPolicy(
  bucketName: string,
  cloudFrontDistributionArn: string,
  keyPrefix?: string,
): BucketPolicyDocument {
  const resource = keyPrefix
    ? `arn:aws:s3:::${bucketName}/${keyPrefix}*`
    : `arn:aws:s3:::${bucketName}/*`;

  return {
    Version: '2012-10-17',
    Statement: [
      {
        Sid: 'AllowCloudFrontOACRead',
        Effect: 'Allow',
        Principal: { Service: 'cloudfront.amazonaws.com' },
        Action: 's3:GetObject',
        Resource: resource,
        Condition: {
          StringEquals: {
            'AWS:SourceArn': cloudFrontDistributionArn,
          },
        },
      },
    ],
  };
}

/**
 * Build the IAM policy for the presigned URL plugin's S3 credentials.
 *
 * This is the minimum-permission policy that the GraphQL server's
 * S3 access key should have. It only allows PutObject, GetObject,
 * and HeadObject — no delete, no list, no bucket management.
 *
 * @param bucketName - S3 bucket name
 */
export function buildPresignedUrlIamPolicy(bucketName: string): BucketPolicyDocument {
  return {
    Version: '2012-10-17',
    Statement: [
      {
        Sid: 'PresignedUrlPluginAccess',
        Effect: 'Allow',
        Principal: '*',
        Action: ['s3:PutObject', 's3:GetObject', 's3:HeadObject'],
        Resource: `arn:aws:s3:::${bucketName}/*`,
      },
    ],
  };
}
