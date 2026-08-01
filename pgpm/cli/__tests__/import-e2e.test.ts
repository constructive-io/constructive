/**
 * e2e for `pgpm import` against live Postgres.
 *
 * Fixture: a real `pg_dump` output (committed at fixtures/import/dump.sql)
 * with its preamble (`\restrict`, SET ..., set_config), two schemas, tables
 * with a late-FK `ALTER TABLE ONLY ... ADD CONSTRAINT`, serial sequences +
 * OWNED BY, a standalone sequence, function, trigger, policy, grants,
 * comments, `CREATE EXTENSION pgcrypto`, and COPY data blocks.
 *
 * The source schema is applied directly to a scratch DB; the dump is
 * imported at each granularity, deployed into a fresh DB, and the catalogs
 * are asserted equivalent. Then verify passes and revert leaves the DB
 * clean. `--with-data` additionally proves the seed fixtures land.
 *
 * PREREQUISITES: a running PostgreSQL instance via standard PG* env vars.
 */
import { copyBlockToInsert, preprocessDumpText } from '@pgpmjs/import';
import { diffCatalogSnapshots, snapshotCatalog } from '@pgpmjs/transform';
import * as fs from 'fs';
import * as path from 'path';
import { teardownPgPools } from 'pg-cache';

import { CLIDeployTestFixture } from '../test-utils';

jest.setTimeout(180000);

afterAll(async () => {
  await teardownPgPools();
});

const WS = 'import-ws';
const DUMP_PATH = path.join(__dirname, 'fixtures', 'import', 'dump.sql');

