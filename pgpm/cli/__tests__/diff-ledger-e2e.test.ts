/**
 * Flagship ledger-reconciliation e2e: two "generated" versions of the same
 * workspace whose plans were regenerated (renamed AND reordered changes),
 * reconciled through a live database's pgpm_migrate ledger.
 *
 * The constructive-db scenario in miniature: v1 (metaschema + generated
 * package) is deployed to production; the generator later re-emits the whole
 * workspace as v2 with a fresh plan — every change name and the order are
 * different, plus a genuine schema delta. `pgpm diff db:prod v2 --ledger
 * db:prod --emit-ledger` classifies every satisfied change despite the
 * regeneration, backfills the ledger with v2's identities, and a plain
 * `pgpm deploy` of v2 then executes only the true delta.
 *
 * PREREQUISITES: a running PostgreSQL instance via standard PG* env vars.
 */
import { diffCatalogSnapshots, loadModule, snapshotCatalog, withoutColumnOrder } from '@pgpmjs/transform';
import * as fs from 'fs';
import * as path from 'path';
import { teardownPgPools } from 'pg-cache';

import { CLIDeployTestFixture } from '../test-utils';

jest.setTimeout(180000);

afterAll(async () => {
  await teardownPgPools();
});

interface ChangeSpec {
  name: string;
  deps?: string[];
  deploy: string;
}

const META_SQL = {
  schema: 'CREATE SCHEMA metax;',
  entities: [
    'CREATE TABLE metax.entities (',
    '  id int PRIMARY KEY,',
    '  name text NOT NULL',
    ');'
  ].join('\n'),
  fields: [
    'CREATE TABLE metax.fields (',
    '  id int PRIMARY KEY,',
    '  entity_id int NOT NULL REFERENCES metax.entities (id),',
    '  name text NOT NULL',
    ');'
  ].join('\n')
};

const GEN_SQL = {
  schema: 'CREATE SCHEMA genx;',
  customers: [
    'CREATE TABLE genx.customers (',
    '  id int PRIMARY KEY,',
    '  email text NOT NULL',
    ');'
  ].join('\n'),
  customer_count:
    'CREATE FUNCTION genx.customer_count() RETURNS bigint LANGUAGE sql AS $$ SELECT count(*) FROM genx.customers $$;',
  // v2 only: the genuine delta
  orders: [
    'CREATE TABLE genx.orders (',
    '  id int PRIMARY KEY,',
    '  customer_id int NOT NULL REFERENCES genx.customers (id)',
    ');'
  ].join('\n')
};

/** v1: the originally generated plans. */
const META_V1: ChangeSpec[] = [
  { name: 'schemas/metax/schema', deploy: META_SQL.schema },
  { name: 'schemas/metax/tables/entities/table', deps: ['schemas/metax/schema'], deploy: META_SQL.entities },
  { name: 'schemas/metax/tables/fields/table', deps: ['schemas/metax/tables/entities/table'], deploy: META_SQL.fields }
];

const GEN_V1: ChangeSpec[] = [
  { name: 'schemas/genx/schema', deploy: GEN_SQL.schema },
  { name: 'schemas/genx/tables/customers/table', deps: ['schemas/genx/schema'], deploy: GEN_SQL.customers },
  { name: 'schemas/genx/procedures/customer_count', deps: ['schemas/genx/tables/customers/table'], deploy: GEN_SQL.customer_count }
];

/**
 * v2: the regenerated plans — same objects, but every change renamed and the
 * plan order shuffled (the generator regrouped the metaschema tables into one
 * change), plus the genuine delta (genx.orders).
 */
const META_V2: ChangeSpec[] = [
  { name: 'gen/0001_metax_init', deploy: META_SQL.schema },
  {
    name: 'gen/0002_metax_tables',
    deps: ['gen/0001_metax_init'],
    deploy: [META_SQL.entities, META_SQL.fields].join('\n')
  }
];

const GEN_V2: ChangeSpec[] = [
  { name: 'gen/0001_genx_init', deploy: GEN_SQL.schema },
  { name: 'gen/0002_genx_customers', deps: ['gen/0001_genx_init'], deploy: GEN_SQL.customers },
  { name: 'gen/0003_genx_orders', deps: ['gen/0002_genx_customers'], deploy: GEN_SQL.orders },
  { name: 'gen/0004_genx_procs', deps: ['gen/0002_genx_customers'], deploy: GEN_SQL.customer_count }
];

