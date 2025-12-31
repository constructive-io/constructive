import { S3Client, S3ClientConfig } from '@aws-sdk/client-s3';

interface S3Options {
  awsAccessKey: string;
  awsSecretKey: string;
  awsRegion: string;
  minioEndpoint?: string;
  /**
   * Object storage provider.
   * - 's3'    → AWS S3 (default)
   * - 'minio' → MinIO / S3‑compatible endpoint
   * If omitted, presence of `minioEndpoint` will imply MinIO for
   * backwards compatibility.
   */
  provider?: 's3' | 'minio' | string;
}

export default function getS3(opts: S3Options): S3Client {
  // Prefer explicit provider; fall back to endpoint for legacy callers
  const isMinio =
    opts.provider === 'minio' ||
    (!opts.provider && Boolean(opts.minioEndpoint));

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
    ...(isMinio
      ? {
        endpoint: opts.minioEndpoint,
        forcePathStyle: true,
      }
      : {}),
  };

  return new S3Client(awsConfig);
}
