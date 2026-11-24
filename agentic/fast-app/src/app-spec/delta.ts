// A follow-up plan_app: the difference between the spec the project was last
// built from and the one the agent sends now, as the calls that make it.
// Additions run as part of the build. Destructive changes each wait for their
// own tick on the plan card. Changes no call can make are refused before the card.
// With `live`, every call is checked against the database first, so a call
// again after a half-applied build only does what's missing.

import { CURATED_BLUEPRINTS } from '../blueprints/curated';
import { normalizeKey } from '../extensions/db-tools/live-meta-index';
import { diffColumns, diffKeys } from './delta-columns';
import { guardAccess, guardCuratedGone, protectedColumns } from './delta-guards';
import { add, destroy, hasTable, refuse, type Run } from './delta-run';
import { applySkew } from './delta-skew';
import { addText, dropText } from './delta-text';
import {
  type AppSpecDelta,
  type DeltaOptions,
  type DeltaPlan,
  DESTRUCTIVE_KINDS,
} from './delta-types';
import { newColumnProblem } from './entity-checks';
import { snakeName } from './names';
import { linkKey } from './names';
import { sameAccess, type ScopeColumn, scopeColumn, scopeOfAccess } from './scope-access';
import { canonical, normalizeSeedRows } from './seed-refs';
import { type ModelTable, specModel } from './spec-model';
import {
  accessPlan,
  accessPolicy,
  belongsToRelation,
  entityTable,
  entityTypeColumns,
  linkTable,
  scopePolicy,
} from './translate';
import type { AppSpec } from './types';

export type * from './delta-types';

// The column a scoped table names its entity in; null for app-wide access,
// and a refusal when it has none (validation names it before the card).
function columnOf(run: Run, table: ModelTable): ScopeColumn | null | undefined {
  if (!scopeOfAccess(table.access)) return null;
  const found = scopeColumn(run.after, table, run.options.scopes ?? []);
  if (!('problem' in found)) return found;
  refuse(run, `${table.path}.access`, found.problem);
  return undefined;
}

function newTable(run: Run, table: ModelTable) {
  if (table.entity) {
    const column = columnOf(run, table);
    if (column === undefined) return;
    const key =
      column?.kind === 'inherited'
        ? table.keys.get(column.via.field)
        : column?.kind === 'key'
          ? table.keys.get(column.field)
          : undefined;
    run.tables.push(
      entityTable(
        table.entity,
        run.delta.warnings,
        accessPlan(table.access, column, key?.required ?? true),
      ),
    );
    for (const [, { key, required }] of table.keys)
      run.relations.push(belongsToRelation(table.name, key, required));
    add(run, 'add_table', table.name, table.path, addText.table(table.name, table.access));
    for (const [, { key }] of table.keys) {
      const parent = run.after.tables.get(key.to);
      if (
        table.access === 'shared' &&
        parent?.origin === 'blueprint' &&
        parent.access === 'private'
      ) {
        run.delta.warnings.push(
          `${table.path}: ${table.name} is shared, but it belongs to ${key.to}, which only some members can see; every member will read every ${table.name} row. Make it "private" if those rows are personal.`,
        );
      }
    }
  } else if (table.link) {
    // A link to a scoped row copies that row's entity, so only its members see
    // the link. A link to a private row stays private, as the model says.
    const sides = table.link.between.map((side) => run.after.tables.get(side));
    const scopedSide =
      table.access === 'private'
        ? undefined
        : sides.find((side) => side && scopeOfAccess(side.access));
    const sideColumn = scopedSide ? columnOf(run, scopedSide) : null;
    if (sideColumn === undefined) return;
    const scoped = sideColumn
      ? accessPlan(scopedSide.access, {
        kind: 'inherited',
        scope: sideColumn.scope,
        field: sideColumn.field,
        via: { field: linkKey(scopedSide.name), to: scopedSide.name, onDelete: 'cascade' },
        parent: scopedSide.name,
        ...(sideColumn.kind !== 'workspace' && { membershipType: sideColumn.membershipType }),
      })
      : undefined;
    const built = linkTable(
      table.link,
      (side) => run.after.tables.get(side)?.access ?? 'shared',
      scoped,
    );
    run.tables.push(built.table);
    run.relations.push(...built.relations);
    add(run, 'add_link', table.name, table.path, addText.link(table.name, table.link.between));
  }
}

