/**
 * e2e for `pgpm transform` against live Postgres.
 *
 * Fixture module: two schemas, tables + FK, function, trigger, policy, grant,
 * index. Transforms to each granularity, deploys each output, asserts catalog
 * equivalence with the original, exercises --check/--dry-run/overwrite guard,
 * verifies, reverts, partitions into pkg-app + pkg-security, and round-trips
 * consolidated -> atomic -> consolidated.
 *
 * PREREQUISITES: a running PostgreSQL instance via standard PG* env vars.
 */
import { readBundleArchiveFile } from '@pgpmjs/core';
import { diffCatalogSnapshots, snapshotCatalog } from '@pgpmjs/transform';
import * as fs from 'fs';
import * as path from 'path';
import { teardownPgPools } from 'pg-cache';

import { CLIDeployTestFixture } from '../test-utils';

jest.setTimeout(180000);

afterAll(async () => {
  await teardownPgPools();
});

const MODULE_NAME = 'transform-e2e';
const WS = 'transform-ws';

interface ChangeSpec {
  name: string;
  deps?: string[];
  deploy: string;
}

/** Two schemas, tables + FK, function, trigger, policy, grant, index. */
const CHANGES: ChangeSpec[] = [
  {
    name: 'schemas/tfx_app/schema',
    deploy: 'CREATE SCHEMA tfx_app;'
  },
  {
    name: 'schemas/tfx_sec/schema',
    deploy: 'CREATE SCHEMA tfx_sec;'
  },
  {
    name: 'schemas/tfx_app/tables/users/table',
    deps: ['schemas/tfx_app/schema'],
    deploy: 'CREATE TABLE tfx_app.users (id serial PRIMARY KEY, email text NOT NULL);'
  },
  {
    name: 'schemas/tfx_sec/tables/audit/table',
    deps: ['schemas/tfx_sec/schema', 'schemas/tfx_app/tables/users/table'],
    deploy: [
      'CREATE TABLE tfx_sec.audit (',
      '  id serial PRIMARY KEY,',
      '  user_id int NOT NULL REFERENCES tfx_app.users (id),',
      '  note text',
      ');'
    ].join('\n')
  },
  {
    name: 'schemas/tfx_app/procedures/touch',
    deps: ['schemas/tfx_app/schema'],
    deploy:
      'CREATE FUNCTION tfx_app.touch() RETURNS trigger AS $$ BEGIN RETURN NEW; END $$ LANGUAGE plpgsql;'
  },
  {
    name: 'schemas/tfx_app/tables/users/triggers/users_touch',
    deps: ['schemas/tfx_app/tables/users/table', 'schemas/tfx_app/procedures/touch'],
    deploy:
      'CREATE TRIGGER users_touch BEFORE UPDATE ON tfx_app.users FOR EACH ROW EXECUTE FUNCTION tfx_app.touch();'
  },
  {
    name: 'schemas/tfx_app/tables/users/policies/users_self',
    deps: ['schemas/tfx_app/tables/users/table'],
    deploy: [
      'ALTER TABLE tfx_app.users ENABLE ROW LEVEL SECURITY;',
      'CREATE POLICY users_self ON tfx_app.users FOR SELECT USING (true);'
    ].join('\n')
  },
  {
    name: 'schemas/tfx_app/tables/users/grants/select',
    deps: ['schemas/tfx_app/tables/users/table'],
    deploy: 'GRANT SELECT ON tfx_app.users TO PUBLIC;'
  },
  {
    name: 'schemas/tfx_app/tables/users/indexes/users_email_idx',
    deps: ['schemas/tfx_app/tables/users/table'],
    deploy: 'CREATE INDEX users_email_idx ON tfx_app.users (email);'
  }
];