const writeModule = (moduleDir: string, name: string, changes: ChangeSpec[], requires?: string) => {
  fs.mkdirSync(moduleDir, { recursive: true });
  const planLines = changes.map((c, i) => {
    const deps = c.deps && c.deps.length > 0 ? ` [${c.deps.join(' ')}]` : '';
    return `${c.name}${deps} 2024-01-0${(i % 9) + 1}T00:00:00Z test <test@example.com> # add ${c.name}`;
  });
  fs.writeFileSync(
    path.join(moduleDir, 'pgpm.plan'),
    `%syntax-version=1.0.0\n%project=${name}\n%uri=https://github.com/test/${name}\n\n${planLines.join('\n')}\n`
  );
  fs.writeFileSync(
    path.join(moduleDir, `${name}.control`),
    `comment = 'Ledger e2e module'\ndefault_version = '0.0.1'\nrelocatable = false\nsuperuser = false\n` +
      (requires ? `requires = '${requires}'\n` : '')
  );
  for (const c of changes) {
    const filePath = path.join(moduleDir, 'deploy', `${c.name}.sql`);
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, `-- Deploy ${c.name} to pg\n\nBEGIN;\n\n${c.deploy}\n\nCOMMIT;\n`);
    const revertPath = path.join(moduleDir, 'revert', `${c.name}.sql`);
    fs.mkdirSync(path.dirname(revertPath), { recursive: true });
    fs.writeFileSync(revertPath, `-- Revert ${c.name} from pg\n\nBEGIN;\n\n-- noop\n\nCOMMIT;\n`);
    const verifyPath = path.join(moduleDir, 'verify', `${c.name}.sql`);
    fs.mkdirSync(path.dirname(verifyPath), { recursive: true });
    fs.writeFileSync(verifyPath, `-- Verify ${c.name} on pg\n\nBEGIN;\n\nROLLBACK;\n`);
  }
};

const writeWorkspace = (wsDir: string) => {
  fs.mkdirSync(wsDir, { recursive: true });
  fs.writeFileSync(path.join(wsDir, 'pgpm.json'), '{\n    "packages": [\n        "*"\n    ]\n}');
};

