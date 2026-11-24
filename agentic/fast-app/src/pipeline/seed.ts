// The seed phase: the AppSpec's rows, inserted as the owner in one batched
// request per dependency level. Each row of a level is an aliased create in
// the same mutation document; a later level's "@<table>[<i>]" references
// resolve to ids the earlier levels returned.

import {
  createGraphqlExecute,
  graphqlErrorText,
  type LiveMetaTable,
} from '../extensions/db-tools/live-meta';
import {
  type FieldRules,
  MetaIndex,
  normalizeKey,
} from '../extensions/db-tools/live-meta-index';
import { recordActivity } from './activity';

/**
 * One table's rows, snake_case columns, in the order seedPlan gives. In a
 * follow-up, `from` is the index of the first row: the rows before it are in
 * already, and "@<table>[<i>]" counts from the table's first row.
 */
export type SeedStep = { table: string; rows: Array<Record<string, unknown>>; from?: number };

/** Each row's index in its table: what "@<table>[<i>]" and an error name it by. */
const firstIndex = (step: SeedStep) => step.from ?? 0;

/** Ids per normalized table key, in row order; null for a row the database has none of. */
export type SeededIds = Record<string, Array<string | null>>;

export type SeedResult = { ids: SeededIds; inserted: number; requests: number };

/** One table's rows that landed with a level, by the index of the first. */
export type LandedRows = { table: string; from: number; ids: string[] };

export type SeedOptions = {
  rules?: FieldRules;
  /** The ids an earlier build inserted, so new rows can point at them. */
  seeded?: Readonly<SeededIds>;
  /**
   * Stops the seed between levels. A level's request is never cut off: its
   * rows can be in the database by then, and only its answer records them.
   */
  signal?: AbortSignal;
  /** Called once a level's rows have landed, before the next level starts. */
  onLevel?: (landed: LandedRows[]) => Promise<void> | void;
};

const REF = /^@([a-z][a-z0-9_]*)\[(\d+)\]$/;

type Resolved = {
  step: SeedStep;
  table: LiveMetaTable;
  field: (column: string) => string;
  deps: Set<string>;
  /**
   * The columns the owner's id fills when a row leaves them out (a curated
   * blueprint scopes rows to an entity; the owner's personal one is theirs).
   */
  ownerFields: string[];
  rowField: string;
  pk: string;
};

function resolveTable(step: SeedStep, index: MetaIndex): Resolved {
  const table = index.find(step.table);
  if (!table?.query?.create || !table.inflection?.createInputType) {
    throw new Error(`seed table "${step.table}" has no create mutation on the API`);
  }
  const fields = new Map((table.fields ?? []).map((f) => [normalizeKey(f.name), f.name]));
  const deps = new Set<string>();
  for (const row of step.rows) {
    // Every step resolves before the first level is written, so an unknown
    // column fails the seed before it creates any row. Failing at its own
    // level left the earlier levels' rows behind, and the plan_app retry
    // seeded them a second time.
    for (const column of Object.keys(row)) {
      if (!fields.has(normalizeKey(column)))
        throw new Error(`seed column "${step.table}.${column}" is not a field of ${table.name}`);
    }
    for (const value of Object.values(row)) {
      const ref = typeof value === 'string' ? value.match(REF) : null;
      if (ref) deps.add(normalizeKey(ref[1]));
    }
  }
  return {
    step,
    table,
    deps,
    ownerFields: index.ownerColumns(table),
    field: (column) => fields.get(normalizeKey(column)) ?? column,
    rowField: index.modelOf(table),
    pk: index.primaryKeyOf(table) ?? 'id',
  };
}

// Tables whose references all point at earlier levels form the next level.
function levels(resolved: Resolved[]): Resolved[][] {
  const result: Resolved[][] = [];
  const done = new Set<string>();
  let pending = resolved;
  while (pending.length) {
    const keys = new Set(pending.map((r) => normalizeKey(r.step.table)));
    const ready = pending.filter((r) =>
      [...r.deps].every(
        (dep) => done.has(dep) || !keys.has(dep) || dep === normalizeKey(r.step.table),
      ),
    );
    if (!ready.length) throw new Error('seed references form a cycle');
    result.push(ready);
    for (const r of ready) done.add(normalizeKey(r.step.table));
    pending = pending.filter((r) => !ready.includes(r));
  }
  return result;
}

