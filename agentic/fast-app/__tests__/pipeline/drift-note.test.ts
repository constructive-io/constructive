import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import type { AppSpec } from '../../src/app-spec/types';
import type { BuildRecord } from '../../src/pipeline/build-record';
import type { DatabaseState } from '../../src/pipeline/db-check';
import { driftNoteText, viewChangeNoteText } from '../../src/pipeline/drift-note';
import { markSeen, readViewState, readViewText, writeView } from '../../src/pipeline/view-file';
import { type SyncDeps, syncView } from '../../src/pipeline/view-sync';
import {
  dropTable,
  liveModelOf,
  renameColumn,
} from '../app-spec/__fixtures__/live-model-of';
import { builtRecord } from './__fixtures__/built-record';

// jest runs this file as CommonJS: its own URL, for the relative reads below.
const moduleUrl = pathToFileURL(__filename).href;

// Before a chat's prompts, the desktop tells the agent, unseen by the user,
// what it would otherwise learn only from a failing plan_app or a broken
// screen: the first prompt checks the project's database, a later one reads
// what other chats found since.

const built: AppSpec = JSON.parse(
  readFileSync(
    new URL('../app-spec/__fixtures__/food-bank.spec.json', moduleUrl),
    'utf8',
  ),
);

/** A built project on the real view files; the test moves its database. */
function project() {
  const dir = mkdtempSync(path.join(tmpdir(), 'drift-note-'));
  const now = {
    model: liveModelOf(built),
    record: null as BuildRecord | null,
    database: null as DatabaseState | null,
  };
  now.record = builtRecord(built, now.model);
  const deps: SyncDeps = {
    check: async () =>
      now.database ?? {
        kind: 'found',
        databaseId: now.model.databaseId,
        name: 'food-bank',
        hash: now.model.hash,
      },
    readModel: async () => now.model,
    readRecord: async () => (now.record ? { kind: 'ok', record: now.record } : { kind: 'none' }),
    readState: readViewState,
    readViewText,
    writeView,
  };
  const note = async () => driftNoteText(await syncView(dir, { fallbackName: 'food-bank' }, deps));
  return { dir, now, note };
}

test("a chat's first prompt hears what changed outside the app until a build takes it in", async () => {
  const { dir, now, note } = project();
  assert.equal(await note(), null);

  // In the dashboard: a column renamed and a table deleted.
  now.model = dropTable(
    renameColumn(now.model, 'volunteers', 'phone', 'mobile'),
    'availability_notes',
  );
  const first = await note();
  assert.ok(first);
  assert.match(first, /^\[Desktop check\] This app's database changed outside the app/);
  assert.ok(first.includes('- volunteers.phone was renamed to mobile'));
  assert.ok(first.includes('- the table availability_notes was deleted'));
  // It informs: plan_app waits until the user asks for a change.
  assert.ok(first.includes('read it again before you next call plan_app'));
  assert.ok(first.includes('Nothing needs doing now: call plan_app only when the user asks'));

  // The next chat, with app-spec.json refreshed already: the SDK and the screens still lack them.
  assert.equal(await note(), first);

  // A build's schema step takes its look at the database: nothing left to say.
  await markSeen(dir, now.model);
  now.record = builtRecord(built, now.model);
  assert.equal(await note(), null);
});

test('an app adopted from its database hears outside changes as information too', async () => {
  const { now, note } = project();
  now.record = null;
  assert.match((await note()) ?? '', /no record of building this project's database/);

  now.model = renameColumn(now.model, 'volunteers', 'phone', 'mobile');
  const text = await note();
  assert.ok(text?.includes('- volunteers.phone was renamed to mobile'));
  assert.ok(text?.includes('Nothing needs doing now: call plan_app only when the user asks'));
});

test("a gone, suspended or other account's database gets a note; an unreachable backend none", async () => {
  const { now, note } = project();
  const cases: Array<[DatabaseState, RegExp | null]> = [
    [
      { kind: 'missing', databaseId: 'db-1', name: 'food-bank' },
      /database food-bank is gone .*call plan_app with \.constructive\/app-spec\.json as it is/,
    ],
    [
      { kind: 'suspended', databaseId: 'db-1', name: 'food-bank' },
      /database food-bank is suspended by the backend; its data still exists\. Don't provision/,
    ],
    [
      { kind: 'other-account', databaseId: 'db-1', name: 'food-bank' },
      /belongs to another account .* it isn't gone\. Don't provision/,
    ],
    [{ kind: 'unreachable', cause: 'network', detail: 'fetch failed' }, null],
  ];
  for (const [state, expected] of cases) {
    now.database = state;
    const text = await note();
    if (expected) assert.match(text ?? '', expected, state.kind);
    else assert.equal(text, null, state.kind);
  }
});

test('a chat that already saw the view gets a note only when the view changed since', async () => {
  const { dir, now, note } = project();
  // Chat B's first prompt: the database is as built.
  assert.equal(await note(), null);
  let heard = await readViewState(dir);
  const nextPrompt = async () => {
    const view = await readViewState(dir);
    const text = viewChangeNoteText(heard, view);
    heard = view;
    return text;
  };
  assert.equal(await nextPrompt(), null);

  // In the dashboard, then chat A's first prompt pulls it in.
  now.model = renameColumn(now.model, 'volunteers', 'phone', 'mobile');
  assert.ok(await note());
  const renamed = await nextPrompt();
  assert.ok(renamed);
  assert.match(renamed, /^\[Desktop check\] Since earlier in this chat/);
  assert.ok(renamed.includes('- volunteers.phone was renamed to mobile'));
  assert.ok(renamed.includes('read it again before you next call plan_app'));
  assert.equal(await nextPrompt(), null);

  // Another change pulled in: only it is new to chat B.
  now.model = dropTable(now.model, 'availability_notes');
  await note();
  const dropped = await nextPrompt();
  assert.ok(dropped?.includes('- the table availability_notes was deleted'));
  assert.ok(!dropped?.includes('phone'));

  // A build takes them in: nothing new to hear.
  await markSeen(dir, now.model);
  assert.equal(await nextPrompt(), null);
});
