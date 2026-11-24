// The checks on the entities and links a spec declares: names that must exist
// or must not repeat, columns the database owns, and defaults that must fit.
// A custom backend's and a curated blueprint's `extend` go through the same ones.

import { linkTableName } from './names';
import type { AppSpecError, SpecEntity, SpecField, SpecLink } from './types';
import {
  isNowSpelling,
  misfit,
  NOW_DEFAULTS,
  nowDefault,
  quoted,
  SYSTEM_COLUMNS,
} from './vocabulary';

/** The platform's own tables; an entity can't take their names. */
export const RESERVED_TABLES = new Set(['users']);

// The backend keeps a table's field names unique after it drops a key suffix
// from uuid columns (metaschema's databases_field_uniq_names_idx), so "owner"
// can't sit beside owner_id, nor "room" beside the key room_id. The build
// would fail on it in the schema phase, after the database is made.
const UUID_SUFFIX = /^(.+?)(_row_id|_id|_uuid|_fk|_pk)$/i;
const UUID_SYSTEM_COLUMNS = new Set(['id', 'owner_id']);

/** The name the backend compares a column by. */
export function fieldNameKey(name: string, isUuid: boolean): string {
  return (isUuid ? name.replace(UUID_SUFFIX, '$1') : name).toLowerCase();
}

/** A column a table already has or a spec adds: its name, and whether it's a uuid. */
export type NamedColumn = { name: string; uuid: boolean };

/**
 * Columns whose names the backend would take as the same, as
 * [new column, the column it clashes with]. Columns with the same name are
 * left to the duplicate checks.
 */
export function nameClashes(
  existing: readonly NamedColumn[],
  added: readonly NamedColumn[],
): Array<[NamedColumn, NamedColumn]> {
  const byKey = new Map<string, NamedColumn>();
  for (const column of existing) byKey.set(fieldNameKey(column.name, column.uuid), column);
  const clashes: Array<[NamedColumn, NamedColumn]> = [];
  for (const column of added) {
    const key = fieldNameKey(column.name, column.uuid);
    const other = byKey.get(key);
    if (other && other.name !== column.name) clashes.push([column, other]);
    else if (!other) byKey.set(key, column);
  }
  return clashes;
}

/** Why the added column can't keep its name: the earlier column keeps it. */
export function nameClashMessage(column: NamedColumn, other: NamedColumn): string {
  const rename = column.uuid
    ? 'pick another key name'
    : `rename it, for example to "${column.name}_name"`;
  return `"${column.name}" clashes with "${other.name}": the database compares uuid columns without their "_id"-style suffix, so the two count as the same name; ${rename}`;
}

const SYSTEM_NAMED: NamedColumn[] = [...SYSTEM_COLUMNS].map((name) => ({
  name,
  uuid: UUID_SYSTEM_COLUMNS.has(name),
}));

export function checkField(field: SpecField, at: string, errors: AppSpecError[]) {
  if (SYSTEM_COLUMNS.has(field.name)) {
    errors.push({
      path: `${at}.name`,
      message: `"${field.name}" is added to every table by the database; remove the field`,
    });
  }
  if (field.enum && field.type !== 'text' && field.type !== 'long_text') {
    errors.push({
      path: `${at}.enum`,
      message: `an enum field needs type "text", not "${field.type}"`,
    });
  }
  const value = field.default;
  if (value === undefined || value === null) return;
  if (field.enum && !field.enum.includes(String(value))) {
    errors.push({
      path: `${at}.default`,
      message: `${JSON.stringify(value)} is not one of the enum values ${quoted(field.enum)}`,
    });
    return;
  }
  if ((field.type === 'date' || field.type === 'timestamp') && isNowSpelling(value)) {
    // A "now" spelled for the other type would become a quoted literal: a
    // failed cast in the schema phase, or a default frozen at build time.
    if (!nowDefault(field.type, value)) {
      const { spellings } = NOW_DEFAULTS[field.type];
      errors.push({
        path: `${at}.default`,
        message: `${JSON.stringify(value)} isn't the current ${field.type === 'date' ? 'day' : 'time'} for a ${field.type} field; use one of ${quoted(spellings)}`,
      });
    }
    return;
  }
  const why = misfit(field.type, value);
  if (why) errors.push({ path: `${at}.default`, message: `${why} for a ${field.type} field` });
}

/** Why a column can't be added to a table that has rows, or null: it needs to be optional or defaulted. */
export function newColumnProblem(table: string, field: SpecField): string | null {
  return field.required && field.default === undefined
    ? `${table} has rows already, so a new column must be optional or have a default`
    : null;
}

// A custom backend's keys and links point at entities; an extend's also at
// the blueprint's tables.
export type TargetNoun = 'entity' | 'table';
const plural = (noun: TargetNoun) => (noun === 'entity' ? 'entities' : 'tables');

