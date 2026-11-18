// plan_app: the model's one call on the fast app path. The AppSpec is the
// brief and the single approval card; once approved, the pipeline builds,
// verifies and commits without another model turn. Before the card it reads
// the database: one that changed outside the app since app-spec.json was
// written, or that no build record describes, gets the file written again,
// and the agent starts from that.

import path from 'node:path';

import type { ExtensionAPI } from '@earendil-works/pi-coding-agent';

import { validateAppSpec, type ValidateOptions } from '../app-spec';
import { entityTableColumns } from '../app-spec/live-model';
import { type BuildPlan, planBuild, prevOf } from '../pipeline/build-plan';
import type { DatabaseState } from '../pipeline/db-check';
import { liveDeps } from '../pipeline/db-port';
import { adoptedViewText, databaseRefusal, staleViewText } from '../pipeline/drift-text';
import { getFastAppHost } from '../pipeline/host';
import { buildProgress } from '../pipeline/pipeline';
import { describePlan } from '../pipeline/plan-summary';
import type { BuildProgress } from '../pipeline/progress';
import { projectDatabaseName } from '../pipeline/project-env';
import { offersRebuild } from '../pipeline/reprovision';
import { declinedText, invalidSpecText, NOT_SIGNED_IN } from '../pipeline/result-text';
import { syncView } from '../pipeline/view-sync';
import {
  type Account,
  approveAndBuild,
  cardAccount,
  type CardOutcome,
  type PlanAppCall,
} from './approve-build';
import {
  type BuildResult,
  type BuildSlot,
  phaseReporter,
  textResult,
  withBuildSlot,
} from './context';
import { rebuildApp } from './rebuild-app';
import {
  APP_SPEC_SCHEMA_FILE_IN_PROJECT,
  appSpecParameters,
  errorLines,
  loadAppSpecSchema,
  withSpecHints,
} from './schema';
import { specScopeErrors, specScopeTree } from './scope-check';

// The description stays the same for every session: Anthropic binds a turn's
// thinking to the tool list, so a description that followed the template's
// schema would break every chat opened again after the template changed. The
// schema itself is a file in each project's app.
const DESCRIPTION = [
  'Build a working CRUD app from an AppSpec in one call: the user approves one card (and types their password), then the desktop provisions the database, builds the schema (a curated blueprint or your custom entities), generates the SDK, seeds the rows, generates every screen, starts the dev server in the Preview, verifies (types, every route, create/edit/delete on every table) and commits.',
  `The parameters are one AppSpec. Read ${APP_SPEC_SCHEMA_FILE_IN_PROJECT} first: it is the exact AppSpec JSON Schema (draft 2020-12), with what each field means. Errors come back as "<path>: <what to change>".`,
  'Call it once, after you understood what the user wants. Do not provision, apply blueprints, run codegen or insert records yourself on this path.',
  'When people will work together in the app (teams, organizations, shared rooms), call describe_scopes first and opt into the screens it lists in `ui`; a single-user app needs none.',
  'On failure the result names the phase, the cause and the fix: fix it, then call verify_app (for app-code failures) or plan_app again (for spec or backend failures, as the result says).',
].join(' ');

export function registerPlanAppTool(pi: ExtensionAPI): void {
  pi.registerTool({
    name: 'plan_app',
    label: 'Plan app',
    description: DESCRIPTION,
    promptSnippet:
      'plan_app: one call that builds, verifies and commits a CRUD app from an AppSpec (one approval card).',
    parameters: appSpecParameters(),
    executionMode: 'sequential',
    async execute(toolCallId, params, signal, onUpdate, ctx) {
      const progress = buildProgress(phaseReporter(pi, toolCallId, onUpdate));
      return withBuildSlot(ctx, progress, 'plan_app', (slot) =>
        buildApp({ toolCallId, params, signal, ctx }, slot, progress),
      );
    },
  });
}

/** Ends plan_app before the card on a database it can't use or read. */
function databaseUnavailable(progress: BuildProgress, database: DatabaseState): BuildResult {
  const refusal = databaseRefusal('plan_app', database);
  progress.enter({ stage: 'unavailable', errors: [refusal.line] });
  return textResult(refusal.text, progress.details);
}

