import * as fs from 'fs';
import * as path from 'path';
import { teardownPgPools } from 'pg-cache';

import { CLIDeployTestFixture } from '../test-utils';

jest.setTimeout(60000);

afterAll(async () => {
  await teardownPgPools();
});

const MODULE_NAME = 'regen-e2e';

const STUB_REVERT = (change: string) =>
  `-- Revert ${change} from pg\n\nBEGIN;\n\n-- Add your revert SQL here\n\nCOMMIT;\n`;
const STUB_VERIFY = (change: string) =>
  `-- Verify ${change} on pg\n\nBEGIN;\n\nROLLBACK;\n`;

interface ChangeSpec {
  name: string;
  deps?: string[];
  deploy: string;
}

/** Mixed statement kinds: schema, table, ALTER columns/constraints, function,
 * trigger, RLS + policy, grant, index — all with empty stub revert/verify. */
const CHANGES: ChangeSpec[] = [
  {
    name: 'schemas/regen_app/schema',
    deploy: 'CREATE SCHEMA regen_app;'
  },
  {
    name: 'schemas/regen_app/tables/users/table',
    deps: ['schemas/regen_app/schema'],
    deploy: [
      'CREATE TABLE regen_app.users (id serial PRIMARY KEY);',
      'ALTER TABLE regen_app.users ADD COLUMN email text;',
      'ALTER TABLE regen_app.users ADD CONSTRAINT users_email_key UNIQUE (email);'
    ].join('\n')
  },
  {
    name: 'schemas/regen_app/tables/users/indexes/users_email_idx',
    deps: ['schemas/regen_app/tables/users/table'],
    deploy: 'CREATE INDEX users_email_idx ON regen_app.users (email);'
  },
  {
    name: 'schemas/regen_app/procedures/touch',
    deps: ['schemas/regen_app/schema'],
    deploy:
      'CREATE FUNCTION regen_app.touch() RETURNS trigger AS $$ BEGIN RETURN NEW; END $$ LANGUAGE plpgsql;'
  },
  {
    name: 'schemas/regen_app/tables/users/triggers/users_touch',
    deps: ['schemas/regen_app/tables/users/table', 'schemas/regen_app/procedures/touch'],
    deploy:
      'CREATE TRIGGER users_touch BEFORE UPDATE ON regen_app.users FOR EACH ROW EXECUTE FUNCTION regen_app.touch();'
  },
  {
    name: 'schemas/regen_app/tables/users/policies/users_self',
    deps: ['schemas/regen_app/tables/users/table'],
    deploy: [
      'ALTER TABLE regen_app.users ENABLE ROW LEVEL SECURITY;',
      'CREATE POLICY users_self ON regen_app.users FOR SELECT USING (true);'
    ].join('\n')
  },
  {
    name: 'schemas/regen_app/tables/users/grants/select',
    deps: ['schemas/regen_app/tables/users/table'],
    deploy: 'GRANT SELECT ON regen_app.users TO PUBLIC;'
  }
];

const writeModule = (moduleDir: string) => {
  // enclosing workspace, so deploy/verify/revert resolve the module
  const workspaceDir = path.dirname(moduleDir);
  fs.mkdirSync(workspaceDir, { recursive: true });
  fs.writeFileSync(path.join(workspaceDir, 'pgpm.json'), '{\n    "packages": [\n        "*"\n    ]\n}');
  fs.mkdirSync(moduleDir, { recursive: true });
  for (const dir of ['deploy', 'revert', 'verify']) {
    fs.mkdirSync(path.join(moduleDir, dir), { recursive: true });
  }
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
    `comment = 'Regen e2e module'\ndefault_version = '0.0.1'\nrelocatable = false\nsuperuser = false\n`
  );
  const writeScript = (type: string, name: string, content: string) => {
    const filePath = path.join(moduleDir, type, `${name}.sql`);
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, content);
  };
  for (const c of CHANGES) {
    writeScript('deploy', c.name, `-- Deploy ${c.name} to pg\n\nBEGIN;\n\n${c.deploy}\n\nCOMMIT;\n`);
    writeScript('revert', c.name, STUB_REVERT(c.name));
    writeScript('verify', c.name, STUB_VERIFY(c.name));
  }
};

describe('regen e2e round-trip', () => {
  let fixture: CLIDeployTestFixture;
  let testDb: any;
  let moduleDir: string;

  beforeAll(async () => {
    fixture = new CLIDeployTestFixture();
    testDb = await fixture.setupTestDatabase();
    moduleDir = path.join(fixture.tempFixtureDir, 'regen-ws', MODULE_NAME);
    writeModule(moduleDir);
  });

  afterAll(async () => {
    await fixture.cleanup();
  });

  it('fills every stub revert/verify from the deploy scripts', async () => {
    await fixture.runTerminalCommands(
      `
      cd regen-ws/${MODULE_NAME}
      pgpm regen
      `,
      {}
    );

    for (const c of CHANGES) {
      const revert = fs.readFileSync(path.join(moduleDir, 'revert', `${c.name}.sql`), 'utf-8');
      const verify = fs.readFileSync(path.join(moduleDir, 'verify', `${c.name}.sql`), 'utf-8');
      expect(revert).toContain(`-- Revert ${c.name} from pg`);
      expect(revert).toContain('COMMIT;');
      expect(revert).not.toContain('-- Add your revert SQL here');
      expect(verify).toContain(`-- Verify ${c.name} on pg`);
      expect(verify).toContain('ROLLBACK;');
      expect(verify).toMatch(/SELECT 1\//);
    }
  });

  it('deploys, verifies, and reverts cleanly against live Postgres', async () => {
    await fixture.runTerminalCommands(
      `
      cd regen-ws/${MODULE_NAME}
      pgpm deploy --database ${testDb.name} --package ${MODULE_NAME} --yes
      `,
      { database: testDb.name }
    );

    expect(await testDb.exists('schema', 'regen_app')).toBe(true);
    expect(await testDb.exists('table', 'regen_app.users')).toBe(true);

    await fixture.runTerminalCommands(
      `
      cd regen-ws/${MODULE_NAME}
      pgpm verify --database ${testDb.name} --package ${MODULE_NAME} --yes
      `,
      { database: testDb.name }
    );

    await fixture.runTerminalCommands(
      `
      cd regen-ws/${MODULE_NAME}
      pgpm revert --database ${testDb.name} --package ${MODULE_NAME} --yes
      `,
      { database: testDb.name }
    );

    expect(await testDb.exists('schema', 'regen_app')).toBe(false);
    expect(await testDb.exists('table', 'regen_app.users')).toBe(false);

    const remaining = await testDb.query(
      `SELECT COUNT(*)::int AS count FROM pgpm_migrate.changes WHERE package = $1`,
      [MODULE_NAME]
    );
    expect(remaining.rows[0].count).toBe(0);
  });
});