/**
 * Entities at `base` (`backend.entities`): names, fields and keys. A key may
 * point at any of `targets`; `taken` are table names an entity can't reuse.
 */
export function checkEntities(
  entities: SpecEntity[],
  base: string,
  targets: ReadonlySet<string>,
  errors: AppSpecError[],
  taken: ReadonlyMap<string, string> = new Map(),
  noun: TargetNoun = 'entity',
) {
  const seen = new Map<string, number>();
  entities.forEach((entity, i) => {
    const at = `${base}[${i}]`;
    if (taken.has(entity.name)) {
      errors.push({ path: `${at}.name`, message: taken.get(entity.name) as string });
    }
    if (seen.has(entity.name)) {
      errors.push({
        path: `${at}.name`,
        message: `"${entity.name}" is also entities[${seen.get(entity.name)}]; each entity needs its own name`,
      });
    }
    seen.set(entity.name, i);
    if (RESERVED_TABLES.has(entity.name)) {
      errors.push({
        path: `${at}.name`,
        message: `"${entity.name}" is the platform's own table; name the entity for what it holds, such as "members"`,
      });
    }
    const fields = new Map<string, number>();
    entity.fields.forEach((field, j) => {
      if (fields.has(field.name)) {
        errors.push({
          path: `${at}.fields[${j}].name`,
          message: `"${field.name}" is also fields[${fields.get(field.name)}]`,
        });
      }
      fields.set(field.name, j);
      checkField(field, `${at}.fields[${j}]`, errors);
    });
    const keys = new Set<string>();
    (entity.belongsTo ?? []).forEach((key, k) => {
      const kat = `${at}.belongsTo[${k}]`;
      if (!targets.has(key.to)) {
        errors.push({
          path: `${kat}.to`,
          message: `no ${noun} is named "${key.to}"; the ${plural(noun)} are ${quoted(targets)}`,
        });
      }
      if (keys.has(key.field) || SYSTEM_COLUMNS.has(key.field)) {
        errors.push({
          path: `${kat}.field`,
          message: `"${key.field}" is already a column of ${entity.name}; pick another key name`,
        });
      }
      keys.add(key.field);
      const listed = entity.fields.find((field) => field.name === key.field);
      if (listed && listed.type !== 'uuid') {
        errors.push({
          path: `${kat}.field`,
          message: `fields also lists "${key.field}" as ${listed.type}; a key is a uuid, so drop it from fields`,
        });
      }
      if (key.onDelete === 'set_null' && listed?.required) {
        errors.push({
          path: `${kat}.onDelete`,
          message: `"set_null" needs an optional key, but fields marks "${key.field}" as required`,
        });
      }
    });
    // The keys first, so a field that clashes with a key is the one to rename.
    const declared: Array<NamedColumn & { path: string }> = [
      ...(entity.belongsTo ?? []).map((key, k) => ({
        name: key.field,
        uuid: true,
        path: `${at}.belongsTo[${k}].field`,
      })),
      ...entity.fields.map((field, j) => ({
        name: field.name,
        uuid: field.type === 'uuid',
        path: `${at}.fields[${j}].name`,
      })),
    ];
    for (const [column, other] of nameClashes(SYSTEM_NAMED, declared)) {
      errors.push({
        path: (column as NamedColumn & { path: string }).path,
        message: nameClashMessage(column, other),
      });
    }
  });
}

/** Links at `base`: both sides among `sides`, and a table name none of `sides` uses. */
export function checkLinks(
  links: SpecLink[],
  base: string,
  sides: ReadonlySet<string>,
  errors: AppSpecError[],
  noun: TargetNoun = 'entity',
) {
  const tables = new Map<string, number>();
  const pairs = new Map<string, number>();
  links.forEach((link, i) => {
    const at = `${base}[${i}]`;
    const [a, b] = link.between;
    for (const side of link.between) {
      if (!sides.has(side))
        errors.push({
          path: `${at}.between`,
          message: `no ${noun} is named "${side}"; the ${plural(noun)} are ${quoted(sides)}`,
        });
    }
    if (a === b)
      errors.push({ path: `${at}.between`, message: 'a link needs two different entities' });
    const pair = [a, b].sort().join('\n');
    if (pairs.has(pair))
      errors.push({
        path: `${at}.between`,
        message: `${a} and ${b} are already linked by links[${pairs.get(pair)}]`,
      });
    pairs.set(pair, i);
    const name = linkTableName(link);
    if (sides.has(name) || tables.has(name)) {
      errors.push({
        path: `${at}.name`,
        message: `the link table "${name}" clashes with another table; give the link its own name`,
      });
    }
    tables.set(name, i);
  });
}