describe('pgpm diff ledger reconciliation e2e', () => {
  let fixture: CLIDeployTestFixture;
  let v1Dir: string;
  let v2Dir: string;
  let prodDb: any;

  /** Commands run in-process; capture the command's JSON console output. */
  const runJson = async (commands: string, variables: Record<string, string> = {}): Promise<any> => {
    const spy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    let jsonCall: any[] | undefined;
    try {
      await fixture.runTerminalCommands(commands, variables);
      jsonCall = spy.mock.calls.find(args => typeof args[0] === 'string' && args[0].startsWith('{'));
    } finally {
      spy.mockRestore();
    }
    expect(jsonCall).toBeDefined();
    return JSON.parse(jsonCall![0]);
  };

  beforeAll(async () => {
    await loadModule();
    fixture = new CLIDeployTestFixture();

    v1Dir = path.join(fixture.tempFixtureDir, 'ws-v1');
    writeWorkspace(v1Dir);
    writeModule(path.join(v1Dir, 'meta'), 'meta', META_V1);
    writeModule(path.join(v1Dir, 'gen'), 'gen', GEN_V1, 'meta');

    v2Dir = path.join(fixture.tempFixtureDir, 'ws-v2');
    writeWorkspace(v2Dir);
    writeModule(path.join(v2Dir, 'meta'), 'meta', META_V2);
    writeModule(path.join(v2Dir, 'gen'), 'gen', GEN_V2, 'meta');

    // "Production": v1 deployed normally, its ledger recording v1's plan.
    prodDb = await fixture.setupTestDatabase();
    await fixture.runTerminalCommands(
      `
      cd ws-v1
      pgpm deploy --database ${prodDb.name} --package meta --yes
      pgpm deploy --database ${prodDb.name} --package gen --yes
      `,
      { database: prodDb.name }
    );
  });

  afterAll(async () => {
    await fixture.cleanup();
  });

  it('diffs two workspaces directly (workspace as a diff side)', async () => {
    const parsed = await runJson('pgpm diff ws-v1 ws-v2 --json');
    // The only semantic delta between the regenerated workspaces is genx.orders.
    expect(parsed.identical).toBe(false);
    expect(parsed.objects).toEqual([
      expect.objectContaining({ delta: 'added', path: 'schemas/genx/tables/orders/table' })
    ]);
  });

  it('diffs a workspace against itself as identical despite plan regeneration', async () => {
    const v1NoOrders = path.join(fixture.tempFixtureDir, 'ws-v2-no-orders');
    writeWorkspace(v1NoOrders);
    writeModule(path.join(v1NoOrders, 'meta'), 'meta', META_V2);
    writeModule(
      path.join(v1NoOrders, 'gen'),
      'gen',
      GEN_V2.filter(c => c.name !== 'gen/0003_genx_orders').map(c =>
        c.name === 'gen/0004_genx_procs' ? { ...c, deps: ['gen/0002_genx_customers'] } : c
      ),
      'meta'
    );
    const parsed = await runJson('pgpm diff ws-v1 ws-v2-no-orders --json');
    expect(parsed.identical).toBe(true);
  });

  it('classifies the regenerated plan against the production ledger and backfills it', async () => {
    const parsed = await runJson(
      `pgpm diff db:${prodDb.name} ws-v2 --ledger db:${prodDb.name} --emit-ledger backfill.sql --json`,
      { database: prodDb.name }
    );

    // Every v2 plan entry is 'pending' by name/hash: the regeneration renamed
    // everything, so the ledger has no matching rows.
    expect(parsed.ledger.entries.every((e: any) => e.status === 'pending')).toBe(true);
    // ...and every v1 ledger row is orphaned relative to v2's plan.
    expect(parsed.ledger.orphaned.length).toBe(META_V1.length + GEN_V1.length);

    // But semantic coverage sees through the regeneration: only the genuine
    // delta (genx.orders) is unsatisfied.
    const byName = new Map(parsed.ledger.coverage.map((c: any) => [c.name, c.status]));
    expect(byName.get('gen:gen/0003_genx_orders')).toBe('unsatisfied');
    expect(
      [...byName.entries()].filter(([name]) => name !== 'gen:gen/0003_genx_orders').every(([, s]) => s === 'satisfied')
    ).toBe(true);
    expect(parsed.ledger.backfilled).not.toContain('gen:gen/0003_genx_orders');
    expect(parsed.ledger.backfilled.length).toBe(META_V2.length + GEN_V2.length - 1);

    const backfillPath = path.join(fixture.tempFixtureDir, 'backfill.sql');
    expect(fs.existsSync(backfillPath)).toBe(true);
    const backfill = fs.readFileSync(backfillPath, 'utf-8');
    expect(backfill).toContain("'gen/0002_metax_tables'");
    expect(backfill).not.toContain("'gen/0003_genx_orders'");

    // Apply the backfill: production's ledger now records v2's identities.
    await prodDb.query(backfill.replace(/^BEGIN;$/m, '').replace(/^COMMIT;$/m, ''));
    const deployed = await prodDb.getDeployedChanges();
    const names = deployed.map((r: any) => r.change_name);
    expect(names).toContain('gen/0002_metax_tables');
    expect(names).not.toContain('gen/0003_genx_orders');
  });

  it('deploys the regenerated workspace onto production, executing only the true delta', async () => {
    // With the ledger backfilled, a plain v2 deploy skips everything satisfied
    // and executes only genx.orders.
    await fixture.runTerminalCommands(
      `
      cd ws-v2
      pgpm deploy --database ${prodDb.name} --package meta --yes
      pgpm deploy --database ${prodDb.name} --package gen --yes
      `,
      { database: prodDb.name }
    );

    expect(await prodDb.exists('table', 'genx.orders')).toBe(true);
    const deployed = await prodDb.getDeployedChanges();
    expect(deployed.map((r: any) => r.change_name)).toContain('gen/0003_genx_orders');

    // Production's catalog now equals a fresh v2 deploy.
    const freshDb = await fixture.setupTestDatabase();
    await fixture.runTerminalCommands(
      `
      cd ws-v2
      pgpm deploy --database ${freshDb.name} --package meta --yes
      pgpm deploy --database ${freshDb.name} --package gen --yes
      `,
      { database: freshDb.name }
    );
    const snapProd = await snapshotCatalog(prodDb);
    const snapFresh = await snapshotCatalog(freshDb);
    expect(diffCatalogSnapshots(withoutColumnOrder(snapProd), withoutColumnOrder(snapFresh))).toEqual([]);
  });
});
