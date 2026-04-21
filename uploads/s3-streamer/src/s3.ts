import { createS3Client, S3Client } from '@constructive-io/s3-utils';
import type { StorageProvider } from '@constructive-io/s3-utils';
import type { BucketProvider } from '@pgpmjs/types';

interface S3Options {
  awsAccessKey: string;
  awsSecretKey: string;
  awsRegion: string;
  endpoint?: string;
  provider?: BucketProvider;
}

export default function getS3(opts: S3Options): S3Client {
  return createS3Client({
    provider: (opts.provider as StorageProvider) || 'minio',
    region: opts.awsRegion,
    accessKeyId: opts.awsAccessKey,
    secretAccessKey: opts.awsSecretKey,
    ...(opts.endpoint ? { endpoint: opts.endpoint } : {}),
  });
}
