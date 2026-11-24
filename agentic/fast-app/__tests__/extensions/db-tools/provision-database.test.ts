// Tests for provision_database pure helpers. Run with:
//   pnpm test -- __tests__/extensions/db-tools/provision-database.test.ts
//
// The desktop's test of its site hosting overlay stays with the desktop: the
// overlay is the desktop host's provisioning config, not part of this package.

import assert from 'node:assert/strict';

import {
  archiveBindingKeys,
  mergeEnv,
  PROVISION_ENV_KEYS,
  provisionEnvVars,
} from '@agentic-kit/db-tools/provision-database/env-file';
import { selectProvisionRequest } from '@agentic-kit/db-tools/provision-database/preset-match';
import { resolveProvisionModules } from '@agentic-kit/db-tools/provision-database/resolve';

test('mergeEnv appends new keys to an empty file', () => {
  const out = mergeEnv('', { DATABASE_ID: 'db1', ACCESS_TOKEN: 'tok' });
  assert.equal(out, 'DATABASE_ID=db1\nACCESS_TOKEN=tok\n');
});

test('mergeEnv replaces an existing key in place, preserving others', () => {
  const existing = 'FOO=bar\nDATABASE_ID=old\nBAZ=qux';
  const out = mergeEnv(existing, { DATABASE_ID: 'new' });
  assert.equal(out, 'FOO=bar\nDATABASE_ID=new\nBAZ=qux\n');
});

test('mergeEnv only replaces the whole-line key (anchored), not substrings', () => {
  const existing = 'MY_DATABASE_ID=keep\nDATABASE_ID=old';
  const out = mergeEnv(existing, { DATABASE_ID: 'new' });
  assert.ok(out.includes('MY_DATABASE_ID=keep'), 'unrelated key preserved');
  assert.ok(out.includes('DATABASE_ID=new'), 'target key replaced');
});

test('mergeEnv terminates with exactly one trailing newline', () => {
  const out = mergeEnv('A=1\n\n', { B: '2' });
  assert.ok(out.endsWith('\n'));
  assert.ok(!out.endsWith('\n\n'));
});

test('provisionEnvVars maps every provision key including endpoint pins', () => {
  const vars = provisionEnvVars({
    databaseId: 'id',
    databaseName: 'myapp',
    ownerId: 'owner',
    accessToken: 'tok',
    apiEndpoint: 'https://api.launchql.dev/graphql',
    modulesEndpoint: 'https://modules.launchql.dev/graphql',
  });
  assert.deepEqual(vars, {
    DATABASE_ID: 'id',
    DATABASE_NAME: 'myapp',
    OWNER_ID: 'owner',
    ACCESS_TOKEN: 'tok',
    PGDATABASE: 'myapp',
    API_ENDPOINT: 'https://api.launchql.dev/graphql',
    MODULES_ENDPOINT: 'https://modules.launchql.dev/graphql',
  });
  assert.deepEqual(Object.keys(vars).sort(), [...PROVISION_ENV_KEYS].sort());
});

test('archiveBindingKeys comments out targeted keys in place', () => {
  const existing = 'FOO=bar\nDATABASE_ID=old-id\nACCESS_TOKEN=old-tok\nBAZ=qux';
  const out = archiveBindingKeys(existing, ['DATABASE_ID', 'ACCESS_TOKEN'], '2026-07-06');
  assert.equal(
    out,
    'FOO=bar\n# archived 2026-07-06: DATABASE_ID=old-id\n# archived 2026-07-06: ACCESS_TOKEN=old-tok\nBAZ=qux',
  );
});

test('archiveBindingKeys leaves comments and prior archives untouched', () => {
  const existing = [
    '# hand-written note',
    '# archived 2026-01-01: DATABASE_ID=ancient',
    'DATABASE_ID=current',
  ].join('\n');
  const out = archiveBindingKeys(existing, ['DATABASE_ID'], '2026-07-06');
  assert.equal(
    out,
    [
      '# hand-written note',
      '# archived 2026-01-01: DATABASE_ID=ancient',
      '# archived 2026-07-06: DATABASE_ID=current',
    ].join('\n'),
  );
});

test('archiveBindingKeys then mergeEnv yields archive + fresh binding', () => {
  const existing = 'DATABASE_ID=old\nACCESS_TOKEN=old-tok\nOTHER=keep';
  const archived = archiveBindingKeys(existing, PROVISION_ENV_KEYS, '2026-07-06');
  const out = mergeEnv(archived, { DATABASE_ID: 'new', ACCESS_TOKEN: 'new-tok' });
  assert.ok(out.includes('# archived 2026-07-06: DATABASE_ID=old'));
  assert.ok(out.includes('# archived 2026-07-06: ACCESS_TOKEN=old-tok'));
  assert.ok(out.includes('OTHER=keep'));
  assert.ok(out.includes('DATABASE_ID=new'));
  assert.ok(out.includes('ACCESS_TOKEN=new-tok'));
});

test('default resolveProvisionModules matches the corrected registry preset', () => {
  // The default resolves from the canonical node-type-registry preset (no
  // hand-copied list). The corrected preset carries the secret module as
  // internal_secrets_module (config_secrets_module was retired), and the
  // scope-required modules (secrets/identity/storage) are explicitly app-scoped
  // to match the backend's provision_database_modules enforcement.
  const modules = resolveProvisionModules();
  const names = modules.map((m) => (Array.isArray(m) ? m[0] : m));
  assert.ok(names.includes('users_module'));
  assert.ok(names.includes('internal_secrets_module'));
  assert.ok(!names.includes('config_secrets_module'));
  assert.ok(names.includes('storage_module'));

  const scopeOf = (name: string) => {
    const entry = modules.find((m) => Array.isArray(m) && m[0] === name);
    return Array.isArray(entry) ? (entry[1] as { scope?: string } | undefined)?.scope : undefined;
  };
  assert.equal(scopeOf('internal_secrets_module'), 'app');
  assert.equal(scopeOf('identity_providers_module'), 'app');
  assert.equal(scopeOf('storage_module'), 'app');
});

test('resolveProvisionModules overlay can add and remove modules', () => {
  const base = resolveProvisionModules();
  const withoutStorage = resolveProvisionModules([{ remove: ['storage_module'] }]);
  const baseNames = base.map((m) => (Array.isArray(m) ? m[0] : m));
  const strippedNames = withoutStorage.map((m) => (Array.isArray(m) ? m[0] : m));
  assert.ok(baseNames.includes('storage_module'));
  assert.ok(!strippedNames.includes('storage_module'));
});

test('any overlay option delta forces the explicit modules branch', () => {
  const modules = resolveProvisionModules([
    { add: [['storage_module', { scope: 'app', api_name: 'api' }]] },
  ]);
  const request = selectProvisionRequest(modules);
  assert.ok('modules' in request);
  assert.ok(!('presetSlug' in request));
});
