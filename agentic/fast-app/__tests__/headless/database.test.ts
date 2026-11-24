import assert from 'node:assert/strict';

import type { DatabaseProbe } from '@agentic-kit/db-tools';

import { checkRunDatabase, DATABASE_TEXT } from '../../src/headless/database';
import type { RunIdentity } from '../../src/headless/launch';
import type { BuildPlan } from '../../src/pipeline/build-plan';
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

const first = { mode: { kind: 'first' } } as BuildPlan;
const rebuild = {
  mode: { kind: 'rebuild', replaces: DB, databaseName: 'food-bank-2' }
} as BuildPlan;

function probeAnswering(answer: DatabaseProbe) {
  const asked: Array<{ endpoint: string; bearer: string; databaseId: string }> = [];
  const probe = async (args: { endpoint: string; bearer: string; databaseId: string }) => {
    asked.push(args);
    return answer;
  };
  return { probe: probe as never, asked };
}

async function phaseErrorOf(work: Promise<unknown>): Promise<PhaseError> {
  try {
    await work;
  } catch (err) {
    assert.ok(err instanceof PhaseError, `expected a PhaseError, got ${String(err)}`);
    return err;
  }
  assert.fail('expected the check to fail');
}

const notes = () => {
  const lines: string[] = [];
  return { lines, note: (text: string): void => void lines.push(text) };
};

test('an alive database of the account passes, checked with the account key on the configured API', async () => {
  const { probe, asked } = probeAnswering({ status: 'found', databaseId: DB, name: 'food-bank', ownerId: 'user-1' });
  const { lines, note } = notes();
  assert.deepEqual(await checkRunDatabase(run, { cwd: '/work/app', plan: first, note }, probe), {
    databaseName: 'food-bank'
  });
  assert.deepEqual(asked, [{ endpoint: run.endpoints.api, bearer: 'account-key', databaseId: DB }]);
  assert.deepEqual(lines, ['Checking the database']);
});

test('a gone database fails the provision phase and sends the user to desktop to rebuild', async () => {
  const { probe } = probeAnswering({ status: 'missing', databaseId: DB });
  const err = await phaseErrorOf(checkRunDatabase(run, { cwd: '/work/app', plan: first, note: () => {} }, probe));
  assert.equal(err.phase, 'provision');
  assert.equal(err.cause, DATABASE_TEXT.gone(DB).cause);
  assert.match(err.fix, /Constructive Desktop/);
});

test('a rebuild never asks the backend: a cloud run makes no database', async () => {
  const { probe, asked } = probeAnswering({ status: 'found', databaseId: DB, name: 'food-bank', ownerId: 'user-1' });
  const err = await phaseErrorOf(checkRunDatabase(run, { cwd: '/work/app', plan: rebuild, note: () => {} }, probe));
  assert.equal(err.phase, 'provision');
  assert.match(err.cause, /rebuilding it needs a new database/);
  assert.match(err.fix, /rebuild it in a new database/);
  assert.equal(asked.length, 0);
});

test("another account's database is refused", async () => {
  const { probe } = probeAnswering({ status: 'found', databaseId: DB, name: 'food-bank', ownerId: 'someone-else' });
  const err = await phaseErrorOf(checkRunDatabase(run, { cwd: '/work/app', plan: first, note: () => {} }, probe));
  assert.equal(err.cause, DATABASE_TEXT.otherAccount('food-bank').cause);
});

test('a suspended database and an unreachable backend fail with their own cause', async () => {
  const suspended = probeAnswering({
    status: 'suspended',
    databaseId: DB,
    name: 'food-bank',
    suspendedAt: '2026-11-01',
    suspendedReason: 'billing'
  });
  const held = await phaseErrorOf(checkRunDatabase(run, { cwd: '/work/app', plan: first, note: () => {} }, suspended.probe));
  assert.match(held.cause, /suspended \(billing\)/);
  const refused = probeAnswering({ status: 'unreachable', databaseId: DB, cause: 'auth', detail: 'jwt expired' });
  const down = await phaseErrorOf(checkRunDatabase(run, { cwd: '/work/app', plan: first, note: () => {} }, refused.probe));
  assert.match(down.cause, /jwt expired/);
  assert.match(down.fix, /set up Cloud again/);
});

test('a folder other than the run’s work tree is refused before any request', async () => {
  const { probe, asked } = probeAnswering({ status: 'found', databaseId: DB, name: 'food-bank', ownerId: 'user-1' });
  await phaseErrorOf(checkRunDatabase(run, { cwd: '/work/other', plan: first, note: () => {} }, probe));
  assert.equal(asked.length, 0);
});
