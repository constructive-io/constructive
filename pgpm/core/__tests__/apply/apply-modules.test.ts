import { rmSync } from 'fs';

import {
  clearApplyMaterializationCache,
  materializeApplyModule,
  parseApplySpec,
  readApplySpec
} from '../../src/apply';
import { bundleFromModule } from '../../src/bundle';
import { PgpmPackage } from '../../src/core/class/pgpm';
import { CoreDeployTestFixture } from '../../test-utils/CoreDeployTestFixture';
import { TestDatabase } from '../../test-utils/TestDatabase';
import { TestFixture } from '../../test-utils/TestFixture';

describe('apply spec parsing', () => {
  const at = '/ws/packages/tenant-a/pgpm.apply.json';

  it('normalizes the succinct form', () => {
    const spec = parseApplySpec(
      JSON.stringify({ source: 'users-module', schemas: { users: 'tenant_a' } }),
      at
    );
    expect(spec.name).toBe('tenant-a');
    expect(spec.source).toEqual({ module: 'users-module' });
    expect(spec.schemas).toEqual({ users: 'tenant_a' });
  });

  it('accepts the expanded source form with pins', () => {
    const spec = parseApplySpec(
      JSON.stringify({
        name: 'tenant-b-users',
        source: { module: 'users-module', package: '@pgpm/users', version: '1.2.3', bundleDigest: 'sha256:abc' },
        schemas: { users: 'tenant_b' },
        requires: ['pgcrypto']
      }),
      at
    );
    expect(spec.name).toBe('tenant-b-users');
    expect(spec.source.bundleDigest).toBe('sha256:abc');
    expect(spec.requires).toEqual(['pgcrypto']);
  });

  it.each([
    [{ schemas: { a: 'b' } }, /"source"/],
    [{ source: 'x' }, /"schemas"/],
    [{ source: 'x', schemas: {} }, /"schemas"/],
    [{ source: 'tenant-a', schemas: { a: 'b' } }, /cannot apply itself/],
    [{ source: 'x', schemas: { a: 'b' }, requires: ['x'] }, /must not include the source/]
  ])('rejects invalid specs %#', (spec, err) => {
    expect(() => parseApplySpec(JSON.stringify(spec), at)).toThrow(err);
  });
});

describe('workspace discovery of apply modules', () => {
  let fixture: TestFixture;

  beforeAll(() => {
    fixture = new TestFixture('apply', 'proxy');
  });

  afterAll(() => fixture.cleanup());

  it('synthesizes module-map entries for pgpm.apply.json proxies', () => {
    const pkg = new PgpmPackage(fixture.tempFixtureDir);
    const modules = pkg.getModuleMap();

    expect(modules['tenant-a']).toBeDefined();
    expect(modules['tenant-a'].path).toBe('packages/tenant-a');
    // requires default to the source module's requires
    expect(modules['tenant-a'].requires).toEqual(['plpgsql']);
    expect(modules['tenant-a'].version).toBe('0.0.1');

    // name override in the spec wins over the directory name
    expect(modules['tenant-b']).toBeUndefined();
    expect(modules['tenant-b-users']).toBeDefined();

    // regular modules are untouched
    expect(modules['users-module']).toBeDefined();
    expect(modules['my-app'].requires).toEqual(['plpgsql', 'tenant-a', 'tenant-b-users']);
  });
});

