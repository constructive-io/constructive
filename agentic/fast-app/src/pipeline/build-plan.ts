// What a plan_app call builds, before the card. Every build is a delta: a
// first build is the spec measured against nothing, a follow-up the spec
// measured against the live database rendered with what the build record
// remembers (plan-live.ts), so a change made outside the app is where it
// starts and never something it undoes. After the card, resolvePlan turns the
// ticked changes into the calls, once.

import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { parseEnv } from 'node:util';

import { hostContextSource } from '@agentic-kit/db-tools/context';

import { planDelta } from '../app-spec/delta';
import type {
  AppSpecDelta,
  DeltaCall,
  DestructiveChange,
  KeptRemoval,
} from '../app-spec/delta-types';
import {
  apiBehind,
  entityTableColumns,
  liveColumns,
  type LiveModel,
  skewOf,
} from '../app-spec/live-model';
import type { ReadOnlyItem } from '../app-spec/live-spec-fields';
import type { IntentOverlay } from '../app-spec/overlay';
import type { EntityTypeSnapshot } from '../app-spec/schema-drift';
import type { OutsideChange } from '../app-spec/schema-drift';
import type { ScopeInfo } from '../app-spec/scope-tree';
import type { AppSpec } from '../app-spec/types';
import { normalizeKey } from '../extensions/db-tools/live-meta-index';
import type { AppPlanChanges } from './app-plan';
import { buildCommitOwed, readBuildHistory } from './build-commits';
import { type BuildRecord, idsOf, unsettledExpect } from './build-record';
import { type BuildStart, sdkCurrent } from './plan-live';
import { valuesOf } from './project-env';
import { refusalText } from './result-text';
import { expectedSchema, type SchemaExpectation } from './schema-settle';
import { resourceUi } from './spec-ui';
import type { PlanBasis } from './view-sync';

/**
 * Which build this is; every step that differs by it reads it. `prev` is the
 * live database as app-spec.json renders it, with only the sample rows that
 * landed; `record` is the last build's record of that database.
 * - `first-again`: a first build run again before its commit. It plans like a
 *   follow-up, but stays a first build until its own commit lands.
 * - `adopted`: a follow-up on a database no build record describes.
 * - `rebuild`: the database is gone (reprovision.ts); provision makes
 *   `databaseName` in place of `replaces`, only while that one is still bound.
 */
export type BuildMode =
  | { kind: 'first' }
  | { kind: 'first-again' | 'follow-up'; prev: AppSpec; record: BuildRecord }
  | { kind: 'adopted'; prev: AppSpec }
  | {
      kind: 'rebuild';
      replaces: string;
      oldName?: string;
      databaseName: string;
      /** Entity types the gone database had that no blueprint makes, made again before the schema. */
      entityTypes?: EntityTypeSnapshot[];
    };

/** What the database has of the app, as app-spec.json renders it; null when it has none yet. */
export const prevOf = (plan: Pick<BuildPlan, 'mode'>): AppSpec | null =>
  'prev' in plan.mode ? plan.mode.prev : null;

export const lastRecordOf = (plan: Pick<BuildPlan, 'mode'>): BuildRecord | null =>
  'record' in plan.mode ? plan.mode.record : null;

export const rebuildOf = (plan: Pick<BuildPlan, 'mode'>) =>
  plan.mode.kind === 'rebuild' ? plan.mode : null;

/** The record's kind, which the commit and the result follow. */
export const recordKindOf = (plan: Pick<BuildPlan, 'mode'>): BuildRecord['kind'] =>
  plan.mode.kind === 'first' || plan.mode.kind === 'first-again' ? 'build' : 'update';

function modeOf(prev: AppSpec | null, record: BuildRecord | null, owed: boolean): BuildMode {
  if (!prev) return { kind: 'first' };
  if (!record) return { kind: 'adopted', prev };
  if (record.kind === 'build' && owed) return { kind: 'first-again', prev, record };
  return { kind: 'follow-up', prev, record };
}

export type BuildPlan = {
  mode: BuildMode;
  /** The agent's spec, with the field hints its blueprint implies. */
  spec: AppSpec;
  /** The database as plan_app read it; null when the project has none yet. */
  live: LiveModel | null;
  /** What the record remembers about the database's tables; the next record starts from it. */
  overlay: IntentOverlay | null;
  /** What the database has that the spec can't describe; kept as it is. */
  readOnly: ReadOnlyItem[];
  /** What changed outside the app since the last build, for the card and the result. */
  outside: OutsideChange[];
  /**
   * The seed tables whose new rows go in only while the table has no rows:
   * no row the record knows of landed there, so rows in it are someone else's.
   */
  seedIfEmpty: string[];
  /** Whether the SDK on disk was generated from this database as it is now. */
  sdkCurrent: boolean;
  /** What this build changes; for a first build, all of the spec. */
  delta: AppSpecDelta;
};

