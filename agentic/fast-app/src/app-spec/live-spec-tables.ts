// One live table as the AppSpec can say it: an entity, a link, or a curated
// table with the columns and keys added beside the blueprint's own; with what
// it can't say listed. live-spec.ts decides which tables render and puts the
// spec together.

import type { CuratedTable } from '../blueprints/curated';
import { type LiveColumn, type LiveModel, type LiveTable, tableWithId } from './live-model';
import {
  isSpecName,
  isSystemColumn,
  isSystemName,
  type ReadOnlyItem,
  specFieldOf,
} from './live-spec-fields';
import { linkKey, linkTableName } from './names';
import type { TableIntent } from './overlay';
import type { SpecBelongsTo, SpecEntity, SpecField, SpecLink } from './types';

export type TableShape =
  | { kind: 'entity'; entity: SpecEntity; readOnly: ReadOnlyItem[] }
  | { kind: 'link'; link: SpecLink; readOnly: ReadOnlyItem[] }
  | { kind: 'curated'; fields: SpecField[]; keys: SpecBelongsTo[]; readOnly: ReadOnlyItem[] }
  /** Nothing the spec can describe: the table is left out. */
  | { kind: 'empty'; readOnly: ReadOnlyItem[] };

export type ShapeContext = {
  model: LiveModel;
  /** The tables a key or a link may point at: the entities and the curated tables. */
  targets: ReadonlySet<string>;
  intent?: TableIntent;
  /** Set for a curated table: its own columns are the blueprint's and stay out. */
  curated?: CuratedTable;
  /** An entity type's table: its membership decides access, so the spec names none. */
  entityType?: boolean;
};

/** A column the spec describes, in table order: a plain field, or a key. */
type Entry = { column: LiveColumn; field?: SpecField; key?: SpecBelongsTo };

function walk(table: LiveTable, ctx: ShapeContext) {
  const entries: Entry[] = [];
  const readOnly: ReadOnlyItem[] = [];
  const keep = (c: LiveColumn, reason: string) =>
    readOnly.push({ kind: 'column', table: table.name, column: c.name, reason });
  const scoped = table.scoped;
  for (const c of table.columns) {
    if (ctx.curated?.columns.has(c.name) || isSystemColumn(c)) continue;
    // A scoped table's entity column belongs to its access, unless it is the
    // key the spec declared to the entity type's table.
    const keyTo = c.key && (tableWithId(ctx.model, c.key.to)?.name ?? c.key.toName);
    if (c.name === scoped?.field && !(keyTo && ctx.targets.has(keyTo))) continue;
    if (c.source === 'meta') {
      keep(c, 'added with SQL');
    } else if (isSystemName(c.name)) {
      keep(c, c.type);
    } else if (c.key) {
      const to = tableWithId(ctx.model, c.key.to)?.name ?? c.key.toName;
      const label = ctx.intent?.fields[c.id]?.label;
      if (!ctx.targets.has(to)) keep(c, `key to ${to}`);
      else if (c.key.onDelete === 'other') keep(c, `key to ${to} with another delete rule`);
      else if (!isSpecName(c.name)) keep(c, 'name');
      else
        entries.push({
          column: c,
          key: { field: c.name, to, onDelete: c.key.onDelete, ...(label && { label }) },
        });
    } else {
      const described = specFieldOf(table.name, c, ctx.intent?.fields[c.id]);
      if (described.readOnly) readOnly.push(described.readOnly);
      if ('field' in described) entries.push({ column: c, field: described.field });
    }
  }
  return { entries, readOnly, keys: entries.filter((e) => e.key) };
}

// Exactly two required keys that cascade, each named for its side, and the
// table named for the pair, or by the spec that made it.
function linkOf(
  table: LiveTable,
  { entries, readOnly }: ReturnType<typeof walk>,
  named: boolean,
): SpecLink | null {
  if (readOnly.length || entries.length !== 2 || entries.some((e) => !e.key)) return null;
  const fits = ({ column, key }: Entry) =>
    column.required && key.onDelete === 'cascade' && column.name === linkKey(key.to);
  if (!entries.every(fits) || entries[0].key.to === entries[1].key.to) return null;
  const [a, b] = entries.map((e) => e.key.to);
  const between: [string, string] =
    table.name === linkTableName({ between: [b, a] }) ? [b, a] : [a, b];
  if (named) return { name: table.name, between };
  return table.name === linkTableName({ between }) ? { between } : null;
}

// A key is listed in fields when keyIsRequired would read it wrong otherwise
// (optional, and not set to null), or when the entity has nothing else to list.
function entityFields(entries: Entry[], keys: Entry[]): SpecField[] {
  const keyField = (e: Entry, required: boolean): SpecField => ({
    name: e.key.field,
    type: 'uuid',
    ...(required && { required: true }),
  });
  const listed = (e: Entry) => !e.column.required && e.key.onDelete !== 'set_null';
  const fields = entries
    .filter((e) => e.field || listed(e))
    .map((e) => e.field ?? keyField(e, false));
  if (fields.length) return fields;
  return keys.map((e) => keyField(e, e.column.required && e.key.onDelete !== 'set_null'));
}

export function shapeOf(table: LiveTable, ctx: ShapeContext): TableShape {
  const walked = walk(table, ctx);
  const keys = walked.keys.map((e) => e.key);
  if (ctx.curated) {
    // A column added beside a blueprint's own must be optional or defaulted.
    const readOnly = [...walked.readOnly];
    const fields: SpecField[] = [];
    for (const { field, column } of walked.entries) {
      if (!field) continue;
      if (field.required && field.default === undefined)
        readOnly.push({
          kind: 'column',
          table: table.name,
          column: column.name,
          reason: 'required',
        });
      else fields.push(field);
    }
    return { kind: 'curated', fields, keys, readOnly };
  }
  const custom: ReadOnlyItem[] =
    table.access === 'custom' && !table.scoped && !ctx.entityType
      ? [{ kind: 'access', table: table.name }]
      : [];
  const link = linkOf(table, walked, ctx.intent?.link?.named === true);
  if (link) return { kind: 'link', link, readOnly: custom };
  const fields = entityFields(walked.entries, walked.keys);
  if (!fields.length) {
    return {
      kind: 'empty',
      readOnly: [
        ...walked.readOnly,
        { kind: 'table', table: table.name, reason: 'no columns the spec can describe' },
      ],
    };
  }
  const label = ctx.intent?.label;
  const entity: SpecEntity = {
    name: table.name,
    ...(label && { label }),
    ...(table.access === 'private' && { access: 'private' as const }),
    ...(table.scoped && { access: { scope: table.scoped.scope } }),
    fields,
    ...(keys.length && { belongsTo: keys }),
  };
  return { kind: 'entity', entity, readOnly: [...walked.readOnly, ...custom] };
}
