import assert from 'node:assert/strict';

import {
  collectRegistryClosure,
  hashRegistryItems,
  hashTemplateFiles,
  snapshotDirName,
} from '../../src/pipeline/snapshot-key';

const item = (name: string, deps: string[] = [], extra = '') =>
  JSON.stringify({ name, registryDependencies: deps, files: [{ content: extra }] });

test('the registry hash ignores fetch order but changes with any item body', () => {
  const a = { name: 'resource-kit', body: item('resource-kit') };
  const b = { name: 'workspace-kit', body: item('workspace-kit') };
  assert.equal(hashRegistryItems([a, b]), hashRegistryItems([b, a]));

  const edited = { name: 'workspace-kit', body: item('workspace-kit', [], 'v2') };
  assert.notEqual(hashRegistryItems([a, b]), hashRegistryItems([a, edited]));
});

test('two items cannot run together into the same hash input', () => {
  const split = [
    { name: 'a', body: 'xy' },
    { name: 'b', body: 'z' },
  ];
  const shifted = [
    { name: 'a', body: 'x' },
    { name: 'b', body: 'yz' },
  ];
  assert.notEqual(hashRegistryItems(split), hashRegistryItems(shifted));
});

test('the template hash follows content and paths, not listing order', () => {
  const files = [
    { path: 'nextjs/app/template.json', content: '{"name":"nextjs-app"}' },
    { path: 'shared/gen/cli.ts', content: 'export {}' },
  ];
  const sha = hashTemplateFiles(files);
  assert.equal(sha, hashTemplateFiles([...files].reverse()));
  assert.notEqual(
    sha,
    hashTemplateFiles([files[0], { path: 'shared/gen/cli.ts', content: 'export {};' }]),
  );
  assert.equal(snapshotDirName(sha, 'abcdef0123456789'), `${sha.slice(0, 8)}-abcdef01`);
});

test('the closure follows @constructive dependencies once each and skips other registries', async () => {
  const bodies: Record<string, string> = {
    'resource-kit': item('resource-kit', ['@constructive/workspace-kit', '@constructive/cn']),
    'workspace-kit': item('workspace-kit', ['@constructive/cn', 'https://example.com/r/x.json']),
    cn: item('cn'),
    'auth-pages': item('auth-pages', ['@other/button']),
  };
  const fetched: string[] = [];
  const items = await collectRegistryClosure(['resource-kit', 'auth-pages'], async (name) => {
    fetched.push(name);
    const body = bodies[name];
    if (!body) throw new Error(`unexpected fetch ${name}`);
    return body;
  });

  assert.deepEqual(items.map((i) => i.name).sort(), [
    'auth-pages',
    'cn',
    'resource-kit',
    'workspace-kit',
  ]);
  assert.deepEqual([...fetched].sort(), ['auth-pages', 'cn', 'resource-kit', 'workspace-kit']);
});

test('a code change in a dependency the template does not list changes the snapshot key', async () => {
  const keyFor = async (cnCode: string) => {
    const bodies: Record<string, string> = {
      'resource-kit': item('resource-kit', ['@constructive/cn']),
      cn: item('cn', [], cnCode),
    };
    const items = await collectRegistryClosure(['resource-kit'], async (name) => bodies[name]);
    return snapshotDirName('0123456789abcdef', hashRegistryItems(items));
  };

  assert.equal(await keyFor('export const cn = 1;'), await keyFor('export const cn = 1;'));
  assert.notEqual(await keyFor('export const cn = 1;'), await keyFor('export const cn = 2;'));
});
