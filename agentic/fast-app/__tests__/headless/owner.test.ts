import assert from 'node:assert/strict';

import type { RunIdentity } from '../../src/headless/launch';
import { ownerKeySessions } from '../../src/headless/owner';
import { PhaseError } from '../../src/pipeline/progress';

const DB = '6f1f8a52-7c1e-4a51-9d5b-3c1b2a9e4d10';

const run: RunIdentity = {
  cwd: '/work/app',
  databaseId: DB,
  userId: 'user-1',
  email: 'owner@example.com',
  accountKey: 'account-key',
  ownerKey: 'owner-key',
  endpoints: { api: 'http://api.localhost/graphql', modules: 'http://modules.localhost/graphql' },
  databaseName: 'food-bank'
};

type Answer = { data?: unknown; errors?: Array<{ message: string; extensions?: Record<string, unknown> }> };

// The app realm's answer to `currentUserId`, and where each key went.
function realm(answer: Answer) {
  const asked: Array<{ endpoint: string; key: string }> = [];
  const post = async (args: { endpoint: string; headers?: Record<string, string> }) => {
    asked.push({ endpoint: args.endpoint, key: (args.headers?.Authorization ?? '').replace(/^Bearer /, '') });
    return { httpStatus: 200, data: (answer.data ?? null) as never, errors: answer.errors ?? [] };
  };
  return { post: post as never, asked };
}

const signedIn = { data: { currentUserId: 'user-1' } };
const refused = { errors: [{ message: 'You must be signed in to do that.', extensions: { code: 'UNAUTHENTICATED' } }] };

async function phaseErrorOf(work: Promise<unknown>): Promise<PhaseError> {
  try {
    await work;
  } catch (err) {
    assert.ok(err instanceof PhaseError, `expected a PhaseError, got ${String(err)}`);
    return err;
  }
  assert.fail('expected the sign-in to fail');
}

test('the session is the owner key on the app plane, checked on the app realm first', async () => {
  const { post, asked } = realm(signedIn);
  const sessions = ownerKeySessions(run, post);
  const expected = {
    databaseId: DB,
    databaseName: 'food-bank',
    endpoint: 'http://api-food-bank.localhost/graphql',
    token: 'owner-key',
    userId: 'user-1'
  };
  assert.deepEqual(await sessions.signIn('/work/app', { email: 'owner@example.com' }), expected);
  assert.deepEqual(await sessions.resume('/work/app', undefined), expected);
  assert.deepEqual(asked, [
    { endpoint: 'http://auth-food-bank.localhost/graphql', key: 'owner-key' },
    { endpoint: 'http://auth-food-bank.localhost/graphql', key: 'owner-key' }
  ]);
});

test("a refused key fails the build's provision phase with the run's cause and fix, never the password advice", async () => {
  const err = await phaseErrorOf(ownerKeySessions(run, realm(refused).post).signIn('/work/app', { email: 'owner@example.com' }));
  assert.equal(err.phase, 'provision');
  assert.match(err.cause, /auth-food-bank\.localhost refused the owner key \(APP_BUILD_OWNER_KEY\)/);
  assert.match(err.fix, /set up Cloud again from Constructive Desktop/);
  assert.doesNotMatch(`${err.cause} ${err.fix}`, /password|owner-key/);
});

test("a refused key fails verify_app's check in its verify phase, and a key of another user too", async () => {
  const refusedCheck = await phaseErrorOf(ownerKeySessions(run, realm(refused).post).resume('/work/app', undefined));
  assert.equal(refusedCheck.phase, 'verify');
  const other = await phaseErrorOf(
    ownerKeySessions(run, realm({ data: { currentUserId: 'user-2' } }).post).resume('/work/app', undefined)
  );
  assert.match(other.cause, /as another user than the account/);
});

test('a backend that does not answer says to wait and call the tool again', async () => {
  const down = realm({ errors: [{ message: 'fetch failed', extensions: { code: 'NETWORK' } }] });
  const err = await phaseErrorOf(ownerKeySessions(run, down.post).signIn('/work/app', { email: 'owner@example.com' }));
  assert.match(err.cause, /Could not check the owner key/);
  assert.match(err.fix, /wait a minute, then call plan_app again/);
});

test('another folder, or a database the start did not find, has no session and asks nothing', async () => {
  const { post, asked } = realm(signedIn);
  await assert.rejects(ownerKeySessions(run, post).resume('/work/other', undefined), /builds the app in \/work\/app only/);
  await assert.rejects(
    ownerKeySessions({ ...run, databaseName: null }, post).signIn('/work/app', { email: 'x@y' }),
    /was not found when the run started/
  );
  assert.equal(asked.length, 0);
});
