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
    await mod.installModules('@pgpm/base32@0.15.1');

    const extDir = path.join(
            mod.getWorkspacePath()!,
            'extensions/@pgpm/base32'
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
    expect(pkgJson.dependencies['@pgpm/base32']).toBe('0.15.1');

    const controlFileContent = mod.getModuleControlFile();
    expect(controlFileContent).toMatchSnapshot();
  });

  it('throws if package.json does not exist in module', async () => {
    fs.rmSync(path.join(mod.getModulePath()!, 'package.json'));
    await expect(
      mod.installModules('@pgpm/base32@0.15.1')
    ).rejects.toThrow(/No package\.json found/);
  });
});
