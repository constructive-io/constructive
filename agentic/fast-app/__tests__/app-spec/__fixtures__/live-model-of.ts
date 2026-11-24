import assert from 'node:assert/strict';

import type { CuratedBlueprint } from '../../../src/blueprints/curated';
import type { LiveMetaTable } from '../../../src/extensions/db-tools/live-meta';
import {
  type EntityTypeInput,
  type LiveColumn,
  type LiveModel,
  type LiveTable,
  mergeLiveModel,
  type SchemaColumnInput,
  type SchemaDefaultInput,
  type SchemaForeignKeyInput,
  type SchemaTableInput,
} from '../../../src/app-spec/live-model';
import { scopeColumn, scopeOfAccess } from '../../../src/app-spec/scope-access';
import { plannedScopeTree, type ScopeInfo } from '../../../src/app-spec/scope-tree';
import { encodeLanded, type SeededById } from '../../../src/app-spec/seed-ids';
import { type ModelTable, type SpecModel, specModel } from '../../../src/app-spec/spec-model';
import { FIELD_TYPES } from '../../../src/app-spec/translate';
import type { AppSpec, SpecField } from '../../../src/app-spec/types';
import { nowDefault } from '../../../src/app-spec/vocabulary';

// The database a spec's first build leaves, as db-tools and `_meta` read it,
// with ids that say what they are: `t:<table>` and `f:<table>.<column>`.

const SYSTEM_TYPES: Record<string, string> = {
  id: 'uuid',
  owner_id: 'uuid',
  entity_id: 'uuid',
  created_at: 'timestamptz',
  updated_at: 'timestamptz',
};

const tableId = (table: string) => `t:${table}`;
const fieldId = (table: string, column: string) => `f:${table}.${column}`;
const camel = (name: string) => name.replace(/_([a-z0-9])/g, (_, c: string) => c.toUpperCase());

function defaultOf(field: SpecField): SchemaDefaultInput | null {
  const value = field.default;
  if (value === undefined || value === null || typeof value === 'object') return null;
  const now = nowDefault(field.type, value);
  if (now) return { kind: now === 'now()' ? 'now' : 'today' };
  return { kind: 'value', value: value as string | number | boolean };
}

/**
 * An entity type the memberships module made, as the modules API and
 * metaschema list it: `[name, type]` for a column the spec added.
 */
export function entityTypeInput(
  prefix: string,
  table: string,
  added: ReadonlyArray<string | readonly [string, string]> = [],
  parentEntity = 'org',
  membershipType?: number | null,
): EntityTypeInput {
  const own = ['id', 'name', 'owner_id', 'created_at', 'updated_at'];
  // A spec may declare a column the type comes with (its `name`); that adds none.
  const extra = added.filter(
    (entry) => !own.includes(typeof entry === 'string' ? entry : entry[0]),
  );
  const columns = [...own, ...extra].map((entry, order): SchemaColumnInput => {
    const [name, type] = typeof entry === 'string' ? [entry, undefined] : entry;
    return {
      id: fieldId(table, name),
      name,
      order,
      type: type ?? SYSTEM_TYPES[name] ?? 'text',
      isRequired: own.includes(name),
      default: null,
    };
  });
  return {
    definition: {
      name: prefix,
      prefix,
      parentEntity,
      ...(membershipType != null && { membershipType }),
    },
    tableId: tableId(table),
    table,
    columns,
  };
}

const CRUD = ['SELECT', 'INSERT', 'UPDATE', 'DELETE'];
const sprtOf = (scope: string) => `${scope}_memberships_sprt`;

