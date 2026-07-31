import { rmSync } from 'fs';

import {
  clearApplyMaterializationCache,
  materializeApplyModule,
  parseApplySpec,
  readApplySpec
} from '../../src/apply';
import { CoreDeployTestFixture } from '../../test-utils/CoreDeployTestFixture';
import { TestDatabase } from '../../test-utils/TestDatabase';
import { TestFixture } from '../../test-utils/TestFixture';

const at = '/ws/packages/shop-a/pgpm.apply.json';

describe('apply spec parsing — object routes', () => {
  it('accepts object routes alongside a schema default', () => {
    const spec = parseApplySpec(
      JSON.stringify({
        source: 'catalog-module',
        schemas: { catalog: 'shop_a', reporting: 'analytics_a' },
        route: [
          { fromSchema: 'catalog', kind: 'function', name: 'product_count', toSchema: 'analytics_a' }
        ]
      }),
      at
    );
    expect(spec.schemas).toEqual({ catalog: 'shop_a', reporting: 'analytics_a' });
    expect(spec.route).toEqual([
      { fromSchema: 'catalog', kind: 'function', name: 'product_count', toSchema: 'analytics_a' }
    ]);
  });

  it('accepts a route-only spec (no schema default)', () => {
    const spec = parseApplySpec(
      JSON.stringify({
        source: 'catalog-module',
        route: [{ fromSchema: 'catalog', kind: 'table', name: 'products', toSchema: 'shop_a' }]
      }),
      at
    );
    expect(spec.schemas).toBeUndefined();
    expect(spec.route).toHaveLength(1);
  });

  it.each([
    [{ source: 'x' }, /at least one of "schemas", "route", "extensions", "roles", or "exclude"/],
    [{ source: 'x', route: [] }, /"route" must be a non-empty array/],
    [{ source: 'x', route: [{ fromSchema: 'a', kind: 'widget', name: 'n', toSchema: 'b' }] }, /route" entry/],
    [{ source: 'x', route: [{ fromSchema: 'a', name: 'n', toSchema: 'b' }] }, /route" entry/],
    [{ source: 'x', route: [{ fromSchema: '', kind: 'table', name: 'n', toSchema: 'b' }] }, /route" entry/]
  ])('rejects invalid route specs %#', (spec, err) => {
    expect(() => parseApplySpec(JSON.stringify(spec), at)).toThrow(err);
  });
});

describe('materializeApplyModule — object routing', () => {
  let fixture: TestFixture;

  beforeAll(() => {
    fixture = new TestFixture('apply', 'routing');
  });

  afterAll(() => fixture.cleanup());

  it('fans a function and its table into different schemas, rewriting the cross-ref', async () => {
    const sourceDir = fixture.fixturePath('packages', 'catalog-module');
    const spec = readApplySpec(fixture.fixturePath('packages', 'shop-a'));
    const { bundle, outDir } = await materializeApplyModule({ sourceDir, spec });
    try {
      // the table follows the schema-level default; the function is routed out
      expect(bundle.manifest.deployOrder).toEqual([
        'schemas/shop_a/schema',
        'schemas/analytics_a/schema',
        'schemas/shop_a/tables/products/table',
        'schemas/analytics_a/procedures/product_count'
      ]);

      const proc = bundle.changes.find(
        c => c.name === 'schemas/analytics_a/procedures/product_count'
      )!;
      // definition lands in the routed schema, its body reference follows the
      // table into the schema-level target
      expect(proc.deploy!.sql).toContain('analytics_a.product_count');
      expect(proc.deploy!.sql).toContain('shop_a.products');
      expect(proc.deploy!.sql).not.toMatch(/\bcatalog\./);

      // the routed function still depends on the (renamed) table + schemas
      expect(proc.dependencies).toEqual(
        expect.arrayContaining([
          'schemas/shop_a/schema',
          'schemas/analytics_a/schema',
          'schemas/shop_a/tables/products/table'
        ])
      );

      // target schemas are created idempotently (destinations may pre-exist)
      const schemaChange = bundle.changes.find(c => c.name === 'schemas/analytics_a/schema')!;
      expect(schemaChange.deploy!.sql).toMatch(/CREATE SCHEMA IF NOT EXISTS analytics_a/i);
    } finally {
      rmSync(outDir, { recursive: true, force: true });
    }
  });
});

describe('apply object routing deployment (e2e)', () => {
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
    fixture = new CoreDeployTestFixture('apply', 'routing');
  });

  afterAll(async () => {
    await fixture.cleanup();
  });

  beforeEach(async () => {
    clearApplyMaterializationCache();
    db = await fixture.setupTestDatabase();
  });

  test('routes a table and a function into different schemas across two instances', async () => {
    // shop-a: both target schemas are created fresh by the apply
    await fixture.deployModule('shop-a', db.name, ['apply', 'routing']);

    // shop-b: the destination schema already exists — apply must not fail on it
    await db.query('CREATE SCHEMA shop_b');
    await fixture.deployModule('shop-b', db.name, ['apply', 'routing']);

    // the source module itself is never deployed
    expect(await db.exists('schema', 'catalog')).toBe(false);

    // table follows the schema-level default; function is routed elsewhere
    expect(await db.exists('table', 'shop_a.products')).toBe(true);
    expect(await db.exists('table', 'shop_b.products')).toBe(true);
    expect(await functionExists('analytics_a', 'product_count')).toBe(true);
    expect(await functionExists('analytics_b', 'product_count')).toBe(true);
    // the function did NOT land in the table's schema
    expect(await functionExists('shop_a', 'product_count')).toBe(false);

    // the table is transpiled twice — counts are independent per instance
    await db.query(`INSERT INTO shop_a.products (name) VALUES ('a'), ('b')`);
    await db.query(`INSERT INTO shop_b.products (name) VALUES ('c')`);
    // the routed function reads across schemas into its instance's table
    const a = await db.query('SELECT analytics_a.product_count() AS n');
    const b = await db.query('SELECT analytics_b.product_count() AS n');
    expect(Number(a.rows[0].n)).toBe(2);
    expect(Number(b.rows[0].n)).toBe(1);

    // registry attribution lands on the instances, not the source
    const packages = new Set((await db.getDeployedChanges()).map((c: any) => c.package));
    expect(packages.has('shop-a')).toBe(true);
    expect(packages.has('shop-b')).toBe(true);
    expect(packages.has('catalog-module')).toBe(false);
  });

  test('verify and revert work against the routed, re-derived instance', async () => {
    await db.query('CREATE SCHEMA shop_b');
    await fixture.deployModule('shop-a', db.name, ['apply', 'routing']);
    await fixture.deployModule('shop-b', db.name, ['apply', 'routing']);

    await fixture.verifyModule('shop-a', db.name, ['apply', 'routing']);
    await fixture.verifyModule('shop-b', db.name, ['apply', 'routing']);

    // revert the last-deployed instance; the other (deployed earlier) is
    // untouched — each instance's routed objects revert independently
    await fixture.revertModule('shop-b', db.name, ['apply', 'routing']);
    expect(await functionExists('analytics_b', 'product_count')).toBe(false);
    expect(await db.exists('table', 'shop_b.products')).toBe(false);
    expect(await functionExists('analytics_a', 'product_count')).toBe(true);
    expect(await db.exists('table', 'shop_a.products')).toBe(true);
  });
});
