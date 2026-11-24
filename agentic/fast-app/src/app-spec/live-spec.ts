// The spec the agent reads, rendered from the live database and what plan_app
// remembers about it (overlay.ts): every app table the AppSpec can describe,
// whoever made it, plus a list of what it can't, which the planner keeps as
// it is. app-spec.json is this render. The planner measures the agent's spec
// against it, so a change made outside the app is where a build starts from,
// and never something it undoes.
//
// Pure, and it imports only by relative path, so the pnpm test runner loads it.

import {
  CURATED_BLUEPRINTS,
  type CuratedBlueprint,
  type CuratedTable,
  curatedTables,
} from '../blueprints/curated';
import { ENTITY_TYPE, isSearchChunkTable, SEARCH_CHUNKS } from '../blueprints/generated-tables';
import type { ProtectedSchema } from './delta-types';
import { RESERVED_TABLES } from './entity-checks';
import { entityTableColumns, type LiveModel, type LiveTable } from './live-model';
import { isSpecName, type ReadOnlyItem } from './live-spec-fields';
import { shapeOf, type TableShape } from './live-spec-tables';
import { uiOf } from './live-spec-ui';
import type { IntentOverlay } from './overlay';
import { decodeLanded, type SeededById } from './seed-ids';
import { parseSeedRef } from './seed-refs';
import { specModel } from './spec-model';
import type {
  AppSpec,
  BackendExtend,
  SeedRow,
  SpecBelongsTo,
  SpecEntity,
  SpecField,
} from './types';
import { withoutLinkPages } from './ui-checks';

export type { ReadOnlyItem };

export type ViewInput = {
  model: LiveModel;
  /** What plan_app remembers; null when it has no record of this database (adopted). */
  overlay: IntentOverlay | null;
  seeded: SeededById;
  /** The app's name when there's no overlay to take it from. */
  fallbackName: string;
  /** The curated registry; the shipped blueprints unless a test passes its own. */
  blueprints?: Readonly<Record<string, CuratedBlueprint>>;
};

export type RenderedView = {
  spec: AppSpec;
  /** What the database has that the spec leaves out; the agent is told, the planner keeps it. */
  readOnly: ReadOnlyItem[];
  protect: ProtectedSchema;
  /** The sample rows that landed, by table name, as the spec's seed starts with them. */
  landed: Record<string, SeedRow[]>;
  /** No overlay: the spec comes from the database alone. */
  adopted: boolean;
};

/** The curated blueprint whose every table the database has, the largest when several do. */
export function detectBlueprint(
  model: LiveModel,
  blueprints: Readonly<Record<string, CuratedBlueprint>> = CURATED_BLUEPRINTS,
): string | null {
  const live = new Set(model.tables.map((t) => t.name));
  let best: { slug: string; size: number } | null = null;
  for (const [slug, bp] of Object.entries(blueprints)) {
    const tables = [...curatedTables(bp).values()];
    const present = (t: CuratedTable) =>
      t.entityType ? !live.has(t.name) && model.metaTableNames.has(t.name) : live.has(t.name);
    if (!tables.length || !tables.every(present)) continue;
    if (!best || tables.length > best.size) best = { slug, size: tables.length };
  }
  return best?.slug ?? null;
}

// The overlay's order first (the spec's own), then the database's.
function ordered(model: LiveModel, overlay: IntentOverlay | null): LiveTable[] {
  const rank = new Map(Object.keys(overlay?.tables ?? {}).map((id, i) => [id, i]));
  const at = new Map(model.tables.map((t, i) => [t, rank.get(t.id) ?? rank.size + i]));
  return [...model.tables].sort((a, b) => at.get(a) - at.get(b));
}

const sameSet = (a: ReadonlySet<string>, b: ReadonlySet<string>) =>
  a.size === b.size && [...a].every((n) => b.has(n));