describe('pgpm import e2e', () => {
  let fixture: CLIDeployTestFixture;
  let originalDb: any;
  let wsDir: string;

  beforeAll(async () => {
    fixture = new CLIDeployTestFixture();
    wsDir = path.join(fixture.tempFixtureDir, WS);
    fs.mkdirSync(wsDir, { recursive: true });
    fs.writeFileSync(path.join(wsDir, 'pgpm.json'), '{\n    "packages": [\n        "*"\n    ]\n}');
    fs.copyFileSync(DUMP_PATH, path.join(wsDir, 'dump.sql'));

    // Apply the source schema directly so we can assert catalog equivalence.
    originalDb = await fixture.setupTestDatabase();
    const { sql, copyBlocks } = preprocessDumpText(fs.readFileSync(DUMP_PATH, 'utf-8'));
    await originalDb.query(sql);
    // COPY blocks appear in pg_dump's data order (not FK order), so load
    // them the way pg_restore would: with FK triggers disabled.
    const inserts = copyBlocks.map(copyBlockToInsert).filter(Boolean).join('\n');
    if (inserts) {
      await originalDb.query(
        `BEGIN;\nSET LOCAL session_replication_role = replica;\n${inserts}\nCOMMIT;`
      );
    }
  });

  afterAll(async () => {
    await fixture.cleanup();
  });

  it('--dry-run prints the plan without writing anything', async () => {
    await fixture.runTerminalCommands(
      `
      cd ${WS}
      pgpm import dump.sql --pkg imp-dry --dry-run
      `,
      {}
    );
    expect(fs.existsSync(path.join(wsDir, 'imp-dry'))).toBe(false);
  });

  it.each(['atomic', 'object', 'consolidated'] as const)(
    'import --granularity %s deploys with an equivalent catalog, verifies, and reverts clean',
    async granularity => {
      const pkg = `imp-${granularity}`;
      await fixture.runTerminalCommands(
        `
        cd ${WS}
        pgpm import dump.sql --pkg ${pkg} --granularity ${granularity}
        `,
        {}
      );

      const outDir = path.join(wsDir, pkg);
      expect(fs.existsSync(path.join(outDir, 'pgpm.plan'))).toBe(true);
      const control = fs.readFileSync(path.join(outDir, `${pkg}.control`), 'utf-8');
      expect(control).toMatch(/requires = '.*pgcrypto.*'/);

      const testDb = await fixture.setupTestDatabase();
      await fixture.runTerminalCommands(
        `
        cd ${WS}/${pkg}
        pgpm deploy --database ${testDb.name} --package ${pkg} --yes
        `,
        { database: testDb.name }
      );

      const snapOriginal = await snapshotCatalog(originalDb);
      const snapImported = await snapshotCatalog(testDb);
      expect(diffCatalogSnapshots(snapOriginal, snapImported)).toEqual([]);

      await fixture.runTerminalCommands(
        `
        cd ${WS}/${pkg}
        pgpm verify --database ${testDb.name} --package ${pkg} --yes
        pgpm revert --database ${testDb.name} --package ${pkg} --yes
        `,
        { database: testDb.name }
      );

      expect(await testDb.exists('schema', 'imp_app')).toBe(false);
      expect(await testDb.exists('schema', 'imp_audit')).toBe(false);
      const remaining = await testDb.query(
        `SELECT COUNT(*)::int AS count FROM pgpm_migrate.changes WHERE package = $1`,
        [pkg]
      );
      expect(remaining.rows[0].count).toBe(0);
    }
  );

  it('--partition splits the import into multiple packages with cross-package requires', async () => {
    fs.writeFileSync(
      path.join(wsDir, 'partition.json'),
      JSON.stringify({
        defaultPackage: 'imp-core',
        rules: [{ package: 'imp-audit-pkg', select: [{ schema: 'imp_audit' }] }]
      })
    );

    await fixture.runTerminalCommands(
      `
      cd ${WS}
      pgpm import dump.sql --pkg imp-part --partition partition.json
      `,
      {}
    );

    expect(fs.existsSync(path.join(wsDir, 'imp-core', 'pgpm.plan'))).toBe(true);
    expect(fs.existsSync(path.join(wsDir, 'imp-audit-pkg', 'pgpm.plan'))).toBe(true);
    const auditPlan = fs.readFileSync(path.join(wsDir, 'imp-audit-pkg', 'pgpm.plan'), 'utf-8');
    expect(auditPlan).toContain('schemas/imp_audit');
    const corePlan = fs.readFileSync(path.join(wsDir, 'imp-core', 'pgpm.plan'), 'utf-8');
    expect(corePlan).not.toContain('schemas/imp_audit/');
    // extension requires + cross-package requires land in the .control files
    const coreControl = fs.readFileSync(path.join(wsDir, 'imp-core', 'imp-core.control'), 'utf-8');
    expect(coreControl).toMatch(/requires = '.*pgcrypto.*'/);
    const auditControl = fs.readFileSync(path.join(wsDir, 'imp-audit-pkg', 'imp-audit-pkg.control'), 'utf-8');
    expect(auditControl).toMatch(/requires = '.*imp-core.*'/);

    const testDb = await fixture.setupTestDatabase();
    await fixture.runTerminalCommands(
      `
      cd ${WS}/imp-core
      pgpm deploy --database ${testDb.name} --package imp-core --yes
      cd ../imp-audit-pkg
      pgpm deploy --database ${testDb.name} --package imp-audit-pkg --yes
      `,
      { database: testDb.name }
    );
    const snapOriginal = await snapshotCatalog(originalDb);
    const snapPartitioned = await snapshotCatalog(testDb);
    expect(diffCatalogSnapshots(snapOriginal, snapPartitioned)).toEqual([]);
  });

  it('--with-data deploys COPY/INSERT data as seed fixtures', async () => {
    await fixture.runTerminalCommands(
      `
      cd ${WS}
      pgpm import dump.sql --pkg imp-data --with-data
      `,
      {}
    );

    const plan = fs.readFileSync(path.join(wsDir, 'imp-data', 'pgpm.plan'), 'utf-8');
    expect(plan).toContain('schemas/imp_app/tables/users/fixtures/seed');
    expect(plan).toContain('schemas/imp_app/tables/orders/fixtures/seed');

    const testDb = await fixture.setupTestDatabase();
    await fixture.runTerminalCommands(
      `
      cd ${WS}/imp-data
      pgpm deploy --database ${testDb.name} --package imp-data --yes
      `,
      { database: testDb.name }
    );

    const users = await testDb.query('SELECT COUNT(*)::int AS count FROM imp_app.users');
    expect(users.rows[0].count).toBe(2);
    const orders = await testDb.query('SELECT note FROM imp_app.orders ORDER BY id');
    expect(orders.rows.map((r: any) => r.note)).toEqual(['first\torder', null]);
    // setval rode the sequence changes: nextval continues after the seeds
    const next = await testDb.query("SELECT nextval('imp_app.order_seq')::int AS v");
    expect(next.rows[0].v).toBeGreaterThan(101);
  });
});
