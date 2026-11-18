// The seed step of a build: the plan's new sample rows, level by level, with
// the build record updated as each level lands. The plan measured the spec's
// rows against the ones the record says landed, so a seed that failed partway
// is retried from where it stopped: rows that landed are never inserted twice,
// and rows that didn't are never taken as in. The record keeps the rows by
// table and field id, so they follow a rename made outside the app.
//
// A table the record knows no rows of gets its rows only while it is empty
// (plan.seedIfEmpty); a table that has rows is skipped, and so is a table
// whose rows point at a row that won't have an id. The record keeps skipped
// rows with null ids: the database kept its own, and no build inserts them.

import { type LiveModel, tableNamed } from '../app-spec/live-model';
import { encodeLanded } from '../app-spec/seed-ids';
import { seedPlan } from '../app-spec/seed-plan';
import { parseSeedRef } from '../app-spec/seed-refs';
import type { AppSpec, SeedRow } from '../app-spec/types';
import type { LiveMetaTable } from '../extensions/db-tools/live-meta';
import { type FieldRules, normalizeKey } from '../extensions/db-tools/live-meta-index';
import { type BuildPlan, prevOf } from './build-plan';
import { type BuildLedger, type BuildRecord, idsOf } from './build-record';
import { skippedSeedText } from './result-text';
import { runSeed } from './seed';
import { countRows } from './seed-empty';

export type SeedStepInput = {
  /** The spec the build applies. */
  spec: AppSpec;
  plan: BuildPlan;
  tables: readonly LiveMetaTable[];
  /** The database as the schema step left it. */
  model: LiveModel;
  session: { endpoint: string; token: string; userId: string };
  rules: FieldRules;
  ledger: BuildLedger;
  signal: AbortSignal;
  note: (text: string) => void;
};

/** A table whose new sample rows the step left out, and why. */
export type SkippedSeed = {
  table: string;
  rows: number;
  /** `points-at`: its rows point at `at`, whose rows have no ids. */
  why: 'has-rows' | 'uncounted' | 'points-at';
  at?: string;
};

export type SeedStepResult = {
  /** The tables that got rows. */
  seeded: string[];
  skipped: SkippedSeed[];
};

const rowsOf = (spec: AppSpec, table: string): SeedRow[] => spec.seed?.[table] ?? [];

// The new rows to leave out: tables that may hold rows of their own, then,
// until nothing changes, tables whose new rows point at a row with no id.
async function skippedTables(
  input: SeedStepInput,
  from: Readonly<Record<string, number>>,
  seeded: BuildRecord['seeded'],
): Promise<SkippedSeed[]> {
  const { spec, plan } = input;
  const fresh = Object.keys(from).filter((table) => rowsOf(spec, table).length > from[table]);
  const asked = plan.seedIfEmpty.filter((table) => fresh.includes(table));
  const counts = asked.length
    ? await countRows(asked, input.tables, input.session)
    : new Map<string, number | null>();
  const skipped = asked.flatMap<Omit<SkippedSeed, 'rows'>>((table) => {
    const count = counts.get(table);
    return count === 0 ? [] : [{ table, why: count === null ? 'uncounted' : 'has-rows' }];
  });
  const ids = idsOf(seeded, input.model);
  const left = (table: string) => skipped.some((s) => s.table === table);
  // A landed row has an id unless it was skipped; a new row of a skipped table has none.
  const withoutId = (table: string, index: number) =>
    left(table) || (index < (from[table] ?? 0) && !ids[normalizeKey(table)]?.[index]);
  for (let grew = true; grew; ) {
    grew = false;
    for (const table of fresh) {
      if (left(table)) continue;
      const target = rowsOf(spec, table)
        .slice(from[table])
        .flatMap((row) => Object.values(row).map(parseSeedRef))
        .find((ref) => ref && withoutId(ref.table, ref.index));
      if (!target) continue;
      skipped.push({ table, why: 'points-at', at: target.table });
      grew = true;
    }
  }
  return skipped.map((s) => ({ ...s, rows: rowsOf(spec, s.table).length - from[s.table] }));
}

/** Seeds the plan's new rows into the tables that take them. */
export async function seedStep(input: SeedStepInput): Promise<SeedStepResult> {
  const { spec, plan, ledger, model } = input;
  const seeded: BuildRecord['seeded'] = structuredClone(ledger.record.seeded);
  const skipped = await skippedTables(input, plan.delta.seed.from, seeded);
  // A skipped table has all its rows in: the database kept its own.
  const from = { ...plan.delta.seed.from };
  for (const { table } of skipped) from[table] = rowsOf(spec, table).length;
  const rows = plan.delta.seed.rows - skipped.reduce((sum, s) => sum + s.rows, 0);
  if (skipped.length) input.note(skippedSeedText(skipped));

  const idsIn = (table: string) => seeded[tableNamed(model, table)?.id ?? '']?.ids ?? [];
  // The spec's first rows of a table, as the record keeps them, with their ids.
  const land = (table: string, specRows: readonly SeedRow[], ids: Array<string | null>) => {
    const landed = encodeLanded(table, specRows, model);
    if (landed) seeded[landed.id] = { rows: landed.rows, ids };
  };
  // A table with nothing to insert has all its rows in, or rows the spec
  // changed while the database kept its own: either way the spec's rows are
  // what the next build measures against.
  const left = new Set(skipped.map((s) => s.table));
  for (const [table, start] of Object.entries(from)) {
    const specRows = rowsOf(spec, table);
    if (start < specRows.length) continue;
    const before = idsIn(table);
    land(table, specRows, left.has(table) ? specRows.map((_, i) => before[i] ?? null) : before);
  }
  await ledger.update({ seeded });
  if (rows === 0) {
    if (prevOf(plan) && !skipped.length) input.note('The sample rows are already in; kept them.');
    await ledger.update({ steps: { seeded: true } });
    return { seeded: [], skipped };
  }
  const steps = seedPlan(spec, input.tables, { from });
  await runSeed(steps, input.tables, input.session, {
    rules: input.rules,
    seeded: idsOf(seeded, model),
    signal: input.signal,
    onLevel: async (landed) => {
      for (const { table, from: first, ids } of landed) {
        const before = idsIn(table);
        land(table, rowsOf(spec, table).slice(0, first + ids.length), [
          ...Array.from({ length: first }, (_, i) => before[i] ?? null),
          ...ids,
        ]);
      }
      await ledger.update({ seeded });
    },
  });
  await ledger.update({ steps: { seeded: true } });
  return { seeded: steps.filter((step) => step.rows.length).map((step) => step.table), skipped };
}
