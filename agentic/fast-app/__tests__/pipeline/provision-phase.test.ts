
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { configureFastAppHost, type FastAppHost, type OwnerSessions } from '../../src/pipeline/host';
import { PhaseError } from '../../src/pipeline/progress';
import { provisionPhase } from '../../src/pipeline/provision-phase';
import type { RunContext } from '../../src/pipeline/run-context';

let cwd: string;

beforeEach(() => {
  cwd = mkdtempSync(path.join(tmpdir(), 'provision-phase-'));
});

afterEach(() => {
  rmSync(cwd, { recursive: true, force: true });
});

// A run whose app files are ready and whose dev server can't start; the
// prewarm's failure is its own, so the phase goes on to the sign-in.
const run = () =>
  ({
    cwd,
    projectId: undefined,
    plan: {},
    credential: { email: 'owner@example.com' },
    signal: new AbortController().signal,
    services: {
      template: { available: () => true, materialize: async () => {}, schemaFile: async (): Promise<null> => null },
      devServers: {
        ensure: async () => {
          throw new Error('no dev server in this test');
        }
      },
      locks: {}
    },
    card: { set: () => {}, addSecrets: () => {} }
  }) as unknown as RunContext;

function hostSigningIn(signIn: OwnerSessions['signIn']) {
  configureFastAppHost({
    ensureDatabase: async () => ({ databaseName: 'food-bank' }),
    owner: { signIn, resume: async (): Promise<null> => null },
    projects: {
      get: (): undefined => undefined,
      at: (): undefined => undefined,
      binding: async (): Promise<null> => null
    }
  } as unknown as FastAppHost);
}

test("a host's PhaseError from the sign-in passes through with its own cause and fix", async () => {
  const refused = new PhaseError(
    'provision',
    "The owner's API key was refused by auth-food-bank.",
    'Set up Cloud for this project again, then call plan_app again.'
  );
  hostSigningIn(async () => {
    throw refused;
  });

  await assert.rejects(provisionPhase(run(), () => {}), (err: unknown) => err === refused);
});

test('a platform-identity sign-in that fails is not repeated, and its fix asks for a new platform sign-in', async () => {
  let attempts = 0;
  hostSigningIn(async () => {
    attempts += 1;
    // The user answered the hand-off's prompt, then the mint failed.
    throw new Error('fetch failed');
  });
  const platformRun = {
    ...run(),
    credential: { kind: 'platform-identity', email: 'owner@example.com', userId: 'user-1' }
  } as RunContext;

  await assert.rejects(provisionPhase(platformRun, () => {}), (err: unknown) => {
    assert.ok(err instanceof PhaseError);
    assert.match(err.message, /with the platform account failed: fetch failed/);
    assert.match(err.fix, /sign in to Constructive again/);
    return true;
  });
  assert.equal(attempts, 1);
});