export type PlanOutcome = { kind: 'refused'; text: string } | { kind: 'build'; plan: BuildPlan };

export type PlanOptions = {
  outside?: OutsideChange[];
  /** The app's env, which codegen writes, names the project's database. */
  appEnvBound?: boolean;
  /** The database's membership scopes, or the ones a first build makes. */
  scopes?: readonly ScopeInfo[];
};

/**
 * The plan from where the build starts (plan-live.ts) and the live database.
 * Checked against the database, a repeat after a half-applied build does
 * only what's missing. A first custom build is not: it would offer to
 * restrict the values of the enums its own tables already have. `owed` says
 * the record's build hasn't committed yet: run again, it keeps the record's kind.
 */
export function planFrom(
  start: BuildStart,
  spec: AppSpec,
  live: LiveModel | null,
  owed = false,
  opts: PlanOptions = {},
): PlanOutcome {
  if (start.kind === 'refused') return { kind: 'refused', text: start.text };
  const followUp = start.kind === 'follow-up' ? start : null;
  const record = followUp?.record ?? null;
  const view = followUp?.view ?? null;
  const prev = view?.spec ?? null;
  const checksLive = live && (prev !== null || spec.backend.kind === 'blueprint');
  // The entity types' tables, which the backend made: a spec only adds columns to them.
  const entityTables = live ? entityTableColumns(live) : new Map<string, Set<string>>();
  const planned = planDelta(prev, spec, {
    ...(checksLive && {
      live: liveColumns(live),
      skew: skewOf(live),
      ...(view && { protect: view.protect }),
    }),
    ...(entityTables.size > 0 && { entityTables }),
    ...(opts.scopes && { scopes: opts.scopes }),
  });
  // `=== false`: without strictNullChecks, `!planned.ok` doesn't narrow the union.
  if (planned.ok === false) return { kind: 'refused', text: refusalText(planned.refused) };
  return {
    kind: 'build',
    plan: {
      mode: modeOf(prev, record, owed),
      spec,
      live,
      overlay: followUp?.overlay ?? null,
      readOnly: view?.readOnly ?? [],
      outside: opts.outside ?? [],
      seedIfEmpty: live && prev ? onlyIfEmpty(spec, planned.delta, record, live) : [],
      sdkCurrent: sdkCurrent(record, live, opts.appEnvBound ?? false),
      delta: planned.delta,
    },
  };
}

// A follow-up's seed tables with new rows where no row the record knows of
// landed with an id: an adopted app's, a table the builds never seeded, or one
// whose rows the database kept when they were skipped.
function onlyIfEmpty(
  spec: AppSpec,
  delta: AppSpecDelta,
  record: BuildRecord | null,
  live: LiveModel,
): string[] {
  const landed = record ? idsOf(record.seeded, live) : {};
  return Object.entries(delta.seed.from)
    .filter(([table, from]) => (spec.seed?.[table]?.length ?? 0) > from)
    .filter(([table]) => !landed[normalizeKey(table)]?.some(Boolean))
    .map(([table]) => table);
}

/** The plan for `spec` on what the database check found (view-sync.ts). */
export async function planBuild(
  cwd: string,
  spec: AppSpec,
  basis: PlanBasis,
  scopes: readonly ScopeInfo[] = [],
): Promise<PlanOutcome> {
  const { start } = basis;
  const record = start.kind === 'follow-up' ? start.record : null;
  const owed = record !== null && buildCommitOwed(record, await readBuildHistory(cwd));
  return planFrom(start, spec, basis.kind === 'unbound' ? null : basis.model, owed, {
    outside: basis.kind === 'current' ? basis.state.outside : [],
    appEnvBound: await appEnvBound(cwd),
    scopes,
  });
}

// Codegen writes packages/app/.env.local, which git ignores, for the database
// the project's .env names (or the host's values, which stand in for it); the
// SDK beside it was made for that one.
async function appEnvBound(cwd: string): Promise<boolean> {
  const read = (file: string) =>
    readFile(path.join(cwd, file), 'utf8').then(parseEnv, () => ({}) as Record<string, string>);
  const hosted = await hostContextSource(cwd);
  const [env, app] = await Promise.all([
    hosted ? valuesOf(hosted, ['CONSTRUCTIVE_DATABASE_NAME', 'DATABASE_NAME']) : read('.env'),
    read('packages/app/.env.local')
  ]);
  const bound = env.CONSTRUCTIVE_DATABASE_NAME || env.DATABASE_NAME;
  return Boolean(bound) && app.NEXT_PUBLIC_DB_NAME === bound;
}

// A change's id is "<kind>:<table>" or "<kind>:<table>.<column>" (delta-run.ts).
function placeOf(id: string): { table: string; column?: string } {
  const place = id.slice(id.indexOf(':') + 1);
  const dot = place.indexOf('.');
  return dot < 0 ? { table: place } : { table: place.slice(0, dot), column: place.slice(dot + 1) };
}

