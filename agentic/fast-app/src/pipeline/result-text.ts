// What plan_app and verify_app tell the model. Each string is a prompt
// contract the benchmarks were run against: change one only on purpose.

import type { AppSpecDelta, AppSpecError } from '../app-spec';
import { type OutsideChange, outsideLine } from '../app-spec/schema-drift';
import type { AppBuildDetails, PipelinePhase, RenderCheckSummary } from './app-plan';
import type { HomeState } from './build-commits';
import type { ResolvedPlan } from './build-plan';
import type { GenSummary } from './gen';
import type { PhaseError } from './progress';
import type { SkippedSeed } from './seed-step';
import type { VerifyResult } from './verify';
import { gapLines } from './verify-gaps';

const REPORT = 'Report this error to the user.';

/** What to do when a phase fails with an error of its own: per phase, as each phase said it. */
export const PHASE_FIX: Record<PipelinePhase, string> = {
  provision: REPORT,
  schema: REPORT,
  codegen:
    'Read the codegen error; if the schema is wrong, fix the AppSpec and call plan_app again.',
  seed: 'Fix the named seed rows in the AppSpec (column names, enum values, "@table[index]" references), then call plan_app again.',
  gen: 'Fix ui in the AppSpec if the generator names it; otherwise report the generator error.',
  dev: 'Fix the error the dev server printed, then call verify_app.',
  verify: REPORT,
  commit: 'Commit the app yourself with git; the build itself is done.',
};

/** verify_app's verify phase, for an error that isn't a failed check. */
export const VERIFY_ERROR_FIX = 'Fix the error, then call verify_app again.';

/** What verify says when the modules API can't list the entity types, before the CRUD smoke writes anything. */
export const ENTITY_TYPES_FIX =
  "The backend's modules API didn't list the database's entity types, so verify stopped before the CRUD check wrote any test rows. It isn't the app's code. Call verify_app again; if it fails the same way, tell the user the backend is failing.";

/** What verify_app says for a page whose call FAILED_CALL matches (request-failure.ts): the app's code can't fix it. */
export const BLOCKED_REQUEST_FIX =
  "The browser couldn't complete the pages' calls to the app's API: it blocked them (CORS) or they ended without an answer. Call app_doctor, which checks both from the app's address, then verify_app. Don't change the app's code for it.";

export const STOPPED = 'The user stopped the build.';

export const UNFINISHED_BUILD =
  'The last build stopped before it generated the screens, so there is nothing of it to verify yet.';
export const UNFINISHED_BUILD_FIX =
  'Call plan_app again with app-spec.json as it is: it finishes the build and verifies it.';

export const SERVICES_NOT_READY = 'The fast app services are not ready yet; try again in a moment.';

export const BUILD_RUNNING =
  'A build is already running in this project. Wait for it to finish, then try again.';

export const CHECK_RUNNING =
  'The database check is still running; the backend is slow. Try again in a moment.';

/** What plan_app and verify_app answer when templateAvailable() is false. */
export const APP_BUILDING_UNAVAILABLE =
  "App building isn't available in this build: it has no app template. Tell the user, and don't try to build the app another way.";

export const noChatText = (tool: string) =>
  `${tool} could not find its chat; ask the user to retry.`;

export const invalidSpecText = (errors: readonly string[]) =>
  `The AppSpec is invalid. Fix these and call plan_app again:\n${errors.map((e) => `- ${e}`).join('\n')}`;

export const NOT_SIGNED_IN =
  'The user is not signed in to Constructive. Ask them to sign in, then call plan_app again.';

export const declinedText = (reason: string | undefined) =>
  `The user did not approve the plan${reason ? ` (${reason})` : ''}. Nothing was built. Ask what they want to change.`;

/** Why plan_app can't apply this spec at all; checked before the card. */
export function refusalText(refused: readonly AppSpecError[]): string {
  return `plan_app can't apply this change to the built app. Nothing was changed:\n${refused
    .map((r) => `- ${r.path}: ${r.message}`)
    .join('\n')}`;
}

