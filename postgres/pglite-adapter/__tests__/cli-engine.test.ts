import { PGlite } from '@electric-sql/pglite';
import { spawnSync } from 'child_process';
import { cpSync, existsSync, mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join, resolve } from 'path';

/**
 * End-to-end proof that the pgpm CLI deploys through this driver plugin with no
 * PostgreSQL server anywhere: `pgpm deploy --engine pglite` (and the `engine`
 * key of pgpm.json) resolves the plugin, activates it, and the unmodified
 * migration engine writes into the in-process PGlite instance.
 */

const FIXTURE_MODULE = join(__dirname, 'fixtures', 'module');
const MODULE_NAME = 'pglite-adapter-fixture';
const ADAPTER_DIST = resolve(__dirname, '..', 'dist');
const CLI_ENTRY = require.resolve('pgpm');

// Point the default (server) path at a port nothing listens on: any deployment
// that fell through to node-`pg` would fail with ECONNREFUSED instead of passing.
const NO_SERVER_ENV = {
  ...process.env,
  PGHOST: '127.0.0.1',
  PGPORT: '1',
  PGPM_SKIP_UPDATE_CHECK: '1',
};

let workspace: string;

const runCli = (args: string[]) =>
  spawnSync('node', [CLI_ENTRY, ...args, '--no-tty', '--cwd', workspace], {
    env: NO_SERVER_ENV,
    encoding: 'utf8',
  });

const deployArgs = ['deploy', '--database', 'anything', '--package', MODULE_NAME, '--yes'];

const makeWorkspace = (pgpmJson: Record<string, unknown>): string => {
  const dir = mkdtempSync(join(tmpdir(), 'pgpm-engine-'));
  const moduleDir = join(dir, 'packages', MODULE_NAME);
  mkdirSync(moduleDir, { recursive: true });
  cpSync(FIXTURE_MODULE, moduleDir, { recursive: true });
  writeFileSync(
    join(moduleDir, 'package.json'),
    JSON.stringify({ name: MODULE_NAME, version: '0.0.1' })
  );
  writeFileSync(
    join(moduleDir, `${MODULE_NAME}.control`),
    [
      `# ${MODULE_NAME} extension`,
      `comment = '${MODULE_NAME} extension'`,
      "default_version = '0.0.1'",
      'relocatable = false',
      'superuser = false',
      ''
    ].join('\n')
  );
  writeFileSync(join(dir, 'pgpm.json'), JSON.stringify({ packages: ['packages/*'], ...pgpmJson }));

  // The driver loader resolves the plugin from the consumer project, so the
  // workspace must be able to require it by package name.
  mkdirSync(join(dir, 'node_modules', '@pgpmjs'), { recursive: true });
  symlinkSync(ADAPTER_DIST, join(dir, 'node_modules', '@pgpmjs', 'pglite-adapter'), 'dir');
  return dir;
};

const deployedChanges = async (dataDir: string): Promise<string[]> => {
  const db = await PGlite.create({ dataDir });
  try {
    const { rows } = await db.query<{ change_name: string }>(
      'SELECT change_name FROM pgpm_migrate.changes ORDER BY change_name'
    );
    const tables = await db.query(
      "SELECT 1 FROM information_schema.tables WHERE table_schema = 'test_app' AND table_name = 'users'"
    );
    expect(tables.rows).toHaveLength(1);
    return rows.map((row) => row.change_name);
  } finally {
    await db.close();
  }
};

beforeAll(() => {
  if (!existsSync(join(ADAPTER_DIST, 'index.js'))) {
    throw new Error(`Build @pgpmjs/pglite-adapter first: ${ADAPTER_DIST} is missing`);
  }
});

afterEach(() => {
  rmSync(workspace, { recursive: true, force: true });
});

describe('pgpm CLI deploys through the pglite engine with no server', () => {
  it('deploys with --engine pglite', () => {
    workspace = makeWorkspace({});
    const { status, stdout, stderr } = runCli([...deployArgs, '--engine', 'pglite']);
    expect(`${stdout}${stderr}`).not.toMatch(/ECONNREFUSED/);
    expect(stdout).toMatch(/Successfully deployed: index/);
    expect(status).toBe(0);
  }, 120000);

  it('deploys with --pglite=<dataDir> and persists to that directory', async () => {
    workspace = makeWorkspace({});
    const dataDir = join(workspace, '.pglite');
    const { status, stdout } = runCli([...deployArgs, `--pglite=${dataDir}`]);
    expect(status).toBe(0);
    expect(stdout).toMatch(/Deployment complete/);
    expect(await deployedChanges(dataDir)).toEqual(['index', 'schema', 'table']);
  }, 120000);

  it('reads the engine and its dataDir from pgpm.json', async () => {
    workspace = makeWorkspace({ engine: 'pglite' });
    const dataDir = join(workspace, 'configured.pglite');
    // Declaring only options keeps the built-in plugin for the engine.
    writeFileSync(
      join(workspace, 'pgpm.json'),
      JSON.stringify({
        packages: ['packages/*'],
        engine: 'pglite',
        engines: { pglite: { options: { dataDir } } },
      })
    );
    const { status, stdout } = runCli(deployArgs);
    expect(status).toBe(0);
    expect(stdout).toMatch(/Deployment complete/);
    expect(await deployedChanges(dataDir)).toEqual(['index', 'schema', 'table']);
  }, 120000);

  it('verifies a previously deployed persisted instance', () => {
    workspace = makeWorkspace({ engine: 'pglite' });
    const dataDir = join(workspace, '.pglite');
    expect(runCli([...deployArgs, `--pglite=${dataDir}`]).status).toBe(0);

    const { status, stdout } = runCli([
      'verify',
      '--database',
      'anything',
      '--package',
      MODULE_NAME,
      '--yes',
      `--pglite=${dataDir}`,
    ]);
    expect(status).toBe(0);
    expect(stdout).toMatch(/Successfully verified: table/);
  }, 180000);

  it('refuses server-only commands on the pglite engine', () => {
    workspace = makeWorkspace({ engine: 'pglite' });
    const dump = runCli(['dump']);
    expect(`${dump.stdout}${dump.stderr}`).toMatch(
      /pgpm dump is not supported by the "pglite" engine/
    );
    const docker = runCli(['docker', 'start']);
    expect(`${docker.stdout}${docker.stderr}`).toMatch(
      /pgpm docker is not supported by the "pglite" engine/
    );
  }, 120000);

  it('leaves the default pg engine on the server path', () => {
    workspace = makeWorkspace({});
    const { stdout, stderr } = runCli(deployArgs);
    expect(`${stdout}${stderr}`).toMatch(/ECONNREFUSED/);
  }, 120000);
});
