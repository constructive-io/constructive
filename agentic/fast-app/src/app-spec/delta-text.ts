// What the plan card says about each change of a follow-up build: one line for
// what it does and, for a destructive one, what the user gives up by ticking it.

import { accessWords, scopeOfAccess } from './scope-access';
import type { AccessMode, SpecField } from './types';
import { quoted } from './vocabulary';

const rowsOf = (table: string, rows: number | undefined) =>
  rows === undefined
    ? `every row in ${table}`
    : `the ${rows} row${rows === 1 ? '' : 's'} in ${table}`;

function fieldKind(field: SpecField): string {
  return field.enum?.length ? `one of ${quoted(field.enum)}` : field.type;
}

export const addText = {
  table: (table: string, access: AccessMode) => `Add the table ${table} (${accessWords(access)})`,
  link: (table: string, [a, b]: readonly string[]) => `Link ${a} and ${b} (table ${table})`,
  field: (table: string, field: SpecField) =>
    `Add ${table}.${field.name} (${fieldKind(field)}${field.required ? ', required' : ''})`,
  key: (table: string, column: string, to: string) => `Add ${table}.${column} → ${to}`,
  widen: (table: string, column: string, added: readonly string[]) =>
    `Allow ${quoted(added)} in ${table}.${column}`,
  relax: (table: string, column: string) => `Make ${table}.${column} optional`,
  defaultValue: (table: string, column: string, value: unknown) =>
    value === undefined || value === null
      ? `Remove the default of ${table}.${column}`
      : `Set the default of ${table}.${column} to ${JSON.stringify(value)}`,
};

export const dropText = {
  table: (table: string, rows?: number, hides = false, unlisted: readonly string[] = []) => ({
    title: `Delete the table ${table}`,
    loses: `${rowsOf(table, rows)}${unlisted.length ? ` and its columns app-spec.json can't describe (${unlisted.join(', ')})` : ''}, for good${hides ? '. Leave it unticked to keep the data and hide the table' : ''}`,
  }),
  link: (table: string, [a, b]: readonly string[], rows?: number) => ({
    title: `Delete the link between ${a} and ${b} (table ${table})`,
    loses: `which ${a} go with which ${b}: ${rowsOf(table, rows)}`,
  }),
  field: (table: string, column: string, rows: number | undefined, hides: boolean) => ({
    title: `Delete ${table}.${column}`,
    loses: `the ${column} value of ${rowsOf(table, rows)}. ${
      hides
        ? 'Leave it unticked to keep the data and hide the field'
        : `Left unticked, the data stays and the screens keep ${column}, since new rows need a value for it`
    }`,
  }),
  key: (table: string, column: string, to: string, rows?: number) => ({
    title: `Delete the key ${table}.${column} → ${to}`,
    loses: `which ${to} row each of ${rowsOf(table, rows)} points at`,
  }),
  rename: (table: string, from: string, to: string) => ({
    title: `Rename ${table}.${from} to ${to}, keeping its values`,
    loses: `nothing in the database, but code that names ${from} has to change. Left unticked, ${to} is added empty and ${from} stays`,
  }),
  type: (table: string, column: string, from: string, to: string) => ({
    title: `Change ${table}.${column} from ${from} to ${to}`,
    loses: `nothing when every value converts to ${to}; one that doesn't makes the change fail`,
  }),
  restrict: (table: string, column: string, values: readonly string[]) => ({
    title: `Limit ${table}.${column} to ${quoted(values)}`,
    loses: `nothing when every row already holds one of them; any other value makes the change fail`,
  }),
  narrow: (table: string, column: string, removed: readonly string[]) => ({
    title: `Stop allowing ${quoted(removed)} in ${table}.${column}`,
    loses: `nothing when no row holds ${quoted(removed)}; a row that does makes the change fail`,
  }),
  require: (table: string, column: string) => ({
    title: `Make ${table}.${column} required`,
    loses: `nothing when every row has a value; a row without one makes the change fail`,
  }),
  access: (table: string, to: AccessMode) =>
    scopeOfAccess(to)
      ? {
        title: `Let only ${accessWords(to)} see ${table}`,
        loses: `everyone else's access: each ${table} row shows only to the members of its ${scopeOfAccess(to)}`,
      }
      : to === 'private'
        ? {
          title: `Make ${table} private`,
          loses: `other members stop seeing the ${table} rows they didn't create`,
        }
        : {
          title: `Make ${table} shared`,
          loses: `privacy: every member can read and change every ${table} row, including rows other people kept to themselves`,
        },
};
