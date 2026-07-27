import fs from 'fs';
import { sync as globSync } from 'glob';
import os from 'os';
import path from 'path';

import { PgpmPackage } from '../../src/core/class/pgpm';
import { globPattern, toPosixPath } from '../../src/utils/glob';

const writeModule = (workspace: string, name: string) => {
  const moduleDir = path.join(workspace, 'packages', name);
  fs.mkdirSync(path.join(moduleDir, 'deploy'), { recursive: true });
  fs.writeFileSync(
    path.join(moduleDir, `${name}.control`),
    `comment = '${name}'\ndefault_version = '0.0.1'\n`
  );
  fs.writeFileSync(
    path.join(moduleDir, 'pgpm.plan'),
    `%syntax-version=1.0.0\n%project=${name}\n\n`
  );
  fs.writeFileSync(
    path.join(moduleDir, 'package.json'),
    JSON.stringify({ name, version: '0.0.1' }, null, 2)
  );
  return moduleDir;
};

describe('glob pattern building', () => {
  it('never emits backslashes, which glob treats as escapes', () => {
    expect(globPattern('C:\\Users\\dev\\workspace', 'packages/*')).toBe(
      'C:/Users/dev/workspace/packages/*'
    );
    expect(toPosixPath('packages\\my-module')).toBe('packages/my-module');
  });

  it('documents that a backslash pattern matches nothing', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pgpm-glob-'));
    fs.mkdirSync(path.join(dir, 'packages', 'mod'), { recursive: true });

    const escaped = `${toPosixPath(dir)}\\packages\\*`;
    expect(globSync(escaped)).toEqual([]);
    expect(globSync(globPattern(dir, 'packages/*'))).toHaveLength(1);

    fs.rmSync(dir, { recursive: true, force: true });
  });
});

describe('workspace module discovery', () => {
  let workspace: string;

  beforeAll(() => {
    workspace = fs.mkdtempSync(path.join(os.tmpdir(), 'pgpm-workspace-'));
    fs.writeFileSync(
      path.join(workspace, 'pgpm.json'),
      JSON.stringify({ packages: ['packages/*'] }, null, 2)
    );
    writeModule(workspace, 'alpha');
    writeModule(workspace, 'beta');
  });

  afterAll(() => {
    fs.rmSync(workspace, { recursive: true, force: true });
  });

  it('discovers modules from a native workspace path', () => {
    const pkg = new PgpmPackage(workspace);
    expect(pkg.allowedDirs).toHaveLength(2);
    expect(Object.keys(pkg.listModules()).sort()).toEqual(['alpha', 'beta']);
  });

  it('discovers modules from a nested module cwd', () => {
    const pkg = new PgpmPackage(path.join(workspace, 'packages', 'alpha'));
    expect(Object.keys(pkg.listModules()).sort()).toEqual(['alpha', 'beta']);
  });
});
