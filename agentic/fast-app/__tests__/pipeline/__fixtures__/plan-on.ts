// planFrom and planBuild take where the build starts, which the database
// check finds (view-sync.ts). These start the planner tests from a record
// read and a live model, as the check would.

import path from 'node:path';

import type { LiveModel } from '../../../src/app-spec/live-model';
import type { AppSpec } from '../../../src/app-spec/types';
import { planFrom, type PlanOptions, type PlanOutcome } from '../../../src/pipeline/build-plan';
import { type BuildRead, readBuildRecord } from '../../../src/pipeline/build-record';
import { startOn, startUnbound } from '../../../src/pipeline/plan-live';
import { seenState } from '../../../src/pipeline/view-file';
import type { PlanBasis } from '../../../src/pipeline/view-sync';

/** planFrom on `read` and `live` (null: the project has no database yet). */
export function planOn(
  read: BuildRead,
  spec: AppSpec,
  live: LiveModel | null,
  owed = false,
  opts: PlanOptions = {},
): PlanOutcome {
  const start = live ? startOn(read, live, { fallbackName: spec.name }) : startUnbound(read);
  return planFrom(start, spec, live, owed, opts);
}

/** What the check finds in `cwd` on `live` (null: no database yet), with nothing changed outside the app. */
export async function basisOn(cwd: string, live: LiveModel | null): Promise<PlanBasis> {
  const read = await readBuildRecord(cwd);
  if (!live) return { kind: 'unbound', start: startUnbound(read) };
  const start = startOn(read, live, { fallbackName: path.basename(cwd) });
  if (start.kind === 'first') return { kind: 'empty', model: live, start };
  return { kind: 'current', model: live, start, state: seenState(live), changes: [] };
}