/** A record that can't be read says nothing of what the database has: a first build over it isn't safe. */
export const unreadableRecordText = (reason: string) =>
  `plan_app can't build here: this project's build record (.constructive/build.json) can't be read (${reason}), so plan_app can't tell what the database already has, and building as if it were new could add the schema and the sample rows twice. Nothing was changed. Ask the user to create a new project for this app.`;

/** One line for the model on what the render check covered, or that it didn't run. */
export function renderCheckLine(summary: RenderCheckSummary | undefined): string {
  if (!summary) return '';
  if (summary.skipped)
    return `Render check skipped: ${summary.skipped}; custom pages were NOT checked in a browser, so don't report them as checked.`;
  return `${summary.pages} signed-in page${summary.pages === 1 ? '' : 's'} loaded in a browser with no GraphQL error or uncaught exception.`;
}

/** What a verify that passed covered, and each gap it left, one line each. */
export const checkedText = (details: Pick<AppBuildDetails, 'renderCheck' | 'gaps'>): string =>
  [renderCheckLine(details.renderCheck), ...gapLines(details)].filter(Boolean).join('\n');

/** The step after a build: the generated app is data management, not the product yet. */
export const DESIGN_PASS_NEXT =
  'Next: the design pass. Call search_blocks for the app\'s primary screens (for example conversations, boards, schedules or documents) and install the blocks that fit. Make the domain screen the HOME page (`/`) and name its sidebar row, as "Use a domain block" in packages/app/AGENTS.md shows. A route and a nav entry alone are not enough. Keep the generated pages as the data management section. Then call verify_app, and report to the user only after verify_app passes. Don\'t call plan_app again for this app.';

export const HOME_NUDGE: Record<Exclude<HomeState, 'domain'>, string> = {
  generated:
    'Home is still the generated dashboard; make the domain screen the home page, then call verify_app again.',
  unnamed:
    'The home page changed, but its sidebar row is still the generated "Dashboard": name it with `homeNav = { label, icon }` in src/config/nav.ts, then call verify_app again.',
};

/** After a follow-up plan_app: its screens are regenerated and verified already. */
export const FOLLOW_UP_NEXT =
  "Next: if a hint above names a file the app owns, or one of the app's own pages should show the change, update it with write or edit, run pnpm lint:types in packages/app, then call verify_app, and report after it passes. Otherwise write the user a short report of what changed, naming anything left as it was. Don't call plan_app again for this change.";

const bullets = (items: readonly string[]) => items.map((item) => `- ${item}`).join('\n');

/** What gen said about the run. It tells about each file only on the run that brings the change. */
export function genNoteLines(
  summary: Pick<GenSummary, 'hints' | 'files' | 'warnings' | 'specGaps' | 'skippedTables'>,
): string[] {
  const { hints, files, specGaps, skippedTables } = summary;
  const gaps = new Set(specGaps.map((gap) => gap.message));
  const warnings = summary.warnings.filter((warning) => !gaps.has(warning));
  const lines: string[] = [];
  if (specGaps.length) {
    lines.push(
      `app-spec.json and the database's API disagree: the screen generator left out these names, which the API doesn't have:\n${bullets(specGaps.map((gap) => gap.message))}\nThe screens follow the API. The API can lag a schema change; plan_app again with app-spec.json as it is regenerates the screens once it shows them. If it still disagrees, tell the user.`,
    );
  }
  if (warnings.length) lines.push(`Screen generator warnings:\n${bullets(warnings)}`);
  if (hints.length) {
    lines.push(
      `Hints from the screen generator (each is shown only now):\n${bullets(hints.map((h) => h.message))}`,
    );
  }
  if (files.modified.length) {
    lines.push(
      `Generated files you edited, which gen left as they are: ${files.modified.join(', ')}.`,
    );
  }
  if (files.removed.length) {
    lines.push(
      `Generated files gen removed, because their table or screen is gone: ${files.removed.join(', ')}. Fix any file of the app that still imports them.`,
    );
  }
  if (skippedTables.length) {
    lines.push(
      `Tables with no screens: ${skippedTables.map((t) => `${t.table} (${t.reason})`).join(', ')}.`,
    );
  }
  return lines;
}

