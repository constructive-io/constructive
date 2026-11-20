import assert from 'node:assert/strict';

import { selectProvisionCredential } from '@agentic-kit/db-tools/provision-database/credential';

test('no session → explicit error (never a silent throwaway owner)', () => {
  assert.equal(selectProvisionCredential(null).mode, 'error');
  assert.equal(selectProvisionCredential(undefined).mode, 'error');
});

test('signed in with an API key → provision under the account, key as bearer', () => {
  assert.deepEqual(
    selectProvisionCredential({ userId: 'user_1', accessToken: 'tok', apiKey: 'cnc_live_sk_x' }),
    { mode: 'account', ownerId: 'user_1', bearer: 'cnc_live_sk_x' },
  );
});

test('signed in without an API key → fall back to the session token as bearer', () => {
  assert.deepEqual(selectProvisionCredential({ userId: 'user_1', accessToken: 'tok' }), {
    mode: 'account',
    ownerId: 'user_1',
    bearer: 'tok',
  });
});

test('a session missing both userId and any bearer → error', () => {
  assert.equal(selectProvisionCredential({ userId: '', accessToken: '', apiKey: '' }).mode, 'error');
});
