import { physicalBucketName } from '../src/naming';

const DATABASE_ID = '80a2eaaf-f77e-4bfe-8506-df929ef1b8d9';
const BUCKET_NAME = /^[a-z0-9-]{3,63}$/;

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
