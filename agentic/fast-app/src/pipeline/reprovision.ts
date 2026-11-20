// A project whose database is gone gets its app back in a new database, once
// the user approves it on a card. The schema, the screens and the sample rows
// come from .constructive/app-spec.json, the last spec the desktop rendered
// from the old database. The rows people added don't carry over, and neither
// does what app-spec.json can't describe; the card names both. Only a missing
// database is rebuilt: a suspended one keeps its data, and another account's
// may well exist.
//
// Pure.

import { planDelta } from '../app-spec/delta';
import type { LiveDefault, LiveKey, LiveModel, LiveTable } from '../app-spec/live-model';
import type { ReadOnlyItem } from '../app-spec/live-spec-fields';
import type { EntityTypeSnapshot, SchemaSnapshot } from '../app-spec/schema-drift';
import type { ScopeInfo } from '../app-spec/scope-tree';
import { specModel } from '../app-spec/spec-model';
import type { AppSpec } from '../app-spec/types';
import { CURATED_BLUEPRINTS } from '../blueprints/curated';
import type { AppPlanPrompt, AppReprovisionPrompt } from './app-plan';
import type { BuildPlan, PlanOutcome } from './build-plan';
import type { BuildRead } from './build-record';
import type { DatabaseState } from './db-check';
import { readOnlyText } from './drift-text';
import { startOn } from './plan-live';
import { refusalText } from './result-text';
import type { ViewState } from './view-file';

export type GoneDatabase = { kind: 'missing'; databaseId: string; name?: string };

/** Whether plan_app offers to rebuild: only for a database that is gone, never a suspended or another account's one. */
export const offersRebuild = (state: DatabaseState): state is GoneDatabase =>
  state.kind === 'missing';

/**
 * The build that brings the app back: all of the spec against nothing, with
 * every sample row it lists. It isn't a first build, since the app and its
 * design pass are there, so the commit and a later plan_app treat it as a
 * follow-up. The provision step replaces the gone database and no other.
 */
export function rebuildPlan(
  spec: AppSpec,
  gone: GoneDatabase,
  databaseName: string,
  entityTypes: readonly EntityTypeSnapshot[] = [],
  scopes: readonly ScopeInfo[] = [],
): PlanOutcome {
  // The entity types are made again before the schema; their tables take only
  // the columns the spec adds.
  const planned = planDelta(null, spec, {
    scopes,
    ...(entityTypes.length > 0 && {
      entityTables: new Map(entityTypes.map((type) => [type.table, new Set<string>()])),
      freshEntityTables: true,
    }),
  });
  // `=== false`: without strictNullChecks, `!planned.ok` doesn't narrow the union.
  if (planned.ok === false) return { kind: 'refused', text: refusalText(planned.refused) };
  return {
    kind: 'build',
    plan: {
      mode: {
        kind: 'rebuild',
        replaces: gone.databaseId,
        ...(gone.name && { oldName: gone.name }),
        databaseName,
        ...(entityTypes.length > 0 && { entityTypes: [...entityTypes] }),
      },
      spec,
      live: null,
      overlay: null,
      readOnly: [],
      outside: [],
      seedIfEmpty: [],
      sdkCurrent: false,
      delta: planned.delta,
    },
  };
}

// The view's snapshot keeps defaults as text (schema-drift.ts); this reads them back.
function defaultOf(text: string | null): LiveDefault | null {
  if (text === null) return null;
  if (text === 'now()') return { kind: 'now' };
  if (text === 'CURRENT_DATE') return { kind: 'today' };
  try {
    const value: unknown = JSON.parse(text);
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean')
      return { kind: 'literal', value };
  } catch {
    // An SQL expression, as the snapshot wrote it.
  }
  return { kind: 'expression', sql: text };
}

/**
 * The database as the last look saw it, read back from `view.json`. The
 * snapshot doesn't keep which columns the database computes, so those read as
 * plain columns, nor the entity types' own columns, which the spec lists.
 */