// Which tables render, settled: a table with nothing to describe drops out,
// and then a key that points at it can't be described either; a link's sides
// and a key's target must be entities or curated tables.
function settle(
  tables: LiveTable[],
  model: LiveModel,
  overlay: IntentOverlay | null,
  curated: ReadonlyMap<string, CuratedTable>,
) {
  // An entity type's table, curated or made with manage_entity_types, is a
  // target though the app schema model leaves it out.
  const entityTypes = [
    ...new Set([
      ...[...curated.values()].filter((t) => t.entityType).map((t) => t.name),
      ...model.entityTables.keys(),
    ]),
  ];
  const dropped = new Map<string, ReadOnlyItem[]>();
  for (const t of tables) {
    if (curated.has(t.name)) continue;
    if (!isSpecName(t.name))
      dropped.set(t.name, [{ kind: 'table', table: t.name, reason: 'name' }]);
    else if (RESERVED_TABLES.has(t.name))
      dropped.set(t.name, [{ kind: 'table', table: t.name, reason: "the platform's own name" }]);
  }
  let renderable = new Set(tables.map((t) => t.name).filter((n) => !dropped.has(n)));
  let targets = new Set([...renderable, ...entityTypes]);
  let shapes = new Map<string, TableShape>();
  for (let round = 0; round <= tables.length; round++) {
    shapes = new Map(
      tables
        .filter((t) => renderable.has(t.name))
        .map((t) => [
          t.name,
          shapeOf(t, {
            model,
            targets,
            intent: overlay?.tables[t.id],
            curated: curated.get(t.name),
          }),
        ]),
    );
    const named = (keep: (s: TableShape) => boolean) =>
      new Set([...shapes].filter(([, s]) => keep(s)).map(([n]) => n));
    const next = named((s) => s.kind !== 'empty');
    const nextTargets = named((s) => s.kind === 'entity' || s.kind === 'curated');
    for (const name of entityTypes) nextTargets.add(name);
    if (sameSet(next, renderable) && sameSet(nextTargets, targets)) break;
    renderable = next;
    targets = nextTargets;
  }
  for (const [name, shape] of shapes) {
    if (shape.kind !== 'empty') continue;
    dropped.set(name, shape.readOnly);
    shapes.delete(name);
  }
  return { shapes, dropped };
}

function protectOf(items: readonly ReadOnlyItem[]): ProtectedSchema {
  const columns = new Map<string, Map<string, string>>();
  const access = new Set<string>();
  const curatedGone = new Set<string>();
  for (const item of items) {
    if (item.kind === 'column') {
      if (!columns.has(item.table)) columns.set(item.table, new Map());
      columns.get(item.table).set(item.column, item.reason);
    } else if (item.kind === 'access') access.add(item.table);
    else if (item.kind === 'curated-gone') curatedGone.add(item.table);
  }
  return { columns, access, curatedGone };
}

// The rows that landed in the tables the spec has; a reference into a table
// the spec leaves out has no row to point at.
function landedRows(seeded: SeededById, model: LiveModel, rendered: ReadonlySet<string>) {
  const { seed } = decodeLanded(seeded, model);
  const kept = Object.fromEntries(
    Object.entries(seed).filter(([table, rows]) => rendered.has(table) && rows.length),
  );
  for (const rows of Object.values(kept)) {
    for (const row of rows) {
      for (const [column, value] of Object.entries(row)) {
        const ref = parseSeedRef(value);
        if (ref && !(ref.table in kept)) delete row[column];
      }
    }
  }
  return kept;
}

// The overlay's backend; without one, the blueprint the database was built from, if any.
function slugOf(
  model: LiveModel,
  overlay: IntentOverlay | null,
  blueprints: Readonly<Record<string, CuratedBlueprint>>,
): string | null {
  if (!overlay) return detectBlueprint(model, blueprints);
  const { backend } = overlay.app;
  return backend.kind === 'blueprint' ? backend.slug : null;
}

function generatedTablesOf(model: LiveModel, curated: ReadonlyMap<string, CuratedTable>) {
  const generated = new Map(model.generatedTables);
  for (const table of model.tables) {
    const keys = table.columns.flatMap((column) =>
      column.key ? [{ column: column.name, target: column.key.toName }] : [],
    );
    if (
      isSearchChunkTable(
        table.name,
        table.columns.map((column) => column.name),
        keys,
      )
    ) {
      generated.set(table.name, SEARCH_CHUNKS);
    }
  }
  for (const table of curated.values())
    if (table.entityType) generated.set(table.name, ENTITY_TYPE);
  return generated;
}

