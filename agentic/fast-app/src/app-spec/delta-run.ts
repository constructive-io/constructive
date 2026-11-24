// The state one planDelta call builds up, and the helpers that add to it.

import type {
  AdditionKind,
  AppSpecDelta,
  DeltaCall,
  DeltaOptions,
  DestructiveChange,
  DestructiveKind,
} from './delta-types';
import type { SpecModel } from './spec-model';
import { type BlueprintRelation, type BlueprintTable, FIELD_TYPES } from './translate';
import type { AppSpecError, SpecField } from './types';

export type Run = {
  before: SpecModel;
  after: SpecModel;
  options: DeltaOptions;
  delta: AppSpecDelta;
  /** What no call can make; any of it refuses the whole plan. */
  refused: AppSpecError[];
  updates: DeltaCall[];
  creates: DeltaCall[];
  statuses: DeltaCall[];
  tables: BlueprintTable[];
  relations: BlueprintRelation[];
};

/** Whether the database has the table: from `live`, else `fallback`. */
export const hasTable = (run: Run, table: string, fallback: boolean): boolean =>
  run.options.live ? run.options.live.has(table) : fallback;

/** Whether the database has the column: from `live`, else `fallback`. */
export const hasColumn = (run: Run, table: string, column: string, fallback: boolean): boolean =>
  run.options.live ? (run.options.live.get(table)?.has(column) ?? false) : fallback;

export const add = (run: Run, kind: AdditionKind, id: string, path: string, title: string) =>
  run.delta.additions.push({ id: `${kind}:${id}`, kind, path, title });

export function destroy(
  run: Run,
  kind: DestructiveKind,
  id: string,
  path: string,
  text: { title: string; loses: string },
  call: DeltaCall,
  extra: Partial<DestructiveChange> = {},
) {
  run.delta.destructive.push({ id: `${kind}:${id}`, kind, path, ...text, call, ...extra });
}

export const refuse = (run: Run, path: string, message: string) =>
  run.refused.push({ path, message });

export const enumOf = (field: SpecField) => (field.enum?.length ? field.enum : null);
export const sameColumn = (a: SpecField, b: SpecField) =>
  FIELD_TYPES[a.type] === FIELD_TYPES[b.type] && !enumOf(a) && !enumOf(b);
