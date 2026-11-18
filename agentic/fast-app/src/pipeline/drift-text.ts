// What plan_app and verify_app tell the model when the project's database
// can't be used or changed outside the app, and what a failed provision step
// asks it to do. Like result-text.ts, each string is a prompt contract: change
// one only on purpose.

import type { ReadOnlyItem } from '../app-spec/live-spec-fields';
import { type OutsideChange, outsideLine } from '../app-spec/schema-drift';
import { DATABASE_LIMIT_MESSAGE, isDatabaseLimit } from './database-limit';
import type { DatabaseState } from './db-check';

type Tool = 'plan_app' | 'verify_app';
type Unreachable = Extract<DatabaseState, { kind: 'unreachable' }>;

const CANT: Record<Tool, string> = {
  plan_app: "plan_app can't build",
  verify_app: "verify_app can't check the app",
};

const theDatabase = (name: string | undefined) => `the database${name ? ` ${name}` : ''}`;

/** The way back for a gone database, which only plan_app offers. */
const REBUILD_HINT =
  'To get the app back, call plan_app with .constructive/app-spec.json as it is: it offers the user a rebuild in a new database, which they approve on a card; the old rows are gone.';

export const databaseGoneText = (tool: Tool, name?: string) =>
  `${CANT[tool]}: ${theDatabase(name)} of this project is gone (deleted, or access to it was lost). Nothing was changed. ${REBUILD_HINT} Don't provision a database or use the schema tools yourself.`;

export const databaseSuspendedText = (tool: Tool, name?: string) =>
  `${CANT[tool]}: the backend suspended access to ${theDatabase(name)} of this project. Its data still exists. Nothing was changed. Tell the user to resolve it with the platform; don't provision another database.`;

export const databaseOtherAccountText = (tool: Tool, name?: string) =>
  `${CANT[tool]}: ${theDatabase(name)} of this project belongs to another account than the signed-in one, so this account can't see it. It isn't gone. Nothing was changed. Tell the user to sign in to Constructive with the account that built this app to use it. Don't provision a database or use the schema tools.`;

export function backendUnreachableText(tool: Tool, state: Unreachable): string {
  const after = `Nothing was changed. This is not a missing database: don't provision. Ask the user to`;
  return state.cause === 'auth'
    ? `${tool} couldn't check this project's database: the backend didn't accept the signed-in account (${state.detail}). ${after} sign in to Constructive again, then call ${tool} again.`
    : `${tool} couldn't reach the Constructive backend (${state.detail}), so it can't tell what the database has. ${after} check the backend, then call ${tool} again.`;
}

/**
 * Why the tool stops before it does anything, for a database that can't be
 * used: `text` for the model, `line` for the card. Null when it can go on: the
 * database is found, or the project has none yet (a first build makes it).
 */
export function databaseRefusal(
  tool: Tool,
  state: DatabaseState,
): { text: string; line: string } | null {
  switch (state.kind) {
  case 'missing':
    return {
      text: databaseGoneText(tool, state.name),
      line: `${cap(theDatabase(state.name))} is gone: it was deleted, or access to it was lost.`,
    };
  case 'other-account':
    return {
      text: databaseOtherAccountText(tool, state.name),
      line: `${cap(theDatabase(state.name))} belongs to another account: sign in with the account that built it.`,
    };
  case 'suspended':
    return {
      text: databaseSuspendedText(tool, state.name),
      line: `${cap(theDatabase(state.name))} is suspended: access to it is on hold. Its data is kept.`,
    };
  case 'unreachable':
    return {
      text: backendUnreachableText(tool, state),
      line:
          state.cause === 'auth'
            ? "The backend didn't accept the signed-in account, so the database wasn't checked."
            : "Couldn't reach the Constructive backend to check the database.",
    };
  default:
    return null;
  }
}

const cap = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

