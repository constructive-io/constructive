import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const packageRoot = resolve(__dirname, '..');

describe('built CNC entrypoints', () => {
  const cjsRuntime = resolve(packageRoot, 'dist/runtime/index.js');
  const esmRuntime = pathToFileURL(
    resolve(packageRoot, 'dist/esm/runtime/index.js')
  ).href;
  it.each([
    ['CommonJS', resolve(packageRoot, 'dist/index.js')],
    ['ESM', resolve(packageRoot, 'dist/esm/index.js')],
  ])('%s emits the same clean agent protocol', (_kind, entrypoint) => {
    expect(existsSync(entrypoint)).toBe(true);
    const child = spawnSync(
      process.execPath,
      [entrypoint, 'version', '--agent'],
      {
        cwd: packageRoot,
        env: { ...process.env, CI: 'true' },
        encoding: 'utf8',
      }
    );

    expect(child.status).toBe(0);
    expect(child.stderr).toBe('');
    const events = child.stdout
      .trim()
      .split('\n')
      .map((line) => JSON.parse(line));
    expect(events.map(({ event }) => event)).toEqual([
      'operation.started',
      'operation.completed',
    ]);
    expect(events.at(-1)).toMatchObject({
      protocolVersion: 'constructive.dev/cli/v1',
      commandId: 'discovery.version',
      result: {
        data: { protocolVersion: 'constructive.dev/cli/v1' },
      },
    });
  });

  it.each([
    [
      'CommonJS runtime export',
      [
        '-e',
        `const runtime = require(${JSON.stringify(cjsRuntime)}); if (typeof runtime.createCncRegistryForEnvironment !== 'function' || typeof runtime.ConfigStore !== 'function') process.exit(1); runtime.createCncRegistryForEnvironment({ version: 'test', env: {}, configDir: process.cwd() });`,
      ],
    ],
    [
      'ESM runtime export',
      [
        '--input-type=module',
        '-e',
        `const runtime = await import(${JSON.stringify(esmRuntime)}); if (typeof runtime.createCncRegistryForEnvironment !== 'function' || typeof runtime.ConfigStore !== 'function') process.exit(1); runtime.createCncRegistryForEnvironment({ version: 'test', env: {}, configDir: process.cwd() });`,
      ],
    ],
  ])('%s is a silent reusable package API', (_kind, args) => {
    const child = spawnSync(process.execPath, args, {
      cwd: packageRoot,
      env: { ...process.env, CI: 'true' },
      encoding: 'utf8',
    });

    expect(child.status).toBe(0);
    expect(child.stdout).toBe('');
    expect(child.stderr).toBe('');
  });
});
