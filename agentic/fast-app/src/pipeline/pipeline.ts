// The deterministic build behind plan_app: backend phases, then app phases,
// each marked in the session and streamed to the card. The model takes no
// turn in between; a failure comes back as the phase, the cause and the fix.
// Each phase does its work in its own module; this file holds their order,
// and when the host writes the database's CORS lists (FastAppHost.appOrigins).

import { devPhase, genPhase, verifyPhase } from './app-phases';
import type { AppBuildDetails } from './app-plan';
import { codegenPhase, seedPhase } from './backend-phases';
import { buildCommitMessageFor, commitPhase } from './build-commits';
import { type BuildPlan, recordKindOf, type ResolvedPlan } from './build-plan';
import { fieldRules } from './field-hints';
import { type FastAppServices, getFastAppHost, hostPreviews, type OwnerCredential } from './host';
import { PIPELINE_PHASES } from './phases';
import { BuildProgress, type PhaseReporter } from './progress';
import { envSecrets } from './project-env';
import { provisionPhase } from './provision-phase';
import { failureText, genNoteLines, PHASE_FIX, STOPPED, successText } from './result-text';
import type { Note, RunContext } from './run-context';
import { runTogether } from './run-together';
import { schemaPhase, writeBuiltView } from './schema-phase';
import type { SkippedSeed } from './seed-step';
import { appDirOf } from './snapshot-clone';

export type PipelineInput = {
  cwd: string;
  plan: BuildPlan;
  resolved: ResolvedPlan;
  credential: OwnerCredential;
  services: FastAppServices;
  projectId: string | undefined;
  signal: AbortSignal | undefined;
};

export type PipelineResult = { ok: boolean; details: AppBuildDetails; text: string };

/** The card of a plan_app call; it takes the app's name once the spec is valid. */
export function buildProgress(reporter: PhaseReporter): BuildProgress {
  return new BuildProgress(reporter, {
    kind: 'app-build',
    name: '',
    stage: 'approval',
    phases: PIPELINE_PHASES,
  });
}

export async function runPipeline(
  input: PipelineInput,
  progress: BuildProgress,
): Promise<PipelineResult> {
  const { cwd, plan } = input;
  const stop = new AbortController();
  const onStop = () => stop.abort(input.signal?.reason);
  if (input.signal?.aborted) onStop();
  else input.signal?.addEventListener('abort', onStop, { once: true });
  const started = Date.now();
  const run: RunContext = {
    cwd,
    spec: input.resolved.spec,
    plan,
    resolved: input.resolved,
    projectId: input.projectId,
    services: input.services,
    credential: input.credential,
    signal: stop.signal,
    startedAt: new Date(started).toISOString(),
    rules: fieldRules(input.resolved.spec),
    card: progress,
  };
  // The step details name what ran; none of them may show the password.
  progress.root = cwd;
  const password = input.credential.kind === 'platform-identity' ? undefined : input.credential.password;
  progress.addSecrets([...(password ? [password] : []), ...(await envSecrets(cwd))]);
  progress.enter({ stage: 'building', startedAt: started });
  let backendEnd = 0;
  // Gen tells about each file only on the run that brings the change, so its
  // notes reach the agent on success and on failure alike.
  let genNotes: string[] = [];
  // The last check of the database's CORS lists says what still blocks the app.
  let originWarnings: string[] = [];
  const writeOrigins = async (note: Note) => {
    originWarnings = (await getFastAppHost().appOrigins?.(run.projectId, note)) ?? [];
  };
  try {
    const { session, siteWarnings } = await progress.run(
      'provision',
      async (note) => {
        const provisioned = await provisionPhase(run, note);
        // WORKAROUND (constructive-planning#2539): the app's origins go in
        // first here, once the site exists, so the first write names the
        // Preview and the site together. Sign-in and the site step make the
        // backend's server read the CORS list for the auth and api hosts. It
        // keeps what it read for up to 5 minutes, and the refresh after a
        // write rebuilds those hosts from that copy, so a list written before
        // the site existed stays on them without the site. A database with no
        // list leaves nothing in that cache. Remove this note, and put a step
        // back right after the database is made if wanted, once the backend
        // this desktop targets clears that cache on a flush (constructive#2018).
        await writeOrigins(note);
        return provisioned;
      },
      { fix: PHASE_FIX.provision },
    );
    const schema = await progress.run(
      'schema',
      async (note) => {
        const built = await schemaPhase(run, session, note);
        // The blueprint's entity types bring storage modules of their own.
        await writeOrigins(note);
        return built;
      },
      { fix: PHASE_FIX.schema },
    );
    let seedSkipped: SkippedSeed[] = [];
    await runTogether(stop, [
      () =>
        progress.run('codegen', (note) => codegenPhase(run, schema, note), {
          fix: PHASE_FIX.codegen,
        }),
      () =>
        progress.run(
          'seed',
          async (note) => {
            seedSkipped = await seedPhase(run, { ...schema, session }, note);
          },
          { fix: PHASE_FIX.seed },
        ),
    ]);
    backendEnd = Date.now();

    const gen = await progress.run('gen', () => genPhase(run, schema), { fix: PHASE_FIX.gen });
    genNotes = genNoteLines(gen.summary);
    const devUrl = await progress.run(
      'dev',
      async (note) => {
        // A fresh server: the one warmed during the backend predates gen's routes.
        const url = await devPhase(run, { fresh: true });
        // The Preview's port is final now; the lists must name the one it has.
        await writeOrigins(note);
        return url;
      },
      { fix: PHASE_FIX.dev },
    );
    if (hostPreviews()) progress.set({ previewUrl: devUrl });
    const verified = await progress.run(
      'verify',
      (note) =>
        verifyPhase(
          {
            dev: run,
            devUrl,
            session,
            tables: schema.tables,
            ...gen.screens,
            rules: run.rules,
            onRenderCheck: (summary, gaps) => progress.renderCheck(summary, gaps),
          },
          note,
        ),
      { fix: PHASE_FIX.verify },
    );
    progress.set({
      verified: { routes: verified.routes.length, tables: verified.crud.tested.length },
    });
    const appEnd = Date.now();
    const { ledger, model } = schema;
    const message = buildCommitMessageFor(ledger.record.kind, run.spec.name);
    await progress.run(
      'commit',
      async () => {
        // The spec as the database has it now, sample rows included, goes into the commit.
        await writeBuiltView(cwd, model, ledger.record);
        return commitPhase(cwd, message);
      },
      { fix: PHASE_FIX.commit },
    );

    const warnings = [
      ...plan.delta.warnings,
      ...gen.summary.warnings,
      ...siteWarnings,
      ...originWarnings,
    ];
    progress.enter({
      stage: 'done',
      timings: { backendMs: backendEnd - started, appMs: appEnd - backendEnd },
      ...(warnings.length ? { warnings } : {}),
    });
    return {
      ok: true,
      details: progress.details,
      text: successText({
        details: progress.details,
        delta: plan.delta,
        resolved: input.resolved,
        update: recordKindOf(plan) === 'update',
        outside: plan.outside,
        seedSkipped,
        resources: gen.screens.resources.length,
        genNotes,
      }),
    };
  } catch (err) {
    const failed = progress.endOnError(
      err,
      input.signal?.aborted ?? false,
      backendEnd ? { backendMs: backendEnd - started } : undefined,
    );
    return {
      ok: false,
      details: progress.details,
      text: failed ? failureText(failed, appDirOf(cwd), progress.details, genNotes) : STOPPED,
    };
  } finally {
    input.signal?.removeEventListener('abort', onStop);
  }
}