// A spec entity on an entity type's table adds the columns and keys the table
// lacks, and nothing else: its membership decides who sees each row.
function extendEntityType(run: Run, table: ModelTable, has: ReadonlySet<string>) {
  // A curated entity type's table takes its columns and keys under extend.
  const entity = table.entity ?? {
    name: table.name,
    fields: [...table.fields.values()].map(({ field }) => field),
    belongsTo: [...table.keys.values()].map(({ key }) => key),
  };
  if (entity.access !== undefined) {
    refuse(
      run,
      `${table.path}.access`,
      `${table.name} is an entity type's table: its members decide who sees each row, so leave access out.`,
    );
  }
  const present = new Set([...has].map(normalizeKey));
  const missing = [...table.fields.values()].filter(
    ({ field }) => !present.has(normalizeKey(field.name)),
  );
  for (const { field, path } of missing) {
    const problem = run.options.freshEntityTables ? null : newColumnProblem(table.name, field);
    if (problem) refuse(run, path, problem);
  }
  const keys = [...table.keys.values()].filter(({ key }) => !present.has(normalizeKey(key.field)));
  if (missing.length) {
    run.tables.push(
      entityTypeColumns(
        entity,
        missing.map(({ field }) => field),
        run.delta.warnings,
      ),
    );
  }
  for (const { field, path } of missing)
    add(run, 'add_field', `${table.name}.${field.name}`, path, addText.field(table.name, field));
  // The table may have rows already, as for any table that exists.
  for (const { key, required, path } of keys) {
    if (required && !run.options.freshEntityTables) {
      refuse(
        run,
        path,
        `${table.name} is an entity type's table and may have rows, so a new key must be optional: give it onDelete "set_null", or list "${key.field}" in fields without required`,
      );
      continue;
    }
    run.relations.push(belongsToRelation(table.name, key, required));
    add(
      run,
      'add_key',
      `${table.name}.${key.field}`,
      path,
      addText.key(table.name, key.field, key.to),
    );
  }
}

// A table that exists takes a new access as its policies alone. A scope's
// column must be there already: a key to the entity type's table is; an
// organization's column or a copied one would need a value on every row.
function changeAccess(run: Run, now: ModelTable) {
  const column = columnOf(run, now);
  if (column === undefined) return;
  if (column && column.kind !== 'key') {
    refuse(
      run,
      `${now.path}.access`,
      `${now.name} exists already, and { "scope": "${column.scope}" } needs ${column.field} on every row; keep its access, or make a new table with this access and move the rows`,
    );
    return;
  }
  destroy(run, 'change_access', now.name, now.path, dropText.access(now.name, now.access), {
    tool: 'secure_table_provision',
    params: {
      table_name: now.name,
      owns: ['policies'],
      policies: [
        column
          ? scopePolicy(column)
          : accessPolicy(now.access === 'private' ? 'private' : 'shared'),
      ],
    },
  });
}

// The tables to drop, a table before the tables its keys point at.
function droppedTables(run: Run): ModelTable[] {
  const left = [...run.before.tables.values()].filter(
    (was) =>
      !run.after.tables.has(was.name) &&
      was.origin !== 'blueprint' &&
      was.origin !== 'entity-type' &&
      hasTable(run, was.name, true),
  );
  const ordered: ModelTable[] = [];
  while (left.length) {
    const pointedAt = new Set(left.flatMap((t) => [...t.keys.values()].map((k) => k.key.to)));
    const index = Math.max(
      0,
      left.findIndex((t) => !pointedAt.has(t.name)),
    );
    ordered.push(...left.splice(index, 1));
  }
  return ordered;
}

function dropTables(run: Run) {
  for (const was of droppedTables(run)) {
    const name = was.name;
    const rows = run.options.rows?.[name];
    // Left unticked, an entity goes back into the spec when every table it
    // points at is still there; a link stays as it is.
    const kept =
      was.entity && [...was.keys.values()].every(({ key }) => run.after.tables.has(key.to))
        ? { entity: was.entity }
        : undefined;
    const text = was.link
      ? dropText.link(name, was.link.between, rows)
      : dropText.table(name, rows, Boolean(kept), protectedColumns(run, name));
    // A key that points at this table goes first, or the delete fails.
    const requires = run.delta.destructive
      .filter((change) => change.kind === 'drop_key' && change.target === name)
      .map((change) => change.id);
    destroy(
      run,
      was.link ? 'drop_link' : 'drop_table',
      name,
      was.path,
      text,
      { tool: 'delete_table', params: { table_name: name } },
      {
        ...(rows === undefined ? {} : { rows }),
        ...(requires.length ? { requires } : {}),
        ...(kept ? { kept } : {}),
      },
    );
  }
}

