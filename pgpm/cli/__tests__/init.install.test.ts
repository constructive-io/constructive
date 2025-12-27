jest.setTimeout(60000);
process.env.PGPM_SKIP_UPDATE_CHECK = 'true';

import { PgpmPackage } from '@pgpmjs/core';
import * as fs from 'fs';
import * as glob from 'glob';
import * as path from 'path';

import { TestFixture, normalizePackageJsonForSnapshot } from '../test-utils';

describe('cmds:install - with initialized workspace and module', () => {
  let fixture: TestFixture;
  let workspaceDir: string;
  let moduleDir: string;

  beforeEach(async () => {
    fixture = new TestFixture();

    const workspaceName = 'my-workspace';
    const moduleName = 'my-module';
    workspaceDir = path.join(fixture.tempDir, workspaceName);
    moduleDir = path.join(workspaceDir, 'packages', moduleName);

    // Step 1: Create workspace
    await fixture.runCmd({
      _: ['init', 'workspace'],
      cwd: fixture.tempDir,
      name: workspaceName,
      workspace: true,
    });

    // Step 2: Add module
    await fixture.runCmd({
      _: ['init'],
      cwd: workspaceDir,
      name: moduleName,
      moduleName: moduleName,
      extensions: ['uuid-ossp', 'plpgsql'],
    });
  });

  afterEach(() => {
    fixture.cleanup();
  });

  it('installs a module package', async () => {
    const pkg = '@pgpm-testing/base32';
    const version = '1.0.0';

    await fixture.runCmd({
      _: ['install', `${pkg}@${version}`],
      cwd: moduleDir,
    });

    const pkgJson = JSON.parse(
      fs.readFileSync(path.join(moduleDir, 'package.json'), 'utf-8')
    );
    // Normalize package.json for snapshot, preserving versions for explicitly installed packages
    const normalizedPkgJson = normalizePackageJsonForSnapshot(pkgJson, {
      preserveVersionsFor: ['@pgpm-testing/base32']
    });
    expect(normalizedPkgJson).toMatchSnapshot();

    const installedFiles = glob.sync('**/*', {
      cwd: path.join(workspaceDir, 'extensions'),
      dot: true,
      nodir: true,
      absolute: true,
    });

    const relativeFiles = installedFiles
      .map((f: string) => path.relative(moduleDir, f))
      .sort();

    expect(relativeFiles).toMatchSnapshot();

    // Snapshot control file
    const mod = new PgpmPackage(moduleDir);
    const controlFile = mod.getModuleControlFile();
    expect(controlFile).toMatchSnapshot();
  });

  it('installs two modules', async () => {
    const base32 = {
      name: '@pgpm-testing/base32',
      version: '1.0.0',
    };

    const utils = {
      name: '@pgpm-testing/utils',
      version: '1.0.0',
    };

    const pkgs = [base32, utils];

    for (const { name, version } of pkgs) {
      await fixture.runCmd({
        _: ['install', `${name}@${version}`],
        cwd: moduleDir,
      });
    }

    const pkgJson = JSON.parse(
      fs.readFileSync(path.join(moduleDir, 'package.json'), 'utf-8')
    );
    // Normalize package.json for snapshot, preserving versions for explicitly installed packages
    const normalizedPkgJson = normalizePackageJsonForSnapshot(pkgJson, {
      preserveVersionsFor: ['@pgpm-testing/base32', '@pgpm-testing/utils']
    });
    expect(normalizedPkgJson).toMatchSnapshot();

    const extPath = path.join(workspaceDir, 'extensions');
    const installedFiles = glob.sync('**/*', {
      cwd: extPath,
      dot: true,
      nodir: true,
      absolute: true,
    });

    
    const relativeFiles = installedFiles
    .map((f: string) => path.relative(moduleDir, f))
    .sort();
    
    expect(relativeFiles).toMatchSnapshot();

    // Snapshot control file after both installs
    const mod = new PgpmPackage(moduleDir);
    const controlFile = mod.getModuleControlFile();
    expect(controlFile).toMatchSnapshot();
  });

  it('installs missing modules when called without arguments', async () => {
    // First, update the module's control file to require pgpm-base32
    // This simulates a module that has dependencies listed but not installed
    const mod = new PgpmPackage(moduleDir);
    const currentDeps = mod.getRequiredModules();
    mod.setModuleDependencies([...currentDeps, 'pgpm-base32']);

    // Verify the control file now includes pgpm-base32
    const controlBefore = mod.getModuleControlFile();
    expect(controlBefore).toContain('pgpm-base32');

    // Run install without arguments - should install missing modules
    await fixture.runCmd({
      _: ['install'],
      cwd: moduleDir,
    });

    // Verify the module was installed
    const pkgJson = JSON.parse(
      fs.readFileSync(path.join(moduleDir, 'package.json'), 'utf-8')
    );
    expect(pkgJson.dependencies).toBeDefined();
    expect(pkgJson.dependencies['@pgpm/base32']).toBeDefined();

    // Verify extension files were installed
    const extPath = path.join(workspaceDir, 'extensions', '@pgpm', 'base32');
    expect(fs.existsSync(extPath)).toBe(true);
  });

  it('reports success when all modules are already installed', async () => {
    // Install a module first
    await fixture.runCmd({
      _: ['install', '@pgpm-testing/base32@1.0.0'],
      cwd: moduleDir,
    });

    // Running install without arguments should succeed (no missing modules)
    // This test verifies the command doesn't throw when nothing needs to be installed
    await fixture.runCmd({
      _: ['install'],
      cwd: moduleDir,
    });

    // Verify the module is still installed
    const pkgJson = JSON.parse(
      fs.readFileSync(path.join(moduleDir, 'package.json'), 'utf-8')
    );
    expect(pkgJson.dependencies['@pgpm-testing/base32']).toBe('1.0.0');
  });
});