export function liveSpec(input: ViewInput): RenderedView {
  const { model, overlay, seeded, fallbackName, blueprints = CURATED_BLUEPRINTS } = input;
  const slug = slugOf(model, overlay, blueprints);
  const bp = slug ? blueprints[slug] : undefined;
  const curated = bp ? curatedTables(bp) : new Map<string, CuratedTable>();
  const generated = generatedTablesOf(model, curated);
  const tables = ordered(model, overlay).filter((table) => !generated.has(table.name));
  const { shapes, dropped } = settle(tables, model, overlay, curated);

  const readOnly: ReadOnlyItem[] = [...generated].map(([table, reason]) => ({
    kind: 'table',
    table,
    reason,
  }));
  // The tables beside a blueprint's own, or all of a custom backend's.
  const extend: BackendExtend = {};
  const fields: Record<string, SpecField[]> = {};
  const keys: Record<string, SpecBelongsTo[]> = {};
  for (const table of tables) {
    const shape = shapes.get(table.name);
    readOnly.push(...(shape?.readOnly ?? dropped.get(table.name) ?? []));
    if (shape?.kind === 'entity') (extend.entities ??= []).push(shape.entity);
    if (shape?.kind === 'link') (extend.links ??= []).push(shape.link);
    if (shape?.kind === 'curated' && shape.fields.length) fields[table.name] = shape.fields;
    if (shape?.kind === 'curated' && shape.keys.length) keys[table.name] = shape.keys;
  }
  // A custom backend's entity types' tables, with the columns its specs added:
  // listed first, as the tables the others point at.
  if (!slug) {
    const targets = new Set([
      ...[...shapes].filter(([, s]) => s.kind === 'entity').map(([name]) => name),
      ...model.entityTables.keys(),
    ]);
    const own: SpecEntity[] = [];
    for (const [name, entityTable] of model.entityTables) {
      const shape = shapeOf(entityTable.table, {
        model,
        targets,
        intent: overlay?.tables[entityTable.table.id],
        entityType: true,
      });
      if (shape.kind === 'entity') own.push({ ...shape.entity, name });
    }
    if (own.length) extend.entities = [...own, ...(extend.entities ?? [])];
  }
  // A curated entity type's table, with the columns a spec added under extend.
  for (const [name, entityTable] of slug ? model.entityTables : []) {
    const table = curated.get(name);
    if (!table?.entityType || fields[name]) continue;
    const shape = shapeOf(entityTable.table, {
      model,
      targets: new Set([...shapes.keys(), ...model.entityTables.keys()]),
      intent: overlay?.tables[entityTable.table.id],
      curated: table,
      entityType: true,
    });
    if (shape.kind === 'curated' && shape.fields.length) fields[name] = shape.fields;
  }
  if (slug) {
    for (const name of curated.keys())
      if (!shapes.has(name) && !generated.has(name))
        readOnly.push({ kind: 'curated-gone', table: name, slug });
    if (Object.keys(fields).length) extend.fields = fields;
    if (Object.keys(keys).length) extend.belongsTo = keys;
  }

  const rendered = new Set([...shapes.keys(), ...(extend.entities ?? []).map((e) => e.name)]);
  const seed = landedRows(seeded, model, rendered);
  const tagline = overlay?.app.tagline;
  const spec: AppSpec = {
    version: 1,
    name: overlay?.app.name ?? fallbackName,
    ...(tagline && { tagline }),
    backend: slug
      ? { kind: 'blueprint', slug, ...(Object.keys(extend).length && { extend }) }
      : {
        kind: 'custom',
        entities: extend.entities ?? [],
        ...(extend.links && { links: extend.links }),
      },
    ...(Object.keys(seed).length && { seed }),
  };
  // An entity type's table keeps its page (a data room's screen); search
  // chunks and storage internals have none. An older build's overlay may name
  // a link's table in the UI, which plan_app refuses.
  const pageless = [...generated].flatMap(([name, reason]) =>
    reason === ENTITY_TYPE ? [] : [name],
  );
  const ui = withoutLinkPages(
    specModel(spec, blueprints, entityTableColumns(model)),
    uiOf(model, overlay, pageless),
  );
  if (ui) spec.ui = ui;
  return { spec, readOnly, protect: protectOf(readOnly), landed: seed, adopted: !overlay };
}
