// One live column as an AppSpec field, or the reason it can't be one. The
// column keeps whatever the spec can't say (its type, its default, its key)
// as it is; live-spec.ts lists it to the agent and the planner keeps off it.

import type { LiveColumn, LiveDefault } from './live-model';
import type { FieldIntent } from './overlay';
import { FIELD_TYPES } from './translate';
import type { SpecField, SpecFieldType } from './types';
import { misfit } from './vocabulary';

/** What the view leaves out of app-spec.json, and why; the planner keeps each as it is. */
export type ReadOnlyItem =
  | { kind: 'table'; table: string; reason: string }
  | { kind: 'column'; table: string; column: string; reason: string }
  | { kind: 'access'; table: string }
  | { kind: 'default'; table: string; column: string; sql: string }
  | { kind: 'curated-gone'; table: string; slug: string };

/** The database type → the spec type; `long_text` and `money` come from the overlay. */
export const SPEC_TYPE_OF_PG: Readonly<Record<string, SpecFieldType>> = Object.fromEntries(
  (Object.entries(FIELD_TYPES) as Array<[SpecFieldType, string]>)
    .filter(([spec]) => spec !== 'long_text' && spec !== 'money')
    .map(([spec, pg]) => [pg, spec]),
);

// The columns every app table gets from its nodes, with the type they have
// then; the view leaves them out. One of another type is somebody else's column.
const SYSTEM_TYPES: Readonly<Record<string, string>> = {
  id: 'uuid',
  owner_id: 'uuid',
  entity_id: 'uuid',
  created_at: 'timestamptz',
  updated_at: 'timestamptz',
};

const NAME_RE = /^[a-z][a-z0-9_]*$/;

/** Whether the AppSpec can spell this table or column name. */
export const isSpecName = (name: string) => NAME_RE.test(name) && name.length <= 63;

/** A name the nodes give a column; with another type, the column is read-only. */
export const isSystemName = (name: string) => name in SYSTEM_TYPES;

/** Whether the view leaves the column out as one the nodes add. */
export const isSystemColumn = (c: Pick<LiveColumn, 'name' | 'type'>) =>
  SYSTEM_TYPES[c.name] === c.type;

const literalSql = (value: string | number | boolean) =>
  typeof value === 'string' ? `'${value}'` : String(value);

function literal(value: string | number | boolean, type: SpecFieldType): unknown {
  switch (type) {
  case 'integer':
  case 'decimal':
  case 'money':
    return typeof value === 'string' && value.trim() !== '' ? Number(value) : value;
  case 'boolean':
    return value === 'true' || value === 't'
      ? true
      : value === 'false' || value === 'f'
        ? false
        : value;
  case 'json':
    return value;
  default:
    return typeof value === 'string' ? value : String(value);
  }
}

/**
 * The spec's default for a live default: `{ value }`, `{ sql }` when the spec
 * can't spell it (the column keeps it as it is), or undefined for none.
 */
export function specDefault(
  d: LiveDefault | null,
  type: SpecFieldType,
): { value: unknown } | { sql: string } | undefined {
  if (!d) return undefined;
  switch (d.kind) {
  case 'now':
    return type === 'timestamp' || type === 'date' ? { value: 'now' } : { sql: 'now()' };
  case 'today':
    return type === 'date' ? { value: 'today' } : { sql: 'CURRENT_DATE' };
  case 'expression':
    return { sql: d.sql };
  default: {
    const value = literal(d.value, type);
    return misfit(type, value) ? { sql: literalSql(d.value) } : { value };
  }
  }
}

function specType(c: LiveColumn, intent: FieldIntent | undefined): SpecFieldType | undefined {
  const type = SPEC_TYPE_OF_PG[c.type];
  if (type === 'text' && intent?.type === 'long_text') return 'long_text';
  if (type === 'decimal' && intent?.type === 'money') return 'money';
  return type;
}

/** A plain column (not a key) as a field, with the default the spec can't spell listed. */
export function specFieldOf(
  table: string,
  c: LiveColumn,
  intent?: FieldIntent,
): { field: SpecField; readOnly?: ReadOnlyItem } | { readOnly: ReadOnlyItem } {
  const column = (reason: string) => ({
    readOnly: { kind: 'column' as const, table, column: c.name, reason },
  });
  if (!isSpecName(c.name)) return column('name');
  if (c.generated) return column('computed');
  const type = specType(c, intent);
  if (!type) return column(c.type);
  const values = c.values?.length && (type === 'text' || type === 'long_text') ? c.values : null;
  const field: SpecField = { name: c.name, type };
  if (intent?.label) field.label = intent.label;
  if (c.required) field.required = true;
  if (values) field.enum = [...values];
  const d = specDefault(c.default, type);
  if (d && 'value' in d && values && !values.includes(String(d.value))) {
    // A default outside the allowed values (narrowed outside) fails the spec's check.
    return { field, readOnly: { kind: 'default', table, column: c.name, sql: String(d.value) } };
  }
  if (d && 'value' in d) field.default = d.value;
  if (d && 'sql' in d) {
    return { field, readOnly: { kind: 'default', table, column: c.name, sql: d.sql } };
  }
  return { field };
}
