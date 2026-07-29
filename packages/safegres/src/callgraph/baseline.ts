import type { CallGraphReport, ChecklistCode, ChecklistItem } from './graph';

/**
 * A committed snapshot of the call-graph checklist, used by CI to detect
 * *new* trust boundaries introduced by a change. Only the identity of each
 * boundary is stored (code + entry + fn + table) — messages and paths may
 * be reworded between versions without invalidating the baseline.
 */
export interface CallGraphBaseline {
  version: 1;
  boundaries: BaselineBoundary[];
}

export interface BaselineBoundary {
  code: ChecklistCode;
  entry: string;
  fn: string;
  table?: string;
}

export interface CallGraphDiff {
  /** Checklist items present now but not in the baseline — require sign-off. */
  added: ChecklistItem[];
  /** Baseline boundaries no longer present — resolved or removed. */
  removed: BaselineBoundary[];
}

export function boundaryKey(b: BaselineBoundary): string {
  return [b.code, b.entry, b.fn, b.table ?? ''].join('|');
}

export function toBaseline(report: CallGraphReport): CallGraphBaseline {
  const seen = new Set<string>();
  const boundaries: BaselineBoundary[] = [];
  for (const item of report.checklist) {
    const b: BaselineBoundary = {
      code: item.code,
      entry: item.entry,
      fn: item.fn,
      ...(item.table ? { table: item.table } : {})
    };
    const key = boundaryKey(b);
    if (seen.has(key)) continue;
    seen.add(key);
    boundaries.push(b);
  }
  boundaries.sort((a, b) => boundaryKey(a).localeCompare(boundaryKey(b)));
  return { version: 1, boundaries };
}

export function diffCallGraph(
  report: CallGraphReport,
  baseline: CallGraphBaseline
): CallGraphDiff {
  const baseKeys = new Set(baseline.boundaries.map(boundaryKey));
  const current = toBaseline(report);
  const currentKeys = new Set(current.boundaries.map(boundaryKey));

  const addedKeys = new Set<string>();
  const added: ChecklistItem[] = [];
  for (const item of report.checklist) {
    const key = boundaryKey({ code: item.code, entry: item.entry, fn: item.fn, table: item.table });
    if (baseKeys.has(key) || addedKeys.has(key)) continue;
    addedKeys.add(key);
    added.push(item);
  }

  const removed = baseline.boundaries.filter((b) => !currentKeys.has(boundaryKey(b)));
  return { added, removed };
}

export function parseBaseline(raw: string): CallGraphBaseline {
  const data = JSON.parse(raw) as Partial<CallGraphBaseline>;
  if (data.version !== 1 || !Array.isArray(data.boundaries)) {
    throw new Error('invalid call-graph baseline: expected { version: 1, boundaries: [...] }');
  }
  return { version: 1, boundaries: data.boundaries as BaselineBoundary[] };
}

export function serializeBaseline(baseline: CallGraphBaseline): string {
  return JSON.stringify(baseline, null, 2) + '\n';
}
