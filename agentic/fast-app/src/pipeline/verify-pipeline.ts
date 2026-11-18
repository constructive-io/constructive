// verify_app: the same checks the pipeline ends with, for a repair turn. It
// starts the dev server if it is down, asks the host for the owner's session
// if it lapsed (desktop signs in with the password remembered for the app),
// and makes the build's commit the first time the app passes after a failed
// build. It reads what the build left from the build record and the spec as
// the database has it now, so it checks the same after a restart. Screens
// whose table was deleted outside the app are left out, and the result says
// what the app doesn't have yet. The tool itself only registers it
// (verify-app-tool.ts).

import path from 'node:path';

import { fetchLiveMeta } from '../extensions/db-tools/live-meta';
import { devPhase, recordedTarget, verifyPhase } from './app-phases';
import type { AppBuildDetails } from './app-plan';
import {
  buildCommitMessageFor,
  buildCommitOwed,
  commitPhase,
  homeState,
  readBuildHistory,
} from './build-commits';
import { liveDeps } from './db-port';
import { verifyDriftLines } from './drift-note';
import { databaseRefusal } from './drift-text';
import { fieldRules } from './field-hints';
import type { GenResource } from './gen';
import {
  type FastAppProject,
  type FastAppServices,
  getFastAppHost,
  type OwnerSession,
} from './host';
import { BuildProgress, PhaseError, type PhaseReporter } from './progress';
import {
  checkedText,
  PHASE_FIX,
  STOPPED,
  UNFINISHED_BUILD,
  UNFINISHED_BUILD_FIX,
  VERIFY_ERROR_FIX,
  verifyFailedText,
  verifyNextText,
  verifyPassedText,
} from './result-text';
import { syncView } from './view-sync';

export type VerifyInput = {
  cwd: string;
  services: FastAppServices;
  project: FastAppProject | undefined;
  signal: AbortSignal | undefined;
  /** The agent's message for the commit of what the check covers. */
  commitMessage: string | undefined;
  /** The files the chat changed, which a passing check commits with the rest. */
  touchedFiles: () => string[];
};

export type VerifyOutcome = { text: string; details: AppBuildDetails };

/** The card of a verify_app call. */
export function verifyProgress(reporter: PhaseReporter): BuildProgress {
  return new BuildProgress(reporter, {
    kind: 'app-verify',
    name: 'App',
    stage: 'building',
    phases: ['dev', 'verify', 'commit'],
  });
}

async function ownerSession(cwd: string, projectId: string | undefined): Promise<OwnerSession> {
  const session = await getFastAppHost().owner.resume(cwd, projectId);
  if (session) return session;
  throw new PhaseError(
    'verify',
    'There is no owner session for the app database.',
    'Ask the user to sign in to the app in the Sheets tab (or run plan_app again), then call verify_app.',
  );
}

export async function runVerifyPipeline(
  input: VerifyInput,
  progress: BuildProgress,
): Promise<VerifyOutcome> {
  const { cwd, services, project, signal } = input;
  const ended = (text: string): VerifyOutcome => ({ text, details: progress.details });
  progress.root = cwd;
  // Like plan_app: a database that can't be used stops the check before it
  // starts, and one that changed outside the app gets app-spec.json written again.
  const sync = await syncView(
    cwd,
    { projectId: project?.id, fallbackName: path.basename(cwd) },
    liveDeps,
  );
  if (sync.kind === 'unavailable') {
    const refusal = databaseRefusal('verify_app', sync.database);
    progress.enter({ stage: 'unavailable', errors: [refusal.line] });
    return ended(refusal.text);
  }
  // Without an app in the database there is nothing a build left: check the app as it is.
  const built = sync.kind === 'unbound' || sync.kind === 'empty' ? null : sync;
  // An adopted app has no record of a build to check against.
  const record = built?.start.record ?? null;
  const spec = built?.start.view.spec ?? null;
  if (spec) progress.set({ name: spec.name });
  // The build's own commit comes first, while the record says it's owed;
  // after that, a passing check commits what it covers with the agent's message.
  const owed = record ? buildCommitOwed(record, await readBuildHistory(cwd)) : false;
  // A build that owes its commit must have made its screens: the check
  // reads them, and its pass would commit that build as done.
  if (record && owed && !record.steps.gen) {
    progress.fail('setup', UNFINISHED_BUILD, UNFINISHED_BUILD_FIX);
    return ended(`${UNFINISHED_BUILD} ${UNFINISHED_BUILD_FIX}`);
  }
  let gone: GenResource[] = [];
  const drift = (text: string) =>
    [text, ...verifyDriftLines(built?.state.outside ?? [], gone)].join('\n');
  const dev = { cwd, services, projectId: project?.id, signal };
  try {
    const devUrl = await progress.run('dev', () => devPhase(dev), { fix: PHASE_FIX.dev });
    progress.set({ previewUrl: devUrl });
    const result = await progress.run(
      'verify',
      async (note) => {
        const session = await ownerSession(cwd, project?.id);
        const target = recordedTarget(record, await fetchLiveMeta(session.endpoint, session.token));
        // Their pages still query the table: not a failure of the app's code.
        gone = target.gone;
        return verifyPhase(
          {
            dev,
            devUrl,
            session,
            ...target,
            rules: spec ? fieldRules(spec) : {},
            onRenderCheck: (summary, gaps) => progress.renderCheck(summary, gaps),
          },
          note,
        );
      },
      { fix: VERIFY_ERROR_FIX },
    );
    const name = spec?.name ?? 'the app';
    const message =
      record && owed
        ? buildCommitMessageFor(record.kind, name)
        : input.commitMessage?.trim() || `feat(app): update ${name}`;
    const sha = await progress.run(
      'commit',
      () => commitPhase(cwd, message, input.touchedFiles()),
      {
        fix: PHASE_FIX.commit,
      },
    );
    progress.enter({ stage: 'done' });
    const history = await readBuildHistory(cwd);
    // Both nudges are for the first build's design pass: a follow-up
    // keeps the home page the app already has.
    const since = history.builds === 1 ? history.since : null;
    const home = since === 1 && history.last ? await homeState(cwd, history.last.sha) : null;
    const text = verifyPassedText({
      result,
      render: checkedText(progress.details),
      committed: sha ? { sha, message } : null,
      next: verifyNextText(since, home),
    });
    return ended(drift(text));
  } catch (err) {
    const failed = progress.endOnError(err, signal?.aborted ?? false);
    return ended(failed ? drift(verifyFailedText(failed, progress.details)) : STOPPED);
  }
}
