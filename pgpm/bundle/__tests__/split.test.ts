import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { dirname, join } from 'path';

import { bundleFromModule, PerTenantBootstrapChange, splitBundle, verifyBundle } from '../src';

let sourceDir: string;

// catalog: a schema, a pure helper (slugify), a tenant table (products), and a
// function that reads the table + calls the helper. Partition seed = products,
// so products + product_slug are per-tenant; schema + slugify are shared.
const PLAN = `%syntax-version=1.0.0
%project=catalog
%uri=catalog

schemas/catalog/schema 2024-01-01T00:00:00Z Dev <dev@example.com> # add schema
schemas/catalog/functions/slugify [schemas/catalog/schema] 2024-01-01T00:00:01Z Dev <dev@example.com> # add slugify
schemas/catalog/tables/products [schemas/catalog/schema] 2024-01-01T00:00:02Z Dev <dev@example.com> # add products
schemas/catalog/functions/product_slug [schemas/catalog/schema schemas/catalog/functions/slugify schemas/catalog/tables/products] 2024-01-01T00:00:03Z Dev <dev@example.com> # add product_slug
`;

const DEPLOY: Record<string, string> = {
  'schemas/catalog/schema': 'CREATE SCHEMA catalog;',
  'schemas/catalog/functions/slugify':
    'CREATE FUNCTION catalog.slugify(t text) RETURNS text AS $$ SELECT lower(t) $$ LANGUAGE sql IMMUTABLE;',
  'schemas/catalog/tables/products':
    'CREATE TABLE catalog.products (id serial PRIMARY KEY, name text);',
  'schemas/catalog/functions/product_slug':
    'CREATE FUNCTION catalog.product_slug() RETURNS text AS $$ SELECT catalog.slugify(name) FROM catalog.products LIMIT 1 $$ LANGUAGE sql STABLE;'
};

const REQUIRES: Record<string, string[]> = {
  'schemas/catalog/functions/slugify': ['schemas/catalog/schema'],
  'schemas/catalog/tables/products': ['schemas/catalog/schema'],
  'schemas/catalog/functions/product_slug': [
    'schemas/catalog/schema',
    'schemas/catalog/functions/slugify',
    'schemas/catalog/tables/products'
  ]
};

function write(rel: string, content: string): void {
  const file = join(sourceDir, rel);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, content);
}

function header(change: string, verb: string): string {
  const reqs = (REQUIRES[change] ?? []).map(r => `-- requires: ${r}`).join('\n');
  return `-- ${verb} ${change}\n${reqs ? reqs + '\n' : ''}`;
}

beforeEach(() => {
  sourceDir = mkdtempSync(join(tmpdir(), 'pgpm-split-src-'));
  writeFileSync(join(sourceDir, 'pgpm.plan'), PLAN);
  writeFileSync(
    join(sourceDir, 'catalog.control'),
    `# catalog\ncomment = 'catalog'\ndefault_version = '0.0.1'\nrequires = 'plpgsql'\n`
  );
  for (const [change, sql] of Object.entries(DEPLOY)) {
    write(`deploy/${change}.sql`, `${header(change, 'Deploy')}BEGIN;\n${sql}\nCOMMIT;\n`);
    write(`revert/${change}.sql`, `${header(change, 'Revert')}BEGIN;\nDROP THING;\nCOMMIT;\n`);
  }
});

afterEach(() => {
  rmSync(sourceDir, { recursive: true, force: true });
});