function describeBackend(spec: AppSpec): string {
  return spec.backend.kind === 'blueprint'
    ? `the ${spec.backend.slug} blueprint`
    : 'custom entities';
}

function seedDelta(prev: AppSpec | null, next: AppSpec, run: Run) {
  for (const [table, rows] of Object.entries(next.seed ?? {})) {
    const before = run.before.tables.get(table);
    // A link row reads the same whether it names a key by its column or its side.
    const earlier = prev && before ? normalizeSeedRows(before, prev.seed?.[table] ?? []) : [];
    const now = normalizeSeedRows(run.after.tables.get(table), rows);
    const prefix = earlier.every(
      (row, i) => i < now.length && canonical(row) === canonical(now[i]),
    );
    const from = prefix ? earlier.length : rows.length;
    if (!prefix) run.delta.seed.kept.push(table);
    run.delta.seed.from[table] = from;
    run.delta.seed.rows += rows.length - from;
  }
}

/**
 * The delta as plan_app runs it: refused, with nothing to run, or runnable,
 * with every call it needs.
 */
export function planDelta(
  prev: AppSpec | null,
  next: AppSpec,
  options: DeltaOptions = {},
): DeltaPlan {
  const blueprints = options.blueprints ?? CURATED_BLUEPRINTS;
  const entityTables = options.entityTables ?? new Map<string, ReadonlySet<string>>();
  const switched =
    prev &&
    (prev.backend.kind !== next.backend.kind ||
      (prev.backend.kind === 'blueprint' &&
        next.backend.kind === 'blueprint' &&
        prev.backend.slug !== next.backend.slug));
  if (switched) {
    const refused = {
      path: 'backend',
      message: `This project's database was built from ${describeBackend(prev)}, and this spec asks for ${describeBackend(next)}. Keep backend as it was and add to it${prev.backend.kind === 'blueprint' ? ' under backend.extend' : ''}; for a different app, ask the user to create a new project.`,
    };
    return { ok: false, refused: [refused], warnings: [] };
  }
  const delta: AppSpecDelta = {
    additions: [],
    calls: [],
    destructive: [],
    warnings: [],
    seed: { from: {}, kept: [], rows: 0 },
    uiOnly: false,
  };
  const run: Run = {
    before: prev ? specModel(prev, blueprints, entityTables) : { tables: new Map() },
    after: options.model ?? specModel(next, blueprints, entityTables),
    options,
    delta,
    refused: [],
    updates: [],
    creates: [],
    statuses: [],
    tables: [],
    relations: [],
  };
  for (const [name, now] of run.after.tables) {
    const was = run.before.tables.get(name);
    if (guardCuratedGone(run, now) || now.origin === 'entity-type') continue;
    const entityType = options.entityTables?.get(name);
    if (entityType && (now.origin === 'entity' || now.origin === 'blueprint')) {
      extendEntityType(run, now, entityType);
      continue;
    }
    // A curated table is built by the blueprint, before any of this runs.
    const exists = now.origin === 'blueprint' || hasTable(run, name, Boolean(was));
    if (!exists) {
      newTable(run, now);
      continue;
    }
    diffColumns(run, name, now, was);
    diffKeys(run, name, now, was);
    if (
      was &&
      was.origin !== 'blueprint' &&
      !sameAccess(was.access, now.access) &&
      !guardAccess(run, name, `${now.path}.access`)
    ) {
      changeAccess(run, now);
    }
  }
  dropTables(run);
  if (run.refused.length) return { ok: false, refused: run.refused, warnings: delta.warnings };
  seedDelta(prev, next, run);

  delta.calls = [...run.updates, ...run.creates, ...run.statuses];
  if (run.tables.length || run.relations.length) {
    delta.calls.push({
      tool: 'provision_blueprint',
      params: {
        name: snakeName(next.name),
        // A first build reads as the app itself.
        description: prev ? `Changes to ${next.name}` : (next.tagline ?? next.name),
        definition: {
          tables: run.tables,
          ...(run.relations.length && { relations: run.relations }),
        },
      },
    });
  }
  delta.destructive.sort(
    (a, b) => DESTRUCTIVE_KINDS.indexOf(a.kind) - DESTRUCTIVE_KINDS.indexOf(b.kind),
  );
  delta.uiOnly = !delta.additions.length && !delta.destructive.length && delta.seed.rows === 0;
  return { ok: true, delta: options.skew ? applySkew(delta, options.skew) : delta };
}
