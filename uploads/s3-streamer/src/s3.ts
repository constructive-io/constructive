import { S3Client, S3ClientConfig } from '@aws-sdk/client-s3';
import type { BucketProvider } from '@pgpmjs/types';

interface S3Options {
  awsAccessKey: string;
  awsSecretKey: string;
  awsRegion: string;
  minioEndpoint?: string;
  provider?: BucketProvider;
}

export default function getS3(opts: S3Options): S3Client {
  // Use explicit provider if set, otherwise fall back to checking minioEndpoint for backwards compatibility
  const isMinio = opts.provider === 'minio' || (opts.provider === undefined && Boolean(opts.minioEndpoint));

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
    ...(isMinio && opts.minioEndpoint
      ? {
        endpoint: opts.minioEndpoint,
        forcePathStyle: true,
      }
      : {}),
  };

  return new S3Client(awsConfig);
}
