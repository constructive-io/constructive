// The project's database as plan_app reads it now: db-tools' schema model
// (metaschema: stable ids, types, required, defaults, keys, who sees the rows)
// merged with `_meta` (the values a status column allows, the API's names).
// The app spec is rendered from it, and the planner measures against it, so a
// change made outside the desktop is what the planner starts from.
//
// Pure: the reads happen elsewhere and hand their results in. It imports only
// by relative path, so the pnpm test runner loads it directly.

import { generatedMetaTables } from '../blueprints/generated-tables';
import type { LiveMetaField, LiveMetaTable } from '../extensions/db-tools/live-meta';
import { MetaIndex, normalizeKey, sqlTableName } from '../extensions/db-tools/live-meta-index';
import { RESERVED_TABLES } from './entity-checks';
import type { LiveSchema } from './types';

// db-tools' `readSchemaModel` (APP tables only), read structurally so this
// module never imports db-tools. The names follow its ModelTable, ModelColumn
// and ModelForeignKey; only what the view needs is listed.
export type SchemaDefaultInput =
  | { kind: 'value'; value: string | number | boolean | null }
  | { kind: 'now' }
  | { kind: 'today' }
  | { kind: 'generated'; fn: string }
  | { kind: 'expression'; text: string };

export type SchemaColumnInput = {
  id: string;
  name: string;
  order?: number;
  /** Normalised: text, integer, numeric, boolean, date, timestamptz, email, url, uuid, jsonb, …, plus '[]' per dimension. */
  type: string;
  isRequired: boolean;
  default: SchemaDefaultInput | null;
  allowedValues?: string[];
  generated?: boolean;
};

export type SchemaForeignKeyInput = {
  columnIds: string[];
  targetTableId: string;
  targetTable: string;
  onDelete: 'cascade' | 'set_null' | 'restrict' | 'no_action' | 'set_default';
};

export type SchemaPolicyInput = {
  type: string;
  privilege: string;
  permissive: boolean;
  disabled: boolean;
  data: Record<string, unknown> | null;
};

export type SchemaTableInput = {
  id: string;
  name: string;
  access: 'shared' | 'private' | 'custom';
  columns: SchemaColumnInput[];
  foreignKeys: SchemaForeignKeyInput[];
  /** Internal policies left out, as db-tools reads them. */
  policies?: SchemaPolicyInput[];
};

/** How `manage_entity_types` made an entity type: what a rebuild needs to make it again. */
export type EntityTypeDefinition = {
  name: string;
  prefix: string;
  description?: string;
  parentEntity?: string;
  isVisible?: boolean;
  hasInvites?: boolean;
  hasProfiles?: boolean;
  hasLimits?: boolean;
  hasLevels?: boolean;
  /** The storage the provision asked for, replayed as the backend recorded it. */
  storage?: unknown;
  /** The membership type the backend gave it; a remade type must get the same, as the plan names it. */
  membershipType?: number;
};

/** One entity type of the database, read from the modules API. */
export type EntityTypeInput = {
  definition: EntityTypeDefinition;
  /** Its table's metaschema id and SQL name. */
  tableId: string;
  table: string;
  /** The table's columns, as metaschema lists them. */
  columns: readonly SchemaColumnInput[];
};

/** The membership scopes of the database, read from the modules API. */
export type ScopesInput = {
  entityTypes: readonly EntityTypeInput[];
  /** Each scope's membership lookup table, by SQL name; a policy names it as its `sprt_table`. */
  sprtTables: Readonly<Record<string, string>>;
};

/** An entity type's table, which the app schema model leaves out: the memberships module made it. */
export type LiveEntityTable = {
  scope: string;
  definition: EntityTypeDefinition;
  /** The table as the spec reads it; its membership, not a policy of its own, decides access. */
  table: LiveTable;
};

export type SchemaModelInput = {
  databaseId: string;
  hash: string | null;
  tables: SchemaTableInput[];
};

export type LiveDefault =
  | { kind: 'literal'; value: string | number | boolean }
  | { kind: 'now' }
  | { kind: 'today' }
  | { kind: 'expression'; sql: string };