describe('splitBundle', () => {
  const PER_TENANT = [
    'schemas/catalog/tables/products',
    'schemas/catalog/functions/product_slug'
  ];

  it('partitions changes into shared and per-tenant modules', () => {
    const src = bundleFromModule(sourceDir);
    const { shared, perTenant } = splitBundle(src, {
      perTenantChanges: PER_TENANT,
      sharedName: 'catalog-shared',
      perTenantName: 'catalog-tenant'
    });

    expect(shared.manifest.name).toBe('catalog-shared');
    expect(shared.manifest.deployOrder).toEqual([
      'schemas/catalog/schema',
      'schemas/catalog/functions/slugify'
    ]);
    expect(perTenant.manifest.name).toBe('catalog-tenant');
    expect(perTenant.manifest.deployOrder).toEqual(PER_TENANT);
  });

  it('rewrites per-tenant dependencies on shared changes to cross-module refs', () => {
    const src = bundleFromModule(sourceDir);
    const { perTenant } = splitBundle(src, {
      perTenantChanges: PER_TENANT,
      sharedName: 'catalog-shared',
      perTenantName: 'catalog-tenant'
    });

    const productSlug = perTenant.changes.find(
      c => c.name === 'schemas/catalog/functions/product_slug'
    )!;
    // shared deps become cross-module; the per-tenant dep stays local
    expect(productSlug.dependencies).toEqual([
      'catalog-shared:schemas/catalog/schema',
      'catalog-shared:schemas/catalog/functions/slugify',
      'schemas/catalog/tables/products'
    ]);
    // the header is rewritten to match
    expect(productSlug.deploy!.sql).toContain(
      '-- requires: catalog-shared:schemas/catalog/functions/slugify'
    );
    expect(productSlug.deploy!.sql).toContain('-- requires: schemas/catalog/tables/products');
    // plan carries the cross-module ref too
    expect(perTenant.plan).toContain('catalog-shared:schemas/catalog/functions/slugify');
  });

  it('renames plan project and control, and adds the shared module to requires', () => {
    const src = bundleFromModule(sourceDir);
    const { shared, perTenant } = splitBundle(src, {
      perTenantChanges: PER_TENANT,
      sharedName: 'catalog-shared',
      perTenantName: 'catalog-tenant'
    });

    expect(shared.plan).toContain('%project=catalog-shared');
    expect(shared.control!.fileName).toBe('catalog-shared.control');
    expect(perTenant.plan).toContain('%project=catalog-tenant');
    expect(perTenant.control!.fileName).toBe('catalog-tenant.control');
    expect(perTenant.control!.content).toMatch(/requires = 'plpgsql,catalog-shared'/);
    // the shared side gets no extra require
    expect(shared.control!.content).toMatch(/requires = 'plpgsql'/);
  });

  it('produces independently verifiable bundles with recomputed digests', () => {
    const src = bundleFromModule(sourceDir);
    const { shared, perTenant } = splitBundle(src, {
      perTenantChanges: PER_TENANT,
      sharedName: 'catalog-shared',
      perTenantName: 'catalog-tenant'
    });

    expect(verifyBundle(shared)).toEqual([]);
    expect(verifyBundle(perTenant)).toEqual([]);
    // splitting is deterministic
    const again = splitBundle(src, {
      perTenantChanges: PER_TENANT,
      sharedName: 'catalog-shared',
      perTenantName: 'catalog-tenant'
    });
    expect(again.shared.manifest.digest).toBe(shared.manifest.digest);
    expect(again.perTenant.manifest.digest).toBe(perTenant.manifest.digest);
  });

  it('rejects a partition where a shared change depends on a per-tenant change', () => {
    const src = bundleFromModule(sourceDir);
    // slugify is shared but we mark only products per-tenant; make slugify
    // "shared" while it depends on a per-tenant change by seeding schema.
    expect(() =>
      splitBundle(src, {
        // products is per-tenant, but schema (which products depends on) is
        // shared — that's fine. To trip the guard, mark slugify per-tenant and
        // leave product_slug shared: product_slug (shared) would depend on
        // slugify (per-tenant).
        perTenantChanges: ['schemas/catalog/functions/slugify'],
        sharedName: 'catalog-shared',
        perTenantName: 'catalog-tenant'
      })
    ).toThrow(/shared change .* depends on per-tenant change/);
  });

  it('throws when a per-tenant change is not in the bundle', () => {
    const src = bundleFromModule(sourceDir);
    expect(() =>
      splitBundle(src, {
        perTenantChanges: ['schemas/catalog/tables/nope'],
        sharedName: 'catalog-shared',
        perTenantName: 'catalog-tenant'
      })
    ).toThrow(/not in the bundle/);
  });

  describe('perTenantBootstrap', () => {
    const BOOTSTRAP: PerTenantBootstrapChange = {
      name: 'schemas/tenant/schema',
      deploy: '-- Deploy schemas/tenant/schema\nBEGIN;\nCREATE SCHEMA IF NOT EXISTS tenant;\nCOMMIT;\n',
      revert: '-- Revert schemas/tenant/schema\nBEGIN;\nDROP SCHEMA IF EXISTS tenant;\nCOMMIT;\n',
      verify: null,
      replacesShared: 'schemas/catalog/schema'
    };

    it('prepends the bootstrap change and re-points the replaced dependency to it', () => {
      const src = bundleFromModule(sourceDir);
      const { shared, perTenant } = splitBundle(src, {
        perTenantChanges: PER_TENANT,
        sharedName: 'catalog-shared',
        perTenantName: 'catalog-tenant',
        perTenantBootstrap: [BOOTSTRAP]
      });

      // deploys first, before the tenant's own changes
      expect(perTenant.manifest.deployOrder).toEqual(['schemas/tenant/schema', ...PER_TENANT]);

      // products no longer depends on the shared schema — it depends on its own
      const products = perTenant.changes.find(
        c => c.name === 'schemas/catalog/tables/products'
      )!;
      expect(products.dependencies).toEqual(['schemas/tenant/schema']);

      // product_slug: schema dep re-pointed local; slugify stays cross-module
      const productSlug = perTenant.changes.find(
        c => c.name === 'schemas/catalog/functions/product_slug'
      )!;
      expect(productSlug.dependencies).toEqual([
        'schemas/tenant/schema',
        'catalog-shared:schemas/catalog/functions/slugify',
        'schemas/catalog/tables/products'
      ]);
      expect(productSlug.deploy!.sql).toContain('-- requires: schemas/tenant/schema');
      expect(productSlug.deploy!.sql).not.toContain(
        '-- requires: catalog-shared:schemas/catalog/schema'
      );

      // plan carries the bootstrap change + re-pointed deps
      expect(perTenant.plan).toContain('schemas/tenant/schema');

      // the shared module is unchanged — it still owns the source schema
      expect(shared.manifest.deployOrder).toContain('schemas/catalog/schema');
      expect(verifyBundle(shared)).toEqual([]);
      expect(verifyBundle(perTenant)).toEqual([]);
    });

    it('rejects a bootstrap that collides with an existing change', () => {
      const src = bundleFromModule(sourceDir);
      expect(() =>
        splitBundle(src, {
          perTenantChanges: PER_TENANT,
          sharedName: 'catalog-shared',
          perTenantName: 'catalog-tenant',
          perTenantBootstrap: [{ ...BOOTSTRAP, name: 'schemas/catalog/tables/products' }]
        })
      ).toThrow(/collides with an existing bundle change/);
    });

    it('rejects a bootstrap that replaces a non-shared change', () => {
      const src = bundleFromModule(sourceDir);
      expect(() =>
        splitBundle(src, {
          perTenantChanges: PER_TENANT,
          sharedName: 'catalog-shared',
          perTenantName: 'catalog-tenant',
          perTenantBootstrap: [{ ...BOOTSTRAP, replacesShared: 'schemas/catalog/tables/products' }]
        })
      ).toThrow(/not a shared change/);
    });
  });
});
