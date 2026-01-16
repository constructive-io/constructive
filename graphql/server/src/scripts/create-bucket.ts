// Minimal script to create a bucket in MinIO/S3 using @constructive-io/s3-utils
// Avoid strict type coupling between different @aws-sdk/client-s3 versions

import { S3Client } from '@aws-sdk/client-s3';
import { createS3Bucket } from '@constructive-io/s3-utils';
import { Logger } from '@pgpmjs/logger';
import { resolveGraphqlConfig, type GraphqlRuntimeConfigOptions } from '../config';

const log = new Logger('create-bucket');

type CreateBucketConfig = GraphqlRuntimeConfigOptions;

export const runCreateBucket = async (
  createBucketConfig: CreateBucketConfig = {}
) => {
  try {
    const opts = resolveGraphqlConfig({
      graphqlConfig: createBucketConfig.graphqlConfig,
      envConfig: createBucketConfig.envConfig,
      cwd: createBucketConfig.cwd
    });
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
};

if (require.main === module) {
  void runCreateBucket();
}
