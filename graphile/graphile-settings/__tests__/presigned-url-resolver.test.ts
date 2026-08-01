/**
 * Unit tests for the bucket-name resolvers.
 *
 * The presigned (lazy) upload path and the bucket-provisioner (eager) path
 * must mint the *same* physical S3 bucket name for a given (database, bucket
 * key) pair — `{prefix}-{bucketKey}-{databaseId}` — so a bucket's physical
 * coordinate is identical regardless of which path first provisions it.
 *
 * The two plugins declare their resolver with opposite argument order, so the
 * equality below also guards against re-introducing an argument-order bug.
 */

interface CdnOptions {
  bucketName?: string;
}

async function loadResolverModule(cdn: CdnOptions | undefined) {
  jest.resetModules();

  jest.doMock('@constructive-io/graphql-env', () => ({
    getEnvOptions: jest.fn(() => ({ cdn })),
  }));

  return import('../src/presigned-url-resolver');
}

const PREFIX = 'test-bucket';
const DATABASE_ID = '80a2eaaf-f77e-4bfe-8506-df929ef1b8d9';

describe('bucket-name resolvers', () => {
  it('presigned resolver mints {prefix}-{bucketKey}-{databaseId}', async () => {
    const { createBucketNameResolver } = await loadResolverModule({ bucketName: PREFIX });
    const resolve = createBucketNameResolver();

    // presigned plugin signature: (databaseId, bucketKey)
    expect(resolve(DATABASE_ID, 'public')).toBe(`${PREFIX}-public-${DATABASE_ID}`);
    expect(resolve(DATABASE_ID, 'private')).toBe(`${PREFIX}-private-${DATABASE_ID}`);
  });

  it('provisioner resolver mints the identical name despite opposite arg order', async () => {
    const { createBucketNameResolver, createProvisionerBucketNameResolver } =
      await loadResolverModule({ bucketName: PREFIX });

    const presigned = createBucketNameResolver();
    const provisioner = createProvisionerBucketNameResolver();

    for (const key of ['public', 'private', 'temp', 'custom-cdn']) {
      // presigned: (databaseId, bucketKey) — provisioner: (bucketKey, databaseId)
      expect(provisioner(key, DATABASE_ID)).toBe(presigned(DATABASE_ID, key));
      expect(provisioner(key, DATABASE_ID)).toBe(`${PREFIX}-${key}-${DATABASE_ID}`);
    }
  });

  it('presigned resolver throws (no default bucket name) when the prefix is missing', async () => {
    const { createBucketNameResolver } = await loadResolverModule({});
    expect(() => createBucketNameResolver()).toThrow(/CDN_BUCKET_NAME/);
  });

  it('provisioner resolver throws (no default bucket name) when the prefix is missing', async () => {
    const { createProvisionerBucketNameResolver } = await loadResolverModule({});
    expect(() => createProvisionerBucketNameResolver()).toThrow(/CDN_BUCKET_NAME/);
  });

  it('both resolvers throw when CDN config is entirely absent', async () => {
    const { createBucketNameResolver, createProvisionerBucketNameResolver } =
      await loadResolverModule(undefined);
    expect(() => createBucketNameResolver()).toThrow(/CDN_BUCKET_NAME/);
    expect(() => createProvisionerBucketNameResolver()).toThrow(/CDN_BUCKET_NAME/);
  });
});
