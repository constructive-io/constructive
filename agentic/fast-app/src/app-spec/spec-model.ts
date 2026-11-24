// A spec as the tables it asks for, whatever its backend: a custom backend's
// entities and links, or a curated blueprint's tables with the columns and keys
// its `extend` adds plus the entities and links beside them. This is the one
// view of a spec: validation, the seed plan and the delta all read it.

import {
  CURATED_BLUEPRINTS,
  type CuratedBlueprint,
  type CuratedTable,
  curatedTables,
} from '../blueprints/curated';
import { linkKey, linkTableName } from './names';
import { accessOf, keyIsRequired } from './translate';
import type {
  AccessMode,
  AppSpec,
  SpecBelongsTo,
  SpecEntity,
  SpecField,
  SpecLink,
} from './types';
import { SYSTEM_COLUMNS } from './vocabulary';

export type ModelField = { field: SpecField; path: string };
export type ModelKey = { key: SpecBelongsTo; required: boolean; path: string };

export type ModelTable = {
  name: string;
  /**
   * `blueprint`: a curated table; the spec adds to it but never makes or drops it.
   * `entity-type`: an entity type's table the spec doesn't declare; its keys
   * and links may point at it, and nothing makes or drops it.
   */
  origin: 'entity' | 'link' | 'blueprint' | 'entity-type';
  path: string;
  access: AccessMode;
  /** Columns the spec declares, keys left out. */
  fields: Map<string, ModelField>;
  /** Keys the spec declares; a curated table's own keys are in `curated`. */
  keys: Map<string, ModelKey>;
  /** Every column a row can name: the system or curated ones, then the declared fields and keys. */
  columns: Set<string>;
  entity?: SpecEntity;
  link?: SpecLink;
  /** A curated table as the registry has it; absent when the registry doesn't know the table. */
  curated?: CuratedTable;
};

export type SpecModel = {
  /** By name: the curated tables first, then the entities, then the links. */
  tables: Map<string, ModelTable>;
  /** A blueprint backend: its slug and what the registry has under it. */
  blueprint?: {
    slug: string;
    /** False when the registry has no blueprint by this slug; `offered` lists the ones it has. */
    known: boolean;
    offered: string[];
    /** The blueprint's own tables, whatever the spec declares beside them. */
    tables: Map<string, CuratedTable>;
  };
};

const columnsOf = (base: Iterable<string>, fields: Iterable<string>, keys: Iterable<string>) =>
  new Set([...base, ...fields, ...keys]);

/** `own`: an entity type's table's columns, which a row may name though the spec doesn't declare them. */
function entityTable(
  entity: SpecEntity,
  path: string,
  own: ReadonlySet<string> = new Set(),
): ModelTable {
  const keys = new Map(
    (entity.belongsTo ?? []).map((key, k): [string, ModelKey] => [
      key.field,
      { key, required: keyIsRequired(entity, key), path: `${path}.belongsTo[${k}]` },
    ]),
  );
  const fields = new Map<string, ModelField>();
  entity.fields.forEach((field, j) => {
    if (!keys.has(field.name)) fields.set(field.name, { field, path: `${path}.fields[${j}]` });
  });
  return {
    name: entity.name,
    origin: 'entity',
    path,
    access: accessOf(entity),
    fields,
    keys,
    columns: columnsOf([...SYSTEM_COLUMNS, ...own], fields.keys(), keys.keys()),
    entity,
  };
}

function linkTable(link: SpecLink, path: string, access: (side: string) => AccessMode): ModelTable {
  const keys = new Map(
    link.between.map((side): [string, ModelKey] => [
      linkKey(side),
      { key: { field: linkKey(side), to: side, onDelete: 'cascade' }, required: true, path },
    ]),
  );
  return {
    name: linkTableName(link),
    origin: 'link',
    path,
    access: link.between.some((side) => access(side) === 'private') ? 'private' : 'shared',
    fields: new Map(),
    keys,
    columns: columnsOf(SYSTEM_COLUMNS, [], keys.keys()),
    link,
  };
}

/**
 * The spec's tables against `blueprints`, the curated registry unless a test
 * passes its own, and the database's `entityTables` with their columns
 * (`entityTableColumns`): a key or a link may name such a table, and a row its
 * columns, without the spec declaring them.
 */
export function specModel(
  spec: AppSpec,
  blueprints: Readonly<Record<string, CuratedBlueprint>> = CURATED_BLUEPRINTS,
  entityTables: ReadonlyMap<string, ReadonlySet<string>> = new Map(),
): SpecModel {
  const tables = new Map<string, ModelTable>();
  const model: SpecModel = { tables };
  const backend = spec.backend;
  const base = backend.kind === 'custom' ? 'backend' : 'backend.extend';
  const extend = backend.kind === 'blueprint' ? (backend.extend ?? {}) : {};
  if (backend.kind === 'blueprint') {
    const bp = blueprints[backend.slug];
    const curated = bp ? curatedTables(bp) : new Map<string, CuratedTable>();
    model.blueprint = {
      slug: backend.slug,
      known: Boolean(bp),
      offered: Object.keys(blueprints),
      tables: curated,
    };
    // A table the extend names but the registry doesn't know still gets a row,
    // so its columns are compared; validation has reported it already.
    const names = new Set([
      ...curated.keys(),
      ...Object.keys(extend.fields ?? {}),
      ...Object.keys(extend.belongsTo ?? {}),
    ]);
    for (const name of names) {
      const fields = new Map(
        (extend.fields?.[name] ?? []).map((field, i): [string, ModelField] => [
          field.name,
          { field, path: `${base}.fields.${name}[${i}]` },
        ]),
      );
      const keys = new Map(
        (extend.belongsTo?.[name] ?? []).map((key, i): [string, ModelKey] => [
          key.field,
          { key, required: false, path: `${base}.belongsTo.${name}[${i}]` },
        ]),
      );
      const table = curated.get(name);
      tables.set(name, {
        name,
        origin: 'blueprint',
        path: `${base}.fields.${name}`,
        access: table?.access ?? 'private',
        fields,
        keys,
        columns: columnsOf(table?.columns ?? SYSTEM_COLUMNS, fields.keys(), keys.keys()),
        ...(table ? { curated: table } : {}),
      });
    }
  }
  const entities = backend.kind === 'custom' ? backend.entities : (extend.entities ?? []);
  entities.forEach((entity, i) =>
    tables.set(
      entity.name,
      entityTable(entity, `${base}.entities[${i}]`, entityTables.get(entity.name)),
    ),
  );
  for (const [name, own] of entityTables) {
    if (tables.has(name)) continue;
    tables.set(name, {
      name,
      origin: 'entity-type',
      path: `${base}.entities`,
      access: 'shared',
      fields: new Map(),
      keys: new Map(),
      columns: new Set([...SYSTEM_COLUMNS, ...own]),
    });
  }
  const access = (side: string) => tables.get(side)?.access ?? 'shared';
  const links = backend.kind === 'custom' ? (backend.links ?? []) : (extend.links ?? []);
  links.forEach((link, i) => {
    const table = linkTable(link, `${base}.links[${i}]`, access);
    tables.set(table.name, table);
  });
  return model;
}

/** The tables the spec declares itself, entities then links. */
export const ownTables = (model: SpecModel): ModelTable[] =>
  [...model.tables.values()].filter(
    (table) => table.origin !== 'blueprint' && table.origin !== 'entity-type',
  );

/** The entity types' tables a key or a link may name without the spec declaring them. */
export const entityTypeTables = (model: SpecModel): string[] =>
  [...model.tables.values()].filter((t) => t.origin === 'entity-type').map((t) => t.name);
