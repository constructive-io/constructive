// Minimal script to create a bucket in MinIO/S3 using @constructive-io/s3-utils
// Avoid strict type coupling between different @aws-sdk/client-s3 versions

import { S3Client } from '@aws-sdk/client-s3';
import { createS3Bucket } from '@constructive-io/s3-utils';
import { getEnvOptions } from '@constructive-io/graphql-env';

(async () => {
  try {
    const opts = getEnvOptions();
    const { cdn } = opts;

    const provider = cdn?.provider || 'minio';
    const isMinio = provider === 'minio';
    
    const bucket = cdn?.bucketName || 'test-bucket';
    const region = cdn?.awsRegion || 'us-east-1';
    const accessKey = cdn?.awsAccessKey || 'minioadmin';
    const secretKey = cdn?.awsSecretKey || 'minioadmin';
    const endpoint = cdn?.minioEndpoint || 'http://localhost:9000';

    const client: any = new S3Client({
      region,
      credentials: { accessKeyId: accessKey, secretAccessKey: secretKey },
      ...(isMinio ? {
        endpoint,
        forcePathStyle: true,
      } : {}),
    });

    // Set BUCKET_PROVIDER for downstream policy detection
    process.env.BUCKET_PROVIDER = provider;
    // Legacy hint for backwards compatibility
    process.env.IS_MINIO = isMinio ? 'true' : 'false';

    const res = await createS3Bucket(client as any, bucket);
    console.log(`[create-bucket] ${bucket} (provider: ${provider}):`, res);

    client.destroy();
  } catch (e) {
    console.error('[create-bucket] error', e);
    process.exitCode = 1;
  }
})();
