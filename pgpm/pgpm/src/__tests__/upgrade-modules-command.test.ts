import fs from 'fs';
import path from 'path';

import { TestFixture } from '../../../core/test-utils';
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

  describe('with installed modules', () => {
    beforeEach(async () => {
      await mod.installModules('@pgpm-testing/base32@1.0.0');
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
      expect(pkgJson.dependencies['@pgpm-testing/base32']).toBe('1.0.0');
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
      expect(pkgJson.dependencies['@pgpm-testing/base32']).toBe('1.0.0');
    });

    it('--all flag upgrades all modules without prompting', async () => {
      const modulePath = mod.getModulePath()!;
      
      await upgradeModulesCommand(
        { cwd: modulePath, all: true },
        createPrompter() as any,
        {} as any
      );
      
      const pkgJson = JSON.parse(
        fs.readFileSync(path.join(modulePath, 'package.json'), 'utf-8')
      );
      expect(pkgJson.dependencies['@pgpm-testing/base32']).toBeDefined();
    });

    it('--modules flag filters to specific modules', async () => {
      const modulePath = mod.getModulePath()!;
      
      await upgradeModulesCommand(
        { cwd: modulePath, modules: '@pgpm-testing/base32', all: true },
        createPrompter() as any,
        {} as any
      );
      
      const pkgJson = JSON.parse(
        fs.readFileSync(path.join(modulePath, 'package.json'), 'utf-8')
      );
      expect(pkgJson.dependencies['@pgpm-testing/base32']).toBeDefined();
    });
  });
});