const SIGN_IN = 'Ask the user to sign in to Constructive, then call plan_app again.';
const CHECK_BACKEND = 'Check that the Constructive backend is running, then call plan_app again.';

/** The fix for a provision step that failed, by db-tools' failure code. */
export function provisionFix(code: string | undefined, message?: string): string {
  if (isDatabaseLimit(code, message)) {
    return `${DATABASE_LIMIT_MESSAGE} Tell the user and don't retry or provision under another name.`;
  }
  switch (code) {
  case 'signed-out':
    return SIGN_IN;
  case 'db-missing':
    return `The project's database is gone (deleted, or access to it was lost). ${REBUILD_HINT} Don't provision a database yourself.`;
  case 'db-suspended':
    return "The backend suspended the project's database; its data still exists. Tell the user; don't provision another database.";
  case 'account-mismatch':
    return "The project's database belongs to another account than the signed-in one. Tell the user; don't provision a database yourself.";
  case 'provision-stuck':
    return "Tell the user the backend's provisioning is stuck. Don't provision under another name: that starts a second database.";
  case 'binding-not-saved':
  case 'env-write-failed':
    return 'Report this error to the user.';
  default:
    return CHECK_BACKEND;
  }
}

/** One thing app-spec.json leaves out, in the words the agent and the rebuild card read. */
export function readOnlyText(item: ReadOnlyItem): string {
  switch (item.kind) {
  case 'table':
    return `${item.table} (${item.reason})`;
  case 'column':
    return `${item.table}.${item.column} (${item.reason})`;
  case 'access':
    return `who sees the rows of ${item.table} (its own policies)`;
  case 'default':
    return `the default of ${item.table}.${item.column} (${item.sql})`;
  case 'curated-gone':
    return `${item.table} of the ${item.slug} blueprint (deleted outside the app)`;
  }
}

/** What the database has that app-spec.json leaves out, for the agent; empty when nothing is. */
export const keptOutLine = (readOnly: readonly ReadOnlyItem[]) =>
  readOnly.length
    ? `Kept out of app-spec.json, as they are: ${readOnly.map(readOnlyText).join('; ')}.`
    : '';

/** plan_app found the database changed since app-spec.json was written: it wrote the file again and planned nothing. */
export function staleViewText(
  changes: readonly OutsideChange[],
  readOnly: readonly ReadOnlyItem[],
): string {
  return [
    'The database changed outside this app since .constructive/app-spec.json was written, so plan_app planned nothing and the user saw no card.',
    changes.length ? `What changed:\n${changes.map((c) => `- ${outsideLine(c)}`).join('\n')}` : '',
    "plan_app keeps these changes; it never undoes them on its own. app-spec.json now matches the database. Read it again, make the user's change on top of it, and call plan_app with the whole spec. If the user wants one of these changes undone, change it in the spec like any other change.",
    keptOutLine(readOnly),
  ]
    .filter(Boolean)
    .join('\n');
}

/** No build record describes the database's tables: plan_app wrote app-spec.json from them and planned nothing. */
export function adoptedViewText(tables: number, readOnly: readonly ReadOnlyItem[]): string {
  return [
    `plan_app has no record of building this database, so it read the database and wrote .constructive/app-spec.json from it (${tables} ${tables === 1 ? 'table' : 'tables'}). Nothing was planned, and the user saw no card. Read it, make the user's change on top of it, keep what you don't change, and call plan_app again with the whole spec. Sample rows go only into tables that have no rows yet.`,
    keptOutLine(readOnly),
  ]
    .filter(Boolean)
    .join('\n');
}

/** A provision whose name belongs to another database of this account: never a second database. */
export const nameHeldText = (name: string, databaseId: string) => ({
  cause: `The name ${name} belongs to a database this account made earlier (ID ${databaseId}), which this project isn't bound to, so no database was made.`,
  fix: "Tell the user. Don't provision under another name: that makes a second database.",
});

