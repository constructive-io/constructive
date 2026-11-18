// Orders an AppSpec's seed tables so each table comes after every table its
// "@<table>[<index>]" references point at. References stay as strings: the
// pipeline swaps them for the ids the earlier inserts return.

import type { LiveMetaTable } from '../extensions/db-tools/live-meta';
import { normalizeKey } from './contract/app-spec.types';
import { normalizeSeedRows, parseSeedRef } from './seed-refs';
import { withLocalOffset } from './seed-times';
import { type SpecModel, specModel } from './spec-model';
import type { AppSpec, SeedRow } from './types';

/**
 * One table's rows, snake_case columns, link keys renamed to their columns.
 * `from` is the index of the first row, when earlier rows were inserted by an
 * earlier build: a reference keeps its index across builds.
 */
export type SeedStep = { table: string; rows: SeedRow[]; from?: number };

export type SeedPlanOptions = {
  /** Per table, the index of the first row to insert; the rows before it are in already. */
  from?: Readonly<Record<string, number>>;
  /** The spec's model, when the caller built it already (validateAppSpec's). */
  model?: SpecModel;
};

export class SeedPlanError extends Error {
  readonly path: string;
  readonly reason: string;

  constructor(path: string, reason: string) {
    super(`${path}: ${reason}`);
    this.name = 'SeedPlanError';
    this.path = path;
    this.reason = reason;
  }
}

// `_meta` names a table by its GraphQL type. The SQL name is `tableName` on a
// current backend; an older one only shows it in the primary key constraint
// (`shifts_pkey`). `query.all` can be a naive plural (`entrys`).
function metaKeys(table: LiveMetaTable): string[] {
  const pk = table.constraints?.primaryKey?.name;
  const sql = pk?.endsWith('_pkey') ? pk.slice(0, -'_pkey'.length) : undefined;
  return [table.tableName, table.name, table.query?.all, table.inflection?.tableType, sql]
    .filter((name): name is string => Boolean(name))
    .map(normalizeKey);
}

// Foreign keys between seeded tables. They don't constrain the order the way a
// reference does (a literal id needs no earlier insert), but parents first is
// the order a reader expects when nothing else decides.
function foreignKeys(
  model: SpecModel,
  meta: readonly LiveMetaTable[] | undefined,
  tables: string[],
) {
  const edges = new Map<string, Set<string>>(tables.map((t) => [t, new Set<string>()]));
  const add = (from: string, to: string) => {
    if (from !== to) edges.get(from)?.add(to);
  };
  // The keys the spec declares: an entity's, a link's sides, the ones extend adds.
  for (const table of model.tables.values()) {
    for (const { key } of table.keys.values()) add(table.name, key.to);
  }
  if (meta?.length) {
    const seeded = new Map(tables.map((t) => [normalizeKey(t), t]));
    const byName = new Map(meta.map((table) => [table.name, table]));
    const seededAs = (table: LiveMetaTable | undefined) =>
      table
        ? metaKeys(table)
          .map((key) => seeded.get(key))
          .find(Boolean)
        : undefined;
    // A relation names its target by type name; fall back to a plain name match.
    const target = (name: string) => seededAs(byName.get(name)) ?? seeded.get(normalizeKey(name));
    for (const table of meta) {
      const from = seededAs(table);
      if (!from) continue;
      for (const rel of table.relations?.belongsTo ?? []) {
        const to = target(rel.references.name);
        if (to) add(from, to);
      }
      for (const fk of table.constraints?.foreignKey ?? []) {
        const to = target(fk.refTable.name);
        if (to) add(from, to);
      }
    }
  }
  return edges;
}