/** A foreign key: the table it points at, by id and by name (the name stays when that table isn't an app table). */
export type LiveKey = {
  to: string;
  toName: string;
  onDelete: 'cascade' | 'set_null' | 'restrict' | 'other';
};

export type LiveColumn = {
  /** Metaschema's field id; null for a column only `_meta` lists. */
  id: string | null;
  name: string;
  type: string;
  required: boolean;
  default: LiveDefault | null;
  /** The values the column allows: `_meta`'s, else the ones metaschema's check lists. */
  values: string[] | null;
  key: LiveKey | null;
  /** The database computes it; nothing writes it. */
  generated?: true;
  /**
   * Who lists it: both, metaschema alone (the API hasn't caught up; it counts
   * as in the database), or `_meta` alone (added with SQL). Both when `_meta`
   * wasn't read or doesn't list the table.
   */
  source: 'both' | 'schema' | 'meta';
};

export type LiveTable = {
  id: string;
  name: string;
  access: 'shared' | 'private' | 'custom';
  columns: LiveColumn[];
  /** The table's GraphQL type in `_meta`, null when `_meta` doesn't list it (yet). */
  metaName: string | null;
  inMeta: boolean;
  /**
   * Set when only one scope's members may use the table: every policy is
   * that scope's entity membership on `field`, for every privilege.
   */
  scoped?: { scope: string; field: string };
};

export type LiveModel = {
  databaseId: string;
  hash: string;
  tables: LiveTable[];
  /** Whether `_meta` was read; without it, values come from metaschema alone. */
  metaRead: boolean;
  /** API table names, including core tables the app schema model leaves out. */
  metaTableNames: ReadonlySet<string>;
  /** The entity types' tables, by SQL name. */
  entityTables: ReadonlyMap<string, LiveEntityTable>;
  /** Tables that search and storage manage, including ones outside the app schema. */
  generatedTables: ReadonlyMap<string, string>;
  /** A digest of `_meta`'s table and column names, computed by the reader. */
  metaDigest: string | null;
};

const ON_DELETE: Record<SchemaForeignKeyInput['onDelete'], LiveKey['onDelete']> = {
  cascade: 'cascade',
  set_null: 'set_null',
  restrict: 'restrict',
  // NO ACTION refuses the delete like RESTRICT unless the key is deferred,
  // which no app key is; db-tools' add_relation creates keys this way.
  no_action: 'restrict',
  set_default: 'other',
};

function liveDefault(d: SchemaDefaultInput | null): LiveDefault | null {
  if (!d) return null;
  switch (d.kind) {
  case 'value':
    return d.value === null ? null : { kind: 'literal', value: d.value };
  case 'generated':
    return { kind: 'expression', sql: d.fn };
  case 'expression':
    return { kind: 'expression', sql: d.text };
  default:
    return { kind: d.kind };
  }
}