function tableOf(table: ModelTable, model: SpecModel, tree: readonly ScopeInfo[]) {
  const columns: SchemaColumnInput[] = [];
  const foreignKeys: SchemaForeignKeyInput[] = [];
  const values = new Map<string, string[]>();
  const column = (name: string, type: string, extra: Partial<SchemaColumnInput> = {}) =>
    columns.push({
      id: fieldId(table.name, name),
      name,
      order: columns.length,
      type,
      isRequired: false,
      default: null,
      ...extra,
    });
  const key = (name: string, to: string, onDelete: string, required: boolean) => {
    column(name, 'uuid', { isRequired: required });
    foreignKeys.push({
      columnIds: [fieldId(table.name, name)],
      targetTableId: tableId(to),
      targetTable: to,
      onDelete: onDelete as SchemaForeignKeyInput['onDelete'],
    });
  };
  const field = (f: SpecField) => {
    column(f.name, FIELD_TYPES[f.type], { isRequired: f.required === true, default: defaultOf(f) });
    // The values a status column allows are `_meta`'s.
    if (f.enum) values.set(f.name, f.enum);
  };
  const declaredKey = (name: string) => {
    const { key: k, required } = table.keys.get(name);
    key(name, k.to, k.onDelete ?? 'restrict', required);
  };
  if (table.curated) {
    for (const name of table.curated.columns) {
      const to = table.curated.keys.get(name);
      if (to) key(name, to, 'cascade', true);
      else column(name, SYSTEM_TYPES[name] ?? 'text');
    }
  } else {
    for (const name of ['id', 'owner_id', 'created_at', 'updated_at'])
      column(name, SYSTEM_TYPES[name]);
  }
  for (const f of table.entity?.fields ?? [])
    if (table.keys.has(f.name)) declaredKey(f.name);
    else field(f);
  if (!table.entity) for (const { field: f } of table.fields.values()) field(f);
  for (const name of table.keys.keys())
    if (!columns.some((c) => c.name === name)) declaredKey(name);
  // A scoped table: its entity's column, and that scope's membership on it.
  const found = scopeOfAccess(table.access) ? scopeColumn(model, table, tree) : null;
  const scoped = found && !('problem' in found) ? found : null;
  if (scoped && scoped.kind !== 'key') column(scoped.field, 'uuid', { isRequired: true });
  const schema: SchemaTableInput = {
    id: tableId(table.name),
    name: table.name,
    access: scoped ? 'custom' : (table.access as SchemaTableInput['access']),
    columns,
    foreignKeys,
    ...(scoped && {
      policies: CRUD.map((privilege) => ({
        type: 'AuthzEntityMembership',
        privilege,
        permissive: true,
        disabled: false,
        data: { entity_field: scoped.field, sprt_table: sprtOf(scoped.scope) },
      })),
    }),
  };
  const meta: LiveMetaTable = {
    name: camel(`_${table.name}`),
    tableName: table.name,
    fields: columns.map((c) => ({
      name: camel(c.name),
      ...(values.has(c.name) && { allowedValues: values.get(c.name) }),
    })),
  };
  return { schema, meta };
}

/**
 * Columns changed with raw SQL, as `[table, column]`: one added shows in
 * `_meta` alone (as text), one dropped stays in metaschema alone, which reads
 * the same as an API that doesn't list the column yet.
 */
export type SqlChanges = {
  added?: ReadonlyArray<readonly [string, string]>;
  dropped?: ReadonlyArray<readonly [string, string]>;
};

function changeWithSql(meta: LiveMetaTable[], { added = [], dropped = [] }: SqlChanges) {
  const fieldsOf = (table: string) => {
    const found = meta.find((t) => t.tableName === table);
    assert.ok(found, table);
    return found.fields;
  };
  for (const [table, column] of added) {
    const type = { gqlType: 'String', isArray: false, pgType: 'text', subtype: null as string | null };
    fieldsOf(table).push({
      name: camel(column),
      columnName: column,
      type: { ...type, isNotNull: false, hasDefault: false },
    });
  }
  for (const [table, column] of dropped) {
    const fields = fieldsOf(table);
    const at = fields.findIndex((f) => f.name === camel(column));
    assert.ok(at >= 0, `${table}.${column}`);
    fields.splice(at, 1);
  }
}

