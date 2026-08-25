import { getBucketProvisionerConnection } from '../src/bucket-provisioner-resolver';
import {
  createBucketNameResolver,
  getAllowedOrigins,
  getPresignedUrlS3Config,
} from '../src/presigned-url-resolver';
import {
  getGraphileSettingsRuntimeResource,
  withGraphileSettingsRuntime,
} from '../src/runtime-environment';
import { getGraphileSettingsRuntimeOptions } from '../src/runtime-options';

const environment = (name: string): NodeJS.ProcessEnv => ({
  NODE_ENV: 'test',
  BUCKET_PROVIDER: 'minio',
  BUCKET_NAME: `${name}-bucket`,
  AWS_REGION: 'us-east-1',
  AWS_ACCESS_KEY: `${name}-access`,
  AWS_SECRET_KEY: `${name}-secret`,
  CDN_ENDPOINT: `http://${name}.storage.test:9000`,
  SERVER_ORIGIN: `https://${name}.app.test`,
});

describe('graphile-settings runtime isolation', () => {
  it('refuses to create credential-bearing resources outside a scope', () => {
    expect(() => getBucketProvisionerConnection()).toThrow(
      'GRAPHILE_SETTINGS_RUNTIME_REQUIRED'
    );
    expect(() => getPresignedUrlS3Config()).toThrow(
      'GRAPHILE_SETTINGS_RUNTIME_REQUIRED'
    );
  });

  it('isolates concurrent environments and caches only within each scope', async () => {
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });

    const run = (name: string) =>
      withGraphileSettingsRuntime(
        { cwd: process.cwd(), env: environment(name) },
        async () => {
          const firstOptions = getGraphileSettingsRuntimeOptions();
          const firstConnection = getBucketProvisionerConnection();
          const firstS3 = getPresignedUrlS3Config();
          const resolveBucketName = createBucketNameResolver();

          await gate;

          return {
            firstOptions,
            secondOptions: getGraphileSettingsRuntimeOptions(),
            firstConnection,
            secondConnection: getBucketProvisionerConnection(),
            firstS3,
            secondS3: getPresignedUrlS3Config(),
            bucketName: resolveBucketName('database-id', 'private'),
            origins: getAllowedOrigins(),
          };
        }
      );

    const firstPromise = run('first');
    const secondPromise = run('second');
    release();

    const [first, second] = await Promise.all([firstPromise, secondPromise]);

    expect(first.firstOptions).toBe(first.secondOptions);
    expect(second.firstOptions).toBe(second.secondOptions);
    expect(first.firstConnection).toBe(first.secondConnection);
    expect(first.firstS3).toBe(first.secondS3);
    expect(second.firstConnection).toBe(second.secondConnection);
    expect(second.firstS3).toBe(second.secondS3);

    expect(first.firstConnection).not.toBe(second.firstConnection);
    expect(first.firstS3).not.toBe(second.firstS3);
    expect(first.firstS3.client).not.toBe(second.firstS3.client);

    expect(first.firstConnection).toMatchObject({
      accessKeyId: 'first-access',
      secretAccessKey: 'first-secret',
      endpoint: 'http://first.storage.test:9000',
    });
    expect(second.firstConnection).toMatchObject({
      accessKeyId: 'second-access',
      secretAccessKey: 'second-secret',
      endpoint: 'http://second.storage.test:9000',
    });
    expect(first.firstS3.bucket).toBe('first-bucket');
    expect(second.firstS3.bucket).toBe('second-bucket');
    expect(first.bucketName).toMatch(/^first-bucket-private-[0-9a-f]{12}$/);
    expect(second.bucketName).toMatch(/^second-bucket-private-[0-9a-f]{12}$/);
    expect(first.origins).toEqual(['https://first.app.test']);
    expect(second.origins).toEqual(['https://second.app.test']);
  });

  it('disposes each scoped resource exactly once', async () => {
    const key = Symbol('test-resource');
    const create = jest.fn(() => ({ id: 'resource' }));
    const dispose = jest.fn();

    await withGraphileSettingsRuntime(
      { cwd: process.cwd(), env: environment('dispose') },
      async () => {
        expect(getGraphileSettingsRuntimeResource(key, create, dispose)).toBe(
          getGraphileSettingsRuntimeResource(key, create, dispose)
        );
      }
    );

    expect(create).toHaveBeenCalledTimes(1);
    expect(dispose).toHaveBeenCalledTimes(1);
  });
});
