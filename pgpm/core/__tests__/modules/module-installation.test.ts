import fs from 'fs';
import * as glob from 'glob';
import path from 'path';

import { PgpmPackage } from '../../src/core/class/pgpm';
import { TestFixture } from '../../test-utils';

let fixture: TestFixture;
let mod: PgpmPackage;

beforeEach(() => {
  fixture = new TestFixture('sqitch', 'publish');
  mod = fixture.getModuleProject(['.'], 'totp')!;
});

afterEach(() => {
  fixture.cleanup();
});

describe('installModule()', () => {
  it('installs a package and updates package.json dependencies', async () => {
    await mod.installModules('@pgpm-testing/base32@1.2.0');

    const extDir = path.join(
            mod.getWorkspacePath()!,
            'extensions/@pgpm-testing/base32'
    );

    const files = glob.sync('**/*', {
      cwd: extDir,
      nodir: true
    });

    expect(files.sort()).toMatchSnapshot();
    expect(fs.existsSync(path.join(extDir, 'pgpm.plan'))).toBe(true);

    const pkgJson = JSON.parse(
      fs.readFileSync(path.join(mod.getModulePath()!, 'package.json'), 'utf-8')
    );

    expect(pkgJson.dependencies).toBeDefined();
    expect(pkgJson.dependencies['@pgpm-testing/base32']).toBe('1.2.0');

    const controlFileContent = mod.getModuleControlFile();

    expect(controlFileContent).toMatchSnapshot();
  });

  it('installs a package with recursive dependencies', async () => {
    await mod.installModules('@pgpm-testing/totp@1.2.0');

    const extDir = path.join(mod.getWorkspacePath()!, 'extensions');
    
    expect(fs.existsSync(path.join(extDir, '@pgpm-testing/totp/pgpm.plan'))).toBe(true);
    expect(fs.existsSync(path.join(extDir, '@pgpm-testing/base32/pgpm.plan'))).toBe(true);
    expect(fs.existsSync(path.join(extDir, '@pgpm-testing/verify/pgpm.plan'))).toBe(true);

    const pkgJson = JSON.parse(
      fs.readFileSync(path.join(mod.getModulePath()!, 'package.json'), 'utf-8')
    );

    expect(pkgJson.dependencies['@pgpm-testing/totp']).toBe('1.2.0');
  });

  it('throws if package.json does not exist in module', async () => {
    fs.rmSync(path.join(mod.getModulePath()!, 'package.json'));
    await expect(
      mod.installModules('@pgpm-testing/base32@1.2.0')
    ).rejects.toThrow(/No package\.json found/);
  });
});

describe('modulesInstalled()', () => {
  it('returns empty arrays when no modules are installed', () => {
    const result = mod.modulesInstalled(['@pgpm-testing/base32', '@pgpm-testing/faker']);
    
    expect(result.installed).toEqual([]);
    expect(result.installedVersions).toEqual({});
  });

  it('returns installed modules after installation', async () => {
    await mod.installModules('@pgpm-testing/base32@1.2.0');
    
    const result = mod.modulesInstalled(['@pgpm-testing/base32', '@pgpm-testing/faker']);
    
    expect(result.installed).toEqual(['@pgpm-testing/base32']);
    expect(result.installedVersions).toEqual({
      '@pgpm-testing/base32': '1.2.0'
    });
  });

  it('returns empty arrays when package.json does not exist', () => {
    fs.rmSync(path.join(mod.getModulePath()!, 'package.json'));
    
    const result = mod.modulesInstalled(['@pgpm-testing/base32']);
    
    expect(result.installed).toEqual([]);
    expect(result.installedVersions).toEqual({});
  });
});