/** The database the spec's first build left: hash `h0`, every table the spec has; `sql` changed after. */
export function liveModelOf(
  spec: AppSpec,
  {
    blueprints = {},
    sql = {},
    scopes,
  }: {
    blueprints?: Readonly<Record<string, CuratedBlueprint>>;
    sql?: SqlChanges;
    /** The database's scopes; its entity types' tables are core tables, outside the app schema. */
    scopes?: readonly ScopeInfo[];
  } = {},
): LiveModel {
  const tree = scopes ?? plannedScopeTree(undefined);
  const entityTables = new Map(
    (scopes ? tree.flatMap((info): string | string[] => info.entityTable ?? []) : []).map((name) => [
      name,
      new Set<string>(),
    ]),
  );
  const model = specModel(spec, blueprints, entityTables);
  const tables = [...model.tables.values()]
    .filter((table) => table.origin !== 'entity-type' && !entityTables.has(table.name))
    .map((table) => tableOf(table, model, tree));
  const meta = tables.map((t) => t.meta);
  changeWithSql(meta, sql);
  return mergeLiveModel({
    schema: { databaseId: 'db-1', hash: 'h0', tables: tables.map((t) => t.schema) },
    meta,
    scopes: {
      sprtTables: Object.fromEntries(tree.map((info) => [sprtOf(info.scope), info.scope])),
      entityTypes: tree.flatMap((info) =>
        scopes && info.entityTable
          ? [
              entityTypeInput(
                info.scope,
                info.entityTable,
                // The columns a spec adds to it, beside the ones the type comes with.
                [...(model.tables.get(info.entityTable)?.fields.values() ?? [])].map(
                  ({ field }) => [field.name, FIELD_TYPES[field.type]] as const,
                ),
                info.parent ?? 'org',
                info.membershipType,
              ),
            ]
          : [],
      ),
    },
  });
}

/** The spec's seed rows as a build records them once they landed, with made-up ids. */
export function landedOf(spec: AppSpec, model: LiveModel): SeededById {
  const seeded: SeededById = {};
  for (const [table, rows] of Object.entries(spec.seed ?? {})) {
    const landed = encodeLanded(table, rows, model);
    assert.ok(landed, table);
    seeded[landed.id] = { rows: landed.rows, ids: rows.map((_, i) => `${table}-${i}`) };
  }
  return seeded;
}

// Changes made outside the app. Each returns a new model with the hash moved.

function edit(model: LiveModel, table: string, change: (t: LiveTable) => void): LiveModel {
  const next = structuredClone(model);
  next.hash = `h${Number(model.hash.slice(1)) + 1}`;
  const found = next.tables.find((t) => t.name === table);
  assert.ok(found, table);
  change(found);
  return next;
}

function columnOf(table: LiveTable, name: string): LiveColumn {
  const found = table.columns.find((c) => c.name === name);
  assert.ok(found, `${table.name}.${name}`);
  return found;
}

export const renameTable = (model: LiveModel, from: string, to: string) =>
  edit(model, from, (t) => {
    t.name = to;
  });

export const renameColumn = (model: LiveModel, table: string, from: string, to: string) =>
  edit(model, table, (t) => {
    columnOf(t, from).name = to;
  });

export const dropColumn = (model: LiveModel, table: string, column: string) =>
  edit(model, table, (t) => {
    columnOf(t, column);
    t.columns = t.columns.filter((c) => c.name !== column);
  });

/** Deleting a table drops the keys that point at it; their columns stay. */
export function dropTable(model: LiveModel, table: string): LiveModel {
  const next = edit(model, table, () => {});
  const gone = next.tables.find((t) => t.name === table);
  next.tables = next.tables.filter((t) => t !== gone);
  for (const t of next.tables) for (const c of t.columns) if (c.key?.to === gone.id) c.key = null;
  return next;
}

export const setRequired = (model: LiveModel, table: string, column: string, required = true) =>
  edit(model, table, (t) => {
    columnOf(t, column).required = required;
  });

export const setType = (model: LiveModel, table: string, column: string, type: string) =>
  edit(model, table, (t) => {
    columnOf(t, column).type = type;
  });

export const setValues = (model: LiveModel, table: string, column: string, values: string[]) =>
  edit(model, table, (t) => {
    columnOf(t, column).values = values;
  });

export const setAccess = (model: LiveModel, table: string, access: LiveTable['access']) =>
  edit(model, table, (t) => {
    t.access = access;
  });

/** A column made outside the app, with an id no built column has. */
export const addColumn = (
  model: LiveModel,
  table: string,
  column: string,
  type: string,
  extra: Partial<LiveColumn> = {},
) =>
  edit(model, table, (t) => {
    t.columns.push({
      id: `new:${table}.${column}`,
      name: column,
      type,
      required: false,
      default: null,
      values: null,
      key: null,
      source: 'both',
      ...extra,
    });
  });
