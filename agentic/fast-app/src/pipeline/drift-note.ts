// What the desktop tells the agent about the project's database outside a
// plan_app call: the hidden notes before a chat's prompts
// (app-database-hook.ts), and verify_app's lines about changes the app's SDK
// and screens don't have yet. Like result-text.ts, each string is a prompt
// contract: change one only on purpose.
//
// Pure.

import type { ReadOnlyItem } from '../app-spec/live-spec-fields';
import { type OutsideChange, outsideLine } from '../app-spec/schema-drift';
import { keptOutLine } from './drift-text';
import type { GenResource } from './gen';
import type { ViewState } from './view-file';
import type { ViewSync } from './view-sync';

const NOTE = '[Desktop check]';

const theDatabase = (name: string | undefined) =>
  `This project's database${name ? ` ${name}` : ''}`;

const changeLines = (outside: readonly OutsideChange[]) =>
  outside.map((change) => `- ${outsideLine(change)}`).join('\n');

const joined = (lines: readonly string[]) => lines.filter(Boolean).join('\n');

// The notes inform: the agent acts on them only when the user asks for a change.
const PLAN_WHEN_ASKED =
  "The SDK and the screens don't have these changes yet; plan_app with app-spec.json as it is (or with the user's change on top) brings them in. Nothing needs doing now: call plan_app only when the user asks for a change to the app, or reports an error on these tables. Don't undo these changes unless the user asks.";

const SPEC_REWRITTEN = `.constructive/app-spec.json was written again and matches the database, so read it again before you next call plan_app. ${PLAN_WHEN_ASKED}`;

function unavailableNote(state: Extract<ViewSync, { kind: 'unavailable' }>['database']) {
  switch (state.kind) {
  case 'missing':
    return `${NOTE} ${theDatabase(state.name)} is gone (deleted, or access to it was lost). Don't use the schema or record tools. When the user asks for a change to the app, or to get it back, call plan_app with .constructive/app-spec.json as it is: the card asks the user to approve a new database, and the old rows are gone.`;
  case 'suspended':
    return `${NOTE} ${theDatabase(state.name)} is suspended by the backend; its data still exists. Don't provision a database or use the schema tools; tell the user.`;
  case 'other-account':
    return `${NOTE} ${theDatabase(state.name)} belongs to another account than the signed-in one, so this account can't see it; it isn't gone. Don't provision a database or use the schema tools. Tell the user to sign in to Constructive with the account that built this app.`;
  default:
    // A backend that didn't answer says nothing about the database; plan_app checks again.
    return null;
  }
}

function driftNote(outside: readonly OutsideChange[], readOnly: readonly ReadOnlyItem[]): string {
  return joined([
    `${NOTE} This app's database changed outside the app since its last build:`,
    changeLines(outside),
    SPEC_REWRITTEN,
    keptOutLine(readOnly),
  ]);
}

function adoptedNote(
  tables: number,
  outside: readonly OutsideChange[],
  readOnly: readonly ReadOnlyItem[],
): string {
  return joined([
    `${NOTE} plan_app has no record of building this project's database, so the desktop wrote .constructive/app-spec.json from the database (${tables} ${tables === 1 ? 'table' : 'tables'}). When the user asks for a change to the app's data or screens, read it first, make their change on top of it, keep what you don't change, and call plan_app with the whole spec. Sample rows go only into tables that have no rows yet.`,
    outside.length
      ? `Changed outside the app since then:\n${changeLines(outside)}\n${PLAN_WHEN_ASKED}`
      : '',
    keptOutLine(readOnly),
  ]);
}

/**
 * The note for the agent before a chat's first prompt, from the check of the
 * project's database; null when there is nothing to say. Outside changes are
 * named until a build takes them in, since until then the SDK and the screens
 * predate them.
 */
export function driftNoteText(sync: ViewSync): string | null {
  switch (sync.kind) {
  case 'unavailable':
    return unavailableNote(sync.database);
  case 'adopted':
    return adoptedNote(sync.model.tables.length, [], sync.start.view.readOnly);
  case 'current':
  case 'refreshed': {
    const { outside } = sync.state;
    const { record, view } = sync.start;
    if (!record) return adoptedNote(sync.model.tables.length, outside, view.readOnly);
    return outside.length ? driftNote(outside, view.readOnly) : null;
  }
  default:
    return null;
  }
}

/**
 * The note before a later prompt of a chat, from view.json alone: the
 * outside changes it lists that it didn't list when the chat last heard
 * (`heard`), after another chat or the desktop's background check wrote
 * app-spec.json again. Null when there are none, a build's own changes
 * included.
 */
export function viewChangeNoteText(heard: ViewState | null, now: ViewState | null): string | null {
  if (!now) return null;
  const known = heard?.databaseId === now.databaseId ? heard.outside : [];
  const told = new Set(known.map(outsideLine));
  const fresh = now.outside.filter((change) => !told.has(outsideLine(change)));
  if (!fresh.length) return null;
  return joined([
    `${NOTE} Since earlier in this chat, the desktop found more changes made to this app's database outside the app:`,
    changeLines(fresh),
    SPEC_REWRITTEN,
  ]);
}

/** verify_app's lines on what the app doesn't have yet: outside changes, and screens it didn't check. */
export function verifyDriftLines(
  outside: readonly OutsideChange[],
  gone: readonly Pick<GenResource, 'name' | 'route'>[],
): string[] {
  const lines: string[] = [];
  if (outside.length) {
    lines.push(
      `The database changed outside the app since the last build (${outside.map(outsideLine).join('; ')}); app-spec.json was refreshed. If a check fails on these names, call plan_app with app-spec.json as it is to regenerate the SDK and the screens.`,
    );
  }
  if (gone.length) {
    lines.push(
      `Not checked: the screens of ${gone.map((r) => `${r.name} (${r.route})`).join(', ')}, whose tables are no longer in the database. plan_app with app-spec.json as it is removes them.`,
    );
  }
  return lines;
}
