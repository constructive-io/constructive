import * as fs from 'fs';
import { Inquirerer, ParsedArgs } from 'inquirerer';
import * as path from 'path';

import { commands } from '../src/commands';
import { setupTests, TestEnvironment, TestFixture } from '../test-utils';

const beforeEachSetup = setupTests();

const STUB_REVERT = (change: string) =>
  `-- Revert ${change} from pg\n\nBEGIN;\n\n-- Add your revert SQL here\n\nCOMMIT;\n`;
const STUB_VERIFY = (change: string) =>
  `-- Verify ${change} on pg\n\nBEGIN;\n\nROLLBACK;\n`;

interface ChangeSpec {
  name: string;
  deps?: string[];
  deploy: string;
  revert?: string;
  verify?: string;
}

const writeModule = (moduleDir: string, changes: ChangeSpec[]) => {
  const moduleName = path.basename(moduleDir);
  fs.mkdirSync(moduleDir, { recursive: true });
  for (const dir of ['deploy', 'revert', 'verify']) {
    fs.mkdirSync(path.join(moduleDir, dir), { recursive: true });
  }
  const planLines = changes.map((c, i) => {
    const deps = c.deps && c.deps.length > 0 ? ` [${c.deps.join(' ')}]` : '';
    return `${c.name}${deps} 2024-01-0${(i % 9) + 1}T00:00:00Z test <test@example.com> # add ${c.name}`;
  });
  fs.writeFileSync(
    path.join(moduleDir, 'pgpm.plan'),
    `%syntax-version=1.0.0\n%project=${moduleName}\n%uri=https://github.com/test/${moduleName}\n\n${planLines.join('\n')}\n`
  );
  fs.writeFileSync(
    path.join(moduleDir, `${moduleName}.control`),
    `comment = 'Test module'\ndefault_version = '0.1.0'\nrelocatable = false\nsuperuser = false\n`
  );
  const writeScript = (type: string, name: string, content: string) => {
    const filePath = path.join(moduleDir, type, `${name}.sql`);
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, content);
  };
  for (const c of changes) {
    writeScript('deploy', c.name, `-- Deploy ${c.name} to pg\n\nBEGIN;\n\n${c.deploy}\n\nCOMMIT;\n`);
    if (c.revert !== undefined) writeScript('revert', c.name, c.revert);
    if (c.verify !== undefined) writeScript('verify', c.name, c.verify);
  }
};

const readScriptFile = (moduleDir: string, type: string, name: string) =>
  fs.readFileSync(path.join(moduleDir, type, `${name}.sql`), 'utf-8');