// A column `_meta` lists and metaschema doesn't. An older backend serves no
// `columnName`, so the SQL name is guessed back from the API's camelCase.
function sqlColumn(field: LiveMetaField): LiveColumn {
  return {
    id: null,
    name: field.columnName ?? field.name.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`),
    type: field.type?.pgType ?? 'unknown',
    required: field.isNotNull ?? field.type?.isNotNull ?? false,
    default: null,
    values: field.allowedValues?.length ? [...field.allowedValues] : null,
    key: null,
    source: 'meta',
  };
}

function keyOf(table: SchemaTableInput, column: SchemaColumnInput): LiveKey | null {
  const fk = table.foreignKeys.find((k) => k.columnIds.includes(column.id));
  if (!fk) return null;
  return {
    to: fk.targetTableId,
    toName: fk.targetTable,
    // A key across several columns has no AppSpec spelling.
    onDelete: fk.columnIds.length === 1 ? ON_DELETE[fk.onDelete] : 'other',
  };
}

/**
 * The schema model and `_meta` as one model; `meta` null when `_meta` couldn't
 * be read. Metaschema files the platform's own `users` table with the app's
 * tables, though no app owns it: it stays out, so nothing renders, plans or
 * reports it, and a key to it keeps the name. Raw SQL changes the database
 * and not metaschema, so in a table both list, a column only `_meta` has was
 * added with SQL. A column only metaschema has is one the API hasn't caught
 * up with yet: its schema can stay stale for minutes, so the column counts as
 * there (see `source`). A table only metaschema lists may just be new to
 * `_meta`, and one only `_meta` lists isn't an app table.
 */
// Policy parameters an entity membership can carry without narrowing who it
// lets in: the column, and the membership lookup the backend resolved.
const PLAIN_ENTITY_DATA = new Set([
  'entity_field',
  'sel_field',
  'sprt_table',
  'sprt_schema',
  'membership_type',
  'check_function_name',
  'check_function_schema',
]);
const CRUD = ['select', 'insert', 'update', 'delete'];

// A table only one scope's members use: each policy is a plain entity
// membership on the same column and lookup, and together they cover CRUD.
function scopedAccess(
  policies: readonly SchemaPolicyInput[] | undefined,
  sprtTables: Readonly<Record<string, string>> | undefined,
): { scoped: { scope: string; field: string } } | Record<string, never> {
  const live = (policies ?? []).filter((policy) => !policy.disabled);
  if (!live.length || !sprtTables) return {};
  const plain = live.every(
    (policy) =>
      policy.type === 'AuthzEntityMembership' &&
      policy.permissive &&
      Object.keys(policy.data ?? {}).every((key) => PLAIN_ENTITY_DATA.has(key)),
  );
  if (!plain) return {};
  const pairs = new Set(
    live.map((policy) => `${String(policy.data?.entity_field)} ${String(policy.data?.sprt_table)}`),
  );
  if (pairs.size !== 1) return {};
  const [field, sprt] = [...pairs][0].split(' ');
  const scope = sprtTables[sprt];
  const privileges = new Set(live.map((policy) => policy.privilege.toLowerCase()));
  const covered = privileges.has('all') || CRUD.every((privilege) => privileges.has(privilege));
  return scope && field && covered ? { scoped: { scope, field } } : {};
}

// One table as the planner reads it: metaschema's columns with `_meta`'s
// values, the columns only `_meta` lists, and whether one scope's members own it.
function liveTableOf(
  table: SchemaTableInput,
  index: MetaIndex | null,
  sprtTables?: Readonly<Record<string, string>>,
): LiveTable {
  const meta = index?.find(table.name);
  const metaFields = new Map(
    (meta?.fields ?? []).map((f) => [normalizeKey(f.columnName ?? f.name), f]),
  );
  const columns = [...table.columns]
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    .map((column): LiveColumn => {
      const metaField = metaFields.get(normalizeKey(column.name));
      const metaValues = metaField?.allowedValues;
      const values = metaValues?.length
        ? metaValues
        : column.allowedValues?.length
          ? column.allowedValues
          : null;
      return {
        id: column.id,
        name: column.name,
        type: column.type,
        required: column.isRequired,
        default: liveDefault(column.default),
        values: values ? [...values] : null,
        key: keyOf(table, column),
        ...(column.generated ? { generated: true as const } : {}),
        source: !meta || metaField ? 'both' : 'schema',
      };
    });
  const listed = new Set(table.columns.map((c) => normalizeKey(c.name)));
  for (const [key, field] of metaFields) if (!listed.has(key)) columns.push(sqlColumn(field));
  return {
    id: table.id,
    name: table.name,
    access: table.access,
    columns,
    metaName: meta?.name ?? null,
    inMeta: Boolean(meta),
    ...scopedAccess(table.policies, sprtTables),
  };
}

export function mergeLiveModel(input: {
  databaseId?: string;
  hash?: string | null;
  schema: SchemaModelInput;
  meta: readonly LiveMetaTable[] | null;
  metaDigest?: string | null;
  scopes?: ScopesInput;
}): LiveModel {
  const index = input.meta ? new MetaIndex(input.meta) : null;
  const own = input.schema.tables.filter((table) => !RESERVED_TABLES.has(table.name));
  const tables = own.map((table) => liveTableOf(table, index, input.scopes?.sprtTables));
  const generatedTables = new Map<string, string>();
  for (const [table, reason] of generatedMetaTables(input.meta ?? [])) {
    const name = sqlTableName(table);
    if (name) generatedTables.set(name, reason);
  }
  for (const table of input.meta ?? []) {
    const name = sqlTableName(table);
    if (name && (table.storage?.isFilesTable || table.storage?.isBucketsTable)) {
      generatedTables.set(name, 'storage module table');
    }
  }
  return {
    databaseId: input.databaseId ?? input.schema.databaseId,
    hash: input.hash ?? input.schema.hash ?? '',
    tables,
    metaRead: input.meta !== null,
    metaTableNames: new Set((input.meta ?? []).flatMap((table): string | string[] => sqlTableName(table) ?? [])),
    entityTables: new Map(
      (input.scopes?.entityTypes ?? []).map((type) => [
        type.table,
        {
          scope: type.definition.prefix,
          definition: type.definition,
          table: liveTableOf(
            {
              id: type.tableId,
              name: type.table,
              access: 'custom',
              columns: [...type.columns],
              foreignKeys: [],
            },
            index,
          ),
        },
      ]),
    ),
    generatedTables,
    metaDigest: input.metaDigest ?? null,
  };
}

/** Table name → the column names the database has, for the planner's `live` check. */
export function liveColumns(model: LiveModel): LiveSchema {
  return new Map(model.tables.map((t) => [t.name, new Set(t.columns.map((c) => c.name))]));
}

/** Table name → column names, of the columns raw SQL added outside metaschema. */
export type SchemaSkew = {
  /** Only `_meta` lists them: added with SQL. */
  metaOnly: ReadonlyMap<string, ReadonlySet<string>>;
};

export function skewOf(model: LiveModel): SchemaSkew {
  return {
    metaOnly: new Map(
      model.tables.flatMap((t) => {
        const names = t.columns.filter((c) => c.source === 'meta').map((c) => c.name);
        return names.length ? [[t.name, new Set(names)] as const] : [];
      }),
    ),
  };
}

/** The columns metaschema lists and `_meta` doesn't yet: the API is behind the database. */
export const apiBehind = (model: LiveModel): Array<{ table: string; column: string }> =>
  model.tables.flatMap((t) =>
    t.columns.filter((c) => c.source === 'schema').map((c) => ({ table: t.name, column: c.name })),
  );

/** Where the desktop keeps a column by id: its field id, or `meta:<name>` for one only `_meta` lists. */
export const columnKey = (column: LiveColumn): string => column.id ?? `meta:${column.name}`;

/**
 * The tables a key, a label or a sample row may name: the app's, then the
 * entity types' tables, which a spec may declare and seed too.
 */
export const namedTables = (model: LiveModel): LiveTable[] => [
  ...model.tables,
  ...[...model.entityTables.values()].map((entity) => entity.table),
];

/**
 * Each entity type's table with the columns it has now, as the database names
 * them: the type's own (its `name`) and the ones builds added. A spec adds
 * columns to the table but may name these without declaring them.
 */
export const entityTableColumns = (model: LiveModel): Map<string, Set<string>> =>
  new Map(
    [...model.entityTables].map(([name, entity]) => [
      name,
      new Set(entity.table.columns.map((column) => column.name)),
    ]),
  );

export const tableWithId = (model: LiveModel, id: string): LiveTable | undefined =>
  namedTables(model).find((t) => t.id === id);

/** A table by its SQL name, else by any spelling of it (`volunteer-shifts`, `volunteerShifts`). */
export function tableNamed(model: LiveModel, name: string): LiveTable | undefined {
  const key = normalizeKey(name);
  const tables = namedTables(model);
  return tables.find((t) => t.name === name) ?? tables.find((t) => normalizeKey(t.name) === key);
}

/** A column by its SQL name, else by its API spelling (`fullName`). */
export function columnNamed(table: LiveTable, name: string): LiveColumn | undefined {
  const key = normalizeKey(name);
  return (
    table.columns.find((c) => c.name === name) ??
    table.columns.find((c) => normalizeKey(c.name) === key)
  );
}
