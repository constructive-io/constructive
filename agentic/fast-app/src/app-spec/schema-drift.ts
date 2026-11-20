// What changed in the database between two looks at it, by id, so a rename
// reads as a rename and not as a drop and an add. The desktop keeps the last
// look (`.constructive/view.json`) only to tell the agent and the user what
// changed outside the app; the planner never reads it.

import type { OutsideChange } from '../pipeline/app-plan';
import {
  columnKey,
  type EntityTypeDefinition,
  type LiveDefault,
  type LiveModel,
} from './live-model';
import { quoted } from './vocabulary';

export type { OutsideChange };

export type ColumnSnapshot = {
  name: string;
  type: string;
  required: boolean;
  default: string | null;
  values?: string[];
  key?: { to: string; toName: string; onDelete: string };
};

export type TableSnapshot = {
  name: string;
  access: string;
  /** The membership scope whose entity owns each row, and the column that names it. */
  scoped?: { scope: string; field: string };
  /** By field id, or by `meta:<name>` for a column only `_meta` lists (added with SQL). */
  columns: Record<string, ColumnSnapshot>;
};

/**
 * An entity type as the last look found it: how to make it again, and its
 * table, by name and (since this was recorded) by id, which keys point at.
 */
export type EntityTypeSnapshot = EntityTypeDefinition & { table: string; tableId?: string };

export type SchemaSnapshot = {
  /** By table id. */
  tables: Record<string, TableSnapshot>;
  /** `_meta` wasn't read: the columns added with SQL are unknown, not gone. */
  meta?: false;
  /** The database's entity types; a rebuild makes the ones no blueprint makes again. */
  entityTypes?: EntityTypeSnapshot[];
};

function defaultText(d: LiveDefault | null): string | null {
  if (!d) return null;
  if (d.kind === 'literal') return JSON.stringify(d.value);
  if (d.kind === 'now') return 'now()';
  if (d.kind === 'today') return 'CURRENT_DATE';
  return d.sql;
}

export function snapshotOf(model: LiveModel): SchemaSnapshot {
  const tables: Record<string, TableSnapshot> = {};
  for (const table of model.tables) {
    const columns: Record<string, ColumnSnapshot> = {};
    for (const c of table.columns) {
      columns[columnKey(c)] = {
        name: c.name,
        type: c.type,
        required: c.required,
        default: defaultText(c.default),
        ...(c.values && { values: [...c.values] }),
        ...(c.key && { key: { to: c.key.to, toName: c.key.toName, onDelete: c.key.onDelete } }),
      };
    }
    tables[table.id] = {
      name: table.name,
      access: table.access,
      ...(table.scoped && { scoped: { ...table.scoped } }),
      columns,
    };
  }
  const entityTypes = [...model.entityTables].map(([table, entity]) => ({
    ...entity.definition,
    table,
    tableId: entity.table.id,
  }));
  return {
    tables,
    ...(!model.metaRead && { meta: false as const }),
    ...(entityTypes.length > 0 && { entityTypes }),
  };
}

const SQL_ONLY = 'meta:';

const valuesText = (values: string[] | undefined) => (values ? quoted(values) : 'any value');

// The key's target by its name now, so a renamed target isn't a changed key.
function keyText(key: ColumnSnapshot['key'], snapshot: SchemaSnapshot): string {
  if (!key) return 'nothing';
  return `${snapshot.tables[key.to]?.name ?? key.toName} (on delete ${key.onDelete})`;
}

