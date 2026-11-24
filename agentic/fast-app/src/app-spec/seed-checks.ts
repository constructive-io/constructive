// The seed rows of a spec against its model: tables and columns that exist,
// values that fit their type, and references that point at the right table.
// A mistyped or doubled column (a-final-3's `author_author_role`) otherwise
// fails in the seed phase, after the approval card and the backend build.
//
// A curated table knows every column its nodes add, `id` and `owner_id`
// included, so a seed row may set them there; an entity's or a link's row may
// not, since the database sets them. That difference is kept on purpose until
// it is settled.

import { linkKey } from './names';
import { canonical, looksLikeRef, normalizeSeedRows, parseSeedRef } from './seed-refs';
import { type ModelTable, ownTables, type SpecModel } from './spec-model';
import type { AppSpec, AppSpecError, SeedRow, SpecField } from './types';
import {
  closestName,
  misfit,
  missingBlueprintTable,
  quoted,
  SYSTEM_COLUMNS,
} from './vocabulary';

type Seed = NonNullable<AppSpec['seed']>;

/** Why a value can't go into this declared column, or null when it can. */
function valueProblem(field: SpecField, value: unknown): string | null {
  if (field.enum && value !== null && !field.enum.includes(String(value))) {
    return `${JSON.stringify(value)} is not one of ${quoted(field.enum)}`;
  }
  const why = misfit(field.type, value);
  return why ? `${why} for a ${field.type} field` : null;
}

function checkRef(value: unknown, target: string, at: string, errors: AppSpecError[]) {
  const ref = parseSeedRef(value);
  if (!ref) {
    errors.push({
      path: at,
      message: `a key takes a reference like "@${target}[0]", not ${JSON.stringify(value)}`,
    });
  } else if (ref.table !== target) {
    errors.push({
      path: at,
      message: `${String(value)} points at ${ref.table}, but this key points at ${target}`,
    });
  }
}

/** The message for a required key no seed row can fill, since its target is a blueprint-managed table. */
const entityKeyMessage = (table: string, column: string, target: string) =>
  `"${column}" is a required key to ${target}, which plan_app doesn't seed; leave ${table} out of the seed and add its rows with add_records after the build, once ${target} rows exist`;

type IsEntityTable = (name: string) => boolean;

function checkEntityRow(
  table: ModelTable,
  row: SeedRow,
  at: string,
  errors: AppSpecError[],
  isEntityTable: IsEntityTable,
) {
  const entity = table.entity;
  if (!entity) return;
  for (const [column, value] of Object.entries(row)) {
    const cat = `${at}.${column}`;
    const field = entity.fields.find((f) => f.name === column);
    const key = table.keys.get(column);
    if (SYSTEM_COLUMNS.has(column)) {
      errors.push({ path: cat, message: 'the database sets this column; leave it out' });
    } else if (key) {
      if (value !== null) checkRef(value, key.key.to, cat, errors);
    } else if (!field) {
      // An entity type's own column (its name): the database checks the value.
      if (table.columns.has(column)) continue;
      const columns = [...table.columns].filter((name) => !SYSTEM_COLUMNS.has(name));
      errors.push({
        path: cat,
        message: `${entity.name} has no column "${column}"; its columns are ${quoted(columns)}`,
      });
    } else if (parseSeedRef(value) || looksLikeRef(value)) {
      errors.push({ path: cat, message: 'only a belongsTo key takes a reference' });
    } else {
      const why = valueProblem(field, value);
      if (why) errors.push({ path: cat, message: why });
    }
  }
  const missing = (column: string) => row[column] === undefined || row[column] === null;
  for (const { field } of table.fields.values()) {
    if (field.required && field.default === undefined && missing(field.name)) {
      errors.push({ path: at, message: `missing "${field.name}", which is required` });
    }
  }
  for (const { key, required } of table.keys.values()) {
    if (required && missing(key.field)) {
      errors.push({
        path: at,
        message: isEntityTable(key.to)
          ? entityKeyMessage(table.name, key.field, key.to)
          : `missing "${key.field}", a required key; use a reference like "@${key.to}[0]"`,
      });
    }
  }
}

function checkLinkRow(table: ModelTable, row: SeedRow, at: string, errors: AppSpecError[]) {
  const link = table.link;
  if (!link) return;
  const keys = link.between.map((side) => ({ side, column: linkKey(side) }));
  for (const column of Object.keys(row)) {
    if (!keys.some((k) => k.column === column)) {
      errors.push({
        path: `${at}.${column}`,
        message: `${table.name} links ${link.between.join(' and ')}; name its keys ${quoted(link.between)} (or ${quoted(keys.map((k) => k.column))})`,
      });
    }
  }
  for (const { side, column } of keys) {
    if (row[column] === undefined)
      errors.push({
        path: at,
        message: `missing the "${side}" key; use a reference like "@${side}[0]"`,
      });
    else checkRef(row[column], side, `${at}.${column}`, errors);
  }
}

// The references of a raw row: well-formed, and inside the rows they point at.
// The blueprint owns an entity table's rows and its schema, and the spec keeps
// it out of the tables it renders, so a seeded row there wouldn't stay in the
// spec. add_records fills the owner the way the app does.
const entityTypeSeedMessage = (table: string) =>
  `plan_app doesn't seed ${table}, a table the blueprint manages. After the build, add sample rows with add_records (the desktop fills their owner), then add rows that reference them the same way.`;

