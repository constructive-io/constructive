// What the database can't hold about an app: labels, UI hints, `long_text`
// and `money`, a link's own name, the sidebar and the dashboard. A build keeps
// it keyed by metaschema's table and field ids, so it follows a rename made
// outside the app and falls away with a drop. The spec the agent reads is the
// database rendered with this on top (live-spec.ts).

import { normalizeKey } from './contract/app-spec.types';
import {
  columnNamed,
  type LiveModel,
  type LiveTable,
  namedTables,
  tableNamed,
  tableWithId,
} from './live-model';
import { linkTableName } from './names';
import type {
  AppSpec,
  FieldUiSpec,
  FilterValue,
  ResourceUiSpec,
  SpecBelongsTo,
  SpecField,
} from './types';

export type FieldIntent = { label?: string; type?: 'long_text' | 'money'; ui?: FieldUiSpec };

/** Field references are refs: a field id, or "name:<x>" for a name no column has. */
export type TableUiIntent = Omit<ResourceUiSpec, 'fields'>;

export type TableIntent = {
  label?: string;
  /** A link the spec named itself, so the view writes `{ name, between }` back. */
  link?: { named: boolean };
  ui?: TableUiIntent;
  /** By field id, or "name:<x>" for a hint on a name no column has. */
  fields: Record<string, FieldIntent>;
};

export type TileIntent = {
  kind: 'count' | 'recent';
  /** A table ref: its id, or "name:<x>" for a resource no table has. */
  table: string;
  label?: string;
  limit?: number;
  /** By field ref. */
  filters?: Record<string, FilterValue>;
};

export type IntentOverlay = {
  app: {
    name: string;
    tagline?: string;
    backend: { kind: 'custom' } | { kind: 'blueprint'; slug: string };
  };
  /** Table ids this app's builds created. */
  owned: string[];
  /**
   * By table id, or "name:<x>" for a table only the API lists: an entity
   * type's, which its membership module makes outside the app schema.
   */
  tables: Record<string, TableIntent>;
  /** Sidebar order, as table refs. */
  nav?: string[];
  dashboard?: TileIntent[];
  /** The opt-in scope screens: names of membership scopes, not tables, so kept as written. */
  workspace?: { scope: string };
  access?: string[];
};

const UNRESOLVED = 'name:';

/** A ref's name when it never resolved to an id, else null. */
export const unresolvedName = (ref: string): string | null =>
  ref.startsWith(UNRESOLVED) ? ref.slice(UNRESOLVED.length) : null;

const fieldRef = (table: LiveTable | undefined, name: string) =>
  (table && columnNamed(table, name)?.id) ?? `${UNRESOLVED}${name}`;

const tableRef = (model: LiveModel, name: string) =>
  tableNamed(model, name)?.id ?? `${UNRESOLVED}${name}`;

function intentFor(tables: Record<string, TableIntent>, id: string): TableIntent {
  tables[id] ??= { fields: {} };
  return tables[id];
}

// The spec's labels and field kinds; `declared` collects every column the spec declares.
function fieldIntents(
  intent: TableIntent,
  table: LiveTable,
  { fields, keys }: { fields: readonly SpecField[]; keys: readonly SpecBelongsTo[] },
  declared: Set<string>,
) {
  // A column added with SQL has no id to keep its intent by.
  for (const field of fields) {
    const column = columnNamed(table, field.name);
    if (!column?.id) continue;
    declared.add(column.id);
    const kind = field.type === 'long_text' || field.type === 'money' ? field.type : undefined;
    if (!field.label && !kind) continue;
    intent.fields[column.id] = {
      ...intent.fields[column.id],
      ...(field.label && { label: field.label }),
      ...(kind && { type: kind }),
    };
  }
  for (const key of keys) {
    const column = columnNamed(table, key.field);
    if (!column?.id) continue;
    declared.add(column.id);
    if (key.label) intent.fields[column.id] = { ...intent.fields[column.id], label: key.label };
  }
}

// A table only the API lists has no id to keep its hints by, so they keep its
// name, as an older build kept an entity type's table's: the backend names
// those, and the app can't rename them.
function apiTableRef(model: LiveModel, name: string): string | null {
  const key = normalizeKey(name);
  const sqlName = [...model.metaTableNames].find((n) => normalizeKey(n) === key);
  return sqlName ? `${UNRESOLVED}${sqlName}` : null;
}

