process.env.PGPM_SKIP_UPDATE_CHECK = 'true';
process.env.INQUIRERER_SKIP_UPDATE_CHECK = 'true';

import fs from 'fs';
import path from 'path';
import { EventEmitter } from 'events';
import { Inquirerer } from 'inquirerer';

import { commands, createPgpmCommandMap } from '../src/commands';
import { setupTests, TestEnvironment, TestFixture } from '../test-utils';

jest.mock('child_process', () => {
  const actual = jest.requireActual('child_process');
  return {
    ...actual,
    spawn: jest.fn(),
  };
});

jest.mock('pg-cache', () => ({
  getPgPool: jest.fn(),
  teardownPgPools: jest.fn(),
}));

const { spawn } = jest.requireMock('child_process') as {
  spawn: jest.Mock;
};

const { getPgPool } = jest.requireMock('pg-cache') as {
  getPgPool: jest.Mock;
};

const beforeEachSetup = setupTests();

const hasDumpCommand = Object.prototype.hasOwnProperty.call(
  createPgpmCommandMap(true),
  'dump'
);
const describeIf = hasDumpCommand ? describe : describe.skip;

describeIf('cmds:dump', () => {
  let environment: TestEnvironment;
  let fixture: TestFixture;

  beforeAll(() => {
    fixture = new TestFixture();
  });

  beforeEach(() => {
    environment = beforeEachSetup();
    spawn.mockReset();
    getPgPool.mockReset()
  });

  afterAll(async () => {
    fixture.cleanup();
  });

  function mockSpawnCreatesFileAndSucceeds() {
    spawn.mockImplementation((_cmd: string, args: string[]) => {
      const child = new EventEmitter() as any;
      process.nextTick(() => {
        const fileIdx = args.indexOf('--file');
        if (fileIdx !== -1 && args[fileIdx + 1]) {
          fs.mkdirSync(path.dirname(args[fileIdx + 1]), { recursive: true });
          fs.writeFileSync(args[fileIdx + 1], '-- base dump\n', 'utf8');
        }
        child.emit('close', 0);
      });
      return child;
    });
  }

  it('writes a dump file and calls pg_dump with expected args', async () => {
    mockSpawnCreatesFileAndSucceeds();

    const { mockInput, mockOutput } = environment;
    const prompter = new Inquirerer({
      input: mockInput,
      output: mockOutput,
      noTty: true,
    });

    const outPath = path.join(fixture.tempDir, 'out', 'db.sql');

    await commands(
      {
        _: ['dump'],
        cwd: fixture.tempDir,
        database: 'mydb',
        out: outPath,
      } as any,
      prompter,
      {
        noTty: true,
        input: mockInput,
        output: mockOutput,
        version: '1.0.0',
        minimistOpts: {},
      }
    );

    expect(spawn).toHaveBeenCalledTimes(1);
    const [cmd, args] = spawn.mock.calls[0];
    expect(cmd).toBe('pg_dump');
    expect(args).toEqual(
      expect.arrayContaining(['--format=plain', '--no-owner', '--no-privileges', '--file', outPath, 'mydb'])
    );

    expect(fs.existsSync(outPath)).toBe(true);
    expect(fs.readFileSync(outPath, 'utf8')).toContain('-- base dump');
  });

  it('appends prune sql when --database-id is set', async () => {
    mockSpawnCreatesFileAndSucceeds();

    getPgPool.mockReturnValue({
      query: async (sql: string) => {
        const s = sql.toLowerCase();
        if (s.includes('from metaschema_public.database')) {
          return {
            rows: [
              { id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', name: 'alpha' },
              { id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', name: 'beta' },
            ],
          };
        }
        if (s.includes('information_schema.columns')) {
          return {
            rows: [
              { table_schema: 'app_public', table_name: 'thing' },
              { table_schema: 'app_hidden', table_name: 'other_thing' },
            ],
          };
        }
        return { rows: [] };
      },
    });

    const { mockInput, mockOutput } = environment;
    const prompter = new Inquirerer({
      input: mockInput,
      output: mockOutput,
      noTty: true,
    });

    const outPath = path.join(fixture.tempDir, 'out', 'db-pruned.sql');
    const keepId = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';

    await commands(
      {
        _: ['dump'],
        cwd: fixture.tempDir,
        database: 'mydb',
        out: outPath,
        'database-id': keepId,
      } as any,
      prompter,
      {
        noTty: true,
        input: mockInput,
        output: mockOutput,
        version: '1.0.0',
        minimistOpts: {},
      }
    );

    const content = fs.readFileSync(outPath, 'utf8');
    expect(content).toContain('-- pgpm dump prune');
    expect(content).toContain(`delete from "app_public"."thing" where database_id <> '${keepId}';`);
    expect(content).toContain(`delete from "app_hidden"."other_thing" where database_id <> '${keepId}';`);
    expect(content).toContain(`delete from metaschema_public.database where id <> '${keepId}';`);
  });
});


