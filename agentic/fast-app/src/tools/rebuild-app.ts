// plan_app on a project whose database is gone. Instead of refusing, it offers
// to rebuild the app in a new database from .constructive/app-spec.json, the
// last spec the desktop rendered from the old one, on a card of its own that
// says the old rows are gone and what app-spec.json can't bring back. Once
// approved, the pipeline builds that spec from nothing, and its provision step
// swaps the gone database for the new one (reprovision.ts).

import path from 'node:path';

import { type AppSpec, validateAppSpec } from '../app-spec';
import type { EntityTypeSnapshot } from '../app-spec/schema-drift';
import {
  recordedScopes,
  type ScopeInfo,
  withPlannedScopes,
} from '../app-spec/scope-tree';
import type { AppReprovisionPrompt } from '../pipeline/app-plan';
import { readBuildRecord } from '../pipeline/build-record';
import {
  databaseRefusal,
  noViewToRebuildText,
  rebuildDeclinedText,
  rebuiltText,
} from '../pipeline/drift-text';
import { describePlan } from '../pipeline/plan-summary';
import type { BuildProgress } from '../pipeline/progress';
import { databaseNameFor, pendingDatabaseName } from '../pipeline/project-env';
import {
  describeRebuild,
  type GoneDatabase,
  notRebuiltOf,
  rebuildPlan,
  recordedEntityTypes,
} from '../pipeline/reprovision';
import { checkedText } from '../pipeline/result-text';
import { readViewState, readViewText, type ViewState } from '../pipeline/view-file';
import { type Account, approveAndBuild, cardAccount, type PlanAppCall } from './approve-build';
import { type BuildResult, type BuildSlot, textResult } from './context';
import { errorLines, loadAppSpecSchema, withSpecHints } from './schema';
import { plannedTreeOf, specScopeErrors } from './scope-check';

// The new database never takes the gone one's name: the platform keeps a
// deleted database's addresses, so a database asked for under its name never
// finishes. A rebuild still provisioning keeps its name, so plan_app again
// picks up the same request.
async function rebuildDatabaseName(cwd: string): Promise<string> {
  const pending = await pendingDatabaseName(cwd);
  if (pending) return pending;
  const suffix = Math.random().toString(36).slice(2, 6);
  return `${databaseNameFor(path.basename(cwd)).slice(0, 44)}-${suffix}`;
}

// The spec to rebuild from, or why there is none: no file (errors undefined),
// or one that isn't a valid AppSpec.
async function specToRebuild(
  cwd: string,
  schema: Record<string, unknown>,
  state: ViewState | null,
  gone: GoneDatabase,
): Promise<
  { spec: AppSpec; entityTypes: EntityTypeSnapshot[]; tree: ScopeInfo[] } | { errors?: string[] }
> {
  const text = await readViewText(cwd);
  if (text === null) return {};
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    return { errors: ['.constructive/app-spec.json is not valid JSON'] };
  }
  // The spec's own entity types come back before its schema, so its keys,
  // panels and scope access may name them.
  const backend = (value as Partial<AppSpec> | null)?.backend;
  const entityTypes = backend ? recordedEntityTypes(state, gone, backend) : [];
  // Its app-spec.json lists the columns it seeds, so the names are enough.
  const options = {
    entityTables: new Map(entityTypes.map((type) => [type.table, new Set<string>()])),
  };
  const checked = validateAppSpec(value, schema, options);
  if ('errors' in checked) return { errors: errorLines(checked.errors) };
  const tree = withPlannedScopes(recordedScopes(entityTypes), plannedTreeOf(checked.spec));
  const scopeErrors = specScopeErrors(checked.spec, checked.model, tree);
  if (scopeErrors.length) return { errors: errorLines(scopeErrors) };
  return { spec: withSpecHints(checked.spec, schema, options, tree), entityTypes, tree };
}

/**
 * The rebuild card for a gone database, then the build. The agent's own spec
 * isn't built: the app comes back as app-spec.json has it, and the agent makes
 * the user's change after, on a database that is there.
 */
export async function rebuildApp(
  call: PlanAppCall,
  slot: BuildSlot,
  progress: BuildProgress,
  gone: GoneDatabase,
  account: Account,
): Promise<BuildResult> {
  const { cwd } = call.ctx;
  const state = await readViewState(cwd);
  const source = await specToRebuild(cwd, await loadAppSpecSchema(cwd, slot.services), state, gone);
  if (!('spec' in source)) {
    const line = databaseRefusal('plan_app', gone)?.line;
    progress.enter({ stage: 'unavailable', ...(line && { errors: [line] }) });
    return textResult(noViewToRebuildText(gone.name, source.errors), progress.details);
  }
  const { spec } = source;
  progress.set({ name: spec.name, rebuild: true });
  const databaseName = await rebuildDatabaseName(cwd);
  const outcome = rebuildPlan(spec, gone, databaseName, source.entityTypes, source.tree);
  if (outcome.kind === 'refused') {
    progress.enter({ stage: 'invalid', errors: [outcome.text] });
    return textResult(outcome.text, progress.details);
  }
  const { plan } = outcome;

  // The gone database's password was forgotten when the check found it gone,
  // so the card asks for it; a ticked box keeps it for the new database.
  const line = await cardAccount(slot, account);
  const project = slot.project?.name ?? path.basename(cwd);
  const prompt: AppReprovisionPrompt = {
    ...describeRebuild(
      spec,
      gone,
      notRebuiltOf(state, await readBuildRecord(cwd), gone, path.basename(cwd)),
      line,
      databaseName,
    ),
    project,
  };
  const { tables, seedRows } = prompt.rebuilds;
  const card = await approveAndBuild(call, slot, progress, plan, {
    account,
    destructive: [],
    stage: { stage: 'approval' },
    request: {
      title: `Rebuild ${prompt.name}`,
      message: `The database${prompt.oldDatabase.name ? ` ${prompt.oldDatabase.name}` : ''} is gone. Create ${prompt.newDatabaseName} and rebuild ${tables} tables, the screens and ${seedRows} sample rows from app-spec.json.`,
      card: { kind: 'app-reprovision', plan: prompt },
    },
    // The build card folds the rebuild as the first build of its new database.
    built: describePlan(plan, { project, databaseName, databaseBound: false, account: line }),
  });
  if (card.kind === 'declined') {
    return textResult(rebuildDeclinedText(gone.name, card.reason), progress.details);
  }
  const { result } = card;
  if (!result.ok) return textResult(result.text, result.details);
  const { details } = result;
  const text = rebuiltText({
    app: spec.name,
    oldName: gone.name,
    databaseName: details.databaseName ?? prompt.newDatabaseName,
    previewUrl: details.previewUrl,
    tables,
    seedRows: plan.delta.seed.rows,
    notRebuilt: prompt.notRebuilt,
    renderLine: checkedText(details),
  });
  return textResult(text, details);
}