const writeModule = (moduleDir: string) => {
  const workspaceDir = path.dirname(moduleDir);
  fs.mkdirSync(workspaceDir, { recursive: true });
  fs.writeFileSync(path.join(workspaceDir, 'pgpm.json'), '{\n    "packages": [\n        "*"\n    ]\n}');
  fs.mkdirSync(moduleDir, { recursive: true });
  const planLines = CHANGES.map((c, i) => {
    const deps = c.deps && c.deps.length > 0 ? ` [${c.deps.join(' ')}]` : '';
    return `${c.name}${deps} 2024-01-0${(i % 9) + 1}T00:00:00Z test <test@example.com> # add ${c.name}`;
  });
  fs.writeFileSync(
    path.join(moduleDir, 'pgpm.plan'),
    `%syntax-version=1.0.0\n%project=${MODULE_NAME}\n%uri=https://github.com/test/${MODULE_NAME}\n\n${planLines.join('\n')}\n`
  );
  fs.writeFileSync(
    path.join(moduleDir, `${MODULE_NAME}.control`),
    `comment = 'Transform e2e module'\ndefault_version = '0.0.1'\nrelocatable = false\nsuperuser = false\n`
  );
  for (const c of CHANGES) {
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

const PARTITION_CONFIG = {
  defaultPackage: 'pkg-app',
  splitRiders: ['grant'],
  rules: [
    {
      package: 'pkg-security',
      select: [{ kind: 'policy' }, { statementKind: 'grant' }]
    }
  ]
};

describe('pgpm transform e2e', () => {
  let fixture: CLIDeployTestFixture;
  let originalDb: any;
  let wsDir: string;
  let moduleDir: string;

  beforeAll(async () => {
    fixture = new CLIDeployTestFixture();
    wsDir = path.join(fixture.tempFixtureDir, WS);
    moduleDir = path.join(wsDir, MODULE_NAME);
    writeModule(moduleDir);

    originalDb = await fixture.setupTestDatabase();
    await fixture.runTerminalCommands(
      `
      cd ${WS}/${MODULE_NAME}
      pgpm deploy --database ${originalDb.name} --package ${MODULE_NAME} --yes
      `,
      { database: originalDb.name }
    );
  });

  afterAll(async () => {
    await fixture.cleanup();
  });

  it('--dry-run prints the plan without writing anything', async () => {
    await fixture.runTerminalCommands(
      `
      cd ${WS}/${MODULE_NAME}
      pgpm transform --granularity object --dry-run
      `,
      {}
    );
    expect(fs.existsSync(path.join(wsDir, `${MODULE_NAME}-object`))).toBe(false);
  });

  it.each(['atomic', 'object', 'consolidated'] as const)(
    'transform --granularity %s deploys with an equivalent catalog, verifies, and reverts clean',
    async granularity => {
      await fixture.runTerminalCommands(
        `
        cd ${WS}/${MODULE_NAME}
        pgpm transform --granularity ${granularity}
        `,
        {}
      );

      const outDir = path.join(wsDir, `${MODULE_NAME}-${granularity}`);
      expect(fs.existsSync(path.join(outDir, 'pgpm.plan'))).toBe(true);
      expect(fs.existsSync(path.join(outDir, `${MODULE_NAME}-${granularity}.control`))).toBe(true);

      const testDb = await fixture.setupTestDatabase();
      await fixture.runTerminalCommands(
        `
        cd ${WS}/${MODULE_NAME}-${granularity}
        pgpm deploy --database ${testDb.name} --package ${MODULE_NAME}-${granularity} --yes
        `,
        { database: testDb.name }
      );

      const snapOriginal = await snapshotCatalog(originalDb);
      const snapTransformed = await snapshotCatalog(testDb);
      expect(diffCatalogSnapshots(snapOriginal, snapTransformed)).toEqual([]);

      await fixture.runTerminalCommands(
        `
        cd ${WS}/${MODULE_NAME}-${granularity}
        pgpm verify --database ${testDb.name} --package ${MODULE_NAME}-${granularity} --yes
        pgpm revert --database ${testDb.name} --package ${MODULE_NAME}-${granularity} --yes
        `,
        { database: testDb.name }
      );

      expect(await testDb.exists('schema', 'tfx_app')).toBe(false);
      expect(await testDb.exists('schema', 'tfx_sec')).toBe(false);
      const remaining = await testDb.query(
        `SELECT COUNT(*)::int AS count FROM pgpm_migrate.changes WHERE package = $1`,
        [`${MODULE_NAME}-${granularity}`]
      );
      expect(remaining.rows[0].count).toBe(0);
    }
  );

  it('--change-granularity alteration splits per column/constraint, deploys equivalently, verifies, and reverts clean', async () => {
    await fixture.runTerminalCommands(
      `
      cd ${WS}/${MODULE_NAME}
      pgpm transform --granularity atomic --change-granularity alteration --out ../alteration-out
      `,
      {}
    );

    const outDir = path.join(wsDir, 'alteration-out', `${MODULE_NAME}-atomic`);
    const plan = fs.readFileSync(path.join(outDir, 'pgpm.plan'), 'utf-8');
    expect(plan).toContain('schemas/tfx_app/tables/users/columns/id/column');
    expect(plan).toContain('schemas/tfx_app/tables/users/columns/email/column');
    expect(plan).toContain('schemas/tfx_app/tables/users/constraints/users_pkey/constraint');
    expect(plan).toContain('schemas/tfx_sec/tables/audit/constraints/audit_user_id_fkey/constraint');

    // Each alteration has its own deploy/revert/verify triple.
    const columnChange = 'schemas/tfx_app/tables/users/columns/email/column';
    expect(fs.readFileSync(path.join(outDir, 'deploy', `${columnChange}.sql`), 'utf-8')).toContain('ADD COLUMN email');
    expect(fs.readFileSync(path.join(outDir, 'revert', `${columnChange}.sql`), 'utf-8')).toContain('DROP COLUMN email');
    expect(fs.readFileSync(path.join(outDir, 'verify', `${columnChange}.sql`), 'utf-8')).toContain('information_schema.columns');

    const testDb = await fixture.setupTestDatabase();
    await fixture.runTerminalCommands(
      `
      cd ${WS}/alteration-out/${MODULE_NAME}-atomic
      pgpm deploy --database ${testDb.name} --package ${MODULE_NAME}-atomic --yes
      `,
      { database: testDb.name }
    );

    const snapOriginal = await snapshotCatalog(originalDb);
    const snapTransformed = await snapshotCatalog(testDb);
    expect(diffCatalogSnapshots(snapOriginal, snapTransformed)).toEqual([]);

    await fixture.runTerminalCommands(
      `
      cd ${WS}/alteration-out/${MODULE_NAME}-atomic
      pgpm verify --database ${testDb.name} --package ${MODULE_NAME}-atomic --yes
      pgpm revert --database ${testDb.name} --package ${MODULE_NAME}-atomic --yes
      `,
      { database: testDb.name }
    );
    expect(await testDb.exists('schema', 'tfx_app')).toBe(false);
  });

  it('rewrites an existing output when --write is passed', async () => {
    // The refusal path (no --write) exits the process, so it is covered by the
    // checkOverwrite unit tests; here we prove --write re-generates in place.
    const outDir = path.join(wsDir, `${MODULE_NAME}-object`);
    expect(fs.existsSync(outDir)).toBe(true);

    await fixture.runTerminalCommands(
      `
      cd ${WS}/${MODULE_NAME}
      pgpm transform --granularity object --write
      `,
      {}
    );
    expect(fs.existsSync(path.join(outDir, 'pgpm.plan'))).toBe(true);
  });

  it('--check proves the transform is structurally lossless', async () => {
    await fixture.runTerminalCommands(
      `
      cd ${WS}/${MODULE_NAME}
      pgpm transform --granularity consolidated --write --check
      `,
      {}
    );
  });

  it('partitions into pkg-app + pkg-security with catalog equivalence', async () => {
    fs.writeFileSync(path.join(wsDir, 'partition.json'), JSON.stringify(PARTITION_CONFIG, null, 2));

    await fixture.runTerminalCommands(
      `
      cd ${WS}/${MODULE_NAME}
      pgpm transform --granularity object --partition ../partition.json
      `,
      {}
    );

    const appDir = path.join(wsDir, 'pkg-app');
    const secDir = path.join(wsDir, 'pkg-security');
    expect(fs.existsSync(path.join(appDir, 'pgpm.plan'))).toBe(true);
    expect(fs.existsSync(path.join(secDir, 'pgpm.plan'))).toBe(true);

    // security package requires the app package (policies/grants target app tables)
    const secControl = fs.readFileSync(path.join(secDir, 'pkg-security.control'), 'utf-8');
    expect(secControl).toMatch(/requires = '.*pkg-app.*'/);

    const testDb = await fixture.setupTestDatabase();
    await fixture.runTerminalCommands(
      `
      cd ${WS}/pkg-app
      pgpm deploy --database ${testDb.name} --package pkg-app --yes
      cd ../pkg-security
      pgpm deploy --database ${testDb.name} --package pkg-security --yes
      `,
      { database: testDb.name }
    );

    const snapOriginal = await snapshotCatalog(originalDb);
    const snapPartitioned = await snapshotCatalog(testDb);
    expect(diffCatalogSnapshots(snapOriginal, snapPartitioned)).toEqual([]);
  });

  it('composes module + linear SQL + bundle projections from one transform run', async () => {
    await fixture.runTerminalCommands(
      `
      cd ${WS}/${MODULE_NAME}
      pgpm transform --granularity consolidated --out ../emit-out --emit-sql ../emit-out/transform.sql --emit-bundle ../emit-out/transform.bundle.tar.gz
      `,
      {}
    );

    const outDir = path.join(wsDir, 'emit-out', `${MODULE_NAME}-consolidated`);
    expect(fs.existsSync(path.join(outDir, 'pgpm.plan'))).toBe(true);

    // linear SQL projection: real, deployable SQL in plan order
    const sql = fs.readFileSync(path.join(wsDir, 'emit-out', 'transform.sql'), 'utf-8');
    expect(sql).toMatch(/CREATE SCHEMA tfx_app/);
    expect(sql).toMatch(/CREATE TABLE tfx_app\.users/);

    // bundle projection: a readable content-addressed archive of the changes
    const bundle = readBundleArchiveFile(path.join(wsDir, 'emit-out', 'transform.bundle.tar.gz'));
    expect(bundle.changes.length).toBeGreaterThan(0);
  });

  it('round-trips consolidated -> atomic -> consolidated to the same object set', async () => {
    // consolidated already exists at <module>-consolidated (from --check test)
    const c1 = path.join(wsDir, `${MODULE_NAME}-consolidated`);
    expect(fs.existsSync(path.join(c1, 'pgpm.plan'))).toBe(true);

    await fixture.runTerminalCommands(
      `
      cd ${WS}/${MODULE_NAME}-consolidated
      pgpm transform --granularity atomic --out ../roundtrip-atomic --write
      cd ../roundtrip-atomic/${MODULE_NAME}-consolidated-atomic
      pgpm transform --granularity consolidated --out ../../roundtrip-consolidated --write
      `,
      {}
    );

    const c2 = path.join(
      wsDir,
      'roundtrip-consolidated',
      `${MODULE_NAME}-consolidated-atomic-consolidated`
    );
    expect(fs.existsSync(path.join(c2, 'pgpm.plan'))).toBe(true);

    const changeSet = (planPath: string): string[] =>
      fs
        .readFileSync(planPath, 'utf-8')
        .split('\n')
        .filter(line => line && !line.startsWith('%'))
        .map(line => line.split(' ')[0])
        .sort();

    expect(changeSet(path.join(c2, 'pgpm.plan'))).toEqual(
      changeSet(path.join(c1, 'pgpm.plan'))
    );
  });
});
