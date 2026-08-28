import { mintPhysicalBucketName, physicalBucketName } from '../src/naming';

const PREFIX = 'test-bucket';
const DATABASE_ID = '80a2eaaf-f77e-4bfe-8506-df929ef1b8d9';
const BUCKET_NAME = /^[a-z0-9-]{3,63}$/;

describe('mintPhysicalBucketName', () => {
  it('returns the same name for repeated calls with the same identity', () => {
    const first = mintPhysicalBucketName(PREFIX, DATABASE_ID, 'default');
    const second = mintPhysicalBucketName(PREFIX, DATABASE_ID, 'default');

    expect(second).toBe(first);
  });

  it('separates the same bucket key across databases', () => {
    expect(
      mintPhysicalBucketName(PREFIX, DATABASE_ID, 'default'),
    ).not.toBe(
      mintPhysicalBucketName(PREFIX, '11111111-2222-3333-4444-555555555555', 'default'),
    );
  });

  it('separates keys that differ only past the readable budget', () => {
    const shared = 'a'.repeat(40);

    expect(
      mintPhysicalBucketName(PREFIX, DATABASE_ID, `${shared}-one`),
    ).not.toBe(
      mintPhysicalBucketName(PREFIX, DATABASE_ID, `${shared}-two`),
    );
  });

  it('always returns a bounded S3 bucket name without edge hyphens', () => {
    const name = mintPhysicalBucketName(
      'Some_Very.Long CDN Prefix That Nobody Would Choose',
      DATABASE_ID,
      'Marketing_Site/Assets — 2024'.repeat(5),
    );

    expect(name).toMatch(BUCKET_NAME);
    expect(name).not.toMatch(/^-|-$/);
  });

  it('keeps a key that sanitizes to empty legal', () => {
    const name = mintPhysicalBucketName(PREFIX, DATABASE_ID, '!!!');

    expect(name).toMatch(BUCKET_NAME);
    expect(name).not.toMatch(/^-|-$/);
  });

  it('falls back to the digest alone when both components sanitize away', () => {
    const name = mintPhysicalBucketName('!!!', DATABASE_ID, '???');

    expect(name).toMatch(/^[a-f0-9]{12}$/);
  });
});

describe('physicalBucketName', () => {
  const identity = {
    scope: 'database',
    databaseId: DATABASE_ID,
    bucketKey: 'build-logs',
  };

  it('names the scope, the database and the key', () => {
    expect(physicalBucketName(identity)).toMatch(
      /^database-80a2eaaf-build-logs-[a-f0-9]{12}$/,
    );
  });

  it('is stable for a given identity', () => {
    expect(physicalBucketName(identity)).toBe(physicalBucketName(identity));
  });

  it('keeps the database label when the scope overruns its budget', () => {
    const name = physicalBucketName({
      ...identity,
      scope: 'some-extremely-long-entity-scope-name',
    });

    expect(name).toContain('80a2eaaf');
    expect(name).toContain('build-logs');
    expect(name).toMatch(BUCKET_NAME);
  });

  it('separates scopes whose readable labels truncate to the same thing', () => {
    const first = physicalBucketName({
      ...identity,
      scope: 'organization-alpha-tier',
    });
    const second = physicalBucketName({
      ...identity,
      scope: 'organization-beta-tier',
    });

    expect(first).not.toBe(second);
  });

  it('separates the same key across databases and across keys', () => {
    expect(physicalBucketName(identity)).not.toBe(
      physicalBucketName({
        ...identity,
        databaseId: '11111111-2222-3333-4444-555555555555',
      }),
    );
    expect(physicalBucketName(identity)).not.toBe(
      physicalBucketName({ ...identity, bucketKey: 'assets' }),
    );
  });

  it('always returns a bounded S3 bucket name without edge hyphens', () => {
    const name = physicalBucketName({
      scope: 'Some Very.Long_Entity Scope',
      databaseId: DATABASE_ID,
      bucketKey: 'Marketing_Site/Assets — 2024'.repeat(5),
    });

    expect(name).toMatch(BUCKET_NAME);
    expect(name).not.toMatch(/^-|-$/);
  });

  it('stays legal when every readable component sanitizes away', () => {
    const name = physicalBucketName({
      scope: '!!!',
      databaseId: '???',
      bucketKey: '***',
    });

    expect(name).toMatch(/^[a-f0-9]{12}$/);
  });
});
