// Desktop makes the run's database in Set up Cloud, so this step never makes,
// binds or replaces one.

import path from 'node:path';

import { probeDatabase } from '@agentic-kit/db-tools';

import { rebuildOf } from '../pipeline/build-plan';
import type { DatabaseRequest } from '../pipeline/host';
import { PhaseError } from '../pipeline/progress';
import type { RunIdentity } from './launch';

const REBUILD_FIX =
  "A cloud run never makes or replaces a database. Tell the user to open the project in Constructive Desktop and ask for the app there: desktop's plan_app offers to rebuild it in a new database.";

export const DATABASE_TEXT = {
  rebuild: (id: string) => ({
    cause: `The app's database (ID ${id}) is gone, and rebuilding it needs a new database, which a cloud run doesn't make.`,
    fix: REBUILD_FIX
  }),
  gone: (id: string) => ({
    cause: `The app's database (ID ${id}) is gone: the backend no longer has it, or this account lost access to it.`,
    fix: REBUILD_FIX
  }),
  otherAccount: (name: string) => ({
    cause: `The app's database ${name} belongs to another account than the one this cloud run acts for.`,
    fix: 'Tell the user to set up Cloud again from Constructive Desktop, signed in to the account that owns the database.'
  }),
  suspended: (name: string, reason: string | undefined) => ({
    cause: `The app's database ${name} is suspended${reason ? ` (${reason})` : ''}. Its data is kept, but nothing can change it until the suspension is lifted.`,
    fix: "Tell the user the database is suspended, and don't build until it is lifted."
  }),
  unreachable: (detail: string, auth: boolean) => ({
    cause: `Could not check the app's database on the backend: ${detail}`,
    fix: auth
      ? 'The backend refused the account key. Tell the user to set up Cloud again from Constructive Desktop.'
      : 'The backend may be busy or restarting: wait a minute, then call plan_app again.'
  })
};

type Probe = typeof probeDatabase;

export async function checkRunDatabase(
  run: RunIdentity,
  request: Pick<DatabaseRequest, 'cwd' | 'plan' | 'note'>,
  probe: Probe = probeDatabase
): Promise<{ databaseName: string }> {
  const fail = ({ cause, fix }: { cause: string; fix: string }): never => {
    throw new PhaseError('provision', cause, fix);
  };
  if (path.resolve(request.cwd) !== path.resolve(run.cwd)) {
    fail({
      cause: `This cloud run builds the app in ${run.cwd} only, not in ${request.cwd}.`,
      fix: 'Call plan_app from the run\'s own project folder.'
    });
  }
  if (rebuildOf(request.plan)) fail(DATABASE_TEXT.rebuild(run.databaseId));
  request.note('Checking the database');
  const found = await probe({
    endpoint: run.endpoints.api,
    bearer: run.accountKey,
    databaseId: run.databaseId
  });
  const name = ('name' in found && found.name) || run.databaseName || run.databaseId;
  switch (found.status) {
  case 'missing':
    return fail(DATABASE_TEXT.gone(run.databaseId));
  case 'suspended':
    return fail(DATABASE_TEXT.suspended(name, found.suspendedReason));
  case 'unreachable':
    return fail(DATABASE_TEXT.unreachable(found.detail, found.cause === 'auth'));
  case 'found':
    if (found.ownerId && found.ownerId !== run.userId) return fail(DATABASE_TEXT.otherAccount(name));
    // The owner key was checked on the realm of the database the start found.
    if (!run.databaseName) {
      return fail({
        cause: `The app's database (ID ${run.databaseId}) was not found when this run started.`,
        fix: 'Send the message again, so a new run starts with the database as it is now.'
      });
    }
    return { databaseName: run.databaseName };
  }
}
