import fs from 'fs';
import path from 'path';

import { TestFixture } from '../../test-utils';
import upgradeModulesCommand from '../commands/upgrade-modules';

let fixture: TestFixture;
let mod: ReturnType<TestFixture['getModuleProject']>;

const createPrompter = (selectedModules: string[] = []) => ({
  prompt: async (_argv: any, _questions: any) => ({
    selectedModules: selectedModules.map(name => ({ name, selected: true }))
  }),
  close: () => {}
});

beforeEach(() => {
  fixture = new TestFixture('sqitch', 'publish');
  mod = fixture.getModuleProject(['.'], 'totp')!;
});

afterEach(() => {
  fixture.cleanup();
});

describe('upgrade-modules CLI integration', () => {
  describe('when not in a module', () => {
    it('throws error when run outside a module', async () => {
      const nonModulePath = fixture.tempDir;
      
      await expect(
        upgradeModulesCommand(
          { cwd: nonModulePath },
          createPrompter() as any,
          {} as any
        )
      ).rejects.toThrow('You must run this command inside a PGPM module');
    });
  });

  describe('when no modules are installed', () => {
    it('reports no modules installed', async () => {
      const modulePath = mod.getModulePath()!;
      
      await upgradeModulesCommand(
        { cwd: modulePath },
        createPrompter() as any,
        {} as any
      );
    });
  });

  describe('with installed modules at latest version', () => {
    beforeEach(async () => {
      await mod.installModules('@pgpm-testing/base32@1.2.0');
    });

    it('shows modules are up to date when at latest version', async () => {
      const modulePath = mod.getModulePath()!;
      
      await upgradeModulesCommand(
        { cwd: modulePath },
        createPrompter() as any,
        {} as any
      );
      
      const pkgJson = JSON.parse(
        fs.readFileSync(path.join(modulePath, 'package.json'), 'utf-8')
      );
      expect(pkgJson.dependencies['@pgpm-testing/base32']).toBe('1.2.0');
    });
  });

  describe('with installed modules at older version (1.1.0)', () => {
    beforeEach(async () => {
      await mod.installModules('@pgpm-testing/base32@1.1.0');
    });

    it('dry run does not modify package.json', async () => {
      const modulePath = mod.getModulePath()!;
      
      await upgradeModulesCommand(
        { cwd: modulePath, 'dry-run': true },
        createPrompter() as any,
        {} as any
      );
      
      const pkgJson = JSON.parse(
        fs.readFileSync(path.join(modulePath, 'package.json'), 'utf-8')
      );
      expect(pkgJson.dependencies['@pgpm-testing/base32']).toBe('1.1.0');
    });

    it('--all flag upgrades from 1.1.0 to 1.2.0', async () => {
      const modulePath = mod.getModulePath()!;
      
      let pkgJson = JSON.parse(
        fs.readFileSync(path.join(modulePath, 'package.json'), 'utf-8')
      );
      expect(pkgJson.dependencies['@pgpm-testing/base32']).toBe('1.1.0');
      
      await upgradeModulesCommand(
        { cwd: modulePath, all: true },
        createPrompter() as any,
        {} as any
      );
      
      pkgJson = JSON.parse(
        fs.readFileSync(path.join(modulePath, 'package.json'), 'utf-8')
      );
      expect(pkgJson.dependencies['@pgpm-testing/base32']).toBe('1.2.0');
    });

    it('--modules flag filters to specific modules and upgrades to 1.2.0', async () => {
      const modulePath = mod.getModulePath()!;
      
      let pkgJson = JSON.parse(
        fs.readFileSync(path.join(modulePath, 'package.json'), 'utf-8')
      );
      expect(pkgJson.dependencies['@pgpm-testing/base32']).toBe('1.1.0');
      
      await upgradeModulesCommand(
        { cwd: modulePath, modules: '@pgpm-testing/base32', all: true },
        createPrompter() as any,
        {} as any
      );
      
      pkgJson = JSON.parse(
        fs.readFileSync(path.join(modulePath, 'package.json'), 'utf-8')
      );
      expect(pkgJson.dependencies['@pgpm-testing/base32']).toBe('1.2.0');
    });
  });
});
