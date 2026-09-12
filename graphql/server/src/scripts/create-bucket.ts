// Minimal script to create a bucket in RustFS/S3 using @constructive-io/s3-utils

import { getEnvOptions } from '@constructive-io/graphql-env';
import type { StorageProvider } from '@constructive-io/s3-utils';
import { createS3Bucket,createS3Client } from '@constructive-io/s3-utils';
import { Logger } from '@pgpmjs/logger';

const log = new Logger('create-bucket');

(async () => {
  try {
    const opts = getEnvOptions();
    const { cdn } = opts;

    if (!cdn) {
      throw new Error('[create-bucket] CDN config not found. Ensure pgpmDefaults provides CDN fields.');
    }

    const provider = cdn.provider as StorageProvider;
    const bucket = cdn.bucketName;
    const region = cdn.awsRegion;
    const accessKey = cdn.awsAccessKey;
    const secretKey = cdn.awsSecretKey;
    const endpoint = cdn.endpoint;

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
