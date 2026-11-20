// The provision phase of every build: the app's files, its database, the
// owner's sign-in and the app's site. The host makes sure of the database and
// opens the owner's session (host.ts); the plan card already approved both, so
// no model turn and no per-tool card. The app's CORS lists go in after it
// (pipeline.ts).

import { noteActivity, recordActivity } from './activity';
import { prewarmDevServer } from './app-phases';
import { getFastAppHost, type OwnerSession } from './host';
import { ownerSignInAttempt } from './owner-sign-in';
import { errorMessage, PhaseError } from './progress';
import { envSecrets } from './project-env';
import { type Note, type RunContext } from './run-context';
import { appDirOf, isComposed } from './snapshot-clone';
import { isNotReady, STILL_STARTING } from './transient';

/**
 * Readies the app's files and its database, and signs the owner in to it.
 * The dev server starts on the side, so the app phase only compiles the
 * pages gen writes.
 */
export async function provisionPhase(
  run: RunContext,
  note: Note,
): Promise<{ session: OwnerSession; siteWarnings: string[] }> {
  const host = getFastAppHost();
  note('Preparing the app files');
  await placeApp(run);
  prewarmDevServer(run);
  note('Creating the database');
  const { databaseName } = await host.ensureDatabase({
    cwd: run.cwd,
    projectId: run.projectId,
    plan: run.plan,
    signal: run.signal,
    note,
  });
  run.card.set({ databaseName });
  run.card.addSecrets(await envSecrets(run.cwd));
  note('Signing in as you');
  const session = await signIn(run, databaseName, note);
  const siteWarnings = (await host.appSite?.(run.projectId, note)) ?? [];
  return { session, siteWarnings };
}

// The app must be whole before provision: provision_database prewarms
// packages/app, and an app without its compose marker takes db-tools'
// template path, which clones the old constructive-app template into it and
// installs at the project root.
async function placeApp({ cwd, services, signal }: RunContext): Promise<void> {
  if (isComposed(appDirOf(cwd))) {
    noteActivity({ kind: 'fact', label: 'The app template was in packages/app already' });
    await services.template.materialize(cwd, signal);
    return;
  }
  await recordActivity({ kind: 'fact', label: 'Put the app template in packages/app' }, () =>
    services.template.materialize(cwd, signal),
  );
}

async function signIn(run: RunContext, databaseName: string, note: Note): Promise<OwnerSession> {
  const { credential } = run;
  const platformIdentity = credential.kind === 'platform-identity';
  const args = `${credential.email} on auth-${databaseName}`;
  // The password goes in the arguments only as the mark redaction leaves.
  return recordActivity(
    platformIdentity
      ? { kind: 'call', label: 'mintTenantOwnerHandoff', args, params: { email: credential.email } }
      : {
        kind: 'call',
        label: 'signIn',
        args,
        params: { email: credential.email, password: '[redacted]' },
      },
    () =>
      ownerSignInAttempt(
        platformIdentity,
        () => getFastAppHost().owner.signIn(run.cwd, credential, run.signal),
        { note, signal: run.signal },
      ),
  ).catch((err: unknown) => {
    // A host that knows the cause (headless: its own key was refused) says so
    // with its own fix; anything else reads as a wrong password, or for a
    // platform-identity sign-in, as a platform session that no longer holds.
    if (err instanceof PhaseError) throw err;
    const message = errorMessage(err);
    throw new PhaseError(
      'provision',
      platformIdentity
        ? `Signing in to the app database as ${credential.email} with the platform account failed: ${message}`
        : `Signing in to the app database as ${credential.email} failed: ${message}`,
      isNotReady(message)
        ? `${STILL_STARTING} Wait a minute, then call plan_app again.`
        : platformIdentity
          ? 'Ask the user to sign in to Constructive again, then call plan_app again. The database was created, and the next call picks it up. This account uses no password.'
          : 'Ask the user to check their password, then call plan_app again.',
    );
  });
}
