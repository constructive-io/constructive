import { spawn } from 'child_process';
import { EventEmitter } from 'events';

import env from '../src/commands/env';

jest.mock('child_process', () => ({ spawn: jest.fn() }));

const originalEnv = process.env;
const originalArgv = process.argv;

beforeEach(() => {
  process.env = {};
  process.argv = ['node', 'pgpm', 'env'];
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.mocked(spawn).mockReset();
});

afterEach(() => {
  process.env = originalEnv;
  process.argv = originalArgv;
  jest.restoreAllMocks();
});

it('prints explicit PG settings, including empty and shell-sensitive values', async () => {
  process.env = { PGHOST: 'dev.local', PGPORT: '6543', PGUSER: 'developer', PGPASSWORD: "a '$ literal", PGDATABASE: '' };
  await env({}, undefined);
  expect(jest.mocked(console.log).mock.calls.flat()).toEqual([
    'export PGHOST=dev.local',
    'export PGPORT=6543',
    'export PGUSER=developer',
    `export PGPASSWORD='a '"'"'$ literal'`,
    'export PGDATABASE='
  ]);
});

it('uses the Supabase profile instead of inherited settings in exports and wrapped commands', async () => {
  process.env = { PGHOST: 'dev.local', PGPORT: '6543', PGUSER: 'developer', PGPASSWORD: 'test', PGDATABASE: 'dev' };
  const expected = { PGHOST: 'localhost', PGPORT: '54322', PGUSER: 'supabase_admin', PGPASSWORD: 'postgres', PGDATABASE: 'postgres' };
  process.argv.push('--supabase');
  await env({ supabase: true }, undefined);
  expect(jest.mocked(console.log).mock.calls.flat()).toEqual(
    Object.entries(expected).map(([key, value]) => `export ${key}=${value}`)
  );

  jest.spyOn(process, 'exit').mockImplementation(() => undefined as never);
  jest.mocked(spawn).mockImplementation(() => {
    const child = new EventEmitter();
    queueMicrotask(() => child.emit('close', 0));
    return child as ReturnType<typeof spawn>;
  });
  process.argv.push('test-command');
  await env({ supabase: true }, undefined);
  expect(spawn).toHaveBeenCalledWith('test-command', [], expect.objectContaining({ env: expected }));
});

it('passes explicit settings and profile defaults to a wrapped command', async () => {
  const exit = jest.spyOn(process, 'exit').mockImplementation(() => undefined as never);
  process.env = { PGPORT: '6543', PGPASSWORD: '', OTHER: 'preserved' };
  process.argv.push('test-command', 'arg');
  jest.mocked(spawn).mockImplementation(() => {
    const child = new EventEmitter();
    queueMicrotask(() => child.emit('close', 0));
    return child as ReturnType<typeof spawn>;
  });

  await env({}, undefined);

  expect(spawn).toHaveBeenCalledWith('test-command', ['arg'], expect.objectContaining({
    env: {
      PGHOST: 'localhost',
      PGPORT: '6543',
      PGUSER: 'postgres',
      PGPASSWORD: '',
      PGDATABASE: 'postgres',
      OTHER: 'preserved'
    }
  }));
  expect(exit).toHaveBeenCalledWith(0);
});