/** The card's lists: each addition by the place it touches, each destructive change as an unticked row. */
export function cardChanges(delta: AppSpecDelta): AppPlanChanges {
  return {
    additions: delta.additions.map(({ id, kind, title }) => ({
      id,
      kind,
      ...placeOf(id),
      title,
    })),
    destructive: delta.destructive.map((change) => ({
      id: change.id,
      kind: change.kind,
      ...placeOf(change.id),
      title: change.title,
      lost: change.loses,
      ...(change.rows === undefined ? {} : { rows: change.rows }),
      ...(change.to ? { to: change.to } : {}),
      ...(change.requires?.length ? { requires: change.requires } : {}),
    })),
  };
}

/**
 * Whether the build keeps the SDK on disk: only a follow-up that changes no
 * schema, after a build whose codegen finished, on the database the SDK was
 * made from. A build that stopped between its schema step and the end of
 * codegen left `steps.codegen` false.
 */
export function keepsSdk(plan: BuildPlan): boolean {
  return Boolean(plan.delta.uiOnly && lastRecordOf(plan)?.steps.codegen && plan.sdkCurrent);
}

/**
 * What the schema step waits for `_meta` to show, and records until it does:
 * what an earlier build's wait never saw (it timed out, or the build
 * stopped), the columns the database has and the API doesn't list yet
 * (codegen reads the API), then this build's calls.
 */
export function schemaExpectations(
  plan: BuildPlan,
  calls: readonly DeltaCall[],
  model?: LiveModel,
): SchemaExpectation[] {
  const leftover = unsettledExpect(lastRecordOf(plan));
  const behind = (model ? apiBehind(model) : []).map((c) => ({ ...c, present: true }));
  return expectedSchema(calls, [...leftover, ...behind]);
}

export type ResolvedPlan = {
  /** The spec the build applies and saves: the plan's, with each unticked removal put back. */
  spec: AppSpec;
  /**
   * What the schema step runs, in order: the additions, then the ticked
   * destructive changes (last, so a failure leaves the data where it was),
   * then the fallback of each unticked change that has one (a rename left
   * unticked still adds the new column).
   */
  calls: DeltaCall[];
  /** The destructive changes the user ticked. */
  ran: DestructiveChange[];
  /** The unticked removals the spec takes back: spec and database agree on them. */
  kept: KeptRemoval[];
  /** The unticked changes the database keeps and the spec no longer lists. */
  left: DestructiveChange[];
};

export function resolvePlan(
  plan: Pick<BuildPlan, 'spec' | 'delta'>,
  ticked: readonly string[],
): ResolvedPlan {
  const chosen = new Set(ticked);
  const ran = plan.delta.destructive.filter((change) => chosen.has(change.id));
  const unticked = plan.delta.destructive.filter((change) => !chosen.has(change.id));
  const fallbacks = unticked.flatMap((change) => (change.fallback ? [change.fallback] : []));
  const kept = unticked.flatMap((change) => (change.kept ? [change.kept] : []));
  return {
    spec: keepRemovals(plan.spec, kept),
    calls: [...plan.delta.calls, ...ran.map((change) => change.call), ...fallbacks],
    ran,
    kept,
    left: unticked.filter((change) => !change.kept),
  };
}

/**
 * The agent's spec with each removal the user left unticked put back where
 * the last build declared it. The spec then matches the database that keeps
 * it, and the next follow-up doesn't offer the removal again. The screens hide
 * it, unless new rows need the column.
 */
function keepRemovals(spec: AppSpec, kept: readonly KeptRemoval[]): AppSpec {
  if (!kept.length) return spec;
  const next = structuredClone(spec);
  const { backend } = next;
  for (const removal of structuredClone(kept)) {
    if ('entity' in removal) {
      if (backend.kind === 'custom') backend.entities.push(removal.entity);
      else ((backend.extend ??= {}).entities ??= []).push(removal.entity);
      resourceUi(next, removal.entity.name).hidden = true;
      continue;
    }
    const { table, field, hide } = removal;
    const entities = backend.kind === 'custom' ? backend.entities : backend.extend?.entities;
    const entity = entities?.find((e) => e.name === table);
    if (entity) entity.fields.push(field);
    // Not an entity, so a curated table: its columns are the extend's.
    else if (backend.kind === 'blueprint')
      (((backend.extend ??= {}).fields ??= {})[table] ??= []).push(field);
    if (!hide) continue;
    const fields = (resourceUi(next, table).fields ??= {});
    const key = Object.keys(fields).find((k) => normalizeKey(k) === normalizeKey(field.name));
    fields[key ?? field.name] = { ...fields[key ?? field.name], hidden: true };
  }
  return next;
}
