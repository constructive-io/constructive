// Minimal script to create a bucket in MinIO/S3 using @constructive-io/s3-utils

import { createS3Client, createS3Bucket } from '@constructive-io/s3-utils';
import type { StorageProvider } from '@constructive-io/s3-utils';
import { getEnvOptions } from '@constructive-io/graphql-env';
import { Logger } from '@pgpmjs/logger';

const log = new Logger('create-bucket');

(async () => {
  try {
    const opts = getEnvOptions();
    const { cdn } = opts;

    const provider = (cdn?.provider || 'minio') as StorageProvider;
    const bucket = cdn?.bucketName || 'test-bucket';
    const region = cdn?.awsRegion || 'us-east-1';
    const accessKey = cdn?.awsAccessKey || 'minioadmin';
    const secretKey = cdn?.awsSecretKey || 'minioadmin';
    const endpoint = cdn?.endpoint || 'http://localhost:9000';

    const client = createS3Client({
      provider,
      region,
      accessKeyId: accessKey,
      secretAccessKey: secretKey,
      ...(endpoint ? { endpoint } : {}),
    });

    const res = await createS3Bucket(client as any, bucket, { provider });
    if (res.success) {
      log.success(`${bucket} (provider: ${provider})`);
    } else {
      log.error(`Failed to create bucket ${bucket}`);
    }

    client.destroy();
  } catch (e) {
    log.error('error', e);
    process.exitCode = 1;
  }
})();
