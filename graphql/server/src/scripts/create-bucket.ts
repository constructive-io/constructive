// Minimal script to create a bucket in MinIO using @constructive-io/s3-utils
// Avoid strict type coupling between different @aws-sdk/client-s3 versions

import { getEnvOptions } from '@constructive-io/graphql-env';
import { S3Client } from '@aws-sdk/client-s3';
import { createS3Bucket } from '@constructive-io/s3-utils';

const { cdn } = getEnvOptions();

const BUCKET = cdn?.bucketName ?? 'test-bucket';
const REGION = cdn?.awsRegion ?? 'us-east-1';
const ACCESS_KEY =
  process.env.AWS_ACCESS_KEY_ID || cdn?.awsAccessKey || 'minioadmin';
const SECRET_KEY =
  process.env.AWS_SECRET_ACCESS_KEY || cdn?.awsSecretKey || 'minioadmin';
const ENDPOINT = cdn?.minioEndpoint || 'http://localhost:9000';

(async () => {
  try {
    const client: any = new S3Client({
      region: REGION,
      credentials: { accessKeyId: ACCESS_KEY, secretAccessKey: SECRET_KEY },
      endpoint: ENDPOINT,
      forcePathStyle: true,
    });

    // Hint downstream to apply MinIO policies
    process.env.IS_MINIO = 'true';

    const res = await createS3Bucket(client as any, BUCKET);
    console.log(`[create-bucket] ${BUCKET}:`, res);

    client.destroy();
  } catch (e) {
    console.error('[create-bucket] error', e);
    process.exitCode = 1;
  }
})();
