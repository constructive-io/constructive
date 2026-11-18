// The GraphQL API rebuilds its schema a moment after each schema change, so a
// `_meta` read or a codegen run right after the schema step can still see the
// schema from before it. These say what `_meta` must show once the step's
// calls have landed (new tables and columns there, dropped ones gone, a
// renamed column under its new name only), and poll `_meta` until it does.

import type { DeltaCall } from '../app-spec';
import type { LiveMetaTable } from '../extensions/db-tools/live-meta';
import { MetaIndex, normalizeKey } from '../extensions/db-tools/live-meta-index';
import { sleep as abortableSleep } from './transient';

type Note = (text: string) => void;

/** A table, or a column of one, that `_meta` must show (`present`) or must not. */
export type SchemaExpectation = { table: string; column?: string; present: boolean };

// A dropped column can stay in `_meta` for well over 30 s on a loaded backend.
export const META_WAIT_MS = 120_000;
export const META_POLL_MS = 2_000;

// A DataStatusField node makes its column (or rewrites the check of one that exists).
function statusColumns(nodes: readonly unknown[] = []): string[] {
  return nodes.flatMap((node) => {
    const { $type, data } = (node ?? {}) as { $type?: string; data?: { field_name?: unknown } };
    return $type === 'DataStatusField' && typeof data?.field_name === 'string'
      ? [data.field_name]
      : [];
  });
}

/** One key per table or column, whatever its spelling. */
export const expectationKey = ({ table, column }: Pick<SchemaExpectation, 'table' | 'column'>) =>
  column === undefined ? normalizeKey(table) : `${normalizeKey(table)}.${normalizeKey(column)}`;

/**
 * What `_meta` shows once the calls have run: what was expected `before`, then
 * each call's change, a later one on the same table or column winning. A call
 * that changes no name (a type, a default, a policy) adds nothing to wait for.
 */
export function expectedSchema(
  calls: readonly DeltaCall[],
  before: readonly SchemaExpectation[] = [],
): SchemaExpectation[] {
  const byKey = new Map<string, SchemaExpectation>();
  const expect = (table: string, column: string | undefined, present: boolean) => {
    const at = { table, ...(column === undefined ? {} : { column }) };
    byKey.set(expectationKey(at), { ...at, present });
  };
  for (const { table, column, present } of before) expect(table, column, present);
  for (const call of calls) {
    switch (call.tool) {
    case 'provision_blueprint': {
      const { tables, relations = [] } = call.params.definition;
      for (const table of tables) expect(table.table_name, undefined, true);
      // A key on a table that exists already is a new column of it.
      for (const relation of relations) expect(relation.source_table, relation.field_name, true);
      break;
    }
    case 'create_field':
      expect(call.params.table_name, call.params.field_name, true);
      break;
    case 'update_field':
      if (call.params.new_name) {
        expect(call.params.table_name, call.params.field_name, false);
        expect(call.params.table_name, call.params.new_name, true);
      }
      break;
    case 'delete_field':
      expect(call.params.table_name, call.params.field_name, false);
      break;
    case 'delete_table':
      expect(call.params.table_name, undefined, false);
      break;
    case 'secure_table_provision':
      for (const column of statusColumns(call.params.nodes))
        expect(call.params.table_name, column, true);
      break;
    }
  }
  return [...byKey.values()];
}

export const tablesPresent = (tables: readonly string[]): SchemaExpectation[] =>
  tables.map((table) => ({ table, present: true }));

// A field matches by its GraphQL name or, where the backend serves it, its SQL column.
const hasColumn = (table: LiveMetaTable, column: string) =>
  (table.fields ?? []).some((field) =>
    [field.name, field.columnName].some(
      (name) => name !== undefined && normalizeKey(name) === normalizeKey(column),
    ),
  );

/** The expectations `_meta` doesn't meet yet. */
export function unmetExpectations(
  tables: readonly LiveMetaTable[],
  expected: readonly SchemaExpectation[],
): SchemaExpectation[] {
  const index = new MetaIndex(tables);
  return expected.filter(({ table, column, present }) => {
    const live = index.find(table);
    // A column can't be there when its table isn't.
    const shown = column === undefined ? Boolean(live) : Boolean(live && hasColumn(live, column));
    return shown !== present;
  });
}

export const expectationName = ({ table, column }: SchemaExpectation): string =>
  column === undefined ? table : `${table}.${column}`;

/** The expectations `_meta` doesn't meet yet, each as a short phrase. */
export const unmetSchema = (
  tables: readonly LiveMetaTable[],
  expected: readonly SchemaExpectation[],
): string[] =>
  unmetExpectations(tables, expected).map((e) =>
    e.present ? expectationName(e) : `${expectationName(e)} removed`,
  );

export type MetaPoll = {
  fetch: () => Promise<LiveMetaTable[]>;
  /** What `_meta` doesn't show yet, as a phrase, or null once it does. */
  lacking: (tables: readonly LiveMetaTable[]) => string | null;
  note: Note;
  signal?: AbortSignal;
  sleep?: (ms: number) => Promise<void>;
  now?: () => number;
};

/**
 * Reads `_meta` every 2 s until nothing is lacking, for up to 2 min. `missing`
 * is what the last read still lacked when the time ran out or the build stopped.
 */
export async function waitForMeta({
  fetch,
  lacking,
  note,
  signal,
  // A stop ends the wait at once; the loop then returns what is still missing.
  sleep = (ms) => abortableSleep(ms, signal).catch(() => {}),
  now = Date.now,
}: MetaPoll): Promise<{ tables: LiveMetaTable[]; missing: string | null }> {
  const deadline = now() + META_WAIT_MS;
  for (;;) {
    const tables = await fetch();
    const missing = lacking(tables);
    if (!missing || signal?.aborted || now() > deadline) return { tables, missing };
    note(`Waiting for the API to show ${missing}…`);
    await sleep(META_POLL_MS);
  }
}