/**
 * Why a rebuild's provision replaced nothing, by db-tools' failure code; null
 * for a failure any build can have.
 */
export function replaceRefusal(
  code: string | undefined,
  oldName: string | undefined,
): { cause: string; fix: string } | null {
  switch (code) {
  case 'binding-live':
    return {
      cause: `${cap(theDatabase(oldName))} is there again, so it wasn't replaced and nothing was built.`,
      fix: 'Call plan_app again: it builds on that database.',
    };
  case 'binding-changed':
    return {
      cause:
          'The project was bound to another database while the card was open, so nothing was replaced.',
      fix: 'Call plan_app again: it checks the database the project has now.',
    };
  case 'db-suspended':
    return {
      cause: `${cap(theDatabase(oldName))} is suspended now. Its data is kept, so it wasn't replaced.`,
      fix: "Tell the user to resolve the suspension with the platform; don't provision another database.",
    };
  default:
    return null;
  }
}

/** A first build bound the database of this account that held its name, and that database has an app already. */
export const heldDatabaseBuiltText = (name: string, tables: number) => ({
  cause: `The name ${name} belongs to a database this account made earlier, so the project is bound to it now. It has ${tables} app ${tables === 1 ? 'table' : 'tables'} already, so nothing was built on it.`,
  fix: 'Call plan_app again: it reads that database and writes .constructive/app-spec.json from it first.',
});

/** Why there is nothing to rebuild a gone database's app from; `errors` when app-spec.json isn't a valid AppSpec. */
export function noViewToRebuildText(name: string | undefined, errors?: readonly string[]): string {
  const gone = `plan_app can't build: ${theDatabase(name)} of this project is gone (deleted, or access to it was lost)`;
  const after = "Don't provision a database or use the schema tools yourself.";
  if (!errors) {
    return `${gone}, and the project has no .constructive/app-spec.json to rebuild the app from. Nothing was changed. Tell the user. ${after}`;
  }
  return [
    `${gone}, and .constructive/app-spec.json, which the app is rebuilt from, isn't a valid AppSpec. Nothing was changed.`,
    errors.map((e) => `- ${e}`).join('\n'),
    `Fix these in app-spec.json and keep the rest as it is, then call plan_app again: it offers the user the rebuild. ${after}`,
  ].join('\n');
}

export const rebuildDeclinedText = (name: string | undefined, reason: string | undefined) =>
  `The user didn't approve rebuilding the app in a new database${reason ? ` (${reason})` : ''}. Nothing was changed: ${theDatabase(name)} of this project is still gone. Tell the user; don't provision a database or use the schema tools yourself. If they change their mind, call plan_app again with .constructive/app-spec.json as it is.`;

export type RebuildOutcome = {
  app: string;
  oldName: string | undefined;
  databaseName: string;
  previewUrl: string | undefined;
  tables: number;
  seedRows: number;
  notRebuilt: readonly string[];
  /** What the checks covered and left unchecked (result-text.ts checkedText). */
  renderLine: string;
};

export function rebuiltText(r: RebuildOutcome): string {
  const tables = `${r.tables} ${r.tables === 1 ? 'table' : 'tables'}`;
  return [
    `Rebuilt "${r.app}" in a new database ${r.databaseName} from .constructive/app-spec.json, verified and committed: ${tables}, the screens and ${r.seedRows} sample rows.${r.previewUrl ? ` Preview: ${r.previewUrl}.` : ''}`,
    r.renderLine,
    `The rows people added to ${theDatabase(r.oldName)} are gone; only the sample rows came back.`,
    r.notRebuilt.length
      ? `Not rebuilt, since app-spec.json can't describe them: ${r.notRebuilt.join('; ')}.`
      : '',
    'Next: tell the user the app is back in a new database and its old rows are gone. If they asked for a change, read app-spec.json, make the change on top of it, and call plan_app again.',
  ]
    .filter(Boolean)
    .join('\n');
}
