// The owner's session on the app database (FastAppHost.owner) in a run with
// no UI: the owner's personal key of the app's realm. The card's answer
// carries no password, so a build and a check open the same session. Each
// one checks first that the key still signs in as the account (it can be
// revoked while a card waits), and a refusal fails the phase with the run's
// own cause and fix, not the desktop's advice about a password.

import path from 'node:path';

import type { OwnerSession, OwnerSessions } from '../pipeline/host';
import { ownerDataPlane } from '../pipeline/owner-planes';
import { PhaseError } from '../pipeline/progress';
import { checkOwnerKey, LaunchError, type Post, type RunIdentity } from './launch';

/** The session for the run's work tree; it throws for any other folder or an unknown database. */
export function ownerSessionOf(run: RunIdentity, cwd: string): OwnerSession {
  if (path.resolve(cwd) !== path.resolve(run.cwd)) {
    throw new Error(`This cloud run builds the app in ${run.cwd} only, not in ${cwd}.`);
  }
  if (!run.databaseName) {
    throw new Error(`The run's database (ID ${run.databaseId}) was not found when the run started.`);
  }
  return {
    databaseId: run.databaseId,
    databaseName: run.databaseName,
    // On the configured backend, never where a file in the clone points.
    endpoint: ownerDataPlane(run.endpoints.api, run.databaseName),
    token: run.ownerKey,
    userId: run.userId
  };
}

type Step = { phase: 'provision' | 'verify'; tool: 'plan_app' | 'verify_app' };

async function checkedSession(run: RunIdentity, cwd: string, step: Step, post: Post): Promise<OwnerSession> {
  const session = ownerSessionOf(run, cwd);
  try {
    await checkOwnerKey(run, session.databaseName, post);
  } catch (err) {
    if (!(err instanceof LaunchError)) throw err;
    throw new PhaseError(
      step.phase,
      err.reason,
      err.kind === 'key'
        ? 'Tell the user that the cloud run\'s owner key was refused: set up Cloud again from Constructive Desktop, then send the message again.'
        : `The backend may be busy or restarting: wait a minute, then call ${step.tool} again.`
    );
  }
  return session;
}

export function ownerKeySessions(run: RunIdentity, post?: Post): OwnerSessions {
  return {
    signIn: (cwd) => checkedSession(run, cwd, { phase: 'provision', tool: 'plan_app' }, post),
    resume: (cwd) => checkedSession(run, cwd, { phase: 'verify', tool: 'verify_app' }, post)
  };
}
