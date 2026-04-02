import { S3Client, S3ClientConfig } from '@aws-sdk/client-s3';
import type { BucketProvider } from '@pgpmjs/types';

interface S3Options {
  awsAccessKey: string;
  awsSecretKey: string;
  awsRegion: string;
  endpoint?: string;
  provider?: BucketProvider;
}

export default function getS3(opts: S3Options): S3Client {
  const awsConfig: S3ClientConfig = {
    region: opts.awsRegion,
    ...(opts.awsAccessKey && opts.awsSecretKey
      ? {
        credentials: {
          accessKeyId: opts.awsAccessKey,
          secretAccessKey: opts.awsSecretKey,
        },
      }
      : {}),
    ...(opts.endpoint
      ? {
        endpoint: opts.endpoint,
        forcePathStyle: true,
      }
      : {}),
  };

  return new S3Client(awsConfig);
}