export async function runSeed(
  steps: readonly SeedStep[],
  tables: readonly LiveMetaTable[],
  session: { endpoint: string; token: string; userId: string },
  { rules, seeded = {}, signal, onLevel }: SeedOptions = {},
): Promise<SeedResult> {
  const index = new MetaIndex(tables, rules);
  const resolved = steps.filter((s) => s.rows.length).map((s) => resolveTable(s, index));
  const execute = createGraphqlExecute(session.endpoint, session.token);
  const ids: SeededIds = Object.fromEntries(
    Object.entries(seeded).map(([key, list]) => [key, [...list]]),
  );
  let inserted = 0;
  let requests = 0;

  const resolveRef = (value: unknown, where: string): unknown => {
    const ref = typeof value === 'string' ? value.match(REF) : null;
    if (!ref) return value;
    const id = ids[normalizeKey(ref[1])]?.[Number(ref[2])];
    if (!id) throw new Error(`${where}: ${value} points at a row that was not seeded`);
    return id;
  };

  for (const level of levels(resolved)) {
    signal?.throwIfAborted();
    const variables: Record<string, unknown> = {};
    const declarations: string[] = [];
    const selections: string[] = [];
    const slots: Slot[] = [];
    for (const { step, table, field, ownerFields, rowField, pk } of level) {
      step.rows.forEach((row, offset) => {
        const index = firstIndex(step) + offset;
        const where = `${step.table}[${index}]`;
        const alias = `r${slots.length}`;
        const values: Record<string, unknown> = {};
        for (const [column, value] of Object.entries(row)) {
          values[field(column)] = resolveRef(value, `${where}.${column}`);
        }
        for (const name of ownerFields) values[name] ??= session.userId;
        variables[alias] = { [rowField]: values };
        declarations.push(`$${alias}: ${table.inflection?.createInputType}!`);
        selections.push(
          `${alias}: ${table.query?.create}(input: $${alias}) { ${rowField} { ${pk} } }`,
        );
        slots.push({ step, alias, rowField, pk, index, where });
      });
    }
    const document = `mutation Seed(${declarations.join(', ')}) { ${selections.join(' ')} }`;
    const perTable = new Map<string, number>();
    for (const slot of slots)
      perTable.set(slot.step.table, (perTable.get(slot.step.table) ?? 0) + 1);
    const result = await recordActivity(
      {
        kind: 'call',
        label: 'insert',
        args: [...perTable].map(([name, n]) => `${name} ×${n}`).join(', '),
        params: variables,
      },
      () => execute(document, variables),
      (answer) => ({
        detail: `${slots.length} rows in one request${answer.errors?.length ? ', some rejected' : ''}`,
        failed: Boolean(answer.errors?.length),
      }),
    );
    requests += 1;
    const data = (result.data ?? {}) as Record<
      string,
      Record<string, Record<string, string>> | null
    >;
    // Each create of a level runs on its own, so beside a rejected row the
    // others can be in. The record keeps a table's rows as a prefix, so it
    // takes them up to the table's first rejected row; a row after that one
    // is in the database but not recorded, and a retry inserts it again.
    const landed = new Map<SeedStep, string[]>();
    const rejected = new Set<SeedStep>();
    for (const slot of slots) {
      const id = data[slot.alias]?.[slot.rowField]?.[slot.pk];
      if (!id) rejected.add(slot.step);
      if (!id || rejected.has(slot.step)) continue;
      const list = (ids[normalizeKey(slot.step.table)] ??= []);
      // No holes: JSON would write them as null anyway.
      while (list.length < slot.index) list.push(null);
      list[slot.index] = id;
      landed.set(slot.step, [...(landed.get(slot.step) ?? []), id]);
      inserted += 1;
    }
    await onLevel?.(
      [...landed].map(([step, created]) => ({
        table: step.table,
        from: firstIndex(step),
        ids: created,
      })),
    );
    if (result.errors?.length) throw new Error(describeSeedErrors(result.errors, slots));
    const missing = slots.find((slot) => !data[slot.alias]?.[slot.rowField]?.[slot.pk]);
    if (missing) throw new Error(`seed insert ${missing.alias} returned no id`);
  }
  return { ids, inserted, requests };
}

type Slot = {
  step: SeedStep;
  alias: string;
  rowField: string;
  pk: string;
  index: number;
  /** `shifts[1]`: the row by its table and index. */
  where: string;
};

// Names the table and row an error's path points at (`r3` → shifts[1]).
function describeSeedErrors(
  errors: Array<{ message?: string; path?: unknown }>,
  slots: readonly Slot[],
): string {
  const lines = errors.map((error) => {
    const alias = Array.isArray(error.path) ? String(error.path[0]) : '';
    const row = slots.find((slot) => slot.alias === alias)?.where;
    return `${row ? `${row}: ` : ''}${graphqlErrorText([error])}`;
  });
  return `seed rows were rejected:\n${lines.join('\n')}`;
}
