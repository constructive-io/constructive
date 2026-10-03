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
  publicEndpoint?: string;
  publicUrlPrefix?: string;
}

async function loadResolverModule(cdn: CdnOptions | undefined) {
  jest.resetModules();

  jest.doMock('@constructive-io/graphql-env', () => ({
    getEnvOptions: jest.fn(() => ({ cdn })),
  }));
  const createS3Client = jest.fn((config: { endpoint?: string }) => ({ endpoint: config.endpoint }));
  jest.doMock('@constructive-io/s3-utils', () => ({ createS3Client }));
  jest.doMock('@pgpmjs/logger', () => ({
    Logger: jest.fn().mockImplementation(() => ({ info: jest.fn() })),
  }));

  return { ...(await import('../src/presigned-url-resolver')), createS3Client };
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

  it('signs presigned URLs with the connection client when no public endpoint is set', async () => {
    const { getPresignedUrlS3Config, createS3Client } = await loadResolverModule(BASE_CDN);
    const config = getPresignedUrlS3Config();

    expect(config.client).toEqual({ endpoint: 'http://localhost:9000' });
    expect(config.presignClient).toBeUndefined();
    expect(config.publicEndpoint).toBeUndefined();
    expect(createS3Client).toHaveBeenCalledTimes(1);
  });

  it('talks to storage over the endpoint and signs presigned URLs for the public endpoint', async () => {
    const { getPresignedUrlS3Config } = await loadResolverModule({
      ...BASE_CDN,
      endpoint: 'http://rustfs.constructive-infra.svc.cluster.local:9000',
      publicEndpoint: 'https://storage.example.com',
    });
    const config = getPresignedUrlS3Config();

    expect(config.client).toEqual({ endpoint: 'http://rustfs.constructive-infra.svc.cluster.local:9000' });
    expect(config.endpoint).toBe('http://rustfs.constructive-infra.svc.cluster.local:9000');
    expect(config.presignClient).toEqual({ endpoint: 'https://storage.example.com' });
    expect(config.publicEndpoint).toBe('https://storage.example.com');
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