function columnChanges(
  table: string,
  was: ColumnSnapshot,
  now: ColumnSnapshot,
  before: SchemaSnapshot,
  after: SchemaSnapshot,
): OutsideChange[] {
  const out: OutsideChange[] = [];
  const changed = (
    what: Extract<OutsideChange, { kind: 'column_changed' }>['what'],
    from: string,
    to: string,
  ) => from !== to && out.push({ kind: 'column_changed', table, column: now.name, what, from, to });
  changed('type', was.type, now.type);
  const requiredText = (required: boolean) => (required ? 'required' : 'optional');
  changed('required', requiredText(was.required), requiredText(now.required));
  changed('default', was.default ?? 'none', now.default ?? 'none');
  changed('values', valuesText(was.values), valuesText(now.values));
  const sameKey =
    was.key?.to === now.key?.to && (was.key?.onDelete ?? null) === (now.key?.onDelete ?? null);
  if (!sameKey) changed('key', keyText(was.key, before), keyText(now.key, after));
  return out;
}

/** Each change once: a table added or removed carries its columns with it. */
export function diffSnapshots(before: SchemaSnapshot, after: SchemaSnapshot): OutsideChange[] {
  const out: OutsideChange[] = [];
  // A column added with SQL only compares between two looks that read `_meta`.
  const seen = (field: string) =>
    !field.startsWith(SQL_ONLY) || (before.meta !== false && after.meta !== false);
  for (const [id, now] of Object.entries(after.tables)) {
    const was = before.tables[id];
    if (!was) {
      out.push({ kind: 'table_added', table: now.name });
      continue;
    }
    if (was.name !== now.name) out.push({ kind: 'table_renamed', from: was.name, to: now.name });
    if (was.access !== now.access)
      out.push({ kind: 'access_changed', table: now.name, from: was.access, to: now.access });
    for (const [field, column] of Object.entries(now.columns)) {
      const old = was.columns[field];
      if (!old) {
        if (!seen(field)) continue;
        out.push({
          kind: 'column_added',
          table: now.name,
          column: column.name,
          ...(field.startsWith(SQL_ONLY) && { viaSql: true as const }),
        });
        continue;
      }
      if (old.name !== column.name)
        out.push({ kind: 'column_renamed', table: now.name, from: old.name, to: column.name });
      out.push(...columnChanges(now.name, old, column, before, after));
    }
    for (const [field, old] of Object.entries(was.columns)) {
      if (!(field in now.columns) && seen(field))
        out.push({ kind: 'column_removed', table: now.name, column: old.name });
    }
  }
  for (const [id, was] of Object.entries(before.tables)) {
    if (!(id in after.tables)) out.push({ kind: 'table_removed', table: was.name });
  }
  return out;
}

const ACCESS_WORDS: Record<string, string> = {
  shared: 'shared',
  private: 'private',
  custom: 'under custom policies',
};

const accessWord = (access: string) => ACCESS_WORDS[access] ?? access;

/** One line for the agent: "volunteers.phone was renamed to mobile". The cards word their own. */
export function outsideLine(c: OutsideChange): string {
  switch (c.kind) {
  case 'table_added':
    return `the table ${c.table} was added`;
  case 'table_removed':
    return `the table ${c.table} was deleted`;
  case 'table_renamed':
    return `the table ${c.from} was renamed to ${c.to}`;
  case 'column_added':
    return `${c.table}.${c.column} was added${c.viaSql ? ' with SQL' : ''}`;
  case 'column_removed':
    return `${c.table}.${c.column} was deleted`;
  case 'column_renamed':
    return `${c.table}.${c.from} was renamed to ${c.to}`;
  case 'access_changed':
    return `${c.table} became ${accessWord(c.to)} (it was ${accessWord(c.from)})`;
  case 'column_changed': {
    const at = `${c.table}.${c.column}`;
    if (c.what === 'required') return `${at} became ${c.to}`;
    if (c.what === 'type') return `${at} changed type from ${c.from} to ${c.to}`;
    if (c.what === 'default') return `the default of ${at} changed from ${c.from} to ${c.to}`;
    if (c.what === 'values') return `${at} allows ${c.to} now (it allowed ${c.from})`;
    return `${at} points at ${c.to} now (it pointed at ${c.from})`;
  }
  }
}
