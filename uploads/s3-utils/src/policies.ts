import { 
  CreateBucketCommand, 
  PutBucketCorsCommand, 
  PutBucketPolicyCommand, 
  S3Client} from '@aws-sdk/client-s3';

/**
 * Determines if MinIO-specific bucket policies should be used.
 * 
 * Priority order (first match wins):
 * 1. BUCKET_PROVIDER env var (explicit: 'minio', 's3', 'gcs')
 * 2. IS_MINIO env var (deprecated - use BUCKET_PROVIDER instead)
 * 3. Hostname heuristics (localhost, 127.0.0.1, or contains 'minio')
 */
async function shouldUseMinioPolicy(client: S3Client): Promise<boolean> {
  // 1. BUCKET_PROVIDER takes explicit precedence
  const bucketProvider = process.env.BUCKET_PROVIDER?.toLowerCase();
  if (bucketProvider) {
    return bucketProvider === 'minio';
  }

  // 2. IS_MINIO (deprecated) - kept for backwards compatibility
  if (process.env.IS_MINIO !== undefined) {
    return process.env.IS_MINIO === 'true';
  }

  // 3. Fall back to hostname heuristics for local dev convenience
  const endpoint = (client as any).config?.endpoint;
  const endpointUrl = typeof endpoint === 'function' ? await endpoint() : endpoint;
  const hostname = endpointUrl?.hostname || endpointUrl?.host || '';
  
  return ['localhost', '127.0.0.1'].includes(hostname) || hostname.includes('minio');
}

export async function createS3Bucket(client: S3Client, Bucket: string): Promise<{ success: boolean }> {
  try {
    await client.send(new CreateBucketCommand({ Bucket }));
  } catch (e: any) {
    if (e.name === 'BucketAlreadyOwnedByYou' || e.Code === 'BucketAlreadyOwnedByYou') {
      console.warn(`[createS3Bucket] Bucket "${Bucket}" already exists`);
      return { success: true };
    } else {
      console.error('[createS3Bucket error - createBucket]', e);
      return { success: false };
    }
  }

  const useMinioPolicy = await shouldUseMinioPolicy(client);

  const policy = useMinioPolicy
    ? {
      Version: '2012-10-17',
      Statement: [
        {
          Sid: 'MinioListBucket',
          Action: ['s3:GetBucketLocation', 's3:ListBucket'],
          Effect: 'Allow',
          Principal: { AWS: ['*'] },
          Resource: [`arn:aws:s3:::${Bucket}`],
        },
        {
          Sid: 'MinioGetObject',
          Action: ['s3:GetObject'],
          Effect: 'Allow',
          Principal: { AWS: ['*'] },
          Resource: [`arn:aws:s3:::${Bucket}/*`],
        },
      ],
    }
    : {
      Version: '2012-10-17',
      Statement: [
        {
          Sid: 'AddPerm',
          Action: ['s3:*'],
          Effect: 'Allow',
          Principal: '*',
          Resource: [`arn:aws:s3:::${Bucket}/*`],
        },
      ],
    };

  try {
    if (!useMinioPolicy) {
      await client.send(new PutBucketCorsCommand({
        Bucket,
        CORSConfiguration: {
          CORSRules: [
            {
              AllowedMethods: ['POST', 'GET', 'PUT', 'DELETE', 'HEAD'],
              AllowedHeaders: ['Authorization', 'Content-Type', 'Content-Length'],
              AllowedOrigins: ['*'],
              ExposeHeaders: ['ETag'],
              MaxAgeSeconds: 3000,
            },
          ],
        },
      }));
    }

    await client.send(new PutBucketPolicyCommand({ 
      Bucket, 
      Policy: JSON.stringify(policy) 
    }));

    return { success: true };
  } catch (e) {
    console.error('[createS3Bucket error - post-create]', e);
    return { success: false };
  }
}