/** The sample rows a build left out, and why. */
export function skippedSeedText(skipped: readonly SkippedSeed[]): string {
  const tables = skipped.map(({ table, why, at }) => {
    if (why === 'points-at') return `${table} (its rows point at ${at})`;
    return `${table} (${why === 'has-rows' ? 'has rows' : "its rows couldn't be counted"})`;
  });
  return `Sample rows skipped: ${tables.join(', ')}.`;
}

const keptName = (removal: ResolvedPlan['kept'][number]) =>
  'entity' in removal ? removal.entity.name : `${removal.table}.${removal.field.name}`;

/** What the result tells the agent a follow-up did, line by line. */
export function followUpLines(
  delta: AppSpecDelta,
  resolved: ResolvedPlan,
  outside: readonly OutsideChange[] = [],
  seedSkipped: readonly SkippedSeed[] = [],
): string[] {
  const { ran, kept, left } = resolved;
  const lines: string[] = [];
  if (outside.length) {
    lines.push(
      `Changed outside this app since the last build, and kept: ${outside.map(outsideLine).join('; ')}.`,
    );
  }
  if (delta.additions.length)
    lines.push(`Added: ${delta.additions.map((a) => a.title).join('; ')}.`);
  if (ran.length)
    lines.push(`Removed or changed, as the user ticked: ${ran.map((c) => c.title).join('; ')}.`);
  const hidden = kept.filter((removal) => 'entity' in removal || removal.hide).map(keptName);
  const shown = kept.filter((removal) => 'field' in removal && !removal.hide).map(keptName);
  if (hidden.length) {
    lines.push(
      `Kept and hid ${hidden.join(', ')}, because the user didn't tick the delete; the data stays in the database. app-spec.json lists ${hidden.length === 1 ? 'it' : 'them'} again with \`hidden: true\`; keep that in later specs unless the user asks to delete the data.`,
    );
  }
  if (shown.length) {
    lines.push(
      `Kept ${shown.join(', ')}, because the user didn't tick the delete; the data stays in the database, and the screens still show ${shown.length === 1 ? 'it' : 'them'}, since new rows need a value. app-spec.json lists ${shown.length === 1 ? 'it' : 'them'} again.`,
    );
  }
  if (left.length) {
    lines.push(
      `Left as they are, because the user didn't tick them: ${left.map((c) => c.title).join('; ')}. The database keeps them, and app-spec.json shows them as the database has them.`,
    );
  }
  const inserted = delta.seed.rows - seedSkipped.reduce((sum, s) => sum + s.rows, 0);
  if (inserted) lines.push(`Inserted ${inserted} new sample rows.`);
  if (seedSkipped.length) lines.push(skippedSeedText(seedSkipped));
  if (delta.seed.kept.length) {
    lines.push(`The sample rows already in ${delta.seed.kept.join(', ')} stayed as they were.`);
  }
  if (delta.uiOnly) lines.push('The database had nothing to change; the screens were regenerated.');
  return lines;
}

const warningLines = (warnings: readonly string[]) =>
  warnings.length ? [`Translator warnings:\n${warnings.map((w) => `- ${w}`).join('\n')}`] : [];

const seconds = (ms: number | undefined) =>
  ms === undefined ? 'n/a' : `${(ms / 1000).toFixed(1)} s`;

export type BuildOutcome = {
  details: AppBuildDetails;
  delta: AppSpecDelta;
  resolved: ResolvedPlan;
  /** A follow-up on a built app; false for a first build. */
  update: boolean;
  /** What changed outside the app since the last build, which the build kept. */
  outside: readonly OutsideChange[];
  /** The new sample rows the seed left out. */
  seedSkipped: readonly SkippedSeed[];
  resources: number;
  genNotes: readonly string[];
};