describe('getInstalledModules()', () => {
  it('returns empty arrays when no modules are installed', () => {
    const result = mod.getInstalledModules();
    
    expect(result.installed).toEqual([]);
    expect(result.installedVersions).toEqual({});
  });

  it('returns all installed modules after installation', async () => {
    await mod.installModules('@pgpm-testing/base32@1.2.0');
    
    const result = mod.getInstalledModules();
    
    expect(result.installed).toEqual(['@pgpm-testing/base32']);
    expect(result.installedVersions).toEqual({
      '@pgpm-testing/base32': '1.2.0'
    });
  });

  it('returns empty arrays when package.json does not exist', () => {
    fs.rmSync(path.join(mod.getModulePath()!, 'package.json'));
    
    const result = mod.getInstalledModules();
    
    expect(result.installed).toEqual([]);
    expect(result.installedVersions).toEqual({});
  });
});

describe('upgradeModules()', () => {
  it('returns empty updates when no modules are installed', async () => {
    const result = await mod.upgradeModules();
    
    expect(result.updates).toEqual([]);
    expect(result.affectedModules).toEqual([]);
  });

  it('performs dry run without making changes', async () => {
    await mod.installModules('@pgpm-testing/base32@1.1.0');
    
    const result = await mod.upgradeModules({ dryRun: true });
    
    expect(result.updates.length).toBe(1);
    expect(result.updates[0].name).toBe('@pgpm-testing/base32');
    expect(result.updates[0].oldVersion).toBe('1.1.0');
    expect(result.updates[0].newVersion).toBe('1.2.0');
    expect(result.affectedModules).toEqual([]);
    
    const pkgJson = JSON.parse(
      fs.readFileSync(path.join(mod.getModulePath()!, 'package.json'), 'utf-8')
    );

    expect(pkgJson.dependencies['@pgpm-testing/base32']).toBe('1.1.0');
  });

  it('upgrades modules from 1.1.0 to 1.2.0', async () => {
    await mod.installModules('@pgpm-testing/base32@1.1.0');
    
    let pkgJson = JSON.parse(
      fs.readFileSync(path.join(mod.getModulePath()!, 'package.json'), 'utf-8')
    );

    expect(pkgJson.dependencies['@pgpm-testing/base32']).toBe('1.1.0');
    
    const result = await mod.upgradeModules();
    
    expect(result.updates.length).toBe(1);
    expect(result.updates[0].name).toBe('@pgpm-testing/base32');
    expect(result.updates[0].oldVersion).toBe('1.1.0');
    expect(result.updates[0].newVersion).toBe('1.2.0');
    
    pkgJson = JSON.parse(
      fs.readFileSync(path.join(mod.getModulePath()!, 'package.json'), 'utf-8')
    );
    expect(pkgJson.dependencies['@pgpm-testing/base32']).toBe('1.2.0');
  });

  it('upgrades specific modules when specified', async () => {
    await mod.installModules('@pgpm-testing/base32@1.1.0');
    
    const result = await mod.upgradeModules({ 
      modules: ['@pgpm-testing/base32'],
      dryRun: true 
    });
    
    expect(result.updates.length).toBe(1);
    expect(result.updates[0].name).toBe('@pgpm-testing/base32');
    expect(result.updates[0].oldVersion).toBe('1.1.0');
    expect(result.updates[0].newVersion).toBe('1.2.0');
    expect(result.affectedModules).toEqual([]);
  });

  it('returns empty updates when specified modules are not installed', async () => {
    await mod.installModules('@pgpm-testing/base32@1.1.0');
    
    const result = await mod.upgradeModules({ 
      modules: ['@pgpm-testing/nonexistent'],
      dryRun: true 
    });
    
    expect(result.updates).toEqual([]);
    expect(result.affectedModules).toEqual([]);
  });

  it('reports no updates when already at latest version', async () => {
    await mod.installModules('@pgpm-testing/base32@1.2.0');
    
    const result = await mod.upgradeModules({ dryRun: true });
    
    expect(result.updates).toEqual([]);
    expect(result.affectedModules).toEqual([]);
  });
});
