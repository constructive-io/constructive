jest.setTimeout(60000);
process.env.PGPM_SKIP_UPDATE_CHECK = 'true';

jest.mock('../src/utils/npm-version', () => ({
  fetchLatestVersion: async (pkgName: string) =>
    pkgName === '@pgpm-testing/base32' ? '1.2.0' : null
}));

import { PgpmPackage } from '@pgpmjs/core';
import * as fs from 'fs';
import * as path from 'path';

import { TestFixture } from '../test-utils';

describe('cmds:upgrade - with initialized workspace and module', () => {
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

  describe('when no modules are installed', () => {
    it('reports no modules installed', async () => {
      await fixture.runCmd({
        _: ['upgrade'],
        cwd: moduleDir,
      });

      // Should complete without error
      const mod = new PgpmPackage(moduleDir);
      const result = mod.getInstalledModules();
      expect(result.installed).toEqual([]);
    });
  });

  describe('when modules are installed at latest version', () => {
    beforeEach(async () => {
      await fixture.runCmd({
        _: ['install', '@pgpm-testing/base32@1.2.0'],
        cwd: moduleDir,
      });
    });

    it('reports modules are up to date', async () => {
      // Default behavior now upgrades all (no --all flag needed)
      await fixture.runCmd({
        _: ['upgrade'],
        cwd: moduleDir,
      });

      const pkgJson = JSON.parse(
        fs.readFileSync(path.join(moduleDir, 'package.json'), 'utf-8')
      );
      expect(pkgJson.dependencies['@pgpm-testing/base32']).toBe('1.2.0');
    });
  });

  describe('when modules need upgrading (1.1.0 -> 1.2.0)', () => {
    beforeEach(async () => {
      await fixture.runCmd({
        _: ['install', '@pgpm-testing/base32@1.1.0'],
        cwd: moduleDir,
      });
    });

    it('dry run does not modify package.json', async () => {
      await fixture.runCmd({
        _: ['upgrade'],
        cwd: moduleDir,
        'dry-run': true,
      });

      const pkgJson = JSON.parse(
        fs.readFileSync(path.join(moduleDir, 'package.json'), 'utf-8')
      );
      expect(pkgJson.dependencies['@pgpm-testing/base32']).toBe('1.1.0');
    });

    it('default behavior upgrades all from 1.1.0 to 1.2.0', async () => {
      let pkgJson = JSON.parse(
        fs.readFileSync(path.join(moduleDir, 'package.json'), 'utf-8')
      );
      expect(pkgJson.dependencies['@pgpm-testing/base32']).toBe('1.1.0');

      // Default behavior now upgrades all (like pnpm upgrade)
      await fixture.runCmd({
        _: ['upgrade'],
        cwd: moduleDir,
      });

      pkgJson = JSON.parse(
        fs.readFileSync(path.join(moduleDir, 'package.json'), 'utf-8')
      );
      expect(pkgJson.dependencies['@pgpm-testing/base32']).toBe('1.2.0');
    });

    it('positional args filter to specific modules', async () => {
      let pkgJson = JSON.parse(
        fs.readFileSync(path.join(moduleDir, 'package.json'), 'utf-8')
      );
      expect(pkgJson.dependencies['@pgpm-testing/base32']).toBe('1.1.0');

      // Positional args now used instead of --modules flag (like pnpm upgrade @pkg/name)
      await fixture.runCmd({
        _: ['upgrade', '@pgpm-testing/base32'],
        cwd: moduleDir,
      });

      pkgJson = JSON.parse(
        fs.readFileSync(path.join(moduleDir, 'package.json'), 'utf-8')
      );
      expect(pkgJson.dependencies['@pgpm-testing/base32']).toBe('1.2.0');
    });

    it('up alias works the same as upgrade', async () => {
      let pkgJson = JSON.parse(
        fs.readFileSync(path.join(moduleDir, 'package.json'), 'utf-8')
      );
      expect(pkgJson.dependencies['@pgpm-testing/base32']).toBe('1.1.0');

      // Test the 'up' alias
      await fixture.runCmd({
        _: ['up'],
        cwd: moduleDir,
      });

      pkgJson = JSON.parse(
        fs.readFileSync(path.join(moduleDir, 'package.json'), 'utf-8')
      );
      expect(pkgJson.dependencies['@pgpm-testing/base32']).toBe('1.2.0');
    });
  });
});
