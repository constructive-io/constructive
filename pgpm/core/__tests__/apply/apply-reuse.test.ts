import { rmSync } from 'fs';

import {
  clearApplyMaterializationCache,
  materializeReuseModule,
  parseApplySpec,
  readApplySpec,
  resolveSharedModuleName
} from '../../src/apply';
import { CoreDeployTestFixture } from '../../test-utils/CoreDeployTestFixture';
import { TestDatabase } from '../../test-utils/TestDatabase';
import { TestFixture } from '../../test-utils/TestFixture';

const at = '/ws/packages/tenant-a/pgpm.apply.json';

const baseReuse = {
  source: 'catalog',
  schemas: { catalog: 'tenant_a' },
  reuse: {
    sharedSchema: { catalog: 'catalog_shared' },
    perTenant: [{ fromSchema: 'catalog', kind: 'table', name: 'products' }]
  }
};

describe('apply spec parsing — reuse', () => {
  it('accepts a reuse spec alongside a per-tenant schema map', () => {
    const spec = parseApplySpec(JSON.stringify(baseReuse), at);
    expect(spec.reuse).toEqual(baseReuse.reuse);
    expect(spec.schemas).toEqual({ catalog: 'tenant_a' });
  });

  it.each([
    [{ ...baseReuse, reuse: [] }, /"reuse" must be an object/],
    [{ ...baseReuse, reuse: { perTenant: baseReuse.reuse.perTenant } }, /reuse.sharedSchema/],
    [{ ...baseReuse, reuse: { sharedSchema: {}, perTenant: baseReuse.reuse.perTenant } }, /reuse.sharedSchema/],
    [{ ...baseReuse, reuse: { sharedSchema: { catalog: 'catalog_shared' } } }, /reuse.perTenant/],
    [{ ...baseReuse, reuse: { sharedSchema: { catalog: 'catalog_shared' }, perTenant: [] } }, /reuse.perTenant/],
    [
      { ...baseReuse, reuse: { sharedSchema: { catalog: 'catalog_shared' }, perTenant: [{ fromSchema: 'catalog', kind: 'widget', name: 'x' }] } },
      /reuse.perTenant" seed/
    ],
    [
      { ...baseReuse, reuse: { sharedSchema: { catalog: 'catalog_shared' }, perTenant: [{ fromSchema: '', kind: 'table', name: 'x' }] } },
      /reuse.perTenant" seed/
    ],
    // seed schema with no per-tenant target in "schemas"
    [
      { source: 'catalog', schemas: { catalog: 'tenant_a' }, reuse: { sharedSchema: { catalog: 'catalog_shared' }, perTenant: [{ fromSchema: 'other', kind: 'table', name: 'x' }] } },
      /no per-tenant target/
    ],
    // reuse without schemas
    [
      { source: 'catalog', reuse: baseReuse.reuse },
      /"reuse" requires "schemas"/
    ],
    // seed schema missing from sharedSchema
    [
      { source: 'catalog', schemas: { catalog: 'tenant_a', other: 'o' }, reuse: { sharedSchema: { catalog: 'catalog_shared' }, perTenant: [{ fromSchema: 'other', kind: 'table', name: 'x' }] } },
      /no shared target/
    ]
  ])('rejects invalid reuse specs %#', (spec, err) => {
    expect(() => parseApplySpec(JSON.stringify(spec), at)).toThrow(err);
  });

  it('honors an explicit sharedName override; else derives deterministically', () => {
    const derived = resolveSharedModuleName(parseApplySpec(JSON.stringify(baseReuse), at) as any);
    expect(derived).toMatch(/^catalog-shared-[0-9a-f]{8}$/);

    const override = parseApplySpec(
      JSON.stringify({ ...baseReuse, reuse: { ...baseReuse.reuse, sharedName: 'catalog-core' } }),
      at
    );
    expect(resolveSharedModuleName(override as any)).toBe('catalog-core');
  });

  it('resolves the same shared name for two tenants over the same source/shared/seeds', () => {
    const a = parseApplySpec(JSON.stringify(baseReuse), at) as any;
    const b = parseApplySpec(
      JSON.stringify({ ...baseReuse, schemas: { catalog: 'tenant_b' } }),
      at
    ) as any;
    expect(resolveSharedModuleName(a)).toBe(resolveSharedModuleName(b));
  });
});