function modelOfBasis(state: ViewState): LiveModel {
  const basis: SchemaSnapshot = state.basis;
  const inMeta = basis.meta !== false;
  return {
    databaseId: state.databaseId,
    hash: state.hash,
    metaRead: inMeta,
    metaTableNames: new Set(),
    // A key to an entity type's table, and a table scoped to it, are the spec's.
    entityTables: new Map(
      (basis.entityTypes ?? []).map(({ table, tableId, ...definition }) => [
        table,
        {
          scope: definition.prefix,
          definition,
          table: {
            id: tableId ?? '',
            name: table,
            access: 'custom',
            metaName: null as LiveTable['metaName'],
            inMeta,
            columns: [] as LiveTable['columns'],
          },
        },
      ]),
    ),
    generatedTables: new Map(),
    metaDigest: null,
    tables: Object.entries(basis.tables).map(([id, table]) => ({
      id,
      name: table.name,
      access: table.access as LiveModel['tables'][number]['access'],
      ...(table.scoped && { scoped: table.scoped }),
      metaName: null as LiveTable['metaName'],
      inMeta,
      columns: Object.entries(table.columns).map(([key, column]) => {
        const sqlOnly = key.startsWith('meta:');
        return {
          id: sqlOnly ? null : key,
          name: column.name,
          type: column.type,
          required: column.required,
          default: defaultOf(column.default),
          values: column.values ? [...column.values] : null,
          key: column.key
            ? { ...column.key, onDelete: column.key.onDelete as LiveKey['onDelete'] }
            : null,
          source: sqlOnly ? ('meta' as const) : ('both' as const),
        };
      }),
    })),
  };
}

/**
 * The entity types the last look at the gone database found that no curated
 * blueprint makes: `manage_entity_types` made them, and a rebuild makes them
 * again. None when the last look was at another database, or there is none.
 */
export function recordedEntityTypes(
  state: ViewState | null,
  gone: GoneDatabase,
  backend: AppSpec['backend'],
): EntityTypeSnapshot[] {
  if (state?.databaseId !== gone.databaseId) return [];
  const curated =
    backend.kind === 'blueprint'
      ? (CURATED_BLUEPRINTS[backend.slug]?.entity_types ?? []).map((type) => type.prefix)
      : [];
  return (state.basis.entityTypes ?? []).filter((type) => !curated.includes(type.prefix));
}

/**
 * What the gone database had that app-spec.json leaves out, from the last look
 * at it (`view.json`) rendered as that look rendered it. A curated table that
 * was deleted outside the app isn't listed: the blueprint brings it back.
 * Empty when the last look was at another database, or there is none.
 */
export function notRebuiltOf(
  state: ViewState | null,
  read: BuildRead,
  gone: GoneDatabase,
  fallbackName: string,
): ReadOnlyItem[] {
  if (state?.databaseId !== gone.databaseId) return [];
  const start = startOn(read, modelOfBasis(state), { fallbackName });
  if (start.kind === 'first') return [];
  return start.view.readOnly.filter((item) => item.kind !== 'curated-gone');
}

/** The rebuild card: the gone database, the new one, what comes back and what doesn't. */
export function describeRebuild(
  spec: AppSpec,
  gone: GoneDatabase,
  notRebuilt: readonly ReadOnlyItem[],
  account: AppPlanPrompt['account'],
  newDatabaseName: string,
): AppReprovisionPrompt {
  const seedRows = Object.values(spec.seed ?? {}).reduce((sum, rows) => sum + rows.length, 0);
  return {
    name: spec.name,
    oldDatabase: gone.name ? { name: gone.name } : {},
    newDatabaseName,
    rebuilds: { tables: specModel(spec).tables.size, seedRows },
    notRebuilt: notRebuilt.map(readOnlyText),
    account,
  };
}

export type NameTakenStep =
  /** This account's database holds the name, and the project has none: bind that one. */
  | { kind: 'adopt'; databaseId: string }
  /** This account's database holds the name: stop, since another name makes a second database. */
  | { kind: 'held'; databaseId: string }
  /**
   * Another account's database holds it, one that is gone, or one of this account
   * whose data plane isn't `api-<name>` (made outside the desktop): ask under a new name.
   */
  | { kind: 'rename' };

/**
 * What the provision step does when the name it asked for is taken. A
 * database of this account holding it is bound only on a first build of a
 * project that has no database (a project made again under the name of one
 * whose database still exists); a rebuild or a project bound to another
 * database never takes it over.
 */
export function nameTakenStep(
  heldBy: { databaseId: string; yours: boolean } | undefined,
  plan: Pick<BuildPlan, 'mode' | 'live'>,
  /** Whether `api-<name>` serves the held database; false for one made outside the desktop. */
  namedPlane = true,
): NameTakenStep {
  if (!heldBy?.yours) return { kind: 'rename' };
  const unboundFirstBuild = plan.mode.kind === 'first' && plan.live === null;
  if (!unboundFirstBuild) return { kind: 'held', databaseId: heldBy.databaseId };
  // Every endpoint the desktop derives for a database is `<plane>-<name>`. A
  // database whose hosts carry a generated label can't be reached that way, so
  // binding it would leave the project signed out of its own database.
  return namedPlane ? { kind: 'adopt', databaseId: heldBy.databaseId } : { kind: 'rename' };
}
