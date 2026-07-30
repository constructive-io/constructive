import { mkdirSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { dirname, join } from 'path';

import {
  AstEdges,
  buildAstEdges,
  buildDependencyGraph,
  loadModule,
  partitionChanges,
  partitionModule
} from '../src';
import { parsePlanFile } from '@pgpmjs/ast/files/plan/parser';

beforeAll(async () => {
  await loadModule();
});

describe('partitionChanges (pure core)', () => {
  // Synthetic graph: c (helper) is referenced by both t1 and t2 (tenant tables);
  // s (a totally independent util) references nothing tenant-specific.
  //   f depends on c and on t1 (tenant), so f is per-tenant.
  const buildGraph = () => {
    const graph = buildDependencyGraph({
      changes: [
        { name: 'shared/schema', dependencies: [] },
        { name: 'shared/util', dependencies: ['shared/schema'] },
        { name: 'tenant/table', dependencies: ['shared/schema'] },
        { name: 'tenant/fn', dependencies: ['shared/util', 'tenant/table'] }
      ],
      tags: []
    } as any);
    const astEdges: AstEdges = {
      edges: new Map<string, Map<string, string>>([
        ['tenant/fn', new Map([['shared/util', 'shared.util'], ['tenant/table', 'tenant.table']])]
      ]),
      dynamicSqlChanges: [],
      unresolvedReferences: []
    };
    return { graph, astEdges };
  };

  test('per-tenant status propagates from seed to all dependents', () => {
    const { graph, astEdges } = buildGraph();
    const r = partitionChanges({ graph, astEdges, seeds: ['tenant/table'] });

    expect([...r.perTenant].sort()).toEqual(['tenant/fn', 'tenant/table']);
    expect([...r.shared].sort()).toEqual(['shared/schema', 'shared/util']);
  });

  test('reports the shared changes each per-tenant change requires', () => {
    const { graph, astEdges } = buildGraph();
    const r = partitionChanges({ graph, astEdges, seeds: ['tenant/table'] });

    expect([...(r.sharedDependencies.get('tenant/fn') ?? [])].sort()).toEqual(['shared/util']);
    expect([...(r.sharedDependencies.get('tenant/table') ?? [])]).toEqual(['shared/schema']);
    // the boundary is one-directional: no shared change depends on a per-tenant one
    for (const shared of r.shared) {
      const deps = graph.edges.get(shared) ?? new Set();
      for (const d of deps) expect(r.perTenant.has(d)).toBe(false);
    }
  });

  test('flags a shared change that runs dynamic SQL as unprovable', () => {
    const { graph, astEdges } = buildGraph();
    astEdges.dynamicSqlChanges = ['shared/util'];
    const r = partitionChanges({ graph, astEdges, seeds: ['tenant/table'] });

    expect(r.shared.has('shared/util')).toBe(true);
    expect(r.warnings).toContainEqual(
      expect.objectContaining({ kind: 'dynamic-sql', change: 'shared/util' })
    );
  });

  test('warns on an unknown seed', () => {
    const { graph, astEdges } = buildGraph();
    const r = partitionChanges({ graph, astEdges, seeds: ['tenant/does_not_exist'] });
    expect(r.warnings).toContainEqual(
      expect.objectContaining({ kind: 'unknown-seed', change: 'tenant/does_not_exist' })
    );
    // nothing became per-tenant
    expect(r.perTenant.size).toBe(0);
  });
});

describe('partitionModule (on-disk)', () => {
  let tempDir: string;

  const writeDeploy = (change: string, sql: string): void => {
    const p = join(tempDir, 'deploy', `${change}.sql`);
    mkdirSync(dirname(p), { recursive: true });
    writeFileSync(p, sql);
  };

  beforeEach(() => {
    tempDir = join(tmpdir(), `partition-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    mkdirSync(tempDir, { recursive: true });
  });

  afterEach(() => rmSync(tempDir, { recursive: true, force: true }));

  const writeModule = (): void => {
    writeFileSync(
      join(tempDir, 'pgpm.plan'),
      `%syntax-version=1.0.0
%project=catalog
%uri=catalog

schemas/catalog/schema 2024-01-01T00:00:00Z Dev <dev@example.com> # schema
schemas/catalog/functions/slugify [schemas/catalog/schema] 2024-01-02T00:00:00Z Dev <dev@example.com> # pure helper
schemas/catalog/tables/products [schemas/catalog/schema] 2024-01-03T00:00:00Z Dev <dev@example.com> # tenant table
schemas/catalog/functions/product_slug [schemas/catalog/schema] 2024-01-04T00:00:00Z Dev <dev@example.com> # uses both
`
    );
    writeDeploy('schemas/catalog/schema', 'CREATE SCHEMA catalog;');
    // pure helper: references nothing tenant-specific
    writeDeploy(
      'schemas/catalog/functions/slugify',
      `CREATE FUNCTION catalog.slugify(t text) RETURNS text AS $$ SELECT lower(t) $$ LANGUAGE sql IMMUTABLE;`
    );
    writeDeploy(
      'schemas/catalog/tables/products',
      'CREATE TABLE catalog.products (id serial PRIMARY KEY, name text);'
    );
    // reads the tenant table AND calls the pure helper. LANGUAGE sql: the
    // classifier sees references inside the string body (@pgsql/transform
    // >= 18.5.0), so this function is correctly pulled per-tenant.
    writeDeploy(
      'schemas/catalog/functions/product_slug',
      `CREATE FUNCTION catalog.product_slug() RETURNS text AS $$
  SELECT catalog.slugify(name) FROM catalog.products LIMIT 1;
$$ LANGUAGE sql STABLE;`
    );
  };

  test('partitions a real module using the seed table object', () => {
    writeModule();
    const r = partitionModule({
      moduleDir: tempDir,
      seedObjects: [{ schema: 'catalog', name: 'products' }]
    });

    expect(r.seedChanges).toEqual(['schemas/catalog/tables/products']);
    // the table + the function reading it are per-tenant
    expect([...r.perTenant].sort()).toEqual([
      'schemas/catalog/functions/product_slug',
      'schemas/catalog/tables/products'
    ]);
    // schema + the pure helper are shared (product_slug requires slugify)
    expect([...r.shared].sort()).toEqual([
      'schemas/catalog/functions/slugify',
      'schemas/catalog/schema'
    ]);
    expect([...(r.sharedDependencies.get('schemas/catalog/functions/product_slug') ?? [])].sort()).toEqual([
      'schemas/catalog/functions/slugify',
      'schemas/catalog/schema'
    ]);
  });

  test('warns when a seed object is not produced by the module', () => {
    writeModule();
    const r = partitionModule({
      moduleDir: tempDir,
      seedObjects: [{ schema: 'catalog', name: 'nonexistent' }]
    });
    expect(r.seedChanges).toEqual([]);
    expect(r.warnings).toContainEqual(
      expect.objectContaining({ kind: 'unknown-seed', change: 'catalog.nonexistent' })
    );
  });

  test('cross-check: buildAstEdges links product_slug to slugify and products', () => {
    writeModule();
    const graph = buildDependencyGraph(parsePlanFile(join(tempDir, 'pgpm.plan')).data!);
    const edges = buildAstEdges(graph, tempDir);
    const deps = edges.edges.get('schemas/catalog/functions/product_slug')!;
    expect([...deps.keys()].sort()).toEqual([
      'schemas/catalog/functions/slugify',
      'schemas/catalog/tables/products'
    ]);
  });
});