describe('materializeReuseModule — split into shared + per-tenant', () => {
  let fixture: TestFixture;

  beforeAll(() => {
    fixture = new TestFixture('apply', 'reuse');
  });

  afterAll(() => fixture.cleanup());

  it('emits shared helper once and routes the tenant table + dependent fn per tenant', async () => {
    const sourceDir = fixture.fixturePath('packages', 'catalog');
    const spec = readApplySpec(fixture.fixturePath('packages', 'tenant-a')) as any;
    const result = await materializeReuseModule({ sourceDir, spec });
    try {
      const sharedName = result.sharedName;

      // shared module: the schema + tenant-independent helper, in the shared schema
      expect(result.shared.bundle.manifest.deployOrder).toEqual([
        'schemas/catalog_shared/schema',
        'schemas/catalog_shared/functions/slugify'
      ]);
      const slugify = result.shared.bundle.changes.find(
        c => c.name === 'schemas/catalog_shared/functions/slugify'
      )!;
      expect(slugify.deploy!.sql).toContain('catalog_shared.slugify');
      expect(slugify.deploy!.sql).not.toMatch(/\bcatalog\.slugify/);

      // per-tenant module: local schema bootstrap first, then the table + the
      // function that reads it (product_slug reaches the seed → per-tenant)
      expect(result.perTenant.bundle.manifest.deployOrder).toEqual([
        'schemas/tenant_a/schema',
        'schemas/tenant_a/tables/products/table',
        'schemas/tenant_a/functions/product_slug'
      ]);

      const productSlug = result.perTenant.bundle.changes.find(
        c => c.name === 'schemas/tenant_a/functions/product_slug'
      )!;
      // definition lands in the tenant schema; reads its own table; calls the
      // SHARED helper across the module boundary
      expect(productSlug.deploy!.sql).toContain('tenant_a.product_slug');
      expect(productSlug.deploy!.sql).toContain('tenant_a.products');
      expect(productSlug.deploy!.sql).toContain('catalog_shared.slugify');

      // dependencies: local schema (bootstrap), local table, cross-module helper
      expect(productSlug.dependencies).toEqual(
        expect.arrayContaining([
          'schemas/tenant_a/schema',
          'schemas/tenant_a/tables/products/table',
          `${sharedName}:schemas/catalog_shared/functions/slugify`
        ])
      );
      // it must NOT depend on the shared schema change directly (uses local one)
      expect(productSlug.dependencies).not.toContain(
        `${sharedName}:schemas/catalog_shared/schema`
      );

      // the per-tenant schema is created idempotently (may pre-exist)
      const tenantSchema = result.perTenant.bundle.changes.find(
        c => c.name === 'schemas/tenant_a/schema'
      )!;
      expect(tenantSchema.deploy!.sql).toMatch(/CREATE SCHEMA IF NOT EXISTS tenant_a/i);
    } finally {
      rmSync(result.shared.outDir, { recursive: true, force: true });
      rmSync(result.perTenant.outDir, { recursive: true, force: true });
    }
  });
});

describe('apply reuse deployment (e2e)', () => {
  let fixture: CoreDeployTestFixture;
  let db: TestDatabase;

  const functionExists = async (schema: string, name: string): Promise<boolean> => {
    const res = await db.query(
      `SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
       WHERE n.nspname = $1 AND p.proname = $2`,
      [schema, name]
    );
    return res.rows.length > 0;
  };

  beforeAll(() => {
    fixture = new CoreDeployTestFixture('apply', 'reuse');
  });

  afterAll(async () => {
    await fixture.cleanup();
  });

  beforeEach(async () => {
    clearApplyMaterializationCache();
    db = await fixture.setupTestDatabase();
  });

  test('shared helper deployed once, tenant table per-tenant, revert is reference-safe', async () => {
    // tenant A: target schema absent — apply creates it
    await fixture.deployModule('tenant-a', db.name, ['apply', 'reuse']);

    // tenant B: target schema already exists — apply must not fail on it
    await db.query('CREATE SCHEMA tenant_b');
    await fixture.deployModule('tenant-b', db.name, ['apply', 'reuse']);

    // source module is never deployed
    expect(await db.exists('schema', 'catalog')).toBe(false);

    // tenant-independent helper deployed once, in the shared schema
    expect(await functionExists('catalog_shared', 'slugify')).toBe(true);
    // the tenant-dependent function is NOT shared
    expect(await functionExists('catalog_shared', 'product_slug')).toBe(false);

    // the table + its dependent function materialize per tenant
    expect(await db.exists('table', 'tenant_a.products')).toBe(true);
    expect(await db.exists('table', 'tenant_b.products')).toBe(true);
    expect(await functionExists('tenant_a', 'product_slug')).toBe(true);
    expect(await functionExists('tenant_b', 'product_slug')).toBe(true);

    // the tables are independent; the per-tenant fn reads its own via the shared helper
    await db.query(`INSERT INTO tenant_a.products (id, name) VALUES ('11111111-1111-1111-1111-111111111111', 'Hello World')`);
    await db.query(`INSERT INTO tenant_b.products (id, name) VALUES ('22222222-2222-2222-2222-222222222222', 'Other Thing')`);
    const a = await db.query(`SELECT tenant_a.product_slug('11111111-1111-1111-1111-111111111111') AS s`);
    const b = await db.query(`SELECT tenant_b.product_slug('22222222-2222-2222-2222-222222222222') AS s`);
    expect(a.rows[0].s).toBe('hello-world');
    expect(b.rows[0].s).toBe('other-thing');

    // the shared module is deployed once under its own package name
    const changes = await db.getDeployedChanges();
    const packages = new Set(changes.map((c: any) => c.package));
    const sharedPkgs = [...packages].filter(p => /^catalog-shared-/.test(String(p)));
    expect(sharedPkgs).toHaveLength(1);
    const sharedSlugifyDeploys = changes.filter(
      (c: any) => c.change_name === 'schemas/catalog_shared/functions/slugify'
    );
    expect(sharedSlugifyDeploys).toHaveLength(1);
    expect(packages.has('catalog')).toBe(false);
  });

  test('verify passes for both tenants; reverting one leaves shared state for the other', async () => {
    await fixture.deployModule('tenant-a', db.name, ['apply', 'reuse']);
    await db.query('CREATE SCHEMA tenant_b');
    await fixture.deployModule('tenant-b', db.name, ['apply', 'reuse']);

    await fixture.verifyModule('tenant-a', db.name, ['apply', 'reuse']);
    await fixture.verifyModule('tenant-b', db.name, ['apply', 'reuse']);

    // revert the last-deployed tenant; the shared helper survives (still needed
    // by tenant A), and tenant A is untouched
    await fixture.revertModule('tenant-b', db.name, ['apply', 'reuse']);
    expect(await db.exists('table', 'tenant_b.products')).toBe(false);
    expect(await functionExists('tenant_b', 'product_slug')).toBe(false);

    expect(await functionExists('catalog_shared', 'slugify')).toBe(true);
    expect(await db.exists('table', 'tenant_a.products')).toBe(true);
    expect(await functionExists('tenant_a', 'product_slug')).toBe(true);
  });
});