describe('cmds:regen', () => {
  let environment: TestEnvironment;
  let fixture: TestFixture;

  beforeAll(() => {
    fixture = new TestFixture();
  });

  beforeEach(() => {
    environment = beforeEachSetup();
  });

  afterAll(() => {
    fixture.cleanup();
  });

  const runRegen = async (argv: Partial<ParsedArgs>) => {
    const { mockInput, mockOutput } = environment;
    const prompter = new Inquirerer({
      input: mockInput,
      output: mockOutput,
      noTty: true
    });
    const positionals = (argv._ as string[]) ?? [];
    return commands({ ...argv, _: ['regen', ...positionals] } as ParsedArgs, prompter, {
      noTty: true,
      input: mockInput,
      output: mockOutput,
      version: '1.0.0',
      minimistOpts: {}
    });
  };

  it('sweeps stub and missing scripts, generating revert and verify', async () => {
    const moduleDir = path.join(fixture.tempDir, 'sweep-module');
    writeModule(moduleDir, [
      {
        name: 'schemas/app/schema',
        deploy: 'CREATE SCHEMA app;',
        revert: STUB_REVERT('schemas/app/schema'),
        verify: STUB_VERIFY('schemas/app/schema')
      },
      {
        name: 'schemas/app/tables/users/table',
        deps: ['schemas/app/schema'],
        deploy: 'CREATE TABLE app.users (id serial PRIMARY KEY);'
        // no revert/verify files at all (missing)
      }
    ]);

    await runRegen({ cwd: moduleDir });

    const schemaRevert = readScriptFile(moduleDir, 'revert', 'schemas/app/schema');
    expect(schemaRevert).toContain('-- Revert schemas/app/schema from pg');
    expect(schemaRevert).toContain('BEGIN;');
    expect(schemaRevert).toContain('DROP SCHEMA app;');
    expect(schemaRevert).toContain('COMMIT;');

    const schemaVerify = readScriptFile(moduleDir, 'verify', 'schemas/app/schema');
    expect(schemaVerify).toContain('-- Verify schemas/app/schema on pg');
    expect(schemaVerify).toContain('BEGIN;');
    expect(schemaVerify).toContain("schema_name = 'app'");
    expect(schemaVerify).toContain('ROLLBACK;');

    const tableRevert = readScriptFile(moduleDir, 'revert', 'schemas/app/tables/users/table');
    expect(tableRevert).toContain('DROP TABLE app.users;');
    const tableVerify = readScriptFile(moduleDir, 'verify', 'schemas/app/tables/users/table');
    expect(tableVerify).toContain("to_regclass('app.users')");
  });

  it('never overwrites non-empty scripts without --force', async () => {
    const moduleDir = path.join(fixture.tempDir, 'preserve-module');
    const handWritten = '-- Revert schemas/app/schema from pg\n\nBEGIN;\n\nDROP SCHEMA app CASCADE;\n\nCOMMIT;\n';
    writeModule(moduleDir, [
      {
        name: 'schemas/app/schema',
        deploy: 'CREATE SCHEMA app;',
        revert: handWritten,
        verify: STUB_VERIFY('schemas/app/schema')
      }
    ]);

    await runRegen({ cwd: moduleDir });

    expect(readScriptFile(moduleDir, 'revert', 'schemas/app/schema')).toBe(handWritten);
    expect(readScriptFile(moduleDir, 'verify', 'schemas/app/schema')).toContain("schema_name = 'app'");
  });

  it('overwrites non-empty scripts with --force', async () => {
    const moduleDir = path.join(fixture.tempDir, 'force-module');
    const handWritten = '-- Revert schemas/app/schema from pg\n\nBEGIN;\n\nDROP SCHEMA app CASCADE;\n\nCOMMIT;\n';
    writeModule(moduleDir, [
      {
        name: 'schemas/app/schema',
        deploy: 'CREATE SCHEMA app;',
        revert: handWritten,
        verify: STUB_VERIFY('schemas/app/schema')
      }
    ]);

    await runRegen({ cwd: moduleDir, force: true });

    const revert = readScriptFile(moduleDir, 'revert', 'schemas/app/schema');
    expect(revert).not.toContain('CASCADE');
    expect(revert).toContain('DROP SCHEMA app;');
  });

  it('regenerates only the named changes in targeted mode', async () => {
    const moduleDir = path.join(fixture.tempDir, 'targeted-module');
    writeModule(moduleDir, [
      {
        name: 'schemas/app/schema',
        deploy: 'CREATE SCHEMA app;',
        revert: STUB_REVERT('schemas/app/schema'),
        verify: STUB_VERIFY('schemas/app/schema')
      },
      {
        name: 'schemas/app/tables/users/table',
        deps: ['schemas/app/schema'],
        deploy: 'CREATE TABLE app.users (id serial PRIMARY KEY);',
        revert: STUB_REVERT('schemas/app/tables/users/table'),
        verify: STUB_VERIFY('schemas/app/tables/users/table')
      }
    ]);

    await runRegen({ cwd: moduleDir, _: ['schemas/app/tables/users/table'] });

    // untouched stub for the schema change
    expect(readScriptFile(moduleDir, 'revert', 'schemas/app/schema')).toBe(STUB_REVERT('schemas/app/schema'));
    // regenerated for the targeted change
    expect(readScriptFile(moduleDir, 'revert', 'schemas/app/tables/users/table')).toContain('DROP TABLE app.users;');
  });

  it('respects --revert-only and --verify-only', async () => {
    const moduleDir = path.join(fixture.tempDir, 'only-module');
    writeModule(moduleDir, [
      {
        name: 'schemas/app/schema',
        deploy: 'CREATE SCHEMA app;',
        revert: STUB_REVERT('schemas/app/schema'),
        verify: STUB_VERIFY('schemas/app/schema')
      }
    ]);

    await runRegen({ cwd: moduleDir, 'revert-only': true });
    expect(readScriptFile(moduleDir, 'revert', 'schemas/app/schema')).toContain('DROP SCHEMA app;');
    expect(readScriptFile(moduleDir, 'verify', 'schemas/app/schema')).toBe(STUB_VERIFY('schemas/app/schema'));

    await runRegen({ cwd: moduleDir, 'verify-only': true });
    expect(readScriptFile(moduleDir, 'verify', 'schemas/app/schema')).toContain("schema_name = 'app'");
  });

  it('--dry-run reports without writing', async () => {
    const moduleDir = path.join(fixture.tempDir, 'dry-run-module');
    writeModule(moduleDir, [
      {
        name: 'schemas/app/schema',
        deploy: 'CREATE SCHEMA app;',
        revert: STUB_REVERT('schemas/app/schema'),
        verify: STUB_VERIFY('schemas/app/schema')
      }
    ]);

    await runRegen({ cwd: moduleDir, 'dry-run': true });

    expect(readScriptFile(moduleDir, 'revert', 'schemas/app/schema')).toBe(STUB_REVERT('schemas/app/schema'));
    expect(readScriptFile(moduleDir, 'verify', 'schemas/app/schema')).toBe(STUB_VERIFY('schemas/app/schema'));
  });

  it('emits not-derivable comments for statements without an inverse', async () => {
    const moduleDir = path.join(fixture.tempDir, 'warn-module');
    writeModule(moduleDir, [
      {
        name: 'schemas/app/schema',
        deploy: 'CREATE SCHEMA app;',
        revert: STUB_REVERT('schemas/app/schema'),
        verify: STUB_VERIFY('schemas/app/schema')
      },
      {
        name: 'fixtures/seed',
        deps: ['schemas/app/schema'],
        deploy: "CREATE TABLE app.settings (k text);\nINSERT INTO app.settings (k) VALUES ('x');"
      }
    ]);

    await runRegen({ cwd: moduleDir });

    const revert = readScriptFile(moduleDir, 'revert', 'fixtures/seed');
    expect(revert).toContain('-- revert not derivable:');
    expect(revert).toContain('DROP TABLE app.settings;');
  });
});
