import assert from 'node:assert/strict';

import { type BindingProbe, checkDatabase, type CheckDeps, classifyProbe } from '../../src/pipeline/db-check';
import { databaseRefusal, provisionFix } from '../../src/pipeline/drift-text';
import type { FastAppProject, ProjectDatabaseState } from '../../src/pipeline/host';

// The host's project, with the binding its record keeps.
type Project = FastAppProject & { databaseName?: string; ownerId?: string };

const PROJECT: Project = {
  id: 'p1',
  name: 'Food bank',
  cwd: '/projects/food-bank',
  databaseId: 'db-1',
  databaseName: 'food-bank',
};

// A store holding one project, and a backend that answers `answer` to every
// probe, with `user-1` signed in.
function world(project: Project, answer: () => Promise<BindingProbe>) {
  let current = project;
  const sent: Project[] = [];
  const forgotten: string[] = [];
  const deps: CheckDeps = {
    project: () => current,
    reconcile: async () =>
      current.databaseId
        ? {
          databaseId: current.databaseId,
          databaseName: current.databaseName,
          ...(current.ownerId ? { ownerId: current.ownerId } : {}),
        }
        : null,
    probe: answer,
    accountUserId: () => 'user-1',
    saveState: async (_id, state: ProjectDatabaseState | null) => {
      if (current.databaseState?.status === state?.status) return undefined;
      const { databaseState: _old, ...rest } = current;
      current = state ? { ...rest, databaseState: state } : rest;
      return current;
    },
    notify: (p) => sent.push(p),
    forgetPasswords: async (projectId) => {
      forgotten.push(projectId);
    },
    now: () => 1_000,
  };
  const check = () => checkDatabase(project.cwd, project.id, deps);
  return { check, sent, forgotten, stored: () => current.databaseState };
}

test('an unreachable backend or a rejected account is never a missing database', async () => {
  const answers: Array<() => Promise<BindingProbe>> = [
    async () => ({ status: 'unreachable', cause: 'network', detail: 'fetch failed' }),
    async () => ({ status: 'unreachable', cause: 'auth', detail: 'HTTP 401' }),
    async () => {
      throw new Error('socket hang up');
    },
  ];
  for (const answer of answers) {
    // Nothing is marked, and a state an earlier check recorded stays as it was.
    for (const before of [undefined, { status: 'suspended' as const, since: 5 }]) {
      const w = world({ ...PROJECT, ...(before ? { databaseState: before } : {}) }, answer);
      const state = await w.check();
      assert.equal(state.kind, 'unreachable');
      assert.deepEqual(w.stored(), before);
      assert.equal(w.sent.length, 0);
    }
  }
});

test('a suspended database is recorded once, and cleared when it is found again', async () => {
  let answer: BindingProbe = { status: 'suspended', name: 'food-bank' };
  const w = world(PROJECT, async () => answer);

  assert.deepEqual(await w.check(), { kind: 'suspended', databaseId: 'db-1', name: 'food-bank' });
  assert.deepEqual(w.stored(), { status: 'suspended', since: 1_000 });
  await w.check();
  assert.equal(w.sent.length, 1, 'an unchanged state is not sent again');

  answer = { status: 'found', name: 'food-bank', hash: 'h1' };
  assert.equal((await w.check()).kind, 'found');
  assert.equal(w.stored(), undefined);
  assert.equal(w.sent.length, 2);
});

test("a missing database that another account owns is that account's, never missing", async () => {
  // The platform hides a database from accounts outside its owner's org, and
  // answers "missing" for it.
  const w = world({ ...PROJECT, ownerId: 'user-2' }, async () => ({ status: 'missing' }));
  const state = await w.check();
  assert.deepEqual(state, { kind: 'other-account', databaseId: 'db-1', name: 'food-bank' });
  assert.deepEqual(w.stored(), { status: 'other-account', since: 1_000 });
  // plan_app and verify_app don't call it gone, and send the user to sign in.
  const refusal = databaseRefusal('plan_app', state);
  assert.doesNotMatch(refusal?.text ?? '', /is gone/);
  assert.match(refusal?.text ?? '', /sign in to Constructive with the account that built this app/);
});

test("only a database found missing forgets the app's remembered password", async () => {
  const answers: BindingProbe[] = [
    { status: 'found', name: 'food-bank', hash: 'h1' },
    { status: 'suspended', name: 'food-bank' },
    { status: 'unreachable', cause: 'network', detail: 'fetch failed' },
  ];
  for (const answer of answers) {
    const w = world(PROJECT, async () => answer);
    await w.check();
    assert.deepEqual(w.forgotten, [], answer.status);
  }
  // Another account's database may well exist, so its password stays too.
  const theirs = world({ ...PROJECT, ownerId: 'user-2' }, async () => ({ status: 'missing' }));
  await theirs.check();
  assert.deepEqual(theirs.forgotten, []);

  const gone = world(PROJECT, async () => ({ status: 'missing' }));
  await gone.check();
  assert.deepEqual(gone.forgotten, ['p1']);
});

test('a missing database of the signed-in account, or of no known owner, stays missing', () => {
  const missing: BindingProbe = { status: 'missing' };
  for (const ownerId of ['user-1', undefined]) {
    const binding = { databaseId: 'db-1', ...(ownerId ? { ownerId } : {}) };
    assert.equal(classifyProbe(binding, missing, 'user-1').kind, 'missing', String(ownerId));
  }
});

test('an unbound project is a first build, not a missing database', async () => {
  const { databaseId: _id, databaseName: _name, ...unbound } = PROJECT;
  const w = world(unbound, async () => assert.fail('an unbound project is never probed'));
  assert.deepEqual(await w.check(), { kind: 'unbound' });
  assert.equal(w.sent.length, 0);
});

test('a provision that finds the database gone or held never says to check the backend', () => {
  for (const code of ['db-missing', 'db-suspended', 'account-mismatch']) {
    assert.doesNotMatch(provisionFix(code), /backend is running/, code);
  }
});

test('a database allowance refusal tells the agent to report the limit and stop', () => {
  for (const text of [
    provisionFix('LIMIT_REACHED'),
    provisionFix('failed', 'Database provisioning failed: LIMIT_REACHED.'),
  ]) {
    assert.match(text, /reached its database limit/);
    assert.match(text, /don't retry or provision under another name/);
    assert.doesNotMatch(text, /backend is running/);
  }
});
