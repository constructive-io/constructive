const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const test = require('node:test');

const {
  changedPublicPackages,
  registryHasPackage,
  waitForPublishedPackages,
} = require('./wait-for-npm-packages.cjs');

function git(cwd, ...args) {
  return execFileSync('git', args, { cwd, encoding: 'utf8' }).trim();
}

test('finds changed public package versions and skips private workspaces', t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'npm-release-gate-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  git(root, 'init', '-b', 'main');
  git(root, 'config', 'user.name', 'Release Gate Test');
  git(root, 'config', 'user.email', 'release-gate@example.com');

  fs.mkdirSync(path.join(root, 'packages', 'public'), { recursive: true });
  fs.mkdirSync(path.join(root, 'packages', 'private'), { recursive: true });
  fs.writeFileSync(
    path.join(root, 'packages', 'public', 'package.json'),
    JSON.stringify({ name: 'public-package', version: '1.0.0' }),
  );
  fs.writeFileSync(
    path.join(root, 'packages', 'private', 'package.json'),
    JSON.stringify({ name: 'private-package', version: '1.0.0', private: true }),
  );
  git(root, 'add', 'packages');
  git(root, 'commit', '-m', 'initial packages');
  const before = git(root, 'rev-parse', 'HEAD');

  fs.writeFileSync(
    path.join(root, 'packages', 'public', 'package.json'),
    JSON.stringify({ name: 'public-package', version: '1.1.0' }),
  );
  fs.writeFileSync(
    path.join(root, 'packages', 'private', 'package.json'),
    JSON.stringify({ name: 'private-package', version: '1.1.0', private: true }),
  );
  git(root, 'add', 'packages');
  git(root, 'commit', '-m', 'release packages');
  const after = git(root, 'rev-parse', 'HEAD');

  assert.deepEqual(changedPublicPackages(before, after, root), [
    { name: 'public-package', version: '1.1.0' },
  ]);
});

test('waits until every package in a release is visible', async () => {
  const attempts = new Map();
  const sleeps = [];
  const packages = [
    { name: '@constructive-io/graphql-server', version: '5.35.1' },
    { name: 'graphile-function-source', version: '0.3.3' },
  ];

  await waitForPublishedPackages(packages, {
    attempts: 3,
    delayMs: 25,
    isPublished: async pkg => {
      const count = (attempts.get(pkg.name) || 0) + 1;
      attempts.set(pkg.name, count);
      return pkg.name === '@constructive-io/graphql-server' || count >= 2;
    },
    sleep: async delay => { sleeps.push(delay); },
  });

  assert.deepEqual(Object.fromEntries(attempts), {
    '@constructive-io/graphql-server': 1,
    'graphile-function-source': 2,
  });
  assert.deepEqual(sleeps, [25]);
});

test('fails with the unpublished package list after the retry budget', async () => {
  await assert.rejects(
    waitForPublishedPackages(
      [{ name: 'graphile-function-source', version: '0.3.3' }],
      {
        attempts: 2,
        delayMs: 0,
        isPublished: async () => false,
        sleep: async () => {},
      },
    ),
    /graphile-function-source@0\.3\.3/,
  );
});

test('checks the exact encoded package version without accepting cached metadata', async () => {
  const requests = [];
  const found = await registryHasPackage(
    { name: '@constructive-io/graphql-server', version: '5.35.1' },
    {
      registry: 'https://registry.example.test/',
      fetchImpl: async (url, options) => {
        requests.push({ url, options });
        return { ok: true, status: 200 };
      },
    },
  );

  assert.equal(found, true);
  assert.equal(
    requests[0].url,
    'https://registry.example.test/%40constructive-io%2Fgraphql-server/5.35.1',
  );
  assert.equal(requests[0].options.headers['cache-control'], 'no-cache');
});