function uiIntents(model: LiveModel, tables: Record<string, TableIntent>, spec: AppSpec) {
  for (const [key, { fields, ...ui }] of Object.entries(spec.ui?.resources ?? {})) {
    const table = tableNamed(model, key);
    const ref = table?.id ?? apiTableRef(model, key);
    if (!ref) continue;
    const intent = intentFor(tables, ref);
    const refs = (names: string[] | undefined) => names?.map((n) => fieldRef(table, n));
    if (Object.keys(ui).length) {
      intent.ui = {
        ...ui,
        ...(ui.titleField && { titleField: fieldRef(table, ui.titleField) }),
        ...(ui.columns && { columns: refs(ui.columns) }),
        ...(ui.formFields && { formFields: refs(ui.formFields) }),
      };
    }
    for (const [name, hint] of Object.entries(fields ?? {})) {
      const ref = fieldRef(table, name);
      intent.fields[ref] = { ...intent.fields[ref], ui: hint };
    }
  }
}

/**
 * The overlay a build keeps: the spec's intent by id, resolved through the
 * model the build's schema step left. From `prior` it keeps the tables its
 * builds made, and the labels and kinds of live columns the spec doesn't
 * declare (one that went read-only gets them back when it no longer is);
 * `created` are the table ids this build made.
 */
export function overlayOf(
  spec: AppSpec,
  model: LiveModel,
  prior: IntentOverlay | null,
  created: readonly string[],
): IntentOverlay {
  const live = new Set(namedTables(model).flatMap((t) => [t.id, ...t.columns.map((c) => c.id)]));
  const tables: Record<string, TableIntent> = {};
  const declared = new Set<string>();
  const backend = spec.backend;
  const extend = backend.kind === 'blueprint' ? (backend.extend ?? {}) : {};
  const entities = backend.kind === 'custom' ? backend.entities : (extend.entities ?? []);
  const links = backend.kind === 'custom' ? (backend.links ?? []) : (extend.links ?? []);
  for (const entity of entities) {
    const table = tableNamed(model, entity.name);
    if (!table) continue;
    const intent = intentFor(tables, table.id);
    if (entity.label) intent.label = entity.label;
    fieldIntents(intent, table, { fields: entity.fields, keys: entity.belongsTo ?? [] }, declared);
  }
  for (const link of links) {
    const table = tableNamed(model, linkTableName(link));
    if (table) intentFor(tables, table.id).link = { named: link.name !== undefined };
  }
  const extended = new Set([
    ...Object.keys(extend.fields ?? {}),
    ...Object.keys(extend.belongsTo ?? {}),
  ]);
  for (const name of extended) {
    const table = tableNamed(model, name);
    if (!table) continue;
    const intent = intentFor(tables, table.id);
    const added = { fields: extend.fields?.[name] ?? [], keys: extend.belongsTo?.[name] ?? [] };
    fieldIntents(intent, table, added, declared);
  }
  uiIntents(model, tables, spec);

  // UI hints always fit the spec, so only labels and kinds carry over.
  for (const [id, was] of Object.entries(prior?.tables ?? {})) {
    if (!live.has(id)) continue;
    for (const [ref, { label, type }] of Object.entries(was.fields)) {
      if (!live.has(ref) || declared.has(ref) || (!label && !type)) continue;
      const intent = intentFor(tables, id);
      intent.fields[ref] = {
        ...intent.fields[ref],
        ...(label && { label }),
        ...(type && { type }),
      };
    }
  }

  const nav = spec.ui?.nav?.map((name) => tableRef(model, name));
  const dashboard = spec.ui?.dashboard?.tiles.map((tile): TileIntent => {
    const table = tableNamed(model, tile.resource);
    return {
      kind: tile.kind,
      table: tableRef(model, tile.resource),
      ...(tile.label && { label: tile.label }),
      ...(tile.kind === 'recent' && tile.limit !== undefined && { limit: tile.limit }),
      ...(tile.kind === 'count' &&
        tile.filters && {
        filters: Object.fromEntries(
          Object.entries(tile.filters).map(([name, value]) => [fieldRef(table, name), value]),
        ),
      }),
    };
  });
  const owned = [...new Set([...(prior?.owned ?? []), ...created])].filter((id) =>
    Boolean(tableWithId(model, id)),
  );
  return {
    app: {
      name: spec.name,
      ...(spec.tagline && { tagline: spec.tagline }),
      backend:
        backend.kind === 'blueprint'
          ? { kind: 'blueprint', slug: backend.slug }
          : { kind: 'custom' },
    },
    owned,
    tables,
    ...(nav && { nav }),
    ...(dashboard && { dashboard }),
    ...(spec.ui?.workspace && { workspace: { scope: spec.ui.workspace.scope } }),
    ...(spec.ui?.access?.length && { access: [...spec.ui.access] }),
  };
}