// Whether a column holds a date-time: the spec's field type for a column it
// declares (an entity's, or one it adds to a blueprint table; a key is a
// uuid), else its type in `_meta`, and null when neither says.
function timeColumn(model: SpecModel, meta: readonly LiveMetaTable[] | undefined, table: string) {
  const declared = model.tables.get(table);
  const metaTable = meta?.find((m) => metaKeys(m).includes(normalizeKey(table)));
  return (column: string): boolean | null => {
    const field = declared?.fields.get(column)?.field;
    if (field) return field.type === 'timestamp';
    if (declared?.keys.has(column)) return false;
    const metaField = metaTable?.fields?.find((f) => normalizeKey(f.name) === normalizeKey(column));
    if (metaField?.type) {
      return metaField.type.gqlType === 'Datetime' || metaField.type.pgType.startsWith('timestamp');
    }
    return null;
  };
}

// Naive seed times are the user's wall-clock time; see seed-times.ts.
function localTimes(
  model: SpecModel,
  meta: readonly LiveMetaTable[] | undefined,
  table: string,
  rows: SeedRow[],
): SeedRow[] {
  const isTime = timeColumn(model, meta, table);
  return rows.map((row) =>
    Object.fromEntries(
      Object.entries(row).map(([column, value]) => [
        column,
        typeof value === 'string' && isTime(column) !== false ? withLocalOffset(value) : value,
      ]),
    ),
  );
}

function references(table: string, rows: SeedRow[], tables: Set<string>): Set<string> {
  const deps = new Set<string>();
  rows.forEach((row, index) => {
    for (const [column, value] of Object.entries(row)) {
      const ref = parseSeedRef(value);
      if (!ref) continue;
      const where = `seed.${table}[${index}].${column}`;
      if (ref.table === table) {
        throw new SeedPlanError(
          where,
          `a row can't reference a row of its own table (${String(value)}); leave it empty and set it after the build.`,
        );
      }
      if (!tables.has(ref.table)) {
        throw new SeedPlanError(
          where,
          `${String(value)} points at "${ref.table}", which has no seed rows.`,
        );
      }
      deps.add(ref.table);
    }
  });
  return deps;
}

/**
 * The seed tables in insert order. `meta` is the live `_meta` of the app API;
 * with it, foreign keys of a curated blueprint also put parents first. With
 * `from`, a follow-up build gets only the rows after the ones already in.
 */
export function seedPlan(
  spec: AppSpec,
  meta?: readonly LiveMetaTable[],
  { from = {}, model = specModel(spec) }: SeedPlanOptions = {},
): SeedStep[] {
  const seed = spec.seed ?? {};
  const tables = Object.keys(seed);
  const tableSet = new Set(tables);
  const rows = new Map(
    tables.map((t) => [
      t,
      localTimes(model, meta, t, normalizeSeedRows(model.tables.get(t), seed[t] ?? [])),
    ]),
  );
  const hard = new Map(tables.map((t) => [t, references(t, rows.get(t) ?? [], tableSet)]));
  const soft = foreignKeys(model, meta, tables);

  const placed: string[] = [];
  const done = new Set<string>();
  const ready = (t: string, deps: Map<string, Set<string>>) =>
    [...(deps.get(t) ?? [])].every((d) => done.has(d));
  while (placed.length < tables.length) {
    const open = tables.filter((t) => !done.has(t) && ready(t, hard));
    if (open.length === 0) {
      // Drop the tables that only wait on the cycle, so the message names the cycle.
      let stuck = tables.filter((t) => !done.has(t));
      for (let changed = true; changed; ) {
        const waitedOn = new Set(stuck.flatMap((t) => [...(hard.get(t) ?? [])]));
        const next = stuck.filter((t) => waitedOn.has(t));
        changed = next.length < stuck.length;
        stuck = next;
      }
      throw new SeedPlanError(
        'seed',
        `the references between ${stuck.join(', ')} form a cycle, so no table can go first. Leave one side of the cycle empty.`,
      );
    }
    const next = open.find((t) => ready(t, soft)) ?? open[0];
    placed.push(next);
    done.add(next);
  }
  return placed.map((table) => {
    const all = rows.get(table) ?? [];
    const start = from[table] ?? 0;
    return start > 0 ? { table, rows: all.slice(start), from: start } : { table, rows: all };
  });
}