describe('materializeApplyModule', () => {
  let fixture: TestFixture;

  beforeAll(() => {
    fixture = new TestFixture('apply', 'proxy');
  });

  afterAll(() => fixture.cleanup());

  it('produces a renamed, transpiled, deployable module', async () => {
    const sourceDir = fixture.fixturePath('packages', 'users-module');
    const spec = readApplySpec(fixture.fixturePath('packages', 'tenant-a'));
    const { bundle, outDir } = await materializeApplyModule({ sourceDir, spec });
    try {
      expect(bundle.manifest.name).toBe('tenant-a');
      expect(bundle.manifest.deployOrder).toEqual([
        'schemas/tenant_a/schema',
        'schemas/tenant_a/tables/accounts/table',
        'schemas/tenant_a/procedures/account_count'
      ]);
      const proc = bundle.changes.find(c => c.name === 'schemas/tenant_a/procedures/account_count')!;
      expect(proc.deploy!.sql).toContain('tenant_a.accounts');
      expect(proc.deploy!.sql).not.toMatch(/\busers\./);
      expect(bundle.manifest.provenance).toMatchObject({
        appliedFrom: 'users-module',
        sourceBundleDigest: bundleFromModule(sourceDir).manifest.digest
      });
      // materialized dir re-bundles to the same digest (deterministic identity)
      expect(bundleFromModule(outDir).manifest.digest).toBe(bundle.manifest.digest);
    } finally {
      rmSync(outDir, { recursive: true, force: true });
    }
  });

  it('two instances of one source get distinct identities', async () => {
    const sourceDir = fixture.fixturePath('packages', 'users-module');
    const a = await materializeApplyModule({
      sourceDir,
      spec: readApplySpec(fixture.fixturePath('packages', 'tenant-a'))
    });
    const b = await materializeApplyModule({
      sourceDir,
      spec: readApplySpec(fixture.fixturePath('packages', 'tenant-b'))
    });
    try {
      expect(a.bundle.manifest.name).toBe('tenant-a');
      expect(b.bundle.manifest.name).toBe('tenant-b-users');
      expect(a.bundle.manifest.digest).not.toBe(b.bundle.manifest.digest);
    } finally {
      rmSync(a.outDir, { recursive: true, force: true });
      rmSync(b.outDir, { recursive: true, force: true });
    }
  });

  it('refuses a source that does not match a pinned bundle digest', async () => {
    const sourceDir = fixture.fixturePath('packages', 'users-module');
    const spec = readApplySpec(fixture.fixturePath('packages', 'tenant-a'));
    await expect(
      materializeApplyModule({
        sourceDir,
        spec: { ...spec, source: { ...spec.source, bundleDigest: 'sha256:deadbeef' } }
      })
    ).rejects.toThrow(/pins source bundle digest/);
  });
});

describe('apply module deployment (e2e)', () => {
  let fixture: CoreDeployTestFixture;
  let db: TestDatabase;

  beforeAll(() => {
    fixture = new CoreDeployTestFixture('apply', 'proxy');
  });

  afterAll(async () => {
    await fixture.cleanup();
  });

  beforeEach(async () => {
    clearApplyMaterializationCache();
    db = await fixture.setupTestDatabase();
  });

  test('deploys an app depending on two instances of one source module', async () => {
    await fixture.deployModule('my-app', db.name, ['apply', 'proxy']);

    expect(await db.exists('schema', 'tenant_a')).toBe(true);
    expect(await db.exists('schema', 'tenant_b')).toBe(true);
    expect(await db.exists('table', 'tenant_a.accounts')).toBe(true);
    expect(await db.exists('table', 'tenant_b.accounts')).toBe(true);
    // the source module itself was never deployed
    expect(await db.exists('schema', 'users')).toBe(false);

    await db.query(`INSERT INTO tenant_a.accounts (email) VALUES ('a@x.com'), ('b@x.com')`);
    await db.query(`INSERT INTO tenant_b.accounts (email) VALUES ('c@x.com')`);
    const result = await db.query('SELECT app.total_accounts() AS total');
    expect(Number(result.rows[0].total)).toBe(3);

    // registry attribution lands on the instances, not the source
    const changes = await db.getDeployedChanges();
    const packages = new Set(changes.map((c: any) => c.package));
    expect(packages.has('tenant-a')).toBe(true);
    expect(packages.has('tenant-b-users')).toBe(true);
    expect(packages.has('users-module')).toBe(false);
  });

  test('verify and revert work against the re-derived transpiled module', async () => {
    await fixture.deployModule('my-app', db.name, ['apply', 'proxy']);
    await fixture.verifyModule('my-app', db.name, ['apply', 'proxy']);

    // reverting an instance also reverts everything depending on it
    await fixture.revertModule('tenant-a', db.name, ['apply', 'proxy']);
    expect(await db.exists('schema', 'app')).toBe(false);
    expect(await db.exists('schema', 'tenant_a')).toBe(false);
  });
});
