import { mkdir, mkdtemp, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';

import { deploySite } from '../src/deploy';
import { walkDirectory } from '../src/walk';
import { createMockServer } from './mock-api';

let dir: string;

beforeAll(async () => {
  dir = await mkdtemp(join(tmpdir(), 'site-deploy-'));
  await mkdir(join(dir, 'assets'));
  await mkdir(join(dir, '.well-known'));
  await writeFile(join(dir, 'index.html'), '<h1>home</h1>');
  await writeFile(join(dir, 'assets', 'app.js'), 'console.log(1)');
  await writeFile(join(dir, '.well-known', 'security.txt'), 'contact: x');
});

describe('walkDirectory', () => {
  it('yields POSIX-relative paths, dotfiles included', async () => {
    const paths: string[] = [];
    for await (const file of walkDirectory(dir)) paths.push(file.path);

    expect(paths.sort()).toEqual([
      '.well-known/security.txt',
      'assets/app.js',
      'index.html',
    ]);
  });

  it('does not descend into an ignored directory', async () => {
    const paths: string[] = [];
    for await (const file of walkDirectory(dir, (path) => path === 'assets')) {
      paths.push(file.path);
    }

    expect(paths).not.toContain('assets/app.js');
    expect(paths).toContain('index.html');
  });
});

describe('deploySite from a directory', () => {
  it('deploys a build off disk', async () => {
    const server = createMockServer();
    const result = await deploySite({
      api: server.api,
      putObject: server.putObject,
      siteId: 'site-1',
      databaseId: 'db-1',
      bucketKey: 'site-docs',
      source: dir,
    });

    expect(result.files).toBe(3);
    expect(Object.keys(result.manifest.files).sort()).toEqual([
      '.well-known/security.txt',
      'assets/app.js',
      'index.html',
    ]);
    expect(result.manifest.files['assets/app.js'].content_type).toBe(
      'text/javascript; charset=utf-8',
    );
  });
});
