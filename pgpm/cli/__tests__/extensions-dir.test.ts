jest.setTimeout(120000);
process.env.PGPM_SKIP_UPDATE_CHECK = 'true';

import { PgpmPackage } from '@pgpmjs/core';
import * as fs from 'fs';
import * as path from 'path';
import { teardownPgPools } from 'pg-cache';

import { CLIDeployTestFixture, TestFixture } from '../test-utils';

const TEST_PKG = '@pgpm-testing/base32@1.0.0';
const TEST_PKG_NAME = '@pgpm-testing/base32';

const writeWorkspaceConfig = (workspaceDir: string, extra: Record<string, unknown>) => {
  const configPath = path.join(workspaceDir, 'pgpm.json');
  const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  fs.writeFileSync(configPath, JSON.stringify({ ...config, ...extra }, null, 2));
};

describe('configurable extensions directory', () => {
  let fixture: TestFixture;
  let workspaceDir: string;
  let moduleDir: string;

  beforeEach(async () => {
    fixture = new TestFixture();

    workspaceDir = path.join(fixture.tempDir, 'my-workspace');
    moduleDir = path.join(workspaceDir, 'packages', 'my-module');

    await fixture.runCmd({
      _: ['init', 'workspace'],
      cwd: fixture.tempDir,
      name: 'my-workspace',
      workspace: true
    });

    await fixture.runCmd({
      _: ['init'],
      cwd: workspaceDir,
      name: 'my-module',
      moduleName: 'my-module',
      extensions: ['plpgsql']
    });
  });

  afterEach(() => {
    delete process.env.PGPM_EXTENSIONS_DIR;
    fixture.cleanup();
  });

  it('defaults to extensions/', () => {
    expect(new PgpmPackage(workspaceDir).extensionsDir).toBe('extensions');
    expect(new PgpmPackage(workspaceDir).getExtensionsPath()).toBe(
      path.join(workspaceDir, 'extensions')
    );
  });

  it('reads extensionsDir from the workspace pgpm.json', () => {
    writeWorkspaceConfig(workspaceDir, { extensionsDir: 'extensions-test' });

    expect(new PgpmPackage(workspaceDir).extensionsDir).toBe('extensions-test');
    expect(new PgpmPackage(moduleDir).extensionsDir).toBe('extensions-test');
  });

  it('lets PGPM_EXTENSIONS_DIR override the config file, and the option override both', () => {
    writeWorkspaceConfig(workspaceDir, { extensionsDir: 'extensions-config' });
    process.env.PGPM_EXTENSIONS_DIR = 'extensions-env';

    expect(new PgpmPackage(workspaceDir).extensionsDir).toBe('extensions-env');
    expect(
      new PgpmPackage(workspaceDir, { extensionsDir: 'extensions-option' }).extensionsDir
    ).toBe('extensions-option');
  });

  it('installs into the configured dir and scans it for installed modules', async () => {
    writeWorkspaceConfig(workspaceDir, { extensionsDir: 'extensions-test' });

    await fixture.runCmd({
      _: ['install', TEST_PKG],
      cwd: moduleDir
    });

    const configuredDir = path.join(workspaceDir, 'extensions-test', TEST_PKG_NAME);
    expect(fs.existsSync(configuredDir)).toBe(true);
    expect(fs.existsSync(path.join(workspaceDir, 'extensions'))).toBe(false);

    const project = new PgpmPackage(workspaceDir);
    expect(project.getWorkspaceInstalledModules()).toContain(TEST_PKG_NAME);
    expect(Object.keys(project.getModuleMap())).toContain('launchql-base32');

    const mod = new PgpmPackage(moduleDir);
    expect(mod.getInstalledModules().installed).toContain(TEST_PKG_NAME);
  });

  it('honors the --extensions-dir CLI flag', async () => {
    await fixture.runCmd({
      _: ['install', TEST_PKG],
      cwd: moduleDir,
      'extensions-dir': 'extensions-flag'
    });

    expect(
      fs.existsSync(path.join(workspaceDir, 'extensions-flag', TEST_PKG_NAME))
    ).toBe(true);
    expect(fs.existsSync(path.join(workspaceDir, 'extensions'))).toBe(false);
  });
});

describe('deploy honors the configured extensions directory', () => {
  let fixture: CLIDeployTestFixture;
  let testDb: any;

  beforeAll(async () => {
    fixture = new CLIDeployTestFixture('sqitch', 'simple-w-exts');

    // Move the workspace modules out of `extensions/` into `extensions-test/`
    // and drop the `extensions/*` package globs, so the modules are only
    // discoverable through the configured extensions directory.
    const wsDir = fixture.tempFixtureDir;
    fs.renameSync(path.join(wsDir, 'extensions'), path.join(wsDir, 'extensions-test'));
    fs.writeFileSync(
      path.join(wsDir, 'pgpm.json'),
      JSON.stringify({ packages: ['packages/*'], extensionsDir: 'extensions-test' }, null, 2)
    );

    testDb = await fixture.setupTestDatabase();
  });

  afterAll(async () => {
    await fixture.cleanup();
    await teardownPgPools();
  });

  it('resolves workspace extensions from the configured dir when deploying', async () => {
    const project = new PgpmPackage(fixture.tempFixtureDir);
    expect(project.extensionsDir).toBe('extensions-test');
    expect(Object.keys(project.getModuleMap())).toEqual(
      expect.arrayContaining(['sample-unique-names', 'pgpm-base32'])
    );

    const results = await fixture.exec(
      `pgpm deploy --database ${testDb.name} --yes --usePlan --package sample-unique-names`,
      { database: testDb.name }
    );

    expect(results).toHaveLength(1);
    expect(await testDb.exists('schema', 'base32')).toBe(true);
  });
});
