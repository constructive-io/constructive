import fs from 'fs';
import path from 'path';

import { PgpmPackage } from '../../src';
import { getModuleVersionStatus } from '../../src/packaging/sync-versions';
import { TestFixture } from '../../test-utils';

let fixture: TestFixture;

beforeEach(() => {
  fixture = new TestFixture('sqitch', 'constructive');
});

afterEach(() => {
  fixture.cleanup();
});

const modulePath = (name: string) => fixture.fixturePath('packages', name);

const skewModule = (name: string, version: string) => {
  const pkgPath = path.join(modulePath(name), 'package.json');
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
  pkg.version = version;
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2));
};

describe('syncVersions', () => {
  it('is a no-op when all modules are already in sync', async () => {
    const workspace = new PgpmPackage(fixture.tempFixtureDir);
    const result = await workspace.syncVersions();

    expect(result.synced).toHaveLength(0);
    expect(result.skewed).toHaveLength(0);
    expect(result.ok.length).toBeGreaterThan(0);
    expect(result.ok.every(s => s.inSync)).toBe(true);
  });

  it('syncs a skewed module: control, Makefile, and sql filename', async () => {
    skewModule('totp', '1.2.3');

    const workspace = new PgpmPackage(fixture.tempFixtureDir);
    const result = await workspace.syncVersions();

    expect(result.synced.map(s => s.name)).toEqual(['totp']);

    const dir = modulePath('totp');
    const control = fs.readFileSync(path.join(dir, 'totp.control'), 'utf-8');
    expect(control).toContain(`default_version = '1.2.3'`);

    const makefile = fs.readFileSync(path.join(dir, 'Makefile'), 'utf-8');
    expect(makefile).toContain('sql/totp--1.2.3.sql');
    expect(makefile).not.toContain('sql/totp--0.0.1.sql');

    expect(fs.existsSync(path.join(dir, 'sql', 'totp--1.2.3.sql'))).toBe(true);
    expect(fs.existsSync(path.join(dir, 'sql', 'totp--0.0.1.sql'))).toBe(false);

    expect(getModuleVersionStatus(dir).inSync).toBe(true);
  });

  it('reports skew without writing in check mode', async () => {
    skewModule('totp', '9.9.9');

    const dir = modulePath('totp');
    const controlBefore = fs.readFileSync(path.join(dir, 'totp.control'), 'utf-8');

    const workspace = new PgpmPackage(fixture.tempFixtureDir);
    const result = await workspace.syncVersions({ check: true });

    expect(result.synced).toHaveLength(0);
    expect(result.skewed.map(s => s.name)).toEqual(['totp']);
    expect(result.skewed[0].packageVersion).toBe('9.9.9');
    expect(result.skewed[0].controlVersion).toBe('0.0.1');

    expect(fs.readFileSync(path.join(dir, 'totp.control'), 'utf-8')).toBe(controlBefore);
    expect(fs.existsSync(path.join(dir, 'sql', 'totp--9.9.9.sql'))).toBe(false);
  });

  it('passes check mode when everything is in sync', async () => {
    const workspace = new PgpmPackage(fixture.tempFixtureDir);
    const result = await workspace.syncVersions({ check: true });

    expect(result.skewed).toHaveLength(0);
    expect(result.ok.length).toBeGreaterThan(0);
  });

  it('syncs only the current module when run inside a module', async () => {
    skewModule('totp', '2.0.0');
    skewModule('secrets', '2.0.0');

    const project = new PgpmPackage(modulePath('totp'));
    const result = await project.syncVersions();

    expect(result.synced.map(s => s.name)).toEqual(['totp']);

    const secretsControl = fs.readFileSync(
      path.join(modulePath('secrets'), 'secrets.control'),
      'utf-8'
    );
    expect(secretsControl).toContain(`default_version = '0.0.1'`);
  });
});
