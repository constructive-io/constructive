// The owner's sign-in in the provision phase: a host's own PhaseError (a
// headless host that knows its key was refused) reaches the agent as it is;
// any other failure reads as a wrong password, as on the desktop.

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

test('any other sign-in failure is a provision failure that asks the user to check their password', async () => {
  hostSigningIn(async () => {
    throw new Error('invalid credentials');
  });

  await assert.rejects(provisionPhase(run(), () => {}), (err: unknown) => {
    assert.ok(err instanceof PhaseError);
    assert.equal(err.phase, 'provision');
    assert.equal(err.cause, 'Signing in to the app database as owner@example.com failed: invalid credentials');
    assert.equal(err.fix, 'Ask the user to check their password, then call plan_app again.');
    return true;
  });
});
