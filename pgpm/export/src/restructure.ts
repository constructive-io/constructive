/**
 * Granularity dial for `pgpm export`: route exported sql_actions rows through
 * the dials pipeline (`restructureChanges` in `@pgpmjs/transform`) so change
 * paths are derived from the naming spec (`identityOf` + `pathFor`) and
 * `requires` come from the statement dependency graph instead of the
 * hand-chained deps recorded at action time.
 */
import { PgpmRow } from '@pgpmjs/core';
import { alterationPathFor } from '@pgpmjs/naming-spec';
import { Granularity, loadModule, restructureChanges } from '@pgpmjs/transform';

export type ExportGranularity = Granularity;

export const EXPORT_GRANULARITIES: readonly ExportGranularity[] = ['atomic', 'object', 'consolidated'];

export const isExportGranularity = (value: unknown): value is ExportGranularity =>
  typeof value === 'string' && (EXPORT_GRANULARITIES as readonly string[]).includes(value);

export interface RestructureExportRowsResult {
  rows: PgpmRow[];
  warnings: string[];
}

/**
 * Restructure exported migration rows to the target granularity.
 *
 * The rows' deploy SQL is flattened in export order, restructured, and
 * re-sliced into per-object changes whose paths come from the naming spec and
 * whose deps come from the statement graph. When two changes derive the same
 * path (the same object altered again), later occurrences get the spec's
 * alteration convention via `alterationPathFor` (monotonic per-parent
 * counter), with the parent added to their deps.
 *
 * Revert/verify scripts are not carried through: the restructured grouping no
 * longer matches the original rows one-to-one, so they are emitted empty.
 */
export const restructureExportRows = async (
  rows: PgpmRow[],
  granularity: ExportGranularity
): Promise<RestructureExportRowsResult> => {
  await loadModule();

  const { changes, warnings } = restructureChanges(
    rows.map(row => ({
      name: row.deploy,
      dependencies: row.deps ?? [],
      deploy: row.content
    })),
    { granularity }
  );

  const counters = new Map<string, number>();
  const taken = new Set<string>();

  const restructured: PgpmRow[] = changes.map(change => {
    let deploy = change.name;
    const deps = [...change.dependencies];
    if (taken.has(deploy)) {
      let n = (counters.get(change.name) ?? 0) + 1;
      while (taken.has(alterationPathFor(change.name, n))) n++;
      counters.set(change.name, n);
      deploy = alterationPathFor(change.name, n);
      if (!deps.includes(change.name)) deps.push(change.name);
    }
    taken.add(deploy);
    return {
      name: deploy,
      deploy,
      deps,
      content: change.deploy,
      revert: '',
      verify: ''
    };
  });

  return { rows: restructured, warnings };
};
