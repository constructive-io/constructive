// The backend phases after the schema step (schema-phase.ts): codegen and the
// seed, side by side. Codegen calls the db-tools implementation directly (the
// one plan card already approved it), so no model turn and no per-tool card.

import { run, type RunCommand } from '@agentic-kit/db-tools/app-workspace';
import { createRunCodegenTool } from '@agentic-kit/db-tools/tools/run-codegen';

import { noteActivity, recordActivity } from './activity';
import { keepsSdk, lastRecordOf, prevOf } from './build-plan';
import { commandLine } from './command';
import { getFastAppHost, type OwnerSession } from './host';
import { sdkMoved } from './plan-live';
import { type Note, type RunContext, toolCtx } from './run-context';
import type { BuiltSchema } from './schema-phase';
import { seedStep, type SkippedSeed } from './seed-step';
import { isNotReady, retryTransientOnce } from './transient';

// db-tools' own runner, watched: each command codegen runs goes on the step's
// list with its working dir and outcome. The env it passes is never recorded.
// Its runner answers ok or not, with no exit code.
const watchedRun: RunCommand = (cmd, args, cwd, env) =>
  recordActivity(
    { kind: 'command', label: commandLine(cmd, args), cwd },
    () => run(cmd, args, cwd, env),
    (result) => ({
      ...(result.ok ? { exit: 0 } : { detail: 'failed' }),
      failed: !result.ok,
      output: result.out,
    }),
  );

const runCodegenTool = createRunCodegenTool(watchedRun);

// Why a build that changes no schema still generates the SDK.
function sdkAgainNote(plan: RunContext['plan']): string {
  const record = lastRecordOf(plan);
  const { live } = plan;
  if (!record) return 'No build of this database made the SDK; generating it.';
  if (!record.steps.codegen) return "The last build didn't finish the SDK; generating it.";
  if (sdkMoved(record, live))
    return 'The database changed since the last build; generating the SDK again.';
  return "The SDK on disk wasn't made for this database; generating it again.";
}

/** Generates the SDK from the database the schema step left, and stamps the record with it. */
export async function codegenPhase(
  run: RunContext,
  { ledger, model }: Pick<BuiltSchema, 'ledger' | 'model'>,
  note: Note,
): Promise<void> {
  // Nothing changed in the database since the last codegen, so the SDK is the
  // same, and keeps the stamp of the database it was made from.
  if (keepsSdk(run.plan)) {
    note('The schema is unchanged; kept the SDK.');
    noteActivity({ kind: 'fact', label: 'Kept the SDK: the schema is unchanged' });
    return;
  }
  if (prevOf(run.plan) && run.plan.delta.uiOnly) note(sdkAgainNote(run.plan));
  const result = await retryTransientOnce(
    async () => {
      const r = await runCodegenTool.execute({}, toolCtx(run));
      if (!r.details.success && isNotReady(r.details.message)) throw new Error(r.details.message);
      return r;
    },
    { note, signal: run.signal },
  );
  if (!result.details.success) throw new Error(result.details.message);
  await ledger.update({
    steps: { codegen: true },
    sdk: { hash: model.hash, meta: model.metaDigest },
  });
}

/** Adds the plan's sample rows as the owner; returns the tables it left as the database had them. */
export async function seedPhase(
  run: RunContext,
  { tables, model, ledger, session }: BuiltSchema & { session: OwnerSession },
  note: Note,
): Promise<SkippedSeed[]> {
  const { seeded, skipped } = await seedStep({
    tables,
    model,
    ledger,
    session,
    rules: run.rules,
    spec: run.spec,
    plan: run.plan,
    signal: run.signal,
    note,
  });
  const events = getFastAppHost().events;
  for (const table of seeded)
    events?.dbChanged({ kind: 'records', tableName: table, cwd: run.cwd });
  return skipped;
}