async function buildApp(
  call: PlanAppCall,
  slot: BuildSlot,
  progress: BuildProgress,
): Promise<BuildResult> {
  const { cwd } = call.ctx;
  const signedIn = getFastAppHost().account();
  if (!signedIn?.email || !signedIn.userId) {
    progress.fail('approval', 'Not signed in.', 'Ask the user to sign in to Constructive.');
    return textResult(NOT_SIGNED_IN, progress.details);
  }
  const account: Account = { email: signedIn.email, userId: signedIn.userId };

  // A bound database that is gone, suspended or can't be checked stops the
  // build before the card; an unbound project is a first build. One that
  // changed outside the app since app-spec.json was written gets the file
  // written again, and the agent's spec, made from the old one, isn't planned.
  const sync = await syncView(
    cwd,
    { projectId: slot.project?.id, fallbackName: path.basename(cwd) },
    liveDeps,
  );
  if (sync.kind === 'unavailable') {
    // A gone database is offered back, rebuilt in a new one. A suspended one,
    // or another account's, isn't gone, and is never replaced.
    if (offersRebuild(sync.database)) {
      return rebuildApp(call, slot, progress, sync.database, account);
    }
    return databaseUnavailable(progress, sync.database);
  }
  if (sync.kind === 'adopted') {
    const { view } = sync.start;
    progress.set({ name: view.spec.name });
    progress.enter({ stage: 'refreshed', adopted: true });
    return textResult(adoptedViewText(sync.model.tables.length, view.readOnly), progress.details);
  }
  if (sync.kind === 'refreshed') {
    const { view } = sync.start;
    progress.set({ name: view.spec.name });
    progress.enter({ stage: 'refreshed', outside: sync.changes });
    return textResult(staleViewText(sync.changes, view.readOnly), progress.details);
  }

  const schema = await loadAppSpecSchema(cwd, slot.services);
  // The rows that landed are the database's now: a column made required
  // outside the app doesn't make them invalid.
  const options: ValidateOptions = {
    ...(sync.kind === 'current' && { landed: sync.start.view.landed }),
    // Keys and links may point at the entity types' tables, which the spec doesn't
    // declare, and a row may set their columns (an entity's name).
    ...(sync.kind !== 'unbound' && { entityTables: entityTableColumns(sync.model) }),
  };
  const validation = validateAppSpec(call.params, schema, options);
  if ('errors' in validation) {
    const errors = errorLines(validation.errors);
    progress.enter({ stage: 'invalid', errors });
    return textResult(invalidSpecText(errors), progress.details);
  }
  progress.set({ name: validation.spec.name });

  // The opt-in scope screens must name scopes the database has (or the first
  // build's blueprint will add), before the card asks for anything.
  const scopes = await specScopeTree(
    cwd,
    validation.spec,
    sync.kind === 'unbound' ? 'none' : sync.kind === 'empty' ? 'empty' : 'built',
  );
  if (scopes.kind === 'unreachable') return databaseUnavailable(progress, scopes);
  const scopeErrors = specScopeErrors(validation.spec, validation.model, scopes.tree);
  if (scopeErrors.length) {
    const errors = errorLines(scopeErrors);
    progress.enter({ stage: 'invalid', errors });
    return textResult(invalidSpecText(errors), progress.details);
  }

  // A follow-up on a built app applies only its difference from the database;
  // one that plan_app can't apply stops here, before the card.
  const outcome = await planBuild(
    cwd,
    withSpecHints(validation.spec, schema, options, scopes.tree),
    sync,
    scopes.tree,
  );
  if (outcome.kind === 'refused') {
    progress.enter({ stage: 'invalid', errors: [outcome.text] });
    return textResult(outcome.text, progress.details);
  }
  const card = await askToBuild(call, slot, progress, outcome.plan, account);
  if (card.kind === 'declined') return textResult(declinedText(card.reason), progress.details);
  return textResult(card.result.text, card.result.details);
}

/** The plan card, with the password field; once approved, the build. */
async function askToBuild(
  call: PlanAppCall,
  slot: BuildSlot,
  progress: BuildProgress,
  plan: BuildPlan,
  account: Account,
): Promise<CardOutcome> {
  const database = await projectDatabaseName(call.ctx.cwd);
  const line = await cardAccount(slot, account);
  const prompt = describePlan(plan, {
    project: slot.project?.name ?? path.basename(call.ctx.cwd),
    databaseName: database.name,
    databaseBound: database.bound,
    account: line,
  });
  // As the card's database row says it: a follow-up, or a project whose .env names its database.
  const existing = prevOf(plan) !== null || database.bound;
  // The card draws the plan; the message is the title, as no card shows it.
  const title = `${prevOf(plan) ? 'Update' : 'Build'} ${plan.spec.name}`;
  return approveAndBuild(call, slot, progress, plan, {
    account,
    // Only a follow-up's card lists the changes the user can tick.
    destructive: (prompt.changes ? plan.delta.destructive : []).map((change) => ({
      id: change.id,
      ...(change.requires ? { requires: change.requires } : {}),
    })),
    stage: { stage: 'approval', ...(existing && { existingDatabase: true as const }) },
    request: { title, message: title, card: { kind: 'app-plan', plan: prompt } },
    built: prompt,
  });
}
