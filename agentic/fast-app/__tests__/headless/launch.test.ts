import assert from 'node:assert/strict';

import { MemoryRunLogStore } from '@agentic-kit/run-log';

import { LaunchError, readRunIdentity } from '../../src/headless/launch';
import type { CheckedOptions } from '../../src/headless/options';

const DB = '6f1f8a52-7c1e-4a51-9d5b-3c1b2a9e4d10';
const ACCOUNT_KEY = 'acct-key-0123456789abcdef';
const OWNER_KEY = 'owner-key-0123456789abcdef';

const options: CheckedOptions = {
  cwd: '/work/app',
  stateDir: '/state',
  databaseId: DB,
  account: { email: 'owner@example.com', apiKey: ACCOUNT_KEY },
  ownerKey: OWNER_KEY,
  endpoints: { api: 'http://api.localhost/graphql', modules: 'http://modules.localhost/graphql' },
  runLog: { store: new MemoryRunLogStore(), runId: 'run-1', flush: async () => {} },
  approvalTimeoutMs: 60_000
};

type Answer = { data?: unknown; errors?: Array<{ message: string; extensions?: Record<string, unknown> }> };

// A backend by endpoint and bearer: what each realm answers each key.
function backend(answers: Record<string, (key: string, query: string) => Answer>) {
  const asked: Array<{ endpoint: string; key: string }> = [];
  const post = async (args: { endpoint: string; headers?: Record<string, string>; query: string }) => {
    const key = (args.headers?.Authorization ?? '').replace(/^Bearer /, '');
    asked.push({ endpoint: args.endpoint, key });
    const answer = answers[args.endpoint]?.(key, args.query) ?? { errors: [{ message: 'no route' }] };
    return { httpStatus: 200, data: (answer.data ?? null) as never, errors: answer.errors ?? [] };
  };
  return { post: post as never, asked };
}

const refused = { errors: [{ message: 'You must be signed in to do that.', extensions: { code: 'UNAUTHENTICATED' } }] };

const healthy = {
  'http://auth.localhost/graphql': (key: string) =>
    key === ACCOUNT_KEY ? { data: { currentUserId: 'user-1' } } : refused,
  'http://api.localhost/graphql': () => ({
    data: { databases: { nodes: [{ id: DB, name: 'food-bank', ownerId: 'user-1' }] } }
  }),
  'http://auth-food-bank.localhost/graphql': (key: string) =>
    key === OWNER_KEY ? { data: { currentUserId: 'user-1' } } : refused
};

async function launchErrorOf(work: Promise<unknown>): Promise<string> {
  try {
    await work;
  } catch (err) {
    assert.ok(err instanceof LaunchError, String(err));
    return err.message;
  }
  assert.fail('expected the start to fail');
}

test('the user id comes from the platform realm, and the owner key is checked on the app realm', async () => {
  const { post, asked } = backend(healthy);
  const identity = await readRunIdentity(options, post);
  assert.equal(identity.userId, 'user-1');
  assert.equal(identity.databaseName, 'food-bank');
  // Each key goes to its own realm only.
  assert.deepEqual(asked, [
    { endpoint: 'http://auth.localhost/graphql', key: ACCOUNT_KEY },
    { endpoint: 'http://api.localhost/graphql', key: ACCOUNT_KEY },
    { endpoint: 'http://auth-food-bank.localhost/graphql', key: OWNER_KEY }
  ]);
});

test('a refused account key fails the start, names the key, and never shows it', async () => {
  const { post } = backend({ ...healthy, 'http://auth.localhost/graphql': () => refused });
  const message = await launchErrorOf(readRunIdentity(options, post));
  assert.match(message, /refused the account key \(APP_BUILD_ACCOUNT_KEY\)/);
  assert.match(message, /Set up Cloud again/);
  assert.ok(!message.includes(ACCOUNT_KEY));
});

test('a refused owner key fails the start', async () => {
  const { post } = backend({ ...healthy, 'http://auth-food-bank.localhost/graphql': () => refused });
  const message = await launchErrorOf(readRunIdentity(options, post));
  assert.match(message, /auth-food-bank\.localhost refused the owner key \(APP_BUILD_OWNER_KEY\)/);
  assert.ok(!message.includes(OWNER_KEY));
});

test('an owner key of another user fails the start', async () => {
  const { post } = backend({
    ...healthy,
    'http://auth-food-bank.localhost/graphql': () => ({ data: { currentUserId: 'user-2' } })
  });
  assert.match(await launchErrorOf(readRunIdentity(options, post)), /as another user than the account/);
});

test('a gone database starts with no name and no owner check: the build says why', async () => {
  const { post, asked } = backend({
    ...healthy,
    'http://api.localhost/graphql': () => ({ data: { databases: { nodes: [] } } })
  });
  const identity = await readRunIdentity(options, post);
  assert.equal(identity.databaseName, null);
  assert.equal(asked.length, 2);
});

test('a backend that does not answer fails the start with a retry', async () => {
  const { post } = backend({
    'http://auth.localhost/graphql': () => ({ errors: [{ message: 'fetch failed', extensions: { code: 'NETWORK' } }] })
  });
  assert.match(await launchErrorOf(readRunIdentity(options, post)), /Could not check the account key .*fetch failed/);
});