function checkRowRefs(
  model: SpecModel,
  seed: Seed,
  raw: SeedRow,
  at: string,
  errors: AppSpecError[],
) {
  for (const [column, value] of Object.entries(raw)) {
    const ref = parseSeedRef(value);
    if (looksLikeRef(value)) {
      errors.push({
        path: `${at}.${column}`,
        message: `${JSON.stringify(value)} is not a reference; write "@<table>[<index>]"`,
      });
    } else if (ref && model.blueprint?.tables.get(ref.table)?.entityType) {
      errors.push({ path: `${at}.${column}`, message: entityTypeSeedMessage(ref.table) });
    } else if (ref && ref.table in seed && ref.index >= seed[ref.table].length) {
      errors.push({
        path: `${at}.${column}`,
        message: `${String(value)} is past the end of seed.${ref.table}, which has ${seed[ref.table].length} row(s)`,
      });
    }
  }
}

function checkCuratedRow(
  table: ModelTable,
  row: SeedRow,
  at: string,
  errors: AppSpecError[],
  isEntityTable: IsEntityTable,
) {
  const curated = table.curated;
  if (!curated) return;
  for (const { column, required } of curated.fill) {
    if (!required || (row[column] !== undefined && row[column] !== null)) continue;
    const target = curated.keys.get(column);
    errors.push({
      path: `${at}.${column}`,
      message: !target
        ? `missing "${column}", which is required`
        : isEntityTable(target)
          ? entityKeyMessage(table.name, column, target)
          : `missing "${column}", a required key; use a reference like "@${target}[0]"`,
    });
  }
  for (const [column, value] of Object.entries(row)) {
    const cat = `${at}.${column}`;
    if (!table.columns.has(column)) {
      const guess = closestName(column, table.columns);
      const fill = [
        ...curated.fill.map((c) => c.column),
        ...table.fields.keys(),
        ...table.keys.keys(),
      ];
      const hint = !guess
        ? `; its columns are ${quoted(fill)}`
        : guess in row
          ? `; did you mean "${guess}"? This row sets "${guess}" already, so remove "${column}"`
          : `; did you mean "${guess}"?`;
      errors.push({ path: cat, message: `${table.name} has no column "${column}"${hint}` });
      continue;
    }
    const field = table.fields.get(column)?.field;
    if (field) {
      const why = valueProblem(field, value);
      if (why) errors.push({ path: cat, message: why });
      continue;
    }
    const target = table.keys.get(column)?.key.to ?? curated.keys.get(column);
    const ref = parseSeedRef(value);
    if (target && ref && ref.table !== target) {
      errors.push({
        path: cat,
        message: `${String(value)} points at ${ref.table}, but this key points at ${target}`,
      });
    }
  }
}

// How many of the rows, from the first, are the ones in the database already.
function landedPrefix(
  table: ModelTable | undefined,
  rows: SeedRow[],
  landed: readonly SeedRow[] = [],
) {
  const now = normalizeSeedRows(table, rows);
  const was = normalizeSeedRows(table, [...landed]);
  const differs = now.findIndex(
    (row, i) => i >= was.length || canonical(row) !== canonical(was[i]),
  );
  return differs === -1 ? now.length : differs;
}

/**
 * Seed rows against the model. The spec's own tables and every reference go
 * first, then a curated blueprint's tables, so the agent reads the errors in
 * its own tables before the blueprint's. Rows that landed already (`landed`)
 * keep only their references checked.
 */
export function checkSeed(
  model: SpecModel,
  spec: AppSpec,
  errors: AppSpecError[],
  landed: Readonly<Record<string, readonly SeedRow[]>> = {},
) {
  const seed = spec.seed ?? {};
  const own = ownTables(model).map((table) => table.name);
  const isEntityTable: IsEntityTable = (name) =>
    Boolean(model.blueprint?.tables.get(name)?.entityType);
  for (const [name, raw] of Object.entries(seed)) {
    const at = `seed.${name}`;
    const table = model.tables.get(name);
    const declared = table?.origin === 'blueprint' ? undefined : table;
    if (spec.backend.kind === 'custom' && !declared) {
      errors.push({
        path: at,
        message: `"${name}" is not a table of this app; the tables are ${quoted(own)}`,
      });
      continue;
    }
    const settled = landedPrefix(declared, raw, landed[name]);
    normalizeSeedRows(declared, raw).forEach((row, r) => {
      const rat = `${at}[${r}]`;
      checkRowRefs(model, seed, raw[r] ?? {}, rat, errors);
      if (r < settled) return;
      if (declared?.origin === 'entity') checkEntityRow(declared, row, rat, errors, isEntityTable);
      if (declared?.origin === 'link') checkLinkRow(declared, row, rat, errors);
    });
  }

  const blueprint = model.blueprint;
  if (!blueprint) return;
  if (!blueprint.known) {
    errors.push({
      path: 'backend.slug',
      message: `no curated blueprint is named "${blueprint.slug}"; the blueprints are ${quoted(blueprint.offered)}`,
    });
    return;
  }
  const names = [...blueprint.tables.keys(), ...own];
  for (const [name, rows] of Object.entries(seed)) {
    if (blueprint.tables.get(name)?.entityType) {
      errors.push({ path: `seed.${name}`, message: entityTypeSeedMessage(name) });
      continue;
    }
    const table = model.tables.get(name);
    if (table && table.origin !== 'blueprint') continue;
    if (!table?.curated) {
      errors.push({
        path: `seed.${name}`,
        message: missingBlueprintTable(blueprint.slug, name, names),
      });
      continue;
    }
    const settled = landedPrefix(table, rows, landed[name]);
    rows.forEach((row, index) => {
      if (index >= settled) {
        checkCuratedRow(table, row, `seed.${name}[${index}]`, errors, isEntityTable);
      }
    });
  }
}
