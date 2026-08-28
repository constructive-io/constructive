/**
 * Unit tests for the connection-default S3 configuration.
 */

interface CdnOptions {
  provider?: string;
  bucketName?: string;
  awsRegion?: string;
  awsAccessKey?: string;
  awsSecretKey?: string;
  endpoint?: string;
  publicUrlPrefix?: string;
}

async function loadResolverModule(cdn: CdnOptions | undefined) {
  jest.resetModules();

  jest.doMock('@constructive-io/graphql-env', () => ({
    getEnvOptions: jest.fn(() => ({ cdn })),
  }));
  jest.doMock('@constructive-io/s3-utils', () => ({
    createS3Client: jest.fn(() => ({ send: jest.fn() })),
  }));
  jest.doMock('@pgpmjs/logger', () => ({
    Logger: jest.fn().mockImplementation(() => ({ info: jest.fn() })),
  }));

  return import('../src/presigned-url-resolver');
}

const BASE_CDN: CdnOptions = {
  provider: 'minio',
  bucketName: 'connection-default',
  awsRegion: 'us-east-1',
  awsAccessKey: 'access',
  awsSecretKey: 'secret',
  endpoint: 'http://localhost:9000',
  publicUrlPrefix: 'https://cdn.example.com',
};

describe('getPresignedUrlS3Config', () => {
  it('returns the configured connection-default bucket', async () => {
    const { getPresignedUrlS3Config } = await loadResolverModule(BASE_CDN);

    expect(getPresignedUrlS3Config()).toEqual(expect.objectContaining({
      bucket: 'connection-default',
      region: 'us-east-1',
      endpoint: 'http://localhost:9000',
      publicUrlPrefix: 'https://cdn.example.com',
    }));
  });

  it('caches the initialized S3 configuration', async () => {
    const { getPresignedUrlS3Config } = await loadResolverModule(BASE_CDN);

    expect(getPresignedUrlS3Config()).toBe(getPresignedUrlS3Config());
  });

  it('requires a CDN bucket name for the connection default', async () => {
    const { getPresignedUrlS3Config } = await loadResolverModule({
      ...BASE_CDN,
      bucketName: undefined,
    });

    expect(() => getPresignedUrlS3Config()).toThrow(/CDN_BUCKET_NAME/);
  });

  it('requires CDN configuration and credentials', async () => {
    const missingConfig = await loadResolverModule(undefined);
    expect(() => missingConfig.getPresignedUrlS3Config()).toThrow(/CDN config not found/);

    const missingCredentials = await loadResolverModule({
      ...BASE_CDN,
      awsAccessKey: undefined,
    });
    expect(() => missingCredentials.getPresignedUrlS3Config()).toThrow(/S3 credentials/);
  });
});