/** A build that passed: a first build asks for the design pass, a follow-up for its own files. */
export function successText(outcome: BuildOutcome): string {
  const { details, delta, genNotes } = outcome;
  if (outcome.update) {
    return [
      `Updated "${details.name}", verified and committed.`,
      `Database: ${details.databaseName}. Preview: ${details.previewUrl}.`,
      checkedText(details),
      ...followUpLines(delta, outcome.resolved, outcome.outside, outcome.seedSkipped),
      ...warningLines(delta.warnings),
      ...genNotes,
      FOLLOW_UP_NEXT,
    ]
      .filter(Boolean)
      .join('\n');
  }
  const { resources } = outcome;
  const lines = [
    `Built "${details.name}": ${resources} resource${resources === 1 ? '' : 's'}, verified and committed.`,
    `Database: ${details.databaseName}. Preview: ${details.previewUrl}.`,
    `Backend ${seconds(details.timings?.backendMs)}, app ${seconds(details.timings?.appMs)}.`,
    checkedText(details),
  ].filter(Boolean);
  lines.push(...warningLines(delta.warnings), ...genNotes);
  // A closing "report now" here read as the end of the job, and the agent
  // skipped the design pass; the report waits for verify_app after it.
  lines.push(DESIGN_PASS_NEXT);
  return lines.join('\n');
}

export function failureText(
  failure: PhaseError,
  appDir: string,
  details: AppBuildDetails,
  genNotes: readonly string[],
): string {
  const devUrl = details.previewUrl;
  return [
    `plan_app failed in the ${failure.phase} phase.`,
    `Cause: ${failure.cause}`,
    `Fix: ${failure.fix}`,
    `The app is in ${appDir}.`,
    ...(devUrl ? [`Its dev server runs at ${devUrl} (verify_app keeps it running).`] : []),
    ...(details.renderCheck?.skipped ? [renderCheckLine(details.renderCheck)] : []),
    ...genNotes,
  ].join('\n');
}

/** What verify_app asks for after a pass: the design pass, the home page, or the report. */
export function verifyNextText(since: number | null, home: HomeState | null): string {
  // Nothing committed since the build means the app is still the generated
  // one, and a design pass that left the home page alone still lands the user
  // on the generated dashboard: say so instead of inviting the report.
  if (since === 0) return ` The design pass hasn't run yet. ${DESIGN_PASS_NEXT}`;
  if (home === 'generated' || home === 'unnamed') return ` ${HOME_NUDGE[home]}`;
  return ' Write the user a short report of what was built.';
}

export function verifyPassedText({
  result,
  render,
  committed,
  next,
}: {
  result: VerifyResult;
  render: string;
  committed: { sha: string; message: string } | null;
  next: string;
}): string {
  const { skipped } = result.crud;
  const skippedText = skipped.length
    ? ` (${skipped.length} skipped: ${skipped.map((s) => `${s.table}: ${s.reason}`).join('; ')})`
    : '';
  const commitText = committed
    ? ` Committed ${committed.sha.slice(0, 7)} ("${committed.message}").`
    : ' Nothing to commit.';
  return `verify_app passed: ${result.routes.length} routes return 200, CRUD passed on ${result.crud.tested.length} tables${skippedText}.${render ? ` ${render}` : ''}${commitText}${next}`;
}

export function verifyFailedText(failure: PhaseError, details: AppBuildDetails): string {
  const where = details.previewUrl ? `\nThe dev server runs at ${details.previewUrl}.` : '';
  const skipped = details.renderCheck?.skipped ? `\n${renderCheckLine(details.renderCheck)}` : '';
  return `verify_app failed in the ${failure.phase} phase.\nCause: ${failure.cause}\nFix: ${failure.fix}${where}${skipped}`;
}
