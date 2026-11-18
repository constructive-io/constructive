// The sample rows a build inserted, kept by id so they follow a rename made
// outside the app: a column by its field id (`meta:<name>` for one added with
// SQL), a reference as "@#<table id>[i]". Decoded against the live model, a
// row loses the columns that are gone and the references into tables that are gone.

import { columnKey, columnNamed, type LiveModel, tableNamed, tableWithId } from './live-model';
import { linkKey } from './names';
import { parseSeedRef } from './seed-refs';
import type { SeedRow } from './types';

/** By table id: the rows that landed, columns by field id, and their ids (null where the database kept a row). */
export type SeededById = Record<
  string,
  { rows: Array<Record<string, unknown>>; ids: Array<string | null> }
>;

const ID_REF = /^@#(.+)\[(\d+)\]$/;

/** A table's landed rows by id, or null when the model has no such table. */
export function encodeLanded(
  table: string,
  rows: readonly SeedRow[],
  model: LiveModel,
): { id: string; rows: Array<Record<string, unknown>> } | null {
  const live = tableNamed(model, table);
  if (!live) return null;
  // A link row may name a key by the table it points at (`volunteers`).
  const columnFor = (name: string) =>
    columnNamed(live, name) ?? live.columns.find((c) => c.key && c.name === linkKey(name));
  const encode = (value: unknown) => {
    const ref = parseSeedRef(value);
    const target = ref && tableNamed(model, ref.table);
    return target ? `@#${target.id}[${ref.index}]` : value;
  };
  return {
    id: live.id,
    rows: rows.map((row) =>
      Object.fromEntries(
        Object.entries(row).flatMap(([name, value]) => {
          const column = columnFor(name);
          return column ? [[columnKey(column), encode(value)]] : [];
        }),
      ),
    ),
  };
}

const GONE = Symbol('gone');

/** The landed rows by table name as the database has them now, with their ids. */
export function decodeLanded(
  seeded: SeededById,
  model: LiveModel,
): { seed: Record<string, SeedRow[]>; ids: Record<string, Array<string | null>> } {
  const decode = (value: unknown) => {
    const match = typeof value === 'string' ? value.match(ID_REF) : null;
    if (!match) return value;
    const target = tableWithId(model, match[1]);
    return target ? `@${target.name}[${match[2]}]` : GONE;
  };
  const seed: Record<string, SeedRow[]> = {};
  const ids: Record<string, Array<string | null>> = {};
  for (const [id, landed] of Object.entries(seeded)) {
    const table = tableWithId(model, id);
    if (!table) continue;
    const names = new Map(table.columns.map((c) => [columnKey(c), c.name]));
    seed[table.name] = landed.rows.map((row) =>
      Object.fromEntries(
        Object.entries(row).flatMap(([field, value]) => {
          const name = names.get(field);
          const decoded = name === undefined ? GONE : decode(value);
          return decoded === GONE ? [] : [[name, decoded]];
        }),
      ),
    );
    ids[table.name] = [...landed.ids];
  }
  return { seed, ids };
}
