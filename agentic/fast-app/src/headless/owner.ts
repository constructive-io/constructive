// The owner's session on the app database (FastAppHost.owner) in a run with
// no UI: the owner's personal key of the app's realm, which the start checked
// signs in as the account (launch.ts). The card's answer carries no password,
// so a build and a check open the same session.

import path from 'node:path';

import type { OwnerSession, OwnerSessions } from '../pipeline/host';
import { ownerDataPlane } from '../pipeline/owner-planes';
import type { RunIdentity } from './launch';

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

export function ownerKeySessions(run: RunIdentity): OwnerSessions {
  return {
    signIn: async (cwd) => ownerSessionOf(run, cwd),
    resume: async (cwd) => ownerSessionOf(run, cwd)
  };
}
