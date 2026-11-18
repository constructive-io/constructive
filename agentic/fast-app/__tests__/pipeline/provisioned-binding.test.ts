import assert from 'node:assert/strict';

import { parseProvisionedBinding } from '../../src/pipeline/provisioned-binding';

test('parses the provisioning keys, ignoring comments and unrelated lines', () => {
  const env = [
    '# project env',
    'NEXT_PUBLIC_FOO=bar',
    'DATABASE_ID=db_42',
    'DATABASE_NAME=myapp',
    'OWNER_ID=user_7',
    'ACCESS_TOKEN=tok',
  ].join('\n');
  assert.deepEqual(parseProvisionedBinding(env), {
    databaseId: 'db_42',
    ownerId: 'user_7',
    databaseName: 'myapp',
  });
});

test('returns null until DATABASE_ID is present', () => {
  assert.equal(parseProvisionedBinding('OWNER_ID=user_7\nDATABASE_NAME=myapp'), null);
  assert.equal(parseProvisionedBinding(''), null);
});

test('DATABASE_ID alone yields a binding with no owner/name', () => {
  assert.deepEqual(parseProvisionedBinding('DATABASE_ID=db_42'), { databaseId: 'db_42' });
});

test('archived binding lines are ignored — only the live binding is read', () => {
  const env = [
    '# archived 2026-07-06: DATABASE_ID=old_db',
    '# archived 2026-07-06: OWNER_ID=old_owner',
    'DATABASE_ID=db_new',
    'OWNER_ID=user_new',
    'DATABASE_NAME=myapp',
  ].join('\n');
  assert.deepEqual(parseProvisionedBinding(env), {
    databaseId: 'db_new',
    ownerId: 'user_new',
    databaseName: 'myapp',
  });
});

test('a fully archived binding parses as no binding at all', () => {
  const env = [
    '# archived 2026-07-06: DATABASE_ID=old_db',
    '# archived 2026-07-06: ACCESS_TOKEN=old_tok',
  ].join('\n');
  assert.equal(parseProvisionedBinding(env), null);
});
