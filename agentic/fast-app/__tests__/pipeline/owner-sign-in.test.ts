import assert from 'node:assert/strict';

import { ownerSignInAttempt } from '../../src/pipeline/owner-sign-in';

const session = {
  databaseId: 'db-1',
  databaseName: 'appdb',
  endpoint: 'http://api.test/graphql',
  token: 'token-1',
  userId: 'user-1'
};

test('a transient error in the interactive platform hand-off surfaces without replaying it', async () => {
  let attempts = 0;
  await assert.rejects(
    ownerSignInAttempt(
      true,
      async () => {
        attempts += 1;
        // The user answered the step-up prompt, then the mint failed.
        throw new Error('fetch failed');
      },
      { note() {}, delayMs: 0 }
    ),
    /fetch failed/
  );
  assert.equal(attempts, 1);
});

test('the password lane is retried once after a transient failure', async () => {
  let attempts = 0;
  const signedIn = await ownerSignInAttempt(
    false,
    async () => {
      attempts += 1;
      if (attempts === 1) throw new Error('fetch failed');
      return session;
    },
    { note() {}, delayMs: 0 }
  );
  assert.equal(attempts, 2);
  assert.equal(signedIn.token, 'token-1');
});
