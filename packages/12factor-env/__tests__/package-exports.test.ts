import { execFileSync } from 'child_process';
import { mkdirSync, mkdtempSync, rmSync, symlinkSync } from 'fs';
import { tmpdir } from 'os';
import { join, resolve } from 'path';

describe('published package exports', () => {
  const packageRoot = resolve(__dirname, '..');
  const distRoot = join(packageRoot, 'dist');
  let fixtureRoot: string;

  beforeAll(() => {
    execFileSync(
      process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm',
      ['run', 'build'],
      { cwd: packageRoot, stdio: 'pipe' }
    );

    fixtureRoot = mkdtempSync(join(tmpdir(), '12factor-env-exports-'));
    const nodeModules = join(fixtureRoot, 'node_modules');
    mkdirSync(nodeModules);
    symlinkSync(
      distRoot,
      join(nodeModules, '12factor-env'),
      process.platform === 'win32' ? 'junction' : 'dir'
    );
  });

  afterAll(() => {
    rmSync(fixtureRoot, { recursive: true, force: true });
  });

  it('loads the root and parser entries through CommonJS', () => {
    execFileSync(
      process.execPath,
      [
        '-e',
        [
          "const root = require('12factor-env');",
          "const parsers = require('12factor-env/parsers');",
          "if (typeof root.env !== 'function') process.exit(1);",
          "if (parsers.parseEnvBoolean('YES') !== true) process.exit(1);",
          "require.resolve('12factor-env/index.js');",
          "require.resolve('12factor-env/esm/index.js');",
        ].join('\n'),
      ],
      { cwd: fixtureRoot, stdio: 'pipe' }
    );
  });

  it('loads the root and parser entries through native ESM', () => {
    execFileSync(
      process.execPath,
      [
        '--input-type=module',
        '-e',
        [
          "import { env } from '12factor-env';",
          "import { parseEnvStringArray } from '12factor-env/parsers';",
          "if (typeof env !== 'function') process.exit(1);",
          "if (parseEnvStringArray('a, b').join(':') !== 'a:b') process.exit(1);",
        ].join('\n'),
      ],
      { cwd: fixtureRoot, stdio: 'pipe' }
    );
  });
});
