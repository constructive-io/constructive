/**
 * Unit tests for the bucket-name resolvers.
 *
 * The presigned (lazy) upload path and the bucket-provisioner (eager) path must
 * mint the *same* physical S3 bucket name for a given (database, bucket key)
 * pair — `{prefix}-{bucketKey}-{digest}` — so a bucket's physical coordinate is
 * identical regardless of which path first provisions it.
 *
 * Both plugins consume the same resolver with the same argument order. The
 * remaining tests pin the properties S3 enforces on a bucket name: bounded
 * length, a restricted alphabet, and — because the name is truncated — a tail
 * that still separates identities the readable part can no longer distinguish.
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
const S3_BUCKET_NAME = /^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$/;

describe('bucket-name resolvers', () => {
  it('presigned resolver mints {prefix}-{bucketKey}-{digest}', async () => {
    const { createBucketNameResolver } = await loadResolverModule({ bucketName: PREFIX });
    const resolve = createBucketNameResolver();

    // presigned plugin signature: (databaseId, bucketKey)
    expect(resolve(DATABASE_ID, 'public')).toMatch(/^test-bucket-public-[a-f0-9]{12}$/);
    expect(resolve(DATABASE_ID, 'private')).toMatch(/^test-bucket-private-[a-f0-9]{12}$/);
  });

  it('mints the identical name used by the bucket provisioner', async () => {
    const { createBucketNameResolver } = await loadResolverModule({ bucketName: PREFIX });
    const resolve = createBucketNameResolver();

    expect(resolve(DATABASE_ID, 'public')).toBe(resolve(DATABASE_ID, 'public'));
  });

  it('names are stable across calls and resolver instances', async () => {
    const { createBucketNameResolver } = await loadResolverModule({ bucketName: PREFIX });

    const first = createBucketNameResolver();
    const second = createBucketNameResolver();

    expect(first(DATABASE_ID, 'public')).toBe(first(DATABASE_ID, 'public'));
    expect(second(DATABASE_ID, 'public')).toBe(first(DATABASE_ID, 'public'));
  });

  it('stays inside S3 length and alphabet limits for oversized, mixed-case inputs', async () => {
    const { createBucketNameResolver } = await loadResolverModule({
      bucketName: 'Some_Very.Long CDN Prefix That Nobody Would Choose',
    });
    const resolve = createBucketNameResolver();

    const name = resolve(DATABASE_ID, 'Marketing_Site/Assets — 2024'.repeat(5));

    expect(name.length).toBeLessThanOrEqual(63);
    expect(name.length).toBeGreaterThanOrEqual(3);
    expect(name).toMatch(S3_BUCKET_NAME);
  });

  it('separates identities that survive truncation identically', async () => {
    const { createBucketNameResolver } = await loadResolverModule({ bucketName: PREFIX });
    const resolve = createBucketNameResolver();

    const shared = 'a'.repeat(80);
    // Same truncated prefix, different full keys.
    expect(resolve(DATABASE_ID, `${shared}-one`)).not.toBe(resolve(DATABASE_ID, `${shared}-two`));
    // Same key, different tenant.
    expect(resolve(DATABASE_ID, 'public')).not.toBe(
      resolve('11111111-2222-3333-4444-555555555555', 'public'),
    );
  });

  it('presigned resolver throws (no default bucket name) when the prefix is missing', async () => {
    const { createBucketNameResolver } = await loadResolverModule({});
    expect(() => createBucketNameResolver()).toThrow(/CDN_BUCKET_NAME/);
  });

  it('throws when CDN config is entirely absent', async () => {
    const { createBucketNameResolver } = await loadResolverModule(undefined);
    expect(() => createBucketNameResolver()).toThrow(/CDN_BUCKET_NAME/);
  });
});
